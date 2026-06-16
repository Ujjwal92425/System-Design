import { scoreDesign, mergeAiIntoScores } from '../../src/modules/interview/scoring.service';
import { buildSystemPrompt } from '../../src/modules/ai/prompts/system-prompts';
import { buildUserPrompt } from '../../src/modules/ai/prompts/prompt-builders';

// ---------------------------------------------------------------------------
// Scoring Service Tests
// ---------------------------------------------------------------------------
describe('scoreDesign()', () => {
  const baseRubric = [
    { id: 'has-load-balancer', name: 'Has Load Balancer', weight: 15, hint: 'Add a load balancer' },
    { id: 'has-cache', name: 'Has Cache', weight: 10, hint: 'Add a cache' },
    { id: 'has-database', name: 'Has Database', weight: 15, hint: 'Add a database' },
    { id: 'has-db-replicas', name: 'Has DB Replicas', weight: 10, hint: 'Add replicas' },
  ];

  it('returns 0 score for empty design', () => {
    const result = scoreDesign({ nodes: [], edges: [] }, baseRubric);
    expect(result.totalScore).toBe(0);
    expect(result.maxScore).toBe(50);
    expect(result.percentage).toBe(0);
    expect(result.missed.length).toBe(4);
  });

  it('scores load balancer presence correctly', () => {
    const result = scoreDesign(
      { nodes: [{ id: 'lb', type: 'LOAD_BALANCER', data: {} }], edges: [] },
      baseRubric
    );
    const lbCriterion = result.results.find(r => r.id === 'has-load-balancer');
    expect(lbCriterion?.passed).toBe(true);
    expect(lbCriterion?.score).toBe(15);
  });

  it('scores API gateway as load balancer equivalent', () => {
    const result = scoreDesign(
      { nodes: [{ id: 'gw', type: 'API_GATEWAY', data: {} }], edges: [] },
      baseRubric
    );
    expect(result.results.find(r => r.id === 'has-load-balancer')?.passed).toBe(true);
  });

  it('scores cache presence correctly', () => {
    const result = scoreDesign(
      { nodes: [{ id: 'c', type: 'CACHE', data: {} }], edges: [] },
      [{ id: 'has-cache', name: 'Cache', weight: 10, hint: '' }]
    );
    expect(result.results[0].passed).toBe(true);
  });

  it('scores database as DATABASE_SQL or DATABASE_NOSQL', () => {
    const r1 = scoreDesign({ nodes: [{ id: 'd', type: 'DATABASE_SQL', data: {} }], edges: [] }, baseRubric);
    expect(r1.results.find(r => r.id === 'has-database')?.passed).toBe(true);

    const r2 = scoreDesign({ nodes: [{ id: 'd', type: 'DATABASE_NOSQL', data: {} }], edges: [] }, baseRubric);
    expect(r2.results.find(r => r.id === 'has-database')?.passed).toBe(true);
  });

  it('scores DB replicas from readReplicaCount', () => {
    const passed = scoreDesign(
      { nodes: [{ id: 'd', type: 'DATABASE_SQL', data: { readReplicaCount: 2 } }], edges: [] },
      [{ id: 'has-db-replicas', name: 'Replicas', weight: 10, hint: '' }]
    );
    expect(passed.results[0].passed).toBe(true);

    const failed = scoreDesign(
      { nodes: [{ id: 'd', type: 'DATABASE_SQL', data: { readReplicaCount: 0 } }], edges: [] },
      [{ id: 'has-db-replicas', name: 'Replicas', weight: 10, hint: '' }]
    );
    expect(failed.results[0].passed).toBe(false);
  });

  it('scores circuit breaker criteria', () => {
    const r = scoreDesign(
      { nodes: [{ id: 'cb', type: 'CIRCUIT_BREAKER', data: {} }], edges: [] },
      [{ id: 'has-circuit-breaker', name: 'Circuit Breaker', weight: 10, hint: '' }]
    );
    expect(r.results[0].passed).toBe(true);
  });

  it('scores dead letter queue criteria', () => {
    const r = scoreDesign(
      { nodes: [{ id: 'dlq', type: 'DEAD_LETTER_QUEUE', data: {} }], edges: [] },
      [{ id: 'has-dlq', name: 'DLQ', weight: 10, hint: '' }]
    );
    expect(r.results[0].passed).toBe(true);
  });

  it('scores service mesh criteria', () => {
    const r = scoreDesign(
      { nodes: [{ id: 'sm', type: 'SERVICE_MESH', data: {} }], edges: [] },
      [{ id: 'has-service-mesh', name: 'Service Mesh', weight: 10, hint: '' }]
    );
    expect(r.results[0].passed).toBe(true);
  });

  it('generates issues for missing load balancer with 2+ nodes', () => {
    const result = scoreDesign(
      { nodes: [{ id: 'w', type: 'WEB_SERVER', data: {} }, { id: 'd', type: 'DATABASE_SQL', data: {} }], edges: [] },
      []
    );
    expect(result.issues.some(i => i.category === 'Scalability' && i.severity === 'high')).toBe(true);
  });

  it('generates issues when microservice without circuit breaker', () => {
    const result = scoreDesign(
      {
        nodes: [
          { id: 'lb', type: 'LOAD_BALANCER', data: {} },
          { id: 'ms', type: 'MICROSERVICE', data: { label: 'Order Service' } },
        ],
        edges: [{ id: 'e', source: 'lb', target: 'ms' }],
      },
      []
    );
    expect(result.issues.some(i => i.category === 'Reliability' && i.description.includes('circuit breaker'))).toBe(true);
  });

  it('generates issues when queue without DLQ', () => {
    const result = scoreDesign(
      {
        nodes: [
          { id: 'q', type: 'QUEUE', data: {} },
          { id: 'w', type: 'WORKER', data: {} },
          { id: 'lb', type: 'LOAD_BALANCER', data: {} },
          { id: 'db', type: 'DATABASE_SQL', data: {} },
        ],
        edges: [{ id: 'e', source: 'lb', target: 'q' }, { id: 'e2', source: 'q', target: 'w' }],
      },
      []
    );
    expect(result.issues.some(i => i.description.includes('dead letter queue'))).toBe(true);
  });

  it('full architecture scores 90%+', () => {
    const result = scoreDesign(
      {
        nodes: [
          { id: 'dns', type: 'DNS', data: {} },
          { id: 'cdn', type: 'CDN', data: {} },
          { id: 'lb', type: 'LOAD_BALANCER', data: {} },
          { id: 'web', type: 'WEB_SERVER', data: {} },
          { id: 'cache', type: 'CACHE', data: {} },
          { id: 'db', type: 'DATABASE_SQL', data: { readReplicaCount: 2 } },
          { id: 'queue', type: 'QUEUE', data: {} },
          { id: 'dlq', type: 'DEAD_LETTER_QUEUE', data: {} },
          { id: 'waf', type: 'WAF', data: {} },
          { id: 'auth', type: 'AUTH_SERVICE', data: {} },
          { id: 'mon', type: 'MONITORING', data: {} },
        ],
        edges: [
          { id: 'e1', source: 'dns', target: 'lb' },
          { id: 'e2', source: 'lb', target: 'web' },
          { id: 'e3', source: 'web', target: 'cache' },
          { id: 'e4', source: 'web', target: 'db' },
          { id: 'e5', source: 'web', target: 'queue' },
          { id: 'e6', source: 'queue', target: 'dlq' },
        ],
      },
      [
        { id: 'has-load-balancer', name: 'LB', weight: 10, hint: '' },
        { id: 'has-cache', name: 'Cache', weight: 10, hint: '' },
        { id: 'has-database', name: 'DB', weight: 10, hint: '' },
        { id: 'has-db-replicas', name: 'Replicas', weight: 10, hint: '' },
        { id: 'has-queue', name: 'Queue', weight: 10, hint: '' },
        { id: 'has-dlq', name: 'DLQ', weight: 10, hint: '' },
        { id: 'has-waf', name: 'WAF', weight: 10, hint: '' },
        { id: 'has-auth-service', name: 'Auth', weight: 10, hint: '' },
        { id: 'has-monitoring', name: 'Monitoring', weight: 10, hint: '' },
        { id: 'has-cdn', name: 'CDN', weight: 10, hint: '' },
      ]
    );
    expect(result.percentage).toBe(100);
    expect(result.missed.length).toBe(0);
    expect(result.totalScore).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// mergeAiIntoScores Tests
// ---------------------------------------------------------------------------
describe('mergeAiIntoScores()', () => {
  it('merges AI feedback into rules result', () => {
    const rulesResult = {
      totalScore: 40,
      maxScore: 50,
      percentage: 80,
      grade: 'L5 Senior Engineer',
      results: [{ id: 'has-lb', name: 'LB', weight: 10, passed: true, score: 10 }],
      missed: [],
      issues: [],
    };
    const aiResult = {
      scores: { scalability: 75, reliability: 60, security: 80, performance: 70, costEfficiency: 65 },
      issues: [{ nodeId: '', nodeLabel: 'Architecture', category: 'Reliability', description: 'No replicas', severity: 'high', suggestion: 'Add replicas' }],
      overallScore: 65,
      overallAssessment: 'Good foundation but needs replicas.',
    };
    const merged = mergeAiIntoScores(rulesResult, aiResult);
    expect(merged.aiFeedback).toBe('Good foundation but needs replicas.');
    expect(merged.issues.length).toBe(1);
    expect(merged.aiScores.scalability).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// Prompt Builder Tests
// ---------------------------------------------------------------------------
describe('buildSystemPrompt()', () => {
  it('returns base prompt without context', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('senior system design interviewer');
    expect(prompt).toContain('SCALABILITY');
    expect(prompt).toContain('RELIABILITY');
    expect(prompt).toContain('SECURITY');
  });

  it('includes interview context when provided', () => {
    const prompt = buildSystemPrompt({
      prompt: {
        id: 'p1',
        title: 'Design Twitter',
        description: 'Design a social media platform',
        requirements: ['Support 100M DAU', 'Low latency feed'],
        difficulty: 'HARD',
        timeLimitMin: 45,
        rubric: [{ id: 'has-cache', name: 'Cache', weight: 10, hint: 'Add cache' }],
      },
      rubric: [{ id: 'has-cache', name: 'Cache', weight: 10, hint: 'Add cache' }],
    });
    expect(prompt).toContain('Design Twitter');
    expect(prompt).toContain('100M DAU');
    expect(prompt).toContain('Cache (weight: 10)');
  });
});

describe('buildUserPrompt()', () => {
  it('returns prompt with design JSON', () => {
    const prompt = buildUserPrompt({ nodes: [{ id: 'lb', type: 'LOAD_BALANCER' }], edges: [] });
    expect(prompt).toContain('LOAD_BALANCER');
    expect(prompt).toContain('ARCHITECTURE SUBMITTED');
  });

  it('includes interview context when provided', () => {
    const prompt = buildUserPrompt(
      { nodes: [], edges: [] },
      {
        prompt: {
          id: 'p1',
          title: 'Design URL Shortener',
          description: 'Design tinyurl',
          requirements: ['Handle 1B URLs'],
          difficulty: 'MEDIUM',
          timeLimitMin: 45,
          rubric: [],
        },
      }
    );
    expect(prompt).toContain('Design URL Shortener');
    expect(prompt).toContain('Handle 1B URLs');
  });
});
