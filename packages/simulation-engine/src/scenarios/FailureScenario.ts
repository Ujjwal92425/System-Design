export class FailureScenario {
  static injectLatency(originalLatency: number, failureRate: number): number {
    return Math.random() < failureRate ? originalLatency * 10 : originalLatency;
  }
}
