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
  let scenario = 'steady';
  let failedNodes = [];
  let nodeChaosModes = {};
  let simRunId = null;

  self.onmessage = function(e) {
    const { type, payload } = e.data;
    
    if (type === 'INIT') {
      graphNodes = payload.nodes || [];
      graphEdges = payload.edges || [];
      trafficQps = payload.trafficQps || 1000;
      scenario = payload.scenario || 'steady';
      failedNodes = payload.failedNodes || [];
      nodeChaosModes = payload.nodeChaosModes || {};
      simRunId = payload.simRunId || null;
    } else if (type === 'START') {
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

  function runSimulationTick() {
    var currentInputQps = trafficQps;
    if (scenario === 'spike') {
      var phase = tickCount % 15;
      if (phase >= 3 && phase <= 7) currentInputQps = trafficQps * 3.5;
    } else if (scenario === 'ramp') {
      currentInputQps = trafficQps + (tickCount * 100);
    } else if (scenario === 'chaos') {
      if (tickCount % 10 >= 6) currentInputQps = trafficQps * 3;
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
        cacheHitRate: 0, readReplicasUsed: 0
      };
    });

    var queue = [];
    entrypoints.forEach(function(ep) { queue.push({ id: ep.id, load: currentInputQps / entrypoints.length }); });
    var visited = {};
    var lbRoundRobinCounter = {};
    var events = [];

    while (queue.length > 0) {
      var item = queue.shift();
      var id = item.id;
      var load = item.load;
      var node = graphNodes.find(function(n) { return n.id === id; });
      if (!node) continue;

      nodeMetrics[id].qps += load;
      if (visited[id]) continue;
      visited[id] = true;

      var nodeData = node.data || {};
      var isFailed = failedNodes.indexOf(id) >= 0;
      var chaosMode = nodeChaosModes[id] || 'none';
      var isChaosActive = chaosMode !== 'none' || (scenario === 'chaos' && (tickCount % 10 >= 6));
      var nodeSpecType = node.type || '';
      var capacity = 3000, baseLatency = 5;

      if (nodeSpecType.indexOf('DATABASE') >= 0) { capacity = 800; baseLatency = 40; }
      else if (nodeSpecType.indexOf('CACHE') >= 0) { capacity = 10000; baseLatency = 2; }
      else if (nodeSpecType.indexOf('WEB_SERVER') >= 0 || nodeSpecType === 'WEB_SERVER') { capacity = 2500; baseLatency = 10; }

      var nodeQps = nodeMetrics[id].qps;
      var nodeLatency = baseLatency;
      var nodeErrorRate = 0;
      var queueDepth = 0;

      var isPartitioned = false;
      if (isFailed || chaosMode === 'KILL') {
        nodeErrorRate = 100; nodeLatency = 5000;
        events.push({ tick: tickCount, type: 'KILL', message: nodeSpecType + ' ' + id + ' killed', severity: 'ERROR' });
      } else if (chaosMode === 'THROTTLE') {
        var throttleFactor = 0.3;
        capacity = Math.round(capacity * throttleFactor);
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
        if (nodeSpecType === 'RATE_LIMITER') {
          var limit = nodeData.rateLimitQps || 2000;
          var dropped = Math.max(0, nodeQps - limit);
          nodeQps = Math.min(nodeQps, limit);
          nodeErrorRate = nodeQps > 0 ? (dropped / (nodeQps + dropped)) * 100 : 0;
          nodeLatency = 1;
        }

        var poolSize = 0;
        if (nodeSpecType.indexOf('DATABASE') >= 0) poolSize = nodeData.connectionPoolSize || 50;
        else if (nodeSpecType.indexOf('WEB_SERVER') >= 0 || nodeSpecType === 'WEB_SERVER') poolSize = nodeData.threadPoolSize || 200;

        if (poolSize > 0 && nodeQps > 0) {
          var mu = capacity / poolSize;
          var rho = nodeQps / (poolSize * mu);
          if (rho >= 1) {
            queueDepth = nodeQps - capacity;
            nodeErrorRate = Math.min(90, ((nodeQps - capacity) / nodeQps) * 100);
            nodeLatency += (rho - 1) * 1000;
          } else {
            var cProb = erlangC(nodeQps, mu, poolSize);
            var avgWait = (cProb * mu) / (poolSize * mu - nodeQps);
            queueDepth = Math.round(avgWait * nodeQps);
            nodeLatency += avgWait;
          }
        }

        if (nodeSpecType === 'QUEUE') {
          var processingRate = nodeData.processingRate || 3000;
          queueDepth = Math.max(0, nodeQps - processingRate);
          nodeQps = Math.min(nodeQps, processingRate);
        }

        if (nodeErrorRate === 0 && nodeQps > capacity) {
          var excess = nodeQps - capacity;
          nodeErrorRate = Math.min(95, (excess / nodeQps) * 100);
          nodeLatency = baseLatency + (excess * 0.1);
        }

        if (nodeErrorRate > 0) {
          var errRatio = nodeErrorRate / 100;
          nodeQps *= (1 + errRatio + errRatio * errRatio + errRatio * errRatio * errRatio);
          var backoffDelay = (errRatio * 50) + (errRatio * errRatio * 150) + (errRatio * errRatio * errRatio * 450);
          nodeLatency += backoffDelay;
          if (nodeQps > capacity) nodeErrorRate = Math.min(99, ((nodeQps - capacity) / nodeQps) * 100);
        }

        if (nodeSpecType.indexOf('CDN') >= 0 || nodeSpecType === 'CDN') {
          var hitRatio = nodeData.hitRatioOverride !== undefined ? nodeData.hitRatioOverride / 100 : 0.90;
          var misses = nodeQps * (1 - hitRatio);
          nodeLatency = (2 * hitRatio) + (80 * (1 - hitRatio));
          nodeErrorRate = 0;
          nodeMetrics[id].cacheHitRate = Math.round(hitRatio * 100);
          var cdnTargets = adj[id] || [];
          cdnTargets.forEach(function(tgt) { queue.push({ id: tgt, load: misses / cdnTargets.length }); });
          continue;
        }

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
          cacheTargets.forEach(function(tgt) { queue.push({ id: tgt, load: cacheMisses / cacheTargets.length }); });
          continue;
        }

        if (nodeSpecType.indexOf('LOAD_BALANCER') >= 0 || nodeSpecType === 'LOAD_BALANCER') {
          var algo = nodeData.routingAlgorithm || 'round_robin';
          var lbTargets = adj[id] || [];
          if (lbTargets.length > 0) {
            if (algo === 'least_connections') {
              var loads = lbTargets.map(function(t) { return { id: t, load: nodeMetrics[t] && nodeMetrics[t].qps || 0 }; });
              loads.sort(function(a, b) { return a.load - b.load; });
              loads[0].load += nodeQps;
              loads.forEach(function(t) { queue.push({ id: t.id, load: t.load }); });
            } else if (algo === 'ip_hash') {
              if (!lbRoundRobinCounter[id]) lbRoundRobinCounter[id] = 0;
              var idx = lbRoundRobinCounter[id] % lbTargets.length;
              lbRoundRobinCounter[id]++;
              queue.push({ id: lbTargets[idx], load: nodeQps });
            } else {
              lbTargets.forEach(function(tgt) { queue.push({ id: tgt, load: nodeQps / lbTargets.length }); });
            }
          }
          continue;
        }
      }

      if (nodeSpecType.indexOf('DATABASE') >= 0) {
        var replicaCount = nodeData.readReplicaCount || 0;
        var replicaLag = nodeData.replicationLagMs || 100;
        if (replicaCount > 0) {
          nodeLatency += (replicaLag * 0.1);
          nodeMetrics[id].readReplicasUsed = replicaCount;
        }
      }

      nodeMetrics[id].qps = Math.round(nodeQps);
      nodeMetrics[id].latency = Math.round(nodeLatency + baseLatency);
      nodeMetrics[id].errorRate = Math.round(nodeErrorRate);
      nodeMetrics[id].cpu = Math.min(100, Math.round((nodeQps / Math.max(1, capacity)) * 100));
      nodeMetrics[id].queueDepth = Math.round(queueDepth);

      var targets = adj[id] || [];
      var outgoingLoad = (isFailed || isPartitioned) ? 0 : nodeQps;
      targets.forEach(function(tgt) { queue.push({ id: tgt, load: outgoingLoad / targets.length }); });
    }

    var nodesArray = Object.values(nodeMetrics);
    var totalErrors = 0, maxLatency = 0;
    nodesArray.forEach(function(m) {
      if (m.errorRate > 0) totalErrors += m.errorRate;
      if (m.latency > maxLatency) maxLatency = m.latency;
    });
    var systemHealth = (totalErrors > 40 || maxLatency > 800) ? 'RED' : (totalErrors > 10 || maxLatency > 150) ? 'YELLOW' : 'GREEN';

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
