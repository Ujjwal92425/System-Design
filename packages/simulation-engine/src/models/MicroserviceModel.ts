import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class MicroserviceModel extends NodeModel {
  type = NodeType.MICROSERVICE;

  process(incomingQps: number, config: any): NodeResult {
    const threadPoolSize = config?.threadPoolSize || 50;
    const cpuBoundRatio = config?.cpuBoundRatio ?? 0.6;
    const circuitBreakerThreshold = config?.circuitBreakerThreshold ?? 5;
    const perThreadQps = cpuBoundRatio > 0.7 ? 8 : 20;
    const totalCapacity = threadPoolSize * perThreadQps;
    const isOverloaded = incomingQps > totalCapacity;
    const isCircuitOpen = config?.circuitOpen ?? false;

    let qps: number;
    let latency: number;
    let errorRate: number;
    let queueDepth = 0;

    if (isCircuitOpen) {
      qps = 0;
      errorRate = 100;
      latency = 10000;
      queueDepth = Math.round(incomingQps * 2);
    } else if (isOverloaded) {
      const excess = incomingQps - totalCapacity;
      qps = totalCapacity;
      errorRate = Math.min(90, (excess / incomingQps) * 100);
      queueDepth = Math.round(excess * 3);
      latency = cpuBoundRatio > 0.7 ? 500 : 200;
    } else {
      const rho = incomingQps / totalCapacity;
      if (rho > 0) {
        const cProb = erlangC(incomingQps, perThreadQps, threadPoolSize);
        queueDepth = Math.round(cProb * incomingQps);
        const baseLatency = cpuBoundRatio > 0.7 ? 50 : 15;
        latency = baseLatency + cProb * 40 + rho * 30;
      } else {
        latency = cpuBoundRatio > 0.7 ? 30 : 10;
      }
      qps = incomingQps;
      errorRate = 0;
    }

    return {
      outgoingQps: qps,
      passthrough: qps,
      latency,
      errorRate,
      queueDepth,
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: {
        threadPoolSize,
        cpuBoundRatio,
        totalCapacity,
        circuitBreakerOpen: isCircuitOpen,
        utilizationPct: Math.min(100, (incomingQps / Math.max(1, totalCapacity)) * 100),
      },
    };
  }
}
