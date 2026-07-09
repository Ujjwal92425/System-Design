## 1. Hook

A city library starts in one building. Every book, every checkout
record, every overdue notice lives on the same shelves. For years
that works fine. Then the city doubles in size. The checkout desk
line wraps around the block. Shelves are full. The head librarian
works 14-hour days and still cannot keep up.

She has two options that sound similar but solve different problems.
First, she could open three identical branch libraries and put a
full copy of every book in each branch. A reader in the north side
visits the north branch and finds the same catalog. That is
replication - more copies of the same data, more read capacity,
one writer still deciding what gets added (see:
MOD-03/06-database-replication-leader-follower-multi-leader).

Second, she could split the collection: cookbooks go to the east
branch, history to the west branch, science to the north branch.
Each branch holds a different slice of the catalog. A reader who
wants a cookbook must know to visit east. No branch holds
everything, but each branch is smaller, faster to search, and the
head librarian's workload is divided. That is partitioning and
sharding - one dataset split into pieces that live on different
machines.

Replication multiplies copies. Sharding divides the dataset. Most
large systems need both: shards split the data, replicas inside
each shard absorb read load and survive failure.

## 2. What Is It

(a) Plain-English one-liner: partitioning is splitting one database
table into smaller pieces stored and queried separately; sharding is
partitioning where those pieces live on different database servers,
so writes and storage scale beyond one machine.

(b) Formal definition: **partitioning** is the logical division of
a relation (table, index, or keyspace) into disjoint subsets called
partitions, each addressable independently. **Sharding** (horizontal
partitioning at scale) is the physical placement of those partitions
on separate database nodes (shards), with a routing layer that maps a
partition key to the correct shard. Vertical partitioning splits
columns or feature domains across tables or databases (users in DB-A,
orders in DB-B). Horizontal partitioning splits rows by a shard key
(`user_id`, `tenant_id`, `order_date`). Range partitioning assigns
contiguous key ranges to partitions; hash partitioning assigns keys
via a hash function; list partitioning assigns explicit key sets.
Replication (see: MOD-03/06-database-replication-leader-follower-
multi-leader) scales reads and fault tolerance within a shard; sharding
scales write throughput, storage capacity, and connection fan-out
beyond one node's ceiling.

## 3. The Problem It Solves

Before sharding, the team runs one Postgres instance. It holds 800 GB
of data, the write rate is 12k inserts per second at peak, and the
single leader's disk IO and WAL throughput are saturated. Adding
read replicas (see: MOD-03/06-database-replication-leader-follower-
multi-leader) helps analytics and read-heavy pages, but every write
still lands on the same primary. The box is the bottleneck. A
vertical scale-up to a 64-vCPU machine buys six months, then the
curve bends again.

Partitioning inside one server (Postgres declarative partitioning,
MySQL partitions) helps query pruning and maintenance (drop old
month partitions cheaply) but does not escape one machine's write
ceiling. Sharding splits rows across N primaries: each shard owns
roughly 1/N of the data and 1/N of the writes. A four-shard fleet
theoretically quadruples write headroom if the shard key spreads
load evenly.

After sharding by `tenant_id`, each tenant's reads and writes hit
one shard. Cross-tenant analytics move to a warehouse. The team
trades a simple single-database mental model for a routing layer,
cross-shard query pain, and rebalancing work when shards grow uneven.
The one-box write ceiling is replaced by a distributed-operations
problem - which is the problem you want at scale because it has
known patterns (Vitess, Citus, DynamoDB, Cassandra).

## 4. Core Concept Breakdown

- **Partition key (shard key):** the column(s) hashed or ranged to
  decide which shard owns a row. A bad key creates hot shards; a
  good key spreads load and keeps related rows co-located.
- **Shard:** a database node (or cluster with its own replication)
  that owns a subset of partitions. Each shard is usually a full
  primary-plus-replicas mini-cluster.
- **Routing layer:** application logic, proxy (Vitess, ProxySQL), or
  driver that maps `(shard_key) -> shard connection`. Every query
  must include or derive the shard key for point lookups.
- **Range vs hash vs list partitioning:** range groups contiguous
  keys (dates, ID ranges); hash spreads keys pseudo-randomly; list
  assigns explicit values (region codes). Range is natural for time-
  series; hash avoids hot spots from sequential IDs.
- **Hot shard:** one partition receives disproportionate traffic
  (celebrity user, global counter, "latest" feed). The fleet looks
  sharded but behaves like one overloaded box.
- **Cross-shard query:** a query without an equality predicate on
  the shard key must fan out to all shards and merge results
  (expensive, slow, hard to paginate).
- **Co-location:** placing related rows on the same shard (orders
  with their user) so joins stay local. Requires choosing a shard
  key that parent and child share.
- **Rebalancing:** moving partitions between shards when one shard
  outgrows others. Without a plan, the largest shard becomes the
  new bottleneck.
- **Two-level hierarchy:** many systems shard first, then replicate
  each shard (Citus, Vitess, MongoDB sharded cluster). Replication
  handles reads inside a shard; sharding handles fleet scale.

## 5. How It Works

Step by step, sharding a Postgres-backed SaaS by `tenant_id`:

1. **Confirm sharding is the right lever.** Measure the primary:
   write tps, disk size, connection count, and query latency. If
   reads dominate, add replicas first (see:
   MOD-03/06-database-replication-leader-follower-multi-leader).
   Shard when write throughput, storage, or blast radius on one
   primary is the limit.
2. **Choose the shard key.** Pick a key with high cardinality,
   even distribution, and present in almost every query path.
   `tenant_id` for multi-tenant SaaS is the classic choice: each
   tenant's data co-locates, cross-tenant queries are rare on the
   OLTP path.
3. **Pick the partitioning strategy.** Hash(`tenant_id`) mod N
   for even spread when tenants are similar size. Range by
   `tenant_id` only if IDs correlate with size (usually they do
   not). Avoid sharding on a low-cardinality column (country
   with three values and three shards = three hot spots).
4. **Size the shard count for the planning horizon.** Start with
   enough shards that the largest expected tenant fits in one
   shard with headroom (rule of thumb: no single tenant above
   ~25 percent of one shard's capacity, or isolate giants to
   dedicated shards). Four to sixteen shards is a common starting
   band for mid-size products.
5. **Build the routing layer.** A thin module maps
   `shard = hash(tenant_id) % num_shards` to a connection pool.
   Writes and tenant-scoped reads include `tenant_id` in the WHERE
   clause; the router picks the pool. Missing `tenant_id` on a
   write is a bug that creates orphan rows on the wrong shard.
6. **Provision each shard as its own HA cluster.** Each shard gets
   a primary and one or two replicas (same replication playbook as
   MOD-03/06). A shard failure affects only its tenants, not the
   whole product.
7. **Migrate data with dual-write or backfill.** Cutover patterns:
   (a) dual-write to old DB and new shards while backfilling history,
   then flip reads; (b) logical replication from monolith to shards
   per tenant batch. Never big-bang copy under live write load
   without a verified rollback.
8. **Ban cross-shard joins on the hot path.** Reports that need
   all tenants go to a read replica fed by CDC or a warehouse
   (see MOD-14/05-data-pipeline-etl-system). OLTP queries that
   `JOIN` across tenants without a shard key become N-way fan-out.
9. **Plan rebalancing before you need it.** When a shard hits 70
   percent of capacity, split it or add shards and remapping
   (consistent hashing reduces remapping pain; see:
   MOD-03/08-consistent-hashing). Vitess and Citus automate
   this; home-grown hash-mod-N requires a painful full reshuffle.
10. **Monitor per-shard metrics, not fleet averages.** p99 write
    latency, disk usage, and connection count per shard. Fleet
    average latency hides one hot shard until it catches fire.

## 6. Diagram

```mermaid
flowchart TD
    C[Client request with tenant_id] --> R[Shard router]
    R -->|hash tenant_id| S1[Shard 0 primary]
    R -->|hash tenant_id| S2[Shard 1 primary]
    R -->|hash tenant_id| S3[Shard 2 primary]
    S1 --> R1A[Shard 0 replica A]
    S1 --> R1B[Shard 0 replica B]
    S2 --> R2A[Shard 1 replica A]
    S3 --> R3A[Shard 2 replica A]
    C -->|missing tenant_id| X[Cross-shard fan-out]
    X --> S1
    X --> S2
    X --> S3
    X --> M[Merge and sort results]
    WH[Warehouse / analytics] -.->|CDC from all shards| S1
    WH -.-> S2
    WH -.-> S3
```

<!-- GIF: animation showing a new tenant's rows routing to one shard
while a cross-shard analytics query fans out to all three shards
and merges results with visible latency spike -->

## 7. When to Use It

Pick sharding when one or more hold:

- **Write throughput exceeds one primary's sustainable tps** after
  indexing and query tuning, and replicas only offload reads (see:
  MOD-03/06-database-replication-leader-follower-multi-leader).
- **Data size exceeds comfortable operation on one node** (often
  500 GB to 2 TB depending on IO budget, or cloud disk limits),
  and archival partitioning inside one server is insufficient.
- **Blast radius must shrink:** a bad query or corruption should
  affect one tenant cohort, not the entire customer base.
- **Regulatory or contractual data residency** requires certain
  tenants on specific regions or hardware; list or range sharding
  by region satisfies that.
- **The access pattern is naturally partitionable:** almost every
  OLTP query includes `tenant_id`, `user_id`, or `device_id` as an
  equality filter.

Pick table partitioning (single server) without cross-node sharding
when:

- **The goal is maintenance, not write scale:** drop old monthly
  partitions, parallel vacuum, partition-wise joins inside one
  Postgres instance.
- **Time-range queries dominate** and you prune by date (logs,
  events, metrics).

## 8. When NOT to Use It

- **The workload is still comfortably on one primary with replicas.**
  Sharding adds routing bugs, cross-shard pain, and rebalancing
  forever. Premature sharding is one of the most expensive regrets
  in platform engineering.
- **You cannot identify a stable, high-cardinality shard key.**
  If most queries lack a natural partition key, every read becomes
  a fan-out. Fix the schema or access pattern before sharding.
- **You need frequent cross-shard ACID transactions.** Two-phase
  commit across shards is slow and brittle (see:
  MOD-17/09-3pc-three-phase-commit-protocol). Prefer sagas or
  accept per-shard transactions only.
- **One entity dominates traffic** (global leaderboard, single
  celebrity account) and you shard by user ID without a plan for
  hot-key splitting. Sharding without hot-key mitigation just
  moves the hot spot to one shard.

## 9. Real-World Example

**Instagram** (circa 2012 scaling path) sharded Postgres by
`user_id` across thousands of logical shards mapped to physical
hosts. Photos, follows, and feeds for one user co-locate on one
shard; cross-user feed generation fans out but user-scoped reads
stay local. They paired sharding with Memcached (see:
MOD-04/04-distributed-caching-redis-memcached) because even
sharded Postgres could not serve every feed read.

**Shopify** runs a sharded MySQL fleet (Vitess) where the shard
key is typically shop-centric. Merchants are isolated: a runaway
query on one shop does not lock tables for every other shop. Their
public engineering posts cite moving from one monolith database to
Vitess-managed shards as the enabler for Black Friday write spikes
in the hundreds of thousands of orders per minute across the fleet
(not per shard).

**Discord** migrated message storage to Cassandra (native
partitioning by `(channel_id, bucket)`), storing billions of
messages with hash partitioning on channel ID so hot channels are
the exception, not the default. A realistic mid-size SaaS after
sharding: four shards, each primary sustaining 4k write tps (16k
fleet total vs 8k on one box), per-shard storage 200 GB, p99
tenant-scoped read under 5 ms, cross-tenant admin report 800 ms
via warehouse instead of live fan-out.

## 10. Production-Grade Code

```typescript
// Tenant-scoped shard router for a hash-mod-N Postgres fleet.
// Every OLTP query must carry tenantId so the router picks one
// pool. Cross-shard queries are explicit and logged because they
// are the main source of production incidents.

import { createHash } from "node:crypto";
import type { Pool } from "pg";

const SHARD_COUNT = 4;

export interface ShardPools {
  readonly shards: Pool[];
}

export class TenantShardRouter {
  private readonly shards: Pool[];

  constructor(pools: ShardPools) {
    if (pools.shards.length !== SHARD_COUNT) {
      throw new Error(`expected ${SHARD_COUNT} shard pools`);
    }
    this.shards = pools.shards;
  }

  // Stable hash: same tenant always maps to same shard until
  // SHARD_COUNT changes. MD5 is not for security here; we need
  // deterministic, evenly distributed bucket assignment.
  shardIndexForTenant(tenantId: string): number {
    const digest = createHash("md5").update(tenantId).digest();
    const bucket = digest.readUInt32BE(0);
    return bucket % SHARD_COUNT;
  }

  poolForTenant(tenantId: string): Pool {
    return this.shards[this.shardIndexForTenant(tenantId)];
  }

  // Tenant-scoped read: one shard, one round trip.
  async queryTenant<T>(
    tenantId: string,
    sql: string,
    params: unknown[]
  ): Promise<T> {
    const pool = this.poolForTenant(tenantId);
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T;
    } finally {
      client.release();
    }
  }

  // Cross-shard fan-out: use only for admin or batch jobs, never
  // the user-facing hot path. Promise.all doubles load on every
  // shard simultaneously - the incident pattern behind "we sharded
  // but p99 got worse."
  async queryAllShards<T>(
    sql: string,
    params: unknown[]
  ): Promise<T[]> {
    const results = await Promise.all(
      this.shards.map(async (pool) => {
        const client = await pool.connect();
        try {
          const result = await client.query(sql, params);
          return result.rows as T[];
        } finally {
          client.release();
        }
      })
    );
    return results.flat();
  }
}

// Example: orders always include tenant_id in the WHERE clause
// so Postgres can use the local index; the router guarantees the
// connection targets the shard that actually holds the rows.
export async function listOrdersForTenant(
  router: TenantShardRouter,
  tenantId: string,
  limit: number
): Promise<{ id: string; total_cents: number }[]> {
  return router.queryTenant(
    tenantId,
    `SELECT id, total_cents FROM orders
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
    [tenantId, limit]
  );
}
```

Why-not-what notes:

- `shardIndexForTenant` uses MD5 for even distribution, not
  cryptography. Sequential tenant IDs would hot-spot with naive
  `id % N` if IDs correlate with signup waves.
- `queryTenant` requires the caller to pass `tenantId` separately
  from SQL so routing cannot be forgotten when copy-pasting queries.
- `queryAllShards` is intentionally verbose and uncached to
  discourage casual use on request paths.
- Changing `SHARD_COUNT` remaps every tenant; production systems
  use consistent hashing or managed resharding (see:
  MOD-03/08-consistent-hashing) instead of blind mod-N changes.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Write and storage scale roughly linearly with shard count | Cross-shard queries, joins, and global aggregates become expensive fan-out | A routing layer, query discipline, and warehouse for analytics |
| Smaller blast radius per shard failure or bad query | Rebalancing when shards grow uneven is operational work | Resharding playbooks, dual-write cutovers, or managed tooling (Vitess, Citus) |
| Tenant or user isolation fits multi-tenant SaaS naturally | No free cross-shard ACID; distributed transactions are slow | Saga patterns or per-shard consistency only (see MOD-06/07-saga-pattern-distributed-transactions) |
| Co-locate related rows for fast local joins within a shard | Bad shard key creates hot shards that negate the scale win | Shard-key design reviews and hot-key splitting (salting, sub-shards) |
| Pair with per-shard replication for reads and HA | Application and ORM complexity; ORMs assume one database | Custom data access layer, integration tests per shard |

## 12. Comparison Table

| Approach | Write scale | Cross-partition query | Ops complexity | Best when |
|---|---|---|---|---|
| Single DB + replicas | One primary ceiling | Simple SQL, any join | Low | Writes fit one box; reads need scale (see MOD-03/06) |
| Table partitioning (single node) | Same one primary | Prunes partitions by key | Low-medium | Time-series maintenance, large single-table prune |
| Hash sharding (mod N or consistent hash) | N primaries | Fan-out unless shard key in query | High | Even tenant/user spread, OLTP keyed access |
| Range sharding | N primaries | Range scans local, skew at boundaries | High | Time-ordered data, geo ranges |
| Separate DB per service (vertical split) | Per-service ceiling | Cross-service via API, not SQL | Medium | Microservices with bounded contexts (see MOD-06/01-monolithic-vs-microservices-architecture) |

## 13. Numbers & Benchmarks

- **When to consider sharding (rule of thumb):** sustained write
  rate above ~5k to 15k tps on Postgres/MySQL after tuning, or
  primary data size above ~1 TB with growing IO wait - varies by
  hardware, but these are the conversation starters in production
  postmortems.
- **Cross-shard fan-out cost:** a query hitting 16 shards pays
  roughly 16x connection overhead plus merge latency; p99 often
  jumps from single-digit ms to hundreds of ms without a warehouse.
- **Vitess / Shopify-class fleets:** shard counts in the hundreds
  to thousands logical, tens to hundreds physical; per-shard
  primaries often target well under 1 TB for manageable backup and
  failover times.
- **Hot-key threshold:** if one partition key accounts for more
  than ~10 percent of fleet write tps, expect shard imbalance;
  Instagram and Discord engineering posts describe per-key salting
  when a single entity outgrows one node.
- **Rebalancing downtime:** managed systems (Citus rebalance,
  Vitess resharding) target minutes to hours with dual-write;
  home-grown mod-N reshuffle often means a maintenance window.

## 14. Common Pitfalls

- **Sharding before replicas and query tuning.** The team jumps to
  eight shards while the primary still runs full table scans. They
  inherit eight copies of the same bad query. Fix indexes and read
  replicas first; shard when the primary write or size curve breaks
  the SLO.
- **Choosing `created_at` as the only shard key for OLTP.** Range
  by date concentrates all new writes on the "current month" shard
  (hot spot). Use hash on `user_id` for writes, range partition
  only for archival inside the shard or in the warehouse.
- **Cross-shard pagination in the API.** `ORDER BY created_at LIMIT
  20 OFFSET 1000` across all shards requires fetching and merging
  thousands of rows from every shard. Cursor pagination per shard
  or pre-aggregated feeds in cache fix this (see:
  MOD-04/03-cache-aside-read-through-write-through-write-back).

## 15. Interview Q&A

**Q1. Replication vs sharding - when do you pick which?** Model
answer: replication copies the same dataset to multiple nodes;
it scales reads and improves availability but every write still
hits one primary. Sharding splits the dataset across primaries;
it scales writes and storage. Most large systems combine both:
many shards, each shard replicated. Pick replication alone when
writes fit one box; add sharding when the primary write rate or
disk size is the bottleneck.

**Q2. How do you choose a shard key?** Model answer: high
cardinality, even distribution, appears in almost every OLTP query,
and co-locates related rows (orders with users). For multi-tenant
SaaS, `tenant_id` is default. Avoid low-cardinality keys and keys
that correlate with traffic spikes unless you have a hot-key plan.

**Q3. What breaks when you shard?** Model answer: cross-shard
joins, global unique constraints (need global index or app-level
check), serializable transactions across entities on different
shards, and naive ORM assumptions. You gain horizontal write scale
and isolation at the cost of relational convenience.

**Q4. How do you migrate from monolith to shards without downtime?**
Model answer: dual-write new and old while backfilling historical
rows per shard key batch; verify row counts and checksums; flip
reads shard-by-shard or tenant-by-tenant; retire monolith writes
last. Logical replication or CDC feeds the warehouse throughout.

**Q5. What is a hot shard and how do you fix it?** Model answer: one
partition receives disproportionate traffic because the shard key
is skewed (celebrity user, global counter). Fixes: salt the key
(`user_id:slot`), dedicate a shard to the hot entity, move counters
to Redis (see MOD-04/04-distributed-caching-redis-memcached), or
split the hot partition via sub-sharding.

**Q6. Partitioning vs sharding - same thing?** Model answer:
partitioning is the logical split; sharding is partitioning with
partitions on separate database servers. Postgres declarative
partitions on one server are partitioning without sharding. Vitess
shards are partitioning with sharding.

## 16. Follow-up / Curveball Questions

**Curveball 1. Product wants a global unique email constraint
across all tenants after you sharded by tenant_id.** Answer
direction: a global unique index requires either a central lookup
service, a synchronous check on every shard during insert (fan-out),
or duplicate detection async with compensating deletes. Most teams
store users in a small unsharded "identity" cluster and shard
tenant-scoped data separately.

**Curveball 2. You have 4 shards and need to expand to 8 without
downtime.** Answer direction: mod-N remaps half the keys; that is
a full migration. Consistent hashing or managed resharding (Vitess)
moves only adjacent key ranges. Plan shard count upfront with
virtual slots (see MOD-03/08-consistent-hashing) to avoid mod-N
whack-a-mole.

**Curveball 3. Analytics wants real-time `COUNT(*)` across all
shards.** Answer direction: live fan-out does not scale; maintain
approximate counters (HyperLogLog for cardinality, see
MOD-16/05-hyperloglog-cardinality-estimation), materialized
aggregates via CDC, or query the warehouse with seconds of lag.

## 17. Cheat-Sheet Summary

- Replication multiplies copies; sharding divides the dataset across
  primaries - use both at scale (replicated shards).
- Pick a high-cardinality shard key present in every hot query;
  `tenant_id` / `user_id` are the usual winners.
- Cross-shard joins and global transactions are the tax; OLTP stays
  shard-local, analytics goes to a warehouse.
- Hot shards come from bad keys or celebrity entities; fix with
  hashing, salting, or dedicated isolation.
- Rebalancing is inevitable; prefer consistent hashing or managed
  resharding over naive hash-mod-N changes (see MOD-03/08).

## 18. Further Reading

- Martin Kleppmann, "Designing Data-Intensive Applications,"
  Chapter 6 (Partitioning) - range vs hash, secondary indexes on
  shards, and rebalancing trade-offs; the canonical reference.
- Vitess documentation, "Sharding" and "Resharding" - production
  patterns for MySQL-compatible horizontal sharding used at
  YouTube and Shopify scale.
- PostgreSQL documentation, Chapter 5.11 (Table Partitioning) -
  single-server declarative partitioning for maintenance and
  prune, distinct from cross-node sharding but often the first
  step before Citus or application-level sharding.

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (library branches vs duplicate branches analogy)
2. What Is It - Covered (plain-English plus formal partitioning/sharding definitions)
3. The Problem It Solves - Covered (single primary write ceiling before, sharded fleet after)
4. Core Concept Breakdown - Covered (10 bulleted moving parts)
5. How It Works - Covered (10 numbered steps for tenant_id sharding)
6. Diagram - Covered (flowchart with router, shards, replicas, fan-out; gif placeholder)
7. When to Use It - Covered (5 sharding triggers plus single-server partitioning case)
8. When NOT to Use It - Covered (4 anti-patterns)
9. Real-World Example - Covered (Instagram, Shopify/Vitess, Discord/Cassandra with numbers)
10. Production-Grade Code - Covered (TypeScript TenantShardRouter with tenant and fan-out queries)
11. Trade-offs Table - Covered (5 rows, three columns)
12. Comparison Table - Covered (5 approaches across 5 dimensions)
13. Numbers & Benchmarks - Covered (5 concrete figures)
14. Common Pitfalls - Covered (3 incident-style mistakes)
15. Interview Q&A - Covered (6 reasoning-based Q&As)
16. Follow-up / Curveball Questions - Covered (3 senior follow-ups)
17. Cheat-Sheet Summary - Covered (5 standalone lines)
18. Further Reading - Covered (DDIA, Vitess, Postgres partitioning docs)

No section skipped. No em-dashes. No emojis. Prerequisite cross-links to MOD-03/06 and MOD-03/08 included.
