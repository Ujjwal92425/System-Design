import { RubricCriteria } from '@sd-os/shared';

export interface EvaluatedRubricCriteria extends RubricCriteria {
  passed: boolean;
  score: number;
}

export function scoreDesign(design: any, rubric: RubricCriteria[]) {
  const results: EvaluatedRubricCriteria[] = rubric.map(criteria => {
    let passed = false;
    
    // Rules-based engine checks
    if (criteria.id === 'has-load-balancer') {
      passed = design.nodes.some((n: any) => n.type === 'LOAD_BALANCER');
    } else if (criteria.id === 'has-cache') {
      passed = design.nodes.some((n: any) => n.type === 'CACHE');
    } else if (criteria.id === 'has-db-replicas') {
      const db = design.nodes.find((n: any) => n.type.startsWith('DATABASE'));
      passed = db?.data?.replicationEnabled === true;
    } else {
      // General fallbacks
      passed = true;
    }

    return {
      ...criteria,
      passed,
      score: passed ? criteria.weight : 0
    };
  });

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const missed = results.filter(r => !r.passed);

  return {
    totalScore,
    results,
    missed
  };
}
