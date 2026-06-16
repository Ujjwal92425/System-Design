import type { InterviewPrompt, RubricCriteria } from '@sd-os/shared';

function hasType(nodes: any[], type: string) {
  return nodes.some((n: any) => n.type === type || n.data?.nodeType === type);
}

function countType(nodes: any[], type: string) {
  return nodes.filter((n: any) => n.type === type || n.data?.nodeType === type).length;
}

export class FallbackProvider {
  async analyze(design: any, interviewContext?: {
    prompt?: InterviewPrompt;
    rubric?: RubricCriteria[];
  }) {
    const nodes: any[] = design?.nodes || [];
    const edges: any[] = design?.edges || [];

    const issues: Array<{ nodeId: string; nodeLabel: string; category: string; description: string; severity: 'high' | 'medium' | 'low'; suggestion: string }> = [];
    const scores: Record<string, number> = {};

    // --- Scalability Analysis ---
    let scalabilityScore = 50;
    if (hasType(nodes, 'LOAD_BALANCER')) scalabilityScore += 15;
    if (countType(nodes, 'LOAD_BALANCER') > 1) scalabilityScore += 5;
    if (hasType(nodes, 'CDN')) scalabilityScore += 10;
    if (hasType(nodes, 'CACHE')) scalabilityScore += 10;
    if (hasType(nodes, 'QUEUE')) scalabilityScore += 10;
    if (nodes.some((n: any) => ['WORKER', 'SERVERLESS_FN'].includes(n.type) || ['WORKER', 'SERVERLESS_FN'].includes(n.data?.nodeType))) scalabilityScore += 5;
    const dbNodes = nodes.filter((n: any) => (n.type || n.data?.nodeType || '').startsWith('DATABASE'));
    if (dbNodes.some((n: any) => (n.data?.readReplicaCount || 0) > 0)) scalabilityScore += 10;
    scalabilityScore = Math.min(scalabilityScore, 100);
    scores.scalability = scalabilityScore;

    // --- Reliability Analysis ---
    let reliabilityScore = 40;
    if (hasType(nodes, 'LOAD_BALANCER')) reliabilityScore += 10;
    if (dbNodes.some((n: any) => (n.data?.readReplicaCount || 0) > 0)) reliabilityScore += 15;
    if (hasType(nodes, 'CACHE')) reliabilityScore += 5;
    if (hasType(nodes, 'QUEUE')) reliabilityScore += 10;
    if (hasType(nodes, 'CDN')) reliabilityScore += 5;
    if (hasType(nodes, 'DNS')) reliabilityScore += 5;
    if (hasType(nodes, 'SECRETS_MANAGER')) reliabilityScore += 5;
    if (hasType(nodes, 'CIRCUIT_BREAKER')) reliabilityScore += 10;
    if (hasType(nodes, 'DEAD_LETTER_QUEUE')) reliabilityScore += 5;
    if (hasType(nodes, 'SERVICE_MESH')) reliabilityScore += 10;
    reliabilityScore = Math.min(reliabilityScore, 100);
    scores.reliability = reliabilityScore;

    // --- Security Analysis ---
    let securityScore = 30;
    if (hasType(nodes, 'WAF')) securityScore += 20;
    if (hasType(nodes, 'AUTH_SERVICE')) securityScore += 15;
    if (hasType(nodes, 'RATE_LIMITER')) securityScore += 10;
    if (hasType(nodes, 'SECRETS_MANAGER')) securityScore += 10;
    if (hasType(nodes, 'API_GATEWAY')) securityScore += 10;
    if (hasType(nodes, 'OAUTH')) securityScore += 10;
    if (hasType(nodes, 'JWT')) securityScore += 5;
    if (hasType(nodes, 'REVERSE_PROXY')) securityScore += 5;
    securityScore = Math.min(securityScore, 100);
    scores.security = securityScore;

    // --- Performance Analysis ---
    let performanceScore = 40;
    if (hasType(nodes, 'CDN')) performanceScore += 15;
    if (hasType(nodes, 'CACHE')) performanceScore += 15;
    if (hasType(nodes, 'LOAD_BALANCER')) performanceScore += 10;
    if (hasType(nodes, 'REVERSE_PROXY')) performanceScore += 5;
    if (dbNodes.some((n: any) => (n.data?.readReplicaCount || 0) > 0)) performanceScore += 10;
    performanceScore = Math.min(performanceScore, 100);
    scores.performance = performanceScore;

    // --- Cost Efficiency Analysis ---
    let costScore = 70;
    if (hasType(nodes, 'CDN')) costScore -= 5;
    if (hasType(nodes, 'LOAD_BALANCER')) costScore -= 5;
    const cacheCount = countType(nodes, 'CACHE');
    if (cacheCount > 2) costScore -= 10;
    if (dbNodes.length > 3) costScore -= 10;
    const computeCount = countType(nodes, 'MICROSERVICE') + countType(nodes, 'WORKER') + countType(nodes, 'APP_SERVER');
    if (computeCount > 5) costScore -= 10;
    costScore = Math.max(Math.min(costScore, 100), 20);
    scores.costEfficiency = costScore;

    // Generate issues from analysis
    if (!hasType(nodes, 'LOAD_BALANCER') && !hasType(nodes, 'API_GATEWAY')) {
      issues.push({
        nodeId: '', nodeLabel: 'Architecture',
        category: 'Scalability', severity: 'high',
        description: 'No load balancer found. All traffic goes directly to a single point.',
        suggestion: 'Add a load balancer (e.g., NGINX, AWS ALB) in front of your application servers.'
      });
    }
    if (dbNodes.length > 0 && !dbNodes.some((n: any) => (n.data?.readReplicaCount || 0) > 0)) {
      issues.push({
        nodeId: dbNodes[0]?.id || '', nodeLabel: String(dbNodes[0]?.data?.label || dbNodes[0]?.type || 'Database'),
        category: 'Reliability', severity: 'high',
        description: 'Database has no read replicas — single point of failure.',
        suggestion: 'Add at least one read replica and consider multi-AZ deployment.'
      });
    }
    if (dbNodes.length > 0 && !hasType(nodes, 'CACHE')) {
      issues.push({
        nodeId: dbNodes[0]?.id || '', nodeLabel: String(dbNodes[0]?.data?.label || dbNodes[0]?.type || 'Database'),
        category: 'Performance', severity: 'medium',
        description: 'No cache layer in front of database. Repeated queries hit the DB directly.',
        suggestion: 'Add a Redis/Memcached cache layer to absorb read traffic.'
      });
    }
    if (!hasType(nodes, 'WAF') && (hasType(nodes, 'API_GATEWAY') || hasType(nodes, 'LOAD_BALANCER'))) {
      issues.push({
        nodeId: '', nodeLabel: 'Architecture',
        category: 'Security', severity: 'medium',
        description: 'No WAF detected. API endpoint is exposed without web application firewall protection.',
        suggestion: 'Add a WAF (Cloudflare, AWS WAF) to filter malicious traffic.'
      });
    }
    if (!hasType(nodes, 'AUTH_SERVICE') && (hasType(nodes, 'API_GATEWAY') || hasType(nodes, 'WEB_SERVER'))) {
      issues.push({
        nodeId: '', nodeLabel: 'Architecture',
        category: 'Security', severity: 'high',
        description: 'No authentication service found. User-facing services lack auth boundary.',
        suggestion: 'Add a dedicated auth service (OAuth, JWT-based) to centralize authentication.'
      });
    }
    if (!hasType(nodes, 'QUEUE') && computeCount > 2) {
      issues.push({
        nodeId: '', nodeLabel: 'Architecture',
        category: 'Reliability', severity: 'medium',
        description: 'Multiple compute services without async message queue. Synchronous chains reduce availability.',
        suggestion: 'Introduce a message queue (Kafka, RabbitMQ, SQS) to decouple services.'
      });
    }
    if (!hasType(nodes, 'CDN') && hasType(nodes, 'WEB_SERVER')) {
      issues.push({
        nodeId: '', nodeLabel: 'Architecture',
        category: 'Performance', severity: 'low',
        description: 'No CDN for static content. Users may experience higher latency for static assets.',
        suggestion: 'Add a CDN (Cloudflare, AWS CloudFront) to serve static assets from edge locations.'
      });
    }
    if (!hasType(nodes, 'MONITORING') && !hasType(nodes, 'LOGS') && nodes.length >= 4) {
      issues.push({
        nodeId: '', nodeLabel: 'Architecture',
        category: 'Reliability', severity: 'medium',
        description: 'No observability stack. System health and debugging capabilities are limited.',
        suggestion: 'Add monitoring (Prometheus/Datadog), logging (ELK stack), and metrics collection.'
      });
    }

    const overallScore = Math.round((scalabilityScore + reliabilityScore + securityScore + performanceScore + costScore) / 5);
    let overallAssessment = '';
    if (overallScore >= 80) overallAssessment = 'Strong architecture with good balance of scalability, reliability, and security.';
    else if (overallScore >= 60) overallAssessment = 'Solid foundation with clear areas for improvement in reliability and security posture.';
    else if (overallScore >= 40) overallAssessment = 'Basic architecture present. Significant gaps in scalability, reliability, and security need attention.';
    else overallAssessment = 'Early-stage architecture. Several critical components like load balancing, caching, and auth are missing.';

    return { scores, issues, overallScore, overallAssessment };
  }
}
