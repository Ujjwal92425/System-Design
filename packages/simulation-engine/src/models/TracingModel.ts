import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class TracingModel extends NodeModel {
  type = NodeType.TRACING;

  process(incomingQps: number, config: any): NodeResult {
    const spanIngestionRate = config?.spanIngestionRate || 200000;
    const samplingRate = config?.samplingRate ?? 0.1;
    const queryRate = config?.queryRate || 1000;
    const isQuery = config?.isQuery ?? false;
    const effectiveIncoming = incomingQps * samplingRate;
    const capacity = isQuery ? queryRate : spanIngestionRate;
    const effectiveLoad = isQuery ? incomingQps : effectiveIncoming;
    const isOverloaded = effectiveLoad > capacity;

    return {
      outgoingQps: Math.min(effectiveLoad, capacity),
      passthrough: Math.min(effectiveLoad, capacity),
      latency: isOverloaded
        ? 200 + ((effectiveLoad - capacity) / capacity) * 300
        : isQuery ? 100 : 10 + (effectiveLoad / capacity) * 15,
      errorRate: isOverloaded ? Math.min(25, ((effectiveLoad - capacity) / effectiveLoad) * 100) : 0,
      queueDepth: isOverloaded ? Math.round((effectiveLoad - capacity) * 2) : 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { spanIngestionRate, samplingRate, isQuery, sampledSpans: Math.round(effectiveIncoming) },
    };
  }
}
