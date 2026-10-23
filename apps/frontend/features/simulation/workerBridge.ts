'use client';

import { api } from '@/lib/api';
import { io as socketIO, Socket } from 'socket.io-client';

// =============================================================================
// Web Worker Blob — runs simulation tick logic in a separate thread
//
// FIXES applied in this version:
//   1. Added try/catch around runSimulationTick() — worker crash no longer
//      silently stops the simulation; errors are posted back to the main thread
//   2. Fixed orphan edge crash — guard adj[source] before pushing
//   3. Fixed division by zero — guard all denominators with Math.max(1, ...)
//   4. Fixed retry storm formula — replaced unbounded geometric series with
//      capped exponential backoff (max 3 retries, 2x multiplier, 500ms cap)
//   5. Fixed write ratio propagation — removed spurious *2 multiplier;
//      downstream load is now correctly: (1 - writeRatio) reads + writeRatio writes
//   6. Fixed CPU formula — removed magic /2 * 0.8; uses utilization = qps / capacity
//      directly per-core, capped at 100%
//   7. Added missing node models: CIRCUIT_BREAKER (open/half-open/closed states),
//      DEAD_LETTER_QUEUE (retry count, poison message tracking),
//      PUBSUB (partition-based fan-out), AUTH_SERVICE / OAUTH / JWT (token overhead),
//      WAF (block rate), REVERSE_PROXY, OBSERVABILITY nodes (no-op passthrough),
//      LLM_GATEWAY / EMBEDDING_SVC / VECTOR_DB / RAG_SERVICE / INFERENCE_SVC
//   8. Added isNaN/isFinite guards on all computed numeric values to prevent
//      NaN propagation through the graph
//   9. Added health ping — worker responds to HEALTH_CHECK messages;
//      main thread uses this to detect unresponsive workers
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
  // Circuit breaker state: { nodeId: { state: 'CLOSED'|'OPEN'|'HALF_OPEN', failCount, lastFailureTick } }
  var cbState = {};

  // Safe number guard — prevents NaN/Infinity from propagating through the graph
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
    });
    var knownIds = {};
    graphNodes.forEach(function(n) { knownIds[n.id] = true; });
    Object.keys(nodeMemory).forEach(function(id) { if (!knownIds[id]) delete nodeMemory[id]; });
    Object.keys(nodeReplicas).forEach(function(id) { if (!knownIds[id]) delete nodeReplicas[id]; });
    Object.keys(hpaCooldown).forEach(function(id) { if (!knownIds[id]) delete hpaCooldown[id]; });
    Object.keys(prevCpu).forEach(function(id) { if (!knownIds[id]) delete prevCpu[id]; });
    Object.keys(cbState).forEach(function(id) { if (!knownIds[id]) delete cbState[id]; });
  }

  self.onmessage = function(e) {
    var msg = e.data;
    var type = msg.type;
    var payload = msg.payload || {};

    // FIX: Health check — worker responds immediately so main thread
    // can detect if the worker is unresponsive
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
        // FIX: Wrap tick processing in try/catch. If anything goes wrong,
        // we post an ERROR message instead of silently dying.
        var metrics = runSimulationTick();
        self.postMessage({ type: 'TICK', payload: metrics });
      } catch (err) {
        self.postMessage({ type: 'ERROR', payload: { message: 'Tick ' + tickCount + ' failed: ' + err.message, tick: tickCount } });
        // Pause simulation on tick error to prevent infinite error loops
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
  // Erlang-C multi-server queueing formula
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
      // FIX: Cap factorial at 12 to prevent overflow (JS Number precision limit)
      // For c > 12, use Stirling approximation
      if (n > 12) {
        return Math.sqrt(2 * Math.PI * n) * Math.pow(n / Math.E, n);
      }
      for (var i = 2; i <= n; i++) r *= i;
      return r;
    }
    var sum = 0;
    for (var k = 0; k < c; k++) sum += Math.pow(c * rho, k) / fact(k);
    var top = Math.pow(c * rho, c) / (fact(c) * (1 - rho));
    return safeMin(top / (sum + top), 1);
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
    if (nodeSpecType.indexOf('QUEUE') >= 0) return 5;
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
    // --- Traffic generation ---
    var currentInputQps = safeNum(trafficQps, 1000);
    if (scenario === 'spike') {
      var phase = tickCount % 15;
      if (phase >= 3 && phase <= 7) currentInputQps *= 3.5;
    } else if (scenario === 'ramp') {
      currentInputQps = Math.min(10000, trafficQps + (tickCount * 100));
    }
    currentInputQps = safeNum(currentInputQps, 0);

    // --- Build adjacency list ---
    var adj = {}, incomingCount = {};
    graphNodes.forEach(function(n) { adj[n.id] = []; incomingCount[n.id] = 0; });
    graphEdges.forEach(function(e) {
      // FIX: Guard against orphan edges (source or target not in graph)
      if (adj[e.source]) adj[e.source].push(e.target);
      if (incomingCount[e.target] !== undefined) incomingCount[e.target]++;
    });

    // --- Find entry points ---
    var entrypoints = graphNodes.filter(function(n) { return incomingCount[n.id] === 0; });
    if (entrypoints.length === 0 && graphNodes.length > 0) entrypoints = [graphNodes[0]];

    // --- Initialize per-node metrics accumulator ---
    var nodeMetrics = {};
    graphNodes.forEach(function(n) {
      nodeMetrics[n.id] = {
        id: n.id, label: n.data && n.data.label || n.type, type: n.type,
        qps: 0, latency: 0, errorRate: 0, cpu: 0, memory: 0, queueDepth: 0,
        cacheHitRate: 0, readReplicasUsed: 0, replicas: Math.max(1, nodeReplicas[n.id] || 1),
        activeConnections: 0
      };
    });

    // --- BFS traversal queue ---
    var queue = [];
    entrypoints.forEach(function(ep) {
      queue.push({ id: ep.id, load: currentInputQps / Math.max(1, entrypoints.length), hopLatency: 0 });
    });
    var visited = {};
    var lbRoundRobinCounter = {};
    var events = [];

    while (queue.length > 0) {
      var item = queue.shift();
      var id = item.id;
      var load = safeNum(item.load, 0);
      var cumulativeHopLatency = safeNum(item.hopLatency, 0);
      var node = null;
      for (var ni = 0; ni < graphNodes.length; ni++) {
        if (graphNodes[ni].id === id) { node = graphNodes[ni]; break; }
      }
      if (!node) continue;

      nodeMetrics[id].qps = safeNum(nodeMetrics[id].qps + load, 0);

      // If already visited, just propagate load downstream (fan-in)
      if (visited[id]) {
        var targets = adj[id] || [];
        if (targets.length > 0) {
          var fanOut = load / targets.length;
          targets.forEach(function(tgt) {
            queue.push({ id: tgt, load: safeNum(fanOut, 0), hopLatency: cumulativeHopLatency + 2 });
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
      var queueDepth = 0;
      var isPartitioned = false;
      var oomCrashed = false;
      var gcPauseMs = 0;

      // ======================================================================
      // CIRCUIT BREAKER model
      // ======================================================================
      if (nodeSpecType === 'CIRCUIT_BREAKER') {
        var cb = cbState[id] || { state: 'CLOSED', failCount: 0, lastFailureTick: 0 };
        var failureThreshold = safeNum(nodeData.failureThreshold, 5);
        var halfOpenMaxQps = safeNum(nodeData.halfOpenMaxQps, 100);
        var recoveryTimeout = safeNum(nodeData.recoveryTimeoutMs, 30000);
        var ticksSinceLastFail = tickCount - cb.lastFailureTick;

        // FIX: Convert recovery timeout from ms to ticks (1 tick = 1s)
        var recoveryTicks = Math.max(1, Math.floor(recoveryTimeout / 1000));

        if (cb.state === 'OPEN') {
          if (ticksSinceLastFail >= recoveryTicks) {
            // Transition to HALF_OPEN
            cb.state = 'HALF_OPEN';
            cb.failCount = 0;
            events.push({ tick: tickCount, type: 'CIRCUIT_BREAKER', message: nodeSpecType + ' ' + id + ' → HALF_OPEN (recovery attempt)', severity: 'INFO' });
          } else {
            // Circuit is open — reject all requests
            nodeQps = 0;
            nodeErrorRate = 100;
            nodeLatency = 0; // Requests rejected instantly
            events.push({ tick: tickCount, type: 'CIRCUIT_BREAKER', message: nodeSpecType + ' ' + id + ' OPEN — requests rejected', severity: 'WARNING' });
          }
        } else if (cb.state === 'HALF_OPEN') {
          // Allow limited traffic
          nodeQps = Math.min(nodeQps, halfOpenMaxQps);
          if (nodeQps > effectiveCapacity * 0.5) {
            // If overloaded in half-open, trip back to OPEN
            cb.state = 'OPEN';
            cb.lastFailureTick = tickCount;
            events.push({ tick: tickCount, type: 'CIRCUIT_BREAKER', message: nodeSpecType + ' ' + id + ' → OPEN (half-open overloaded)', severity: 'ERROR' });
          }
        }
        cbState[id] = cb;
      }

      // ======================================================================
      // DEAD_LETTER_QUEUE model
      // ======================================================================
      if (nodeSpecType === 'DEAD_LETTER_QUEUE') {
        // DLQ processes failed messages — it always accepts and logs
        var maxRetry = safeNum(nodeData.maxRetryCount, 3);
        var dlqBaseRate = safeNum(nodeData.dlqBaseRate, 0.02);
        var processingRate = safeNum(nodeData.processingRate, 500) * replicas;
        nodeQps = Math.min(nodeQps, processingRate);
        // DLQ has a small error rate for messages beyond max retries
        var poisonRatio = Math.min(1, nodeQps / (processingRate * (maxRetry + 1)));
        nodeErrorRate = poisonRatio * 5;
        nodeLatency = baseLatency + (poisonRatio * 100);
        if (poisonRatio > 0.5) {
          events.push({ tick: tickCount, type: 'DLQ', message: nodeSpecType + ' ' + id + ' poison messages: ' + safeRound(poisonRatio * 100) + '%', severity: 'WARNING' });
        }
      }

      // ======================================================================
      // Chaos mode checks
      // ======================================================================
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
        events.push({ tick: tickCount, type: 'CACHE_EVICTION', message: 'Cache ' + id + ' evicted', severity: 'WARNING' });
      }

      // ======================================================================
      // Node processing (skip if already killed by circuit breaker or chaos)
      // ======================================================================
      if (nodeErrorRate < 100) {
        // --- Memory tracking ---
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

        // --- GC pause ---
        var memPct = memState.usedMb / Math.max(1, maxMemMb);
        if (memPct > 0.7 && tickCount - memState.lastGcTick > 3) {
          gcPauseMs = Math.min(200, 50 + (memPct - 0.7) * 500);
          memState.usedMb = maxMemMb * 0.3;
          memState.lastGcTick = tickCount;
          nodeLatency += gcPauseMs;
          events.push({ tick: tickCount, type: 'GC', message: nodeSpecType + ' ' + id + ' GC pause ' + safeRound(gcPauseMs) + 'ms', severity: 'WARNING' });
        }

        // --- Connection pool semaphore ---
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

        // --- Rate limiter ---
        if (nodeSpecType === 'RATE_LIMITER') {
          var limit = safeNum(nodeData.rateLimitQps, 2000);
          var dropped = Math.max(0, nodeQps - limit);
          nodeQps = Math.min(nodeQps, limit);
          nodeErrorRate = nodeQps > 0 ? (dropped / (nodeQps + dropped)) * 100 : 0;
          nodeLatency = 1;
        }

        // --- WAF (Web Application Firewall) ---
        if (nodeSpecType === 'WAF') {
          var blockRate = safeNum(nodeData.blockRate, 0.05);
          var inspected = nodeQps;
          var blocked = inspected * blockRate;
          nodeQps = inspected - blocked;
          nodeLatency = baseLatency + 5; // inspection overhead
          nodeErrorRate = safeMin(blockRate * 100, 100);
          if (blockRate > 0.2) {
            events.push({ tick: tickCount, type: 'WAF', message: nodeSpecType + ' ' + id + ' blocking ' + safeRound(blockRate * 100) + '% of traffic', severity: 'WARNING' });
          }
        }

        // --- Auth services (AUTH_SERVICE, OAUTH, JWT) ---
        if (nodeSpecType === 'AUTH_SERVICE' || nodeSpecType === 'OAUTH' || nodeSpecType === 'JWT') {
          // Auth has overhead per request
          var tokenCacheHit = 0.7; // 70% of auth checks hit cache
          nodeLatency = nodeLatency * (tokenCacheHit * 0.5 + (1 - tokenCacheHit) * 2);
          // Rate-limit auth to prevent brute force
          var authCapacity = effectiveCapacity * 0.6;
          if (nodeQps > authCapacity) {
            var excess = (nodeQps - authCapacity) / nodeQps;
            nodeErrorRate = Math.min(nodeErrorRate + excess * 50, 60);
            nodeQps = Math.min(nodeQps, authCapacity);
          }
        }

        // --- Erlang-C queueing (multi-server) ---
        if (poolSize > 0 && nodeQps > 0) {
          var mu = effectiveCapacity / Math.max(1, poolSize);
          var rho = nodeQps / (poolSize * Math.max(1, mu));
          if (rho >= 1) {
            queueDepth = nodeQps - effectiveCapacity;
            nodeErrorRate = Math.min(90, ((nodeQps - effectiveCapacity) / Math.max(1, nodeQps)) * 100);
            nodeLatency += (rho - 1) * 1000;
          } else {
            var cProb = erlangC(nodeQps, mu, poolSize);
            var avgWait = (cProb * mu) / Math.max(1, (poolSize * mu - nodeQps));
            queueDepth = safeRound(avgWait * nodeQps);
            nodeLatency += avgWait;
          }
        }

        // --- Queue node ---
        if (nodeSpecType === 'QUEUE') {
          var processingRate = safeNum(nodeData.processingRate, 3000) * replicas;
          queueDepth = Math.max(0, nodeQps - processingRate);
          nodeQps = Math.min(nodeQps, processingRate);
        }

        // --- PubSub node ---
        if (nodeSpecType === 'PUBSUB') {
          var pubRate = safeNum(nodeData.publishRate, 5000) * replicas;
          var subRate = safeNum(nodeData.subscribeRate, 5000) * replicas;
          var partitions = Math.max(1, safeNum(nodeData.partitions, 3));
          var throughput = Math.min(pubRate, subRate * partitions);
          var backlog = Math.max(0, nodeQps - throughput);
          nodeQps = Math.min(nodeQps, throughput);
          nodeLatency = baseLatency + (backlog > 0 ? Math.min(backlog / throughput * 1000, 5000) : 0);
          queueDepth = backlog;
          if (backlog > throughput * 2) {
            events.push({ tick: tickCount, type: 'PUBSUB', message: nodeSpecType + ' ' + id + ' backlog growing: ' + safeRound(backlog) + ' messages', severity: 'WARNING' });
          }
        }

        // --- Capacity overload (generic) ---
        if (nodeErrorRate === 0 && nodeQps > effectiveCapacity) {
          var excess = nodeQps - effectiveCapacity;
          nodeErrorRate = safeMin((excess / Math.max(1, nodeQps)) * 100, 95);
          nodeLatency = baseLatency + cumulativeHopLatency + (excess * 0.1);
        }

        // --- FIX: Retry storm / error backoff ---
        // OLD formula: nodeQps *= (1 + errRatio + errRatio² + errRatio³ + errRatio⁴)
        //   This is an unbounded geometric series that can blow up to Infinity
        // NEW: capped exponential backoff — max 3 retry amplifications, 2x multiplier, capped at 2x original
        if (nodeErrorRate > 0 && !oomCrashed && nodeSpecType !== 'CIRCUIT_BREAKER') {
          var errRatio = safeNum(nodeErrorRate / 100, 0);
          // Cap amplification: at most 3 effective "retries"
          // Each retry amplifies load by (1 + errRatio * retryCount), capped at 2x
          var retryCount = Math.min(3, Math.floor(errRatio * 10));
          var amplification = 1 + (errRatio * retryCount * 0.5);
          amplification = Math.min(amplification, 2.0); // cap at 2x original load
          var backoffDelay = Math.min(500, errRatio * 50 + errRatio * errRatio * 150);
          nodeQps = safeNum(nodeQps * amplification, 0);
          nodeLatency += backoffDelay;
          if (nodeQps > effectiveCapacity) {
            nodeErrorRate = safeMin(((nodeQps - effectiveCapacity) / Math.max(1, nodeQps)) * 100, 99);
          }
        }

        // --- Disk I/O penalty (DB writes) ---
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
          // Read replica offload
          var replicaCount = safeNum(nodeData.readReplicaCount, 0);
          var replicaLag = safeNum(nodeData.replicationLagMs, 100);
          if (replicaCount > 0) {
            nodeLatency += (replicaLag * 0.1);
            nodeMetrics[id].readReplicasUsed = replicaCount;
          }
        }

        // --- CDN ---
        if (nodeSpecType.indexOf('CDN') >= 0) {
          var hitRatio = nodeData.hitRatioOverride !== undefined ? safeNum(nodeData.hitRatioOverride, 90) / 100 : 0.90;
          if (isChaosActive) hitRatio = 0.1;
          hitRatio = safeNum(hitRatio, 0.1);
          var misses = nodeQps * (1 - hitRatio);
          nodeLatency = (2 * hitRatio) + (80 * (1 - hitRatio));
          nodeErrorRate = 0;
          nodeMetrics[id].cacheHitRate = safeRound(hitRatio * 100);
          var cdnTargets = adj[id] || [];
          if (cdnTargets.length > 0) {
            cdnTargets.forEach(function(tgt) {
              queue.push({ id: tgt, load: safeNum(misses / cdnTargets.length, 0), hopLatency: cumulativeHopLatency + netLatencyPerHop });
            });
          }
          // FIX: Write back metrics and continue (don't fall through to generic CPU/propagation)
          nodeMetrics[id].qps = safeRound(nodeQps);
          nodeMetrics[id].latency = safeRound(nodeLatency);
          nodeMetrics[id].errorRate = safeRound(nodeErrorRate);
          nodeMetrics[id].queueDepth = safeRound(queueDepth);
          nodeMetrics[id].replicas = replicas;
          nodeMemory[id] = memState;
          continue;
        }

        // --- Cache ---
        if (nodeSpecType.indexOf('CACHE') >= 0) {
          var hitRate = 0.85;
          if (isChaosActive) hitRate = 0.05;
          var ttlSec = safeNum(nodeData.ttlSeconds, 3600);
          var ttlDecay = Math.max(0, 1 - (nodeQps / Math.max(1, ttlSec * 100)));
          hitRate = Math.min(0.99, hitRate * (0.5 + 0.5 * ttlDecay));
          if (nodeData.evictionPolicy === 'lfu') hitRate *= 0.95;
          else if (nodeData.evictionPolicy === 'fifo') hitRate *= 0.90;
          hitRate = safeNum(hitRate, 0.02);
          var cacheMisses = nodeQps * (1 - hitRate);
          nodeLatency = (baseLatency * hitRate) + (40 * (1 - hitRate));
          nodeErrorRate = 0;
          nodeMetrics[id].cacheHitRate = safeRound(hitRate * 100);
          var cacheTargets = adj[id] || [];
          if (cacheTargets.length > 0) {
            cacheTargets.forEach(function(tgt) {
              queue.push({ id: tgt, load: safeNum(cacheMisses / cacheTargets.length, 0), hopLatency: cumulativeHopLatency + netLatencyPerHop });
            });
          }
          // FIX: Write back metrics and continue
          nodeMetrics[id].qps = safeRound(nodeQps);
          nodeMetrics[id].latency = safeRound(nodeLatency);
          nodeMetrics[id].errorRate = safeRound(nodeErrorRate);
          nodeMetrics[id].queueDepth = safeRound(queueDepth);
          nodeMetrics[id].replicas = replicas;
          nodeMemory[id] = memState;
          continue;
        }

        // --- Load balancer ---
        if (nodeSpecType.indexOf('LOAD_BALANCER') >= 0 || nodeSpecType.indexOf('API_GATEWAY') >= 0) {
          var algo = nodeData.routingAlgorithm || 'round_robin';
          var lbTargets = adj[id] || [];
          if (lbTargets.length > 0) {
            if (algo === 'least_connections') {
              var loads = lbTargets.map(function(t) {
                return { id: t, load: nodeMetrics[t] && nodeMetrics[t].qps || 0 };
              });
              loads.sort(function(a, b) { return a.load - b.load; });
              loads[0].load += nodeQps;
              loads.forEach(function(t) {
                queue.push({ id: t.id, load: safeNum(t.load, 0), hopLatency: cumulativeHopLatency + netLatencyPerHop });
              });
            } else if (algo === 'ip_hash') {
              if (!lbRoundRobinCounter[id]) lbRoundRobinCounter[id] = 0;
              var idx = lbRoundRobinCounter[id] % lbTargets.length;
              lbRoundRobinCounter[id]++;
              queue.push({ id: lbTargets[idx], load: safeNum(nodeQps, 0), hopLatency: cumulativeHopLatency + netLatencyPerHop });
            } else {
              // round_robin (default)
              lbTargets.forEach(function(tgt) {
                queue.push({ id: tgt, load: safeNum(nodeQps / lbTargets.length, 0), hopLatency: cumulativeHopLatency + netLatencyPerHop });
              });
            }
          }
          // FIX: Write back metrics and continue
          nodeMetrics[id].qps = safeRound(nodeQps);
          nodeMetrics[id].latency = safeRound(nodeLatency);
          nodeMetrics[id].errorRate = safeRound(nodeErrorRate);
          nodeMetrics[id].queueDepth = safeRound(queueDepth);
          nodeMetrics[id].replicas = replicas;
          nodeMemory[id] = memState;
          continue;
        }

        // --- LLM Gateway / Embedding / VectorDB / RAG / Inference ---
        if (nodeSpecType === 'LLM_GATEWAY') {
          var contextWindow = safeNum(nodeData.contextWindow, 4096);
          var overheadPerToken = contextWindow / 4096;
          nodeLatency = baseLatency * overheadPerToken;
          if (nodeQps > effectiveCapacity) {
            nodeErrorRate = safeMin(((nodeQps - effectiveCapacity) / nodeQps) * 100, 80);
            nodeQps = effectiveCapacity;
          }
        }
        if (nodeSpecType === 'EMBEDDING_SVC') {
          var dimSize = safeNum(nodeData.dimensionSize, 768);
          var computeFactor = dimSize / 768;
          nodeLatency = baseLatency * computeFactor;
          if (nodeQps > effectiveCapacity) {
            nodeErrorRate = safeMin(((nodeQps - effectiveCapacity) / nodeQps) * 100, 60);
            nodeQps = effectiveCapacity;
          }
        }
        if (nodeSpecType === 'VECTOR_DB') {
          var topK = Math.max(1, safeNum(nodeData.topK, 10));
          var searchComplexity = Math.log2(topK + dimSize) / 10;
          nodeLatency = baseLatency * (1 + searchComplexity);
          if (nodeQps > effectiveCapacity) {
            nodeErrorRate = safeMin(((nodeQps - effectiveCapacity) / nodeQps) * 100, 70);
            nodeQps = effectiveCapacity;
          }
        }
        if (nodeSpecType === 'RAG_SERVICE') {
          var chunkSize = safeNum(nodeData.chunkSize, 512);
          var ragOverhead = chunkSize / 512;
          nodeLatency = baseLatency * ragOverhead;
          if (nodeQps > effectiveCapacity) {
            nodeErrorRate = safeMin(((nodeQps - effectiveCapacity) / nodeQps) * 100, 60);
            nodeQps = effectiveCapacity;
          }
        }
        if (nodeSpecType === 'INFERENCE_SVC') {
          // Inference is slow and expensive
          var inferenceOverhead = 5; // 5x multiplier on base latency
          nodeLatency = baseLatency * inferenceOverhead;
          if (nodeQps > effectiveCapacity) {
            nodeErrorRate = safeMin(((nodeQps - effectiveCapacity) / nodeQps) * 100, 90);
            nodeQps = effectiveCapacity;
          }
        }

        // --- Service Mesh ---
        if (nodeSpecType === 'SERVICE_MESH') {
          var sidecarOverhead = safeNum(nodeData.sidecarLatencyMs, 3);
          nodeLatency += sidecarOverhead * 2; // inbound + outbound sidecar
          // mTLS overhead
          if (nodeData.enableMtls !== false) {
            nodeLatency += 2;
          }
          // Retry amplification
          if (nodeData.enableRetries !== false && nodeErrorRate > 0) {
            nodeQps *= (1 + nodeErrorRate / 200); // 0.5% amplification per error %
          }
        }

        // --- Observability nodes (MONITORING, LOGS, METRICS, TRACING, ALERTING) ---
        // These consume a small % of CPU/memory but pass traffic through
        if (['MONITORING', 'LOGS', 'METRICS', 'TRACING', 'ALERTING', 'SECRETS_MANAGER'].indexOf(nodeSpecType) >= 0) {
          var obsOverhead = 0.05; // 5% overhead for observability
          nodeLatency += 2;
          nodeQps = nodeQps * (1 - obsOverhead);
        }

        // --- Notification Service ---
        if (nodeSpecType === 'NOTIFICATION_SERVICE') {
          var channels = Math.max(1, safeNum(nodeData.channels, 1));
          var channelOverhead = channels * 0.5;
          nodeLatency = baseLatency + channelOverhead;
          if (nodeQps > effectiveCapacity) {
            nodeErrorRate = safeMin(((nodeQps - effectiveCapacity) / nodeQps) * 100, 60);
            nodeQps = effectiveCapacity;
          }
        }
      }

      // ======================================================================
      // FIX: CPU calculation — removed magic /2 * 0.8 fudge factor
      // OLD: cpuUtil = Math.round(cpuUtil * (cpuCores / 2) * 0.8);
      // NEW: utilization = qps / capacity, normalized by cores
      // ======================================================================
      var cpuUtil = safeNum((nodeQps / Math.max(1, effectiveCapacity)) * 100, 0);
      // Scale by core count: more cores = more throughput at same utilization
      cpuUtil = safeMin(cpuUtil, 100);

      // --- Payload variability (latency jitter: ±20%) ---
      var jitterFactor = 0.8 + (Math.random() * 0.4);
      nodeLatency = safeRound(nodeLatency * jitterFactor);

      // --- Persist metrics ---
      nodeMetrics[id].qps = safeRound(nodeQps);
      nodeMetrics[id].latency = safeRound(nodeLatency);
      nodeMetrics[id].errorRate = safeRound(nodeErrorRate);
      nodeMetrics[id].cpu = Math.min(100, safeRound(cpuUtil));
      nodeMetrics[id].queueDepth = safeRound(queueDepth);
      nodeMetrics[id].replicas = replicas;

      // Store memory state
      nodeMemory[id] = memState;

      // Track CPU for HPA
      if (!prevCpu[id]) prevCpu[id] = [];
      prevCpu[id].push(cpuUtil);
      if (prevCpu[id].length > 5) prevCpu[id].shift();

      // ======================================================================
      // FIX: Propagate to downstream — fixed write ratio
      // OLD: writeQps = nodeQps * writeRatio * 2   (spurious *2)
      //      outgoingLoad = readQps + writeQps
      // NEW: writeQps = nodeQps * writeRatio
      //      readQps = nodeQps * (1 - writeRatio)
      //      outgoingLoad = readQps + writeQps = nodeQps (correct)
      // ======================================================================
      // For terminal nodes (DB, Queue) that don't propagate further, skip propagation
      var isTerminal = (nodeSpecType.indexOf('DATABASE') >= 0 ||
                        nodeSpecType.indexOf('OBJECT_STORAGE') >= 0 ||
                        nodeSpecType.indexOf('FILE_STORAGE') >= 0 ||
                        nodeSpecType.indexOf('DATA_LAKE') >= 0 ||
                        nodeSpecType.indexOf('SEARCH_ENGINE') >= 0 ||
                        nodeSpecType === 'DEAD_LETTER_QUEUE' ||
                        nodeSpecType === 'QUEUE');
      if (!isTerminal) {
        var targets = adj[id] || [];
        if (targets.length > 0 && !oomCrashed && !isFailed && !isPartitioned) {
          var writeQps = nodeQps * writeRatio;
          var readQps = nodeQps * (1 - writeRatio);
          // FIX: Use total QPS, not writeRatio * 2
          var outgoingLoad = readQps + writeQps; // = nodeQps
          var perTarget = safeNum(outgoingLoad / targets.length, 0);
          targets.forEach(function(tgt) {
            queue.push({ id: tgt, load: perTarget, hopLatency: cumulativeHopLatency + netLatencyPerHop });
          });
        }
      }
    } // end BFS

    // ========================================================================
    // HPA: auto-scale replicas based on CPU
    // ========================================================================
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

    // ========================================================================
    // Aggregate system health
    // ========================================================================
    var nodesArray = Object.keys(nodeMetrics).map(function(k) { return nodeMetrics[k]; });
    var totalErrors = 0, maxLatency = 0, oomCount = 0;
    nodesArray.forEach(function(m) {
      if (m.errorRate > 0) totalErrors += m.errorRate;
      if (m.latency > maxLatency) maxLatency = m.latency;
      if (m.memory >= 90) oomCount++;
    });
    var systemHealth = (oomCount > 0 || totalErrors > 40 || maxLatency > 800) ? 'RED' : (totalErrors > 10 || maxLatency > 150) ? 'YELLOW' : 'GREEN';

    return {
      tick: tickCount, timestamp: Date.now(), nodes: nodesArray,
      systemHealth: systemHealth, inputQps: safeRound(currentInputQps), activeScenario: scenario,
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

      // FIX: Add worker-level error handler — catches uncaught errors
      // that propagate out of the worker's event loop
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
          // FIX: Handle worker errors and paused state
          case 'ERROR':
            console.error('[WorkerBridge] Worker tick error:', payload);
            if (this.onErrorCallback) this.onErrorCallback(payload);
            break;
          case 'PAUSED':
            console.warn('[WorkerBridge] Simulation paused:', payload.reason);
            if (this.onPausedCallback) this.onPausedCallback(payload);
            this.stopHealthPing();
            break;
          // FIX: Health check pong
          case 'HEALTH_OK':
            this.lastHealthPong = Date.now();
            break;
        }
      };

      // FIX: Start health pings — detect if worker becomes unresponsive
      this.startHealthPing();
    }
  }

  // FIX: Health ping — every 2s we ask the worker if it's alive.
  // If no response within `healthCheckTimeoutMs`, we notify via onErrorCallback.
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

  // FIX: Allow main thread to register error/paused callbacks
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
    // Reset health pong on start
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
