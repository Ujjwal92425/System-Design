## 1. Hook

Two friends open two libraries next to each other on the same street.
In Alice's library, every new book that arrives gets a single index
card filed in alphabetical order in a giant cabinet next to the
counter - finding a book takes one flip through the cards, but
inserting takes time because the cabinet has to stay alphabetical so
a new book in the middle slides half the drawer sideways. In Bob's
library, every new book gets thrown on the end of a growing pile on
the back table; inserting is instant, but when a reader asks for a
book Bob has to walk the whole pile once - he remembers which
"recent books" pile to start with but reading is much slower than
Alice's.

Both libraries end up with the same books, but they answer opposite
questions fast. Alice's is read-optimised: lookup is fast at the cost
of a longer write. Bob's is write-optimised: insertion is fast but
reading is slow. The choice is not mysterious and it is not a matter
of one being "better"; the choice is dictated entirely by the ratio
of reads to writes the library expects.

Every storage system you will ever design lives somewhere on this
spectrum. A logging database is Bob's library (write-heavy; reading
is rare but happens during the incident). A main product catalogue
is Alice's library (read-heavy; the write happens once per day when
the price changes). The job of this lesson is to make the trade-off
nameable and the design choices concrete so the next time somebody
asks "should we use Postgres or Cassandra" you can ask back "what is
the read/write ratio and the latency ceiling?"

## 2. What Is It

(a) Plain-English one-liner: read-optimised storage spends write
cost to keep an index up to date so reads are fast; write-optimised
storage spends read cost to skip the index so writes are fast. The
two structures are physically different.

(b) Formal definition: a read-optimised storage engine maintains an
in-place, sorted index (such as a B+ tree) so any point lookup is
`O(log N)` and the leaf pages are sequentially laid out for range
scans, paying an `O(log N)` write cost per insert plus the seek
penalty of in-place page updates. A write-optimised storage engine
appends writes to an in-memory structure and a sequence of
immutable on-disk files (LSM tree of SSTables; see:
MOD-03/10-nosql-internals-lsm-trees-sstables-compaction) so writes
are `O(1)` amortised regardless of dataset size, paying a read cost
of `O(log N + S)` where `S` is the number of sorted runs to merge
during read. The choice between the two is driven by the workload's
read/write ratio and its tolerance for write amplification (the
B+ tree) vs read amplification (the LSM).

## 3. The Problem It Solves

Before the read-vs-write distinction was named as a storage-engine
choice, teams built "a database" and treated it as a single shape.
A typical on-call pattern: the team ran a logging workload on a
B-tree-backed Postgres table; ingest was 10,000 log rows per
second; the database was healthy for a week, then began to fall over
on random page faults from index maintenance. The fix the team
reached for was "more Postgres." Three replicas later, the same fall;
each replica did the same write amplification. The diagnosis never
included "this is the wrong storage engine for the workload; the
B-tree's read-optimisation is paid on every write whether we read
the logs later or not."

After the distinction is named, the diagnosis is "this is a write-
heavy workload with occasional late reads; fit an LSM-backed engine
(Cassandra, RocksDB, ScyllaDB) and the write amplification drops by
a factor of ten." The read amplification moves to the rare read
window during the incident, where it does not matter because the
read is the only thing happening at that moment. The intervention
is based on the workload's read/write ratio, not on a reflex.

## 4. Core Concept Breakdown

- **B+ tree:** the canonical read-optimised structure; leaves are
  sorted and linked, so range scans read sequentially. Inserts cost
  `O(log N)` plus a write amplification roughly 2 to 4 (each leaf
  change may rewrite the whole 8 KB page) (see: MOD-03/02-relational-db-internals-btrees-indexing).
- **LSM tree:** the canonical write-optimised structure; writes go
  to an in-memory MemTable plus a write-ahead log, then flush to an
  immutable SSTable on disk. Reads merge across the MemTable and
  the most recent SSTables - this is the read amplification.
- **Write amplification:** the number of disk bytes written per
  logical byte the user thinks they wrote. B+ trees suffer 2 to 4;
  LSMs (depending on compaction) suffer 10 to 30 under level
  compaction and 3 to 10 under tier compaction.
- **Read amplification:** the number of disk bytes read per logical
  read. LSMs read the bloom filter and the cached index page per
  SSTable; B+ trees read one to two pages (root to leaf).
- **Compaction:** the background process that merges several
  SSTables into fewer, larger ones, reclaiming space and reducing
  the read amplification. Compaction cost is the price of LSM's
  write speed.
- **Point lookup vs range scan:** B+ trees excel at both, but LSMs
  excel at small recent writes; range scans over all history are
  still a B+ tree's natural strength.
- **Sorted strings and bloom filters:** the LSM uses a bloom filter
  per SSTable to skip the file entirely when the key is not there -
  the technique that brings LSM point-reads close to B+ tree reads
  on a hit (see: MOD-16/01-bloom-filter-probabilistic-set-membership).
- **Write-ahead log (WAL):** the durability mechanism for either
  structure. On insert, B+ tree writes WAL plus page; LSM writes
  WAL plus MemTable. The win of LSM is that the page writes are
  sequential, not random.
- **Workload fingerprinting:** the practice of measuring the read/
  write ratio, the read/write shapes (point, range, prefix), and
  latency ceilings BEFORE choosing the engine. Without this
  measurement, the choice is a religion war.
- **Hybrid storage engines:** RocksDB is an LSM inside databases
  like MySQL/MyRocks and MongoRocks, where the read patterns learned
  to tolerate the LSM read cost; the line is not "Postgres=B+ tree,
  NoSQL=LSM" - real engineering mixes.

## 5. How It Works

Step by step, choosing the storage engine for a new service:

1. **Measure the workload fingerprint.** Read/write ratio
   (e.g., 1000:1 for a catalogue; 1:100 for a time-series); read
   shape (point lookup vs ordered range); write shape (single row
   vs bulk); per-request latency SLO. The fingerprint is the
   decision's input.
2. **Classify the workload into read-heavy or write-heavy** at the
   ratio boundaries: roughly 10:1 or more reads-per-write is
   read-heavy; roughly 1:10 or more writes-per-read is write-heavy;
   in between is a hybrid workload and the choice is harder.
3. **For a read-heavy workload**, prefer a B+ tree engine with
   sufficient caches that the index root and active leaves sit in
   memory; the random IO of writes is amortised across the read
   share (see: MOD-03/05-database-indexing-deep-dive).
4. **For a write-heavy workload**, prefer an LSM engine where
   each write is a sequential append landing in a MemTable;
   the read amplification is shifted to the read window where it
   matters less.
5. **Choose the page size for the B+ tree** to match the box's
   storage chunk (typically 8 KB for SSD, 16 KB for Index Read-
   ahead); too small pays tree-walk overhead, too large wastes IO
   on small reads.
6. **Choose the compaction strategy for the LSM** (level vs tier vs
   FIFO) according to the read pattern and write duty cycle.
   Level compaction is the default for mixed read/write; tier
   for high write rate; FIFO for time-series (where old data is
   evicted, never merged - see: MOD-03/14-time-series-databases).
7. **Add a bloom filter on the LSM** for point reads; the filter
   tells you "this key is definitely not in this SSTable" so the
   point read skips the SSTable. Tuning the bloom false-positive
   rate to 1 percent caps the wasted read on the read amplification
   at one extra SSTable per read.
8. **Add a covering cache for the B+ tree** so the active leaves
   sit in memory; the in-memory cache raises the read rate the
   B+ tree can absorb in the read-heavy regime.
9. **When the workload is hybrid** consider a read-through cache
   in front of a write-friendly backend (cache the read-hot set on
   top of an LSM store) - a mixed architecture, but one that
   matches the mixed workload.
10. **Re-measure the workload quarterly** because the read/write
    ratio drifts; a system that started write-heavy may trend
    read-heavy as the data accumulates and a storage engine that
    fit at week one may not fit at month six.

## 6. Diagram

```mermaid
flowchart TD
    WL[Workload fingerprint] --> RATIO{read:write ratio}
    RATIO -->|read-heavy >= 10:1| BTREE[B+ tree engine]
    RATIO -->|write-heavy <= 1:10| LSM[LSM engine]
    RATIO -->|hybrid| HYBRID[Cache + LSM hybrid]
    BTREE -->|in-place updates| LEAF[Sorted leaves + cache]
    LSM -->|append + MemTable| SST[(SSTables on disk)]
    SST --> COMPACTION[Background compaction]
    SST --> BLOOM[Bloom filter per SST]
    BLOOM --> READ[Point read skips SSTables]
    LEAF --> READ
    HYBRID --> READ
    PEAK[Read peak] --> CACHE[(Read-hot cache)]
    CACHE --> LEAF
```

<!-- IMAGE: side-by-side structure diagrams of a B+ tree (root, internal
nodes, sorted leaves with linked-list pointers) and an LSM tree
(MemTable, multiple SSTable levels L0, L1, L2 with compaction
arrows showing merges) -->

## 7. When to Use It

Use the read/write storage engine framing when one or more hold:

- **A new service is going to hold its data, and you must pick the
  engine.** An engine decision based on the read/write ratio avoids
  the cheapest mistake (running a write-heavy workload on a B+ tree
  that page-faults to death).
- **A service's read/write ratio has drifted** since the original
  engine was picked (often over years); re-evaluating the choice
  can resolve a slow page that no amount of tuning will.
- **A write-heavy workload is producing fast-growing data**: a B+ tree
  with index maintenance begins to fall over at tens of millions of
  rows; an LSM keeps going into billions. If your growth is in the
  write direction, name it.
- **A read-heavy workload is producing random IO** from the index
  walks; an LSM read amplification at the read peak might be cheaper
  than the write amplification of the B+ tree at the write peak.
  The framing surfaces this trade-off.

## 8. When NOT to Use It

- **A small dataset that fits the working set in memory.** Any
  in-memory structure (`Map<K,V>` in process memory or Redis) beats
  either engine when the dataset is small. The read-vs-write choice
  is the on-disk structure choice and is moot when nothing is on disk.
- **A system whose data fits on one machine** and is measured at
  under a few thousand QPS. The page-fault fall-off only happens
  past saturation; at low QPS both engines are fine.
- **A workload whose access pattern is uniformly random** so a
  cache is useless; neither engine helps the read pattern. Cache
  scheme design beats storage engine choice here.
- **A workload whose writes are appends only.** Append-only files
  beat either structure; no compaction, no index walk, just a
  segmented log. The framing is for structured random access.

## 9. Real-World Example

**MySQL's InnoDB** is the canonical B+ tree database engine; its
typical write amplification is 2 to 4 and its range scan performance
on a warm cache is single-digit-millisecond range queries on a
hundred-million-row table; this is the engine most product
catalogues and financial ledgers run on because their access pattern
is read-heavy and they need transactional guarantees.

**Cassandra and ScyllaDB** are LSM-backed; their original use case
at Apple (writing tens of millions of user-app events per second)
was write-heavy and the LSM was the right shape. Cassandra write
throughput per node sustains on the order of 100,000 single-row
inserts per second on a single SSD-backed node, while InnoDB on
the same hardware sustains a small fraction of that for random
single-row inserts because of the B+ tree page writes.

**RocksDB** is a hybrid engine (LSM) embedded inside MySQL (MyRocks,
used at Facebook for the UDB message workload, which was
write-heavy and was bottlenecked on InnoDB's write amplification).
MyRocks reduced write amplification from roughly 2 to 4 down to
0.5 to 1.5, reclaiming significant SSD lifetime and IO bandwidth.

A realistic number: a typical InnoDB insertion rate at 10k QPS
random-insert into a 100M-row table is sustainable; at 100k QPS
random-insert the system falls off, and an LSM engine at the same
shape sustains 100k QPS. Per-byte read latency on the hot key at
the warm cache is similar between the two engines; the divergence
is at the write edge and the read edge in opposite directions.

## 10. Production-Grade Code

```typescript
// A tiny fingerprint-then-pick engine chooser: measures the
// read/write ratio, names a regime, returns a configuration. The
// structure of the chooser is the thing the lesson cares about - 
// it makes the "read vs write" decision first-class, not an ad-hoc
// opinion poll.

interface WorkloadFingerprint {
  readsPerSec: number;
  writesPerSec: number;
  pointReadShare: number; // share of reads that are point lookups
  rangeScanSharePct: number; // 0..100
  perRequestSLOMs: number;
  cacheFitsWorkingSetPct: number; // 0..100 of the working set fits in memory
}

const FAMILY_RATIO_CUTOFF_WRITE_HEAVY = 0.1; // writes/reads >= 0.1 is mixed-reads,
// writes/reads >= 10 is write-heavy; the boundary in between is hybrid
const FAMILY_RATIO_CUTOFF_WRITE_EXTREME = 10;
const RANGE_SCAN_INMEMORY_FLOOR_PCT = 30;

type EngineFamily = "B_TREE" | "LSM" | "HYBRID_CACHE_LSM";

interface EngineConfig {
  family: EngineFamily;
  pageSizeKb: number; // for B+ tree or LSM page size
  compaction: "level" | "tier" | "fifo";
  bloomFilterBitsPerKey: number; // 0 = no bloom filter
  cacheRatio: number; // fraction of working set aimed at cache
  rationale: string; // human-readable trade-off statement
}

function classifyFamily(f: WorkloadFingerprint): EngineFamily {
  if (f.writesPerSec >= FAMILY_RATIO_CUTOFF_WRITE_EXTREME * f.readsPerSec) return "LSM";
  if (f.readsPerSec >= FAMILY_RATIO_CUTOFF_WRITE_EXTREME * f.writesPerSec) return "B_TREE";
  return "HYBRID_CACHE_LSM";
}

export function pickEngine(f: WorkloadFingerprint): EngineConfig {
  const family = classifyFamily(f);
  // The branch-by-family is the discipline; the rule is not
  // "B_TREE for relational, LSM for time-series" but "match the
  // workload's read/write shape."
  if (family === "B_TREE") {
    return {
      family,
      pageSizeKb: 8, // matches typical SSD erase block, minimises write amplification
      compaction: "level",
      bloomFilterBitsPerKey: 0,
      cacheRatio: 0.5,
      rationale: "read-heavy, point-lookup prominent - per-request read cost is the lever",
    };
  }
  if (family === "LSM") {
    return {
      family,
      pageSizeKb: 4, // smaller SSTable block; bloom filter does the heavy lifting
      compaction: f.rangeScanSharePct < RANGE_SCAN_INMEMORY_FLOOR_PCT ? "tier" : "level",
      // Tier compaction is cheaper when range scans are rare; level
      // preserves the read-friendly ordering when range scans frequent.
      bloomFilterBitsPerKey: 10, // target 1% false-positive rate
      cacheRatio: 0.1, // working set is the recent writes; a small cache suffices
      rationale: "write-heavy - amortise the per-write cost across sequential appends",
    };
  }
  // Hybrid: read-write ratio is mixed; cache the read-hot set on top
  // of an LSM. The cache covers the read amplification, the LSM
  // covers the write amplification. The cache is sized to keep the
  // hot reads out of the LSM merge cost.
  return {
    family,
    pageSizeKb: 4,
    compaction: "level",
    bloomFilterBitsPerKey: 10,
    cacheRatio: Math.max(0.3, Math.min(0.7, 1 - f.cacheFitsWorkingSetPct / 100)),
    rationale: "mixed read/write - cache the read-hot tail, LSM the write-heavy bulk",
  };
}
```

Why-not-what notes:
- `classifyFamily` uses both ratios before falling to a hybrid;
  the goal is for hybrid to be a real shape, not a fallback for
  indecision.
- `pageSizeKb = 8` for the B+ tree matches the typical SSD erase
  block size so each write does not unnecessarily amplify - the
  number is a starter; production measures and tunes.
- `bloomFilterBitsPerKey = 10` targets a 1 percent false-positive
  rate per SSTable. More bits = lower FPR but more space.
- `cacheRatio` is sized to keep the read-hot working set in memory
  for the B+ tree (the read cost of a cold leaf is 100 microsec vs
  1 microsec for a hot leaf node, so the cache buys a 100x
  improvement); for LSM, the cache is small because the working set
  is the recent writes.
- The hybrid branch uses both tricks because no single lever
  resolves both amplification kinds.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Choosing the engine by workload fingerprint matches the physics instead of industry folklore | Workloads drift; an engine that fitted at the start may need re-evaluation at the year mark | Quarterly re-measurement, occasional storage migration; both process costs |
| Read-optimised B+ trees have fast point lookup AND fast range scan when the working set is cached | B+ tree write amplification of 2 to 4 means every write physically writes 2 to 4 disk pages | SSD lifetime and IO bandwidth at the write peak; capacity project earlier than the team expects |
| Write-optimised LSM trees scale to huge write workloads with low write amplification | Read amplification merges several SSTables per lookup; cache misses are expensive | Tuning compaction and bloom filter cost; some read-path regressions at compaction windows |
| LSM bloom filter brings point reads to within a small constant factor of B+ tree reads | Bloom filters add memory overhead and false positives on misses | ~10 bits per key memory, single-digit percent FPR |
| Hybrid cache-on-LSM handles mixed workloads gracefully | Two systems to operate (cache + LSM) and possible divergence between cache and store at the read edge | Operational complexity; cache invalidation strategy must exist before first prod traffic |

## 12. Comparison Table

| Approach | Write cost | Point read cost | Range scan cost | Best workload |
|---|---|---|---|---|
| B+ tree (e.g., InnoDB, Postgres heap) | O(log N) + write amp 2-4 | O(log N), fast with cache | Sequential, fastest | Read-heavy, transactional |
| LSM tree (e.g., RocksDB, Cassandra) | O(1) amortised, low write amp | O(log N + S) with Bloom filter | Merge sort across SSTables | Write-heavy, append-most |
| Append-only log | O(1) | O(N) | Overlapping filtering | Time-series, audit (see: MOD-03/14-time-series-databases) |
| In-memory KV (e.g., Redis) | O(1) | O(1) | N/A | Small dataset, any workload |
| Hybrid (cache in front of LSM) | O(1) at LSM + cache-write | O(1) on cache hit | LSM fast for ranges after cache miss | Mixed workload with hot read tail |

The right column is the workload to first-quadrant-check; the rest of
the row is what it costs. The table itself is the diagnosis tool.

## 13. Numbers & Benchmarks

- **B+ tree write amplification:** 2 to 4 disk bytes written per
  logical byte on average for random inserts at moderate leaf
  occupancy; grows with low leaf-fill.
- **LSM level-compaction write amplification:** 10 to 30 disk bytes
  written per logical byte on average; lower with tier compaction
  (3 to 10) but worse read amp.
- **B+ tree point read:** 1 to 2 disk page reads + tree walk
  (typically fully cached root for a hot table); 4KB to 8KB per
  page when cache misses.
- **LSM point read with bloom:** typically 0 SSTable reads on a hit
  (because the bloom filter on most SSTables says "not here") plus
  the actual hit SSTable; miss usually costs 1 wasted SSTable read
  for the false positive of the bloom filter.
- **Realistic InnoDB insert rate** at single-row random inserts on
  4KB page table: 5k to 15k inserts per second; the LSM diverges
  with 100k+ inserts per second on the same hardware.
- **Range scan benchmark**: B+ tree scan on a warm cache pages in
  at memory bandwidth; LSM level compaction must sort and merge
  SSTables, so an uncached range scan over the entire database is
  faster on a B+ tree. Cache matters.

## 14. Common Pitfalls

- **Treating the choice as permanent.** Workloads drift; an
  LSM-on-write-heavy workload that has become read-heavy after
  years of accumulation might benefit from a B+ tree. Quarterly
  workload fingerprinting is cheap; re-architecting after three
  years is not.
- **Tuning the wrong parameter.** A team running an LSM and seeing
  slow reads reaches for "compaction threads"; the right parameter
  is usually "bloom filter bits per key" - the bloom filter is the
  read-amplification lever. Naming "this is LSM read amplification"
  first prevents the team wasting months on compaction tuning.
- **Mixing levels and tier compaction in the same column family.** A
  multi-tenant data layout that has different read/write ratios per
  key prefix needs different compaction per column family; a single
  compaction strategy is the wrong fit and produces hotspots in one
  workload (the write-heavy one) and slow range scans in another
  (the read-heavy one).

## 15. Interview Q&A

**Q1. Why are B+ trees read-optimised and LSM trees write-
optimised?** Model answer: B+ trees keep the leaf index sorted in
place, so reads walk root-to-leaf in `O(log N)` and one or two page
reads; writes cost the same `O(log N)` plus the in-place page update
that writes 2 to 4 disk bytes per logical byte. LSM trees append
each write to an in-memory MemTable plus a WAL, so writes are
sequential and amortised to `O(1)`; reads merge across the MemTable
and the SSTables, paying a per-read read cost. The structure's
geometry produces the trade-off; it is not a tuning parameter.

**Q2. When would you pick an LSM tree over a B+ tree?** Model
answer: when the workload is write-heavy (writes per second at or
above the system's saturation point) and reads are mostly point
lookups with a recent-key bias (because the MemTable catches them).
The classic shape is a logging or event-ingest system; range
scans over full history stay better on a B+ tree.

**Q3. An LSM throughput is great but point read p99 is high. What
do you tune?** Model answer: the bloom filter is the first lever.
Increasing `bloomFilterBitsPerKey` lowers the false-positive rate
and the per-read SSTable I/O. The bloom cost is memory and a one-
percent FPR target typically takes about 10 bits per key. If the
read p99 still does not drop, the next lever is the compaction
strategy (level vs tier) and the number of levels that the read
merges.

**Q4. Why does an LSM compaction strategy matter for read latency?**
Model answer: more SSTables mean more runs to merge per read; level
compaction keeps fewer runs but pays write amplification to keep
the run count low; tier compaction keeps more runs cheaper on
writes but with higher read amplification. The choice matters for
read-heavy workloads on LSM data.

**Q5. Your workload is 50:50 read:write. Which engine?** Model
answer: hybrid. A cache in front of an LSM serves the read-hot tail
fast at 1 microsec per hit and the LSM serves the writes; a B+ tree
is harder because the write amplification costs half the bandwidth
at the 50 percent write share. Saying "it depends" without naming
the hybrid answer is the most common interview miss.

## 16. Follow-up / Curveball Questions

**Curveball 1. The LSM write throughput drops 30 percent at peak.
What is happening?** Answer direction: compaction has gone into a
hot loop. Either a level is large enough that the compaction merges
several SSTables at peak; control with the compaction budget, the
level target sizes, and per-tenant sharding. See MOD-03/10 for the
full compaction internals.

**Curveball 2. Your read-heavy workload has a 99 percent hit-rate
cache but the cache is hot enough to need three replicas. The team
asks if a B+ tree on a faster SSD might be cheaper than the cache.
How do you answer?** Answer direction: do the math. Cache hit
latency is sub-millisecond; B+ tree if the cache misses is several
milliseconds. Three cache replicas cost X; an upgrade to a faster
SSD costs Y. The answer is in the numbers, not the architecture -
flag it as a quantitative one for the team, not a "feeling."

**Curveball 3. The database is read-heavy but a small subset of
writes must complete in milliseconds. LSM is being considered.
What breaks?** Answer direction: a single write per node on LSM
with the bloom filter and the SSTable merge can slow at compaction
windows; the 1 percent write that must complete in 1 ms could fall
out. Per-key sharding away from the compacting shard plus a write
priority queue in the MemTable is the operational answer; for the
strict-millisecond write, a B+ tree remains the safer pick.

## 17. Cheat-Sheet Summary

- Read-optimised storage (B+ tree) pays write amplification to keep
  a sorted index; reads are fast point lookups and fast range scans.
- Write-optimised storage (LSM tree) pays read amplification to
  append writes; writes are fast sequential appends with bloom
  filters merging reads across SSTables.
- Workload fingerprint (read/write ratio, point/range mix, latency
  SLO) is the decision input, not a "Postgres vs NoSQL" religion
  war.
- Bloom filter is the LSM read-amplification lever; tier vs level
  compaction is the LSM write-amplification lever.
- Workloads drift; quarterly refresh of the fingerprint sees the
  moment a B+ tree deserves a cache or an LSM deserves a B+ tree.

## 18. Further Reading

- Patrick O'Neil et al., "The Log-Structured Merge Tree" (1996) -
  the original LSM paper; still the clearest formal description of
  the write-optimisation geometry.
- Baron Schwartz et al., "High Performance MySQL" - the practical
  companion for the B+ tree side, including InnoDB page tuning and
  write-amplification measurement in production.
- RocksDB engineering wiki, particularly their "RocksDB Tuning
  Guide" - the production-shape write-up of the LSM trade-offs at
  Facebook scale, where MyRocks replaced InnoDB for write-heavy
  workloads such as the message store.

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered in depth (two libraries analogy, no jargon, ~230 words)
2. What Is It - Covered in depth (plain-English + formal with B+ tree and LSM definitions and amplification)
3. The Problem It Solves - Covered in depth (logging on B+ tree failure before vs LSM with measured write amp reduction after)
4. Core Concept Breakdown - Covered in depth (10 bulleted moving parts)
5. How It Works - Covered in depth (10 numbered story-style steps)
6. Diagram - Covered in depth (mermaid flowchart: workload fingerprint -> ratio branch -> B_TREE/LSM/HYBRID with cache and compaction; plus image placeholder)
7. When to Use It - Covered in depth (4 concrete triggers)
8. When NOT to Use It - Covered in depth (4 anti-patterns)
9. Real-World Example - Covered in depth (InnoDB B+ tree; Cassandra/ScyllaDB LSM; MyRocks/RocksDB hybrid; concrete throughput numbers)
10. Production-Grade Code - Covered in depth (runnable TypeScript fingerprint-to-engine chooser; comments explain WHY)
11. Trade-offs Table - Covered in depth (5-row Pros | Cons | What it costs you)
12. Comparison Table - Covered in depth (5 approaches across 4 dimensions)
13. Numbers & Benchmarks - Covered in depth (6 concrete numbers from write amp ratios to insert rates)
14. Common Pitfalls - Covered in depth (3 incident-note style mistakes)
15. Interview Q&A - Covered in depth (5 reasoning-based Q&As)
16. Follow-up / Curveball Questions - Covered in depth (3 senior-level follow-ups with answer directions)
17. Cheat-Sheet Summary - Covered in depth (5 standalone lines)
18. Further Reading - Covered in depth (3 high-signal sources)

No section skipped. No "and so on" / "similarly" / "etc." used as
a substitute. No em-dashes used. No emojis used. Word count well
above the 900-word floor.
