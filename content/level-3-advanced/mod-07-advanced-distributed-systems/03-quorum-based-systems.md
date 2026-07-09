## 1. Hook

A club has seven board members. The rules say any major decision needs
four signatures. That means two different groups of four always share
at least one person. If someone tries to pass two conflicting decisions
in separate rooms, at least one board member would see both attempts.

Quorums use that same overlap trick. A distributed system does not ask
every replica for every operation. It asks enough replicas that read
and write groups overlap, so the system can find the latest accepted
value or prevent conflicting decisions.

The idea is simple. The details are not. Quorums can be used for strong
consistency, tunable consistency, leader election, and replicated logs.
The exact guarantee depends on which replicas you contact and what you
do with their answers.

## 2. What Is It

(a) Plain-English one-liner: a quorum is the minimum number of replicas
that must agree or respond before a distributed operation is considered
valid.

(b) Formal definition: a quorum-based system stores or decides data
across `N` replicas and requires read quorum `R` and write quorum `W`
such that selected replica sets overlap in useful ways. For strong
read-after-write in single-key replication, a common rule is
`R + W > N`; for consensus, a majority quorum is usually required for
decisions. Quorums are used in Dynamo-style databases, Cassandra,
leader election, Raft, Paxos, and distributed locks (see:
MOD-07/01-distributed-consensus-paxos-raft).

## 3. The Problem It Solves

Before quorums, a system either waits for every replica or trusts one
replica. Waiting for every replica makes one slow node block the whole
system. Trusting one replica can return stale data or accept writes
that disappear after failure.

After quorums, the system chooses a middle ground. A write may wait for
2 of 3 replicas. A read may ask 2 of 3 replicas and pick the newest
version. The operation survives one failure while still using overlap
to detect the latest value.

Quorums solve the "how many replicas are enough?" problem. They expose
the trade between latency, availability, and consistency instead of
pretending all three are free.

## 4. Core Concept Breakdown

- **Replication factor `N`:** total replicas storing a key or taking
  part in a decision.
- **Write quorum `W`:** number of replicas that must acknowledge a
  write.
- **Read quorum `R`:** number of replicas consulted for a read.
- **Overlap rule:** if `R + W > N`, every read quorum intersects every
  successful write quorum.
- **Majority quorum:** more than half of nodes, often used in
  consensus.
- **Tunable consistency:** caller chooses `R` and `W`, trading speed for
  freshness.
- **Sloppy quorum:** writes go to healthy substitute nodes when home
  replicas are down, improving availability but weakening simple
  overlap assumptions.
- **Read repair:** read path detects divergent replicas and repairs old
  values.
- **Versioning:** timestamps, vector clocks, or logical versions decide
  which value wins.

## 5. How It Works

Step by step, reading and writing with `N=3`, `W=2`, `R=2`:

1. **Client writes value V1.** Coordinator sends V1 to replicas A, B,
   and C.
2. **Two replicas acknowledge.** A and B store V1; C is slow.
3. **Write succeeds.** The coordinator returns success after `W=2`.
4. **Client reads the key.** Coordinator asks any `R=2` replicas.
5. **Read overlaps write.** Any pair of replicas must include A or B,
   so the read sees at least one copy of V1.
6. **Coordinator compares versions.** It chooses the newest value by
   timestamp, vector clock, or version.
7. **Read repair may run.** If C returns old data, coordinator updates
   C in the background.
8. **Failure changes availability.** If two replicas are down, neither
   read nor write quorum can form.
9. **Lower consistency can be requested.** `R=1` is faster but may be
   stale.
10. **Consensus quorums are stricter.** Raft and Paxos use majority
    quorums plus log and term rules, not only `R + W > N`.

Design review checks:

- **Is this a data quorum or a consensus quorum?** Do not mix the
  guarantees.
- **What resolves concurrent writes?** Quorum overlap does not remove
  conflict by itself.
- **Are quorums local or cross-region?** Geography determines latency.
- **Do clients choose consistency level?** If yes, document the stale
  read risk.

## 6. Diagram

```mermaid
flowchart TD
    CLIENT[Client] --> COORD[Coordinator]
    COORD --> A[Replica A]
    COORD --> B[Replica B]
    COORD --> C[Replica C]
    A -->|ack write| COORD
    B -->|ack write| COORD
    C -->|slow| COORD
    COORD --> SUCCESS[Write succeeds at W=2]
    READ[Read R=2] --> A
    READ --> C
    A --> LATEST[Newest version found]
    C --> REPAIR[Read repair]
```

<!-- IMAGE: three replicas with a write quorum of A+B and a read quorum
of A+C, highlighting the overlapping replica A -->

## 7. When to Use It

Use quorum-based replication when:

- **Replicas may be slow or unavailable.** You want operations to
  succeed without waiting for every replica.
- **Consistency level is a product choice.** Some reads can be stale;
  some cannot.
- **Single-key availability matters.** Dynamo-style stores expose
  useful tunable behavior.
- **Consensus or leader election needs safe majorities.** Majority
  overlap protects decisions.

## 8. When NOT to Use It

- **Do not assume `R + W > N` solves multi-key transactions.** It is a
  single-key replication rule, not ACID.
- **Do not use low quorums for critical reads.** `R=1` may return old
  data after a successful write.
- **Do not ignore conflict resolution.** Concurrent writes can both
  succeed in AP-style systems.
- **Do not use cross-region majority quorums without latency budget.**
  The physics will show up in p99.

## 9. Real-World Example

**Amazon Dynamo** used quorum-style reads and writes with vector clocks
to provide high availability under failures, while exposing conflicts
to application reconciliation.

**Apache Cassandra** exposes consistency levels such as ONE, QUORUM,
LOCAL_QUORUM, and ALL so callers can trade latency and consistency.

**Raft and Paxos** use majority quorums for leader election and log
commit. Unlike Dynamo-style tunable reads, consensus adds term and log
rules to guarantee one ordered history.

Realistic number: with replication factor 3, QUORUM requires 2
responses. With replication factor 5, QUORUM requires 3. A single
region quorum can be single-digit milliseconds; cross-region quorum can
easily add 50 to 150 ms.

## 10. Production-Grade Code

```go
package main

type VersionedValue struct {
	Value   string
	Version int64
}

func Quorum(n int) int {
	return (n / 2) + 1
}

func IsStrongReadPossible(n, r, w int) bool {
	return r+w > n
}

func PickNewest(values []VersionedValue) (VersionedValue, bool) {
	if len(values) == 0 {
		return VersionedValue{}, false
	}
	newest := values[0]
	for _, v := range values[1:] {
		if v.Version > newest.Version {
			newest = v
		}
	}
	return newest, true
}

func CanCommitWrite(acks, replicaCount int) bool {
	// Majority quorum is the default for consensus-style commit. Dynamo-
	// style systems may expose tunable W, but consensus needs stricter
	// protocol rules around the quorum.
	return acks >= Quorum(replicaCount)
}
```

Why-not-what notes:

- `R + W > N` is a useful freshness condition for one key, not a full
  transaction protocol.
- Version comparison is shown as an integer for clarity; production
  AP stores may need vector clocks or hybrid logical clocks.
- Majority commit alone is not Raft; it must be paired with term and
  log-matching rules.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Avoids waiting for all replicas | Some settings allow stale reads | Consistency-level discipline |
| Majority overlap protects decisions | Cross-region quorum adds latency | Region-aware placement |
| Tunable consistency fits mixed workloads | Application may see conflicts | Versioning and reconciliation |
| Read repair heals stale replicas | Read path does extra work | Background repair and monitoring |
| Smaller quorums improve availability | Lower consistency can surprise users | Product-visible semantics |

## 12. Comparison Table

| Setting | Read freshness | Write availability | Latency | Best fit | Risk |
|---|---|---|---|---|---|
| R=1, W=1, N=3 | low | high | lowest | caches, noncritical reads | stale reads |
| R=2, W=2, N=3 | strong for one key | medium | medium | user profile or cart | quorum unavailable after 2 failures |
| R=1, W=3, N=3 | strong after write | low | high write cost | rare critical writes | slow writes |
| R=3, W=1, N=3 | strong reads if all available | high write availability | high read cost | audit reads | reads fragile |
| Majority consensus | strong ordered log | medium | medium to high | metadata, CP databases | leader and quorum operations |

## 13. Numbers & Benchmarks

- **Majority formula:** quorum size is `floor(N/2) + 1`.
- **Failure tolerance:** 3 replicas tolerate 1 failure for quorum; 5
  tolerate 2.
- **Overlap condition:** `R + W > N` ensures a read quorum sees at
  least one replica from the latest successful write quorum.
- **Availability trade:** with `N=3`, `W=2` cannot write if two replicas
  are unavailable.
- **Latency:** quorum latency is usually the latency of the slowest
  required response, not the average response.
- **Cassandra default pattern:** LOCAL_QUORUM keeps quorum inside one
  region to reduce cross-region latency.

## 14. Common Pitfalls

- **Incident: stale read from ONE.** A user updated settings with
  QUORUM but the next read used ONE and hit a stale replica.
- **Incident: timestamp conflict.** Two regions wrote with skewed
  clocks and last-write-wins deleted the newer business update.
- **Incident: quorum across oceans.** A product page read used global
  quorum and p99 jumped above 600 ms during inter-region congestion.

## 15. Interview Q&A

**Q1. What does `R + W > N` mean?** Model answer: every successful read
quorum overlaps every successful write quorum, so the read can observe
at least one latest written replica for a single key.

**Q2. Is quorum the same as consensus?** Model answer: no. Consensus
uses quorums plus protocol rules like terms, ballots, and log matching.
Quorum reads and writes alone do not create a single ordered log.

**Q3. Why use LOCAL_QUORUM?** Model answer: it keeps quorum inside one
region or data center, reducing latency while still requiring overlap
within that locality.

**Q4. How do quorums handle concurrent writes?** Model answer: quorum
overlap detects versions but does not automatically merge business
conflicts. The system needs conflict resolution.

**Q5. What is read repair?** Model answer: when a read sees stale
replicas, the coordinator repairs them by writing the newest value
back.

## 16. Follow-up / Curveball Questions

**Curveball 1. You need low latency and strong global consistency.**
Answer direction: physics says cross-region strong consistency costs
round trips. Consider regional writes, local reads, or narrower
consistency scope.

**Curveball 2. A client mixes QUORUM writes with ONE reads.** Answer
direction: writes may be durable, but reads can still be stale. Match
read consistency to product guarantees.

**Curveball 3. Two clients write different values at the same time.**
Answer direction: use vector clocks, compare-and-set, consensus, or
domain merge rules depending on the invariant.

## 17. Cheat-Sheet Summary

- Quorum means enough replicas to treat an operation as valid.
- Majority quorums overlap, which protects decisions.
- `R + W > N` helps single-key read-after-write freshness.
- Quorum systems still need versioning and conflict resolution.
- Cross-region quorum gives stronger consistency but higher latency.

## 18. Further Reading

- Amazon Dynamo paper - quorum, vector clocks, and high availability:
  https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf
- Cassandra consistency documentation - tunable consistency levels:
  https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
- Whittaker et al., "Read-Write Quorum Systems Made Practical" -
  deeper treatment of quorum trade-offs:
  https://arxiv.org/abs/2104.04102

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (board signatures analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (all replicas vs one replica before, quorum after)
4. Core Concept Breakdown - Covered (9 concepts)
5. How It Works - Covered (10 steps plus design review checks)
6. Diagram - Covered (flowchart)
7. When to Use It - Covered (4 triggers)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (Dynamo, Cassandra, Raft/Paxos)
10. Production-Grade Code - Covered (Go quorum helpers)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (5 settings)
13. Numbers & Benchmarks - Covered (6 figures)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 URL-backed sources)

No em-dashes. No emojis. Cross-links included.
