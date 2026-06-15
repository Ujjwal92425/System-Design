'use client';

// Inline Web Worker definition using Blob URL to ensure full Next.js/Webpack SSR compatibility
const workerCode = `
  let isRunning = false;
  let intervalId = null;
  let tickCount = 0;
  
  let graphNodes = [];
  let graphEdges = [];
  let trafficQps = 1000;
  let scenario = 'steady'; // steady, spike, chaos
  let failedNodes = [];

  self.onmessage = function(e) {
    const { type, payload } = e.data;
    
    if (type === 'INIT') {
      graphNodes = payload.nodes || [];
      graphEdges = payload.edges || [];
      trafficQps = payload.trafficQps || 1000;
      scenario = payload.scenario || 'steady';
      failedNodes = payload.failedNodes || [];
    } else if (type === 'START') {
      if (!isRunning) {
        isRunning = true;
        startSimulation();
      }
    } else if (type === 'STOP') {
      isRunning = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    } else if (type === 'UPDATE_PARAMS') {
      trafficQps = payload.trafficQps ?? trafficQps;
      scenario = payload.scenario ?? scenario;
      failedNodes = payload.failedNodes ?? failedNodes;
    } else if (type === 'UPDATE_GRAPH') {
      graphNodes = payload.nodes || [];
      graphEdges = payload.edges || [];
    }
  };

  function startSimulation() {
    intervalId = setInterval(() => {
      tickCount++;
      const metrics = runSimulationTick();
      self.postMessage({ type: 'TICK', payload: metrics });
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
      var isChaosActive = scenario === 'chaos' && (tickCount % 10 >= 6);
      var nodeSpecType = node.type || '';
      var capacity = 3000, baseLatency = 5;

      if (nodeSpecType.indexOf('DATABASE') >= 0) { capacity = 800; baseLatency = 40; }
      else if (nodeSpecType.indexOf('CACHE') >= 0) { capacity = 10000; baseLatency = 2; }
      else if (nodeSpecType.indexOf('WEB_SERVER') >= 0 || nodeSpecType === 'WEB_SERVER') { capacity = 2500; baseLatency = 10; }

      var nodeQps = nodeMetrics[id].qps;
      var nodeLatency = baseLatency;
      var nodeErrorRate = 0;
      var queueDepth = 0;

      if (isFailed) {
        nodeErrorRate = 100; nodeLatency = 5000;
      } else {
        // --- RATE LIMITER ---
        if (nodeSpecType === 'RATE_LIMITER') {
          var limit = nodeData.rateLimitQps || 2000;
          var dropped = Math.max(0, nodeQps - limit);
          nodeQps = Math.min(nodeQps, limit);
          nodeErrorRate = nodeQps > 0 ? (dropped / (nodeQps + dropped)) * 100 : 0;
          nodeLatency = 1;
        }

        // --- M/M/c QUEUING (thread/connection pool) ---
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

        // --- QUEUE node type ---
        if (nodeSpecType === 'QUEUE') {
          var processingRate = nodeData.processingRate || 3000;
          queueDepth = Math.max(0, nodeQps - processingRate);
          nodeQps = Math.min(nodeQps, processingRate);
        }

        // --- OVERLOAD CHECK ---
        if (nodeErrorRate === 0 && nodeQps > capacity) {
          var excess = nodeQps - capacity;
          nodeErrorRate = Math.min(95, (excess / nodeQps) * 100);
          nodeLatency = baseLatency + (excess * 0.1);
        }

        // --- RETRY / BACKOFF ---
        if (nodeErrorRate > 0) {
          var errRatio = nodeErrorRate / 100;
          nodeQps *= (1 + errRatio + errRatio * errRatio + errRatio * errRatio * errRatio);
          var backoffDelay = (errRatio * 50) + (errRatio * errRatio * 150) + (errRatio * errRatio * errRatio * 450);
          nodeLatency += backoffDelay;
          if (nodeQps > capacity) {
            nodeErrorRate = Math.min(99, ((nodeQps - capacity) / nodeQps) * 100);
          }
        }

        // --- CDN HIT RATIO OVERRIDE ---
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

        // --- CACHE (with TTL / eviction decay) ---
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

        // --- LOAD BALANCER (routing algorithm) ---
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

      // --- DATABASE with read replicas ---
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
      nodeMetrics[id].cpu = Math.min(100, Math.round((nodeQps / capacity) * 100));
      nodeMetrics[id].queueDepth = Math.round(queueDepth);

      var targets = adj[id] || [];
      var outgoingLoad = isFailed ? 0 : nodeQps;
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
      systemHealth, inputQps: currentInputQps, activeScenario: scenario
    };
  }
`;

export class SimulationWorkerBridge {
  private worker: Worker | null = null;
  private onTickCallback: ((metrics: any) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'TICK' && this.onTickCallback) {
          this.onTickCallback(payload);
        }
      };
    }
  }

  init(nodes: any[], edges: any[], trafficQps: number, scenario: string, failedNodes: string[]) {
    this.worker?.postMessage({
      type: 'INIT',
      payload: { nodes, edges, trafficQps, scenario, failedNodes }
    });
  }

  updateGraph(nodes: any[], edges: any[]) {
    this.worker?.postMessage({
      type: 'UPDATE_GRAPH',
      payload: { nodes, edges }
    });
  }

  updateParams(trafficQps?: number, scenario?: string, failedNodes?: string[]) {
    this.worker?.postMessage({
      type: 'UPDATE_PARAMS',
      payload: { trafficQps, scenario, failedNodes }
    });
  }

  start(onTick: (metrics: any) => void) {
    this.onTickCallback = onTick;
    this.worker?.postMessage({ type: 'START' });
  }

  stop() {
    this.worker?.postMessage({ type: 'STOP' });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}
