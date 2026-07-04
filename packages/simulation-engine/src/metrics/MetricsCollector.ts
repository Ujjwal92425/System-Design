export class MetricsCollector {
  private static readonly CAPACITY = 100;
  private buffer: any[];
  private head: number;
  private size: number;

  constructor() {
    this.buffer = new Array(MetricsCollector.CAPACITY);
    this.head = 0;
    this.size = 0;
  }

  record(metrics: any) {
    const idx = (this.head + this.size) % MetricsCollector.CAPACITY;
    this.buffer[idx] = metrics;
    if (this.size < MetricsCollector.CAPACITY) {
      this.size++;
    } else {
      this.head = (this.head + 1) % MetricsCollector.CAPACITY;
    }
  }

  getHistory(): any[] {
    const result: any[] = [];
    for (let i = 0; i < this.size; i++) {
      result.push(this.buffer[(this.head + i) % MetricsCollector.CAPACITY]);
    }
    return result;
  }
}
