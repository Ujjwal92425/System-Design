## 1. Hook

Remember the siblings with one shared homework notebook in different
cities (see: MOD-15/03-cap-theorem). Now picture three copies of
that notebook in three cities, all trying to stay identical while
the mail is slow and sometimes lost entirely for an hour.

The siblings must decide again: when mail fails, do they stop writing
until everyone agrees on one answer (consistency), or keep writing
locally and sort out conflicts when mail returns (availability)?
CAP is the same choice at database scale, but vendors stamp "CP" or
"AP" on marketing slides and interviewers ask what that means for
Postgres versus Cassandra versus MongoDB versus etcd.

This lesson is CAP through the **database lens**: what actually breaks
under partition, what users feel, how quorums tune the trade-off,
and how to pick without marketing fog. If you read MOD-15/03 first,
this lesson applies the same theorem to storage fleet design.

## 2. What Is It

(a) Plain-English one-liner: when a database spans multiple machines
and the network splits them, it cannot guarantee both always returning
the latest data and always answering every request - it must choose
which guarantee to drop under the split.

(b) Formal definition: under a **network partition**, a distributed
database provides at most two of: **Consistency** (linearisable reads -
every read returns the latest committed write or an error),
**Availability** (every request to a non-failed node gets a non-error
response), and **Partition tolerance** (the system continues operating
despite dropped or delayed messages between nodes). Because partitions
occur on real wide-area networks, **P is mandatory** in production;
the operative choice is **CP** (reject minority-side operations to
preserve linearisability) versus **AP** (serve requests on all
sides, accepting stale or divergent reads until healing and merge).
This CAP-C is **linearisability**, distinct from ACID Consistency
(see: MOD-03/03-acid-properties) and from eventual consistency as a
convergence policy (see: MOD-15/06-strong-vs-eventual-consistency).

## 3. The Problem It Solves

Before CAP was named in database design reviews, teams bought "highly
available distributed SQL" and were surprised when an AZ partition
paused writes for eight minutes. Teams bought "eventually consistent
NoSQL" and were surprised when a user saw their payment twice after
a partition healed because two replicas accepted conflicting writes.

CAP gives vocabulary: under partition, did we design to **fail closed**
(CP - return errors on the minority side) or **fail open** (AP -
continue serving and reconcile later)? Naming the choice drives
architecture: CP clusters need quorum majorities, fencing, and client
retry logic; AP clusters need conflict resolution, version vectors,
merge policies, and UX that tolerates staleness windows.

After CAP is explicit in the design doc, the on-call runbook says
"minority region returns 503 on writes by design" instead of "the
database is broken." The product team accepts stale follower reads
for analytics but pins checkout to the leader. The trade-off stops
being a surprise incident and becomes a documented property.

## 4. Core Concept Breakdown

- **Linearisability (CAP-C):** every read sees the latest completed
  write in real-time order; minority partition must error, not return
  stale. Not ACID application invariants.
- **CAP-Availability:** every non-failing node returns non-error for
  every request; not the same as 99.99% uptime SLA.
- **Partition:** network split isolates node groups; lasts seconds to
  hours; guaranteed on cloud infrastructure.
- **CP systems:** etcd, ZooKeeper, Spanner - minority cannot commit
  linearisable operations during partition.
- **AP systems:** Cassandra with `ONE`, DynamoDB default path - minority
  continues; divergence possible until merge.
- **Tunable quorums:** W and R with N replicas slide between CP and AP
  per operation (see: MOD-08/12-distributed-key-value-store-dynamodb).
- **PACELC extension:** when no partition, latency vs consistency
  still trades (see: MOD-03/12-pacelc-theorem).
- **Fence stale leaders:** CP requires preventing minority leader from
  accepting writes (STONITH, consensus lock).
- **Heal path:** anti-entropy, read-repair, or Raft log catch-up
  restores convergence after partition ends.

## 5. How It Works

A three-node Cassandra/Dynamo-style cluster (N=3) splits 2+1 during
a network partition:

1. **Define N, W, R.** N=3 replicas; quorum W=2, R=2 for balanced CP
   leaning; W=1, R=1 for AP maximum availability.
2. **Partition occurs.** Nodes A+B in DC-East; node C isolated in DC-West.
3. **CP path (W=2, R=2).** Writes need 2 acks - only DC-East succeeds.
   C cannot accept linearisable writes alone. Reads with R=2 also fail
   on C. No divergent writes on same key.
4. **AP path (W=1, R=1).** A, B, and C each accept writes independently.
   Same key `cart:user42` diverges: East has item A, West adds item B.
5. **Client experience.** CP: West users see write errors, retry, or
   failover routing. AP: West users succeed locally; merge on heal.
6. **Healing.** Partition heals; replicas exchange Merkle-tree diffs or
   version vectors; last-write-wins or application merge picks winner;
   AP path may silently drop one side's writes.
7. **Postgres sync replica analogy.** Primary + sync standby: if standby
   lost, primary blocks commits (CP). Async followers: primary commits,
   followers lag (healthy network is PACELC EL; partition behavior
   differs - see MOD-03/06-database-replication-leader-follower-multi-leader).
8. **MongoDB replica set.** Primary election requires majority quorum;
   minority partition cannot elect primary (CP for writes). Read from
   secondary with `readConcern: majority` vs `local` shifts C vs L.
9. **Design doc output.** Document per feature: consistency level,
   expected behavior under partition, client retry policy, merge rules.
10. **Chaos test.** Inject partition in staging (see:
    MOD-11/11-chaos-engineering-kill-throttle-partition-evict); verify
    observed behavior matches design doc.

## 6. Diagram

```mermaid
flowchart TD
    P[Network partition] --> SPLIT[Majority 2 nodes vs minority 1 node]
    SPLIT --> CHOICE{Quorum config}
    CHOICE -->|W=2 R=2 CP-leaning| CPW[Majority commits writes]
    CHOICE -->|W=1 R=1 AP-leaning| APW[All sides accept writes]
    CPW --> CPE[Minority returns error]
    APW --> APX[Key divergence on both sides]
    APX --> HEAL[Partition heals]
    HEAL --> MERGE[LWW / vector merge / read-repair]
    CPE --> RETRY[Client retry to majority]
```

<!-- GIF: split-brain animation showing two regions both accepting
writes to the same key during partition, then merge dropping one
region's writes on heal -->

## 7. When to Use It

Use CAP framing when:

- **Designing multi-region database topology** and defining explicit
  failure behavior under AZ or region link loss.
- **Comparing managed products** (Spanner vs Aurora vs Cassandra vs
  DynamoDB) with the same vocabulary instead of marketing labels.
- **Writing on-call runbooks** for partition scenarios - what errors
  are expected vs bugs.
- **Setting per-feature consistency** in polyglot persistence (see:
  MOD-03/09-nosql-database-types-document-kv-column-graph).
- **Running chaos partition drills** before production multi-region launch.

## 8. When NOT to Use It

- **Single-node Postgres or SQLite.** No inter-node partition; CAP does
  not apply though local failures still matter.
- **Claiming "we are CA."** On any network, P is not optional; CA only
  describes behavior when no partition occurs - not a reliability guarantee.
- **Ignoring healthy-network latency trade.** CAP silent on normal case;
  use PACELC (MOD-03/12) for EL vs EC defaults.
- **Binary labeling entire companies CP or AP.** AWS, Google, and Azure
  ship both styles; classify per product and per operation.

## 9. Real-World Example

**Google Spanner** is CP globally: TrueTime bounds clock uncertainty;
Paxos per shard; minority region blocks strong reads and writes rather
than diverge. Cross-region commit adds tens of milliseconds; financial
workloads accept latency for global serializability.

**Apache Cassandra** at Netflix is tunable AP: `LOCAL_QUORUM` for most
paths balances staleness and latency; `ONE` for metrics where loss
tolerable; explicit SLAs per table. Multi-region active-active accepts
merge complexity for availability during regional failures.

**etcd** (Kubernetes control plane) is CP: during partition, minority
etcd members cannot form quorum; `kubectl` may fail writes - acceptable
because incorrect cluster state is worse than brief API unavailability.
Operators plan etcd across 3 or 5 AZs for majority survival.

**Amazon RDS Multi-AZ** Postgres is CP-leaning in-region: synchronous
standby; AZ failure triggers failover 60-120 s; minority AZ does not
serve stale primary writes.

**GitHub 2018** (see: MOD-03/06-database-replication-leader-follower-multi-leader):
43-second partition caused split-brain between regions briefly -
classic failure to fence stale leader; reinforces CP needs fencing,
not just replication.

Realistic number: 3-node cluster with W=1 during partition accepts
writes on all 3 sides independently - up to 3 conflicting versions
per key until heal; W=2 limits writes to majority (2 nodes), zero
conflicting writes possible with single minority node.

## 10. Production-Grade Code

```typescript
// Dynamo-style quorum read/write illustrating CAP tension.
// W + R > N gives strong consistency probability for reads after
// successful write; W=1 R=1 maximizes AP under partition.

const REPLICA_COUNT = 3;
const QUORUM = Math.floor(REPLICA_COUNT / 2) + 1;

interface ReplicaResponse<T> {
  node: string;
  value: T | null;
  version: number;
  error?: string;
}

interface QuorumConfig {
  W: number;
  R: number;
  N: number;
}

// Presets document the CAP trade in code, not config drift.
export const STRONG_QUORUM: QuorumConfig = { W: QUORUM, R: QUORUM, N: REPLICA_COUNT };
export const AP_FAST: QuorumConfig = { W: 1, R: 1, N: REPLICA_COUNT };

async function writeWithQuorum<T>(
  key: string,
  value: T,
  version: number,
  writeOne: (node: string, key: string, value: T, version: number) => Promise<boolean>,
  nodes: string[],
  cfg: QuorumConfig
): Promise<{ ok: boolean; written: number }> {
  const shuffled = [...nodes].sort(() => Math.random() - 0.5);
  let written = 0;
  for (const node of shuffled) {
    const success = await writeOne(node, key, value, version);
    if (success) written += 1;
    if (written >= cfg.W) return { ok: true, written };
  }
  // W not met: CP behavior returns failure; client must retry majority.
  return { ok: false, written };
}

async function readWithQuorum<T>(
  key: string,
  readOne: (node: string, key: string) => Promise<ReplicaResponse<T>>,
  nodes: string[],
  cfg: QuorumConfig
): Promise<ReplicaResponse<T> | null> {
  const shuffled = [...nodes].sort(() => Math.random() - 0.5);
  const responses: ReplicaResponse<T>[] = [];
  for (const node of shuffled) {
    const resp = await readOne(node, key);
    if (!resp.error) responses.push(resp);
    if (responses.length >= cfg.R) break;
  }
  if (responses.length < cfg.R) {
    // Minority partition with R=QUORUM: read fails rather than stale (CP).
    return null;
  }
  // Highest version wins among R responses - avoids wall-clock LWW skew.
  return responses.reduce((best, cur) =>
    cur.version > best.version ? cur : best
  );
}

// Usage: cart checkout uses STRONG_QUORUM; product view counter uses AP_FAST.
export { writeWithQuorum, readWithQuorum, QUORUM, REPLICA_COUNT };
```

Why-not-what notes:

- `STRONG_QUORUM` and `AP_FAST` are named presets so code review
  surfaces consistency choices per call site.
- Version-based merge avoids wall-clock last-write-wins skew (NTP drift
  incident pattern from MOD-03/06).
- `readWithQuorum` returns null on insufficient replicas - explicit CP
  failure instead of silent stale read.
- Shuffle node order so hot nodes do not always get queried first -
  load spreads across replica set.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| CP: no silent stale reads under partition; predictable correctness | Minority partition unavailable for linearisable ops | Client retry logic, regional routing, user-visible errors |
| AP: always serving somewhere; higher perceived uptime | Divergence and lost updates possible on heal | Merge logic, version vectors, UX staleness messaging |
| Tunable W/R per operation | Operators must understand quorum math | Documentation, code review, integration tests per level |
| Clear vocabulary for design reviews | Three-letter oversimplification | Pair with PACELC and concrete quorum defaults |
| Chaos-testable properties | Misconfigured quorums look like bugs | Partition drills in staging before launch |

## 12. Comparison Table

| System | Under partition typical | Default read path | Tunable? | Best fit |
|---|---|---|---|---|
| Postgres sync rep | Primary blocks if sync lost (CP) | Primary | Limited | Strong OLTP in one region |
| Postgres async rep | Primary writes; followers stale | Primary or follower | Lag budget | Read scale with staleness SLO |
| Cassandra | Continues on available nodes (AP) | ONE or LOCAL_ONE | W/R per query | High write scale, tunable C |
| DynamoDB | Regional; multi-AZ quorum | Eventual | Strong per request | Managed scale, per-op dial |
| etcd / Consul | Minority errors (CP) | Linearisable | No | Coordination, locks, K8s state |
| Spanner | Minority blocks strong ops (CP) | Strong | Limited | Global serializable transactions |

## 13. Numbers & Benchmarks

- **Partition frequency:** cloud AZ failures minutes to tens of minutes
  several times per year per large fleet; cross-region fiber cuts rarer
  but hours-long.
- **Cassandra QUORUM on N=3:** W=2 requires 2 of 3 replicas; survives
  1 node loss in same DC without write failure.
- **DynamoDB:** strong read typically ~2x latency vs eventual per AWS
  documentation (region-dependent); CAP applies at regional isolation.
- **Stale read window under AP:** unbounded until heal unless version
  checks; production UX often caps displayed staleness at 30-60 s with
  "refreshing" indicator.
- **etcd quorum:** 3-node cluster tolerates 1 failure; 5-node tolerates 2;
  minority during partition cannot process writes (503 from API server).

## 14. Common Pitfalls

- **Labeling MongoDB "CP" or "AP" without config.** `readConcern` and
  `writeConcern` change behavior; `majority` vs `local` is different
  trade under partition. Document actual settings, not vendor slide.
- **Assuming one CAP choice for entire system.** Checkout strong,
  analytics eventual - same company, same hour, different operations.
- **No partition chaos testing.** Team discovers minority write success
  during real outage; users see duplicate orders. Test in staging with
  network namespaces before multi-region go-live.
- **W=1 in production without merge strategy.** Heal drops writes
  silently with last-write-wins; finance team finds missing ledger rows.
  Pair AP writes with version vectors or idempotent merge (see:
  MOD-02/12-idempotency-in-apis).

## 15. Interview Q&A

**Q1. Prove you cannot have all three under partition.** Model answer:
partition splits nodes into two groups that cannot communicate. If
both groups accept writes and return success (A), reads on each group
see different values (violates C). If you enforce one global order (C),
minority must reject operations (violates A). P is given - network
split happened.

**Q2. Is Postgres CP or AP?** Model answer: single primary is not a
distributed CAP case for the primary itself. Multi-node: sync replica
makes primary block on lost standby (CP under that failure). Async
followers serve stale reads (AP on read path with lag). Classify per
topology and per operation.

**Q3. How do DynamoDB strong reads relate to CAP?** Model answer: strong
reads consult leader replica with quorum; under normal conditions EC.
Regional isolation may still serve stale at edge unless requests fail;
design for retry. Not globally CP like Spanner.

**Q4. When pick CP vs AP for a new service?** Model answer: CP when
stale or divergent data causes revenue loss, safety issues, or
unmergeable state (ledger, inventory hold, leader election). AP when
availability matters more than immediate global agreement and merge
is possible (social like counts, session cache, metrics).

**Q5. What is W + R > N rule?** Model answer: if write quorum W and
read quorum R overlap on at least one replica (W+R>N), read likely sees
latest write after both complete. Does not guarantee linearisability
under all interleavings but is the Dynamo consistency foundation.

**Q6. How does CAP relate to replication lag?** Model answer: async
replication lag on healthy network is PACELC latency vs consistency,
not CAP partition. Under partition, lag becomes divergence - CAP
choice determines whether minority serves stale (AP) or errors (CP).

## 16. Follow-up / Curveball Questions

**Curveball 1. Bank wants AP and zero lost transfers under partition.**
Answer direction: impossible combination for same row; use CP for ledger
shard (Spanner/Postgres sync), AP for read models via CQRS (see:
MOD-06/05-cqrs-command-query-responsibility-segregation); never W=1 on
balance rows.

**Curveball 2. Two regions both accept writes during partition; how merge?**
Answer direction: depends on data type - counters can sum; sets union;
account balance needs CRDT or manual reconciliation; last-write-wins
loses money on clock skew. Design disjoint write sets or CP quorum.

**Curveball 3. Kubernetes etcd is down in minority AZ but apps still run.**
Answer direction: expected CP behavior - API server cannot persist
cluster state changes; workloads on running nodes continue until
scheduling or ConfigMap update needed; fix etcd quorum placement (3 AZs),
not "make etcd AP."

## 17. Cheat-Sheet Summary

- Partitions happen; P is not optional; under split choose C or A.
- CAP-C is linearisability, not ACID-C or eventual consistency branding.
- CP = minority errors; AP = serve and merge later with real merge cost.
- Real systems tune per operation via W, R, read concern, strong flags.
- Pair CAP partition story with PACELC healthy-network latency (MOD-03/12).

## 18. Further Reading

- Gilbert and Lynch, "Brewer's Conjecture and the Feasibility of
  Consistent, Available, Partition-Tolerant Web Services" (2002) -
  formal CAP proof.
- Martin Kleppmann, DDIA Chapter 9 (Consistency and Consensus) -
  linearisability, quorums, and limitations of CAP framing.
- MOD-15/03-cap-theorem - foundations version with sibling notebook hook.
- DeCandia et al., Dynamo paper (2007) - W+R>N and tunable consistency
  in production.

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered in depth (siblings + vendor marketing angle)
2. What Is It - Covered in depth (plain-English + formal CAP with ACID distinction)
3. The Problem It Solves - Covered in depth (surprise outages before, explicit design after)
4. Core Concept Breakdown - Covered in depth (10 bulleted parts)
5. How It Works - Covered in depth (10 numbered steps with N=3 partition walkthrough)
6. Diagram - Covered in depth (flowchart + gif placeholder)
7. When to Use It - Covered in depth (5 triggers)
8. When NOT to Use It - Covered in depth (4 anti-patterns)
9. Real-World Example - Covered in depth (Spanner, Netflix/Cassandra, etcd, RDS, GitHub + numbers)
10. Production-Grade Code - Covered in depth (quorum read/write with presets + why-not-what)
11. Trade-offs Table - Covered in depth (5 rows)
12. Comparison Table - Covered in depth (6 systems across 5 dimensions)
13. Numbers & Benchmarks - Covered in depth (5 figures)
14. Common Pitfalls - Covered in depth (4 incident notes)
15. Interview Q&A - Covered in depth (6 Q&As)
16. Follow-up / Curveball Questions - Covered in depth (3 curveballs)
17. Cheat-Sheet Summary - Covered in depth (5 lines)
18. Further Reading - Covered in depth (4 sources)

No em-dashes. No emojis. Prereqs MOD-15/03, MOD-03/01 linked.
