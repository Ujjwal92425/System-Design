## 1. Hook

You need to store things at home. Some items fit a filing cabinet:
labeled folders, neat tabs, everything cross-referenced. Some fit
a warehouse pallet: one big label on the outside, grab the whole
box, no need to open individual folders inside. Some fit a bulletin
board: sticky notes with arrows between them showing who knows
whom. Some fit a security deposit box: one key opens one slot,
nothing else matters.

Using only the filing cabinet for everything is painful. Storing
a sofa inventory in manila folders is silly. Storing legal contracts
as unlabeled warehouse pallets is worse. NoSQL is not "no SQL forever"
- it is picking the storage shape that matches how you actually
read and write the data, instead of forcing every problem into
rows and columns.

The four dominant NoSQL families - document, key-value, wide-column,
and graph - are four different storage shapes. Pick the wrong one
and you spend six months building application-side joins, fighting
hot partitions, or paying Neo4j ops costs for a problem two SQL
tables would solve. Pick the right one and the access pattern
becomes a one-liner query with horizontal scale built in.

## 2. What Is It

(a) Plain-English one-liner: NoSQL databases are purpose-built storage
engines grouped by data model (document, key-value, wide-column,
graph) that trade some relational guarantees for scale, flexibility,
or query patterns SQL handles poorly.

(b) Formal definition: **NoSQL** (historically "Not Only SQL") denotes
non-relational database systems optimized for specific access
patterns. The four dominant families are:

- **Document stores** store self-contained JSON/BSON documents with
  nested fields and schema-flexible shapes (MongoDB, CouchDB, Firestore).
- **Key-value stores** map opaque keys to opaque values with O(1)
  get/put and no server-side query inside values (Redis, DynamoDB
  as KV, Riak, etcd).
- **Wide-column / column-family stores** store sparse rows keyed by
  a partition key plus clustering columns sorted within the partition
  (Cassandra, HBase, ScyllaDB).
- **Graph databases** store vertices and edges as first-class citizens
  with index-free adjacency for traversals (Neo4j, Amazon Neptune,
  JanusGraph).

Each family makes different CAP/PACELC choices (see:
MOD-15/03-cap-theorem, MOD-03/12-pacelc-theorem) and uses different
on-disk structures (B-trees vs LSM trees; see:
MOD-03/02-relational-db-internals-btrees-indexing,
MOD-03/10-nosql-internals-lsm-trees-sstables-compaction). NoSQL is
not a replacement for SQL; it is **polyglot persistence** - using
the right engine per access path (see: MOD-03/01-sql-vs-nosql-when-to-use-it).

## 3. The Problem It Solves

Before NoSQL went mainstream, teams stored session blobs, product
catalogs with wildly varying attributes, social graphs, and time-
ordered logs inside normalized SQL schemas. JSON columns in Postgres
helped but indexes, joins, and migration pain remained. A flash sale
spiked writes on one hot row; vertical scale hit a ceiling; sharding
Postgres by hand was brittle (see:
MOD-03/07-database-sharding-and-partitioning).

After picking the right NoSQL family, the access pattern drives the
schema. A session store becomes Redis GET/SET by key. A messaging
feed becomes Cassandra partitions by `channel_id`. A fraud ring
becomes Neo4j traversals. The team trades ad-hoc SQL analytics and
multi-table ACID for horizontal write scale, schema flexibility, or
millisecond graph hops.

The wrong family still hurts. Graph problems in MongoDB become
application-side join hell. Time-series IoT in Redis runs out of
memory. Wide-column Cassandra with the wrong partition key turns
every query into a cluster-wide fan-out. The fix is not "NoSQL vs
SQL" - it is matching the data model to the query shape.

## 4. Core Concept Breakdown

- **Document store:** JSON-like documents with nested objects;
  queries by field, text index, or geo; one document equals one
  aggregate (user profile with embedded addresses).
- **Key-value store:** key maps to opaque value; no server-side
  query on value fields; O(1) get/put; ideal for cache, sessions,
  feature flags, rate-limit counters.
- **Wide-column store:** partition key determines node; clustering
  columns sort rows inside partition; optimized for time-range
  scans within one partition key scope.
- **Graph store:** nodes and typed edges; index-free adjacency for
  traversals; Cypher/Gremlin express "friends of friends in 3 hops."
- **Schema flexibility:** document and wide-column allow evolving
  fields without ALTER TABLE migrations; application discipline
  still required or documents become schema soup.
- **Eventual consistency default:** many NoSQL systems favor AP
  under partition; tunable quorums in Cassandra/Dynamo-style stores
  (see: MOD-03/11-cap-theorem).
- **Horizontal scale native:** partitioning and consistent hashing
  built in (see: MOD-03/08-consistent-hashing), not bolted on after
  the fact.
- **Secondary indexes:** document and wide-column support them but
  with caveats - Cassandra secondary indexes fan out; Mongo compound
  indexes must match query shape.
- **Polyglot persistence:** SQL for money and invariants, NoSQL
  for scale-shaped paths; Stripe and Amazon run both deliberately.
- **CDC to warehouse:** NoSQL OLTP rarely serves ad-hoc BI; stream
  changes to BigQuery/Snowflake (see: MOD-14/05-data-pipeline-etl-system).

## 5. How It Works

Choosing and operating a NoSQL family for a new production feature:

1. **Write the access pattern list.** For each user action, note:
   read or write, key used, need for range scan, join, or graph
   traversal, consistency requirement, and expected QPS.
2. **Match pattern to family.** Single-key read/write -> KV.
   Whole-object fetch by ID with nested fields -> document. High-
   volume time-ordered rows per entity -> wide-column. Multi-hop
   relationship queries -> graph. Cross-entity reporting -> SQL or
   warehouse, not NoSQL OLTP.
3. **Confirm consistency needs.** Financial ledger still belongs in
   SQL with ACID (see: MOD-03/03-acid-properties). Session cache
   tolerates loss; shopping cart can be eventually consistent with
   merge rules.
4. **Model the partition key first (wide-column and sharded document).**
   Co-locate rows queried together (`user_id`, `channel_id`). Wrong
   partition key equals cross-partition scans (see:
   MOD-03/07-database-sharding-and-partitioning).
5. **Embed vs reference in documents.** One-to-few: embed (addresses
   in user doc). One-to-many unbounded: separate collection or
   bucketed embedding (`comments_0`, `comments_1`) to avoid 16 MB
   MongoDB document limit and replication lag.
6. **Set TTL and compaction awareness.** KV caches expire keys;
   LSM-backed stores pay compaction IO (see:
   MOD-03/10-nosql-internals-lsm-trees-sstables-compaction).
7. **Expose via repository layer, not raw driver everywhere.** Swap
   engines later without rewriting business logic; integration tests
   mock the interface.
8. **Feed analytics through CDC.** Debezium, Kafka Connect, or native
   change streams pipe NoSQL writes to the warehouse; never run
   `SELECT *` fan-out across shards for BI.
9. **Capacity plan per family.** Redis: memory ceiling. Cassandra:
   partition size under 100 MB guideline. Neo4j: heap + page cache
   for working set. Document: index RAM for working set.
10. **Run failure drills.** Kill a Cassandra node, fail over Redis
    Sentinel, restore Mongo from backup - each family has different
    ops playbooks.

## 6. Diagram

```mermaid
flowchart TD
    AP[Access pattern list] --> Q1{Single key get/put only?}
    Q1 -->|yes| KV[Key-value Redis / DynamoDB / etcd]
    Q1 -->|no| Q2{Whole aggregate by ID?}
    Q2 -->|yes| DOC[Document MongoDB / CouchDB / Firestore]
    Q2 -->|no| Q3{Time-range within one entity?}
    Q3 -->|yes| COL[Wide-column Cassandra / HBase / Scylla]
    Q3 -->|no| Q4{Multi-hop relationship traversal?}
    Q4 -->|yes| G[Graph Neo4j / Neptune]
    Q4 -->|no| SQL[Relational SQL or warehouse]
    KV --> CDC[CDC to warehouse]
    DOC --> CDC
    COL --> CDC
    G --> CDC
```

<!-- IMAGE: four-quadrant diagram comparing document/KV/wide-column/graph
with example query shapes and one real product logo per quadrant -->

## 7. When to Use It

Pick **document** when:

- **Catalog with varying attributes** (e-commerce SKUs where electronics
  have different fields than clothing).
- **CMS content** with nested blocks and revision history.
- **User profiles** with embedded settings fetched as one object per
  page load.
- **Mobile offline sync bundles** where one document syncs atomically.

Pick **key-value** when:

- **Sessions, rate-limit counters, feature flags** with TTL.
- **Leaderboards** using Redis sorted sets (ZSET).
- **Distributed locks and coordination** (Redis Redlock, etcd).
- **Cache layer** in front of SQL (see:
  MOD-04/04-distributed-caching-redis-memcached).

Pick **wide-column** when:

- **IoT events per device** with time-range queries.
- **Messaging per channel** with append-only writes.
- **Write-heavy logs** with partition-scoped reads, not cross-partition
  joins.

Pick **graph** when:

- **Fraud rings** requiring variable-depth relationship traversal.
- **Identity resolution** ("same person" across accounts).
- **Social recommendations** where SQL join depth exceeds 2-3 hops
  at production latency budgets.

## 8. When NOT to Use It

- **Heavy cross-entity reporting in SQL.** NoSQL OLTP plus warehouse
  is the pattern; do not force Mongo aggregation pipeline to replace
  BI dashboards.
- **Multi-row ACID across aggregates** without a saga (see:
  MOD-06/07-saga-pattern-distributed-transactions). Most NoSQL lacks
  cross-partition transactions except Spanner, Cockroach, or Mongo
  multi-doc TX with careful scope.
- **Graph store for simple FK relationships.** Two-table SQL joins
  beat Neo4j operational cost for depth-1 relationships.
- **Redis as primary database** without AOF/RDB persistence, replication,
  and backup plan. Memory is fast and fragile.
- **Cassandra for low-write, ad-hoc query workloads.** Cassandra
  is query-first modeled; ad-hoc analytics belong in the warehouse.

## 9. Real-World Example

**Netflix** uses Cassandra for viewing history and recommendation
inputs: partition by profile ID, cluster by timestamp, massive write
throughput across AWS regions. Their Stratus data storage blog
describes trillions of writes per day across the Cassandra fleet;
the partition key keeps each user's history co-located.

**Meta** historically stored social graph edges in sharded MySQL
(TAO abstraction) before graph-specific systems; the lesson is even
relationship-heavy products often start as sharded SQL until traversal
cost and join fan-out force a graph or custom layer.

**Stripe** keeps money movement in strongly consistent Postgres;
ancillary metadata, events, and caches use Kafka, Redis, and
document-shaped blobs. Money stays relational; surrounding telemetry
does not. This is the canonical polyglot persistence pattern.

**MongoDB** production deployments report 40k+ queries per second on
sharded clusters for product catalog workloads where one `product_id`
fetch returns the entire page aggregate. p99 point reads stay under
5 ms with proper indexing; collection scans do not scale.

**Discord** moved messages to Cassandra (wide-column) storing billions
of messages with `(channel_id, bucket)` partition keys; hot channels
are isolated exceptions, not the default path.

A realistic mid-size SaaS polyglot stack: Postgres for billing,
Redis for sessions (50k ops/s peak), MongoDB for product catalog
(8k reads/s), Cassandra for event log (20k writes/s), BigQuery
for analytics fed by CDC within 5-minute lag.

## 10. Production-Grade Code

```typescript
// Polyglot persistence layer: same service, three engines chosen
// by access pattern. Repository interfaces keep business logic
// ignorant of driver details.

interface SessionStore {
  get(sessionId: string): Promise<Record<string, unknown> | null>;
  set(
    sessionId: string,
    data: Record<string, unknown>,
    ttlSec: number
  ): Promise<void>;
}

interface ProductCatalog {
  getProduct(productId: string): Promise<ProductDoc | null>;
  listByCategory(category: string, limit: number): Promise<ProductDoc[]>;
}

interface EventLog {
  append(
    partitionKey: string,
    event: { ts: Date; type: string; payload: unknown }
  ): Promise<void>;
  readRange(
    partitionKey: string,
    from: Date,
    to: Date,
    limit: number
  ): Promise<Array<{ ts: Date; type: string; payload: unknown }>>;
}

interface ProductDoc {
  id: string;
  title: string;
  category: string;
  attributes: Record<string, string | number | boolean>;
}

// KV: sessions are opaque blobs - no query inside value.
export class RedisSessionStore implements SessionStore {
  constructor(
    private readonly redis: {
      get: (k: string) => Promise<string | null>;
      setex: (k: string, ttl: number, v: string) => Promise<void>;
    }
  ) {}

  async get(sessionId: string): Promise<Record<string, unknown> | null> {
    const raw = await this.redis.get(`sess:${sessionId}`);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  }

  async set(
    sessionId: string,
    data: Record<string, unknown>,
    ttlSec: number
  ): Promise<void> {
    // TTL prevents unbounded memory - sessions are ephemeral, not
    // a durability substitute for Postgres.
    await this.redis.setex(
      `sess:${sessionId}`,
      ttlSec,
      JSON.stringify(data)
    );
  }
}

// Document: one fetch returns whole product page aggregate.
export class MongoProductCatalog implements ProductCatalog {
  constructor(
    private readonly collection: {
      findOne: (q: object, o?: object) => Promise<ProductDoc | null>;
      find: (q: object, o?: object) => {
        limit: (n: number) => { toArray: () => Promise<ProductDoc[]> };
      };
    }
  ) {}

  async getProduct(productId: string): Promise<ProductDoc | null> {
    return this.collection.findOne(
      { _id: productId },
      { projection: { title: 1, category: 1, attributes: 1 } }
    );
  }

  async listByCategory(
    category: string,
    limit: number
  ): Promise<ProductDoc[]> {
    // Compound index on (category, _id) required in production;
    // without it this becomes a collection scan.
    return this.collection
      .find({ category }, { projection: { title: 1, attributes: 1 } })
      .limit(limit)
      .toArray();
  }
}

// Wide-column: append events per device partition, read time range.
export class CassandraEventLog implements EventLog {
  constructor(
    private readonly client: {
      execute: (cql: string, params: unknown[]) => Promise<void>;
      eachRow: (
        cql: string,
        params: unknown[],
        cb: (row: Record<string, unknown>) => void
      ) => Promise<void>;
    }
  ) {}

  async append(
    partitionKey: string,
    event: { ts: Date; type: string; payload: unknown }
  ): Promise<void> {
    await this.client.execute(
      `INSERT INTO events (device_id, ts, type, payload)
         VALUES (?, ?, ?, ?)`,
      [partitionKey, event.ts, event.type, JSON.stringify(event.payload)]
    );
  }

  async readRange(
    partitionKey: string,
    from: Date,
    to: Date,
    limit: number
  ): Promise<Array<{ ts: Date; type: string; payload: unknown }>> {
    const rows: Array<{ ts: Date; type: string; payload: unknown }> = [];
    await this.client.eachRow(
      `SELECT ts, type, payload FROM events
         WHERE device_id = ? AND ts >= ? AND ts <= ?
         LIMIT ?`,
      [partitionKey, from, to, limit],
      (row) => {
        rows.push({
          ts: row.ts as Date,
          type: row.type as string,
          payload: JSON.parse(row.payload as string),
        });
      }
    );
    return rows;
  }
}
```

Why-not-what notes:

- Three interfaces isolate access patterns; swapping Mongo for Postgres
  JSONB affects only `MongoProductCatalog`.
- Redis TTL on sessions is mandatory - without it, memory exhaustion
  is a when-not-if incident.
- Cassandra `readRange` requires `device_id` equality - no partition
  key means ALLOW FILTERING and cluster-wide scan.
- `listByCategory` documents the compound index requirement inline;
  ORMs hide this until production catches fire.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Document: flexible schema, one-fetch aggregates, natural JSON API | Unbounded embedded arrays, weak cross-doc joins, 16 MB doc limit | Application schema discipline, index design reviews |
| KV: lowest latency, simplest mental model, rich structures (ZSET) | No query inside values, memory-bound | Separate search index, strict TTL and memory alerts |
| Wide-column: huge write throughput, native partition scale | Query limited to partition key design; fixes are migrations | Query-first data modeling, ops for compaction/repair |
| Graph: fast traversals, expressive relationship queries | Hard to shard horizontally, specialized ops skills | Cluster sizing, query profiling, not generic SQL hiring |
| Polyglot overall: right tool per path | Multiple engines to operate, CDC pipelines, more failure modes | Platform team time, observability per store, backup per store |

## 12. Comparison Table

| Family | Data unit | Query style | Scale axis | Consistency typical | Wrong-fit signal |
|---|---|---|---|---|---|
| Document | JSON document | By field, ID, text index | Shard by shard key | Tunable, often eventual | Heavy cross-doc joins |
| Key-value | Key -> blob | Key only | Horizontal shards | Eventual / per-key linearizable | Need server-side filtering on values |
| Wide-column | Row in column family | Partition key + column range | Native partition | Quorum tunable (Cassandra) | Ad-hoc analytics without partition key |
| Graph | Node + edge | Traversal (Cypher/Gremlin) | Vertical + selective shard | Often ACID per graph | Depth-1 FK relationships only |
| Relational SQL | Row in table | Arbitrary SQL joins | Vertical + manual shard | Strong ACID default | Billions of append-only events per key |

## 13. Numbers & Benchmarks

- **Redis:** single-node GET often sub-millisecond on LAN; 100k+ ops/sec
  on modest hardware for simple keys; memory cost ~50-500 bytes overhead
  per key beyond value size.
- **Cassandra:** linear write scale with node count; single partition
  write throughput bounded by one node (~10k-50k writes/sec depending
  on hardware, replication factor, and consistency level).
- **MongoDB:** indexed point read p99 often 1-5 ms on SSD; unindexed
  collection scans fail above ~10M documents in production SLOs.
- **Neo4j:** traversal depth 3-4 hops stays single-digit ms on indexed
  graphs with working set in page cache; same query in SQL can hit
  seconds at billions of edges.
- **DynamoDB:** single-digit ms latency at millions of requests per
  second with proper partition key design; hot partitions throttle
  at 3,000 RCU / 1,000 WCU per partition (AWS documented soft limits).

## 14. Common Pitfalls

- **MongoDB as default for everything.** Teams embed unbounded comment
  arrays on viral posts until documents exceed 16 MB, replication lag
  spikes, and secondaries fall hours behind. Fix: bucketed collections
  or separate `comments` collection with `post_id` index.
- **Cassandra secondary indexes on high-cardinality columns.** Every
  index query fans out to all nodes; treat as anti-pattern. Use
  Elasticsearch/OpenSearch for search, or model the query into the
  partition key.
- **Graph DB for CRUD with two foreign keys.** Operational overhead
  (heap tuning, query plans, cluster licensing) without traversal
  benefit. SQL joins win until hop depth and variable depth matter.
- **Skipping CDC.** Product asks "run SQL report on Cassandra data."
  Team builds nightly full-table export that crushes the cluster.
  Stream changes instead.

## 15. Interview Q&A

**Q1. When document vs relational?** Model answer: document when one
ID fetch returns the whole aggregate users need and fields vary by
entity type; SQL when you need joins, foreign-key constraints, and
ad-hoc reporting across entities. Hybrid is normal: SQL for orders,
Mongo for catalog.

**Q2. Why Cassandra for messaging?** Model answer: partition by
`channel_id`, cluster messages by `message_id` or timestamp inside
partition, append-only writes without cross-partition transactions.
Reads are "last N messages in channel" - a partition-local range scan.
Matches access pattern exactly.

**Q3. What is the CAP trade for Redis Cluster?** Model answer: under
partition, Redis Cluster continues serving on available shards (AP-
leaning) with possible stale reads during failover. Single-instance
Redis is CP for one key on one node until crash. Know your topology
and persistence mode (AOF fsync policy).

**Q4. Can NoSQL replace SQL?** Model answer: no for most companies.
Polyglot persistence - SQL for money, invariants, and audit; NoSQL
for sessions, catalogs, events, and graphs shaped for scale. Stripe
and Amazon are the reference pattern.

**Q5. How do you pick between wide-column and document?** Model answer:
document when you fetch whole objects by ID and schema varies;
wide-column when you append high-volume time-ordered rows per entity
and query ranges within that entity. IoT and messaging lean wide-column;
CMS and catalog lean document.

**Q6. Graph database sharding?** Model answer: graphs are hard to
shard because edges cross partitions. Neo4j scales vertically and
with causal cluster; very large graphs use specialized partitioning
(vertex cuts) or stay in custom sharded SQL (Meta TAO) until size
forces graph-native engines.

## 16. Follow-up / Curveball Questions

**Curveball 1. Product wants SQL JOIN across Mongo and Cassandra on
the user-facing path.** Answer direction: federated join in application
code doubles latency and couples availability; warehouse CDC with
5-minute lag for analytics; OLTP path denormalizes one read model
document or uses materialized view per screen (see:
MOD-17/02-materialized-views-pre-computed-query-results).

**Curveball 2. Pick a store for Uber driver live locations updated
every 2 seconds.** Answer direction: not graph; not document. Redis
GEO or wide-column with geohash partition (see:
MOD-16/02-geohash-spatial-indexing-for-location-data); TTL on stale
locations; separate store from trip billing in Postgres.

**Curveball 3. Team proposes "one MongoDB cluster for everything"
to reduce ops.** Answer direction: session TTL memory pressure competes
with catalog indexes; different backup RPO/RTO; blast radius on one
cluster outage takes down entire product. Split by failure domain
and access pattern even if both are MongoDB clusters.

## 17. Cheat-Sheet Summary

- Document = whole JSON aggregate by ID; KV = opaque key lookup;
  wide-column = partition key + time range; graph = relationship hops.
- Pick by access pattern first, not vendor hype or resume-driven development.
- Partition key design is the wide-column make-or-break step.
- SQL still owns money, constraints, and analytics source of truth.
- Polyglot persistence with CDC to warehouse is the senior-engineer default.

## 18. Further Reading

- Martin Kleppmann, "Designing Data-Intensive Applications," Chapter 2
  (Data Models) - relational vs document vs graph comparison framework.
- Apache Cassandra documentation, "Data Modeling Introduction" -
  query-first modeling rules and partition key sizing.
- Redis documentation, "Data types intro" - when KV structures (HASH,
  ZSET, STREAM) replace custom server logic.
- Doordash engineering blog, "Cassandra" (various posts) - real
  wide-column ops at food-delivery scale.

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered in depth (~200 words, four storage-shape analogy)
2. What Is It - Covered in depth (plain-English plus formal four-family definition)
3. The Problem It Solves - Covered in depth (SQL-only pain before, polyglot after)
4. Core Concept Breakdown - Covered in depth (10 bulleted moving parts)
5. How It Works - Covered in depth (10 numbered production steps)
6. Diagram - Covered in depth (flowchart with CDC branch; image placeholder)
7. When to Use It - Covered in depth (4 families with 3-4 triggers each)
8. When NOT to Use It - Covered in depth (5 anti-patterns)
9. Real-World Example - Covered in depth (Netflix, Meta, Stripe, MongoDB, Discord + SaaS stack numbers)
10. Production-Grade Code - Covered in depth (3 repository implementations + why-not-what notes)
11. Trade-offs Table - Covered in depth (5 rows)
12. Comparison Table - Covered in depth (5 families across 6 dimensions)
13. Numbers & Benchmarks - Covered in depth (5 concrete figures)
14. Common Pitfalls - Covered in depth (4 incident-style mistakes)
15. Interview Q&A - Covered in depth (6 reasoning-based Q&As)
16. Follow-up / Curveball Questions - Covered in depth (3 senior follow-ups)
17. Cheat-Sheet Summary - Covered in depth (5 standalone lines)
18. Further Reading - Covered in depth (4 high-signal sources)

No section skipped. No em-dashes. No emojis. Cross-links to MOD-03/01, 02, 07, 08, 10, 11, 12 and MOD-15/03.
