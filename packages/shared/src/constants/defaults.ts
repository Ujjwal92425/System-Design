import { NodeType } from '../enums/node-types.enum';

export const DEFAULT_NODE_CONFIGS = {
  [NodeType.LOAD_BALANCER]: {
    latency: 5,
    capacity: 10000,
  },
  [NodeType.CACHE]: {
    latency: 1,
    capacity: 50000,
    hitRate: 0.8,
  },
  [NodeType.DATABASE_SQL]: {
    latency: 20,
    capacity: 2000,
  },
  [NodeType.WEB_SERVER]: {
    latency: 10,
    capacity: 5000,
  }
};
