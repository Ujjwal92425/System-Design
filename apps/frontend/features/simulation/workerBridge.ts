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
    }
  };

  function startSimulation() {
    intervalId = setInterval(() => {
      tickCount++;
      const metrics = runSimulationTick();
      self.postMessage({ type: 'TICK', payload: metrics });
    }, 1000);
  }

  function runSimulationTick() {
    // 1. Calculate active QPS based on scenario
    let currentInputQps = trafficQps;
    if (scenario === 'spike') {
      // Periodic traffic spikes every 15 ticks
      const phase = tickCount % 15;
      if (phase >= 3 && phase <= 7) {
        currentInputQps = trafficQps * 3.5; // 3.5x traffic surge
      }
    }

    // 2. Build adjacency mapping
    const adj = {};
    const incomingCount = {};
    
    graphNodes.forEach(n => {
      adj[n.id] = [];
      incomingCount[n.id] = 0;
    });

    graphEdges.forEach(e => {
      if (adj[e.source]) {
        adj[e.source].push(e.target);
      }
      if (incomingCount[e.target] !== undefined) {
        incomingCount[e.target]++;
      }
    });

    // Find entrypoint nodes (nodes with 0 incoming connections or Load Balancers)
    let entrypoints = graphNodes.filter(n => incomingCount[n.id] === 0);
    if (entrypoints.length === 0 && graphNodes.length > 0) {
      // Fallback: use first node
      entrypoints = [graphNodes[0]];
    }

    // 3. Traversal traffic routing
    const nodeMetrics = {};
    graphNodes.forEach(n => {
      nodeMetrics[n.id] = {
        id: n.id,
        label: n.data.label || n.type,
        type: n.type,
        qps: 0,
        latency: 0,
        errorRate: 0,
        cpu: 0,
        memory: 0
      };
    });

    // BFS queue for traffic propagation
    const queue = [];
    entrypoints.forEach(ep => {
      queue.push({ id: ep.id, load: currentInputQps / entrypoints.length });
    });

    const visited = {};

    while (queue.length > 0) {
      const { id, load } = queue.shift();
      const node = graphNodes.find(n => n.id === id);
      if (!node) continue;

      // Accumulate load on this node
      nodeMetrics[id].qps += load;
      
      if (visited[id]) continue;
      visited[id] = true;

      // Compute individual node degradation
      const isFailed = failedNodes.includes(id);
      const isChaosActive = scenario === 'chaos' && (tickCount % 10 >= 6);
      
      // Node specifications
      const nodeSpecType = node.type || '';
      let capacity = 3000;
      let baseLatency = 5;
      
      if (nodeSpecType.includes('DATABASE')) {
        capacity = 800;
        baseLatency = 40;
      } else if (nodeSpecType.includes('CACHE')) {
        capacity = 10000;
        baseLatency = 2;
      } else if (nodeSpecType.includes('WEB_SERVER')) {
        capacity = 2500;
        baseLatency = 10;
      }

      // Compute outputs
      let nodeQps = nodeMetrics[id].qps;
      let nodeLatency = baseLatency;
      let nodeErrorRate = 0;

      if (isFailed) {
        nodeErrorRate = 100;
        nodeLatency = 5000;
      } else {
        // Overload check
        if (nodeQps > capacity) {
          const excess = nodeQps - capacity;
          nodeErrorRate = Math.min(95, (excess / nodeQps) * 100);
          nodeLatency = baseLatency + (excess * 0.1);
        }

        // Cache hit logic
        if (nodeSpecType.includes('CACHE')) {
          let hitRate = 0.85; // 85% cache hit
          if (isChaosActive) {
            hitRate = 0.05; // Simulate cache stampede / failure
          }
          // Only forward cache misses (15%) downstream
          const misses = nodeQps * (1 - hitRate);
          nodeLatency = (baseLatency * hitRate) + (40 * (1 - hitRate));
          
          const targets = adj[id] || [];
          targets.forEach(tgt => {
            queue.push({ id: tgt, load: misses / targets.length });
          });
          continue;
        }
      }

      nodeMetrics[id].latency = Math.round(nodeLatency);
      nodeMetrics[id].errorRate = Math.round(nodeErrorRate);
      nodeMetrics[id].cpu = Math.min(100, Math.round((nodeQps / capacity) * 100));

      // Forward traffic downstream
      const targets = adj[id] || [];
      const outgoingLoad = isFailed ? 0 : nodeQps;
      
      targets.forEach(tgt => {
        queue.push({ id: tgt, load: outgoingLoad / targets.length });
      });
    }

    // Convert metrics map to array
    const nodesArray = Object.values(nodeMetrics);
    
    // Overall system status
    let totalErrors = 0;
    let maxLatency = 0;
    nodesArray.forEach(m => {
      if (m.errorRate > 0) totalErrors += m.errorRate;
      if (m.latency > maxLatency) maxLatency = m.latency;
    });

    const isSystemFailing = totalErrors > 40 || maxLatency > 800;
    const isSystemDegraded = totalErrors > 10 || maxLatency > 150;
    const systemHealth = isSystemFailing ? 'RED' : isSystemDegraded ? 'YELLOW' : 'GREEN';

    return {
      tick: tickCount,
      timestamp: Date.now(),
      nodes: nodesArray,
      systemHealth,
      inputQps: currentInputQps,
      activeScenario: scenario
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
