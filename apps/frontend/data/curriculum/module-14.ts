export const module14Lessons = [
  {
    id: 'lesson-14-01',
    slug: 'design-deep-dive-11-key-management-service',
    title: 'Design a Key Management Service (KMS)',
    content: `## 0. Mental Model

> A KMS is like a high-security vault with a librarian. You don't take the jewels (keys) out of the vault — you bring the work to the vault. The librarian performs operations with the keys inside and hands you only the result. If someone steals the building, the vault still protects the keys.

## 1. Quick Summary

Design a **Key Management Service (KMS)** — a centralized system for creating, storing, rotating, and using cryptographic keys. Core concepts: **envelope encryption** (data encrypted with a Data Key (DEK), DEK encrypted with a Key Encryption Key (KEK) stored in KMS), **HSM** (Hardware Security Module — tamper-proof hardware for key operations), **key hierarchy**, **automatic rotation**, **access auditing**, and **multi-region replication**.

## 2. Envelope Encryption

\`\`\`
Client wants to encrypt 1GB of data:
1. Client calls KMS: GenerateDataKey(KeyId="my-kek")
2. KMS returns:
   - PlaintextDataKey (in memory only — never stored)
   - EncryptedDataKey (CiphertextBlob — can be stored alongside data)
3. Client encrypts data with PlaintextDataKey (AES-256-GCM)
4. Client stores: [EncryptedDataKey][encrypted_data]
5. Client discards PlaintextDataKey

To decrypt:
1. Client loads EncryptedDataKey
2. Client calls KMS: Decrypt(EncryptedDataKey)
3. KMS returns PlaintextDataKey
4. Client decrypts data with PlaintextDataKey
5. Client discards PlaintextDataKey
\`\`\`

## 3. Key Hierarchy

\`\`\`
Master Key (HSM-backed, never leaves HSM)
  └── Key Encryption Keys (KEKs) — 1 per customer/application
       └── Data Encryption Keys (DEKs) — 1 per file/record, envelope-encrypted
\`\`\`

## 4. Architecture

<RoughDiagram
  nodes={[
    { id: 'client', label: 'Client Application', type: 'client', x: 50, y: 140 },
    { id: 'kms', label: 'KMS API', type: 'gateway', x: 280, y: 50 },
    { id: 'hsm', label: 'HSM Cluster', type: 'db', x: 280, y: 230 },
    { id: 'audit', label: 'Audit Log', type: 'storage', x: 520, y: 50 },
    { id: 'keydb', label: 'Key Metadata DB', type: 'db', x: 520, y: 230 },
    { id: 'replica', label: 'Replica Region', type: 'worker', x: 750, y: 140 },
  ]}
  edges={[
    { from: 'client', to: 'kms', label: 'GenerateDataKey / Decrypt' },
    { from: 'kms', to: 'hsm', label: 'crypto ops' },
    { from: 'kms', to: 'audit', label: 'log every access' },
    { from: 'kms', to: 'keydb', label: 'store metadata' },
    { from: 'keydb', to: 'replica', label: 'async replication' },
  ]}
  height={300}
/>

## 5. Quiz

\`\`\`
- Q: With envelope encryption, where is the plaintext data key stored?
  Options: In the database, Never stored (in memory only), In the encrypted file, In the HSM
  Correct: Never stored — exists only in memory during encryption/decryption

- Q: What does an HSM provide that software-based key storage cannot?
  Options: Faster encryption, Tamper-proof hardware with certified FIPS 140-2, Cheaper storage, Cloud compatibility
  Correct: Tamper-proof hardware with certified FIPS 140-2 security
\`\`\``,
    estimatedMin: 18,
    difficulty: 'Advanced' as const,
    companies: ['Amazon AWS', 'Google Cloud', 'Azure', 'HashiCorp', 'Stripe'],
    tags: ['KMS', 'encryption', 'key-management', 'HSM', 'security', 'cryptography'],
  },
  {
    id: 'lesson-14-02',
    slug: 'design-deep-dive-12-cdn-from-scratch',
    title: 'Design a CDN from Scratch',
    content: `## 0. Mental Model

> A CDN is like a global network of food pantries. Instead of everyone traveling to the central farm (origin server) for every meal (file), pantries (edge nodes) in every neighborhood stock the most popular items. If a pantry doesn't have something, it fetches it from the central farm and keeps a copy for next time.

## 1. Quick Summary

Design a **Content Delivery Network** that serves static and dynamic content from **hundreds of edge locations** worldwide. Core components: **origin servers** (source of truth), **edge nodes** (cache POPs), **request routing** (DNS-based or anycast), **cache hierarchy** (L1 edge → L2 regional → origin), **purging** (invalidate content globally within seconds), and **origin shield** (dedicated cache layer to protect origin from edge misses).

## 2. Request Routing

**Anycast:** All edge nodes advertise the same IP. BGP routes each user to the nearest node. Fastest and most transparent — 100ms global failover.

**DNS-based:** User's DNS resolver returns the IP of the nearest edge cluster. Simpler but DNS caching can cause stale routing.

## 3. Cache Hierarchy

\`\`\`
User → L1 Edge (POP, ~300 locations)
                ↓ miss
            L2 Regional (10-20 regions)
                ↓ miss
            Origin Shield (dedicated cache layer)
                ↓ miss
            Origin Server
\`\`\`

Each layer adds capacity but adds latency on miss. The hierarchy ensures popular content is served within 1 RTT, and the origin only sees traffic for truly uncached content (typically <2% of requests).

## 4. Content Purging

\`\`\`typescript
// PURGE request flow
interface PurgeRequest {
  pattern: string; // "/images/*" or exact URL
  type: 'exact' | 'prefix' | 'regex';
  apiKey: string;
}

async function handlePurge(req: PurgeRequest) {
  // 1. Validate API key
  // 2. Broadcast to all edge nodes via pub/sub (Redis pub/sub or gossip)
  // 3. Each edge node marks matching cached entries as stale
  // 4. Return once majority acknowledges (quorum-based)
  // 5. Async: re-fetch hot content proactively (cache warming)
  return { purged: true, acknowledgedNodes: 287, totalNodes: 300 };
}
\`\`\`

<RoughDiagram
  nodes={[
    { id: 'user', label: 'End User', type: 'client', x: 50, y: 140 },
    { id: 'dns', label: 'DNS / Anycast', type: 'dns', x: 240, y: 60 },
    { id: 'edge', label: 'L1 Edge POP', type: 'cache', x: 240, y: 220 },
    { id: 'regional', label: 'L2 Regional Cache', type: 'cache', x: 460, y: 220 },
    { id: 'shield', label: 'Origin Shield', type: 'storage', x: 680, y: 220 },
    { id: 'origin', label: 'Origin Server', type: 'web', x: 680, y: 60 },
  ]}
  edges={[
    { from: 'user', to: 'dns', label: '1. resolve' },
    { from: 'dns', to: 'edge', label: '2. route' },
    { from: 'edge', to: 'regional', label: '3. miss' },
    { from: 'regional', to: 'shield', label: '4. miss' },
    { from: 'shield', to: 'origin', label: '5. fetch' },
    { from: 'origin', to: 'shield', label: '6. response' },
    { from: 'shield', to: 'regional', label: '7. cache' },
    { from: 'regional', to: 'edge', label: '8. cache' },
    { from: 'edge', to: 'user', label: '9. serve' },
  ]}
  height={300}
/>

## 5. Quiz

\`\`\`
- Q: What percentage of requests typically reach the origin behind a properly configured CDN?
  Options: 50%, 25%, <5%, <2%
  Correct: <2% (most hits served at edge)

- Q: Anycast routing vs DNS-based routing — which has faster failover?
  Options: DNS-based, Anycast, Both same, Neither
  Correct: Anycast (BGP failover in ~100ms vs DNS TTL delays)
\`\`\``,
    estimatedMin: 20,
    difficulty: 'Advanced' as const,
    companies: ['Cloudflare', 'Akamai', 'Fastly', 'Amazon CloudFront', 'Google Cloud CDN'],
    tags: ['CDN', 'caching', 'edge', 'anycast', 'content-delivery', 'performance'],
  },
  {
    id: 'lesson-14-03',
    slug: 'design-deep-dive-13-experimentation-system',
    title: 'Design an A/B Testing & Experimentation Platform',
    content: `## 0. Mental Model

> An experimentation platform is like a scientific laboratory built into your product. Every user is a potential test subject, every feature is a hypothesis, and the platform is the lab equipment that ensures clean results — random assignment, proper controls, and statistical significance before declaring a winner.

## 1. Quick Summary

Design an **A/B testing platform** that enables product teams to run experiments on **millions of users** with **statistically valid results**. Core components: **assignment service** (consistently assign users to variants using hash buckets), **event tracking** (ingest user events for metric computation), **statistics engine** (compute p-values, confidence intervals, power analysis), **feature flag integration** (control variant rollout), and **dashboard** (real-time results with sequential testing).

## 2. Consistent Assignment

\`\`\`typescript
function getVariant(userId: string, experimentId: string, variants: number): number {
  // MurmurHash or similar for consistent assignment
  const hash = hashUser(experimentId + ':' + userId);
  return hash % variants; // 0 = control, 1 = treatment A, etc.
}

// This ensures a user ALWAYS gets the same variant for an experiment
// regardless of which server handles the request
\`\`\`

## 3. Statistics Engine

\`\`\`
Input: control_conversions, control_total, treatment_conversions, treatment_total

1. Calculate conversion rates: p_control = c_c / n_c, p_treatment = c_t / n_t
2. Pooled standard error:
   SE = sqrt(p * (1-p) * (1/n_c + 1/n_t)) where p = (c_c + c_t) / (n_c + n_t)
3. Z-score: (p_treatment - p_control) / SE
4. P-value from Z-score (normal distribution CDF)
5. If p < 0.05 → statistically significant (95% confidence)

Sample size needed (before experiment):
  n = (Z_α/2 + Z_β)² × 2 × p × (1-p) / (effect_size)²
\`\`\`

## 4. Architecture

<RoughDiagram
  nodes={[
    { id: 'client', label: 'User Request', type: 'client', x: 50, y: 120 },
    { id: 'flag', label: 'Feature Flag / Assignment', type: 'gateway', x: 280, y: 60 },
    { id: 'event', label: 'Event Pipeline (Kafka)', type: 'queue', x: 280, y: 220 },
    { id: 'stats', label: 'Statistics Engine', type: 'worker', x: 550, y: 60 },
    { id: 'db', label: 'Experiment Results DB', type: 'db', x: 550, y: 220 },
    { id: 'dashboard', label: 'Dashboard', type: 'web', x: 780, y: 140 },
  ]}
  edges={[
    { from: 'client', to: 'flag', label: 'get variant' },
    { from: 'client', to: 'event', label: 'log event' },
    { from: 'event', to: 'stats', label: 'aggregate hourly' },
    { from: 'stats', to: 'db', label: 'write results' },
    { from: 'db', to: 'dashboard', label: 'query' },
  ]}
  height={300}
/>

## 5. Quiz

\`\`\`
- Q: A user sees variant A on mobile and variant B on desktop for the same experiment. What's wrong?
  Options: Nothing — devices can differ, Assignment isn't consistent across devices for the same user, Dashboard bug, Experiment not running
  Correct: Assignment should be consistent per user (user_id hash), not per device

- Q: What p-value threshold is conventionally used for statistical significance?
  Options: 0.01, 0.05, 0.10, 0.50
  Correct: 0.05 (95% confidence)
\`\`\``,
    estimatedMin: 18,
    difficulty: 'Advanced' as const,
    companies: ['Netflix', 'Meta', 'Google', 'Microsoft', 'Airbnb'],
    tags: ['ab-testing', 'experimentation', 'statistics', 'feature-flags', 'data-science'],
  },
  {
    id: 'lesson-14-04',
    slug: 'design-deep-dive-14-metrics-monitoring',
    title: 'Design a Metrics & Monitoring System (Prometheus-like)',
    content: `## 0. Mental Model

> A monitoring system is like the instrument panel in an airplane cockpit. You need to see altitude (latency), fuel (disk space), engine temperature (CPU), and warning lights (alerts) at a glance. If something goes wrong, you need to know what, when, and where — not after the plane crashes.

## 1. Quick Summary

Design a **metrics collection and monitoring system** that ingests **millions of time-series data points per second** from thousands of services. Core components: **metric types** (counter, gauge, histogram, summary), **pull vs push collection**, **time-series database** (TSDB with downsampling), **query language** (PromQL), **alerting** (threshold-based with evaluation interval), **long-term storage** (S3 with tiered retention: raw 7d, 5m downsampled 30d, 1h downsampled 1y).

## 2. Metric Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Counter** | Monotonically increasing, resets on restart | Request count, errors, bytes sent |
| **Gauge** | Up and down arbitrarily | CPU usage, memory, queue depth |
| **Histogram** | Configurable buckets for value distribution | Request latency (p50, p95, p99) |
| **Summary** | Pre-computed quantiles on the client side | Similar to histogram, client-side |

## 3. TSDB Storage (LSM-Based)

\`\`\`
Time-series are stored as blocks:
┌──────────────┐
│ Block: 2h    │  ← in-memory, being written to
│ [series]     │
│ [samples]    │
└──────┬───────┘
       │ compact (background)
       ▼
┌──────────────┐
│ Block: 2h    │  ← on-disk, mmap'd
│ [TSDB index] │
│ [chunks]     │
│ [meta]       │
└──────────────┘

Downsampling:
  Raw blocks (2h) → keep 7 days
  5m resolution → keep 30 days
  1h resolution → keep 1 year (stored in S3, queried via object store)
\`\`\`

## 4. Pull vs Push

**Pull (Prometheus model):** Server scrapes targets at regular intervals (e.g., every 15s). Pros: no need to manage authentication on push, dead targets detected instantly (no metrics = down). Cons: targets must be reachable, service discovery required.

**Push (Graphite/Datadog model):** Agents push metrics to a central endpoint. Pros: works across NATs, firewalls, ephemeral containers. Cons: need auth on ingest, lost connection = silent data loss.

## 5. Architecture

<RoughDiagram
  nodes={[
    { id: 'svcA', label: 'Service A', type: 'app', x: 50, y: 50 },
    { id: 'svcB', label: 'Service B', type: 'app', x: 50, y: 180 },
    { id: 'svcC', label: 'Service C', type: 'app', x: 50, y: 310 },
    { id: 'scraper', label: 'Scraper / Collector', type: 'worker', x: 280, y: 180 },
    { id: 'tsdb', label: 'TSDB (Thanos / VictoriaMetrics)', type: 'db', x: 520, y: 120 },
    { id: 'alert', label: 'Alert Manager', type: 'worker', x: 520, y: 280 },
    { id: 's3', label: 'S3 (Long-term)', type: 'storage', x: 750, y: 120 },
    { id: 'pager', label: 'PagerDuty / Slack', type: 'queue', x: 750, y: 280 },
  ]}
  edges={[
    { from: 'scraper', to: 'svcA', label: 'pull /metrics' },
    { from: 'scraper', to: 'svcB', label: 'pull /metrics' },
    { from: 'scraper', to: 'svcC', label: 'pull /metrics' },
    { from: 'scraper', to: 'tsdb', label: 'write' },
    { from: 'tsdb', to: 's3', label: 'downsample + archive' },
    { from: 'alert', to: 'tsdb', label: 'evaluate rules' },
    { from: 'alert', to: 'pager', label: 'trigger notification' },
  ]}
  height={380}
/>

## 6. Quiz

\`\`\`
- Q: Which metric type should you use for request latency?
  Options: Counter, Gauge, Histogram, GaugeVec
  Correct: Histogram (captures distribution, enables p50/p95/p99)

- Q: In a pull-based monitoring system, how do you detect a dead service?
  Options: Service sends heartbeat, Scraper gets no response → target is down, Client calls health endpoint, Manual check
  Correct: Scraper gets no response from the /metrics endpoint → target is considered down
\`\`\``,
    estimatedMin: 20,
    difficulty: 'Advanced' as const,
    companies: ['Prometheus', 'Datadog', 'Grafana', 'Netflix', 'Google'],
    tags: ['monitoring', 'metrics', 'observability', 'TSDB', 'Prometheus', 'alerting'],
  },
  {
    id: 'lesson-14-05',
    slug: 'design-deep-dive-15-data-pipeline-etl',
    title: 'Design a Data Pipeline / ETL System',
    content: `## 0. Mental Model

> An ETL pipeline is like a factory assembly line. Raw materials (data) come in from different suppliers (sources), are cleaned and transformed at various stations, and assembled into finished products (analytics tables, ML features) at the end. If a station breaks, materials pile up (backpressure).

## 1. Quick Summary

Design a **data pipeline** that ingests **terabytes of data daily** from multiple sources, transforms it, and loads it into analytics stores. Core patterns: **batch processing** (Airflow/Schedule-based), **stream processing** (Kafka Streams/Flink), **lambda architecture** (batch + stream combined), **schema evolution** (Avro/Protobuf with schema registry), **data quality checks**, and **backfill capabilities** (reprocess historical data after schema change or bug fix).

## 2. Pipeline Components

\`\`\`
Source Systems (PostgreSQL, MongoDB, SaaS APIs, Log Files)
  ↓
Change Data Capture (Debezium) or Batch Export
  ↓
Message Queue (Kafka) — durable, replayable
  ↓
Stream Processor (Flink, Kafka Streams) — real-time transformations
  ↓
Batch Processor (Spark, Airflow) — nightly aggregations
  ↓
Destinations:
  - Data Warehouse (Snowflake, BigQuery) — analytics, BI
  - Feature Store — ML features
  - Reverse ETL — sync to SaaS tools
\`\`\`

## 3. Handling Schema Changes

\`\`\`typescript
// Schema Registry (Avro schema)
// Each message has a schema ID + payload
// When a column is added:
//   1. Register new schema (backward compatible)
//   2. Old consumers continue reading old schema
//   3. New consumers read new schema
//   4. Producer can use new schema immediately

// Breaking change (rename column):
//   1. Add new column alongside old (dual write)
//   2. Migrate all consumers to new column
//   3. Drop old column in next deployment
\`\`\`

## 4. Backfill

\`\`\`
Scenario: A bug in the transformation logic caused incorrect data for 3 days.

1. Find the bad window: "2026-06-15 to 2026-06-18"
2. Re-run the transformation for those days:
   spark.submit(transformation_job, { start_date: '2026-06-15', end_date: '2026-06-18' })
3. Upsert results into the destination table (OVERWRITE partition)
4. Verify row counts match expected
5. Notify downstream consumers
\`\`\`

<RoughDiagram
  nodes={[
    { id: 'source', label: 'Source DB / Logs', type: 'db', x: 50, y: 160 },
    { id: 'cdc', label: 'CDC (Debezium)', type: 'worker', x: 280, y: 60 },
    { id: 'kafka', label: 'Kafka (Event Bus)', type: 'queue', x: 280, y: 260 },
    { id: 'stream', label: 'Stream Processor (Flink)', type: 'app', x: 520, y: 100 },
    { id: 'batch', label: 'Batch Processor (Spark)', type: 'app', x: 520, y: 300 },
    { id: 'dw', label: 'Data Warehouse', type: 'storage', x: 750, y: 100 },
    { id: 'feature', label: 'Feature Store', type: 'storage', x: 750, y: 300 },
  ]}
  edges={[
    { from: 'source', to: 'cdc', label: 'WAL / poll' },
    { from: 'cdc', to: 'kafka', label: 'publish events' },
    { from: 'kafka', to: 'stream', label: 'real-time' },
    { from: 'kafka', to: 'batch', label: 'batch consume' },
    { from: 'stream', to: 'dw', label: 'write' },
    { from: 'batch', to: 'feature', label: 'write aggregates' },
  ]}
  height={380}
/>

## 5. Quiz

\`\`\`
- Q: A producer adds a new column to the schema. How do you prevent existing consumers from breaking?
  Options: Stop all consumers first, Use Schema Registry with backward-compatible evolution, Email all teams, Rebuild everything
  Correct: Register a backward-compatible schema version in Schema Registry

- Q: What is a backfill in data pipelines?
  Options: Deleting old data, Re-processing data for a historical time window, Filling storage with dummy data, Caching query results
  Correct: Re-processing data for a historical time window after a bug fix or schema change
\`\`\``,
    estimatedMin: 18,
    difficulty: 'Advanced' as const,
    companies: ['Snowflake', 'Airbnb', 'Netflix', 'Stripe', 'Uber'],
    tags: ['ETL', 'data-pipeline', 'Kafka', 'Spark', 'Flink', 'data-warehouse', 'schema-evolution'],
  },
  {
    id: 'lesson-14-06',
    slug: 'design-deep-dive-16-distributed-job-queue',
    title: 'Design a Distributed Job Queue (Sidekiq / Celery / Bull)',
    content: `## 0. Mental Model

> A job queue is like a ticket counter at the DMV. People (jobs) take a ticket, wait in line, and are served one by one by the available clerks (workers). If a clerk goes home sick (worker crash), the ticket goes back to the queue for another clerk.

## 1. Quick Summary

Design a **distributed job queue** that handles **millions of jobs per day** with different priorities, delays, retries, and scheduling. Core components: **queue storage** (Redis streams for fast, PostgreSQL for durable), **worker pool** (horizontal scaling, concurrency control), **job lifecycle** (queued → active → completed/failed), **retry with exponential backoff**, **dead letter queue** (jobs that failed permanently), and **cron scheduling** (recurring jobs).

## 2. Job Lifecycle

\`\`\`
QUEUED → claim by worker → ACTIVE → complete → COMPLETED
                                 → fail + retries_left > 0 → QUEUED (after backoff)
                                 → fail + retries_left = 0 → DEAD_LETTER
\`\`\`

## 3. Implementation

\`\`\`typescript
interface Job {
  id: string;
  type: string;       // "send_email", "process_payment"
  payload: any;       // serialized data
  priority: number;   // 0 (highest) to 10
  delay: number;      // ms to wait before making visible
  retriesLeft: number;
  maxRetries: number;
  backoff: number;    // base delay in ms for exponential backoff
  nextRetryAt: number;
  createdAt: number;
}

async function enqueue(job: Job) {
  // Store in Redis sorted set: score = scheduled_at (now + delay)
  await redis.zadd('queue:' + job.type, {
    score: Date.now() + job.delay,
    member: JSON.stringify(job),
  });
}

async function dequeue(workerId: string, types: string[]): Promise<Job | null> {
  // Poll: BRPOPLPUSH from queue to active set
  for (const type of types) {
    const jobStr = await redis.brpoplpush(
      'queue:' + type,
      'active:' + type,
      TIMEOUT
    );
    if (jobStr) return JSON.parse(jobStr);
  }
  return null;
}

async function complete(job: Job) {
  await redis.lrem('active:' + job.type, 1, JSON.stringify(job));
}

async function fail(job: Job) {
  if (job.retriesLeft > 0) {
    job.retriesLeft--;
    job.nextRetryAt = Date.now() + job.backoff * Math.pow(2, job.maxRetries - job.retriesLeft);
    await redis.zadd('queue:' + job.type, { score: job.nextRetryAt, member: JSON.stringify(job) });
  } else {
    await redis.lpush('dead_letter:' + job.type, JSON.stringify(job));
  }
}
\`\`\`

## 4. Architecture

<RoughDiagram
  nodes={[
    { id: 'app', label: 'Application', type: 'app', x: 50, y: 100 },
    { id: 'redis', label: 'Redis (Queue + Active)', type: 'cache', x: 280, y: 50 },
    { id: 'pg', label: 'PostgreSQL (Dead Letter + History)', type: 'db', x: 280, y: 200 },
    { id: 'worker1', label: 'Worker Pool', type: 'worker', x: 550, y: 80 },
    { id: 'worker2', label: 'Worker (scale)', type: 'worker', x: 550, y: 200 },
    { id: 'scheduler', label: 'Scheduler (Cron)', type: 'worker', x: 550, y: 320 },
  ]}
  edges={[
    { from: 'app', to: 'redis', label: 'enqueue' },
    { from: 'redis', to: 'worker1', label: 'dequeue' },
    { from: 'redis', to: 'worker2', label: 'dequeue' },
    { from: 'worker1', to: 'pg', label: 'archive completed' },
    { from: 'worker2', to: 'pg', label: 'dead letter' },
    { from: 'scheduler', to: 'redis', label: 'enqueue recurring' },
  ]}
  height={380}
/>

## 5. Quiz

\`\`\`
- Q: A job has failed 5 times and maxRetries is 5. Where does it go next?
  Options: Back to queue, Deleted permanently, Dead letter queue, Frozen indefinitely
  Correct: Dead letter queue (for manual inspection)

- Q: What is the purpose of the "active" set in Redis?
  Options: Store completed jobs, Track jobs currently being executed (crash recovery), Cache job results, Priority sorting
  Correct: Track jobs currently being executed — if worker crashes, the job stays in active and can be recovered
\`\`\``,
    estimatedMin: 18,
    difficulty: 'Intermediate' as const,
    companies: ['GitHub', 'Shopify', 'Stripe', 'Airbnb', 'Uber'],
    tags: ['job-queue', 'background-jobs', 'redis', 'sidekiq', 'celery', 'worker-pool'],
  },
  {
    id: 'lesson-14-07',
    slug: 'design-deep-dive-17-distributed-rate-limiter',
    title: 'Design a Distributed Rate Limiter',
    content: `## 0. Mental Model

> A rate limiter is like a bouncer at a club. The club has a capacity of 200 people. If someone tries to enter when it's full, they wait (throttle) or get turned away (block). Good bouncers also notice when the same person tries to cut the line 50 times in a minute (burst) and enforce the rule.

## 1. Quick Summary

Design a **distributed rate limiter** that enforces API rate limits across **millions of users** across **multiple servers** with **low latency** (<5ms added to requests). Core algorithms: **Token Bucket** (burst-friendly, refills at steady rate), **Leaky Bucket** (smooths bursts, processes at constant rate), **Sliding Window Log** (precise but memory-heavy), **Sliding Window Counter** (Redis sorted sets, approximate but efficient).

## 2. Algorithm: Sliding Window Counter

\`\`\`typescript
class SlidingWindowRateLimiter {
  private redis: Redis;
  private windowMs: number; // e.g., 60000 (1 minute)
  private maxRequests: number; // e.g., 100

  async allow(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Use Redis sorted set: member = requestId (unique), score = timestamp
    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);
    // Count requests in window
    const count = await redis.zcard(key);
    if (count >= this.maxRequests) {
      return false; // rate limited
    }
    // Add current request
    await redis.zadd(key, { score: now, member: \`\${now}-\${uuid()}\` });
    // Set TTL for auto-cleanup
    await redis.expire(key, Math.ceil(this.windowMs / 1000));
    return true;
  }
}
\`\`\`

## 3. Distributed Considerations

- **Atomicity:** Use Lua scripting (Redis EVAL) to ensure window trim + check + add is atomic
- **Consistency:** Eventually consistent across regions is fine — slight over-counting during propagation is acceptable
- **Headers:** Always return \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\` so clients can back off
- **Hierarchical limits:** Per-user (100 req/min) → Per-IP (1000 req/min) → Global (100K req/min)

## 4. Architecture

<RoughDiagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 50, y: 160 },
    { id: 'api', label: 'API Gateway', type: 'gateway', x: 250, y: 160 },
    { id: 'redis', label: 'Redis Cluster (Rate Limit)', type: 'cache', x: 480, y: 60 },
    { id: 'lua', label: 'Lua Script (Atomic)', type: 'worker', x: 480, y: 260 },
    { id: 'backend', label: 'Backend Service', type: 'app', x: 730, y: 160 },
  ]}
  edges={[
    { from: 'client', to: 'api', label: 'request' },
    { from: 'api', to: 'redis', label: 'EVAL script' },
    { from: 'redis', to: 'lua', label: 'check + increment' },
    { from: 'api', to: 'backend', label: 'allowed → forward' },
    { from: 'api', to: 'client', label: '429 → too many' },
  ]}
  height={320}
/>

## 5. Quiz

\`\`\`
- Q: Why use a Lua script in Redis for rate limiting?
  Options: Faster execution, Atomic operations without race conditions, Lua is the only supported language, Scripts auto-expire
  Correct: Atomic operations ensure no race condition between checking and incrementing the counter

- Q: A user sends 100 requests in the first second of the minute, then nothing for 59 seconds. Which algorithm allows this?
  Options: Fixed window (resets every minute), Sliding window, Leaky bucket, Token bucket
  Correct: Token bucket (burst-friendly — tokens accumulate up to bucket capacity)
\`\`\``,
    estimatedMin: 16,
    difficulty: 'Intermediate' as const,
    companies: ['Stripe', 'GitHub', 'Twitter', 'Google', 'Amazon'],
    tags: ['rate-limiter', 'API-gateway', 'Redis', 'throttling', 'distributed-systems'],
  },
  {
    id: 'lesson-14-08',
    slug: 'design-deep-dive-18-geospatial-service',
    title: 'Design a Geospatial Index & Proximity Service',
    content: `## 0. Mental Model

> A geospatial service is like a constellation of GPS satellites that can instantly answer "what's within 5km of this point?" You're building a spatial index that organizes millions of locations so proximity queries don't require scanning every point.

## 1. Quick Summary

Design a **geospatial indexing service** for proximity queries (find nearby restaurants, drivers, stores). Core data structures: **Geohash** (encode lat/lng into a hierarchical string, share prefix = nearby), **QuadTree** (recursive subdivision of 2D space), **S2 Geometry** (Google's approach — project sphere onto cube, then Hilbert curve). At Redis scale: use **Redis Geo** commands (sorted set with geohash score). At database scale: use **PostGIS** (R-tree index with GiST).

## 2. Geohash Explained

\`\`\`
Geohash encodes lat/lng into a base-32 string:
"9q8yy" (San Francisco)

Properties:
- Longer prefix = more precise
  "9q" ≈ 5,000km  "9q8" ≈ 130km  "9q8y" ≈ 5km  "9q8yy" ≈ 0.5km
- Shared prefix = nearby location
- Recursive: split world into 32 cells, subdivide each cell into 32, etc.

Precision → cell size:
  1 char → 5,000km
  2 chars → 1,250km
  3 chars → 156km
  4 chars → 39km
  5 chars → 4.9km
  6 chars → 1.2km
  7 chars → 152m
  8 chars → 38m
\`\`\`

## 3. Redis Geo Commands

\`\`\`bash
# Add locations (ZSET with geohash as score)
GEOADD restaurants 122.4194 37.7749 "SF Grill"
GEOADD restaurants 122.4080 37.7840 "Mission Cafe"
GEOADD restaurants 122.4310 37.7650 "SoMa Kitchen"

# Find restaurants within 5km of a point
GEOSEARCH restaurants FROMLONLAT 122.4200 37.7750 BYRADIUS 5 km WITHDIST

# Returns:
# 1) "SF Grill" (0.5 km)
# 2) "Mission Cafe" (1.2 km)
# 3) "SoMa Kitchen" (1.8 km)
\`\`\`

## 4. Architecture

<RoughDiagram
  nodes={[
    { id: 'client', label: 'Client App', type: 'client', x: 50, y: 140 },
    { id: 'api', label: 'Proximity API', type: 'gateway', x: 280, y: 60 },
    { id: 'redis', label: 'Redis Geo Cluster', type: 'cache', x: 280, y: 220 },
    { id: 'db', label: 'PostGIS (Full Data)', type: 'db', x: 550, y: 60 },
    { id: 'sync', label: 'Sync Worker', type: 'worker', x: 550, y: 220 },
    { id: 'cdb', label: 'Change Data Capture', type: 'queue', x: 550, y: 380 },
  ]}
  edges={[
    { from: 'client', to: 'api', label: 'nearby? lat,lng' },
    { from: 'api', to: 'redis', label: 'GEOSEARCH' },
    { from: 'api', to: 'db', label: 'details for results' },
    { from: 'cdb', to: 'sync', label: 'location update' },
    { from: 'sync', to: 'redis', label: 'GEOADD' },
    { from: 'sync', to: 'db', label: 'upsert' },
  ]}
  height={440}
/>

## 5. Quiz

\`\`\`
- Q: Two points with geohash "9q8yy" share how many characters?
  Options: 0, 3, 5, 8
  Correct: 5 (same prefix = nearby, accuracy ~0.5km)

- Q: You need to find 10 Uber drivers closest to a passenger. Redis GEO command:
  Options: GEOSEARCH, GEODIST, GEOPOS, GEOHASH
  Correct: GEOSEARCH ... BYRADIUS ... ORDER BY distance
\`\`\``,
    estimatedMin: 16,
    difficulty: 'Intermediate' as const,
    companies: ['Uber', 'Lyft', 'DoorDash', 'Google Maps', 'Yelp'],
    tags: ['geospatial', 'geohash', 'redis-geo', 'proximity', 'PostGIS', 'mapping'],
  },
];
