export class ChaosScenario {
  static isNodeFailing(nodeId: string, activeFailures: Set<string>): boolean {
    return activeFailures.has(nodeId);
  }
}
