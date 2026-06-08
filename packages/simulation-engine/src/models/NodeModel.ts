import { NodeType } from '@sd-os/shared';

export interface NodeResult {
  outgoingQps: number;
  passthrough: number;
  latency: number;
  errorRate: number;
  metrics?: Record<string, any>;
}

export abstract class NodeModel {
  abstract type: NodeType;
  abstract process(incomingQps: number, config: any): NodeResult;
}
