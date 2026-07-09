## 1. Hook

Imagine a city newspaper. The bakery does not phone every neighbor to
say bread is ready. It posts a notice: "fresh bread at 7 AM." People
who care read the notice. The cafe buys bread, the hotel updates its
breakfast menu, and the delivery person plans a route. The bakery does
not need to know all of them.

Now imagine the opposite city. The bakery must keep a phone list of
every person who might care. If the hotel changes its number, the
bakery's morning breaks. If the bakery forgets to call the cafe, the
cafe misses breakfast. Everyone is tied together by direct calls.

Event-driven architecture is the newspaper version. A service announces
facts that happened. Other services react when those facts matter to
them. The power is loose coupling. The cost is learning to live with
time gaps, duplicates, ordering problems, and eventual consistency.

## 2. What Is It

(a) Plain-English one-liner: event-driven architecture lets services
publish facts about things that happened, and lets other services
react asynchronously without the publisher knowing who listens.

(b) Formal definition: event-driven architecture (EDA) is an
architectural style where components communicate primarily through
immutable event messages representing state changes or domain facts.
Publishers emit events to a broker, log, or stream, and subscribers
consume those events independently to update local state, trigger
workflows, or notify users. It builds on pub-sub and message queues
(see: MOD-05/06-pub-sub-pattern) and requires explicit handling of
delivery semantics, idempotency, ordering, and replay.

## 3. The Problem It Solves

Before EDA, services often call each other directly for every side
effect. Checkout calls inventory, payments, email, analytics,
recommendations, fraud, warehouse, and CRM. Checkout becomes a
knowledge hub. If analytics is slow, checkout is slow. If email is
down, checkout needs to decide whether an order can still succeed.

After EDA, checkout commits the order and publishes `OrderPlaced`.
Inventory reserves stock, email sends confirmation, analytics records
conversion, and warehouse prepares fulfillment. Checkout no longer
knows every downstream consumer. New consumers can be added without
changing checkout.

EDA solves fan-out coupling. It makes side effects and downstream
projections independent. The price is that the system becomes
asynchronous, so teams must design for delayed reads and repeated
messages.

## 4. Core Concept Breakdown

- **Event:** an immutable fact in past tense, such as `OrderPlaced` or
  `PaymentCaptured`.
- **Producer:** service that owns the state change and publishes the
  event.
- **Consumer:** service that reacts to events and maintains its own
  state or side effect.
- **Broker or log:** infrastructure that stores and delivers events,
  such as Kafka, RabbitMQ, SNS/SQS, or Pulsar.
- **Topic or stream:** named channel for a category of events.
- **Event schema:** versioned contract describing fields and meanings.
- **Idempotency:** consumer safety when the same event is delivered
  more than once.
- **Ordering:** guarantee scope for event order, usually per key or
  partition, not globally.
- **Replay:** reading old events again to rebuild state or backfill a
  new projection.

## 5. How It Works

Step by step, using EDA for order placement:

1. **A command changes owned state.** The ordering service accepts
   `PlaceOrder` and writes the order transactionally.
2. **The service publishes a domain event.** `OrderPlaced` says what
   happened, not what other services should do.
3. **The broker persists the event.** Kafka or a queue stores the
   message long enough for consumers to receive it.
4. **Consumers subscribe independently.** Email, analytics, warehouse,
   and search each process the event for their own purpose.
5. **Each consumer records progress.** Offsets, message IDs, or
   receipts prevent reprocessing beyond the intended retry behavior.
6. **Consumers handle duplicates.** They store processed event IDs or
   use natural idempotent writes.
7. **Consumers handle late data.** Search may show the order seconds
   after checkout succeeds. The UI must reflect this.
8. **Schemas evolve compatibly.** Producers add optional fields and
   avoid breaking existing consumers.
9. **Failures go to retries and DLQ.** Poison messages should not block
   a whole stream (see: MOD-17/08-dead-letter-queue-dlq-handling-failed-messages).
10. **Replay is treated as production behavior.** Backfills, new read
    models, and bug fixes use the same event contracts.

Event contract checklist before publishing:

- **Name the fact, not the reaction.** `OrderPlaced` is reusable;
  `SendOrderEmail` hard-codes one consumer.
- **Include stable IDs.** Event ID, aggregate ID, producer name, and
  occurred time make tracing and deduplication practical.
- **Separate fact time from publish time.** A delayed broker publish
  should not rewrite when the business event happened.
- **Plan schema evolution.** Add optional fields first, wait for
  consumers, then deprecate old fields with telemetry.

## 6. Diagram

```mermaid
flowchart TD
    CLIENT[Client] --> ORDER[Ordering service]
    ORDER --> ODB[(Orders DB)]
    ORDER --> BUS[Event broker]
    BUS --> EMAIL[Email consumer]
    BUS --> SEARCH[Search indexer]
    BUS --> ANALYTICS[Analytics consumer]
    BUS --> WAREHOUSE[Warehouse consumer]
    EMAIL --> EDB[(Email log)]
    SEARCH --> SIDX[(Search index)]
    ANALYTICS --> ADB[(Analytics store)]
    WAREHOUSE --> WDB[(Fulfillment DB)]
```

<!-- IMAGE: event fan-out visual where one OrderPlaced event flows
through a broker to email, search, analytics, and warehouse consumers,
with each consumer owning its own state -->

## 7. When to Use It

Use event-driven architecture when:

- **Many downstream systems react to one fact.** Order placement,
  payment capture, user signup, and shipment update are common cases.
- **The producer should not know all consumers.** New side effects
  should be added without editing the producer.
- **Eventual consistency is acceptable.** The system can tolerate
  seconds of propagation delay for non-core reads.
- **Replay and audit matter.** Event logs are valuable for rebuilding
  projections and explaining history.

## 8. When NOT to Use It

- **Do not use events for immediate user decisions.** If checkout must
  know whether payment succeeded now, a synchronous command is clearer.
- **Do not publish commands disguised as events.** `SendEmailNow` is a
  command; `OrderPlaced` is an event.
- **Do not skip schema governance.** Event contracts live for years and
  many consumers may depend on them.
- **Do not assume exactly-once delivery.** Design consumers for
  duplicate and retry behavior (see: MOD-17/07-delivery-semantics-at-most-least-exactly-once).

## 9. Real-World Example

**LinkedIn Kafka** popularized large-scale event streaming for activity
data, metrics, and derived systems. Kafka's log model lets consumers
read independently and replay.

**Netflix** uses event-driven patterns for viewing activity, device
events, recommendations, and operational telemetry.

**E-commerce checkout** commonly publishes events such as
OrderPlaced, PaymentCaptured, ShipmentCreated, and RefundIssued so
email, warehouse, analytics, and support projections stay decoupled.

Realistic number: a retail platform processing 2,000 orders per minute
may publish 5 to 20 events per order across checkout, payment,
inventory, and fulfillment, creating 10,000 to 40,000 messages per
minute before analytics and tracking events.

Production signal: measure consumer lag per topic and consumer group,
not only broker health. A healthy broker with a stuck consumer still
means stale search results, missing emails, or delayed warehouse work.

## 10. Production-Grade Code

```typescript
import { randomUUID } from "node:crypto";

type OrderPlaced = {
  eventId: string;
  type: "OrderPlaced";
  occurredAt: string;
  orderId: string;
  customerId: string;
  totalCents: number;
};

interface EventPublisher {
  publish(topic: string, event: OrderPlaced): Promise<void>;
}

interface ProcessedEventStore {
  wasProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

export function newOrderPlaced(input: {
  orderId: string;
  customerId: string;
  totalCents: number;
}): OrderPlaced {
  return {
    eventId: randomUUID(),
    type: "OrderPlaced",
    occurredAt: new Date().toISOString(),
    ...input,
  };
}

export async function publishOrderPlaced(
  publisher: EventPublisher,
  event: OrderPlaced
): Promise<void> {
  await publisher.publish("orders.v1", event);
}

export async function handleOrderPlaced(
  event: OrderPlaced,
  processed: ProcessedEventStore,
  sendEmail: (orderId: string, customerId: string) => Promise<void>
): Promise<void> {
  if (await processed.wasProcessed(event.eventId)) return;

  // Email providers retry and brokers redeliver, so the consumer
  // records event IDs to make repeated delivery harmless.
  await sendEmail(event.orderId, event.customerId);
  await processed.markProcessed(event.eventId);
}
```

Why-not-what notes:

- The event name is past tense because it is a fact, not an instruction
  to a specific downstream service.
- `eventId` supports idempotent consumers and incident debugging.
- The topic includes a version so schema evolution can be managed
  without silently breaking old consumers.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Decouples producer from many consumers | Eventual consistency is visible to users | UI states, reconciliation, and delayed-read handling |
| New consumers can be added without producer changes | Schema changes can break unknown consumers | Versioned contracts and compatibility checks |
| Supports replay and backfills | Duplicate and out-of-order events are normal | Idempotency keys and ordering strategy |
| Improves resilience for side effects | Broker becomes critical infrastructure | Broker operations, retention, monitoring, and DLQ handling |
| Enables independent scaling of consumers | Debugging spans time and services | Tracing, correlation IDs, and event audit tooling |

## 12. Comparison Table

| Approach | Communication | Coupling | Latency | Best fit | Main risk |
|---|---|---|---|---|---|
| Synchronous REST | request-response | direct | low per hop | immediate decisions | cascading failure |
| Message queue | async task | producer to queue | delayed | work distribution | hidden retries |
| Pub-sub events | async fact broadcast | loose | delayed | fan-out side effects | schema drift |
| Event stream log | durable ordered log | loose | delayed | replay and projections | operational complexity |

## 13. Numbers & Benchmarks

- **Kafka throughput:** a modest Kafka cluster can handle hundreds of
  thousands of small messages per second with proper partitioning.
- **Consumer lag:** production alerts often trigger when lag exceeds a
  few minutes for user-facing projections.
- **Event size:** keep common domain events small, often below 10 KB,
  and store large payloads externally.
- **Ordering scope:** Kafka ordering is per partition; choosing
  `orderId` as the key preserves order per order, not globally.
- **Retention:** event streams often retain data for days to weeks;
  audit streams may retain for years depending on compliance.
- **Schema compatibility:** treat event schemas like public APIs. A
  single required-field removal can break every consumer that replays.
- **Replay throughput:** a new projection that must read 500 million
  historical events needs a backfill plan, not only a consumer loop.

## 14. Common Pitfalls

- **Incident: event name was a command.** `SendWelcomeEmail` locked
  the producer to one consumer. Later SMS onboarding needed a new
  event anyway.
- **Incident: no idempotency.** A broker retry sent two shipment emails
  and created duplicate warehouse tasks.
- **Incident: schema field removed.** One downstream consumer crashed
  for six hours because a producer removed `customerId` without a
  versioned migration.

## 15. Interview Q&A

**Q1. What makes a good event?** Model answer: it is a past-tense fact
owned by the producer, carries stable identifiers, has a versioned
schema, and avoids telling consumers what to do.

**Q2. How do you handle duplicate events?** Model answer: use
idempotency. Store processed event IDs, make writes naturally
idempotent, or use deterministic upserts.

**Q3. How do you decide event ordering keys?** Model answer: choose
the entity whose local ordering matters. For orders, `orderId` keeps
events for one order ordered while allowing parallelism across orders.

**Q4. When is synchronous better than event-driven?** Model answer:
when the caller needs an immediate decision to continue, such as
payment authorization during checkout.

**Q5. What is consumer lag?** Model answer: the distance between the
latest event and what a consumer has processed. It measures how stale
a projection or side effect may be.

## 16. Follow-up / Curveball Questions

**Curveball 1. A consumer needs data not present in the event. Should
it call the producer?** Answer direction: sometimes, but frequent
lookups create hidden coupling. Consider enriching the event or
building a local projection.

**Curveball 2. Two events arrive out of order. What happens?** Answer
direction: design per-key ordering when needed, include versions or
timestamps, and make consumers reject stale updates.

**Curveball 3. A new consumer needs three years of history but
retention is seven days.** Answer direction: use snapshots, archives,
or backfill from source databases; event retention policy is an
architecture decision.

## 17. Cheat-Sheet Summary

- Event-driven architecture publishes facts and lets consumers react
  independently.
- It removes fan-out coupling from producers but introduces eventual
  consistency.
- Events should be past-tense, immutable, versioned, and small.
- Consumers must handle duplicates, retries, lag, and schema evolution.
- Use events for side effects, projections, replay, and decoupled
  workflows.

## 18. Further Reading

- Martin Fowler, "What do you mean by Event-Driven?" - useful taxonomy
  of event notification, event-carried state, and event sourcing.
  https://martinfowler.com/articles/201701-event-driven.html
- Jay Kreps, "The Log: What every software engineer should know" -
  foundational explanation of durable logs and replay.
  https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying
- Kafka documentation on producers, consumers, partitions, and consumer
  groups - practical mechanics behind event streams:
  https://kafka.apache.org/documentation/

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (city newspaper analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (direct fan-out before, event fan-out after)
4. Core Concept Breakdown - Covered (9 concepts)
5. How It Works - Covered (10 steps)
6. Diagram - Covered (flowchart with broker and consumers)
7. When to Use It - Covered (4 triggers)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (LinkedIn, Netflix, e-commerce numbers)
10. Production-Grade Code - Covered (TypeScript event publishing and idempotent consumer)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (4 approaches)
13. Numbers & Benchmarks - Covered (5 figures)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 sources)

No em-dashes. No emojis. Cross-links included.
