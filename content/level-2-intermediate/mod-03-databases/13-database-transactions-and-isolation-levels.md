## 1. Hook

Two people edit a shared spreadsheet cell at the same time. One types
"Seattle," the other types "Portland." Without rules, the saved value
is whoever clicked last - or a corrupted merge neither intended. Add
a rule: "only one person may edit row 5 at a time" - that is locking.
Add another: "each person sees their own edits immediately but others'
edits only after they refresh" - that is an isolation level.

Database transactions bundle those rules so multiple SQL statements
behave like one atomic unit, and isolation levels define how much
simultaneous traffic each transaction sees from others' in-flight work.
Get either wrong and money disappears, tickets double-sell, or reports
disagree with each other on the same afternoon.

## 2. What Is It

(a) Plain-English one-liner: a transaction groups database operations
into an all-or-nothing unit, and isolation levels control how much
one transaction sees of others' unfinished or concurrent work.

(b) Formal definition: a **transaction** is a sequence of operations
executed as a single logical unit obeying **ACID** (see:
MOD-03/03-acid-properties): **Atomicity** (all commit or all abort),
**Consistency** (application invariants hold), **Isolation** (concurrent
transactions interleave as if serially ordered, per level), **Durability**
(committed work survives crash). **Isolation levels** (SQL standard)
define permitted anomalies: **Read Uncommitted** (dirty reads allowed),
**Read Committed** (no dirty reads), **Repeatable Read** (stable read
set for row re-reads), **Serializable** (full serial equivalence).
Implementations differ: PostgreSQL Repeatable Read is **snapshot isolation**;
Serializable uses **SSI** (Serializable Snapshot Isolation). InnoDB
Repeatable Read uses **next-key locking** reducing phantoms. **MVCC**
(multi-version concurrency control) implements isolation by snapshot
versions without readers blocking writers in most paths.

## 3. The Problem It Solves

Without transactions, transfer A to B can debit account A then crash
before crediting B - money vanishes from the system. Without isolation
rules, Report A reads half-updated inventory while Report B sees the
other half - phantom rows appear and vanish between statements in the
same report run.

Before explicit isolation discipline, ORMs opened implicit transactions,
developers held locks across HTTP calls to Stripe, and on-sales melted
databases with Serializable on entire catalog tables. After naming the
right level per use case, web OLTP runs Read Committed with short
transactions; seat booking uses row locks or Serializable on narrow
key ranges; analytics runs on followers with snapshot or warehouse lag.

Transactions plus the correct isolation level let concurrent OLTP share
one database without application-level global locks on every row - but
the level must match the anomaly you actually fear, not the highest
name on the checklist.

## 4. Core Concept Breakdown

- **BEGIN / COMMIT / ROLLBACK:** transaction boundaries; ROLLBACK
  discards uncommitted work; COMMIT makes durability guarantee.
- **Dirty read:** transaction reads uncommitted data from another txn;
  blocked at Read Committed and above.
- **Non-repeatable read:** same row read twice in one txn returns
  different values; blocked at Repeatable Read snapshot.
- **Phantom read:** range query returns different row set on rerun;
  blocked at Serializable or InnoDB next-key locks.
- **Lost update:** two txns read-modify-write same row; last commit
  wins without locking; fix with `FOR UPDATE` or optimistic versioning.
- **MVCC:** readers see snapshot timestamp; writers create new row
  versions; vacuum reclaims old versions (Postgres autovacuum critical).
- **Deadlock:** circular wait on row locks; DB picks victim, rolls back
  one txn; app retries with backoff.
- **Lock ordering:** always lock rows in deterministic order (sorted
  IDs) to prevent deadlock chains.
- **Distributed transactions:** 2PC across shards is slow and brittle
  (see: MOD-17/09-3pc-three-phase-commit-protocol); prefer saga per shard.
- **Idempotency + retry:** txn retry after deadlock needs idempotency
  keys (see: MOD-02/12-idempotency-in-apis).

## 5. How It Works

**Path A: Bank transfer** ($100 from A to B on Postgres):

1. **BEGIN** explicit transaction (or single interactive txn block).
2. **Lock rows in sorted order** - `SELECT ... WHERE id IN (A,B) ORDER BY id FOR UPDATE`
   prevents deadlock when concurrent transfers cross accounts.
3. **Read balance** for source account; validate >= $100.
4. **UPDATE** debit source; **UPDATE** credit destination.
5. **INSERT** immutable ledger audit row in same txn.
6. **COMMIT** - WAL fsync makes durable; both changes visible atomically.
7. On any error, **ROLLBACK** - no partial debit visible to other txns.

**Path B: Concert seat hold** (prevent double-sell):

1. **BEGIN** at Read Committed (Postgres default).
2. **SELECT seat FROM seats WHERE id=7 FOR UPDATE** - exclusive row lock.
3. If `status='available'`, **UPDATE** to `held` with `hold_expires_at`.
4. **COMMIT** within 100 ms - release lock quickly.
5. Concurrent txn2 blocks on step 2 until txn1 commits; then sees
   `held` and fails user-facing "seat taken" path.
6. Alternative: **Serializable** on narrow seat table - SSI detects rw-
   conflicts without explicit `FOR UPDATE` but costs throughput on hot on-sales.

**Path C: Monthly revenue report inside one txn:**

1. **BEGIN ISOLATION LEVEL REPEATABLE READ** - snapshot frozen at start.
2. Run multiple aggregation queries; all see same snapshot even if
   concurrent writes commit mid-report.
3. **COMMIT** - report internally consistent; may lag live data by seconds.

## 6. Diagram

```mermaid
flowchart TD
    T1[Txn 1 BEGIN] --> W1[Write row X uncommitted]
    T2[Txn 2 BEGIN] --> R2[Read row X]
    W1 --> ISO{Isolation level}
    ISO -->|Read Uncommitted| RU[Txn2 sees dirty X - rare in prod]
    ISO -->|Read Committed| RC[Txn2 sees only committed X]
    ISO -->|Repeatable Read| RR[Txn2 sees snapshot at txn start]
    ISO -->|Serializable| SER[SSI or locks enforce serial order]
    W1 --> C1[Txn1 COMMIT]
    C1 --> VIS[X committed visible per level rules]
    T2 --> C2[Txn2 COMMIT or ROLLBACK]
```

<!-- GIF: timeline animation of two transactions interleaving reads/writes
under Read Committed vs Serializable showing phantom row prevented -->

## 7. When to Use It

Use transactions when:

- **Multi-step invariants** must be atomic (debit+credit, order row +
  inventory decrement, payment + ledger entry).
- **Read Committed** as default for web OLTP - Postgres, SQL Server,
  Oracle defaults; matches most anomaly tolerance.

Use higher isolation when:

- **Repeatable Read snapshot** for multi-statement reports or batch
  jobs needing consistent point-in-time within one txn.
- **Serializable or explicit row locks** for seat booking, inventory
  holds, financial reconciliation where phantom rows cause double-sell
  or incorrect totals.
- **Short transaction duration** always - target p99 txn time under
  50 ms for OLTP; long txns block vacuum and pile locks.

## 8. When NOT to Use It

- **Cross-shard updates as one SQL transaction** - use saga with
  compensating actions (see: MOD-06/07-saga-pattern-distributed-transactions).
- **Serializable on entire hot tables** for all traffic - throughput
  collapses; scope Serializable to conflict-prone keys only.
- **External side effects inside txn** (HTTP call, Kafka publish before
  COMMIT) - use transactional outbox (MOD-06/08-transactional-outbox-pattern).
- **Long-running analytics in primary OLTP txn** - use follower snapshot
  or warehouse; blocks MVCC cleanup.

## 9. Real-World Example

**Stripe** ledger operations use Postgres with careful transaction
boundaries, idempotency keys, and retry on serialization failures;
money movement never relies on last-write-wins across concurrent API
retries (see: MOD-02/12-idempotency-in-apis).

**PostgreSQL** defaults to Read Committed; Repeatable Read provides
snapshot isolation; Serializable adds SSI tracking rw-dependencies to
detect anomalies without full table locking.

**MySQL InnoDB** defaults to Repeatable Read with next-key (gap) locks
on indexed searches - reduces phantoms compared to plain snapshot but
surprises developers expecting Oracle behavior.

**Ticketmaster-class on-sales** hold seats with `SELECT FOR UPDATE` on
row, sub-100 ms txn duration, connection pool sized for spike; p99 lock
wait monitored as leading indicator of sellout contention.

**Shopify** order creation transactions bundle inventory decrement,
order row, and payment state on sharded MySQL (Vitess) - per-shard
transactions, not cross-shard 2PC.

Realistic numbers: well-tuned OLTP deadlock rate under 0.01% of
transactions; Serializable on hot row drops throughput 2-10x vs Read
Committed in benchmarks; txn duration over 500 ms correlates with lock
pile-ups during peak.

## 10. Production-Grade Code

```typescript
import type { Pool, PoolClient } from "pg";

const TRANSFER_AMOUNT_CENTS = 10_000;
const MAX_DEADLOCK_RETRIES = 3;

export async function transferFunds(
  pool: Pool,
  fromId: string,
  toId: string,
  amountCents: number = TRANSFER_AMOUNT_CENTS
): Promise<void> {
  // Retry loop handles deadlock victim rollback - idempotency key
  // at API layer still required for client retries, not only DB deadlocks.
  for (let attempt = 0; attempt < MAX_DEADLOCK_RETRIES; attempt++) {
    const client = await pool.connect();
    try {
      await executeTransfer(client, fromId, toId, amountCents);
      return;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "40P01" && attempt < MAX_DEADLOCK_RETRIES - 1) {
        // 40P01 = deadlock_detected; exponential backoff reduces
        // immediate re-deadlock on same hot accounts.
        await sleep(50 * 2 ** attempt);
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
}

async function executeTransfer(
  client: PoolClient,
  fromId: string,
  toId: string,
  amountCents: number
): Promise<void> {
  const [first, second] = fromId < toId ? [fromId, toId] : [toId, fromId];

  await client.query("BEGIN");
  try {
    // Sorted FOR UPDATE lock order prevents circular wait deadlock
    // when two transfers cross A<->B concurrently.
    await client.query(
      `SELECT id FROM accounts WHERE id IN ($1, $2) ORDER BY id FOR UPDATE`,
      [first, second]
    );

    const bal = await client.query<{ balance_cents: number }>(
      `SELECT balance_cents FROM accounts WHERE id = $1`,
      [fromId]
    );
    if (!bal.rows[0] || bal.rows[0].balance_cents < amountCents) {
      throw new Error("insufficient funds");
    }

    await client.query(
      `UPDATE accounts SET balance_cents = balance_cents - $1 WHERE id = $2`,
      [amountCents, fromId]
    );
    await client.query(
      `UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2`,
      [amountCents, toId]
    );
    await client.query(
      `INSERT INTO ledger (from_id, to_id, amount_cents) VALUES ($1, $2, $3)`,
      [fromId, toId, amountCents]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

export async function holdSeat(
  client: PoolClient,
  seatId: number,
  userId: string,
  holdSeconds: number
): Promise<boolean> {
  await client.query("BEGIN");
  try {
    const row = await client.query<{ status: string }>(
      `SELECT status FROM seats WHERE id = $1 FOR UPDATE`,
      [seatId]
    );
    if (!row.rows[0] || row.rows[0].status !== "available") {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `UPDATE seats SET status = 'held', held_by = $1,
         hold_expires_at = NOW() + ($2 || ' seconds')::interval
       WHERE id = $3`,
      [userId, holdSeconds, seatId]
    );
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
```

Why-not-what notes:

- Lock ordering by sorted account IDs is mandatory pattern for multi-row
  financial updates - without it deadlock rate climbs with concurrency.
- Deadlock retry catches Postgres `40P01` only; serialization_failure
  `40001` needs same treatment under Serializable isolation.
- `holdSeat` keeps txn short - no external API inside BEGIN/COMMIT block.
- Ledger insert in same txn as balance updates gives audit trail matching
  atomic commit boundary.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Atomicity prevents partial updates visible to other sessions | Lock contention reduces concurrent throughput | Retry logic, short txn discipline |
| Read Committed: high throughput for web OLTP | Non-repeatable reads and phantoms still possible | Explicit locks where anomalies matter |
| Repeatable Read: stable snapshot for multi-query txn | Snapshot may be stale vs live primary | Long snapshots block vacuum (bloat) |
| Serializable: strongest anomaly prevention | 2-10x throughput drop on hot keys | Conflict monitoring, narrow scope only |
| MVCC: readers rarely block writers | Version bloat without autovacuum | Autovacuum tuning, long txn alerts |

## 12. Comparison Table

| Level | Dirty read | Non-repeatable | Phantom | Postgres behavior | InnoDB default | Typical use |
|---|---|---|---|---|---|---|
| Read Uncommitted | Yes | Yes | Yes | Treated as RC | Rare | Almost never |
| Read Committed | No | Yes | Yes | Default | Optional | Web OLTP default |
| Repeatable Read | No | No | Varies | Snapshot isolation | Default + gap locks | In-txn reports |
| Serializable | No | No | No | SSI conflict detection | Available | Booking, ledger slices |

## 13. Numbers & Benchmarks

- **Deadlock rate:** well-designed OLTP under 0.01% transactions; alert
  above 0.1% indicates lock ordering bug or hot row design issue.
- **Serializable throughput:** 2-10x lower than Read Committed on
  contended keys in pgbench-style tests; acceptable only on narrow paths.
- **OLTP txn duration target:** p99 under 50 ms; over 500 ms risks lock
  chains and vacuum bloat on Postgres.
- **Seat hold txn:** sub-100 ms p99 during on-sales; lock wait p99
  monitored separately from query latency.
- **MVCC bloat:** transactions open hours (misplaced BEGIN) can block
  autovacuum; table bloat 2-5x until txn ends.

## 14. Common Pitfalls

- **Long transactions holding locks during HTTP calls.** Pattern: BEGIN,
  call Stripe API 2 seconds, COMMIT. Locks held entire time; on-sales
  freeze. Fix: external calls after COMMIT or outbox pattern.
- **ORM default isolation unknown.** Django, SQLAlchemy, Prisma differ;
  SQLite has different locking model entirely. Verify `default_transaction_isolation`
  in production config.
- **Assuming Repeatable Read means no races.** Postgres RR prevents
  non-repeatable read but not all write skew without Serializable or
  explicit locks; InnoDB gap locks behave differently on non-indexed columns.
- **Serializable on whole API.** One endpoint enables Serializable globally;
  p99 latency 10x; fix by row-level `FOR UPDATE` on conflict keys only.

## 15. Interview Q&A

**Q1. Difference Read Committed vs Repeatable Read?** Model answer: RC
sees latest committed data per statement; each statement gets fresh snapshot.
RR sees one snapshot for entire transaction lifetime; re-read same row
gets same value even if others committed changes.

**Q2. When Serializable?** Model answer: when phantom rows cause double
booking, financial mis-report, or inventory oversell - anomalies RC/RR
allow. Scope to narrow tables or use explicit locks if Serializable
too expensive globally.

**Q3. How handle deadlocks?** Model answer: database picks victim, rolls
back one txn; application retries with exponential backoff; fix root cause
with consistent lock ordering on multi-row updates.

**Q4. Distributed transaction across shards?** Model answer: avoid 2PC
in OLTP; use saga with compensating transactions per shard; outbox for
cross-service consistency (MOD-06/07, MOD-06/08).

**Q5. What is MVCC?** Model answer: multi-version concurrency control;
readers read snapshot version, writers add new version; reduces reader-
writer blocking; requires vacuum to reclaim old versions.

**Q6. Read Committed enough for bank transfer?** Model answer: yes if
transfer is single txn with proper row locks (`FOR UPDATE`) and atomic
COMMIT; Serializable not required for two-row update if locking prevents
lost update; Serializable needed when phantom range inserts threaten
invariant (e.g. overdraft credit lines).

## 16. Follow-up / Curveball Questions

**Curveball 1. Hot row Serializable on global counter.** Answer direction:
counter does not scale at Serializable; shard counters, use Redis INCR,
or approximate counts (MOD-16/06-count-min-sketch-frequency-estimation);
keep SQL txn off global hot row.

**Curveball 2. Phantom read example in seat booking without Serializable.**
Answer direction: two txns both scan `available` seats in range, both pick
seat 7 if no row lock; `FOR UPDATE` on specific seat row closes phantom
for that seat; Serializable needed if range insert of new seats mid-txn
matters.

**Curveball 3. Read Committed + async replica for read-after-write.**
Answer direction: user writes to primary, reads follower, sees stale -
not isolation level issue but replication lag; pin session to primary or
gate on LSN (MOD-03/06-database-replication-leader-follower-multi-leader).

## 17. Cheat-Sheet Summary

- Transactions bundle ACID; isolation level defines which anomalies allowed.
- Default Read Committed for web OLTP; escalate only where phantoms hurt.
- Lock rows in sorted order; keep transactions short; retry deadlocks.
- MVCC powers snapshot isolation; long txns cause bloat and lag.
- Cross-shard: saga and outbox, not distributed 2PC (MOD-06/07).

## 18. Further Reading

- PostgreSQL documentation, "Transaction Isolation" and "Serializable
  Isolation" - SSI implementation details.
- Martin Kleppmann, DDIA Chapter 7 (Transactions) - anomalies explained
  with examples.
- MOD-03/03-acid-properties - atomicity and consistency foundation.
- MySQL InnoDB documentation, "InnoDB Locking" - gap and next-key locks.

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered in depth (spreadsheet concurrency analogy)
2. What Is It - Covered in depth (plain-English + formal ACID/isolation + MVCC)
3. The Problem It Solves - Covered in depth (partial failure and phantom reports)
4. Core Concept Breakdown - Covered in depth (10 bulleted parts)
5. How It Works - Covered in depth (3 paths: transfer, seat hold, report)
6. Diagram - Covered in depth (isolation level flowchart + gif placeholder)
7. When to Use It - Covered in depth (transactions + isolation escalation triggers)
8. When NOT to Use It - Covered in depth (4 anti-patterns)
9. Real-World Example - Covered in depth (Stripe, Postgres, InnoDB, Ticketmaster, Shopify + numbers)
10. Production-Grade Code - Covered in depth (transfer with deadlock retry + holdSeat + why-not-what)
11. Trade-offs Table - Covered in depth (5 rows)
12. Comparison Table - Covered in depth (4 levels across 7 dimensions)
13. Numbers & Benchmarks - Covered in depth (5 figures)
14. Common Pitfalls - Covered in depth (4 incident notes)
15. Interview Q&A - Covered in depth (6 Q&As)
16. Follow-up / Curveball Questions - Covered in depth (3 curveballs)
17. Cheat-Sheet Summary - Covered in depth (5 lines)
18. Further Reading - Covered in depth (4 sources)

No em-dashes. No emojis. Prereq MOD-03/03 linked.
