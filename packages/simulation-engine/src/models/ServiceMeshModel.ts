import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class ServiceMeshModel extends NodeModel {
  type = NodeType.SERVICE_MESH;

  process(incomingQps: number, config: any): NodeResult {
    const sidecarCpuOverhead = config?.sidecarCpuOverhead || 0.05;
    const sidecarLatencyMs = config?.sidecarLatencyMs || 3;
    const enableMtls = config?.enableMtls ?? true;
    const enableTraces = config?.enableTraces ?? true;
    const enableRetries = config?.enableRetries ?? true;
    const maxQps = config?.maxQps || 10000;

    const mtlsOverhead = enableMtls ? 0.02 : 0;
    const traceOverhead = enableTraces ? 0.01 : 0;
    const retryOverhead = enableRetries ? 0.03 : 0;

    const totalOverhead = sidecarCpuOverhead + mtlsOverhead + traceOverhead + retryOverhead;
    const effectiveProcessingRate = maxQps * (1 - totalOverhead);

    let qps: number;
    let latency: number;
    let errorRate: number;

    if (incomingQps > effectiveProcessingRate) {
      const overflow = incomingQps - effectiveProcessingRate;
      qps = effectiveProcessingRate;
      latency = sidecarLatencyMs + (overflow / effectiveProcessingRate) * 100;
      errorRate = Math.min(50, (overflow / incomingQps) * 100);
    } else {
      qps = incomingQps;
      latency = sidecarLatencyMs;
      errorRate = 0;
    }

    return {
      outgoingQps: qps,
      passthrough: 0,
      latency: Math.round(latency * 10) / 10,
      errorRate: Math.round(errorRate * 10) / 10,
      queueDepth: 0,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: {
        totalOverhead: Math.round(totalOverhead * 1000) / 10,
        effectiveQps: Math.round(effectiveProcessingRate),
        mtlsEnabled: enableMtls,
        tracesEnabled: enableTraces,
        retriesEnabled: enableRetries,
      },
    };
  }
}
