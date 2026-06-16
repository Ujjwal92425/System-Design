export const module11Lessons = [
  {
    id: 'lesson-11-01',
    slug: 'simulation-driven-01-capacity-estimation',
    title: 'Capacity Estimation & Traffic Modeling',
    content: `## 1. Quick Summary

**Capacity estimation** is the foundation of every system design. You must calculate how many **queries per second (QPS)** your system receives, how much **storage** it needs, and what **network bandwidth** is required. The simulation engine models these exactly — you place nodes on the canvas, set their capacities, and the engine computes throughput, latency, and error rates using real **M/M/c queueing theory**.

## 2. Definition

**Capacity estimation** answers three questions:
- **Read/Write QPS**: How many requests per second hit each component?
- **Storage**: How much data accumulates over time (daily, monthly, yearly)?
- **Bandwidth**: How much data moves between components?

The simulation engine uses these estimates to compute per-node **utilization** and **queue depth**.

## 3. Key Estimation Formulas

| Metric | Formula | Example (Twitter, 100M DAU) |
|--------|---------|---------------------------|
| Peak QPS | (DAU × actions/user) / (seconds per day × peak factor) | (100M × 5) / (86400 × 2) ≈ **11,574 QPS** |
| Storage/day | (new content/day × avg size) | (500M tweets × 280 bytes) ≈ **140 GB/day** |
| Cache size | (read QPS × cache TTL × hit ratio) | (10K × 3600 × 0.2) ≈ **7.2M entries** |

## 4. Architecture Example

<Diagram
  nodes={[
    { id: 'client', label: 'Users (100M)', type: 'client', x: 50, y: 40 },
    { id: 'dns', label: 'DNS', type: 'dns', x: 50, y: 120 },
    { id: 'lb', label: 'Load Balancer', type: 'lb', x: 50, y: 200 },
    { id: 'web', label: 'Web Server', type: 'web', x: 250, y: 200 },
    { id: 'cache', label: 'Redis Cache', type: 'cache', x: 250, y: 120 },
    { id: 'db', label: 'SQL Database', type: 'db', x: 250, y: 280 },
  ]}
  edges={[
    { from: 'client', to: 'dns', label: 'DNS Lookup' },
    { from: 'dns', to: 'lb', label: 'HTTPS' },
    { from: 'lb', to: 'web', label: 'Route' },
    { from: 'web', to: 'cache', label: 'Read/Write' },
    { from: 'web', to: 'db', label: 'Persist' },
  ]}
/>

## 5. Simulation Mapping

In the simulator, each node type has a **default capacity** that you can override:
- **Load Balancer**: 100K QPS, routing algorithms (round-robin, least-connections, IP-hash)
- **Web Server**: 2,500 QPS per instance, thread pool of 200
- **Cache (Redis)**: 10K QPS, 1-100ms latency depending on hit ratio
- **SQL Database**: 800 QPS per primary, read replicas add read capacity

Open the **TrafficSlider** to set your target QPS, then click **Start** to see real-time utilization.

## 6. Common Mistakes

- **Ignoring peak factor**: Traffic spikes 2-3x above average. Always design for the 95th percentile with buffer.
- **Underestimating writes**: Writes are often the bottleneck because they hit the primary database. Always count write QPS separately.
- **Forgetting bandwidth**: 10K QPS × 50KB response = 500 MB/s = 4 Gbps. Your load balancer needs that network throughput.

## 7. Related Topics
- Load Balancing Algorithms (module-05)
- Database Replication (module-03)
- Cache Strategies (module-04)`,
    estimatedMin: 20,
    difficulty: 'BEGINNER',
    companies: ['Any'],
    tags: ['simulation', 'capacity', 'estimation', 'qps', 'fundamentals'],
  },
  {
    id: 'lesson-11-02',
    slug: 'simulation-driven-02-load-balancing-patterns',
    title: 'Load Balancing Patterns in the Simulator',
    content: `## 1. Quick Summary

**Load balancers** distribute incoming traffic across multiple backend instances. The simulator models three routing algorithms: **round-robin**, **least-connections**, and **IP-hash**. Each has different implications for throughput, latency, and cache hit rates.

## 2. Algorithm Comparison

| Algorithm | Behavior | Best For |
|-----------|----------|----------|
| **Round Robin** | Cycles through servers in order | Equal-capacity servers, stateless workloads |
| **Least Connections** | Sends to server with fewest active connections | Variable-length requests, long-polling |
| **IP Hash** | Hashes client IP to pick server | Session affinity, cache locality |

The simulator tracks your choice in the **InspectorPanel** — change the \`routingAlgorithm\` field on a LOAD_BALANCER node.

## 3. Architecture with Dual LB

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 30, y: 80 },
    { id: 'lb1', label: 'LB (Active)', type: 'lb', x: 200, y: 40 },
    { id: 'lb2', label: 'LB (Standby)', type: 'lb', x: 200, y: 140 },
    { id: 'web1', label: 'Web Server 1', type: 'web', x: 400, y: 40 },
    { id: 'web2', label: 'Web Server 2', type: 'web', x: 400, y: 90 },
    { id: 'web3', label: 'Web Server 3', type: 'web', x: 400, y: 140 },
  ]}
  edges={[
    { from: 'client', to: 'lb1', label: 'Traffic' },
    { from: 'client', to: 'lb2', label: 'Failover', dashed: true },
    { from: 'lb1', to: 'web1', label: '33%' },
    { from: 'lb1', to: 'web2', label: '33%' },
    { from: 'lb1', to: 'web3', label: '33%' },
  ]}
/>

## 4. How the Simulator Routes Traffic

In each tick, the simulation engine:
1. Identifies **entrypoint nodes** (zero incoming edges) — typically LOAD_BALANCER, DNS, or CDN
2. Divides the current QPS equally among entrypoints
3. For each node, calls its model's \`process(incomingQps, config)\` method
4. For LOAD_BALANCER nodes, divides outgoing QPS among downstream neighbors based on routing algorithm
5. BFS-traverses the graph until all nodes are visited

Try placing two web servers behind a load balancer with **round-robin** and observe that each receives ~50% of the QPS. Switch to **least-connections** and watch the distribution adapt.

## 5. Common Mistakes
- **Single load balancer**: Creates a single point of failure. Always deploy an active-standby pair.
- **No health checks**: The simulator assumes all downstream nodes are healthy. In production, LBs must remove unhealthy instances.
- **Wrong algorithm for workload**: Round-robin with variable-length requests causes uneven load.

## 6. Related Topics
- DNS Routing (module-01)
- Service Mesh (module-05)
- Circuit Breaker Patterns (module-07)`,
    estimatedMin: 18,
    difficulty: 'BEGINNER',
    companies: ['AWS', 'Google', 'Meta'],
    tags: ['simulation', 'load-balancer', 'routing', 'traffic'],
  },
  {
    id: 'lesson-11-03',
    slug: 'simulation-driven-03-cache-hit-ratio-impact',
    title: 'Cache Hit Ratio & Performance Impact',
    content: `## 1. Quick Summary

**Cache hit ratio** is the single most impactful performance lever in system design. A 90% hit ratio means 9 out of 10 reads never touch the database — slashing latency from 40ms to 2ms and reducing database QPS by 10x. The simulation engine models **cache TTL decay**, **eviction policies**, and **hit ratio degradation** under load.

## 2. Cache Performance Modeling

| Cache Type | Hit Ratio | Latency (hit) | Latency (miss) |
|------------|-----------|---------------|----------------|
| L1 (in-memory) | 95% | 0.1ms | 5ms |
| Redis | 90% | 1ms | 40ms |
| CDN Edge | 70% | 5ms | 200ms |
| Database | — | — | 40-200ms |

## 3. Architecture with Multi-Layer Cache

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 30, y: 100 },
    { id: 'cdn', label: 'CDN Edge', type: 'web', x: 200, y: 40 },
    { id: 'lb', label: 'Load Balancer', type: 'lb', x: 200, y: 160 },
    { id: 'web', label: 'Web Server', type: 'web', x: 400, y: 160 },
    { id: 'redis', label: 'Redis Cache', type: 'cache', x: 400, y: 70 },
    { id: 'db', label: 'Database', type: 'db', x: 400, y: 260 },
  ]}
  edges={[
    { from: 'client', to: 'cdn', label: 'Static Assets' },
    { from: 'client', to: 'lb', label: 'Dynamic API' },
    { from: 'lb', to: 'web', label: 'Route' },
    { from: 'web', to: 'redis', label: 'Cache Check' },
    { from: 'redis', to: 'web', label: 'Cache Hit (90%)' },
    { from: 'web', to: 'db', label: 'Cache Miss (10%)' },
  ]}
/>

## 4. Cache Eviction in the Simulator

Set \`evictionPolicy\` on a CACHE node to one of:
- **LRU** (Least Recently Used): Evicts the least recently accessed items. Best for most workloads.
- **LFU** (Least Frequently Used): Evicts least frequently accessed. Good for content with skewed popularity.
- **FIFO** (First In, First Out): Evicts oldest entries. Simple but ignores access patterns.

The simulator also supports **TTL (time-to-live)** — set \`ttlSeconds\` in the InspectorPanel. When TTL expires, the cache entry is removed, causing a miss on next read.

## 5. Cache Stampede (Chaos Mode)

Enable **Cache Eviction chaos** on a CACHE node in the ChaosPanel. The simulator will:
1. Suddenly drop the hit ratio to near 0%
2. All reads fall through to the database
3. Database QPS spikes by 10x, causing queue buildup and latency increase
4. System health shifts from GREEN to YELLOW or RED

This models a real production incident — watch how your architecture handles it.

## 6. Common Mistakes
- **Cache-aside without TTL**: Data becomes stale. Always set TTL based on your staleness tolerance.
- **Same TTL for all keys**: Create thundering herd on expiry. Use jittered TTLs.
- **Ignoring write-through overhead**: Write-through caches add latency on every write. Use write-back for write-heavy workloads.

## 7. Related Topics
- CDN Architecture (module-04)
- Database Read Replicas (module-03)
- Cache Write Strategies (module-04)`,
    estimatedMin: 22,
    difficulty: 'INTERMEDIATE',
    companies: ['Meta', 'Netflix', 'Twitter'],
    tags: ['simulation', 'cache', 'hit-ratio', 'performance', 'redis'],
  },
  {
    id: 'lesson-11-04',
    slug: 'simulation-driven-04-database-scaling',
    title: 'Database Scaling — Read Replicas & Sharding',
    content: `## 1. Quick Summary

Databases are the most common bottleneck in system design. The simulator models **read replicas** (horizontal read scaling) and **connection pooling**. Configure \`readReplicaCount\` and \`connectionPoolSize\` on any DATABASE_SQL or DATABASE_NOSQL node to see how they affect throughput and latency.

## 2. Read Replica Architecture

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 30, y: 100 },
    { id: 'web', label: 'Web Server', type: 'web', x: 200, y: 100 },
    { id: 'primary', label: 'DB Primary', type: 'db', x: 400, y: 40 },
    { id: 'replica1', label: 'Read Replica 1', type: 'db', x: 400, y: 140 },
    { id: 'replica2', label: 'Read Replica 2', type: 'db', x: 400, y: 200 },
  ]}
  edges={[
    { from: 'client', to: 'web', label: 'API' },
    { from: 'web', to: 'primary', label: 'Writes' },
    { from: 'web', to: 'replica1', label: 'Reads' },
    { from: 'web', to: 'replica2', label: 'Reads' },
    { from: 'primary', to: 'replica1', label: 'Async Replication', dashed: true },
    { from: 'primary', to: 'replica2', label: 'Async Replication', dashed: true },
  ]}
/>

## 3. Simulation Behavior

When you set \`readReplicaCount: 2\` on a DATABASE_SQL node:
- The simulator treats the primary node's capacity as **write capacity** (e.g., 800 QPS)
- Each read replica adds additional **read capacity** (also 800 QPS each)
- The model reports \`readReplicasUsed\` in the metrics — you can see how many replicas are actively serving
- **Latency** improves as replicas absorb read traffic (from 40ms → 15ms with 2 replicas at 10K QPS)

## 4. Connection Pooling

Set \`connectionPoolSize\` to configure how many concurrent database connections each server maintains:
- Too low (10): Connections become a bottleneck under high QPS
- Too high (500): Database memory overhead, connection thrashing
- Recommended: **50-100** per application server instance

The simulator models pool exhaustion — if all connections are in use, new requests queue up (\`queueDepth\` increases) and eventually timeout.

## 5. Common Mistakes
- **Read replicas for write-heavy workloads**: Replicas only help reads. For write-heavy systems, you need sharding.
- **Synchronous replication**: Adds latency to every write. Use async replication and accept eventual consistency.
- **Single connection pool**: Each microservice should have its own pool sized for its workload, not shared.

## 6. Related Topics
- SQL vs NoSQL (module-03)
- Database Indexing (module-03)
- CAP Theorem (module-03)`,
    estimatedMin: 20,
    difficulty: 'INTERMEDIATE',
    companies: ['AWS', 'Uber', 'Meta'],
    tags: ['simulation', 'database', 'replication', 'sharding', 'connection-pool'],
  },
  {
    id: 'lesson-11-05',
    slug: 'simulation-driven-05-queue-processing',
    title: 'Async Processing with Message Queues',
    content: `## 1. Quick Summary

**Message queues** decouple producers from consumers, smoothing traffic spikes and improving reliability. The simulator models **QUEUE** and **PUBSUB** nodes with configurable \`processingRate\`, tracking **queue depth**, **overflow**, and **backpressure**. When incoming QPS exceeds processing rate, the queue backs up — visible in the MetricsChart.

## 2. Queue Architecture

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 30, y: 100 },
    { id: 'web', label: 'Web Server', type: 'web', x: 200, y: 40 },
    { id: 'queue', label: 'Message Queue', type: 'queue', x: 200, y: 160 },
    { id: 'worker1', label: 'Worker 1', type: 'worker', x: 400, y: 100 },
    { id: 'worker2', label: 'Worker 2', type: 'worker', x: 400, y: 180 },
    { id: 'db', label: 'Database', type: 'db', x: 550, y: 140 },
  ]}
  edges={[
    { from: 'client', to: 'web', label: 'POST /task' },
    { from: 'web', to: 'queue', label: 'Enqueue' },
    { from: 'queue', to: 'worker1', label: 'Dequeue' },
    { from: 'queue', to: 'worker2', label: 'Dequeue' },
    { from: 'worker1', to: 'db', label: 'Write' },
    { from: 'worker2', to: 'db', label: 'Write' },
  ]}
/>

## 3. Erlang-C Queueing Model

The simulator uses the **Erlang-C formula** to compute queue depth:

\`P(queue) = (A^C / C!(1-ρ)) / (Σ(k=0 to C-1) A^k/k! + A^C/C!(1-ρ))\`

Where:
- **A** = offered traffic (incoming QPS / service rate per server)
- **C** = number of servers (threads)
- **ρ** = utilization (A / C)

When ρ ≥ 1 (incoming rate ≥ max processing rate), the queue grows unbounded — the simulator caps it and reports errors.

## 4. Experiment: Queue Backpressure

1. Place a QUEUE node with \`processingRate: 1000\`
2. Connect it between a WEB_SERVER and a WORKER
3. Set traffic to **3000 QPS** (3x the processing rate)
4. Watch **queueDepth** climb each tick
5. Add a second WORKER to double processing capacity
6. Observe queueDepth stabilize

## 5. Dead Letter Queue Integration

Add a **DEAD_LETTER_QUEUE** node to capture messages that fail processing after max retries. Configure:
- \`maxRetryCount\`: Number of retry attempts before the message is dead
- \`dlqBaseRate\`: Base percentage of messages that fail (default 2%)

The simulator routes failed messages to the DLQ and tracks \`dlqDepth\` and \`deadQps\` in metrics.

## 6. Common Mistakes
- **No DLQ**: Failed messages are lost or cause infinite retry loops. Always add a DLQ.
- **Same processing rate for all workers**: Workers may have different capabilities. The simulator evenly distributes by default.
- **Synchronous fallback**: When queue is full, don't fall back to synchronous processing — you'll overload the producers.

## 7. Related Topics
- Kafka vs RabbitMQ (module-05)
- Pub/Sub Patterns (module-05)
- Dead Letter Queues (module-07)`,
    estimatedMin: 25,
    difficulty: 'INTERMEDIATE',
    companies: ['Uber', 'Netflix', 'Amazon'],
    tags: ['simulation', 'queue', 'async', 'erlang-c', 'dlq'],
  },
  {
    id: 'lesson-11-06',
    slug: 'simulation-driven-06-microservice-resilience',
    title: 'Microservice Resilience — Circuit Breaker & Service Mesh',
    content: `## 1. Quick Summary

In a microservice architecture, failures cascade. A single slow downstream service can exhaust your thread pool and bring down the entire system. **Circuit breakers** and **service meshes** prevent cascading failures. The simulator models both — add CIRCUIT_BREAKER nodes to isolate failures and SERVICE_MESH nodes for sidecar-based resilience.

## 2. Cascading Failure Scenario

<Diagram
  nodes={[
    { id: 'client', label: 'API Gateway', type: 'lb', x: 30, y: 80 },
    { id: 'svcA', label: 'Service A', type: 'web', x: 200, y: 40 },
    { id: 'svcB', label: 'Service B', type: 'web', x: 200, y: 140 },
    { id: 'cb', label: 'Circuit Breaker', type: 'web', x: 380, y: 140 },
    { id: 'svcC', label: 'Service C (Slow)', type: 'web', x: 540, y: 140 },
  ]}
  edges={[
    { from: 'client', to: 'svcA', label: '40%' },
    { from: 'client', to: 'svcB', label: '60%' },
    { from: 'svcB', to: 'cb', label: 'Request' },
    { from: 'cb', to: 'svcC', label: 'If Closed' },
  ]}
/>

## 3. Circuit Breaker States

The CIRCUIT_BREAKER model tracks three states:

| State | Behavior | Metrics |
|-------|----------|---------|
| **CLOSED** | Requests pass through normally | \`statusIcon: +, failureCount: N\` |
| **OPEN** | Requests are rejected immediately | \`statusIcon: !, rejectRate: high\` |
| **HALF_OPEN** | A probe request is allowed through | \`statusIcon: ?, failureCount: 0\` |

Configure threshold via \`failureThreshold\` (default: 5 consecutive failures). The simulator sets \`upstreamErrorRate\` based on downstream node health — when Service C starts failing, the circuit breaker opens and rejects traffic.

## 4. Service Mesh Sidecar

A SERVICE_MESH node adds overhead for resilience:
- \`sidecarLatencyMs\`: Extra latency added by the sidecar proxy (default: 3ms)
- \`sidecarCpuOverhead\`: CPU overhead for mTLS, tracing, retries (default: 5%)
- \`enableMtls\`: Mutual TLS between services (adds 2% overhead)
- \`enableRetries\`: Automatic retry on failure (adds 3% overhead)
- \`enableTraces\`: Distributed tracing (adds 1% overhead)

The simulator reports \`totalOverhead\` and \`effectiveQps\` — the actual throughput after overhead.

## 5. Experiment: Circuit Breaker in Action

1. Place SERVICES A → B → C in sequence
2. Set Service C's CPU or latency to very high (simulate degradation)
3. Add a CIRCUIT_BREAKER between B and C
4. Start the simulation — watch the breaker's \`failureCount\` climb
5. When it hits \`failureThreshold\`, the state flips to OPEN
6. Observe Service B's error rate drop as requests are rejected fast instead of timing out

## 6. Common Mistakes
- **No timeout configuration**: Circuit breaker without timeouts is useless. Always set appropriate request timeouts.
- **Too large threshold**: With threshold=20, your system is already overloaded before the breaker opens.
- **Half-open probe too aggressive**: Sending 50% traffic as probes during half-open can overwhelm the recovering service.

## 7. Related Topics
- Service Mesh (module-05)
- Bulkhead Pattern (module-07)
- Retry with Exponential Backoff (module-07)`,
    estimatedMin: 25,
    difficulty: 'ADVANCED',
    companies: ['Netflix', 'Uber', 'Google'],
    tags: ['simulation', 'circuit-breaker', 'service-mesh', 'resilience'],
  },
  {
    id: 'lesson-11-07',
    slug: 'simulation-driven-07-cdn-optimization',
    title: 'CDN Strategy & Edge Caching',
    content: `## 1. Quick Summary

A **Content Delivery Network (CDN)** brings static assets close to users, dramatically reducing latency for global audiences. The simulator models \`hitRatioOverride\` on CDN nodes — set it to configure how often requests hit the CDN edge vs. falling through to origin servers. Combine CDN with CACHE nodes for a complete multi-layer edge strategy.

## 2. CDN Architecture

<Diagram
  nodes={[
    { id: 'client1', label: 'User (US)', type: 'client', x: 30, y: 40 },
    { id: 'client2', label: 'User (EU)', type: 'client', x: 30, y: 160 },
    { id: 'cdn1', label: 'CDN US Edge', type: 'web', x: 200, y: 40 },
    { id: 'cdn2', label: 'CDN EU Edge', type: 'web', x: 200, y: 160 },
    { id: 'origin', label: 'Origin Server', type: 'web', x: 400, y: 100 },
    { id: 'cache', label: 'Redis Cache', type: 'cache', x: 540, y: 40 },
    { id: 'db', label: 'Database', type: 'db', x: 540, y: 160 },
  ]}
  edges={[
    { from: 'client1', to: 'cdn1', label: 'US Traffic' },
    { from: 'client2', to: 'cdn2', label: 'EU Traffic' },
    { from: 'cdn1', to: 'origin', label: 'Cache Miss' },
    { from: 'cdn2', to: 'origin', label: 'Cache Miss' },
    { from: 'origin', to: 'cache', label: 'Read' },
    { from: 'origin', to: 'db', label: 'Write' },
  ]}
/>

## 3. CDN Hit Ratio Impact

| Hit Ratio | Origin QPS | User Latency | Cache Savings |
|-----------|------------|--------------|---------------|
| 0% (no CDN) | 10,000 | 200ms | 0% |
| 50% | 5,000 | 105ms | 50% |
| 90% | 1,000 | 25ms | 90% |
| 99% | 100 | 15ms | 99% |

## 4. Simulation Configuration

On a CDN node, set \`hitRatioOverride\` (0-100) in the InspectorPanel:
- **90**: Typical for cacheable static assets (images, CSS, JS)
- **70**: Mixed content with some dynamic responses
- **50**: Poor cacheability or short TTLs

The simulator also models **TTL-based cache decay** — as TTL approaches, the hit ratio decreases gradually.

## 5. Experiment: CDN Cache Miss Storm

1. Place CLIENT → CDN → WEB_SERVER → DATABASE_SQL
2. Set CDN hit ratio to 95%
3. Run at 50K QPS — observe low origin QPS and latency
4. Apply **Cache Eviction** chaos on the CDN node
5. Watch origin QPS spike from 2,500 to 50,000 — database overloads
6. System health shifts to RED within 3 ticks

## 6. Common Mistakes
- **Caching dynamic content**: Personalized API responses shouldn't go through the CDN. Split static and dynamic traffic.
- **Long TTLs for all content**: Cache invalidation becomes painful. Use short TTLs with CDN purge API for updates.
- **Origin as CDN**: Don't serve static assets from your web servers. Always use a CDN for static content.

## 7. Related Topics
- Cache Eviction Policies (module-04)
- DNS Anycast (module-01)
- Global Load Balancing (module-05)`,
    estimatedMin: 20,
    difficulty: 'INTERMEDIATE',
    companies: ['Cloudflare', 'Netflix', 'Amazon'],
    tags: ['simulation', 'cdn', 'edge-caching', 'performance'],
  },
  {
    id: 'lesson-11-08',
    slug: 'simulation-driven-08-rate-limiting',
    title: 'Rate Limiting — Token Bucket & Sliding Window',
    content: `## 1. Quick Summary

**Rate limiters** protect your system from abuse and traffic spikes. The simulator models **token bucket** and **sliding window** algorithms. Configure \`rateLimitQps\` and \`rateLimiterType\` on a RATE_LIMITER node. When incoming QPS exceeds the limit, excess requests are rejected — visible in the MetricsChart error rate.

## 2. Rate Limiter Architecture

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 30, y: 60 },
    { id: 'rl', label: 'Rate Limiter', type: 'web', x: 200, y: 60 },
    { id: 'lb', label: 'Load Balancer', type: 'lb', x: 380, y: 60 },
    { id: 'web1', label: 'Web Server 1', type: 'web', x: 550, y: 20 },
    { id: 'web2', label: 'Web Server 2', type: 'web', x: 550, y: 100 },
  ]}
  edges={[
    { from: 'client', to: 'rl', label: 'API' },
    { from: 'rl', to: 'lb', label: 'Pass Through' },
    { from: 'lb', to: 'web1', label: 'Route' },
    { from: 'lb', to: 'web2', label: 'Route' },
  ]}
/>

## 3. Algorithm Comparison

| Algorithm | Behavior | Burst Handling | Memory Use |
|-----------|----------|---------------|------------|
| **Token Bucket** | Tokens refill at fixed rate up to max bucket size | ✅ Allows short bursts | Low (one counter) |
| **Sliding Window** | Counts requests in rolling time window | ❌ No bursts | Medium (window log) |

## 4. Simulation Behavior

Set \`rateLimitQps: 2000\` on RATE_LIMITER:
- The model passes through traffic up to 2000 QPS with 0% error rate
- At 2500 QPS input, 500 QPS are rejected → 20% error rate
- At 5000 QPS input, 3000 QPS are rejected → 60% error rate
- Token bucket allows short bursts (up to burst size) before enforcement kicks in

## 5. Experiment: Rate Limiter Protection

1. Connect CLIENT → RATE_LIMITER → WEB_SERVER → DATABASE_SQL
2. Set web server capacity to 1000 QPS, rate limiter to 1200 QPS
3. Ramp traffic from 500 to 5000 QPS
4. Observe: rate limiter rejects excess, web server stays at ~1000 QPS
5. Remove the rate limiter (reconnect directly)
6. Web server gets overwhelmed, error rates spike to 80%

## 6. Common Mistakes
- **Rate limiting at application level only**: Apply at API gateway or load balancer level so limits are enforced before requests consume compute resources.
- **Global rate limit without per-user limits**: One abusive user can exhaust the global limit for everyone. Always combine global + per-user limits.
- **No rate limit on write endpoints**: Write endpoints (POST/PUT) are often more expensive than reads. Use stricter limits.

## 7. Related Topics
- API Gateway Patterns (module-02)
- Throttling vs Backpressure (module-05)
- DDoS Protection (module-01)`,
    estimatedMin: 18,
    difficulty: 'INTERMEDIATE',
    companies: ['Cloudflare', 'Stripe', 'GitHub'],
    tags: ['simulation', 'rate-limiter', 'throttling', 'token-bucket'],
  },
  {
    id: 'lesson-11-09',
    slug: 'simulation-driven-09-serverless-cold-starts',
    title: 'Serverless — Cold Starts & Concurrency',
    content: `## 1. Quick Summary

**Serverless functions** (AWS Lambda, Cloudflare Workers) auto-scale but suffer from **cold starts** — the latency when a new instance spins up. The simulator models SERVERLESS_FN nodes with configurable cold start probability, duration, and concurrent execution limits.

## 2. Serverless Architecture

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 30, y: 80 },
    { id: 'gw', label: 'API Gateway', type: 'lb', x: 200, y: 80 },
    { id: 'fn1', label: 'Function 1', type: 'worker', x: 400, y: 30 },
    { id: 'fn2', label: 'Function 2', type: 'worker', x: 400, y: 130 },
    { id: 'db', label: 'DynamoDB', type: 'db', x: 560, y: 80 },
  ]}
  edges={[
    { from: 'client', to: 'gw', label: 'REST' },
    { from: 'gw', to: 'fn1', label: 'Route' },
    { from: 'gw', to: 'fn2', label: 'Route' },
    { from: 'fn1', to: 'db', label: 'Read/Write' },
    { from: 'fn2', to: 'db', label: 'Read/Write' },
  ]}
/>

## 3. Cold Start Modeling

The SERVERLESS_FN model parameters:
- \`coldStartProb\` (0-1): Probability that a new invocation experiences a cold start
- \`coldStartDurationMs\`: Extra latency when a cold start occurs (default: 2000ms)
- \`maxConcurrentExecutions\`: Maximum parallel executions (default: 1000)

When a cold start happens:
- Latency spikes by \`coldStartDurationMs\` (typically 500ms-5s)
- During the cold start period, the function processes at reduced capacity
- The model tracks \`coldStartRate\` in metrics

## 4. Simulation Impact

| Scenario | Incoming QPS | Cold Start % | Avg Latency | Error Rate |
|----------|-------------|--------------|-------------|------------|
| Warm | 1000 | 1% | 50ms | 0% |
| Spike (0→1000) | 1000 | 15% | 350ms | 2% |
| Traffic Burst | 5000 | 40% | 850ms | 15% |

## 5. Experiment: Cold Start Effects

1. Place API_GATEWAY → SERVERLESS_FN → DATABASE_NOSQL
2. Set cold start probability to 20%
3. Run at constant 500 QPS — observe baseline latency
4. Switch to **SPIKE** scenario — watch latency spike as new instances cold start
5. Add a warm-up strategy: connect a WORKER that pings the function every 30s
6. Cold starts drop back to 1-2%

## 6. Common Mistakes
- **Assuming zero latency**: Cold starts add 500ms-5s. For latency-sensitive APIs, use provisioned concurrency.
- **No warm-up strategy**: For predictable traffic patterns, pre-warm functions before traffic arrives.
- **Monolithic functions**: Large deployment packages increase cold start time. Keep functions focused.

## 7. Related Topics
- Auto-scaling Strategies (module-05)
- Container Orchestration (module-05)
- AWS Lambda vs Fargate (module-05)`,
    estimatedMin: 20,
    difficulty: 'INTERMEDIATE',
    companies: ['AWS', 'Cloudflare', 'Vercel'],
    tags: ['simulation', 'serverless', 'cold-start', 'lambda'],
  },
  {
    id: 'lesson-11-10',
    slug: 'simulation-driven-10-observability-stack',
    title: 'Observability — Monitoring, Logging & Tracing',
    content: `## 1. Quick Summary

**Observability** is how you understand what your system is doing in production. The simulator models MONITORING, LOGS, METRICS, TRACING, and ALERTING nodes — each adds a latency and QPS cost to the pipeline while providing visibility into system health.

## 2. Observability Architecture

<Diagram
  nodes={[
    { id: 'svc1', label: 'Service 1', type: 'web', x: 30, y: 40 },
    { id: 'svc2', label: 'Service 2', type: 'web', x: 30, y: 130 },
    { id: 'agent', label: 'Agent Collector', type: 'worker', x: 200, y: 85 },
    { id: 'metrics', label: 'Metrics DB', type: 'db', x: 380, y: 20 },
    { id: 'logs', label: 'Logs (ELK)', type: 'db', x: 380, y: 85 },
    { id: 'traces', label: 'Traces (Jaeger)', type: 'db', x: 380, y: 150 },
    { id: 'alert', label: 'Alert Manager', type: 'web', x: 550, y: 85 },
  ]}
  edges={[
    { from: 'svc1', to: 'agent', label: 'Metrics/Logs' },
    { from: 'svc2', to: 'agent', label: 'Metrics/Logs' },
    { from: 'agent', to: 'metrics', label: 'Push' },
    { from: 'agent', to: 'logs', label: 'Push' },
    { from: 'agent', to: 'traces', label: 'Push' },
    { from: 'metrics', to: 'alert', label: 'Thresholds' },
    { from: 'logs', to: 'alert', label: 'Patterns' },
  ]}
/>

## 3. Observability Components

| Node Type | Function | Latency Overhead | Storage Cost |
|-----------|----------|-----------------|--------------|
| METRICS | Numeric time-series (Prometheus) | 0.5ms | Low |
| LOGS | Structured text (ELK stack) | 2ms | High |
| TRACING | Request traces (Jaeger) | 1ms per span | Medium |
| MONITORING | Dashboard + alerting | — | Low |
| ALERTING | Alert routing (PagerDuty) | — | Low |

## 4. The Three Pillars

The simulator tracks all three pillars:

**Metrics** (CPU, QPS, latency p99):
- Exported by every node as \`cpu\`, \`qps\`, \`p99Latency\`
- Collected by METRICS nodes and visible in the MetricsChart
- ALERTING nodes fire when metrics cross thresholds

**Logs** (structured events):
- Generated each tick as \`events\` array with severity levels
- LOGS nodes process and index them (adding latency)
- Monitor \`errorRate\` to detect anomalies

**Traces** (request spans):
- TRACING nodes track request paths through the graph
- \`events\` show the flow from entrypoint to database

## 5. Alerting Thresholds

Configure ALERTING with:
- \`cpuThreshold\`: Alert when CPU > this % (default: 80)
- \`latencyThresholdMs\`: Alert when p99 latency exceeds this (default: 200)
- \`errorRateThreshold\`: Alert when error rate > this % (default: 5)

When thresholds are crossed, ALERTING emits events with severity 'WARNING' or 'ERROR' visible in the SimulationPanel's event log.

## 6. Common Mistakes
- **Dashboards without alerts**: Collecting metrics is useless if no one looks at them. Always set up alert routing.
- **Too many alerts**: Alert fatigue causes engineers to ignore notifications. Focus on actionable alerts.
- **Ignoring distributed tracing**: In microservices, tracing is the only way to understand request latency across service boundaries.

## 7. Related Topics
- Prometheus Architecture (module-10)
- ELK Stack (module-10)
- SLOs and Error Budgets (module-10)`,
    estimatedMin: 22,
    difficulty: 'INTERMEDIATE',
    companies: ['Datadog', 'Grafana', 'AWS'],
    tags: ['simulation', 'observability', 'monitoring', 'tracing'],
  },
  {
    id: 'lesson-11-11',
    slug: 'simulation-driven-11-chaos-engineering',
    title: 'Chaos Engineering — Kill, Throttle, Partition & Evict',
    content: `## 1. Quick Summary

**Chaos engineering** is the practice of intentionally injecting failures into your system to test its resilience. The simulator supports four chaos modes: **KILL** (node goes offline), **THROTTLE** (node slows down), **PARTITION** (network cut), and **CACHE_EVICTION** (cache wiped). Use the ChaosPanel while simulation is running to see how your architecture responds.

## 2. Chaos Mode Effects

| Mode | Visual | Effect on Node | System Impact |
|------|--------|---------------|---------------|
| **KILL** | Red pulsing halo | 100% error rate, zero throughput | Downstream services timeout |
| **THROTTLE** | Amber pulsing halo | 50-90% capacity reduction | Latency spike, queue buildup |
| **PARTITION** | Purple pulsing halo | All downstream connections fail | Degraded read/write capability |
| **CACHE_EVICTION** | Rose pulsing halo | Cache hit ratio → 0% | Database gets 10x+ read load |

## 3. Architecture Under Chaos

<Diagram
  nodes={[
    { id: 'client', label: 'Users', type: 'client', x: 30, y: 100 },
    { id: 'lb', label: 'LB', type: 'lb', x: 200, y: 100 },
    { id: 'web', label: 'Web Servers', type: 'web', x: 380, y: 40 },
    { id: 'cache', label: 'Cache', type: 'cache', x: 380, y: 150 },
    { id: 'db', label: 'Database', type: 'db', x: 550, y: 100 },
  ]}
  edges={[
    { from: 'client', to: 'lb', label: 'HTTPS' },
    { from: 'lb', to: 'web', label: 'Route' },
    { from: 'web', to: 'cache', label: 'Read' },
    { from: 'web', to: 'db', label: 'Write' },
  ]}
/>

## 4. Experiment: Kill a Database

1. Load the **E-Commerce 10K** template
2. Start the simulation at "Steady State" — observe GREEN health
3. Find the DATABASE_SQL node in the ChaosPanel
4. Click to apply **KILL** on the database node
5. Watch system health shift:
   - Tick 1: Web server → database requests timeout (event: "TIMEOUT")
   - Tick 2: Queue depth increases as requests pile up
   - Tick 3: Error rates spike → system goes RED
6. Click **Heal** to restart the database
7. Observe recovery: cache serves stale data, DB reconnects, queue drains

## 5. Experiment: Cache Stampede

1. Run the same template with 50K QPS
2. Apply **CACHE_EVICTION** to the Redis cache
3. Watch: DB QPS jumps from 5K to 50K, DB latency goes from 40ms to 800ms
4. Add a CIRCUIT_BREAKER between web servers and database
5. Repeat the experiment — the circuit breaker opens and rejects excess traffic
6. Compare: system stays YELLOW (degraded) instead of RED (failing)

## 6. Running Multiple Failures

The ChaosPanel supports concurrent failures:
- Kill the load balancer — all traffic fails (no redundancy)
- Kill one of two web servers — the other absorbs the load (QPS doubles per instance)
- Kill a cache node — database handles the read load until cache heals
- The event log in the SimulationPanel shows every failure and recovery

## 7. Principles of Chaos Engineering

1. **Start with a hypothesis**: "The system remains available if one database replica fails"
2. **Blast radius**: Start with small, contained experiments
3. **Automate**: Chaos experiments should be repeatable and auditable
4. **Steady state**: Define "normal" metrics before injecting chaos
5. **Abort criteria**: Have automated rollback if system degrades beyond threshold

## 8. Related Topics
- Circuit Breaker Pattern (module-07)
- Bulkhead Pattern (module-07)
- Production Incidents (module-10)`,
    estimatedMin: 30,
    difficulty: 'ADVANCED',
    companies: ['Netflix', 'Amazon', 'Uber'],
    tags: ['simulation', 'chaos-engineering', 'resilience', 'failure-testing'],
  },
  {
    id: 'lesson-11-12',
    slug: 'simulation-driven-12-enterprise-architecture-review',
    title: 'Enterprise Architecture Review with AI Scoring',
    content: `## 1. Quick Summary

The **AI Review Panel** analyzes your complete architecture for scalability, reliability, security, performance, and cost efficiency. Combined with the **Interview Mode**, it creates a realistic system design interview experience — build your architecture, run the simulation, apply chaos, then get scored with detailed issue detection.

## 2. The Review Pipeline

<Diagram
  nodes={[
    { id: 'canvas', label: 'Canvas Design', type: 'web', x: 30, y: 40 },
    { id: 'sim', label: 'Run Simulation', type: 'worker', x: 30, y: 130 },
    { id: 'chaos', label: 'Inject Chaos', type: 'worker', x: 30, y: 220 },
    { id: 'rules', label: 'Rules Engine', type: 'db', x: 230, y: 40 },
    { id: 'ai', label: 'AI Analysis', type: 'db', x: 230, y: 130 },
    { id: 'score', label: 'Scorecard', type: 'db', x: 230, y: 220 },
    { id: 'report', label: 'Final Report', type: 'web', x: 430, y: 130 },
  ]}
  edges={[
    { from: 'canvas', to: 'rules', label: 'Architecture' },
    { from: 'sim', to: 'rules', label: 'Metrics' },
    { from: 'chaos', to: 'rules', label: 'Resilience' },
    { from: 'rules', to: 'ai', label: 'Scored Items' },
    { from: 'ai', to: 'score', label: 'AI Feedback' },
    { from: 'rules', to: 'score', label: 'Rule Results' },
    { from: 'score', to: 'report', label: 'Merge' },
  ]}
/>

## 3. Scoring Dimensions

The AI Review Panel evaluates five dimensions:

| Dimension | Weight | Key Checks |
|-----------|--------|------------|
| **Scalability** | 25% | Load balancer, caching, CDN, auto-scaling, queue |
| **Reliability** | 25% | Read replicas, multi-AZ, circuit breaker, DLQ, health checks |
| **Security** | 20% | WAF, auth service, rate limiter, secrets manager, mTLS |
| **Performance** | 15% | Cache hit ratio, CDN, connection pooling, edge computing |
| **Cost Efficiency** | 15% | Right-sized instances, serverless for variable load, cache optimization |

Each dimension is scored 0-100. The overall score is a weighted average.

## 4. AI-Powered Issues

The AI provider (Anthropic Claude or OpenAI GPT-4o) generates specific, actionable issues:

\`\`\`
Example Issue:
  Category: Reliability
  Severity: HIGH
  Description: "Database has no read replicas — single point of failure."
  Suggestion: "Add at least one read replica and consider multi-AZ deployment."
\`\`\`

When an API key is configured (\`ANTHROPIC_API_KEY\` or \`OPENAI_API_KEY\`), the AI provides context-aware analysis. Without keys, a rule-based fallback engine evaluates your architecture.

## 5. Interview Mode Scoring

In Interview Mode, when you submit:
1. **Rules Engine** evaluates the rubric criteria (has-load-balancer, has-cache, has-db-replicas, etc.)
2. **AI Analysis** runs with the interview prompt context (requirements + rubric)
3. **Scores are merged**: AI bonus (+2 to +5) for high-quality designs, penalty (-3 per issue) for gaps
4. **Grade** is assigned: L6+ Principal Architect (90%+), L5 Senior (75%+), L4 Systems (55%+)

The result includes a detailed breakdown of which rubric criteria passed/failed, specific issues found, and AI-generated feedback.

## 6. Recommended Review Workflow

1. **Load a template** (e.g., Twitter 100M) from ScenarioTemplates
2. **Run simulation** — verify baseline metrics
3. **Inject chaos** — test resilience under failure
4. **Run AI Review** — get scores and issues
5. **Fix high-severity issues** — add missing components
6. **Re-run AI Review** — confirm improvements
7. **Enter Interview Mode** — start a timed session
8. **Submit** — get your final interview score

## 7. Common Architecture Gaps

| Gap | Detection | Fix |
|-----|-----------|-----|
| No load balancer | Rules engine | Add LOAD_BALANCER or API_GATEWAY |
| No cache | AI analysis | Add Redis cache layer |
| No database replicas | Rules engine | Set readReplicaCount > 0 |
| No circuit breaker | AI analysis | Add CIRCUIT_BREAKER for microservices |
| No DLQ with queue | Rules engine | Add DEAD_LETTER_QUEUE |
| No observability | AI analysis | Add MONITORING + LOGS + METRICS |

## 8. Related Topics
- System Design Interview Framework (module-08)
- Capacity Estimation (module-08)
- All simulation-driven lessons`,
    estimatedMin: 25,
    difficulty: 'ADVANCED',
    companies: ['Any'],
    tags: ['simulation', 'ai-review', 'scoring', 'interview', 'enterprise'],
  },
];
