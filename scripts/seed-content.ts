// scripts/seed-content.ts
// Run: npx ts-node -P tsconfig.json scripts/seed-content.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── MDX lesson bodies ─────────────────────────────────────────────────────────
const L1_LESSONS = [
  {
    slug: 'what-is-system-design',
    title: 'What is System Design?',
    estimatedMin: 8,
    difficulty: 'beginner',
    tags: ['fundamentals', 'overview'],
    companies: [],
    content: `# What is System Design?

System design is the process of defining the **architecture, components, modules, and data flow** of a system to satisfy a set of requirements.

In a senior-level interview, you are expected to:
- Clarify functional and non-functional requirements
- Propose a high-level architecture
- Justify component choices with explicit trade-offs
- Handle scaling, reliability, and failure modes

<Callout type="insight">
Unlike coding rounds, system design has no single correct answer. You are being evaluated on your **reasoning process**, not just the final diagram.
</Callout>

## Why It Matters

Every system at scale (Google Search, Netflix, WhatsApp) is built on deliberate architectural decisions. Interviewers want to see that you can make those decisions under ambiguity.

## The Core Loop

1. **Requirements** — functional ("users can upload videos") + non-functional ("< 200 ms P99")
2. **Estimation** — traffic, storage, bandwidth
3. **Architecture** — components and their interactions
4. **Deep Dives** — pick 2-3 components to explore thoroughly
5. **Trade-offs** — explain what you gave up and why

<Diagram
  nodes={[{"id":"client","label":"Client","type":"client","x":50,"y":80},{"id":"lb","label":"Load Balancer","type":"lb","x":280,"y":80},{"id":"api","label":"API Server","type":"app","x":510,"y":80},{"id":"db","label":"Database","type":"db","x":510,"y":200}]}
  edges={[{"from":"client","to":"lb"},{"from":"lb","to":"api"},{"from":"api","to":"db","label":"read/write"}]}
/>
`,
    quiz: {
      title: 'Foundations Check',
      passingScore: 70,
      questions: [
        { content: 'What does a system design interview primarily evaluate?', options: ['Your ability to write fast code', 'Your reasoning process and trade-off analysis', 'Your knowledge of algorithms', 'Your database query skills'], correctAnswer: 'Your reasoning process and trade-off analysis', explanation: 'System design interviews assess architectural thinking, trade-off awareness, and structured communication — not raw coding ability.' },
        { content: 'Which of these is a non-functional requirement?', options: ['Users can send messages', 'The system must support 10M DAU', 'The API returns message history', 'Users can delete messages'], correctAnswer: 'The system must support 10M DAU', explanation: 'Non-functional requirements define quality attributes (scale, latency, availability) rather than specific user-facing features.' },
      ],
    },
  },
  {
    slug: 'capacity-estimation',
    title: 'Capacity Estimation Basics',
    estimatedMin: 12,
    difficulty: 'beginner',
    tags: ['estimation', 'math', 'qps'],
    companies: ['google', 'meta'],
    content: `# Capacity Estimation

Before designing anything, **estimate the load**. Interviewers use this to gauge whether you understand scale.

## The Three Numbers

| Metric | Rough Formula |
|---|---|
| QPS | DAU × avg_requests / 86,400 |
| Storage/day | write_QPS × avg_payload |
| Bandwidth | read_QPS × avg_response_size |

<Callout type="tip">
Use powers of 10. 1M users × 10 req/day = ~115 QPS. Round generously and move on.
</Callout>

## Twitter-Scale Example

- **DAU**: 300M
- **Tweets/day**: 300M × 3 = 900M writes → **~10,400 write QPS**
- **Reads**: 10× write-heavy = **~104,000 read QPS**
- **Tweet size**: 300 bytes → **270 GB/day** raw storage
- **With media (10%)**: add ~1 TB/day for images

## The 80/20 Rule

Systems are almost always read-heavy. Design your caching and replication strategy accordingly.
`,
    quiz: {
      title: 'Estimation Check',
      passingScore: 70,
      questions: [
        { content: 'A service has 10M DAU each making 20 requests/day. Approximate QPS?', options: ['~23 QPS', '~2,300 QPS', '~23,000 QPS', '~200,000 QPS'], correctAnswer: '~2,300 QPS', explanation: '10M × 20 / 86,400 ≈ 2,315 QPS. Always divide by seconds in a day (~100k for rough math).' },
        { content: 'Most real-world systems are:', options: ['Write-heavy', 'Read-heavy', 'Balanced 50/50', 'Compute-heavy'], correctAnswer: 'Read-heavy', explanation: 'Typical read:write ratios are 10:1 to 100:1. This drives decisions about caching, CDNs, and read replicas.' },
      ],
    },
  },
  {
    slug: 'functional-vs-nonfunctional-requirements',
    title: 'Reading Requirements — Functional vs Non-Functional',
    estimatedMin: 7,
    difficulty: 'beginner',
    tags: ['requirements', 'interview-framework'],
    companies: [],
    content: `# Functional vs Non-Functional Requirements

The first 5 minutes of any system design interview should be spent **clarifying requirements**. Jumping to architecture before this is the #1 mistake.

## Functional Requirements

What the system **does** — user-facing features.

- "Users can post tweets"
- "Users can follow other users"
- "The timeline shows the 20 most recent posts"

## Non-Functional Requirements

How well the system **performs** — quality attributes.

| NFR | Example target |
|---|---|
| Availability | 99.9% uptime (8.7h/year downtime) |
| Latency | P99 feed load < 200ms |
| Consistency | Eventual OK; stale reads acceptable |
| Durability | No data loss on single node failure |
| Scale | 50M DAU, 100k write QPS peak |

<Callout type="warning">
Never assume consistency requirements. Ask explicitly: "Is it OK if a user sees a slightly stale feed?"
</Callout>
`,
    quiz: {
      title: 'Requirements Check',
      passingScore: 70,
      questions: [
        { content: '"The system must handle 1M concurrent users" is a:', options: ['Functional requirement', 'Non-functional requirement', 'Implementation detail', 'API contract'], correctAnswer: 'Non-functional requirement', explanation: 'Scale targets are quality attributes (non-functional). They constrain *how* you build, not *what* you build.' },
      ],
    },
  },
];

const L2_LESSONS = [
  {
    slug: 'load-balancers',
    title: 'Load Balancers — What, Why, How',
    estimatedMin: 14,
    difficulty: 'intermediate',
    tags: ['load-balancing', 'scaling', 'availability'],
    companies: ['google', 'amazon', 'netflix'],
    content: `# Load Balancers

A **load balancer** distributes incoming requests across a pool of servers to maximize throughput, minimize latency, and prevent any single server from becoming a bottleneck.

<Diagram
  nodes={[{"id":"client","label":"Client","type":"client","x":40,"y":80},{"id":"lb","label":"Load Balancer","type":"lb","x":250,"y":80},{"id":"s1","label":"Server 1","type":"app","x":460,"y":20},{"id":"s2","label":"Server 2","type":"app","x":460,"y":80},{"id":"s3","label":"Server 3","type":"app","x":460,"y":140}]}
  edges={[{"from":"client","to":"lb"},{"from":"lb","to":"s1"},{"from":"lb","to":"s2"},{"from":"lb","to":"s3"}]}
/>

## Algorithms

| Algorithm | How it works | Best for |
|---|---|---|
| **Round Robin** | Request 1→S1, 2→S2, 3→S3, repeat | Homogeneous servers |
| **Least Connections** | Send to server with fewest active connections | Variable request duration |
| **IP Hash** | Hash client IP to a consistent server | Session affinity (sticky sessions) |
| **Weighted** | Assign proportional traffic by server capacity | Mixed hardware |

## L4 vs L7 Load Balancers

- **L4 (Transport)** — Routes by IP/TCP. Fast, blind to content.
- **L7 (Application)** — Routes by HTTP headers, URL, cookies. Enables path-based routing, A/B testing, auth offloading.

<Callout type="insight">
AWS ALB is L7. AWS NLB is L4. In interviews, default to L7 unless you need sub-millisecond overhead.
</Callout>

## Health Checks

LBs continuously ping servers (HTTP \`GET /health\`). A server missing 2-3 consecutive checks is removed from rotation automatically.
`,
    quiz: {
      title: 'Load Balancer Check',
      passingScore: 70,
      questions: [
        { content: 'Which algorithm is best when requests have variable processing times?', options: ['Round Robin', 'Least Connections', 'IP Hash', 'Random'], correctAnswer: 'Least Connections', explanation: 'Least Connections routes to the server with the fewest active requests, naturally balancing load when request durations vary.' },
        { content: 'What is the key advantage of an L7 (application-layer) load balancer?', options: ['Lower latency than L4', 'Can route based on HTTP content (URL, headers, cookies)', 'Works at the network packet level', 'Requires no TLS termination'], correctAnswer: 'Can route based on HTTP content (URL, headers, cookies)', explanation: 'L7 LBs inspect the actual HTTP request, enabling path-based routing, sticky sessions, and A/B traffic splitting.' },
      ],
    },
  },
  {
    slug: 'sql-databases',
    title: 'SQL Databases — When and How to Use Them',
    estimatedMin: 15,
    difficulty: 'intermediate',
    tags: ['databases', 'sql', 'acid', 'indexing'],
    companies: ['stripe', 'github', 'shopify'],
    content: `# SQL Databases

Relational databases organize data into **tables with rows and columns**, enforce a schema, and guarantee **ACID** transactions.

## ACID Properties

| Property | What it means |
|---|---|
| **Atomicity** | All statements in a transaction succeed, or none do |
| **Consistency** | DB moves from one valid state to another |
| **Isolation** | Concurrent transactions don't interfere |
| **Durability** | Committed data survives crashes |

## When to Choose SQL

- Data has clear relationships (users → orders → items)
- You need transactions (financial systems, inventory)
- Complex queries with JOINs are common
- Schema is stable and well-defined

## Scaling SQL

1. **Read Replicas** — Route \`SELECT\` queries to replicas, writes to primary
2. **Connection Pooling** — PgBouncer prevents connection exhaustion
3. **Indexing** — B-tree indexes on columns used in \`WHERE\`, \`ORDER BY\`, \`JOIN\`
4. **Vertical Scaling** — Bigger instance before horizontal complexity
5. **Sharding** — Last resort; splits data by key across multiple DBs

<Callout type="warning">
Avoid premature sharding. A well-indexed Postgres instance can handle 10k+ QPS. Reach for read replicas first.
</Callout>
`,
    quiz: {
      title: 'SQL Check',
      passingScore: 70,
      questions: [
        { content: 'Which SQL scaling strategy should you try BEFORE sharding?', options: ['Denormalization', 'Read replicas', 'CQRS pattern', 'Event sourcing'], correctAnswer: 'Read replicas', explanation: 'Read replicas offload SELECT queries from the primary with minimal complexity. Sharding adds massive operational overhead and should come much later.' },
        { content: 'The "D" in ACID stands for:', options: ['Distribution', 'Durability', 'Dependency', 'Determinism'], correctAnswer: 'Durability', explanation: 'Durability means committed transactions survive crashes — typically achieved via WAL (write-ahead log) and fsync.' },
      ],
    },
  },
  {
    slug: 'caching',
    title: 'Caches — Redis, Memcached, CDN Caching',
    estimatedMin: 16,
    difficulty: 'intermediate',
    tags: ['caching', 'redis', 'cdn', 'performance'],
    companies: ['twitter', 'instagram', 'netflix'],
    content: `# Caches

A cache stores a **subset of data in fast storage** (RAM) to reduce read latency and database load.

## Cache Strategies

| Strategy | Description | Use Case |
|---|---|---|
| **Cache-aside** | App checks cache; on miss, loads from DB and populates cache | Most common. Simple. |
| **Write-through** | Write to cache and DB simultaneously | Strong consistency needed |
| **Write-behind** | Write to cache; async flush to DB | High write throughput |
| **Read-through** | Cache layer fetches from DB on miss transparently | Simpler app code |

## Eviction Policies

- **LRU** (Least Recently Used) — Evict the least recently accessed item. Default for most cases.
- **LFU** (Least Frequently Used) — Evict items accessed fewest times.
- **TTL** — Expire entries after a time window.

<Callout type="tip">
In interviews, default to **cache-aside + LRU + TTL** unless you have a specific reason not to.
</Callout>

## Redis vs Memcached

| | Redis | Memcached |
|---|---|---|
| Data structures | Rich (lists, sets, sorted sets, streams) | String only |
| Persistence | Yes (RDB + AOF) | No |
| Clustering | Native | Needs client-side sharding |
| **Choose when** | Complex queries, pub/sub, Lua scripts | Pure key-value, max simplicity |

## CDN Caching

Caches **static assets** (JS, CSS, images) and increasingly dynamic responses at edge nodes close to users. Cache-Control headers control behavior.
`,
    quiz: {
      title: 'Caching Check',
      passingScore: 70,
      questions: [
        { content: 'In cache-aside strategy, who is responsible for loading data into the cache on a miss?', options: ['The database', 'The cache layer itself', 'The application code', 'A background job'], correctAnswer: 'The application code', explanation: 'In cache-aside (lazy loading), the app checks the cache, and on a miss it queries the DB and populates the cache before returning the result.' },
        { content: 'Which eviction policy removes the least recently accessed item?', options: ['LFU', 'FIFO', 'LRU', 'TTL'], correctAnswer: 'LRU', explanation: 'LRU (Least Recently Used) is the most common eviction policy. It assumes recently accessed data is more likely to be accessed again soon.' },
      ],
    },
  },
];

// ── Seed runner ───────────────────────────────────────────────────────────────
async function run() {
  console.log('🌱  Seeding SD-OS curriculum…\n');

  // ── Track: Level 1 Foundations ──
  const track1 = await prisma.track.upsert({
    where: { slug: 'foundations' },
    update: {},
    create: {
      slug: 'foundations',
      name: 'Level 1: Foundations',
      description: 'The vocabulary, mental models, and interview framework every system design candidate needs before writing a single node on a diagram.',
      level: 1,
      order: 1,
      estimatedHours: 6,
      learningGoals: [
        'Define functional vs non-functional requirements',
        'Estimate QPS, storage, and bandwidth for any prompt',
        'Describe the interview framework used at FAANG companies',
        'Read and produce basic architecture diagrams',
      ],
      isPublished: true,
    },
  });

  const mod1 = await prisma.module.upsert({
    where: { id: 'mod-l1-core' },
    update: {},
    create: {
      id: 'mod-l1-core',
      trackId: track1.id,
      name: 'Core Concepts',
      description: 'Fundamentals every candidate must know cold.',
      order: 1,
      estimatedMin: 27,
      isPublished: true,
    },
  });

  for (let i = 0; i < L1_LESSONS.length; i++) {
    const l = L1_LESSONS[i];
    const lesson = await prisma.lesson.upsert({
      where: { slug: l.slug },
      update: { content: l.content, isPublished: true },
      create: {
        moduleId: mod1.id,
        slug: l.slug,
        title: l.title,
        content: l.content,
        order: i + 1,
        estimatedMin: l.estimatedMin,
        difficulty: l.difficulty,
        companies: l.companies,
        tags: l.tags,
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    // Quiz
    const quiz = await prisma.quiz.upsert({
      where: { id: `quiz-${l.slug}` },
      update: {},
      create: {
        id: `quiz-${l.slug}`,
        lessonId: lesson.id,
        title: l.quiz.title,
        passingScore: l.quiz.passingScore,
        isRequired: false,
      },
    });

    for (let qi = 0; qi < l.quiz.questions.length; qi++) {
      const q = l.quiz.questions[qi];
      await prisma.question.upsert({
        where: { id: `q-${l.slug}-${qi}` },
        update: {},
        create: {
          id: `q-${l.slug}-${qi}`,
          quizId: quiz.id,
          type: 'multiple_choice',
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: qi + 1,
        },
      });
    }
    console.log(`  ✓ L1 lesson: ${l.title}`);
  }

  // ── Track: Level 2 Building Blocks ──
  const track2 = await prisma.track.upsert({
    where: { slug: 'building-blocks' },
    update: {},
    create: {
      slug: 'building-blocks',
      name: 'Level 2: Building Blocks',
      description: 'The components every distributed system is assembled from — load balancers, databases, caches, queues, and object storage.',
      level: 2,
      order: 2,
      estimatedHours: 10,
      learningGoals: [
        'Explain load balancing algorithms and L4 vs L7 differences',
        'Choose between SQL and NoSQL for a given workload',
        'Apply caching strategies (cache-aside, write-through, TTL)',
        'Describe message queue semantics and when to use them',
      ],
      isPublished: true,
    },
  });

  const mod2 = await prisma.module.upsert({
    where: { id: 'mod-l2-core' },
    update: {},
    create: {
      id: 'mod-l2-core',
      trackId: track2.id,
      name: 'Core Infrastructure',
      description: 'The infrastructure primitives every backend engineer must know.',
      order: 1,
      estimatedMin: 45,
      isPublished: true,
    },
  });

  for (let i = 0; i < L2_LESSONS.length; i++) {
    const l = L2_LESSONS[i];
    const lesson = await prisma.lesson.upsert({
      where: { slug: l.slug },
      update: { content: l.content, isPublished: true },
      create: {
        moduleId: mod2.id,
        slug: l.slug,
        title: l.title,
        content: l.content,
        order: i + 1,
        estimatedMin: l.estimatedMin,
        difficulty: l.difficulty,
        companies: l.companies,
        tags: l.tags,
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    const quiz = await prisma.quiz.upsert({
      where: { id: `quiz-${l.slug}` },
      update: {},
      create: {
        id: `quiz-${l.slug}`,
        lessonId: lesson.id,
        title: l.quiz.title,
        passingScore: l.quiz.passingScore,
        isRequired: false,
      },
    });

    for (let qi = 0; qi < l.quiz.questions.length; qi++) {
      const q = l.quiz.questions[qi];
      await prisma.question.upsert({
        where: { id: `q-${l.slug}-${qi}` },
        update: {},
        create: {
          id: `q-${l.slug}-${qi}`,
          quizId: quiz.id,
          type: 'multiple_choice',
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: qi + 1,
        },
      });
    }
    console.log(`  ✓ L2 lesson: ${l.title}`);
  }

  console.log('\n✅  Seed complete.');
  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
