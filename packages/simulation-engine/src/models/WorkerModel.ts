import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class WorkerModel extends NodeModel {
  type = NodeType.WORKER;

  process(incomingQps: number, config: any): NodeResult {
    const concurrency = config?.concurrency || 20;
    const processingRate = config?.processingRate || 500;
    const jobDurationMs = config?.jobDurationMs ?? 200;
    const totalCapacity = concurrency * (1000 / jobDurationMs);
    const isOverloaded = incomingQps > processingRate || incomingQps > totalCapacity;

    let qps: number;
    let latency: number;
    let errorRate: number;
    let queueDepth = 0;

    if (isOverloaded) {
      const effectiveRate = Math.min(processingRate, totalCapacity);
      const overflow = incomingQps - effectiveRate;
      qps = effectiveRate;
      errorRate = Math.min(75, (overflow / incomingQps) * 100);
      queueDepth = Math.round(overflow * 8);
      latency = jobDurationMs + (overflow / effectiveRate) * 1000;
    } else {
      const rho = incomingQps / processingRate;
      if (rho > 0) {
        const cProb = erlangC(incomingQps, processingRate / concurrency, concurrency);
        queueDepth = Math.round(cProb * incomingQps * 2);
        latency = jobDurationMs + cProb * 100;
      } else {
        latency = jobDurationMs;
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
      metrics: { concurrency, processingRate, jobDurationMs, totalCapacity },
    };
  }
}
