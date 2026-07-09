## 1. Hook

A bank statement does not store only your current balance. It stores
the story: salary deposit, grocery purchase, rent payment, refund,
interest. The balance is just the result of replaying the story. If
someone asks why your balance is $742, the bank does not shrug and say
"that is what the balance column says." It shows the events that made
it true.

Most applications store only the current balance. Event sourcing stores
the statement. Instead of overwriting state, the system appends facts.
Current state is reconstructed from those facts.

That is powerful for audit, debugging, replay, and historical business
questions. It is also a serious commitment: events become permanent
contracts, projections must be maintained, and bugs in event design can
live for years.

## 2. What Is It

(a) Plain-English one-liner: event sourcing stores every state change
as an append-only event log and rebuilds current state by replaying
those events.

(b) Formal definition: event sourcing is a persistence pattern where
the source of truth is an ordered log of immutable domain events rather
than mutable rows representing current state. Aggregates are loaded by
replaying their event streams, commands append new events after
validating invariants, and read models are derived through projections.
It often pairs with CQRS (see:
MOD-06/05-cqrs-command-query-responsibility-segregation).

## 3. The Problem It Solves

Before event sourcing, a system updates rows in place. An order moves
from pending to paid to shipped to returned. The final row says
`RETURNED`, but the system cannot answer who changed it, when payment
was captured, what rule version applied, or what the state looked like
last Tuesday. Teams add audit tables, but those tables are incomplete
and drift from the real mutation path.

After event sourcing, the order stream contains `OrderPlaced`,
`PaymentCaptured`, `ShipmentCreated`, `ReturnRequested`,
`ReturnApproved`. The current state is derived, but the historical
story is primary. New projections can be built from old events. Bugs in
read models can be fixed by replay. Audit becomes a built-in property.

It solves the "why is the state this way?" problem by making history
the database.

## 4. Core Concept Breakdown

- **Event store:** append-only storage for events, often partitioned by
  aggregate ID.
- **Event stream:** ordered events for one aggregate, such as one
  order or one account.
- **Aggregate rehydration:** rebuilding current aggregate state by
  applying prior events.
- **Command handling:** load stream, validate command against current
  state, append new events.
- **Optimistic concurrency:** append succeeds only if the expected
  stream version matches.
- **Projection:** derived read model built by consuming events.
- **Snapshot:** saved aggregate state at a version to avoid replaying a
  very long stream.
- **Event versioning:** events are durable contracts and must evolve
  compatibly.

## 5. How It Works

Step by step, event sourcing an order:

1. **Receive a command.** `PlaceOrder`, `CapturePayment`, or
   `ShipOrder` expresses intent.
2. **Load the event stream.** Fetch events for `order-123`.
3. **Rehydrate the aggregate.** Apply each event to rebuild current
   order state.
4. **Validate the command.** For example, shipped orders cannot be
   cancelled.
5. **Create new events.** The command emits facts such as
   `OrderCancelled`.
6. **Append with expected version.** If another writer changed the
   stream, retry or reject.
7. **Publish events to projections.** Read models update order history,
   search, support timeline, or analytics.
8. **Snapshot long streams.** If an account has 100,000 events, load a
   recent snapshot then replay only events after it.
9. **Version event schemas.** Add fields compatibly or upcast old
   events during replay.
10. **Treat deletion carefully.** Compliance may require redaction or
    cryptographic erasure while preserving event integrity.

Event design review checklist:

- **Would this event still make sense in five years?** Store domain
  facts, not transient UI or handler details.
- **Can old events be replayed after new code ships?** Version events
  and keep upcasters tested.
- **Can privacy data be erased?** Avoid raw PII in immutable events
  unless encryption, redaction, or retention rules are explicit.
- **Can a projection rebuild from zero?** If not, the event log is not
  truly the source of truth.

## 6. Diagram

```mermaid
flowchart TD
    CMD[Command] --> LOAD[Load event stream]
    LOAD --> REHYDRATE[Rehydrate aggregate]
    REHYDRATE --> VALIDATE[Validate invariant]
    VALIDATE --> APPEND[Append new events]
    APPEND --> STORE[(Event store)]
    STORE --> PROJECT[Projection workers]
    PROJECT --> READ[(Read models)]
    STORE --> SNAP[Snapshots]
```

<!-- IMAGE: event stream for one order showing OrderPlaced,
PaymentCaptured, ShipmentCreated, ReturnRequested, and derived current
state on the right -->

## 7. When to Use It

Use event sourcing when:

- **Audit is core to the domain.** Finance, healthcare, compliance,
  and workflow systems need durable history.
- **You need temporal queries.** "What did we know at 10:04 AM?" is
  easy with events and hard with overwritten rows.
- **Replay is valuable.** New projections, bug fixes, and analytics
  can reuse old events.
- **State transitions are business events.** The history itself has
  domain meaning.

## 8. When NOT to Use It

- **Do not use it just because events sound modern.** It is a
  persistence commitment, not only a messaging style.
- **Do not use it when current state is all that matters.** Simple
  profile settings rarely need full event history.
- **Do not ignore event schema design.** Bad event names and missing
  fields become long-lived pain.
- **Do not expect easy ad hoc queries.** Querying current state usually
  requires projections.

## 9. Real-World Example

**Banking ledgers** are the classic event-sourced shape: transactions
are appended, balances are derived, and audit history is mandatory.

**EventStoreDB** is a production database built specifically around
event streams and projections.

**E-commerce workflows** can use event sourcing for orders or refunds
where lifecycle history and support debugging matter.

Realistic number: an order stream may have 5 to 30 events over its
lifetime. A financial account can have tens of thousands of events,
which is where snapshots and stream compaction strategy become
important.

Concrete production split: the event store answers "what happened,"
while projections answer "what should this screen show now." Mixing
those jobs usually leads to slow reads and fragile replay code.

## 10. Production-Grade Code

```typescript
type OrderEvent =
  | { type: "OrderPlaced"; orderId: string; totalCents: number }
  | { type: "PaymentCaptured"; orderId: string; paymentId: string }
  | { type: "OrderCancelled"; orderId: string; reason: string };

type OrderState = {
  id: string;
  placed: boolean;
  paid: boolean;
  cancelled: boolean;
  totalCents: number;
  version: number;
};

interface EventStore {
  loadStream(orderId: string): Promise<OrderEvent[]>;
  append(orderId: string, expectedVersion: number, events: OrderEvent[]): Promise<void>;
}

function initialState(orderId: string): OrderState {
  return { id: orderId, placed: false, paid: false, cancelled: false, totalCents: 0, version: 0 };
}

function apply(state: OrderState, event: OrderEvent): OrderState {
  switch (event.type) {
    case "OrderPlaced":
      return { ...state, placed: true, totalCents: event.totalCents, version: state.version + 1 };
    case "PaymentCaptured":
      return { ...state, paid: true, version: state.version + 1 };
    case "OrderCancelled":
      return { ...state, cancelled: true, version: state.version + 1 };
  }
}

export async function cancelOrder(
  store: EventStore,
  orderId: string,
  reason: string
): Promise<void> {
  const events = await store.loadStream(orderId);
  const state = events.reduce(apply, initialState(orderId));

  if (!state.placed) throw new Error("order does not exist");
  if (state.paid) throw new Error("paid orders need refund workflow");
  if (state.cancelled) return;

  // Expected version prevents two concurrent commands from appending
  // contradictory histories to the same order stream.
  await store.append(orderId, state.version, [{ type: "OrderCancelled", orderId, reason }]);
}
```

Why-not-what notes:

- `apply` is pure so replay and tests are deterministic.
- Commands append facts only after validating current state.
- Optimistic concurrency protects aggregate-level consistency without
  a long database lock.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Complete history and audit trail | Event schemas are long-lived contracts | Versioning, upcasters, and migration discipline |
| Replay can rebuild read models | Current-state queries need projections | Projection infrastructure and lag monitoring |
| Debugging can follow exact state transitions | Event design is harder than row design | Domain modeling and review |
| Optimistic concurrency fits aggregate streams | Long streams can be expensive to load | Snapshots and stream partition strategy |
| Temporal queries become natural | Deletion and privacy are complex | Redaction, encryption, and retention policies |

## 12. Comparison Table

| Approach | Source of truth | Audit quality | Query style | Best fit | Main risk |
|---|---|---|---|---|---|
| CRUD rows | current row | low unless added | direct SQL | simple data | lost history |
| CRUD plus audit table | current row | medium | direct SQL plus audit | regulated CRUD | audit drift |
| Event sourcing | event log | high | projections and replay | history-rich domains | complexity |
| CDC from database | change log | medium to high | downstream projections | integration | schema coupling |

## 13. Numbers & Benchmarks

- **Stream length:** 5 to 30 events per order is common; accounts or
  subscriptions can reach thousands or more.
- **Snapshot interval:** systems often snapshot every 100 to 1,000
  events for long-lived aggregates.
- **Append latency:** event-store appends can be single-digit
  milliseconds when partitioned by stream and batched properly.
- **Projection rebuild:** rebuilding 100 million events can take hours
  without parallel partitions.
- **Storage overhead:** events plus projections can use 2x or more
  storage compared with current-state-only tables.
- **Upcaster coverage:** every historical event version should have a
  replay test. A migration that only tests new events is incomplete.
- **Snapshot risk:** snapshots are caches of event-derived state. If a
  bug creates bad snapshots, you must be able to discard and rebuild
  them from events.

## 14. Common Pitfalls

- **Incident: event stored a command.** `CancelOrderRequested` was used
  as if cancellation had happened, so projections showed cancelled
  orders that later failed validation.
- **Incident: missing event version.** A new required field broke
  replay of three years of old events.
- **Incident: no snapshot for hot stream.** Loading an account with
  120,000 events made every command slow during peak traffic.

## 15. Interview Q&A

**Q1. What is the source of truth in event sourcing?** Model answer:
the append-only event log. Current state and read models are derived
from it.

**Q2. How is event sourcing different from event-driven architecture?**
Model answer: EDA is about communication between components. Event
sourcing is about persistence as events. They often combine but are
not the same.

**Q3. How do you enforce consistency?** Model answer: validate
commands against the rehydrated aggregate and append with expected
stream version for optimistic concurrency.

**Q4. Why are projections needed?** Model answer: event logs are great
for history but awkward for current read queries. Projections shape
events into query-friendly views.

**Q5. How do you change event schemas?** Model answer: add optional
fields, version events, use upcasters for old events, and avoid
changing the meaning of existing fields.

## 16. Follow-up / Curveball Questions

**Curveball 1. A bug emitted wrong events for two hours. Do you edit
history?** Answer direction: usually append compensating events and
repair projections. Editing history risks audit integrity.

**Curveball 2. GDPR requires deleting personal data from events. What
now?** Answer direction: store personal data outside events, encrypt
with erasable keys, redact allowed fields, or design events with
references rather than raw PII.

**Curveball 3. A projection is wrong but the event log is correct.**
Answer direction: fix projection code, reset checkpoint, replay from
the last known good position, and compare counts or checksums.

## 17. Cheat-Sheet Summary

- Event sourcing stores history as the source of truth.
- Current state is rebuilt by replaying events for an aggregate.
- Commands validate against rehydrated state and append new events.
- Read models are projections and can be rebuilt from the log.
- Use it for audit-rich domains, not ordinary CRUD by default.

## 18. Further Reading

- Martin Fowler, "Event Sourcing" - foundational pattern explanation.
  https://martinfowler.com/eaaDev/EventSourcing.html
- Greg Young, event sourcing talks and essays - practical reasoning
  about streams, commands, and projections:
  https://cqrs.wordpress.com/documents/building-event-storage/
- EventStoreDB documentation - concrete event store concepts,
  optimistic concurrency, and projections:
  https://developers.eventstore.com/

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (bank statement analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (lost history before, event log after)
4. Core Concept Breakdown - Covered (8 concepts)
5. How It Works - Covered (10 steps)
6. Diagram - Covered (flowchart command to event store and projections)
7. When to Use It - Covered (4 triggers)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (banking, EventStoreDB, e-commerce numbers)
10. Production-Grade Code - Covered (TypeScript event-sourced aggregate command)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (4 approaches)
13. Numbers & Benchmarks - Covered (5 figures)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 sources)

No em-dashes. No emojis. Cross-links included.
