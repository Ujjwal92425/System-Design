import { module01Lessons } from './module-01';
import { module02Lessons } from './module-02';
import { module03Lessons } from './module-03';
import { module04Lessons } from './module-04';
import { module05Lessons } from './module-05';
import { module06Lessons } from './module-06';
import { module07Lessons } from './module-07';
import { module08Lessons } from './module-08';
import { module09Lessons } from './module-09';
import { module10Lessons } from './module-10';
import type { CurriculumData } from './types';

const tracks = [
  {
    id: 'mod-01',
    slug: 'networking-os-security',
    name: 'Networking, OS & Security Fundamentals',
    description: 'Master the foundational building blocks of distributed systems — from how data moves across the internet to how operating systems manage processes and memory, and how to secure it all.',
    level: 1,
    order: 1,
    iconUrl: '/icons/networking.svg',
    estimatedHours: 18,
    learningGoals: [
      'Understand the OSI and TCP/IP networking models end-to-end',
      'Master HTTP protocol evolution (1.1 → 2 → 3 with QUIC)',
      'Understand TLS handshakes, certificates, and encryption',
      'Differentiate processes, threads, concurrency, and parallelism',
      'Design secure networked systems with firewalls, VPNs, and proxies',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-02',
    slug: 'apis-protocols-authentication',
    name: 'APIs, Protocols & Authentication',
    description: 'Design production-grade APIs that scale to millions of requests. Master REST, GraphQL, gRPC, WebSockets, authentication flows, rate limiting, and idempotency.',
    level: 1,
    order: 2,
    iconUrl: '/icons/api.svg',
    estimatedHours: 16,
    learningGoals: [
      'Design RESTful APIs following industry best practices',
      'Choose between REST, GraphQL, gRPC, and WebSockets for the right use case',
      'Implement secure authentication with OAuth 2.0, JWT, and session management',
      'Apply rate limiting and throttling to protect APIs',
      'Ensure idempotency in distributed API designs',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-03',
    slug: 'databases',
    name: 'Databases — SQL, NoSQL, Indexing, Sharding & Replication',
    description: 'Go deep into database internals: B-Trees, LSM Trees, ACID, CAP theorem, sharding, replication, and when to choose SQL vs NoSQL. Build the database knowledge expected of a senior engineer.',
    level: 2,
    order: 3,
    iconUrl: '/icons/database.svg',
    estimatedHours: 22,
    learningGoals: [
      'Choose between SQL and NoSQL databases based on access patterns',
      'Understand B-Tree and LSM Tree internals for indexing',
      'Design replication strategies (leader-follower, multi-leader)',
      'Shard databases at scale using consistent hashing',
      'Apply CAP/PACELC theorems to real-world tradeoff decisions',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-04',
    slug: 'caching-cdns',
    name: 'Caching & CDNs',
    description: 'Master every layer of the cache hierarchy — from in-memory caches to CDN edge nodes. Learn eviction policies, write strategies, distributed caching with Redis, and cache invalidation.',
    level: 2,
    order: 4,
    iconUrl: '/icons/cache.svg',
    estimatedHours: 12,
    learningGoals: [
      'Design multi-layer cache hierarchies for performance',
      'Implement LRU, LFU, and FIFO eviction policies',
      'Choose between cache-aside, read-through, write-through, and write-back',
      'Architect distributed caching with Redis clusters',
      'Design CDN strategies for global content delivery',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-05',
    slug: 'distributed-infrastructure',
    name: 'Distributed Infrastructure — Load Balancers, Message Queues & Service Discovery',
    description: 'Architect the infrastructure that powers distributed systems: load balancing algorithms, message queue internals, Kafka architecture, service mesh, containers, and orchestration.',
    level: 2,
    order: 5,
    iconUrl: '/icons/infrastructure.svg',
    estimatedHours: 20,
    learningGoals: [
      'Select load balancing algorithms for different traffic patterns',
      'Design message queue architectures with Kafka, RabbitMQ, and SQS',
      'Implement service discovery and service mesh patterns',
      'Containerize applications with Docker and orchestrate with Kubernetes',
      'Design distributed file systems for scale',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-06',
    slug: 'architecture-patterns',
    name: 'Architecture Patterns — Microservices, Event-Driven, CQRS & Saga',
    description: 'Learn the architectural patterns that define production systems at scale. From monoliths to microservices, event-driven architectures, CQRS, sagas, and migration patterns.',
    level: 3,
    order: 6,
    iconUrl: '/icons/architecture.svg',
    estimatedHours: 18,
    learningGoals: [
      'Evaluate monolith vs microservices tradeoffs for your context',
      'Apply Domain-Driven Design to bounded contexts',
      'Design event-driven architectures with CQRS and event sourcing',
      'Implement distributed transactions with the Saga pattern',
      'Migrate monoliths to microservices using Strangler Fig',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-07',
    slug: 'advanced-distributed-systems',
    name: 'Advanced Distributed Systems — Consensus, Leader Election & Failure Detection',
    description: 'Master the hardest problems in distributed systems: consensus algorithms (Raft, Paxos), leader election, distributed locking, vector clocks, gossip protocols, and failure detection.',
    level: 3,
    order: 7,
    iconUrl: '/icons/distributed.svg',
    estimatedHours: 16,
    learningGoals: [
      'Understand Raft consensus algorithm in depth',
      'Design leader election and quorum-based systems',
      'Implement distributed locking with ZooKeeper/etcd',
      'Use vector clocks and gossip protocols for eventual consistency',
      'Apply circuit breaker and bulkhead patterns for resilience',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-08',
    slug: 'system-design-interviews',
    name: 'System Design Interview Frameworks & Case Studies',
    description: 'Master the system design interview with a proven framework and 12 complete case studies. From URL shorteners to video streaming platforms — learn the patterns that senior engineers use.',
    level: 3,
    order: 8,
    iconUrl: '/icons/interview.svg',
    estimatedHours: 30,
    learningGoals: [
      'Apply a repeatable framework to any system design question',
      'Perform back-of-the-envelope capacity estimations',
      'Design 12 real-world systems at scale',
      'Articulate tradeoffs clearly in interview settings',
      'Recognize common patterns across different system designs',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-09',
    slug: 'frontend-performance',
    name: 'Frontend Performance & Scalability',
    description: 'Build frontend systems that load instantly and scale to millions of users. Cover the critical rendering path, Core Web Vitals, SSR vs CSR, optimistic UI, and real-time updates.',
    level: 2,
    order: 9,
    iconUrl: '/icons/frontend.svg',
    estimatedHours: 12,
    learningGoals: [
      'Optimize the critical rendering path for fast loads',
      'Implement lazy loading and code splitting strategies',
      'Choose between SSR, CSR, and SSG for your use case',
      'Master Core Web Vitals and web performance metrics',
      'Design real-time frontend updates with SSE and WebSockets',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-10',
    slug: 'production-operations',
    name: 'Production Operations — Monitoring, Observability & Deployment',
    description: 'Run systems in production with confidence. Master observability (logs, metrics, traces), deployment strategies (blue-green, canary), incident response, chaos engineering, and SLOs.',
    level: 3,
    order: 10,
    iconUrl: '/icons/operations.svg',
    estimatedHours: 16,
    learningGoals: [
      'Implement observability with logs, metrics, and distributed traces',
      'Design monitoring and alerting systems that reduce noise',
      'Choose deployment strategies for zero-downtime releases',
      'Run chaos engineering experiments safely',
      'Define SLA, SLO, and SLI for reliability engineering',
    ],
    isPublished: true,
    completedPct: 0,
  },
];

function buildModules(slug: string, lessonsArray: any[]): any[] {
  const track = tracks.find((t) => t.slug === slug);
  if (!track) return [];
  const moduleLessons = lessonsArray.filter((l) => l.slug.startsWith(slug));
  return [
    {
      id: `${slug}-module`,
      name: track.name,
      description: track.description,
      order: 1,
      estimatedMin: (track.estimatedHours || 10) * 60,
      lessons: moduleLessons
        .sort((a, b) => {
          const aNum = parseInt(a.slug.split('-').pop() || '0');
          const bNum = parseInt(b.slug.split('-').pop() || '0');
          return aNum - bNum;
        })
        .map((l, i) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          order: i + 1,
          estimatedMin: l.estimatedMin,
          difficulty: l.difficulty,
          tags: l.tags,
          isPublished: true,
          status: 'NOT_STARTED' as const,
        })),
    },
  ];
}

function buildLessonDetails(lessonsArray: any[], slug: string): Record<string, any> {
  const details: Record<string, any> = {};
  const track = tracks.find((t) => t.slug === slug);
  const moduleLessons = lessonsArray.filter((l) => l.slug.startsWith(slug)).sort((a, b) => {
    const aNum = parseInt(a.slug.split('-').pop() || '0');
    const bNum = parseInt(b.slug.split('-').pop() || '0');
    return aNum - bNum;
  });

  moduleLessons.forEach((l, i) => {
    const prev = i > 0 ? { slug: moduleLessons[i - 1].slug, title: moduleLessons[i - 1].title } : null;
    const next = i < moduleLessons.length - 1 ? { slug: moduleLessons[i + 1].slug, title: moduleLessons[i + 1].title } : null;

    details[l.slug] = {
      id: l.id,
      slug: l.slug,
      title: l.title,
      content: l.content,
      estimatedMin: l.estimatedMin,
      difficulty: l.difficulty,
      companies: l.companies,
      tags: l.tags,
      module: {
        id: `${slug}-module`,
        name: track?.name || '',
        track: { slug, name: track?.name || '' },
      },
      userState: {
        status: 'NOT_STARTED' as const,
        bookmarked: false,
        notes: null,
        resumeState: null,
      },
      navigation: { prev, next },
      quizzes: [],
    };
  });

  return details;
}

const allLessons = [
  ...module01Lessons,
  ...module02Lessons,
  ...module03Lessons,
  ...module04Lessons,
  ...module05Lessons,
  ...module06Lessons,
  ...module07Lessons,
  ...module08Lessons,
  ...module09Lessons,
  ...module10Lessons,
];

export const curriculumData: CurriculumData = {
  tracks,
  trackDetails: Object.fromEntries(
    tracks.map((t) => [
      t.slug,
      {
        ...t,
        modules: buildModules(t.slug, allLessons),
      },
    ])
  ),
  lessonDetails: Object.fromEntries(
    tracks.map((t) => Object.entries(buildLessonDetails(allLessons, t.slug))).flat()
  ),
};

export function getTrackBySlug(slug: string) {
  return curriculumData.trackDetails[slug] || null;
}

export function getLessonBySlug(slug: string) {
  return curriculumData.lessonDetails[slug] || null;
}

export function getAllTracks() {
  return curriculumData.tracks;
}
