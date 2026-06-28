import { NodeType } from '@sd-os/shared';

export interface NodeResult {
  outgoingQps: number;
  passthrough: number;
  latency: number;
  errorRate: number;
  queueDepth: number;
  cacheHitRate: number;
  readReplicasUsed: number;
  metrics?: Record<string, any>;
}

export abstract class NodeModel {
  abstract type: NodeType;
  abstract process(incomingQps: number, config: any): NodeResult;
}

export function erlangC(lmbda: number, mu: number, c: number): number {
  const rho = lmbda / (c * mu);
  if (rho >= 1) return 1;
  function fact(n: number): number {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
  let sum = 0;
  for (let k = 0; k < c; k++) sum += Math.pow(c * rho, k) / fact(k);
  const top = Math.pow(c * rho, c) / (fact(c) * (1 - rho));
  return top / (sum + top);
}
