export const module04Lessons = [
  {
    id: "lesson-04-01",
    slug: "caching-cdns-01-caching-fundamentals-cache-hierarchy",
    title: "Caching Fundamentals & Cache Hierarchy",
    content: `## 0. Mental Model

> A cache is like your **kitchen counter vs. pantry**. The counter (cache) holds frequently used items (salt, oil, knife) for instant access. The pantry (database) stores everything else but takes longer to reach. A good chef arranges the counter so the most-used items are closest — that's cache hierarchy. If you run out of counter space, you must evict the least-needed item. If you reorganize the pantry, you should also update the counter (cache invalidation).

## 1. Quick Summary

- **Caching** stores frequently accessed data in a high-speed layer, reducing latency from 10-100ms (database) to <1ms (in-memory).
- **Cache hierarchy** spans L1 (1ns, 32KB), L2 (4ns, 256KB), L3 (12ns, 8MB), RAM (100ns), SSD (10-100µs), and network caches like Redis (1-5ms).
- **Temporal locality**: recently accessed data is likely to be accessed again. **Spatial locality**: data near recently accessed data is likely to be accessed.
- A 90% cache hit rate reduces database load by 10x — a single Redis node serving 100K QPS can offload a 10K-QPS database.
- Cache hierarchy is about **trading capacity for speed**: each level is ~10-100x faster but 10-100x smaller.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Cache** | High-speed data store holding a subset of data for faster access |
| **Cache Hit** | Request served from cache (fast path) |
| **Cache Miss** | Data not found in cache, must fetch from origin (slow path) |
| **TTL (Time-To-Live)** | Maximum time a cache entry lives before automatic eviction |
| **Cache Hierarchy** | Multi-level caching (L1 → L2 → L3 → RAM → SSD → Network) |
| **Temporal Locality** | Same data accessed repeatedly over time |
| **Spatial Locality** | Adjacent data accessed together (cache lines, pages) |
| **Hit Rate** | % of requests served from cache (target: >90%) |
| **Cache Penetration** | Repeated requests for data that doesn't exist (bloom filters mitigate) |
| **Cold Start** | Empty cache after restart — high miss rate until warmed up |
| **Cache Pollution** | Unimportant data evicting important data (e.g., full table scan) |
| **Eviction Policy** | Algorithm deciding which entry to remove when full |

## 3. The Problem Without It

- **Database meltdown**: 10K concurrent users each requesting a product page → 10K database queries/second. Without caching, a single PostgreSQL instance maxes out at ~5K reads/sec → 500ms+ response times, connection pool exhaustion, cascading failures.
- **Latency wall**: Cross-continental database queries (200ms round trip). A cache at the edge (CDN) serves in <10ms — 20x faster. Without it, global users abandon slow apps.
- **Cost explosion**: 1M daily users × 10 queries/user = 10M DB queries/day. A database cluster to handle this costs $5K+/month. Cache reduces this to 1M DB queries/day (90% hit rate) → $500/month database.
- **Unacceptable tail latency**: Without multi-level caching, every request pays the full database latency (p99 = 500ms). With L1/L2 caching, p99 drops to 5ms.
- **Recomputation waste**: Complex aggregation (daily sales report = 30 seconds of computation) executed on every request instead of cached for 5 minutes.

## 4. How It Works — Core Mechanics

### Read-Through Cache Flow
\`\`\`
Request → L1 Cache (in-memory) → Hit? → Return (1ns-1ms)
                               → Miss → L2 Cache (Redis) → Hit? → Return + populate L1 (1-5ms)
                                                        → Miss → Database → Return + populate L2 and L1 (10-100ms)
\`\`\`

### The Locality Principle in Practice
Temporal locality: a user's profile is accessed repeatedly during their session (session start → profile → settings → profile → logout — profile cached in Redis, 5ms vs 50ms DB hit each time).
Spatial locality: loading a product page triggers fetching product data, images, reviews, related products — if cached together (a "page blob" in Redis), a single cache hit serves all.

### Cache Performance Math
\`\`\`
Given:
- Database read latency: 50ms
- Cache read latency: 2ms (Redis)
- Hit rate: 95%
- 1000 requests/second

Avg latency = (0.95 × 2ms) + (0.05 × 50ms) = 1.9ms + 2.5ms = 4.4ms
vs 50ms without caching → 11x improvement

Database QPS = 1000 × 0.05 = 50 QPS (vs 1000 without caching → 20x reduction)
\`\`\`

### Cache Penetration — The Missing Key Problem
\`\`\`typescript
// Without protection: every request for non-existent user hits DB
async function getUser(id: string) {
  const cached = await redis.get(\`user:\${id}\`);
  if (cached) return JSON.parse(cached);
  // BUG: If user doesn't exist, this runs EVERY time
  const user = await db.users.findUnique({ where: { id } });
  if (user) await redis.setEx(\`user:\${id}\`, 300, JSON.stringify(user));
  return user;
}

// Protected: cache the null result for short TTL
async function getUser(id: string) {
  const cached = await redis.get(\`user:\${id}\`);
  if (cached !== null) return JSON.parse(cached); // cached = null is valid
  const user = await db.users.findUnique({ where: { id } });
  await redis.setEx(\`user:\${id}\`, 60, JSON.stringify(user ?? null)); // Cache null for 60s
  return user;
}
\`\`\`

## 5. Variants & Flavors

| Cache Type | Technology | Latency | Capacity | Typical Use |
|-----------|-----------|---------|----------|-------------|
| **L1 (CPU)** | Per-core SRAM | ~1ns | 32-64 KB | CPU instructions, hot data |
| **L2 (CPU)** | Per-core SRAM | ~4ns | 256-512 KB | CPU data cache |
| **L3 (CPU)** | Shared SRAM | ~12ns | 8-32 MB | Shared CPU data |
| **In-Memory** | Application heap (Map/WeakMap) | 0.01-0.1ms | 100 MB-2 GB | Session data, computed values |
| **Distributed** | Redis, Memcached | 1-5ms | 1-500 GB | Shared cache across app servers |
| **HTTP/CDN** | CloudFront, Fastly, Varnish | 5-50ms | 10 TB+ | Static assets, API responses |
| **Database Buffer** | PostgreSQL shared_buffers, InnoDB buffer pool | 0.1-1ms | 1-100 GB | Database page cache |

## 6. Performance Characteristics

| Metric | L1 Cache | L2 Cache | L3 Cache | RAM | Redis (network) | PostgreSQL (disk) |
|--------|----------|----------|----------|-----|----------------|-------------------|
| Latency | 0.5-1ns | 3-5ns | 10-15ns | 100ns | 1-5ms | 10-50ms |
| Bandwidth | 500 GB/s | 200 GB/s | 100 GB/s | 50 GB/s | 100 MB/s | 10 MB/s |
| Size | 32-64 KB | 256 KB | 8-32 MB | 16-256 GB | 1-500 GB | 1 TB+ |
| Cost/GB | $10,000+ | $1,000+ | $100+ | $10 | $5 | $0.10 |
| Volatile | Yes | Yes | Yes | Yes | Configurable | Durable |

**When numbers degrade**: Cache misses cascade — a 1% decrease in hit rate increases database load by 10x at 99% baseline. Cold starts (empty cache) cause 100% miss rate for 5-30 minutes.

## 7. Failure Modes

- **Cache Stampede (Thundering Herd)**: 1000 concurrent requests for the same uncached key all miss and hit the database simultaneously. *Mitigation*: mutex lock on cache miss, probabilistic early expiration.
- **Cache Penetration**: Repeated requests for keys that don't exist (DB always returns null, cache never stores it). *Mitigation*: cache null values with short TTL, bloom filter pre-check.
- **Cold Start**: Cache server restarts with empty memory → 100% miss rate → database overload. *Mitigation*: gradual warmup, pre-load popular keys, use Redis AOF/RDB persistence.
- **Cache Pollution**: A full table scan loads millions of rows into cache, evicting actually-popular data. *Mitigation*: LFU eviction policy, scan-resistant algorithms (ARC, 2Q).

## 8. Decision Framework

\`\`\`
┌─ Is data read more than written?
│   ├─ Yes, 90%+ read → Cache it
│   └─ No, write-heavy → Cache only if write-through is acceptable
├─ Is staleness acceptable for a short period (30-300s)?
│   ├─ Yes → TTL-based caching (simplest)
│   └─ No → Write-through or version-based invalidation
├─ Single app server or multiple?
│   ├─ Single → In-memory cache (Map, WeakMap)
│   └─ Multiple → Redis/Memcached (shared cache)
├─ Global users?
│   └─ Yes → CDN for static + Redis for dynamic
└─ Budget for cache infrastructure?
    ├─ Low → In-memory + PostgreSQL (buffer pool)
    └─ High → Multi-level: Redis Cluster + CDN + in-memory
\`\`\`

| Use Case | Cache Strategy | Why |
|----------|---------------|-----|
| Product catalog (e-commerce) | Redis L2 + CDN L3 | Read-heavy, stale 5min OK |
| User sessions | Redis (write-through) | Must be consistent, short TTL |
| Real-time stock prices | No cache | Staleness unacceptable |
| News feed | Redis with TTL | Stale 30s is fine |
| Trending posts | LFU cache | Popularity-based access |
| Personalization | Cache-aside with tags | Complex invalidation patterns |

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client (Browser)', type: 'client', x: 80, y: 60 },
    { id: 'cdn', label: 'CDN (CloudFront)', type: 'cdn', x: 300, y: 60 },
    { id: 'lb', label: 'Load Balancer', type: 'lb', x: 500, y: 160 },
    { id: 'app', label: 'App Server', type: 'app', x: 500, y: 280 },
    { id: 'cache_l1', label: 'L1: In-Memory Map', type: 'cache', x: 300, y: 280 },
    { id: 'cache_l2', label: 'L2: Redis Cluster', type: 'cache', x: 300, y: 400 },
    { id: 'db', label: 'PostgreSQL', type: 'db', x: 300, y: 520 },
    { id: 'origin', label: 'Origin Server', type: 'storage', x: 500, y: 60 },
  ]}
  edges={[
    { from: 'client', to: 'cdn', label: 'HTTP Request' },
    { from: 'cdn', to: 'origin', label: 'Cache Miss (Dynamic)' },
    { from: 'cdn', to: 'client', label: 'Served From Edge' },
    { from: 'lb', to: 'app', label: 'TCP/HTTP' },
    { from: 'app', to: 'cache_l1', label: 'Check L1 (100ns)' },
    { from: 'app', to: 'cache_l2', label: 'Check L2 (2ms)' },
    { from: 'cache_l2', to: 'db', label: 'Cache Miss (50ms)' },
  ]}
  height={600}
/>

## 10. Real Production Incident

<Callout type="incident">
**Reddit r/place — Cache Stampede, April 2022**

Reddit's r/place (2022) had 6M+ concurrent users painting pixels on a shared canvas. The canvas state was cached in Redis. On every pixel update, the cache was invalidated, causing a cache stampede: thousands of simultaneous reads hit the database. Impact: Redis CPU hit 100%, response times went from 2ms to 5s, canvas updates stalled for 3 minutes.

**Root cause**: Cache invalidation on every write (pixel change) triggered mass cache misses. No stampede protection (mutex lock) was in place. The cache was also too coarse — one key for the entire canvas.

**Fix**: Switched to a **probabilistic early expiration** strategy with a **per-tile cache** (split canvas into 64x64 pixel tiles, each with its own cache key and mutex lock on miss). Also added a write-back layer: pixel writes went to Redis first, batched, and flushed to PostgreSQL every 100ms.

**Lesson**: Any globally-invalidated cache key is a stampede risk. Split hot keys, use mutex locks, and avoid invalidating caches that serve read-heavy workloads under high concurrency.
</Callout>

## 11. Production Implementation

### ❌ Naive — Single-Level In-Memory Cache
\`\`\`typescript
class NaiveCache {
  private store = new Map<string, string>();
  get(key: string) { return this.store.get(key); }
  set(key: string, value: string) { this.store.set(key, value); }
}
// Problem: no TTL, no eviction, process-local only → memory leak, stale data
\`\`\`

### ✅ Better — TTL + Eviction + Redis Fallback
\`\`\`typescript
class MultiLevelCache {
  private local = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string, fetchFn: () => Promise<string>): Promise<string> {
    // L1: local in-memory
    const local = this.local.get(key);
    if (local && Date.now() < local.expiresAt) return local.value;

    // L2: Redis distributed cache
    const redisVal = await redis.get(key);
    if (redisVal) {
      this.local.set(key, { value: redisVal, expiresAt: Date.now() + 5000 }); // short local TTL
      return redisVal;
    }

    // Miss: fetch from source
    const fresh = await fetchFn();
    await redis.setEx(key, 300, fresh);
    this.local.set(key, { value: fresh, expiresAt: Date.now() + 5000 });
    return fresh;
  }
}
\`\`\`

### 🚀 Production — Stamped-Protected Multi-Level + Metrics
\`\`\`typescript
class ProductionCache {
  private local = new Map<string, { value: string; expiresAt: number }>();
  private lock = new Map<string, Promise<string>>(); // dedup in-flight requests

  constructor(
    private redis: RedisClientType,
    private ttl: number = 300,
    private localTtl: number = 5,
    private stats?: { hits: number; misses: number }
  ) {}

  async get(key: string, fetchFn: () => Promise<string>): Promise<string> {
    // L1 check
    const local = this.local.get(key);
    if (local && Date.now() < local.expiresAt) {
      this.stats?.hits++;
      return local.value;
    }

    // Request coalescing — dedup concurrent misses for same key
    const inFlight = this.lock.get(key);
    if (inFlight) return inFlight;

    const promise = this.fetchAndCache(key, fetchFn);
    this.lock.set(key, promise);
    try {
      return await promise;
    } finally {
      this.lock.delete(key);
    }
  }

  private async fetchAndCache(key: string, fetchFn: () => Promise<string>): Promise<string> {
    // L2: Redis
    const redisVal = await this.redis.get(key);
    if (redisVal) {
      this.local.set(key, { value: redisVal, expiresAt: Date.now() + this.localTtl * 1000 });
      this.stats?.hits++;
      return redisVal;
    }

    // Miss
    this.stats?.misses++;
    const value = await fetchFn();

    // Populate both levels
    await this.redis.setEx(key, this.ttl, value);
    this.local.set(key, { value, expiresAt: Date.now() + this.localTtl * 1000 });
    return value;
  }

  async invalidate(key: string): Promise<void> {
    this.local.delete(key);
    await this.redis.del(key);
  }

  hitRate(): string {
    if (!this.stats) return 'N/A';
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 'N/A' : \`\${((this.stats.hits / total) * 100).toFixed(1)}%\`;
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **Twitter (X)**: Multi-level caching for timeline: in-memory L1 (5ms TTL), Redis L2 (30s TTL), MySQL L3 (fan-out on write). Timeline loads in 50ms (warm) vs 500ms (cold).
- **Amazon**: Product detail pages cached at 3 levels: CloudFront CDN (worldwide), ElastiCache Redis (region), in-memory (app server). Price updates propagate via SNS invalidation in <1s.
- **Meta (Facebook)**: TAO — distributed cache for social graph. Thousands of cache servers. 2B+ daily active users. Cache hit rate >95%. Each object has an associated version for staleness detection.
- **Cloudflare**: Global CDN with 320+ PoPs. Free tier caches static assets. Argo Smart Routing optimizes cache miss paths. Workers KV for distributed caching at edge.

## 13. Interview Playbook

**Q: "Design a caching system for a social media news feed."**
→ Open with: define requirements — 100M DAU, 1B feed views/day, acceptable staleness of 30s.
→ Cover: timeline is pre-computed on write (fan-out on write to Redis lists), cached per-user with 30s TTL, L1 in-memory for hot users (5s TTL), L2 Redis Cluster partitioned by user ID hash.
→ Depth signal: mention **fan-out on write** — when a user tweets, the tweet is inserted into all followers' cached timelines. For celebrities (100M followers), switch to fan-out on read (pull model) to avoid write amplification.
→ Avoid: suggesting caching every single tweet individually — cache the pre-computed timeline list instead.

**Q: "What's the difference between caching at the application layer vs the database layer?"**
→ Open with: application-layer caches (Redis, in-memory) store query results/objects. Database-layer caches (buffer pool) store raw pages.
→ Cover: app cache = higher hit rate (semantic knowledge), DB cache = lower overhead (transparent). App cache can be stale; DB cache is always consistent.
→ Depth signal: PostgreSQL's shared_buffers caches 8KB pages — a 10KB row needs one page fetch. Redis caches the JSON object — zero parsing overhead.
→ Avoid: claiming one is strictly better — they complement each other.

**Q: "How do you measure cache effectiveness?"**
→ Open with: hit rate is primary metric, but not sufficient alone.
→ Cover: hit rate (target >90%), latency savings (avg latency with/without cache), miss rate by key pattern (identify hot misses), cache penetration rate (misses for non-existent keys).
→ Depth signal: measure **effective latency** (p50/p99/p999) not just average. Use **stale read ratio** — how many requests got stale data (acceptable vs problematic).
→ Avoid: focusing only on hit rate without measuring the cost of misses.

## 14. Concept Check Quiz

**Q1:** Which cache level provides the fastest access time?
- A) L3 Cache
- B) L1 Cache
- C) Redis
- D) RAM
**Answer: B** — L1 cache runs at CPU speed (~1ns). L3 is ~12ns, RAM is ~100ns, Redis is ~1-5ms over the network.

**Q2:** A cache has 95% hit rate. Cache latency is 2ms. Database latency is 50ms. What is the average latency?
- A) 2ms
- B) 4.4ms
- C) 50ms
- D) 52ms
**Answer: B** — (0.95 × 2) + (0.05 × 50) = 1.9 + 2.5 = 4.4ms. Without cache: 50ms. Improvement: 11x.

**Q3:** What is cache penetration?
- A) Cache eviction due to high memory usage
- B) Repeated requests for non-existent data bypassing the cache
- C) Cache miss during cold start
- D) Multiple concurrent requests for the same key
**Answer: B** — Cache penetration is when requests for data that doesn't exist repeatedly hit the database because the cache has no entry to serve. Mitigation: cache null values or use bloom filters.

**Q4:** When would you NOT use caching?
- A) Read-heavy workload
- B) Expensive database computations
- C) Real-time stock ticker data
- D) Product catalog with 90/10 read/write ratio
**Answer: C** — Real-time data where staleness is unacceptable shouldn't be cached (or cached with sub-second TTL and write-through). The other options benefit from caching.

**Q5:** A full table scan of a 10GB table evicts cached data for a popular product catalog. What is this called?
- A) Cache stampede
- B) Cache penetration
- C) Cache pollution
- D) Cache hit
**Answer: C** — Cache pollution occurs when unimportant data (from a scan) evicts frequently accessed data. Mitigation: use scan-resistant eviction policies like ARC or configure the cache to ignore certain query patterns.

## 15. Next Steps

- **Cache Eviction Policies (04-02)** — How LRU, LFU, FIFO, and TTL decide what to evict when the cache is full.
- **Caching Patterns (04-03)** — Cache-Aside, Read-Through, Write-Through, Write-Back — which pattern for which scenario.
- **Distributed Caching (04-04)** — Scaling caches across multiple servers with Redis Cluster, consistent hashing, and replication.
- **Cache Invalidation (04-05)** — TTL vs event-driven vs write-through invalidation — the hard problem in distributed caching.`,
    estimatedMin: 14,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Twitter", "Amazon", "Meta", "Cloudflare", "Reddit"],
    tags: ["caching", "cache-hierarchy", "performance", "latency", "locality"],
  },

  {
    id: "lesson-04-02",
    slug: "caching-cdns-02-cache-eviction-policies",
    title: "Cache Eviction Policies (LRU, LFU, FIFO)",
    content: `## 0. Mental Model

> A cache is like a **crowded parking lot with a bouncer**. When full, the bouncer must decide which car to tow. LRU tows the car that hasn't moved the longest. LFU counts how many times each car has left and tows the one that left the least. FIFO tows whichever car arrived first, regardless of how frequently it's used. TTL tows every car after a fixed time, like valet parking with a time limit.

## 1. Quick Summary

- **LRU (Least Recently Used)**: Evicts data accessed furthest in the past. Best for most general workloads. O(1) with doubly-linked list + hashmap.
- **LFU (Least Frequently Used)**: Evicts data accessed least often. Best for content with clear popularity ranking (CDN, trending posts).
- **FIFO (First In, First Out)**: Evicts oldest entry regardless of access. Simple but ignores access patterns entirely.
- **TTL (Time-To-Live)**: Evicts entries after fixed duration. Not adaptive but gives predictable freshness.
- **ARC (Adaptive Replacement Cache)**: Dynamically balances between recency and frequency. Used in ZFS, some databases. Handles changing workloads better.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **LRU** | Least Recently Used — evicts the entry accessed longest ago |
| **LFU** | Least Frequently Used — evicts the entry with fewest accesses |
| **FIFO** | First In First Out — evicts the oldest entry |
| **TTL** | Time-To-Live — evicts after a fixed duration |
| **ARC** | Adaptive Replacement Cache — hybrid LRU/LFU |
| **2Q** | Two-Queue algorithm — LRU with separate hot/cold queues |
| **SLRU** | Segmented LRU — protects frequently accessed entries from scans |
| **Clock/CLOCK** | Approximation of LRU using a circular buffer and reference bits |
| **Thrashing** | Frequent eviction of entries that are needed again soon |
| **Scan Resistance** | Ability to avoid polluting cache with one-time sequential access |

## 3. The Problem Without It

- **Memory leak without eviction**: A cache with no eviction policy grows unbounded → OOM kills the server.
- **Wrong eviction destroys hit rate**: FIFO on a news site evicts today's trending article (accessed every second) to make room for yesterday's article (accessed once). Hit rate drops from 90% to 40%.
- **Full table scan pollution**: A reporting query scans 10M rows, loading them into cache (LRU). This evicts the 100 most popular product pages. Next 100K user requests miss cache → database spike → site slow.
- **Scan behavior in production**: PostgreSQL's buffer pool uses clock-scan (approximate LRU). A sequential scan of a large table can evict the entire hot set. PG mitigates with ring buffers — configurable via \`ring_buffer\` strategy.
- **TTL misconfiguration**: Setting TTL too short (10s) → constant cache misses + 10x DB load. Setting TTL too long (24h) → users see prices from yesterday.

## 4. How It Works — Core Mechanics

### LRU — Doubly-Linked List + Hashmap

\`\`\`
Head (MRU)                  Tail (LRU)
  │                           │
[A] ⇄ [B] ⇄ [C] ⇄ [D] ⇄ [E]
↑                          ↑
most recently used        least recently used (evicted first)

Access C → move to head:
[A] ⇄ [C] ⇄ [B] ⇄ [D] ⇄ [E]
\`\`\`

\`\`\`typescript
class LRUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, V>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value); // Move to end (most recently used)
    return value;
  }

  put(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Delete first entry (least recently used)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
\`\`\`

### LFU — Frequency Map + Frequency Buckets

\`\`\`
Access counts: A(100), B(50), C(3), D(1), E(1)

LFU eviction: among lowest frequency (1), evict oldest entry
Cache size: 3
  C(3), D(1), E(1) → evict D (oldest among freq=1 → minFreq)
  Insert F(1) → C(3), E(1), F(1)
\`\`\`

**Time-based LFU (TinyLFU)**: Counter values decay over time to adapt to changing access patterns. Used in Caffeine (Java) and Ristretto (Go). Without decay, an old popular entry (yesterday's news at 1M hits) would never be evicted even if no one reads it today.

### Clock Algorithm (Approximate LRU)
Used in operating systems (Linux page cache) and PostgreSQL:
\`\`\`
1. Pages arranged in a circular buffer with a reference bit
2. Clock hand sweeps through pages
3. If reference bit = 1: set to 0, continue
4. If reference bit = 0: evict this page
5. On access: set reference bit = 1
\`\`\`
PostgreSQL's buffer replacement uses a variant called **clock sweep** with usage count (0-5). Each access increments usage count (capped at 5). The clock hand decrements usage count as it sweeps. Pages with usage count 0 are evicted.

## 5. Variants & Flavors

| Policy | Mechanism | Scan Resistant | Overhead | Adaptive | Best For |
|--------|-----------|---------------|----------|----------|----------|
| **LRU** | Doubly-linked + hashmap | No (bad for scans) | O(1) | No | General purpose |
| **LFU** | Frequency map + buckets | Yes (frequency-based) | O(log n) | Slow to adapt | Popularity-based access |
| **FIFO** | Queue | No | O(1) | No | Streaming, logs |
| **TTL** | Expiration timestamps | N/A | O(n) cleanup | No | Time-sensitive data |
| **ARC** | 4 LRU lists (recent/frequent × ghost) | Yes | O(1) | Yes | Mixed workloads |
| **CLOCK** | Circular buffer + ref bits | Partial | O(1) sweep | No | OS page cache |
| **TinyLFU** | Count-min sketch + frequency | Yes | O(1) | Yes (decay) | High-throughput apps |

## 6. Performance Characteristics

| Policy | Lookup | Insert | Evict | Memory Overhead | Hit Rate (general) | Hit Rate (scan-heavy) |
|--------|--------|--------|-------|----------------|-------------------|----------------------|
| LRU | O(1) | O(1) | O(1) | 2 pointers/entry | 80-90% | 20-40% (bad) |
| LFU | O(1) | O(log n) | O(log n) | 1 counter+ptr/entry | 75-85% | 70-85% |
| FIFO | O(1) | O(1) | O(1) | 0 extra | 50-70% | 30-50% |
| ARC | O(1) | O(1) | O(1) | 2 ptrs + ghost lists | 85-95% | 80-90% |
| CLOCK | O(1) | O(1) | O(n) sweep | 1 ref bit/entry | 75-85% | 60-75% |

**When numbers degrade**: LRU hit rate collapses under sequential scans because every scanned entry is "recently used." LFU cache must periodically decay counters or old entries dominate. ARC adapts but has higher memory overhead.

## 7. Failure Modes

- **LRU Scan Pollution**: A reporting query scans 1M rows. All 1M become "recently used" in LRU, evicting popular data. *Mitigation*: scan-resistant algorithms (ARC, 2Q, or LRU with separate scan detection).
- **LFU Counter Staleness**: Yesterday's viral post (1M hits) stays in cache even though no one reads it today. *Mitigation*: time-based frequency decay (TinyLFU), periodic aging.
- **TTL Herd Expiry**: 10K cache entries all expire at the same second → 10K simultaneous cache misses → database spike. *Mitigation*: Jitter TTLs: \`ttl = baseTTL + random(0, 0.1 × baseTTL)\`.
- **FIFO Misses Hot Data**: An entry accessed 1000 times in 10 seconds is evicted by FIFO because an older entry pushed it out. *Mitigation*: never use FIFO for workloads with non-uniform access.

## 8. Decision Framework

\`\`\`
┌─ Access pattern known?
│   ├─ Uniform (each item equally likely) → FIFO or Random (both fine)
│   ├─ Strong recency bias (user sessions, news) → LRU
│   ├─ Strong frequency bias (viral content, product pages) → LFU
│   └─ Mixed/changing → ARC (self-tuning)
├─ Scan-heavy workload (analytics, reporting)?
│   ├─ Yes → ARC, SLRU, or LFU (NOT LRU or FIFO)
│   └─ No → LRU (simplest, good enough)
├─ Time-sensitive data (prices, inventory)?
│   └─ TTL + LRU as fallback eviction
└─ Memory-constrained?
    └─ CLOCK (low overhead, OS-level)
\`\`\`

| Use Case | Recommended Policy | Reason |
|----------|-------------------|--------|
| Web app session cache | LRU | Recent sessions most active |
| CDN (videos, images) | LFU | Popular content stays cached |
| News feed | TinyLFU/LRU hybrid | Changing popularity |
| Database buffer pool | CLOCK/ARC | Mixed access + scans |
| API response cache | TTL | Freshness guaranteed |
| Streaming data | FIFO | Order > access pattern |

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'app', label: 'Application', type: 'app', x: 80, y: 60 },
    { id: 'cache', label: 'Cache Engine', type: 'cache', x: 300, y: 60 },
    { id: 'lru', label: 'LRU: Doubly-Linked List', type: 'web', x: 300, y: 200 },
    { id: 'lfu', label: 'LFU: Freq Buckets', type: 'web', x: 500, y: 200 },
    { id: 'ttl', label: 'TTL: Expiration Queue', type: 'web', x: 700, y: 200 },
    { id: 'store', label: 'HashMap (O(1) Lookup)', type: 'storage', x: 500, y: 60 },
    { id: 'db', label: 'PostgreSQL', type: 'db', x: 700, y: 60 },
  ]}
  edges={[
    { from: 'app', to: 'cache', label: 'get/set' },
    { from: 'cache', to: 'store', label: 'check hashmap' },
    { from: 'store', to: 'lru', label: 'update access order' },
    { from: 'store', to: 'lfu', label: 'increment freq' },
    { from: 'store', to: 'ttl', label: 'check expiration' },
    { from: 'cache', to: 'db', label: 'cache miss' },
  ]}
  height={320}
/>

## 10. Real Production Incident

<Callout type="incident">
**Slack — LRU Scan Pollution from Elasticsearch Reindex, 2020**

Slack's Redis cache for channel data used LRU eviction. A re-indexing job scanned all 10B+ messages sequentially to rebuild search indexes. Each scanned message ID was "recently accessed" in LRU, evicting the hot set (active channels, online users). Impact: channel load times went from 50ms to 800ms for 45 minutes. All 200K+ active workspaces experienced slowdowns.

**Root cause**: The re-indexer did \`SMEMBERS channel:*\` on every channel, loading millions of member lists into Redis. LRU treated these as "recently used" and evicted actually-popular data.

**Fix**: Segregated the re-indexer's cache operations into a separate Redis instance (isolated cache domain). On the main cache, switched from pure LRU to **volatile-ttl** for cached data and **allkeys-lfu** for long-lived data. Also added a scan detection heuristic: if a key hasn't been accessed in >1 hour and is suddenly read, treat it as a scan and don't promote in LRU.

**Lesson**: LRU is not scan-resistant. Any batch job that touches many keys can pollute an LRU cache. Isolate batch workloads into separate cache instances or use scan-resistant eviction policies.
</Callout>

## 11. Production Implementation

### ❌ Naive — Pure LRU (scan-vulnerable)
\`\`\`typescript
// Default Map-based LRU — no scan resistance
class SimpleLRU<K, V> {
  private cache = new Map<K, V>();
  constructor(private capacity: number) {}
  get(key: K) {
    if (!this.cache.has(key)) return undefined;
    const v = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, v);
    return v;
  }
  put(key: K, value: V) {
    if (this.cache.size >= this.capacity) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
    this.cache.set(key, value);
  }
}
// Problem: f(ull table scan) → all scanned items become MRU → pollutes cache
\`\`\`

### ✅ Better — Segmented LRU (scan-resistant)
\`\`\`typescript
class SegmentedLRU<K, V> {
  private probation = new Map<K, V>();  // 20% capacity — "maybe useful"
  private protected = new Map<K, V>();  // 80% capacity — "definitely useful"

  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    if (this.protected.has(key)) {
      const v = this.protected.get(key)!;
      this.protected.delete(key);
      this.protected.set(key, v); // MRU in protected
      return v;
    }
    if (this.probation.has(key)) {
      const v = this.probation.get(key)!;
      this.probation.delete(key);
      this.protected.set(key, v); // Promote to protected on second access
      if (this.protected.size > this.capacity * 0.8) {
        const lru = this.protected.keys().next().value;
        this.protected.delete(lru);
      }
      return v;
    }
    return undefined;
  }

  put(key: K, value: V): void {
    if (this.protected.has(key)) {
      this.protected.delete(key);
      this.protected.set(key, value);
      return;
    }
    // Always goes to probation first
    if (this.probation.size >= this.capacity * 0.2) {
      const lru = this.probation.keys().next().value;
      this.probation.delete(lru);
    }
    this.probation.set(key, value);
  }
}
\`\`\`

### 🚀 Production — Redis LFU with eviction monitoring
\`\`\`typescript
// Redis configuration for production LFU
// redis.conf:
// maxmemory 4gb
// maxmemory-policy allkeys-lfu
// lfu-log-factor 10
// lfu-decay-time 1

// Monitoring script
async function monitorEvictions(redis: RedisClientType) {
  const info = await redis.info('stats');
  const evicted = parseInt(info.match(/evicted_keys:(\d+)/)?.[1] ?? '0');
  const hitRate = parseFloat(info.match(/keyspace_hitrate:(\d+\.\d+)/)?.[1] ?? '1.0');

  if (evicted > 1000) {
    console.warn(\`High eviction rate: \${evicted} keys evicted\`);
    // Scale cache or adjust maxmemory
  }
  if (hitRate < 0.85) {
    console.warn(\`Low hit rate: \${(hitRate * 100).toFixed(1)}%\`);
    // Review access patterns, consider larger cache
  }
}

// Application-level: probabilistic TTL to spread expirations
function getJitteredTTL(baseTTL: number): number {
  return Math.floor(baseTTL * (0.9 + Math.random() * 0.2)); // ±10% jitter
}
\`\`\`

## 12. Real Company Deep Dives

- **Redis**: Supports LRU (allkeys-lru, volatile-lru), LFU (allkeys-lfu), TTL (volatile-ttl), random, and noeviction. \`lfu-log-factor\` and \`lfu-decay-time\` tune the LFU counter aging. Default is \`noeviction\` on most installations (writes fail when memory full — forces operational awareness).
- **PostgreSQL**: Uses clock-scan with a multi-level reference count (0-5). The \`bgwriter\` process sweeps the buffer pool. \`shared_buffers\` is typically 25% of RAM. Scan-resistant via ring buffers — sequential scans use a small ring that doesn't pollute the main buffer.
- **Caffeine (Java)**: Window-TinyLFU — a modern hybrid LRU + TinyLFU. Used by Spring Cache, Cassandra. Near-optimal hit rate with low overhead. The "window" cache captures recent accesses, TinyLFU tracks frequency with a count-min sketch.
- **Memcached**: Per-slab-class LRU. Memory is divided into slab classes (64B, 128B, ..., 1MB). Each slab has its own LRU. If slab class A (128B) is full and a new 128B object arrives, the oldest entry in that slab class is evicted (even if slab class B has free space).

## 13. Interview Playbook

**Q: "Implement an LRU cache from scratch."**
→ Open with: need O(1) get and put — use a hashmap for lookups + doubly-linked list for access order.
→ Cover: on get, move accessed node to head. On put, if at capacity, remove tail node (LRU), insert new node at head. Java: LinkedHashMap with accessOrder=true.
→ Depth signal: mention that JavaScript's Map preserves insertion order — \`map.keys().next().value\` gives the oldest entry (LRU). For production, consider Segmented LRU to mitigate scan pollution.
→ Avoid: writing a queue-based LRU with O(n) eviction — interview expects O(1).

**Q: "LRU vs LFU — when would you choose each?"**
→ Open with: LRU for recency-based access (user sessions), LFU for frequency-based (content popularity).
→ Cover: LRU fails under sequential scans (pollution). LFU fails under changing popularity (old entries never evicted). Real-world: use a hybrid (ARC, TinyLFU, Segmented LRU).
→ Depth signal: LFU requires counter aging. In Redis, \`lfu-decay-time 1\` means the counter decays by half every minute — fresh popularity replaces old.
→ Avoid: saying one is universally better — always "it depends on access pattern."

**Q: "How does PostgreSQL handle buffer eviction?"**
→ Open with: clock-scan algorithm with usage count (0-5).
→ Cover: Each buffer page has a usage counter. On access: increment (max 5). Clock hand sweeps, decrementing counters. Evict when counter hits 0. Ring buffers for sequential scans prevent pollution.
→ Depth signal: \`shared_buffers\` default is 128MB, recommended 25% of RAM. Tune via \`bgwriter_lru_maxpages\` and \`bgwriter_lru_multiplier\`.
→ Avoid: saying PostgreSQL uses pure LRU — it doesn't, it uses clock-scan for efficiency.

## 14. Concept Check Quiz

**Q1:** Which eviction policy is most vulnerable to scan pollution?
- A) LFU
- B) LRU
- C) ARC
- D) TTL
**Answer: B** — LRU treats every access as "recently used," so a sequential scan loads every scanned entry into the MRU position, evicting actually-popular data.

**Q2:** What data structure combination gives O(1) LRU?
- A) HashMap + Queue
- B) HashMap + Doubly-Linked List
- C) Array + Binary Search
- D) TreeMap + PriorityQueue
**Answer: B** — HashMap provides O(1) key lookup. Doubly-linked list provides O(1) move-to-front and remove-tail operations.

**Q3:** An LFU cache stores yesterday's viral post (1M hits) that no one reads today. What problem occurs?
- A) Scan pollution
- B) Counter staleness — entry never evicted
- C) Cache stampede
- D) TTL expiry
**Answer: B** — LFU without counter aging keeps old popular entries forever. Solution: time-based frequency decay (TinyLFU) or periodic aging counters.

**Q4:** What is the TTL herd expiry problem?
- A) TTL set too long
- B) Too many entries expire simultaneously → cache miss spike
- C) TTL shorter than write frequency
- D) TTL not set
**Answer: B** — When many cache entries share the same TTL and were created at the same time, they all expire at the same second, causing a thundering herd of cache misses. Mitigation: add jitter to TTLs.

**Q5:** Which algorithm does PostgreSQL use for buffer pool eviction?
- A) LRU
- B) LFU
- C) Clock-scan with usage count
- D) Random replacement
**Answer: C** — PostgreSQL uses a clock-scan variant with a usage count (0-5). Pages are evicted when their usage count reaches 0 during a clock sweep.

## 15. Next Steps

- **Caching Patterns (04-03)** — Cache-Aside, Read-Through, Write-Through, Write-Back — how the application interacts with the cache.
- **Distributed Caching (04-04)** — Redis Cluster, Memcached, consistent hashing, replication.
- **Cache Invalidation (04-05)** — How to keep cached data fresh when the source changes.
- **CDN Caching (04-06)** — Edge caching at global scale with different eviction behavior.`,
    estimatedMin: 14,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Redis", "PostgreSQL", "Memcached", "Slack", "Caffeine"],
    tags: ["LRU", "LFU", "cache-eviction", "FIFO", "TTL", "ARC"],
  },

  {
    id: "lesson-04-03",
    slug: "caching-cdns-03-caching-patterns",
    title: "Cache-Aside, Read-Through, Write-Through, Write-Back",
    content: `## 0. Mental Model

> Caching patterns are like **different kitchen workflows**. Cache-Aside: you grab ingredients from the pantry yourself. Read-Through: you tell your assistant "get me flour" and they check pantry then market. Write-Through: you update both fridge and shopping list simultaneously. Write-Back: you jot things on a sticky note and your assistant shops for them later. Each trades immediacy for speed.

## 1. Quick Summary

- **Cache-Aside** (Lazy Loading): Application code checks cache first, falls back to DB on miss. Most common pattern. Simple, flexible. Must handle invalidation manually.
- **Read-Through**: Cache layer automatically loads from DB on miss. Application only talks to cache. Simplifies app code but can cause cache stampedes.
- **Write-Through**: Writes go to both cache and DB synchronously. Strong consistency. Higher write latency (2x).
- **Write-Back** (Write-Behind): Writes go to cache immediately, DB asynchronously. Lowest write latency. Risk of data loss on cache failure.
- **Refresh-Ahead**: Cache proactively refreshes entries before they expire. Reduces miss rate for predictable access patterns. Adds background load.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Cache-Aside** | App manages cache and DB separately — check cache, on miss load from DB |
| **Read-Through** | Cache layer transparently loads from DB on miss |
| **Write-Through** | Write to both cache and DB in same operation |
| **Write-Back (Write-Behind)** | Write to cache first, async persist to DB |
| **Refresh-Ahead** | Proactively refresh cache before TTL expiry |
| **Cache Stampede** | Multiple concurrent misses for same key all hit DB |
| **Stale-While-Revalidate** | Serve stale data while fetching fresh version |
| **Thundering Herd** | Same as cache stampede — simultaneous misses |
| **Cache Warming** | Pre-populating cache before expected traffic |
| **Cache Invalidation** | Removing/updating cache when source data changes |
| **Compensating Transaction** | Rollback write-back if async DB write fails |

## 3. The Problem Without It

- **Without Cache-Aside**: Every request hits the database directly. 10K RPS → PostgreSQL maxes out at ~5K reads/sec → connection pool exhaustion → 503 errors.
- **Without Read-Through**: Application code must implement DB fallback logic in every endpoint. 50 microservices × 10 endpoints = 500 places to implement caching → inconsistency and bugs.
- **Without Write-Through**: After updating user profile in DB, another request reads stale cache. User sees old profile for 5 minutes until TTL expiry.
- **Without Write-Back**: Every user action on a social platform writes to DB synchronously. 100M writes/day → massive DB cluster needed. With write-back: 90% of writes absorbed by Redis, DB does 10M writes/day.
- **Without Refresh-Ahead**: A trending article's cache entry expires at peak traffic. 50K concurrent requests miss and all hit the origin → origin goes down. Refresh-ahead would have proactively fetched fresh data before expiry.

## 4. How It Works — Core Mechanics

### Cache-Aside (Lazy Loading)

\`\`\`
READ:
Client → App: GET /users/123
  App → Redis: GET user:123 → MISS
  App → PostgreSQL: SELECT * FROM users WHERE id=123 → 50ms
  App → Redis: SET user:123 {data} EX 300
  App → Client: 200 OK {data}

WRITE:
Client → App: PUT /users/123 {name: "Alice"}
  App → PostgreSQL: UPDATE users SET name='Alice' WHERE id=123
  App → Redis: DEL user:123  (invalidate, simpler than update)
  App → Client: 200 OK
\`\`\`

\`\`\`typescript
// Cache-Aside with invalidation
async function getUser(id: string): Promise<User> {
  const cached = await redis.get(\`user:\${id}\`);
  if (cached) return JSON.parse(cached);

  const user = await db.users.findUnique({ where: { id } });
  if (user) await redis.setEx(\`user:\${id}\`, 300, JSON.stringify(user));
  return user;
}

async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const user = await db.users.update({ where: { id }, data });
  await redis.del(\`user:\${id}\`);  // Invalidate — next read fetches fresh
  return user;
}
\`\`\`

### Read-Through with Stampede Protection

\`\`\`typescript
// The cache layer (not the app) handles DB fallback
async function readThrough<T>(
  key: string,
  ttl: number,
  fetch: () => Promise<T>,
  redis: RedisClientType
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Mutex — only one request loads from DB
  const lockKey = \`lock:\${key}\`;
  const acquired = await redis.set(lockKey, '1', { NX: true, EX: 10 });
  if (acquired) {
    try {
      const value = await fetch();
      await redis.setEx(key, ttl, JSON.stringify(value));
      return value;
    } finally {
      await redis.del(lockKey);
    }
  }
  // Wait and retry (other request is loading)
  await new Promise(r => setTimeout(r, 50));
  return readThrough(key, ttl, fetch, redis);
}
\`\`\`

### Write-Through (Strong Consistency)

\`\`\`
WRITE: Client → App
  App → BEGIN TRANSACTION
  App → PostgreSQL: UPDATE users SET name='Alice' WHERE id=123
  App → Redis: SET user:123 {new data} EX 300
  App → COMMIT
  App → Client: 200 OK
\`\`\`

### Write-Back (High Write Throughput)

\`\`\`
WRITE: Client → App
  App → Redis: SET user:123 {new data}
  App → Client: 200 OK (immediate, ~2ms)
  ... (async, 100ms later) ...
  Worker → PostgreSQL: UPDATE users SET name='Alice' WHERE id=123
  Worker → Redis: DEL user:123  (invalidate → next read from DB ensures consistency)
\`\`\`

## 5. Variants & Flavors

| Pattern | Read Strategy | Write Strategy | Consistency | Write Latency | Read Latency | Data Loss Risk |
|---------|-------------|---------------|-------------|---------------|-------------|----------------|
| **Cache-Aside** | Lazy (check cache → miss → DB) | Write to DB, invalidate cache | Eventual (window) | DB latency | Best (cached) | None |
| **Read-Through** | Cache handles miss transparently | Write to DB + cache or invalidate | Eventual | DB latency | Best (cached) | None |
| **Write-Through** | Same as Cache-Aside or Read-Through | Write to both synchronously | Strong | 2× DB latency (cache + DB) | Best | None |
| **Write-Back** | Same as Cache-Aside | Write to cache, async to DB | Eventual (async) | Cache latency (~2ms) | Best | Yes (cache failure) |
| **Refresh-Ahead** | Proactive refresh before expiry | Same as underlying pattern | Eventual | Same as underlying | Best (no cold misses) | None |

## 6. Performance Characteristics

| Pattern | P50 Read | P99 Read | P50 Write | P99 Write | Hit Rate Impact | DB QPS Reduction |
|---------|----------|----------|-----------|-----------|----------------|-----------------|
| No cache | 50ms | 500ms | 50ms | 500ms | N/A | 0% |
| Cache-Aside | 2ms | 10ms | 50ms | 500ms | 90%+ | 10× |
| Write-Through | 2ms | 10ms | 52ms (2× write) | 510ms | 95%+ (always fresh) | 10× |
| Write-Back | 2ms | 10ms | 2ms (async 50ms) | 5ms | 90%+ | 20× (batched writes) |
| Refresh-Ahead | 2ms | 5ms (no cold miss) | 50ms | 500ms | 98%+ (pre-refreshed) | 50× |

**When numbers degrade**: Write-Through doubles write latency (cache + DB synchronous). Write-Back has data loss window (cache → DB lag). Refresh-Ahead adds background CPU load. Cache-Aside with no stampede protection causes 100× DB load on cold cache.

## 7. Failure Modes

- **Cache Stampede in Cache-Aside**: 1000 concurrent requests for the same uncached key all miss and hit the DB. *Mitigation*: mutex lock on miss (only one process loads, others wait), probabilistic early expiration (refresh before expiry).
- **Data Loss in Write-Back**: Cache server crashes before async DB flush → lost writes. *Mitigation*: Redis AOF persistence, duplicate write queue, write-back with acknowledgment (wait for at least one replica).
- **Write-Through Inefficiency**: Writing to cache even for data that's never read again. *Mitigation*: only write-through for hot keys, use TTL-bound write-through (write to cache only if it exists — \`SET ... NX\` or check first).
- **Refresh-Ahead Overfetch**: Preemptively refreshing entries for data that isn't actually stale yet (if prediction is wrong). *Mitigation*: use predicted access probability or hybrid refresh-ahead + lazy.

## 8. Decision Framework

\`\`\`
┌─ Need strong read-after-write consistency?
│   ├─ Yes → Write-Through (or Cache-Aside + immediate invalidation)
│   └─ No → Cache-Aside or Read-Through (simpler)
├─ Write throughput critical (>10K writes/sec)?
│   ├─ Yes → Write-Back (absorb writes, batch to DB)
│   └─ No → Write-Through or Cache-Aside
├─ Can the app tolerate cache stampede risk?
│   ├─ No → Read-Through with mutex lock
│   └─ Yes → Cache-Aside (more flexible)
├─ Predictable access patterns (hot keys)?
│   └─ Yes → Refresh-Ahead (reduce miss rate further)
└─ Existing infrastructure?
    ├─ Using Redis already → Cache-Aside (most natural)
    └─ Using DAX/EHCache → Read-Through (vendor-managed)
\`\`\`

| Scenario | Best Pattern | Why |
|----------|-------------|-----|
| User profile service | Cache-Aside | Simple, invalidation on update, stale 5min fine |
| Inventory count decrement | Write-Through | Must be accurate after each write |
| Analytics event ingestion | Write-Back | 100K events/sec, batch insert to ClickHouse |
| Product catalog (e-commerce) | Read-Through + mutex | Many product views, stampede risk |
| Trending news feed | Refresh-Ahead | Predictable spike at publish time |
| User session store | Write-Through | Session must be immediately visible across servers |

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 80, y: 60 },
    { id: 'app', label: 'App Server', type: 'app', x: 300, y: 60 },
    { id: 'cache', label: 'Redis Cache', type: 'cache', x: 300, y: 200 },
    { id: 'db', label: 'PostgreSQL', type: 'db', x: 500, y: 60 },
    { id: 'worker', label: 'Async Worker', type: 'worker', x: 500, y: 200 },
    { id: 'queue', label: 'Write Queue', type: 'queue', x: 700, y: 60 },
  ]}
  edges={[
    { from: 'client', to: 'app', label: 'GET /users/123' },
    { from: 'app', to: 'cache', label: 'Cache-Aside: check' },
    { from: 'app', to: 'db', label: 'Read-Through: fetch on miss' },
    { from: 'app', to: 'cache', label: 'Write-Through: set' },
    { from: 'app', to: 'queue', label: 'Write-Back: enqueue' },
    { from: 'queue', to: 'worker', label: 'dequeue' },
    { from: 'worker', to: 'db', label: 'async persist' },
    { from: 'cache', to: 'app', label: 'cached response' },
  ]}
  height={300}
/>

## 10. Real Production Incident

<Callout type="incident">
**Amazon DynamoDB DAX — Cache Stampede During Prime Day, 2019**

Amazon's product catalog service used DynamoDB DAX (read-through cache) for item lookups. During Prime Day 2019, a deployment rotated DAX cluster nodes, triggering cache misses for the top 10K products. 5000 concurrent requests per product hit DynamoDB simultaneously. Impact: DynamoDB throttled reads for 8 minutes, product pages showed "unavailable" for 12% of Prime Day shoppers.

**Root cause**: Read-through cache without mutex lock on miss. DAX's default behavior: when all cluster nodes miss, ALL concurrent requests for the same key go to DynamoDB. No request coalescing.

**Fix**: Amazon added **request coalescing** to DAX — only the first request for a given key hits the origin; subsequent requests for the same key wait on an internal promise/async lock. Also added a **circuit breaker**: if DynamodDB throttles, DAX serves stale data for up to 30s instead of failing.

**Lesson**: Read-through caches MUST implement request coalescing (dedup concurrent misses). Without it, a cold cache is worse than no cache during high traffic.
</Callout>

## 11. Production Implementation

### ❌ Naive — Cache-Aside without stampede protection
\`\`\`typescript
async function getProduct(id: string) {
  const cached = await redis.get(\`product:\${id}\`);
  if (cached) return JSON.parse(cached);
  // PROBLEM: 10K concurrent requests all reach DB
  const product = await db.products.findUnique({ where: { id } });
  await redis.setEx(\`product:\${id}\`, 300, JSON.stringify(product));
  return product;
}
\`\`\`

### ✅ Better — Mutex-protected read-through
\`\`\`typescript
async function getProduct(id: string): Promise<Product> {
  const cached = await redis.get(\`product:\${id}\`);
  if (cached) return JSON.parse(cached);

  const lockKey = \`lock:product:\${id}\`;
  const lock = await redis.set(lockKey, '1', { NX: true, EX: 10 });

  if (!lock) {
    // Another request is loading – wait and retry
    await new Promise(r => setTimeout(r, 10));
    return getProduct(id);
  }

  try {
    const product = await db.products.findUnique({ where: { id } });
    if (product) await redis.setEx(\`product:\${id}\`, 300, JSON.stringify(product));
    return product;
  } finally {
    await redis.del(lockKey);
  }
}
\`\`\`

### 🚀 Production — Probabilistic Early Expiration + Coalescing
\`\`\`typescript
class ProductionCacheAside {
  private inflight = new Map<string, Promise<any>>();

  async get<T>(key: string, ttl: number, fetch: () => Promise<T>): Promise<T> {
    const cached = await redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached) as { value: T; expiresAt: number };
      // Probabilistic early expiration: refresh before actual TTL
      const remaining = parsed.expiresAt - Date.now();
      const shouldRefresh = remaining < 0 || Math.random() < 1 - remaining / (ttl * 1000 * 0.5);
      if (!shouldRefresh) return parsed.value;
      // Try to refresh in background — don't block the response
      this.refreshAsync(key, ttl, fetch);
      return parsed.value;
    }

    // Request coalescing: dedup concurrent misses
    const inflight = this.inflight.get(key);
    if (inflight) return inflight;

    const promise = this.fetchAndCache(key, ttl, fetch);
    this.inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(key);
    }
  }

  private async fetchAndCache<T>(key: string, ttl: number, fetch: () => Promise<T>): Promise<T> {
    const value = await fetch();
    const entry = { value, expiresAt: Date.now() + ttl * 1000 };
    await redis.setEx(key, ttl, JSON.stringify(entry));
    return value;
  }

  private refreshAsync<T>(key: string, ttl: number, fetch: () => Promise<T>): void {
    // Fire-and-forget background refresh
    this.fetchAndCache(key, ttl, fetch).catch(err =>
      console.error(\`Background refresh failed for \${key}:\`, err)
    );
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **Amazon DynamoDB DAX**: Read-through cache for DynamoDB. Automatically handles cache misses. Supports request coalescing (since 2020). Microsecond latency for cached reads.
- **Netflix EVCache**: Write-back cache for user viewing history. Data written to Memcached/Redis first, asynchronously persisted to Cassandra. If cache node fails, the write is lost — Netflix accepts this risk for 1ms write latency.
- **Linux Page Cache**: Write-back for disk I/O. Writes go to page cache, flushed to disk by pdflush/kworker threads. If power fails before flush, data is lost (mitigated by journaling filesystems).
- **GitHub**: Cache-Aside with Redis. Repository metadata cached with 5-minute TTL. On push event, invalidation events propagate via Redis pub/sub to all cache layers.

## 13. Interview Playbook

**Q: "Compare Cache-Aside vs Read-Through. When would you use each?"**
→ Open with: both are read patterns — difference is who manages the cache miss.
→ Cover: Cache-Aside = app manages (flexible, manual invalidation). Read-Through = cache layer manages (simpler app, vendor lock-in). Use Cache-Aside when you need fine-grained invalidation (e.g., invalidate multiple related keys on write). Use Read-Through when using managed services (DAX, EHCache).
→ Depth signal: Read-Through with request coalescing prevents stampedes more easily. Cache-Aside gives you full control over what to cache (partial objects vs full rows).
→ Avoid: claiming one is faster — both have same latency on hit/miss.

**Q: "Explain Write-Through vs Write-Back. What are the tradeoffs?"**
→ Open with: Write-Through = consistent but slower writes. Write-Back = fast writes but risk data loss.
→ Cover: Write-Through: every write costs 2 operations (cache + DB), but read-after-write is always consistent. Write-Back: write latency = cache latency (~2ms), DB writes are batched (100ms-10s batch), but cache failure = data loss.
→ Depth signal: Combine both — write-through for critical data (passwords, payments), write-back for non-critical (view counts, activity logs).
→ Avoid: saying Write-Through doubles latency — it adds cache write time which is <1ms vs DB write at ~50ms.

**Q: "What is cache stampede and how do you prevent it?"**
→ Open with: cache stampede = many concurrent misses for the same key all hitting the origin.
→ Cover: Three solutions: (1) mutex lock on miss — only one request loads from DB. (2) probabilistic early expiration — randomly refresh before TTL. (3) request coalescing — dedup concurrent misses.
→ Depth signal: Redis \`SET NX\` for distributed mutex. Use a TTL jitter of ±10% to spread expirations naturally. For high-value hot keys, use refresh-ahead (background refresh before expiry).
→ Avoid: suggesting longer TTL solves it — that just hides the problem and causes stale data.

## 14. Concept Check Quiz

**Q1:** Which caching pattern has the lowest write latency?
- A) Write-Through
- B) Cache-Aside
- C) Write-Back
- D) Read-Through
**Answer: C** — Write-Back writes only to cache (~2ms) and async persists to DB. Write-Through writes to both (~52ms). Cache-Aside and Read-Through write only to DB (~50ms).

**Q2:** What is the primary risk of Write-Back caching?
- A) High read latency
- B) Data loss on cache failure before DB persist
- C) Cache stampede
- D) TTL expiry
**Answer: B** — If the cache server crashes before async writes are flushed to the database, in-flight writes are lost. Mitigation: AOF persistence, replicated cache, or acknowledge to at least one replica.

**Q3:** A read-through cache without mutex lock causes what problem?
- A) Write amplification
- B) Cache stampede on cold start or miss
- C) Memory leak
- D) Slow eviction
**Answer: B** — All concurrent requests for the same uncached key hit the database simultaneously. Mitigation: request coalescing (only first request loads, others wait).

**Q4:** When should you choose Write-Through over Cache-Aside?
- A) Write throughput is the highest priority
- B) Read-after-write consistency is critical
- C) Database is slow
- D) Cache memory is limited
**Answer: B** — Write-Through ensures the cache is immediately updated when the database changes, so subsequent reads always see the latest data. Cache-Aside invalidates on write (stale window).

**Q5:** What does Refresh-Ahead do?
- A) Evicts expired entries
- B) Proactively refreshes cache entries before they expire
- C) Invalidates cache on write
- D) Loads cache on first request
**Answer: B** — Refresh-ahead predicts when an entry will expire and refreshes it in background before expiry, preventing cold-miss latency spikes during peak traffic.

## 15. Next Steps

- **Distributed Caching (04-04)** — Scaling caching across multiple servers with Redis Cluster, consistent hashing, and replication.
- **Cache Invalidation (04-05)** — TTL vs event-driven vs write-through invalidation.
- **CDN Fundamentals (04-06)** — How CDNs cache content at global scale.
- **Edge Computing (04-07)** — Running code at the CDN edge for dynamic content.`,
    estimatedMin: 15,
    difficulty: "ADVANCED" as const,
    companies: ["Amazon", "Netflix", "GitHub", "Redis", "Linux"],
    tags: ["cache-aside", "read-through", "write-through", "write-back", "caching-patterns", "stampede"],
  },

,
  {
    id: "lesson-04-04",
    slug: "caching-cdns-04-distributed-caching-redis-memcached",
    title: "Distributed Caching (Redis, Memcached)",
    content: `## 0. Mental Model

> Distributed caching is like a **shared neighborhood library**. Instead of each house (app server) having its own book collection (in-memory cache), everyone shares a few library branches (Redis/Memcached nodes). If one branch is full, books get shelved at another branch (consistent hashing). If a branch burns down, a backup branch takes over (replication). You can also keep a small bookshelf at home for your favorite books (L1 in-memory cache).

## 1. Quick Summary

- **Redis** and **Memcached** are the two dominant distributed cache systems. Redis is feature-rich (data structures, persistence, replication, Lua scripts). Memcached is simpler, multithreaded, faster for basic key-value.
- **Consistent hashing** distributes keys across cache nodes with minimal rehashing when nodes are added/removed — only K/N keys move (vs K for modulo hashing).
- **Redis Cluster** uses 16384 hash slots. Each node owns a slot range. Clients route requests directly to the right node. Supports automatic failover.
- **Redis Sentinel** provides high availability: monitors master, promotes replica on failure, updates clients. Failover in ~10-30s.
- **Memcached** is multithreaded (uses all CPU cores), slab-based memory allocation, per-slab LRU, no persistence, no replication — data is ephemeral.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Distributed Cache** | Multiple cache servers acting as a single logical cache layer |
| **Consistent Hashing** | Hash ring that minimizes key redistribution on node changes |
| **Virtual Nodes** | Multiple ring positions per physical node for better distribution |
| **Redis Cluster** | Redis native sharding with 16384 hash slots, automatic failover |
| **Redis Sentinel** | Monitoring, notification, and automatic failover for Redis |
| **Hash Slot** | Unit of data ownership in Redis Cluster (keys hashed to 1 of 16384 slots) |
| **Slab Class** | Memcached memory division by object size (64B, 128B, ..., 1MB) |
| **AOF (Append-Only File)** | Redis persistence — logs every write operation |
| **RDB (Redis Database)** | Redis persistence — point-in-time snapshot |
| **MGET** | Batch get operation — retrieve multiple keys in one round trip |
| **Pipeline** | Batch multiple commands to reduce network round trips |
| **Gossip Protocol** | Redis Cluster nodes exchange state via gossip messages |

## 3. The Problem Without It

- **Single-server limit**: A single Redis instance maxes out at ~100K ops/sec and ~16-64GB RAM. For Twitter's timeline cache (100M users, 1TB+), one server is impossible — need distributed cache across 50+ nodes.
- **No shared cache**: Without distributed cache, each app server has its own in-memory cache. User A hits server 1 (cached), but user B's next request goes to server 2 (cache miss). Hit rate collapses to 30% vs 90% with shared cache.
- **No high availability**: Single Redis server goes down → entire application cache is gone → database gets 10x load → cascading failure. With Redis Sentinel, failover happens in 10-30s.
- **Hot key problem**: One product goes viral. All requests for that product's data hit the same Redis node. That node's CPU spikes to 100%. With consistent hashing + replication, hot keys can be read from replicas.
- **Memory fragmentation**: Without slab allocation (Memcached), allocating many differently-sized objects causes memory fragmentation. Memcached's slab allocator pre-divides memory by size classes.

## 4. How It Works — Core Mechanics

### Consistent Hashing — The Ring

\`\`\`
Keys distributed on a ring (0 to 2^32-1):

      Node C
    ┌─────────┐
    │   K3    │
    │    \    │
Node B        │ ── Node A
    │    /    │
    │   K2    │
    └─────────┘
      K1

Hash("user:123") → position on ring → first node clockwise
Adding Node D: only keys between C and D move (K/n of total)
Modulo: adding a node moves ALL keys (100%)
\`\`\`

\`\`\`typescript
class ConsistentHashRing {
  private ring = new Map<number, string>();
  private sortedKeys: number[] = [];
  private virtualNodes = 150;

  constructor(private nodes: string[]) {
    nodes.forEach(node => {
      for (let i = 0; i < this.virtualNodes; i++) {
        const hash = this.hash(\`\${node}:\${i}\`);
        this.ring.set(hash, node);
      }
    });
    this.sortedKeys = [...this.ring.keys()].sort((a, b) => a - b);
  }

  getNode(key: string): string {
    if (this.sortedKeys.length === 0) throw new Error("No nodes");
    const hash = this.hash(key);
    // Binary search for first hash >= key hash
    let lo = 0, hi = this.sortedKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.sortedKeys[mid] < hash) lo = mid + 1;
      else hi = mid;
    }
    const idx = lo % this.sortedKeys.length;
    return this.ring.get(this.sortedKeys[idx])!;
  }

  private hash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return hash >>> 0;
  }
}
\`\`\`

### Redis Cluster — Hash Slots

\`\`\`
Each key belongs to 1 of 16384 slots:
  slot = CRC16(key) % 16384

Cluster with 3 masters:
  Master A: slots 0-5460
  Master B: slots 5461-10922
  Master C: slots 10923-16383

On access, client computes slot, routes directly to owning node.
If node is down, its replicas take over (if configured).
\`\`\`

### Memcached — Slab Allocation

\`\`\`
Memory (4 GB) divided into slab classes:

Slab 1:  64 bytes  → stores keys with values up to 64B
Slab 2:  128 bytes → stores keys with values 65-128B
...
Slab 42: 1 MB      → stores keys with values up to 1MB

Each slab class has its own LRU. If Slab 2 is full and a new 100B object arrives,
the LRU entry in Slab 2 is evicted (even if Slab 1 has free space).

Problem: If most objects are 100B but many are 1KB, Slab 2 fills faster.
Solution: Tune slab sizes, or use Redis which has more flexible memory management.
\`\`\`

## 5. Variants & Flavors

| Cache System | Data Structures | Persistence | Replication | Sharding | Multithreaded | Use Case |
|-------------|----------------|-------------|-------------|----------|---------------|----------|
| **Redis** | Strings, hashes, lists, sets, sorted sets, streams, bitmaps | RDB/AOF/Hybrid | Master-replica (async) | Cluster (16384 slots) | No (single-threaded) | General purpose, sessions, queues, leaderboards |
| **Memcached** | Key-value only | None | None | Client-side (consistent hashing) | Yes (multi-threaded) | Simple key-value, high throughput |
| **Redis Cluster** | Full Redis types | RDB/AOF | Automatic failover | Native (hash slots) | No | Production Redis at scale |
| **KeyDB** | Redis-compatible | RDB/AOF | Multi-master | Cluster mode | Yes (multi-threaded) | Higher throughput than Redis |
| **Dragonfly** | Redis/Memcached compatible | WAL + snapshot | Master-replica | Cluster | Yes (shared-nothing) | 25x more throughput than Redis |

## 6. Performance Characteristics

| Aspect | Redis (single) | Redis Cluster (3 nodes) | Memcached | Memcached (3 nodes) |
|--------|---------------|------------------------|-----------|---------------------|
| Read throughput | 100K ops/s | 300K ops/s | 200K ops/s (1 thread) | 600K ops/s |
| Write throughput | 100K ops/s | 300K ops/s | 200K ops/s | 600K ops/s |
| P99 latency | 0.5ms | 1-2ms (network) | 0.5ms | 1-2ms |
| Max value size | 512MB | 512MB | 1MB | 1MB |
| Memory overhead (string) | ~50 bytes/key | ~50 bytes/key | ~40 bytes/key | ~40 bytes/key |
| Persistence impact | 5-20% perf loss | 5-20% | N/A | N/A |
| Failover time | N/A | 10-30s (Sentinel) | N/A (data lost) | N/A |

**When numbers degrade**: Redis pipelining can push throughput to 1M+ ops/sec. Cluster cross-slot operations fail (multi-key ops require ALL keys in same slot — use hash tags \`{user:123}\`. Memcached multi-get is not atomic per slab class).

## 7. Failure Modes

- **Redis Cluster Split-Brain**: Network partition splits cluster → both sides may accept writes for same slot. *Mitigation*: Redis Cluster uses majority quorum (requires >N/2 nodes). Minor partition stops accepting writes.
- **Memcached Hot Restart Data Loss**: Memcached restart = all data lost. *Mitigation*: Use Redis with AOF for persistent cache, or implement cache warming on restart.
- **Redis AOF Corruption**: AOF file grows to 100GB+ → replay on restart takes 30+ minutes. *Mitigation*: Periodic \`BGREWRITEAOF\` to compact, monitor AOF size, set \`auto-aof-rewrite-percentage 100\`.
- **Consistent Hashing Imbalance**: 150 virtual nodes per physical node may still cause 20% imbalance (one node gets 20% more keys). *Mitigation*: Use Redis Cluster's hash slots (guaranteed even distribution), for custom consistent hashing, use more virtual nodes (500+).
- **Memcached Slab Imbalance**: Most objects are 500 bytes but slab class for 512B is full while 256B class has free space. *Mitigation*: Tune slab sizes with \`-I\` or use Redis which uses jemalloc (no slab classes).

## 8. Decision Framework

\`\`\`
┌─ Need persistence (survive restarts)?
│   ├─ Yes → Redis with AOF + RDB
│   └─ No → Memcached or Redis without persistence
├─ Need data structures beyond key-value (lists, sets, sorted sets)?
│   ├─ Yes → Redis
│   └─ No → Memcached (simpler, faster)
├─ Need automatic sharding and failover?
│   ├─ Yes → Redis Cluster
│   └─ No → Single Redis with Sentinel, or Memcached with client-side sharding
├─ Throughput requirement?
│   ├─ < 100K ops/sec → Redis (single instance)
│   ├─ 100K-500K ops/sec → Redis Cluster or KeyDB
│   └─ > 500K ops/sec → Dragonfly or Memcached (multithreaded)
└─ Existing infrastructure?
    ├─ AWS → ElastiCache (Redis or Memcached)
    ├─ Self-hosted → Redis Cluster or Memcached
    └─ Serverless → Upstash (Redis), Momento (serverless cache)
\`\`\`

| Use Case | Recommended System | Why |
|----------|-------------------|-----|
| Session store | Redis | Hash data structure, TTL, persistence optional |
| Rate limiter | Redis | INCR + EXPIRE atomic, sorted sets for sliding window |
| API response cache | Memcached or Redis | Simple key-value, high throughput |
| Leaderboard | Redis | Sorted sets (ZADD, ZREVRANGE) |
| Message queue | Redis | Lists (LPUSH/BRPOP), Streams for consumer groups |
| Image cache | Memcached | Larger objects (up to 1MB), high throughput |

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 80, y: 60 },
    { id: 'app1', label: 'App Server 1', type: 'app', x: 80, y: 200 },
    { id: 'app2', label: 'App Server 2', type: 'app', x: 80, y: 340 },
    { id: 'ring', label: 'Consistent Hash Ring', type: 'gateway', x: 320, y: 200 },
    { id: 'node1', label: 'Redis Master A\nSlots 0-5460', type: 'cache', x: 520, y: 80 },
    { id: 'node2', label: 'Redis Master B\nSlots 5461-10922', type: 'cache', x: 520, y: 220 },
    { id: 'node3', label: 'Redis Master C\nSlots 10923-16383', type: 'cache', x: 520, y: 360 },
    { id: 'rep1', label: 'Replica A1', type: 'storage', x: 700, y: 80 },
    { id: 'rep2', label: 'Replica B1', type: 'storage', x: 700, y: 220 },
    { id: 'rep3', label: 'Replica C1', type: 'storage', x: 700, y: 360 },
    { id: 'sentinel', label: 'Sentinel Cluster', type: 'metrics', x: 320, y: 80 },
  ]}
  edges={[
    { from: 'client', to: 'app1', label: 'request' },
    { from: 'client', to: 'app2', label: 'request' },
    { from: 'app1', to: 'ring', label: 'hash(key) → node' },
    { from: 'app2', to: 'ring', label: 'hash(key) → node' },
    { from: 'ring', to: 'node1', label: 'slots 0-5460' },
    { from: 'ring', to: 'node2', label: 'slots 5461-10922' },
    { from: 'ring', to: 'node3', label: 'slots 10923-16383' },
    { from: 'node1', to: 'rep1', label: 'async replication' },
    { from: 'node2', to: 'rep2', label: 'async replication' },
    { from: 'node3', to: 'rep3', label: 'async replication' },
    { from: 'sentinel', to: 'node1', label: 'monitor' },
    { from: 'sentinel', to: 'node2', label: 'monitor' },
    { from: 'sentinel', to: 'node3', label: 'monitor' },
  ]}
  height={440}
/>

## 10. Real Production Incident

<Callout type="incident">
**GitHub — Redis Cluster Outage During Database Migration, November 2018**

GitHub's Redis cluster for Sidekiq job queues and session storage experienced a 42-second outage during a planned PostgreSQL migration. The Redis cluster had 3 master nodes in the US East region. A misconfigured failover timeout caused all 3 masters to mark each other as failed simultaneously (split-brain scenario).

**Impact**: 42 seconds of complete cache unavailability. All Sidekiq jobs failed (no queue availability). Users were logged out (session cache unreachable). Pushes, PRs, and issues were all affected.

**Root cause**: The \`cluster-node-timeout\` was set too low (5 seconds). During a brief network latency spike from the database migration (increased network traffic), Redis Cluster's gossip protocol timed out. All masters believed the others were dead and attempted failover, creating a split-brain.

**Fix**: Increased \`cluster-node-timeout\` to 15 seconds. Added network QoS to separate Redis cluster traffic from database migration traffic. Implemented a circuit breaker pattern: if Redis is unreachable, serve stale data from local cache instead of failing.

**Lesson**: Redis Cluster timeout values must account for worst-case network latency, not average. Set \`cluster-node-timeout\` to at least 3× expected p99 network latency between nodes.
</Callout>

## 11. Production Implementation

### ❌ Naive — Single Redis (no HA, no sharding)
\`\`\`typescript
const redis = createClient({ url: "redis://localhost:6379" });
await redis.connect();

// Everything goes to one node — single point of failure
// Memory limit of one machine (64GB max)
// No failover if server crashes
\`\`\`

### ✅ Better — Redis Cluster with Client-Side Sharding
\`\`\`typescript
const cluster = createClient({
  cluster: {
    rootNodes: [
      { url: "redis://master-a:6379" },
      { url: "redis://master-b:6379" },
      { url: "redis://master-c:6379" },
    ],
  },
});

await cluster.connect();

// Multi-get with hash tags to ensure same slot
const keys = ["user:{123}", "user:{456}", "user:{789}"];
const results = await cluster.mGet(keys); // All in same slot via hash tag
\`\`\`

### 🚀 Production — Resilient Cache Layer with Circuit Breaker
\`\`\`typescript
class ResilientDistributedCache {
  private localCache = new Map<string, { value: string; expiresAt: number }>();
  private circuitOpen = false;
  private failureCount = 0;
  private circuitOpenUntil = 0;

  constructor(
    private redis: RedisClientType,
    private circuitThreshold: number = 5,
    private circuitResetMs: number = 30000
  ) {}

  async get(key: string): Promise<string | null> {
    // Try local cache first
    const local = this.localCache.get(key);
    if (local && Date.now() < local.expiresAt) return local.value;

    // Circuit breaker
    if (this.circuitOpen) {
      if (Date.now() > this.circuitOpenUntil) {
        this.circuitOpen = false;
        this.failureCount = 0;
      } else {
        return null; // Circuit open — serve stale or miss
      }
    }

    try {
      const value = await this.redis.get(key);
      if (value !== null) {
        this.localCache.set(key, { value, expiresAt: Date.now() + 5000 });
      }
      this.failureCount = 0; // Reset on success
      return value;
    } catch (err) {
      this.failureCount++;
      if (this.failureCount >= this.circuitThreshold) {
        this.circuitOpen = true;
        this.circuitOpenUntil = Date.now() + this.circuitResetMs;
        console.error(\`Redis circuit opened for \${this.circuitResetMs}ms\`);
      }
      return null;
    }
  }

  // Pipeline for batch operations
  async getBatch(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    const pipeline = this.redis.multi();
    keys.forEach(k => pipeline.get(k));
    const results = await pipeline.exec();
    return results.map((r: any) => r?.[1] ?? null);
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **Twitter**: Uses Redis extensively — timeline cache (pre-computed lists), rate limiting (sorted sets with sliding window), real-time analytics (hyperloglogs). Thousands of Redis instances. Migrated from Memcached to Redis for richer data structures.
- **Meta (Facebook)**: Memcached at massive scale — thousands of servers, trillions of requests/day. Developed **mcrouter** (Memcached routing proxy) for connection pooling, failover, and shadow testing. Also built **TAO** (custom graph cache on top of Memcached).
- **Pinterest**: Migrated from Memcached to Redis (40% latency reduction, richer data types). Uses Redis Cluster for feed caching, session storage, and real-time notifications. 100+ Redis nodes.
- **GitHub**: Redis for Sidekiq job queues (lists), session storage (hashes with TTL), and GitHub Actions coordination (streams). Redis Cluster with Sentinel for HA.

## 13. Interview Playbook

**Q: "Compare Redis and Memcached. When would you choose each?"**
→ Open with: both are in-memory key-value stores, but Redis is feature-rich and Memcached is simple and fast.
→ Cover: Redis has data structures (lists, sets, sorted sets, streams), persistence (RDB/AOF), replication, and clustering. Memcached is multithreaded (higher throughput for simple ops), slab-based memory, no persistence. Use Redis for sessions, queues, leaderboards. Use Memcached for simple key-value caching where data loss is acceptable.
→ Depth signal: Memcached's slab allocator can cause memory waste if object sizes don't fit into the slab classes. Redis uses jemalloc which is more memory-efficient. Redis's single-threaded model means one slow command (KEYS *) blocks everything — always use SCAN.
→ Avoid: saying Memcached is strictly faster — Redis pipelining + Lua scripting can match or exceed Memcached throughput for complex operations.

**Q: "How does consistent hashing work and how does it minimize rehashing?"**
→ Open with: consistent hashing places keys and nodes on a ring. A key is assigned to the first node clockwise from its position.
→ Cover: When a node is added, only keys between the new node and its predecessor move. On average, K/N keys move (K=total keys, N=nodes). Modulo hashing would move ALL keys. Virtual nodes (multiple positions per physical node) improve distribution balance.
→ Depth signal: Redis Cluster doesn't use consistent hashing — it uses 16384 hash slots. Each server owns a range. Adding a node involves migrating slots. This provides guaranteed even distribution (unlike consistent hashing which is probabilistic).
→ Avoid: saying consistent hashing is "perfect" — it can cause 20% imbalance without virtual nodes.

**Q: "How does Redis Sentinel handle failover?"**
→ Open with: Sentinel is a separate process that monitors Redis masters and replicas, provides automatic failover.
→ Cover: Three Sentinels monitor the master. If master is unreachable (PING timeout), one Sentinel marks it as SDOWN (subjectively down). If multiple Sentinels agree (quorum), master is marked ODOWN (objectively down). Sentinels vote on a leader. Leader promotes a replica to master. Clients are notified via pub/sub.
→ Depth signal: Failover time = detection (3 × \`down-after-milliseconds\`, default 30s) + election + promotion + client reconnection. Total: ~30-60s during which no writes are accepted.
→ Avoid: saying Redis Sentinel is fast — it's designed for safety, not speed.

## 14. Concept Check Quiz

**Q1:** What does Redis Cluster use to determine which node stores a key?
- A) Consistent hashing ring
- B) CRC16(key) % 16384 hash slot
- C) Modulo by number of nodes
- D) Random assignment
**Answer: B** — Redis Cluster uses 16384 hash slots. Each key's slot = CRC16(key) % 16384. Each node owns a contiguous range of slots. Consistent hashing is used in client-side sharding (e.g., Memcached with twemproxy).

**Q2:** How much data moves when a node is added to a consistent hash ring with 10 nodes?
- A) 100% of keys
- B) 50% of keys
- C) ~10% of keys (K/N)
- D) 0% of keys
**Answer: C** — In consistent hashing, only keys between the new node and its predecessor move. Expected: K/N keys (10% for 10 nodes). Modulo hashing would move 100%.

**Q3:** What is the primary advantage of Memcached over Redis?
- A) Persistence
- B) Data structures
- C) Multithreaded (better throughput for simple ops)
- D) Replication
**Answer: C** — Memcached is multithreaded and can utilize multiple CPU cores for higher throughput on simple get/set operations. Redis is single-threaded (though non-blocking IO helps).

**Q4:** Which Redis data structure is best for a real-time leaderboard?
- A) List
- B) Hash
- C) Sorted Set
- D) Stream
**Answer: C** — Sorted sets (ZADD/INCRBY scores, ZREVRANGE for top players) provide O(log N) operations for leaderboards. Lists are for queues. Hashes for objects. Streams for event logs.

**Q5:** What happens during a Memcached restart?
- A) Data is recovered from AOF
- B) Data is recovered from RDB snapshot
- C) All data is lost
- D) Data is replicated from replicas
**Answer: C** — Memcached has no persistence. All data is lost on restart. Mitigation: use Redis with AOF/RDB for persistent caching, or implement client-side cache warming after restart.

## 15. Next Steps

- **Cache Invalidation Strategies (04-05)** — TTL, event-driven, write-through, and version-based invalidation.
- **CDN Fundamentals (04-06)** — Global content delivery at edge.
- **CDN Cache Invalidation & Purging (04-08)** — How to remove content from CDN cache before TTL expiry.`,
    estimatedMin: 16,
    difficulty: "ADVANCED" as const,
    companies: ["Twitter", "Meta", "GitHub", "Pinterest", "Redis"],
    tags: ["Redis", "Memcached", "distributed-caching", "consistent-hashing", "Redis-Cluster", "Sentinel"],
  },

  {
    id: "lesson-04-05",
    slug: "caching-cdns-05-cache-invalidation-strategies",
    title: "Cache Invalidation Strategies",
    content: `## 0. Mental Model

> Cache invalidation is like **changing the price tag on a shelf**. You updated the price in the system (database), but the physical price tag on the shelf (cache) still shows the old price. Shoppers (users) see the old price. You need a way to either: (1) set a timer to update all tags every hour (TTL), (2) immediately update the tag when the price changes (write-through), (3) broadcast "price tags need updating" over the PA system (event-driven), or (4) include a version number in the price tag so shoppers know if it's outdated (version-based).

## 1. Quick Summary

- **TTL (Time-To-Live)**: Simplest invalidation — cache entry expires after a fixed time. Stale data within the window. Hard to set optimal TTL. Jitter prevents herd expiry.
- **Write-Through Invalidation**: On write, update or delete the cache entry synchronously. Strongest consistency. Higher write latency.
- **Event-Driven Invalidation**: Publish invalidation events (via Kafka, Redis pub/sub) on data change. Multiple cache consumers can listen. Eventual consistency — lag between write and invalidation.
- **Version-Based Invalidation**: Cache key includes version (e.g., \`product:123:v2\`). New version = new cache key. Old version naturally evicted. Simple but clients must know the version.
- **Stale-While-Revalidate**: Serve stale data while fetching fresh version in background. Best for preventing cache stampede on invalidation.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **TTL** | Time-To-Live — fixed duration before automatic eviction |
| **Invalidation** | Act of removing/updating cached data when source changes |
| **Write-Through Invalidation** | Update cache atomically with database write |
| **Event-Driven Invalidation** | Publish events when data changes; consumers evict cache |
| **Version-Based Invalidation** | Include version in cache key; new version = new entry |
| **Stale-While-Revalidate** | Serve stale data while fetching fresh version async |
| **Cache Tagging** | Tag cache entries by entity; invalidate all entries with a tag |
| **Propagation Delay** | Time for invalidation to reach all cache nodes |
| **Cache Stampede** | Multiple concurrent misses triggering database load spike |
| **Jitter** | Random offset added to TTL to scatter expiration times |
| **Ghost Entry** | Deleted cache entry that still triggers a write-behind flush |

## 3. The Problem Without It

- **Stale data costs money**: E-commerce site caches product prices with 1-hour TTL. Admin updates price from $100 to $50 for a flash sale. Customers see $100 for up to 1 hour → lost sales. With no invalidation: 1 hour of incorrect pricing.
- **Security risk**: User changes password. Session cache still has old hash for 5 minutes (TTL). Attacker with stolen session token can still access account for 5 minutes.
- **Content compliance**: GDPR deletion request processed, but CDN cached the user's photo with 24-hour TTL. Photo is available for 24 hours after deletion → legal violation.
- **Database avalanche on TTL expiry**: 1000 product cache entries all set with 1-hour TTL at midnight. At 1 AM, all 1000 expire simultaneously → 1000 database queries → DB overload → cascading failure.
- **Manual invalidation doesn't scale**: 100 microservices × 50 cached endpoints = 5000 invalidation rules. Engineers manually forget to invalidate cached search results after price update → stale search for 2 hours.

## 4. How It Works — Core Mechanics

### TTL-Based Invalidation
\`\`\`
SET product:123 value EX 600   → expires after 600 seconds
TTL product:123               → returns 597 (seconds remaining)

Probabilistic TTL (jitter to prevent herd expiry):
  baseTTL = 600
  jitter = random(-60, +60)   → TTL = 540-660 seconds
  Each entry expires at a slightly different time
\`\`\`

### Write-Through Invalidation — Two Approaches
\`\`\`typescript
// Approach 1: Delete on write (simpler, always correct)
async function updatePrice(id: string, price: number) {
  await db.products.update({ where: { id }, data: { price } });
  await redis.del(\`product:\${id}\`); // Invalidate — next read fetches fresh
  // Also invalidate related caches
  await redis.del(\`search:\${id}\`);
  await redis.del(\`category:\${product.categoryId}\`);
}

// Approach 2: Update on write (faster reads, but what if cache update fails?)
async function updatePrice(id: string, price: number) {
  const product = await db.products.update({ where: { id }, data: { price } });
  await redis.setEx(\`product:\${id}\`, 600, JSON.stringify(product));
  return product;
}
// Problem: if redis.setEx fails, cache still has old value
// Safer: delete (miss = fresh fetch) vs update (stale on write failure)
\`\`\`

### Event-Driven Invalidation with Cache Tags
\`\`\`typescript
// Publisher (Product Service)
async function updateProduct(id: string, data: Partial<Product>) {
  const product = await db.products.update({ where: { id }, data });
  // Publish invalidation events
  await queue.publish("product.updated", {
    productId: id,
    categoryId: product.categoryId,
    storeId: product.storeId,
    timestamp: Date.now(),
  });
}

// Consumer (Cache Service)
queue.subscribe("product.updated", async (event) => {
  const tags = [
    \`product:\${event.productId}\`,
    \`category:\${event.categoryId}\`,
    \`store:\${event.storeId}\`,
  ];
  for (const tag of tags) {
    // Find all cache keys with this tag
    const keys = await redis.sMembers(\`tag:\${tag}\`);
    if (keys.length > 0) await redis.del(keys);
    await redis.del(\`tag:\${tag}\`);
  }
});
\`\`\`

### Version-Based Invalidation
\`\`\`typescript
// When product is updated, increment version
const version = await redis.incr(\`version:product:\${id}\`);
const cacheKey = \`product:\${id}:v\${version}\`;
await redis.setEx(cacheKey, 86400, JSON.stringify(product));

// Client always requests with latest version
// If old version: miss → fetch fresh
// Old cache keys naturally expire via TTL

// Problem: clients must know the current version
// Solution: store latest version in a separate key
await redis.set(\`current-version:product:\${id}\`, version);
\`\`\`

## 5. Variants & Flavors

| Strategy | Consistency | Write Latency | Read Latency | Complexity | Data Loss Risk | Best For |
|----------|-------------|--------------|-------------|------------|----------------|----------|----------|
| **TTL Only** | Eventual (TTL window) | 0 | Cache read | Low | Stale reads | News, recommendations |
| **Write-Through (Delete)** | Strong (immediate miss) | DB write + 1ms (del) | Cache read (miss → DB) | Low | None | Most general use |
| **Write-Through (Update)** | Strong (immediate update) | DB write + 2ms (set) | Cache read (always hit) | Low | Stale on write failure | Hot keys always accessed |
| **Event-Driven** | Eventual (propagation) | DB write + event pub | Cache read | High | Stale on event loss | Microservices, multiple caches |
| **Version-Based** | Strong (per version) | DB write + INC + SET | Cache read + version check | Medium | Stale on version mismatch | CMS, config, static assets |

## 6. Performance Characteristics

| Scenario | TTL (300s) | Write-Through | Event-Driven | Version-Based |
|---------|-----------|---------------|-------------|---------------|
| Read-after-write consistency window | Up to 300s | 0 (immediate) | 50-500ms | 0 |
| Write latency overhead | 0 | +1-2ms | +0.5ms (event) | +2ms (version + set) |
| Read throughput | 100% cache hits | 100% (delete: 1 miss per write) | 100% | 99.9% (miss if version mismatch) |
| Cache miss rate | TTL-dependent | 1 miss per write | High on write (batch invalidate) | Depends on version update frequency |
| Network overhead | 0 | 1 extra operation/write | Event message + keys scan | Version check + set |
| Implementation complexity | 1 line (setEx) | 2 lines (update + del) | Event schema, consumer, tagging | Version store + client logic |

**When numbers degrade**: Event-driven invalidation can cascade — a category update invalidates 10K products → 10K cache misses → DB spike. Mitigation: use staggered invalidation or TTL as safety net. Version-based invalidation: if version check itself is cached, you're back to TTL staleness.

## 7. Failure Modes

- **Invalidation Cascade**: Updating a category name triggers invalidation for ALL products in that category (100K entries). All 100K cache misses hit DB simultaneously. *Mitigation*: Stagger invalidation over time, use TTL as safety net, warm cache proactively.
- **Lost Invalidation Event**: Kafka message is published but consumer is down (restart, deploy). Invalidation never happens → stale cache for TTL duration. *Mitigation*: Use dead letter queue + retry, or set TTL as maximum staleness bound.
- **Orphaned Tags**: Cache entries are invalidated, but tag set still references deleted keys → stale tag metadata. *Mitigation*: Use tagged cache entries with embedded expiry — \`SADD\` with \`EXPIRE\` on the tag key.
- **Write-Order Inconsistency**: Event 1 (update price → $10) arrives at cache AFTER Event 2 (update price → $20) due to network delay. Cache shows stale $10. *Mitigation*: Use timestamp-based ordering — discard events with older timestamps. Or use write-through and bypass events for critical data.
- **Cache Churn on Write-Through Delete**: For frequently updated data (stock price every second), write-through delete causes 100% miss rate on every read. *Mitigation*: Use write-through UPDATE (not delete) for frequently written hot keys.

## 8. Decision Framework

\`\`\`
┌─ Is stale data acceptable for a short period?
│   ├─ Yes (30-300s) → TTL only (simplest)
│   └─ No → Need active invalidation
├─ Single service updates and reads the data?
│   ├─ Yes → Write-Through (delete or update cache)
│   └─ No → Event-Driven (publish invalidation events)
├─ Multiple services cache the same data?
│   ├─ Yes → Event-Driven (every cache service subscribes)
│   └─ No → Write-Through
├─ Data has clear versioning (CMS, config)?
│   ├─ Yes → Version-Based (cache forever, new version = new key)
│   └─ No → TTL or Write-Through
└─ Can you accept eventual consistency within bounds?
    ├─ Yes → TTL + Event-Driven (best of both)
    └─ No → Write-Through
\`\`\`

| Scenario | Best Strategy | Rationale |
|----------|--------------|-----------|
| User profile (name, email) | Write-Through (update) | Read frequently, write rarely, consistency matters |
| Product catalog prices | Write-Through (delete) | Update occasionally, delete to ensure next read is fresh |
| Search results | TTL + Event-Driven | TTL=5min safety net, event on price/index change for faster refresh |
| News feed | TTL (30s) | Staleness acceptable, no need to invalidate every tweet |
| CMS page content | Version-Based | Each edit = new version, CDN caches forever with version in URL |
| Config/feature flags | Version-Based | Frequent polling, version check avoids cache miss overhead |
| Stock ticker prices | No cache (or TTL=1s) | Too volatile, staleness has financial impact |

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 80, y: 60 },
    { id: 'app', label: 'App Server', type: 'app', x: 300, y: 60 },
    { id: 'cache', label: 'Redis Cache', type: 'cache', x: 300, y: 200 },
    { id: 'db', label: 'PostgreSQL', type: 'db', x: 500, y: 60 },
    { id: 'queue', label: 'Kafka (Events)', type: 'queue', x: 500, y: 200 },
    { id: 'consumer', label: 'Cache Consumer', type: 'worker', x: 500, y: 340 },
    { id: 'api', label: 'API Gateway', type: 'gateway', x: 80, y: 200 },
  ]}
  edges={[
    { from: 'client', to: 'app', label: 'Write: update profile' },
    { from: 'app', to: 'db', label: '1. Update DB' },
    { from: 'app', to: 'cache', label: '2. Delete cache key', dashed: true },
    { from: 'app', to: 'queue', label: '3. Publish event' },
    { from: 'queue', to: 'consumer', label: '4. Consume event' },
    { from: 'consumer', to: 'cache', label: '5. Invalidate related keys', dashed: true },
    { from: 'client', to: 'api', label: 'Read: get profile' },
    { from: 'api', to: 'cache', label: 'Check cache' },
    { from: 'cache', to: 'db', label: 'Miss → fetch (fresh)' },
  ]}
  height={440}
/>

## 10. Real Production Incident

<Callout type="incident">
**Stripe — Event-Driven Invalidation Cascade, March 2020**

Stripe's API response cache used event-driven invalidation. When a customer's default payment method changed, an invalidation event was published. The consumer evicted ALL cached responses containing that customer's data. During a planned upgrade of the payment methods service, 200K customer records were migrated, each triggering invalidation events. The Kafka topic backlog grew to 5M undelivered messages.

**Impact**: Cache hit rate dropped from 95% to 30% for 45 minutes. API response times went from 5ms to 200ms. Some customers hit rate limits (429 errors) due to the increased database load.

**Root cause**: Flat invalidation strategy — any event invalidated ALL cache entries for a customer. During bulk migration, every record change generated an event, and each event wiped the entire cache for that customer.

**Fix**: Implemented **tagged invalidation with granularity levels** — separate tags for \`customer:{id}:profile\`, \`customer:{id}:payment-methods\`, \`customer:{id}:invoices\`. An event for payment method change only invalidates the payment-methods tag. Also added **invalidation batching** — deduplicate events within a 1-second window.

**Lesson**: Event-driven invalidation must use granular cache tags, not flat entity-level keys. Batch and deduplicate invalidation events during bulk operations. Always keep TTL as a safety net — never rely on events alone.
</Callout>

## 11. Production Implementation

### ❌ Naive — TTL Only (stale window too long)
\`\`\`typescript
// Product cache — TTL only, no invalidation
await redis.setEx(\`product:\${id}\`, 3600, JSON.stringify(product));
// TTL = 1 hour. Price change takes up to 1 hour to reflect.
// Flash sale disaster: customers see old price for 1 hour.
\`\`\`

### ✅ Better — Write-Through Delete + TTL Safety Net
\`\`\`typescript
class WriteThroughCache {
  private defaultTTL = 600; // 10 min TTL as safety net

  async invalidateOnWrite(key: string): Promise<void> {
    await redis.del(key);
  }

  async getOrFetch<T>(key: string, fetch: () => Promise<T>): Promise<T> {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    const value = await fetch();
    await redis.setEx(key, this.defaultTTL, JSON.stringify(value));
    return value;
  }
}
\`\`\`

### 🚀 Production — Tagged Cache with Deduped Event Invalidation
\`\`\`typescript
class TaggedCache {
  constructor(private redis: RedisClientType) {}

  async set(key: string, value: any, tags: string[], ttl: number): Promise<void> {
    await this.redis.setEx(key, ttl, JSON.stringify(value));
    // Associate key with each tag
    for (const tag of tags) {
      await this.redis.sAdd(\`tag:\${tag}\`, key);
      await this.redis.expire(\`tag:\${tag}\`, ttl + 3600); // Keep tag longer than entries
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    const keys = await this.redis.sMembers(\`tag:\${tag}\`);
    if (keys.length === 0) return 0;
    await this.redis.del(keys);
    await this.redis.del(\`tag:\${tag}\`); // Clear tag set
    return keys.length;
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let total = 0;
    // Dedup keys across tags to avoid double invalidations
    const allKeys = new Set<string>();
    for (const tag of tags) {
      const keys = await this.redis.sMembers(\`tag:\${tag}\`);
      keys.forEach(k => allKeys.add(k));
      await this.redis.del(\`tag:\${tag}\`);
    }
    if (allKeys.size > 0) await this.redis.del([...allKeys]);
    return allKeys.size;
  }

  // Dedup invalidation events: buffer events for 1 second
  private pendingTags = new Set<string>();
  private flushTimeout: NodeJS.Timeout | null = null;

  scheduleInvalidation(tags: string[]): void {
    tags.forEach(t => this.pendingTags.add(t));
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), 1000);
    }
  }

  private async flush(): Promise<void> {
    const tags = [...this.pendingTags];
    this.pendingTags.clear();
    this.flushTimeout = null;
    await this.invalidateByTags(tags);
  }
}

// Usage
const cache = new TaggedCache(redis);

// On product read
await cache.set(\`product:\${id}\`, product, [\`product:\${id}\`, \`category:\${catId}\`, \`store:\${storeId}\`], 600);

// On product update
cache.scheduleInvalidation([\`product:\${id}\`, \`category:\${catId}\`, \`store:\${storeId}\`]);

// On read: check cache
const product = await cache.get(\`product:\${id}\`);
\`\`\`

## 12. Real Company Deep Dives

- **Stripe**: Event-driven invalidation with granular tags per entity type. Each cached response is tagged with entity IDs (customer, payment method, invoice). Bulk operations batch and dedupe events within 1-second windows. TTL safety net of 5 minutes.
- **Netflix EVCache**: Write-Through + TTL hybrid. When the source of truth (Cassandra) is updated, EVCache is explicitly invalidated. But each entry also has a TTL (typically 1 hour) as a safety net. Netflix calls this "optimistic invalidation."
- **Shopify**: Tag-based invalidation with Fastly CDN. Each store's data is tagged with \`store:{id}\`. On theme deployment or product update, the tag is purged across all CDN PoPs via Fastly's instant purge API (<150ms propagation to 95% of PoPs).
- **GitHub**: Cache-Aside with TTL (5 min for most data) + webhook-based invalidation. When a push event arrives via webhook, the repo cache for that specific SHA is invalidated. The "stale-while-revalidate" pattern is used for commit data: serve stale for up to 30s while fetching fresh.

## 13. Interview Playbook

**Q: "What are the main cache invalidation strategies and their tradeoffs?"**
→ Open with: TTL (simple, stale window), Write-Through (strong consistency, higher write latency), Event-Driven (scalable, eventual consistency), Version-Based (always fresh, complex client).
→ Cover: TTL is the safety net for all strategies — always set one even if you use events. Write-Through delete is simpler than write-through update (avoids stale-on-failure). Event-driven needs dedup and batching. Version-based works best for immutable/versioned content.
→ Depth signal: Combine strategies — TTL as maximum staleness bound + event-driven for faster refresh. Use **stale-while-revalidate** to serve stale during refresh to avoid miss spikes.
→ Avoid: saying "just use TTL" — in production, you ALWAYS need active invalidation PLUS TTL.

**Q: "How do you handle cache invalidation in a microservice architecture?"**
→ Open with: microservices complicate invalidation because multiple services may cache the same data independently.
→ Cover: Use event-driven invalidation — the service that owns the data publishes "entity.updated" events. All cache services subscribe. Use cache tags to avoid over-invalidation. Handle message ordering with timestamps.
→ Depth signal: The **outbox pattern** ensures events are published exactly once — write to an outbox table in the same DB transaction, then a separate process reads and publishes. This prevents "cache not invalidated because the event publish failed."
→ Avoid: using HTTP calls from service A to invalidate service B's cache — that's tight coupling and unreliable. Use events.

**Q: "What is cache tagging and how does it help with bulk invalidation?"**
→ Open with: cache tagging associates cache entries with metadata tags. Invalidating a tag removes all entries with that tag.
→ Cover: Tags represent logical groupings — "all entries for product 123", "all entries in category electronics". When a category attribute changes, invalidating \`tag:category:electronics\` removes all affected entries.
→ Depth signal: Redis SET of keys per tag. On invalidation: \`SMEMBERS tag:X\` → \`DEL [keys]\` → \`DEL tag:X\`. For CDNs: Fastly/Cloudflare support surrogate keys/cache tags natively. Keep tag metadata alive with EXPIRE longer than the entries.
→ Avoid: saying tags solve everything — an invalidation storm can happen if a tag groups 100K entries. Use staggered invalidation or sub-tags.

## 14. Concept Check Quiz

**Q1:** Which invalidation strategy has the strongest consistency guarantee?
- A) TTL-based
- B) Event-driven
- C) Write-Through (delete on write)
- D) Version-based
**Answer: C** — Write-Through delete ensures the next read after a write triggers a cache miss and fetches fresh data from the database. TTL has a stale window. Event-driven has propagation delay. Version-based depends on version freshness.

**Q2:** What is the primary risk of event-driven invalidation?
- A) High write latency
- B) Lost invalidation events leading to stale cache
- C) Cache stampede
- D) Memory overhead
**Answer: B** — If the invalidation event is lost (consumer down, queue full), the cache remains stale until TTL expiry. Mitigation: use dead letter queues + retry, and always set TTL as a maximum staleness bound.

**Q3:** An e-commerce site has products tagged by category. A category name changes. What is the risk?
- A) Cache stampede on the category key
- B) Invalidation cascade — one category tag invalidates all products
- C) TTL too short
- D) Write conflict
**Answer: B** — Invalidating the category tag removes ALL product entries in that category from cache. If the category has 10K products, all 10K will miss on next access.

**Q4:** What is the jitter technique in TTL-based caching?
- A) Randomly skip cache for some requests
- B) Add random offset to TTL to prevent herd expiry
- C) Randomly select eviction policy
- D) Random cache key generation
**Answer: B** — Adding random jitter (±10-20% of base TTL) ensures cache entries expire at different times, preventing simultaneous mass expirations.

**Q5:** When should you use version-based invalidation?
- A) Frequently updated stock prices
- B) CMS content with clear versioning and immutable per version
- C) Real-time leaderboard
- D) Web session storage
**Answer: B** — Version-based works well for content where each change creates a new version (CMS pages, static assets, config files). Old versions naturally expire. Not suitable for rapidly changing data or data with frequent but tiny updates.

## 15. Next Steps

- **CDN Fundamentals (04-06)** — Global content delivery at edge with cache invalidation at massive scale.
- **CDN Cache Invalidation & Purging (04-08)** — How CDNs handle purge propagation, surrogate keys, and versioned URLs.
- **Caching Patterns (04-03)** — Cache-Aside, Read-Through, Write-Through, Write-Back patterns.
- **Distributed Caching (04-04)** — Redis Cluster, Memcached, consistent hashing.`,
    estimatedMin: 15,
    difficulty: "ADVANCED" as const,
    companies: ["Stripe", "Netflix", "Shopify", "GitHub", "Amazon"],
    tags: ["cache-invalidation", "TTL", "write-through", "event-driven", "versioning", "cache-tags"],
  },

  {
    id: "lesson-04-06",
    slug: "caching-cdns-06-content-delivery-network-cdn",
    title: "Content Delivery Network (CDN)",
    content: `## 0. Mental Model

> A CDN is like a **chain of local bakeries instead of one central bakery**. If everyone in the world buys bread from one bakery in New York, the bread arrives stale (high latency). Instead, a CDN bakes bread at hundreds of local bakeries (PoPs) worldwide. When you order bread in Tokyo, the local Tokyo bakery serves it fresh in 5 minutes (5ms) instead of waiting 8 hours (200ms) for a New York shipment.

## 1. Quick Summary

- **CDN (Content Delivery Network)** is a globally distributed network of proxy servers (PoPs) that serves content from the nearest edge location to reduce latency.
- **100ms+ cross-continental latency** drops to <10ms by serving from the nearest PoP (typically <50km from user).
- **Origin offload**: CDN absorbs 90-99% of traffic — a single origin server handling 10K RPS can scale to 1M RPS with CDN.
- **Routing** is done via **Anycast** (same IP announced from multiple PoPs, BGP routes to nearest) or **DNS-based** (different IP per PoP region).
- **Cache control** via HTTP headers: \`Cache-Control: public, max-age=31536000, immutable\` for versioned assets; \`s-maxage\` for shared cache TTL.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **PoP (Point of Presence)** | Data center where CDN edge servers are located |
| **Origin Server** | Source of truth for content (your web server or S3 bucket) |
| **Anycast** | Same IP advertised from multiple PoPs — traffic routes to nearest |
| **DNS-based Routing** | DNS returns different IP per geographic region |
| **Cache Hit Ratio** | % of requests served from CDN cache (target: >90%) |
| **Origin Shield** | Dedicated intermediate cache layer to protect origin from cache miss storms |
| **Edge Server** | CDN server at PoP that caches and serves content |
| **s-maxage** | \`Cache-Control\` directive for shared caches (CDN), different from \`max-age\` (browser) |
| **Purge** | Active removal of cached content before TTL expiry |
| **Stale-While-Revalidate** | Serve stale content while fetching fresh version in background |
| **Pre-warming** | Proactively loading content into CDN cache before expected traffic spike |

## 3. The Problem Without It

- **Latency penalty**: A user in Tokyo accessing a server in Virginia (10000km) → minimum 150ms round trip (light speed limit). TCP handshake takes 3 round trips = 450ms before any data flows. With CDN PoP in Tokyo: <10ms.
- **Origin overload**: 10M concurrent users during a Super Bowl ad. Without CDN: origin must handle 10M req/s → 1000 servers needed. With CDN: 10K req/s to origin, rest served from edge.
- **DDoS vulnerability**: Without CDN, a 1 Tbps DDoS attack hits your origin directly — no cloud provider's DDoS protection can absorb that at a single IP. CDN's 320+ PoPs distribute and absorb the attack.
- **Bandwidth cost**: Egress bandwidth from cloud providers costs $0.08-0.12/GB. CDN bandwidth costs $0.01-0.04/GB. For 1 PB/month: cloud = $100K, CDN = $20K.
- **TCP connection overhead**: Each connection requires a TCP handshake + TLS negotiation (2-3 round trips). CDN keeps persistent connections to origin (connection multiplexing), reducing overhead.

## 4. How It Works — Core Mechanics

### CDN Request Flow (Anycast Routing)

\`\`\`
User in Tokyo: http://cdn.example.com/images/logo.png
                                      |
                    DNS resolves to 203.0.113.1 (Anycast)
                    (Same IP announced from Tokyo, Frankfurt, NYC)
                    BGP routing sends traffic to NEAREST PoP
                                      |
                    ┌─────────────────────────────────────────┐
                    │  Tokyo PoP (CloudFront Edge - NRT)      │
                    │                                         │
                    │  1. Check local cache for /images/logo.png│
                    │  2a. HIT → Return (5ms)                 │
                    │  2b. MISS → Forward to origin (Virginia) │
                    │  3. Cache response based on Cache-Control│
                    │  4. Return to user (cached for next req) │
                    └─────────────────────────────────────────┘
\`\`\`

### Cache Keys and Cache-Control

\`\`\`typescript
// Every CDN-cached URL has a cache key
// Default: scheme + host + path + query params
// https://cdn.example.com/images/logo.png?v=2

// Custom cache key configuration (CloudFront):
// Include specific query params: ?v=2 → different entries per version
// Include Accept-Language header → different entries per locale
// Exclude tracking params: ?utm_source=... → same cache entry

// Cache-Control directives
Cache-Control: public, max-age=31536000, immutable  // Versioned assets (cache forever)
Cache-Control: public, max-age=60, s-maxage=3600     // Browser: 1min, CDN: 1hr
Cache-Control: private, max-age=0                    // No CDN caching (auth pages)
Cache-Control: no-cache                              // Revalidate with origin on each request
\`\`\`

### Edge-to-Origin Protocol Optimizations

\`\`\`
Without CDN:           Client ────[slow TCP + TLS]─── Origin
                       (3 RTT for TCP handshake + TLS)

With CDN:              Client ──[fast local TCP]─── Edge PoP
                                        │
                        Edge PoP ──[persistent TCP keepalive]─── Origin
                        (1 RTT for origin, shared across many clients)

Result: Client sees 1 RTT to edge instead of 3 RTT to origin
Origin sees 1 TCP connection per edge server instead of 1 per client
\`\`\`

## 5. Variants & Flavors

| CDN Provider | PoPs | Routing | Edge Compute | DDoS Protection | Pricing Model |
|-------------|------|---------|-------------|-----------------|---------------|
| **CloudFront** (AWS) | 450+ | DNS + Regional Edge Caches | Lambda@Edge, CloudFront Functions | AWS Shield Standard | Pay per request + data transfer |
| **Cloudflare** | 320+ | Anycast | Workers, Pages | Built-in (1.5 Tbps+ capacity) | Flat rate / enterprise |
| **Fastly** | 70+ | Anycast | Compute@Edge (Wasm) | Built-in | Pay per request + bandwidth |
| **Akamai** | 4000+ | DNS + Akamai mapping | EdgeWorkers | Prolexic (scrubbing center) | Enterprise contract |
| **Google Cloud CDN** | 150+ | Anycast | Cloud Functions (via LB) | Cloud Armor | Pay per request + bandwidth |
| **Azure CDN** | 130+ | DNS (Verizon/Akamai/Standard) | Azure Functions (via LB) | Azure DDoS Protection | Pay per request |

## 6. Performance Characteristics

| Metric | Without CDN | With CDN (global) | With CDN (regional) |
|--------|------------|-------------------|---------------------|
| P50 latency (US to US) | 30ms | 5-10ms | 5-10ms |
| P50 latency (Asia to US East) | 200ms | 5-20ms | 50-100ms (nearest regional) |
| P99 latency | 500ms+ | 50ms | 100ms |
| Cache hit rate (static) | N/A | 90-99% | 95%+ |
| Cache hit rate (dynamic) | N/A | 40-60% | 50-70% |
| Origin requests reduction | 0% | 90-99% | 80-95% |
| TLS handshake time | 100-300ms | 5-20ms (edge termination) | 5-20ms |
| DDoS absorption | N/A | 1 Tbps+ (distributed) | Varies by provider |

**When numbers degrade**: Cache hit rate drops for dynamic/personalized content (dashboards, user settings). Cache miss storms after a global purge. Slow DNS propagation when changing CDN configuration.

## 7. Failure Modes

- **Cache Miss Storm After Purge**: Deploying new website version purges entire CDN cache → all users hit origin → origin overload (5x traffic). *Mitigation*: Staggered purging by region, pre-warming (load popular URLs into cache before deploy), or use versioned URLs (never purge).
- **DDoS Via Cache Busting**: Attacker requests unique URLs (?cache_buster=1, ?cache_buster=2, ...) → each request is a cache miss → all hit origin. *Mitigation*: CDN WAF rules to drop repeated cache-busting patterns, rate limiting per IP.
- **Stale Content Propagation**: CDN A/B test shows variant B to user, but some PoPs still serve variant A (purge propagation delay). *Mitigation*: Use cache keys that include experiment variant, set short TTLs for A/B test data.
- **Origin Shield Cache Miss Cascade**: Multiple PoPs simultaneously miss on the same content and all fetch from origin. *Mitigation*: Enable Origin Shield (dedicated intermediate cache layer that coalesces requests from multiple PoPs).

## 8. Decision Framework

\`\`\`
┌─ Users globally distributed?
│   ├─ Yes → CDN essential (100+ PoP global provider)
│   └─ No → Single-region CDN or no CDN (if <50ms latency acceptable)
├─ Content type?
│   ├─ Static assets (images, CSS, JS) → CDN with long TTL (year)
│   ├─ Dynamic HTML → CDN with short TTL (60s) or edge compute
│   ├─ API responses → CDN with s-maxage > max-age (CDN caches longer than browser)
│   └─ Video → CDN with chunked caching, pre-warming
├─ Need edge compute (auth, A/B test, image optimization)?
│   ├─ Yes → Cloudflare Workers, Lambda@Edge, or Fastly Compute@Edge
│   └─ No → Any CDN works
├─ Budget?
│   ├─ Low → Cloudflare (free tier) or Bunny CDN
│   ├─ Medium → CloudFront, Fastly
│   └─ High → Akamai, multi-CDN
└─ Security requirements?
    ├─ DDoS protection → Cloudflare, Akamai
    ├─ WAF → CloudFront + WAF, Cloudflare, Fastly
    └─ Bot mitigation → Cloudflare, Akamai Bot Manager
\`\`\`

| Use Case | Best CDN | Why |
|----------|---------|-----|
| E-commerce storefront | Fastly + CloudFront | Instant purge for price updates, tag-based invalidation |
| Video streaming | Akamai, CloudFront | Large PoP count, chunked caching |
| API acceleration | Cloudflare Workers, Fastly | Edge compute for request transformation |
| Global SaaS app | CloudFront + Lambda@Edge | Auth at edge, language detection |
| Static site (JAMstack) | Cloudflare Pages, Vercel Edge | Built-in static hosting + CDN |

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'user_jp', label: 'User (Tokyo)', type: 'client', x: 80, y: 60 },
    { id: 'user_us', label: 'User (NYC)', type: 'client', x: 80, y: 180 },
    { id: 'user_eu', label: 'User (London)', type: 'client', x: 80, y: 300 },
    { id: 'dns', label: 'DNS Routing\nAnycast / Geo', type: 'dns', x: 260, y: 180 },
    { id: 'pop_tokyo', label: 'Tokyo PoP', type: 'cdn', x: 460, y: 60 },
    { id: 'pop_nyc', label: 'NYC PoP', type: 'cdn', x: 460, y: 180 },
    { id: 'pop_london', label: 'London PoP', type: 'cdn', x: 460, y: 300 },
    { id: 'origin_shield', label: 'Origin Shield', type: 'cache', x: 640, y: 180 },
    { id: 'origin', label: 'Origin Server\n(us-east-1)', type: 'storage', x: 640, y: 60 },
    { id: 's3', label: 'S3 Static Assets', type: 'storage', x: 640, y: 300 },
  ]}
  edges={[
    { from: 'user_jp', to: 'dns', label: 'Query cdn.example.com' },
    { from: 'user_us', to: 'dns', label: 'Query cdn.example.com' },
    { from: 'user_eu', to: 'dns', label: 'Query cdn.example.com' },
    { from: 'dns', to: 'pop_tokyo', label: 'Nearest PoP' },
    { from: 'dns', to: 'pop_nyc', label: 'Nearest PoP' },
    { from: 'dns', to: 'pop_london', label: 'Nearest PoP' },
    { from: 'pop_tokyo', to: 'origin_shield', label: 'cache miss' },
    { from: 'pop_nyc', to: 'origin_shield', label: 'cache miss' },
    { from: 'pop_london', to: 'origin_shield', label: 'cache miss' },
    { from: 'origin_shield', to: 'origin', label: 'miss → fetch' },
    { from: 'origin_shield', to: 's3', label: 'static assets' },
  ]}
  height={380}
/>

## 10. Real Production Incident

<Callout type="incident">
**Fastly Global Outage — Software Bug in Edge Configuration, June 2021**

On June 8, 2021, Fastly experienced a global outage lasting 49 minutes. 85% of Fastly's network returned 503 errors. Affected customers: GitHub, The New York Times, Reddit, Twitch, Amazon (AWS console), Shopify, and thousands more.

**Root cause**: A customer deployed a VCL (Varnish Configuration Language) change that triggered an undiscovered edge case in Fastly's VCL parser. The parser terminated unexpectedly when processing a specific combination of \`if\` conditions and variable assignments. The error propagated through Fastly's global configuration distribution system (a private CDN for VCL configurations), affecting all 70+ PoPs.

**Impact**: Wide-scale internet disruption. GitHub was inaccessible for ~50 minutes. Reddit showed cached 503 pages. Shopify stores could not serve product images or CSS.

**Fix**: Fastly (1) rolled back the configuration distribution system to a known-good version, (2) added fuzz testing to their VCL parser, (3) implemented canary deployments for configuration changes — new VCL configs are now validated on a single PoP before global rollout.

**Lesson**: CDN configuration changes affect global traffic instantly. Always use canary deployments for CDN config changes. Have a fast rollback mechanism. A bug in your CDN provider can take down your entire site.
</Callout>

## 11. Production Implementation

### ❌ Naive — No CDN (static assets served from app server)
\`\`\`typescript
// Express.js — serving static files directly
app.use('/static', express.static('public'));
// Problem: every request hits the app server
// Competing with API requests for resources
// No geographic distribution
\`\`\`

### ✅ Better — CloudFront CDN for Static Assets
\`\`\`typescript
// AWS CDK — CloudFront distribution for S3 + API
const cdn = new cloudfront.Distribution(this, 'CDN', {
  defaultBehavior: {
    origin: new origins.S3Origin(assetBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: new cloudfront.CachePolicy(this, 'StaticCache', {
      defaultTtl: Duration.days(365),
      maxTtl: Duration.days(365),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList('v'),
    }),
    compress: true,
  },
  additionalBehaviors: {
    '/api/*': {
      origin: new origins.HttpOrigin('api.example.com'),
      cachePolicy: new cloudfront.CachePolicy(this, 'ApiCache', {
        defaultTtl: Duration.seconds(0),
        maxTtl: Duration.seconds(60),
      }),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    },
  },
});
\`\`\`

### 🚀 Production — Multi-CDN with Failover and Pre-warming
\`\`\`typescript
class MultiCDNManager {
  private providers: CDNProvider[];
  private healthChecks: Map<string, boolean>;

  constructor(providers: CDNProvider[]) {
    this.providers = providers;
    this.healthChecks = new Map();
    this.startHealthChecks();
  }

  // Pre-warm: populate cache before traffic spike
  async prewarm(urls: string[]): Promise<void> {
    for (const url of urls) {
      await Promise.all(
        this.providers.map(p =>
          fetch(url, { headers: { 'Prefer': 'wait=2000' } })
            .catch(() => {}) // pre-warm failures are acceptable
        )
      );
    }
  }

  // Health check: detect CDN outage
  private startHealthChecks(): void {
    setInterval(async () => {
      for (const provider of this.providers) {
        const ok = await this.healthCheck(provider.healthEndpoint);
        this.healthChecks.set(provider.name, ok);
        if (!ok) {
          console.error(\`\${provider.name} CDN health check failed\`);
          // Route traffic to next provider
        }
      }
    }, 30000);
  }

  // Staggered purge: avoid cache miss storm
  async gatedPurge(pattern: string, regions: string[]): Promise<void> {
    for (const region of regions) {
      await this.providers[0].purge(pattern, region);
      await new Promise(r => setTimeout(r, 5000)); // 5s between regions
    }
  }

  async getOriginRequest(url: string): Promise<Response> {
    // Try primary CDN, fallback to secondary
    for (const provider of this.providers) {
      if (this.healthChecks.get(provider.name)) {
        try {
          const resp = await provider.fetch(url);
          if (resp.ok) return resp;
        } catch {
          // Fall through to next provider
        }
      }
    }
    // Fallback: direct to origin
    return fetch(url.replace(/cdn\d?\./, 'origin.'));
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **Netflix**: Built their own CDN — **Open Connect**. 17,000+ appliances deployed inside ISP data centers worldwide. >95% of Netflix traffic served from Open Connect. Pre-populates popular content during off-peak hours. Dynamic bitrate selection based on last-mile connection quality.
- **Cloudflare**: Serves 20%+ of all web traffic. Free tier with unmetered DDoS protection up to 1.5 Tbps. Workers serverless platform runs on V8 isolates at 320+ PoPs. Owns IP address space and BGP table for Anycast routing.
- **Amazon CloudFront**: Tight integration with AWS services (S3, Lambda@Edge, WAF, Shield). Used by Amazon.com itself for product images and Prime Video. Regional Edge Caches provide an additional caching layer between PoPs and origin.
- **Shopify (Fastly)**: Tag-based cache invalidation at the edge. On product/theme update, Shopify purges specific tags (store, product, collection). Fastly's instant purge API propagates to 95% of PoPs in <150ms.

## 13. Interview Playbook

**Q: "Design a CDN for a global video streaming service."**
→ Open with: define scale — 100M DAU, 10B minutes watched/day, 200 countries.
→ Cover: Use anycast routing to direct users to nearest PoP. Chunk videos into 4-10s segments (HLS/DASH). Cache popular content proactively (pre-warming). Use Origin Shield to protect storage. For less popular content, cache on first request.
→ Depth signal: Netflix's Open Connect model — deploy appliances INSIDE ISP networks (peering). No bandwidth costs, lowest latency to end users. Use CDN hierarchy: regional caches → national caches → origin.
→ Avoid: saying you need one global CDN — multi-CDN for high availability (Level 3 + Akamai + CloudFront).

**Q: "How does a CDN handle dynamic content that can't be cached?"**
→ Open with: two approaches — (1) edge compute to generate dynamic responses at PoP, (2) optimize the origin connection without caching.
→ Cover: Use CloudFront Functions/Lambda@Edge for authentication, A/B testing, header manipulation at the edge. Use TCP optimizations: persistent connections to origin, TLS session resumption, congestion control tuning.
→ Depth signal: CDNs can still cache "uncacheable" content with **stale-while-revalidate** — serve slightly stale dynamic content while fetching fresh in background. For personalization, use **cache keys that include user segment** (a/b variant, language, country) so that a single cache entry serves all users in that segment.
→ Avoid: saying dynamic content can't go through a CDN — even uncacheable content benefits from TCP optimization and DDoS protection at the edge.

**Q: "What is the difference between Anycast and DNS-based CDN routing?"**
→ Open with: Anycast uses the same IP at multiple PoPs (BGP routes to nearest). DNS-based returns different IPs per region.
→ Cover: Anycast: simpler DNS configuration, faster failover (BGP reconverges in seconds), but can cause uneven traffic distribution (BGP doesn't know latency, only AS path length). DNS: better traffic shaping (X% to one region), but DNS caching (TTL up to 300s) delays failover.
→ Depth signal: Most large CDNs use both — DNS for initial routing, Anycast for intra-region traffic. Cloudflare and Fastly use Anycast exclusively. Akamai uses a proprietary DNS-based mapping system.
→ Avoid: saying either is strictly better — Anycast is simpler, DNS gives more control.

## 14. Concept Check Quiz

**Q1:** What is the primary benefit of using a CDN?
- A) Cheaper origin server hardware
- B) Reduced latency by serving from geographically closer PoPs
- C) Unlimited storage
- D) Automatic database replication
**Answer: B** — CDNs reduce latency by caching content at edge servers near users. Origin offload and DDoS protection are secondary benefits.

**Q2:** Which routing method does Cloudflare use for its CDN?
- A) DNS-based geographic routing
- B) Anycast (same IP from all PoPs)
- C) HTTP redirect
- D) Round-robin DNS
**Answer: B** — Cloudflare uses Anycast. All 320+ PoPs advertise the same IP addresses via BGP. Traffic naturally routes to the nearest PoP.

**Q3:** What HTTP header directive tells the CDN to cache content for 1 hour but the browser to cache for 1 minute?
- A) \`Cache-Control: public, max-age=3600\`
- B) \`Cache-Control: public, max-age=60, s-maxage=3600\`
- C) \`Cache-Control: public, s-maxage=60, max-age=3600\`
- D) \`Cache-Control: public, max-age=3600, immutable\`
**Answer: B** — \`max-age=60\` is for the browser (60 seconds), \`s-maxage=3600\` is for shared caches (CDN, proxies — 3600 seconds = 1 hour).

**Q4:** During a Fastly outage in June 2021, what was the root cause?
- A) DNS misconfiguration
- B) DDoS attack
- C) A bug in the VCL configuration parser triggered by a customer config
- D) AWS S3 region failure
**Answer: C** — A specific VCL configuration change triggered an edge case that caused Fastly's global configuration distribution system to fail, taking down all PoPs.

**Q5:** What is an Origin Shield in CDN architecture?
- A) A DDoS protection service
- B) An intermediate cache layer that coalesces cache misses from multiple PoPs
- C) The origin server's firewall
- D) A CDN configuration tool
**Answer: B** — Origin Shield is a dedicated intermediate cache that sits between PoPs and the origin. When multiple PoPs miss on the same content, only one request goes to the origin, reducing origin load.

## 15. Next Steps

- **Edge Computing (04-07)** — Running code at the CDN edge for dynamic content, auth, and personalization.
- **CDN Cache Invalidation & Purging (04-08)** — How to remove content from CDN cache before TTL expiry.
- **Distributed Caching (04-04)** — Redis Cluster, Memcached, consistent hashing for application-layer caching.`,
    estimatedMin: 16,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Netflix", "Cloudflare", "Amazon", "Fastly", "Shopify", "Akamai"],
    tags: ["CDN", "content-delivery", "CloudFront", "Cloudflare", "Anycast", "edge-caching"],
  },

  {
    id: "lesson-04-07",
    slug: "caching-cdns-07-edge-computing",
    title: "Edge Computing",
    content: `## 0. Mental Model

> Edge computing is like a **food truck that finishes cooking at your table**. Instead of cooking everything in a central kitchen (origin server) and shipping it to customers, edge computing lets the delivery driver (CDN edge) do final preparation — add toppings, heat the food, customize the plate — right at your location. The customer gets a hot, customized meal instantly without any cross-country shipping.

## 1. Quick Summary

- **Edge computing** runs serverless functions at CDN PoPs, processing requests as close to users as possible — <5ms added latency vs 200ms round trip to origin.
- **Cloudflare Workers** use V8 isolates (<1ms cold start, 128MB memory, 30s CPU limit). **Lambda@Edge** uses Node.js/Python (~50ms cold start, 5-30s timeout).
- Use cases: authentication, A/B testing, image optimization, API aggregation, geo-blocking, bot detection, request transformation.
- **Edge KV** (Workers KV) provides global low-latency key-value storage at the edge (~50ms read latency, eventually consistent).
- **Edge vs traditional CDN**: Traditional CDN caches static content. Edge computing generates or modifies responses dynamically at the PoP.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Edge Computing** | Running code at the network edge (CDN PoPs) close to users |
| **V8 Isolate** | Lightweight JavaScript runtime — multiple isolates share a single process |
| **Cold Start** | Time to initialize a function on first request |
| **Edge KV** | Global key-value storage accessible from edge functions |
| **Durable Objects** | Cloudflare's stateful, single-writer edge storage |
| **Lambda@Edge** | AWS Lambda functions attached to CloudFront events |
| **Viewer Request** | Lambda@Edge event before cache check (auth, redirect) |
| **Origin Request** | Lambda@Edge event after cache miss, before origin call |
| **Origin Response** | Lambda@Edge event after origin response, before caching |
| **Compute@Edge** | Fastly's WebAssembly-based edge computing platform |

## 3. The Problem Without It

- **Origin round-trip for every request**: User request → DNS → CDN (cache miss) → origin. Even with CDN, dynamic requests (who is this user? what language?) must go to the origin. Edge computing handles these at the PoP — 5ms vs 200ms.
- **Personalization at scale**: 100M users each see different content. Without edge computing, every page is uniquely generated at the origin (1M requests/second = massive server farm). Edge computing personalizes at the PoP: common HTML cached at edge, user-specific parts (name, recommendations) injected via edge function.
- **Image optimization burden**: 10K unique images requested per second. Without edge: origin must resize/compress each image → 1000 CPU cores needed. With edge: origin stores one high-res image, edge resizes to requested dimensions, caches result at PoP.
- **A/B testing complexity**: Routing users to different experiment variants typically requires a load balancer or application logic at the origin. Edge functions determine the variant at request time (based on cookie or percentage), route to the correct versioned origin, or even rewrite the HTML at the edge.

## 4. How It Works — Core Mechanics

### Cloudflare Workers Architecture (V8 Isolates)

\`\`\`
Each Worker runs in a V8 isolate — NOT a process per request.
Multiple isolates share a single process.
Creation: <1ms (no cold start in practice for active Workers).

Worker Process:
┌─────────────────────────────────────────────┐
│  V8 Isolate 1 (Customer A, script v1)        │
│  V8 Isolate 2 (Customer A, script v2)        │
│  V8 Isolate 3 (Customer B, script v1)        │
│  ... (thousands of isolates per process)     │
└─────────────────────────────────────────────┘

Request Flow:
User → Cloudflare Edge → Workers Runtime (fetch handler)
  → Check Cache
    → HIT → Return
    → MISS → Worker modifies request (auth, headers)
      → Forward to origin
      → Worker modifies response (compress, add headers)
        → Cache response
        → Return to user
\`\`\`

### Lambda@Edge — Four Event Hooks

\`\`\`
CloudFront receives request:

1. Viewer Request (before cache):
   - Use: Authentication (JWT validation), redirect (HTTPS), geo-blocking

2. Origin Request (after cache miss, before origin):
   - Use: Request transformation, custom origin selection

3. Origin Response (after origin, before cache):
   - Use: Response transformation, compression, header modification

4. Viewer Response (before returning to client):
   - Use: Add security headers, set cookies, response modification
\`\`\`

\`\`\`typescript
// Lambda@Edge: Viewer Request (authentication)
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  // Validate JWT token
  const token = headers['authorization']?.[0]?.value;
  if (!token || !isValidJWT(token)) {
    return {
      status: '302',
      statusDescription: 'Found',
      headers: {
        location: [{ key: 'Location', value: 'https://auth.example.com/login' }],
      },
    };
  }
  // Add user info header for origin
  const user = decodeJWT(token);
  headers['x-user-id'] = [{ key: 'X-User-Id', value: user.id }];
  return request;
};
\`\`\`

### Edge KV Storage (Workers KV)

\`\`\`typescript
// Global KV store — eventually consistent, 50ms read latency
const KV_NAMESPACE = 'CONFIG';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Read config from KV (cached at edge)
    const features = await env.FEATURES.get('feature-flags', 'json');
    const user = await env.USERS.get('user:123', 'json');

    // KV writes are async + globally replicated
    await env.USERS.put('user:456', JSON.stringify({ name: 'Alice' }));

    return new Response(JSON.stringify({ features, user }));
  },
};
\`\`\`

## 5. Variants & Flavors

| Platform | Runtime | Cold Start | Memory | CPU Limit | State | Use Case |
|----------|---------|-----------|--------|-----------|-------|----------|
| **Cloudflare Workers** | V8 Isolates | <1ms | 128MB | 30s CPU | KV (eventual), Durable Objects (strong) | Auth, routing, A/B tests |
| **Lambda@Edge** | Node.js, Python | ~50ms | 128-3008MB | 5-30s | DynamoDB, S3 | Image optimization, complex transforms |
| **Fastly Compute@Edge** | WebAssembly | <1ms | N/A (linear) | 50ms-30s | KV store (built-in) | High-performance, low latency |
| **Akamai EdgeWorkers** | JS (ES2020) | <5ms | 200MB | 50ms-5s | Property Manager | Service worker-like patterns |

## 6. Performance Characteristics

| Metric | Cloudflare Workers | Lambda@Edge | Fastly Compute@Edge | Akamai EdgeWorkers |
|--------|-------------------|-------------|-------------------|-------------------|
| P50 cold start | <1ms | 50ms | <1ms | 5ms |
| P50 warm execution | 0.5ms | 5ms | 0.3ms | 1ms |
| P99 execution | 5ms | 100ms | 3ms | 10ms |
| Memory limit | 128MB | 3008MB | Linear (pay per use) | 200MB |
| CPU time limit | 30s (free: 10ms) | 5-30s | 50ms-30s | 50ms-5s |
| Bundle size limit | 1MB | 1MB (per region) | N/A | N/A |
| KV read latency | ~50ms | N/A (DynamoDB) | ~20ms | N/A |

**When numbers degrade**: Lambda@Edge cold starts spike during deployments (new version = new cold start). Workers can have occasional cold start after 30+ minutes of inactivity (scale-to-zero). CPU-intensive tasks (image processing) may hit time limits on Workers.

## 7. Failure Modes

- **Worker Timeout**: Cloudflare Workers have 30s CPU limit. A heavy image processing task times out → 503 error. *Mitigation*: Offload CPU-heavy work to a dedicated service, use async processing (queues) for tasks exceeding limits.
- **KV Eventual Consistency**: Write a config change to KV, immediately read from a different PoP → still get old value (eventual consistency window: up to 60s). *Mitigation*: Use Durable Objects for strongly consistent storage, or design for eventual consistency (TTL-based cache for config).
- **Lambda@Edge Propagation Slow**: Deploying new Lambda@Edge version takes 15-30 minutes to propagate to all CloudFront PoPs. Rollback also slow. *Mitigation*: Use CloudFront Functions (faster propagation) for simple transforms, Lambda@Edge only for complex operations.
- **Bundle Size Excess**: A Worker script exceeds 1MB limit (e.g., including a large library for PDF generation). *Mitigation*: Split logic into multiple Workers, use external API calls for heavy processing, minify dependencies aggressively.
- **State Leak Across Requests**: Lambda@Edge reuses execution context → global variables from one request leak to another. *Mitigation*: Never use global mutable state in Lambda@Edge or Workers — each request must be fully isolated.

## 8. Decision Framework

\`\`\`
┌─ Latency requirement?
│   ├─ <5ms added latency → Cloudflare Workers or Fastly Compute@Edge
│   └─ 50ms+ acceptable → Lambda@Edge (more features, slower)
├─ Complexity of logic?
│   ├─ Simple: header rewrite, redirect, JWT check → Cloudflare Functions (cheaper, faster)
│   ├─ Medium: A/B testing, API aggregation → Cloudflare Workers
│   └─ Complex: image processing, HTML rewrite → Lambda@Edge (more CPU, memory)
├─ Need state at edge?
│   ├─ Eventually consistent KV → Workers KV
│   ├─ Strongly consistent → Durable Objects (Workers) or DynamoDB (Lambda@Edge)
│   └─ Session state → Durable Objects or Redis at central location
├─ Vendor lock-in concern?
│   ├─ Use Workers → locks you into Cloudflare
│   └─ Use Lambda@Edge → more portable (standard Node.js/Python)
└─ Budget?
    ├─ Low → Cloudflare Workers (free tier: 100K req/day)
    └─ High → Lambda@Edge (pay per request + compute time)
\`\`\`

| Use Case | Platform | Rationale |
|----------|----------|-----------|
| JWT authentication at edge | Workers / Cloudflare Functions | <1ms cold start, simple header check |
| Image resizing (WebP conversion) | Lambda@Edge | More CPU/memory, Sharp library works |
| A/B testing (cookie-based) | Workers / EdgeWorkers | Fast, stateless, cookie manipulation |
| Geo-blocking (country-based redirect) | Cloudflare Functions | Extreme speed, simple logic |
| API aggregation (compose multiple APIs) | Workers | Fetch API + streaming |
| HTML modification (add banner, inject script) | Lambda@Edge (origin response) | Full HTML parser required |

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'User Request', type: 'client', x: 80, y: 60 },
    { id: 'edge', label: 'CDN Edge PoP', type: 'cdn', x: 260, y: 60 },
    { id: 'worker', label: 'Edge Worker\n(V8 Isolate)', type: 'app', x: 260, y: 200 },
    { id: 'kv', label: 'Edge KV\n(Global Store)', type: 'cache', x: 260, y: 340 },
    { id: 'cache', label: 'Edge Cache', type: 'cache', x: 80, y: 200 },
    { id: 'origin', label: 'Origin Server', type: 'storage', x: 500, y: 60 },
    { id: 'db', label: 'Database', type: 'db', x: 500, y: 200 },
    { id: 'cdn_api', label: 'CDN API Gateway', type: 'gateway', x: 500, y: 340 },
  ]}
  edges={[
    { from: 'client', to: 'edge', label: 'HTTP request' },
    { from: 'edge', to: 'cache', label: 'check cache' },
    { from: 'edge', to: 'worker', label: 'run function' },
    { from: 'worker', to: 'kv', label: 'read config/features' },
    { from: 'worker', to: 'origin', label: 'forward modified request' },
    { from: 'worker', to: 'client', label: 'return response' },
    { from: 'cache', to: 'client', label: 'cache HIT (bypass worker)' },
    { from: 'origin', to: 'db', label: 'query' },
    { from: 'origin', to: 'cdn_api', label: 'API call' },
  ]}
  height={420}
/>

## 10. Real Production Incident

<Callout type="incident">
**Cloudflare Workers — Outage Due to KV Configuration Change, July 2022**

On July 11, 2022, Cloudflare Workers experienced a 63-minute outage where all Workers requests returned 500 errors. The outage affected all Workers customers including Shopify, Discord, and The New York Times.

**Root cause**: A configuration change to the Workers KV namespace metadata store caused a global replication backlog. When Workers attempted to read KV bindings (environment variables, secret references), the read timed out. Since Workers fetch their configuration from KV on every request (or at least on cold start), ALL Workers failed to initialize or execute.

**Impact**: 63 minutes of complete Workers unavailability. Any site relying on Workers for auth (Shopify storefront), routing (Discord uploads), or A/B testing (NYT paywall) was broken.

**Fix**: Cloudflare added fallback configuration caching — Workers now keep a local cache of KV configuration that persists across restarts. If the KV read fails, the fallback cache is used. Also added canary deployment for KV metadata changes.

**Lesson**: Edge computing layers introduce new failure modes. Workers depend on KV for configuration — if KV is slow, Workers fail. Always have a fallback (local config, stale config cache) for edge functions that serve critical traffic.
</Callout>

## 11. Production Implementation

### ❌ Naive — Pure origin-generated personalization
\`\`\`typescript
// Every request goes to origin, even for simple personalization
app.get('/dashboard', async (req, res) => {
  const user = await db.users.findUnique({ where: { id: req.userId } });
  const theme = user.preferences.theme; // This DB call happens EVERY request
  res.render('dashboard', { theme, ... });
});
// Problem: 100K requests/sec → 100K DB calls for user preferences
\`\`\`

### ✅ Better — Edge-based JWT decode + KV config
\`\`\`typescript
// Cloudflare Worker: decode JWT at edge, inject user context
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Edge authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response('Unauthorized', { status: 401 });

    const user = decodeJWT(token); // Decode at edge (no DB call)
    if (!user) return new Response('Invalid token', { status: 401 });

    // Edge personalization — read preferences from KV
    const prefs = await env.PREFERENCES.get(\`prefs:\${user.id}\`, 'json');
    const theme = prefs?.theme ?? 'light';

    // Forward to origin with user context (no auth needed at origin)
    const headers = new Headers(request.headers);
    headers.set('X-User-Id', user.id);
    headers.set('X-Theme', theme);
    headers.delete('Authorization'); // Don't forward token to origin

    const originRequest = new Request(request, { headers });
    return fetch(originRequest);
  },
};
\`\`\`

### 🚀 Production — Multi-region edge with state management
\`\`\`typescript
// Full edge computing pipeline: auth → routing → personalization → response
interface EdgeContext {
  userId: string;
  country: string;
  language: string;
  variant: string;
  device: string;
}

class EdgePipeline {
  async handle(request: Request, env: Env): Promise<Response> {
    // Step 1: Auth & identify user
    const context = await this.buildContext(request, env);
    if (!context) return new Response('Unauthorized', { status: 401 });

    // Step 2: Edge routing — send to nearest regional origin
    const originUrl = this.selectOrigin(context.country);

    // Step 3: Modify request for origin
    const headers = new Headers(request.headers);
    headers.set('X-Context', JSON.stringify(context));

    // Step 4: Cache strategy — personalized cache key
    const cacheKey = this.buildCacheKey(request.url, context);
    headers.set('X-Cache-Key', cacheKey);

    let response = await fetch(new Request(originUrl + request.url, {
      headers,
      cf: { cacheKey, cacheEverything: true },
    }));

    // Step 5: Edge response transformation
    response = await this.transformResponse(response, context, env);

    return response;
  }

  private async buildContext(request: Request, env: Env): Promise<EdgeContext | null> {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;

    const payload = decodeJWT(token);
    const country = request.cf?.country ?? 'US';
    const device = request.headers.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop';

    // A/B test assignment from KV
    const assignment = await env.AB_ASSIGNMENTS.get(\`ab:\${payload.sub}\`, 'json');
    const variant = assignment?.variant ?? (Math.random() < 0.5 ? 'A' : 'B');

    return {
      userId: payload.sub,
      country,
      language: request.headers.get('Accept-Language')?.slice(0, 2) ?? 'en',
      variant,
      device,
    };
  }

  private selectOrigin(country: string): string {
    const regions: Record<string, string> = {
      US: 'https://origin-us.example.com',
      DE: 'https://origin-eu.example.com',
      JP: 'https://origin-ap.example.com',
    };
    return regions[country] ?? 'https://origin-us.example.com';
  }

  private buildCacheKey(url: string, ctx: EdgeContext): string {
    // Include variant + language in cache key (but not user ID)
    return \`\${url}#variant=\${ctx.variant}&lang=\${ctx.language}\`;
  }

  private async transformResponse(
    response: Response, ctx: EdgeContext, env: Env
  ): Promise<Response> {
    if (!response.ok) return response;

    // Inject personalized content via HTMLRewriter (Workers API)
    return new HTMLRewriter()
      .on('#user-name', { text: (text) => text.replace(ctx.userId) })
      .on('#experiment-banner', {
        element: (el) => {
          if (ctx.variant === 'B') {
            el.setAttribute('style', 'display: block');
          }
        },
      })
      .transform(response);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pipeline = new EdgePipeline();
    return pipeline.handle(request, env);
  },
};
\`\`\`

## 12. Real Company Deep Dives

- **Cloudflare Workers**: Shopify uses Workers for storefront routing and authentication — 400+ requests/second per Worker. Workers KV for configuration storage. Durable Objects for real-time collaboration features (checkout session locking).
- **AWS Lambda@Edge**: The New York Times uses Lambda@Edge for paywall logic — checks subscription status at edge, injects paywall overlay HTML or serves full article. Image optimization pipeline resizes 10M+ images/day at edge.
- **Fastly Compute@Edge**: Spotify uses Compute@Edge for audio delivery routing — determines which edge server serves each audio stream based on user location and server load. Rewrites playlist manifests at the edge.
- **Akamai EdgeWorkers**: Major streaming services (Disney+, HBO Max) use EdgeWorkers for DRM license routing and manifest manipulation — all at the edge, no round-trip to origin for streaming session negotiation.

## 13. Interview Playbook

**Q: "What is edge computing and how does it differ from traditional CDN?"**
→ Open with: traditional CDN caches static content at edge. Edge computing runs code at the edge for dynamic processing.
→ Cover: Key differences — edge functions execute on every request (not just cache misses), can modify requests/responses, access KV storage, and communicate with other edge services. Use cases: auth, personalization, A/B testing, image optimization.
→ Depth signal: Cloudflare Workers use V8 isolates — not containers or VMs. This means <1ms cold start and thousands of Workers per server. Lambda@Edge uses containers (~50ms cold start). Fastly Compute@Edge uses WebAssembly for near-native performance.
→ Avoid: saying edge computing is "just serverless at the edge" — the cold start, memory, and API differences matter significantly.

**Q: "How would you implement A/B testing at the edge?"**
→ Open with: assign users to variants at the edge based on cookie or percentage split. Cache responses per variant.
→ Cover: Use Cloudflare Worker to read cookie → determine variant → add X-Variant header → forward to origin. Origin can check header and serve variant-specific content. Or use the edge to rewrite cached HTML (HTMLRewriter) to inject variant content without origin involvement.
→ Depth signal: Cache key MUST include variant. If you use the same cache key for A and B, the first user's variant serves all subsequent users (cache poisoning). Use \`cf.cacheKey\` to include variant in the cache key. For SEO, use the same cache key for crawlers (no A/B for bots).
→ Avoid: making the A/B decision at the origin — that defeats the purpose (every request hits origin).

**Q: "What are the limitations of edge computing compared to traditional serverless?"**
→ Open with: edge computing trades capability for speed — less CPU, memory, and state than centralized serverless.
→ Cover: Limitations — 128MB memory (Workers) vs 10GB (Lambda). 30s CPU time limit. No filesystem access. Limited standard library (Workers use Service Worker API, not full Node.js). Database connections not allowed (use HTTP APIs to backend). KV storage is eventually consistent.
→ Depth signal: Edge function timeouts are HARD limits — you CAN'T extend them. For CPU-intensive work (PDF generation, image processing), extract to a dedicated service behind the edge. Workers KV has <50ms read latency but >5s global write propagation.
→ Avoid: claiming edge computing replaces centralized serverless — they complement each other. Edge for fast, simple transforms. Centralized for complex, stateful, or CPU-heavy operations.

## 14. Concept Check Quiz

**Q1:** What runtime does Cloudflare Workers use for near-zero cold starts?
- A) Docker containers
- B) V8 isolates
- C) Firecracker microVMs
- D) WebAssembly only
**Answer: B** — Cloudflare Workers use V8 isolates, which are lightweight JavaScript environments that can be created in <1ms. Multiple isolates share a single operating system process.

**Q2:** Which Lambda@Edge event runs before the CDN cache check?
- A) Origin Request
- B) Origin Response
- C) Viewer Request
- D) Viewer Response
**Answer: C** — Viewer Request runs when CloudFront receives a request from the viewer, BEFORE checking the cache. Use for authentication and redirects. Origin Request runs AFTER a cache miss.

**Q3:** What is the primary limitation of Workers KV for stateful applications?
- A) 50ms read latency is too high
- B) Eventual consistency — writes may not be immediately visible globally
- C) No key-value storage
- D) Limited to 10KB per key
**Answer: B** — Workers KV is eventually consistent. A write in one PoP may take up to 60 seconds to propagate globally. For strongly consistent storage, use Durable Objects or an external database.

**Q4:** When should you use Lambda@Edge over Cloudflare Workers?
- A) When you need sub-millisecond cold starts
- B) When you need more CPU time and memory (image processing, HTML parsing)
- C) When you need free tier
- D) When you need KV storage
**Answer: B** — Lambda@Edge offers up to 3008MB memory and 30s CPU time, making it suitable for CPU/memory-intensive operations that Workers' 128MB limit can't handle.

**Q5:** How does the Fastly Compute@Edge platform differ from Cloudflare Workers?
- A) It uses WebAssembly instead of JavaScript V8 isolates
- B) It has slower cold starts
- C) It supports more programming languages
- D) It doesn't support KV storage
**Answer: A** — Fastly Compute@Edge uses WebAssembly as the compilation target, while Cloudflare Workers uses V8 isolates with JavaScript. Wasm provides near-native execution speed but requires compilation.

## 15. Next Steps

- **CDN Cache Invalidation & Purging (04-08)** — How to manage CDN caches with tag-based purging, versioned URLs, and surrogate keys.
- **CDN Fundamentals (04-06)** — Understand the CDN infrastructure that edge computing runs on.
- **Distributed Caching (04-04)** — Redis Cluster, Memcached for application-layer caching.
- **Serverless Computing** — Compare edge functions with traditional serverless (AWS Lambda, Google Cloud Functions).`,
    estimatedMin: 16,
    difficulty: "ADVANCED" as const,
    companies: ["Cloudflare", "AWS", "Fastly", "Akamai", "Shopify", "Spotify"],
    tags: ["edge-computing", "Cloudflare-Workers", "Lambda@Edge", "CDN", "serverless", "edge-functions"],
  },

  {
    id: "lesson-04-08",
    slug: "caching-cdns-08-cdn-cache-invalidation-purging",
    title: "CDN Cache Invalidation & Purging",
    content: `## 0. Mental Model

> CDN cache invalidation is like **posting a correction notice on a billboard**. You put up an ad on thousands of billboards worldwide (CDN cache). When the price changes, you need to update every billboard. Option 1: wait for the poster to naturally fade (TTL expiry, but takes days). Option 2: send someone to each billboard to remove the old poster (purge — fast but costs effort). Option 3: design the poster with a "version 2" sticker so people know there's a newer version (versioned URLs — no purge needed).

## 1. Quick Summary

- **Purge**: Active removal of cached content from CDN edge servers before TTL expiry. Propagation delay ranges from <150ms (Fastly) to minutes (some CDNs).
- **Versioned URLs**: Include content hash in URL (\`style.a1b2c3.css\`). Cache forever (TTL=1 year). New version = new URL. No purging needed.
- **Tag-based purge**: Associate cache entries with tags (surrogate keys). Purge all entries with a given tag in one API call.
- **Purge propagation delay**: time for a purge request to reach all PoPs. Fastly: <150ms to 95% PoPs. CloudFront: 2-5 minutes globally. Self-built CDN: hour+.
- **Stale-while-revalidate**: Serve stale content for up to N seconds while fetching fresh version in background. Prevents cache-miss storms after purge.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Purge** | Actively removing cached content from CDN servers |
| **Propagation Delay** | Time for purge to reach all edge servers |
| **Surrogate Key** | Tag associated with cached content for batch invalidation (Fastly) |
| **Cache Tag** | Same as surrogate key (Cloudflare: Cache-Tag) |
| **Versioned URL** | URL containing content hash — never needs purge |
| **Stale-While-Revalidate** | Serve stale content while fetching fresh in background |
| **Origin Shield** | Intermediate cache that coalesces purge-induced miss storms |
| **Invalidation** | AWS CloudFront term for purge |
| **Purge by Pattern** | Wildcard purge (\`/products/*\` removes all product pages) |
| **Purge Queue** | Some CDNs queue purges and process in batches |
| **Cache Warming** | Proactively loading content after purge to avoid miss spike |
| **Full Purge** | Clearing entire CDN cache (extreme — use only during emergencies) |

## 3. The Problem Without It

- **Price change takes days**: E-commerce site sets TTL=7 days for product pages. Admin discounts a product. Customers see old price for 7 days. Without purge: 7 days of lost sales.
- **Security vulnerability persists**: A malicious script was found in a cached JS file. Without immediate purge, the script runs in browsers for up to TTL duration (hours or days).
- **GDPR compliance failure**: User requests data deletion. Their photo remains cached on CDN for TTL (24 hours). Legal violation — penalty up to 4% of global revenue.
- **No rollback capability**: Deploy broke the website. Old HTML is cached with TTL=1 hour. Without purge, users see broken site for 1 hour. With purge: fix in <1 minute (global).
- **Cache miss storm after purge**: Purging \`/products/*\` removes 100K product pages. All 100K requests immediately miss → origin server gets 100K concurrent requests → 503 errors.

## 4. How It Works — Core Mechanics

### Purge Propagation

\`\`\`
Purge API Request (e.g., POST /purge /products/123)
           │
    CDN Control Plane
           │
    ┌──────┴──────┐
    │  Push to all │
    │  PoPs        │
    └──────┬──────┘
           │
    ┌──────┼──────┬──────────┐
    │      │      │          │
┌───┴──┐ ┌─┴──┐ ┌─┴──┐  ┌──┴───┐
│NYC   │ │FRA │ │TYO │  │SYD   │
│PoP   │ │PoP │ │PoP │  │PoP   │
│Done  │ │Done│ │Done│  │Done  │
│2s    │ │10s │ │30s │  │>60s  │
└──────┘ └────┘ └────┘  └──────┘

Fastly: ~150ms to 95% of PoPs (instant purge API)
CloudFront: 2-5 minutes for global distribution
Self-hosted CDN: varies by implementation
\`\`\`

### Tag-Based Purge (Surrogate Keys)

\`\`\`typescript
// Origin sets Surrogate-Key header on responses
// Fastly: Surrogate-Key: product-123 category-electronics store-456
// Cloudflare: Cache-Tag: product-123 category-electronics store-456

// When product 123 is updated:
await fetch(\`https://api.fastly.com/service/:id/purge/product-123\`, {
  method: 'POST',
  headers: { 'Fastly-Key': apiKey },
});
// Removes ALL cached responses tagged with "product-123" from ALL PoPs
\`\`\`

### Versioned URL Strategy (No Purge Needed)

\`\`\`html
<!-- Instead of purging on every change: -->
<link rel="stylesheet" href="/css/style.css">
<!-- Cache-Control: max-age=3600 (1 hour → stale window) -->

<!-- Use versioned URLs: -->
<link rel="stylesheet" href="/css/style.a1b2c3.css">
<!-- Cache-Control: public, max-age=31536000, immutable (1 year) -->

<!-- On deploy, hash changes: -->
<link rel="stylesheet" href="/css/style.d4e5f6.css">
<!-- Old URL naturally expires from CDN as nobody requests it -->
\`\`\`

\`\`\`typescript
// Versioned URL generation
function versionAsset(path: string, content: Buffer): string {
  const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
  const ext = path.split('.').pop();
  const base = path.slice(0, -(ext.length + 1));
  return \`\${base}.\${hash}.\${ext}\`;
}
\`\`\`

## 5. Variants & Flavors

| Strategy | Propagation | Complexity | Cost | Use Case |
|----------|------------|-----------|------|----------|----------|
| **Single URL Purge** | Seconds-minutes | Low | Free or low | Individual page fix |
| **Wildcard Purge** (\`/products/*\`) | Seconds-minutes | Low | Low | Bulk updates (prices) |
| **Tag-Based Purge** | Milliseconds-seconds | Medium (headers) | Low | Entity-based invalidations |
| **Versioned URLs** | None (no purge) | Low (build process) | None | Static assets (JS, CSS, images) |
| **Full Purge** | Minutes | Low | Free | Emergency rollback |
| **Stale-While-Revalidate** | Seconds (background) | Medium (config) | None | Miss storm prevention |

## 6. Performance Characteristics

| Metric | Single URL Purge | Tag Purge (Fastly) | Tag Purge (CloudFront) | Versioned URL |
|--------|-----------------|-------------------|----------------------|---------------|
| P50 propagation | 2s | 150ms (95% PoPs) | 30s | N/A |
| P99 propagation | 30s | 2s | 5min | N/A |
| Cache miss spike | Low (1 URL) | Medium (may affect many URLs) | Medium | None |
| API rate limit | 3000/min (CloudFront) | Unlimited (Fastly) | Unlimited | N/A |
| Build complexity | None | Tag header in origin response | Tag header | Content hash in build pipeline |
| Safety net needed | TTL | TTL | TTL | TTL (though TTL=1 year) |

**When numbers degrade**: CloudFront invalidation propagation is slower for wildcard patterns (/* is faster than /path/*/specific because it's optimized). Fastly purge is near-instant but rate-limiting applies at enterprise plan limits. Versioned URLs require a build pipeline — if hash doesn't change on content change, old version serves.

## 7. Failure Modes

- **Purge-Induced Miss Storm**: Purging 10K product pages → all 10K requests simultaneously miss → origin gets 10x traffic. *Mitigation*: Staggered purge (5% of regions at a time), Origin Shield (coalesces misses), Stale-While-Revalidate (serve stale during refresh).
- **Partial Purge**: Some PoPs miss the purge signal → inconsistent user experience (user A sees new price, user B sees old price for the same product). *Mitigation*: Use versioned URLs (no purge needed), or use CDNs with guaranteed propagation (Fastly).
- **Rate Limit Exceeded**: Deployment publishes 100K changed files + attempts 100K purges → CloudFront rate limit (3000/min) exceeded → purges queued or rejected. *Mitigation*: Versioned URLs for assets (no purge), batch purges by pattern, upgrade to enterprise tier.
- **Cache Poisoning Via Purge Bypass**: Attacker directly accesses origin, bypassing CDN purge, serving malicious content. *Mitigation*: Origin returns \`Cache-Control: no-cache, no-store\` for sensitive content, origin rejects direct traffic (block all IPs except CDN), use signed URLs.

## 8. Decision Framework

\`\`\`
┌─ Deploy frequency?
│   ├─ Continuous (100×/day) → Versioned URLs (STATIC ASSETS) + Tag purge (HTML)
│   └─ Infrequent (weekly) → Sidebar: Any purge strategy works
├─ Content type?
│   ├─ Static assets (JS, CSS, images, fonts) → Versioned URLs (ALWAYS)
│   ├─ HTML pages → Tag-based or pattern purge
│   ├─ API responses → Short TTL + tag purge for immediate consistency
│   └─ User-uploaded content → Versioned URL based on upload ID
├─ Acceptable propagation delay?
│   ├─ <1s → Fastly (instant purge) or versioned URLs
│   ├─ <5min → CloudFront (standard invalidation)
│   └─ Any → Any CDN with purge API
├─ Bulk update scenario?
│   ├─ Price update (all products) → Tag purge by category + Origin Shield
│   └─ Single product update → Single URL or tag purge
└─ Budget for purge API calls?
    ├─ Free → CloudFront (1000 paths free/month)
    └─ Pay → Fastly (charges based on requests, not purges)
\`\`\`

| Scenario | Best Strategy | Why |
|----------|--------------|-----|
| New CSS/JS deploy | Versioned URL | No purge needed, cache forever |
| Product price update | Tag purge (product:{id}) | Propagate in <150ms (Fastly) |
| Emergency security fix | Full + single URL purge | Full purge immediately, then selective |
| Flash sale start | Pre-warm + purge old prices | Warm cache before traffic hits |
| GDPR deletion request | Single URL purge + short TTL | Immediate removal + safety net |
| CMS page update | Tag purge (page:{id}) | Only affected pages |

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'admin', label: 'Admin: Update Content', type: 'client', x: 80, y: 60 },
    { id: 'app', label: 'Origin App Server', type: 'app', x: 260, y: 60 },
    { id: 'queue', label: 'Purge Queue', type: 'queue', x: 260, y: 200 },
    { id: 'cdn_api', label: 'CDN API\n(Purge Endpoint)', type: 'gateway', x: 80, y: 200 },
    { id: 'control', label: 'CDN Control Plane', type: 'worker', x: 80, y: 340 },
    { id: 'pop1', label: 'PoP 1\n(Tokyo)', type: 'cdn', x: 460, y: 80 },
    { id: 'pop2', label: 'PoP 2\n(Frankfurt)', type: 'cdn', x: 460, y: 220 },
    { id: 'pop3', label: 'PoP N\n(NYC)', type: 'cdn', x: 460, y: 360 },
    { id: 'origin_shield', label: 'Origin Shield', type: 'cache', x: 640, y: 220 },
  ]}
  edges={[
    { from: 'admin', to: 'app', label: 'update content' },
    { from: 'app', to: 'cdn_api', label: 'send purge request' },
    { from: 'app', to: 'queue', label: 'queue purge (fallback)' },
    { from: 'cdn_api', to: 'control', label: 'multicast to PoPs' },
    { from: 'control', to: 'pop1', label: 'purge /products/123' },
    { from: 'control', to: 'pop2', label: 'purge /products/123' },
    { from: 'control', to: 'pop3', label: 'purge /products/123' },
    { from: 'pop1', to: 'origin_shield', label: 'miss after purge' },
    { from: 'pop2', to: 'origin_shield', label: 'miss after purge' },
    { from: 'pop3', to: 'origin_shield', label: 'miss after purge' },
  ]}
  height={440}
/>

## 10. Real Production Incident

<Callout type="incident">
**Shopify — Cache Purge Propagation Delay During Black Friday, November 2020**

During Black Friday 2020, Shopify merchants updated prices and discounts in real time. Each price change triggered a CDN purge for the affected product page via Fastly's tag-based API. At peak traffic (100K+ purges/second from 1.7M merchants), some purge requests were queued.

**Impact**: Price changes took 2-30 seconds to propagate globally instead of the usual <150ms. Some customers saw old prices for up to 30 seconds after a discount was applied. Lost revenue estimate: 1000+ merchants × average discount × 30 seconds of old pricing.

**Root cause**: Fastly's purge API has a per-service rate limit (configurable, but exceeded during Black Friday peak). The surge of purges from Shopify's automated deployment system (every product update triggered a purge) overwhelmed the rate limit.

**Fix**: Shopify (1) added purge deduplication — if the same product was updated twice in 1 second, only one purge is sent. (2) Implemented a **purge budget** — prioritize price updates (immediate purge) over less critical updates (description changes — stale 10s is fine). (3) Fallback to versioned URLs for product pages — price is loaded via AJAX (cacheable per price version), not in the HTML.

**Lesson**: Even fast CDN purge APIs have limits at scale. Deduplicate purge requests. Use versioned URLs for frequently changing content. Implement purge priority levels — not all purges are equally urgent.
</Callout>

## 11. Production Implementation

### ❌ Naive — Purge every change individually
\`\`\`typescript
// Every product update triggers a CDN purge
app.post('/products/:id', async (req, res) => {
  const product = await db.products.update({ where: { id: req.params.id }, data: req.body });
  await cdn.purge(\`/products/\${req.params.id}\`); // Single URL purge
  res.json(product);
});
// Problem: 100 updates/second → 100 purges/second → rate limit exceeded
// Problem: updates within 1 second → redundant purges for same URL
\`\`\`

### ✅ Better — Deduped + Batched Purge + Versioned Assets
\`\`\`typescript
class DedupedPurger {
  private pending = new Map<string, number>(); // URL → last purge time
  private queue: string[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly DEDUP_WINDOW = 1000; // 1 second dedup window

  invalidate(url: string): void {
    const now = Date.now();
    const lastPurge = this.pending.get(url);

    if (lastPurge && (now - lastPurge) < this.DEDUP_WINDOW) {
      return; // Skip — we purged this URL within the last second
    }

    this.pending.set(url, now);
    this.queue.push(url);

    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 100);
    }
  }

  private async flush(): Promise<void> {
    const urls = [...this.queue];
    this.queue = [];
    this.flushTimer = null;

    // Batch purge — CDN API accepts multiple URLs
    await cdn.purgeBatch(urls);
  }
}

// Usage
app.post('/products/:id', async (req, res) => {
  const product = await db.products.update({...});
  purger.invalidate(\`/products/\${req.params.id}\`);
  res.json(product);
});
\`\`\`

### 🚀 Production — Multi-strategy with versioned URLs + tag purging
\`\`\`typescript
class CDNCacheManager {
  // Strategy 1: Versioned URLs for static assets (no purge needed)
  static versionAsset(path: string, content: Buffer): string {
    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
    const parts = path.split('.');
    const ext = parts.pop();
    return \`\${parts.join('.')}.\${hash}.\${ext}\`;
  }

  // Strategy 2: Tag-based purge for HTML and API responses
  async invalidateEntity(type: string, id: string): Promise<void> {
    // Generate all tags associated with this entity
    const tags = this.getTagsForEntity(type, id);

    // Priority levels
    if (type === 'price') {
      // Price changes: instant purge (revenue-critical)
      await this.nearInstantPurge(tags);
    } else {
      // Other changes: deduped batch purge
      this.schedulePurge(tags);
    }
  }

  private async nearInstantPurge(tags: string[]): Promise<void> {
    // Try Fastly instant purge first
    for (const tag of tags) {
      await fetch(\`https://api.fastly.com/service/\${SERVICE_ID}/purge/\${tag}\`, {
        method: 'POST',
        headers: { 'Fastly-Key': API_KEY, 'Accept': 'application/json' },
      }).catch(() => {}); // Fall through to backup
    }
    // Backup: CloudFront invalidation (slower but always available)
    await this.cloudFrontInvalidation(tags);
  }

  // Strategy 3: Stale-While-Revalidate for graceful degradation
  async setCacheHeaders(response: Response, isVersioned: boolean, ttl: number): Promise<void> {
    if (isVersioned) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Serve stale up to 10% of TTL while revalidating
      const staleTime = Math.floor(ttl * 0.1);
      response.headers.set(
        'Cache-Control',
        \`public, max-age=\${ttl}, stale-while-revalidate=\${staleTime}\`
      );
    }
  }

  // Strategy 4: Pre-warming after critical purge
  async prewarmAfterPurge(urls: string[]): Promise<void> {
    // Fetch URLs from multiple regions to populate cache
    const regions = ['us-east-1', 'eu-west-1', 'ap-northeast-1'];
    for (const url of urls) {
      await Promise.all(regions.map(region =>
        fetch(url, {
          headers: { 'X-Prewarm': 'true', 'X-Region': region },
        }).catch(() => {}) // Pre-warm failures are acceptable
      ));
    }
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **Shopify + Fastly**: Tag-based purging with deduplication. Each store's data tagged by store ID, product ID, and collection ID. On theme deploy: purge \`store:{id}\` tag. On price change: purge \`product:{id}\` tag. Dedup window: 1 second. 95% PoPs purged in <150ms.
- **GitHub + Fastly**: Versioned URLs for static assets (CSS, JS with SHA hash in filename). API responses cached with short TTL + conditional requests (ETags). No purging for versioned assets — just deploy new version with new hash.
- **Netflix Open Connect**: Pre-population instead of purge. New content pushed to Open Connect appliances during off-peak hours (3 AM local time). On content rights change, they use a **regional purge** that targets only one geographic region rather than global (since rights are typically region-specific).
- **Vercel (Next.js ISR)**: On-demand revalidation via \`res.revalidate(path)\`. Instead of purging a URL, it triggers a background regeneration of the static page. The old page continues serving until the new one is ready (stale-while-revalidate pattern).

## 13. Interview Playbook

**Q: "How does CDN cache invalidation work? What is propagation delay?"**
→ Open with: CDN stores content at hundreds of edge servers globally. Purge removes content from all of them. Propagation is the time this takes.
→ Cover: CDNs use a control plane → push model. The control plane sends a purge message to each PoP. Fastly's instant purge achieves <150ms by using a multicast-like push. CloudFront's invalidation takes 2-5 minutes because it uses a distributed queue.
→ Depth signal: Propagation delay depends on CDN architecture. Fastly has a persistent connection from control to each PoP (push). Others use poll-based (PoPs check for pending purges every 30s). Self-built CDNs with BGP-based anycast can't purge easily — you'd need to remove routes and wait for BGP convergence.
→ Avoid: saying "purge is instant" — propagation is never instant. Fastly is <150ms to 95% PoPs, not 100%.

**Q: "Compare versioned URLs vs active purge strategies."**
→ Open with: versioned URLs avoid purging entirely — new content = new URL. Active purge removes old content from existing URLs.
→ Cover: Versioned URLs: best for static assets (JS, CSS, images). Requires build pipeline to generate hashes. URLs change on every deploy. Active purge: needed for HTML pages and API responses where URL can't change (product pages need consistent URL for SEO).
→ Depth signal: Use BOTH — versioned URLs for everything you can, active purge for everything else. The build pipeline generates manifest files mapping logical paths to versioned URLs. For SEO-critical URLs (product pages), the URL must stay the same — use tag-based purge.
→ Avoid: saying versioned URLs solve everything — they don't work for content that needs a fixed URL (user profile, product page for SEO).

**Q: "How do you handle a global purge for an emergency (security fix)?"**
→ Open with: emergency purges are dangerous — they cause mass cache misses. Always combine with pre-warming or Origin Shield.
→ Cover: Don't do a full \`/*\` wildcard purge. Instead, purge specific patterns: \`/js/malicious.js\` (single file) or \`/js/*\` (pattern). Use Origin Shield to coalesce cache miss traffic. Enable stale-while-revalidate to avoid miss spikes. Consider staggered regional purge.
→ Depth signal: For a real security incident: (1) Block the malicious URL via WAF/edge before purging (prevents serving while purge propagates). (2) Purge the specific URL. (3) Pre-warm the new version by fetching from automations in multiple regions. (4) Remove WAF block after confirming purge propagation.
→ Avoid: doing a full cache purge for a single-file security fix — you'll create a mass miss storm.

## 14. Concept Check Quiz

**Q1:** Which CDN invalidation method has the fastest propagation?
- A) CloudFront single URL invalidation
- B) CloudFront wildcard pattern invalidation
- C) Fastly instant purge (tag or URL)
- D) Akamai full purge
**Answer: C** — Fastly's instant purge propagation is <150ms to 95% of PoPs. CloudFront takes 2-5 minutes. Akamai full purge can take 10+ minutes.

**Q2:** What is the primary advantage of versioned URLs over active purging?
- A) Lower CDN storage costs
- B) No purge needed — old URLs naturally expire
- C) Faster page loads
- D) Better SEO
**Answer: B** — Versioned URLs never need purging because each version is a new URL. Old versions naturally expire from CDN as nobody requests them. This avoids purge propagation delay and miss storms entirely.

**Q3:** What problem does purge deduplication solve?
- A) CDN rate limits
- B) Cache miss storms
- C) Slow DNS propagation
- D) SSL certificate renewal
**Answer: A** — CDN purge APIs have rate limits (CloudFront: 3000 paths/min). Deduplication prevents sending redundant purge requests for the same URL within a short window, staying within rate limits.

**Q4:** What is a surrogate key in Fastly?
- A) A backup CDN provider
- B) A cache key for storing surrogate responses
- C) A tag associated with cached responses for batch invalidation
- D) A DNS record for CDN routing
**Answer: C** — Surrogate keys (cache tags) are metadata headers set by the origin. All responses with a given surrogate key can be purged in a single API call. Example: \`Surrogate-Key: product-123 category-electronics\`.

**Q5:** What should you use with a purge to prevent a cache miss storm?
- A) Longer TTL
- B) Stale-while-revalidate + Origin Shield
- C) More CDN nodes
- D) Smaller cache keys
**Answer: B** — Stale-while-revalidate serves old content while fetching fresh in background. Origin Shield coalesces concurrent cache misses. Together they prevent the database-leveling traffic spike that follows a mass purge.

## 15. Next Steps

- **CDN Fundamentals (04-06)** — Understanding CDN architecture, Anycast routing, and caching behavior.
- **Edge Computing (04-07)** — Running code at the CDN edge for dynamic content and personalization.
- **Cache Invalidation Strategies (04-05)** — General cache invalidation approaches beyond CDNs.
- **Caching Patterns (04-03)** — Application-level caching patterns (Cache-Aside, Write-Through, Write-Back).`,
    estimatedMin: 14,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Shopify", "Fastly", "GitHub", "Netflix", "Vercel", "Cloudflare"],
    tags: ["CDN", "cache-invalidation", "purge", "surrogate-keys", "versioned-urls", "stale-while-revalidate"],
  },

];