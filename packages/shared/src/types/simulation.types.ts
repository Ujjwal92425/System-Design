export interface TickMetrics {
  tick: number;
  timestamp: number;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    qps: number;
    errorRate: number;
    p99Latency: number;
    cpu: number;
    queueDepth: number;
    cacheHitRate: number;
    readReplicasUsed: number;
  }>;
  systemHealth: 'GREEN' | 'YELLOW' | 'RED';
  events: Array<{
    tick: number;
    type: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
  }>;
}
