## 1. Hook

Two friends run their kitchens differently. The first keeps every
ingredient in a jar with a label, in a precise row labelled by dish
- flour under "pancake", another bag of flour under "cookie"; if
you reach for "the pancake box" the relevant flour is exactly there
and the recipe in the box tells you the next step in plain steps.
Her kitchen is a relational database: a strict schema, labelled
jars, joined queries, and no jar stands alone. The second keeps a
big bag of mixed stuff: some is flour and some is rice with no
labels, but each handful has its own recipe taped to it; she cooks
fine but if you ask "exactly how much flour did you store in the
last week" she has to dig through every bag. Her kitchen is a
document store: schemaless blobs, each blob self-describing, no
fixed joins.

Neither kitchen is wrong; they have made opposite trade-offs. The
strict kitchen adds a new jar for every new field; the loose
kitchen shrugs and dumps the new field into the bag. The strict
kitchen answers "what's in stock by category" in one tidy pass; the
loose kitchen can absorb a brand-new field type without reorganising
the pantry. Relational and NoSQL databases are the two styles at
internet scale, and the choice between them is the choice between
the two kitchens; it is driven by the data's shape, the queries'
shape, and the system's growth trajectory, not by fashion.

## 2. What Is It

(a) Plain-English one-liner: SQL (relational) databases store data
in tables with a strict, predefined schema and answer set-based
queries through joins; NoSQL (non-relational) databases store data
as documents, key-value pairs, wide columns, or graphs, accept
flexible schemas, and answer queries that fit a single shape per
request.

(b) Formal definition: a SQL database organises data into
relations (tables) of tuples (rows) of typed attributes (columns),
enforces a schema-first contract and the relational algebra
(selection, projection, join), and typically provides ACID
transactions across the tables (see: MOD-03/03-acid-properties). A
NoSQL database organises data into one of four shapes - document
(MongoDB), key-value (Redis), wide-column (Cassandra), graph
(Neo4j) - typically relaxes the schema-first contract, typically
relaxes ACID to BASE (basically-available, soft-state, eventually-
consistent) at the cluster level, and scales horizontally using
partitioning at the storage-engine level (see:
MOD-15/06-strong-vs-eventual-consistency). The two choices are
best-read together with the storage-engine choice from
MOD-15/05-read-vs-write-optimized-storage.

## 3. The Problem It Solves

Before the choice was nameable, teams treated "the database" as
one shape and reached for the one they knew. The classic failure:
a team runs a multi-tenant SaaS on MySQL because they know it; the
schema works, queries work, transactions work for two years. New
tenants arrive with custom fields that the SQL schema cannot model
without an ALTER TABLE; the team adds metadata tables
(key-value-pattern), each query now joins six tables, and p99
grows to several seconds. The team keeps adding indexes and
denormalising (see: MOD-03/04-normalization-vs-denormalization);
eventually the schema is reverse-engineered into a document
shape on top of MySQL. The cost: a year of work to make SQL do
what a document store does for free.

After the choice is named, the team splits the data: core financial
state in Postgres (strict, transactional), tenant-customisable
records in MongoDB (schemaless, document-shaped, joined at the
application layer). The strict data is strongly consistent; the
loose data is eventually consistent and absorb custom fields
without an ALTER. The team writes a postmortem that mentions the
"polyglot persistence" pattern (Fowler, 2006) as the deliberate
design and uses two databases where one was forced before.

## 4. Core Concept Breakdown

- **Schema-on-write vs schema-on-read:** SQL enforces the schema
  before the row lands; NoSQL stores the row now, enforces via the
  application reading it (sometimes never). The trade is a year of
  schema changes vs a year of defensive null-checks.
- **Relational algebra (sql):** SQL's core operations are
  projection, selection, and join; complex queries are mathematically
  composable. The shape NoSQL refuses is the arbitrary join.
- **Joins cost:** relational joins are well-understood and indexed;
  NoSQL joins are application-side, multi-hop, and rarely scale
  beyond 2-hop without a custom resolver (Neo4j excepted - it is
  joined by definition).
- **Transactions:** SQL is typically ACID across multiple tables;
  NoSQL is typically BASE with per-shard atomicity and cross-shard
  transactions either absent or expensive. See MOD-03/13 for
  isolation-level depth.
- **Horizontal scale:** NoSQL was built bottom-up for sharding (the
  key is the partition); SQL's sharding is bolted on (citus, vitess,
  Aurora-sharding) and harder. See MOD-03/07-sharding-and-partitioning.
- **Document store:** stores a self-describing blob (JSON, BSON)
  per row; reads return the whole document; writes update one
  document by id; cross-document references are application-side.
- **Key-value store:** stores a value per opaque key; the store
  does not understand the value's interior; fastest read, smallest
  query expressiveness.
- **Wide-column store:** stores sparse tables (Cassandra);
  partitions by a row key, columns are dynamic and sparse per row -
  best for write-heavy, partially-structured events (see:
  MOD-03/10-nosql-internals-lsm-trees-sstables-compaction).
- **Graph store:** nodes and edges as first-class; queries are
  traversals (Cypher, Gremlin). Powerfully expressive for
  relationship data, the worst at row-by-row OLAP.
- **Storage engine:** underneath either choice sits a B+ tree
  (Postgres, MySQL) or an LSM tree (Cassandra, RocksDB) - this is
  an orthogonal choice (see: MOD-15/05-read-vs-write-optimized-storage).

## 5. How It Works

Step by step, choosing between SQL and NoSQL for a new service's
primary store:

1. **List the system's queries as concrete questions** in priority
   order. "List me a user's last 10 transactions" is relational-
   friendly with an index; "show me the documents matching
   arbitrary tenant custom fields" is document-friendly.
2. **List the system's data items** with their shape stability
   over the next 18 months. Data whose shape changes per tenant
   or per release leans document; data whose shape is set by a
   regulated schema (financial ledger) leans relational.
3. **Decide whether the system needs multi-row transactions** for
   its correctness invariant. If yes (a withdrawal touches both
   rows), relational is the natural fit; if no (a single event
   per write), NoSQL gains.
4. **Project the system's write/read ratio and write throughput at
   three-year horizon.** Above about 50k writes/sec on a single
   row-insert workload, the LSM-backed NoSQL family (Cassandra,
   ScyllaDB) keeps scaling where B+ tree-backed SQL saturates.
5. **Decide on the system's growth trajectory for sharding.** If
   sharding will be needed within 18 months, NoSQL's native
   partitioning beats SQL's bolted sharding in operational cost;
   if the system fits one box for the foreseeable horizon, SQL's
   operational tooling wins.
6. **Decide on the system's consistency requirement at the data
   level.** Strong financial invariants default to SQL; high-
   volume eventually-readable state defaults to NoSQL with
   session guarantees (see:
   MOD-15/06-strong-vs-eventual-consistency).
7. **Decide on the team's operational experience.** Both choices
   have nontrivial ops cost; a team fluent in Postgres replication
   does not get a free ticket to fluent Cassandra replication. The
   ops surface matters; pretending it doesn't has restarted many
   projects at month six.
8. **Opt for polyglot persistence when the data has both halves**
   (financial + document for one product) - two databases in one
   system, one per data type. The first instinct is to fight this
   ("one database for one product"), but the senior move is to
   split per data shape (see: MOD-04/02-cache-eviction-policies-
   lru-lfu-fifo for the cache-side equivalent).
9. **Run a small PoC on shortlisted candidates** measuring the
   actual queries that will hit them at projected scale. A PoC
   on real queries beats intuition months before commit.
10. **Write down the choice in a one-page decision doc** (data
    shapes, queries, transactions requirement, throughput target,
    ops experience, chosen engine per table family). The doc is
    why next year's engineer inherits the model and not a religious
    war.

## 6. Diagram

```mermaid
flowchart TD
    Q[Query profile] --> SHAPE{Data shape}
    SHAPE -->|stable schema, joins| REL[Relational / SQL]
    SHAPE -->|flexible schema, self-describing| DOC[Document store]
    SHAPE -->|sparse event per row| COL[Wide-column]
    SHAPE -->|relationship by edges| GRP[Graph]
    TX[Transaction need] --> REL
    NOSH[No multi-row tx] --> DOC
    NOSH --> COL
    SCALE[50k+ writes/sec] --> COL
    SCALE --> DOC
    STRONG[Strong consistency required] --> REL
    EV[Eventually consistent acceptable] --> DOC
    EV --> COL
    REL --> PVC[Postgres / MySQL / Spanner]
    DOC --> MONGO[MongoDB / Couchbase]
    COL --> CASS[Cassandra / ScyllaDB]
    GRP --> NEO[Neo4j / Dgraph]
```

<!-- IMAGE: side-by-side ER diagram for a simple order system in
relational (orders joined to users joined to products) vs document
(a single order document embedding the user snapshot and the product
snapshots, no joins) -->

## 7. When to Use It

Pick SQL when one or more hold:

- **Multi-row ACID transactions are needed for the correctness
  invariant:** order placement, transfers, ledger entries.
- **The schema is stable** over the 18-month horizon and the
  queries are mostly relational ("list X joined with Y where ...").
- **Reads will be range scans or joins** on a dataset that fits
  one shard or a small number of shards; the engines handle
  indexed scans efficiently (see: MOD-03/05-database-indexing-deep-dive).
- **Operational SQL tooling matters** and the team has SQL fluency
  already.

Pick NoSQL when one or more hold:

- **The data shape is document-shaped or sparse** and changes per
  tenant or per release; the strict schema would re-ALTER the
  tables constantly.
- **No multi-row ACID transaction is needed** for the correctness
  invariant.
- **Throughput must scale horizontally** beyond what one SQL box
  can sustain within 18 months.
- **The access pattern is by key,** not by join (lookup kv pairs,
  lookup documents by id, lookup event rows by partition key).

## 8. When NOT to Use It

- **Single-node data with a known read-heavy shape.** A flat
  table in Postgres with the right index beats Cassandra here in
  cost-per-query and ops cost; choosing NoSQL to fit "modern" is
  cargo-cult.
- **Document store for data that is queried as joins.** MongoDB
  is a poor SQL substitute; the team will rebuild lookups as
  virtual joins in application code and lose the relational
  expressiveness they needed.
- **Wide-column store for OLAP workloads.** Wide-column is for
  high write rate of sparse events; OLAP workloads want a
  columnar OLAP store (BigQuery, Snowflake, ClickHouse), which is
  a different family.
- **Graph store for tables you actually need relational.** A
  social-graph turned into Neo4j when three joins answer the same
  query fast in Postgres is paying the ops cost of a graph with
  no benefit.

## 9. Real-World Example

**Facebook's UDB** (user database), originally MySQL, has been
the canonical "polyglot + sharded" SQL story: relational for the
user row, eventually-consistent LSM (MyRocks) for the message
workload behind it; same team, multiple engines, by data shape.

**Instagram** runs Postgres clusters core, with Cassandra clusters
for high-volume ephemeral media metadata in some tiers. Polyglot
in production; data split by shape.

**Discord** moved "messages" from MongoDB to ScyllaDB (a
Cassandra-compatible LSM store) because MongoDB's working set
exceeded RAM and the read latency on the LSM ScyllaDB scaled
better at high write rate; the original choice was document,
the final choice was wide-column - a real NoSQL-vs-NoSQL
decision driven by the storage engine.

A realistic number: a typical mid-size e-commerce platform runs
Postgres with ~50 GB of relational state (orders, payments, users)
on one primary plus 2 read replicas, with p99 reads of 20 to 80
milliseconds; and Cassandra with ~3 TB of event-state (page
views, clicks) sustaining 30k writes per second on a 6-node
cluster with eventual consistency (see:
MOD-15/06-strong-vs-eventual-consistency). Both numbers are
normal; the engines make opposite trade-offs.

## 10. Production-Grade Code

```typescript
// A small repository chooser that mirrors the decision tree:
// relational for strict-schema transactional data; document for
// tenant-flexible records; key-value for caches. The lesson's
// shape: per-data-class choice, not a global "the database."

import type { Pool as PgPool } from "pg";
import type { Collection as MongoCollection } from "mongodb";
import type { RedisClientType } from "redis";

const PG_TABLE_USER = "users";
const PG_TABLE_ORDER = "orders";
const MONGO_COL_TENANT_DOC = "tenant_docs";
const REDIS_NS_CACHE = "cache";

export interface User {
  id: string;
  email: string;
  // the rest of the user row is a strict schema - new fields
  // require an ALTER; that's the price of having relational joins
  // work on this row
}

export interface Order {
  id: string;
  userId: string;
  amountCents: number;
  createdAt: number;
  // orders participate in transactions with users and payments;
  // relational is the natural fit for the financial chain
}

export class UserRepo {
  constructor(private readonly pg: PgPool) {}

  async insert(u: User): Promise<void> {
    // Parameter binding is correctness, not optional - the
    // relational schema enforces types, the application enforces
    // the binding's safety.
    await this.pg.query(
      `INSERT INTO ${PG_TABLE_USER} (id, email) VALUES ($1, $2)`,
      [u.id, u.email]
    );
  }

  async findById(id: string): Promise<User | null> {
    const r = await this.pg.query(
      `SELECT * FROM ${PG_TABLE_USER} WHERE id = $1`,
      [id]
    );
    return r.rows[0] ?? null;
  }

  async lastTenOrdersForUser(id: string): Promise<Order[]> {
    // A relational join: the engine knows how to fold the user
    // and order relations; in a document-only world this would
    // be either a duplicate-stamped order list on the user
    // document or a second query after the user is fetched.
    const r = await this.pg.query(
      `SELECT * FROM ${PG_TABLE_ORDER}
        WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 10`,
      [id]
    );
    return r.rows as Order[];
  }
}

export interface TenantDoc {
  tenantId: string;
  body: Record<string, unknown>;
  // the body's shape is per-tenant: there is no fixed schema; the
  // document store absorbs new fields without an ALTER and without
  // ever breaking other tenants' row shapes
}

export class TenantDocRepo {
  constructor(private readonly col: MongoCollection<TenantDoc>) {}

  async upsert(doc: TenantDoc): Promise<void> {
    // Document upsert by tenant; the body's interior is
    // opaque to the engine, indexed on the fields the application
    // does
    await this.col.updateOne(
      { tenantId: doc.tenantId },
      { $set: doc },
      { upsert: true }
    );
  }

  async find(tenantId: string): Promise<TenantDoc | null> {
    return await this.col.findOne({ tenantId });
  }
}

export class CacheRepo {
  constructor(private readonly redis: RedisClientType) {}

  async get(key: string): Promise<string | null> {
    // Key-value store: opaque value, no schema; the application
    // serialises and deserialises. This is the right home for
    // read-heavy transient data; here we are the cache side of
    // a polyglot persistence system, behind the SQL store.
    return await this.redis.get(`${REDIS_NS_CACHE}:${key}`);
  }

  async set(key: string, value: string, ttlSec: number): Promise<void> {
    await this.redis.set(`${REDIS_NS_CACHE}:${key}`, value, { EX: ttlSec });
  }
}
```

Why-not-what notes:
- `UserRepo` lives on Postgres because users and orders participate
  in transactions; the financial chain must be relational-ACID,
  not eventually consistent (see:
  MOD-15/06-strong-vs-eventual-consistency).
- `TenantDocRepo` lives on MongoDB because each tenant's body
  shape may differ; the document store absorbs the variance
  without ALTER cost and without fleeing consistency.
- `CacheRepo` lives on Redis because the cache is read-heavy on a
  short TTL; the value's interior is opaque to the engine.
- The three classes never reference each other through the
  engine's joins because those joins span boundaries (the user
  in Postgres has no native join to the tenant doc in MongoDB); the
  application does the fan-out when the read needs both halves.
- Parameter binding in SQL is non-negotiable because it is a
  correctness property (injection safety), not a performance one;
  the relational schema enforces types upstream of the application
  and the binding enforces safety downstream.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| SQL: rigid schema makes queries predictable and JOIN queries efficient under indexes | ALTER TABLE on a 1B-row table is an operational hit; new fields are expensive | Schema-change discipline: a forward-compat migration plan, double-write windows, and backfills every release |
| SQL: ACID transactions across tables for the strict invariants | Cross-shard transactions are pricey or impossible in most SQL systems; horizontal scaling is hard | Operational sharding tech (Vitess, Citus, Aurora) plus its own engineers |
| NoSQL document: flexible schema absorbs tenant-specific shapes; no ALTER cost per new field | Constraints are enforced in the application layer, so a bad write violates nothing at the engine | Defensive null checks at read time; integration tests are the contract layer |
| NoSQL wide-column (LSM-backed): write-heavy workloads scale horizontally with low write amplification | Range scans across the full key range are slower than B+ tree; cross-partition transactions typically absent | Compaction tuning, read amplification on miss; see MOD-03/10 |
| Polyglot persistence: each data class lives where it fits | Two databases to operate; read fan-out across the boundary at the application layer | A sync orchestration layer; eventual consistency between the stores and its reconciler |

## 12. Comparison Table

| Approach | Schema | Joins | Transactions | Scale model | Typical example |
|---|---|---|---|---|---|
| Relational / SQL | strict, schema-on-write | native, indexed | multi-row ACID | scale-up by default; horizontal via sharding tech | Postgres, MySQL, Spanner |
| Document store | flexible schema-on-read | application-side | per-document atomic; across documents rare | horizontal by partition key (see MOD-03/07) | MongoDB, Couchbase, DynamoDB |
| Key-value store | opaque, no schema at engine | none | per-key atomic | horizontal by hash of key | Redis, Riak KV, DynamoDB (single-item API) |
| Wide-column store | sparse schema-on-read, partition by row key | application-side | per-partition atomic | horizontal by partition key - native | Cassandra, ScyllaDB, HBase |
| Graph store | nodes + edges, schema optional | native, traversal queries | per-graph-path typically ACID | vertical within one box; only a few products shard | Neo4j, Dgraph |

The choice is driven by the query shape, the schema stability, the
multi-row transaction need, and the horizontal-scale horizon; each
column is a decision input.

## 13. Numbers & Benchmarks

- **Typical Postgres tps (random single-row inserts):** 5k to 15k
  per second on a single 4-vCPU instance with the right memory for
  the working set.
- **Typical Cassandra single-row insert throughput:** 80k to 150k
  per second per node on equivalent hardware for write-heavy
  workloads; the LSM geometry pays off here (see: MOD-03/10 for
  the mechanics).
- **Schema migration cost:** a 1B-row Postgres table adding a NOT
  NULL column with default is one to six hours of lock-bearing
  work; the same on MongoDB is zero (no schema to migrate).
- **Operational complexity proxy:** a Postgres primary + 2
  replicas is one engineer's on-call addition; a Cassandra 12-node
  ring with consistency tuning is roughly half an engineer's daily
  attention at first and then steady state, but with more incident
  surface (compaction, tombstones, ring rebalances).
- **Realistic mid-size e-commerce:** ~50 GB relational state on
  Postgres at p99 20-80 ms; ~3 TB event state on Cassandra at 30k
  writes/sec; both operate fine with a 6-person engineering team
  owning the platform.

## 14. Common Pitfalls

- **Using MongoDB as if it were MySQL.** Treating a document store
  as a relational substitute means the application writes lookups
  that would have been joins in SQL; the latency stacks up. The
  right move is to embed in the document anything you would join,
  or move that data to a SQL store.
- **Pretending "NoSQL = no schema."** NoSQL stores have schemas
  in the application; the contract is enforced at the read site
  instead of the write site. A team that pretends no schema means
  no contract ships a brittle system that breaks on the next
  producer's accidental shape change.
- **Cross-shard SQL transactions in a sharded SQL store.** Most
  sharded SQL systems cannot do true multi-shard ACID without
  expensive 2PC or saga coordination; the team that ships the
  SQL-with-sharding + transactions shapes a system that quietly
  drops the ACID guarantee at the shard boundary. The right move
  is to design the shard boundaries so transactions stay within
  a single shard (see: MOD-06/07-saga-pattern-distributed-transactions).

## 15. Interview Q&A

**Q1. Walk me through how you would choose SQL vs NoSQL for a new
service.** Model answer: list the queries, the data shapes, the
invariants; if the invariants need multi-row ACID transactions or
the queries are joins, SQL is the natural fit; if the data shape is
per-tenant flexible or the write rate exceeds what one SQL box can
sustain within the 18-month horizon, NoSQL's native partitioning
and relaxed schema win. Design the data classes per family; one
service can use both (polyglot persistence).

**Q2. Airbnb-like platform: SQL or NoSQL for listings?** Model
answer: listings are tenant-customisable per host (room type,
amenities, photos) which sounds document-shaped, but searches on
listings ("beds >= 2, wifi, $200/night") are relational queries.
The classic shape is Postgres for the strict part of the listing
(host_id, bedrooms, base price) plus a JSONB column or a
MongoDB-side document for the flexible amenities; both answers
have been shipped in production. See MOD-03/05 for indexing JSONB.

**Q3. When does ACID become an obstacle?** Model answer: when the
write throughput needs to scale horizontally beyond one SQL shard
within the planning horizon. Cross-shard ACID transactions are
expensive or unavailable; the team must relax to BASE or design the
shard boundaries so transactions stay within a shard. See
MOD-03/13-isolation-levels for the relaxation spectrum.

**Q4. What is the single most important factor: schema, joins,
consistency, or scale?** Model answer: the dominant factor is
the workload's query shape. If the queries are joins, SQL wins;
if the queries are lookup-by-key with flexible data, NoSQL wins;
the other factors (consistency, scale, schema) refine the choice
but do not overturn it. A team that picks by the scale axis alone
ends up running a NoSQL engine in a way that fights it.

**Q5. How does the storage engine fit in?** Model answer: the
storage engine is orthogonal to the SQL/NoSQL choice. Postgres is
SQL + B+ tree; Cassandra is NoSQL + LSM; MyRocks is SQL + LSM.
The SQL/NoSQL axis is about schema, joins, and consistency; the
storage engine axis is about read vs write optimisation - see
MOD-15/05-read-vs-write-optimized-storage.

**Q6. You are migrating a NoSQL workload to SQL; what is the
hardest part?** Model answer: imposing a strict schema on data
that has been written free-form for years. The migration is one
part code (define the schema) and three parts data remediation
(find the rows whose shape does not fit, normalise them,
quarantine the unfixable). Skipping the data remediation makes
the SQL migration look fine in dev and break in prod.

## 16. Follow-up / Curveball Questions

**Curveball 1. The business says "use Postgres for everything -
we are a Postgres shop." What is your response?** Answer
direction: most workloads fit, but two cases fight - very high
write rates over a single SQL shard, and very flexible tenant
schemas. For the first, partition the SQL table over Vitess/Citus
or keep a parallel LSM store; for the second, push flexible data
into a JSONB column and index it (see MOD-03/05). The boundary is
the query shape; "one database" does not remove the trade-off.

**Curveball 2. The team moved a MongoDB workload to Postgres for
ACID and now writes are slower than they were on MongoDB at the
same box size. Why?** Answer direction: the LSM in MongoDB's
storage engine has lower write amplification than InnoDB's B+
tree; the migration traded write throughput for transactional
guarantees. Either accept the cost (the right move if the
transaction is the invariant) or move to MyRocks-in-MySQL for SQL
semantics with LSM write-throughput (see MOD-15/05).

**Curveball 3. A graph store. When does it actually win over a
well-tuned SQL store with recursive CTEs?** Answer direction:
when traversals go many hops deep (friends-of-friends-of-friends
at 5+ hops), when the graph is heavily connected (relationship
density makes relational join cost blow up), and when queries
are expressed in a graph query language natively by the team. At
2-3 hops, recursive SQL CTEs are competitive; at 5+ with high
connectivity the graph store pulls ahead, and the team's query
expressiveness is far better in Cypher / Gremlin than in
recursive SQL.

## 17. Cheat-Sheet Summary

- SQL is schema-first, joins-native, ACID-typical, scale-up by
  default; NoSQL is schema-flexible, lookup-by-key, BASE-typical,
  scale-out by partition key.
- The query shape decides: joins -> SQL; lookup-by-key with
  flexible data -> NoSQL; OLAP workloads are a third family
  (columnar, see MOD-03/14).
- ACID transactions stay within a single SQL shard; cross-shard
  transactions are expensive or absent, see
  MOD-06/07-saga-pattern-distributed-transactions.
- Polyglot persistence - one service with multiple engines per
  data class - is a normal shape, not an architectural smell.
- The storage engine (B+ tree vs LSM) is orthogonal to the
  SQL/NoSQL choice; pick both axes deliberately.

## 18. Further Reading

- Martin Fowler, "Polyglot Persistence" (2011 essay) and the
  "NoSQL Distilled" book - the canonical framing of "different
  data classes in different engines"; the polar opposite of the
  "one database for everything" reflex.
- Eric Evans, "Dynamo: Amazon's Highly Available Key-Value Store"
  (paper, 2007) - the original design for the AP-style NoSQL
  family; the trade-off is named at the design step.
- PostgreSQL documentation on JSONB and indexing; the production
  shape of "flexible data inside a relational system" without
  going to a separate document store - a mature option for
  teams who want one engine but tenant-flexible data.

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered in depth (two kitchens analogy, no jargon, ~250 words)
2. What Is It - Covered in depth (plain-English + formal with relational algebra vs the four NoSQL shapes)
3. The Problem It Solves - Covered in depth (multi-tenant MySQL before vs polyglot split after with concrete schema-change cost)
4. Core Concept Breakdown - Covered in depth (10 bulleted moving parts, each concrete)
5. How It Works - Covered in depth (10 numbered story-style steps)
6. Diagram - Covered in depth (mermaid flowchart with query profile + transactions + scale + consistency branches to Postgres/Mongo/Cassandra/Neo4j; plus image placeholder for relational vs document comparison)
7. When to Use It - Covered in depth (4 SQL triggers and 4 NoSQL triggers)
8. When NOT to Use It - Covered in depth (4 anti-patterns)
9. Real-World Example - Covered in depth (Facebook UDB, Instagram Postgres+Cassandra, Discord Mongo->ScyllaDB, with concrete throughput numbers)
10. Production-Grade Code - Covered in depth (runnable TypeScript polyglot repositories for User/TenantDoc/Cache; comments explain WHY)
11. Trade-offs Table - Covered in depth (5-row Pros | Cons | What it costs you)
12. Comparison Table - Covered in depth (5 approaches compared across 5 dimensions)
13. Numbers & Benchmarks - Covered in depth (5 concrete numbers from Postgres insert throughput through schema-migration cost)
14. Common Pitfalls - Covered in depth (3 incident-note style mistakes)
15. Interview Q&A - Covered in depth (6 reasoning-based Q&As)
16. Follow-up / Curveball Questions - Covered in depth (3 senior-level follow-ups with answer directions)
17. Cheat-Sheet Summary - Covered in depth (5 standalone lines)
18. Further Reading - Covered in depth (3 high-signal sources)

No section skipped. No "and so on" / "similarly" / "etc." used as
a substitute. No em-dashes used. No emojis used. Word count well
above the 900-word floor.
