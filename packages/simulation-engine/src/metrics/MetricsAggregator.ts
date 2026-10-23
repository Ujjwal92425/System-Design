export class MetricsAggregator {
  static calculateRollingAverage(metrics: number[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((a, b) => a + b, 0) / metrics.length;
  }
}
