## 1. Hook

Five people are trapped in different rooms during a storm. They must
choose one safe meeting point, but the phones are unreliable. Some
calls fail. Some people hear old messages. One person may pass out
halfway through the discussion. The dangerous outcome is not slow
decision-making. The dangerous outcome is two groups confidently
walking to different places.

Consensus is the rulebook that prevents that split. It does not make
the storm disappear. It says how a group can choose one value even when
machines crash, messages are delayed, and leaders change.

Paxos and Raft are two famous rulebooks. Paxos is the mathematical
foundation. Raft is designed to be easier for humans to understand and
implement. Both exist because distributed systems need one answer where
many machines could otherwise disagree.

## 2. What Is It

(a) Plain-English one-liner: distributed consensus lets multiple
machines agree on one value or one ordered log of values even when some
machines fail or messages are delayed.

(b) Formal definition: distributed consensus is the problem of getting
a set of nodes to agree on a single value while satisfying safety
(never deciding two different values), validity (decided values were
proposed), and liveness (eventually deciding when enough nodes and the
network behave). Paxos and Raft solve consensus for crash-fault
systems using quorums and leader-like roles, assuming a majority of
nodes remain available. Consensus usually backs replicated logs for
configuration, metadata, and strongly consistent storage (see:
MOD-03/06-database-replication-leader-follower-multi-leader and
MOD-05/01-load-balancing-algorithms).

## 3. The Problem It Solves

Before consensus, a replicated system can split its brain. Two
database replicas both believe they are primary. One accepts writes in
region A while the other accepts writes in region B. When the network
heals, both histories exist and no simple timestamp can prove which
one is correct. Users see lost writes or duplicate resources.

After consensus, a majority must agree before a leader can commit an
entry. If a leader is isolated from the majority, it cannot commit. A
new leader must contain every committed entry before it can safely
continue the log. The system may pause during failure, but it will not
invent two committed truths.

Consensus solves the "one durable decision" problem. It trades
availability during partitions for safety and a single ordered history.

## 4. Core Concept Breakdown

- **Safety:** the system never commits two conflicting decisions, even
  during crashes or delayed messages.
- **Liveness:** the system eventually makes progress when a majority is
  reachable and timing becomes stable enough.
- **Quorum:** a majority of nodes; any two majorities overlap in at
  least one node.
- **Term or ballot:** monotonically increasing election epoch used to
  reject stale leaders.
- **Leader:** node that coordinates proposals for a period of time.
- **Replicated log:** ordered sequence of commands agreed by the
  cluster and applied to state machines.
- **Commit index:** highest log entry known to be safely replicated on
  a quorum.
- **State machine:** deterministic application logic that applies the
  same committed log entries in the same order.
- **Crash fault:** node stops or restarts, but does not lie. Paxos and
  Raft are not Byzantine protocols.

## 5. How It Works

Step by step, Raft-style log consensus:

1. **Nodes start as followers.** They wait for leader heartbeats.
2. **A follower times out.** It increments its term and becomes a
   candidate.
3. **Candidate asks for votes.** Followers vote once per term and only
   for a candidate whose log is at least as up to date as theirs.
4. **Majority elects a leader.** A leader begins sending heartbeats and
   accepts client commands.
5. **Leader appends locally.** The command becomes an uncommitted log
   entry.
6. **Leader replicates to followers.** Followers append if the previous
   log index and term match.
7. **Majority acknowledges.** Once a quorum stores the entry, the
   leader marks it committed.
8. **State machines apply entries in order.** Every node eventually
   applies the same committed log sequence.
9. **Leader failure triggers election.** A new leader must have all
   committed entries because voting rules protect log completeness.
10. **Stale leaders step down.** Any node seeing a higher term updates
    its term and becomes follower.

Senior review questions:

- **What is the quorum size and failure tolerance?** A 3-node cluster
  tolerates 1 failure; a 5-node cluster tolerates 2.
- **What happens during a network partition?** The majority side may
  continue; the minority side must reject writes.
- **How are membership changes handled?** Joint consensus or equivalent
  avoids two different majorities during reconfiguration.
- **How are snapshots and log compaction done?** Infinite logs are not
  operationally viable.

## 6. Diagram

```mermaid
stateDiagram-v2
    [*] --> Follower
    Follower --> Candidate: election timeout
    Candidate --> Leader: receives majority votes
    Candidate --> Follower: sees higher term
    Leader --> Follower: sees higher term
    Leader --> Leader: append and replicate log
    Follower --> Follower: receive heartbeat
```

<!-- IMAGE: three-node Raft cluster showing leader replication to two
followers, majority commit, and a minority partition rejecting writes -->

## 7. When to Use It

Use consensus when:

- **One authoritative decision matters.** Leader identity, metadata,
  locks, cluster membership, and configuration need one truth.
- **Strong consistency beats partition availability.** The system
  should pause rather than accept conflicting writes.
- **Replicated state machines need identical order.** Databases and
  coordination systems use consensus logs for this.
- **Human operators need safe failover.** Automatic primary election
  must not create two primaries.

## 8. When NOT to Use It

- **Do not use consensus for every user write by default.** It adds
  latency and availability trade-offs.
- **Do not use Paxos or Raft for Byzantine settings.** They do not
  handle malicious or lying nodes.
- **Do not stretch one consensus group across high-latency regions
  casually.** Majority round trips dominate write latency.
- **Do not build it yourself unless it is the product.** Use etcd,
  ZooKeeper, Consul, CockroachDB, or proven libraries.

## 9. Real-World Example

**etcd** uses Raft to store Kubernetes cluster state. When Kubernetes
updates pod, lease, or configuration objects, etcd provides a strongly
consistent backing store.

**Google Chubby** used Paxos-style consensus for a lock service and
metadata coordination. It influenced ZooKeeper and many later systems.

**CockroachDB** and **TiKV** use Raft groups to replicate ranges of
data, giving strongly consistent distributed SQL or key-value storage.

Realistic number: a 5-node Raft group can tolerate 2 node failures but
requires 3 acknowledgements to commit. A write between US east and US
west regions often pays tens of milliseconds of extra round-trip time
compared with a single-region quorum.

## 10. Production-Grade Code

```go
package main

import "errors"

type Role string

const (
	Follower  Role = "follower"
	Candidate Role = "candidate"
	Leader    Role = "leader"
)

type Node struct {
	ID          string
	Role        Role
	CurrentTerm int
	VotedFor    string
	Votes       map[string]bool
	ClusterSize int
}

func (n *Node) StartElection() {
	n.Role = Candidate
	n.CurrentTerm++
	n.VotedFor = n.ID
	n.Votes = map[string]bool{n.ID: true}
}

func (n *Node) ReceiveVote(term int, voter string, granted bool) error {
	if term < n.CurrentTerm {
		return errors.New("stale vote")
	}
	if term > n.CurrentTerm {
		n.stepDown(term)
		return nil
	}
	if n.Role != Candidate || !granted {
		return nil
	}
	n.Votes[voter] = true
	if len(n.Votes) >= n.majority() {
		n.Role = Leader
	}
	return nil
}

func (n *Node) ReceiveAppendEntries(term int) {
	if term >= n.CurrentTerm {
		// A node that sees a newer or equal leader term must stop acting
		// as candidate or leader. This is the core stale-leader guard.
		n.stepDown(term)
	}
}

func (n *Node) majority() int {
	return (n.ClusterSize / 2) + 1
}

func (n *Node) stepDown(term int) {
	n.Role = Follower
	n.CurrentTerm = term
	n.VotedFor = ""
	n.Votes = nil
}
```

Why-not-what notes:

- This is not full Raft. It isolates the term and majority mechanics
  that protect against stale leaders.
- The majority function is the safety hinge: two majorities overlap,
  so a committed entry cannot disappear from all future leaders.
- Real implementations must persist `CurrentTerm`, `VotedFor`, and log
  entries before responding.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Prevents split-brain committed state | Writes need majority round trips | Higher write latency than async replication |
| Gives deterministic failover | Minority partitions become unavailable | Clear client errors and retry behavior |
| Replicated log simplifies state machine design | Operationally complex | Snapshots, log compaction, membership changes |
| Proven foundation for metadata systems | Not Byzantine fault tolerant | Trust boundary and secure transport |
| Strong consistency is easier to reason about | Throughput per group is limited by leader | Sharding into many consensus groups |

## 12. Comparison Table

| Protocol | Understandability | Common use | Leader model | Reconfiguration | Main risk |
|---|---|---|---|---|---|
| Basic Paxos | hard | theory foundation | proposer/acceptor | complex | implementation mistakes |
| Multi-Paxos | medium-hard | replicated logs | stable leader optimization | complex | subtle safety bugs |
| Raft | medium | etcd, TiKV, teaching | explicit leader | joint consensus | operational tuning |
| Zab | medium | ZooKeeper | primary-backup broadcast | ensemble config | ZooKeeper-specific semantics |

## 13. Numbers & Benchmarks

- **Failure tolerance:** with `N = 2f + 1`, a consensus group tolerates
  `f` crash failures.
- **Commit quorum:** 3 nodes need 2 acknowledgements; 5 need 3; 7 need
  4.
- **Latency floor:** one consensus write usually needs at least one
  leader-to-follower round trip after the leader receives the command.
- **Region cost:** cross-region quorum writes often add 30 to 150 ms
  depending on geography.
- **Group size:** many systems use 3 or 5 voters. Larger groups improve
  failure tolerance but increase quorum latency and operational cost.
- **Snapshot trigger:** production systems often snapshot after tens of
  thousands of log entries or when log size crosses a storage threshold.

## 14. Common Pitfalls

- **Incident: election timeout too low.** Normal GC pauses caused
  repeated leader elections and write unavailability.
- **Incident: stale leader accepted writes.** A partitioned leader did
  not step down after losing quorum, creating split-brain application
  state outside the consensus log.
- **Incident: reconfiguration lost quorum.** Operators removed a node
  while another was down, turning a degraded cluster into an offline
  cluster.

## 15. Interview Q&A

**Q1. Why does consensus require a majority?** Model answer: any two
majorities overlap. That overlap carries information about committed
values into future elections, preventing two conflicting decisions.

**Q2. Paxos vs Raft?** Model answer: both solve crash-fault consensus.
Paxos is the older theoretical family; Raft structures the same
problem around leader election, log replication, and safety in a way
that is easier to teach and implement.

**Q3. What happens if the leader is partitioned away from the majority?**
Model answer: it must stop committing. The majority side can elect a
new leader; the minority side rejects or times out writes.

**Q4. Why not use timestamps to choose the latest write?** Model
answer: clocks drift and "latest" is not the same as "safely agreed."
Consensus is about agreement, not wall-clock ordering.

**Q5. What must be persisted in Raft?** Model answer: current term,
vote, and log entries before responses. Losing those on restart can
violate election or log safety.

## 16. Follow-up / Curveball Questions

**Curveball 1. A 3-node cluster loses one node and another is slow.**
Answer direction: the cluster may be unavailable because it cannot get
2 timely acknowledgements. Consensus tolerates failures, not arbitrary
slowness plus failure for free.

**Curveball 2. The product wants writes in every region during a
partition.** Answer direction: that conflicts with single-value
consensus. Use local writes with conflict resolution, or accept CP
availability trade-offs.

**Curveball 3. Can we run a 2-node Raft cluster?** Answer direction:
avoid it. Two nodes still need a majority of 2, so one failure stops
writes. Add a third voter or witness.

## 17. Cheat-Sheet Summary

- Consensus lets nodes agree on one value or one ordered log.
- Safety means no conflicting committed decisions.
- Majority quorums work because every two majorities overlap.
- Raft packages consensus as leader election plus log replication.
- Use proven systems; consensus bugs are severe and subtle.

## 18. Further Reading

- Diego Ongaro and John Ousterhout, "In Search of an Understandable
  Consensus Algorithm" - Raft paper:
  https://raft.github.io/raft.pdf
- Leslie Lamport, "Paxos Made Simple" - concise Paxos explanation:
  https://lamport.azurewebsites.net/pubs/paxos-simple.pdf
- Google, "The Chubby lock service for loosely-coupled distributed
  systems" - production Paxos-style coordination:
  https://research.google/pubs/the-chubby-lock-service-for-loosely-coupled-distributed-systems/

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (storm meeting analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (split-brain before, quorum log after)
4. Core Concept Breakdown - Covered (9 concepts)
5. How It Works - Covered (10 Raft steps plus review questions)
6. Diagram - Covered (stateDiagram-v2)
7. When to Use It - Covered (4 triggers)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (etcd, Chubby, CockroachDB/TiKV)
10. Production-Grade Code - Covered (Go election mechanics)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (4 protocols)
13. Numbers & Benchmarks - Covered (6 figures)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 URL-backed sources)

No em-dashes. No emojis. Cross-links included.
