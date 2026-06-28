import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from '../../lib/seo';
import { getAllTracks } from '../../data/curriculum/index';

export const runtime = 'edge';

export async function GET() {
  const lines: string[] = [];

  // Header
  lines.push(`# ${SITE_NAME}`);
  lines.push('');
  lines.push(`> ${SITE_DESCRIPTION}`);
  lines.push('');
  lines.push(`URL: ${SITE_URL}`);
  lines.push(`Page Count: 150+ interactive lessons across 18 tracks`);
  lines.push(`Content Type: System design, distributed systems, software architecture, interview prep`);
  lines.push('');

  // Navigation
  lines.push('## Navigation');
  lines.push('');
  lines.push('- Home: ' + SITE_URL);
  lines.push('- Curriculum (all tracks): ' + SITE_URL + '/learn');
  lines.push('- Blog: ' + SITE_URL + '/blog');
  lines.push('- Pricing: ' + SITE_URL + '/pricing');
  lines.push('- Architecture Canvas: ' + SITE_URL + '/build');
  lines.push('');

  // Tracks
  lines.push('## Tracks & Lessons');
  lines.push('');
  const allTracks = getAllTracks();
  for (const t of allTracks) {
    lines.push(`### ${t.name}`);
    lines.push(`- Level: ${t.level} | Hours: ${t.estimatedHours}h`);
    lines.push(`- URL: ${SITE_URL}/learn/${t.slug}`);
    if (t.learningGoals?.length) {
      lines.push(`- Goals: ${t.learningGoals.join('; ')}`);
    }
    lines.push('');
  }

  // Key Concepts
  lines.push('## Key Concepts Covered');
  lines.push('');
  const concepts = [
    'Networking: OSI model, TCP/IP, HTTP/1.1 → HTTP/2 → HTTP/3, TLS, DNS, WebSockets, QUIC',
    'APIs: REST, GraphQL, gRPC, Webhooks, Rate Limiting, Idempotency, Versioning',
    'Authentication: OAuth 2.0, JWT, SAML, SSO, Session Management, RBAC',
    'Databases: SQL vs NoSQL, B-Trees, LSM Trees, Sharding, Replication, ACID, CAP Theorem',
    'Caching: Redis, CDN, Cache-Aside, Write-Through, Write-Back, LRU, LFU, Cache Invalidation',
    'Distributed Systems: Consensus (Raft, Paxos), Leader Election, Vector Clocks, Gossip Protocol',
    'Microservices: Service Mesh, API Gateway, Circuit Breaker, Bulkhead, Saga Pattern, CQRS, Event Sourcing',
    'Message Queues: Kafka, RabbitMQ, SQS, Pub/Sub, Delivery Semantics, DLQ',
    'Observability: Logging, Metrics, Distributed Tracing, OpenTelemetry, Prometheus, Grafana',
    'Deployment: Blue-Green, Canary, Rolling, CI/CD, Docker, Kubernetes',
    'System Design: URL Shortener, Chat Systems, Video Streaming, Payment Systems, Rate Limiters',
    'Security: Encryption at Rest, TLS 1.3, Secrets Management, Vault, OWASP',
  ];
  for (const c of concepts) {
    lines.push(`- ${c}`);
  }
  lines.push('');

  // Metadata
  lines.push('## Metadata');
  lines.push('');
  lines.push(`Last Updated: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`Language: English`);
  lines.push(`Topics: System Design, Distributed Systems, Software Architecture`);
  lines.push(`Audience: Software Engineers, Senior Engineers, Interview Candidates`);
  lines.push(`Reading Level: Technical — requires software engineering background`);
  lines.push('');

  const text = lines.join('\n');

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
