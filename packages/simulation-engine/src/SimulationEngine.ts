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
    memory: number;
    replicas: number;
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
  private nodeMemory: Map<string, { usedMb: number; lastGcTick: number }> = new Map();
  private nodeReplicas: Map<string, number> = new Map();
  private hpaCooldown: Map<string, number> = new Map();
  private prevCpu: Map<string, number[]> = new Map();

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

    // Initialize persistent state for current graph
    for (const id of allNodeIds) {
      const n = this.graph.nodes.get(id);
      if (!this.nodeMemory.has(id)) this.nodeMemory.set(id, { usedMb: 0, lastGcTick: 0 });
      if (!this.nodeReplicas.has(id)) this.nodeReplicas.set(id, (n?.data as Record<string, any>)?.replicas || 1);
      if (!this.hpaCooldown.has(id)) this.hpaCooldown.set(id, 0);
      if (!this.prevCpu.has(id)) this.prevCpu.set(id, []);
    }
    // Clean up stale state
    const knownIds = new Set(allNodeIds);
    for (const id of this.nodeMemory.keys()) { if (!knownIds.has(id)) this.nodeMemory.delete(id); }
    for (const id of this.nodeReplicas.keys()) { if (!knownIds.has(id)) this.nodeReplicas.delete(id); }
    for (const id of this.hpaCooldown.keys()) { if (!knownIds.has(id)) this.hpaCooldown.delete(id); }
    for (const id of this.prevCpu.keys()) { if (!knownIds.has(id)) this.prevCpu.delete(id); }

    const entrypoints = allNodeIds.filter((id) => (incomingCount.get(id) ?? 0) === 0);

    const loadMap = new Map<string, number>();
    const resultMap = new Map<string, NodeResult>();
    const visited = new Set<string>();

    interface QueueItem { id: string; load: number; hopLatency: number; }
    const queue: QueueItem[] = [];

    for (const ep of entrypoints) {
      loadMap.set(ep, currentInputQps / Math.max(1, entrypoints.length));
      queue.push({ id: ep, load: loadMap.get(ep)!, hopLatency: 0 });
    }

    while (queue.length > 0) {
      const item = queue.shift()!;
      const id = item.id;
      const cumulativeHopLatency = item.hopLatency;

      const node = this.graph.nodes.get(id);
      if (!node) continue;

      const incomingLoad = loadMap.get(id) ?? 0;
      if (visited.has(id)) {
        // Still propagate load even if already visited (fan-in)
        const neighbors = adjacency.get(id) || [];
        for (const neighbor of neighbors) {
          const existing = loadMap.get(neighbor) ?? 0;
          loadMap.set(neighbor, existing + incomingLoad / Math.max(1, neighbors.length));
          if (!visited.has(neighbor)) queue.push({ id: neighbor, load: loadMap.get(neighbor)!, hopLatency: cumulativeHopLatency + 2 });
        }
        continue;
      }
      visited.add(id);

      const nodeData = { ...(node.data || {}), ...(this.config.nodeOverrides?.[id] || {}) };
      const chaosFailure = this.chaos.getActiveFailure(id, this.tickCount);
      const model = this.getModel(node.type);
      const defaultLatency = nodeData.latency || 5;

      // --- Compute effective capacity from config fields ---
      const getCapacity = (nd: any, type: string): number => {
        if (nd.capacity !== undefined && nd.capacity > 0) return nd.capacity;
        const cpuCores = nd.cpuCores || 2;
        const base: Record<string, number> = { DATABASE: 800, CACHE: 10000, WEB_SERVER: 2500, CDN: 50000, LOAD_BALANCER: 20000, QUEUE: 3000, RATE_LIMITER: 5000 };
        const matched = Object.entries(base).find(([k]) => type.indexOf(k) >= 0);
        return Math.round((matched?.[1] || 3000) * (cpuCores / 2));
      };
      const baseCapacity = getCapacity(nodeData, node.type);
      const replicas = Math.max(1, this.nodeReplicas.get(id) || 1);
      const effectiveCapacity = baseCapacity * replicas;
      const cpuCores = nodeData.cpuCores || 2;
      const ramGb = nodeData.ramGb || 4;
      const maxMemMb = ramGb * 1024;
      const payloadKb = nodeData.avgPayloadSizeKb || 4;
      const memPerReqMb = payloadKb / 1024;
      const netLatencyPerHop = nodeData.networkLatencyMs || 2;

      // --- Memory state ---
      const memState = this.nodeMemory.get(id) || { usedMb: 0, lastGcTick: 0 };
      const baseMemMb = maxMemMb * 0.3;
      const concurrentFactor = Math.min(incomingLoad, replicas * cpuCores * 50) / Math.max(1, replicas * cpuCores * 50);
      memState.usedMb = baseMemMb + (incomingLoad * memPerReqMb * concurrentFactor);
      let oomCrashed = false;
      let gcPauseMs = 0;
      if (memState.usedMb > maxMemMb * 0.9) {
        memState.usedMb = maxMemMb * 0.9;
        oomCrashed = true;
      }
      const memPct = memState.usedMb / maxMemMb;
      if (memPct > 0.7 && this.tickCount - memState.lastGcTick > 3) {
        gcPauseMs = Math.min(200, 50 + (memPct - 0.7) * 500);
        memState.usedMb = maxMemMb * 0.3;
        memState.lastGcTick = this.tickCount;
        this.events.push({ tick: this.tickCount, type: 'GC', message: `${node.type} ${id} GC pause ${Math.round(gcPauseMs)}ms`, severity: 'WARNING' });
      }
      if (oomCrashed) {
        this.events.push({ tick: this.tickCount, type: 'OOM', message: `${node.type} ${id} ran out of memory (${Math.round(maxMemMb)} MB)`, severity: 'ERROR' });
      }
      this.nodeMemory.set(id, memState);

      // --- Connection pool semaphore ---
      const poolSize = nodeData.connectionPoolSize || nodeData.threadPoolSize || 200;
      const maxConns = nodeData.maxConnections || poolSize;

      // --- Write ratio for disk I/O ---
      const writeRatio = nodeData.writeRatio !== undefined ? nodeData.writeRatio
        : node.type.indexOf('DATABASE') >= 0 ? 0.3 : node.type.indexOf('CACHE') >= 0 ? 0.2 : 0.1;

      let result: any;
      let oomOrConnBlocked = false;

      if (oomCrashed) {
        result = { outgoingQps: 0, passthrough: 0, latency: 5000, errorRate: 100, queueDepth: 0, cacheHitRate: 0, readReplicasUsed: 0 };
        oomOrConnBlocked = true;
      } else if (incomingLoad > maxConns) {
        const blocked = incomingLoad - maxConns;
        result = { outgoingQps: maxConns, passthrough: maxConns, latency: defaultLatency + (blocked / maxConns) * 200, errorRate: 30, queueDepth: Math.round(blocked), cacheHitRate: 0, readReplicasUsed: 0 };
        oomOrConnBlocked = true;
        this.events.push({ tick: this.tickCount, type: 'CONN_POOL', message: `${node.type} ${id} connection pool saturated (${maxConns})`, severity: 'WARNING' });
      } else if (chaosFailure) {
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
              ? model.process(incomingLoad, { ...nodeData, capacity: effectiveCapacity })
              : { outgoingQps: incomingLoad, passthrough: incomingLoad, latency: defaultLatency, errorRate: 0, queueDepth: 0, cacheHitRate: 0, readReplicasUsed: 0 };
        }
        this.events.push({
          tick: this.tickCount, type: 'CHAOS_ACTIVE',
          message: `[${chaosFailure.mode}] ${node.type} ${id}: ${result.reason}`,
          severity: result.errorRate >= 50 ? 'ERROR' : result.errorRate > 0 ? 'WARNING' : 'INFO',
        });
      } else if (model) {
        result = model.process(incomingLoad, { ...nodeData, capacity: effectiveCapacity });
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

      // --- Disk I/O penalty ---
      if (!oomOrConnBlocked && node.type.indexOf('DATABASE') >= 0 && writeRatio > 0 && result.outgoingQps > 0) {
        const writeOps = result.outgoingQps * writeRatio;
        const storageType = nodeData.storageType || 'ssd';
        const seekTimeMs = storageType === 'hdd' ? 5 : storageType === 'nvme' ? 0.05 : 0.1;
        const walFsyncMs = nodeData.walFsyncMs !== undefined ? nodeData.walFsyncMs : 20;
        result.latency += (writeOps * seekTimeMs * 2) + (Math.min(writeOps, 1) * walFsyncMs * 0.1);
        if (writeOps > effectiveCapacity * 0.5) {
          result.errorRate = Math.min(result.errorRate + 10, 90);
        }
      }

      // Add GC pause, network per-hop latency
      result.latency += gcPauseMs + cumulativeHopLatency;

      resultMap.set(id, result);

      // --- Propagate downstream ---
      const neighbors = adjacency.get(id) || [];
      const outgoing = (oomCrashed || chaosFailure?.mode === 'KILL' || chaosFailure?.mode === 'PARTITION') ? 0 : result.outgoingQps;
      for (const neighbor of neighbors) {
        const existing = loadMap.get(neighbor) ?? 0;
        const isLB = node.type === NodeType.LOAD_BALANCER || node.type === NodeType.API_GATEWAY;
        const downstreamCount = Math.max(1, neighbors.length);
        const splitLoad = isLB ? outgoing / downstreamCount : outgoing;
        loadMap.set(neighbor, existing + splitLoad);
        if (!visited.has(neighbor)) {
          queue.push({ id: neighbor, load: loadMap.get(neighbor)!, hopLatency: cumulativeHopLatency + netLatencyPerHop });
        }
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
    let oomCount = 0;

    const nodeSnapshots: TickSnapshot['nodes'] = [];
    for (const [id, result] of resultMap) {
      const node = this.graph.nodes.get(id);
      const nodeData: Record<string, any> = node?.data || {};

      const cpuCores = nodeData.cpuCores || 2;
      const ramGb = nodeData.ramGb || 4;
      const maxMemMb = ramGb * 1024;

      // --- CPU: use effective capacity instead of hardcoded 10000 ---
      const getCapacity = (nd: any, type: string): number => {
        if (nd.capacity !== undefined && nd.capacity > 0) return nd.capacity;
        const base: Record<string, number> = { DATABASE: 800, CACHE: 10000, WEB_SERVER: 2500, CDN: 50000, LOAD_BALANCER: 20000 };
        const matched = Object.entries(base).find(([k]) => type.indexOf(k) >= 0);
        return Math.round((matched?.[1] || 3000) * (cpuCores / 2));
      };
      const baseCapacity = getCapacity(nodeData, node?.type || '');
      const replicas = Math.max(1, this.nodeReplicas.get(id) || 1);
      const effectiveCapacity = baseCapacity * replicas;
      const cpuUtil = Math.min(100, Math.round((result.outgoingQps / Math.max(1, effectiveCapacity)) * 100 * (cpuCores / 2) * 0.8));

      // Memory % from persistent state
      const memState = this.nodeMemory.get(id);
      const memPct = memState ? Math.round((memState.usedMb / maxMemMb) * 100) : 0;
      if (memPct >= 90) oomCount++;

      if (result.errorRate > 50) isFailing = true;
      else if (result.errorRate > 10 || result.latency > 200) isDegraded = true;

      nodeSnapshots.push({
        id,
        type: node?.type || 'unknown',
        label: node?.data?.label || id,
        qps: Math.round(result.outgoingQps),
        errorRate: Math.round(result.errorRate * 10) / 10,
        p99Latency: Math.round(result.latency * 10) / 10,
        cpu: Math.min(100, cpuUtil),
        queueDepth: Math.round(result.queueDepth),
        cacheHitRate: Math.round(result.cacheHitRate * 100),
        readReplicasUsed: Math.round(result.readReplicasUsed),
        memory: memPct,
        replicas,
      });
    }

    const systemHealth: TickSnapshot['systemHealth'] = (oomCount > 0 || isFailing) ? 'RED' : isDegraded ? 'YELLOW' : 'GREEN';

    // --- HPA: auto-scale replicas ---
    for (const [id, result] of resultMap) {
      const node = this.graph.nodes.get(id);
      const nd: Record<string, any> = node?.data || {};
      if (!nd.replicas || nd.replicas < 1) continue;
      const cpuHistory = this.prevCpu.get(id) || [];
      cpuHistory.push(nodeSnapshots.find((n) => n.id === id)?.cpu || 0);
      if (cpuHistory.length > 5) cpuHistory.shift();
      this.prevCpu.set(id, cpuHistory);
      if (cpuHistory.length < 2) continue;
      const avgCpu = cpuHistory.reduce((s, v) => s + v, 0) / cpuHistory.length;
      const maxReplicas = nd.maxReplicas || 10;
      const curReplicas = Math.max(1, this.nodeReplicas.get(id) || 1);
      const lastScale = this.hpaCooldown.get(id) || 0;

      if (avgCpu > 70 && curReplicas < maxReplicas && this.tickCount - lastScale >= 2) {
        const add = Math.min(Math.ceil((avgCpu - 70) / 20), 3);
        this.nodeReplicas.set(id, Math.min(curReplicas + add, maxReplicas));
        this.hpaCooldown.set(id, this.tickCount);
        this.events.push({ tick: this.tickCount, type: 'HPA', message: `${nd.label} scaled up ${curReplicas} -> ${this.nodeReplicas.get(id)} replicas (CPU ${Math.round(avgCpu)}%)`, severity: 'INFO' });
      } else if (avgCpu < 30 && curReplicas > 1 && this.tickCount - lastScale >= 3) {
        const remove = Math.min(Math.ceil((30 - avgCpu) / 20), 2);
        this.nodeReplicas.set(id, Math.max(1, curReplicas - remove));
        this.hpaCooldown.set(id, this.tickCount);
        this.events.push({ tick: this.tickCount, type: 'HPA', message: `${nd.label} scaled down ${curReplicas} -> ${this.nodeReplicas.get(id)} replicas (CPU ${Math.round(avgCpu)}%)`, severity: 'INFO' });
      }
    }

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
