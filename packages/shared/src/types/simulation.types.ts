export interface TickMetrics {
  tick: number;
  timestamp: number;
  nodes: {
    id: string;
    qps: number;
    errorRate: number;
    p99Latency: number;
    queueDepth?: number;
    cacheHitRate?: number;
  }[];
  systemHealth: 'GREEN' | 'YELLOW' | 'RED';
}
