export const module04Lessons = [
  {
    id: "lesson-cache-01",
    slug: "caching-fundamentals-cache-hierarchy",
    title: "Caching Fundamentals & Cache Hierarchy",
    content: `## 1. Quick Summary

**Caching** stores copies of frequently accessed data in a high-speed storage layer to reduce latency and backend load. The **cache hierarchy** spans multiple levels: **L1/L2 CPU caches** (nanoseconds), **in-memory caches** (microseconds), **local disk caches** (milliseconds), and **CDN/network caches** (tens of milliseconds). Each level trades capacity for speed. Effective caching follows the **principle of locality**: temporal (same data accessed repeatedly) and spatial (nearby data accessed together).

## 2. Definition

A **cache** is a hardware or software component that stores data so that future requests for that data can be served faster. The cache stores a subset of data, typically transient, where the cost of retrieval from the primary store is higher than reading from cache.

**Cache Levels:**
- **L1 Cache**: Per-core CPU cache (~32 KB, ~1ns access)
- **L2 Cache**: Per-core or shared CPU cache (~256 KB, ~4ns)
- **L3 Cache**: Shared across CPU cores (~8-32 MB, ~12ns)
- **RAM**: Main memory (~16-64 GB, ~100ns)
- **SSD**: Local storage (~1 TB, ~10-100us)
- **Network Cache**: Redis, Memcached, CDN (~1-50ms)
- **Database Cache**: Buffer pool, query cache

## 3. Why It Exists / Problem It Solves

Without caching, every request hits the database or backend service. For a typical web app with 10M daily users, serving every request from the database would require massive database clusters and incur high latency (10-100ms per query). Caching reduces:
- **Latency**: Cache hits in microseconds vs milliseconds for database queries
- **Load**: Reduces database reads by 80-99%
- **Cost**: Fewer database servers needed
- **Bandwidth**: Less data transferred between services

## 4. When to Use It

- **Read-heavy workloads** — 80/20 or 90/10 read/write ratio
- **Frequently accessed data** — User profiles, product catalogs, configuration
- **Expensive computations** — Aggregations, reports, machine learning predictions
- **Hot data** — Trending content, popular products, breaking news
- **Session data** — User sessions that benefit from fast access

## 5. When NOT to Use It / Tradeoffs

- **Write-heavy workloads** — Cache invalidation overhead exceeds benefits
- **Rarely accessed data** — Caching cold data wastes memory
- **Real-time sensitive data** — Stale reads are unacceptable (use read-through with strong consistency)
- **Large objects** — Caching multi-MB files may evict many smaller useful entries

Tradeoffs: Stale data (eventual consistency), memory cost, cache invalidation complexity, cold start penalty (cache warming), additional infrastructure to maintain.

## 6. How It Works (Deep Mechanics)

**Cache Hit vs Miss:**
\`\`\`
Request → Check Cache → Hit → Return Cached Data
                      → Miss → Query Database → Store in Cache → Return Data
\`\`\`

**Locality Principles:**
- **Temporal Locality**: Recently accessed data is likely to be accessed again (user profile during a session)
- **Spatial Locality**: Data near recently accessed data is likely to be accessed (loading a page of results)

**Cache Performance Metrics:**
- **Hit Rate**: Cache hits / (hits + misses). Target: >90% for read-heavy workloads
- **Miss Rate**: 1 - hit rate
- **Latency Savings**: (DB latency - cache latency) * hit rate
- **Cache Penetration**: Requests for data that does not exist (mitigate with bloom filters or null caching)

\`\`\`typescript
// Simple in-memory cache with TTL
class Cache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  constructor(private defaultTTL: number = 60_000) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + (ttl ?? this.defaultTTL) });
  }

  delete(key: string): void { this.store.delete(key); }
}
\`\`\`

## 7. Architecture Diagram

\`\`\`
CACHE HIERARCHY:
+---------------------+   Latency   Capacity
|  L1 Cache (per CPU) |   ~1ns      32-64 KB
+---------------------+
          |
+---------------------+
|  L2 Cache (per CPU) |   ~4ns      256-512 KB
+---------------------+
          |
+---------------------+
|  L3 Cache (shared)  |   ~12ns     8-32 MB
+---------------------+
          |
+---------------------+
|  Main Memory (RAM)  |   ~100ns    16-256 GB
+---------------------+
          |
+---------------------+
|  SSD / NVMe         |   ~10-100us 256 GB - 4 TB
+---------------------+
          |
+---------------------+
|  Network Cache      |   ~1-50ms   Variable
|  (Redis, Memcached) |
+---------------------+
          |
+---------------------+
|  Database / Disk    |   ~10-100ms Petabytes
+---------------------+

APPLICATION CACHE ARCHITECTURE:
+---------+     +----------+     +----------+
| Client  | --> | App      | --> | Database |
|         |     | Server   |     |          |
+---------+     +----------+     +----------+
                   |    ^           |    ^
                   v    |           v    |
               +----------+     +----------+
               | In-Memory |     |  Redis / |
               |  Cache    |     |Memcached |
               +----------+     +----------+
\`\`\`

## 8. Real-World Flow Example

**Twitter Timeline Caching:**
1. User opens Twitter app — requests their home timeline
2. **L1 Check**: App server checks in-memory cache for user's timeline (pre-computed)
3. **L2 Check**: If miss, checks Redis cluster (timeline cached for 30 seconds)
4. **L3 Check**: If still miss, fan-out query to database for followed users' tweets
5. **Cache Update**: Timeline is computed, stored in Redis (30s TTL) and in-memory (5s TTL)
6. **Pre-computation**: When a followed user tweets, Twitter pre-computes timelines of all followers (fan-out on write)
7. Result: Cold timeline ~500ms, Warm timeline ~50ms, Hot timeline ~5ms

## 9. Reference Implementation Example

\`\`\`typescript
import { createClient } from "redis";

const redis = createClient({ url: "redis://localhost:6379" });
const localCache = new Map<string, { value: string; expiresAt: number }>();

async function getCachedData(key: string, fetchFn: () => Promise<string>, ttl = 60): Promise<string> {
  // L1: Local in-memory cache (fastest, process-local)
  const local = localCache.get(key);
  if (local && Date.now() < local.expiresAt) {
    return local.value;
  }

  // L2: Distributed cache (Redis)
  const redisValue = await redis.get(key);
  if (redisValue) {
    localCache.set(key, { value: redisValue, expiresAt: Date.now() + 5000 }); // Short local TTL
    return redisValue;
  }

  // Miss: Fetch from source
  const freshValue = await fetchFn();

  // Populate caches
  await redis.setEx(key, ttl, freshValue);
  localCache.set(key, { value: freshValue, expiresAt: Date.now() + 5000 });

  return freshValue;
}
\`\`\`

## 10. Real Company Use Cases

- **Twitter** — Timeline caching with fan-out on write. Redis clusters cache pre-computed timelines per user.
- **Meta (Facebook)** — TAO (distributed cache) for social graph data. Thousands of cache servers serving millions of requests per second.
- **Amazon** — Product detail pages cached at multiple levels: CDN for images, ElastiCache for product data, DynamoDB DAX for session data.
- **Google** — Global cache infrastructure. Search results cached in distributed memory stores. YouTube video metadata cached at the edge.

## 11. Common Interview Questions

1. "Design a caching system for a social media feed."
2. "What is the difference between caching at the application layer vs the database layer?"
3. "How do you measure cache effectiveness? What metrics matter?"
4. "What is cache penetration and how do you prevent it?"
5. "How does a cache hierarchy improve overall system performance?"
6. "Design a multi-level cache for a global e-commerce platform."
7. "What are the tradeoffs between using local memory cache vs Redis?"

## 12. Related Topics & Next Steps

- **Cache Eviction Policies** — LRU, LFU, FIFO, TTL-based
- **Caching Patterns** — Cache-Aside, Read-Through, Write-Through, Write-Back
- **Distributed Caching** — Redis Cluster, Memcached, consistent hashing
- **Cache Invalidation** — TTL, event-driven, write-through
- **CDN** — Edge caching for static and dynamic content
- **HTTP Caching** — Cache-Control, ETags, Vary headers`,
    estimatedMin: 11,
    difficulty: "BEGINNER" as const,
    companies: ["Twitter", "Meta", "Amazon", "Google"],
    tags: ["caching", "cache-hierarchy", "performance", "latency", "locality"]
  },
  {
    id: "lesson-cache-02",
    slug: "cache-eviction-policies",
    title: "Cache Eviction Policies (LRU, LFU, FIFO)",
    content: `## 1. Quick Summary

**Cache eviction policies** determine which entries to remove when the cache reaches capacity. **LRU (Least Recently Used)** removes the entry accessed furthest in the past. **LFU (Least Frequently Used)** removes the entry accessed least often. **FIFO (First In, First Out)** removes the oldest entry regardless of access patterns. **TTL (Time-To-Live)** removes entries after a fixed duration. The right policy depends on access patterns — LRU works for most general workloads, LFU for content where popularity matters, FIFO for streaming data, and TTL for time-sensitive data.

## 2. Definition

- **LRU (Least Recently Used)**: Evicts the item that has not been accessed for the longest time. Based on recency of access.
- **LFU (Least Frequently Used)**: Evicts the item accessed the fewest times over a time window. Based on frequency of access.
- **FIFO (First In, First Out)**: Evicts the item that was added first, regardless of how often it is accessed.
- **TTL (Time-To-Live)**: Evicts items after a fixed duration from creation or last access.
- **Random Replacement**: Evicts a randomly selected item. Simple but unpredictable.
- **ARC (Adaptive Replacement Cache)**: Dynamically balances between recency and frequency. Used in ZFS and some databases.

## 3. Why It Exists / Problem It Solves

Caches have finite capacity. When full, every new insertion requires removing an existing entry. The eviction policy decides which entry to sacrifice. A good policy maximizes the cache hit rate by keeping the most likely-to-be-accessed entries. The wrong policy causes thrashing — frequently needed data evicted, leading to low hit rates.

## 4. When to Use It

- **LRU**: General-purpose web application caching, database buffer pools, most common workloads
- **LFU**: Content delivery networks (videos, articles with clear popularity differences), recommendation systems
- **FIFO**: Streaming data, logs, event processing where order matters more than access patterns
- **TTL**: Time-sensitive data (pricing, inventory, API responses that must be refreshed)
- **ARC**: Mixed workloads with changing access patterns, database storage engines

## 5. When NOT to Use It / Tradeoffs

**LRU Weaknesses**: Scan-resistant — a full table scan pollutes cache by evicting useful entries. High overhead for maintaining doubly-linked list in concurrent environments.

**LFU Weaknesses**: Counter explosion — old items with high historical frequency may never be evicted (mitigate with aging). Counter storage overhead. Does not handle changing popularity well.

**FIFO Weaknesses**: Ignores access patterns entirely. Can keep stale hot items and evict frequently accessed newer items.

**TTL Weaknesses**: Fixed expiration regardless of access. Cannot adapt to changing access patterns. Hard to set optimal TTL.

## 6. How It Works (Deep Mechanics)

**LRU Implementation (Doubly-Linked List + HashMap):**
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
      // Delete the first entry (least recently used)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
\`\`\`

**LFU Implementation (Frequency-Counted):**
\`\`\`typescript
class LFUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, { value: V; freq: number }>();
  private freqMap = new Map<number, Set<K>>();
  private minFreq = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    this.incrementFreq(key, entry);
    return entry.value;
  }

  put(key: K, value: V): void {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      this.incrementFreq(key, entry);
      return;
    }
    if (this.cache.size >= this.capacity) {
      this.evict();
    }
    this.cache.set(key, { value, freq: 1 });
    this.freqMap.set(1, (this.freqMap.get(1) || new Set()).add(key));
    this.minFreq = 1;
  }

  private incrementFreq(key: K, entry: { value: V; freq: number }): void {
    const oldFreq = entry.freq;
    entry.freq++;
    this.freqMap.get(oldFreq)?.delete(key);
    if (this.freqMap.get(oldFreq)?.size === 0 && oldFreq === this.minFreq) {
      this.minFreq++;
    }
    const newFreq = entry.freq;
    if (!this.freqMap.has(newFreq)) this.freqMap.set(newFreq, new Set());
    this.freqMap.get(newFreq)!.add(key);
  }

  private evict(): void {
    const keys = this.freqMap.get(this.minFreq);
    if (keys) {
      const key = keys.values().next().value;
      keys.delete(key);
      this.cache.delete(key);
    }
  }
}
\`\`\`

## 7. Architecture Diagram

\`\`\`
LRU EVICTION:
Access order: [A] -> [B] -> [C] -> [D] -> [A] -> [E]
Cache size: 3

Step 1: [A]
Step 2: [A] [B]
Step 3: [A] [B] [C] (full)
Step 4: Access A → [B] [C] [A]
Step 5: Insert D → evict B → [C] [A] [D]
Step 6: Insert E → evict C → [A] [D] [E]

LFU EVICTION:
Access counts: A(5), B(3), C(1), D(2), E(1)
Cache size: 3

Step 1: A(5), B(3), C(1) (full, minFreq=1)
Step 2: Insert D(1) → evict C (oldest among freq=1)
Step 3: D accessed → D(2)
Step 4: Insert E(1) → evict E... wait, E just added
  Actually evicts the one with lowest freq (among freq=1: E)
\`\`\`

## 8. Real-World Flow Example

**Redis Cache as Database Buffer:**
1. Application queries Redis for product data before hitting PostgreSQL
2. Redis configured with maxmemory=4GB and allkeys-lru eviction
3. Black Friday traffic hits — millions of unique products accessed
4. LRU policy ensures the most popular products (recently viewed) stay cached
5. Less popular products from last week's browsing are evicted
6. Hit rate stays at 92% even under 10x normal traffic
7. After Black Friday, access pattern shifts — LRU adapts automatically

## 9. Reference Implementation Example

\`\`\`typescript
// TTL-based cache with automatic eviction
class TTLCache<K, V> {
  private store = new Map<K, { value: V; expiresAt: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private defaultTTL: number = 60_000) {
    // Periodic cleanup every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V, ttl?: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + (ttl ?? this.defaultTTL) });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  destroy(): void { clearInterval(this.cleanupInterval); }
}
\`\`\`

## 10. Real Company Use Cases

- **Redis** — Supports multiple eviction policies: allkeys-lru (default), allkeys-lfu, volatile-lru, volatile-ttl, allkeys-random, noeviction.
- **Memcached** — Uses LRU by default. Each slab class has its own LRU. Can be set to no-eviction mode.
- **Varnish (HTTP cache)** — Uses LRU by default. Also supports TTL-based expiration via Cache-Control headers.
- **PostgreSQL** — Buffer pool uses clock-scan algorithm (approximation of LRU) with ring buffers for bulk operations.
- **Google Borg/Omega** — Cache eviction policies for container image caching.

## 11. Common Interview Questions

1. "Implement an LRU cache from scratch."
2. "Compare LRU vs LFU. When would you choose each?"
3. "How does Redis implement its LRU eviction? Is it true LRU?"
4. "What is the cache thrashing problem and how do policies mitigate it?"
5. "Design a cache eviction policy that adapts to changing workloads."
6. "How does PostgreSQL's clock-scan algorithm work?"
7. "What are the performance characteristics of LFU compared to LRU?"

## 12. Related Topics & Next Steps

- **Caching Patterns** — Cache-Aside, Read-Through, Write-Through
- **Distributed Caching** — Redis Cluster consistent hashing
- **Cache Invalidation** — TTL, event-driven, write-through
- **Adaptive Replacement Cache (ARC)** — Hybrid LRU/LFU algorithm
- **SLRU (Segmented LRU)** — Two-tier LRU for improved scan resistance
- **2Q** — LRU variant with separate queues for cold and hot data`,
    estimatedMin: 13,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Redis", "Memcached", "PostgreSQL", "Google"],
    tags: ["LRU", "LFU", "cache-eviction", "FIFO", "TTL"]
  },
  {
    id: "lesson-cache-03",
    slug: "caching-patterns",
    title: "Cache-Aside, Read-Through, Write-Through, Write-Back",
    content: `## 1. Quick Summary

**Caching patterns** define how application code interacts with the cache and the primary data store. **Cache-Aside** (lazy loading) is the most common — the application checks the cache first and falls back to the database on miss. **Read-Through** delegates cache misses to the cache layer itself. **Write-Through** writes to both cache and database synchronously. **Write-Back** writes to the cache first and asynchronously persists to the database. Each pattern balances consistency, latency, and complexity differently.

## 2. Definition

**Cache-Aside (Lazy Loading):**
- Application code is responsible for both cache and database interactions
- On read: check cache → if hit, return; if miss, load from DB, store in cache, return
- On write: write to DB, then invalidate or update cache
- Most widely used pattern (Redis + application code)

**Read-Through:**
- Cache layer (e.g., Redis, library) handles loading from the database
- Application code only talks to the cache
- Cache miss triggers automatic loading by the cache provider
- Example: Amazon DynamoDB DAX, ORM caching (Hibernate)

**Write-Through:**
- Every write goes to both cache and database atomically
- Data is always consistent between cache and DB
- Higher write latency (two writes)
- Example: Cache-aside with synchronous cache update on write

**Write-Behind (Write-Back):**
- Data is written to cache immediately, DB asynchronously
- Very low write latency (one write)
- Risk of data loss if cache fails before DB persistence
- Example: SSD write-back cache, HDD write-back cache

## 3. Why It Exists / Problem It Solves

Each pattern solves a specific consistency-latency tradeoff:
- **Cache-Aside**: Simple, flexible, works with existing code. Requires careful invalidation logic.
- **Read-Through**: Simplifies application code (single source of truth abstraction). Vendor lock-in risk.
- **Write-Through**: Strong consistency between cache and DB. Higher write latency.
- **Write-Back**: Highest write performance. Risk of data loss. Used when write throughput is critical.

## 4. When to Use It

- **Cache-Aside**: Most web applications. You control the code and need flexibility in invalidation.
- **Read-Through**: When using managed caching services (DAX, EHCache), ORMs with query caching.
- **Write-Through**: When read-after-write consistency is critical (user sessions, inventory counts).
- **Write-Back**: High-throughput write workloads (analytics, logging, metrics), SSD cache layers.

## 5. When NOT to Use It / Tradeoffs

**Cache-Aside**: Cache stampede risk (multiple requests miss simultaneously and all hit DB). Stale data between write and cache invalidation.

**Read-Through**: Cache stampede still exists but is handled by the cache layer (lock/mutex on miss). Less control over loading logic.

**Write-Through**: Higher latency per write (penalty may be 2x or more). Writes to cache may be wasted if data is never read again.

**Write-Back**: Data loss risk on cache failure. Complex reconciliation. Hard to debug inconsistencies.

## 6. How It Works (Deep Mechanics)

**Cache-Aside Pattern:**
\`\`\`typescript
// READ
async function getUser(userId: string): Promise<User> {
  // 1. Check cache
  const cached = await redis.get(\`user:\${userId}\`);
  if (cached) return JSON.parse(cached);
  // 2. Cache miss — load from DB
  const user = await db.users.findUnique({ where: { id: userId } });
  // 3. Store in cache (with TTL)
  await redis.setEx(\`user:\${userId}\`, 300, JSON.stringify(user));
  return user;
}

// WRITE
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  // 1. Write to DB
  const user = await db.users.update({ where: { id: userId }, data });
  // 2. Invalidate or update cache
  await redis.del(\`user:\${userId}\`); // Invalidation (simpler)
  // OR
  await redis.setEx(\`user:\${userId}\`, 300, JSON.stringify(user)); // Update
  return user;
}
\`\`\`

**Read-Through Pattern (with cache stampede protection):**
\`\`\`typescript
async function readThrough(key: string, ttl: number, fetchFn: () => Promise<string>): Promise<string> {
  const cached = await redis.get(key);
  if (cached) return cached;

  // Mutex to prevent cache stampede
  const lockKey = \`lock:\${key}\`;
  const lock = await redis.set(lockKey, "1", { NX: true, EX: 10 });
  if (lock) {
    try {
      const value = await fetchFn();
      await redis.setEx(key, ttl, value);
      return value;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Wait and retry
    await new Promise((r) => setTimeout(r, 100));
    return readThrough(key, ttl, fetchFn);
  }
}
\`\`\`

## 7. Architecture Diagram

\`\`\`
CACHE-ASIDE (Lazy Loading):
Read:                     Write:
Client → App → Cache?     Client → App → DB
              ↓ miss               ↓
              DB → Cache → App   Cache invalidation

READ-THROUGH:
Client → App → Cache (check)
              ↓ miss
              Cache → DB → Cache → App

WRITE-THROUGH:
Client → App → DB + Cache (both, synchronously)

WRITE-BACK (Write-Behind):
Client → App → Cache (immediate)
              ↓ (async)
              DB (eventually)
\`\`\`

## 8. Real-World Flow Example

**E-commerce Product Catalog with Cache-Aside:**
1. User searches for "wireless headphones"
2. Search service checks Redis cache for query results (key: \`search:wireless-headphones\`)
3. Cache miss — service queries Elasticsearch, gets product IDs
4. For each product ID, get product details via getProduct() — checks Redis product cache first
5. Product cache hits — return cached JSON (popular products stay cached)
6. Product cache miss — load from PostgreSQL, cache for 5 minutes
7. Admin updates product price — PUT /products/123 triggers cache invalidation (delete product cache, delete search result cache for affected queries)
8. Next search for same query recomputes results

## 9. Reference Implementation Example

\`\`\`typescript
// Cache-Aside with automatic stampede protection
class CacheAside<T> {
  constructor(private ttl: number, private fetchFn: (key: string) => Promise<T>) {}

  async get(key: string): Promise<T> {
    const cached = await this.getFromCache(key);
    if (cached !== null) return cached;
    return this.loadAndCache(key);
  }

  private async getFromCache(key: string): Promise<T | null> {
    // In production, call Redis
    return null;
  }

  private async loadAndCache(key: string): Promise<T> {
    const value = await this.fetchFn(key);
    await this.setInCache(key, value);
    return value;
  }

  private async setInCache(key: string, value: T): Promise<void> {
    // In production, call Redis with TTL
  }

  async invalidate(key: string): Promise<void> {
    // Delete from cache
  }
}

// Usage
const productCache = new CacheAside<Product>(
  300, // 5 minute TTL
  async (id) => db.products.findUnique({ where: { id } })
);
const product = await productCache.get("product-123");
\`\`\`

## 10. Real Company Use Cases

- **Amazon DynamoDB DAX** — Read-through cache. DAX cluster sits between application and DynamoDB. Cache misses are handled transparently.
- **Redis + PostgreSQL (most companies)** — Cache-Aside. Application code manages cache logic. Redis handles TTL, eviction.
- **Netflix EVCache** — Write-back cache for user viewing history. Data written to cache first, asynchronously persisted to Cassandra.
- **Linux Page Cache** — Write-back. Data written to memory first, flushed to disk (pdflush). Writethrough for journaling filesystems.

## 11. Common Interview Questions

1. "Compare Cache-Aside vs Read-Through. When would you use each?"
2. "What is a cache stampede and how do you prevent it?"
3. "Explain Write-Through vs Write-Back caches. What are the tradeoffs?"
4. "Design a caching layer for an e-commerce product catalog."
5. "How does Amazon DynamoDB DAX implement read-through caching?"
6. "What happens if the cache fails in a Write-Back scenario?"
7. "How do you handle cache invalidation in a Write-Through pattern?"

## 12. Related Topics & Next Steps

- **Cache Eviction Policies** — LRU, LFU, FIFO
- **Cache Invalidation** — TTL, event-driven, write-through
- **Consistent Hashing** — Distributed cache partitioning
- **Distributed Caching** — Redis Cluster, Memcached
- **Cache Stampede Prevention** — Mutex locks, probabilistic early expiration
- **Write-Ahead Log** — Durability pattern for write-back caches`,
    estimatedMin: 14,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Amazon", "Redis", "Netflix", "Google"],
    tags: ["cache-aside", "read-through", "write-through", "write-back", "caching-patterns"]
  },
  {
    id: "lesson-cache-04",
    slug: "distributed-caching-redis-memcached",
    title: "Distributed Caching (Redis, Memcached)",
    content: `## 1. Quick Summary

**Distributed caching** uses a cluster of cache servers to provide a scalable, high-performance caching layer accessible to multiple application instances. **Redis** and **Memcached** are the two dominant distributed cache systems. **Redis** is feature-rich — supports data structures, persistence, replication, pub/sub, Lua scripting, and clustering. **Memcached** is simpler and faster for basic key-value caching but lacks persistence and advanced features. The choice depends on whether you need simple throughput (Memcached) or rich data operations (Redis).

## 2. Definition

**Redis** (Remote Dictionary Server) is an in-memory data structure store that supports strings, hashes, lists, sets, sorted sets, streams, bitmaps, and geospatial indexes. It offers optional persistence (RDB snapshots, AOF logs), replication (master-replica), high availability (Redis Sentinel), and automatic partitioning (Redis Cluster).

**Memcached** is a simple, high-performance distributed memory object caching system. It stores key-value pairs with string keys and binary values. It is multithreaded (uses multiple cores) and has no persistence, replication, or data structure support.

**Common Features:** Both use an in-memory storage model, provide sub-millisecond latency, support TTL-based expiration, and use a client-server architecture with TCP/UDP protocols.

## 3. Why It Exists / Problem It Solves

Single-server caches cannot scale beyond a single machine's memory. Distributed caches solve:
- **Capacity scaling** — Aggregate RAM across multiple servers
- **High availability** — Replicas and failover mechanisms
- **Concurrent access** — Multiple app servers share the same cache
- **Durability** (Redis) — Survive restarts with optional persistence
- **Rich data operations** (Redis) — Atomic operations on complex data structures

## 4. When to Use It

- **Redis**: Session stores, real-time leaderboards, rate limiters, message queues (pub/sub, streams), geospatial queries, caching with complex data types, need for persistence
- **Memcached**: Simple key-value caching, high throughput (multithreaded), large objects (up to 1MB per key), when data loss on restart is acceptable

## 5. When NOT to Use It / Tradeoffs

**Redis**: Single-threaded for command execution (pipelining helps). Memory overhead for complex data structures. Clustering adds complexity. Persistence can impact performance.

**Memcached**: No persistence (data lost on restart). No replication (single point of failure). Limited to 1MB key size. No data structures beyond key-value. LRU eviction is per-slab-class, not global.

**Both**: In-memory cost ($). Network latency (vs local cache). Cache invalidation complexity. Cold start problem.

## 6. How It Works (Deep Mechanics)

**Redis Data Structures and Operations:**
\`\`\`
STRING:  SET user:123 '{"name":"Alice"}' EX 300
HASH:    HSET user:123 name "Alice" email "alice@example.com"
LIST:    LPUSH recent:items "item1" / LRANGE recent:items 0 9
SET:     SADD friends:123 "user:456" / SMEMBERS friends:123
SORTED SET: ZADD leaderboard 1000 "player1" / ZREVRANGE leaderboard 0 9
STREAM:  XADD events * type "login" userId 123
\`\`\`

**Redis Persistence:**
- **RDB (Snapshot)**: Point-in-time dump of dataset. Compact, good for backups. Potential data loss.
- **AOF (Append-Only File)**: Logs every write operation. More durable (fsync policies). Larger file size.
- **Hybrid**: Redis 7+ combines RDB + AOF for best of both.

**Redis High Availability:**
\`\`\`
+--------+     +--------+     +--------+
| Master | --> | Replica| --> | Replica|
+--------+     +--------+     +--------+
    |              |
    |         +----------+
    |         | Sentinel | (monitoring, failover)
    |         +----------+
    |
+--------+
| Client |
|(uses   |
|Sentinel)|
+--------+
\`\`\`

**Memcached Architecture:**
- Multiple threads (event-driven with libevent)
- Slab allocation: memory divided into slab classes (64B, 128B, ... 1MB)
- LRU eviction per slab class
- No authentication, no replication, no persistence

**Consistent Hashing for Sharding:**
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
    const idx = this.sortedKeys.findIndex(k => k >= hash);
    const targetIdx = idx === -1 ? 0 : idx;
    return this.ring.get(this.sortedKeys[targetIdx])!;
  }

  private hash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
\`\`\`

## 7. Architecture Diagram

\`\`\`
DISTRIBUTED CACHE ARCHITECTURE:

+----------+     +----------+     +----------+
| App Svr 1|     | App Svr 2|     | App Svr N|
+-----+----+     +-----+----+     +-----+----+
      |                |                |
      +----------------+----------------+
                       |
            Consistent Hash Ring
                       |
      +--------+ +--------+ +--------+
      | Cache  | | Cache  | | Cache  |
      | Node 1 | | Node 2 | | Node 3 |
      | (Redis)| | (Redis)| | (Redis)|
      +--------+ +--------+ +--------+
          |           |           |
      +--------+ +--------+ +--------+
      |Replica | |Replica | |Replica |
      | 1A     | | 2A     | | 3A     |
      +--------+ +--------+ +--------+

REDIS CLUSTER ARCHITECTURE:
+----------+     +----------+     +----------+
| Master A |     | Master B |     | Master C |
| slots     |     | slots     |     | slots     |
| 0-5460   |     | 5461-10922|     | 10923-16383|
+----+-----+     +----+-----+     +----+-----+
     |                |                |
+----+-----+     +----+-----+     +----+-----+
| Replica A1|     | Replica B1|     | Replica C1|
| (failover)|     | (failover)|     | (failover)|
+-----------+     +-----------+     +-----------+
\`\`\`

## 8. Real-World Flow Example

**Redis as Session Store in E-commerce:**
1. User logs in — session created, stored in Redis as HASH: \`HSET session:abc123 userId 123 cartItems 3 lastActivity 1716000000\`
2. User adds item to cart — \`HINCRBY session:abc123 cartItems 1\` (atomic increment)
3. User adds another item — request routed to any app server (stateless), all read from same Redis cluster
4. Cart displayed — \`HGETALL session:abc123\` returns all session data in <1ms
5. Traffic spikes during Flash Sale — Redis Cluster scales by adding shards
6. If a Redis node fails — Sentinel promotes replica to master, connection loss <10s

## 9. Reference Implementation Example

\`\`\`typescript
import { createClient, RedisClientType } from "redis";
import Memcache from "memcache-client";

// Redis Client
const redis: RedisClientType = createClient({ url: "redis://localhost:6379" });
await redis.connect();

// Redis Cluster
const redisCluster = createClient({
  cluster: {
    rootNodes: [
      { url: "redis://node1:6379" },
      { url: "redis://node2:6379" },
      { url: "redis://node3:6379" },
    ],
  },
});

// Set with TTL
await redis.setEx("key", 3600, "value");

// Atomic operations
await redis.incr("counter");
await redis.lPush("queue", "job");
await redis.sAdd("set", "member");
await redis.zAdd("leaderboard", { score: 1000, value: "player1" });

// Transaction
const multi = redis.multi();
multi.set("key1", "val1");
multi.incr("counter");
const results = await multi.exec();

// Memcached Client
const memcached = new Memcache({ server: "localhost:11211" });
await memcached.set("key", "value", 3600);
const value = await memcached.get("key");

// Distributed cache abstraction
class DistributedCache {
  constructor(private client: RedisClientType) {}

  async getOrCompute<T>(key: string, ttl: number, compute: () => Promise<T>): Promise<T> {
    const cached = await this.client.get(key);
    if (cached) return JSON.parse(cached);
    const value = await compute();
    await this.client.setEx(key, ttl, JSON.stringify(value));
    return value;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) await this.client.del(keys);
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Twitter** — Redis for timeline caching, rate limiting, real-time analytics. Thousands of Redis instances.
- **Pinterest** — Uses Redis extensively for feed caching, session storage, and real-time notifications. Migrated from Memcached to Redis.
- **Facebook/Meta** — Memcached at massive scale (thousands of servers). Developed mcrouter for routing. Also uses TAO (custom distributed cache) for social graph.
- **GitHub** — Redis for job queues (Sidekiq), session storage, and caching. Memcached for Git data caching.
- **Amazon ElastiCache** — Managed Redis and Memcached. Used by thousands of AWS customers.

## 11. Common Interview Questions

1. "Compare Redis and Memcached. When would you choose each?"
2. "How does Redis Cluster shard data? What is the hash slot concept?"
3. "Design a distributed caching layer for a social media platform."
4. "How does consistent hashing work and how does it minimize rehashing?"
5. "Explain Redis Sentinel and how automatic failover works."
6. "How does Memcached handle memory allocation? What are slab classes?"
7. "What are the tradeoffs between Redis RDB and AOF persistence?"
8. "How do you handle cache warming when a new Redis node is added?"

## 12. Related Topics & Next Steps

- **Consistent Hashing** — Distributed cache partitioning
- **Redis Streams** — Message queue with consumer groups
- **Redis Modules** — RediSearch, RedisJSON, RedisGraph
- **Cache Eviction Policies** — LRU, LFU in Redis
- **Cache Invalidation** — TTL, event-driven, write-through
- **CDN Caching** — Edge caching for static content`,
    estimatedMin: 15,
    difficulty: "ADVANCED" as const,
    companies: ["Twitter", "Meta", "GitHub", "Amazon"],
    tags: ["Redis", "Memcached", "distributed-caching", "consistent-hashing", "Redis-Cluster"]
  },
  {
    id: "lesson-cache-05",
    slug: "cache-invalidation-strategies",
    title: "Cache Invalidation Strategies",
    content: `## 1. Quick Summary

**Cache invalidation** is the process of removing or updating cached data when the underlying source data changes. It is one of the two hard things in computer science (along with naming and off-by-one errors). Strategies include **TTL-based** (time-based expiration), **write-through** (update cache on write), **event-driven** (publish invalidation events), and **version-based** (invalidate on version change). Poor invalidation causes **stale reads** or **cache inconsistency**.

## 2. Definition

- **TTL (Time-To-Live)**: Each cache entry has an expiration time. After TTL expires, the entry is evicted on next read.
- **Write-Through Invalidation**: When data is updated in the database, the cache is updated or invalidated as part of the same transaction.
- **Event-Driven Invalidation**: Services publish invalidation events (via message queue) when data changes. Cache consumers listen and evict affected keys.
- **Version-Based Invalidation**: Data has a version number. Cache key includes the version. When data changes, version increments → new cache key.
- **Explicit Deletion**: Manually delete cache keys when data changes (most common with Cache-Aside pattern).

## 3. Why It Exists / Problem It Solves

Without invalidation, cached data becomes stale. Users see outdated information: wrong prices, old profiles, missing comments. The longer data stays in cache past its freshness window, the more inconsistency grows. Invalidation balances **freshness** (how up-to-date data is) with **performance** (caching benefits).

## 4. When to Use It

- **TTL**: Best for data where staleness is acceptable within a window (news feed, product recommendations, search results)
- **Write-Through**: Best when read-after-write consistency is critical (user profile updates, password changes, inventory decrements)
- **Event-Driven**: Best in microservice architectures where multiple services cache the same data and need coordinated invalidation
- **Version-Based**: Best for data with clear versioning (CMS content, config files, feature flags)

## 5. When NOT to Use It / Tradeoffs

**TTL**: Stale data within the TTL window. Hard to set the right TTL. Burst of misses when many entries expire simultaneously (thundering herd).

**Write-Through**: Higher write latency. Invalidation may be wasted if cached data was never read or already expired. Complex in distributed systems.

**Event-Driven**: Eventual consistency — lag between write and invalidation. Message ordering complexity. Need to handle lost events.

**Version-Based**: Increased cache storage (multiple versions). Complex key management. Clients must know the current version.

## 6. How It Works (Deep Mechanics)

**TTL-Based Invalidation:**
\`\`\`typescript
// Redis SET with EX (expire in seconds)
await redis.setEx("product:123", 600, JSON.stringify(product));
// After 600 seconds, the key is automatically evicted
// On access: check TTL, if expired treat as miss

// Probabilistic early expiration (prevents thundering herd)
const TTL = 600;
const beta = 1.0;
const expiry = getRandomExpiry(TTL, beta); // ~TTL * (1 + random * beta)

function getRandomExpiry(baseTTL: number, beta: number): number {
  return baseTTL * (1 + (Math.random() - 0.5) * beta);
}
\`\`\`

**Write-Through Invalidation (Cache-Aside pattern):**
\`\`\`typescript
// Method 1: Delete cache on write (simpler, more consistent)
async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  const product = await db.products.update({ where: { id }, data });
  await redis.del(\`product:\${id}\`); // Invalidate — next read will fetch fresh
  return product;
}

// Method 2: Update cache on write (faster reads, more complex)
async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  const product = await db.products.update({ where: { id }, data });
  await redis.setEx(\`product:\${id}\`, 600, JSON.stringify(product)); // Update
  return product;
}
\`\`\`

**Event-Driven Invalidation:**
\`\`\`typescript
// Service A (updates data)
await db.products.update({ where: { id }, data });
await queue.publish("product.updated", { id, timestamp: Date.now() });

// Cache Service (listens for invalidation events)
queue.subscribe("product.updated", async (event) => {
  const cacheKeys = await redis.keys(\`product:\${event.id}:*\`);
  if (cacheKeys.length > 0) await redis.del(cacheKeys);
});

// Services also invalidate their own caches
await redis.del(\`product:\${event.id}\`);
await redis.del(\`product:related:\${event.id}\`);
\`\`\`

## 7. Architecture Diagram

\`\`\`
INVALIDATION STRATEGIES:

TTL-BASED:
+--------+     +--------+     +--------+
| Write  | --> | Cache  | --> | Expire |
|   DB   |     | (TTL)  |     | after  |
|        |     | 600s   |     | 600s   |
+--------+     +--------+     +--------+

WRITE-THROUGH:
+--------+     +--------+     +--------+
| Write  | --> | Update | --> |   DB   |
| Client |     | Cache  |     +--------+
+--------+     +--------+
                     |
                +--------+
                |Invalid-|
                | ate    |
                +--------+

EVENT-DRIVEN:
+--------+     +-------+     +----------+
| Service| --> | Queue | --> | Cache    |
| A      |     |       |     | Consumer |
| (write)|     +-------+     +----------+
+--------+                       |
                            +----+----+
                            | Invalidate|
                            | Keys     |
                            +---------+

VERSION-BASED:
Key: product:123:v2
When product updated: save product:123:v3
Old key product:123:v2 eventually evicted
\`\`\`

## 8. Real-World Flow Example

**E-commerce Inventory Management (Event-Driven + TTL):**
1. Admin updates product price in the admin panel
2. Product Service updates PostgreSQL, publishes "product.updated" event to Kafka
3. Cache Service consumes event, deletes \`product:123\` and \`product:related:123\` from Redis
4. Search Service also deletes \`search:wireless-headphones\` (since price changed)
5. API Gateway enforces 5-second TTL on product cache as safety net (if event is lost, TTL will eventually refresh)
6. Within 100ms of the price update, all cache layers are invalidated
7. Next request fetches fresh data from DB, re-caches with new TTL

## 9. Reference Implementation Example

\`\`\`typescript
// Generic cache invalidation manager
class CacheInvalidator {
  private redis: RedisClientType;
  private queue: Queue;

  constructor(redis: RedisClientType, queue: Queue) {
    this.redis = redis;
    this.queue = queue;
  }

  // TTL-based (automatic via Redis setEx)
  async setWithTTL(key: string, value: string, ttl: number): Promise<void> {
    await this.redis.setEx(key, ttl, value);
  }

  // Explicit deletion
  async invalidateKey(key: string): Promise<void> {
    await this.redis.del(key);
  }

  // Pattern-based invalidation
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) await this.redis.del(keys);
  }

  // Publish invalidation event
  async publishInvalidation(entityType: string, entityId: string): Promise<void> {
    await this.queue.publish("cache.invalidate", { entityType, entityId, timestamp: Date.now() });
  }

  // Tag-based invalidation (cache tagging pattern)
  async setWithTags(key: string, value: string, tags: string[], ttl: number): Promise<void> {
    await this.redis.setEx(key, ttl, value);
    for (const tag of tags) {
      await this.redis.sAdd(\`tag:\${tag}\`, key);
      await this.redis.expire(\`tag:\${tag}\`, ttl + 3600);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    const keys = await this.redis.sMembers(\`tag:\${tag}\`);
    if (keys.length > 0) await this.redis.del(keys);
    await this.redis.del(\`tag:\${tag}\`);
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Amazon** — Uses TTL + event-driven invalidation for product catalog. When a seller updates price, invalidation events propagate to all cache layers within seconds.
- **Netflix** — EVCache uses TTL with a "write-through with async update" approach. Cache entries have TTL but also get explicitly invalidated on data change.
- **Meta (Facebook)** — TAO cache uses version-based invalidation. Each object has an associated version. Cache checks version with the database periodically.
- **Twitter** — Fan-out on write: when a user tweets, the tweet is inserted into all followers' timeline caches (write-through for timeline cache).

## 11. Common Interview Questions

1. "What are the main cache invalidation strategies and their tradeoffs?"
2. "How do you handle cache invalidation in a distributed system?"
3. "What is the difference between cache invalidation and cache eviction?"
4. "Design an invalidation system for a multi-service e-commerce platform."
5. "How does TTL-based invalidation interact with cache stampede prevention?"
6. "What is cache tagging and how does it help with bulk invalidation?"
7. "How do you ensure cache consistency across multiple data centers?"

## 12. Related Topics & Next Steps

- **Cache Eviction Policies** — LRU, LFU, FIFO (when to evict, not invalidate)
- **CQRS** — Command Query Responsibility Segregation (separate read/write models)
- **Event Sourcing** — Event-driven data consistency
- **CDC (Change Data Capture)** — Streaming database changes for cache invalidation
- **Saga Pattern** — Distributed transaction coordination
- **Stale-While-Revalidate** — Serving stale data while fetching fresh version`,
    estimatedMin: 13,
    difficulty: "ADVANCED" as const,
    companies: ["Amazon", "Netflix", "Meta", "Twitter"],
    tags: ["cache-invalidation", "TTL", "write-through", "event-driven", "consistency"]
  },
  {
    id: "lesson-cache-06",
    slug: "content-delivery-network-cdn",
    title: "Content Delivery Network (CDN)",
    content: `## 1. Quick Summary

A **Content Delivery Network (CDN)** is a geographically distributed network of proxy servers and data centers that delivers content to users from the nearest edge location. CDNs reduce latency, offload origin servers, and improve availability. They cache static content (images, CSS, JS, video) and increasingly support dynamic content acceleration. Major CDNs include **Cloudflare**, **Akamai**, **Amazon CloudFront**, **Fastly**, and **Google Cloud CDN**.

## 2. Definition

A **CDN** is a network of **edge servers** (Points of Presence, or PoPs) distributed across multiple geographic locations. When a user requests content, the CDN routes the request to the nearest edge server. If the edge server has the content cached, it serves it directly (cache hit). If not (cache miss), it fetches from the origin server, caches it, and serves it.

**Key Components:**
- **Origin Server**: The source of truth for content
- **Edge Server (PoP)**: Caches and serves content to end users
- **Routing System**: DNS-based or Anycast-based routing to nearest PoP
- **CDN Configuration**: Rules for caching behavior, TTLs, cache keys

## 3. Why It Exists / Problem It Solves

Without a CDN:
- Users far from the origin server experience high latency (200-500ms for cross-continental requests)
- Origin server handles all traffic, requiring massive capacity for peak loads
- DDoS attacks hit the origin directly
- Bandwidth costs are high (origin server egress)

CDN solves: **latency** (serving from edge <10ms vs origin 100ms+), **scale** (absorbing traffic spikes), **availability** (origin offload, DDoS absorption), **cost** (lower egress pricing at CDN).

## 4. When to Use It

- **Static assets** — Images, CSS, JavaScript, fonts, PDFs (essential)
- **Video streaming** — HLS/DASH segments stored at edge
- **Software downloads** — Large files (ISOs, app binaries)
- **Global applications** — Users distributed worldwide
- **Traffic spikes** — Product launches, flash sales, viral content
- **API acceleration** — Dynamic content via CDN (CloudFront Lambda@Edge, Cloudflare Workers)
- **DDoS protection** — CDN absorbs large volumetric attacks

## 5. When NOT to Use It / Tradeoffs

- **Internal applications** — Users on the same network do not benefit from edge distribution
- **Real-time data** — Stock tickers, live chat, where caching adds unacceptable staleness
- **Very small deployments** — Single-region app with few users may not justify CDN setup
- **Highly personalized content** — Every user sees unique content (cache hit rate near 0%)

Tradeoffs: Cache invalidation complexity (purge propagation time), cost for high-traffic CDN usage, cold cache issues on new deployments, DNS propagation delays for CDN changes.

## 6. How It Works (Deep Mechanics)

**Request Routing (Anycast vs DNS):**

\`\`\`
+--------+     +----------+     +----------+     +----------+
| User   | --> | DNS      | --> | Nearest  | --> | Origin   |
| (Japan)|     | Resolves |     | PoP      |     | Server   |
|        |     | to        |     | (Tokyo)  |     | (US)     |
+--------+     | nearest  |     +----------+     +----------+
               | PoP      |          |
               +----------+     +----------+
                                | Cached?  |
                                | Hit  → Serve|
                                | Miss → Fetch|
                                | from Origin |
                                +----------+
\`\`\`

**Cache Key Determination:**
\`\`\`
Default cache key: scheme + host + path + query string
Example: https://cdn.example.com/images/logo.png?v=2

Custom cache key (CloudFront):
  - Include specific query params: ?v=2 → different cache entries for v=1, v=2
  - Include cookies: ?session=abc → personalized cache entries
  - Include headers: Accept-Language → different entries per locale

Cache control via headers:
  Cache-Control: public, max-age=31536000, immutable   (1 year, versioned assets)
  Cache-Control: public, max-age=60, s-maxage=3600     (CDN caches 1hr, browser 1min)
  Cache-Control: private, max-age=0                     (no caching)
\`\`\`

**CDN Caching Behavior:**
\`\`\`
1. User requests /images/logo.png
2. DNS resolves to nearest PoP
3. PoP checks local cache for /images/logo.png
4a. Cache HIT: Return cached file (HTTP 200 with CF-Cache-Status: HIT)
4b. Cache MISS: Forward to origin, cache response based on Cache-Control headers
5. Origin returns 200 with Cache-Control: public, max-age=86400
6. PoP caches for 86400s (24 hours), returns to user
7. Subsequent requests within 24h → HIT
\`\`\`

## 7. Architecture Diagram

\`\`\`
GLOBAL CDN ARCHITECTURE:

                   +-----------------+
                   |   Origin Server |
                   |   (us-east-1)   |
                   +--------+--------+
                            |
            +---------------+---------------+
            |               |               |
    +-------+-------+  +-------+-------+  +-------+-------+
    | US East PoP  |  | EU West PoP   |  | Asia PoP      |
    | (NYC)        |  | (Frankfurt)   |  | (Tokyo)       |
    | Cached: 85%  |  | Cached: 82%  |  | Cached: 78%   |
    +-------+-------+  +-------+-------+  +-------+-------+
            |               |               |
    +-------+-------+  +-------+-------+  +-------+-------+
    |   ISP A       |  |   ISP B       |  |   ISP C       |
    +-------+-------+  +-------+-------+  +-------+-------+
            |               |               |
    +-------+-------+  +-------+-------+  +-------+-------+
    | End Users     |  | End Users     |  | End Users     |
    | (US)          |  | (Europe)      |  | (Asia)        |
    +---------------+  +---------------+  +---------------+

LAYERED CACHING:
Browser Cache → ISP Cache → CDN Edge → CDN Regional → Origin
(Private)     (Shared)     (Shared)    (Shared)       (Source)
\`\`\`

## 8. Real-World Flow Example

**Netflix Video Delivery (Open Connect CDN):**
1. User selects a movie on Netflix
2. Netflix app requests manifest file from Netflix API
3. Manifest contains URLs to CDN (Open Connect Appliance — OCA)
4. Netflix's proprietary CDN (Open Connect) has OCAs deployed inside ISP data centers
5. OCA checks if requested video segments are cached locally
6. Cache hit: Stream directly from OCA (<5ms latency)
7. Cache miss: OCA fetches from Netflix origin servers, caches it, serves
8. Popular content (Stranger Things new season) pre-populated to OCAs during off-peak hours
9. Less popular content fetched on first request (cache fill)
10. Result: >95% of Netflix traffic served from Open Connect, <50ms startup time

## 9. Reference Implementation Example

\`\`\`typescript
// CDN configuration via CloudFront (AWS CDK)
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";

const bucket = new s3.Bucket(this, "StaticAssets");

const cdn = new cloudfront.Distribution(this, "CDN", {
  defaultBehavior: {
    origin: new origins.S3Origin(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: new cloudfront.CachePolicy(this, "AssetsCachePolicy", {
      defaultTtl: Duration.days(365),
      maxTtl: Duration.days(365),
      minTtl: Duration.seconds(0),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList("v"),
    }),
    compress: true,
  },
  additionalBehaviors: {
    "/api/*": {
      origin: new origins.HttpOrigin("api.example.com"),
      cachePolicy: new cloudfront.CachePolicy(this, "APICachePolicy", {
        defaultTtl: Duration.seconds(60),
        maxTtl: Duration.seconds(300),
      }),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    },
  },
  priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
});

// Cache invalidation (deploy new version)
// cdn.createInvalidation({ paths: ["/*"] });
\`\`\`

## 10. Real Company Use Cases

- **Netflix** — Open Connect CDN. Custom appliances deployed inside ISP networks. Handles >95% of traffic.
- **Amazon** — CloudFront CDN for AWS services, Amazon.com product images, and Prime Video.
- **Google** — Google Cloud CDN for YouTube, Google Search, and GCP customers. Massive global infrastructure.
- **Cloudflare** — Reverse proxy CDN protecting 20M+ websites. Built-in DDoS protection, WAF, Workers.
- **Akamai** — Enterprise CDN for the world's largest streaming events (Super Bowl, Olympics). 300K+ servers globally.
- **Shopify** — Uses Fastly CDN for storefront assets. Cache purging on product/theme updates.

## 11. Common Interview Questions

1. "Design a CDN for a global video streaming service."
2. "How does a CDN route requests to the nearest edge server?"
3. "What is the difference between Anycast and DNS-based CDN routing?"
4. "How do you handle cache invalidation in a CDN?"
5. "How does a CDN handle dynamic content (uncacheable)?"
6. "What is the difference between a CDN and a reverse proxy?"
7. "How does Cloudflare's CDN differ from AWS CloudFront?"
8. "Design a multi-CDN strategy for high availability."

## 12. Related Topics & Next Steps

- **Edge Computing** — Running code at the CDN edge (Cloudflare Workers, Lambda@Edge)
- **CDN Cache Invalidation** — Purge strategies and propagation delay
- **HTTP Caching** — Cache-Control, ETags, Vary headers, conditional requests
- **Anycast Routing** — BGP-based traffic steering
- **Origin Shield** — Protecting origin servers from cache misses
- **Multi-CDN** — Using multiple CDNs for redundancy and performance`,
    estimatedMin: 13,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Netflix", "Amazon", "Google", "Cloudflare"],
    tags: ["CDN", "edge", "content-delivery", "Akamai", "CloudFront"]
  },
  {
    id: "lesson-cache-07",
    slug: "edge-computing",
    title: "Edge Computing",
    content: `## 1. Quick Summary

**Edge computing** brings computation and data storage closer to the point of use, reducing latency and bandwidth usage. At the **CDN edge**, serverless functions run in PoPs to handle dynamic content, authentication, A/B testing, image optimization, and API aggregation — without round-tripping to the origin. Major platforms include **Cloudflare Workers**, **AWS Lambda@Edge**, **Fastly Compute@Edge**, and **Akamai EdgeWorkers**.

## 2. Definition

**Edge computing** is a distributed computing paradigm that processes data near the edge of the network, where the data is generated or consumed. In the context of CDNs, edge functions (serverless) execute at PoPs closest to users.

**Platform Comparison:**
| Platform | Runtime | Cold Start | Memory | Max Duration |
|----------|---------|------------|--------|--------------|
| Cloudflare Workers | V8 Isolates | <1ms | 128MB | 30s (CPU) |
| Lambda@Edge | Node.js, Python | ~50ms | 128-3008MB | 5-30s |
| Fastly Compute@Edge | Wasm | <1ms | N/A | 5ms-30s |
| Akamai EdgeWorkers | JS (ES2020) | <5ms | 200MB | 50ms-5s |

## 3. Why It Exists / Problem It Solves

Traditional CDNs only cache static content. Dynamic requests (personalized content, API calls, authentication, A/B testing) still needed to go to the origin. Edge computing solves:
- **Latency** — Process requests at the edge instead of round-tripping to origin
- **Origin offload** — Handle authentication, routing, transformation at edge
- **Personalization at scale** — Serve user-specific content from the edge
- **Bandwidth reduction** — Transform, optimize, and compress at edge
- **Regional logic** — Different responses per geography (compliance, localization)

## 4. When to Use It

- **A/B testing** — Route users to different experiment variants at the edge
- **Authentication & authorization** — Validate JWT tokens at PoP before requests reach origin
- **Image optimization** — Resize, compress, convert to WebP/AVIF at edge
- **API aggregation** — Combine multiple backend API calls into one response
- **Geo-based routing** — Serve localized content, redirect based on country
- **Bot detection** — Block malicious traffic before it reaches origin
- **Request transformation** — Modify headers, rewrite URLs, add cookies

## 5. When NOT to Use It / Tradeoffs

- **CPU-intensive work** — Edge functions have CPU limits (Cloudflare Workers: 30s CPU total)
- **Stateful processing** — Edge is stateless by design; use external KV/Durable Objects (Workers) or stickiness
- **Large dependencies** — Edge runtimes limit bundle size (Workers: 1MB, Lambda@Edge: depends on region)
- **Database connections** — No direct DB connections from edge; use HTTP APIs to backend
- **Compliance restrictions** — Data sovereignty laws may prevent edge processing in certain regions

Tradeoffs: Limited runtime capabilities (no full Node.js API in Workers), cold start for non-V8 platforms, debugging complexity, vendor lock-in, cost at scale for high-CPU operations.

## 6. How It Works (Deep Mechanics)

**Cloudflare Workers Architecture (V8 Isolates):**
\`\`\`
Every Worker runs in a V8 isolate — lightweight, starts in <1ms.
Multiple isolates share the same process (not process-per-request).
Each request is handled by an available isolate with no cold start.

Request Flow:
User → CF Edge → Workers Runtime (V8 Isolate) → Cache → Origin
                    |
              +-----------+
              | Worker    |
              | Script    |
              | fetch()   |
              | handler   |
              +-----------+
\`\`\`

**Lambda@Edge Architecture:**
\`\`\`
Lambda functions attached to CloudFront behaviors:
Viewer Request → Origin Request → Origin Response → Viewer Response

1. Viewer Request: Before cache check (auth, redirect)
2. Origin Request: After cache miss, before origin (customize origin request)
3. Origin Response: After origin response, before cache (transform, compress)
4. Viewer Response: Before returning to client (add headers, set cookies)
\`\`\`

**Edge KV Storage (Workers KV):**
\`\`\`typescript
// Global, low-latency key-value storage at edge
const KV_NAMESPACE = "SETTINGS";

async function handleRequest(request: Request): Promise<Response> {
  const config = await SETTINGS.get("feature-flags", "json");
  // config is available globally with ~50ms read latency
  return new Response(JSON.stringify(config));
}
\`\`\`

## 7. Architecture Diagram

\`\`\`
EDGE COMPUTING ARCHITECTURE:

                    +-------------------+
                    |   Origin Server   |
                    +--------+----------+
                             |
          +------------------+------------------+
          |                  |                  |
+---------+-------+  +------+--------+  +------+--------+
| Edge PoP (US)  |  | Edge PoP (EU) |  | Edge PoP (Asia)|
| +------------+ |  | +------------+ |  | +------------+ |
| | Worker     | |  | | Worker     | |  | | Worker     | |
| | Route      | |  | | A/B Test   | |  | | Geo Block  | |
| | Auth       | |  | | Optimize   | |  | | Translate  | |
| | Cache      | |  | | Cache      | |  | | Cache      | |
| +------------+ |  | +------------+ |  | +------------+ |
+----------------+  +----------------+  +----------------+

COMPARISON: TRADITIONAL VS EDGE

Traditional:                          Edge:
Client → DNS → CDN → Origin → CDN → Client   Client → Edge Worker → Origin
(auth, render, logic at origin)               (auth, routing, logic at edge)
\`\`\`

## 8. Real-World Flow Example

**Cloudflare Workers for E-commerce Edge Middleware:**
1. User (in Germany) requests \`https://shop.example.com/products/123\`
2. CF edge receives request — Workers script runs
3. Worker reads GeoIP data → detects user is in EU
4. Worker rewrites request to include \`Accept-Language: de\` and \`x-region: eu\` headers
5. Worker checks KV store for A/B test assignment for this user → assigns to variant B
6. Worker checks cache for \`product:123:de:B\` — cache hit? Serve cached
7. Cache miss — Worker sends request to EU origin (Frankfurt) with modified headers
8. Origin returns HTML — Worker compresses, adds security headers, returns
9. Worker also fires beacon to analytics endpoint (async, no blocking)

## 9. Reference Implementation Example

\`\`\`typescript
// Cloudflare Workers script
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const country = request.cf?.country || "US";

    // 1. Geo-based routing
    if (country === "CN" && url.pathname.startsWith("/api")) {
      return new Response("Not available in your region", { status: 451 });
    }

    // 2. A/B testing
    const abCookie = request.headers.get("Cookie")?.match(/ab=(\w+)/)?.[1];
    const variant = abCookie || (Math.random() < 0.5 ? "A" : "B");
    const modifiedRequest = new Request(request, {
      headers: new Headers(request.headers),
    });
    modifiedRequest.headers.set("x-ab-variant", variant);

    // 3. Image optimization
    if (url.pathname.match(/\.(jpg|png|gif)$/)) {
      const accept = request.headers.get("Accept") || "";
      const format = accept.includes("image/avif") ? "avif" : accept.includes("image/webp") ? "webp" : "jpeg";
      url.searchParams.set("format", format);
      url.searchParams.set("quality", "85");
      return fetch(new Request(url.toString(), modifiedRequest));
    }

    // 4. API aggregation
    if (url.pathname === "/api/dashboard") {
      const [user, orders] = await Promise.all([
        fetch(\`https://api.example.com/user?token=\${url.searchParams.get("token")}\`),
        fetch(\`https://api.example.com/orders?limit=5\`),
      ]);
      const data = { user: await user.json(), orders: await orders.json() };
      return new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
      });
    }

    // 5. Static asset from cache
    return fetch(modifiedRequest);
  },
};
\`\`\`

## 10. Real Company Use Cases

- **Cloudflare** — Workers platform. Used by Shopify for storefront customization, Discord for CDN uploads, Figma for edge auth.
- **AWS** — Lambda@Edge used by thousands of customers for image optimization, auth, A/B testing, bot mitigation.
- **Fastly** — Compute@Edge used by The New York Times for paywall logic, by Spotify for audio delivery routing.
- **Akamai** — EdgeWorkers used by major streaming services for manifest manipulation, DRM license routing, ad insertion.
- **Netflix** — Open Connect Appliances with limited compute for manifest generation and content steering.

## 11. Common Interview Questions

1. "What is edge computing and how does it differ from traditional CDN and cloud computing?"
2. "Design an image optimization service using edge computing."
3. "How would you implement A/B testing at the edge?"
4. "Compare Cloudflare Workers vs AWS Lambda@Edge."
5. "How do edge workers handle state across requests?"
6. "What are the security implications of running code at the edge?"
7. "Design a personalization engine that runs at the CDN edge."

## 12. Related Topics & Next Steps

- **CDN Fundamentals** — Underlying infrastructure for edge computing
- **Service Workers** — Browser equivalent of edge workers
- **WebAssembly at Edge** — Fastly Compute@Edge, Cloudflare Workers with Wasm
- **Edge KV / Durable Objects** — Stateful storage at edge
- **Jamstack** — Architecture pattern leveraging edge functions
- **Streaming at Edge** — Video transcoding, real-time processing at edge`,
    estimatedMin: 14,
    difficulty: "ADVANCED" as const,
    companies: ["Cloudflare", "AWS", "Fastly", "Akamai"],
    tags: ["edge-computing", "Cloudflare-Workers", "Lambda@Edge", "CDN", "serverless"]
  },
  {
    id: "lesson-cache-08",
    slug: "cdn-cache-invalidation-purging",
    title: "CDN Cache Invalidation & Purging",
    content: `## 1. Quick Summary

**CDN cache invalidation** (or purging) is the process of removing cached content from CDN edge servers before its natural TTL expires. This is necessary when content changes (price update, new CSS version, updated PDF). **Purge** invalidates content immediately; **TTL-based** waits for natural expiration. Propagation delay (time for purge to reach all PoPs) is a critical factor. Strategies include **wildcard purge**, **tag-based purge**, **versioned URLs**, and **stale-while-revalidate**.

## 2. Definition

- **Purge (Invalidation)**: Actively removing cached content from CDN edge servers. Can target individual URLs, URL patterns, or all content.
- **Propagation Delay**: Time between purge request and when all edge servers have evicted the content. Ranges from milliseconds (Fastly) to minutes (some CDNs).
- **TTL (Time-To-Live)**: Time a CDN keeps content before treating it as stale. Set via Cache-Control headers.
- **Stale-While-Revalidate**: Serve stale content while fetching fresh version in background.
- **Versioned URL**: Include version hash in URL (\`style.v2.css\`). Cache forever. New version = new URL.

## 3. Why It Exists / Problem It Solves

Without invalidation:
- Users see outdated content for up to TTL duration (hours or days)
- Price changes, product updates, or security patches take effect slowly
- Deploying new website versions requires waiting for TTL expiration

CDN invalidation solves: **immediate content updates**, **instant rollbacks** (purge and re-fetch), **compliance** (remove sensitive content globally), **cache management** (clear corrupted cached content).

## 4. When to Use It

- **Content updates** — Product price changes, article corrections, image replacements
- **Deployments** — New CSS/JS builds, site redesigns, feature launches
- **Rollbacks** — Reverting to previous version of a page
- **Compliance** — Removing content that violates regulations (GDPR right to erasure)
- **Cache poisoning recovery** — Clearing malicious cached content after security incident

## 5. When NOT to Use It / Tradeoffs

- **Frequent, small changes** — Use versioned URLs instead of constant purging
- **Global rollouts** — Propagation delay means inconsistent user experience during purge
- **Emergency purges** — Some CDNs rate-limit purges (CloudFront: free, but up to 3000 paths/min)
- **Purge storms** — Purging too aggressively causes cache miss spike and origin overload

Tradeoffs: Propagation delay (seconds to minutes), origin load spikes after purge, rate limits, cost (some CDNs charge per purge), incomplete coverage (some PoPs may miss the purge).

## 6. How It Works (Deep Mechanics)

**Purge Propagation:**
\`\`\`
CDN Control Plane (US East)
        |
        +--- Push invalidation to all PoPs ---+
        |         |        |        |         |
    +---+----+  +-+----+  ++-----+  +---+----+  ++-------+
    | US PoP|  |EU PoP|  |Asia  |  |SA PoP|  |AU PoP |
    | NYC   |  |FRA   |  |TYO   |  |GRU   |  |SYD    |
    | Clear |  |Clear |  |Clear |  |Clear |  |Clear  |
    | /p/*  |  |/p/*  |  |/p/*  |  |/p/*  |  |/p/*   |
    +-------+  +------+  +------+  +------+  +-------+
    |~2s     |  |~10s   |  |~30s   |  |>60s   | |>60s  |
    +--------+  +-------+  +-------+  +-------+  +-------+
\`\`\`

**Versioned URL Strategy:**
\`\`\`
Instead of purging:
  /css/style.css → purge on every change
  Cache-Control: max-age=3600

Use versioned URLs:
  /css/style.a1b2c3.css → never purge
  /css/style.d4e5f6.css → new deploy = new URL
  Cache-Control: public, max-age=31536000, immutable
  Old URL naturally expires from CDN as nobody requests it
\`\`\`

**Tag-Based Invalidation (Surrogate Keys):**
\`\`\`typescript
// Origin sets Surrogate-Key header
// Fastly: Surrogate-Key: product-123 category-electronics
// Cloudflare: Cache-Tag: product-123,category-electronics

// Purge by tag
await fetch("https://api.fastly.com/service/:id/purge/product-123", {
  method: "POST",
  headers: { "Fastly-Key": apiKey },
});

// This purges ALL URLs tagged with "product-123" across all PoPs
\`\`\`

## 7. Architecture Diagram

\`\`\`
PURGE STRATEGIES:

1. SINGLE URL PURGE (most common):
   POST /purge?url=https://cdn.example.com/p/123
   → Removes specific file from all edge locations

2. WILDCARD PURGE:
   POST /purge?pattern=/products/*
   → Removes all /products/ URLs
   Useful: entire product catalog updated

3. TAG-BASED PURGE (Fastly, Cloudflare):
   Origin sets: Surrogate-Key: tag1 tag2
   POST /purge/tag/tag1
   → Removes all content tagged with tag1
   Useful: purge all content related to one product

4. FULL PURGE:
   POST /purge/all
   → Clears entire CDN cache
   Useful: full site redeployment

5. VERSIONED URL (no purge needed):
   /css/style.abc.css
   → Never purge, just deploy new URL
   Useful: long-term immutable assets
\`\`\`

## 8. Real-World Flow Example

**Shopify Theme Deployment + Fastly CDN:**
1. Merchant updates Shopify theme (CSS, JS, liquid templates)
2. Shopify generates new asset URLs with content hashes: \`theme.a1b2c3.css\`
3. Shop pages reference new asset URLs — old URLs naturally expire
4. For the storefront HTML (dynamically generated), Shopify uses **tag-based purge**:
   - Each store's HTML pages tagged with \`store:shop123\`
   - On deploy, Shopify purges \`store:shop123\` tag
   - Fastly propagates purge to 95% of PoPs in <150ms
5. Next visitor request: purge has been processed at nearest PoP → cache miss → fresh HTML from Shopify origin
6. Result: theme update visible globally in <1 second

## 9. Reference Implementation Example

\`\`\`typescript
// CDN invalidation client
class CDNInvalidator {
  private apiKey: string;
  private serviceId: string;
  private baseUrl: string;

  constructor(provider: "fastly" | "cloudfront" | "cloudflare") {
    // Configure based on provider
  }

  // Single URL purge
  async purgeUrl(url: string): Promise<void> {
    const encoded = encodeURIComponent(url);
    await fetch(\`\${this.baseUrl}/purge/\${encoded}\`, {
      method: "POST",
      headers: { "API-Key": this.apiKey },
    });
  }

  // Tag-based purge (Fastly/Cloudflare)
  async purgeByTag(tag: string): Promise<void> {
    await fetch(\`\${this.baseUrl}/service/\${this.serviceId}/purge/\${tag}\`, {
      method: "POST",
      headers: { "API-Key": this.apiKey, "Accept": "application/json" },
    });
  }

  // Wildcard purge (CloudFront: invalidation paths)
  async purgeByPattern(pattern: string): Promise<void> {
    // CloudFront: create invalidation
    // { "Paths": { "Quantity": 1, "Items": [pattern] }, "CallerReference": uuid }
    await fetch(\`\${this.baseUrl}/2020-05-31/distribution/\${this.serviceId}/invalidation\`, {
      method: "POST",
      body: JSON.stringify({
        InvalidationBatch: {
          Paths: { Quantity: 1, Items: [pattern] },
          CallerReference: crypto.randomUUID(),
        },
      }),
    });
  }

  // Full purge
  async purgeAll(): Promise<void> {
    await this.purgeByPattern("/*");
  }
}

// Versioned URL helper
function versionAssetUrl(basePath: string, content: string): string {
  const hash = crypto.createHash("md5").update(content).digest("hex").slice(0, 8);
  const ext = basePath.split(".").pop();
  const name = basePath.replace(\`.\${ext}\`, "");
  return \`\${name}.\${hash}.\${ext}\`;
}

// Cache-Control header generator
function cacheHeaders(ttl: number, isVersioned: boolean): Record<string, string> {
  if (isVersioned) {
    return { "Cache-Control": "public, max-age=31536000, immutable" };
  }
  return { "Cache-Control": \`public, max-age=\${ttl}, stale-while-revalidate=60\` };
}
\`\`\`

## 10. Real Company Use Cases

- **Shopify** — Fastly CDN with tag-based purging. Purges by store ID on theme deployment, by product ID on price change. Sub-second propagation.
- **The New York Times** — Fastly-powered paywall logic at edge. Uses surrogate keys for content sections. Purge by section on breaking news updates.
- **GitHub** — Fastly CDN for static assets. Versioned URLs for JS/CSS (content hash in filename). API responses cached with short TTL.
- **Netflix** — Open Connect CDN. Regional purge for content rights updates. New content pre-populated during off-peak. Full catalog purge rare (only for major format changes).
- **Vercel** — Next.js ISR (Incremental Static Regeneration). On-demand revalidation purges specific pages from CDN.

## 11. Common Interview Questions

1. "How does CDN cache invalidation work? What is propagation delay?"
2. "Compare versioned URLs vs active purge strategies."
3. "Design a CDN purge system that minimizes propagation delay."
4. "What are surrogate keys and how do they simplify cache invalidation?"
5. "How would you handle a global purge for an emergency (security fix)?"
6. "What is stale-while-revalidate and how does it reduce purge-induced load spikes?"
7. "How do you monitor cache hit rates after a purge to detect issues?"

## 12. Related Topics & Next Steps

- **CDN Fundamentals** — How CDNs cache and serve content
- **HTTP Caching** — Cache-Control, ETags, Vary headers
- **Stale-While-Revalidate** — Serving stale content during refresh
- **Surrogate Keys** — Fastly/Cloudflare cache tagging
- **Origin Shield** — Reducing origin load from purge-induced cache misses
- **Incremental Static Regeneration (ISR)** — Next.js stale-while-revalidate pattern`,
    estimatedMin: 11,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Shopify", "Fastly", "GitHub", "Netflix"],
    tags: ["CDN", "cache-invalidation", "purge", "surrogate-keys", "versioned-urls"]
  },
];