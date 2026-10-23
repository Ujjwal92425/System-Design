export class MetricsCollector {
  private history: any[] = [];

  record(metrics: any) {
    this.history.push(metrics);
    if (this.history.length > 100) this.history.shift();
  }

  getHistory() {
    return this.history;
  }
}
