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

function logFact(n: number): number {
  if (n <= 20) {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return Math.log(r);
  }
  return 0.5 * Math.log(2 * Math.PI * n) + n * Math.log(n / Math.E);
}

export function erlangC(lmbda: number, mu: number, c: number): number {
  const rho = lmbda / (c * mu);
  if (rho >= 1) return 1;
  const cRho = c * rho;
  let sum = 0;
  for (let k = 0; k < c; k++) {
    sum += Math.exp(k * Math.log(cRho) - logFact(k));
  }
  const logTop = c * Math.log(cRho) - logFact(c) - Math.log(1 - rho);
  const top = Math.exp(logTop);
  return top / (sum + top);
}
