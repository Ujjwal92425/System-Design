import { NodeModel, NodeResult, erlangC } from './NodeModel';
import { NodeType } from '@sd-os/shared';

export class SearchEngineModel extends NodeModel {
  type = NodeType.SEARCH_ENGINE;

  process(incomingQps: number, config: any): NodeResult {
    const indexSizeGb = config?.indexSizeGb || 100;
    const shardCount = config?.shardCount || 10;
    const queryQps = config?.queryQps ?? incomingQps;
    const indexingRate = config?.indexingRate || 2000;
    const isQuery = config?.isQuery ?? true;
    const capacity = isQuery ? shardCount * 500 : indexingRate;
    const isOverloaded = queryQps > capacity;

    let qps: number;
    let latency: number;
    let errorRate: number;
    let queueDepth = 0;

    if (isOverloaded) {
      const excess = queryQps - capacity;
      qps = capacity;
      errorRate = Math.min(50, (excess / queryQps) * 100);
      queueDepth = Math.round(excess * 2);
      latency = isQuery ? 100 + (excess / shardCount) * 5 : 200;
    } else {
      const baseLatency = isQuery ? 10 : 50;
      const sizeFactor = Math.log2(indexSizeGb / 10) * 5;
      const rho = queryQps / capacity;
      if (rho > 0.5) {
        const cProb = erlangC(queryQps, 100, shardCount);
        queueDepth = Math.round(cProb * queryQps);
        latency = baseLatency + sizeFactor + cProb * 20;
      } else {
        latency = baseLatency + sizeFactor;
      }
      qps = queryQps;
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
      metrics: { indexSizeGb, shardCount, isQuery, indexingRate },
    };
  }
}
