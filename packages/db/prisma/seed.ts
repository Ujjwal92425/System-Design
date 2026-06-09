/**
 * packages/db/prisma/seed.ts
 * Run: pnpm db:seed
 * Seeds: 2 users, 3 tracks, 2 modules, 5 lessons, 2 quizzes, 2 interview prompts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const db = new PrismaClient();

async function main() {
  console.log('🌱  Seeding database...\n');

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123456', 10);
  const admin = await db.user.upsert({
    where: { email: 'admin@sdos.academy' },
    update: {},
    create: {
      email: 'admin@sdos.academy',
      name: 'OS Architect',
      passwordHash: adminHash,
      role: 'ADMIN',
      emailVerified: true,
      subscription: { create: { plan: 'PRO', status: 'ACTIVE', aiCreditsLimit: 999 } },
      streak: { create: { currentStreak: 0, longestStreak: 0 } }
    }
  });
  console.log('✅  Admin user:', admin.email);

  const freeHash = await bcrypt.hash('Test@123456', 10);
  const freeUser = await db.user.upsert({
    where: { email: 'demo@sdos.academy' },
    update: {},
    create: {
      email: 'demo@sdos.academy',
      name: 'Demo Student',
      passwordHash: freeHash,
      role: 'USER',
      emailVerified: true,
      subscription: { create: { plan: 'FREE', status: 'ACTIVE', aiCreditsLimit: 10 } },
      streak: { create: { currentStreak: 3, longestStreak: 7 } }
    }
  });
  console.log('✅  Demo user:', freeUser.email);

  // ── Track 1: Foundations ───────────────────────────────────────────────────
  const track1 = await db.track.upsert({
    where: { slug: 'system-design-foundations' },
    update: {},
    create: {
      slug: 'system-design-foundations',
      name: 'System Design Foundations',
      description: 'Master the core building blocks of scalable distributed systems. Start here.',
      level: 1,
      order: 1,
      estimatedHours: 8,
      learningGoals: [
        'Understand scalability vs reliability tradeoffs',
        'Learn CAP theorem and its practical implications',
        'Design stateless and stateful services',
        'Model data for high-throughput workloads'
      ],
      isPublished: true
    }
  });
  console.log('✅  Track:', track1.name);

  // Module 1.1
  const mod1 = await db.module.upsert({
    where: { id: 'mod-foundations-intro' },
    update: {},
    create: {
      id: 'mod-foundations-intro',
      trackId: track1.id,
      name: 'Introduction to Distributed Systems',
      description: 'Core concepts every system designer must know.',
      order: 1,
      estimatedMin: 120,
      isPublished: true
    }
  });

  // Lesson 1.1.1
  const lesson1 = await db.lesson.upsert({
    where: { slug: 'what-is-system-design' },
    update: {},
    create: {
      moduleId: mod1.id,
      slug: 'what-is-system-design',
      title: 'What Is System Design?',
      content: `# What Is System Design?

System design is the process of defining the **architecture, components, modules, interfaces, and data** to satisfy specified requirements.

## Why It Matters

Every product at scale — Twitter, Netflix, Uber — is defined by the quality of its system design decisions. Poor design decisions compound over time into reliability crises, runaway infrastructure costs, and engineering velocity collapse.

## The Core Questions

When approaching any system design problem, ask:

1. **What are the scale requirements?** (users, requests/second, data volume)
2. **What are the consistency requirements?** (eventual vs strong)
3. **What is the read/write ratio?** (read-heavy → caching; write-heavy → queues)
4. **What are the latency requirements?** (< 100ms? real-time?)

## Key Components

\`\`\`
Client → Load Balancer → API Servers → Cache → Database
                              ↓
                          Message Queue → Workers
\`\`\`

> **Callout:** No system design is perfect. Every design is a set of tradeoffs. Your job is to make the right tradeoffs for the given constraints.

## Next Steps

In the following lessons, we'll build intuition for each component and learn when to apply them.`,
      order: 1,
      estimatedMin: 15,
      difficulty: 'beginner',
      companies: ['google', 'meta', 'amazon', 'microsoft'],
      tags: ['fundamentals', 'architecture', 'intro'],
      isPublished: true,
      publishedAt: new Date()
    }
  });
  console.log('✅  Lesson:', lesson1.title);

  // Quiz for lesson 1
  const quiz1 = await db.quiz.create({
    data: {
      lessonId: lesson1.id,
      title: 'System Design Foundations Quiz',
      passingScore: 70,
      isRequired: false,
      questions: {
        create: [
          {
            type: 'multiple_choice',
            content: 'Which factor is most important when deciding between SQL and NoSQL?',
            options: [
              'The programming language used',
              'The team\'s familiarity with the technology',
              'The data model and consistency requirements',
              'The cloud provider being used'
            ],
            correctAnswer: 'The data model and consistency requirements',
            explanation: 'SQL databases excel at relational data with ACID transactions. NoSQL databases trade consistency for scale and flexibility. Always choose based on your data model and consistency needs first.',
            order: 1
          },
          {
            type: 'multiple_choice',
            content: 'What does "horizontal scaling" mean?',
            options: [
              'Adding more CPU and RAM to a single server',
              'Adding more servers to distribute load',
              'Partitioning a database into shards',
              'Caching data in memory'
            ],
            correctAnswer: 'Adding more servers to distribute load',
            explanation: 'Horizontal scaling (scale-out) adds more machines. Vertical scaling (scale-up) upgrades existing hardware. Horizontal scaling is preferred for internet-scale systems because it has no theoretical upper limit.',
            order: 2
          },
          {
            type: 'true_false',
            content: 'A load balancer can help improve both availability and throughput of a system.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Load balancers distribute traffic across multiple servers, so if one server fails, others continue serving (availability). Multiple servers also handle more concurrent requests (throughput).',
            order: 3
          }
        ]
      }
    }
  });
  console.log('✅  Quiz:', quiz1.title);

  // Lesson 1.1.2
  const lesson2 = await db.lesson.upsert({
    where: { slug: 'cap-theorem-deep-dive' },
    update: {},
    create: {
      moduleId: mod1.id,
      slug: 'cap-theorem-deep-dive',
      title: 'CAP Theorem Deep Dive',
      content: `# CAP Theorem

In 2000, Eric Brewer formulated the CAP Theorem: **a distributed system can only guarantee two of the following three properties simultaneously.**

## The Three Properties

| Property | Definition | Example |
|----------|-----------|---------|
| **C**onsistency | Every read receives the most recent write | Bank balance |
| **A**vailability | Every request receives a response | Social media feed |
| **P**artition Tolerance | System operates despite network failures | Any distributed system |

> **Key insight:** Partition tolerance is **non-negotiable** in distributed systems. Networks fail. Therefore, you are always choosing between C and A during a partition.

## Real-World Systems

- **CP (Consistency + Partition Tolerance):** HBase, Zookeeper, etcd
- **AP (Availability + Partition Tolerance):** DynamoDB, Cassandra, CouchDB
- **CA (Consistency + Availability):** Single-node PostgreSQL (not distributed)

## PACELC Extension

CAP only describes behavior during partitions. PACELC extends this: **even without a partition, there is a tradeoff between latency and consistency.**`,
      order: 2,
      estimatedMin: 20,
      difficulty: 'intermediate',
      companies: ['google', 'amazon', 'stripe'],
      tags: ['distributed-systems', 'consistency', 'cap-theorem'],
      isPublished: true,
      publishedAt: new Date()
    }
  });
  console.log('✅  Lesson:', lesson2.title);

  // ── Track 2: Databases ─────────────────────────────────────────────────────
  const track2 = await db.track.upsert({
    where: { slug: 'databases-at-scale' },
    update: {},
    create: {
      slug: 'databases-at-scale',
      name: 'Databases at Scale',
      description: 'From indexing strategies to sharding, replication, and choosing the right database for every workload.',
      level: 2,
      order: 2,
      estimatedHours: 10,
      learningGoals: [
        'Understand B-Tree vs LSM-Tree storage engines',
        'Design effective indexing strategies',
        'Implement read replicas and write sharding',
        'Choose between SQL, Document, Column-family, and Graph databases'
      ],
      isPublished: true
    }
  });
  console.log('✅  Track:', track2.name);

  // ── Track 3: Caching ───────────────────────────────────────────────────────
  const track3 = await db.track.upsert({
    where: { slug: 'caching-strategies' },
    update: {},
    create: {
      slug: 'caching-strategies',
      name: 'Caching Strategies',
      description: 'Redis, CDN, browser caching, and cache invalidation — the hardest problem in computer science.',
      level: 2,
      order: 3,
      estimatedHours: 6,
      learningGoals: [
        'Understand cache-aside, write-through, and write-behind patterns',
        'Design eviction policies for different workloads',
        'Implement distributed caching with Redis',
        'Handle cache stampede and cache poisoning'
      ],
      isPublished: true
    }
  });
  console.log('✅  Track:', track3.name);

  // ── Interview Prompts ──────────────────────────────────────────────────────
  const prompt1 = await db.interviewPrompt.upsert({
    where: { id: 'prompt-url-shortener' },
    update: {},
    create: {
      id: 'prompt-url-shortener',
      title: 'Design a URL Shortener (like bit.ly)',
      description: 'Design a URL shortening service that generates short aliases for long URLs and redirects users efficiently at massive scale.',
      requirements: [
        'Given a long URL, generate a unique short URL (e.g., sdos.ly/abc123)',
        'Redirect short URL to original URL with < 10ms latency',
        'Handle 100M URLs stored, 10K reads/sec, 1K writes/sec',
        'URLs should never expire (by default)',
        'Support analytics: click count per URL'
      ],
      difficulty: 'easy',
      companies: ['amazon', 'google', 'microsoft', 'uber'],
      timeLimitMin: 45,
      hints: [
        'Start with the data model: what does a URL record look like?',
        'How do you generate a unique short code? Think about base62 encoding.',
        'The redirect path is read-heavy — what caching strategy fits here?',
        'How do you handle 301 vs 302 redirects and their cache implications?',
        'For analytics, consider async write to avoid slowing down the redirect'
      ],
      tags: ['hashing', 'caching', 'databases', 'cdn'],
      rubric: [
        { id: 'has-load-balancer',  name: 'Load Balancer Present',  weight: 10, nodeType: 'LOAD_BALANCER',  hint: 'Add a load balancer to distribute traffic across API servers' },
        { id: 'has-cache',          name: 'Cache for Redirects',    weight: 15, nodeType: 'CACHE',          hint: 'Cache popular short→long URL mappings in Redis to avoid DB on every redirect' },
        { id: 'has-database',       name: 'Database Present',       weight: 10, nodeType: 'DATABASE_SQL',   hint: 'You need persistent storage for URL mappings' },
        { id: 'has-cdn',            name: 'CDN for Static Assets',  weight: 10, nodeType: 'CDN',            hint: 'Serve the redirect landing page via CDN' },
        { id: 'has-api-gateway',    name: 'API Gateway Present',    weight: 10, nodeType: 'API_GATEWAY',    hint: 'An API gateway handles auth, rate limiting, and routing' },
        { id: 'client-connected',   name: 'Client → Server Path',   weight: 20, type: 'connectivity',      hint: 'Ensure there is a connected path from Client to your API servers' },
        { id: 'db-replication',     name: 'Read Replicas',          weight: 15, type: 'config',            hint: 'Enable read replicas on the database — URL lookups are read-heavy' },
        { id: 'has-queue',          name: 'Async Analytics Queue',  weight: 10, nodeType: 'QUEUE',          hint: 'Use a queue to process click analytics asynchronously' }
      ],
      isPublished: true
    }
  });
  console.log('✅  Interview prompt:', prompt1.title);

  const prompt2 = await db.interviewPrompt.upsert({
    where: { id: 'prompt-rate-limiter' },
    update: {},
    create: {
      id: 'prompt-rate-limiter',
      title: 'Design a Rate Limiter',
      description: 'Design a distributed rate limiting system that can throttle API requests at the gateway level across multiple servers.',
      requirements: [
        'Limit requests per user, per IP, and per API key',
        'Support multiple algorithms: token bucket, sliding window',
        'Work correctly across 10+ API gateway instances',
        'Add < 5ms latency to each request',
        'Return 429 with Retry-After header when limit is exceeded'
      ],
      difficulty: 'medium',
      companies: ['stripe', 'cloudflare', 'google', 'meta'],
      timeLimitMin: 45,
      hints: [
        'Where do you store the counters? Local memory won\'t work across servers.',
        'Redis INCR + EXPIRE implements a fixed window in two commands.',
        'Lua scripts on Redis make sliding window atomic.',
        'Think about what happens if Redis is down — fail open or fail closed?',
        'Consider using a sidecar pattern to avoid coupling your services to the rate limiter'
      ],
      tags: ['redis', 'distributed-systems', 'api-gateway', 'algorithms'],
      rubric: [
        { id: 'has-cache',      name: 'Shared Counter Store (Redis)', weight: 25, nodeType: 'CACHE',       hint: 'Rate limit counters must be stored in shared Redis, not local memory' },
        { id: 'has-lb',         name: 'Load Balancer Present',        weight: 10, nodeType: 'LOAD_BALANCER', hint: 'Multiple gateway instances require a load balancer' },
        { id: 'has-gateway',    name: 'API Gateway Present',          weight: 20, nodeType: 'API_GATEWAY', hint: 'The rate limiter lives at the API gateway layer' },
        { id: 'has-db',         name: 'Rule Store Database',          weight: 15, nodeType: 'DATABASE_SQL', hint: 'Rate limit rules (limits per user/plan) must be persisted' },
        { id: 'client-path',    name: 'Client → Gateway Path',        weight: 20, type: 'connectivity',   hint: 'Ensure client connects through the gateway' },
        { id: 'fallback',       name: 'Fallback Strategy Described',  weight: 10, type: 'config',          hint: 'What happens when Redis is down? Fail open or closed?' }
      ],
      isPublished: true
    }
  });
  console.log('✅  Interview prompt:', prompt2.title);

  // ── Feature Flags ──────────────────────────────────────────────────────────
  await db.featureFlag.upsert({
    where: { key: 'simulation_v2' },
    update: {},
    create: { key: 'simulation_v2', description: 'New simulation engine with chaos injection', enabled: false, rolloutPct: 0 }
  });
  await db.featureFlag.upsert({
    where: { key: 'ai_explain_tradeoffs' },
    update: {},
    create: { key: 'ai_explain_tradeoffs', description: 'AI-powered tradeoff explanation on node click', enabled: true, rolloutPct: 100, allowedRoles: ['PRO', 'ADMIN'] }
  });
  await db.featureFlag.upsert({
    where: { key: 'community_blueprints' },
    update: {},
    create: { key: 'community_blueprints', description: 'Community blueprint gallery', enabled: true, rolloutPct: 100 }
  });
  console.log('✅  Feature flags seeded');

  console.log('\n✨  Database seeding complete!\n');
  console.log('   Admin:  admin@sdos.academy  /  Admin@123456');
  console.log('   Demo:   demo@sdos.academy   /  Test@123456\n');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
