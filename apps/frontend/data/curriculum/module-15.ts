export const module15Lessons = [
  {
    id: 'lesson-15-01',
    slug: 'system-design-foundations-01-welcome',
    title: 'Welcome to System Design — A Senior Engineer\'s Mindset',
    content: `## 0. Mental Model

> Think of system design as **architecting a city**. You don't just build one building — you plan roads (networking), water pipes (data flow), power grid (compute), zoning laws (APIs), emergency services (failure handling), and future growth (scalability). A junior engineer builds a room; a senior engineer designs a metropolis that won't collapse when millions move in.

## 1. Quick Summary

**System design** is the practice of architecting large-scale distributed systems that handle millions of users, petabytes of data, and global traffic patterns. It sits at the intersection of **software engineering**, **computer science fundamentals**, **networking**, **databases**, and **operations**. This course takes you from "building features" to "designing systems" — the single biggest leap in an engineering career.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Scalability** | Ability to handle increased load by adding resources |
| **Latency** | Time for a single request to complete (p50, p99) |
| **Throughput** | Requests processed per second (RPS/QPS) |
| **Availability** | Uptime percentage (99.9% = 8.7h downtime/year) |
| **Consistency** | All nodes see the same data at the same time |
| **CAP Theorem** | You can pick at most 2 of Consistency, Availability, Partition Tolerance |
| **Load Balancer** | Distributes traffic across servers |
| **Sharding** | Splitting data across databases horizontally |
| **Replication** | Copying data across nodes for fault tolerance |
| **Idempotency** | Same operation applied multiple times = same result |
| **Back-of-envelope** | Rough capacity estimation using orders of magnitude |
| **Tradeoff** | Every engineering decision involves giving up one property for another |

## 3. Problem Without It

Real systems fail without deliberate design:

- **500M users, no caching**: Each request hits the database. Database crashes under 500K QPS. Site goes down. Loss: $5M/hour.
- **Single-region deployment**: AWS us-east-1 goes down. Entire app is dark for 4 hours. Loss: $20M.
- **No replication**: Server dies. All user data lost. Permanent.
- **Monolithic codebase with no service boundaries**: Deployment takes 3 days. One team's bug crashes the entire app.

## 4. How It Works — Core Mechanics

System design follows a **repeatable framework**:

**The DDIA-ByteByteGo approach:**
1. **Understand Requirements**: Functional + Non-functional + Constraints
2. **Estimate Scale**: QPS, storage, bandwidth, cache size
3. **High-Level Design**: System diagram with core components
4. **Deep Dive**: Database schema, API design, data flow
5. **Address Bottlenecks**: Where does it break? How to fix?

**Key metrics to estimate (back-of-envelope):**

| Metric | Formula | Example (Twitter-scale) |
|--------|---------|----------------------|
| QPS | DAU × avg actions per user / 86400 | 500M × 10 / 86400 ≈ 58K QPS |
| Storage | Records × size per record × retention | 500M tweets/yr × 500B ≈ 250TB/yr |
| Cache size | Active records × size | 100M active users × 1KB profile ≈ 100GB |
| Bandwidth | Avg response size × QPS | 100KB × 58K ≈ 5.8 GB/s |

## 5. Variants & Flavors

| Approach | Focus | When to Use |
|----------|-------|-------------|
| **Bottom-Up** | Start with infrastructure, build up | When infra constraints dominate (e.g., IoT) |
| **Top-Down** | Start with user experience, go down | Most common in interviews |
| **Data-Centric** | Data model drives architecture | Heavy analytics, OLAP systems |
| **API-Centric** | API contracts drive everything | Microservices, platform teams |
| **Event-Driven** | Events as first-class citizens | Real-time, streaming, EDA |

## 6. Performance Characteristics

| Dimension | Naive | Good | Great |
|-----------|-------|------|-------|
| QPS handling | 1K | 100K | 10M+ |
| p95 latency | 500ms | 50ms | 5ms |
| Availability | 99% (87h/yr downtime) | 99.9% (8.7h/yr) | 99.99% (52min/yr) |
| Data loss tolerance | Any failure = data loss | Some loss acceptable | Zero loss |
| Cost efficiency | 10x overprovisioned | Right-sized | Auto-scaled |

## 7. Failure Modes

- **Analysis Paralysis**: Spending weeks on design without building anything. *Fix*: Start with a whiteboard sketch, iterate.
- **Over-engineering**: Adding Kafka, Kubernetes, and microservices for a 100-user app. *Fix*: Start simple, evolve.
- **Ignoring Tradeoffs**: Claiming "eventually consistent" without understanding what data can be stale. *Fix*: Explicitly document what's sacrificed.
- **Wrong Metrics**: Optimizing for p50 when p99 latency is killing user experience. *Fix*: Measure the right tail latencies.

## 8. Decision Framework

\`\`\`
Start with requirements
├── Functional: What does the system do?
├── Non-functional: Speed? Scale? Cost? Consistency?
├── Constraints: Budget, team size, timeline
│
├── Estimate scale
│   ├── Traffic (QPS, peak/avg ratio)
│   ├── Storage (total, growth rate)
│   ├── Bandwidth (in/out)
│   └── Cache (working set size)
│
├── Choose architecture style
│   ├── Monolith (small team, startup phase)
│   ├── Microservices (large team, independent deploys)
│   ├── Event-driven (real-time, decoupled)
│   └── Serverless (variable load, low ops overhead)
│
└── Iterate on bottlenecks
    ├── Identify weakest link
    ├── Apply pattern (cache, shard, replicate, async)
    └── Repeat
\`\`\`

## 9. Real Production Incident

**Amazon Prime Video Monitoring Tier (2022)**

In 2022, Amazon's Prime Video monitoring system — designed as a serverless, event-driven microservice architecture — collapsed under its own complexity. The system consumed logs from thousands of services, but the distributed tracing created enormous Lambda costs ($80K+/month) and debugging latency. **The fix**: they collapsed 7 microservices into a single monolith, reduced costs by 90%, and cut latency by 80%. This incident teaches that **architecture decisions must be revisited with actual production data**.

## 10. Production Implementation

**Naive**: All-in-one monolith. Single database. Single server. Works for < 100 QPS.

**Better**: Stateless app servers behind a load balancer. Read replicas for the database. Cache layer (Redis). Works for < 10K QPS.

**Production**: Multi-region active-active deployment. Sharded databases. CDN for static assets. Async processing with queues. Circuit breakers. Feature flags. Gradual rollout.

## 11. Real Company Deep Dives

- **Netflix**: Multi-region active-active with 7 regional failovers. Uses Chaos Monkey to constantly test resilience. Cassandra for metadata, EV Cache for recommendations.
- **Uber**: Dispatch Gateway → Geo-index → Surge Engine → Kafka → HDFS. Transitioned from monolith to 2200+ microservices, then to domain-oriented DOPP.
- **Stripe**: Idempotency keys on every mutation. Event-driven architecture with webhooks. Global payment routing via "Stripe's brain" — ML-powered transaction optimization.
- **YouTube**: B-Tree-based video metadata → sharded Vitess (MySQL) → Spanner. CDN with 2000+ edge locations. Custom video format (VP9/AV1) for bandwidth optimization.
- **WhatsApp**: Erlang-based custom server (ejabberd fork). Max 1M connections per box. Consistent hashing for connection-to-server mapping. No persistent storage of messages — pure relay.

## 12. Interview Playbook

**Q1: Design a URL Shortener**
- Step 1: Constraints (100M URLs/month, low latency reads)
- Step 2: Estimate (100M/30d ≈ 38 writes/sec, reads 100:1 ≈ 3800 reads/sec)
- Step 3: Base62 encoding for short URLs (6 chars = 62^6 = 56B combinations)
- Step 4: SQL DB (Postgres) for mapping, Redis cache for hot URLs
- Step 5: Consistent hashing for DB sharding

**Q2: Design WhatsApp**
- Step 1: 500M DAU, 10B messages/day
- Step 2: Each message ~1KB → 10TB/day raw, 100TB/day with replication
- Step 3: Persistent TCP connections via custom Erlang servers
- Step 4: Per-chat message ordering with seq numbers per device
- Step 5: No message storage after delivery (privacy design)

## 13. Concept Check Quiz

**Q1: Which metric matters most for a real-time gaming platform?**
- A) p50 latency
- B) p99 latency
- C) Throughput in GB/s
- D) Storage capacity
- **Answer: B**. Real-time gaming is unforgiving of slow tail responses — one laggy player ruins the match for everyone. A is wrong because p50 hides the 1-in-100 slow requests. C and D are wrong because gaming prioritizes latency over bandwidth/storage.

**Q2: A startup has 100 users. What architecture should they start with?**
- A) Microservices with Kubernetes
- B) Serverless with Lambda + DynamoDB
- C) Simple monolith with Postgres
- D) Event-driven with Kafka
- **Answer: C**. Premature distribution is the root of all evil. With 100 users, a monolith costs 10x less to build, iterate, and operate. (A, B, D all add immense complexity for zero benefit at this scale)

**Q3: What does "Consistency" in CAP refer to?**
- A) All nodes see the same data at the same time
- B) Data is never lost
- C) Requests always succeed
- D) The system is always available
- **Answer: A**. CAP consistency = linearizability. B describes durability, C is not a formal property, D is availability (the A in CAP).

**Q4: Why does Netflix use Chaos Monkey?**
- A) To reduce server costs
- B) To ensure engineers are alert
- C) To verify the system survives random failures
- D) To test new features on real users
- **Answer: C**. Chaos Monkey randomly kills instances in production to ensure the system auto-recovers. (A is wrong — it adds cost, B is a joke, D is what canary deployments do)

## 14. Next Steps

Now that you understand the system design mindset, continue to **Core Concepts & Terminology** (lesson-15-02) where we define the precise vocabulary — latency, throughput, availability, consistency — that every interview and architecture discussion demands.`
  },
  {
    id: 'lesson-15-02',
    slug: 'system-design-foundations-02-core-concepts',
    title: 'Core Concepts — Latency, Throughput, Availability & More',
    content: `## 0. Mental Model

> Think of a system as a **water treatment plant**. Water (requests) arrives through pipes (network), goes through filters (processing), and leaves to homes (responses). **Latency** is how long a drop takes from arrival to exit. **Throughput** is the gallons per minute the plant can process. **Availability** is whether the plant is operational. **Consistency** is whether every tap in the city gets the same water quality at the same time.

## 1. Quick Summary

Four metrics define every distributed system: **Latency** (response time), **Throughput** (requests/second), **Availability** (uptime %), and **Consistency** (data agreement across nodes). These are interrelated — improving one often hurts another. Understanding their precise definitions, measurement, and tradeoffs is the foundation of every system design decision.

## 2. Definition & Terminology

| Term | Definition | Measurement |
|------|-----------|-------------|
| **Latency** | Time from request send to response received | ms (p50, p99, p99.9) |
| **Throughput** | Operations completed per unit time | QPS, RPS, TPS |
| **Availability** | Fraction of time system is operational | 9s — 99.9%, 99.99% |
| **Durability** | Data persists after writes succeed | 99.9999999% (11 9s) |
| **Consistency** | All replicas agree on data state | Strong, Eventual, Causal |
| **Tail Latency** | Slowest X% of requests | p99, p99.9 |
| **Head-of-line blocking** | One slow request delays others behind it | Queue depth |
| **Amdahl's Law** | Speedup limited by sequential portion | 1/(1-p + p/n) |

## 3. Problem Without It

- **No latency awareness**: 53% of users abandon sites that load in >3 seconds. Amazon: 100ms extra latency = 1% revenue drop.
- **No throughput planning**: System handles 100 QPS normally. Black Friday hits. At 1000 QPS, database connection pool exhausts. Site down.
- **No availability target**: "Five nines" sounds good until you realize 99.999% = 5.26 minutes/year downtime. Is your system designed for that?
- **No consistency model**: Users see old data after updating their profile. Banking scenario: double-spend because two nodes accepted different versions of "balance."

## 4. How It Works — Core Mechanics

**Latency vs Throughput:**
- Latency is a **time** measure. Throughput is a **rate** measure.
- They're related by **Little's Law**: L = λ × W (avg concurrency = throughput × avg latency)
- A system can have low latency but low throughput (single fast server) or high latency but high throughput (batch processing)

**Measuring latency correctly:**
\`\`\`
Request timeline:
┌──────┬────────────┬──────────┬──────────┐
│ Send │ Queue wait │ Process  │ Transfer │
├──────┼────────────┼──────────┼──────────┤
│ 0ms  │ 2ms        │ 8ms      │ 1ms      │
└──────┴────────────┴──────────┴──────────┘
Total latency = 11ms (p50)
p99 = 45ms (one request got queued)
p99.9 = 200ms (GC paused the JVM)
\`\`\`

**Availability calculation:**
\`\`\`
Availability = Uptime / (Uptime + Downtime)

99.9% (3 nines)  = 8.77 hours/year
99.99% (4 nines) = 52.6 minutes/year
99.999% (5 nines)= 5.26 minutes/year
\`\`\`

## 5. Variants & Flavors

| Property | Strong | Eventual | Causal |
|----------|--------|----------|--------|
| Read-your-writes | Yes | No | Yes |
| Monotonic reads | Yes | No | Yes |
| Consensus required | Yes | No | No |
| Performance cost | High (2x+ latency) | Minimal | Moderate |
| Example | Spanner | DynamoDB | Cosmos DB |

## 6. Performance Characteristics

| Design | Latency (p50) | Throughput | Availability | Cost |
|--------|--------------|------------|--------------|------|
| Single server | 5ms | 1K QPS | 99% | $ |
| Load-balanced | 10ms | 10K QPS | 99.9% | $$ |
| Cached + LB | 3ms | 100K QPS | 99.9% | $$$ |
| Sharded + cached | 5ms | 1M QPS | 99.99% | $$$$ |
| Multi-region | 50ms | 10M QPS | 99.999% | $$$$$ |

## 7. Failure Modes

- **Optimizing the wrong metric**: Reducing p50 from 10ms to 5ms while p99 is 5 seconds. Focus on tail latency.
- **Ignoring head-of-line blocking**: A single slow request holds up a queue. Use multiplexing (HTTP/2, gRPC streams).
- **Availability theater**: Declaring "5 nines" without redundant power, networking, and cross-region failover. Get real about your actual architecture.
- **Consistency confusion**: Claiming "strong consistency" without understanding it requires quorum writes (slow) and consensus (complex).

## 8. Decision Framework

\`\`\`
What matters most?
├── Latency sensitive? → Cache, CDN, edge compute, keep data close
├── Throughput critical? → Shard, partition, batch, async processing
├── Availability paramount? → Redundancy, failover, multi-region, chaos testing
└── Consistency required? → Quorum writes, consensus (Raft/Paxos), distributed txns
\`\`\`

**Tradeoff matrix:**

| If you need | Sacrifice | Example |
|-------------|-----------|---------|
| Low latency | Strong consistency | CDN (stale content OK) |
| High throughput | ACID transactions | Analytics (batch, eventual) |
| 99.999% avail | Perfect consistency | Shopping cart (conflicts merge) |
| Strong consistency | Low latency (during partition) | Financial system (slows down) |

## 9. Real Production Incident

**Google Cloud EU-West-1 Outage (2020)**

On June 2, 2020, Google Cloud's europe-west1 region suffered a 4-hour outage affecting GCP, Gmail, YouTube, and Google Search. Cause: **Network congestion from a configuration change** at a peering edge. Impact: 5% global internet traffic drop. **Lesson**: Even Google with 99.99%+ availability goals can fail. Multi-region architecture is essential — Google's internal services survived because they automatically failed over to other regions.

## 10. Production Implementation

**Naive**: Measure average latency. Deploy to one region. No redundancy.

**Better**: Measure p50, p95, p99 latency. Deploy to 2+ AZs. Database with synchronous replicas.

**Production**: Real-time monitoring with percentile histograms. Multi-region active-active. Auto-scaling based on queue depth. Circuit breakers to prevent cascading failures. Chaos engineering to validate resilience.

## 11. Real Company Deep Dives

- **Amazon**: Every team owns latency SLAs. Internal "CRaSH" (Consume, Repair, and Stop the Harm) program for latency regressions. Uses AWS Global Accelerator for multi-region routing.
- **Google**: Tail-at-scale research (The Tail at Scale, Dean & Barroso 2013). Uses "hedged requests" — send same request to multiple replicas, take the first response. This cuts p99 latency by 5x.
- **Fastly**: CDN provider, measures latency at 10ms granularity across 60+ edge POPs. Uses Varnish + custom TLS termination for sub-millisecond overhead.

## 12. Interview Playbook

**Q1: How would you estimate QPS for Twitter?**
- 500M DAU, each user sends ~10 tweets/day on avg
- Peak-to-average ratio: 5x (during events, mornings)
- Peak QPS = (500M × 10) / 86400 × 5 ≈ 290K QPS

**Q2: Your system has 100ms p50 but 10s p99. How do you debug?**
- Check for: hot partitions (shard imbalance), GC pauses, head-of-line blocking, noisy neighbors
- Profiling tools: Flame graphs, distributed tracing (Jaeger), PVC (Profile-Guided Optimization)
- Fixes: Partition rebalancing, GC tuning, connection pooling, request hedging

## 13. Concept Check Quiz

**Q1: If you have 5 servers each handling 100 QPS, and one fails, what happens to throughput?**
- A) Drops to 400 QPS then auto-scaling kicks in
- B) Stays at 500 QPS
- C) Drops to 0
- D) Increases to 600 QPS
- **Answer: A**. With a load balancer, remaining 4 servers handle their 100 QPS each; the extra 100 QPS queues or is rejected until auto-scaling provisions new capacity. (B ignores the failed server, C requires 0 redundancy, D is physically impossible.)

**Q2: What's the availability target if your system can tolerate 1 hour of downtime per year?**
- A) 99.9%
- B) 99.99%
- C) 99.999%
- D) 99%
- **Answer: B**. 99.99% = 52.6 minutes/year. (99.9% = 8.7h, too much; 99.999% = 5.26 min, not enough; 99% = 87h, far too much.)

**Q3: Your app has 200ms p50 latency in North America but 800ms in Asia. What's the most likely cause?**
- A) Data consistency requirements
- B) Geographic distance (speed of light)
- C) Database sharding
- D) CPU utilization
- **Answer: B**. Round-trip speed-of-light delay from US to Singapore is ~150ms; with routing, TLS, and processing, 800ms is dominated by physical distance. Solution: deploy in Asia region.

## 14. Next Steps

Now understand **Tradeoffs: Consistency vs Availability** (lesson-15-03) — the most fundamental tradeoff in distributed systems, formalized by the CAP theorem.`
  },
  {
    id: 'lesson-15-03',
    slug: 'system-design-foundations-03-consistency-vs-availability',
    title: 'Tradeoffs — Consistency vs Availability (CAP Theorem)',
    content: `## 0. Mental Model

> The CAP theorem is like a **two-out-of-three contract for a 3-person kayak**. You need all three paddlers (Consistency, Availability, Partition Tolerance) but when a storm hits (network partition), one must stop paddling. You choose which one. The choice defines your system's behavior under stress.

## 1. Quick Summary

The **CAP Theorem** (Brewer, 2000; proven by Gilbert & Lynch, 2002) states a distributed data system can provide at most **two** of three guarantees: **Consistency** (all nodes see the same data), **Availability** (every request gets a response), **Partition Tolerance** (system continues during network splits). Since partitions are unavoidable, engineers choose between **CP** (sacrifice availability) and **AP** (sacrifice consistency). **CA** is impossible in practice because partitions will happen.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Strong Consistency** | After a write completes, all subsequent reads return that value |
| **Linearizability** | The strongest consistency — operations appear instantaneous |
| **Eventual Consistency** | Given enough time without writes, all replicas converge |
| **Availability (CAP)** | Every request receives a (non-error) response, without guarantee it contains the latest write |
| **Partition** | A network break that causes nodes to lose communication |
| **Quorum** | Minimum nodes that must agree for a read/write to succeed |
| **PACELC** | Extension of CAP: if partition (P), trade A vs C; else (E), trade L (latency) vs C (consistency) |

## 3. Problem Without It

Without understanding the CAP tradeoff:
- **Banking system designed AP**: A user sees $1000 balance on one ATM, $500 on another after a transfer. Customer sues.
- **Social media designed CP**: During a network blip, the entire feed is unavailable for 5 minutes. Users leave for Twitter.
- **Shopping cart designed wrong**: Items added on one device don't appear on another. Cart-wide bug.
- **False CA assumption**: You plan for "both C and A, no matter what." A partition hits. System splits into two independent clusters. Double-spend, data corruption.

## 4. How It Works — Core Mechanics

**The formal proof (Gilbert & Lynch):**
- A network can always partition (P is not optional)
- During a partition, you must choose: respond (A) but risk stale data, or wait for consistency (C) but risk no response
- There is no way to have both during a partition

**PACELC refinement:**
- **If Partition (P)**: trade Consistency vs Availability
- **Else (E — normal operation)**: trade Latency vs Consistency

This explains why DynamoDB is AP (fast, eventually consistent) and Spanner is CP (slower, strongly consistent).

## 5. Variants & Flavors

| System | CAP Choice | PACELC | Example |
|--------|-----------|--------|---------|
| **DynamoDB** | AP | EL — sacrifices consistency for low latency | Shopping carts |
| **Cassandra** | AP | EL — tunable consistency per query | Time-series data |
| **Spanner** | CP | EC — uses TrueTime for strong consistency | Google Ads |
| **MongoDB** | CP (default) | EC — primary writes, secondary reads | Content management |
| **Redis** | CP | EC — single-threaded, strong consistency | Caching, sessions |
| **Cosmos DB** | Configurable | Configurable — 5 consistency levels | Multi-model |

## 6. Performance Characteristics

| System | Write Latency | Read Latency | Consistency | Availability |
|--------|--------------|--------------|-------------|--------------|
| AP (DynamoDB) | 5-10ms | 2-5ms | Eventual | 99.99% |
| CP (Spanner) | 10-50ms | 5-15ms | Strong (TrueTime) | 99.999% |
| Configurable (Cosmos) | 5-50ms | 3-10ms | 5 levels | 99.999% |

## 7. Failure Modes

- **Thinking CP is always right**: 100% consistency sounds ideal until your site is unavailable during a brief network hiccup. Twitter chose AP — better to serve stale tweets than no tweets.
- **Thinking AP is always right**: Eventual consistency is fine for likes, deadly for bank balances. Know your data.
- **Ignoring PACELC's "E"**: Many systems fail because during normal operation, they optimize latency at the cost of consistency in ways that cause bugs (e.g., reading from a replica that's 100ms behind).
- **Tunable consistency confusion**: Cassandra lets you set per-query consistency (ONE, QUORUM, ALL). Teams often set ALL everywhere, crushing performance, or ONE everywhere, causing surprising inconsistencies.

## 8. Decision Framework

\`\`\`
Does the partition have a clear resolution?
├── Yes → Choose CP (block until consistent)
│   Example: Financial transactions, inventory
└── No  → Choose AP (accept divergence, merge later)
    Example: Shopping cart, social feed, DNS
\`\`\`

**During normal operation (no partition):**
- Is strong consistency worth the latency cost?
- If yes: Spanner, etcd, ZooKeeper
- If no: DynamoDB, Cassandra, Riak

## 9. Real Production Incident

**GitHub Availability Incident (Oct 2020)**

GitHub experienced a 2-hour outage when a database partition caused their MySQL cluster to split. Their **CP-oriented** design blocked all writes during the partition to prevent data inconsistency. Impact: 2.5M repos inaccessible, CI/CD pipeline halted. **Lesson**: GitHub chose correctly for their use case (git history must be consistent), but the severity shows why multi-region CP designs need automatic failover orchestration.

## 10. Production Implementation

**Naive**: "Our database is eventually consistent." No explicit handling of stale reads in application code. Bugs surface months later.

**Better**: Explicit consistency model documented per service. Stale-read detection with version vectors. Conflict resolution strategies (CRDTs, LWW).

**Production**: Per-query consistency level (like Cassandra). Application-level staleness monitoring. Idempotent write operations. Automatic failover with quorum-based leader election.

## 11. Real Company Deep Dives

- **Amazon DynamoDB**: AP design from the 2007 Dynamo paper. Uses versioned data with clock-based reconciliation. Powers Amazon's shopping cart — "Add to cart" must never fail (A), but seeing slightly stale cart is acceptable (sacrifice C).
- **Google Spanner**: CP design using TrueTime (GPS + atomic clocks). Provides external consistency at global scale — the first system to achieve this. Powers Google Ads, Search, and YouTube.
- **Netflix**: AP for most services. Uses Cassandra + EVCache. "It's OK to show you a slightly stale recommendation, but your video must never pause." Deliberate tradeoff per service boundary.

## 12. Interview Playbook

**Q1: Design a distributed banking ledger — CP or AP?**
- CP. Money must be consistent. Use Spanner or CockroachDB. During partition, decline transactions rather than allow double-spend. Use 2PC or Saga with compensating transactions.

**Q2: Design Twitter's like counter — CP or AP?**
- AP. A like count being off by 1 for a few seconds is acceptable. Availability is paramount. Use Cassandra with QUORUM reads for "good enough" consistency. CRDTs for conflict resolution.

## 13. Concept Check Quiz

**Q1: Why is CA (Consistency + Availability) impossible in practice?**
- A) Because partitions always happen eventually
- B) Because networks are too slow
- C) Because CPUs have limited cores
- D) Because databases are ACID
- **Answer: A**. Partitions are inevitable (network failures, congestion, packet loss). When a partition occurs, you must choose: stop serving (C) or serve possibly stale data (A). CA is only possible in a perfectly reliable network — which doesn't exist. (B, C, D are irrelevant.)

**Q2: DynamoDB is AP-oriented. What's the tradeoff?**
- A) Slower writes
- B) Possible stale reads
- C) Lower availability
- D) Higher cost
- **Answer: B**. DynamoDB sacrifices strong consistency for availability. Reads might return data that's a few hundred milliseconds stale. (A is wrong — DynamoDB writes are fast, C is wrong — availability is 99.99%+, D is a cost decision unrelated to CAP.)

**Q3: During a network partition, what does a CP system do?**
- A) Accepts all writes and reconciles later
- B) Stops accepting writes until partition heals
- C) Routes writes to a secondary region
- D) Drops half the writes
- **Answer: B**. A CP system blocks writes to maintain consistency — writes only succeed if they can reach the quorum. (A is AP behavior, C is multi-region routing not CAP-specific, D loses data deliberately.)

## 14. Next Steps

Next, explore **Tradeoffs: Latency vs Throughput** (lesson-15-04) — how Little's Law connects them and why optimizing one often hurts the other.`
  },
  {
    id: 'lesson-15-04',
    slug: 'system-design-foundations-04-latency-vs-throughput',
    title: 'Tradeoffs — Latency vs Throughput',
    content: `## 0. Mental Model

> Latency is how long it takes **one car** to drive from A to B. Throughput is how many cars **per hour** the highway can carry. You can increase throughput by adding lanes (parallelism), but each car still needs the same driving time. The tradeoff appears when you add a toll booth: batching cars saves toll costs (high throughput) but every car waits longer (latency penalty).

## 1. Quick Summary

**Latency** (response time for one operation) and **Throughput** (operations per second) are the two fundamental performance metrics. They are connected by **Little's Law**: \`Concurrency = Throughput × Latency\`. Improving one without hurting the other requires **free** optimizations (better algorithms, faster hardware), but in practice there's often a tension: techniques that maximize throughput (batching, buffering) increase latency, and minimizing latency (instant processing) limits throughput.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Latency** | Time from request initiation to response completion |
| **Throughput** | Number of requests completed per unit time |
| **Little's Law** | L = λ × W (avg concurrency = throughput × avg time) |
| **Amdahl's Law** | Speedup limited by sequential part: 1/((1-P)+P/N) |
| **Bandwidth** | Maximum data transfer rate (bits/sec) |
| **Batching** | Grouping multiple operations into one round trip |
| **Buffering** | Temporarily storing data to smooth out bursts |
| **Backpressure** | Signaling upstream to slow down when overwhelmed |

## 3. Problem Without It

- **High throughput design with no latency awareness**: Batch processing of credit card transactions every 10 minutes. Customer card declined for minutes because the batch window hasn't closed. Bad UX.
- **Low latency design with no throughput planning**: Real-time WebSocket system that processes events immediately. Each event costs 1ms overhead. At 100K events/sec, the CPU is 100% consumed by context switching. Throughput collapses.
- **Ignoring Little's Law**: System with 500ms latency and 100 concurrent connections. Maximum throughput = 100 / 0.5 = 200 QPS. When traffic hits 300 QPS, connections queue up and latency spikes to seconds.

## 4. How It Works — Core Mechanics

**Little's Law in practice:**
\`\`\`
A web server has:
- Average latency: 50ms
- 200 concurrent connections (thread pool size)
- Max throughput = 200 / 0.05 = 4,000 QPS

If latency increases to 100ms:
- Max throughput = 200 / 0.1 = 2,000 QPS

To maintain 4,000 QPS at 100ms latency:
- Need 400 concurrent connections
\`\`\`

**The throughput-latency curve:**
\`\`\`
Response Time
    ↑
    │   ┌─── Latency cliff
    │   │
    │   └────────────► Throughput
   Low               High

Under low load: latency is flat (good)
At knee point: latency starts rising
Past knee: latency explodes (queueing)
\`\`\`

## 5. Variants & Flavors

| Strategy | Effect on Latency | Effect on Throughput | Example |
|----------|------------------|---------------------|---------|
| Batching | Increases (waits for batch) | Increases | Kafka, S3 multipart |
| Compression | Increases (CPU time) | Increases | gRPC, HTTP/2 |
| Connection pooling | Decreases (no handshake) | Increases | pgBouncer |
| Read replicas | Same | Increases (scale reads) | MySQL replicas |
| Caching | Decreases (fast path) | Increases (less work) | Redis, CDN |
| Async processing | Decreases (fast ack) | Increases | Message queues |

## 6. Performance Characteristics

| System | Latency (p50) | Throughput | Design Priority |
|--------|--------------|------------|-----------------|
| Redis (single-threaded) | <1ms | 100K ops/sec | Latency |
| Kafka (batched) | 10ms | 1M msg/sec | Throughput |
| PostgreSQL | 1ms (cache hit) | 10K QPS | Balanced |
| S3 | 100-200ms | 5.5K req/s/prefix | Throughput |
| DynamoDB | 5-10ms | 10K/partition | Latency |

## 7. Failure Modes

- **Premature optimization**: Adding a cache, CDN, and async queue for a system doing 100 QPS. Each layer adds latency. The system is slower, not faster.
- **Throughput-at-any-cost**: Batch size grows unbounded. Latency goes from 10ms to 30 seconds during peak. Users time out.
- **Ignoring the knee**: Pushing throughput to 95% of theoretical max. Any traffic spike causes cascading timeout failures.

## 8. Decision Framework

\`\`\`
Is user waiting for this operation?
├── Yes (synchronous) → Optimize latency first
│   Example: API call, page load, payment
└── No (asynchronous) → Optimize throughput first
    Example: Analytics, log processing, batch jobs
\`\`\`

## 9. Real Production Incident

**Stripe API Degradation (2021)**

Stripe experienced a multi-hour latency degradation because a database migration caused index scans to become 10x slower. Write throughput dropped from 10K/s to 2K/s. The automated failover kicked in but the new primary was already overloaded. **Fix**: Stripe's robust idempotency system prevented double charges, and they throttled non-critical traffic to let the database recover. **Lesson**: Always have traffic shaping and priority-based throttling.

## 10. Production Implementation

**Naive**: Single-threaded request processing. 100 QPS max.

**Better**: Thread pool with proper sizing. Connection pooling. Database index optimization. Async processing for non-critical paths.

**Production**: Auto-scaling based on queue depth. Adaptive batching (batch size varies with load). Circuit breakers protect downstream. Backpressure mechanisms prevent overload. Request hedging for p99 reduction.

## 11. Real Company Deep Dives

- **Google**: Known for "The Tail at Scale" paper (2013). Uses prioritized queuing, request hedging (send to N replicas, take first response), micro-partitions to avoid hot spots. Reduced p99 latency 10x.
- **Uber**: Dispatch system — latency-critical (rider waits for driver match). Uses ringpop for consistent hashing + TChannel for RPC with latency-based routing.
- **Cloudflare**: Edge network with 330+ locations. Minimizes latency by processing requests as close to users as possible. Uses a custom NGINX fork with optimized event loops for maximum throughput per worker.

## 12. Interview Playbook

**Q1: Your system has 200ms latency and 500 max connections. What's max throughput?**
- Little's Law: 500/0.2 = 2,500 QPS. To hit 10K QPS, need 2,000 connections or reduce latency to 50ms.

**Q2: How would you design a logging system — optimize for latency or throughput?**
- Throughput. Logs are not user-facing. Use batching (Kafka), compression (Snappy), and buffered writes. Accept batched latency of 10-100ms.

## 13. Concept Check Quiz

**Q1: Little's Law states L = λ × W. What does λ represent?**
- A) Average service time
- B) Arrival rate of requests
- C) Number of servers
- D) Queue depth
- **Answer: B**. λ is the arrival rate (throughput). L is the number of requests in the system (concurrency). W is the average time per request (latency). A confuses W with service time, C is unrelated, D is a different queuing metric.

**Q2: Batching increases throughput. What's the downside?**
- A) Lower throughput
- B) Higher latency per operation
- C) More CPU usage
- D) Less data per batch
- **Answer: B**. Batching waits to accumulate items, adding latency before processing starts. (A is opposite — batching increases throughput, C can be true but isn't the primary tradeoff, D is opposite — more data per batch.)

**Q3: A server has 250ms latency at 100 QPS. At 200 QPS latency is 500ms. What's the max the server can handle?**
- A) 100 QPS
- B) 200 QPS
- C) 400 QPS
- D) Cannot determine
- **Answer: D**. The knee point isn't defined — latency doubled when load doubled, which suggests we're past the optimal point, but without more data we can't determine the knee.

## 14. Next Steps

Next, explore **Tradeoffs: Read-Optimized vs Write-Optimized** (lesson-15-05) — how B-Trees favor reads while LSM-Trees favor writes, and why this choice defines your database architecture.`
  },
  {
    id: 'lesson-15-05',
    slug: 'system-design-foundations-05-read-vs-write-optimized',
    title: 'Tradeoffs — Read-Optimized vs Write-Optimized Storage',
    content: `## 0. Mental Model

> A read-optimized system is a **well-organized filing cabinet** — finding any document is fast because everything is indexed and sorted. A write-optimized system is a **mailroom bin** — you just toss documents in and they land wherever. Sorting happens later, when someone needs to read them. The filing cabinet is great for reading but slow to file. The mailroom bin files instantly but is terrible for retrieval.

## 1. Quick Summary

Storage engines optimize for either **reads** (like B-Trees in MySQL/PostgreSQL) or **writes** (like LSM-Trees in Cassandra/RocksDB). B-Trees keep data sorted for O(log N) reads but pay a write amplification cost. LSM-Trees buffer writes in memory and merge them later, achieving 10-100x faster writes but with read overhead and compaction costs. The choice defines your database's performance profile.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **B-Tree** | Balanced tree structure, data sorted in pages. Read-optimized. |
| **LSM-Tree** | Log-structured merge tree. Write-optimized. MemTable → SSTables |
| **Write Amplification** | How many times data is rewritten internally per write. B-Tree: 2-5x. LSM: 10-50x. |
| **Read Amplification** | How many disk reads per logical read. B-Tree: 1-4. LSM: 4-100+. |
| **Space Amplification** | Extra disk space used. B-Tree: low. LSM: moderate (until compaction). |
| **Compaction** | Background merge of SSTables in LSM-trees |
| **Page** | Fixed-size block (typically 4-16KB) in B-Tree |

## 3. Problem Without It

- **Read-heavy workload on LSM-Tree**: Analytics dashboard querying Cassandra. Even with clustering key optimization, each read touches 3-10 SSTables. Queries take 500ms when they should take 5ms.
- **Write-heavy workload on B-Tree**: Ingesting 100K events/sec into PostgreSQL. Each write causes multiple page splits and index updates. Write throughput capped at 5K/sec. Data backs up.
- **Wrong compaction strategy**: Level compaction (LSM) hurts read performance. Size-tiered compaction (LSM) increases space amplification. Wrong choice = 3x disk cost.

## 4. How It Works — Core Mechanics

**B-Tree (Read-Optimized):**
\`\`\`
Root Page
  ├── Internal Page 1
  │     ├── Leaf: key=1, data=A
  │     ├── Leaf: key=5, data=B
  │     └── Leaf: key=10, data=C
  └── Internal Page 2
        ├── Leaf: key=15, data=D
        └── Leaf: key=20, data=E
\`\`\`
- Finding key=15: root → internal page 2 → leaf (3 page reads)
- Inserting key=12: find leaf page, if full → split (5 writes)

**LSM-Tree (Write-Optimized):**
\`\`\`
Write → [MemTable] → Flush → SSTable 0
                             → SSTable 1
                             → SSTable 2 (background compaction merges)
\`\`\`
- Write: append to MemTable (memory), O(1)
- Read: check MemTable, then bloom filter, then SSTables newest-first

## 5. Variants & Flavors

| Storage Engine | Read Speed | Write Speed | Space Overhead | Used By |
|---------------|-----------|------------|----------------|---------|
| B-Tree (InnoDB) | Fast | Moderate | Low | MySQL |
| B-Tree (Pg) | Fast | Moderate | Low | PostgreSQL |
| LSM (LevelDB) | Moderate | Very fast | High | RocksDB |
| LSM (Cassandra) | Moderate | Very fast | Moderate | Cassandra, Scylla |
| LSM (HBase) | Slow (heavy compaction) | Fast | High | HBase |
| Bitcask (hash) | Very fast | Fast | High | Riak |

## 6. Performance Characteristics

| Metric | B-Tree (MySQL) | LSM-Tree (Cassandra) |
|--------|--------------|---------------------|
| Point read (cache) | 50μs | 100μs |
| Point read (disk) | 500μs | 1-5ms (SSTable seeks) |
| Range read | Fast (pages are sorted) | Slow (merge multiple SSTables) |
| Write (single) | 1-5ms | 50-200μs |
| Write (batch 1K) | 2-5ms/item | 5-10μs/item |
| Write amplification | 3-5x | 10-50x |
| Read amplification | 1-2x | 4-100x |

## 7. Failure Modes

- **LSM compaction storms**: Compaction falls behind. SSTables accumulate. Read latency spikes 10x. I/O bandwidth saturated. Cassandra is famous for this — requires careful compaction strategy tuning.
- **B-Tree page fragmentation**: Over time, pages split and become sparse. Storage waste reaches 30%. VACUUM or OPTIMIZE needed.
- **Wrong sizing**: LSM's bloom filter set too small → false positives → extra disk reads. Set too large → memory waste.
- **Mixing workloads**: Running both OLTP (point reads/writes) and OLAP (range scans) on same engine. Neither workload gets optimal performance.

## 8. Decision Framework

\`\`\`
What's your dominant workload?
├── Reads > 80%? → B-Tree (MySQL, Postgres, SQLite)
├── Writes > 50%? → LSM-Tree (Cassandra, RocksDB, Scylla)
├── Mixed with point reads? → B-Tree with cache
├── Time-series (append-only)? → LSM-Tree (InfluxDB, TimescaleDB)
└── Key-value with rare range scans? → Bitcask (Riak, Redis)
\`\`\`

## 9. Real Production Incident

**Cassandra Compaction Storm at Netflix (2015)**

Netflix's Cassandra cluster experienced a **compaction storm** during a routine data purge. Deleting old records created tombstones (deletion markers). Compaction couldn't keep up, SSTables accumulated, read latency went from 5ms to 30 seconds. **Fix**: Throttled compaction, increased disk I/O budget, switched to leveled compaction. **Lesson**: LSM compaction is not "free" — it's a background cost that must be provisioned for.

## 10. Production Implementation

**Naive**: Default MySQL with all data in one table. Queries slow at 10K rows.

**Better**: Properly indexed MySQL for read-heavy workload. Or Cassandra with correct compaction strategy for write-heavy.

**Production**: Tiered storage with caching layer. B-Tree for hot data (finely indexed), LSM-Tree for warm data (write-optimized), S3/Parquet for cold data. Query router directs to the right tier.

## 11. Real Company Deep Dives

- **Uber**: Uses MySQL (B-Tree) for trip data (lots of point lookups). Uses Cassandra (LSM) for real-time location data (write-heavy, append-heavy). Clear workload-based separation.
- **Netflix**: Cassandra for time-series view history (write-heavy, eventual reads). EV Cache (memcached) for hot data with B-Tree-like performance.
- **Meta**: MyRocks (RocksDB with MySQL interface) for certain workloads — combines LSM write performance with SQL compatibility.

## 12. Interview Playbook

**Q1: Design a time-series metrics database (like Prometheus) — read or write optimized?**
- Write-optimized. Time-series is append-mostly with occasional range queries. LSM-Tree. Use timestamp as part of the sort key. Cassandra/Druid/InfluxDB pattern.

**Q2: Design an e-commerce product catalog — read or write optimized?**
- Read-optimized. Products are read 1000x more than updated. B-Tree (PostgreSQL/MySQL). Add Redis cache for hot products. Use materialized views for category pages.

## 13. Concept Check Quiz

**Q1: What's the primary disadvantage of LSM-Trees?**
- A) Slow writes
- B) Read amplification during compaction
- C) Cannot support range queries
- D) Single-node only
- **Answer: B**. Reads may need to check multiple SSTables and wait for compaction. A is opposite — writes are LSM's strength. C is false — range queries work via SSTable metadata. D is false — Cassandra is distributed.

**Q2: B-Trees are read-optimized because:**
- A) They store data in unsorted pages
- B) Data is sorted with O(log N) lookup
- C) They buffer all writes in memory
- D) They never need to split pages
- **Answer: B**. B-Trees maintain sorted pages with a balanced tree structure, enabling fast O(log N) lookups. A is opposite. C describes LSM's MemTable. D is false — page splits are a cost of B-Trees.

## 14. Next Steps

Next, explore **Tradeoffs: Strong vs Eventual Consistency** (lesson-15-06) — when you can accept stale data and when you must wait for agreement.`
  },
  {
    id: 'lesson-15-06',
    slug: 'system-design-foundations-06-strong-vs-eventual',
    title: 'Tradeoffs — Strong vs Eventual Consistency',
    content: `## 0. Mental Model

> Strong consistency is like a **single queue at a coffee shop** — everyone agrees on the order of orders. It's simple, fair, and predictable, but everyone waits in the same line. Eventual consistency is like **multiple baristas with separate order books** — you get coffee fast, but the books might show different totals until the end-of-day reconciliation.

## 1. Quick Summary

**Strong consistency** guarantees all reads return the latest write. **Eventual consistency** guarantees that if no new writes occur, all reads eventually return the latest write. The former requires **consensus** (Raft/Paxos) and **quorum** (slow). The latter allows **conflict resolution** (CRDTs, last-write-wins) and **low latency**. The choice is the central tension in distributed data systems.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Strong Consistency** | New writes are immediately visible to all subsequent reads |
| **Eventual Consistency** | Given enough time with no writes, all replicas converge |
| **Read-your-writes** | After a write, the same client always reads the new value |
| **Monotonic Reads** | After reading a value, you never see an older value |
| **Causal Consistency** | Causally related operations appear in order |
| **CRDT** | Conflict-free Replicated Data Type — merges automatically |
| **Vector Clock** | Track causality with (node, counter) pairs |
| **Last-Write-Wins (LWW)** | Latest timestamp wins on conflict |
| **Quorum** | Minimum nodes for read/write agreement: W + R > N |

## 3. Problem Without It

- **Strong consistency without latency budget**: User saves their profile and refreshes — old profile appears. The system guarantees eventual consistency but the user thinks the save failed. Repeated saves create 10 duplicate profiles.
- **Eventual consistency for financial data**: Two users transfer money simultaneously. Under eventual consistency, both succeed (double-spend). Bank loses $10K.
- **No read-your-writes**: User posts a comment, doesn't see it in the list. Posts again. Duplicate.
- **Monotonic reads violation**: User refreshes the page 5 times, sees different comment counts each time (nodes serving stale and fresh data). User confused.

## 4. How It Works — Core Mechanics

**Strong consistency (DynamoDB with ConsistentRead=true):**
\`\`\`
Write → ConsistentRead
  ┌──────┐     ┌──────┐
  │Node A│────▶│Node B│
  │(leader)│   │      │
  └──────┘     └──────┘
W=2, R=2, N=3
\`\`\`
Write must reach 2/3 nodes. Read must reach 2/3 nodes. If they overlap, you get the latest write.

**Eventual consistency (Cassandra default):**
\`\`\`
Write → any node → gossips to others (seconds)
Read → any node → may return stale data
\`\`\`
No quorum needed. Fast but possibly stale.

## 5. Variants & Flavors

| Model | Guarantee | Cost | Example |
|-------|-----------|------|---------|
| Strong (Linearizable) | All ops instantaneous | 2x+ latency | Spanner, ZooKeeper |
| Sequential | Ops per client in order | Moderate | Kafka (per partition) |
| Causal | Causally related ops ordered | Low | Cosmos DB (Session) |
| Read-your-writes | Own writes visible immediately | Low | DynamoDB (eventual + session token) |
| Monotonic Reads | No going back in time | Low | DynamoDB (eventual) |
| Eventual | Convergence eventually | Minimal | DNS, CDN |

## 6. Performance Characteristics

| System | Consistency | Write Latency | Read Latency | Availability |
|--------|------------|--------------|--------------|--------------|
| Spanner | Strong (TrueTime) | 10-50ms | 5-15ms | High |
| etcd/ZK | Strong (Raft) | 2-5ms | 1-3ms | Moderate (leader-dependent) |
| Cassandra (QUORUM) | Strong | 5-10ms | 5-10ms | High |
| Cassandra (ONE) | Eventual | 1-2ms | 1-2ms | Very high |
| DynamoDB (eventual) | Eventual | 5-10ms | 2-5ms | 99.99% |
| DNS | Eventual | N/A (TTL-based) | <1ms | Very high |

## 7. Failure Modes

- **Assuming strong means "instant"**: Strong consistency requires quorum — that means network round trips. In multi-region, this adds 50-200ms latency.
- **Conflict resolution surprises**: Last-Write-Wins looks simple until clock skew causes lost updates. Vector clocks avoid this but need conflict resolution logic in the application.
- **Eventual consistency ≠ "no consistency"**: It's a proper model with specific guarantees (convergence, monotonic reads via version vectors). Treating it as "whatever happens" leads to bugs.

## 8. Decision Framework

\`\`\`
Does correctness require every read to see every prior write?
├── Yes → Strong consistency (Spanner, ZK, etcd, QUORUM reads)
│   Example: Payment balance, inventory count, lock state
└── No  → Eventual consistency (DynamoDB, Cassandra, DNS)
    ├── Can conflicts be merged? → CRDTs
    ├── Is staleness OK within bounds? → TTL-based caching
    └── Can timing be loose? → Vector clocks + LWW
\`\`\`

## 9. Real Production Incident

**Google Calendar 2-Way Sync Bug (2019)**

Google Calendar's eventual consistency for mobile sync caused events to disappear. User creates an event on phone → syncs → event shows on web. User edits event on web → syncs → phone shows the edit. But if both edits happen concurrently, LWW resolution can **delete** the event entirely if the clock skew makes the create timestamp appear older than a phantom delete. **Fix**: Vector clocks with tombstones (events are soft-deleted).

## 10. Production Implementation

**Naive**: Default DynamoDB (eventual). Reads sometimes return 404 after writes. Users confused. Retry logic added ad-hoc.

**Better**: Use ConsistentRead=true for critical paths (profile saves). Use session tokens for read-your-writes. Accept eventual for non-critical (likes, views).

**Production**: Per-operation consistency level. Version vectors on every document. CRDTs for mergeable data. Conflict UI for the 0.001% case. Monitoring staleness with synthetic canary writes.

## 11. Real Company Deep Dives

- **Amazon Shopping Cart**: Cart items must not disappear (monotonic reads) but can be slightly stale (eventual). DynamoDB with session-scoped consistency. If two devices add items concurrently, CRDT-based merge preserves both.
- **Google Spanner**: TrueTime-based linearizability. Used for Google Ads, Search, Gmail. Every transaction gets a globally consistent timestamp. Cost: 2-3x infrastructure vs eventual systems.
- **Cloudflare DNS**: Eventually consistent by design. DNS TTL of 300 seconds means any change takes up to 5 minutes to propagate globally. Acceptable because DNS changes are infrequent. 100% availability for reads.

## 12. Interview Playbook

**Q1: Design a distributed counter for YouTube video views. Strong or eventual?**
- Eventual. A view being off by a few thousand (out of millions) is meaningless. Use CRDT counter or batched writes to Cassandra. Strong consistency would create a single write bottleneck for viral videos.

**Q2: Design a collaborative document editing system (Google Docs). Strong or eventual?**
- Need strong consistency for each character insertion (OT/CRDT). Use causal consistency — character A before character B must be in order. Use vector clocks for operation ordering. The operational transform (OT) algorithm handles concurrent edits.

## 13. Concept Check Quiz

**Q1: What does W + R > N guarantee in quorum?**
- A) Every read sees the latest write
- B) The system is always available
- C) Writes never fail
- D) No consistency at all
- **Answer: A**. With W + R > N, the read quorum always overlaps with the write quorum, guaranteeing at least one node has the latest write. B is wrong — quorum can fail during partitions. C is wrong — writes can fail if < W nodes respond. D is opposite.

**Q2: Which is NOT guaranteed by eventual consistency?**
- A) If no writes happen, all replicas converge
- B) A write followed by immediate read always returns the new value
- C) Convergence eventually happens
- D) The system is highly available
- **Answer: B**. Read-your-writes is NOT guaranteed by vanilla eventual consistency. (A and C are the definition. D is a property — eventual systems are usually highly available.)

**Q3: CRDTs are useful because:**
- A) They require a central coordinator
- B) They can merge conflicting updates without consensus
- C) They only work on integers
- D) They guarantee strong consistency
- **Answer: B**. CRDTs have mathematical merge properties that guarantee convergence without coordination. A is wrong — no coordinator needed. C is wrong — there are CRDTs for sets, maps, counters, text. D is wrong — CRDTs are eventually consistent.

## 14. Next Steps

Next, explore **SSE & Webhooks** (lesson-16-01) — two missing communication patterns that are essential for real-time and event-driven architectures.`
  }
];
