import { RubricCriteria, EvaluatedRubricCriteria, AnalyzedIssue } from '@sd-os/shared';

function hasNodeType(nodes: any[], type: string): boolean {
  return nodes.some((n: any) => n.type === type || n.data?.nodeType === type);
}

function countNodeType(nodes: any[], type: string): number {
  return nodes.filter((n: any) => n.type === type || n.data?.nodeType === type).length;
}

function countNodeTypePrefix(nodes: any[], prefix: string): number {
  return nodes.filter((n: any) => (n.type || n.data?.nodeType || '').startsWith(prefix)).length;
}

function anyNodeTypePrefix(nodes: any[], prefix: string): boolean {
  return nodes.some((n: any) => (n.type || n.data?.nodeType || '').startsWith(prefix));
}

function evaluateRule(criteria: RubricCriteria, nodes: any[], edges: any[]): boolean {
  const { id } = criteria;

  // --- Entry / Gateway ---
  if (id === 'has-load-balancer') return hasNodeType(nodes, 'LOAD_BALANCER') || hasNodeType(nodes, 'API_GATEWAY');
  if (id === 'has-api-gateway') return hasNodeType(nodes, 'API_GATEWAY');
  if (id === 'has-cdn') return hasNodeType(nodes, 'CDN');
  if (id === 'has-dns') return hasNodeType(nodes, 'DNS');
  if (id === 'has-reverse-proxy') return hasNodeType(nodes, 'REVERSE_PROXY');

  // --- Compute ---
  if (id === 'has-web-server') return hasNodeType(nodes, 'WEB_SERVER') || hasNodeType(nodes, 'APP_SERVER');
  if (id === 'has-microservice') return hasNodeType(nodes, 'MICROSERVICE');
  if (id === 'has-worker') return hasNodeType(nodes, 'WORKER') || hasNodeType(nodes, 'SERVERLESS_FN');
  if (id === 'has-serverless') return hasNodeType(nodes, 'SERVERLESS_FN');

  // --- Data ---
  if (id === 'has-database' || id === 'has-sql-database') return anyNodeTypePrefix(nodes, 'DATABASE');
  if (id === 'has-cache') return hasNodeType(nodes, 'CACHE');
  if (id === 'has-queue') return hasNodeType(nodes, 'QUEUE') || hasNodeType(nodes, 'PUBSUB');
  if (id === 'has-pubsub') return hasNodeType(nodes, 'PUBSUB');
  if (id === 'has-object-storage') return hasNodeType(nodes, 'OBJECT_STORAGE') || hasNodeType(nodes, 'FILE_STORAGE');
  if (id === 'has-search-engine') return hasNodeType(nodes, 'SEARCH_ENGINE');
  if (id === 'has-data-lake') return hasNodeType(nodes, 'DATA_LAKE');

  // --- Resilience ---
  if (id === 'has-circuit-breaker') return hasNodeType(nodes, 'CIRCUIT_BREAKER');
  if (id === 'has-dlq') return hasNodeType(nodes, 'DEAD_LETTER_QUEUE');
  if (id === 'has-service-mesh') return hasNodeType(nodes, 'SERVICE_MESH');
  if (id === 'has-dead-letter-queue') return hasNodeType(nodes, 'DEAD_LETTER_QUEUE');
  if (id === 'has-retry-mechanism') return hasNodeType(nodes, 'DEAD_LETTER_QUEUE') || hasNodeType(nodes, 'QUEUE');

  // --- Security ---
  if (id === 'has-auth-service') return hasNodeType(nodes, 'AUTH_SERVICE');
  if (id === 'has-waf') return hasNodeType(nodes, 'WAF');
  if (id === 'has-rate-limiter') return hasNodeType(nodes, 'RATE_LIMITER');
  if (id === 'has-secrets-manager') return hasNodeType(nodes, 'SECRETS_MANAGER');
  if (id === 'has-jwt') return hasNodeType(nodes, 'JWT');
  if (id === 'has-oauth') return hasNodeType(nodes, 'OAUTH');

  // --- Observability ---
  if (id === 'has-monitoring') return hasNodeType(nodes, 'MONITORING');
  if (id === 'has-logging') return hasNodeType(nodes, 'LOGS');
  if (id === 'has-metrics') return hasNodeType(nodes, 'METRICS');
  if (id === 'has-tracing') return hasNodeType(nodes, 'TRACING');
  if (id === 'has-alerting') return hasNodeType(nodes, 'ALERTING');
  if (id === 'has-observability') {
    return hasNodeType(nodes, 'MONITORING') || hasNodeType(nodes, 'LOGS') || hasNodeType(nodes, 'METRICS') || hasNodeType(nodes, 'TRACING') || hasNodeType(nodes, 'ALERTING');
  }

  // --- Messaging ---
  if (id === 'has-notification-service') return hasNodeType(nodes, 'NOTIFICATION_SERVICE');

  // --- AI / ML ---
  if (id === 'has-llm-gateway') return hasNodeType(nodes, 'LLM_GATEWAY');
  if (id === 'has-vector-db') return hasNodeType(nodes, 'VECTOR_DB');
  if (id === 'has-rag-service') return hasNodeType(nodes, 'RAG_SERVICE');
  if (id === 'has-embedding-service') return hasNodeType(nodes, 'EMBEDDING_SVC');
  if (id === 'has-inference-service') return hasNodeType(nodes, 'INFERENCE_SVC');

  // --- Replication / HA ---
  if (id === 'has-db-replicas') {
    const db = nodes.find((n: any) => (n.type || n.data?.nodeType || '').startsWith('DATABASE'));
    return db?.data?.readReplicaCount > 0 || db?.data?.replicationEnabled === true;
  }
  if (id === 'has-multiple-lb') return countNodeType(nodes, 'LOAD_BALANCER') > 1;
  if (id === 'has-multi-az') return nodes.some((n: any) => n.type === 'GROUP' && (n.data?.label || '').toLowerCase().includes('az'));

  // --- Connections ---
  if (id === 'has-connections' || id === 'connected-graph') return edges.length > 0;

  // --- Layer-based ---
  if (id === 'has-compute-layer') {
    return hasNodeType(nodes, 'WEB_SERVER') || hasNodeType(nodes, 'APP_SERVER') || hasNodeType(nodes, 'MICROSERVICE') || hasNodeType(nodes, 'SERVERLESS_FN');
  }
  if (id === 'has-data-layer') {
    return anyNodeTypePrefix(nodes, 'DATABASE') || hasNodeType(nodes, 'CACHE') || hasNodeType(nodes, 'OBJECT_STORAGE');
  }
  if (id === 'has-messaging-layer') {
    return hasNodeType(nodes, 'QUEUE') || hasNodeType(nodes, 'PUBSUB');
  }

  // --- Count-based ---
  if (id.startsWith('count-')) {
    const typeName = id.replace('count-', '').toUpperCase();
    const count = countNodeType(nodes, typeName);
    return count > 0;
  }

  // --- Node count threshold ---
  if (id === 'min-nodes-3') return nodes.length >= 3;
  if (id === 'min-nodes-5') return nodes.length >= 5;
  if (id === 'min-nodes-8') return nodes.length >= 8;

  return false;
}

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'L6+ Principal Architect';
  if (percentage >= 75) return 'L5 Senior Engineer';
  if (percentage >= 55) return 'L4 Systems Engineer';
  return 'Needs Improvement';
}

function generateIssues(nodes: any[], edges: any[]): AnalyzedIssue[] {
  const issues: AnalyzedIssue[] = [];

  if (!hasNodeType(nodes, 'LOAD_BALANCER') && !hasNodeType(nodes, 'API_GATEWAY') && nodes.length >= 2) {
    issues.push({
      nodeId: '', nodeLabel: 'Architecture',
      category: 'Scalability', severity: 'high',
      description: 'No load balancer or API gateway. Traffic hits services directly without distribution.',
      suggestion: 'Add a load balancer (NGINX, AWS ALB) or API gateway in front of compute services.'
    });
  }
  if (!hasNodeType(nodes, 'CACHE') && anyNodeTypePrefix(nodes, 'DATABASE')) {
    issues.push({
      nodeId: '', nodeLabel: 'Architecture',
      category: 'Performance', severity: 'medium',
      description: 'No cache layer. Repeated queries hit the database directly increasing latency.',
      suggestion: 'Add Redis/Memcached cache in front of the database to absorb read traffic.'
    });
  }
  if (anyNodeTypePrefix(nodes, 'DATABASE')) {
    const dbNodes = nodes.filter((n: any) => (n.type || n.data?.nodeType || '').startsWith('DATABASE'));
    const hasReplicas = dbNodes.some((n: any) => (n.data?.readReplicaCount || 0) > 0);
    if (!hasReplicas) {
      issues.push({
        nodeId: dbNodes[0]?.id || '', nodeLabel: String(dbNodes[0]?.data?.label || dbNodes[0]?.type || 'Database'),
        category: 'Reliability', severity: 'high',
        description: 'Database lacks read replicas — single point of failure and limited read throughput.',
        suggestion: 'Add read replicas and consider multi-AZ deployment for fault tolerance.'
      });
    }
  }
  if (!hasNodeType(nodes, 'QUEUE') && !hasNodeType(nodes, 'PUBSUB') &&
      (countNodeType(nodes, 'MICROSERVICE') > 1 || countNodeType(nodes, 'WORKER') > 1)) {
    issues.push({
      nodeId: '', nodeLabel: 'Architecture',
      category: 'Reliability', severity: 'medium',
      description: 'Multiple compute services without async messaging. Synchronous chains reduce availability.',
      suggestion: 'Introduce a message queue (Kafka, RabbitMQ, SQS) to decouple services.'
    });
  }
  if (!hasNodeType(nodes, 'WAF') && (hasNodeType(nodes, 'API_GATEWAY') || hasNodeType(nodes, 'LOAD_BALANCER'))) {
    issues.push({
      nodeId: '', nodeLabel: 'Architecture',
      category: 'Security', severity: 'medium',
      description: 'No WAF detected. Entry point is exposed without web application firewall protection.',
      suggestion: 'Add a WAF (Cloudflare, AWS WAF) to filter malicious traffic at the edge.'
    });
  }
  if (hasNodeType(nodes, 'MICROSERVICE') && !hasNodeType(nodes, 'CIRCUIT_BREAKER') && !hasNodeType(nodes, 'SERVICE_MESH')) {
    const svc = nodes.find((n: any) => n.type === 'MICROSERVICE' || n.data?.nodeType === 'MICROSERVICE');
    issues.push({
      nodeId: svc?.id || '', nodeLabel: svc?.data?.label || 'Microservice',
      category: 'Reliability', severity: 'medium',
      description: 'Microservices without circuit breaker or service mesh. Cascading failures can propagate through the system.',
      suggestion: 'Add a circuit breaker pattern or service mesh (Istio, Linkerd) to handle fault isolation and retry logic.'
    });
  }
  if (hasNodeType(nodes, 'QUEUE') && !hasNodeType(nodes, 'DEAD_LETTER_QUEUE')) {
    issues.push({
      nodeId: '', nodeLabel: 'Architecture',
      category: 'Reliability', severity: 'low',
      description: 'Message queue without a dead letter queue. Failed messages may be lost or cause infinite retry loops.',
      suggestion: 'Add a dead letter queue (DLQ) to capture and inspect failed messages separately from the main queue.'
    });
  }
  if (!hasNodeType(nodes, 'AUTH_SERVICE') && (hasNodeType(nodes, 'API_GATEWAY') || hasNodeType(nodes, 'WEB_SERVER') || hasNodeType(nodes, 'APP_SERVER'))) {
    issues.push({
      nodeId: '', nodeLabel: 'Architecture',
      category: 'Security', severity: 'high',
      description: 'No authentication service. User-facing services lack auth boundary.',
      suggestion: 'Add a dedicated auth service (OAuth, JWT-based) to centralize authentication and authorization.'
    });
  }
  if (!hasNodeType(nodes, 'CDN') && hasNodeType(nodes, 'WEB_SERVER')) {
    issues.push({
      nodeId: '', nodeLabel: 'Architecture',
      category: 'Performance', severity: 'low',
      description: 'No CDN for static content delivery. Users may experience higher latency for static assets.',
      suggestion: 'Add a CDN (Cloudflare, AWS CloudFront) to serve static assets from edge locations.'
    });
  }
  if (!hasNodeType(nodes, 'MONITORING') && !hasNodeType(nodes, 'LOGS') && nodes.length >= 4) {
    issues.push({
      nodeId: '', nodeLabel: 'Architecture',
      category: 'Reliability', severity: 'medium',
      description: 'No observability stack. System health and debugging capabilities are limited.',
      suggestion: 'Add monitoring (Prometheus/Datadog), logging (ELK stack), and metrics collection.'
    });
  }
  if (!hasNodeType(nodes, 'RATE_LIMITER') && (hasNodeType(nodes, 'API_GATEWAY') || hasNodeType(nodes, 'WEB_SERVER'))) {
    issues.push({
      nodeId: '', nodeLabel: 'Architecture',
      category: 'Security', severity: 'low',
      description: 'No rate limiter. API is vulnerable to abuse and accidental high traffic.',
      suggestion: 'Add a rate limiter (token bucket or sliding window) at the API gateway or load balancer level.'
    });
  }
  if (nodes.length < 4 && nodes.length > 0) {
    issues.push({
      nodeId: '', nodeLabel: 'Architecture',
      category: 'Scalability', severity: 'medium',
      description: 'Architecture has fewer than 4 components. May be too simplistic for production-scale systems.',
      suggestion: 'Consider adding caching, load balancing, database, and async processing layers.'
    });
  }

  return issues;
}

export function scoreDesign(design: any, rubric: RubricCriteria[]): {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  results: EvaluatedRubricCriteria[];
  missed: EvaluatedRubricCriteria[];
  issues: AnalyzedIssue[];
} {
  const nodes: any[] = design?.nodes || [];
  const edges: any[] = design?.edges || [];

  const results: EvaluatedRubricCriteria[] = rubric.map(criteria => {
    const passed = evaluateRule(criteria, nodes, edges);
    return {
      ...criteria,
      passed,
      score: passed ? criteria.weight : 0
    };
  });

  const maxScore = results.reduce((sum, r) => sum + r.weight, 0);
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const missed = results.filter(r => !r.passed);
  const issues = generateIssues(nodes, edges);

  return {
    totalScore,
    maxScore,
    percentage,
    grade: calculateGrade(percentage),
    results,
    missed,
    issues
  };
}

export function mergeAiIntoScores(
  rulesResult: {
    totalScore: number;
    maxScore: number;
    percentage: number;
    grade: string;
    results: EvaluatedRubricCriteria[];
    missed: EvaluatedRubricCriteria[];
    issues: AnalyzedIssue[];
  },
  aiResult: {
    scores: Record<string, number>;
    issues: AnalyzedIssue[];
    overallScore: number;
    overallAssessment: string;
  }
): {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  results: EvaluatedRubricCriteria[];
  missed: EvaluatedRubricCriteria[];
  issues: AnalyzedIssue[];
  aiFeedback: string;
  aiScores: Record<string, number>;
} {
  const mergedIssues = [...rulesResult.issues];
  const aiIssueIds = new Set<string>();

  for (const aiIssue of aiResult.issues || []) {
    const key = `${aiIssue.category}:${aiIssue.description}`;
    if (!aiIssueIds.has(key)) {
      aiIssueIds.add(key);
      mergedIssues.push(aiIssue);
    }
  }

  const hasIssues = mergedIssues.length > 0;
  const aiPenalty = hasIssues ? Math.min(15, mergedIssues.length * 3) : 0;
  const aiBonus = aiResult.overallScore >= 80 ? 5 : aiResult.overallScore >= 60 ? 2 : 0;

  let finalPercentage = rulesResult.percentage + aiBonus - aiPenalty;
  finalPercentage = Math.max(0, Math.min(100, finalPercentage));

  let aiFeedback = aiResult.overallAssessment || '';
  if (!aiFeedback) {
    if (finalPercentage >= 80) aiFeedback = 'Strong architecture with good coverage of critical components.';
    else if (finalPercentage >= 60) aiFeedback = 'Solid foundation with room for improvement in reliability and scalability.';
    else aiFeedback = 'Architecture needs significant enhancement. Focus on core components like load balancing, caching, and database replication.';
  }

  const finalGrade = calculateGrade(finalPercentage);
  const finalScore = Math.round((finalPercentage / 100) * rulesResult.maxScore);

  return {
    ...rulesResult,
    totalScore: finalScore,
    percentage: finalPercentage,
    grade: finalGrade,
    issues: mergedIssues,
    aiFeedback,
    aiScores: aiResult.scores || {}
  };
}