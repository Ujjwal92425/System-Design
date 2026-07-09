## 1. Hook

Think about a hospital. The word "case" means different things in
different rooms. To a doctor, a case is a patient's medical story. To
billing, a case is an insurance and invoice container. To legal, a
case is a liability file. If everyone is forced to use one universal
meaning, the hospital becomes confused. A billing clerk asks for a
case number, a nurse updates a patient chart, and a lawyer searches
for evidence, all using the same word but meaning different objects.

A good hospital does not ban the word "case." It draws boundaries.
Inside the medical team, "case" means diagnosis, treatment, and notes.
Inside billing, it means charges, claims, and payment status. The word
can be reused because the room defines the meaning.

Domain-Driven Design does the same for software. It asks teams to
model the business language honestly, then draw boundaries where words
change meaning. The result is software that matches the business
instead of a database schema pretending to be the business.

## 2. What Is It

(a) Plain-English one-liner: Domain-Driven Design is a way to build
software around the real business language and boundaries, so the code
matches how domain experts think and work.

(b) Formal definition: Domain-Driven Design (DDD) is an approach to
software design that places the business domain model at the center of
the system, using a shared ubiquitous language, bounded contexts,
aggregates, entities, value objects, repositories, domain services,
and context maps to align implementation boundaries with domain
meaning. It is especially useful when domain complexity, not UI or
infrastructure complexity, is the main source of risk. DDD pairs
naturally with SOLID module design (see: MOD-12/01-solid-principles).

## 3. The Problem It Solves

Before DDD, many systems grow from database tables outward. A team
creates tables named users, orders, items, payments, shipments. Every
module reads every table. Business rules spread across controllers,
ORM hooks, cron jobs, and UI validation. Nobody can answer "where is
the rule that a refund cannot exceed captured payment?" because the
rule is not owned by a model. It is a rumor shared by three files.

After DDD, the team names the domain concepts explicitly. The order
aggregate owns order invariants. The payment context owns capture and
refund rules. The catalog context owns product descriptions and price
presentation. Teams agree that "customer" in support is not identical
to "customer" in billing. They draw bounded contexts and use contracts
between them.

DDD solves language drift. It gives engineering and domain experts a
shared map so software changes follow business rules instead of
accidental table access.

## 4. Core Concept Breakdown

- **Domain:** the business problem area, such as lending, shipping,
  billing, booking, or fraud detection.
- **Ubiquitous language:** the precise shared vocabulary used by both
  domain experts and engineers inside one context.
- **Bounded context:** a boundary where a model has one clear meaning;
  the same word may mean something else outside.
- **Entity:** an object with identity across time, such as Order or
  Customer.
- **Value object:** an immutable object defined by its values, such as
  Money, Address, or DateRange.
- **Aggregate:** a consistency boundary around entities and value
  objects, enforcing invariants through one root.
- **Repository:** a collection-like interface for loading and saving
  aggregates without exposing persistence details.
- **Domain service:** a domain operation that does not naturally live
  on one entity or value object.
- **Context map:** a diagram of how bounded contexts relate:
  customer-supplier, conformist, anti-corruption layer, or shared
  kernel.

## 5. How It Works

Step by step, using DDD for an order platform:

1. **Find domain experts.** The best model comes from people who know
   the real rules, not from guessing based on table names.
2. **Run event storming or workflow mapping.** List business events:
   OrderPlaced, PaymentAuthorized, ShipmentCreated, RefundRequested.
3. **Listen for language conflict.** If "account" means login account
   to identity and ledger account to finance, those are different
   contexts.
4. **Draw bounded contexts.** Examples: Catalog, Ordering, Payments,
   Fulfillment, Support.
5. **Define aggregates by consistency needs.** If order items and
   order total must change atomically, they belong inside the same
   Order aggregate.
6. **Keep aggregates small.** A giant Customer aggregate that owns
   orders, support tickets, subscriptions, and invoices becomes a
   database-wide lock in disguise.
7. **Express invariants in the model.** Put "cannot refund more than
   captured amount" in Payment, not only in a controller.
8. **Use repositories at aggregate boundaries.** The application loads
   and saves aggregates without leaking SQL joins into domain code.
9. **Integrate contexts through contracts.** Use APIs, events, or
   anti-corruption layers when another context's model should not leak
   in.
10. **Refine the model as the business changes.** DDD is not a one-day
    modeling workshop; it is a feedback loop between code and domain.

Worked boundary example for an e-commerce platform:

| Word | Ordering context | Billing context | Support context |
|---|---|---|---|
| Customer | buyer placing an order | legal payer on invoice | person asking for help |
| Order | purchase intent and lifecycle | invoice source reference | support case anchor |
| Credit | store credit usable at checkout | accounting credit note | goodwill adjustment |
| Account | login identity | receivable balance | support history |

The table is the point of DDD: forcing one `Customer` class across all
four meanings would create bugs. Separate bounded contexts let each
team model the word that is true in its room.

## 6. Diagram

This lesson intentionally has no Mermaid diagram because the metadata
marks the diagram type as `none`. DDD is primarily about language,
meaning, and model boundaries; forcing a single diagram tends to make
students memorize boxes instead of practicing boundary discovery. The
context map idea is explained directly in the surrounding sections.

<!-- IMAGE: context map showing Catalog, Ordering, Payments,
Fulfillment, and Support bounded contexts, with "Customer" and
"Account" meanings shown differently inside separate contexts -->

## 7. When to Use It

Use DDD when:

- **The business rules are complex.** Finance, healthcare, insurance,
  logistics, marketplace pricing, and subscriptions benefit strongly.
- **Language confusion causes bugs.** One word means different things
  across teams or workflows.
- **The product is long-lived.** A model that reflects the business
  pays back over years of change.
- **You are splitting architecture boundaries.** Bounded contexts are
  better service candidates than technical layers.

## 8. When NOT to Use It

- **Do not use heavyweight DDD for CRUD screens with simple rules.**
  An admin table editor does not need aggregates and domain services.
- **Do not turn DDD into class worship.** The goal is business clarity,
  not making every noun a class.
- **Do not share one canonical model across all contexts.** That
  usually hides meaning conflicts instead of resolving them.
- **Do not let the ORM define the domain.** Persistence is a detail;
  it should support the model, not replace it.

## 9. Real-World Example

**Amazon's retail platform** is often discussed as a business-capability
architecture where ordering, payments, fulfillment, and catalog have
separate ownership. That style aligns with DDD even when teams do not
use every tactical DDD pattern.

**Large banks** commonly separate contexts such as customer identity,
loan origination, underwriting, servicing, ledger, and collections.
One "customer" can have different valid models in each context.

Realistic number: on a subscription billing product, a clear Billing
bounded context can own 40 to 80 business rules: proration, retries,
tax region, invoice finalization, refund limits, credit notes, and
dunning state. Without a domain model, those rules often spread across
controllers and background jobs.

Concrete modeling move: draw the line around Billing when the rules
change because of money movement, taxes, invoices, credits, or payment
collection. Do not put login preferences, marketing segments, or
support notes inside that same model just because they reference the
same human.

## 10. Production-Grade Code

```typescript
// DDD aggregate example: Payment enforces the invariant that refunds
// cannot exceed captured money. This rule belongs in the domain model
// because every caller must obey it, not only one HTTP endpoint.

type Currency = "USD";

export class Money {
  constructor(
    public readonly cents: number,
    public readonly currency: Currency
  ) {
    if (cents < 0) throw new Error("money cannot be negative");
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (other.cents > this.cents) throw new Error("insufficient amount");
    return new Money(this.cents - other.cents, this.currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) throw new Error("currency mismatch");
  }
}

export class Payment {
  private refunded = new Money(0, "USD");

  constructor(
    public readonly id: string,
    private readonly captured: Money
  ) {}

  refund(amount: Money): void {
    const remaining = this.captured.subtract(this.refunded);
    if (amount.cents > remaining.cents) {
      throw new Error("refund exceeds captured amount");
    }
    this.refunded = this.refunded.add(amount);
  }

  refundableAmount(): Money {
    return this.captured.subtract(this.refunded);
  }
}

export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>;
  save(payment: Payment): Promise<void>;
}
```

Why-not-what notes:

- `Money` is a value object because equality comes from amount and
  currency, not identity.
- `Payment` is an aggregate root because refund state and captured
  amount must preserve an invariant together.
- The repository hides database shape so domain rules stay testable
  without a database.

Anti-corruption layer sketch:

```typescript
type ExternalCrmCustomer = {
  crm_id: string;
  lifecycle_stage: "lead" | "active" | "churned";
};

type BillingCustomerRef = {
  billingCustomerId: string;
  canReceiveInvoice: boolean;
};

export function translateCrmCustomer(
  external: ExternalCrmCustomer
): BillingCustomerRef {
  // Billing should not inherit CRM vocabulary. The translation keeps
  // CRM lifecycle language from becoming a billing invariant.
  return {
    billingCustomerId: external.crm_id,
    canReceiveInvoice: external.lifecycle_stage === "active",
  };
}
```

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Aligns code with business language | Requires domain expert access | Workshops, interviews, and model iteration |
| Bounded contexts reveal service boundaries | Boundaries are hard to discover early | Time spent modeling before extraction |
| Aggregates centralize invariants | Can become over-engineered for simple CRUD | Discipline to apply tactical patterns only where rules are rich |
| Value objects reduce primitive obsession | More small types and mapping code | Serialization and persistence adapters |
| Context maps make integration explicit | Teams may disagree on ownership | Architecture governance and clear contracts |

## 12. Comparison Table

| Approach | Primary driver | Best fit | Main risk | Boundary style |
|---|---|---|---|---|
| Database-first CRUD | tables | simple admin tools | rules scattered | schema boundaries |
| Transaction script | use cases | moderate workflows | duplicated rules | service methods |
| Domain-Driven Design | business model | complex domains | over-modeling | bounded contexts and aggregates |
| Anemic model | data bags plus services | thin APIs | hidden invariants | weak object boundaries |

## 13. Numbers & Benchmarks

- **Modeling time:** a focused event-storming session for one domain
  is often 2 to 6 hours with engineers and domain experts.
- **Aggregate size:** a practical aggregate often protects 1 to 5
  entities, not a whole business area.
- **Context count:** a mature commerce system commonly has 5 to 15
  bounded contexts before team ownership feels clean.
- **Bug pattern:** duplicated validation across 3 endpoints usually
  signals a missing domain invariant.
- **Service extraction:** extracting a bounded context with clear data
  ownership can take weeks; extracting a vague shared model can take
  months.
- **Context map smell:** if two contexts share more than 5 mutable
  tables, they are not integrated by contract; they are coupled by
  database accident.
- **Aggregate warning sign:** if loading one aggregate commonly pulls
  more than a few hundred child rows, the aggregate is probably too
  large for a write consistency boundary.

## 14. Common Pitfalls

- **Incident: "Customer" meant four things.** Support changed a
  customer address field and billing tax calculation changed because
  both contexts shared one table model.
- **Incident: invariant only in the UI.** Refund validation lived in a
  React form. A batch job bypassed it and issued refunds above capture
  amount.
- **Incident: aggregate too large.** A Customer aggregate loaded 4,000
  orders to update a phone number. The model confused identity with
  ordering history.

## 15. Interview Q&A

**Q1. What is a bounded context?** Model answer: a boundary where a
domain model and vocabulary have one precise meaning. Outside that
boundary, the same word may mean something different.

**Q2. What is the difference between entity and value object?** Model
answer: an entity has identity over time; a value object is defined by
its values and should usually be immutable.

**Q3. How do aggregates relate to transactions?** Model answer:
aggregate boundaries should match consistency boundaries. Rules inside
one aggregate are enforced atomically; cross-aggregate work usually
uses eventual consistency or a saga.

**Q4. Is DDD only for microservices?** Model answer: no. It often
works best in a modular monolith first, where boundaries can move
cheaply before becoming network boundaries.

**Q5. What is an anti-corruption layer?** Model answer: a translation
layer that prevents another context's model from leaking into yours.
It protects language and invariants at integration points.

## 16. Follow-up / Curveball Questions

**Curveball 1. Two teams both claim they own Customer. What do you do?**
Answer direction: ask what decisions each team makes about customer.
Identity, billing, support, and marketing may each need a different
model with integration contracts.

**Curveball 2. An aggregate needs data from another aggregate to
validate a rule. Is the boundary wrong?** Answer direction: maybe. If
the rule must be strongly consistent, boundaries may need adjustment.
If not, use a domain service, policy snapshot, or eventual check.

**Curveball 3. The ORM makes value objects painful. Should you drop
them?** Answer direction: not automatically. If the value object
protects an important invariant like Money or DateRange, mapping cost
is worth it.

## 17. Cheat-Sheet Summary

- DDD models the business language, not just database tables.
- Bounded contexts define where words and rules have one meaning.
- Aggregates are consistency boundaries around invariants.
- Value objects make important concepts explicit and immutable.
- Use DDD when domain complexity is the hard part, not for simple CRUD.

## 18. Further Reading

- Eric Evans, "Domain-Driven Design" - the original strategic and
  tactical patterns:
  https://www.domainlanguage.com/ddd/
- Vaughn Vernon, "Implementing Domain-Driven Design" - practical
  aggregate, repository, and context map guidance:
  https://www.informit.com/store/implementing-domain-driven-design-9780321834577
- Martin Fowler, "Bounded Context" - short explanation of why one
  enterprise model rarely works:
  https://martinfowler.com/bliki/BoundedContext.html

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (hospital language analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (table-first before, model-first after)
4. Core Concept Breakdown - Covered (9 concepts)
5. How It Works - Covered (10 steps)
6. Diagram - Covered with required no-diagram justification and image placeholder
7. When to Use It - Covered (4 triggers)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (Amazon, banks, billing rule count)
10. Production-Grade Code - Covered (TypeScript aggregate and value object)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (4 approaches)
13. Numbers & Benchmarks - Covered (5 figures)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 sources)

No em-dashes. No emojis. Cross-links included.
