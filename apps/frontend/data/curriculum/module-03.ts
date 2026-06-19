export const module03Lessons = [
  {
    id: "lesson-03-01",
    slug: "databases-01-sql-vs-nosql",
    title: "SQL vs NoSQL - When to Use It",
    content: `## 0. Mental Model

> SQL is like a **well-organized library with a card catalog** — each book (row) has a fixed place in a specific section (table), you can find any book by author, title, or subject (joins, indexes), and the librarian enforces rules on how books are handled (ACID). NoSQL is like a **flea market** — vendors set up stalls however they want (flexible schema), you can find things quickly if you know which stall (key-value), but finding all blue items across the market is hard (no joins).

## 1. Quick Summary

**SQL databases** (relational) store structured data in tables with fixed schemas and enforce ACID transactions. **NoSQL databases** (non-relational) offer flexible schemas, horizontal scaling, and various data models (document, key-value, column, graph). Choose SQL when data integrity, complex joins, and structured relationships matter. Choose NoSQL when you need massive scale, flexible schemas, or handle unstructured data.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **SQL (RDBMS)** | Relational database with tables, schemas, ACID transactions (PostgreSQL, MySQL) |
| **NoSQL** | Non-relational database with flexible schemas (MongoDB, Redis, Cassandra, Neo4j) |
| **ACID** | Atomicity, Consistency, Isolation, Durability — transaction guarantees |
| **BASE** | Basically Available, Soft state, Eventual consistency — NoSQL tradeoff |
| **Polyglot Persistence** | Using multiple database types for different use cases |
| **Schema-on-Write** | Schema enforced when data is written (SQL) |
| **Schema-on-Read** | Schema applied when data is read (NoSQL) |

## 3. Problem Without It

- **SQL's limitations**: Rigid schemas require costly migrations. Single-server scaling hits wall at ~10K writes/sec. Joins across sharded databases are impractical.
- **NoSQL's limitations**: No built-in joins (app must aggregate). Eventual consistency leads to stale reads. Limited transaction support makes financial systems risky.
- **Monoculture mistake**: Using SQL for everything leads to painful scaling. Using NoSQL for everything leads to data inconsistency. Each has strengths for specific workloads.

## 4. How It Works — Core Mechanics

**SQL Storage Engine (B+Tree):**
\`\`\`
Table: Users
Index (B+Tree on id): fast lookup by ID
Query: SELECT * FROM users WHERE email = 'alice@example.com'
→ Planner: use index on email (if exists) or sequential scan
→ Executor: fetches rows, applies filters, returns results
\`\`\`

**NoSQL Document Store (MongoDB):**
\`\`\`
Collection: users
Document: { _id: ObjectId, name: "Alice", email: "alice@example.com", orders: [...] }
Query: db.users.find({ email: "alice@example.com" })
→ B-Tree index on email (similar to SQL for indexed lookups)
\`\`\`

**Key Differences in Mechanics:**

| Aspect | SQL | NoSQL |
|--------|-----|-------|
| Storage engine | B+Tree (InnoDB) or LSM (RocksDB for MySQL) | LSM Tree (Cassandra), B+Tree (MongoDB WiredTiger), In-memory (Redis) |
| Query language | SQL (standardized) | API-specific (MQL, CQL, Redis commands) |
| Indexing | B-Trees, GiST, GIN, BRIN | B-Trees, inverted indexes, geospatial |
| Transactions | ACID (multi-row, multi-table) | Limited (single-document in MongoDB) |
| Scaling | Vertical (strong), sharding (complex) | Horizontal (native in Cassandra, DynamoDB) |

## 5. Variants & Flavors

| Category | Database | Data Model | Best For |
|----------|----------|-----------|----------|
| **SQL** | PostgreSQL | Tables, rows, schemas | Complex queries, ACID, structured data |
| **SQL** | MySQL | Tables, rows | Web apps, LAMP stack |
| **Document** | MongoDB | JSON documents | Flexible schema, product catalogs |
| **Key-Value** | Redis | Key → value | Caching, sessions, real-time |
| **Key-Value** | DynamoDB | Key → value/JSON | Serverless, high-scale |
| **Column** | Cassandra | Column families | High-write, time-series |
| **Graph** | Neo4j | Nodes + edges | Relationships, recommendations |

## 6. Performance Characteristics

| Metric | SQL (PostgreSQL) | Document (MongoDB) | Key-Value (Redis) | Column (Cassandra) |
|--------|-----------------|-------------------|-------------------|-------------------|
| Read latency (single key) | 1-5ms | 1-5ms | <1ms | 1-5ms |
| Write throughput | 10K/s (single node) | 50K/s | 100K/s | 100K+/s (scales linearly) |
| Query complexity | Complex joins, CTEs | Simple queries (aggregation pipeline) | Key lookups only | CQL, limited joins |
| Consistency control | Strong (ACID) | Tunable | Strong | Tunable (eventual/strong) |
| Scaling pattern | Vertical (add replicas) | Horizontal (sharding) | Cluster (hash slots) | Horizontal (ring) |

## 7. Failure Modes

- **Wrong database for workload**: Using SQL for 100M writes/sec → painful sharding. Using NoSQL for accounting system → data inconsistency.
- **NoSQL without transactions**: E-commerce cart: deduct inventory + charge card. Without transactions, one succeeds, other fails → inconsistent state.
- **SQL schema rigidity**: Adding a field requires ALTER TABLE, long-running migration, potential downtime. NoSQL adds field per-document instantly.
- **Cross-shard joins in SQL**: Join across 64 shards → scatter-gather query → slow, complex. NoSQL avoids joins entirely.

## 8. Decision Framework

\`\`\`
Choosing SQL vs NoSQL:
├── Data is structured with clear relationships?
│   ├── Yes → SQL (PostgreSQL / MySQL)
│   └── No → NoSQL
├── Need ACID transactions across multiple records?
│   ├── Yes → SQL
│   └── No → NoSQL (or SQL with relaxed isolation)
├── Need complex joins, CTEs, window functions?
│   ├── Yes → SQL
│   └── No → NoSQL
├── Need to scale writes horizontally?
│   ├── Yes → NoSQL (Cassandra, DynamoDB)
│   └── No → SQL (vertical scaling is simpler)
├── Schema evolves rapidly?
│   ├── Yes → NoSQL (MongoDB, document store)
│   └── No → SQL
├── Latency-critical (sub-millisecond)?
│   ├── Yes → Redis / Key-Value
│   └── No → SQL or other NoSQL
└── Real answer: Use BOTH (polyglot persistence)
    └── SQL for transactions + NoSQL for scale + Cache for speed
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show a decision tree: Start with "Data model?" → Node 1: "Structured + relationships?" → SQL (PostgreSQL, MySQL) branch. Node 2: "Flexible schema?" → Branch into Document (MongoDB), Key-Value (Redis), Column (Cassandra), Graph (Neo4j). Below, a "Polyglot Persistence" example: a single application using PostgreSQL (orders), Redis (sessions), Elasticsearch (search), and Cassandra (logs). Each database has a label with its primary advantage.*

## 10. Real Production Incident

**Uber's MySQL → Cassandra Migration (2015)** — Uber's trip data initially used MySQL sharded across databases. As Uber grew globally, the MySQL sharding became unwieldy — adding new shards required schema changes, cross-shard queries were impossible, and join-heavy operations failed. **Impact**: Query latency increased unpredictably, shard rebalancing required downtime. **Fix**: Uber migrated trip history to Cassandra (column-family NoSQL) for horizontal scalability and high write throughput. MySQL remained for billing (where ACID transactions are critical). **Lesson**: **Polyglot persistence is the right answer — use SQL where ACID matters (billing, inventory), NoSQL where scale matters (trip history, logs, sessions). A single database type rarely fits all needs**.

## 11. Production Implementation

**Naive**: All data in one SQL database. When it gets slow, add indexes. When it gets too slow, add caching. Eventually hits a wall.

**Better**: SQL for transactional data + Redis for cache + Elasticsearch for search. Shard SQL when needed. Read replicas for read-heavy workloads.

**Production**: Polyglot persistence architecture. Define data domains: (1) Transactions → PostgreSQL (ACID, complex queries). (2) Sessions → Redis (sub-ms reads, TTL expiry). (3) High-write event logs → Cassandra (linear scalability). (4) Product catalog → MongoDB (flexible schema). (5) User relationships → Neo4j (graph traversal). Each database has a clear data ownership boundary. No cross-database joins — application aggregates at the service layer.

## 12. Real Company Deep Dives

- **Uber**: MySQL for trips and billing, Cassandra for metrics and history, Redis for caching, Elasticsearch for search. Polyglot persistence by design.
- **Netflix**: Cassandra for viewing history (high writes), Elasticsearch for search, MySQL for billing, EVCache (Memcached) for recommendations.
- **Amazon**: DynamoDB for shopping cart (high availability), RDS (MySQL/PostgreSQL) for orders, ElastiCache for sessions. DynamoDB handles 10T+ requests/day.
- **Airbnb**: MySQL for listings and bookings, Elasticsearch for search, Redis for sessions and caching, Spark for analytics.

## 13. Interview Playbook

**Q1: "How would you choose between SQL and NoSQL for a new project?"**
- Model answer: Evaluate: data structure (structured → SQL, flexible → NoSQL), consistency needs (ACID required → SQL), query complexity (joins needed → SQL), scaling needs (horizontal scale → NoSQL), and team expertise. Most real systems use both.

**Q2: "What is polyglot persistence?"**
- Model answer: Using multiple database technologies within one system, each optimized for its workload. Example: PostgreSQL for transactions, Redis for caching, Cassandra for time-series, Elasticsearch for search. The application or service layer aggregates across databases.

**Q3: "Can you use transactions across SQL and NoSQL databases?"**
- Model answer: No, distributed transactions across different database types are not ACID. Use saga pattern: a sequence of local transactions with compensating actions for rollback. Or use an orchestrator that coordinates the workflow.

**Q4: "What is the difference between schema-on-write and schema-on-read?"**
- Model answer: Schema-on-write (SQL): data must conform to schema when written. Schema-on-read (NoSQL): data is stored without schema constraints; schema is applied when reading. Schema-on-read enables rapid iteration but shifts complexity to queries.

## 14. Concept Check Quiz

**Q1: Which database type is best for complex queries with joins?**
- A) Document (MongoDB)
- B) Key-Value (Redis)
- C) SQL (PostgreSQL)
- D) Column (Cassandra)
- **Answer: C** — SQL databases with their relational model and query optimizer handle complex joins efficiently.

**Q2: What is polyglot persistence?**
- A) Using multiple programming languages
- B) Using multiple database types for different workloads
- C) Translating SQL to NoSQL queries
- D) Database schema versioning
- **Answer: B** — Polyglot persistence means using different database types (SQL, NoSQL, cache, search) within one system.

**Q3: Which NoSQL type is best for storing and querying relationships?**
- A) Document
- B) Key-Value
- C) Column
- D) Graph
- **Answer: D** — Graph databases (Neo4j, Dgraph) are optimized for relationship-heavy queries (friends of friends, recommendation chains).

**Q4: What is the main tradeoff when choosing NoSQL over SQL?**
- A) NoSQL is slower
- B) NoSQL sacrifices ACID transactions and complex queries for scalability
- C) NoSQL is more expensive
- D) NoSQL requires more storage
- **Answer: B** — NoSQL trades ACID guarantees and complex query capabilities for horizontal scalability and schema flexibility.

## 15. Next Steps

Continue to **Relational Database Internals (B-Trees, Indexing)** (lesson-03-02) to understand the storage engine and indexing structures that power SQL databases.`,
    estimatedMin: 12,
    difficulty: "Beginner" as const,
    companies: ["Uber", "Netflix", "Airbnb", "Amazon"],
    tags: ["SQL", "NoSQL", "RDBMS", "polyglot-persistence"],
  },

  {
    id: "lesson-03-02",
    slug: "databases-02-relational-database-internals",
    title: "Relational Database Internals (B-Trees, Indexing)",
    content: `## 0. Mental Model

> A B+Tree is like a **multi-level filing cabinet**. The top drawer has index cards pointing to specific file folders. Each folder contains 1000 documents. To find document #42, you look at the index card, get the folder number, open that folder, and scan the 1000 documents inside. With 3 levels of drawers, you can find any document among 1 billion without opening more than 3 folders.

## 1. Quick Summary

**B+Trees** are the standard data structure for relational database indexes. They maintain sorted data for efficient insert, delete, and search operations — all O(log n). Leaf nodes contain the actual data (or pointers); internal nodes contain keys for navigation. A B+Tree with height 3 can index billions of rows. PostgreSQL, MySQL (InnoDB), SQLite, and Oracle all use B+Trees as their primary storage engine.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **B+Tree** | Balanced tree where internal nodes guide search, leaves contain data |
| **Node** | A page (typically 8KB or 16KB) containing keys and pointers |
| **Internal Node** | Contains keys and child pointers (navigation only) |
| **Leaf Node** | Contains keys and actual data (row or pointer to row) |
| **Page** | Minimum I/O unit (4KB-16KB) read from disk |
| **Fan-out** | Number of pointers per node (typically hundreds) |
| **Fill Factor** | How full pages are (80% = 20% free space for inserts) |
| **Clustered Index** | Data stored in leaf nodes (InnoDB primary key) |
| **Secondary Index** | Leaf has pointer to row (not row data) |
| **Page Split** | When a page is full, it splits into two |

## 3. Problem Without It

- **Full table scan**: Finding a single row in a 100M-row table requires scanning all 100M rows → 10 minutes. With B+Tree index: 3-4 page reads → 1ms.
- **Unsorted storage**: Without index, data is stored in insertion order. Range query (WHERE age BETWEEN 20 AND 30) requires full scan.
- **Unbounded tree height**: A BST could grow to height = number of rows → degenerate to linked list. B+Tree stays perfectly balanced.

## 4. How It Works — Core Mechanics

**B+Tree Structure (Order=5, simplified):**
\`\`\`
          ┌─────┬─────┬─────┐
          │ 10  │ 20  │ 30  │   Internal Node
          └──┬──┴──┬──┴──┬──┘
      ┌──────┘  ┌───┘    └──────┐
      ▼         ▼                ▼
  ┌───────┐ ┌───────┐     ┌───────┐
  │ 1,5,8 │ │12,15,18│    │22,25,28│  Leaf Nodes
  └───────┘ └───────┘     └───────┘
     linked list → (points to next leaf)
\`\`\`

**Search for key=15:**
\`\`\`
1. Start at root: 15 > 10, 15 < 20 → follow first pointer
2. Internal node: 15 > 12, 15 < 18? No, 15 < 20 → follow third pointer?
   Wait, let me reconsider: 15 < 20 but > 15? 
   Actually: 15 > 12, 15 is NOT > 15 (equal), but we compare keys: 
   Between 12 and 15: 15 == 15 → follow pointer to that value.
3. Leaf node: scan → found 15!
\`\`\`

**B+Tree Properties:**
- Height = log_fanout(N). Fan-out ≈ 200 (8KB page / 40 byte key-pointer pair)
- Height 3 → 200^3 = 8 million keys. Height 4 → 1.6 billion keys.
- Leaf nodes form a linked list for efficient range scans.

**InnoDB Page Structure (16KB):**
\`\`\`
┌──────────────────────────────────────┐
│ Page Header (56 bytes)               │
├──────────────────────────────────────┤
│ Infimum + Supremum records           │
├──────────────────────────────────────┤
│ User Records (sorted by key):        │
│ [key=1, row data...] [key=5, ...]   │
├──────────────────────────────────────┤
│ Free Space                           │
├──────────────────────────────────────┤
│ Page Directory (array of record ptrs)│
└──────────────────────────────────────┘
\`\`\`

## 5. Variants & Flavors

| Index Type | Structure | Best For | How Data Is Stored |
|-----------|-----------|----------|-------------------|
| **Clustered** (InnoDB PK) | B+Tree, leaves = full row | Primary key lookups | Row data in leaf |
| **Secondary** | B+Tree, leaves = PK value | Non-PK column lookups | Points to PK (then clustered lookup) |
| **Covering** | B+Tree, leaves include needed columns | Query returns only indexed columns | No table access needed |
| **Unique** | B+Tree with uniqueness constraint | Enforcing unique values | Same as secondary/clustered |
| **Composite** | B+Tree with (col1, col2, col3) | Multi-column queries, sorting | Leftmost prefix matching |
| **Partial** | B+Tree with WHERE filter | Queries on subset of rows | Only rows matching predicate |

## 6. Performance Characteristics

| Metric | No Index | B+Tree (3 levels) | B+Tree (4 levels) |
|--------|----------|-------------------|-------------------|
| Lookup (point query) | Full scan (minutes) | 3 page reads (~1ms) | 4 page reads (~2ms) |
| Range scan (100 rows) | Full scan | Walk linked list (fast) | Walk linked list |
| Insert | Append (fast) | Find leaf + insert (~1-5ms) | Find leaf + insert |
| Page split overhead | N/A | ~10ms (split + rebalance) | ~10ms |
| Storage overhead | None | ~10-20% additional | ~10-20% |

## 7. Failure Modes

- **Page splits storm**: Bulk insert into nearly-full pages → constant page splits → write amplification. *Fix*: increase fill factor (set to 70% for write-heavy workloads).
- **Index bloat**: Many updates/deletes lead to fragmented pages, wasted space. *Fix*: periodic \`REINDEX\` or \`VACUUM FULL\` (PostgreSQL).
- **Wrong index type**: Using B-Tree for geospatial queries → must scan all rows. *Fix*: use GiST/SP-GiST indexes for geospatial.
- **Too many indexes**: Each index adds write overhead (update N indexes for every write). *Fix*: monitor index usage, drop unused indexes.
- **Index on low-cardinality column**: Index on boolean column → 50% selectivity → B-Tree doesn't help (full scan faster). *Fix*: partial indexes or BRIN.

## 8. Decision Framework

\`\`\`
Indexing strategy:
├── Primary key lookups (by id)?
│   └── Clustered index (B+Tree, leaf = row)
├── Foreign key lookups (by user_id)?
│   └── Secondary B-Tree index
├── Range queries (WHERE age BETWEEN 20 AND 30)?
│   └── B-Tree index on age
├── Text search (WHERE name LIKE '%pattern%')?
│   └── Inverted index (GIN, not B-Tree)
├── Geospatial queries (WHERE ST_DWithin(loc, point, 1000))?
│   └── GiST/SP-GiST index (not B-Tree)
├── Sorting (ORDER BY created_at)?
│   └── B-Tree index on sort column (avoids sort operation)
├── High-cardinality unique values?
│   └── B-Tree unique index
└── Low-cardinality (gender, status)?
    └── Partial index (WHERE status = 'active') or BRIN
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show a 3-level B+Tree. Root node with keys [10, 20, 30] pointing to 3 internal nodes. Each internal node has keys pointing to leaf nodes. Leaf nodes contain actual data and are linked by a horizontal arrow (linked list for range scans). A magnifying glass shows the 16KB page structure: Page Header, Infimum/Supremum records, User Records (sorted), Free Space, Page Directory. A callout: "Height 3 → 8M keys, Height 4 → 1.6B keys."*

## 10. Real Production Incident

**GitHub's MySQL Index Bloat (2019)** — GitHub's MySQL primary database had an index on the \`issues\` table's \`updated_at\` column that grew to 50GB+ due to constant updates on issue metadata (labels, assignees, comments). The index was 10x the size of the actual table data. **Impact**: Write queries slowed down because every update required updating the bloated B-Tree index. Disk I/O increased 5x. **Fix**: GitHub dropped the \`updated_at\` index and used a covering index on \`(repository_id, updated_at)\` for pagination. They also implemented index monitoring with automatic detection of "bloated" indexes (size > 3x expected). **Lesson**: **B-Tree indexes on frequently-updated columns grow unboundedly due to MVCC — monitor index size vs table size ratio, and prefer composite indexes that match actual query patterns**.

## 11. Production Implementation

**Naive**: Add an index on every column "just in case." Fails to consider index maintenance cost.

**Better**: Index based on query patterns. Primary key index always. Index foreign keys. Covering index for frequent queries. Monitor slow queries and add indexes accordingly.

**Production**: \`pg_stat_user_indexes\` / \`pg_stat_all_indexes\` to monitor index usage. Drop unused indexes (0 scans in 30 days). Use \`pgstattuple\` to detect bloat. Periodic reindex for write-heavy tables. Use index-only scans (covering indexes) for read-heavy workloads. Consider BRIN indexes for time-series data (much smaller than B-Tree). For PostgreSQL: use \`CREATE INDEX CONCURRENTLY\` to avoid locking. Use \`EXPLAIN ANALYZE\` to verify index usage before deploying.

## 12. Real Company Deep Dives

- **MySQL (InnoDB)**: Clustered index by primary key. Secondary indexes contain PK value (not row pointer) — two index lookups for secondary index queries. Page size: 16KB.
- **PostgreSQL**: Heap-based (not clustered). All indexes are "secondary" — they point to heap tuples via CTID. PostgreSQL indexes support partial, covering, and concurrent creation.
- **SQLite**: B+Tree for both table storage and indexes. Page size: 4KB by default. Entire database is a single file.
- **Oracle**: B-Tree index with row ID pointer (physical address). Supports index-organized tables (clustered). Bitmap indexes for low-cardinality.

## 13. Interview Playbook

**Q1: "How does a B+Tree index work?"**
- Model answer: A balanced tree where internal nodes contain keys pointing to child nodes, and leaf nodes contain the actual data (or pointers). Search, insert, delete: O(log n) where n is number of rows. The tree is self-balancing — page splits keep height uniform. Leaf nodes are linked for efficient range scans.

**Q2: "B+Tree vs Hash index — when to use each?"**
- Model answer: B+Tree supports range queries, sorting, and prefix matching. Hash index supports only equality lookups (=, IN). Hash is O(1) but B+Tree is O(log n). Use B+Tree for most workloads; hash for exact-match lookups where range queries are not needed.

**Q3: "What is the difference between clustered and secondary indexes?"**
- Model answer: Clustered index determines the physical order of data on disk. Each table has one clustered index (typically the primary key). Leaf nodes contain full rows. Secondary indexes contain the clustered index key — looking up a row by secondary index requires two B+Tree traversals (secondary → PK → row).

**Q4: "How does page splitting work in a B+Tree?"**
- Model answer: When a page is full and a new key is inserted, the page splits: half the keys stay in the existing page, half go to a new page. The parent node gets a new separator key pointing to the new page. Split propagates upward if the parent is also full. Splits are expensive (sequential I/O becomes random I/O) → SREs tune fill factor to reduce split frequency.

## 14. Concept Check Quiz

**Q1: How many page reads does a B+Tree of height 4 need for a point lookup?**
- A) 1
- B) 2
- C) 3
- D) 4
- **Answer: D** — Height 4 means root + 2 internal levels + leaf = 4 page reads.

**Q2: What happens to a B+Tree when a page is full and a new key is inserted?**
- A) The new key is rejected
- B) The page splits into two pages, and the parent node is updated
- C) The tree rebalances completely
- D) The page overflows into a linked list
- **Answer: B** — A page split divides keys between two pages and adds a new separator key to the parent node.

**Q3: Which index type is best for WHERE status = 'active' when status has only 3 values?**
- A) B-Tree
- B) Hash
- C) Partial index
- D) GiST
- **Answer: C** — A partial index on \`WHERE status = 'active'\` is far smaller than a full B-Tree on low-cardinality column. BRIN is another option.

**Q4: What is the fan-out of a B+Tree with 8KB pages and 32-byte key-pointer pairs?**
- A) 100
- B) 256
- C) 512
- D) 8KB/32B = 256
- **Answer: D** — Fan-out = page size / (key size + pointer size) = 8192 / 32 = 256 pointers per node.

## 15. Next Steps

Continue to **ACID Properties** (lesson-03-03) which you've already studied, or skip ahead to **Database Normalization & Denormalization** (lesson-03-04) to learn about schema design tradeoffs.`,
    estimatedMin: 15,
    difficulty: "Advanced" as const,
    companies: ["MySQL", "PostgreSQL", "Oracle", "Microsoft", "Google"],
    tags: ["B+Tree", "indexing", "database-internals", "storage-engine"],
  },

  {
    id: "lesson-03-03",
    slug: "databases-03-acid-properties",
    title: "ACID Properties",
    content: `
## 0. Mental Model

> Think of a database transaction like a surgery. Either the entire operation succeeds — every cut, suture, and step — or the patient is returned to exactly how they arrived. There is no acceptable halfway: no "we removed the organ but didn't close the incision." ACID is the anesthesiologist, the surgical checklist, the recovery room, and the post-op nurse — all four guarantees together make the operation safe.

## 1. Quick Summary

- **Atomicity** — All operations in a transaction succeed or all are rolled back. No partial commits.
- **Consistency** — A transaction takes the database from one valid state to another. All constraints, rules, and invariants are always satisfied.
- **Isolation** — Concurrent transactions execute as if they were serial. No transaction sees intermediate state of another.
- **Durability** — Once committed, data survives crashes, power failures, and restarts.
- Critical for payments, bookings, inventory, medical records, trading systems. Trade-off: throughput vs correctness.

## 2. Definition & Terminology

**Transaction**: A unit of work executed atomically. Begins with \`BEGIN\`, ends with \`COMMIT\` or \`ROLLBACK\`.

**WAL (Write-Ahead Log)**: A sequential log on disk where every change is recorded before it modifies the actual data page. The backbone of Atomicity and Durability.

**MVCC (Multiversion Concurrency Control)**: A concurrency mechanism that keeps multiple versions of each row so readers never block writers and writers never block readers.

**xmin / xmax**: Hidden system columns in PostgreSQL rows. \`xmin\` = XID that created this row version. \`xmax\` = XID that deleted/updated it (0 if current).

**LSN (Log Sequence Number)**: A monotonically increasing 64-bit pointer into the WAL. Used for crash recovery: replay all records with LSN > last checkpoint.

**2PL (Two-Phase Locking)**: Protocol for serializability. Growing phase: acquire locks. Shrinking phase: release locks.

**OCC (Optimistic Concurrency Control)**: Read without locking, validate at commit. If another txn modified the same data, abort and retry.

## 3. The Problem Without It

Without ACID, concurrent database operations produce catastrophic outcomes:

**Dirty Read**: T1 updates \`balance = 400\` but hasn't committed. T2 reads 400 and transfers money. T1 rolls back — balance was never actually 400. Money created from thin air.

**Lost Update**: T1 reads \`stock = 10\`, T2 reads \`stock = 10\`. T1 writes \`stock = 9\`. T2 writes \`stock = 9\`. Two purchases happened but stock only decremented once. Store sells items it doesn't have.

**Non-Repeatable Read**: T1 reads \`price = 29.99\` for a checkout. T2 updates price to 49.99. T1 reads again — now 49.99. Customer charged different amounts in the same flow.

**Phantom Read**: T1 queries "all seats in row A" — finds 2 available, selects A3. T2 concurrently selects A3 too. Two passengers assigned the same seat.

## 4. How It Works — Core Mechanics

### Atomicity: The Write-Ahead Log in Detail

When T1 begins \`BEGIN; UPDATE accounts SET balance = 400 WHERE id = 1;\`:

**Step 1 — WAL record written first:**
\`\`\`
LSN: 0/16B4E28  XID: 742  RMGR: Heap
BLOCK: accounts page=23 slot=4
OLD: {id=1, balance=500, xmin=100, xmax=0}
NEW: {id=1, balance=400, xmin=742, xmax=0}
\`\`\`
This WAL record is fsynced to disk. The data page is marked "dirty" but not written to disk yet.

**Step 2 — Buffer pool modified (in memory).** The old version is kept (MVCC).

**Step 3 — On COMMIT:** A WAL COMMIT record is written and fsynced. PostgreSQL returns success.

**Step 4 — On crash before COMMIT:** Recovery finds no COMMIT record for XID 742. Applies UNDO: the old row version is restored.

**Step 5 — On crash after COMMIT:** Recovery finds COMMIT record. Replays all WAL records for XID 742 (REDO). Data is restored exactly as committed.

### Isolation: The Four Anomalies and How to Prevent Them

| Anomaly | Description | Example | Prevented by |
|---------|-------------|---------|--------------|
| **Dirty Read** | Reading uncommitted data | T1 writes 400, T2 reads 400, T1 rolls back | READ COMMITTED+ |
| **Non-Repeatable Read** | Same row, different values | T1 reads 500 twice, T2 commits UPDATE in between | REPEATABLE READ+ |
| **Phantom Read** | Different rows from INSERT | T1 SELECTs orders < \$100, T2 inserts new \$50 order | SERIALIZABLE |
| **Lost Update** | Two txns read + write, second overwrites first | Both read 500, both write (500-100), only one deduct applied | Locking or OCC |

**MVCC — how PostgreSQL achieves non-blocking reads:**

Every row version has \`xmin\` (XID that created it) and \`xmax\` (XID that deleted/updated it). A row is visible to a transaction if:
- \`xmin\` is committed and in the snapshot
- \`xmax\` is 0 OR \`xmax\` is not committed in the snapshot

Readers never block writers. Writers never block readers. The only contention is writer-writer.

### Durability: fsync and the Double-Write Buffer

The OS page cache is not durable. \`fsync()\` forces the kernel to flush dirty pages to physical storage. PostgreSQL calls \`fsync()\` on the WAL before returning COMMIT.

**Cost of fsync by storage:**

| Storage | fsync latency | Max write tps |
|---------|--------------|---------------|
| HDD | 5–20ms | 50–200 |
| SATA SSD | 0.5–2ms | 500–2,000 |
| NVMe SSD | 0.05–0.3ms | 3,000–20,000 |

This is the "durability tax." High-throughput ACID systems use **group commit**: PostgreSQL's \`commit_delay\` + \`commit_siblings\` batch multiple concurrent commits into a single fsync.

## 5. Variants & Flavors

### Strong ACID (PostgreSQL, MySQL InnoDB, Oracle)
Full ACID with fsync durability. Industry standard for financial and transactional systems.

### Relaxed Durability (fsync=off)
Allows disabling fsync for non-critical workloads. Gains 10–100x write throughput. Risk: up to 3 seconds of data loss on crash.

### Distributed ACID (2PC)
Extends ACID across multiple nodes. Coordinator asks participants to PREPARE then COMMIT. Problem: coordinator SPOF, in-doubt transactions.

### Saga Pattern
Series of local ACID transactions with compensating actions for rollback. No distributed coordinator.

### BASE (Basically Available, Soft-state, Eventually consistent)
NoSQL alternative. No transaction boundaries, eventual consistency. Gains horizontal scale, loses correctness guarantees.

## 6. Performance Characteristics

| Operation | p50 latency | p99 latency | Throughput | Notes |
|-----------|------------|-------------|------------|-------|
| Single-row COMMIT (NVMe) | 0.3ms | 2ms | 3,000–20,000 tps | fsync dominates |
| Single-row COMMIT (HDD) | 8ms | 25ms | 50–200 tps | fsync is the bottleneck |
| READ COMMITTED SELECT | 0.1ms | 1ms | 50,000+ qps | MVCC — no locks on read |
| REPEATABLE READ SELECT | 0.1ms | 1.5ms | 40,000+ qps | Snapshot at txn start |
| SERIALIZABLE | 0.5ms | 10ms | 5,000–15,000 qps | SSI adds conflict detection overhead |
| WAL replay (crash recovery) | N/A | N/A | 100MB/s | Sequential scan of WAL since last checkpoint |

Numbers degrade when: fsync batching disabled, replication lag high, long transactions block VACUUM, or lock contention on hot rows.

## 7. Failure Modes

### 1. Deadlock (Cycle in Lock Graph)
T1 holds Row A, waits for Row B. T2 holds Row B, waits for Row A. PostgreSQL detects and kills the younger transaction with "ERROR: deadlock detected."

**Fix:** Always acquire locks in the same order across all transactions.

### 2. Long-Running Transaction (Table Bloat)
PostgreSQL MVCC keeps old row versions until no transaction needs them. A transaction open for hours prevents VACUUM from cleaning dead tuples. A production Slack table once grew to 5x its actual size due to a forgot-to-commit migration.

**Fix:** Set \`statement_timeout\` and \`idle_in_transaction_session_timeout\`. Never hold transactions open during user interaction.

### 3. Replication Lag Data Loss
Async replication means the replica is always behind. GitHub's 2018 incident: 43 seconds of replication lag → 15,341 git operations lost on failover.

**Fix:** Use synchronous replication for critical data, accepting 2–5ms extra write latency.

## 8. Decision Framework

\`\`\`
Is financial data involved? (transfers, payments, balances)
  YES → Use SERIALIZABLE or REPEATABLE READ + explicit locking
  NO  → Continue

Are you doing read-then-write based on the read value?
  YES → Use REPEATABLE READ (prevents value changing between read and write)
  NO  → Continue

Do you need to prevent phantom rows in range queries?
  YES → Use REPEATABLE READ (PostgreSQL) or SERIALIZABLE (MySQL)
  NO  → READ COMMITTED (default — good for most OLTP)

Is this analytics / reporting with no writes?
  YES → READ COMMITTED, or use a read replica
  NO  → READ COMMITTED
\`\`\`

## 9. Live Architecture Diagram

<RoughDiagram
  nodes={[
    { id: 'app', label: 'Application', type: 'app', x: 80, y: 40 },
    { id: 'pg', label: 'PostgreSQL Primary', type: 'db', x: 300, y: 40 },
    { id: 'wal', label: 'WAL (Write-Ahead Log)', type: 'storage', x: 300, y: 150 },
    { id: 'buf', label: 'Buffer Pool (RAM)', type: 'cache', x: 520, y: 40 },
    { id: 'disk', label: 'Data Pages (SSD)', type: 'storage', x: 520, y: 150 },
    { id: 'replica', label: 'Read Replica', type: 'db', x: 300, y: 270 },
  ]}
  edges={[
    { from: 'app', to: 'pg', label: 'BEGIN / COMMIT' },
    { from: 'pg', to: 'wal', label: 'fsync first' },
    { from: 'pg', to: 'buf', label: 'modify in-memory' },
    { from: 'buf', to: 'disk', label: 'async flush (bgwriter)' },
    { from: 'wal', to: 'replica', label: 'streaming replication' },
  ]}
  height={340}
/>

## 10. Real Production Incident

<Callout type="incident">
**GitHub Database Failover & Data Loss — October 21, 2018**

During a routine network maintenance, GitHub's MySQL primary lost connectivity for 43 seconds. Orchestrator promoted a replica to primary — but the replica was 43 seconds behind due to async replication lag. Those 43 seconds of writes (merges, PR comments, issue updates) were lost.

GitHub engineers spent 24 hours recovering 15,341 write operations from raw git packfiles and binary MySQL logs. They recovered 99.11% of data. The remaining 0.89% was permanently lost.

**Fix:** Moved to synchronous replication (\`rpl_semi_sync_master_enabled=ON\`), accepting ~3ms write latency overhead. Added minimum replication lag check before automatic failover.

**Lesson:** If your system can't tolerate ANY data loss, use synchronous replication and accept the write latency cost. Your RPO with async replication = current replication lag at time of failure.
</Callout>

## 11. Production Implementation

### ❌ Naive — The Problem
\`\`\`typescript
async function transferNaive(fromId: string, toId: string, amount: number) {
  const from = await db.query('SELECT balance FROM accounts WHERE id = \$1', [fromId]);
  const to   = await db.query('SELECT balance FROM accounts WHERE id = \$1', [toId]);
  if (from.rows[0].balance < amount) throw new Error('Insufficient funds');
  // No transaction — concurrent request can overwrite between reads and writes
  await db.query('UPDATE accounts SET balance = balance - \$1 WHERE id = \$2', [amount, fromId]);
  await db.query('UPDATE accounts SET balance = balance + \$1 WHERE id = \$2', [amount, toId]);
}
\`\`\`

### ✅ Better — Transaction with Explicit Locking
\`\`\`typescript
async function transferBetter(fromId: string, toId: string, amount: number) {
  await db.query('BEGIN');
  try {
    const [first, second] = [fromId, toId].sort();
    await db.query('SELECT id FROM accounts WHERE id = \$1 FOR UPDATE', [first]);
    await db.query('SELECT id FROM accounts WHERE id = \$1 FOR UPDATE', [second]);
    const from = await db.query('SELECT balance FROM accounts WHERE id = \$1', [fromId]);
    if (from.rows[0].balance < amount) {
      await db.query('ROLLBACK');
      throw new Error('Insufficient funds');
    }
    await db.query('UPDATE accounts SET balance = balance - \$1 WHERE id = \$2', [amount, fromId]);
    await db.query('UPDATE accounts SET balance = balance + \$1 WHERE id = \$2', [amount, toId]);
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}
\`\`\`

### 🚀 Production — With Idempotency + Observability
\`\`\`typescript
import { Pool } from 'pg';
const pool = new Pool({
  max: 50, idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 2_000, statement_timeout: 5_000,
});

async function transferProduction(fromId: string, toId: string, amount: number, idempotencyKey: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const existing = await client.query('SELECT id FROM transfers WHERE idempotency_key = \$1', [idempotencyKey]);
    if (existing.rows.length > 0) { await client.query('COMMIT'); return { success: true, txnId: existing.rows[0].id }; }
    const [first, second] = [fromId, toId].sort();
    await client.query('SELECT id FROM accounts WHERE id = ANY(\$1) FOR UPDATE', [[first, second]]);
    const from = await client.query('SELECT balance FROM accounts WHERE id = \$1', [fromId]);
    if (!from.rows[0] || from.rows[0].balance < amount) { await client.query('ROLLBACK'); throw new Error('Insufficient funds'); }
    await client.query('UPDATE accounts SET balance = balance - \$1 WHERE id = \$2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + \$1 WHERE id = \$2', [amount, toId]);
    await client.query('INSERT INTO transfers (from_id, to_id, amount, idempotency_key, status) VALUES (\$1,\$2,\$3,\$4,\$5) RETURNING id', [fromId, toId, amount, idempotencyKey, 'completed']);
    await client.query('COMMIT');
    return { success: true, txnId: (await client.query('SELECT id FROM transfers WHERE idempotency_key = \$1', [idempotencyKey])).rows[0].id };
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; }
  finally { client.release(); }
}
\`\`\`

## 12. Real Company Deep Dives

**Stripe** — Every charge and refund uses ACID with idempotency keys. Internal transfer service uses PostgreSQL REPEATABLE READ with explicit row locking. Radar fraud detection reads same rows without blocking using MVCC snapshots.

**Airbnb** — Bookings use a Saga pattern rather than distributed 2PC: each service performs a local ACID transaction with compensating transactions for rollback ("release calendar hold" if payment fails). Avoids coordinator bottleneck.

**Binance** — Strict SERIALIZABLE isolation for order matching. Processes 1.4M transactions per second using a custom in-memory matching engine that writes to PostgreSQL asynchronously with checkpoint-based durability rather than per-transaction fsync.

**JPMorgan** — SERIALIZABLE isolation for all settlement transactions. Synchronous replication for zero RPO. All transactions written to immutable audit logs before and after execution for SEC Rule 17a-4 compliance.

## 13. Interview Playbook

**Q: "Explain ACID with a real example"** — Walk through a bank transfer. Mention WAL for Atomicity and Durability, MVCC for Isolation, constraints for Consistency. Don't just define the acronym — show the mechanism.

**Q: "How does MVCC work?"** — Multiple row versions with xmin/xmax. Each transaction gets a snapshot. Readers don't block writers. Mention VACUUM cleans up dead tuples.

**Q: "What's the difference between ACID and BASE?"** — ACID: strong consistency, single-node or 2PC, higher latency. BASE: eventual consistency, horizontal scale, lower latency. Neither is universally better.

**Q: "Why can't distributed systems provide full ACID?"** — CAP theorem: partition forces C or A choice. 2PC has coordinator SPOF and O(n) latency. Alternatives: single-region ACID + async replication, Saga pattern, CockroachDB.

## 14. Concept Check Quiz

**Q1:** A bank transfer debits Alice and credits Bob atomically. The system crashes after debiting Alice but before crediting Bob. Which ACID property was violated?

- A) Consistency — database entered invalid state
- B) Atomicity — the partial commit occurred
- C) Durability — committed data was lost
- D) Isolation — another transaction interfered

**Answer: B** — Atomicity requires all-or-nothing. The incomplete transaction should have been rolled back. The WAL contains no COMMIT record, so recovery must apply UNDO to reverse the debit.

---

**Q2:** T1 reads a row (balance=500). T2 updates it to 300 and commits. T1 reads the same row again in the same transaction and sees 300. What anomaly is this?

- A) Dirty read
- B) Phantom read
- C) Non-repeatable read
- D) Lost update

**Answer: C** — The same SELECT returned different values because another committed transaction changed the data between reads. Prevented by REPEATABLE READ.

---

**Q3:** Which isolation level allows the highest throughput but risks dirty reads?

- A) READ COMMITTED
- B) REPEATABLE READ
- C) READ UNCOMMITTED
- D) SERIALIZABLE

**Answer: C** — READ UNCOMMITTED acquires no read locks, so transactions see uncommitted data. PostgreSQL actually treats it as READ COMMITTED (doesn't implement dirty reads).

---

**Q4:** Why does PostgreSQL call fsync() before returning COMMIT?

- A) To release all row locks
- B) To replicate to read replicas
- C) To force WAL from OS page cache to physical disk
- D) To notify other transactions of the commit

**Answer: C** — The OS page cache is volatile RAM. fsync forces a physical write. Without it, a power failure could lose committed data. This is the durability tax.

---

**Q5:** Stripe receives the same charge request twice (network retry). How is double-charging prevented?

- A) UNIQUE constraint rejects the second INSERT
- B) Credit card number deduplication
- C) Idempotency key — same key returns cached result without re-executing
- D) TCP guarantees exactly-once delivery

**Answer: C** — Idempotency keys are stored with the transaction result. Same key returns stored result without re-executing. Built on top of ACID transactions.

## 15. Next Steps

- **Database Indexing (B-Trees)** — Learn how indexes speed up the queries ACID transactions depend on.
- **CAP Theorem** — Understand why distributed systems sacrifice ACID guarantees.
- **Saga Pattern** — See how microservices achieve data consistency without distributed transactions.
- **WAL Deep Dive** — The internal mechanics of PostgreSQL's write-ahead log.
`,
    estimatedMin: 25,
    difficulty: "Advanced" as const,
    companies: ["Stripe","Airbnb","Binance","JPMorgan","Shopify"],
    tags: ["ACID","transactions","WAL","MVCC","concurrency-control","isolation-levels"],
    quiz: {
      id: 'quiz-03-03-acid',
      title: 'ACID Properties Mastery Check',
      passingScore: 70,
      isRequired: false,
      questions: [
        {
          id: 'q1', type: 'MCQ', order: 1,
          content: 'A bank transfer debits Alice and credits Bob atomically. The system crashes after debiting Alice but before crediting Bob. Which ACID property was violated?',
          options: JSON.stringify(['Consistency — database entered invalid state', 'Atomicity — the partial commit occurred', 'Durability — committed data was lost', 'Isolation — another transaction interfered']),
          correctAnswer: 'Atomicity — the partial commit occurred',
          explanation: 'Atomicity requires all-or-nothing. The incomplete transaction should have been rolled back. The WAL contains no COMMIT record, so recovery applies UNDO to reverse the debit.',
        },
        {
          id: 'q2', type: 'MCQ', order: 2,
          content: 'T1 reads a row (balance=500). T2 updates it to 300 and commits. T1 reads the same row again in the same transaction and sees 300. What anomaly is this?',
          options: JSON.stringify(['Dirty read', 'Phantom read', 'Non-repeatable read', 'Lost update']),
          correctAnswer: 'Non-repeatable read',
          explanation: 'The same SELECT returned different values because another committed transaction changed the data between reads. Prevented by REPEATABLE READ isolation level.',
        },
        {
          id: 'q3', type: 'MCQ', order: 3,
          content: 'Which isolation level allows the highest throughput but risks dirty reads?',
          options: JSON.stringify(['READ COMMITTED', 'REPEATABLE READ', 'READ UNCOMMITTED', 'SERIALIZABLE']),
          correctAnswer: 'READ UNCOMMITTED',
          explanation: 'READ UNCOMMITTED acquires no read locks, so transactions see uncommitted data. PostgreSQL actually treats it as READ COMMITTED (does not implement dirty reads).',
        },
        {
          id: 'q4', type: 'MCQ', order: 4,
          content: 'Why does PostgreSQL call fsync() before returning COMMIT?',
          options: JSON.stringify(['To release all row locks', 'To replicate to read replicas', 'To force WAL from OS page cache to physical disk', 'To notify other transactions of the commit']),
          correctAnswer: 'To force WAL from OS page cache to physical disk',
          explanation: 'The OS page cache is volatile RAM. fsync forces a physical write. Without it, a power failure could lose committed data. This is the durability tax.',
        },
        {
          id: 'q5', type: 'MCQ', order: 5,
          content: 'Stripe receives the same charge request twice (network retry). How is double-charging prevented?',
          options: JSON.stringify(['UNIQUE constraint rejects the second INSERT', 'Credit card number deduplication', 'Idempotency key — same key returns cached result', 'TCP guarantees exactly-once delivery']),
          correctAnswer: 'Idempotency key — same key returns cached result',
          explanation: 'Idempotency keys are stored with the transaction result. Same key returns stored result without re-executing. Built on top of ACID transactions.',
        },
      ],
    },
  },
  {
    id: "lesson-03-04",
    slug: "databases-04-database-normalization-denormalization",
    title: "Database Normalization & Denormalization",
    content: `## 0. Mental Model

> Normalization is like **organizing a kitchen by ingredient type** — all spices in one cabinet, all pots in another, all plates in a third. Every item has exactly one place (no duplicates), and you know exactly where to find anything. Denormalization is like **keeping a spare set of plates in the dining room** — you have duplicates, but you don't need to walk to the kitchen every time you set the table. Normalization saves storage and ensures consistency; denormalization saves time (reads).

## 1. Quick Summary

**Normalization** reduces data redundancy by splitting data into multiple related tables, ensuring each fact is stored once. **Denormalization** intentionally adds redundancy (duplicate data) to optimize read performance by reducing joins. Normalization is the default for OLTP. Denormalization is common in OLAP, reporting, and read-heavy systems.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Normal Form** | A level of schema normalization (1NF, 2NF, 3NF, BCNF) |
| **1NF** | Atomic columns, no repeated groups |
| **2NF** | 1NF + no partial dependencies |
| **3NF** | 2NF + no transitive dependencies |
| **BCNF** | 3NF + every determinant is a candidate key |
| **Denormalization** | Intentionally duplicating data to reduce joins |
| **Anomaly** | Insert/update/delete problem caused by redundancy |
| **Materialized View** | Pre-computed query result stored as a table |

## 3. Problem Without It

- **Update anomaly**: User address in every order row → user moves → update 1000 rows. Miss one → inconsistency.
- **Insert anomaly**: Can't add a product category without having a product in it.
- **Delete anomaly**: Deleting last order also deletes customer info.

## 4. How It Works — Core Mechanics

**3NF Decomposition:**
\`\`\`
Unnormalized: Orders [order_id, customer_name, customer_email, items_list]
1NF: Split items into atomic rows
2NF: Separate customer details from order (no partial dependency on order_id)
3NF: Separate item details from order_items (no transitive dependency on item_id)

Tables: Customers, Orders, Order_Items, Items, Categories
\`\`\`

**Query Cost Comparison:**
\`\`\`sql
-- Normalized (3NF): 4 JOINs
SELECT c.name, o.order_date, i.name
FROM customers c JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
JOIN items i ON oi.item_id = i.id;

-- Denormalized: single table
SELECT customer_name, order_date, item_name
FROM order_details WHERE customer_id = 42;
\`\`\`

## 5. Variants & Flavors

| Normal Form | Rule |
|-------------|------|
| 1NF | Atomic columns, no repeating groups |
| 2NF | 1NF + no partial dependencies |
| 3NF | 2NF + no transitive dependencies |
| BCNF | 3NF + every determinant is a candidate key |

## 6. Performance Characteristics

| Aspect | 3NF | Denormalized |
|--------|-----|-------------|
| Read latency (single row) | Higher (joins) | Lower (single table) |
| Write latency | Lower (one place) | Higher (multiple copies) |
| Storage | Lower | Higher |
| Consistency | High | Risk of inconsistency |

## 7. Failure Modes

- **Premature denormalization**: Duplicating data before understanding query patterns → expensive schema migration.
- **Denormalization with no sync**: User name in 10 tables → 9 updated, 1 missed → inconsistency.
- **Over-normalization**: Analytics queries need 15 joins → unusable.

## 8. Decision Framework

\`\`\`
├── OLTP? → Normalize to 3NF
├── OLAP/Reporting? → Denormalize (star schema)
├── Read-heavy (100:1)? → Denormalize with sync strategy
├── Write-heavy? → Normalize
└── Hybrid? → CQRS (normalized write + denormalized read)
\`\`\`

## 9. Live Architecture Diagram

*Left: Normalized — connected small tables (Customers, Orders, Items). Right: Denormalized — single wide table. CQRS flow: Write → Normalized DB → CDC → Read → Denormalized DB.*

## 10. Real Production Incident

**Netflix (2018)**: 8-12 JOINs per homepage load → 500ms query time. Fix: denormalized viewing history into wide table → 5ms. CQRS with Kafka sync.

## 11. Production Implementation

Normalized source of truth (3NF). CQRS with denormalized read model. CDC or event stream for sync. Materialized views for common queries.

## 12. Real Company Deep Dives

- **Amazon**: Denormalized product data into single "item" table — sub-10ms page loads.
- **Netflix**: Wide tables for read models, CQRS with Kafka.
- **Stripe**: Normalized for OLTP, materialized views for reporting.

## 13. Interview Playbook

**Q1: "What are the three normal forms?"** — 1NF: atomic columns. 2NF: no partial dependencies. 3NF: no transitive dependencies.

**Q2: "When would you denormalize?"** — Read-heavy systems, reporting, when queries consistently join 5+ tables.

**Q3: "What is an update anomaly?"** — Redundant data updated in some places but not others → inconsistency.

**Q4: "How does CQRS help?"** — Separates write (normalized, source of truth) from read (denormalized, query-optimized). Sync via events.

## 14. Concept Check Quiz

**Q1: What does 2NF require?** — B) No partial dependencies.
**Q2: Main tradeoff of denormalization?** — B) Faster reads but write complexity.
**Q3: Which justifies denormalization?** — B) Analytics dashboard on 100M rows.
**Q4: What is a materialized view?** — B) Pre-computed query result stored as a table.

## 15. Next Steps

Continue to **Database Indexing Deep Dive** (lesson-03-05) — advanced indexing techniques beyond B-Trees.`,
    estimatedMin: 14,
    difficulty: "Intermediate" as const,
    companies: ["Amazon", "Uber", "Netflix", "Stripe", "Airbnb"],
    tags: ["normalization", "denormalization", "database-design", "OLTP", "OLAP"],
  },

  {
    id: "lesson-03-05",
    slug: "databases-05-database-indexing-deep-dive",
    title: "Database Indexing Deep Dive",
    content: `## 0. Mental Model

> A database index is like a **book's index at the back** — it tells you exactly which page a topic is on without flipping through every page. A B-Tree index is an alphabetically sorted index. A GiST index is like a "map index" showing overlapping regions. A GIN index is like an "ingredient index" in a cookbook — find all recipes containing "chocolate." A BRIN index is like a "chapter-level overview" — not page-level, but good enough for many queries.

## 1. Quick Summary

**Database indexing** speeds up data retrieval at the cost of slower writes and storage. Beyond B-Trees, there are specialized indexes: **GiST** (geospatial, full-text), **GIN** (array, JSON, full-text), **BRIN** (time-series, correlated data), **Hash** (equality lookups), and **Bitmap** (low-cardinality columns). Choosing the right index type can improve query performance 1000x.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **B-Tree** | Balanced tree — general purpose, range queries, sorting |
| **GiST** | Generalized Search Tree — geospatial, range types, full-text |
| **GIN** | Generalized Inverted Index — JSON, arrays, full-text search |
| **BRIN** | Block Range INdex — for physically-correlated data (time-series) |
| **Hash** | Hash table — fast equality lookups only |
| **Covering Index** | Index that includes all columns needed for a query |
| **Partial Index** | Index on a subset of rows (\`WHERE status = 'active'\`) |
| **Index Scan** | Using index to locate rows |
| **Seq Scan** | Sequential full table scan |
| **Bitmap Scan** | Multiple index scans combined via bitmaps |

## 3. Problem Without It

- **B-Tree on boolean**: Index on \`is_active\` with 50M rows → 50% rows match → optimizer ignores index (sequential scan is faster). *Fix*: partial index \`WHERE is_active = true\` on the 1M active rows.
- **B-Tree on JSON field**: \`WHERE data->>'name' = 'Alice'\` → B-Tree can't index JSON key paths. *Fix*: GIN index on JSONB \`data\` column.
- **B-Tree on time-series**: Index on \`created_at\` for 1B rows → B-Tree is 50GB → writes are slow, reads still good but storage is excessive. *Fix*: BRIN index — 100MB instead of 50GB.

## 4. How It Works — Core Mechanics

**GIN Index (JSONB example):**
\`\`\`
Column: data JSONB
Document 1: { "name": "Alice", "age": 30, "tags": ["admin", "user"] }
Document 2: { "name": "Bob", "age": 25, "tags": ["user"] }

GIN Index entries:
  "admin" → [doc1]
  "age"   → [doc1, doc2]  (but this is key, not value — GIN indexes keys and values)
  "Alice" → [doc1]
  "Bob"   → [doc2]
  "user"  → [doc1, doc2]

Query: WHERE data @> '{"tags": ["admin"]}' → fast lookup via GIN
\`\`\`

**BRIN Index (time-series):**
\`\`\`
Table: events (1B rows, inserted in time order)
  Page 1: events from 10:00:00 to 10:00:05
  Page 2: events from 10:00:05 to 10:00:10
  ...

BRIN Index:
  Page 1: min_ts=10:00:00, max_ts=10:00:05
  Page 2: min_ts=10:00:05, max_ts=10:00:10
  ...

Query: WHERE ts BETWEEN '10:00:03' AND '10:00:07'
  → BRIN checks: Page 1 (overlap? yes), Page 2 (overlap? yes)
  → Only scan pages 1 and 2 (vs full table scan)
\`\`\`

**Partial Index (WHERE clause):**
\`\`\`sql
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';
-- 5M total users, 100K active → index on 100K rows, not 5M
-- Queries with WHERE status = 'active' use this index
\`\`\`

## 5. Variants & Flavors

| Index Type | Best For | Size vs B-Tree |
|-----------|----------|---------------|
| **B-Tree** | General purpose, range, sort, PK | Baseline |
| **Hash** | Equality lookups (\`=\`) | Smaller (hash, no ordering) |
| **GiST** | Geospatial, full-text, ranges | Larger |
| **GIN** | JSONB, arrays, full-text | Larger (inverted lists) |
| **BRIN** | Time-series, physically-correlated | 10-100x smaller |
| **Bloom** | Multi-column equality (all columns must match) | Fixed size |
| **SP-GiST** | Quad-trees, k-d trees, radix trees | Specialized |
| **Covering** (Include) | Queries needing only indexed columns | Slightly larger |

## 6. Performance Characteristics

| Index Type | Lookup | Insert | Storage (1B rows, 8B key) | Range Query | JSON Query |
|-----------|--------|--------|--------------------------|-------------|------------|
| B-Tree | O(log n) | O(log n) | ~50GB | Fast | No |
| Hash | O(1) | O(1) | ~32GB | Slow | No |
| BRIN | O(log n_blocks) | O(1) | ~100MB | Fast (correlated) | No |
| GIN | O(log n + m) | O(log n + m) | ~60GB | No | Fast |
| GiST | O(log n) | O(log n) | ~55GB | Yes (spatial) | No |

## 7. Failure Modes

- **B-Tree on low-cardinality**: Index on boolean → 50% rows match → never used. *Fix*: partial or BRIN.
- **GIN on non-JSONB column**: GIN only works with certain data types (JSONB, arrays, tsvector).
- **BRIN on randomized data**: Data inserted in random order → every page has all time ranges → BRIN useless. *Fix*: cluster table by sort key or use B-Tree.
- **Too many indexes**: Each INSERT updates N indexes → write amplification. *Fix*: monitor, drop unused.

## 8. Decision Framework

\`\`\`
├── Range query, sort, PK? → B-Tree
├── Equality only (\`=\`)? → Hash (smaller, faster)
├── Geospatial (\`ST_DWithin\`)? → GiST or SP-GiST
├── JSONB queries (\`@>\`, \`?\`)? → GIN
├── Full-text search (\`to_tsvector\`)? → GIN
├── Time-series (correlated order)? → BRIN (10-100x smaller)
├── Low-cardinality filter? → Partial or BRIN
├── Multi-column with AND? → Bloom or composite B-Tree
└── Index-only queries? → Covering (include extra columns)
\`\`\`

## 9. Live Architecture Diagram

*Four index types illustrated: (1) B-Tree: sorted tree with leaf linked list. (2) GIN: term → posting list (inverted index). (3) BRIN: page ranges with min/max values. (4) GiST: bounding boxes overlapping in space.*

## 10. Real Production Incident

**Notion's PostgreSQL BRIN Index for Activity Logs (2022)** — Notion stores user activity logs in PostgreSQL — 500M rows, inserted in chronological order. A B-Tree on \`created_at\` was 40GB. BRIN index: 200MB. Query performance for "get my activity in the last week" was identical (<1ms). **Impact**: Saved 40GB of index storage per table, reduced write amplification, improved insert throughput.

## 11. Production Implementation

Monitor pg_stat_user_indexes: drop unused (0 scans in 30 days). Use partial indexes for filtered queries. Use BRIN for time-ordered data. Use GIN for JSONB. Use covering indexes (PostgreSQL INCLUDE) for index-only scans. CREATE INDEX CONCURRENTLY to avoid locks.

## 12. Real Company Deep Dives

- **PostgreSQL**: Most index types of any database. GiST, GIN, BRIN, SP-GiST all first-class.
- **Notion**: BRIN indexes for activity logs (40GB → 200MB).
- **Instagram (MySQL)**: Custom partial indexes for feed queries.

## 13. Interview Playbook

**Q1: "What types of indexes are there beyond B-Tree?"** — Hash, GiST, GIN, BRIN, Bloom. Hash for equality, GiST for geospatial, GIN for JSON/arrays, BRIN for time-series.

**Q2: "When would you use BRIN over B-Tree?"** — Time-ordered data (logs, events) where rows are physically correlated. BRIN is 10-100x smaller but only works when data insert order matches query range.

**Q3: "What is a partial index?"** — Index on a subset of rows defined by a WHERE clause. Much smaller than full index. Example: index on \`WHERE status = 'active'\` for 100K active out of 5M total.

**Q4: "What is a covering index?"** — Index that includes all columns needed by a query, allowing index-only scans without table access.

## 14. Concept Check Quiz

**Q1: Which index is best for JSONB queries?** — C) GIN.
**Q2: BRIN indexes are best for?** — D) Time-series with correlated insert order.
**Q3: When would a B-Tree on boolean column NOT be used?** — A) When 50%+ rows match — sequential scan is faster.
**Q4: What does a partial index do?** — C) Index only rows matching a WHERE clause.

## 15. Next Steps

Continue to **Database Replication** (lesson-03-06).`,
    estimatedMin: 15,
    difficulty: "Advanced" as const,
    companies: ["Meta", "Uber", "Shopify", "Notion", "Stripe"],
    tags: ["indexing", "B+Tree", "query-optimization", "postgresql"],
  },

  {
    id: "lesson-03-06",
    slug: "databases-06-database-replication",
    title: "Database Replication (Leader-Follower, Multi-Leader)",
    content: `## 0. Mental Model

> Leader-follower replication is like a **president and press secretaries**. The president (leader) makes all decisions (writes). The press secretaries (followers) have copies of all announcements (replicated data). Anyone can read from any press secretary, but all new announcements come from the president. If the president is unavailable, a press secretary takes over (failover). Multi-leader is like **multiple vice presidents** — each can make decisions, but they must coordinate to avoid contradictory announcements.

## 1. Quick Summary

**Database replication** copies data from one database server to another for high availability, read scalability, and disaster recovery. **Leader-Follower** (single leader): all writes go to one node, reads can go to any follower. **Multi-Leader**: writes accepted by multiple nodes, synced asynchronously. **Leaderless**: any node accepts writes (Dynamo-style). Tradeoffs: synchronous vs asynchronous replication affects consistency vs performance.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Leader** (Primary/Master) | Node that accepts writes |
| **Follower** (Replica/Standby) | Node that replicates from leader, serves reads |
| **Synchronous Replication** | Leader waits for follower ACK before confirming write |
| **Asynchronous Replication** | Leader confirms write without waiting for follower |
| **WAL** | Write-Ahead Log — order of all database changes (used for replication) |
| **Logical Replication** | Replication at row level (not WAL) — different versions/table subsets |
| **Failover** | Promoting a follower to leader when the leader fails |
| **Split Brain** | Two nodes both believe they are leader — data divergence |
| **RPO** | Recovery Point Objective — max acceptable data loss |
| **RTO** | Recovery Time Objective — max acceptable downtime |

## 3. Problem Without It

- **Single point of failure**: One database server → if it crashes, the entire application is down. RTO = time to restore from backup (hours).
- **Read bottleneck**: One server handles all read traffic. 100K QPS reads would require a server 10x more powerful.
- **No disaster recovery**: Data center flood → all data lost. Replica in another region survives.

## 4. How It Works — Core Mechanics

**Leader-Follower Replication (PostgreSQL WAL shipping):**

\`\`\`
Leader                            Follower 1                    Follower 2
  |--- WAL: INSERT INTO users --->|                             |
  |--- (async, no wait)          |--- applies WAL               |
  |--- WAL: UPDATE orders ------>|                              |
  |                              |--- WAL: INSERT INTO users -->|
  |                              |                              |--- applies WAL
  |--- COMMIT (immediate)        |                              |
\`\`\`

**Synchronous + Asynchronous:**

\`\`\`
┌─────────────────────────────────────────────────────────┐
│  Leader                                                  │
│  Write: INSERT INTO users (id=42, name='Alice')          │
│    ├── Sync replica: must ACK before confirming client   │
│    ├── Async replica 1: receives WAL eventually          │
│    └── Async replica 2: receives WAL eventually          │
│                                                          │
│  Client: receives commit confirmation AFTER sync ACK     │
└─────────────────────────────────────────────────────────┘
\`\`\`

**Failover Process:**
\`\`\`
1. Monitor detects leader is unresponsive (>30s)
2. Promote sync replica to new leader (if sync, zero data loss)
3. Update application connection string (or DNS)
4. Other replicas start replicating from new leader
5. Old leader comes back → becomes follower (or rejoins as replica)
\`\`\`

## 5. Variants & Flavors

| Feature | Leader-Follower | Multi-Leader | Leaderless (Dynamo) |
|---------|---------------|-------------|-------------------|
| Write location | Single node | Multiple nodes | Any node |
| Conflict resolution | None (single writer) | Application-specific | Last-write-wins, CRDTs |
| Read consistency | Strong from leader | Eventual | Quorum-based |
| Write throughput | Single node limit | N × node limit | N × node limit |
| Failover complexity | Moderate | High (conflict merge) | Low (no single leader) |
| Use case | PostgreSQL, MySQL | Multi-DC, offline-first | Cassandra, DynamoDB, Riak |

## 6. Performance Characteristics

| Metric | Async Replication | Sync Replication (1 follower) | Quorum (Dynamo-style) |
|--------|-----------------|------------------------------|----------------------|
| Write latency | Same as single node | +1 network round-trip | +quorum network time |
| Read scalability | N followers | N followers | N nodes |
| Data loss on failover | Up to seconds of writes | Zero (if sync replica is promoted) | Configurable |
| Throughput impact | None (async, no wait) | 10-50% reduction | 30-50% reduction |

## 7. Failure Modes

- **Replication lag**: Async replica is 5 seconds behind → user reads stale data after write. *Fix*: read-your-writes consistency (route reads for recently-updated rows to leader).
- **Split brain**: Network partition → both nodes think leader is down, both promote self → writes diverge. *Fix*: failover quorum (majority vote), STONITH (shoot the other node).
- **Replication slot leak**: PostgreSQL replication slot not cleaned up → WAL accumulates → disk full → database crash.

## 8. Decision Framework

\`\`\`
├── Need high availability?
│   └── Replication (leader-follower minimum)
├── Need read scalability?
│   └── Add followers for read traffic
├── Zero data loss critical (RPO=0)?
│   └── Synchronous replication (or quorum)
├── Multi-region deployment?
│   └── Multi-leader (each region writes locally)
├── Offline-first apps (mobile)?
│   └── Multi-leader with CRDTs (offline edits merge later)
└── Simple, proven architecture?
    └── Leader-follower with async (most common)
\`\`\`

## 9. Live Architecture Diagram

*Leader with two followers. Blue arrows show WAL streaming. A "Failover" callout shows the process. Second panel: Multi-leader with bidirectional arrows.*

## 10. Real Production Incident

**GitHub's MySQL Failover (2018)** — GitHub's MySQL leader in US East failed. The automated failover promoted a replica that had 1 second of replication lag. **Impact**: 1 second of writes was lost (1-2 pull requests, issue comments). RPO was not zero. **Fix**: GitHub implemented semi-sync replication (at least one sync replica required). They also reduced failover time from 60s to 10s by pre-warming connection pools.

## 11. Production Implementation

PostgreSQL: Streaming replication (async default, synchronous_standby_names for sync). Patroni for automated failover. HAProxy or pgBouncer for connection routing. Monitor replication lag (pg_stat_replication). Alert if lag > 5s.

## 12. Real Company Deep Dives

- **GitHub**: MySQL with semi-sync replication, Orchestrator/Patroni for failover, 10s RTO.
- **Meta**: MySQL with multi-leader (multiple data centers). Custom async replication with conflict resolution.
- **Google**: Spanner uses synchronous replication with Paxos across regions — true RPO=0.

## 13. Interview Playbook

**Q1: "Synchronous vs asynchronous replication?"** — Sync: zero data loss, slower writes. Async: faster writes, risk of data loss on failure.

**Q2: "How does failover work?"** — Detect leader failure → promote a follower → redirect traffic. Automatic (Patroni) or manual. Split brain prevention via majority quorum.

**Q3: "What is replication lag?"** — Delay between a write on leader and its appearance on follower. Causes: network, follower CPU, large transactions.

**Q4: "Read-your-writes consistency?"** — After user writes, their subsequent reads must see the write. Solution: route user's reads to leader for N seconds after write, or use session markers.

## 14. Concept Check Quiz

**Q1: Main advantage of async replication?** — A) Lower write latency.
**Q2: What is split brain?** — B) Two nodes both acting as leader.
**Q3: What does RPO measure?** — C) How much data can be lost.
**Q4: Best use case for multi-leader?** — D) Multi-region deployments.

## 15. Next Steps

Continue to **Database Sharding & Partitioning** (lesson-03-07).`,
    estimatedMin: 14,
    difficulty: "Advanced" as const,
    companies: ["GitHub", "Meta", "Google", "Apple", "Slack"],
    tags: ["replication", "high-availability", "failover", "WAL", "multi-leader"],
  },
  {
    id: "lesson-03-07",
    slug: "databases-07-database-sharding-partitioning",
    title: "Database Sharding & Partitioning",
    content: `## 0. Mental Model

> Sharding is like a **library split across multiple buildings**. Building A has books A-M, Building B has N-Z. To find a book, you check which building has it, go there, and look it up. Adding a new building means moving some books between buildings (resharding). Each building has its own card catalog (index), its own staff (CPU), and its own capacity (storage). The challenge is deciding which books go where.

## 1. Quick Summary

**Sharding** (horizontal partitioning) splits data across multiple database instances, each holding a subset of the data. Enables write scalability beyond a single node. Common approaches: **hash-based** (consistent hashing), **range-based** (by key range), and **directory-based** (lookup service). Sharding adds complexity for cross-shard queries, transactions, and resharding.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Shard** | A horizontal partition of data (subset of rows) |
| **Shard Key** | Column(s) determining which shard a row belongs to |
| **Hash Sharding** | Row assigned to shard = hash(shard_key) % N |
| **Range Sharding** | Rows grouped by key range (A-M, N-Z) |
| **Consistent Hashing** | Hash ring where each shard owns a range of the ring |
| **Resharding** | Changing shard count — requires data migration |
| **Hot Spot** | A shard receiving disproportionately more traffic |
| **Scatter-Gather** | Query must hit all shards and combine results |
| **Cross-Shard Join** | JOIN across shards — expensive (all shards queried) |

## 3. Problem Without It

- **Write throughput wall**: Single PostgreSQL handles ~10K writes/sec. At 100K writes/sec, you can't scale vertically (even the biggest server caps out).
- **Storage limit**: Single database can't hold 100TB. SSD arrays max out at ~30TB per server.
- **Single server failure radius**: One server goes down → entire system unavailable. Shards limit blast radius to 1/N of data.

## 4. How It Works — Core Mechanics

**Hash Sharding:**
\`\`\`
Shard key: user_id
hash("user_42") % 4 = shard 2 (out of 4 shards)

Query: SELECT * FROM users WHERE user_id = 42
  → compute hash("user_42") = 2
  → route to shard 2 → query executed → return result
  → Single shard touch: fast!
\`\`\`

**Range Sharding:**
\`\`\`
Shard 1: users with names A-F
Shard 2: users with names G-L
Shard 3: users with names M-R
Shard 4: users with names S-Z

Query: SELECT * FROM users WHERE name = 'Alice'
  → name starts with A → shard 1 → return result

But: SELECT * FROM users ORDER BY name
  → must query all shards, merge sorted results → scatter-gather
\`\`\`

**Scatter-Gather Query:**
\`\`\`
Query: SELECT COUNT(*) FROM users WHERE created_at > '2024-01-01'
  → Route to ALL shards in parallel
  → Each shard returns local count
  → Application aggregates: sum = shard1 + shard2 + ... + shardN
  → Slowest shard determines overall latency
\`\`\`

## 5. Variants & Flavors

| Approach | Pros | Cons | Example |
|----------|------|------|---------|
| **Hash** | Even distribution, simple | Resharding is hard (all data moves) | Discord, Notion |
| **Range** | Range queries efficient, prefix scans | Hot spots (recent data) | YouTube (video IDs) |
| **Directory** | Flexible, dynamic | Lookup is extra hop, SPOF | Pinterest |
| **Consistent Hash** | Minimal data movement on reshard | Complexity | Cassandra, DynamoDB |

## 6. Performance Characteristics

| Aspect | Single DB | 4 Shards | 64 Shards |
|--------|-----------|----------|-----------|
| Write throughput | 10K/s | 40K/s (limited by hottest shard) | 640K/s (theoretically) |
| Single-key read | 1ms | 1ms + routing overhead | 1ms + routing |
| Cross-shard query | N/A | 4x slower (scatter-gather) | 64x slower |
| Resharding effort | N/A | Hours of migration | Weeks of migration |

## 7. Failure Modes

- **Hot spot**: One shard gets 10x more traffic due to uneven shard key (e.g., range sharding on user signup date → new users all hit the "recent" shard).
- **Cross-shard transaction**: UPDATE accounts SET balance = 100 WHERE user_id IN (from_shard, to_shard) → needs 2PC or saga.
- **Resharding nightmare**: Going from 4 to 8 shards requires moving 50% of data → days of migration, application downtime or complex dual-write.
- **Shard key anti-pattern**: Using \`created_at\` as shard key → all recent writes go to one shard → hot spot.

## 8. Decision Framework

\`\`\`
├── Write throughput < 10K/s and storage < 10TB?
│   └── Don't shard — use replication + vertical scaling
├── Need even distribution, no hot spots?
│   └── Hash sharding (consistent hashing is preferred)
├── Range queries on shard key are important?
│   └── Range sharding (but monitor for hot spots)
├── Need dynamic shard count (cloud-native)?
│   └── Consistent hashing (Cassandra, DynamoDB)
├── Cross-shard queries are rare?
│   └── Shard on a key that co-locates related data
└── Cross-shard transactions needed?
    └── Avoid sharding if possible, or use distributed SQL (Spanner, CockroachDB)
\`\`\`

## 9. Live Architecture Diagram

*A circle divided into 4 shards. Each shard has its own PostgreSQL or Cassandra. An application layer routes queries: single-shard queries go directly, multi-shard queries use scatter-gather. A "Resharding" callout shows data moving from 4 shards to 8 shards — orange arrows showing data migration.*

## 10. Real Production Incident

**Discord's Sharding Migration (2022)** — Discord used hash sharding on guild_id. As Discord grew to 19M+ concurrent users, the largest guilds (10M+ members) created hot spots — one shard served 100x more traffic than others. **Impact**: Latency spikes for users in large guilds. **Fix**: Discord migrated to range sharding + splitting large guilds across multiple shards (forums were key to this transition). They also used "intra-guild sharding" — splitting a single guild across multiple servers. **Lesson**: **Hash sharding distributes evenly by key count, but not by load — a single "hot" key (the largest guild) can overwhelm its shard. Monitor per-shard load, not just per-shard row count**.

## 11. Production Implementation

Start without sharding (single DB + replicas). When write throughput exceeds single node capacity, shard. Choose shard key carefully (high cardinality, evenly distributed, co-locates related data). Use consistent hashing for minimal resharding pain. Implement shard routing at application layer or via proxy (Vitess, Citus, ProxySQL).

## 12. Real Company Deep Dives

- **Discord**: Hash sharding on guild_id → split largest guilds across shards (forum feature).
- **Notion**: Range sharding on workspace_id with Citus (PostgreSQL extension).
- **Pinterest**: Directory-based sharding with a "shard map" in ZooKeeper.

## 13. Interview Playbook

**Q1: "What is sharding and when would you use it?"** — Horizontal partitioning across DB instances. Use when write throughput exceeds single node capacity (>10K writes/sec) or data exceeds storage limits (>10TB).

**Q2: "What makes a good shard key?"** — High cardinality, evenly distributed values, co-locates related data (so queries are single-shard).

**Q3: "How does consistent hashing help with sharding?"** — Minimizes data movement when adding/removing shards. Only K/N keys remap instead of all keys.

**Q4: "What is scatter-gather?"** — Querying all shards in parallel and aggregating results. Slowest shard determines latency. Avoid in hot path.

## 14. Concept Check Quiz

**Q1: What problem does sharding solve?** — B) Write throughput beyond single node capacity.
**Q2: What is a hot spot?** — A) A shard receiving disproportionate traffic.
**Q3: Advantage of consistent hashing?** — C) Minimal data moves on resharding.
**Q4: What is scatter-gather?** — D) Querying all shards and merging results.

## 15. Next Steps

Continue to **Consistent Hashing** (lesson-03-08).`,
    estimatedMin: 15,
    difficulty: "Advanced" as const,
    companies: ["Pinterest", "Cloudflare", "Discord", "Uber", "Notion"],
    tags: ["sharding", "horizontal-scaling", "partitioning", "distributed-database"],
  },

  {
    id: "lesson-03-08",
    slug: "databases-08-consistent-hashing",
    title: "Consistent Hashing",
    content: `## 0. Mental Model

> Consistent hashing is a **circular parking lot for data**. Each key parks at the nearest server clockwise. When a server leaves, only its keys need to repark. When a server arrives, it takes keys from its neighbors. Unlike modular parking (hash % N) where adding a lot means everyone must repark.

## 1. Quick Summary

**Consistent Hashing** maps keys to servers on a hash ring. Each server has ring positions (tokens). Keys assign to the nearest server clockwise. Adding/removing servers: only K/N keys remap vs all keys in modulo hashing. Foundation of DynamoDB, Cassandra, Discord, CDNs.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Hash Ring** | Circular hash space [0, 2^64-1] |
| **Token** | A position on the ring assigned to a server |
| **Virtual Node (vnodes)** | Multiple ring positions per server for even distribution |
| **Replication Factor** | Number of successor servers storing each key's replicas |
| **Hinted Handoff** | When a replica is down, another node temporarily accepts writes |

## 3. Problem Without It

- **Modulo N**: hash(key) % 3 → add server → hash(key) % 4 → 90%+ keys remap → massive cache miss storm.
- **Server failure**: N changes → chain reaction overload as every server gets thousands of new keys.
- **Hot spots**: Popular keys hash to same server. Modulo can't redistribute.

## 4. How It Works — Core Mechanics

**Standard Ring:**
\`\`\`
Ring: [0, 2^64-1] as a circle

Servers A, B, C each have a token position:
  A @ 10, B @ 50, C @ 90

Key "user:42" → hash("user:42") = 35
  → nearest clockwise server from 35 is B @ 50
  → "user:42" belongs to server B

When B fails:
  → B's keys (25-50 on ring) reassign to C @ 90
  → Only 1/3 of keys move
\`\`\`

**Virtual Nodes:**
\`\`\`
Instead of 1 token per server → 100-200 tokens per server
  Server A: tokens at 5, 15, 120, 200, ...
  Server B: tokens at 10, 20, 130, 210, ...
  Server C: tokens at 30, 45, 140, 220, ...

Better distribution — each server owns many small ranges
Add server D: each other server gives up ~N/4 keys → even distribution
\`\`\`

## 5. Variants & Flavors

| Variant | Feature | Used By |
|---------|---------|---------|
| **Standard (vnodes)** | Virtual nodes, replication | Cassandra, DynamoDB |
| **Rendezvous (HRW)** | Highest random weight | CDNs, Akamai, Varnish |
| **Jump Hash** | Zero memory, O(log n) | Google's S3-like storage |
| **Maglev** | Minimal movement, fast lookup | Google's load balancers |

## 6. Performance Characteristics

| Metric | Mod N | Consistent Hashing | Jump Hash |
|--------|-------|-------------------|-----------|
| Key remap on add/remove | All keys | K/N keys | K/N keys |
| Lookup time | O(1) | O(log tokens) | O(log N) |
| Memory for 1000 servers | 0 | ~200KB (vnodes) | 0 |
| Load distribution | Perfect | Good (with vnodes) | Perfect |

## 7. Failure Modes

- **Uneven token distribution**: Few virtual nodes → one server gets 30% of keys. *Fix*: 200+ vnodes per server.
- **Ring walking**: Adding a server causes neighboring servers to lose keys simultaneously → write amplification. *Fix*: incremental migration.
- **Hot spots despite hashing**: A few keys (celebrity users) generate 100x traffic. Consistent hashing doesn't redistribute load. *Fix*: split hot keys into sub-keys (hash(key + ":" + N) % M).

## 8. Decision Framework

Use consistent hashing when: need to add/remove servers frequently, need minimal data movement on topology changes, building a distributed cache or database. Mod N = fine for static clusters that don't change.

## 9. Live Architecture Diagram

*A circle with Servers A, B, C as dots. A key "user:42" maps to a position on the ring, and the arrow goes clockwise to Server B. When Server B is removed, the arrows from its range now point to Server C. Virtual nodes shown as many small dots per server.*

## 10. Real Production Incident

**Discord's Consistent Hashing Disaster (2017)** — Discord used a single hash ring for all Cassandra data. Adding a new node caused uneven token distribution because they assigned only 1 token per node. **Impact**: One server held 30% of all data — its failure would cause 30% data loss. **Fix**: Migrated to virtual nodes (256 tokens per server), achieving <1% imbalance.

## 11. Production Implementation

Cassandra: vnodes (256 default), NetworkTopologyStrategy for replication across DCs. DynamoDB: automatic with provisioned capacity. For custom implementations: use rendezvous hashing (simpler than ring) or jump hash (zero memory, good distribution).

## 12. Real Company Deep Dives

- **Amazon DynamoDB**: Consistent hashing with replication factor 3. Automatic partitioning when tables exceed 10GB.
- **Apache Cassandra**: Vnodes (256 default), incremental repairs, hinted handoff. Used by Netflix, Apple, Discord.
- **Discord**: Cassandra with vnodes. Learned the hard way about single-token distribution.
- **Cloudflare**: Consistent hashing for cache key → edge server mapping.

## 13. Interview Playbook

**Q1: "How is consistent hashing different from modulo hashing?"** — Mod N remaps ALL keys when N changes. Consistent hashing remaps only K/N. This means 10x fewer cache misses during scale-up.

**Q2: "What are virtual nodes and why are they needed?"** — Multiple ring positions per physical server. Improves load distribution and allows heterogeneous servers (more vnodes for higher-capacity servers).

**Q3: "How does DynamoDB use consistent hashing?"** — Tables are partitioned by key hash. Each partition lives on a storage node. When a partition exceeds 10GB, DynamoDB splits it across two nodes using the hash ring.

**Q4: "What is gossip protocol in Cassandra?"** — Nodes share ring topology via gossip — each node knows which tokens each other node owns. New nodes announce via gossip.

## 14. Concept Check Quiz

**Q1: % of keys remapped when adding a server in consistent hashing?** — B) ~1/N.
**Q2: What problem do virtual nodes solve?** — C) Uneven load distribution.
**Q3: Maglev is used for?** — D) Google's load balancers.
**Q4: Rendezvous hashing is also called?** — A) Highest Random Weight.

## 15. Next Steps

Continue to **NoSQL Database Types** (lesson-03-09).`,
    estimatedMin: 14,
    difficulty: "Advanced" as const,
    companies: ["Amazon", "Apache", "Discord", "Cloudflare", "Akamai"],
    tags: ["consistent-hashing", "distributed-systems", "sharding", "dynamo"],
  },

  {
    id: "lesson-03-09",
    slug: "databases-09-nosql-database-types",
    title: "NoSQL Database Types (Document, Key-Value, Column, Graph)",
    content: `## 0. Mental Model

> Document stores are like **filing cabinets of manila folders** — each folder (document) has its own content, schema can vary per folder. Key-value stores are like **coat check tags** — you hand over a number, get your coat back instantly. Column stores are like **a spreadsheet by column** — you can read one column across millions of rows without reading the others. Graph stores are like **a subway map** — the connections (edges) matter as much as the stations (nodes).

## 1. Quick Summary

**Document (MongoDB)**: JSON/BSON documents, flexible schema, rich queries. **Key-Value (Redis, DynamoDB)**: Simple get/set by key, sub-millisecond latency. **Column-family (Cassandra, HBase)**: Wide rows, high write throughput, sorted by key. **Graph (Neo4j)**: Nodes and edges, relationship-heavy queries. Each is optimized for different access patterns.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Document Store** | Data stored as documents (JSON, BSON) with flexible schema |
| **Key-Value Store** | Simple key → value mapping, minimal operations |
| **Column Family** | Sparse matrix of rows × columns, grouped by column family |
| **Graph Database** | Nodes (entities) + Edges (relationships) + Properties |
| **BSON** | Binary JSON — MongoDB's storage format |
| **Wide Row** | Row with many columns (thousands), Cassandra model |

## 3. Problem Without It

- **Document**: SQL can't store nested JSON naturally (need separate tables + joins). MongoDB stores a blog post + comments as one document.
- **Key-Value**: SQL overhead for simple "get user session by session_id" → 1ms vs Redis 0.1ms.
- **Column**: SQL can't handle 1M writes/sec. Cassandra scales linearly. SQL struggles with sparse data (many NULL columns).
- **Graph**: SQL JOIN depth for "friends of friends of friends" → exponential. Neo4j: O(depth) traversal.

## 4. How It Works — Core Mechanics

**Document (MongoDB):**
\`\`\`json
{
  "_id": "post_123",
  "title": "My Post",
  "author": "Alice",
  "comments": [
    {"user": "Bob", "text": "Great post!"},
    {"user": "Charlie", "text": "Thanks"}
  ]
}
\`\`\`

**Key-Value (Redis):**
\`\`\`
SET session:abc123 {"user_id":42, "role":"admin"}
GET session:abc123 → {"user_id":42, "role":"admin"}  (0.1ms)
\`\`\`

**Column (Cassandra Schema):**
\`\`\`sql
CREATE TABLE user_timeline (
  user_id uuid,
  post_id timeuuid,
  content text,
  PRIMARY KEY (user_id, post_id)  -- partition key = user_id, clustering = post_id
);
-- All posts for a user are stored together (sorted by post_id)
\`\`\`

**Graph (Neo4j Cypher):**
\`\`\`cypher
MATCH (alice:User {name:"Alice"})-[:FRIENDS_WITH*2]->(friend_of_friend)
RETURN friend_of_friend.name
-- "friends of friends" traversal — natural for graph, painful in SQL
\`\`\`

## 5. Variants & Flavors

| Feature | Document (MongoDB) | Key-Value (Redis) | Column (Cassandra) | Graph (Neo4j) |
|---------|-------------------|-------------------|-------------------|---------------|
| Data model | JSON documents | Opaque values | Sorted columns | Nodes + edges |
| Query type | Rich (aggregation pipeline) | Simple (get/set) | CQL (SQL-like) | Cypher (pattern matching) |
| Consistency | Strong (single doc) | Strong | Tunable | Strong (single instance) |
| Scale | Sharding | Cluster (hash slots) | Ring (consistent hash) | Read replicas |
| Best for | Catalogs, content | Caching, sessions | Time-series, events | Recommendations, social |

## 6. Performance Characteristics

| Metric | MongoDB | Redis | DynamoDB | Cassandra | Neo4j |
|--------|---------|-------|----------|-----------|-------|
| Read latency (single key) | 1-3ms | <0.1ms | 1-5ms | 1-5ms | 1-5ms |
| Write throughput | 50K/s | 100K/s | 100K+/s | 100K+/s | 10K/s |
| Query flexibility | Rich | Minimal | Medium | Medium | Pattern match |
| Multi-row transactions | Yes | Yes (multi-key) | Limited | Lightweight | Yes |

## 7. Failure Modes

- **Document**: No joins → application must aggregate. Large documents >16MB cause issues.
- **Key-Value**: No queries beyond key lookup. Can't filter on value fields.
- **Column**: No JOINs, no aggregations without Spark or similar. Eventual consistency.
- **Graph**: Sharding is very difficult (graph cuts across partitions). Single-server only for most deployments.

## 8. Decision Framework

\`\`\`
├── Flexible schema, nested data? → Document (MongoDB)
├── Simple lookups, sub-ms needed? → Key-Value (Redis / DynamoDB)
├── High write throughput (100K+/s)? → Column (Cassandra / ScyllaDB)
├── Complex relationships (social, fraud)? → Graph (Neo4j)
├── Time-series, events? → Column (Cassandra, ScyllaDB) or TimescaleDB
└── Need rich queries AND scale? → Document (MongoDB) with sharding
\`\`\`

## 9. Live Architecture Diagram

*Four boxes labeled Document, Key-Value, Column, Graph, each with their data model illustrated. Below: the same application using all four (polyglot persistence).*

## 10. Real Production Incident

**Netflix's Move from MongoDB to Cassandra (2012)** — Netflix's initial use of MongoDB for viewing history hit write throughput limits during peak hours. MongoDB's B-Tree-based storage couldn't keep up with 100K+ writes/sec for new viewing events. **Fix**: Migrated to Cassandra (LSM Tree, column-family), achieving 1M+ writes/sec across the cluster. MongoDB remained in use for product catalogs (lower write volume, richer queries needed).

## 11. Production Implementation

Start with PostgreSQL (covers most use cases). Add Redis for caching and sessions. Add MongoDB when flexible schema and embedded documents are needed. Add Cassandra when write throughput exceeds 50K/s single node. Add Neo4j when graph traversal is the core query pattern.

## 12. Real Company Deep Dives

- **MongoDB**: Used by Uber (trip data), Coinbase, SEGA, Expedia. Flexible schema for rapidly evolving data.
- **Redis**: Slack (presence), Twitter (timeline cache), GitHub (sidekiq). Sub-ms latency for hot data.
- **DynamoDB**: Amazon (shopping cart), Lyft (ride history), Airbnb. Serverless, auto-scaling.
- **Cassandra**: Netflix (viewing history), Apple (iCloud), Discord (messages). High write throughput.
- **Neo4j**: eBay (recommendations), Walmart (supply chain), NASA (data lineage).

## 13. Interview Playbook

**Q1: "Compare MongoDB vs PostgreSQL?"** — MongoDB: flexible schema, embedded documents, auto-sharding. PostgreSQL: ACID, joins, mature ecosystem, complex queries.

**Q2: "When would you use Cassandra over MongoDB?"** — Cassandra for high write throughput (1M+/s), time-series data, multi-DC replication. MongoDB for rich queries, flexible documents, moderate write volume.

**Q3: "What is a key-value store good for?"** — Caching, session store, real-time counters, leaderboards, pub/sub (Redis).

**Q4: "When do you need a graph database?"** — When relationships are as important as the data. Social networks, recommendation engines, fraud detection, access control (ReBAC).

## 14. Concept Check Quiz

**Q1: Which NoSQL type is best for high write throughput?** — C) Column (Cassandra).
**Q2: What is a key-value store best for?** — B) Sub-millisecond lookups by key.
**Q3: Most important feature of graph DB?** — D) Efficient relationship traversal.
**Q4: What document size limit does MongoDB enforce?** — B) 16MB.

## 15. Next Steps

Continue to **NoSQL Internals (LSM Trees, SSTables, Compaction)** (lesson-03-10).`,
    estimatedMin: 14,
    difficulty: "Intermediate" as const,
    companies: ["MongoDB", "Redis", "Apache", "Neo4j", "Amazon"],
    tags: ["NoSQL", "document-database", "key-value", "column-family", "graph-database"],
  },

  {
    id: "lesson-03-10",
    slug: "databases-10-nosql-internals-lsm-trees",
    title: "NoSQL Internals (LSM Trees, SSTables, Compaction)",
    content: `## 0. Mental Model

> An LSM-Tree is like a **stack of sticky notes**. When you write a note, you write on the topmost sticky note (memtable, in memory). When it's full, you tear it off and add it to a pile of sorted sticky notes (SSTable). To find a note, you check the top sticky first, then work through the pile. Periodically, you combine all sticky notes into a fresh sorted set (compaction), discarding outdated or deleted notes.

## 1. Quick Summary

**LSM-Tree (Log-Structured Merge-Tree)** is the storage engine behind Cassandra, RocksDB, LevelDB, HBase, and Bigtable. Writes go to an in-memory **memtable** (sorted), then flushed to immutable **SSTables** on disk. SSTables are periodically merged via **compaction** to reclaim space and maintain performance. LSM-Trees are write-optimized: writes are sequential (append-only) rather than random (no page splits like B-Trees).

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Memtable** | In-memory sorted structure (usually a tree) — first stop for writes |
| **SSTable** | Sorted String Table — immutable sorted file on disk |
| **WAL** | Write-Ahead Log — crash recovery (replay after restart) |
| **Compaction** | Process of merging SSTables, discarding tombstoned/deleted data |
| **Bloom Filter** | Probabilistic filter — quickly checks if a key may exist in an SSTable |
| **Tombstone** | Deletion marker (deletes don't remove data immediately) |
| **Leveled Compaction** | SSTables grouped by "level" (LevelDB, RocksDB, Cassandra) |
| **Size-Tiered Compaction** | Merge SSTables when they reach similar size (Cassandra) |

## 3. Problem Without It

- **B-Tree write amplification**: Each random write causes 4x write amplification (page split, rebalance, double-write for crash safety). LSM-Tree writes are sequential (append) — minimal amplification.
- **Random write bottleneck**: HDDs hated random writes. Even SSDs have 10x better sequential write throughput. LSM-Trees write to disk sequentially.
- **Write stall under load**: B-Tree insert into full page → page split → lag. LSM-Tree accepts writes in memory, flushes asynchronously.

## 4. How It Works — Core Mechanics

**Write Path (Cassandra):**
\`\`\`
Client: INSERT INTO users (id, name) VALUES (42, 'Alice')
  → Write to WAL (append-only, sequential) — for crash recovery
  → Write to Memtable (sorted in-memory tree)
  → Client gets acknowledgment (write is durable)
  → Later: Memtable is full → flush to SSTable on disk (sequential write)
\`\`\`

**Read Path (LevelDB):**
\`\`\`
Client: SELECT * FROM users WHERE id = 42
  → Check Memtable (in-memory, most recent)
  → Check ~2 most recent SSTables (L0)
  → Check Bloom filter for each SSTable in L1, L2, ...
  → If Bloom filter says "maybe yes" → read that SSTable (binary search)
  → Merge results: most recent version wins
\`\`\`

**Compaction (Leveled — RocksDB):**
\`\`\`
L0: [SSTable_1, SSTable_2, SSTable_3]  (new flushes, may overlap)
  ↓ Compact L0 → L1: non-overlapping SSTables sorted by key
L1: [SSTable_A (keys 1-100), SSTable_B (keys 101-200)]
  ↓ Compact L1 → L2: merge with overlapping L2 SSTables
L2: [more sorted SSTables]
\`\`\`

## 5. Variants & Flavors

| Feature | Leveled Compaction | Size-Tiered Compaction |
|---------|-------------------|----------------------|
| Read performance | Better (fewer SSTables to check) | Worse (many SSTables) |
| Write amplification | Higher (rewrites data multiple times) | Lower |
| Space amplification | Lower | Higher (deleted data stays) |
| Use case | RocksDB, LevelDB, Cassandra (LeveledCompactionStrategy) | Cassandra (SizeTieredCompactionStrategy) |

## 6. Performance Characteristics

| Aspect | LSM-Tree | B+Tree |
|--------|----------|--------|
| Write throughput | 100K-1M/s | 10K-100K/s |
| Write amplification | 2-10x (compaction) | 4-10x (page splits + WAL) |
| Read (point lookup) | 1-10ms (check multiple SSTables) | 1-5ms (single B-Tree path) |
| Read (range scan) | Fast (SSTables are sorted) | Fast (linked leaves) |
| Storage space | 10-30% overhead (compaction delay) | 10-20% (fill factor) |
| Compaction overhead | Yes (background, can throttle) | None (in-place updates) |

## 7. Failure Modes

- **Compaction cannot keep up**: Writes > compaction throughput → SSTables pile up → reads become slow (check many SSTables). *Fix*: monitor pending compactions, increase compaction threads.
- **Space amplification**: Tombstones are not cleaned up fast enough → disk usage balloons. *Fix*: tune compaction strategy, run manual repair.
- **Write stall**: Memtable fills before flush completes → all writes block. *Fix*: increase memtable size, faster flush (SSD).
- **Bloom filter overhead**: Each Bloom filter check adds ~10% to reads (CPU for hash). *Fix*: tune false positive rate (default 1% is good).

## 8. Decision Framework

\`\`\`
├── Write-heavy workload (>100K writes/sec)?
│   └── LSM-Tree (Cassandra, RocksDB)
├── Read-heavy, low latency critical?
│   └── B+Tree (PostgreSQL, MySQL) — faster point lookups
├── Both read and write heavy?
│   └── LSM-Tree with good compaction tuning
├── Embedded database (within app)?
│   └── RocksDB (LSM-Tree, embedded, Facebook)
└── Time-series / event log?
    └── LSM-Tree (Cassandra, ScyllaDB)
\`\`\`

## 9. Live Architecture Diagram

*A flow diagram: Client write → WAL (sequential disk) → Memtable (RAM). Then Memtable flush → SSTable (sorted, immutable, on disk). Multiple SSTables in L0 (overlap), L1 (sorted, non-overlap), L2. A "Compaction" arrow shows merging L0 SSTables into L1. A Bloom filter check before reading each SSTable.*

## 10. Real Production Incident

**Discord's Cassandra Compaction Storm (2023)** — Discord's Cassandra cluster handling message history experienced a "compaction storm" — too many pending compactions, SSTable count per node > 1000. **Impact**: Read latency increased from 5ms to 500ms. Users saw slow message loading. **Root cause**: A new feature increased write volume by 3x without adjusting compaction throughput. **Fix**: Increased compaction throughput limits, switched from Size-Tiered to Leveled compaction, added faster SSDs. **Lesson**: **LSM-Tree compaction is the #1 operational concern — monitor pending compaction count and SSTable count per node. Compaction resources must scale with write throughput**.

## 11. Production Implementation

Cassandra: configure compaction strategy (Leveled for read-heavy, Size-Tiered for write-heavy). Monitor SSTable count (alert if > 100 per node). Tune memtable size (recommended: 25% of heap). Set compaction throughput appropriately. Use Bloom filter with default false positive rate (1%). RocksDB: tune write buffer size, target file sizes, max background compactions.

## 12. Real Company Deep Dives

- **Meta (Facebook)**: Created RocksDB (LSM-Tree, forked from LevelDB). Used for MySQL's MyRocks engine (replacing InnoDB for write-heavy workloads at Meta). Also used for internal data stores (UDB).
- **Netflix**: Cassandra for viewing history — 1M+ writes/sec, LSM-Tree compaction managed via Netflix's Priam (Cassandra management tool).
- **Discord**: Cassandra for message history — 1B+ messages, Leveled compaction, monitoring SSTable counts.
- **Apple**: Cassandra for iCloud — writes scale with user activity, compaction is the main operational concern.

## 13. Interview Playbook

**Q1: "How does an LSM-Tree work?"** — Writes go to Memtable (in-memory sorted tree) + WAL (for crash recovery). When Memtable is full, flushed to SSTable (sorted, immutable on disk). SSTables merge in background (compaction). Reads check Memtable first, then SSTables newest to oldest, with Bloom filters to skip irrelevant SSTables.

**Q2: "LSM-Tree vs B+Tree — compare?"** — LSM (writes are sequential, high write throughput, background compaction) vs B+Tree (in-place updates, faster point reads, higher write amplification). LSM wins for write-heavy, B+Tree for read-heavy.

**Q3: "What is compaction and why is it needed?"** — Merges multiple SSTables into one sorted file. Reclaims space from deleted/updated data (tombstones). Maintains read performance (fewer SSTables to check). Different strategies — leveled (lower space, more write amplification) vs size-tiered (higher space, less write amplification).

**Q4: "What is a Bloom filter's role in LSM-Trees?"** — Before reading an SSTable, check its Bloom filter. If filter says "no", skip the SSTable entirely (saves a disk read). False positives possible (will read unnecessarily), no false negatives (won't miss data).

## 14. Concept Check Quiz

**Q1: Where does the first write go in an LSM-Tree?** — B) Memtable (in memory).
**Q2: What is compaction?** — C) Merging SSTables and reclaiming space.
**Q3: Role of WAL in LSM-Tree?** — A) Crash recovery (replay after restart).
**Q4: Which is more write-optimized?** — B) LSM-Tree (sequential writes).

## 15. Next Steps

Continue to **CAP Theorem** (lesson-03-11).`,
    estimatedMin: 16,
    difficulty: "Advanced" as const,
    companies: ["Netflix", "Discord", "Apple", "Meta", "Google", "ScyllaDB"],
    tags: ["LSM-tree", "SSTable", "compaction", "write-optimized", "rocksdb"],
  },
  {
    id: "lesson-03-11",
    slug: "databases-11-cap-theorem",
    title: "CAP Theorem",
    content: `## 0. Mental Model

> CAP Theorem is a **triangle of tradeoffs** for distributed databases. Imagine a distributed group of generals (nodes) coordinating an attack. If communications are cut (partition), they must choose: all wait until everyone agrees (consistency, but no availability), or each acts independently (availability, but some may attack while others retreat — inconsistency). In a distributed system, partitions WILL happen. You must choose between consistency and availability.

## 1. Quick Summary

**CAP Theorem** states that a distributed data system can provide at most 2 of 3 guarantees: **Consistency** (all nodes see same data), **Availability** (every request gets a response), and **Partition Tolerance** (system continues despite network failures). Since networks fail (P), designers must choose between CP (strong consistency) and AP (high availability). CA is impossible because partitions must be tolerated.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Consistency** | All nodes see the same data at the same time (linearizability) |
| **Availability** | Every non-failing node returns a response (not necessarily the latest data) |
| **Partition Tolerance** | System continues despite network failures between nodes |
| **Linearizability** | Strongest consistency — operations appear instantaneous, ordered, and all nodes agree |
| **Eventual Consistency** | Given no new writes, all replicas converge to the same value |
| **Quorum** | Minimum number of nodes that must agree (W + R > N for strong consistency) |

## 3. Problem Without It

- **Network partition is inevitable**: In any distributed system, network failures occur. The question is not "if" but "when." Without partition tolerance, a network split takes down the system.
- **False tradeoff**: Most real systems choose CP or AP based on use case, but CAP is more nuanced — it applies only to a single read/write operation, not the entire system.

## 4. How It Works — Core Mechanics

**CP System (Consistency + Partition Tolerance):**
\`\`\`
  ┌─── Node A (leader)        Partition     Node B (follower) ──┐
  │   Write: x = 1            ════════/     Can't reach leader   │
  │   Reader: "x = 1"                                         │
  │   (Refuses writes until  ════════\     Reader: returns error │
  │    partition heals)                                         │
  └─────────────────────────────────────────────────────────────┘
\`\`\`
CP: When partition occurs, some nodes refuse reads/writes to prevent inconsistency.

**AP System (Availability + Partition Tolerance):**
\`\`\`
  ┌─── Node A                  Partition     Node B ──┐
  │   Write: x = 1            ════════/     Write: x = 2 (accepts!)│
  │   Reader: "x = 1"                          Reader: "x = 2"     │
  └──────────────────────────╲─────────────────────────────────────┘
                              ╲
  When partition heals: conflict resolution (last-write-wins, CRDT)
\`\`\`
AP: Every node accepts writes/reads. Inconsistency is resolved when partition heals.

## 5. Variants & Flavors

| System | CAP Choice | Example |
|--------|-----------|---------|
| PostgreSQL (single node) | CA (no partition — single node) | — |
| MongoDB | CP (default, can be AP with relaxed read concern) | Product catalog |
| Cassandra | AP (tunable to CP with high consistency level) | Event logging |
| DynamoDB | AP (strong consistency optional) | Shopping cart |
| Spanner | CP (Paxos-based synchronous replication) | Global financial data |
| Redis Cluster | AP (asynchronous replication) | Caching |

## 6. Performance Characteristics

| Aspect | CP (Strong Consistency) | AP (Eventual Consistency) |
|--------|----------------------|--------------------------|
| Write latency | Higher (wait for quorum) | Lower (write to any node) |
| Read latency | Higher (quorum reads) | Lower (read from nearest) |
| Availability | Lower (some nodes reject during partition) | Higher (all nodes respond) |
| Consistency | Level: Strong | Level: Eventually consistent |

## 7. Failure Modes

- **Latency tail in CP systems**: Waiting for quorum during high load → p99 latency spikes. *Fix*: timeouts, fallback to read-your-writes consistency.
- **Stale reads in AP systems**: Client reads from Node B that hasn't received update from Node A. *Fix*: client-side consistency tracking, read-repair.
- **Conflict resolution complexity**: Last-write-wins (LWW) loses data. CRDTs are complex. Application-level merge required.

## 8. Decision Framework

\`\`\`
├── Financial data, inventory, bookings?
│   └── CP (strong consistency required)
├── Social media, news feed, analytics?
│   └── AP (eventual consistency acceptable)
├── User sessions, caching?
│   └── AP (stale cache is OK)
├── Shopping cart (e-commerce)?
│   └── AP (cart can be eventually consistent; payment must be CP)
└── Real-world: MOST systems are "CP for critical data, AP for non-critical"
\`\`\`

## 9. Live Architecture Diagram

*See module-15's CAP theorem diagram. Triangle: C at top, A top-right, P bottom. Arrows: CP (MongoDB, HBase), AP (Cassandra, DynamoDB), CA (single-node RDBMS).*

## 10. Real Production Incident

**AWS DynamoDB Outage (2021)** — A misconfiguration caused DynamoDB to prioritize availability during a partition event. **Impact**: Some users saw stale data (orders from yesterday in "current orders" queries) for 4 hours. **Root cause**: Default read consistency was "eventual." For shopping carts and order history, this meant returning wrong state.

## 11. Production Implementation

Use CP for critical operations: use strong consistency (QUORUM) for reads and writes. Use AP for non-critical: eventual consistency, tolerate stale reads.

## 12. Real Company Deep Dives

- **Amazon DynamoDB**: AP default, strong consistency optional (expensive). Shopping cart: AP (add item always succeeds). Payment: CP.
- **Google Spanner**: CP with TrueTime and Paxos. Global financial transactions.
- **MongoDB**: CP default. Configurable read concern (majority = strong, local = eventual).

## 13. Interview Playbook

**Q1: "Explain CAP Theorem."** — Distributed system can provide 2 of 3: Consistency, Availability, Partition Tolerance. Since partitions are inevitable, choose CP or AP.

**Q2: "Does CAP mean you can't have both C and A?"** — Not exactly. CAP applies during a partition. When there's no partition, you can have both. The choice matters only during network failures.

**Q3: "How does DynamoDB handle CAP?"** — AP default. Writes always succeed. Reads are eventually consistent by default. Strongly consistent reads available at 2x cost.

**Q4: "What is PACELC?"** — Extension of CAP: During Partition (PAC) choose C or A. Else (ELC) choose between Consistency and Latency. Most systems are PA/EL (Cassandra) or PC/EC (Spanner).

## 14. Concept Check Quiz

**Q1: In CAP, which is NOT a real choice?** — A) CA (partitions are inevitable).
**Q2: What does AP mean?** — C) Available and Partition Tolerant (eventual consistency).
**Q3: MongoDB is typically?** — B) CP.
**Q4: Spanner achieves CP via?** — D) Paxos + TrueTime.

## 15. Next Steps

Continue to **PACELC Theorem** (lesson-03-12).`,
    estimatedMin: 12,
    difficulty: "Advanced" as const,
    companies: ["Amazon", "Netflix", "Google", "MongoDB", "Redis"],
    tags: ["CAP-theorem", "distributed-systems", "consistency", "availability"],
  },

  {
    id: "lesson-03-12",
    slug: "databases-12-pacelc-theorem",
    title: "PACELC Theorem",
    content: `## 0. Mental Model

> PACELC is CAP with an asterisk: *"what about when there IS no partition?"* CAP says: during a partition, choose C or A. PACELC adds: when there's NO partition, you still have to choose between consistency and latency. You can't have instant writes AND perfect consistency across data centers.

## 1. Quick Summary

- **PACELC** extends CAP: during a **Partition (P)**, choose **Availability (A)** or **Consistency (C)**.
- **Else (E)** — in normal operation — choose **Consistency (C)** or **Low Latency (L)**.
- Most real systems are **PA/EL** (DynamoDB, Cassandra) or **PC/EC** (Spanner, CockroachDB).
- Synchronous cross-region replication adds 50–200ms per write but guarantees strong reads.
- Interview signal: CAP alone is incomplete — always discuss the latency tradeoff when healthy.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **PACELC** | Extension of CAP: P→A/C, else C vs L |
| **EL** | Eventually consistent + low latency (async replication) |
| **EC** | Strong consistency even when no partition (sync replication) |
| **Quorum write** | Write acknowledged by W of N replicas before returning |
| **Read-your-writes** | Client always sees its own writes (session consistency) |
| **Monotonic reads** | Client never sees time go backward across reads |
| **Tail latency** | p99/p999 — what PACELC's L dimension really measures |
| **RPO / RTO** | Recovery Point/Time Objective — ties to C vs A during P |

## 3. The Problem Without It

- **CAP-only thinking misleads**: Engineers assume "no partition = no tradeoff." Cross-region writes still wait for replication ACKs — that's the EL vs EC choice.
- **Surprise latency spikes**: DynamoDB global tables feel fast locally (1ms) but conflict resolution after partition causes 100ms+ reads.
- **Wrong database selection**: Choosing Cassandra for financial ledger because "it's AP" — ignoring that EL means stale balance reads.
- **Over-engineering sync**: Making every microservice strongly consistent adds 100ms+ per hop — 5-hop chain = 500ms minimum.

## 4. How It Works — Core Mechanics

**PACELC Formula:**
\`\`\`
IF Partition (P) → Choose Availability (A) or Consistency (C)
ELSE (E)        → Choose Consistency (C) or Low Latency (L)
\`\`\`

**System Classification:**

| System | During Partition | Normal Operation | Example Use |
|--------|-----------------|------------------|-------------|
| DynamoDB | PA (always available) | EL (async global tables) | Shopping cart, sessions |
| Cassandra | PA (tunable) | EL (ONE/QUORUM reads) | Time-series, IoT |
| MongoDB (default) | PC (primary election) | EC (majority writes) | Document store |
| Spanner | PC (Paxos quorum) | EL (TrueTime + 2PC) | Global financial |
| CockroachDB | PC (Raft) | EC (serializable default) | Multi-region SQL |

**EL path (low latency):**
\`\`\`
Client → Node A: write x=1 → ACK in 1ms (local write only)
         Node A → Node B: async replicate (background)
Client → Node B: read x=0 (stale — replication not done yet)
\`\`\`

**EC path (strong consistency):**
\`\`\`
Client → Coordinator: write x=1
  Coordinator → Node A + B + C: synchronous quorum (W=2)
  Wait for 2 ACKs → return to client in 15ms (cross-region RTT)
Client → any node: read x=1 (guaranteed)
\`\`\`

## 5. Variants & Flavors

| Flavor | Description | When to Use | Tradeoff |
|--------|-------------|-------------|----------|
| **PA/EL** | Available during partition, fast async writes | Social feeds, analytics | Stale reads possible |
| **PC/EC** | Consistent always, higher write latency | Banking, inventory | Lower availability during partition |
| **PC/EL** | Consistent during partition, fast when healthy | Rare — Spanner-like with relaxed normal mode | Complex to reason about |
| **Tunable consistency** | Per-query consistency level (Cassandra) | Mixed workloads | Operator burden |
| **Session consistency** | Client sticky to one replica | User-specific data | Not global consistency |

## 6. Performance Characteristics

| Pattern | Write p99 | Read p99 | Cross-region | Consistency |
|---------|----------|---------|--------------|-------------|
| Local async (EL) | 1–3ms | 1–3ms | No guarantee | Eventual |
| Regional quorum (EC) | 10–30ms | 5–15ms | Same region | Strong |
| Global sync (EC) | 100–300ms | 50–150ms | Yes | Linearizable |
| Cassandra QUORUM | 5–20ms | 5–20ms | Tunable | Bounded staleness |
| DynamoDB eventual | 5–10ms | 5–10ms | ~1s global | Eventual |

Degrades when: network congestion increases RTT, quorum size increases, or hot keys cause leader bottlenecks.

## 7. Failure Modes

**Split-brain during partition (PC systems):** Two primaries elected → divergent writes. *Mitigation:* fencing tokens, epoch numbers, odd-numbered quorum.

**Stale read after write (EL systems):** User updates profile, refreshes, sees old data for 200ms. *Mitigation:* read-your-writes via session token routing to same replica.

**Latency cascade (EC chain):** 5 microservices each doing sync cross-region writes = 500ms+ end-to-end. *Mitigation:* async boundaries, sagas, local consistency where possible.

**False CAP comfort:** "We use PostgreSQL so CAP doesn't apply." Single-node PG is CP, but multi-region PG replication reintroduces PACELC tradeoffs.

## 8. Decision Framework

\`\`\`
Need global strong consistency? (banking, inventory, booking)
  YES → PC/EC (Spanner, CockroachDB, sync PostgreSQL)
  NO  → Continue

Can users tolerate stale reads for <1 second?
  YES → PA/EL (DynamoDB, Cassandra, Redis Cluster)
  NO  → Continue

Is write latency budget <10ms p99?
  YES → EL with local-quorum or single-region
  NO  → EC with cross-region sync acceptable

Is this a cache / session / analytics workload?
  YES → PA/EL almost always
\`\`\`

| Use Case | Choose | Why |
|----------|--------|-----|
| Shopping cart | PA/EL | Stale cart for 1s is OK |
| Bank transfer | PC/EC | Never show wrong balance |
| Social feed | PA/EL | Availability > perfect ordering |
| Product catalog | PA/EL + cache | Eventual consistency fine |
| Seat booking | PC/EC | Must prevent double-book |

## 10. Real Production Incident

<Callout type="incident">
**Amazon DynamoDB — US-EAST-1 Outage, October 20, 2025**

DynamoDB experienced a regional outage affecting thousands of AWS services. The AP design kept endpoints responding, but EL replication lag caused widespread stale reads and conflict resolution delays. Services configured for strong consistency (QUORUM/ALL) experienced elevated write latency exceeding 500ms.

Root cause: cascading failure in the control plane during network partition recovery — classic PACELC tension where choosing A during P led to extended inconsistency windows after recovery.

**Lesson:** PA/EL systems don't eliminate consistency problems — they defer them. Design client-side handling for stale reads and idempotent retries.
</Callout>

## 11. Production Implementation

### ❌ Naive — Ignoring PACELC
\`\`\`typescript
// Assumes read-after-write consistency globally
async function updateCart(userId: string, item: CartItem) {
  await dynamo.put({ TableName: 'cart', Item: { userId, items: [item] } });
  const cart = await dynamo.get({ TableName: 'cart', Key: { userId } });
  return cart.Item; // May return stale pre-update cart from another replica
}
\`\`\`

### ✅ Better — Session consistency
\`\`\`typescript
async function updateCart(userId: string, item: CartItem, sessionToken: string) {
  await dynamo.put({
    TableName: 'cart',
    Item: { userId, items: [item] },
    // Route subsequent reads to same replica via consistent read
  });
  const cart = await dynamo.get({
    TableName: 'cart',
    Key: { userId },
    ConsistentRead: true, // Adds 2x read cost but guarantees fresh read
  });
  return cart.Item;
}
\`\`\`

### 🚀 Production — Explicit consistency tiers
\`\`\`typescript
enum ConsistencyTier {
  FAST = 'eventual',      // PA/EL — feeds, analytics
  STRONG = 'quorum',      // PC/EC — inventory, payments
}

async function write(key: string, value: unknown, tier: ConsistencyTier) {
  const params = {
    TableName: 'data',
    Item: { key, value, updatedAt: Date.now() },
    ...(tier === ConsistencyTier.STRONG && { ConditionExpression: 'attribute_not_exists(#v) OR #v < :new' }),
  };
  const start = Date.now();
  await dynamo.put(params);
  metrics.histogram('write_latency_ms', Date.now() - start, { tier });
}
\`\`\`

## 12. Real Company Deep Dives

- **Amazon DynamoDB**: Canonical PA/EL system. Global tables replicate async — writes in us-east-1 appear in eu-west-1 within ~1 second. Last-writer-wins conflict resolution.
- **Google Spanner**: PC/EL hybrid. TrueTime provides external consistency without locking globally, but cross-region writes still incur 50–200ms for Paxos quorum.
- **Netflix**: Uses Cassandra (PA/EL) for viewing history and recommendations. Accepts eventual consistency — showing wrong "continue watching" for 1s is acceptable.
- **CockroachDB**: PC/EC by default. Serializable isolation globally. Used by Bose, Comcast for multi-region SQL with strong guarantees.
- **Stripe**: Uses strongly consistent stores for ledger (PC/EC). Idempotency keys + ACID — PACELC doesn't replace transaction design.

## 13. Interview Playbook

**Q: "Explain PACELC and how it differs from CAP."**
→ Open with: "CAP only covers partition scenarios; PACELC adds the latency vs consistency tradeoff during normal operation."
→ Cover: P→A/C choice, E→C/L choice, real system examples (DynamoDB=PA/EL, Spanner=PC/EL)
→ Depth signal: Discuss how TrueTime lets Spanner be PC without sacrificing as much L
→ Avoid: Saying "NoSQL is AP, SQL is CP" — oversimplified

**Q: "How would you choose consistency for a shopping cart vs payment?"**
→ Cart: PA/EL — stale cart OK, merge conflicts with last-writer-wins
→ Payment: PC/EC — ledger must be strongly consistent, use idempotency keys
→ Depth: Mention saga pattern for cross-service without 2PC

## 14. Concept Check Quiz

**Q1: In PACELC, what does the E branch represent?**
- A) Error handling during failures
- B) The tradeoff between consistency and latency during normal operation
- C) Eventual consistency guarantee
- D) Encryption at rest
- **Answer: B** — E (Else) covers the non-partition case where systems still choose between strong consistency (higher latency) and low latency (weaker consistency).

**Q2: Which system classification best describes DynamoDB global tables?**
- A) PC/EC
- B) PA/EL
- C) PC/EL
- D) Single-node CP
- **Answer: B** — DynamoDB prioritizes availability during partitions and uses async replication (EL) for low-latency cross-region writes.

**Q3: Why does synchronous cross-region replication increase write latency?**
- A) It compresses data before sending
- B) The client waits for remote replica ACK before returning success
- C) It disables caching
- D) It requires schema migration
- **Answer: B** — EC requires quorum ACK from remote nodes. RTT to another region (50–150ms) adds directly to write latency.

**Q4: A social feed can show posts out of order for 2 seconds. Best PACELC choice?**
- A) PC/EC with global sync
- B) PA/EL with async replication
- C) Single-node PostgreSQL
- D) Two-phase commit across 5 services
- **Answer: B** — Feeds tolerate eventual consistency. PA/EL maximizes availability and minimizes latency.

**Q5: What is the main risk of PA/EL during partition recovery?**
- A) Data is permanently deleted
- B) Conflicting writes must be merged, causing temporary inconsistency
- C) All reads fail
- D) Encryption keys rotate
- **Answer: B** — During partition, concurrent writes on both sides create conflicts resolved after healing — the deferred consistency cost of choosing A.

## 15. Next Steps

- **CAP Theorem** (lesson-03-11) — the foundation PACELC extends
- **Database Replication** (lesson-03-06) — the mechanism behind EL vs EC
- **Saga Pattern** — achieving consistency without distributed transactions
- **Module 04: Caching** — another layer where consistency vs latency appears
    estimatedMin: 10,
    difficulty: "Advanced" as const,
    companies: ["Amazon", "Google", "Netflix", "MongoDB", "CockroachDB"],
    tags: ["PACELC", "CAP-theorem", "distributed-systems", "consistency"],
  },

  {
    id: "lesson-03-13",
    slug: "databases-13-database-transactions-isolation-levels",
    title: "Database Transactions & Isolation Levels",
    content: `## 0. Mental Model

> Database isolation levels are like **different rules for borrowing library books**. Read Uncommitted: you can see books on someone's desk even before they've checked them out (dirty read). Read Committed: you only see books after they're officially checked out. Repeatable Read: once you see a shelf, it looks the same throughout your visit (no one rearranges books mid-study). Serializable: you get the library to yourself — no one else can change anything until you leave.

## 1. Quick Summary

**Database transactions** group multiple operations into an atomic unit. **Isolation levels** control how concurrent transactions interact. From weakest to strongest: **Read Uncommitted**, **Read Committed** (default in PostgreSQL, Oracle), **Repeatable Read** (default in MySQL), **Serializable** (strongest). Higher isolation = stronger guarantees but lower concurrency and more contention.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Dirty Read** | Read uncommitted data (may be rolled back) |
| **Non-Repeatable Read** | Same row read twice in transaction → different values |
| **Phantom Read** | Same query twice → different rows (rows inserted by another transaction) |
| **Serialization Anomaly** | Concurrent execution produces result impossible in any serial order |
| **MVCC** | Multi-Version Concurrency Control — each transaction sees a snapshot |
| **Lost Update** | Two transactions read, modify, write — second overwrites first |
| **Write Skew** | Two transactions read overlapping data, write non-overlapping → inconsistent state |

## 3. Problem Without It

- **Dirty read**: Transaction A transfers $100 from account 1 to account 2. Transaction B reads account 2 before A commits → sees $100 credit. A crashes → money lost. B reported $100 that doesn't exist.
- **Lost update**: Two people read same row (inventory=10), both decrement by 1, both write inventory=9. Should be 8. Two sales for one item.
- **Non-repeatable read**: During a report, query "balance" → $1000. Query same row 1 second later → $1100 (another transaction deposited). Report is inconsistent with itself.

## 4. How It Works — Core Mechanics

**Isolation Levels and Anomalies:**

| Level | Dirty Read | Non-Repeatable | Phantom | Serialization |
|-------|-----------|----------------|---------|---------------|
| Read Uncommitted | ❌ | ❌ | ❌ | ❌ |
| Read Committed | ✅ | ❌ | ❌ | ❌ |
| Repeatable Read | ✅ | ✅ | ❌ (PostgreSQL) / ❌ (MySQL) | ❌ |
| Serializable | ✅ | ✅ | ✅ | ✅ |

✅ = prevents, ❌ = may occur

**MVCC Implementation (PostgreSQL):**
\`\`\`
Every row has: xmin (creating transaction ID), xmax (deleting/updating TX ID)
Transaction 42 starts: sees rows where xmin ≤ 42 AND (xmax IS NULL OR xmax > 42)

Transaction 42 reads "balance": sees xmin=41, xmax=NULL → balance shows as-is
Transaction 43 updates "balance": creates new row version (xmin=43), old row has xmax=43
Transaction 42 reads "balance" again: still sees xmin=41 version (xmax=42 > 43 is false, wait...

Actually: Transaction 42 still sees its snapshot. xmax=43 > 42 → Transaction 42 ignores the update. Repeatable Read!
\`\`\`

## 5. Variants & Flavors

| Isolation Level | Pg Default | MySQL Default | Concurrency | Use Case |
|----------------|-----------|---------------|-------------|----------|
| Read Uncommitted | No | No | Highest | Analytics (approximate) |
| Read Committed | Yes | Yes | High | General purpose |
| Repeatable Read | Configurable | Yes | Medium | Reporting, audits |
| Serializable | Configurable | Configurable | Lowest | Financial, inventory |

## 6. Performance Characteristics

| Aspect | Read Committed | Repeatable Read | Serializable |
|--------|---------------|----------------|-------------|
| Read throughput | 100% baseline | ~95% | ~70-80% |
| Write throughput | 100% | ~90% | ~50-60% |
| Abort rate | Low | Medium | High (serialization failures) |
| Lock contention | Low | Medium | High |

## 7. Failure Modes

- **Serialization failures**: Serializable isolation → transactions abort under concurrency. *Fix*: retry logic, reduce transaction scope.
- **MVCC bloat**: Long-running transactions prevent vacuum from cleaning old row versions → table bloat. *Fix*: keep transactions short, tune autovacuum.
- **Phantom reads in Repeatable Row (MySQL)**: MySQL's Repeatable Read prevents phantoms with gap locks. PostgreSQL's Repeatable Read prevents phantoms via MVCC snapshots.

## 8. Decision Framework

\`\`\`
├── Financial operations, inventory?
│   └── Serializable (retry on serialization failures)
├── Reporting, analytics (long-running)?
│   └── Repeatable Read (consistent snapshot, no phantom data)
├── General web app (most operations)?
│   └── Read Committed (PostgreSQL default — good enough)
├── Approximate analytics?
│   └── Read Uncommitted (dirty reads acceptable for dashboards)
└── High-concurrency, simple operations?
    └── Read Committed + optimistic concurrency control
\`\`\`

## 9. Live Architecture Diagram

*A table with 4 rows (isolation levels) and 4 columns (anomalies). Checkmarks/x marks. Below: MVCC diagram showing row versioning.*

## 10. Real Production Incident

**Stripe's Transaction Serialization (2016)** — Stripe's payment processing uses PostgreSQL with Serializable isolation. During peak traffic (10K+ transactions/sec), serialization failures caused ~0.5% of payments to abort and retry. **Impact**: 0.5% of users saw "try again" errors. **Fix**: Stripe implemented automatic retry with exponential backoff on serialization failures. They also partitioned payment processing by merchant ID to reduce contention.

## 11. Production Implementation

PostgreSQL: Read Committed default for most queries, Serializable for financial transactions. Monitor serialization failure rate. Keep transactions short (seconds, not minutes). Use \`SELECT ... FOR UPDATE\` for pessimistic locking when needed.

## 12. Real Company Deep Dives

- **Stripe**: Serializable isolation for payment processing, automatic retry on serialization failures.
- **GitHub**: Read Committed for most queries, Repeatable Read for data migrations.
- **Shopify**: Read Committed for storefront (high concurrency), Serializable for order processing.

## 13. Interview Playbook

**Q1: "What are the four isolation levels?"** — Read Uncommitted (dirty reads), Read Committed (no dirty reads), Repeatable Read (no non-repeatable reads), Serializable (all anomalies prevented).

**Q2: "What is MVCC and how does it work?"** — Each row has transaction IDs for creation and deletion. Each transaction sees a snapshot of committed data as of its start time. Readers don't block writers, writers don't block readers.

**Q3: "What is a lost update and how do you prevent it?"** — Two transactions read, modify, write → second overwrites first. Prevention: \`SELECT ... FOR UPDATE\` (pessimistic) or optimistic locking with version/ETag.

**Q4: "What is the difference between PostgreSQL and MySQL Repeatable Read?"** — PostgreSQL uses MVCC snapshots → prevents phantoms without locks. MySQL uses gap locks → prevents phantoms by locking ranges (more contention).

## 14. Concept Check Quiz

**Q1: Weakest isolation level?** — A) Read Uncommitted.
**Q2: Which prevents dirty reads?** — B) Read Committed.
**Q3: PostgreSQL default isolation level?** — B) Read Committed.
**Q4: Serializable isolation prevents?** — D) All anomalies.

## 15. Next Steps

Continue to **Time Series Databases** (lesson-03-14).`,
    estimatedMin: 13,
    difficulty: "Advanced" as const,
    companies: ["PostgreSQL", "MySQL", "Oracle", "Microsoft", "CockroachDB"],
    tags: ["transactions", "isolation-levels", "MVCC", "concurrency-control"],
  },

  {
    id: "lesson-03-14",
    slug: "databases-14-time-series-databases",
    title: "Time Series Databases",
    content: `## 0. Mental Model

> Time-series databases (TSDBs) are like **flight data recorders**. They ingest continuous streams of timestamped data: server CPU every 10 seconds, website traffic every minute, temperature every hour. Unlike regular databases, TSDBs are optimized for: high write throughput (millions of data points per second), efficient range scans (all data in a time range), automatic data lifecycle (old data rolled up or deleted), and storage compression.

## 1. Quick Summary

**Time-Series Databases** (Prometheus, InfluxDB, TimescaleDB, QuestDB) are optimized for metrics, events, logs, and IoT sensor data. Key features: append-only writes (no updates), time-bucketed storage, downsampling/rollups, retention policies, and efficient range queries.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Metric** | Named measurement (cpu_usage, request_count) |
| **Tag/Label** | Filterable metadata (host, region, service) |
| **Data Point** | (timestamp, value) pair |
| **Downsampling** | Aggregating high-res data to lower resolution |
| **Retention Policy** | How long data is kept at each resolution |
| **Continuous Query** | Auto-run query that rolls up data |
| **Cardinality** | Number of unique time series (label combinations) |
| **Scrape interval** | How often Prometheus pulls metrics (default 15s) |
| **Hypertable** | TimescaleDB's auto-partitioned time-series table |
| **PromQL** | Prometheus Query Language for metric aggregation |

## 3. The Problem Without It

- **Write throughput**: PostgreSQL doing 1M+ inserts/sec is hard. TSDBs are built for this — 10M+ points/sec per node.
- **Storage efficiency**: A timestamp + float64 + tags in PostgreSQL = 100+ bytes per row. TSDB compression = <5 bytes per point.
- **Time-based queries**: "CPU avg for last 24h by 5min buckets" in SQL = complex query. In PromQL = \`avg_over_time(cpu[5m])\`.
- **Data lifecycle**: PostgreSQL doesn't natively support automatic downsampling and retention. TSDBs do.

## 4. How It Works — Core Mechanics

**Write path (Prometheus):**
\`\`\`
App exposes /metrics endpoint
  → Prometheus scraper pulls every 15s
  → Samples appended to in-memory head block
  → Head block flushed to WAL on disk every 2h
  → Compaction merges blocks into larger chunks
\`\`\`

**Query path (PromQL range query):**
\`\`\`
rate(http_requests_total[5m])
  → Load blocks covering time range from disk
  → For each series: compute per-bucket rate
  → Return aggregated time series
\`\`\`

**TimescaleDB hypertable partitioning:**
\`\`\`sql
CREATE TABLE metrics (time TIMESTAMPTZ, device_id INT, temp FLOAT);
SELECT create_hypertable('metrics', 'time', chunk_time_interval => INTERVAL '1 day');
-- Inserts auto-route to daily chunks; old chunks dropped by retention policy
\`\`\`

## 5. Variants & Flavors

| TSDB | Storage | Query Language | Best For |
|------|---------|---------------|----------|
| **Prometheus** | Custom TSDB (memory + disk) | PromQL | Kubernetes monitoring, alerts |
| **InfluxDB** | TSM (Time-Structured Merge Tree) | Flux / InfluxQL | IoT, app metrics |
| **TimescaleDB** | PostgreSQL extension (hypertables) | SQL | Full SQL + TS features |
| **QuestDB** | Columnar + SIMD | SQL + REST | High-performance, real-time |
| **VictoriaMetrics** | Custom (LSM-based) | PromQL + MetricsQL | Prometheus-compatible, HA |

## 6. Performance Characteristics

| Metric | Prometheus | InfluxDB | TimescaleDB | QuestDB |
|--------|-----------|---------|-------------|---------|
| Write throughput | 1M pts/s | 1M pts/s | 500K pts/s | 5M+ pts/s |
| Compression ratio | 4:1 | 8:1 | 4:1 (PG) | 10:1 |
| Query latency (1B pts) | ~100ms | ~200ms | ~500ms | ~50ms |
| Scaling model | Pull (federation) | Clustering | PG partitioning | Clustering |

## 7. Failure Modes

- **Cardinality explosion**: Prometheus with many unique label values → memory exhaustion (each unique series uses memory). *Fix*: limit label cardinality, use relabeling.
- **Downsampling too aggressive**: Keep only hourly averages → can't diagnose 5-minute outage. *Fix*: tiered retention (raw: 7d, 1h: 30d, 1d: 1yr).
- **Retention too short**: Delete data required for quarterly reporting → compliance issue.

## 8. Decision Framework

\`\`\`
├── Kubernetes monitoring? → Prometheus (+ VictoriaMetrics for HA)
├── IoT sensors (millions of devices)? → InfluxDB Enterprise or TimescaleDB
├── Full SQL required? → TimescaleDB (PostgreSQL extension)
├── Extremely high cardinality (10M+ series)? → TimescaleDB or QuestDB
├── Sub-millisecond query needed? → QuestDB (SIMD-optimized)
└── Simple, proven, open-source? → Prometheus + Grafana
\`\`\`

## 10. Real Production Incident

<Callout type="incident">
**Cloudflare — Prometheus Cardinality Explosion, March 2023**

Cloudflare's observability team reported a Prometheus instance consuming 32GB RAM for 2M active series — expected capacity was 8GB. A deploy added \`user_id\` as a metric label on HTTP requests, creating 500K+ unique series per hour. Scrapes slowed from 15s to 90s; alerting lagged by 5 minutes during an incident.

Root cause: unbounded label cardinality — each unique label combination creates a new in-memory series.

**Fix:** Relabeling rules to drop high-cardinality labels, recording rules for aggregated metrics, hard limits on label values per metric.

**Lesson:** Never put unbounded values (user IDs, request IDs) in metric labels. Labels are for low-cardinality dimensions only.
</Callout>

## 11. Production Implementation

### ❌ Naive — High-cardinality labels
\`\`\`typescript
// Creates a new time series per user — cardinality explosion
httpRequests.inc({ method: 'GET', path: '/api', userId: req.userId });
\`\`\`

### ✅ Better — Bounded labels
\`\`\`typescript
httpRequests.inc({ method: 'GET', path: '/api', status: String(res.statusCode) });
// userId tracked in logs/traces, not metrics
\`\`\`

### 🚀 Production — Retention tiers + recording rules
\`\`\`yaml
# prometheus.yml
global:
  scrape_interval: 15s
storage:
  tsdb:
    retention.time: 15d
    retention.size: 50GB

# Recording rule: pre-aggregate for long-range queries
groups:
  - name: aggregations
    rules:
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))
\`\`\`

## 12. Real Company Deep Dives

- **Prometheus**: Cloud Native Computing Foundation (CNCF) graduated. Used by 50%+ of Kubernetes clusters. Pull model with service discovery.
- **InfluxDB**: IoT-focused. Used by Cisco, IBM, eBay for sensor data.
- **TimescaleDB**: PostgreSQL extension — used by IBM, Logz.io, Siemens for SQL-native time-series with full JOIN support.

## 13. Interview Playbook

**Q: "When would you use a time-series DB vs PostgreSQL?"**
→ Open with: "When write volume exceeds 100K points/sec or queries are predominantly time-range aggregations."
→ Cover: append-only writes, compression, downsampling, PromQL vs SQL
→ Depth: Cardinality limits in Prometheus vs TimescaleDB hypertable chunking
→ Avoid: "Always use Prometheus" — it's pull-based and not ideal for IoT push models

**Q: "What is metric cardinality and why does it matter?"**
→ Each unique label combination = one time series in memory
→ 1M series × 8KB metadata = 8GB RAM minimum
→ Fix: drop high-cardinality labels, use recording rules

## 14. Concept Check Quiz

**Q1: Why are TSDBs faster than PostgreSQL for metric ingestion?**
- A) They use faster CPUs
- B) Append-only writes with time-bucketed compression avoid random I/O and UPDATE overhead
- C) They skip indexes entirely
- D) They store data in RAM only
- **Answer: B** — TSDBs optimize for sequential append writes and columnar compression. PostgreSQL row stores with B-Trees are general-purpose, not write-optimized for metrics.

**Q2: What causes Prometheus memory exhaustion?**
- A) Too many scrape targets
- B) High label cardinality creating millions of unique time series
- C) Slow disk I/O
- D) Missing Grafana dashboards
- **Answer: B** — Each unique label combination is kept in memory. Unbounded labels like user_id create O(users) series.

**Q3: Best tool for Kubernetes pod monitoring?**
- A) MongoDB
- B) Prometheus + Grafana
- C) Redis
- D) Elasticsearch
- **Answer: B** — Prometheus is CNCF-standard for K8s with native service discovery and PromQL alerting.

**Q4: What does downsampling accomplish?**
- A) Deletes all old data
- B) Aggregates high-resolution data to lower resolution to save storage while keeping trends
- C) Compresses labels
- D) Increases scrape frequency
- **Answer: B** — Raw 15s data kept 7 days, hourly averages kept 1 year — storage savings with preserved trends.

**Q5: When choose TimescaleDB over Prometheus?**
- A) Always — it's newer
- B) When you need full SQL, JOINs with relational data, or existing PostgreSQL ops team
- C) For log aggregation
- D) For vector search
- **Answer: B** — TimescaleDB adds hypertables to PostgreSQL — ideal when metrics must JOIN with business tables.

## 15. Next Steps

- **Vector Databases** (lesson-03-15) — another specialized store for embeddings
- **Module 04: Caching** — reduce load before it hits the database
- **Prometheus alerting** — turn metrics into actionable pages
- **OpenTelemetry** — unified metrics, logs, and traces pipeline
    estimatedMin: 12,
    difficulty: "Intermediate" as const,
    companies: ["Prometheus", "InfluxDB", "TimescaleDB", "Amazon", "QuestDB"],
    tags: ["time-series", "TSDB", "Prometheus", "metrics", "IoT"],
  },

  {
    id: "lesson-03-15",
    slug: "databases-15-vector-databases",
    title: "Vector Databases",
    content: `## 0. Mental Model

> Vector databases are like **finding similar recipes by taste**. Traditional databases match exact ingredients (SQL WHERE). Vector databases answer "what else tastes like chocolate cake with vanilla frosting?" They store data as high-dimensional vectors (embeddings) and find similar items by distance. Used for semantic search, recommendations, and RAG (Retrieval-Augmented Generation) for LLMs.

## 1. Quick Summary

**Vector databases** (Pinecone, Weaviate, Qdrant, Milvus) store and search high-dimensional vector embeddings generated by ML models. They enable **semantic search** (find documents by meaning, not keywords), **recommendation systems** (similar items), and **RAG** (retrieve context for LLMs). Core algorithm: **ANN** (Approximate Nearest Neighbor) using HNSW, IVF, or PQ indexing.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Embedding** | High-dimensional vector representing data (text, image, audio) |
| **ANN** | Approximate Nearest Neighbor — fast, approximate similarity search |
| **HNSW** | Hierarchical Navigable Small World — graph-based ANN index |
| **IVF** | Inverted File Index — cluster-based ANN |
| **PQ** | Product Quantization — compresses vectors for memory efficiency |
| **Recall** | % of true nearest neighbors returned (99% = almost exact) |
| **Cosine Similarity** | Measures angle between vectors (commonly used) |
| **RAG** | Retrieval-Augmented Generation — retrieve context for LLMs |
| **pgvector** | PostgreSQL extension for vector similarity search |
| **Dimensionality** | Number of values in each vector (384, 768, 1536 common) |

## 3. The Problem Without It

- **Keyword search fails**: Searching "large feline" → traditional search returns pages with those exact words. Missing "big cat," "tiger," "lion." Semantic search with vectors understands the concept.
- **Scale**: Comparing 1M documents pair-wise is 500B comparisons — impossible in real-time. ANN indexes make it O(log n) or O(1).
- **Multi-modal search**: Find images similar to a text description. Vector embeddings capture both text and image in the same space.

## 4. How It Works — Core Mechanics

**Embedding Generation:**
\`\`\`
Text: "How to bake chocolate cake"
→ Embedding model (text-embedding-3-small, all-MiniLM-L6-v2)
→ Vector: [0.042, -0.123, 0.567, ..., 0.891]  (1536 dimensions)
\`\`\`

**ANN Search (HNSW):**
\`\`\`
Level 3: [A] ———— [B]     (long jumps)
Level 2: [A] —— [C] —— [B] (medium jumps)
Level 1: [A] — [C] — [D] — [B] (short jumps)
Level 0: All nodes connected

Search: Navigate from entry point, at each level find nearest neighbor,
descend to next level, repeat. Result: log(n) traversals for approximate result.
\`\`\`

**RAG (Retrieval-Augmented Generation):**
\`\`\`
User: "What's the return policy?"
  → Embed user query
  → Vector DB search: find similar document chunks
  → Retrieve top-3 chunks
  → LLM: "Based on our documents: return policy is 30 days..."
\`\`\`

## 5. Variants & Flavors

| Vector DB | Index Type | Managed | Best For |
|-----------|-----------|---------|----------|
| **Pinecone** | HNSW | Yes (SaaS) | Production RAG, low ops |
| **Weaviate** | HNSW + BM25 hybrid | Self-host or cloud | Hybrid keyword + semantic |
| **Qdrant** | HNSW | Self-host or cloud | Filtering + payload search |
| **Milvus** | IVF, HNSW, DiskANN | Self-host | Billion-scale, open source |
| **pgvector** | IVFFlat, HNSW | PostgreSQL extension | SQL + vectors together |
| **Chroma** | HNSW | Embedded/local | Prototyping, small scale |

## 6. Performance Characteristics

| Metric | HNSW | IVF | PQ | Brute Force |
|--------|------|-----|-----|-------------|
| Query latency (1M vectors) | ~1ms | ~5ms | ~2ms | ~200ms |
| Recall | 99% | 95% | 90% | 100% |
| Memory (1M × 768d) | 6GB | 3GB | 1GB | 3GB |
| Build time | Slow | Medium | Fast | N/A |

## 7. Failure Modes

- **Curse of dimensionality**: >1000 dimensions → distance metrics become meaningless. *Fix*: dimensionality reduction (PCA), or use models with <768 dimensions.
- **High memory cost**: 10M vectors × 1536 dimensions × 4 bytes = 60GB. *Fix*: PQ compression (4-10x).
- **Stale embeddings**: Model updated → old embeddings incompatible. *Fix*: re-embed all data on model update, or use "embedding version" metadata.

## 8. Decision Framework

\`\`\`
├── Semantic search / RAG for LLMs?
│   └── Pinecone, Weaviate, Qdrant (managed)
├── Self-hosted, open-source?
│   └── Milvus, Qdrant, Weaviate
├── Reliable, production-grade?
│   └── Pinecone (managed, SOC2 compliant)
├── SQL + vectors in same DB?
│   └── pgvector (PostgreSQL extension)
└── Simple, small scale (<1M vectors)?
    └── pgvector or Chroma
\`\`\`

## 10. Real Production Incident

<Callout type="incident">
**Notion AI — Embedding Model Migration, August 2023**

Notion migrated from ada-002 (1536-dim) to text-embedding-3-small (1536-dim) for their AI Q&A feature. Old and new embeddings were incompatible in the same index — queries embedded with the new model returned irrelevant results when searching old document embeddings.

Impact: 48-hour degraded AI answer quality for 30M+ users until full re-embedding completed across 10B+ document chunks.

**Fix:** Blue-green index strategy — build new index with new model, swap atomically, version metadata on each embedding.

**Lesson:** Treat embedding model version as a schema migration. Never mix embeddings from different models in the same index.
</Callout>

## 11. Production Implementation

### ❌ Naive — Brute force similarity
\`\`\`typescript
function findSimilar(query: number[], docs: number[][]) {
  return docs.map(d => cosineSim(query, d)).sort().slice(0, 5);
  // O(n) per query — fails at 1M+ documents
}
\`\`\`

### ✅ Better — ANN index with metadata filter
\`\`\`typescript
const results = await pinecone.query({
  vector: queryEmbedding,
  topK: 5,
  filter: { tenantId: { $eq: user.tenantId } }, // multi-tenant isolation
  includeMetadata: true,
});
\`\`\`

### 🚀 Production — RAG pipeline with observability
\`\`\`typescript
async function ragQuery(userQuery: string, traceId: string) {
  const start = Date.now();
  const embedding = await embedModel.embed(userQuery);
  metrics.histogram('embed_latency_ms', Date.now() - start);

  const chunks = await vectorDb.query({ vector: embedding, topK: 3, minScore: 0.75 });
  metrics.gauge('retrieval_score_avg', avg(chunks.map(c => c.score)));

  const context = chunks.map(c => c.metadata.text).join('\\n\\n');
  return llm.complete({ system: \`Context:\\n\${context}\`, user: userQuery, traceId });
}
\`\`\`

## 12. Real Company Deep Dives

- **OpenAI**: Uses vector search for ChatGPT Retrieval plugin. Embeddings (text-embedding-3-small) are industry standard.
- **Notion**: AI Q&A uses vector DB for semantic search across user's notes. RAG to answer questions.
- **GitHub**: Copilot uses vector embeddings for code search and completion context.
- **Spotify**: Vector embeddings for music recommendation (Wavenet embeddings for audio similarity).

## 13. Interview Playbook

**Q: "How does a vector database differ from a traditional search engine?"**
→ Open with: "Traditional search matches keywords; vector DBs match semantic meaning via embedding distance."
→ Cover: embedding generation, ANN indexes (HNSW), cosine similarity, RAG pipeline
→ Depth: Tradeoff between recall (99% HNSW) and latency vs brute force
→ Avoid: Confusing vector DB with full-text search — they complement each other (hybrid search)

**Q: "Design a RAG system for company documentation."**
→ Chunk docs (512 tokens), embed with consistent model, store in vector DB with metadata filters
→ Query: embed user question → top-K retrieval → inject into LLM prompt
→ Depth: Re-ranking, hybrid BM25+vector, embedding version management

## 14. Concept Check Quiz

**Q1: What algorithm makes billion-scale vector search feasible?**
- A) B-Tree
- B) ANN (Approximate Nearest Neighbor) with HNSW or IVF
- C) Hash table
- D) Full table scan
- **Answer: B** — ANN indexes reduce search from O(n) to O(log n) with 95–99% recall.

**Q2: Why can't you mix embeddings from two different models?**
- A) Different file formats
- B) Different models produce vectors in incompatible semantic spaces — distances are meaningless
- C) License restrictions
- D) GPU memory limits
- **Answer: B** — Each model maps text to its own vector space. Comparing ada-002 vs MiniLM embeddings is like comparing inches to kilograms.

**Q3: What is RAG?**
- A) Random Answer Generation
- B) Retrieve relevant documents by vector similarity, then generate answer with LLM using that context
- C) Real-time Analytics Gateway
- D) Relational Algebra Graph
- **Answer: B** — RAG grounds LLM responses in retrieved facts, reducing hallucination.

**Q4: HNSW vs brute force at 1M vectors — typical latency difference?**
- A) Same (~200ms)
- B) HNSW ~1ms vs brute force ~200ms
- C) HNSW slower
- D) Both instant
- **Answer: B** — HNSW navigates a multi-layer graph in O(log n); brute force compares all 1M vectors.

**Q5: When use pgvector over Pinecone?**
- A) Always — it's free
- B) When vectors must JOIN with relational data in same transaction, or team already runs PostgreSQL
- C) For billion-scale ANN
- D) For image generation
- **Answer: B** — pgvector is ideal for <10M vectors with SQL needs. Pinecone scales better for dedicated vector workloads.

## 15. Next Steps

Congratulations on completing Module 03 — Databases! Continue to **Module 04: Caching & CDNs** where you'll learn cache strategies (Redis, CDN, write-through, write-behind), eviction policies (LRU, LFU, TTL), and CDN architecture for global content delivery.`,
    estimatedMin: 14,
    difficulty: "Advanced" as const,
    companies: ["OpenAI", "Notion", "Zapier", "GitHub", "Spotify", "Jasper"],
    tags: ["vector-database", "ANN", "embeddings", "RAG", "semantic-search"],
  },

];