import { SimGraph, GraphEngine } from './graph/GraphEngine';
import { LoadBalancerModel } from './models/LoadBalancerModel';
import { CacheModel } from './models/CacheModel';
import { DatabaseModel } from './models/DatabaseModel';
import { QueueModel } from './models/QueueModel';
import { NodeModel } from './models/NodeModel';
import { NodeType } from '@sd-os/shared';

export class SimulationEngine {
  private graph: SimGraph;
  private tickCount: number = 0;
  private interval: NodeJS.Timeout | null = null;
  private models: Map<NodeType, NodeModel>;

  constructor(nodes: any[], edges: any[]) {
    this.graph = GraphEngine.buildGraph(nodes, edges);
    this.models = new Map();
    this.registerModel(new LoadBalancerModel());
    this.registerModel(new CacheModel());
    this.registerModel(new DatabaseModel());
    this.registerModel(new QueueModel());
  }

  private registerModel(model: NodeModel) {
    this.models.set(model.type, model);
  }

  start(onTick: (metrics: any) => void) {
    this.interval = setInterval(() => {
      this.tickCount++;
      const metrics = this.runTick();
      onTick(metrics);
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private runTick() {
    const nodeMetrics: any[] = [];
    let isDegraded = false;
    let isFailing = false;

    this.graph.nodes.forEach((node, id) => {
      const model = this.models.get(node.type);
      const incomingQps = 100; // Mock base input
      
      let qps = incomingQps;
      let latency = 10;
      let errorRate = 0;

      if (model) {
        const config = DEFAULT_CONFIGS[node.type] || {};
        const result = model.process(incomingQps, config);
        qps = result.outgoingQps;
        latency = result.latency;
        errorRate = result.errorRate;
      }

      if (errorRate > 50) isFailing = true;
      else if (errorRate > 10 || latency > 100) isDegraded = true;

      nodeMetrics.push({
        id,
        qps,
        errorRate,
        p99Latency: latency
      });
    });

    const systemHealth = isFailing ? 'RED' : isDegraded ? 'YELLOW' : 'GREEN';

    return {
      tick: this.tickCount,
      timestamp: Date.now(),
      nodes: nodeMetrics,
      systemHealth
    };
  }
}

const DEFAULT_CONFIGS: Record<string, any> = {
  [NodeType.LOAD_BALANCER]: { capacity: 500, latency: 2 },
  [NodeType.CACHE]: { hitRate: 0.85, hitLatencyMs: 1 },
  [NodeType.DATABASE_SQL]: { capacity: 80, latency: 15 },
  [NodeType.QUEUE]: { processingRate: 150 }
};
