export const module13Lessons = [
  {
    id: 'lesson-13-01',
    slug: 'design-deep-dive-01-chat-system',
    title: 'Design a Real-Time Chat System (WhatsApp / Discord)',
    content: `## 0. Mental Model

> A chat system is like a massive conference call where people come and go, talk in different rooms, send private messages, and expect every word to arrive in the exact order spoken — with delivery receipts. Scaling this to billions requires careful architecture.

## 1. Quick Summary

Design a real-time chat system supporting **1-on-1 messaging**, **group chats**, **channels**, **online presence**, **delivery receipts** (sent/delivered/read), and **media sharing**. Key challenges: **WebSocket connection management** (millions of persistent connections), **message ordering** (global vs per-conversation), **fan-out** (write to sender's message list vs recipient's), **presence** (heartbeat with grace period), and **media storage** (CDN for images/videos).

## 2. Scale Estimates

| Metric | Daily Active Users | Actions |
|--------|-------------------|---------|
| DAU | 500M | 100 msg/user/day |
| Messages per day | 50B | Peak: 2.5M msg/sec |
| Media uploads | 500M/day | Avg: 500KB each |

## 3. Core Architecture

<RoughDiagram
  nodes={[
    { id: 'client', label: 'Mobile/Web Client', type: 'client', x: 50, y: 200 },
    { id: 'lb', label: 'Load Balancer', type: 'lb', x: 250, y: 160 },
    { id: 'ws', label: 'WebSocket Servers', type: 'web', x: 450, y: 40 },
    { id: 'api', label: 'REST API Servers', type: 'web', x: 450, y: 280 },
    { id: 'redis', label: 'Redis (Presence + Sessions)', type: 'cache', x: 680, y: 100 },
    { id: 'msg', label: 'Message Queue (Kafka)', type: 'queue', x: 680, y: 200 },
    { id: 'db', label: 'Cassandra (Messages)', type: 'db', x: 680, y: 340 },
    { id: 's3', label: 'S3 / CDN (Media)', type: 'storage', x: 680, y: 440 },
  ]}
  edges={[
    { from: 'client', to: 'lb', label: 'WebSocket / HTTPS' },
    { from: 'lb', to: 'ws', label: 'upgrade' },
    { from: 'lb', to: 'api', label: 'REST' },
    { from: 'ws', to: 'redis', label: 'read/write presence' },
    { from: 'ws', to: 'msg', label: 'publish message' },
    { from: 'api', to: 'msg', label: 'publish' },
    { from: 'msg', to: 'db', label: 'async write' },
    { from: 'api', to: 'db', label: 'read messages' },
  ]}
  height={500}
/>

## 4. Key Design Decisions

**Fan-out on write vs read:** For 1-on-1 chat, use **fan-out on read** (pull model) — messages stored in a global message table, recipients pull their messages. For group chats with small groups (<100), use **fan-out on write** — copy the message to each member's inbox.

**Message ordering:** Use a **sequence ID per conversation** (monotonic counter in Redis). Don't rely on timestamps — clock skew causes ordering issues.

**WebSocket connection management:** Each WebSocket server keeps connected user IDs in memory. Redis pub/sub broadcasts presence changes across the cluster.

## 5. Quiz

\`\`\`
- Q: Why use sequence IDs instead of timestamps for message ordering?
  Options: Timestamps are slow, Clock skew across servers, Sequence IDs use less storage, Timestamps don't support timezones
  Correct: Clock skew across servers

- Q: How do you detect a disconnected client's online status?
  Options: No detection, Client sends disconnect msg, Heartbeat timeout with grace period, Polling every second
  Correct: Heartbeat timeout with grace period
\`\`\``,
    estimatedMin: 22,
    difficulty: 'Advanced' as const,
    companies: ['WhatsApp', 'Discord', 'Slack', 'Telegram', 'Twitter'],
    tags: ['chat', 'websockets', 'real-time', 'fan-out', 'presence', 'scalability'],
  },
  {
    id: 'lesson-13-02',
    slug: 'design-deep-dive-02-payment-system',
    title: 'Design a Payment System (Stripe / PayPal)',
    content: `## 0. Mental Model

> A payment system is like a bank vault with strict accounting. Every cent must be accounted for, every transaction must be idempotent, and if anything fails mid-way, the system must roll back perfectly. There is no "close enough" in payments.

## 1. Quick Summary

Design a payment processing system handling **millions of transactions/day** with **payment methods** (cards, wallets, BNPL), **3DS authentication**, **webhook notifications**, **refunds**, **dispute handling**, **payouts** to merchants, and **reconciliation**. The core challenge: **idempotency** (retry safety), **consistency** (ledger must balance), and **multi-step payment flows** (authorize → capture → settle).

## 2. Core Flow

\`\`\`
1. Client: POST /charges (idempotency_key: "req_abc")
2. API: Check idempotency key cache (Redis) — if exists, return cached result
3. API: Validate card details with bin lookup
4. API: Call processor (Stripe, Adyen) — authorize the amount
5. API: Store charge record in DB (status: pending)
6. Async: Capture settlement (batch job, runs every few minutes)
7. Webhook: Notify merchant of success/failure
\`\`\`

## 3. Idempotency

\`\`\`typescript
async function createCharge(req: CreateChargeRequest) {
  const existing = await cache.get(req.idempotencyKey);
  if (existing) return existing; // same result as first call

  const charge = await paymentProcessor.authorize(req.amount, req.currency);
  const record = await db.charges.create({
    amount: req.amount,
    status: 'authorized',
    idempotencyKey: req.idempotencyKey,
    processorChargeId: charge.id,
  });

  await cache.set(req.idempotencyKey, record, { ttl: 24 * 3600 });
  return record;
}
\`\`\`

## 4. Reconciliation

Every night, compare internal ledger against processor statements. Mismatches (usually <0.1%) are flagged for manual review. A double-entry ledger ensures every debit has a corresponding credit.

<RoughDiagram
  nodes={[
    { id: 'client', label: 'Client / Merchant', type: 'client', x: 50, y: 180 },
    { id: 'api', label: 'Payment API', type: 'gateway', x: 280, y: 120 },
    { id: 'cache', label: 'Idempotency Cache (Redis)', type: 'cache', x: 280, y: 280 },
    { id: 'proc', label: 'Card Processor (Stripe)', type: 'worker', x: 520, y: 40 },
    { id: 'ledger', label: 'Ledger DB (PostgreSQL)', type: 'db', x: 520, y: 160 },
    { id: 'queue', label: 'Settlement Queue', type: 'queue', x: 520, y: 280 },
    { id: 'recon', label: 'Reconciliation Engine', type: 'worker', x: 520, y: 400 },
  ]}
  edges={[
    { from: 'client', to: 'api', label: 'POST /charge' },
    { from: 'api', to: 'cache', label: 'check/store' },
    { from: 'api', to: 'proc', label: 'authorize' },
    { from: 'api', to: 'ledger', label: 'save' },
    { from: 'api', to: 'queue', label: 'schedule settlement' },
    { from: 'queue', to: 'ledger', label: 'settle' },
    { from: 'recon', to: 'ledger', label: 'compare' },
  ]}
  height={460}
/>

## 5. Quiz

\`\`\`
- Q: A network retry creates a duplicate charge request. How is double-charging prevented?
  Options: UNIQUE constraint on amount, TCP guarantees exactly-once, Idempotency key returns cached result, Manual review
  Correct: Idempotency key returns cached result

- Q: What's the purpose of a double-entry ledger in payments?
  Options: Faster queries, Every debit has matching credit, Reduced storage, Simpler code
  Correct: Every debit has matching credit
\`\`\``,
    estimatedMin: 24,
    difficulty: 'Advanced' as const,
    companies: ['Stripe', 'PayPal', 'Square', 'Adyen', 'Razorpay'],
    tags: ['payments', 'idempotency', 'ledger', 'reconciliation', 'fintech'],
  },
  {
    id: 'lesson-13-03',
    slug: 'design-deep-dive-03-video-conferencing',
    title: 'Design a Video Conferencing System (Zoom / Google Meet)',
    content: `## 0. Mental Model

> A video conferencing system is like a live TV broadcast where every participant is both a viewer and a broadcaster, with imperceptible delay. You're sending 30 frames per second from every camera to every screen — the math is brutal.

## 1. Quick Summary

Design a real-time video conferencing system supporting **hundreds of participants**, **screen sharing**, **chat**, **reactions**, **recording**, and **virtual backgrounds**. Core challenge: **WebRTC** for peer-to-peer media, **SFU (Selective Forwarding Unit)** for group calls (server selectively forwards video streams), **simulcast** (send multiple resolutions, receiver picks the right one), and **TURN servers** for users behind restrictive NATs.

## 2. Architecture

- **Signaling:** WebSocket servers handle room management, offer/answer exchange, ICE candidate relay
- **Media:** SFU (Selective Forwarding Unit) servers receive each participant's media and forward to others
- **SFU Logic:** For a call with N participants, each sends 1 stream, SFU sends N-1 streams to each participant
- **Simulcast:** Each client sends 3 resolution layers (720p, 360p, 180p). SFU forwards the appropriate layer based on receiver's screen and bandwidth
- **Recording:** SFU subscribes to all streams as a "bot participant" and transcodes to a single recording

## 3. Scalability

| Participants | Architecture | Bandwidth per participant (upload) |
|-------------|-------------|-----------------------------------|
| 2 (P2P) | Direct WebRTC | ~3 Mbps |
| 2-10 | Mesh (each sends to all) | ~3 Mbps × (N-1) — unsustainable beyond 10 |
| 10-1000 | SFU (each sends once) | ~3 Mbps (constant, regardless of group size) |

<RoughDiagram
  nodes={[
    { id: 'clientA', label: 'Participant A', type: 'client', x: 80, y: 40 },
    { id: 'clientB', label: 'Participant B', type: 'client', x: 80, y: 240 },
    { id: 'clientC', label: 'Participant C', type: 'client', x: 750, y: 40 },
    { id: 'clientD', label: 'Participant D', type: 'client', x: 750, y: 240 },
    { id: 'sfu', label: 'SFU Server', type: 'app', x: 400, y: 100 },
    { id: 'turn', label: 'TURN Server', type: 'worker', x: 400, y: 300 },
    { id: 'sig', label: 'Signaling Server', type: 'gateway', x: 400, y: 460 },
  ]}
  edges={[
    { from: 'clientA', to: 'sfu', label: 'upload stream' },
    { from: 'clientB', to: 'sfu', label: 'upload stream' },
    { from: 'sfu', to: 'clientC', label: 'forward A+B' },
    { from: 'sfu', to: 'clientD', label: 'forward A+B' },
    { from: 'clientA', to: 'turn', label: 'ICE relay' },
    { from: 'clientA', to: 'sig', label: 'WebSocket' },
    { from: 'sig', to: 'sfu', label: 'control' },
  ]}
  height={520}
/>

## 4. Quiz

\`\`\`
- Q: Why use an SFU instead of mesh topology for group calls?
  Options: Simpler implementation, Lower bandwidth per participant, Better video quality, No server needed
  Correct: Lower bandwidth per participant (upload is constant)

- Q: What problem does a TURN server solve?
  Options: Video encoding, NAT traversal, Screen sharing, Recording
  Correct: NAT traversal (connectivity for users behind firewalls)
\`\`\``,
    estimatedMin: 22,
    difficulty: 'Advanced' as const,
    companies: ['Zoom', 'Google', 'Microsoft', 'Meta', 'Slack'],
    tags: ['video-conferencing', 'WebRTC', 'SFU', 'TURN', 'real-time', 'media'],
  },
  {
    id: 'lesson-13-04',
    slug: 'design-deep-dive-04-search-autocomplete',
    title: 'Design Search Autocomplete / Typeahead',
    content: `## 0. Mental Model

> Autocomplete is like a massive dictionary where you want to show the top 5 most popular completions as the user types each letter. The challenge isn't just speed — it's doing this for billions of users with sub-50ms latency while handling dynamic popularity updates.

## 1. Quick Summary

Design a **typeahead / search autocomplete** system that suggests the top-N completions as a user types. Core components: **Trie data structure** (prefix tree for fast prefix lookups), **top-K aggregation** (pre-compute the top N results for each prefix), **incremental update** (popularity changes over time), and **caching** (CDN for top queries, Redis for mid-tier).

## 2. Data Structure: Trie

\`\`\`
              root
             /    \\
            a      b
           / \    / \\
          p   s  e   o
         /   / \  |   |
        p   e   h   s   o
       /   /    |   |   |
       l   a    t   t   k
      /   /     |   |   |
      e   r     t   s   s
     /   /      |
     :  :       :
\`\`\`

Each node stores: the prefix string, a list of top-5 completions (pre-computed), and child pointers.

## 3. Architecture

\`\`\`
User types "ap" → API Gateway → Trie Cluster (hash ring on prefix)
  → Trie node for "ap" returns cached top-5 suggestions
  → Results cached at CDN edge for frequent queries
  → Background updater re-computes top-5 every N minutes from query logs
\`\`\`

## 4. Optimizations

1. **Limit depth:** Only store prefixes up to 5 characters. Beyond that, fall back to full-text search.

2. **Federated tries:** Split the trie by prefix hash across multiple servers. Each server owns a prefix range.

3. **Personalization:** Append user's search history to the generic top-5 results (boost recent personal queries).

4. **Ranking signal:** Use log of query frequency. Decay weight: \`score = count / (hours_ago + 2)^1.5\`

## 5. Quiz

\`\`\`
- Q: What data structure is most commonly used for autocomplete prefix lookup?
  Options: HashMap, B-Tree, Trie, Skip List
  Correct: Trie

- Q: How do you update autocomplete suggestions when a new query becomes popular?
  Options: Real-time stream processing, Batch recompute from query logs every N minutes, Push notifications to clients, Database trigger
  Correct: Batch recompute from query logs every N minutes
\`\`\``,
    estimatedMin: 18,
    difficulty: 'Intermediate' as const,
    companies: ['Google', 'Amazon', 'Meta', 'Netflix', 'Spotify'],
    tags: ['autocomplete', 'typeahead', 'trie', 'search', 'prefix-tree', 'caching'],
  },
  {
    id: 'lesson-13-05',
    slug: 'design-deep-dive-05-food-delivery',
    title: 'Design a Food Delivery System (DoorDash / Zomato)',
    content: `## 0. Mental Model

> Food delivery is a three-sided marketplace (customer, restaurant, driver) where every order has a strict 30-minute SLA and the coordination problem is a logistics puzzle: which driver should pick up which order from which restaurant to deliver to which customer — in real time, with traffic.

## 1. Quick Summary

Design a food delivery platform handling **millions of daily orders** across **restaurant discovery**, **ordering**, **real-time tracking**, **driver dispatch**, and **ETA estimation**. Core challenges: **Geospatial indexing** (find nearby restaurants and drivers), **dispatch optimization** (assignment problem with multiple constraints), **real-time tracking** (WebSocket updates from driver apps), and **dynamic pricing** (surge during peak hours).

## 2. Key Systems

### Geospatial Indexing

- Use **geohashing** or **quadtrees** for "find restaurants within 5km"
- Geohash level 6 (1.2km × 0.6km) for driver discovery
- Level 5 (4.9km × 4.9km) for restaurant discovery

### Dispatch Algorithm

\`\`\`
For each incoming order:
1. Find candidate drivers within 3km of restaurant
2. Filter by: availability, acceptance rate, current direction
3. Score each driver: ETA to restaurant × (1 + queue_length × 0.1) × proximity_boost
4. Pick the lowest score
5. Send offer to driver (must accept within 30s or timeout)
\`\`\`

### ETA Calculation

\`\`\`typescript
function calculateETA(origin: LatLng, dest: LatLng, trafficFactor: number): number {
  const distance = haversine(origin, dest); // km
  const baseSpeed = 25; // km/h (urban average)
  const adjustedSpeed = baseSpeed / trafficFactor;
  return (distance / adjustedSpeed) * 3600; // seconds
}
\`\`\`

<RoughDiagram
  nodes={[
    { id: 'customer', label: 'Customer App', type: 'client', x: 50, y: 50 },
    { id: 'api', label: 'Order API', type: 'gateway', x: 280, y: 50 },
    { id: 'geo', label: 'Geo Service', type: 'app', x: 150, y: 220 },
    { id: 'dispatch', label: 'Dispatch Engine', type: 'worker', x: 450, y: 50 },
    { id: 'tracking', label: 'Tracking Service', type: 'app', x: 450, y: 220 },
    { id: 'driver', label: 'Driver App', type: 'client', x: 750, y: 220 },
    { id: 'redis', label: 'Redis (Geo + State)', type: 'cache', x: 650, y: 50 },
  ]}
  edges={[
    { from: 'customer', to: 'api', label: 'place order' },
    { from: 'api', to: 'geo', label: 'find nearby' },
    { from: 'api', to: 'dispatch', label: 'assign driver' },
    { from: 'dispatch', to: 'driver', label: 'send offer' },
    { from: 'driver', to: 'tracking', label: 'GPS update' },
    { from: 'tracking', to: 'customer', label: 'live ETA' },
    { from: 'dispatch', to: 'redis', label: 'read/write' },
  ]}
  height={300}
/>

## 3. Quiz

\`\`\`
- Q: What data structure is used for "find nearby restaurants" queries?
  Options: B-Tree, Trie, Geohash / Quadtree, Hash Map
  Correct: Geohash or Quadtree

- Q: A driver is 10 minutes from the restaurant but the food will be ready in 5 minutes. What happens?
  Options: Driver waits, Order is cancelled, Dispatch sends driver at the right time, Customer picks up
  Correct: Dispatch can delay sending the offer to optimize driver arrival timing
\`\`\``,
    estimatedMin: 20,
    difficulty: 'Advanced' as const,
    companies: ['DoorDash', 'Uber', 'Zomato', 'Swiggy', 'Deliveroo'],
    tags: ['food-delivery', 'geospatial', 'dispatch', 'logistics', 'real-time-tracking', 'marketplace'],
  },
  {
    id: 'lesson-13-06',
    slug: 'design-deep-dive-06-recommendation-system',
    title: 'Design a Recommendation System',
    content: `## 0. Mental Model

> A recommendation system is like a personal shopper who knows your taste better than you do. Over time they learn what you like, discover new items you'd enjoy, and occasionally surprise you with something unexpected (serendipity) that becomes your new favorite.

## 1. Quick Summary

Design a recommendation system for a content platform (Netflix, YouTube, TikTok). Core approaches: **Collaborative Filtering** (users like you also liked X), **Content-Based Filtering** (items similar to what you've watched), **Hybrid** (combine both). Key components: **offline training pipeline** (training matrix factorization or neural embeddings), **online serving** (real-time candidate generation + ranking), **AB testing** (measure engagement metrics).

## 2. Architecture

\`\`\`
User Action (watch, like, skip)
  ↓
Real-time pipeline → Event Bus (Kafka)
  ↓
Batch Pipeline (Spark) — Train models nightly
  ↓
Model Registry — Store embeddings, factors
  ↓
Online Serving:
  1. Candidate Generation (retrieve 10,000 items)
     - Collaborative: "users who watched X watched Y"
     - Content-based: similar metadata tags
     - Trending: popular in user's region
  2. Ranking (score 10,000 → top 50)
     - Neural network with features: user embedding × item embedding, recency, popularity
  3. Re-ranking (apply business rules)
     - Diversity: don't show 10 videos from same creator
     - Freshness: boost recent content
     - Context: time of day, device type
\`\`\`

## 3. Matrix Factorization

\`\`\`text
Users × Items interaction matrix (sparse)
        [item1, item2, item3, item4]
user_A: [ 5,    ?,    3,     ?   ]
user_B: [ ?,    4,    ?,     2   ]
user_C: [ 1,    ?,    5,     4   ]

Factor into:
Users × Latent Factors (k=20)
Items × Latent Factors (k=20)

Predict: rating = dot_product(user_factors[i], item_factors[j])
\`\`\`

## 4. Quiz

\`\`\`
- Q: "Users who bought X also bought Y" is an example of:
  Options: Content-based filtering, Collaborative filtering, Matrix factorization, Deep learning
  Correct: Collaborative filtering

- Q: Why include a re-ranking step after the main ranking model?
  Options: Improve accuracy, Apply business rules (diversity, freshness), Reduce latency, Train the model
  Correct: Apply business rules like diversity and freshness
\`\`\``,
    estimatedMin: 20,
    difficulty: 'Advanced' as const,
    companies: ['Netflix', 'Spotify', 'Amazon', 'TikTok', 'YouTube'],
    tags: ['recommendations', 'collaborative-filtering', 'matrix-factorization', 'ML', 'ranking'],
  },
  {
    id: 'lesson-13-07',
    slug: 'design-deep-dive-07-distributed-scheduler',
    title: 'Design a Distributed Scheduler / Cron System',
    content: `## 0. Mental Model

> A distributed scheduler is like a universal alarm clock for a city. Some alarms ring every 5 minutes, some every day at 3 AM, some on the first Monday of every month. The city has millions of alarms, and if the power goes out somewhere, another clock must pick up the missed alarms.

## 1. Quick Summary

Design a distributed cron/scheduler system that executes **millions of scheduled jobs** with **exactly-once or at-least-once semantics**, **leader election** for fault tolerance, **missed job recovery**, and **backpressure handling**. Core patterns: **leader-based scheduling** (single scheduler assigns jobs), **distributed locking** (prevent duplicate execution), **job persistence** (store in DB, never in memory), and **timeout-based retry**.

## 2. Architecture

\`\`\`text
Scheduler Cluster (Raft consensus, 3-5 nodes):
  ┌──────────────┐
  │   Leader     │ ← elected via Raft
  │  (schedules) │
  └──────┬───────┘
         │ assigns jobs to workers
         ▼
  ┌──────────────────┐
  │ Job Queue (Redis) │ ← ordered by next_run_at
  └──────────────────┘
         │
         ▼
  ┌──────────────────┐
  │  Worker Pool     │ ← execute jobs, report results
  │  (horizontal)    │
  └──────────────────┘

Job lifecycle:
CREATED → SCHEDULED → RUNNING → COMPLETED / FAILED → (retry if FAILED < max_retries)
\`\`\`

## 3. Key Design Decisions

- **Cron expression parsing** — standard \`* * * * *\` format, pre-compute next N run times
- **Missed job recovery** — on leader failover, scan for jobs with \`next_run_at < now()\` and execute them
- **Exactly-once** — use DB transaction: UPDATE job SET status='RUNNING' WHERE id=X AND status='SCHEDULED'
- **Backpressure** — if workers are saturated, delay scheduling. Monitor queue depth.
- **Job timeouts** — kill jobs exceeding their configured timeout. Mark as FAILED.

## 4. Quiz

\`\`\`
- Q: How do you ensure a scheduled job runs exactly once even after leader failover?
  Options: Log file, DB transaction with optimistic locking, Each worker runs everything, Manual restart
  Correct: DB transaction with status check (UPDATE WHERE status='SCHEDULED')

- Q: A job that runs every 5 minutes was missed during a 10-minute leader outage. What happens?
  Options: Job is lost forever, Manual rerun, Leader scans for missed jobs on startup, Skip and wait for next schedule
  Correct: Leader scans for missed jobs (next_run_at < now()) and executes them
\`\`\``,
    estimatedMin: 16,
    difficulty: 'Intermediate' as const,
    companies: ['Airbnb', 'Uber', 'Amazon', 'Google', 'Stripe'],
    tags: ['scheduler', 'cron', 'distributed-systems', 'leader-election', 'job-queue'],
  },
  {
    id: 'lesson-13-08',
    slug: 'design-deep-dive-08-multi-tenant-saas',
    title: 'Design a Multi-Tenant SaaS Platform',
    content: `## 0. Mental Model

> A multi-tenant SaaS is like an apartment building. Each tenant has their own lock on their door (isolation), pays different rent (tiered pricing), can customize their unit (configuration), and the building manager (platform team) keeps the lobby clean and the elevators running.

## 1. Quick Summary

Design a **multi-tenant SaaS platform** where each customer (tenant) gets their own isolated slice of the application. Three isolation models: **Database per tenant** (strongest isolation, highest cost), **Schema per tenant** (shared DB, separate schemas), and **Shared table** (tenant_id on every row — most economical). Key concerns: **tenant routing** (identify tenant from subdomain/header), **rate limiting per tenant**, **data isolation** (never leak data between tenants), **feature flags per tier**, and **tenant-aware monitoring**.

## 2. Isolation Models Comparison

| Model | Isolation | Cost | Complexity | Best for |
|-------|-----------|------|------------|----------|
| Database per tenant | Strongest | Highest | Low | Enterprise, regulated (healthcare, finance) |
| Schema per tenant | Strong | Medium | Medium | Mid-market |
| Shared table (tenant_id) | Logical | Lowest | Highest (risk of leaks) | SMB, low-touch |

## 3. Tenant Routing

\`\`\`typescript
// Identify tenant from request
function getTenant(req: Request): Tenant {
  // Strategy 1: Subdomain
  const host = req.headers.host;
  const subdomain = host.split('.')[0]; // "acme" from "acme.app.com"

  // Strategy 2: Header (for API)
  const headerTenant = req.headers['x-tenant-id'];

  // Strategy 3: JWT claim
  const tokenTenant = decodeJWT(req.headers.authorization).tenantId;

  // Return tenant config: DB connection, feature flags, rate limit
  return tenantRegistry.get(subdomain || headerTenant || tokenTenant);
}
\`\`\`

## 4. Data Isolation — The Tenant Leak Bug

\`\`\`typescript
// DANGEROUS — forget the WHERE tenant_id clause
const orders = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);

// SAFE — always include tenant_id
const orders = await db.query(
  'SELECT * FROM orders WHERE id = $1 AND tenant_id = $2',
  [orderId, tenant.id]
);
\`\`\`

## 5. Quiz

\`\`\`
- Q: Which isolation model is best for a healthcare SaaS with HIPAA compliance?
  Options: Shared table, Schema per tenant, Database per tenant, Single database
  Correct: Database per tenant

- Q: The most common multi-tenant security bug is:
  Options: SQL injection, Missing tenant_id in WHERE clause, Buffer overflow, CSRF
  Correct: Missing tenant_id in WHERE clause (data leak between tenants)
\`\`\``,
    estimatedMin: 16,
    difficulty: 'Intermediate' as const,
    companies: ['Salesforce', 'Atlassian', 'Shopify', 'HubSpot', 'Slack'],
    tags: ['multi-tenant', 'SaaS', 'isolation', 'tenant-routing', 'data-isolation'],
  },
  {
    id: 'lesson-13-09',
    slug: 'design-deep-dive-09-content-moderation',
    title: 'Design a Content Moderation System',
    content: `## 0. Mental Model

> Content moderation is like a city's police force, fire department, and sanitation services combined. You need to catch the bad actors (police), remove dangerous content quickly (fire), and clean up spam at scale (sanitation). Unlike a city, you have billions of citizens posting every second.

## 1. Quick Summary

Design a content moderation pipeline for a platform with **billions of daily posts** (text, images, videos). Moderation stack: **automated pre-filter** (blocklist, regex, hash matching for known bad content), **ML classifiers** (toxicity detection, NSFW image classification), **human review** (for edge cases and appeals), and **escalation** (legal reporting). Key tradeoff: **precision vs recall** — catching all bad content (recall) inevitably flags some good content (precision loss). Target: catch 99% of violative content, false positive rate <1%.

## 2. Pipeline

\`\`\`
User posts content
  ↓
Pre-filter (10ms): Blocklist URLs, known malware hashes, regex patterns
  ↓
Hash matching (50ms): PhotoDNA, video hashing against known CSAM database
  ↓
ML Classifier (200ms): Text toxicity (Perspective API), NSFW image classifier
  ↓
Queue for human review if score in uncertain range (0.4-0.8)
  ↓
If score > 0.8: Auto-remove + account strike
  ↓
If score < 0.4: Auto-approve
  ↓
Appeals → Human re-review → Overturn or uphold
\`\`\`

## 3. Quiz

\`\`\`
- Q: A classifier with 95% precision and 99% recall means:
  Options: 5% false positives, 1% missed violations, 5% false negatives, 1% false positives
  Correct: 5% of flagged content is actually OK (false positives); 1% of violations are missed

- Q: Why queue uncertain content for human review instead of auto-removing it?
  Options: Save server costs, Reduce false positives (don't remove legitimate content), Faster processing, Legal compliance
  Correct: Reduce false positives (avoid removing legitimate content)
\`\`\``,
    estimatedMin: 16,
    difficulty: 'Intermediate' as const,
    companies: ['Meta', 'TikTok', 'YouTube', 'Twitter', 'Reddit'],
    tags: ['content-moderation', 'ML', 'safety', 'trust-and-safety', 'spam-detection'],
  },
  {
    id: 'lesson-13-10',
    slug: 'design-deep-dive-10-ad-auction',
    title: 'Design an Ad Server / Real-Time Bidding (RTB) System',
    content: `## 0. Mental Model

> An ad auction is like a high-frequency stock exchange that runs in 100 milliseconds. Every time you load a webpage, an auction runs in the background: advertisers bid for the privilege of showing you an ad. The highest bidder wins, their ad is served, and the publisher gets paid. This happens millions of times per second.

## 1. Quick Summary

Design a **real-time ad server** handling **1M+ QPS** with **100ms SLA**. The core flow: **Ad Request** (user visits page) → **Supply-Side Platform (SSP)** → **Ad Exchange** (auction) → **Demand-Side Platforms (DSPs)** bid → **Winner selected** → **Ad served** → **Impression tracked**. Key challenges: **low latency** (100ms budget), **budget pacing** (don't spend daily budget in 10 minutes), **fraud detection** (click bots), and **relevance** (target the right user).

## 2. Auction Flow

\`\`\`
1. User loads page → Publisher sends ad request to SSP
   (includes: page URL, user cookie/ID, device, location)

2. SSP calls Ad Exchange with bid request

3. Ad Exchange queries cookie mapping service to identify user
   → Broadcasts bid request to DSPs (100ms timeout)

4. Each DSP runs:
   - User profile lookup (who is this user? age, interests, income)
   - Campaign matching (which active campaigns target this user?)
   - Budget check (does campaign have remaining budget?)
   - Bid calculation (CPM price based on predicted CTR)
   → Returns bid response: { bid_price, creative_url, campaign_id }

5. Ad Exchange collects all bids, runs 2nd-price auction:
   Winner = highest bidder, pays second-highest price

6. Winner's creative is served to the user (via ad tag)

7. Ad Exchange tracks impression (user saw ad) and click events
\`\`\`

## 3. Architecture

<RoughDiagram
  nodes={[
    { id: 'user', label: 'User Browser', type: 'client', x: 50, y: 100 },
    { id: 'pub', label: 'Publisher SSP', type: 'web', x: 250, y: 100 },
    { id: 'exchange', label: 'Ad Exchange', type: 'app', x: 450, y: 100 },
    { id: 'dsp1', label: 'DSP A', type: 'worker', x: 680, y: 30 },
    { id: 'dsp2', label: 'DSP B', type: 'worker', x: 680, y: 170 },
    { id: 'profile', label: 'User Profile Cache', type: 'cache', x: 450, y: 280 },
  ]}
  edges={[
    { from: 'user', to: 'pub', label: 'page load' },
    { from: 'pub', to: 'exchange', label: 'bid request' },
    { from: 'exchange', to: 'profile', label: 'lookup user' },
    { from: 'exchange', to: 'dsp1', label: 'auction (100ms)' },
    { from: 'exchange', to: 'dsp2', label: 'auction (100ms)' },
    { from: 'dsp1', to: 'exchange', label: 'bid $0.02' },
    { from: 'dsp2', to: 'exchange', label: 'bid $0.05' },
    { from: 'exchange', to: 'pub', label: 'winning creative' },
    { from: 'pub', to: 'user', label: 'serve ad' },
  ]}
  height={340}
/>

## 4. Key Design Decisions

- **Latency budget:** 100ms total. DNS (10ms) → SSP (10ms) → Exchange (10ms) → DSP (50ms) → Ad serving (20ms). DSP has the tightest budget.
- **2nd-price auction:** Winner pays the second-highest bid. This encourages truthful bidding (Vickrey auction).
- **Budget pacing:** Each campaign has a daily budget. Distribute it evenly across the day (or optimize for low-CPM hours). Use token bucket algorithm.
- **Fraud detection:** Blocklist known bot IPs. Rate-limit impressions per user/IP. Detect click farms (same IP, many clicks on same ad).
- **Cookie mapping:** Users have different IDs across publisher and advertiser domains. Cookie mapping service maintains the cross-domain identity mapping.

## 5. Quiz

\`\`\`
- Q: In a second-price auction, the winner pays:
  Options: Their own bid, Second-highest bid, Average of all bids, Minimum bid
  Correct: Second-highest bid

- Q: A campaign with $10,000 daily budget spent it all by 9 AM. What went wrong?
  Options: Wrong creative, Budget pacing failure, Fraud, High CPM
  Correct: Budget pacing failure (should distribute across 24 hours)
\`\`\``,
    estimatedMin: 22,
    difficulty: 'Advanced' as const,
    companies: ['Google', 'Meta', 'Amazon', 'The Trade Desk', 'AppNexus'],
    tags: ['ad-server', 'RTB', 'ad-auction', 'dsp', 'ssp', 'budget-pacing', 'fraud-detection'],
  },
];
