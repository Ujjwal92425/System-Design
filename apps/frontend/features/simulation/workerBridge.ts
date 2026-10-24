'use client';

import { api } from '@/lib/api';
import { io as socketIO, Socket } from 'socket.io-client';

// =============================================================================
// Web Worker Blob — runs simulation tick logic in a separate thread
//
// HYPERSCALE PHYSICS APPLIED:
//   1. Kingman M/G/1 Queueing Delay: Asymptotic queue waiting time when rho >= 0.65
//   2. Log-Normal Percentile Distributions: Real-world heavy tail p50, p90, p95, p99, p99.9
//   3. Metastable Failures: Retry storm amplification & Thundering Herd cold-cache stampede
//   4. Distributed Critical Path Trace: Hop-by-hop waterfall profiling per tick
//   5. Protected Concurrency & Connection Pools with bounded buffers
//   6. Persistent Async Queue Buffering: Producer temporal decoupling with multi-tick worker drain
//   7. Distributed Deadline Propagation: gRPC/Envoy timeout budgets with cascading cancellation
// =============================================================================

const workerCode = `
  var isRunning = false;
  var intervalId = null;
  var tickCount = 0;

  var graphNodes = [];
  var graphEdges = [];
  var trafficQps = 1000;
  var scenario = 'constant';
  var failedNodes = [];
  var nodeChaosModes = {};
  var simRunId = null;

  // Persistent state across ticks
  var nodeMemory = {};    // { nodeId: { usedMb, lastGcTick } }
  var nodeReplicas = {};  // { nodeId: count }
  var hpaCooldown = {};   // { nodeId: tick }
  var prevCpu = {};       // { nodeId: [cpu1, cpu2] } rolling window
  var cbState = {};       // { nodeId: { state, failCount, lastFailureTick } }
  var cacheWarmth = {};   // { nodeId: float 0.0-1.0 }
  // CHANGE: Persistent async queue backlogs across ticks (temporal decoupling)
  var queueBacklogs = {}; // { nodeId: number of queued messages }

  function safeNum(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : (fallback !== undefined ? fallback : 0);
  }

  function safeRound(v) {
    var n = safeNum(v);
    return Math.round(n);
  }

  function safeMin(v, max) {
    var n = safeNum(v);
    return Math.min(n, max);
  }

  function initPersistentState() {
    graphNodes.forEach(function(n) {
      var id = n.id;
      var d = n.data || {};
      if (!nodeMemory[id]) nodeMemory[id] = { usedMb: 0, lastGcTick: 0 };
      if (nodeReplicas[id] === undefined) nodeReplicas[id] = safeNum(d.replicas, 1);
      if (hpaCooldown[id] === undefined) hpaCooldown[id] = 0;
      if (prevCpu[id] === undefined) prevCpu[id] = [];
      if (cbState[id] === undefined) cbState[id] = { state: 'CLOSED', failCount: 0, lastFailureTick: 0 };
      if (cacheWarmth[id] === undefined) cacheWarmth[id] = 1.0;
      if (queueBacklogs[id] === undefined) queueBacklogs[id] = 0;
    });
    var knownIds = {};
    graphNodes.forEach(function(n) { knownIds[n.id] = true; });
    Object.keys(nodeMemory).forEach(function(id) { if (!knownIds[id]) delete nodeMemory[id]; });
    Object.keys(nodeReplicas).forEach(function(id) { if (!knownIds[id]) delete nodeReplicas[id]; });
    Object.keys(hpaCooldown).forEach(function(id) { if (!knownIds[id]) delete hpaCooldown[id]; });
    Object.keys(prevCpu).forEach(function(id) { if (!knownIds[id]) delete prevCpu[id]; });
    Object.keys(cbState).forEach(function(id) { if (!knownIds[id]) delete cbState[id]; });
    Object.keys(cacheWarmth).forEach(function(id) { if (!knownIds[id]) delete cacheWarmth[id]; });
    Object.keys(queueBacklogs).forEach(function(id) { if (!knownIds[id]) delete queueBacklogs[id]; });
  }

  self.onmessage = function(e) {
    var msg = e.data;
    var type = msg.type;
    var payload = msg.payload || {};

    if (type === 'HEALTH_CHECK') {
      self.postMessage({ type: 'HEALTH_OK', payload: { tick: tickCount, isRunning: isRunning } });
      return;
    }

    try {
      if (type === 'INIT') {
        graphNodes = payload.nodes || [];
        graphEdges = payload.edges || [];
        trafficQps = safeNum(payload.trafficQps, 1000);
        scenario = payload.scenario || 'constant';
        failedNodes = payload.failedNodes || [];
        nodeChaosModes = payload.nodeChaosModes || {};
        simRunId = payload.simRunId || null;
      } else if (type === 'START') {
        tickCount = 0;
        nodeMemory = {};
        nodeReplicas = {};
        hpaCooldown = {};
        prevCpu = {};
        cbState = {};
        cacheWarmth = {};
        queueBacklogs = {};
        if (!isRunning) { isRunning = true; startSimulation(); }
      } else if (type === 'STOP') {
        isRunning = false;
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
      } else if (type === 'UPDATE_PARAMS') {
        if (payload.trafficQps !== undefined) trafficQps = safeNum(payload.trafficQps, 1000);
        if (payload.scenario !== undefined) scenario = payload.scenario;
        if (payload.failedNodes !== undefined) failedNodes = payload.failedNodes;
        if (payload.nodeChaosModes !== undefined) nodeChaosModes = payload.nodeChaosModes;
      } else if (type === 'UPDATE_GRAPH') {
        graphNodes = payload.nodes || [];
        graphEdges = payload.edges || [];
      } else if (type === 'APPLY_CHAOS') {
        nodeChaosModes[payload.nodeId] = payload.mode;
      } else if (type === 'HEAL_CHAOS') {
        delete nodeChaosModes[payload.nodeId];
      }
    } catch (err) {
      self.postMessage({ type: 'ERROR', payload: { message: 'Worker message handler error: ' + err.message } });
    }
  };

  function startSimulation() {
    initPersistentState();
    intervalId = setInterval(function() {
      tickCount++;
      try {
        var metrics = runSimulationTick();
        self.postMessage({ type: 'TICK', payload: metrics });
      } catch (err) {
        self.postMessage({ type: 'ERROR', payload: { message: 'Tick ' + tickCount + ' failed: ' + err.message, tick: tickCount } });
        isRunning = false;
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        self.postMessage({ type: 'PAUSED', payload: { reason: err.message, tick: tickCount } });
      }
      if (tickCount >= 300) {
        isRunning = false;
        clearInterval(intervalId);
        intervalId = null;
        self.postMessage({ type: 'COMPLETE', payload: { ticks: tickCount } });
      }
    }, 1000);
  }

  // ===========================================================================
  // Queueing & Distribution Physics
  // ===========================================================================
  function erlangC(lmbda, mu, c) {
    lmbda = safeNum(lmbda, 0);
    mu = safeNum(mu, 1);
    c = Math.max(1, safeNum(c, 1));
    var rho = lmbda / (c * mu);
    if (rho >= 1) return 1;
    function fact(n) {
      if (n <= 1) return 1;
      var r = 1;
      if (n > 12) return Math.sqrt(2 * Math.PI * n) * Math.pow(n / Math.E, n);
      for (var i = 2; i <= n; i++) r *= i;
      return r;
    }
    var sum = 0;
    for (var k = 0; k < c; k++) sum += Math.pow(c * rho, k) / fact(k);
    var top = Math.pow(c * rho, c) / (fact(c) * (1 - rho));
    return safeMin(top / (sum + top), 1);
  }

  // CHANGE: Kingman's M/G/1 queueing delay formula for realistic heavy-traffic waiting time
  function kingmanDelay(arrivalRate, serviceCapacity, baseDelay) {
    arrivalRate = safeNum(arrivalRate, 0);
    serviceCapacity = Math.max(1, safeNum(serviceCapacity, 1));
    baseDelay = Math.max(1, safeNum(baseDelay, 5));
    var rho = arrivalRate / serviceCapacity;
    if (rho < 0.65) return Math.max(0, rho * baseDelay * 0.15);
    if (rho >= 1.0) {
      var over = rho - 1.0;
      return Math.min(4500, baseDelay * 4 + over * 1500);
    }
    var varianceFactor = (1.0 + 1.44) / 2.0; // Ca=1, Cs=1.2
    var queueWait = (rho / (1.0 - rho)) * varianceFactor * baseDelay * 0.45;
    return Math.min(3500, queueWait);
  }

  // CHANGE: Log-normal percentiles estimator for realistic tail-at-scale (p50, p90, p95, p99, p99.9)
  function estimatePercentiles(meanLatency, gcPauseMs, isSaturated) {
    meanLatency = Math.max(1, safeNum(meanLatency, 5));
    gcPauseMs = safeNum(gcPauseMs, 0);
    var p50 = safeRound(meanLatency * 0.85);
    var p90 = safeRound(meanLatency * 1.35 + (gcPauseMs * 0.3));
    var p95 = safeRound(meanLatency * 1.75 + (gcPauseMs * 0.6));
    var p99 = safeRound(meanLatency * 2.65 + gcPauseMs + (isSaturated ? 250 : 0));
    var p999 = safeRound(meanLatency * 4.2 + (gcPauseMs * 1.8) + (isSaturated ? 600 : 0));
    return { p50: p50, p90: p90, p95: p95, p99: p99, p999: p999 };
  }

  // CHANGE: Distributed critical path trace waterfall with gRPC deadline cancellation
  function buildCriticalPathTrace(entrypoints, adj, nodeMetrics) {
    var criticalPath = [];
    var currentTraceId = entrypoints[0] ? entrypoints[0].id : null;
    var traceVisited = {};
    var cumulativeTraceMs = 0;
    var deadlineExceededAt = null;

    while (currentTraceId && !traceVisited[currentTraceId] && criticalPath.length < 8) {
      traceVisited[currentTraceId] = true;
      var trMetric = nodeMetrics[currentTraceId];
      if (trMetric) {
        var isBneck = trMetric.queueDepth > 20 || trMetric.latency > 150 || trMetric.errorRate > 20;
        cumulativeTraceMs += trMetric.latency;
        var isExceeded = cumulativeTraceMs > 1200;
        if (isExceeded && !deadlineExceededAt) {
          deadlineExceededAt = currentTraceId;
        }

        var status = isExceeded
          ? 'DEADLINE_EXCEEDED'
          : trMetric.errorRate > 40
          ? 'CRITICAL'
          : (trMetric.errorRate > 10 || isBneck)
          ? 'DEGRADED'
          : 'OK';

        criticalPath.push({
          nodeId: currentTraceId,
          label: trMetric.label,
          nodeType: trMetric.type,
          serviceLatencyMs: trMetric.serviceLatency || safeRound(trMetric.latency * 0.7),
          queueDelayMs: trMetric.queueDelay || safeRound(trMetric.latency * 0.3),
          gcPauseMs: trMetric.gcPause || 0,
          totalDurationMs: trMetric.latency,
          p99Latency: trMetric.p99Latency || safeRound(trMetric.latency * 2.5),
          queueDepth: trMetric.queueDepth,
          errorRate: trMetric.errorRate,
          qps: trMetric.qps,
          isBottleneck: isBneck,
          status: status
        });
      }
      var nextNodes = adj[currentTraceId] || [];
      if (nextNodes.length === 0) break;
      var worstNext = nextNodes[0];
      var maxL = -1;
      nextNodes.forEach(function(nxt) {
        var l = nodeMetrics[nxt] ? nodeMetrics[nxt].latency : 0;
        if (l > maxL) { maxL = l; worstNext = nxt; }
      });
      currentTraceId = worstNext;
    }

    var totalCriticalLatency = criticalPath.reduce(function(s, sp) { return s + sp.totalDurationMs; }, 0);
    var maxSpan = criticalPath[0];
    criticalPath.forEach(function(sp) {
      if (sp.totalDurationMs > (maxSpan ? maxSpan.totalDurationMs : 0)) maxSpan = sp;
    });

    return {
      spans: criticalPath,
      totalLatencyMs: totalCriticalLatency,
      bottleneckNodeId: maxSpan ? maxSpan.nodeId : '',
      bottleneckType: maxSpan ? maxSpan.nodeType : '',
      bottleneckLatencyMs: maxSpan ? maxSpan.totalDurationMs : 0,
      timestamp: Date.now()
    };
  }

  // ===========================================================================
  // Per-node capacity estimation from config
  // ===========================================================================
  function getCapacity(nodeData, nodeSpecType) {
    if (nodeData.capacity !== undefined && safeNum(nodeData.capacity, 0) > 0) return safeNum(nodeData.capacity);
    var cpuCores = Math.max(1, safeNum(nodeData.cpuCores, 2));
    var base = 3000;
    if (nodeSpecType.indexOf('DATABASE') >= 0) base = 800;
    else if (nodeSpecType.indexOf('CACHE') >= 0) base = 10000;
    else if (nodeSpecType.indexOf('WEB_SERVER') >= 0) base = 2500;
    else if (nodeSpecType.indexOf('CDN') >= 0) base = 50000;
    else if (nodeSpecType.indexOf('LOAD_BALANCER') >= 0) base = 20000;
    else if (nodeSpecType.indexOf('QUEUE') >= 0) base = 3000;
    else if (nodeSpecType.indexOf('RATE_LIMITER') >= 0) base = 5000;
    else if (nodeSpecType.indexOf('AUTH') >= 0) base = 2000;
    else if (nodeSpecType.indexOf('WAF') >= 0) base = 5000;
    else if (nodeSpecType.indexOf('API_GATEWAY') >= 0) base = 10000;
    else if (nodeSpecType.indexOf('LLM') >= 0) base = 500;
    else if (nodeSpecType.indexOf('EMBEDDING') >= 0) base = 300;
    else if (nodeSpecType.indexOf('VECTOR_DB') >= 0) base = 1000;
    else if (nodeSpecType.indexOf('INFERENCE') >= 0) base = 200;
    return Math.round(base * (cpuCores / 2));
  }

  function getBaseLatency(nodeData, nodeSpecType) {
    if (nodeData.latency !== undefined && safeNum(nodeData.latency, 0) > 0) return safeNum(nodeData.latency);
    if (nodeSpecType.indexOf('DATABASE') >= 0) return 40;
    if (nodeSpecType.indexOf('CACHE') >= 0) return 2;
    if (nodeSpecType.indexOf('CDN') >= 0) return 2;
    if (nodeSpecType.indexOf('QUEUE') >= 0) return 3; // Fast producer ACK
    if (nodeSpecType.indexOf('PUBSUB') >= 0) return 3;
    if (nodeSpecType.indexOf('AUTH') >= 0) return 30;
    if (nodeSpecType.indexOf('WAF') >= 0) return 10;
    if (nodeSpecType.indexOf('LLM') >= 0) return 500;
    if (nodeSpecType.indexOf('EMBEDDING') >= 0) return 200;
    if (nodeSpecType.indexOf('VECTOR_DB') >= 0) return 50;
    if (nodeSpecType.indexOf('INFERENCE') >= 0) return 1000;
    return 5;
  }

  function getPoolSize(nodeData, nodeSpecType) {
    if (nodeSpecType.indexOf('DATABASE') >= 0) return safeNum(nodeData.connectionPoolSize, 50);
    if (nodeSpecType.indexOf('WEB_SERVER') >= 0) return safeNum(nodeData.threadPoolSize, 200);
    if (nodeSpecType.indexOf('APP_SERVER') >= 0) return safeNum(nodeData.threadPoolSize, 100);
    if (nodeSpecType.indexOf('AUTH') >= 0) return safeNum(nodeData.connectionPoolSize, 100);
    return 0;
  }

  function getWriteRatio(nodeData, nodeSpecType) {
    if (nodeData.writeRatio !== undefined) return safeNum(nodeData.writeRatio);
    if (nodeSpecType.indexOf('DATABASE') >= 0) return 0.3;
    if (nodeSpecType.indexOf('CACHE') >= 0) return 0.2;
    if (nodeSpecType.indexOf('QUEUE') >= 0) return 0.5;
    return 0.1;
  }

  // ===========================================================================
  // Main tick logic
  // ===========================================================================
  function runSimulationTick() {
    var currentInputQps = safeNum(trafficQps, 1000);
    if (scenario === 'spike') {
      var phase = tickCount % 15;
      if (phase >= 3 && phase <= 7) currentInputQps *= 3.5;
    } else if (scenario === 'ramp') {
      currentInputQps = Math.min(10000, trafficQps + (tickCount * 100));
    }
    currentInputQps = safeNum(currentInputQps, 0);

    var adj = {}, incomingCount = {};
    graphNodes.forEach(function(n) { adj[n.id] = []; incomingCount[n.id] = 0; });
    graphEdges.forEach(function(e) {
      if (adj[e.source]) adj[e.source].push(e.target);
      if (incomingCount[e.target] !== undefined) incomingCount[e.target]++;
    });

    var entrypoints = graphNodes.filter(function(n) { return incomingCount[n.id] === 0; });
    if (entrypoints.length === 0 && graphNodes.length > 0) entrypoints = [graphNodes[0]];

    var nodeMetrics = {};
    graphNodes.forEach(function(n) {
      nodeMetrics[n.id] = {
        id: n.id, label: n.data && n.data.label || n.type, type: n.type,
        qps: 0, latency: 0, errorRate: 0, cpu: 0, memory: 0, queueDepth: safeRound(queueBacklogs[n.id] || 0),
        cacheHitRate: 0, readReplicasUsed: 0, replicas: Math.max(1, nodeReplicas[n.id] || 1),
        activeConnections: 0, serviceLatency: 0, queueDelay: 0, gcPause: 0,
        p50Latency: 0, p90Latency: 0, p95Latency: 0, p99Latency: 0, p999Latency: 0
      };
    });

    var queue = [];
    var events = [];

    // CHANGE: Enqueue entrypoint requests with SLA deadline budget (default 1200ms)
    entrypoints.forEach(function(ep) {
      var epData = ep.data || {};
      var deadline = safeNum(epData.timeoutMs, 1200);
      queue.push({
        id: ep.id,
        load: currentInputQps / Math.max(1, entrypoints.length),
        hopLatency: 0,
        cumulativeLatency: 0,
        deadlineBudgetMs: deadline
      });
    });

    // CHANGE: Automatically enqueue any queue nodes that hold a persistent backlog from prior ticks
    graphNodes.forEach(function(n) {
      var nType = n.type || '';
      if ((nType === 'QUEUE' || nType === 'PUBSUB') && safeNum(queueBacklogs[n.id], 0) > 0) {
        queue.push({
          id: n.id,
          load: 0, // No new external load needed to trigger internal backlog drain
          hopLatency: 0,
          cumulativeLatency: 0,
          deadlineBudgetMs: 5000,
          isBacklogDrain: true
        });
      }
    });

    var visited = {};
    var lbRoundRobinCounter = {};

    while (queue.length > 0) {
      var item = queue.shift();
      var id = item.id;
      var load = safeNum(item.load, 0);
      var cumulativeHopLatency = safeNum(item.hopLatency, 0);
      var cumulativePathLatency = safeNum(item.cumulativeLatency, 0);
      var deadlineBudget = safeNum(item.deadlineBudgetMs, 1200);

      var node = null;
      for (var ni = 0; ni < graphNodes.length; ni++) {
        if (graphNodes[ni].id === id) { node = graphNodes[ni]; break; }
      }
      if (!node) continue;

      nodeMetrics[id].qps = safeNum(nodeMetrics[id].qps + load, 0);

      if (visited[id]) {
        var targets = adj[id] || [];
        if (targets.length > 0) {
          var fanOut = load / targets.length;
          targets.forEach(function(tgt) {
            queue.push({
              id: tgt,
              load: safeNum(fanOut, 0),
              hopLatency: cumulativeHopLatency + 2,
              cumulativeLatency: cumulativePathLatency + 2,
              deadlineBudgetMs: deadlineBudget
            });
          });
        }
        continue;
      }
      visited[id] = true;

      var nodeData = node.data || {};
      var isFailed = failedNodes.indexOf(id) >= 0;
      var chaosMode = nodeChaosModes[id] || 'none';
      var isChaosActive = chaosMode !== 'none';
      var nodeSpecType = node.type || '';

      var baseCapacity = getCapacity(nodeData, nodeSpecType);
      var baseLatency = getBaseLatency(nodeData, nodeSpecType);
      var replicas = Math.max(1, nodeReplicas[id] || 1);
      var effectiveCapacity = baseCapacity * replicas;
      var cpuCores = Math.max(1, safeNum(nodeData.cpuCores, 2));
      var ramGb = Math.max(0.5, safeNum(nodeData.ramGb, 4));
      var maxMemMb = ramGb * 1024;
      var payloadKb = Math.max(0.1, safeNum(nodeData.avgPayloadSizeKb, 4));
      var memPerReqMb = payloadKb / 1024;
      var writeRatio = getWriteRatio(nodeData, nodeSpecType);
      var netLatencyPerHop = Math.max(0, safeNum(nodeData.networkLatencyMs, 2));
      var memState = nodeMemory[id] || { usedMb: 0, lastGcTick: 0 };

      var nodeQps = safeNum(nodeMetrics[id].qps, 0);
      var nodeLatency = baseLatency + cumulativeHopLatency;
      var nodeErrorRate = 0;
      var queueDepth = safeRound(queueBacklogs[id] || 0);
      var isPartitioned = false;
      var oomCrashed = false;
      var gcPauseMs = 0;
      var rawServiceTime = baseLatency;
      var rawQueueDelay = 0;

      // Circuit Breaker model
      if (nodeSpecType === 'CIRCUIT_BREAKER') {
        var cb = cbState[id] || { state: 'CLOSED', failCount: 0, lastFailureTick: 0 };
        var halfOpenMaxQps = safeNum(nodeData.halfOpenMaxQps, 100);
        var recoveryTimeout = safeNum(nodeData.recoveryTimeoutMs, 30000);
        var ticksSinceLastFail = tickCount - cb.lastFailureTick;
        var recoveryTicks = Math.max(1, Math.floor(recoveryTimeout / 1000));

        if (cb.state === 'OPEN') {
          if (ticksSinceLastFail >= recoveryTicks) {
            cb.state = 'HALF_OPEN';
            cb.failCount = 0;
            events.push({ tick: tickCount, type: 'CIRCUIT_BREAKER', message: nodeSpecType + ' ' + id + ' → HALF_OPEN (recovery attempt)', severity: 'INFO' });
          } else {
            nodeQps = 0;
            nodeErrorRate = 100;
            nodeLatency = 0;
            events.push({ tick: tickCount, type: 'CIRCUIT_BREAKER', message: nodeSpecType + ' ' + id + ' OPEN — requests rejected', severity: 'WARNING' });
          }
        } else if (cb.state === 'HALF_OPEN') {
          nodeQps = Math.min(nodeQps, halfOpenMaxQps);
          if (nodeQps > effectiveCapacity * 0.5) {
            cb.state = 'OPEN';
            cb.lastFailureTick = tickCount;
            events.push({ tick: tickCount, type: 'CIRCUIT_BREAKER', message: nodeSpecType + ' ' + id + ' → OPEN (half-open overloaded)', severity: 'ERROR' });
          }
        }
        cbState[id] = cb;
      }

      // Chaos mode checks
      if (isFailed || chaosMode === 'KILL') {
        nodeErrorRate = 100; nodeLatency = 5000;
        events.push({ tick: tickCount, type: 'KILL', message: nodeSpecType + ' ' + id + ' killed', severity: 'ERROR' });
      } else if (chaosMode === 'THROTTLE') {
        var throttleFactor = 0.3;
        effectiveCapacity = Math.round(effectiveCapacity * throttleFactor);
        nodeErrorRate = safeMin((1 - throttleFactor) * 100, 50);
        nodeLatency = baseLatency * 3;
        events.push({ tick: tickCount, type: 'THROTTLE', message: nodeSpecType + ' ' + id + ' throttled to 30%', severity: 'WARNING' });
      } else if (chaosMode === 'PARTITION') {
        isPartitioned = true;
        events.push({ tick: tickCount, type: 'PARTITION', message: nodeSpecType + ' ' + id + ' partitioned', severity: 'WARNING' });
      } else if (chaosMode === 'CACHE_EVICTION') {
        nodeData.ttlSeconds = 0; nodeData.evictionPolicy = 'fifo';
        cacheWarmth[id] = 0.02;
        events.push({ tick: tickCount, type: 'CACHE_EVICTION', message: 'Cache ' + id + ' evicted — cold cache stampede triggered', severity: 'WARNING' });
      }

      if (nodeErrorRate < 100) {
        // Memory tracking
        var baseMemMb = maxMemMb * 0.3;
        var denom = Math.max(1, replicas * cpuCores * 50);
        var concurrentFactor = Math.min(nodeQps, denom) / denom;
        memState.usedMb = baseMemMb + (nodeQps * memPerReqMb * concurrentFactor);
        if (memState.usedMb > maxMemMb * 0.9) {
          memState.usedMb = maxMemMb * 0.9;
          oomCrashed = true;
          nodeErrorRate = 100;
          nodeLatency = 5000;
          events.push({ tick: tickCount, type: 'OOM', message: nodeSpecType + ' ' + id + ' ran out of memory (' + Math.round(maxMemMb) + ' MB)', severity: 'ERROR' });
        }
        nodeMetrics[id].memory = safeRound((memState.usedMb / Math.max(1, maxMemMb)) * 100);

        // GC pause
        var memPct = memState.usedMb / Math.max(1, maxMemMb);
        if (memPct > 0.7 && tickCount - memState.lastGcTick > 3) {
          gcPauseMs = Math.min(200, 50 + (memPct - 0.7) * 500);
          memState.usedMb = maxMemMb * 0.3;
          memState.lastGcTick = tickCount;
          nodeLatency += gcPauseMs;
          events.push({ tick: tickCount, type: 'GC', message: nodeSpecType + ' ' + id + ' GC pause ' + safeRound(gcPauseMs) + 'ms', severity: 'WARNING' });
        }

        // Connection pool semaphore
        var poolSize = getPoolSize(nodeData, nodeSpecType);
        var maxConns = safeNum(nodeData.maxConnections, poolSize || 200);
        var activeConns = Math.min(nodeQps, maxConns);
        nodeMetrics[id].activeConnections = activeConns;
        if (nodeQps > maxConns) {
          var connBlocked = nodeQps - maxConns;
          nodeErrorRate = Math.min(nodeErrorRate + 30, 80);
          nodeLatency += (connBlocked / Math.max(1, maxConns)) * 200;
          nodeQps = maxConns;
          events.push({ tick: tickCount, type: 'CONN_POOL', message: nodeSpecType + ' ' + id + ' connection pool saturated (' + maxConns + ')', severity: 'WARNING' });
        }

        // Rate limiter
        if (nodeSpecType === 'RATE_LIMITER') {
          var limit = safeNum(nodeData.rateLimitQps, 2000);
          var dropped = Math.max(0, nodeQps - limit);
          nodeQps = Math.min(nodeQps, limit);
          nodeErrorRate = nodeQps > 0 ? (dropped / (nodeQps + dropped)) * 100 : 0;
          nodeLatency = 1;
        }

        // WAF
        if (nodeSpecType === 'WAF') {
          var blockRate = safeNum(nodeData.blockRate, 0.05);
          var inspected = nodeQps;
          var blocked = inspected * blockRate;
          nodeQps = inspected - blocked;
          nodeLatency = baseLatency + 5;
          nodeErrorRate = safeMin(blockRate * 100, 100);
        }

        // =====================================================================
        // CHANGE: Persistent Async Queue & Multi-Tick Drain Mechanics
        // =====================================================================
        if (nodeSpecType === 'QUEUE' || nodeSpecType === 'PUBSUB') {
          var maxQueueCap = safeNum(nodeData.maxQueueCapacity, 50000);
          queueBacklogs[id] = safeNum(queueBacklogs[id], 0) + load;

          // Reject if queue buffer is completely exhausted
          if (queueBacklogs[id] > maxQueueCap) {
            var overflow = queueBacklogs[id] - maxQueueCap;
            queueBacklogs[id] = maxQueueCap;
            nodeErrorRate = Math.min(100, safeRound((overflow / Math.max(1, load)) * 100));
            events.push({
              tick: tickCount,
              type: 'QUEUE_OVERFLOW',
              message: nodeSpecType + ' ' + id + ' buffer overflow (' + maxQueueCap + ' msgs) — 429 backpressure drop',
              severity: 'ERROR'
            });
          }

          // Asynchronous Producer response: immediate fast ACK (2-4ms)
          nodeLatency = baseLatency;
          rawServiceTime = baseLatency;

          // Calculate consumer processing rate from downstream targets
          var qTargets = adj[id] || [];
          var totalConsumerDrainCapacity = 0;
          qTargets.forEach(function(tgt) {
            var tgtNode = null;
            for (var ti = 0; ti < graphNodes.length; ti++) {
              if (graphNodes[ti].id === tgt) { tgtNode = graphNodes[ti]; break; }
            }
            var tgtData = tgtNode ? (tgtNode.data || {}) : {};
            var tgtReplicas = Math.max(1, nodeReplicas[tgt] || 1);
            var tgtCap = getCapacity(tgtData, tgtNode ? tgtNode.type : '');
            totalConsumerDrainCapacity += (tgtCap * tgtReplicas);
          });
          if (totalConsumerDrainCapacity <= 0) {
            totalConsumerDrainCapacity = safeNum(nodeData.processingRate, 3000) * replicas;
          }

          var drainAmount = Math.min(queueBacklogs[id], totalConsumerDrainCapacity);
          queueBacklogs[id] = Math.max(0, queueBacklogs[id] - drainAmount);
          queueDepth = safeRound(queueBacklogs[id]);

          nodeMetrics[id].qps = safeRound(nodeQps + drainAmount);
          nodeMetrics[id].latency = safeRound(nodeLatency);
          nodeMetrics[id].queueDepth = queueDepth;
          nodeMetrics[id].errorRate = safeRound(nodeErrorRate);
          nodeMetrics[id].cpu = Math.min(100, safeRound((drainAmount / Math.max(1, totalConsumerDrainCapacity)) * 100));
          nodeMetrics[id].replicas = replicas;
          nodeMemory[id] = memState;

          if (queueDepth > 0) {
            events.push({
              tick: tickCount,
              type: 'QUEUE_BACKLOG',
              message: nodeSpecType + ' ' + id + ' buffering ' + queueDepth + ' msgs (draining ' + safeRound(drainAmount) + '/s)',
              severity: queueDepth > maxQueueCap * 0.7 ? 'WARNING' : 'INFO'
            });
          }

          // Dispatch drained messages downstream to workers
          if (qTargets.length > 0 && !isFailed && !isPartitioned && drainAmount > 0) {
            var perWorkerDrain = drainAmount / qTargets.length;
            qTargets.forEach(function(tgt) {
              queue.push({
                id: tgt,
                load: safeNum(perWorkerDrain, 0),
                hopLatency: 2,
                cumulativeLatency: 2,
                deadlineBudgetMs: 5000 // Decoupled background workers get independent deadline
              });
            });
          }

          var qPcts = estimatePercentiles(nodeLatency, gcPauseMs, false);
          nodeMetrics[id].p50Latency = qPcts.p50;
          nodeMetrics[id].p90Latency = qPcts.p90;
          nodeMetrics[id].p95Latency = qPcts.p95;
          nodeMetrics[id].p99Latency = qPcts.p99;
          nodeMetrics[id].p999Latency = qPcts.p999;
          continue; // Finish Queue processing cleanly
        }

        // Kingman M/G/1 queueing delay formula
        var kDelay = kingmanDelay(nodeQps, effectiveCapacity, baseLatency);
        rawQueueDelay = kDelay;
        nodeLatency += kDelay;
        if (nodeQps > effectiveCapacity * 0.7) {
          queueDepth = Math.max(queueDepth, safeRound((kDelay / Math.max(1, baseLatency)) * (nodeQps / 50)));
        }
        if (nodeErrorRate === 0 && nodeQps > effectiveCapacity) {
          var capExcess = nodeQps - effectiveCapacity;
          nodeErrorRate = safeMin((capExcess / Math.max(1, nodeQps)) * 100, 95);
        }

        // Retry storm amplification
        if (nodeErrorRate > 0 && !oomCrashed && nodeSpecType !== 'CIRCUIT_BREAKER') {
          var errRatio = safeNum(nodeErrorRate / 100, 0);
          var retryCount = Math.min(3, Math.floor(errRatio * 10));
          var amplification = 1 + (errRatio * retryCount * 0.5);
          amplification = Math.min(amplification, 2.5);
          var backoffDelay = Math.min(500, errRatio * 50 + errRatio * errRatio * 150);
          nodeQps = safeNum(nodeQps * amplification, 0);
          nodeLatency += backoffDelay;
          if (nodeQps > effectiveCapacity) {
            nodeErrorRate = safeMin(((nodeQps - effectiveCapacity) / Math.max(1, nodeQps)) * 100, 99);
          }
        }

        // Disk I/O penalty (DB writes)
        if (nodeSpecType.indexOf('DATABASE') >= 0 && writeRatio > 0 && nodeQps > 0) {
          var writeOps = nodeQps * writeRatio;
          var storageType = nodeData.storageType || 'ssd';
          var seekTimeMs = storageType === 'hdd' ? 5 : storageType === 'nvme' ? 0.05 : 0.1;
          var walFsyncMs = safeNum(nodeData.walFsyncMs, 20);
          var writePenalty = (writeOps * seekTimeMs * 2) + (Math.min(writeOps, 1) * walFsyncMs * 0.1);
          nodeLatency += writePenalty;
          if (writeOps > effectiveCapacity * 0.5) {
            nodeErrorRate = Math.min(nodeErrorRate + 10, 90);
          }
          var replicaCount = safeNum(nodeData.readReplicaCount, 0);
          var replicaLag = safeNum(nodeData.replicationLagMs, 100);
          if (replicaCount > 0) {
            nodeLatency += (replicaLag * 0.1);
            nodeMetrics[id].readReplicasUsed = replicaCount;
          }
        }

        // Cold cache & stampede physics
        if (nodeSpecType.indexOf('CACHE') >= 0) {
          if (cacheWarmth[id] === undefined) cacheWarmth[id] = 1.0;
          if (isChaosActive || chaosMode === 'CACHE_EVICTION') cacheWarmth[id] = 0.02;
          var baseHitTarget = nodeData.hitRate !== undefined ? safeNum(nodeData.hitRate, 85) / 100 : 0.85;
          var ttlSec = safeNum(nodeData.ttlSeconds, 3600);
          var ttlDecay = Math.max(0, 1 - (nodeQps / Math.max(1, ttlSec * 100)));
          var hitRate = Math.min(0.99, Math.max(0.02, baseHitTarget * cacheWarmth[id] * (0.6 + 0.4 * ttlDecay)));
          hitRate = safeNum(hitRate, 0.02);

          var downstreamFailing = false;
          var cacheTargets = adj[id] || [];
          for (var ci = 0; ci < cacheTargets.length; ci++) {
            if (nodeMetrics[cacheTargets[ci]] && nodeMetrics[cacheTargets[ci]].errorRate > 25) {
              downstreamFailing = true;
              break;
            }
          }
          if (!downstreamFailing && cacheWarmth[id] < 1.0) {
            cacheWarmth[id] = Math.min(1.0, cacheWarmth[id] + 0.25);
          } else if (downstreamFailing && cacheWarmth[id] < 0.5) {
            events.push({ tick: tickCount, type: 'CACHE_STAMPEDE', message: 'Thundering herd on ' + id + ' — downstream database saturated, cache warming blocked', severity: 'ERROR' });
          }

          var cacheMisses = nodeQps * (1 - hitRate);
          nodeLatency = (baseLatency * hitRate) + (40 * (1 - hitRate));
          nodeErrorRate = 0;
          nodeMetrics[id].cacheHitRate = safeRound(hitRate * 100);
          if (cacheTargets.length > 0) {
            cacheTargets.forEach(function(tgt) {
              queue.push({
                id: tgt,
                load: safeNum(cacheMisses / cacheTargets.length, 0),
                hopLatency: cumulativeHopLatency + netLatencyPerHop,
                cumulativeLatency: cumulativePathLatency + nodeLatency,
                deadlineBudgetMs: deadlineBudget
              });
            });
          }
          var cachePcts = estimatePercentiles(nodeLatency, gcPauseMs, false);
          nodeMetrics[id].p50Latency = cachePcts.p50;
          nodeMetrics[id].p90Latency = cachePcts.p90;
          nodeMetrics[id].p95Latency = cachePcts.p95;
          nodeMetrics[id].p99Latency = cachePcts.p99;
          nodeMetrics[id].p999Latency = cachePcts.p999;
          nodeMetrics[id].qps = safeRound(nodeQps);
          nodeMetrics[id].latency = safeRound(nodeLatency);
          nodeMetrics[id].errorRate = safeRound(nodeErrorRate);
          nodeMetrics[id].queueDepth = safeRound(queueDepth);
          nodeMetrics[id].replicas = replicas;
          nodeMemory[id] = memState;
          continue;
        }

        // Load balancer & API gateway
        if (nodeSpecType.indexOf('LOAD_BALANCER') >= 0 || nodeSpecType.indexOf('API_GATEWAY') >= 0) {
          var lbTargets = adj[id] || [];
          if (lbTargets.length > 0) {
            lbTargets.forEach(function(tgt) {
              queue.push({
                id: tgt,
                load: safeNum(nodeQps / lbTargets.length, 0),
                hopLatency: cumulativeHopLatency + netLatencyPerHop,
                cumulativeLatency: cumulativePathLatency + nodeLatency,
                deadlineBudgetMs: deadlineBudget
              });
            });
          }
          var lbPcts = estimatePercentiles(nodeLatency, gcPauseMs, false);
          nodeMetrics[id].p50Latency = lbPcts.p50;
          nodeMetrics[id].p90Latency = lbPcts.p90;
          nodeMetrics[id].p95Latency = lbPcts.p95;
          nodeMetrics[id].p99Latency = lbPcts.p99;
          nodeMetrics[id].p999Latency = lbPcts.p999;
          nodeMetrics[id].qps = safeRound(nodeQps);
          nodeMetrics[id].latency = safeRound(nodeLatency);
          nodeMetrics[id].errorRate = safeRound(nodeErrorRate);
          nodeMetrics[id].queueDepth = safeRound(queueDepth);
          nodeMetrics[id].replicas = replicas;
          nodeMemory[id] = memState;
          continue;
        }
      }

      // =======================================================================
      // CHANGE: Distributed gRPC Deadline Propagation & Cascading Cancellation
      // =======================================================================
      var currentTotalPathLatency = cumulativePathLatency + nodeLatency;
      var isDeadlineExceeded = currentTotalPathLatency > deadlineBudget;
      if (isDeadlineExceeded && nodeErrorRate < 100) {
        nodeErrorRate = Math.min(100, Math.max(nodeErrorRate, 90));
        events.push({
          tick: tickCount,
          type: 'DEADLINE_EXCEEDED',
          message: nodeSpecType + ' ' + id + ' deadline exceeded (' + safeRound(currentTotalPathLatency) + 'ms > ' + deadlineBudget + 'ms) — downstream calls canceled (504)',
          severity: 'ERROR'
        });
      }

      // CPU utilization
      var cpuUtil = safeNum((nodeQps / Math.max(1, effectiveCapacity)) * 100, 0);
      cpuUtil = safeMin(cpuUtil, 100);

      // Latency jitter (±20%)
      var jitterFactor = 0.8 + (Math.random() * 0.4);
      nodeLatency = safeRound(nodeLatency * jitterFactor);

      // Persist metrics & percentiles
      nodeMetrics[id].qps = safeRound(nodeQps);
      nodeMetrics[id].latency = safeRound(nodeLatency);
      nodeMetrics[id].serviceLatency = safeRound(rawServiceTime);
      nodeMetrics[id].queueDelay = safeRound(rawQueueDelay);
      nodeMetrics[id].gcPause = safeRound(gcPauseMs);
      nodeMetrics[id].errorRate = safeRound(nodeErrorRate);
      nodeMetrics[id].cpu = Math.min(100, safeRound(cpuUtil));
      nodeMetrics[id].queueDepth = safeRound(queueDepth);
      nodeMetrics[id].replicas = replicas;

      var genPcts = estimatePercentiles(nodeLatency, gcPauseMs, nodeErrorRate > 15);
      nodeMetrics[id].p50Latency = genPcts.p50;
      nodeMetrics[id].p90Latency = genPcts.p90;
      nodeMetrics[id].p95Latency = genPcts.p95;
      nodeMetrics[id].p99Latency = genPcts.p99;
      nodeMetrics[id].p999Latency = genPcts.p999;

      nodeMemory[id] = memState;

      if (!prevCpu[id]) prevCpu[id] = [];
      prevCpu[id].push(cpuUtil);
      if (prevCpu[id].length > 5) prevCpu[id].shift();

      var isTerminal = (nodeSpecType.indexOf('DATABASE') >= 0 ||
                        nodeSpecType.indexOf('OBJECT_STORAGE') >= 0 ||
                        nodeSpecType.indexOf('FILE_STORAGE') >= 0 ||
                        nodeSpecType.indexOf('DATA_LAKE') >= 0 ||
                        nodeSpecType.indexOf('SEARCH_ENGINE') >= 0 ||
                        nodeSpecType === 'DEAD_LETTER_QUEUE');

      // CHANGE: Do not propagate downstream if request has exceeded deadline (cascading cancellation)
      if (!isTerminal && !isDeadlineExceeded) {
        var downTargets = adj[id] || [];
        if (downTargets.length > 0 && !oomCrashed && !isFailed && !isPartitioned) {
          var writeQps = nodeQps * writeRatio;
          var readQps = nodeQps * (1 - writeRatio);
          var outgoingLoad = readQps + writeQps;
          var perTarget = safeNum(outgoingLoad / downTargets.length, 0);
          downTargets.forEach(function(tgt) {
            queue.push({
              id: tgt,
              load: perTarget,
              hopLatency: cumulativeHopLatency + netLatencyPerHop,
              cumulativeLatency: currentTotalPathLatency,
              deadlineBudgetMs: deadlineBudget
            });
          });
        }
      }
    } // end BFS

    // HPA: auto-scale replicas based on CPU
    graphNodes.forEach(function(n) {
      var id = n.id;
      var d = n.data || {};
      if (!d.replicas || d.replicas < 1) return;
      var cpuHistory = prevCpu[id] || [];
      if (cpuHistory.length < 2) return;
      var avgCpu = cpuHistory.reduce(function(s, v) { return s + v; }, 0) / cpuHistory.length;
      var maxReplicas = safeNum(d.maxReplicas, 10);
      var curReplicas = Math.max(1, nodeReplicas[id] || 1);
      var lastScale = hpaCooldown[id] || 0;

      if (avgCpu > 70 && curReplicas < maxReplicas && tickCount - lastScale >= 2) {
        var add = Math.min(Math.ceil((avgCpu - 70) / 20), 3);
        var newCount = Math.min(curReplicas + add, maxReplicas);
        nodeReplicas[id] = newCount;
        hpaCooldown[id] = tickCount;
        events.push({ tick: tickCount, type: 'HPA', message: d.label + ' scaled up ' + curReplicas + ' -> ' + newCount + ' replicas (CPU ' + safeRound(avgCpu) + '%)', severity: 'INFO' });
      } else if (avgCpu < 30 && curReplicas > 1 && tickCount - lastScale >= 3) {
        var remove = Math.min(Math.ceil((30 - avgCpu) / 20), 2);
        var newCount = Math.max(1, curReplicas - remove);
        nodeReplicas[id] = newCount;
        hpaCooldown[id] = tickCount;
        events.push({ tick: tickCount, type: 'HPA', message: d.label + ' scaled down ' + curReplicas + ' -> ' + newCount + ' replicas (CPU ' + safeRound(avgCpu) + '%)', severity: 'INFO' });
      }
    });

    // Aggregate system health & cluster percentiles
    var nodesArray = Object.keys(nodeMetrics).map(function(k) { return nodeMetrics[k]; });
    var totalErrors = 0, maxLatency = 0, oomCount = 0;
    nodesArray.forEach(function(m) {
      if (m.errorRate > 0) totalErrors += m.errorRate;
      if (m.latency > maxLatency) maxLatency = m.latency;
      if (m.memory >= 90) oomCount++;
    });
    var systemHealth = (oomCount > 0 || totalErrors > 40 || maxLatency > 800) ? 'RED' : (totalErrors > 10 || maxLatency > 150) ? 'YELLOW' : 'GREEN';

    var criticalPathTrace = buildCriticalPathTrace(entrypoints, adj, nodeMetrics);

    var clusterP50 = safeRound(nodesArray.reduce(function(s, n) { return s + (n.p50Latency || n.latency); }, 0) / Math.max(1, nodesArray.length));
    var clusterP90 = safeRound(nodesArray.reduce(function(s, n) { return s + (n.p90Latency || Math.round(n.latency * 1.3)); }, 0) / Math.max(1, nodesArray.length));
    var clusterP95 = safeRound(nodesArray.reduce(function(s, n) { return s + (n.p95Latency || Math.round(n.latency * 1.7)); }, 0) / Math.max(1, nodesArray.length));
    var clusterP99 = safeRound(nodesArray.reduce(function(s, n) { return s + (n.p99Latency || Math.round(n.latency * 2.6)); }, 0) / Math.max(1, nodesArray.length));
    var clusterP999 = safeRound(nodesArray.reduce(function(s, n) { return s + (n.p999Latency || Math.round(n.latency * 4)); }, 0) / Math.max(1, nodesArray.length));

    return {
      tick: tickCount,
      timestamp: Date.now(),
      nodes: nodesArray,
      systemHealth: systemHealth,
      inputQps: safeRound(currentInputQps),
      activeScenario: scenario,
      p50: clusterP50,
      p90: clusterP90,
      p95: clusterP95,
      p99: clusterP99,
      p999: clusterP999,
      trace: criticalPathTrace,
      events: events
    };
  }
`;

export class SimulationWorkerBridge {
  private worker: Worker | null = null;
  private onTickCallback: ((metrics: any) => void) | null = null;
  private onCompleteCallback: ((result: any) => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;
  private onPausedCallback: ((reason: any) => void) | null = null;
  private allTicks: any[] = [];
  private simRunId: string | null = null;
  private syncToBackend: boolean = false;
  private socket: Socket | null = null;
  private healthPingInterval: ReturnType<typeof setInterval> | null = null;
  private lastHealthPong: number = Date.now();
  private healthCheckTimeoutMs: number = 5000;

  constructor() {
    if (typeof window !== 'undefined') {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      this.worker.onerror = (event) => {
        console.error('[WorkerBridge] Worker-level error:', event.message, event);
        if (this.onErrorCallback) {
          this.onErrorCallback({ message: event.message, filename: event.filename, lineno: event.lineno });
        }
      };

      this.worker.onmessage = (e) => {
        const { type, payload } = e.data;
        switch (type) {
          case 'TICK':
            this.allTicks.push(payload);
            if (this.onTickCallback) this.onTickCallback(payload);
            if (this.syncToBackend) this.syncTickToBackend(payload);
            break;
          case 'COMPLETE':
            if (this.onCompleteCallback) this.onCompleteCallback({ ticks: this.allTicks, ...payload });
            if (this.syncToBackend) this.completeBackendRun();
            this.stopHealthPing();
            break;
          case 'ERROR':
            console.error('[WorkerBridge] Worker tick error:', payload);
            if (this.onErrorCallback) this.onErrorCallback(payload);
            break;
          case 'PAUSED':
            console.warn('[WorkerBridge] Simulation paused:', payload.reason);
            if (this.onPausedCallback) this.onPausedCallback(payload);
            this.stopHealthPing();
            break;
          case 'HEALTH_OK':
            this.lastHealthPong = Date.now();
            break;
        }
      };

      this.startHealthPing();
    }
  }

  private startHealthPing() {
    this.lastHealthPong = Date.now();
    this.healthPingInterval = setInterval(() => {
      if (this.worker) {
        this.worker.postMessage({ type: 'HEALTH_CHECK' });
      }
      const elapsed = Date.now() - this.lastHealthPong;
      if (elapsed > this.healthCheckTimeoutMs && this.onErrorCallback) {
        this.onErrorCallback({ message: `Worker unresponsive for ${elapsed}ms`, type: 'HEALTH_TIMEOUT' });
      }
    }, 2000);
  }

  private stopHealthPing() {
    if (this.healthPingInterval) {
      clearInterval(this.healthPingInterval);
      this.healthPingInterval = null;
    }
  }

  private async syncTickToBackend(tick: any) {
    if (!this.simRunId) return;
    try {
      await api.patch(`/simulation/runs/${this.simRunId}/progress`, { tick });
    } catch {
      // Silently ignore backend sync errors — simulation should continue
    }
  }

  private async completeBackendRun() {
    if (!this.simRunId) return;
    try {
      await api.post(`/simulation/runs/${this.simRunId}/stop`);
    } catch {
      // Silently ignore backend sync errors
    }
  }

  init(
    nodes: any[], edges: any[], trafficQps: number, scenario: string,
    failedNodes: string[], nodeChaosModes?: Record<string, string>,
    simRunId?: string, syncBackend?: boolean,
  ) {
    this.simRunId = simRunId || null;
    this.syncToBackend = syncBackend || false;
    this.allTicks = [];
    this.worker?.postMessage({
      type: 'INIT',
      payload: { nodes, edges, trafficQps, scenario, failedNodes, nodeChaosModes, simRunId }
    });
  }

  onError(callback: (error: any) => void) {
    this.onErrorCallback = callback;
  }

  onPaused(callback: (reason: any) => void) {
    this.onPausedCallback = callback;
  }

  enableBackendSync(simRunId: string) {
    this.simRunId = simRunId;
    this.syncToBackend = true;
  }

  disableBackendSync() {
    this.simRunId = null;
    this.syncToBackend = false;
  }

  subscribeToBackend(runId: string, designId: string) {
    if (!this.socket) {
      this.socket = socketIO({ path: '/api/socket' });
    }
    this.socket.emit('simulation:subscribe', { runId, designId });
    this.socket.on('simulation:tick', (data: { runId: string; tick: any }) => {
      if (this.onTickCallback) this.onTickCallback(data.tick);
    });
  }

  unsubscribeFromBackend(runId: string) {
    if (this.socket) {
      this.socket.emit('simulation:unsubscribe', { runId });
    }
  }

  updateGraph(nodes: any[], edges: any[]) {
    this.worker?.postMessage({ type: 'UPDATE_GRAPH', payload: { nodes, edges } });
  }

  updateParams(trafficQps?: number, scenario?: string, failedNodes?: string[], nodeChaosModes?: Record<string, string>) {
    this.worker?.postMessage({
      type: 'UPDATE_PARAMS',
      payload: { trafficQps, scenario, failedNodes, nodeChaosModes }
    });
  }

  applyChaos(nodeId: string, mode: string) {
    this.worker?.postMessage({ type: 'APPLY_CHAOS', payload: { nodeId, mode } });
  }

  healChaos(nodeId: string) {
    this.worker?.postMessage({ type: 'HEAL_CHAOS', payload: { nodeId } });
  }

  start(onTick: (metrics: any) => void, onComplete?: (result: any) => void) {
    this.onTickCallback = onTick;
    this.onCompleteCallback = onComplete || null;
    this.allTicks = [];
    this.lastHealthPong = Date.now();
    this.worker?.postMessage({ type: 'START' });
  }

  stop() {
    this.worker?.postMessage({ type: 'STOP' });
    this.stopHealthPing();
  }

  getTicks() {
    return [...this.allTicks];
  }

  terminate() {
    this.stopHealthPing();
    this.worker?.terminate();
    this.worker = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
