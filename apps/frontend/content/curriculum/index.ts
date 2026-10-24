// ═══════════════════════════════════════════════════════════════════════════════
// Curriculum metadata and lesson content loader.
// Provides instant offline access to all 18 tracks and lessons.
// ═══════════════════════════════════════════════════════════════════════════════

// CHANGE: Import all 18 module lesson datasets
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
import { module11Lessons } from './module-11';
import { module12Lessons } from './module-12';
import { module13Lessons } from './module-13';
import { module14Lessons } from './module-14';
import { module15Lessons } from './module-15';
import { module16Lessons } from './module-16';
import { module17Lessons } from './module-17';
import { module18Lessons } from './module-18';

const tracks = [
  {
    id: 'mod-01',
    slug: 'networking-os-security',
    name: 'Networking, OS & Security Fundamentals',
    description: 'Master the foundational building blocks of distributed systems - from how data moves across the internet to how operating systems manage processes and memory, and how to secure it all.',
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
    name: 'Databases - SQL, NoSQL, Indexing, Sharding & Replication',
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
    description: 'Master every layer of the cache hierarchy - from in-memory caches to CDN edge nodes. Learn eviction policies, write strategies, distributed caching with Redis, and cache invalidation.',
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
    name: 'Distributed Infrastructure - Load Balancers, Message Queues & Service Discovery',
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
    name: 'Architecture Patterns - Microservices, Event-Driven, CQRS & Saga',
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
    name: 'Advanced Distributed Systems - Consensus, Leader Election & Failure Detection',
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
    description: 'Master the system design interview with a proven framework and 12 complete case studies. From URL shorteners to video streaming platforms - learn the patterns that senior engineers use.',
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
    name: 'Production Operations - Monitoring, Observability & Deployment',
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
  {
    id: 'mod-11',
    slug: 'simulation-driven',
    name: 'Simulation-Driven Architecture Design',
    description: 'Learn system design through interactive simulation. Build architectures on the canvas, run real queueing-theory simulation, inject chaos, and get AI-scored reviews. Covers capacity estimation, load balancing, caching, database scaling, queues, resilience patterns, CDN optimization, rate limiting, serverless, observability, and chaos engineering.',
    level: 2,
    order: 11,
    iconUrl: '/icons/simulation.svg',
    estimatedHours: 24,
    learningGoals: [
      'Estimate capacity and model traffic using queueing theory',
      'Design load balancing and caching strategies with measurable impact',
      'Build resilient microservice architectures with circuit breakers',
      'Run chaos engineering experiments and analyze recovery',
      'Get AI-powered architecture reviews and interview scoring',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-12',
    slug: 'coding-craft',
    name: 'Best Coding Practices, Design Patterns & Clean Code',
    description: 'Master the craft of writing production-quality code. Cover SOLID principles, creational/structural/behavioral design patterns, clean code and refactoring, API design, error handling, testing, concurrency patterns, functional programming, and dependency injection.',
    level: 2,
    order: 12,
    iconUrl: '/icons/code.svg',
    estimatedHours: 20,
    learningGoals: [
      'Apply SOLID principles to write maintainable object-oriented code',
      'Recognize and implement Gang of Four design patterns',
      'Write clean, testable, and refactored code following industry conventions',
      'Design robust APIs with proper error handling and documentation',
      'Master testing patterns including TDD, mocking, and test design',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-13',
    slug: 'design-deep-dive',
    name: 'System Design Deep Dives - Payments, Chat, Video, Ads & More',
    description: 'Extend your system design skills with advanced real-world case studies. Design a chat system like WhatsApp, payment system like Stripe, video conferencing like Zoom, ad auctions, food delivery logistics, recommendation engines, and more.',
    level: 3,
    order: 13,
    iconUrl: '/icons/deep-dive.svg',
    estimatedHours: 20,
    learningGoals: [
      'Design real-time communication systems at WhatsApp scale',
      'Architect payment systems with idempotency and reconciliation',
      'Design video conferencing with WebRTC and SFU architecture',
      'Build recommendation engines and ad auctions',
      'Design multi-tenant SaaS platforms and content moderation pipelines',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-14',
    slug: 'design-deep-dive-2',
    name: 'System Design Deep Dives II - CDN, KMS, Monitoring, Data Pipelines & More',
    description: 'Continue mastering advanced system design with CDN architecture from scratch, key management services, A/B testing platforms, monitoring/metrics systems, ETL data pipelines, distributed job queues, rate limiters, and geospatial services.',
    level: 3,
    order: 14,
    iconUrl: '/icons/deep-dive.svg',
    estimatedHours: 16,
    learningGoals: [
      'Design a CDN with edge caching, anycast routing, and cache hierarchies',
      'Architect a KMS with envelope encryption and HSM-backed key storage',
      'Build an A/B testing platform with consistent assignment and statistical analysis',
      'Design monitoring systems with TSDB storage and Prometheus-style pull collection',
      'Implement distributed job queues and rate limiters at scale',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-15',
    slug: 'system-design-foundations',
    name: 'System Design Foundations - Welcome, Core Concepts & Tradeoffs',
    description: 'Start your system design journey with the foundational concepts: core terminology (latency, throughput, availability, consistency), the CAP theorem, and key tradeoffs that appear in every architecture decision.',
    level: 1,
    order: 15,
    iconUrl: '/icons/foundations.svg',
    estimatedHours: 8,
    learningGoals: [
      'Understand the system design mindset and senior engineer perspective',
      'Master core terminology: latency, throughput, availability, consistency',
      'Apply the CAP theorem to real-world tradeoff decisions',
      'Choose between read-optimized and write-optimized storage engines',
      'Navigate consistency models from strong to eventual',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-16',
    slug: 'scalable-data-structures',
    name: 'Scalable Data Structures - Bloom Filters, Geohash, Merkle Trees & More',
    description: 'Master the probabilistic and specialized data structures that power large-scale systems: Bloom filters, Geohash, Merkle trees, consistent hashing, HyperLogLog, Count-Min Sketch, tries, skip lists, segment trees, R-trees, and bitmap indexes.',
    level: 2,
    order: 16,
    iconUrl: '/icons/data-structures.svg',
    estimatedHours: 12,
    learningGoals: [
      'Use Bloom filters for space-efficient set membership',
      'Index spatial data with Geohash, S2, and H3',
      'Verify data integrity with Merkle trees across replicas',
      'Distribute data evenly with consistent hashing',
      'Estimate cardinality with HyperLogLog and frequency with Count-Min Sketch',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-17',
    slug: 'advanced-storage-patterns',
    name: 'Advanced Storage Patterns - Caching, Streaming, Delivery & Transactions',
    description: 'Dive deep into the patterns that make production systems reliable: cache warming, materialized views, connection pooling, erasure coding, SSE, webhooks, delivery semantics, dead letter queues, and the 3PC protocol.',
    level: 2,
    order: 17,
    iconUrl: '/icons/storage-patterns.svg',
    estimatedHours: 10,
    learningGoals: [
      'Prevent cache stampedes with cache warming strategies',
      'Accelerate queries with materialized views',
      'Manage database connections with connection pooling',
      'Implement SSE and webhooks for real-time communication',
      'Choose between at-most-once, at-least-once, and exactly-once delivery',
    ],
    isPublished: true,
    completedPct: 0,
  },
  {
    id: 'mod-18',
    slug: 'advanced-security-identity',
    name: 'Advanced Security & Identity - TLS, Encryption, Secrets, RBAC & SSO',
    description: 'Secure your systems end-to-end: TLS protocol deep dive, encryption at rest with envelope encryption, secrets management with Vault, role-based access control, and SAML/SSO for federated identity.',
    level: 3,
    order: 18,
    iconUrl: '/icons/security.svg',
    estimatedHours: 8,
    learningGoals: [
      'Understand TLS 1.3 handshake and cipher suite negotiation',
      'Implement encryption at rest with envelope encryption',
      'Manage secrets securely with Vault and dynamic credentials',
      'Design role-based access control for multi-tenant systems',
      'Implement SAML and OIDC for single sign-on',
    ],
    isPublished: true,
    completedPct: 0,
  },
];

export function getAllTracks() {
  return tracks;
}

export function getTrackBySlug(slug: string) {
  return tracks.find(t => t.slug === slug) || null;
}

// CHANGE: Map track slugs to their lesson arrays
export const MODULE_LESSONS_MAP: Record<string, any[]> = {
  'networking-os-security': module01Lessons,
  'apis-protocols-authentication': module02Lessons,
  'databases': module03Lessons,
  'caching-cdns': module04Lessons,
  'distributed-infrastructure': module05Lessons,
  'architecture-patterns': module06Lessons,
  'advanced-distributed-systems': module07Lessons,
  'system-design-interviews': module08Lessons,
  'frontend-performance': module09Lessons,
  'production-operations': module10Lessons,
  'simulation-driven': module11Lessons,
  'coding-craft': module12Lessons,
  'design-deep-dive': module13Lessons,
  'design-deep-dive-2': module14Lessons,
  'system-design-foundations': module15Lessons,
  'scalable-data-structures': module16Lessons,
  'advanced-storage-patterns': module17Lessons,
  'advanced-security-identity': module18Lessons,
};

// CHANGE: Helper to ensure no em-dash or en-dash appears in any titles, descriptions, or notes
export function cleanDashes(text: string): string {
  if (!text) return text;
  return text.replace(/—/g, ' - ').replace(/–/g, ' - ');
}

// CHANGE: Return all tracks populated with modules and lesson items (filtering out any null entries and cleaning dashes)
export function getAllTracksWithLessons() {
  return tracks.map(track => {
    const rawLessons = MODULE_LESSONS_MAP[track.slug] || [];
    const lessons = rawLessons.filter(Boolean).map(l => ({
      ...l,
      title: cleanDashes(l.title),
      content: cleanDashes(l.content),
    }));
    const cleanTrackName = cleanDashes(track.name);
    const cleanTrackDesc = cleanDashes(track.description);
    return {
      ...track,
      name: cleanTrackName,
      description: cleanTrackDesc,
      lessons,
      modules: [
        {
          id: `mod-${track.id}`,
          name: cleanTrackName,
          description: cleanTrackDesc,
          order: track.order,
          estimatedMin: lessons.reduce((acc: number, l: any) => acc + (l?.estimatedMin || 15), 0),
          lessons,
        }
      ]
    };
  });
}

// CHANGE: Return a single track populated with modules and lesson items (filtering out null entries and cleaning dashes)
export function getTrackWithLessons(slug: string) {
  const track = tracks.find(t => t.slug === slug);
  if (!track) return null;
  const rawLessons = MODULE_LESSONS_MAP[track.slug] || [];
  const lessons = rawLessons.filter(Boolean).map(l => ({
    ...l,
    title: cleanDashes(l.title),
    content: cleanDashes(l.content),
  }));
  const cleanTrackName = cleanDashes(track.name);
  const cleanTrackDesc = cleanDashes(track.description);
  return {
    ...track,
    name: cleanTrackName,
    description: cleanTrackDesc,
    lessons,
    modules: [
      {
        id: `mod-${track.id}`,
        name: cleanTrackName,
        description: cleanTrackDesc,
        order: track.order,
        estimatedMin: lessons.reduce((acc: number, l: any) => acc + (l?.estimatedMin || 15), 0),
        lessons,
      }
    ]
  };
}

// CHANGE: Look up a lesson across all tracks by its slug (filtering out null entries and cleaning dashes)
export function getLessonBySlug(slug: string) {
  for (const [trackSlug, rawLessons] of Object.entries(MODULE_LESSONS_MAP)) {
    const lessons = (rawLessons || []).filter(Boolean);
    const lesson = lessons.find(l => l?.slug === slug);
    if (lesson) {
      const track = tracks.find(t => t.slug === trackSlug);
      return {
        ...lesson,
        title: cleanDashes(lesson.title),
        content: cleanDashes(lesson.content),
        trackSlug,
        trackName: cleanDashes(track?.name ?? trackSlug),
      };
    }
  }
  return null;
}


