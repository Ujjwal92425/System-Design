'use client';

import { api } from '@/lib/api';
import { io as socketIO, Socket } from 'socket.io-client';

const workerCode = `
  let isRunning = false;
  let intervalId = null;
  let tickCount = 0;

  let graphNodes = [];
  let graphEdges = [];
  let trafficQps = 1000;
  let scenario = 'constant';
  let failedNodes = [];
  let nodeChaosModes = {};
  let simRunId = null;

  var nodeMemory = {};    // { nodeId: { usedMb, lastGcTick } }
  var nodeReplicas = {};  // { nodeId: count }
  var hpaCooldown = {};   // { nodeId: tick }
  var prevCpu = {};       // { nodeId: [cpu1, cpu2] } rolling window

  function initPersistentState() {
    graphNodes.forEach(function(n) {
      var id = n.id;
      var d = n.data || {};
      if (!nodeMemory[id]) nodeMemory[id] = { usedMb: 0, lastGcTick: 0 };
      if (nodeReplicas[id] === undefined) nodeReplicas[id] = d.replicas || 1;
      if (hpaCooldown[id] === undefined) hpaCooldown[id] = 0;
      if (prevCpu[id] === undefined) prevCpu[id] = [];
    });
    var knownIds = {};
    graphNodes.forEach(function(n) { knownIds[n.id] = true; });
    Object.keys(nodeMemory).forEach(function(id) { if (!knownIds[id]) delete nodeMemory[id]; });
    Object.keys(nodeReplicas).forEach(function(id) { if (!knownIds[id]) delete nodeReplicas[id]; });
    Object.keys(hpaCooldown).forEach(function(id) { if (!knownIds[id]) delete hpaCooldown[id]; });
    Object.keys(prevCpu).forEach(function(id) { if (!knownIds[id]) delete prevCpu[id]; });
  }

  self.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'INIT') {
      graphNodes = payload.nodes || [];
      graphEdges = payload.edges || [];
      trafficQps = payload.trafficQps || 1000;
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
      if (!isRunning) { isRunning = true; startSimulation(); }
    } else if (type === 'STOP') {
      isRunning = false;
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
    } else if (type === 'UPDATE_PARAMS') {
      trafficQps = payload.trafficQps ?? trafficQps;
      scenario = payload.scenario ?? scenario;
      failedNodes = payload.failedNodes ?? failedNodes;
      nodeChaosModes = payload.nodeChaosModes ?? nodeChaosModes;
    } else if (type === 'UPDATE_GRAPH') {
      graphNodes = payload.nodes || [];
      graphEdges = payload.edges || [];
    } else if (type === 'APPLY_CHAOS') {
      nodeChaosModes[payload.nodeId] = payload.mode;
    } else if (type === 'HEAL_CHAOS') {
      delete nodeChaosModes[payload.nodeId];
    }
  };

  function startSimulation() {
    initPersistentState();
    intervalId = setInterval(function() {
      tickCount++;
      var metrics = runSimulationTick();
      self.postMessage({ type: 'TICK', payload: metrics });
      if (tickCount >= 300) {
        isRunning = false;
        clearInterval(intervalId);
        intervalId = null;
        self.postMessage({ type: 'COMPLETE', payload: { ticks: tickCount } });
      }
    }, 1000);
  }

  function erlangC(lmbda, mu, c) {
    var rho = lmbda / (c * mu);
    if (rho >= 1) return 1;
    function fact(n) { if (n <= 1) return 1; var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; }
    var sum = 0;
    for (var k = 0; k < c; k++) sum += Math.pow(c * rho, k) / fact(k);
    var top = Math.pow(c * rho, c) / (fact(c) * (1 - rho));
    return top / (sum + top);
  }

  function getCapacity(nodeData, nodeSpecType) {
    if (nodeData.capacity !== undefined && nodeData.capacity > 0) return nodeData.capacity;
    var cpuCores = nodeData.cpuCores || 2;
    var base = 3000;
    if (nodeSpecType.indexOf('DATABASE') >= 0) base = 800;
    else if (nodeSpecType.indexOf('CACHE') >= 0) base = 10000;
    else if (nodeSpecType.indexOf('WEB_SERVER') >= 0) base = 2500;
    else if (nodeSpecType.indexOf('CDN') >= 0) base = 50000;
    else if (nodeSpecType.indexOf('LOAD_BALANCER') >= 0) base = 20000;
    else if (nodeSpecType.indexOf('QUEUE') >= 0) base = 3000;
    else if (nodeSpecType.indexOf('RATE_LIMITER') >= 0) base = 5000;
    return Math.round(base * (cpuCores / 2));
  }

  function getBaseLatency(nodeData, nodeSpecType) {
    if (nodeData.latency !== undefined && nodeData.latency > 0) return nodeData.latency;
    if (nodeSpecType.indexOf('DATABASE') >= 0) return 40;
    if (nodeSpecType.indexOf('CACHE') >= 0) return 2;
    if (nodeSpecType.indexOf('CDN') >= 0) return 2;
    if (nodeSpecType.indexOf('QUEUE') >= 0) return 5;
    return 5;
  }

  function getPayloadSizeKb(nodeData) {
    return nodeData.avgPayloadSizeKb || 4;
  }

  function getRamGb(nodeData) {
    return nodeData.ramGb || 4;
  }

  function getWriteRatio(nodeData, nodeSpecType) {
    if (nodeData.writeRatio !== undefined) return nodeData.writeRatio;
    if (nodeSpecType.indexOf('DATABASE') >= 0) return 0.3;
    if (nodeSpecType.indexOf('CACHE') >= 0) return 0.2;
    if (nodeSpecType.indexOf('QUEUE') >= 0) return 0.5;
    return 0.1;
  }

  function getNetworkLatencyMs(nodeData) {
    return nodeData.networkLatencyMs || 2;
  }

  function getMaxConnections(nodeData, poolSize) {
    if (nodeData.maxConnections !== undefined) return nodeData.maxConnections;
    return poolSize || 200;
  }

  function runSimulationTick() {
    var currentInputQps = trafficQps;
    if (scenario === 'spike') {
      var phase = tickCount % 15;
      if (phase >= 3 && phase <= 7) currentInputQps = trafficQps * 3.5;
    } else if (scenario === 'ramp') {
      currentInputQps = trafficQps + (tickCount * 100);
    }

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
        qps: 0, latency: 0, errorRate: 0, cpu: 0, memory: 0, queueDepth: 0,
        cacheHitRate: 0, readReplicasUsed: 0, replicas: nodeReplicas[n.id] || 1,
        activeConnections: 0
      };
    });

    var queue = [];
    entrypoints.forEach(function(ep) { queue.push({ id: ep.id, load: currentInputQps / entrypoints.length, hopLatency: 0 }); });
    var visited = {};
    var lbRoundRobinCounter = {};
    var events = [];

    while (queue.length > 0) {
      var item = queue.shift();
      var id = item.id;
      var load = item.load;
      var cumulativeHopLatency = item.hopLatency || 0;
      var node = graphNodes.find(function(n) { return n.id === id; });
      if (!node) continue;

      nodeMetrics[id].qps += load;
      if (visited[id]) {
        var targets = adj[id] || [];
        targets.forEach(function(tgt) { queue.push({ id: tgt, load: (load / Math.max(1, targets.length)), hopLatency: cumulativeHopLatency + 2 }); });
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
      var cpuCores = nodeData.cpuCores || 2;
      var ramGb = getRamGb(nodeData);
      var maxMemMb = ramGb * 1024;
      var payloadKb = getPayloadSizeKb(nodeData);
      var memPerReqMb = payloadKb / 1024;
      var writeRatio = getWriteRatio(nodeData, nodeSpecType);
      var netLatencyPerHop = getNetworkLatencyMs(nodeData);
      var memState = nodeMemory[id] || { usedMb: 0, lastGcTick: 0 };

      var nodeQps = nodeMetrics[id].qps;
      var nodeLatency = baseLatency + cumulativeHopLatency;
      var nodeErrorRate = 0;
      var queueDepth = 0;
      var isPartitioned = false;
      var oomCrashed = false;
      var gcPauseMs = 0;

      // --- Chaos mode checks ---
      if (isFailed || chaosMode === 'KILL') {
        nodeErrorRate = 100; nodeLatency = 5000;
        events.push({ tick: tickCount, type: 'KILL', message: nodeSpecType + ' ' + id + ' killed', severity: 'ERROR' });
      } else if (chaosMode === 'THROTTLE') {
        var throttleFactor = 0.3;
        effectiveCapacity = Math.round(effectiveCapacity * throttleFactor);
        nodeErrorRate = Math.min(50, (1 - throttleFactor) * 100);
        nodeLatency = baseLatency * 3;
        events.push({ tick: tickCount, type: 'THROTTLE', message: nodeSpecType + ' ' + id + ' throttled to 30%', severity: 'WARNING' });
      } else if (chaosMode === 'PARTITION') {
        isPartitioned = true;
        events.push({ tick: tickCount, type: 'PARTITION', message: nodeSpecType + ' ' + id + ' partitioned', severity: 'WARNING' });
      } else if (chaosMode === 'CACHE_EVICTION') {
        nodeData.ttlSeconds = 0; nodeData.evictionPolicy = 'fifo';
        events.push({ tick: tickCount, type: 'CACHE_EVICTION', message: 'Cache ' + id + ' evicted', severity: 'WARNING' });
      }

      if (nodeErrorRate < 100) {
        // --- Memory tracking ---
        var baseMemMb = maxMemMb * 0.3;
        var concurrentFactor = Math.min(nodeQps, replicas * cpuCores * 50) / (replicas * cpuCores * 50);
        memState.usedMb = baseMemMb + (nodeQps * memPerReqMb * concurrentFactor);
        if (memState.usedMb > maxMemMb * 0.9) {
          memState.usedMb = maxMemMb * 0.9;
          oomCrashed = true;
          nodeErrorRate = 100;
          nodeLatency = 5000;
          events.push({ tick: tickCount, type: 'OOM', message: nodeSpecType + ' ' + id + ' ran out of memory (' + Math.round(maxMemMb) + ' MB)', severity: 'ERROR' });
        }
        nodeMetrics[id].memory = Math.round((memState.usedMb / maxMemMb) * 100);

        // --- GC pause ---
        var memPct = memState.usedMb / maxMemMb;
        if (memPct > 0.7 && tickCount - memState.lastGcTick > 3) {
          gcPauseMs = Math.min(200, 50 + (memPct - 0.7) * 500);
          memState.usedMb = maxMemMb * 0.3;
          memState.lastGcTick = tickCount;
          nodeLatency += gcPauseMs;
          events.push({ tick: tickCount, type: 'GC', message: nodeSpecType + ' ' + id + ' GC pause ' + Math.round(gcPauseMs) + 'ms', severity: 'WARNING' });
        }

        // --- Connection pool semaphore ---
        var poolSize = 0;
        if (nodeSpecType.indexOf('DATABASE') >= 0) poolSize = nodeData.connectionPoolSize || 50;
        else if (nodeSpecType.indexOf('WEB_SERVER') >= 0) poolSize = nodeData.threadPoolSize || 200;
        else if (nodeSpecType.indexOf('APP_SERVER') >= 0) poolSize = nodeData.threadPoolSize || 100;
        var maxConns = getMaxConnections(nodeData, poolSize);
        var activeConns = Math.min(nodeQps, maxConns);
        nodeMetrics[id].activeConnections = activeConns;
        if (nodeQps > maxConns) {
          var connBlocked = nodeQps - maxConns;
          nodeErrorRate = Math.min(nodeErrorRate + 30, 80);
          nodeLatency += (connBlocked / maxConns) * 200;
          nodeQps = maxConns;
          events.push({ tick: tickCount, type: 'CONN_POOL', message: nodeSpecType + ' ' + id + ' connection pool saturated (' + maxConns + ')', severity: 'WARNING' });
        }

        // --- Rate limiter ---
        if (nodeSpecType === 'RATE_LIMITER') {
          var limit = nodeData.rateLimitQps || 2000;
          var dropped = Math.max(0, nodeQps - limit);
          nodeQps = Math.min(nodeQps, limit);
          nodeErrorRate = nodeQps > 0 ? (dropped / (nodeQps + dropped)) * 100 : 0;
          nodeLatency = 1;
        }

        // --- Erlang-C queueing (multi-server) ---
        if (poolSize > 0 && nodeQps > 0) {
          var mu = effectiveCapacity / poolSize;
          var rho = nodeQps / (poolSize * mu);
          if (rho >= 1) {
            queueDepth = nodeQps - effectiveCapacity;
            nodeErrorRate = Math.min(90, ((nodeQps - effectiveCapacity) / nodeQps) * 100);
            nodeLatency += (rho - 1) * 1000;
          } else {
            var cProb = erlangC(nodeQps, mu, poolSize);
            var avgWait = (cProb * mu) / (poolSize * mu - nodeQps);
            queueDepth = Math.round(avgWait * nodeQps);
            nodeLatency += avgWait;
          }
        }

        // --- Queue node ---
        if (nodeSpecType === 'QUEUE') {
          var processingRate = (nodeData.processingRate || 3000) * replicas;
          queueDepth = Math.max(0, nodeQps - processingRate);
          nodeQps = Math.min(nodeQps, processingRate);
        }

        // --- Capacity overload ---
        if (nodeErrorRate === 0 && nodeQps > effectiveCapacity) {
          var excess = nodeQps - effectiveCapacity;
          nodeErrorRate = Math.min(95, (excess / nodeQps) * 100);
          nodeLatency = baseLatency + cumulativeHopLatency + (excess * 0.1);
        }

        // --- Error backoff (retry storm) ---
        if (nodeErrorRate > 0 && !oomCrashed) {
          var errRatio = nodeErrorRate / 100;
          nodeQps *= (1 + errRatio + errRatio * errRatio + errRatio * errRatio * errRatio);
          var backoffDelay = (errRatio * 50) + (errRatio * errRatio * 150) + (errRatio * errRatio * errRatio * 450);
          nodeLatency += backoffDelay;
          if (nodeQps > effectiveCapacity) nodeErrorRate = Math.min(99, ((nodeQps - effectiveCapacity) / nodeQps) * 100);
        }

        // --- Disk I/O penalty (DB writes) ---
        if (nodeSpecType.indexOf('DATABASE') >= 0 && writeRatio > 0 && nodeQps > 0) {
          var writeOps = nodeQps * writeRatio;
          var storageType = nodeData.storageType || 'ssd';
          var seekTimeMs = storageType === 'hdd' ? 5 : storageType === 'nvme' ? 0.05 : 0.1;
          var walFsyncMs = nodeData.walFsyncMs !== undefined ? nodeData.walFsyncMs : 20;
          var writePenalty = (writeOps * seekTimeMs * 2) + (Math.min(writeOps, 1) * walFsyncMs * 0.1);
          nodeLatency += writePenalty;
          if (writeOps > effectiveCapacity * 0.5) {
            nodeErrorRate = Math.min(nodeErrorRate + 10, 90);
          }
          // Read replica offload
          var replicaCount = nodeData.readReplicaCount || 0;
          var replicaLag = nodeData.replicationLagMs || 100;
          if (replicaCount > 0) {
            nodeLatency += (replicaLag * 0.1);
            nodeMetrics[id].readReplicasUsed = replicaCount;
          }
        }

        // --- CDN ---
        if (nodeSpecType.indexOf('CDN') >= 0) {
          var hitRatio = nodeData.hitRatioOverride !== undefined ? nodeData.hitRatioOverride / 100 : 0.90;
          if (isChaosActive) hitRatio = 0.1;
          var misses = nodeQps * (1 - hitRatio);
          nodeLatency = (2 * hitRatio) + (80 * (1 - hitRatio));
          nodeErrorRate = 0;
          nodeMetrics[id].cacheHitRate = Math.round(hitRatio * 100);
          var cdnTargets = adj[id] || [];
          cdnTargets.forEach(function(tgt) { queue.push({ id: tgt, load: misses / cdnTargets.length, hopLatency: cumulativeHopLatency + netLatencyPerHop }); });
          continue;
        }

        // --- Cache ---
        if (nodeSpecType.indexOf('CACHE') >= 0) {
          var hitRate = 0.85;
          if (isChaosActive) hitRate = 0.05;
          var ttlSec = nodeData.ttlSeconds || 3600;
          var ttlDecay = Math.max(0, 1 - (nodeQps / (ttlSec * 100)));
          hitRate = Math.min(0.99, hitRate * (0.5 + 0.5 * ttlDecay));
          if (nodeData.evictionPolicy === 'lfu') hitRate *= 0.95;
          else if (nodeData.evictionPolicy === 'fifo') hitRate *= 0.90;
          var cacheMisses = nodeQps * (1 - hitRate);
          nodeLatency = (baseLatency * hitRate) + (40 * (1 - hitRate));
          nodeErrorRate = 0;
          nodeMetrics[id].cacheHitRate = Math.round(hitRate * 100);
          var cacheTargets = adj[id] || [];
          cacheTargets.forEach(function(tgt) { queue.push({ id: tgt, load: cacheMisses / cacheTargets.length, hopLatency: cumulativeHopLatency + netLatencyPerHop }); });
          continue;
        }

        // --- Load balancer ---
        if (nodeSpecType.indexOf('LOAD_BALANCER') >= 0) {
          var algo = nodeData.routingAlgorithm || 'round_robin';
          var lbTargets = adj[id] || [];
          if (lbTargets.length > 0) {
            if (algo === 'least_connections') {
              var loads = lbTargets.map(function(t) { return { id: t, load: nodeMetrics[t] && nodeMetrics[t].qps || 0 }; });
              loads.sort(function(a, b) { return a.load - b.load; });
              loads[0].load += nodeQps;
              loads.forEach(function(t) { queue.push({ id: t.id, load: t.load, hopLatency: cumulativeHopLatency + netLatencyPerHop }); });
            } else if (algo === 'ip_hash') {
              if (!lbRoundRobinCounter[id]) lbRoundRobinCounter[id] = 0;
              var idx = lbRoundRobinCounter[id] % lbTargets.length;
              lbRoundRobinCounter[id]++;
              queue.push({ id: lbTargets[idx], load: nodeQps, hopLatency: cumulativeHopLatency + netLatencyPerHop });
            } else {
              lbTargets.forEach(function(tgt) { queue.push({ id: tgt, load: nodeQps / lbTargets.length, hopLatency: cumulativeHopLatency + netLatencyPerHop }); });
            }
          }
          continue;
        }
      }

      // --- CPU calculation ---
      var cpuUtil = Math.min(100, Math.round((nodeQps / Math.max(1, effectiveCapacity)) * 100));
      cpuUtil = Math.round(cpuUtil * (cpuCores / 2) * 0.8);

      // --- Payload variability (latency jitter) ---
      var jitterFactor = 0.8 + (Math.random() * 0.4);
      nodeLatency = Math.round(nodeLatency * jitterFactor);

      nodeMetrics[id].qps = Math.round(nodeQps);
      nodeMetrics[id].latency = Math.round(nodeLatency);
      nodeMetrics[id].errorRate = Math.round(nodeErrorRate);
      nodeMetrics[id].cpu = Math.min(100, cpuUtil);
      nodeMetrics[id].queueDepth = Math.round(queueDepth);
      nodeMetrics[id].replicas = replicas;

      // Store memory state
      nodeMemory[id] = memState;

      // Track CPU for HPA
      if (!prevCpu[id]) prevCpu[id] = [];
      prevCpu[id].push(cpuUtil);
      if (prevCpu[id].length > 5) prevCpu[id].shift();

      // --- Propagate to downstream ---
      var targets = adj[id] || [];
      var writeQps = nodeQps * writeRatio * 2;
      var readQps = nodeQps * (1 - writeRatio);
      var outgoingLoad = (isFailed || isPartitioned || oomCrashed) ? 0 : (readQps + writeQps);
      targets.forEach(function(tgt) { queue.push({ id: tgt, load: outgoingLoad / targets.length, hopLatency: cumulativeHopLatency + netLatencyPerHop }); });
    }

    // --- HPA: auto-scale replicas based on CPU ---
    graphNodes.forEach(function(n) {
      var id = n.id;
      var d = n.data || {};
      if (!d.replicas || d.replicas < 1) return;
      var cpuHistory = prevCpu[id] || [];
      if (cpuHistory.length < 2) return;
      var avgCpu = cpuHistory.reduce(function(s, v) { return s + v; }, 0) / cpuHistory.length;
      var maxReplicas = d.maxReplicas || 10;
      var curReplicas = nodeReplicas[id] || 1;
      var lastScale = hpaCooldown[id] || 0;

      if (avgCpu > 70 && curReplicas < maxReplicas && tickCount - lastScale >= 2) {
        var add = Math.min(Math.ceil((avgCpu - 70) / 20), 3);
        var newCount = Math.min(curReplicas + add, maxReplicas);
        nodeReplicas[id] = newCount;
        hpaCooldown[id] = tickCount;
        events.push({ tick: tickCount, type: 'HPA', message: d.label + ' scaled up ' + curReplicas + ' -> ' + newCount + ' replicas (CPU ' + Math.round(avgCpu) + '%)', severity: 'INFO' });
      } else if (avgCpu < 30 && curReplicas > 1 && tickCount - lastScale >= 3) {
        var remove = Math.min(Math.ceil((30 - avgCpu) / 20), 2);
        var newCount = Math.max(1, curReplicas - remove);
        nodeReplicas[id] = newCount;
        hpaCooldown[id] = tickCount;
        events.push({ tick: tickCount, type: 'HPA', message: d.label + ' scaled down ' + curReplicas + ' -> ' + newCount + ' replicas (CPU ' + Math.round(avgCpu) + '%)', severity: 'INFO' });
      }
    });

    var nodesArray = Object.values(nodeMetrics);
    var totalErrors = 0, maxLatency = 0, oomCount = 0;
    nodesArray.forEach(function(m) {
      if (m.errorRate > 0) totalErrors += m.errorRate;
      if (m.latency > maxLatency) maxLatency = m.latency;
      if (m.memory >= 90) oomCount++;
    });
    var systemHealth = (oomCount > 0 || totalErrors > 40 || maxLatency > 800) ? 'RED' : (totalErrors > 10 || maxLatency > 150) ? 'YELLOW' : 'GREEN';

    return {
      tick: tickCount, timestamp: Date.now(), nodes: nodesArray,
      systemHealth, inputQps: currentInputQps, activeScenario: scenario,
      events: events
    };
  }
`;

export class SimulationWorkerBridge {
  private worker: Worker | null = null;
  private onTickCallback: ((metrics: any) => void) | null = null;
  private onCompleteCallback: ((result: any) => void) | null = null;
  private allTicks: any[] = [];
  private simRunId: string | null = null;
  private syncToBackend: boolean = false;
  private socket: Socket | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      this.worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'TICK') {
          this.allTicks.push(payload);
          if (this.onTickCallback) this.onTickCallback(payload);
          if (this.syncToBackend) this.syncTickToBackend(payload);
        } else if (type === 'COMPLETE') {
          if (this.onCompleteCallback) this.onCompleteCallback({ ticks: this.allTicks, ...payload });
          if (this.syncToBackend) this.completeBackendRun();
        }
      };
    }
  }

  private async syncTickToBackend(tick: any) {
    if (!this.simRunId) return;
    try {
      await api.patch(`/simulation/runs/${this.simRunId}/progress`, { tick });
    } catch { }
  }

  private async completeBackendRun() {
    if (!this.simRunId) return;
    try {
      await api.post(`/simulation/runs/${this.simRunId}/stop`);
    } catch { }
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
    this.worker?.postMessage({ type: 'START' });
  }

  stop() {
    this.worker?.postMessage({ type: 'STOP' });
  }

  getTicks() {
    return [...this.allTicks];
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
