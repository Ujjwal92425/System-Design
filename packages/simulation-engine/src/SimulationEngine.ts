import { SimGraph, GraphEngine } from './graph/GraphEngine';
import { GraphTraversal } from './graph/GraphTraversal';
import { LoadBalancerModel } from './models/LoadBalancerModel';
import { CacheModel } from './models/CacheModel';
import { DatabaseModel } from './models/DatabaseModel';
import { DatabaseNoSqlModel } from './models/DatabaseNoSqlModel';
import { QueueModel } from './models/QueueModel';
import { PubSubModel } from './models/PubSubModel';
import { CDNModel } from './models/CDNModel';
import { ApiGatewayModel } from './models/ApiGatewayModel';
import { WebServerModel } from './models/WebServerModel';
import { AppServerModel } from './models/AppServerModel';
import { MicroserviceModel } from './models/MicroserviceModel';
import { WorkerModel } from './models/WorkerModel';
import { ServerlessFnModel } from './models/ServerlessFnModel';
import { RateLimiterModel } from './models/RateLimiterModel';
import { ObjectStorageModel } from './models/ObjectStorageModel';
import { FileStorageModel } from './models/FileStorageModel';
import { DataLakeModel } from './models/DataLakeModel';
import { SearchEngineModel } from './models/SearchEngineModel';
import { PassthroughModel } from './models/PassthroughModel';
import { AuthServiceModel } from './models/AuthServiceModel';
import { OAuthModel } from './models/OAuthModel';
import { JWTModel } from './models/JWTModel';
import { WafModel } from './models/WafModel';
import { ReverseProxyModel } from './models/ReverseProxyModel';
import { SecretsManagerModel } from './models/SecretsManagerModel';
import { MonitoringModel } from './models/MonitoringModel';
import { LogsModel } from './models/LogsModel';
import { MetricsModel } from './models/MetricsModel';
import { TracingModel } from './models/TracingModel';
import { AlertingModel } from './models/AlertingModel';
import { LlmGatewayModel } from './models/LlmGatewayModel';
import { EmbeddingSvcModel } from './models/EmbeddingSvcModel';
import { VectorDbModel } from './models/VectorDbModel';
import { RagServiceModel } from './models/RagServiceModel';
import { InferenceSvcModel } from './models/InferenceSvcModel';
import { NotificationServiceModel } from './models/NotificationServiceModel';
import { CircuitBreakerModel } from './models/CircuitBreakerModel';
import { DeadLetterQueueModel } from './models/DeadLetterQueueModel';
import { ServiceMeshModel } from './models/ServiceMeshModel';
import { NodeModel, NodeResult } from './models/NodeModel';
import { TrafficScenario } from './scenarios/TrafficScenario';
import { ChaosScenario, ChaosEvent } from './scenarios/ChaosScenario';
import { FailureScenario, FailureMode } from './scenarios/FailureScenario';
import { MetricsCollector } from './metrics/MetricsCollector';
import { NodeType } from '@sd-os/shared';

export interface SimulationConfig {
  targetQps: number;
  pattern: 'CONSTANT' | 'SPIKE' | 'RAMP';
  nodeOverrides?: Record<string, Record<string, any>>;
  chaosEvents?: Array<{
    type: string;
    targetNodeId: string;
    durationSeconds: number;
    severity: string;
  }>;
}

export interface TickSnapshot {
  tick: number;
  timestamp: number;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    qps: number;
    errorRate: number;
    p99Latency: number;
    cpu: number;
    queueDepth: number;
    cacheHitRate: number;
    readReplicasUsed: number;
  }>;
  systemHealth: 'GREEN' | 'YELLOW' | 'RED';
  events: Array<{
    tick: number;
    type: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
  }>;
}

export class SimulationEngine {
  private graph: SimGraph;
  private tickCount: number = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private models: Map<NodeType, NodeModel>;
  private collector: MetricsCollector;
  private chaos: ChaosScenario;
  private config: SimulationConfig;
  private events: TickSnapshot['events'] = [];
  private onTick?: (metrics: TickSnapshot) => void;
  private onComplete?: (history: TickSnapshot[]) => void;
  private history: TickSnapshot[] = [];

  constructor(nodes: any[], edges: any[], config: SimulationConfig) {
    this.graph = GraphEngine.buildGraph(nodes, edges);
    this.config = config;
    this.models = new Map();
    this.collector = new MetricsCollector();
    this.chaos = new ChaosScenario();

    this.registerModel(new LoadBalancerModel());
    this.registerModel(new ApiGatewayModel());
    this.registerModel(new WebServerModel());
    this.registerModel(new AppServerModel());
    this.registerModel(new MicroserviceModel());
    this.registerModel(new WorkerModel());
    this.registerModel(new ServerlessFnModel());
    this.registerModel(new CacheModel());
    this.registerModel(new CDNModel());
    this.registerModel(new DatabaseModel());
    this.registerModel(new DatabaseNoSqlModel());
    this.registerModel(new QueueModel());
    this.registerModel(new PubSubModel());
    this.registerModel(new RateLimiterModel());
    this.registerModel(new ObjectStorageModel());
    this.registerModel(new FileStorageModel());
    this.registerModel(new DataLakeModel());
    this.registerModel(new SearchEngineModel());
    this.registerModel(new AuthServiceModel());
    this.registerModel(new OAuthModel());
    this.registerModel(new JWTModel());
    this.registerModel(new WafModel());
    this.registerModel(new ReverseProxyModel());
    this.registerModel(new SecretsManagerModel());
    this.registerModel(new MonitoringModel());
    this.registerModel(new LogsModel());
    this.registerModel(new MetricsModel());
    this.registerModel(new TracingModel());
    this.registerModel(new AlertingModel());
    this.registerModel(new LlmGatewayModel());
    this.registerModel(new EmbeddingSvcModel());
    this.registerModel(new VectorDbModel());
    this.registerModel(new RagServiceModel());
    this.registerModel(new InferenceSvcModel());
    this.registerModel(new NotificationServiceModel());
    this.registerModel(new CircuitBreakerModel());
    this.registerModel(new DeadLetterQueueModel());
    this.registerModel(new ServiceMeshModel());
    this.registerModel(new PassthroughModel());

    this.applyChaosEvents(config.chaosEvents);
  }

  private registerModel(model: NodeModel) {
    this.models.set(model.type, model);
  }

  private getModel(type: string): NodeModel | undefined {
    for (const [key, model] of this.models) {
      if (key === type) return model;
    }
    return this.models.get(NodeType.CLIENT);
  }

  private applyChaosEvents(events?: SimulationConfig['chaosEvents']) {
    if (!events) return;
    for (const e of events) {
      switch (e.type) {
        case 'KILL_NODE':
          this.chaos.kill(e.targetNodeId, 0, e.durationSeconds);
          break;
        case 'THROTTLE_NODE':
          this.chaos.throttle(e.targetNodeId, 0, e.severity === 'HIGH' ? 0.95 : 0.7);
          break;
        case 'NETWORK_PARTITION':
          this.chaos.partition(e.targetNodeId, 0);
          break;
        case 'CACHE_EVICTION':
          this.chaos.evictCache(e.targetNodeId, 0);
          break;
      }
    }
  }

  start(
    onTick: (metrics: TickSnapshot) => void,
    onComplete?: (history: TickSnapshot[]) => void,
  ) {
    this.onTick = onTick;
    this.onComplete = onComplete;

    this.interval = setInterval(() => {
      this.tickCount++;
      const metrics = this.runTick();

      this.history.push(metrics);
      this.collector.record(metrics);

      if (this.onTick) this.onTick(metrics);
    }, 1000);
  }

  stop(): TickSnapshot[] {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.onComplete) this.onComplete(this.history);
    this.chaos.reset();
    return this.history;
  }

  getTickCount(): number {
    return this.tickCount;
  }

  getHistory(): TickSnapshot[] {
    return this.history;
  }

  injectChaos(nodeId: string, mode: FailureMode, tick: number, severity?: number) {
    const event = this.chaos.inject({ nodeId, mode, severity: severity ?? 1, startTick: tick });
    this.events.push({
      tick, type: 'CHAOS_INJECTED',
      message: `${mode} injected on ${nodeId}`,
      severity: 'WARNING',
    });
    return event;
  }

  healChaos(nodeId: string) {
    this.chaos.heal(nodeId);
    this.events.push({
      tick: this.tickCount, type: 'CHAOS_HEALED',
      message: `Chaos healed on ${nodeId}`,
      severity: 'INFO',
    });
  }

  private getTrafficQps(): number {
    const base = this.config.targetQps || 1000;
    const pattern = this.config.pattern || 'CONSTANT';
    return TrafficScenario.generateTraffic(this.tickCount, base, pattern);
  }

  private runTick(): TickSnapshot {
    const currentInputQps = this.getTrafficQps();
    const adjacency = GraphTraversal.getAdjacencyList(this.graph);
    const incomingCount = new Map<string, number>();
    const allNodeIds = Array.from(this.graph.nodes.keys());

    for (const id of allNodeIds) incomingCount.set(id, 0);
    for (const edge of this.graph.edges) {
      const curr = incomingCount.get(edge.target) ?? 0;
      incomingCount.set(edge.target, curr + 1);
    }

    const entrypoints = allNodeIds.filter((id) => (incomingCount.get(id) ?? 0) === 0);
    const loadMap = new Map<string, number>();
    const resultMap = new Map<string, NodeResult>();
    const visited = new Set<string>();

    for (const ep of entrypoints) {
      loadMap.set(ep, currentInputQps / Math.max(1, entrypoints.length));
    }

    const queue: string[] = [...entrypoints];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const node = this.graph.nodes.get(id);
      if (!node) continue;

      const incomingLoad = loadMap.get(id) ?? 0;
      const nodeData = { ...(node.data || {}), ...(this.config.nodeOverrides?.[id] || {}) };
      const chaosFailure = this.chaos.getActiveFailure(id, this.tickCount);
      const model = this.getModel(node.type);
      const defaultLatency = nodeData.latency || 5;

      let result: any;

      if (chaosFailure) {
        switch (chaosFailure.mode) {
          case 'KILL':
            result = FailureScenario.kill(incomingLoad);
            break;
          case 'THROTTLE':
            result = FailureScenario.throttle(incomingLoad, chaosFailure.severity, defaultLatency);
            break;
          case 'PARTITION':
            result = FailureScenario.partition(incomingLoad, chaosFailure.severity);
            break;
          case 'CACHE_EVICTION': {
            const hitRate = nodeData.hitRate || nodeData.hitRatioOverride != null ? nodeData.hitRatioOverride / 100 : 0.85;
            result = FailureScenario.cacheEviction(incomingLoad, hitRate);
            break;
          }
          default:
            result = model
              ? model.process(incomingLoad, nodeData)
              : { outgoingQps: incomingLoad, passthrough: incomingLoad, latency: defaultLatency, errorRate: 0, queueDepth: 0, cacheHitRate: 0, readReplicasUsed: 0 };
        }
        this.events.push({
          tick: this.tickCount,
          type: 'CHAOS_ACTIVE',
          message: `[${chaosFailure.mode}] ${node.type} ${id}: ${result.reason}`,
          severity: result.errorRate >= 50 ? 'ERROR' : result.errorRate > 0 ? 'WARNING' : 'INFO',
        });
      } else if (model) {
        result = model.process(incomingLoad, nodeData);
      } else {
        result = {
          outgoingQps: incomingLoad,
          passthrough: incomingLoad,
          latency: defaultLatency,
          errorRate: 0,
          queueDepth: 0,
          cacheHitRate: 0,
          readReplicasUsed: 0,
        };
      }

      resultMap.set(id, result);

      const neighbors = adjacency.get(id) || [];
      for (const neighbor of neighbors) {
        const existing = loadMap.get(neighbor) ?? 0;
        if (node.type === NodeType.LOAD_BALANCER || node.type === NodeType.API_GATEWAY) {
          const downstreamCount = adjacency.get(id)?.length || 1;
          loadMap.set(neighbor, existing + result.outgoingQps / Math.max(1, downstreamCount));
        } else {
          loadMap.set(neighbor, existing + result.outgoingQps);
        }
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }

    for (const id of allNodeIds) {
      if (!visited.has(id) && !resultMap.has(id)) {
        resultMap.set(id, {
          outgoingQps: 0, passthrough: 0, latency: 0, errorRate: 0,
          queueDepth: 0, cacheHitRate: 0, readReplicasUsed: 0,
        });
      }
    }

    let isDegraded = false;
    let isFailing = false;

    const nodeSnapshots: TickSnapshot['nodes'] = [];
    for (const [id, result] of resultMap) {
      const node = this.graph.nodes.get(id);
      if (result.errorRate > 50) isFailing = true;
      else if (result.errorRate > 10 || result.latency > 200) isDegraded = true;

      nodeSnapshots.push({
        id,
        type: node?.type || 'unknown',
        label: node?.data?.label || id,
        qps: Math.round(result.outgoingQps),
        errorRate: Math.round(result.errorRate * 10) / 10,
        p99Latency: Math.round(result.latency * 10) / 10,
        cpu: Math.min(100, Math.round((result.outgoingQps / Math.max(1, 10000)) * 100)),
        queueDepth: Math.round(result.queueDepth),
        cacheHitRate: Math.round(result.cacheHitRate * 100),
        readReplicasUsed: Math.round(result.readReplicasUsed),
      });
    }

    const systemHealth: TickSnapshot['systemHealth'] = isFailing ? 'RED' : isDegraded ? 'YELLOW' : 'GREEN';

    const snapshot: TickSnapshot = {
      tick: this.tickCount,
      timestamp: Date.now(),
      nodes: nodeSnapshots,
      systemHealth,
      events: [...this.events],
    };
    this.events = [];

    return snapshot;
  }
}
