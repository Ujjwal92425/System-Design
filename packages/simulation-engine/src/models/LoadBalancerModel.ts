import { NodeModel, NodeResult } from './NodeModel';
import { NodeType } from '@sd-os/shared';

function fact(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function logFact(n: number): number {
  if (n <= 20) return Math.log(fact(n));
  return 0.5 * Math.log(2 * Math.PI * n) + n * Math.log(n / Math.E);
}

function erlangC(lambda: number, mu: number, c: number): number {
  if (c <= 0) return 1;
  const rho = lambda / (c * mu);
  if (rho >= 1) return 1;
  if (rho === 0) return 0;

  const cRho = c * rho;
  let sum = 0;
  for (let k = 0; k < c; k++) {
    sum += Math.exp(k * Math.log(cRho) - logFact(k));
  }
  const numerator = Math.exp(c * Math.log(cRho) - logFact(c)) * rho;
  const denominator = (1 - rho) * sum + numerator;
  return numerator / denominator;
}

export class LoadBalancerModel extends NodeModel {
  type = NodeType.LOAD_BALANCER;

  process(incomingQps: number, config: any): NodeResult {
    const capacity = config?.capacity || 10000;
    const algorithm = config?.algorithm || 'round_robin';
    const upstreamCount = Math.max(1, config?.upstreamCount || 3);
    const isOverloaded = incomingQps > capacity;

    let qps: number;
    let latency: number;
    let errorRate: number;

    if (isOverloaded) {
      const excess = incomingQps - capacity;
      errorRate = Math.min(95, (excess / incomingQps) * 100);
      qps = capacity;
      latency = 5 + (excess / 100);
    } else {
      errorRate = 0;
      qps = incomingQps;
      const perUpstream = incomingQps / upstreamCount;
      let waitTime = 0;
      if (perUpstream > 0) {
        const mu = 500;
        waitTime = erlangC(perUpstream, mu, 1) * mu / (mu - perUpstream);
      }
      latency = (algorithm === 'least_connections' ? 1 : 2) + Math.min(waitTime, 20);
    }

    return {
      outgoingQps: qps,
      passthrough: qps,
      latency,
      errorRate,
      queueDepth: Math.max(0, incomingQps - qps),
      cacheHitRate: 0,
      readReplicasUsed: 0,
      metrics: { algorithm, utilizationPct: Math.min(100, (incomingQps / capacity) * 100) },
    };
  }
}