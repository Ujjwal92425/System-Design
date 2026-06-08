export class FallbackProvider {
  async analyze(design: any) {
    return {
      bottlenecks: [
        { nodeId: 'db-1', description: 'Single database node with no replicas creates a single point of failure.', severity: 'high' }
      ],
      missingComponents: [
        { type: 'CACHE', reason: 'Adding a cache layer would decrease read load on your databases.' }
      ],
      tradeoffs: [
        { decision: 'SQL DB Choice', pros: ['Strong ACID guarantees', 'Schema enforcement'], cons: ['Harder to scale horizontally than NoSQL'] }
      ],
      overallAssessment: 'Solid initial layout. Address single point of failure in the DB layer.'
    };
  }
}
