export const module03Lessons = [
  {
    id: 301,
    slug: "sql-vs-nosql",
    title: "SQL vs NoSQL — When to Use It",
    content: `
## 1. Quick Summary

**SQL databases** (relational) store structured data in tables with fixed schemas and enforce **ACID** transactions. **NoSQL databases** (non-relational) offer flexible schemas, horizontal scaling, and various data models. Choose **SQL** when data integrity, complex joins, and structured relationships matter. Choose **NoSQL** when you need massive scale, flexible schemas, or handle unstructured data. The decision hinges on your consistency, scalability, and query pattern requirements.

## 2. Definition

**SQL (Structured Query Language)** databases, also called **RDBMS**, store data in tables with predefined schemas and use SQL for querying. Examples: **PostgreSQL**, **MySQL**, **SQLite**. **NoSQL (Not Only SQL)** databases encompass document stores (MongoDB), key-value stores (Redis, DynamoDB), column-family stores (Cassandra, HBase), and graph databases (Neo4j).

## 3. Why It Exists / Problem It Solves

SQL databases struggle with horizontal scaling, schema rigidity, write throughput, and unstructured data. NoSQL solves these with eventual consistency, sharding, and schema-on-read flexibility, but sacrifices ACID guarantees and complex join capabilities.

## 4. When to Use It

Use **SQL** when: data has clear relationships, ACID compliance is needed, queries involve complex joins, schema is stable, strong consistency is required. Use **NoSQL** when: data is unstructured, horizontal scaling is needed, schema evolves frequently, low-latency key lookups are required, handling massive datasets with simple query patterns.

## 5. When NOT to Use It / Tradeoffs

**SQL**: Vertical scaling is expensive, schema migrations are risky, joins are expensive across shards. **NoSQL**: No joins (app must aggregate), eventual consistency (stale reads), limited query capabilities, limited transactions, less mature ecosystem.

## 6. How It Works (Deep Mechanics)

**SQL databases** use B+Tree storage engines. Queries are parsed into AST, optimized into execution plans, and executed via scan/join operators. ACID is enforced through WAL and MVCC. **NoSQL databases** use diverse engines: WiredTiger (MongoDB), LSM trees with SSTables (Cassandra), in-memory structures (Redis), SSD-backed partitions with consistent hashing (DynamoDB).

## 7. Architecture Diagram

\`\`\`
Database Decision Flow:
Structured + ACID + joins -> SQL (PostgreSQL, MySQL)
Key lookups -> Key-Value (Redis, DynamoDB)
Documents -> Document (MongoDB)
Wide columns / high writes -> Column (Cassandra)
Relationships -> Graph (Neo4j)
\`\`\`

## 8. Real-World Flow Example

E-commerce platform migration: Start with **PostgreSQL** for orders/inventory/customers. Move catalog to **Elasticsearch** for search. Move session data to **Redis** for sub-ms reads. Move activity logs to **Cassandra** for high-write throughput. Keep order transactions on PostgreSQL (need ACID). Result: **polyglot persistence**.

## 9. Reference Implementation Example

\`\`\`typescript
const dbDecision = (requirements: {
  needsACID: boolean;
  needsJoins: boolean;
  writeThroughput: number;
  schemaStability: string;
}) => {
  if (requirements.needsACID && requirements.needsJoins) return "PostgreSQL";
  if (requirements.writeThroughput > 100_000) return "Cassandra";
  if (requirements.schemaStability === "evolving") return "MongoDB";
  return "PostgreSQL";
};
\`\`\`

## 10. Real Company Use Cases

**Uber**: MySQL for trips, Cassandra for metrics, Redis for caching. **Netflix**: Cassandra for history, Elasticsearch for search, MySQL for billing. **Amazon**: DynamoDB for cart, RDS for orders. **Airbnb**: MySQL for listings, Elasticsearch for search, Redis for sessions.

## 11. Common Interview Questions

1. "Design the database for a real-time chat app."
2. "When to pick MongoDB over PostgreSQL?"
3. "Explain tradeoffs between consistency and availability."
4. "What is polyglot persistence?"
5. "How does DynamoDB achieve high availability?"

## 12. Related Topics & Next Steps

**NewSQL** (CockroachDB, Spanner): SQL with horizontal scaling. **Polyglot Persistence**. **CAP Theorem**. **Database Migration Strategies**.
`,
    estimatedMin: 12,
    difficulty: "Beginner" as const,
    companies: ["Uber","Netflix","Airbnb","Amazon"],
    tags: ["SQL","NoSQL","RDBMS","polyglot-persistence"]
  },
  {
    id: 302,
    slug: "relational-database-internals",
    title: "Relational Database Internals (B-Trees, Indexing)",
    content: `
## 1. Quick Summary

Relational databases use **B+Tree** data structures for efficient indexing and storage. B+Trees maintain sorted data with O(log n) operations. Pages (4-16 KB) form tree nodes. **Indexing** accelerates queries by reducing disk I/O. Understanding B+Tree internals is essential for performance tuning and query optimization.

## 2. Definition

A **B+Tree** is a self-balancing tree where all data resides in leaf nodes, internal nodes store only routing keys, and leaf nodes link sequentially for range scans. **Indexing** improves data retrieval at the cost of additional writes and storage.

## 3. Why It Exists / Problem It Solves

Without indexes, databases perform full table scans — reading every row. For 10M rows, this takes minutes. B+Trees solve slow lookups (O(log n)), enable efficient range queries, minimize disk I/O (3-4 tree levels for billions of rows), and support concurrent multi-user access via page-level locking.

## 4. When to Use It

B+Trees are the default for primary key indexes (clustered in InnoDB, non-clustered in PostgreSQL), secondary indexes on WHERE/JOIN/ORDER BY columns, composite indexes, unique constraints, and range queries.

## 5. When NOT to Use It / Tradeoffs

Write-heavy workloads (index overhead on every write), low-cardinality columns (poor selectivity), full-text search (use inverted indexes), spatial queries (use R-Trees), large binary data, too many indexes (write amplification).

## 6. How It Works (Deep Mechanics)

**Structure**: Root node (~100-200 keys/fanout), internal nodes (keys + child pointers), leaf nodes (key-value pairs + sibling pointers). **Search**: Start at root, binary search within node, traverse down (3-4 I/Os). **Insert**: Navigate to leaf, insert sorted, split if full, promote median key upward. **Page structure (InnoDB, 16KB)**: Page Header + Infimum/Supremum records + User Records (sorted) + Free Space + Page Directory.

## 7. Architecture Diagram

\`\`\`
                    Root [50,200]
                   /      |      \
          I1[10,30]  I2[70,150]  I3[250,..]
         /   |   \   /   |   \    /   |  \
    L1(1-10) L2(11-30) L3(31-50) L4(51-70) ...
    |-------|--------|----------|---------|--> (sibling pointers)
\`\`\`

## 8. Real-World Flow Example

E-commerce order lookup: \`SELECT * FROM orders WHERE user_id=12345 ORDER BY created_at DESC LIMIT 10\`. With composite index on (user_id, created_at): 3-4 I/Os vs 10M rows full scan. Sub-1ms query completion.

## 9. Reference Implementation Example

\`\`\`typescript
class BPlusTreeNode<K, V> {
  isLeaf: boolean;
  keys: K[] = [];
  values: V[] | null = null;
  children: BPlusTreeNode<K, V>[] | null = null;
  next: BPlusTreeNode<K, V> | null = null;
  constructor(isLeaf: boolean) { this.isLeaf = isLeaf; }
}
\`\`\`

## 10. Real Company Use Cases

**MySQL InnoDB**: Clustered B+Tree for PK. **PostgreSQL**: B+Tree with TID pointers to heap. **Oracle**: B-Tree with rowid. **SQL Server**: Clustered/non-clustered B+Trees. **Google Spanner**: Interleaved hierarchical B+Tree.

## 11. Common Interview Questions

1. "Clustered vs non-clustered index differences?"
2. "Why are B+Tree leaf nodes linked together?"
3. "What happens during a page split?"
4. "How does index cardinality affect performance?"
5. "What is an index-only scan (covering index)?"

## 12. Related Topics & Next Steps

**LSM Trees**: Write-optimized alternative. **Hash Indexes**: O(1) lookups. **GiST/GIN**: PostgreSQL special indexes. **BRIN Indexes**: For large ordered tables. **Buffer Pool Management**: LRU, clock sweep.
`,
    estimatedMin: 15,
    difficulty: "Advanced" as const,
    companies: ["MySQL","PostgreSQL","Oracle","Microsoft","Google"],
    tags: ["B+Tree","indexing","database-internals","storage-engine"]
  },
  {
    id: 303,
    slug: "acid-properties",
    title: "ACID Properties",
    content: `
## 1. Quick Summary

**ACID** — **Atomicity, Consistency, Isolation, Durability** — guarantees reliable database transactions. Atomicity ensures all-or-nothing execution. Consistency preserves database invariants. Isolation prevents concurrent transaction interference. Durability ensures committed data survives failures. Critical for financial systems, inventory, and data-integrity-critical applications.

## 2. Definition

**Atomicity**: Transaction is indivisible; partial failure rolls back entirely. **Consistency**: Transaction brings DB from one valid state to another, preserving all rules. **Isolation**: Concurrent transactions appear serialized. **Durability**: Committed changes persist after crashes, power loss, or restarts.

## 3. Why It Exists / Problem It Solves

Without ACID: lost updates (two users overwrite each other), dirty reads (reading uncommitted data), non-repeatable reads (same row different values), phantom reads (new rows appear), inconsistent state (crash during transfer). ACID ensures correctness, predictability, and trust.

## 4. When to Use It

Financial transactions (money transfers, payments, trading), inventory management (stock reservations, fulfillment), booking systems (flights, hotels, tickets), regulatory compliance (HIPAA, PCI-DSS, SOX).

## 5. When NOT to Use It / Tradeoffs

Performance overhead from locks and WAL, scalability limits of strong isolation, CAP theorem tradeoffs for distributed systems, analytics workloads (BASE preferred), cross-node latency for distributed ACID.

## 6. How It Works (Deep Mechanics)

**Atomicity via WAL**: Redo logs record new values, undo logs record old values for rollback. **Consistency**: Schema constraints (NOT NULL, UNIQUE, FK), triggers, application logic. **Isolation**: 2PL (pessimistic locking), OCC (validate at commit), MVCC (snapshot isolation — readers don't block writers). **Durability**: WAL flushed to disk before data pages (write-ahead rule), double-write buffer, synchronous replication.

## 7. Architecture Diagram

\`\`\`
BEGIN -> Execute Changes -> COMMIT
              |                |
         Write WAL         fsync WAL
         Write UNDO        Release locks
         Modify buffer     Flush dirty pages
\`\`\`

## 8. Real-World Flow Example

Bank transfer: BEGIN, debit Alice (WAL: old=500, new=400), credit Bob (WAL: old=200, new=300), COMMIT (fsync). If crash before commit: UNDO reverses both. If crash after commit: REDO replays from WAL. Alice has \$400, Bob has \$300 — consistent state always maintained.

## 9. Reference Implementation Example

\`\`\`typescript
class TransactionManager {
  async transfer(fromId: string, toId: string, amount: number) {
    const txId = this.beginTransaction();
    try {
      const fromBal = await this.readWithLock(fromId, "EXCLUSIVE", txId);
      if (fromBal < amount) throw new Error("Insufficient funds");
      await this.wal.write(txId, fromId, fromBal, fromBal - amount);
      await this.updateBalance(fromId, fromBal - amount, txId);
      const toBal = await this.readWithLock(toId, "EXCLUSIVE", txId);
      await this.wal.write(txId, toId, toBal, toBal + amount);
      await this.updateBalance(toId, toBal + amount, txId);
      await this.wal.flush(txId);
      await this.commit(txId);
    } catch (e) { await this.rollback(txId); throw e; }
  }
}
\`\`\`

## 10. Real Company Use Cases

**Stripe**: ACID across internal services. **Airbnb**: Atomic bookings across availability/pricing/payment. **Binance**: Strict ACID for order matching. **JPMorgan**: SERIALIZABLE for settlements. **Shopify**: ACID for inventory accuracy.

## 11. Common Interview Questions

1. "Explain ACID with a bank transfer example."
2. "How does MVCC improve concurrency?"
3. "Dirty read vs non-repeatable read vs phantom read?"
4. "How does fsync achieve durability?"
5. "Why can't distributed systems provide full ACID?"

## 12. Related Topics & Next Steps

**BASE Model**: Eventual consistency alternative. **CAP Theorem**. **Two-Phase Commit (2PC)**. **Saga Pattern**. **WAL Deep Dive**.
`,
    estimatedMin: 12,
    difficulty: "Intermediate" as const,
    companies: ["Stripe","Airbnb","Binance","JPMorgan","Shopify"],
    tags: ["ACID","transactions","WAL","concurrency-control"]
  },
  {
    id: 304,
    slug: "database-normalization-denormalization",
    title: "Database Normalization & Denormalization",
    content: `
## 1. Quick Summary

**Normalization** reduces redundancy and improves integrity by dividing tables into smaller related tables. **Denormalization** intentionally adds redundancy to improve read performance by reducing joins. Normalization optimizes writes; denormalization optimizes reads. Real systems use a hybrid: normalized for OLTP, denormalized for OLAP.

## 2. Definition

**Normalization** uses normal forms: **1NF** (atomic columns, no repeating groups), **2NF** (full functional dependency on PK), **3NF** (no transitive dependencies), **BCNF** (every determinant is a candidate key). **Denormalization** adds redundant columns or pre-joins tables to reduce query complexity.

## 3. Why It Exists / Problem It Solves

Without normalization: **update anomalies** (changing address in one row but not others), **insert anomalies** (can't add product without order), **delete anomalies** (deleting order removes customer info), data redundancy. Without denormalization: join overhead (slow dashboards), read amplification, OLAP inefficiency.

## 4. When to Use It

**Normalization (3NF/BCNF)**: OLTP workloads with frequent writes, data integrity critical, stable schema. **Denormalization**: Read-heavy workloads (analytics, dashboards), caching, star schemas in data warehouses, NoSQL embedded documents.

## 5. When NOT to Use It / Tradeoffs

**Normalization**: Slow reads from joins, complex queries, poor analytics. **Denormalization**: Write overhead, data inconsistency risk, more storage, application complexity, harder migrations.

## 6. How It Works (Deep Mechanics)

**Normalization process**: UNF (all data in one table) -> 1NF (atomic columns) -> 2NF (remove partial dependencies) -> 3NF (remove transitive dependencies). **Denormalization strategies**: Pre-joining, materialized views, NoSQL embedding (order items array in order document), redundant columns (customer_name in orders), computed columns (total_amount).

## 7. Architecture Diagram

\`\`\`
Normalized (3NF): Customers -> Orders -> OrderItems <- Products
Denormalized: Orders_Denormalized (order_id, customer_name, items[], total_amount)
\`\`\`

## 8. Real-World Flow Example

OLTP write: INSERT order + order_items in ACID transaction (data integrity). OLAP read without denormalization: 5-table join on millions of rows (slow). With denormalized fact table via nightly ETL: single table read, 100x faster.

## 9. Reference Implementation Example

\`\`\`typescript
class OrderService {
  async getOrderSummary(orderId: string) {
    // Denormalized read with aggregation
    const row = await this.db.queryOne(\`
      SELECT o.id, c.name, c.email,
             json_agg(json_build_object('name', p.name,
               'qty', oi.quantity, 'price', oi.unit_price)) AS items,
             SUM(oi.quantity * oi.unit_price) AS total
      FROM orders o JOIN customers c ON o.customer_id = c.id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.id = \$1 GROUP BY o.id, c.name, c.email
    \`, [orderId]);
    return row;
  }
}
\`\`\`

## 10. Real Company Use Cases

**Amazon**: Normalized RDS for orders, denormalized Redshift for analytics. **Uber**: Normalized MySQL for trips, denormalized Hive for BI. **Stripe**: Normalized PostgreSQL for ledger, materialized views for dashboards. **Airbnb**: Normalized MySQL for bookings, Druid for real-time analytics.

## 11. Common Interview Questions

1. "Three types of update anomalies?"
2. "When would you intentionally denormalize?"
3. "Tradeoffs between 3NF and star schema?"
4. "How does MongoDB embedding relate to denormalization?"
5. "What is a materialized view?"

## 12. Related Topics & Next Steps

**Star Schema vs Snowflake Schema**. **OLTP vs OLAP**. **ETL/ELT Pipelines**. **CQRS**. **Data Vault**.
`,
    estimatedMin: 14,
    difficulty: "Intermediate" as const,
    companies: ["Amazon","Uber","Netflix","Stripe","Airbnb"],
    tags: ["normalization","denormalization","database-design","OLTP","OLAP"]
  },
  {
    id: 305,
    slug: "database-indexing-deep-dive",
    title: "Database Indexing Deep Dive",
    content: `
## 1. Quick Summary

**Database indexing** provides fast lookup paths without scanning entire tables. Beyond **B+Tree**, databases support **hash indexes** (equality), **GiST** (geospatial), **GIN** (arrays/JSON), **BRIN** (correlated data), and **inverted indexes** (full-text). Choosing the right index type is critical. Indexes come with write overhead and storage costs — every index amplifies write latency.

## 2. Definition

An index is a data structure improving data retrieval speed at the cost of writes and storage. Types: **B+Tree** (general purpose), **Hash** (O(1) equality), **GiST** (extensible/custom types), **GIN** (composite/array/JSONB), **BRIN** (block range for correlated data), **Inverted** (full-text term-to-document mapping).

## 3. Why It Exists / Problem It Solves

Without indexes: sequential scans on 100M rows take minutes. Indexes solve slow lookups (O(log n)), avoid sorting (B+Tree returns sorted), speed up joins (index nested loop), enforce constraints (unique indexes), and enable index-only scans (covering indexes).

## 4. When to Use It

WHERE clause columns (high-selectivity), foreign keys (JOIN optimization), ORDER BY columns (no sort), GROUP BY columns, UNIQUE constraints, full-text columns (GIN), geospatial columns (GiST), JSONB frequent lookups (GIN).

## 5. When NOT to Use It / Tradeoffs

Low-cardinality columns (boolean, enum — not selective), small tables (table scan faster), write-heavy tables (each index ~0.5ms write penalty), large blobs, rarely-queried columns, OLAP workloads (columnar storage better).

## 6. How It Works (Deep Mechanics)

**Index scan**: Read root page (1 I/O) -> internal page (1 I/O) -> leaf page (1 I/O) -> binary search within leaf -> fetch heap page (1 I/O). **Composite index**: Leftmost prefix rule — index on (a, b, c) can search (a), (a, b), (a, b, c) but not (b) or (c) alone. **Covering index**: INCLUDE clause adds extra columns to avoid heap reads. **Partial index**: WHERE clause filters indexed subset. **Expression index**: Indexes computed column values.

## 7. Architecture Diagram

\`\`\`
Query -> Parser -> Optimizer -> Seq Scan (full read) or Index Scan (fast)
                                          |
                                B+Tree traversal (3-4 IO) + Heap fetch
Index Types:
B+Tree: range, sort, equality | Hash: equality only
GiST: GIS, range types | GIN: JSONB, arrays, full-text
BRIN: correlated data, large tables | Inverted: text search
\`\`\`

## 8. Real-World Flow Example

Social feed: \`SELECT p.* FROM posts p JOIN friendships f ON f.friend_id=p.user_id WHERE f.user_id=123 ORDER BY p.created_at DESC LIMIT 20\`. Optimal indexes: \`friendships(user_id, friend_id)\`, \`posts(user_id, created_at DESC)\`. Query plan: index scan friendships -> index scan posts (sorted) -> merge 20 results via priority queue. <5ms vs >5s without indexes.

## 9. Reference Implementation Example

\`\`\`typescript
class IndexAdvisor {
  recommendIndex(workload: { whereColumns: string[]; pattern: string; rangeColumns: string[] }[]) {
    const recs = [];
    for (const q of workload) {
      if (q.pattern === "equality")
        recs.push({ type: "btree", columns: q.whereColumns });
      else if (q.pattern === "range")
        recs.push({ type: "btree", columns: [...q.whereColumns, ...q.rangeColumns] });
    }
    return this.deduplicate(recs);
  }
}
\`\`\`

## 10. Real Company Use Cases

**Meta (Instagram)**: Custom composite MySQL indexes for feed queries. **Uber**: Micro-indexing with targeted B+Tree indexes. **Shopify**: Partial indexes (WHERE deleted_at IS NULL) saving 60% storage. **Notion**: GIN indexes on JSONB. **Stripe**: Expression indexes for LOWER(email) lookups.

## 11. Common Interview Questions

1. "Composite index leftmost prefix rule?"
2. "Clustered vs non-clustered index?"
3. "When to choose BRIN over B+Tree?"
4. "What enables an index-only scan?"
5. "How do partial indexes reduce storage? How to detect unused indexes?"

## 12. Related Topics & Next Steps

**EXPLAIN ANALYZE** for index usage tuning. **Index Maintenance**: REINDEX, VACUUM. **NoSQL Indexing**: MongoDB multikey, DynamoDB LSI/GSI. **Full-Text Search**: Lucene inverted index. **Bloom Filters** for pre-filtering.
`,
    estimatedMin: 15,
    difficulty: "Advanced" as const,
    companies: ["Meta","Uber","Shopify","Notion","Stripe"],
    tags: ["indexing","B+Tree","query-optimization","postgresql"]
  },
  {
    id: 306,
    slug: "database-replication",
    title: "Database Replication (Leader-Follower, Multi-Leader)",
    content: `
## 1. Quick Summary

**Database replication** copies data across servers for availability, fault tolerance, and read throughput. **Leader-Follower** designates one node for writes; followers replicate changes. **Multi-Leader** allows multiple nodes to accept writes for multi-datacenter deployments. Tradeoffs involve consistency, latency, and durability.

## 2. Definition

**Leader-Follower (Single-Primary)**: One node accepts writes; followers replicate (sync/async) and serve reads. **Multi-Leader (Active-Active)**: Multiple nodes accept writes; each replicates to others. **Leaderless**: Any node accepts writes with quorum-based consistency (Dynamo-style). Modes: synchronous, asynchronous, semi-synchronous.

## 3. Why It Exists / Problem It Solves

Without replication: single point of failure (crash = downtime), read bottleneck (one server), geographic latency, data loss risk, maintenance downtime. Replication provides redundancy, load distribution, geographic distribution, and high availability.

## 4. When to Use It

Read-heavy applications (offload reads to followers), HA requirements (automatic failover), disaster recovery (geo-redundancy), analytics/reporting on followers, geographic distribution (multi-leader), zero-downtime maintenance via follower promotion.

## 5. When NOT to Use It / Tradeoffs

Write-heavy workloads (leader is still bottleneck), strong consistency (async followers serve stale data), conflict resolution complexity (multi-leader), operational overhead (lag monitoring, failover management), cost, network dependency.

## 6. How It Works (Deep Mechanics)

**Statement-based**: Replicate SQL statements (non-deterministic functions can cause divergence). **WAL-based**: Stream Write-Ahead Log (byte-level exact copy). **Logical replication**: Stream row-level changes (PostgreSQL 10+, MySQL binlog). **GTID-based**: Global Transaction IDs for MySQL failover simplification.

Multi-leader conflict resolution: **LWW** (last-write-wins, data loss possible), **CRDTs** (mathematical merge), **application-level** (log + manual resolve), **custom merge functions**.

## 7. Architecture Diagram

\`\`\`
Leader-Follower: Leader (writes + WAL stream) -> Follower1 (read-only), Follower2, Follower3
Multi-Leader: US-Leader <-> EU-Leader <-> ASIA-Leader (bidirectional WAL replication)
Failover: Leader fails -> heartbeat timeout -> promote most up-to-date follower -> DNS update
\`\`\`

## 8. Real-World Flow Example

Global social platform: Tokyo user posts status -> Tokyo leader accepts write -> async replication to US/EU leaders. Tokyo friends see immediately; NYC friends see in ~100ms. On Tokyo leader failure: promote follower -> DNS update -> catch up on WAL -> ~15s total downtime.

## 9. Reference Implementation Example

\`\`\`typescript
class ReplicationManager {
  async write(key: string, value: unknown) {
    const lsn = await this.wal.append({ key, value, timestamp: Date.now() });
    if (this.config.mode !== "async") {
      const acks = this.nodes.map(n => n.replicate(lsn, { key, value }));
      await Promise.race([Promise.all(acks), this.timeout(5000)]);
    }
    return { success: true, lsn };
  }
}
\`\`\`

## 10. Real Company Use Cases

**GitHub**: MySQL Orchestra, semi-sync, 30s failover. **Meta**: Multi-leader MySQL across regions. **YouTube**: Vitess leader-follower per shard. **Apple**: Cassandra multi-leader for iCloud. **Slack**: PostgreSQL with Patroni auto-failover. **Cloudflare D1**: CRDT-based multi-leader.

## 11. Common Interview Questions

1. "Sync vs async replication tradeoffs?"
2. "How does PostgreSQL streaming replication work?"
3. "What is split-brain and how to prevent it?"
4. "Design multi-region replication strategy."
5. "Read-after-write consistency problem with async replication? How do CRDTs solve conflicts?"

## 12. Related Topics & Next Steps

**Sharding**: Complementary for write scaling. **Consensus Algorithms**: Raft, Paxos. **Change Data Capture (CDC)**: Debezium, Redpanda. **Active-Passive vs Active-Active**. **Backup and PITR**.
`,
    estimatedMin: 14,
    difficulty: "Advanced" as const,
    companies: ["GitHub","Meta","Google","Apple","Slack"],
    tags: ["replication","high-availability","failover","WAL","multi-leader"]
  },
  {
    id: 307,
    slug: "database-sharding-partitioning",
    title: "Database Sharding & Partitioning",
    content: `
## 1. Quick Summary

**Sharding** splits a database across servers by a **shard key**. Each shard holds a data subset independently. **Partitioning** divides a table within one database into smaller physical segments. Sharding enables **horizontal scaling** for writes; partitioning improves query performance and manageability. Both involve tradeoffs: cross-shard queries, rebalancing complexity, and shard key selection.

## 2. Definition

**Sharding** (horizontal partitioning) distributes rows across separate database instances via a shard key. **Partitioning** divides a table within one instance. Types: **range** (by value ranges), **list** (by discrete values), **hash** (by hash function), **composite** (combination).

## 3. Why It Exists / Problem It Solves

Single-server limits: storage (16TB max), CPU, write throughput (10K writes/s), connections. Sharding solves write scalability, storage scaling, geo-distribution, and fault isolation.

## 4. When to Use It

Data > 1TB or billions of rows, writes > 10K/s per node, geographic requirements (shards near users), multi-tenant SaaS (tenant per shard), time-series data (partition by time).

## 5. When NOT to Use It / Tradeoffs

Cross-shard queries (slow scatter-gather), global transactions (2PC complexity), rebalancing complexity, hotspot shards (poor shard key choice), operational overhead. Most apps never exceed single-server capacity.

## 6. How It Works (Deep Mechanics)

**Shard key approaches**: Hash-based (uniform distribution, no range queries across shards), Range-based (supports range queries, potential hotspots), Directory-based (lookup table, flexible but adds latency). **Query routing**: With shard key -> direct to shard. Without shard key -> scatter-gather. **Rebalancing**: Adding shards causes data migration. Consistent hashing minimizes movement to K/N fraction.

**Partition pruning**: Query planner examines partition bounds, only scans relevant partitions (e.g., time-range query scans only the month's partition).

## 7. Architecture Diagram

\`\`\`
App -> Shard Router -> Shard1 (Users 0-1M), Shard2 (1M-2M), Shard N
Within a shard: Partition by month [2024-01] [2024-02] [2024-03]...
\`\`\`

## 8. Real-World Flow Example

E-commerce: Shard by customer_id (hash, 64 shards). Customer queries include customer_id -> single shard (fast). Admin queries (revenue last 24h) -> scatter-gather across all shards (slow but acceptable). Hot shard (VIP customer with 100M orders) -> split into sub-shards. Rebalance 64->128: consistent hashing moves ~1/128 of data per shard.

## 9. Reference Implementation Example

\`\`\`typescript
class ShardManager {
  getShard(key: string): DatabaseNode {
    const hash = Math.abs([...key].reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0));
    return this.shards[hash % this.shards.length];
  }
  async query(sql: string, params: unknown[], shardKey?: string) {
    if (shardKey) return this.getShard(shardKey).query(sql, params);
    return (await Promise.all(this.shards.map(s => s.query(sql, params)))).flat();
  }
}
\`\`\`

## 10. Real Company Use Cases

**Pinterest**: MySQL + sharding by board/user_id. **Cloudflare D1**: SQLite sharding across edge nodes. **Discord**: Cassandra shards by channel_id. **Uber**: MySQL sharded by city_id. **Notion**: PostgreSQL + 256 hash shards by workspace_id.

## 11. Common Interview Questions

1. "How to choose a shard key for social media?"
2. "Horizontal vs vertical partitioning?"
3. "How does consistent hashing help rebalancing?"
4. "How to handle cross-shard transactions?"
5. "What is a hotspot shard and how to mitigate? How do Vitess and CockroachDB transparently shard?"

## 12. Related Topics & Next Steps

**Consistent Hashing**. **Vitess**: MySQL sharding middleware. **Citus**: PostgreSQL distributed tables. **CockroachDB**: Auto-sharding NewSQL. **DynamoDB Partitioning**.
`,
    estimatedMin: 15,
    difficulty: "Advanced" as const,
    companies: ["Pinterest","Cloudflare","Discord","Uber","Notion"],
    tags: ["sharding","horizontal-scaling","partitioning","distributed-database"]
  },
  {
    id: 308,
    slug: "consistent-hashing",
    title: "Consistent Hashing",
    content: `
## 1. Quick Summary

**Consistent hashing** minimizes data movement when nodes change. Keys and nodes map onto a **hash ring**; each key is assigned to the nearest node clockwise. When nodes are added/removed, only K/N keys remap (vs nearly all for modulo hashing). Fundamental to **DynamoDB, Cassandra, Discord, and CDN caching**.

## 2. Definition

Consistent hashing distributes data such that each node owns a ring segment. **Virtual nodes** (vnodes) map each physical node to multiple ring positions for better load distribution.

## 3. Why It Exists / Problem It Solves

Modulo hashing (hash(key) % N) remaps nearly ALL keys when N changes. For 1TB, adding one node moves ~800GB. Consistent hashing: only 1/N of keys move. Solves minimal data migration, scalability, load distribution, and decentralization.

## 4. When to Use It

Distributed caches (Memcached, CDNs), NoSQL databases (Cassandra, DynamoDB), load balancers (sticky sessions), distributed rate limiters, sharded databases, auto-scaling systems with frequent node changes.

## 5. When NOT to Use It / Tradeoffs

Uneven distribution without vnodes, O(log n) lookup overhead (vs O(1) modulo), hotspots from popular keys, no range query support, replication complexity (need preference lists), not for ACID transactions across nodes.

## 6. How It Works (Deep Mechanics)

**Ring construction**: Hash each node to positions on a circle (0 to 2^128-1). Hash each key to a point. Walk clockwise to find owning node. **Virtual nodes**: Each physical node maps to ~100-1000 ring positions — improves balancing (law of large numbers) and speeds recovery. **Replication**: Preference list includes N nodes clockwise from key. **Node addition**: Only keys between new node and its predecessor move.

## 7. Architecture Diagram

\`\`\`
Hash Ring: A@10, B@50, C@80
key@5 -> A (10), key@30 -> B (50), key@60 -> C (80), key@90 -> A (wrap)

With vnodes: A1@10, A2@45, A3@90 interleaved with B1@30, B2@70, B3@110 -> uniform distribution
\`\`\`

## 8. Real-World Flow Example

**DynamoDB**: Start with partition P1 on ring. Data grows to 20GB -> P1 splits into P1a (original node) and P1b (new node). Only keys between split point move. **Cassandra**: New node joins ring at position from Murmur3 hash. Streams SSTable ranges from neighbors. Zero-downtime cluster expansion.

## 9. Reference Implementation Example

\`\`\`typescript
class ConsistentHashRing {
  private ring: { hash: number; node: string }[] = [];
  getNode(key: string): string {
    const hash = this.hash(key);
    // Binary search for first node with hash >= key hash
    let lo = 0, hi = this.ring.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.ring[mid].hash < hash) lo = mid + 1; else hi = mid;
    }
    const entry = this.ring[lo].hash >= hash ? this.ring[lo] : this.ring[0];
    return entry.node;
  }
}
\`\`\`

## 10. Real Company Use Cases

**Amazon DynamoDB**: Vnodes, preference lists, gossip-based ring membership. **Apache Cassandra**: Murmur3Partitioner, 256 vnodes default. **Discord**: Cassandra with consistent hashing for 200+ nodes. **Cloudflare**: KV store and D1 edge database. **Akamai CDN**: Edge server mapping via consistent hashing.

## 11. Common Interview Questions

1. "How does consistent hashing differ from modulo sharding?"
2. "Why are virtual nodes important?"
3. "How does DynamoDB use consistent hashing for partition allocation?"
4. "What happens to keys when a node fails?"
5. "How to replicate data with consistent hashing (preference list)? How to handle hotspots?"

## 12. Related Topics & Next Steps

**Gossip Protocol**: Ring membership. **Rendezvous Hashing**: Alternative with better load distribution. **DynamoDB**: Merkle trees for anti-entropy. **Cassandra**: Vnodes, hinted handoff. **Jump Consistent Hashing**: O(log n) memory. **Weighted Consistent Hashing**.
`,
    estimatedMin: 14,
    difficulty: "Advanced" as const,
    companies: ["Amazon","Apache","Discord","Cloudflare","Akamai"],
    tags: ["consistent-hashing","distributed-systems","sharding","dynamo"]
  },
  {
    id: 309,
    slug: "nosql-database-types",
    title: "NoSQL Database Types (Document, Key-Value, Column, Graph)",
    content: `
## 1. Quick Summary

Four main NoSQL types: **Document stores** (MongoDB, Firestore) store JSON/BSON documents. **Key-value stores** (Redis, DynamoDB) lookup by key. **Column-family stores** (Cassandra, HBase) organize data in dynamic columns for wide-table analytics. **Graph databases** (Neo4j, ArangoDB) model relationships as nodes and edges. Each excels at specific workloads.

## 2. Definition

**Document**: Self-contained documents (BSON/JSON) in collections. Rich query language with secondary indexes. **Key-Value**: Simple GET/SET/DELETE by key. Value is opaque (string, JSON, binary). **Column-Family**: Rows with dynamic column families. Partition key + clustering columns for sorted access. **Graph**: Nodes (entities), edges (relationships), properties. Query with Cypher or Gremlin.

## 3. Why It Exists / Problem It Solves

**Document**: Schema flexibility for evolving fields. Nested data avoids expensive joins. **Key-Value**: O(1) performance at extreme scale. **Column-Family**: Massive write throughput, sparse data, columnar compression. **Graph**: Efficient relationship traversals (friends of friends, fraud patterns, shortest path).

## 4. When to Use It

**Document**: CMS, user profiles, product catalogs, real-time analytics, JSON-native APIs. **Key-Value**: Sessions, caching, shopping carts, leaderboards, rate limiting, distributed locks. **Column-Family**: Time-series, large-scale analytics, messaging, recommendations, fraud detection. **Graph**: Social networks, fraud detection, knowledge graphs, network/IT operations.

## 5. When NOT to Use It / Tradeoffs

**Document**: No joins, limited multi-document ACID, storage bloat. **Key-Value**: Only key lookups, no range queries without GSI, value size limits. **Column-Family**: No joins, eventual consistency default, limited secondary indexes. **Graph**: Not for simple CRUD/aggregation, harder horizontal scaling, requires specialized query language.

## 6. How It Works (Deep Mechanics)

**MongoDB**: WiredTiger storage engine, BSON model (max 16MB), replica sets, range/hash sharding, aggregation pipeline. **Redis**: In-memory, data structures (strings, hashes, lists, sorted sets, streams, bitmaps), 16384 hash slots, single-threaded event loop. **Cassandra**: LSM trees, CQL, partition key + clustering columns, Murmur3Partitioner, tunable consistency (ONE/QUORUM/ALL). **Neo4j**: Native graph storage with index-free adjacency (node-to-edge pointers), Cypher, full ACID per database.

## 7. Architecture Diagram

\`\`\`
Document: Collection: users [{_id:1, name:"A", addresses:[{city:"NYC"}]}]
Key-Value: session:abc123 -> {user_id:1, expires:3600}
Column-Family: Row key: user_1 {name:"Alice", age:30, city:"NYC"}
Graph: (Alice)-[:FRIENDS_WITH]->(Bob)-[:WORKS_AT]->(Acme Inc)
\`\`\`

## 8. Real-World Flow Example

Social media app: User profiles in MongoDB (flexible schema), sessions in Redis (sub-ms reads), feeds in Cassandra (time-ordered partition), friend recs in Neo4j (graph traversal). Load profile: Redis (1ms) + MongoDB (5ms) + Cassandra (3ms) + Neo4j (10ms) = ~20ms total.

## 9. Reference Implementation Example

\`\`\`typescript
function recommendNoSQL(options: {
  relationships: string; writeThroughput: string; dataModel: string
}) {
  if (options.relationships === "complex") return "Neo4j (Graph)";
  if (options.writeThroughput === "extreme") return "Redis (Key-Value)";
  if (options.dataModel === "time-series") return "Cassandra (Column-Family)";
  return "MongoDB (Document)";
}
\`\`\`

## 10. Real Company Use Cases

**MongoDB**: MetLife, eBay, Forbes, Coinbase. **Redis**: Twitter, GitHub, Pinterest, Snapchat. **Cassandra**: Netflix, Instagram, Apple, Discord. **Neo4j**: LinkedIn, eBay product recommendations, NASA data lineage, UBS fraud detection.

## 11. Common Interview Questions

1. "Compare the four NoSQL database types."
2. "When to choose column-family over document?"
3. "How do graph databases efficiently traverse relationships?"
4. "How does DynamoDB combine KV and document features?"
5. "What is polyglot persistence and when to use it?"

## 12. Related Topics & Next Steps

**NoSQL Internals**: LSM Trees, SSTables, Compaction. **CAP Theorem**. **Polyglot Persistence**. **DynamoDB vs Cassandra**. **NewSQL** (CockroachDB, Spanner).
`,
    estimatedMin: 14,
    difficulty: "Intermediate" as const,
    companies: ["MongoDB","Redis","Apache","Neo4j","Amazon"],
    tags: ["NoSQL","document-database","key-value","column-family","graph-database"]
  },
  {
    id: 310,
    slug: "nosql-internals-lsm-trees",
    title: "NoSQL Internals (LSM Trees, SSTables, Compaction)",
    content: `
## 1. Quick Summary

**LSM Trees** (Log-Structured Merge Trees) are write-optimized data structures used by **Cassandra, RocksDB, LevelDB, MongoDB (WiredTiger), and ScyllaDB**. Writes batch in memory (**Memtable**), flush as immutable **SSTables** to disk. Background **compaction** merges SSTables for read performance. LSM trees achieve 10-100x better write throughput than B+Trees but with read and write amplification.

## 2. Definition

**LSM Tree**: High-write-throughput structure converting random writes to sequential. Components: **Memtable** (in-memory sorted structure), **Immutable Memtable** (flush buffer), **SSTable** (sorted on-disk file with bloom filter + index), **WAL** (sequential durability log), **Compaction** (background merge process).

## 3. Why It Exists / Problem It Solves

B+Tree problems for writes: random I/O, write amplification, double-write overhead, lock contention. LSM advantages: sequential writes (WAL append + Memtable), high throughput (100K-1M writes/s), compression (sorted data compresses 2-5x with Snappy/Zstd), no in-place updates, bloom filters for fast negative key checks.

## 4. When to Use It

Write-heavy workloads: time-series data, IoT sensors, application logs, metrics. High insert throughput (millions of writes/sec). Key-value workloads with simple lookups. Compression-sensitive scenarios. Flash/SSD storage (sequential writes reduce write amplification).

## 5. When NOT to Use It / Tradeoffs

Read-heavy with point lookups (B+Trees: 1-2 I/Os vs LSM: multiple levels + bloom filters). Range scans require merging across levels. Update-heavy causes compaction overhead. Deletes require tombstones (compaction to reclaim). Compaction stalls (CPU/I/O spikes). Space amplification (2-3x actual data size).

## 6. How It Works (Deep Mechanics)

**Write path**: Append WAL (sequential disk) -> Update Memtable (O(log n) in-memory) -> Ack client. **Flush**: Memtable fills -> Immutable Memtable -> background flush writes SSTable (L0). **Compaction strategies**: Size-Tiered (merge similarly sized SSTables), Leveled (non-overlapping levels, 10x size increase per level, better reads), Time-Window (per-window compaction for time-series). **Read path**: Check Memtable -> Immutable -> Bloom filters (skip irrelevant SSTables) -> Index block -> Data block -> Binary search -> Merge from overlapping SSTables.

## 7. Architecture Diagram

\`\`\`
Write: WAL (append) -> Memtable (memory) -> Flush -> SSTable (L0 on disk)
Read: Memtable -> Immutable -> Bloom filter -> Index -> Data block -> Merge
Compaction: L0+L0 -> L1 merge (size-tiered); L1+L2 -> L3 merge (leveled)

SSTable on disk: [Bloom Filter][DataBlock0][DataBlock1]...[Index][Footer]
\`\`\`

## 8. Real-World Flow Example

IoT sensor ingestion (Cassandra, 100K sensors/sec): INSERT -> commit log -> Memtable -> ack in <1ms. Memtable fills at 64MB -> flush SSTable L0. Time-Window Compaction: hourly compaction within window, old SSTables dropped via TTL. Read: \`SELECT temp WHERE sensor_id='s1' AND ts='2024-03-15T10:00:05'\` -> check Memtable -> bloom filter (passes one SSTable) -> index -> data block -> result in ~5ms.

## 9. Reference Implementation Example

\`\`\`typescript
class LSMTree {
  private memtable = new Map<string, Buffer>();
  private sstables: SSTable[] = [];
  async write(key: string, value: Buffer) {
    await this.wal.append({ key, value, timestamp: Date.now() });
    this.memtable.set(key, value);
    if (this.memtable.size > 10000) await this.flush();
  }
  async read(key: string): Promise<Buffer | null> {
    if (this.memtable.has(key)) return this.memtable.get(key)!;
    for (const sst of this.sstables) {
      const v = await sst.read(key); if (v) return v;
    }
    return null;
  }
}
\`\`\`

## 10. Real Company Use Cases

**Cassandra**: Netflix (2M writes/sec viewing history), Discord (messages), Apple (iCloud 100K+ nodes), Uber (real-time metrics). **RocksDB (Meta)**: MySQL MyRocks storage, Kafka Streams state stores, Flink state. **LevelDB (Google)**: Chrome IndexedDB, Riak. **ScyllaDB**: Discord (10x Cassandra throughput), Expedia, Grab. **MongoDB WiredTiger**: LSM+B-Tree hybrid.

## 11. Common Interview Questions

1. "Explain the LSM Tree write path step by step."
2. "Compare LSM Trees vs B+Trees for writes vs reads."
3. "What is compaction and why is it necessary?"
4. "How do Bloom filters improve LSM read performance?"
5. "Size-tiered vs leveled compaction? What is write amplification in LSM?"
6. "How do deletes work in LSM (tombstones)?"

## 12. Related Topics & Next Steps

**B+Tree**: Read-optimized counterpart. **Bloom Filters**: Probabilistic data structure. **ACID in NoSQL**. **ScyllaDB**: CPU-efficient LSM design. **Compaction Strategies**: STCS, LCS, TWCS in Cassandra.
`,
    estimatedMin: 16,
    difficulty: "Advanced" as const,
    companies: ["Netflix","Discord","Apple","Meta","Google","ScyllaDB"],
    tags: ["LSM-tree","SSTable","compaction","write-optimized","rocksdb"]
  },
  {
    id: 311,
    slug: "cap-theorem",
    title: "CAP Theorem",
    content: `
## 1. Quick Summary

The **CAP theorem** states a distributed data store can only provide **two of three** guarantees: **Consistency** (every read gets latest write), **Availability** (every request gets a response), **Partition tolerance** (system works despite network failures). Partitions are unavoidable, so choose **CP** (Consistency + Partition tolerance) or **AP** (Availability + Partition tolerance). Fundamental constraint in distributed system design.

## 2. Definition

**Consistency**: All nodes see the same data simultaneously. **Availability**: Every request to a non-failing node receives a response. **Partition tolerance**: System continues operating despite network message loss. During partitions: CP returns errors/timeouts (preserves consistency); AP returns potentially stale data (preserves availability).

## 3. Why It Exists / Problem It Solves

Without CAP awareness: building globally distributed databases with strong consistency AND 100% uptime seems possible. Network partitions are inevitable (cables cut, DNS fails). During a partition, you cannot atomically update all nodes -> must reject writes (CP) or accept divergence (AP). CAP provides framework for reasoning about distributed system tradeoffs.

## 4. When to Use It

**CP systems**: Financial systems (account balances), distributed locks (etcd, ZooKeeper), metadata services (Kubernetes API server), inventory management (overselling prevention). **AP systems**: Content delivery (social feeds), session stores, analytics dashboards, shopping carts (eventual consistency acceptable until checkout).

## 5. When NOT to Use It / Tradeoffs

**CP tradeoffs**: Downtime during partitions, higher latency (sync replication), scalability limits (Raft/Paxos coordination). **AP tradeoffs**: Stale reads, conflict resolution complexity (LWW, CRDTs), eventual consistency window. Key insight: during normal operation (no partition), both C and A are possible — tradeoff only matters during partitions.

## 6. How It Works (Deep Mechanics)

**Formal proof**: Two nodes G1, G2 with partition. Write "X=1" to G1. Read from G2: must return stale (violate C) or error (violate A). **CP databases during partition**: HBase (region server unavailable), etcd (leader election stops writes), Redis cluster (minority shard unavailable). **AP databases during partition**: DynamoDB (each region accepts writes independently), Cassandra (hinted handoff + read repair). **PACELC extension**: adds latency vs consistency tradeoff during normal (non-partition) operation.

## 7. Architecture Diagram

\`\`\`
CAP Triangle: Consistency - Availability - Partition Tolerance
CP: etcd, ZooKeeper, HBase, Spanner, Redis (cluster mode)
AP: Cassandra, DynamoDB, Riak, CouchDB, ScyllaDB

Normal operation: C + A possible (all nodes communicate)
During partition: CP (sacrifice A) or AP (sacrifice C)
\`\`\`

## 8. Real-World Flow Example

E-commerce with DynamoDB (AP): US-EU partition -> both accept writes. After partition heals, LWW resolves conflict. US user's cart update lost if EU had later timestamp. Mitigation: merge cart items by ID. With Spanner (CP): during partition, writes succeed only if quorum available -> service unavailable but no data inconsistency.

## 9. Reference Implementation Example

\`\`\`typescript
class CAPAnalyzer {
  recommend(options: { canLoseWrites: boolean; canServeStale: boolean }) {
    if (!options.canLoseWrites && !options.canServeStale)
      return "CP (etcd/Spanner)";
    return options.canServeStale ? "AP (Cassandra/DynamoDB)" : "CP";
  }
}
\`\`\`

## 10. Real Company Use Cases

**DynamoDB (AP)** : Amazon shopping cart. **Cassandra (AP)**: Netflix viewing history. **etcd (CP)**: Kubernetes cluster state. **Spanner (CP)**: Google Ads. **MongoDB (configurable)**: CP with w:majority, AP with w:1. **Redis Cluster (CP)**: Leader-follower per shard; partition makes minority shard unavailable.

## 11. Common Interview Questions

1. "Explain CAP theorem with a real-world example."
2. "Why is CA (Consistency + Availability without Partition Tolerance) not practical?"
3. "How does DynamoDB handle network partitions?"
4. "CP vs AP databases — give examples of each."
5. "How does Google Spanner achieve strong consistency while remaining highly available? What is the PACELC theorem?"

## 12. Related Topics & Next Steps

**PACELC Theorem**: CAP extension adding latency vs consistency for normal operation. **Paxos and Raft**: CP consensus algorithms. **Eventual Consistency**: AP model. **CRDTs**: Resolving AP conflicts mathematically. **Consistency Models**: Linearizability to Eventual. **FLP impossibility**.
`,
    estimatedMin: 12,
    difficulty: "Advanced" as const,
    companies: ["Amazon","Netflix","Google","MongoDB","Redis"],
    tags: ["CAP-theorem","distributed-systems","consistency","availability"]
  },
  {
    id: 312,
    slug: "pacelc-theorem",
    title: "PACELC Theorem",
    content: `
## 1. Quick Summary

The **PACELC theorem** extends CAP: **If Partition (P), choose between Availability (A) and Consistency (C); Else (E), choose between Latency (L) and Consistency (C)**. This captures the real-world tradeoff where systems optimize for low latency (AP systems) or strong consistency (CP systems) even when all nodes are connected. Most practical systems make this EL/EC choice.

## 2. Definition

PACELC = **P**artition -> **A**vailability vs **C**onsistency; **E**lse -> **L**atency vs **C**onsistency. During normal operation: prioritizing low latency means relaxing consistency (async replication, no coordination); prioritizing consistency means accepting higher latency (sync replication, consensus protocols).

## 3. Why It Exists / Problem It Solves

CAP only addresses partition scenarios. In practice, most of the time there is NO partition, yet systems still face tradeoffs. PACELC explains why DynamoDB keeps async replication (low latency, PA/EL) in normal operation, while Spanner uses synchronous Paxos (strong consistency, PC/EC, higher latency). It provides a more complete framework for database selection.

## 4. When to Use It

**PC/EL** (DynamoDB, Cassandra): Partition -> sacrifice consistency; Else -> low latency. **PA/EL** (MongoDB with w:1): Partition -> availability; Else -> low latency. **PC/EC** (Spanner, etcd, CockroachDB): Always consistent, higher latency. **PA/EC**: Hard to achieve — few systems provide both availability during partitions and consistency normally.

## 5. When NOT to Use It / Tradeoffs

**PC/EL**: Inconsistent reads during partitions and possibly during normal (async lag). **PA/EL**: Availability during partitions but potential inconsistency. **PC/EC**: Highest latency due to sync coordination across nodes. No free lunch — each category sacrifices one property.

## 6. How It Works (Deep Mechanics)

**Normal operation analysis**: DynamoDB replicates writes asynchronously across regions -> ~100ms latency, possibly stale reads. Spanner uses TrueTime + Paxos -> ~50-100ms write latency, strong consistency. Cassandra: tunable consistency — ONE (low latency, possible stale), QUORUM (balanced), ALL (strong, high latency). The E(L vs C) choice is often configurable.

## 7. Architecture Diagram

\`\`\`
Database        | Partition | Normal (Else)
                | C | A     | C | L
DynamoDB (PA/EL)|   | ✓     |   | ✓
Cassandra       |   | ✓     | ✓ | ✓ (tunable)
Spanner (PC/EC) | ✓ |       | ✓ |
etcd (PC/EC)    | ✓ |       | ✓ |
MongoDB         | ✓/AP | ✓/CP | ✓ | ✓ (configurable)
\`\`\`

## 8. Real-World Flow Example

**DynamoDB global tables** (PA/EL): Normal -> async cross-region replication (~1s lag, low latency for local writes). Partition -> each region accepts writes independently (availability). **Spanner** (PC/EC): Normal -> TrueTime + Paxos across regions (~50-100ms write latency, strong consistency). Partition -> Paxos quorum lost, writes fail.

## 9. Reference Implementation Example

\`\`\`typescript
type PACELC = "PC/EC" | "PC/EL" | "PA/EC" | "PA/EL";
function categorize(config: {
  partitionBehavior: "sacrifice-C" | "sacrifice-A";
  normalBehavior: "sacrifice-C" | "sacrifice-L";
}): PACELC {
  const p = config.partitionBehavior === "sacrifice-C" ? "PA" : "PC";
  const e = config.normalBehavior === "sacrifice-C" ? "EL" : "EC";
  return \`\${p}/\${e}\` as PACELC;
}
// DynamoDB -> categorize({partition:"sacrifice-C", normal:"sacrifice-C"}) = "PA/EL"
// Spanner -> categorize({partition:"sacrifice-A", normal:"sacrifice-L"}) = "PC/EC"
\`\`\`

## 10. Real Company Use Cases

**DynamoDB (PA/EL)**: Amazon shopping cart. **Cassandra (PA/EL)**: Netflix viewing history, Apple iCloud. **Spanner (PC/EC)**: Google Ads, YouTube. **etcd (PC/EC)**: Kubernetes cluster state. **MongoDB (configurable)**: Coinbase with w:majority. **CockroachDB (PC/EC)**: Multi-region deployments.

## 11. Common Interview Questions

1. "How does PACELC extend CAP theorem?"
2. "Explain PA/EL vs PC/EC with real databases."
3. "Where does DynamoDB fit in PACELC? Spanner?"
4. "What does the 'E' in PACELC represent?"
5. "How does Cassandra's tunable consistency map to PACELC?"

## 12. Related Topics & Next Steps

**CAP Theorem**: Foundation for PACELC. **Consistency Models**: Linearizability, Causal, Eventual. **CRDTs**: Working within PA/EL constraints. **TrueTime**: Global clock enabling Spanner's PC/EC. **Consensus Protocols**: Raft, Paxos for PC/EC.
`,
    estimatedMin: 10,
    difficulty: "Advanced" as const,
    companies: ["Amazon","Google","Netflix","MongoDB","CockroachDB"],
    tags: ["PACELC","CAP-theorem","distributed-systems","consistency"]
  },
  {
    id: 313,
    slug: "database-transactions-isolation-levels",
    title: "Database Transactions & Isolation Levels",
    content: `
## 1. Quick Summary

**Isolation levels** control transaction concurrency. SQL standard defines four: **READ UNCOMMITTED** (dirty reads allowed), **READ COMMITTED** (no dirty reads), **REPEATABLE READ** (no non-repeatable reads), **SERIALIZABLE** (fully isolated, phantom-read-free). Each level trades performance for correctness. Understanding isolation is critical for building correct concurrent applications.

## 2. Definition

**Transaction**: Unit of work with ACID properties. **Isolation level**: Degree of visibility a transaction has into other concurrent transactions' data. **Phenomena**: Dirty read (read uncommitted data), Non-repeatable read (same row changes between reads), Phantom read (new rows appear in re-executed query), Lost update (concurrent writes overwrite), Write skew (concurrent writes based on stale reads).

## 3. Why It Exists / Problem It Solves

Without isolation: concurrent transactions produce inconsistent results. Lower isolation improves performance (fewer locks, more concurrency) but risks anomalies. Higher isolation prevents anomalies but reduces throughput. Correct isolation selection balances throughput with data integrity.

## 4. When to Use It

**READ COMMITTED**: Default for PostgreSQL, Oracle, SQL Server. General workloads where dirty reads are unacceptable. **REPEATABLE READ**: Financial reporting, audit queries. **SERIALIZABLE**: Financial transactions, inventory systems, any scenario where any anomaly is unacceptable. **READ UNCOMMITTED**: Rarely used; perhaps for approximate analytics where dirty reads are tolerable.

## 5. When NOT to Use It / Tradeoffs

**READ UNCOMMITTED**: Dirty reads can corrupt business logic. **SERIALIZABLE**: Highest lock contention, lowest throughput, deadlock-prone. **REPEATABLE READ**: Phantom reads possible in some implementations (PostgreSQL prevents them via MVCC). Performance cost increases with isolation level.

## 6. How It Works (Deep Mechanics)

**Implementation mechanisms**: **Pessimistic locking (2PL)**: Read locks block writes; write locks block all. SERIALIZABLE holds all locks until commit. **MVCC**: Each transaction sees a snapshot — readers never block writers. PostgreSQL/Snapshot Isolation uses row versioning with transaction IDs. **SSI (Serializable Snapshot Isolation)**: PostgreSQL SERIALIZABLE detects read-write conflicts via dependency graphs. **Lost update prevention**: SELECT FOR UPDATE (pessimistic), version column (optimistic), or SERIALIZABLE isolation.

## 7. Architecture Diagram

\`\`\`
Isolation Level  | Dirty R | Non-Repeat| Phantom | Lost Update
READ UNCOMMITTED | Possible| Possible  | Possible| Possible
READ COMMITTED   | Prevent | Possible  | Possible| Possible
REPEATABLE READ  | Prevent | Prevent   | Possible| Prevented*
SERIALIZABLE     | Prevent | Prevent   | Prevent | Prevented
*PostgreSQL REPEATABLE READ prevents lost updates via MVCC
\`\`\`

## 8. Real-World Flow Example

**Flight booking double-booking problem**: T1 checks seat 14A (available), T2 simultaneously checks (available). Both book -> double booking! With READ COMMITTED: both see seat available concurrently. With REPEATABLE READ + SELECT FOR UPDATE: T1 locks row, T2 waits -> single booking. With SERIALIZABLE: T2's transaction aborts on conflict -> app retries.

## 9. Reference Implementation Example

\`\`\`typescript
type Isolation = "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";
function getLockBehavior(isolation: Isolation) {
  switch (isolation) {
    case "READ UNCOMMITTED":
      return { readLocks: false, writeLocks: true, rangeLocks: false, mvcc: false };
    case "READ COMMITTED":
      return { readLocks: false, writeLocks: true, rangeLocks: false, mvcc: true };
    case "REPEATABLE READ":
      return { readLocks: true, writeLocks: true, rangeLocks: false, mvcc: true };
    case "SERIALIZABLE":
      return { readLocks: true, writeLocks: true, rangeLocks: true, mvcc: true };
  }
}
\`\`\`

## 10. Real Company Use Cases

**PostgreSQL**: Default READ COMMITTED; SERIALIZABLE for financial systems at Stripe. **MySQL/InnoDB**: Default REPEATABLE READ; used by Meta, GitHub, Uber. **Oracle**: Default READ COMMITTED with snapshot isolation. **SQL Server**: READ COMMITTED SNAPSHOT for MVCC without blocking. **CockroachDB**: SERIALIZABLE by default (SSI-based).

## 11. Common Interview Questions

1. "Explain the four isolation levels and phenomena they prevent."
2. "How does MVCC implement REPEATABLE READ without blocking readers?"
3. "What is a lost update and how to prevent it?"
4. "How does PostgreSQL's SSI provide true SERIALIZABLE isolation?"
5. "Why would you choose READ COMMITTED over SERIALIZABLE? Explain write skew."

## 12. Related Topics & Next Steps

**ACID**: Foundation. **MVCC Internals**: PostgreSQL, InnoDB. **2PL vs OCC**: Locking vs optimistic. **Snapshot Isolation**. **Distributed Transactions**: 2PC, Sagas, XA.
`,
    estimatedMin: 13,
    difficulty: "Advanced" as const,
    companies: ["PostgreSQL","MySQL","Oracle","Microsoft","CockroachDB"],
    tags: ["transactions","isolation-levels","MVCC","concurrency-control"]
  },
  {
    id: 314,
    slug: "time-series-databases",
    title: "Time Series Databases",
    content: `
## 1. Quick Summary

**Time Series Databases (TSDBs)** are optimized for time-indexed data — sensor readings, metrics, logs, financial ticks. They excel at high write throughput, efficient time-range scans, and downsampling/aggregation. Examples: **InfluxDB, TimescaleDB, Prometheus, Amazon Timestream, QuestDB**. Key features: automatic time-partitioning, retention policies, continuous queries, and compression (delta-of-delta, XOR).

## 2. Definition

**Time series data**: Sequence of data points indexed by timestamp. Each point has a timestamp, values (fields), and metadata (tags). **TSDB**: Database optimized for ingesting, storing, and querying time-stamped data with high write throughput and time-window-based analysis.

## 3. Why It Exists / Problem It Solves

Relational and general NoSQL databases struggle with time-series: massive write volume (millions of points/sec), append-only patterns, time-range queries, data lifecycle management. TSDBs provide: 10-100x higher write throughput, automatic time-based partitioning, columnar compression (5-20x), built-in retention and downsampling.

## 4. When to Use It

**IoT/sensor data**: Temperature, GPS, device status. **Application monitoring**: CPU, memory, request latency, errors. **Infrastructure monitoring**: Server metrics, network flow, disk usage. **Financial data**: Stock ticks, exchange rates, trading volumes. **Log analytics**: System logs, access logs, audit trails.

## 5. When NOT to Use It / Tradeoffs

Not for transactional data (orders, accounts), not for complex joins across entities, not for frequent updates/deletes (append-only is best), not for small datasets (TSDB overhead), specialized query languages (InfluxQL, PromQL).

## 6. How It Works (Deep Mechanics)

**Storage**: Column-oriented layout (tags + time + fields). **Compression**: Timestamps — delta-of-delta encoding. Values — XOR compression (floats), integer encoding, run-length. **Partitioning**: Time-based shards (hourly/daily) + hash within time window. **Downsampling**: Continuous queries roll up raw data to lower resolution (1s -> 1m -> 1h). **Retention**: Automatic data expiration. **Write path**: Append-only WAL + in-memory buffer -> sorted columnar segments -> compaction.

**Prometheus TSDB**: 2-hour blocks of compressed samples. WAL for crash recovery. Memory-mapped blocks. Downsampling via recording rules.

## 7. Architecture Diagram

\`\`\`
Write Path: Sensor -> WAL (append) -> Memtable -> Flush -> Segments (columnar) -> Compaction -> Daily Blocks
Read Path: Query (time range) -> Block index -> Decompress blocks -> Apply downsampling -> Return
\`\`\`

## 8. Real-World Flow Example

**Monitoring with Prometheus**: 1000 servers, 500 metrics each, 15s scrape interval = 33K writes/sec. TSDB stores as compressed 2-hour blocks. Query "CPU avg last 1h" scans one block, applies downsampling, returns in <100ms. Retention: 15 days raw, 30 days downsampled. Disk: ~1.5GB/day.

## 9. Reference Implementation Example

\`\`\`typescript
interface Point { timestamp: number; fields: Record<string, number>; tags: Record<string, string> }
class TimeSeriesDB {
  async queryRange(metric: string, start: number, end: number, agg: string) {
    const blocks = this.blocks.filter(b => b.start <= end && b.end >= start);
    const points = (await Promise.all(blocks.map(b => b.query(metric, start, end)))).flat();
    if (agg === "avg") {
      const bucketed = new Map<number, number[]>();
      points.forEach(p => {
        const bucket = Math.floor(p.timestamp / 60000) * 60000;
        if (!bucketed.has(bucket)) bucketed.set(bucket, []);
        bucketed.get(bucket)!.push(Object.values(p.fields)[0]);
      });
      return [...bucketed].map(([ts, vals]) => ({ timestamp: ts, fields: { avg: vals.reduce((a,b)=>a+b,0)/vals.length }, tags: {} }));
    }
    return points;
  }
}
\`\`\`

## 10. Real Company Use Cases

**Prometheus**: Kubernetes monitoring (CNCF graduated). **InfluxDB**: IoT at Siemens, Bosch. **TimescaleDB**: Bloomberg trade analytics, GE manufacturing. **Amazon Timestream**: AWS IoT Core. **QuestDB**: Real-time trading at Hedge Funds. **VictoriaMetrics**: Wix, Adidas.

## 11. Common Interview Questions

1. "Design a time-series database for IoT sensor data."
2. "What compression techniques do TSDBs use?"
3. "How does Prometheus TSDB store and query metrics?"
4. "What is downsampling and why is it important?"
5. "How do retention policies work? Compare InfluxDB vs TimescaleDB."

## 12. Related Topics & Next Steps

**LSM Trees**: Foundation for TSDB storage engines. **Columnar Storage**: Parquet, Arrow. **Monitoring Stack**: Prometheus, Grafana. **Stream Processing**: Kafka, Flink for real-time TS. **Downsampling Strategies**: Min, max, avg, percentile.
`,
    estimatedMin: 12,
    difficulty: "Intermediate" as const,
    companies: ["Prometheus","InfluxDB","TimescaleDB","Amazon","QuestDB"],
    tags: ["time-series","TSDB","Prometheus","metrics","IoT"]
  },
  {
    id: 315,
    slug: "vector-databases",
    title: "Vector Databases",
    content: `
## 1. Quick Summary

**Vector databases** index and search high-dimensional vector embeddings for **semantic search, recommendation, and AI/ML applications**. They use **Approximate Nearest Neighbor (ANN)** algorithms (HNSW, IVF, PQ) to find similar vectors in milliseconds at billion scale. Key players: **Pinecone, Weaviate, Qdrant, Milvus, Chroma**. Essential for LLM applications (RAG), image search, and anomaly detection.

## 2. Definition

**Vector database**: Stores vector embeddings (lists of floats representing semantic meaning) and performs similarity searches. **ANN (Approximate Nearest Neighbor)**: Algorithms finding close vectors efficiently by trading perfect accuracy for speed. **Distance metrics**: Cosine similarity (semantic), Euclidean distance (spatial), Dot product (magnitude + direction).

## 3. Why It Exists / Problem It Solves

Traditional databases cannot do semantic search. Exact KNN on high-dimensional data is O(n*d) — scanning all vectors is infeasible at scale. Vector databases solve: semantic search (find similar content), RAG (retrieve context for LLMs), multimodal search (image/text/audio), recommendation (similar items), anomaly detection (outliers in vector space).

## 4. When to Use It

**LLM applications**: RAG (retrieve relevant context), memory/agent state. **Semantic search**: Search by meaning, not keywords. **Recommendation**: User-item vector similarity. **Multimodal search**: CLIP embeddings for image/text/audio. **Deduplication**: Near-duplicate detection. **Anomaly detection**: Embedding space outliers.

## 5. When NOT to Use It / Tradeoffs

**Approximate results**: Not for exact matching required scenarios. **Curse of dimensionality**: Degrades above ~1000 dimensions. **Embedding quality dependent**: Garbage in, garbage out. **Memory intensive**: HNSW graph ~10-50GB per million 768-dim vectors. **Cost**: GPU acceleration, memory costs. **Not for structured queries**: Cannot replace SQL for exact filter/join queries.

## 6. How It Works (Deep Mechanics)

**HNSW** (Hierarchical Navigable Small World): Multi-layer graph. Top layer has few nodes (long jumps), bottom layer has all (fine search). Search: start at top, greedily descend. O(log n). Best recall/latency tradeoff. **IVF** (Inverted File Index): k-means clustering. Search nearest clusters only. Good for large-scale. **PQ** (Product Quantization): Compresses vectors 4-16x by splitting and quantizing sub-vectors. **Hybrid search**: Combines vector similarity + scalar metadata filters (pre-filter, post-filter, scan-based).

## 7. Architecture Diagram

\`\`\`
HNSW Graph: Layer 3 [A]--[B]; Layer 2 [C]-[D]-[E]; Layer 1 [G]-[H]-[I]-[J]-[K]
Search: Start top layer, greedy navigate to nearest, descend for finer search.

ANN Tradeoffs:
Algorithm | Speed | Recall | Memory | Build
HNSW      | ★★★★★ | ★★★★★  | ★★☆☆☆  | ★★★☆☆
IVF       | ★★★★☆ | ★★★★☆  | ★★★★☆  | ★★★★★
PQ        | ★★★★☆ | ★★★☆☆  | ★★★★★  | ★★★★☆
\`\`\`

## 8. Real-World Flow Example

**RAG pipeline**: User asks "What is refund policy?" -> embed query with text-embedding-3-small (1536 dims) -> query Pinecone (knn + filter: category=refunds) -> retrieve top 5 chunks -> send to GPT-4 as context -> LLM generates grounded answer. Total <200ms. Without vector search: keyword search misses semantically similar queries.

## 9. Reference Implementation Example

\`\`\`typescript
class VectorDB {
  private index = new Map<string, { vec: number[]; meta: Record<string, unknown> }>();
  async search(query: number[], topK: number, filter?: Record<string, unknown>) {
    const distances: { id: string; score: number }[] = [];
    for (const [id, record] of this.index) {
      if (filter && !Object.entries(filter).every(([k, v]) => record.meta[k] === v)) continue;
      const score = this.cosineSimilarity(query, record.vec);
      distances.push({ id, score });
    }
    return distances.sort((a, b) => b.score - a.score).slice(0, topK);
  }
  private cosineSimilarity(a: number[], b: number[]) {
    const dot = a.reduce((s, v, i) => s + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return dot / (magA * magB);
  }
}
\`\`\`

## 10. Real Company Use Cases

**OpenAI**: Internal vector search for ChatGPT retrieval. **Notion AI**: Qdrant for semantic search over notes. **Zapier**: Pinecone for AI action recommendations. **GitHub**: Copilot code search with embeddings. **Spotify**: Milvus for music recommendation via audio embeddings. **Jasper AI**: Weaviate for content generation context retrieval.

## 11. Common Interview Questions

1. "How do vector databases enable semantic search?"
2. "Explain the HNSW algorithm."
3. "What distance metrics are used and when?"
4. "How does RAG use vector databases?"
5. "Compare HNSW, IVF, and PQ. What is the curse of dimensionality?"

## 12. Related Topics & Next Steps

**Embeddings**: OpenAI text-embedding, CLIP for images, Word2Vec. **ANN Algorithms**: HNSW, IVF, PQ, LSH, ScaNN. **RAG Architecture**: Chunking, embedding, retrieval, generation. **Vector Quantization**: Product quantization. **Hybrid Search**: Vector + keyword (BM25).
`,
    estimatedMin: 14,
    difficulty: "Advanced" as const,
    companies: ["OpenAI","Notion","Zapier","GitHub","Spotify","Jasper"],
    tags: ["vector-database","ANN","embeddings","RAG","semantic-search"]
  }
];
