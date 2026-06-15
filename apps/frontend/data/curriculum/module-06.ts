export const module06Lessons = [
  {
    id: 'lesson-06-01',
    slug: 'architecture-patterns-01-monolithic-vs-microservices',
    title: 'Monolithic vs Microservices Architecture',
    content: `## 1. Quick Summary

**Monolithic architecture** packages all application components (UI, business logic, data access) into a single deployable unit. **Microservices architecture** decomposes the application into small, independent services that communicate over a network. Monoliths are simpler to develop, test, and deploy initially but become difficult to scale and maintain as the codebase grows. Microservices offer **independent deployability**, **scalability per service**, and **technology diversity** but introduce **distributed system complexity** — network latency, data consistency, service discovery, and operational overhead. The best architecture depends on team size, scale requirements, and organizational maturity.

## 2. Definition

**Monolithic Architecture**: A single application where all functions (authentication, business logic, data access, UI) are in one codebase. Typically deployed as a single process. All modules share a single database.

**Microservices Architecture**: An application composed of small, autonomous services that:
- Run in their own processes
- Communicate via lightweight protocols (HTTP/REST, gRPC, message queues)
- Are independently deployable and scalable
- Have their own database (database-per-service pattern)
- Are organized around business capabilities
- Are owned by small, cross-functional teams

## 3. Why It Exists / Problem It Solves

**Monoliths** arose naturally as the simplest way to build software. Everything in one place is easy to reason about, especially for small teams.

**Microservices** emerged to solve monolith problems at scale:
- **Codebase size**: A monolith with millions of lines is hard to understand, modify, and deploy safely.
- **Scaling**: Different parts of the app have different scale requirements. Monolith forces uniform scaling.
- **Team velocity**: Many teams working on the same monolith create merge conflicts, coordination overhead, and slow CI/CD.
- **Technology constraints**: Monolith forces a single technology stack.
- **Reliability**: A bug in one module can crash the entire application.

## 4. When to Use It

| Factor | Monolith | Microservices |
|--------|----------|--------------|
| **Team size** | < 10 developers | > 10 developers (multiple teams) |
| **Codebase size** | < 100K LOC | > 500K LOC |
| **Scale requirements** | Low to medium | High (different services need different scaling) |
| **Release frequency** | Daily/weekly | Multiple times per day per service |
| **Domain complexity** | Simple CRUD | Complex business domains |
| **Startup stage** | MVP / early stage | Established product with clear domain boundaries |

## 5. When NOT to Use It / Tradeoffs

**Monolith**:
- Becomes unwieldy at large scale.
- Single technology lock-in.
- Accidental complexity from module boundaries.
- Slower deployments.

**Microservices**:
- **Network latency**: Every service call adds network overhead.
- **Data consistency**: No ACID transactions across services — eventual consistency and sagas needed.
- **Operational complexity**: Monitoring, logging, tracing, deployment, configuration management across many services.
- **Testing complexity**: End-to-end testing across multiple services is slow and flaky.
- **Initial overhead**: Service discovery, API gateways, container orchestration, CI/CD pipelines.
- **Distributed monolith anti-pattern**: Services that are tightly coupled but deployed separately.

## 6. How It Works (Deep Mechanics)

**Modular Monolith**: A middle ground — single deployable unit but well-defined modules with strict boundaries. Modules communicate through interfaces.

**Service Boundaries**: In microservices, bounded contexts from Domain-Driven Design define service boundaries. Each service owns its data and exposes APIs.

**Communication Patterns**:
- **Synchronous**: HTTP/REST, gRPC. Simple but creates temporal coupling.
- **Asynchronous**: Message queues, events. Decoupled but eventual consistency.

**Deployment**: Monolith: single WAR/JAR/container. Microservices: each service has its own CI/CD pipeline, container image, and deployment.

## 7. Architecture Diagram (ASCII)

\`\`\`
Monolithic Architecture:
  +---------------------------------------------+
  |            Single Application                |
  |  +---------+  +----------+  +----------+     |
  |  |   UI    |  |  Auth    |  |  API     |     |
  |  +---------+  +----------+  +----------+     |
  |  +---------+  +----------+  +----------+     |
  |  |Order    |  |Payment   |  |Inventory |     |
  |  |Logic    |  |Logic     |  |Logic     |     |
  |  +---------+  +----------+  +----------+     |
  |  +---------------------------------------+   |
  |  |            Shared Database            |   |
  |  +---------------------------------------+   |
  +---------------------------------------------+

Microservices Architecture:
  +--------+  +--------+  +--------+  +--------+
  |  UI    |  |  Auth  |  | Order  |  |Payment |
  |(React) |  |Service |  |Service |  |Service |
  +--------+  +--------+  +--------+  +--------+
       |           |           |           |
  +---------+  +---------+  +---------+  +---------+
  |  Auth   |  |  Auth   |  | Order   |  | Payment |
  |  DB     |  |  DB     |  | DB      |  | DB      |
  +---------+  +---------+  +---------+  +---------+
\`\`\`

## 8. Real-World Flow Example

**E-commerce platform migration**:
1. Startup builds monolith (Ruby on Rails + PostgreSQL). 3 developers. Ships features fast.
2. 2 years later: 20 developers, 500K LOC, 100K req/min. Monolith deploys take 2 hours.
3. Payment module has a bug that crashes the entire app during Black Friday.
4. Team decides to extract Payment Service as a microservice.
5. Strangler Fig pattern: intercept payment requests, route to new Payment Service.
6. Over 6 months, extract Inventory Service and Order Service.
7. Each service has its own database, CI/CD pipeline, and team.
8. Deployment time drops from 2 hours to 15 minutes per service.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// Monolithic: All logic in one module
class MonolithicOrderService {
  async placeOrder(userId: string, items: Array<{ productId: string; quantity: number }>): Promise<void> {
    const user = await db.users.findById(userId);
    if (!user) throw new Error('User not found');

    for (const item of items) {
      const product = await db.products.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        throw new Error(\`Insufficient stock for \${item.productId}\`);
      }
    }

    const total = items.reduce((sum, item) => sum + item.quantity * 10, 0);
    const paymentResult = await paymentGateway.charge(user.paymentToken, total);
    if (!paymentResult.success) throw new Error('Payment failed');

    const order = await db.orders.create({ userId, items, total, status: 'confirmed' });

    for (const item of items) {
      await db.products.update(item.productId, { \$inc: { stock: -item.quantity } });
    }

    await emailService.sendOrderConfirmation(user.email, order.id);
  }
}

// Microservices: Order Service calls other services via interfaces
class MicroserviceOrderService {
  constructor(
    private inventory: InventoryService,
    private payment: PaymentService
  ) {}

  async placeOrder(userId: string, items: Array<{ productId: string; quantity: number }>): Promise<void> {
    const total = items.reduce((sum, item) => sum + item.quantity * 10, 0);

    for (const item of items) {
      const reserved = await this.inventory.reserve(item.productId, item.quantity);
      if (!reserved) throw new Error(\`Cannot reserve \${item.productId}\`);
    }

    const paymentResult = await this.payment.charge(userId, total);
    if (!paymentResult.success) {
      for (const item of items) {
        await this.inventory.release(item.productId, item.quantity);
      }
      throw new Error('Payment failed');
    }

    await eventBus.publish('order.placed', { userId, items, total });
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Amazon**: CEO Jeff Bezos mandated in 2002 that all teams must communicate via APIs. This drove Amazon's migration from a monolith to what became AWS.
- **Netflix**: Famous migration from a monolithic Java application to hundreds of microservices. Netflix open-sourced Eureka (service discovery), Hystrix (circuit breaker), Zuul (API gateway).
- **Uber**: Started as a monolith (Python + Django). As cities expanded globally, monolith could not scale. Migrated to 1,000+ services.
- **Shopify**: Monolith (Ruby on Rails) that has scaled to handle 10K+ req/s. Proves monoliths CAN scale with investment in database sharding and modular patterns.
- **Etsy**: Successful monolith (PHP) with 50M+ monthly visitors. Emphasizes continuous refactoring and modular design within the monolith.

## 11. Common Interview Questions

1. *What are the tradeoffs between monolithic and microservices architecture?*
2. *When would you start with a monolith even if you expect to need microservices later?*
3. *What is the modular monolith and how does it help with the migration path?*
4. *How do you handle distributed transactions in microservices?*
5. *What is the Strangler Fig pattern for migrating from monolith to microservices?*
6. *How does Conway's Law influence microservice boundaries?*
7. *What are the operational costs of microservices?*
8. *Design a migration strategy from monolith to microservices.*

## 12. Related Topics & Next Steps

- **Domain-Driven Design**: Defining service boundaries using bounded contexts.
- **API Gateway**: Single entry point for microservices.
- **Service Mesh**: Managing inter-service communication.
- **Database per Service**: Data ownership patterns.
- **Event-Driven Architecture**: Asynchronous communication between services.
- **Next Lesson**: Domain-Driven Design (DDD).`,
    estimatedMin: 25,
    difficulty: 'BEGINNER',
    companies: ['Amazon', 'Netflix', 'Uber', 'Shopify', 'Etsy', 'Spotify'],
    tags: ['monolith', 'microservices', 'architecture', 'decomposition', 'scalability', 'migration']
  },
  {
    id: 'lesson-06-02',
    slug: 'architecture-patterns-02-domain-driven-design',
    title: 'Domain-Driven Design (DDD)',
    content: `## 1. Quick Summary

**Domain-Driven Design (DDD)** is an approach to software development that focuses on modeling the **core business domain** and its logic, using a **ubiquitous language** shared between developers and domain experts. DDD introduces strategic patterns (**bounded context**, **context map**) to define service boundaries, and tactical patterns (**entity**, **value object**, **aggregate**, **domain event**, **repository**, **domain service**) to structure code within a context. DDD is particularly valuable for **microservice decomposition** — each bounded context maps naturally to a microservice. Eric Evans popularized DDD in his 2003 book.

## 2. Definition

**Domain**: The business area the software addresses (e.g., shipping, insurance, e-commerce).

**Ubiquitous Language**: A common, rigorous language shared by developers and domain experts. The same terms appear in conversations, code, database schemas, and documentation.

**Strategic Patterns**:
- **Bounded Context**: A boundary within which a particular domain model applies.
- **Context Map**: A diagram showing relationships between bounded contexts.
- **Core Domain**: The part of the domain that provides competitive advantage.
- **Supporting Subdomain**: Important but not core. May be off-the-shelf.
- **Generic Subdomain**: Commodity (authentication, logging). Buy or use open source.

**Tactical Patterns**:
- **Entity**: Object with a distinct identity that changes over time (e.g., Order with orderId).
- **Value Object**: Object defined by its attributes, immutable (e.g., Money(currency, amount)).
- **Aggregate**: Cluster of entities and value objects treated as a unit. Has a root entity.
- **Domain Event**: Something that happened in the domain (e.g., OrderPlaced).
- **Repository**: Abstracts persistence, returns aggregates.
- **Domain Service**: Stateless service that performs business logic not fitting in an entity.

## 3. Why It Exists / Problem It Solves

Traditional software development often results in:
- **Translation layers**: Business analysts translate domain concepts to developers, developers translate to code. Meaning gets lost.
- **Anemic domain model**: Objects are data holders with no behavior. Business logic leaks into services.
- **Tight coupling**: Domain logic mixed with infrastructure (databases, frameworks).
- **Scope creep**: Unclear boundaries lead to bloated code.

DDD solves these by:
1. Creating a **shared understanding** between domain experts and developers.
2. **Explicit boundaries** between different parts of the domain.
3. **Rich domain models** that encapsulate business logic and rules.
4. **Separation of concerns**: Domain layer is independent of infrastructure.

## 4. When to Use It

| Scenario | DDD Investment |
|----------|---------------|
| **Complex business logic** | High — DDD is designed for this |
| **Microservice decomposition** | High — bounded contexts guide service boundaries |
| **Simple CRUD applications** | Low — overkill, just use transaction script |
| **Startup with unknown domain** | Medium — start with tactical DDD, evolve |
| **Legacy modernization** | High — use strategic DDD for migration plan |

## 5. When NOT to Use It / Tradeoffs

- **Simple CRUD applications**: DDD adds accidental complexity. Transaction Script is simpler.
- **Teams without domain expert access**: Ubiquitous language can't be established without domain experts.
- **Inflexible domain models**: Over-engineering the domain model can make simple changes hard.
- **Performance concerns**: Rich domain models with lazy loading and complex object graphs may be slower.
- **Learning curve**: DDD concepts are abstract. Teams need training and mentoring.

## 6. How It Works (Deep Mechanics)

**Event Storming** (by Alberto Brandolini): A workshop technique to discover the domain:
1. Domain experts and developers gather around a long wall.
2. Use sticky notes to model: events (orange), commands (blue), aggregates (yellow), external systems (pink).
3. Walk through business processes chronologically.
4. Identify bounded contexts where terms change meaning.
5. Output: context map, domain events, aggregates, bounded contexts.

**Tactical Design Example**:
1. Identify an **aggregate**: Order (root) + OrderItems (entities) + Money (value object).
2. Order root controls access to OrderItems. All changes go through Order.
3. Business rules in the aggregate: order.addItem(product, quantity) checks inventory.
4. Domain event: OrderSubmitted published when order is submitted.
5. Repository: OrderRepository.findById(orderId) returns the Order aggregate.

## 7. Architecture Diagram (ASCII)

\`\`\`
Strategic DDD - Context Map:
  +------------------+     +------------------+
  |   Order Context  |     |  Inventory Ctx   |
  |  (Bounded Ctx)   |     |  (Bounded Ctx)   |
  |  Product (Order) |<----|  Product (Stock) |
  |  - name, price   |     |  - sku, quantity |
  +------------------+     +------------------+
        |                           |
        v                           |
  +------------------+              |
  |  Shipping Ctx    |<-------------+
  |  (Bounded Ctx)   |
  |  - Shipment      |
  +------------------+

Tactical DDD - Aggregate:
  Aggregate Root: Order
    |- id: OrderId (Value Object)
    |- customerId: CustomerId (Value Object)
    |- items: List<OrderItem> (Entities)
    |- status: OrderStatus (Value Object)
    |- total: Money (Value Object)
    |- addItem(product, qty): void
    |- submit(): OrderSubmitted (Domain Event)
\`\`\`

## 8. Real-World Flow Example

**Event Storming for e-commerce checkout**:
1. Domain experts and developers attend a 2-day Event Storming session.
2. Events identified: CartCreated, ItemAdded, CheckoutStarted, InventoryReserved, PaymentProcessed, OrderConfirmed.
3. Commands: AddItemToCart, StartCheckout, ReserveInventory, ProcessPayment, ConfirmOrder.
4. Aggregates: Cart, Order, Payment, Shipment.
5. Bounded contexts: Shopping Cart, Order Fulfillment, Inventory, Payment, Shipping.
6. Context map shows Customer-Supplier relationship: Cart depends on Inventory for availability check.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// Value Objects
class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative');
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error('Currency mismatch');
    return new Money(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}

class OrderId {
  constructor(public readonly value: string) {}
  equals(other: OrderId): boolean { return this.value === other.value; }
}

// Entity
class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly unitPrice: Money
  ) {}
}

// Aggregate Root
class Order {
  private items: OrderItem[] = [];
  private status: 'pending' | 'submitted' | 'cancelled' = 'pending';

  constructor(
    public readonly id: OrderId,
    public readonly customerId: string
  ) {}

  addItem(productId: string, quantity: number, unitPrice: Money): void {
    if (this.status !== 'pending') throw new Error('Cannot modify submitted order');
    this.items.push(new OrderItem(productId, quantity, unitPrice));
  }

  submit(): void {
    if (this.items.length === 0) throw new Error('Cannot submit empty order');
    if (this.status !== 'pending') throw new Error('Order already submitted');
    this.status = 'submitted';
  }

  getTotal(): Money {
    return this.items.reduce(
      (total, item) => total.add(new Money(item.unitPrice.amount * item.quantity, item.unitPrice.currency)),
      new Money(0, 'USD')
    );
  }
}

// Repository Interface
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
}

// Domain Service
class PricingService {
  calculateDiscount(customerTier: string): number {
    return customerTier === 'gold' ? 0.1 : 0;
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Amazon**: Uses bounded contexts extensively (Catalog, Order, Fulfillment, Payment each have different models of Product).
- **Uber**: Applied DDD to decompose their monolith into microservices. Each service corresponds to a bounded context.
- **Spotify**: Squads are organized around bounded contexts. Each squad owns its domain model and can evolve independently.
- **ING Bank**: Used DDD + Event Storming to modernize their core banking platform.
- **Zalando**: Used DDD to decompose their e-commerce monolith into 500+ microservices aligned with bounded contexts.

## 11. Common Interview Questions

1. *What is a bounded context and how does it relate to microservices?*
2. *Explain the difference between Entity and Value Object.*
3. *What is an Aggregate in DDD? What are the rules for aggregate design?*
4. *How does ubiquitous language improve collaboration?*
5. *What is Event Storming and how does it help discover bounded contexts?*
6. *Explain the difference between core domain, supporting subdomain, and generic subdomain.*
7. *How do you handle relationships between aggregates across bounded contexts?*
8. *Design a DDD aggregate for a banking account system.*

## 12. Related Topics & Next Steps

- **Hexagonal Architecture**: Clean separation between domain and infrastructure.
- **CQRS**: Separating commands and queries, often used with DDD aggregates.
- **Event Sourcing**: Storing events as the source of truth for aggregates.
- **Anti-Corruption Layer**: Translating between bounded contexts.
- **DDD and Microservices**: Mapping bounded contexts to service boundaries.
- **Next Lesson**: Hexagonal Architecture.`,
    estimatedMin: 28,
    difficulty: 'INTERMEDIATE',
    companies: ['Amazon', 'Uber', 'Spotify', 'ING Bank', 'Zalando', 'Eric Evans'],
    tags: ['domain-driven-design', 'bounded-context', 'aggregate', 'value-object', 'entity', 'ubiquitous-language']
  },
  {
    id: 'lesson-06-03',
    slug: 'architecture-patterns-03-hexagonal-architecture',
    title: 'Hexagonal Architecture',
    content: `## 1. Quick Summary

**Hexagonal Architecture** (also called **Ports and Adapters**) is a design pattern that isolates the **core business logic** from **external concerns** (databases, web frameworks, message queues, UIs). The core communicates with the outside world through **ports** (interfaces) and **adapters** (implementations). This separation makes the business logic **testable**, **maintainable**, and **framework-independent**. Hexagonal Architecture is a key enabler for **Domain-Driven Design** — the domain model sits in the core, protected from infrastructure concerns. It was coined by Alistair Cockburn in 2005.

## 2. Definition

**Hexagonal Architecture** structures an application into two main areas:
- **Inside (Core Domain)**: Contains business logic, domain models, ports (interfaces), and domain services. Has NO dependencies on external frameworks, databases, or web servers.
- **Outside (Infrastructure)**: Contains adapters that implement ports. Adapters connect the core to HTTP controllers, database repositories, message queue consumers, CLI interfaces.

**Port**: An interface (contract) that defines how the core wants to be called or how it calls external systems.
**Adapter**: An implementation of a port. Converts core method calls into external actions and vice versa.

## 3. Why It Exists / Problem It Solves

Traditional layered architecture has problems:
1. **Framework lock-in**: Business logic depends on framework classes.
2. **Database coupling**: Business logic directly uses database code.
3. **Testing difficulty**: You need a database or web server to test business logic.
4. **Infrastructure changes are risky**: Changing databases requires rewriting business logic.

Hexagonal Architecture solves these by enforcing **dependency inversion**: the core defines interfaces (ports), and infrastructure implements them (adapters). The core has zero knowledge of the outside world.

## 4. When to Use It

| Scenario | Why Hexagonal |
|----------|--------------|
| **Complex business logic** | Protect domain from infrastructure changes |
| **Multiple delivery mechanisms** | Same core serves REST, GraphQL, CLI |
| **Domain-Driven Design** | Hexagonal is the ideal technical pattern for DDD |
| **Long-lived applications** | Protect against technology churn |
| **High testability requirement** | Core can be tested without infrastructure |

## 5. When NOT to Use It / Tradeoffs

- **Simple CRUD applications**: Overhead of ports and adapters isn't justified.
- **Small, short-lived projects**: Not worth the upfront design effort.
- **Performance-critical code**: The indirection layer may add minor overhead.
- **Rapid prototyping**: Induction delays getting something working.
- **Team not familiar**: Misuse can lead to over-abstracted, hard-to-follow code.

## 6. How It Works (Deep Mechanics)

**Dependency Rule**: Dependencies go INWARD. Nothing in the core can depend on something outside the core.

**Inbound Port**: Use case/application service interface. Called by external adapters (controllers, CLIs, event consumers).

**Outbound Port**: Repository, message publisher, external service interface. Called by the core to reach external systems.

**Inbound Adapter**: Converts external protocol (HTTP request, CLI command, queue message) into a core method call.

**Outbound Adapter**: Converts core method calls into external actions (SQL queries, HTTP calls, message publishing).

## 7. Architecture Diagram (ASCII)

\`\`\`
Hexagonal Architecture:

  +-----------------------+     +-----------------------+
  |  Web Controller      |     |  CLI Command          |
  |  (Inbound Adapter)   |     |  (Inbound Adapter)    |
  +----------+------------+     +----------+------------+
             |                             |
             v                             v
  +----------+--------------------------------+----------+
  |          |   Core Domain                  |          |
  |          |  +---------------------------+ |          |
  |          |  | CreateOrderUseCase (Port) | |          |
  |          |  +---------------------------+ |          |
  |          |  | Order Entity, Aggregate   | |          |
  |          |  +---------------------------+ |          |
  |          |  | OrderRepository (Port)    | |          |
  |          |  +---------------------------+ |          |
  +----------+--------------------------------+----------+
             |                             |
             v                             v
  +----------+------------+     +----------+------------+
  |  PostgresOrderRepo    |     |  KafkaEventPublisher  |
  |  (Outbound Adapter)   |     |  (Outbound Adapter)   |
  +-----------------------+     +-----------------------+
\`\`\`

## 8. Real-World Flow Example

1. User clicks Checkout on web app. HTTP request sent.
2. Inbound Adapter (OrderController): Deserializes request into a DTO. Calls CreateOrderUseCase.
3. Core: UseCase validates business rules, creates Order aggregate, calculates total.
4. Core calls Outbound Port (OrderRepository): repository.save(order).
5. Core calls Outbound Port (EventPublisher): publisher.publish(OrderCreated event).
6. Outbound Adapters: PostgresOrderRepository saves to database. KafkaEventPublisher publishes event.
7. Later, team adds GraphQL endpoint. New Inbound Adapter calls the same CreateOrderUseCase — zero changes to core.
8. Later, team changes from PostgreSQL to DynamoDB. Implement DynamoDBOrderRepository — zero changes to core.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// ===== CORE =====
interface CreateOrderUseCase {
  execute(command: CreateOrderCommand): Promise<OrderResponse>;
}

interface CreateOrderCommand {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
}

interface OrderResponse {
  orderId: string;
  total: number;
  status: string;
}

interface OrderRepository {
  save(order: Order): Promise<void>;
}

interface EventPublisher {
  publish(event: unknown): Promise<void>;
}

class Order {
  constructor(
    public id: string,
    public customerId: string,
    public items: Array<{ productId: string; quantity: number; price: number }>,
    public status: string,
    public total: number
  ) {}
}

class CreateOrderService implements CreateOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private eventPublisher: EventPublisher
  ) {}

  async execute(command: CreateOrderCommand): Promise<OrderResponse> {
    const order = new Order(
      crypto.randomUUID(),
      command.customerId,
      command.items.map(i => ({ ...i, price: 10 })),
      'confirmed',
      command.items.reduce((s, i) => s + i.quantity * 10, 0)
    );
    await this.orderRepo.save(order);
    await this.eventPublisher.publish({ type: 'OrderCreated', orderId: order.id });
    return { orderId: order.id, total: order.total, status: order.status };
  }
}

// ===== INFRASTRUCTURE =====
class OrderController {
  constructor(private createOrder: CreateOrderUseCase) {}

  async handlePost(req: any, res: any): Promise<void> {
    const result = await this.createOrder.execute({
      customerId: req.body.customerId,
      items: req.body.items
    });
    res.status(201).json(result);
  }
}

class PostgresOrderRepository implements OrderRepository {
  constructor(private db: any) {}

  async save(order: Order): Promise<void> {
    await this.db.query(
      'INSERT INTO orders (id, customer_id, status, total) VALUES ($1, $2, $3, $4)',
      [order.id, order.customerId, order.status, order.total]
    );
  }
}
\`\`\`

## 10. Real Company Use Cases

- **ING Bank**: Adopted hexagonal architecture for their core banking platform.
- **Zalando**: Uses hexagonal architecture in fashion platform microservices.
- **ThoughtWorks**: Promotes hexagonal architecture in client engagements.
- **Spring Framework**: Supports hexagonal architecture with dependency injection.
- **Microsoft .NET**: Clean Architecture template uses hexagonal principles.

## 11. Common Interview Questions

1. *What is the difference between hexagonal architecture and layered architecture?*
2. *Explain the terms port, adapter, inbound, and outbound.*
3. *How does hexagonal architecture support testability?*
4. *What is the dependency inversion principle and how does hexagonal architecture enforce it?*
5. *How would you add a new delivery mechanism (e.g., CLI) to a hexagonal application?*
6. *How does hexagonal architecture relate to Clean Architecture?*
7. *Design a hexagonal architecture for a payment processing system.*

## 12. Related Topics & Next Steps

- **Clean Architecture**: Robert Martin's evolution of hexagonal architecture.
- **Onion Architecture**: Jeffrey Palermo's layered approach.
- **Domain-Driven Design**: Business logic patterns for the core layer.
- **Dependency Injection**: Wiring ports to adapters.
- **Next Lesson**: Event-Driven Architecture.`,
    estimatedMin: 25,
    difficulty: 'INTERMEDIATE',
    companies: ['ING Bank', 'Zalando', 'ThoughtWorks', 'Spring', 'Microsoft', 'Alistair Cockburn'],
    tags: ['hexagonal-architecture', 'ports-and-adapters', 'clean-architecture', 'dependency-inversion', 'domain-logic']
  },
  {
    id: 'lesson-06-04',
    slug: 'architecture-patterns-04-event-driven-architecture',
    title: 'Event-Driven Architecture',
    content: `## 1. Quick Summary

**Event-Driven Architecture (EDA)** is a software architecture pattern where components communicate by producing and consuming **events** — immutable records of something that happened. Services are **loosely coupled**: producers emit events without knowing who consumes them, and consumers react to events without knowing who produced them. EDA enables **asynchronous processing**, **scalability**, **fault isolation**, and **real-time responsiveness**. It is the foundation for **microservices choreography**, **CQRS/Event Sourcing**, **stream processing**, and **serverless computing**. Key implementations: Apache Kafka, RabbitMQ, AWS EventBridge, and Azure Event Grid.

## 2. Definition

**Event**: A significant change in state (e.g., OrderPlaced, PaymentReceived, UserRegistered). Events are immutable facts that happened in the past.

**Event-Driven Architecture** consists of:
- **Event Producers**: Services that detect state changes and publish events.
- **Event Channel/Bus**: Infrastructure that transports events from producers to consumers (message broker, event stream).
- **Event Consumers**: Services that subscribe to events and react to them.
- **Event Store** (optional): Persistent storage of all events (Event Sourcing).

**Event Types**:
- **Domain Event**: Something that happened in the domain (OrderShipped).
- **Integration Event**: Cross-service event (OrderPlaced -> Inventory, Payment, Shipping).
- **Notification Event**: Informational event (UserLoggedIn for analytics).

## 3. Why It Exists / Problem It Solves

Synchronous request-response architectures create tight coupling:
1. Service A calls B, C, D sequentially. If any is slow, A blocks.
2. Adding a new consumer requires modifying the producer.
3. Scaling is tied to the slowest service in the chain.

EDA solves these:
1. **Decoupling**: Producers and consumers don't know each other.
2. **Scalability**: Consumers can scale independently. Events buffer during spikes.
3. **Extensibility**: New consumers subscribe without producer changes.
4. **Resilience**: Consumer failure doesn't affect producers.
5. **Real-time**: Events processed as they happen (streaming).

## 4. When to Use It

| Scenario | Why EDA |
|----------|---------|
| **Microservices choreography** | Services react to events without central orchestrator |
| **Real-time updates** | Live dashboards, notifications, streaming analytics |
| **Workflow automation** | Order -> Payment -> Shipping chain |
| **Audit/Compliance** | Immutable event log for audit trails |
| **Cross-system integration** | Connecting multiple services without point-to-point wiring |

## 5. When NOT to Use It / Tradeoffs

- **Simple CRUD**: Event-driven adds unnecessary complexity.
- **Strong consistency required**: EDA is eventually consistent by nature.
- **Complex debugging**: Event flows are hard to trace without distributed tracing.
- **Event ordering**: Preserving event order across services is challenging.
- **Duplicate events**: At-least-once delivery means consumers must be idempotent.
- **Event schema evolution**: Changing event formats requires coordination with all consumers.

## 6. How It Works (Deep Mechanics)

**Event Flow**:
1. Service A detects a state change (order placed).
2. A creates an event with event type, payload, metadata (timestamp, correlation ID).
3. A publishes the event to the event bus (Kafka topic, EventBridge, message queue).
4. Event bus stores and routes the event to all subscribers.
5. Services B, C, D receive the event asynchronously.
6. Each service processes the event independently, updates its own state.

**Event Contracts**:
- **Schema**: Defines event structure (type, required fields, version).
- **Versioning**: Backward-compatible changes (add optional fields) vs breaking changes (new major version topic).

## 7. Architecture Diagram (ASCII)

\`\`\`
Event-Driven Architecture:

  +----------+      +----------+      +----------+
  | Order    |      | Payment  |      |Inventory |
  | Service  |      | Service  |      | Service  |
  +----+-----+      +----+-----+      +-----+----+
       |                 |                  |
       |    Event Bus (Kafka / EventBridge) |
       +--------+--------+--------+--------+
                |        |        |
                v        v        v
           +------+  +------+  +------+
           |Email |  |Analyt|  |Audit |
           |Svc   |  |ics   |  |Log   |
           +------+  +------+  +------+

Event Flow:
  Order Service publishes OrderPlaced
    -> Email Service sends confirmation
    -> Inventory Service reserves items
    -> Payment Service charges customer
    -> Analytics Service records conversion
\`\`\`

## 8. Real-World Flow Example

**E-commerce checkout with EDA**:
1. Order Service publishes OrderPlaced {orderId: 123, userId: 42, items: [...], total: 59.99}.
2. Inventory Service subscribes to OrderPlaced, reserves items. Publishes InventoryReserved.
3. Payment Service subscribes to InventoryReserved, charges card. Publishes PaymentSucceeded.
4. Shipping Service subscribes to PaymentSucceeded, creates label. Publishes OrderShipped.
5. Email Service subscribes to PaymentSucceeded, sends confirmation.
6. Analytics Service subscribes to ALL events, updates dashboards.
7. Fraud Service subscribes to OrderPlaced, runs risk analysis. Publishes FlaggedForReview if suspicious.
8. Each step is asynchronous. If Payment Service is slow, Order Service is not blocked.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
interface Event {
  type: string;
  id: string;
  timestamp: number;
  payload: unknown;
  correlationId?: string;
}

interface EventBus {
  publish(event: Event): Promise<void>;
  subscribe(eventType: string, handler: (event: Event) => Promise<void>): void;
}

class InMemoryEventBus implements EventBus {
  private subscribers: Map<string, Array<(event: Event) => Promise<void>>> = new Map();

  async publish(event: Event): Promise<void> {
    const handlers = this.subscribers.get(event.type) || [];
    await Promise.all(handlers.map(h => h(event).catch(err =>
      console.error(\`Error handling \${event.type}: \${err}\`)
    )));
  }

  subscribe(eventType: string, handler: (event: Event) => Promise<void>): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }
}

// Order Service (Event Producer)
class OrderService {
  constructor(private eventBus: EventBus) {}

  async placeOrder(orderData: { userId: string; items: Array<{ productId: string; quantity: number }> }): Promise<void> {
    // Business logic...
    const orderId = crypto.randomUUID();
    await this.eventBus.publish({
      type: 'OrderPlaced',
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      payload: { orderId, userId: orderData.userId, items: orderData.items }
    });
  }
}

// Email Service (Event Consumer)
class EmailService {
  constructor(eventBus: EventBus) {
    eventBus.subscribe('OrderPlaced', async (event) => {
      const { userId, orderId } = event.payload as any;
      console.log(\`Sending confirmation email to user \${userId} for order \${orderId}\`);
    });
    eventBus.subscribe('OrderShipped', async (event) => {
      const { userId, orderId, trackingNumber } = event.payload as any;
      console.log(\`Sending tracking info \${trackingNumber} for order \${orderId}\`);
    });
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Amazon**: AWS services are built on EDA. S3 events trigger Lambda, SNS fans out to SQS queues, EventBridge routes events between services.
- **Netflix**: Event-driven architecture for video processing pipeline. Upload triggers encode, thumbnail generation, CDN distribution.
- **Uber**: Trip lifecycle is entirely event-driven. TripRequested -> DriverAssigned -> TripStarted -> TripCompleted -> PaymentProcessed.
- **Shopify**: Webhook-based event system. Order creation, product updates, and customer events are pushed to merchant-configured endpoints.
- **Slack**: Real-time messaging uses EDA. Message sent -> stored in DB -> pushed to connected clients via WebSocket -> indexed for search.

## 11. Common Interview Questions

1. *What is event-driven architecture and how does it differ from request-response?*
2. *What are the benefits and challenges of EDA?*
3. *How do you handle duplicate events in an event-driven system?*
4. *What is the difference between event notification, event-carried state transfer, and event sourcing?*
5. *How do you version events in an EDA?*
6. *What is idempotent event processing?*
7. *How do you trace requests across services in EDA?*
8. *Design an event-driven order processing system.*

## 12. Related Topics & Next Steps

- **CQRS**: Separating command and query responsibilities.
- **Event Sourcing**: Storing events as the primary data store.
- **Saga Pattern**: Coordinating distributed transactions with events.
- **Stream Processing**: Kafka Streams, Apache Flink for real-time event processing.
- **Serverless**: Lambda/Cloud Functions triggered by events.
- **Next Lesson**: CQRS (Command Query Responsibility Segregation).`,
    estimatedMin: 25,
    difficulty: 'INTERMEDIATE',
    companies: ['Amazon', 'Netflix', 'Uber', 'Shopify', 'Slack', 'Kafka'],
    tags: ['event-driven', 'eda', 'async', 'decoupling', 'events', 'real-time']
  },
  {
    id: 'lesson-06-05',
    slug: 'architecture-patterns-05-cqrs',
    title: 'CQRS (Command Query Responsibility Segregation)',
    content: `## 1. Quick Summary

**CQRS** stands for **Command Query Responsibility Segregation** — a pattern that separates **read operations** (queries) from **write operations** (commands). In traditional CRUD, the same model handles both reads and writes. In CQRS, commands use a **write model** optimized for updates and validation, while queries use a **read model** optimized for data retrieval. This separation allows each side to be **independently scaled**, **differently optimized**, and **separately secured**. CQRS is often combined with **Event Sourcing** and is valuable for **complex domains**, **high-performance systems**, and **teams with different read/write requirements**.

## 2. Definition

**Command**: An instruction to perform an action that changes state (e.g., PlaceOrder, UpdateInventory). Commands are named with imperatives. They return success/failure, not data.

**Query**: A request for information that does NOT change state (e.g., GetOrderById, SearchProducts). Queries return data without side effects.

**CQRS** dictates that commands and queries use **different models**:
- **Write Model**: Validates business rules, enforces invariants, produces events. May use DDD aggregates.
- **Read Model**: Denormalized, optimized for query patterns. May use read-optimized databases (Elasticsearch, Redis, materialized views).

**Separate databases** (optional but common): Commands write to an OLTP database; queries read from a read replica or a separate query store.

## 3. Why It Exists / Problem It Solves

In traditional CRUD with a single model:
1. **Impedance mismatch**: The model that's good for writes (normalized, enforces invariants) is often bad for reads (needs joins, denormalization).
2. **Performance conflicts**: Write-heavy operations may require different indexing than read-heavy operations.
3. **Scaling conflict**: Writes need consistency; reads can tolerate eventual consistency. Single model forces one approach.
4. **Security**: Commands and queries may need different authorization (e.g., any customer can query products, but only admins can update prices).
5. **Team coordination**: Read-heavy features (reporting) and write-heavy features (order placement) can be developed independently.

## 4. When to Use It

| Scenario | Why CQRS |
|----------|----------|
| **Complex domain logic** | Commands enforce business rules; queries are simple retrievals |
| **High read/write disparity** | Different read vs write throughput requirements |
| **Multiple query patterns** | Different representations (web, mobile, API, reports) |
| **Performance requirements** | Optimize read and write independently |
| **Event sourcing** | Natural pairing — events are the write store |

## 5. When NOT to Use It / Tradeoffs

- **Simple CRUD**: Overkill — a single model is simpler.
- **Single read pattern**: If all queries return the same shape as the write model, CQRS adds unnecessary complexity.
- **Consistency requirements**: CQRS often implies eventual consistency between write and read models. Strong consistency is harder.
- **Operational complexity**: Managing two databases, synchronization, and eventual consistency.
- **Team size**: Small teams may struggle with the cognitive load of dual models.

## 6. How It Works (Deep Mechanics)

**Command Flow**:
1. Client sends Command (e.g., PlaceOrder command).
2. Command Handler validates business rules using the Write Model (aggregate).
3. Handler updates the Write Model, enforces invariants.
4. Handler publishes Domain Events (OrderPlaced).
5. Write Model is persisted to the write database.

**Query Flow**:
1. Client sends Query (e.g., GetOrderHistory).
2. Query Handler reads from the Read Model (materialized view, denormalized table, cache).
3. Returns the requested data without business rule validation.

**Synchronization** (keeping read model up-to-date):
1. Event is published by the write side.
2. Event handler/projector reads the event, transforms data, updates the read model.
3. This can be synchronous (eventual consistency within milliseconds) or asynchronous (seconds latency).

## 7. Architecture Diagram (ASCII)

\`\`\`
CQRS Architecture:

  +----------+         +----------+         +----------+
  |  Client  |         |  Client  |         |  Client  |
  +----+-----+         +----+-----+         +----+-----+
       |                     |                    |
       | Command             | Query              | Query
       v                     v                    v
  +----------+         +----------+         +----------+
  | Command  |         | Query    |         | Query    |
  | Handler  |         | Handler 1|         | Handler 2|
  +----+-----+         +----+-----+         +----+-----+
       |                     |                    |
       v                     |                    |
  +----------+               |                    |
  |  Write   |               |                    |
  |  Model   |               v                    v
  |(Aggr.)   |          +----------+         +----------+
  +----+-----+          | Read     |         | Read     |
       |                | Model 1  |         | Model 2  |
       | Event           |(Orders)  |         |(Summary) |
       v                +----------+         +----------+
  +----------+                
  | Event    | --sync--> [Read Model Projection]
  | Bus      |
  +----------+

  Commands: POST /orders (body: { customerId, items })
  Queries:  GET /orders/123 (returns denormalized order)
\`\`\`

## 8. Real-World Flow Example

**E-commerce with CQRS**:
1. Customer places order: POST /orders with command body.
2. Command Handler validates: customer exists, items in stock, payment method valid.
3. Order aggregate is created, OrderPlaced event published.
4. Write database saves the order (normalized: orders table, order_items table).
5. Event projection:
   - OrderSummaryProjection: Updates denormalized summary table (one row per order, includes customer name, item count, total).
   - SearchProjection: Indexes order in Elasticsearch for full-text search.
   - AnalyticsProjection: Updates dashboard cache.
6. Customer queries order history: GET /orders/history.
7. Query Handler reads from denormalized OrderSummary table (no joins needed, fast).
8. Admin searches orders: GET /orders/search?q=status.
9. Search Query Handler reads from Elasticsearch.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// ===== COMMANDS (Write Side) =====

interface Command {
  type: string;
  id: string;
  timestamp: number;
}

class PlaceOrderCommand implements Command {
  type = 'PlaceOrder';
  id = crypto.randomUUID();
  timestamp = Date.now();
  constructor(
    public customerId: string,
    public items: Array<{ productId: string; quantity: number; price: number }>
  ) {}
}

// Write Model (Aggregate)
class OrderAggregate {
  private status: 'pending' | 'confirmed' | 'cancelled' = 'pending';

  constructor(
    public readonly id: string,
    public readonly customerId: string
  ) {}

  process(command: PlaceOrderCommand): OrderPlacedEvent {
    if (this.status !== 'pending') throw new Error('Order already processed');
    this.status = 'confirmed';
    return new OrderPlacedEvent(this.id, command.customerId, command.items);
  }
}

// Command Handler
class PlaceOrderHandler {
  constructor(private eventBus: EventBus) {}

  async handle(command: PlaceOrderCommand): Promise<string> {
    const order = new OrderAggregate(crypto.randomUUID(), command.customerId);
    const event = order.process(command);
    await this.eventBus.publish(event);
    return order.id;
  }
}

// ===== QUERIES (Read Side) =====

interface OrderSummary {
  id: string;
  customerId: string;
  customerName: string;
  itemCount: number;
  total: number;
  status: string;
  createdAt: Date;
}

class OrderQueryHandler {
  constructor(private db: any) {}

  async getOrderSummary(orderId: string): Promise<OrderSummary | null> {
    // Read from denormalized table (no joins!)
    const result = await this.db.query(
      'SELECT * FROM order_summaries WHERE id = $1',
      [orderId]
    );
    return result.rows[0] || null;
  }

  async getCustomerOrders(customerId: string): Promise<OrderSummary[]> {
    const result = await this.db.query(
      'SELECT * FROM order_summaries WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );
    return result.rows;
  }
}

// ===== PROJECTION (Synchronization) =====

class OrderSummaryProjection {
  constructor(private db: any) {}

  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    // Denormalize for fast reads
    await this.db.query(
      'INSERT INTO order_summaries (id, customer_id, customer_name, item_count, total, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        event.orderId,
        event.customerId,
        event.customerName,
        event.items.reduce((sum, item) => sum + item.quantity, 0),
        event.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        'confirmed',
        new Date()
      ]
    );
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Amazon**: Shopping cart uses CQRS. The catalog read model (millions of products, fast search) is separate from the order write model (transactional integrity).
- **Microsoft Docs**: The documentation platform uses CQRS. Write model manages content workflow; read model serves HTML pages optimized for search indexing.
- **Event Store**: Greg Young (creator of CQRS and Event Sourcing) worked with companies like Google and MongoDB to implement CQRS-based systems.
- **Uber**: Trip tracking uses CQRS. Driver location updates are commands; rider ETA queries read from a separate real-time location cache.
- **Facebook**: News feed uses a CQRS-like pattern. Posts are commands (write), the feed is a read model computed from social graph events.

## 11. Common Interview Questions

1. *What is CQRS and what problem does it solve?*
2. *How does CQRS differ from traditional CRUD?*
3. *Do you need separate databases for CQRS?*
4. *How do you keep the read model in sync with the write model?*
5. *What is the difference between CQRS and Event Sourcing?*
6. *When would you use CQRS without Event Sourcing?*
7. *How do you handle eventual consistency between read and write models?*
8. *Design a CQRS-based e-commerce system.*

## 12. Related Topics & Next Steps

- **Event Sourcing**: Storing events as the source of truth; natural pair with CQRS.
- **Event-Driven Architecture**: The messaging backbone for CQRS synchronisation.
- **Materialized Views**: Database techniques for efficient read models.
- **CQRS + Event Sourcing**: Combined pattern for audit trail and temporal queries.
- **Read Model Projections**: Building and maintaining read-optimized views.
- **Next Lesson**: Event Sourcing.`,
    estimatedMin: 25,
    difficulty: 'INTERMEDIATE',
    companies: ['Amazon', 'Microsoft', 'Uber', 'Facebook', 'Greg Young', 'Event Store'],
    tags: ['cqrs', 'command-query', 'write-model', 'read-model', 'segregation', 'projections']
  },
  {
    id: 'lesson-06-06',
    slug: 'architecture-patterns-06-event-sourcing',
    title: 'Event Sourcing',
    content: `## 1. Quick Summary

**Event Sourcing** is a pattern where the **state** of an application is derived from a sequence of **immutable events** stored in an **event store**. Instead of storing the current state (e.g., current account balance $100), you store every state-changing event (AccountCreated $0, Deposit $50, Withdraw $20, Deposit $70). The current state is computed by **replaying** all events. Event sourcing provides a **complete audit trail**, **temporal queries** (what was the state at any point in time?), and the ability to **reconstruct past states** for debugging or analysis. It pairs naturally with **CQRS** and is used in **banking**, **finance**, **audit systems**, and any domain where change history matters.

## 2. Definition

**Event Sourcing** stores the state of an entity as a sequence of **domain events**:
- **Event Store**: Append-only log of events. Events are never modified or deleted.
- **Aggregate**: Reconstructed by replaying all events in order.
- **Snapshot**: A saved state at a point in time to avoid replaying all events from the beginning.
- **Projection**: A read model built from events (often used with CQRS).

**Key properties**:
- Events are **immutable** and **append-only**.
- Events represent **facts that happened** (past tense: OrderPlaced, PaymentReceived).
- Current state is a **fold** over events: \`events.reduce((state, event) => apply(state, event), initialState)\`.
- The event store is the **source of truth**. Current state is derived.

## 3. Why It Exists / Problem It Solves

Traditional CRUD only stores current state:
1. **Lost history**: You can't know what changed, when, or why.
2. **Debugging difficulty**: When a bug produces incorrect state, you can't reconstruct what led to it.
3. **Audit compliance**: Many domains (finance, healthcare, legal) require immutable audit trails.
4. **Temporal queries**: What did the user see at the time of the error?
5. **Event-driven integration**: State changes can't be easily published as events for other services.

Event sourcing solves these by making events the **primary data store**:
- **Full audit trail**: Every change is recorded.
- **Time travel**: Reconstruct state at any point.
- **Debugging**: Replay events to reproduce bugs.
- **Integration**: Events can be published to other services.
- **Flexibility**: Build multiple projections for different read models.

## 4. When to Use It

| Scenario | Why Event Sourcing |
|----------|-------------------|
| **Audit/compliance** | Immutable event log required by regulation |
| **Complex domains** | Rich domain events capture business meaning |
| **Debugging/reproducibility** | Replay events to reproduce bugs |
| **Temporal queries** | State at any point in time |
| **CQRS integration** | Events feed read model projections |
| **Event-driven integration** | Events naturally published to other services |

## 5. When NOT to Use It / Tradeoffs

- **Simple CRUD**: Overkill — current state is sufficient.
- **High-volume, simple updates**: Event store growth can be large. Use snapshots.
- **Strong consistency with complex queries**: Reconstituting aggregates by replaying all events can be slow.
- **Event schema evolution**: Changing event structures requires migration or versioning.
- **Delete requirements**: GDPR right to erasure conflicts with immutable event store.
- **Learning curve**: Event sourcing requires a mindset shift.

## 6. How It Works (Deep Mechanics)

**Event Store Implementation**:
1. Append-only table: \`events(aggregate_id, aggregate_type, event_type, event_data, version, timestamp)\`.
2. Concurrency control: Optimistic locking with version numbers. \`UPDATE ... WHERE version = expected_version\`.
3. Aggregate is loaded by reading all events for that aggregate, sorted by version.
4. Events are applied in order to build the current state.
5. New events are appended with version = previous + 1.

**Snapshot**:
- After every N events (e.g., 100), save the current state as a snapshot.
- On load, read the latest snapshot, then apply remaining events after that snapshot.
- Reduces load time for aggregates with long event histories.

## 7. Architecture Diagram (ASCII)

\`\`\`
Event Sourcing vs CRUD:

  CRUD:
    Account 123: { balance: $100 }
    UPDATE accounts SET balance = $100 WHERE id = 123
    (history is lost)

  Event Sourcing:
    Account 123 Events:
      [v1] AccountOpened { owner: Alice, initialBalance: $0 }
      [v2] MoneyDeposited { amount: $100, description: Paycheck }
      [v3] MoneyWithdrawn { amount: $30, description: ATM }
      [v4] MoneyDeposited { amount: $30, description: Refund }
    
    Current balance: $0 + $100 - $30 + $30 = $100
    Replay to any point: v1+v2 = $100, v1+v2+v3 = $70

  Event Store Table:
  +----+--------------+----------------+---------------------+---------+
  | id | aggregate_id | event_type     | event_data          | version |
  +----+--------------+----------------+---------------------+---------+
  | 1  | acc-123      | AccountOpened  | {owner: Alice,...}  | 1       |
  | 2  | acc-123      | MoneyDeposited | {amount: 100,...}   | 2       |
  | 3  | acc-123      | MoneyWithdrawn | {amount: 30,...}    | 3       |
  | 4  | acc-123      | MoneyDeposited | {amount: 30,...}    | 4       |
  +----+--------------+----------------+---------------------+---------+
\`\`\`

## 8. Real-World Flow Example

**Bank account with event sourcing**:
1. Customer opens account: Store AccountOpened(customerId, accountId, initialBalance: 0).
2. Customer deposits $500: Store MoneyDeposited(accountId, amount: 500, timestamp).
3. Customer withdraws $100: Store MoneyWithdrawn(accountId, amount: 100, timestamp).
4. Customer checks balance: Replay all events -> $0 + $500 - $100 = $400.
5. Fraud investigation asks: What was the balance on March 15? Replay events only up to March 15.
6. Bug discovered: Withdrawal on March 20 processed incorrectly. Bank replays events, identifies the bug, corrects it.
7. Audit required: Export all events for account 123 as immutable proof of transactions.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// Event definitions
interface Event {
  aggregateId: string;
  type: string;
  data: unknown;
  version: number;
  timestamp: number;
}

class AccountOpened implements Event {
  constructor(
    public aggregateId: string,
    public data: { owner: string; initialBalance: number },
    public version: number,
    public timestamp = Date.now(),
    public type = 'AccountOpened'
  ) {}
}

class MoneyDeposited implements Event {
  constructor(
    public aggregateId: string,
    public data: { amount: number; description: string },
    public version: number,
    public timestamp = Date.now(),
    public type = 'MoneyDeposited'
  ) {}
}

class MoneyWithdrawn implements Event {
  constructor(
    public aggregateId: string,
    public data: { amount: number; description: string },
    public version: number,
    public timestamp = Date.now(),
    public type = 'MoneyWithdrawn'
  ) {}
}

// Event Store
class EventStore {
  private events: Event[] = [];
  private snapshots: Map<string, { state: unknown; version: number }> = new Map();
  private snapshotFrequency = 100;

  async saveEvents(aggregateId: string, newEvents: Event[], expectedVersion: number): Promise<void> {
    const existing = this.events.filter(e => e.aggregateId === aggregateId);
    const lastVersion = existing.length > 0 ? existing[existing.length - 1].version : 0;

    if (lastVersion !== expectedVersion) {
      throw new Error(\`Concurrency conflict: expected version \${expectedVersion}, got \${lastVersion}\`);
    }

    this.events.push(...newEvents);

    // Create snapshot if needed
    const allEvents = this.getEvents(aggregateId);
    if (allEvents.length % this.snapshotFrequency === 0) {
      const state = this.replayAggregate(aggregateId);
      this.snapshots.set(aggregateId, { state, version: newEvents[newEvents.length - 1].version });
    }
  }

  getEvents(aggregateId: string, afterVersion = 0): Event[] {
    return this.events
      .filter(e => e.aggregateId === aggregateId && e.version > afterVersion)
      .sort((a, b) => a.version - b.version);
  }

  getSnapshot(aggregateId: string): { state: unknown; version: number } | null {
    return this.snapshots.get(aggregateId) ?? null;
  }
}

// Aggregate
class BankAccount {
  private balance = 0;
  private owner = '';

  constructor(private id: string) {}

  apply(event: Event): void {
    switch (event.type) {
      case 'AccountOpened':
        this.owner = (event.data as any).owner;
        this.balance = (event.data as any).initialBalance;
        break;
      case 'MoneyDeposited':
        this.balance += (event.data as any).amount;
        break;
      case 'MoneyWithdrawn':
        this.balance -= (event.data as any).amount;
        break;
    }
  }

  getBalance(): number { return this.balance; }
  getOwner(): string { return this.owner; }
}

// Aggregate Repository
class BankAccountRepository {
  constructor(private eventStore: EventStore) {}

  async findById(accountId: string): Promise<BankAccount> {
    const account = new BankAccount(accountId);
    const snapshot = this.eventStore.getSnapshot(accountId);
    let events: Event[];

    if (snapshot) {
      // Apply snapshot state directly (simplified)
      events = this.eventStore.getEvents(accountId, snapshot.version);
    } else {
      events = this.eventStore.getEvents(accountId);
    }

    for (const event of events) {
      account.apply(event);
    }
    return account;
  }

  async save(account: BankAccount, events: Event[], expectedVersion: number): Promise<void> {
    await this.eventStore.saveEvents(accountIdFromAccount(account), events, expectedVersion);
  }
}

function accountIdFromAccount(account: BankAccount): string {
  return (account as any).id;
}

// Usage
async function example(): Promise<void> {
  const store = new EventStore();
  const repo = new BankAccountRepository(store);

  // Create account
  const account = new BankAccount('acc-123');
  await store.saveEvents('acc-123', [
    new AccountOpened('acc-123', { owner: 'Alice', initialBalance: 0 }, 1)
  ], 0);

  // Deposit
  await store.saveEvents('acc-123', [
    new MoneyDeposited('acc-123', { amount: 500, description: 'Salary' }, 2)
  ], 1);

  // Withdraw
  await store.saveEvents('acc-123', [
    new MoneyWithdrawn('acc-123', { amount: 100, description: 'ATM' }, 3)
  ], 2);

  // Check balance
  const loaded = await repo.findById('acc-123');
  console.log(\`Balance: \${loaded.getBalance()}\`); // 400
}
\`\`\`

## 10. Real Company Use Cases

- **Event Store Ltd**: Created by Greg Young. The Event Store database is purpose-built for event sourcing with projections and subscriptions.
- **Banking Systems**: Many core banking platforms use event sourcing for immutable transaction logs (required by financial regulations).
- **Axoni**: Enterprise-grade event sourcing for financial services (post-trade processing, derivatives). Uses event-sourced state machines.
- **Riak**: Distributed database with CRDTs and event sourcing-like version vectors.
- **LMAX Exchange**: Built the Disruptor (high-performance inter-thread messaging) with event sourcing for ultra-low-latency financial exchange.
- **Git**: Git is an event-sourced system! Commits are immutable events; branches are projections. The repository state is derived by replaying commits.

## 11. Common Interview Questions

1. *What is event sourcing and how does it differ from traditional CRUD?*
2. *How do you handle concurrency in an event-sourced system?*
3. *What are snapshots and why are they needed?*
4. *How does event sourcing relate to CQRS?*
5. *How do you handle event schema evolution?*
6. *How would you implement a temporal query in an event-sourced system?*
7. *What are the storage implications of event sourcing?*
8. *Design an event-sourced banking system with CQRS.*

## 12. Related Topics & Next Steps

- **CQRS**: Command Query Responsibility Segregation — natural pair with event sourcing.
- **Event Store**: Databases built for event sourcing (EventStoreDB, PostgreSQL as event store).
- **Snapshot Strategy**: Balancing replay performance with storage.
- **Event Versioning**: Schema evolution strategies (upcasting, new event types).
- **Projections**: Building read models from the event stream.
- **Next Lesson**: Saga Pattern (Distributed Transactions).`,
    estimatedMin: 25,
    difficulty: 'INTERMEDIATE',
    companies: ['Event Store', 'Axoni', 'Riak', 'LMAX', 'Git', 'Greg Young'],
    tags: ['event-sourcing', 'events', 'immutable-log', 'audit', 'cqrs', 'replay']
  },
  {
    id: 'lesson-06-07',
    slug: 'architecture-patterns-07-saga-pattern',
    title: 'Saga Pattern (Distributed Transactions)',
    content: `## 1. Quick Summary

The **Saga pattern** manages **distributed transactions** across multiple microservices by breaking a transaction into a sequence of **local transactions**, each with a **compensating action** for rollback. Unlike **Two-Phase Commit (2PC)** which holds locks and blocks, sagas commit each step immediately and compensate asynchronously if later steps fail. Sagas come in two flavors: **choreography** (each service produces and reacts to events) and **orchestration** (a central coordinator directs the flow). Sagas provide **eventual consistency** with **high availability** and are the standard approach for distributed transactions in microservices.

## 2. Definition

**Saga**: A sequence of local transactions where each step has a **compensating transaction** that semantically undoes it. If a step fails, compensating transactions are run in reverse order.

**Local Transaction**: A complete ACID transaction within a single service/database.

**Compensating Transaction**: A new transaction that reverses the effects of a previous transaction (not a rollback — the original is already committed).

**Choreography-based Saga**: Each service publishes events after its local transaction. Other services subscribe and react. No central coordinator.

**Orchestration-based Saga**: A central **orchestrator** tells each service what to do, tracks state, and issues compensating actions on failure.

## 3. Why It Exists / Problem It Solves

In a monolith with a single database, you can use ACID transactions across all operations. In microservices, each service has its own database:
- No ACID transactions across services.
- A business operation spans multiple services (e.g., order -> payment -> inventory -> shipping).
- If one step fails, previous steps must be undone.

Saga solves this by:
1. Committing each step immediately (releases locks quickly).
2. Defining compensating actions that semantically undo each step.
3. Ensuring that either all steps complete successfully or all are compensated.

## 4. When to Use It

| Scenario | Why Saga |
|----------|----------|
| **Multi-service business process** | Order -> Payment -> Inventory -> Shipping |
| **Long-running transactions** | Minutes or hours (travel booking) |
| **High availability requirement** | No blocking locks like 2PC |
| **Eventual consistency acceptable** | Most business processes tolerate short-term inconsistency |

## 5. When NOT to Use It / Tradeoffs

- **Strong consistency required**: Saga provides eventual consistency. Use 2PC or distributed locking.
- **Simple two-step operation**: May be simpler to use a single database and ACID.
- **No compensating action possible**: Some operations can't be compensated (sending an email). Only send at the end.
- **Complex orchestration state management**: Orchestrator must persist state and handle failures.
- **Debugging difficulty**: Tracking saga state across services requires tracing.

## 6. How It Works (Deep Mechanics)

**Choreography Saga**:
1. Order Service creates order, publishes OrderCreated event.
2. Payment Service subscribes, charges card, publishes PaymentCharged event.
3. Inventory Service subscribes, reserves items, publishes InventoryReserved event.
4. Shipping Service subscribes, creates label, publishes OrderShipped event.
5. If any step fails, it publishes a failure event. Other services subscribe and compensate.

**Orchestration Saga**:
1. Orchestrator sends CreateOrder command to Order Service.
2. Order created. Orchestrator sends ChargePayment command to Payment Service.
3. Payment charged. Orchestrator sends ReserveInventory command to Inventory Service.
4. Inventory reserved. Orchestrator sends CreateShipment command to Shipping.
5. If Payment fails: Orchestrator sends CancelOrder to Order Service.

## 7. Architecture Diagram (ASCII)

\`\`\`
Choreography Saga:
  Order Svc     Payment Svc     Inventory Svc    Shipping Svc
     |               |               |               |
     |--OrderCreated->|               |               |
     |               |--PaymentDone-->|               |
     |               |               |--InvReserved->|
     |               |               |               |--Shipped
     |<--All ok------|---------------|---------------|
  (Each service reacts to events published by others)

Orchestration Saga:
  +------------------+
  |  Orchestrator    |
  +--+----+----+----+
     |    |    |    |
     v    v    v    v
   Order  Pay  Inv  Ship
   Svc    Svc  Svc  Svc

  Orchestrator steps:
  1. orderSvc.createOrder()
  2. paymentSvc.charge()
  3. inventorySvc.reserve()
  4. shippingSvc.ship()
  Fail at step 3: compensate(2), compensate(1)
\`\`\`

## 8. Real-World Flow Example

**E-commerce checkout saga (orchestrated)**:
1. Orchestrator sends CreateOrder to Order Service. Order created (status: pending).
2. Orchestrator sends ReserveInventory(123) to Inventory Service. Items reserved.
3. Orchestrator sends ChargePayment($99.99) to Payment Service. Payment succeeds.
4. Orchestrator sends ConfirmOrder to Order Service. Order status: confirmed.
5. Orchestrator sends ScheduleShipment to Shipping Service. Shipment scheduled.
6. Saga complete. All steps committed.
7. If payment fails at step 3: Orchestrator sends CancelOrder to Order Service (compensate step 1). Orchestrator sends ReleaseInventory to Inventory Service (compensate step 2). Saga status: failed.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// Saga Orchestrator
interface SagaStep {
  name: string;
  execute: () => Promise<boolean>;
  compensate: () => Promise<void>;
}

class SagaOrchestrator {
  private executedSteps: string[] = [];
  private steps: SagaStep[] = [];

  addStep(step: SagaStep): void {
    this.steps.push(step);
  }

  async execute(): Promise<boolean> {
    for (const step of this.steps) {
      try {
        const success = await step.execute();
        if (!success) {
          await this.compensate();
          return false;
        }
        this.executedSteps.push(step.name);
      } catch (err) {
        console.error(\`Step \${step.name} failed: \${err}\`);
        await this.compensate();
        return false;
      }
    }
    return true;
  }

  private async compensate(): Promise<void> {
    for (const name of this.executedSteps.reverse()) {
      const step = this.steps.find(s => s.name === name);
      if (step) {
        try { await step.compensate(); }
        catch (err) { console.error(\`Compensation failed for \${name}: \${err}\`); }
      }
    }
  }
}

// Choreography-style saga with event handlers
class ChoreographySaga {
  private steps: Map<string, {
    execute: () => Promise<void>;
    compensate: () => Promise<void>;
    onFailure?: () => Promise<void>;
  }> = new Map();

  async executeStep(stepId: string): Promise<void> {
    const step = this.steps.get(stepId);
    if (!step) throw new Error('Unknown step');
    await step.execute();
  }

  async compensateStep(stepId: string): Promise<void> {
    const step = this.steps.get(stepId);
    if (!step) throw new Error('Unknown step');
    await step.compensate();
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Amazon AWS (Step Functions)**: AWS Step Functions is a managed saga orchestrator. Build workflows that coordinate Lambda functions, ECS tasks, and API calls with built-in error handling and compensation.
- **Netflix**: Uses orchestration-based sagas for video processing pipeline. Ingestion -> Transcode -> Thumbnail -> Package -> Deploy.
- **Camel / ActiveMQ**: Apache Camel provides saga EIP for choreography and orchestration.
- **Eventuate Tram**: Saga framework for microservices with CDC-based event publishing.
- **Microsoft Durable Functions**: Stateful orchestrations for saga patterns in Azure Functions.

## 11. Common Interview Questions

1. *Compare choreography vs orchestration sagas. When would you use each?*
2. *What is a compensating transaction? How is it different from a rollback?*
3. *How does saga differ from Two-Phase Commit (2PC)?*
4. *How do you handle idempotency in saga steps?*
5. *What happens if the orchestrator crashes mid-saga?*
6. *How do you monitor saga execution?*
7. *How do you handle operations that can't be compensated (e.g., sending an email)?*
8. *Design a saga for a travel booking system (flight + hotel + car).*

## 12. Related Topics & Next Steps

- **Two-Phase Commit (2PC)**: ACID distributed transactions vs saga's eventual consistency.
- **Transactional Outbox**: Reliable event publishing for saga events.
- **CQRS/Event Sourcing**: Event-driven sagas with event stores.
- **Idempotency**: Ensuring safe retries in saga steps.
- **Distributed Tracing**: Tracking saga execution across services.
- **Next Lesson**: Transactional Outbox Pattern.`,
    estimatedMin: 25,
    difficulty: 'ADVANCED',
    companies: ['Amazon AWS', 'Netflix', 'Apache Camel', 'Eventuate', 'Microsoft', 'Uber'],
    tags: ['saga', 'distributed-transactions', 'compensation', 'choreography', 'orchestration', 'microservices']
  },
  {
    id: 'lesson-06-08',
    slug: 'architecture-patterns-08-transactional-outbox',
    title: 'Transactional Outbox Pattern',
    content: `## 1. Quick Summary

The **Transactional Outbox** pattern ensures **reliable event publishing** in microservices by storing events in the **same database transaction** as the state change. Instead of publishing events directly (risking inconsistency if the broker is down), the service writes the event to an **outbox table** within the same transaction. A separate **message relay** process reads from the outbox and publishes events to the message broker. This guarantees **at-least-once** delivery without the complexity of distributed transactions. The outbox is the foundation for reliable **event-driven architectures**, **CQRS projections**, and **saga coordination**.

## 2. Definition

**Transactional Outbox** is a pattern that solves the **dual-write problem**: updating the database AND publishing an event atomically.

The core idea:
- **Outbox Table**: A database table that stores events to be published (event type, payload, status, created_at).
- **Message Relay**: A background process that reads pending events from the outbox, publishes them to the message broker, and marks them as published.
- **Relay mechanisms**: Polling (periodic SQL query), CDC (Change Data Capture via Debezium), or log-based (PostgreSQL logical replication).

## 3. Why It Exists / Problem It Solves

**The Dual-Write Problem**:
1. Service A saves order to database: INSERT INTO orders.
2. Service A publishes OrderCreated to message broker.
3. If the broker is unavailable between steps 1 and 2, the event is lost.
4. If step 2 succeeds but step 1 fails (rare), you have an event for a non-existent order.
5. No atomic transaction covers both database and message broker.

The outbox solves this by making the event publishing part of the same database transaction. Either both the state change and the event are saved, or neither is.

## 4. When to Use It

| Scenario | Why Outbox |
|----------|------------|
| **Event-driven microservices** | Reliable event publishing after state changes |
| **CQRS projections** | Guarantee read model updates |
| **Saga execution** | Reliable saga step events |
| **Any dual-write scenario** | Database + message broker coordination |

## 5. When NOT to Use It / Tradeoffs

- **Low reliability requirements**: If losing events is acceptable, direct publishing is simpler.
- **Low throughput, simple system**: The outbox adds complexity. Use direct publish.
- **Exactly-once delivery needed**: Outbox provides at-least-once. Consumers must deduplicate.
- **CDC complexity**: Debezium-based relay adds operational overhead.
- **Polling latency**: Polling-based relay has delay between event creation and publication.

## 6. How It Works (Deep Mechanics)

**Write Path**:
1. Begin database transaction.
2. INSERT into business tables (e.g., orders).
3. INSERT into outbox table (aggregate_id, event_type, payload, status='pending', created_at).
4. Commit transaction.
5. If step 3 fails before commit, steps 1-2 are rolled back. No inconsistency.

**Read Path (Polling)**:
1. Message relay polls the outbox table: SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100.
2. For each event: publish to message broker.
3. On success: UPDATE outbox SET status = 'published' WHERE id = ?.
4. Handle failures: retry with exponential backoff, eventually move to dead letter.
5. Cleanup: Delete or archive published events after a retention period.

**Read Path (CDC with Debezium)**:
1. Debezium connects to the database's replication log (PostgreSQL WAL, MySQL binlog).
2. Captures inserts to the outbox table as change events.
3. Publishes directly to Kafka without polling.
4. Lower latency, no polling overhead, no database load.

## 7. Architecture Diagram (ASCII)

\`\`\`
Transactional Outbox:

  Service A                    Database                     Broker
     |                           |                            |
     |-- BEGIN ---------------->|                            |
     |-- INSERT order --------->|                            |
     |-- INSERT outbox_event --->|   (same transaction)      |
     |-- COMMIT --------------->|                            |
     |                           |                            |
     |                           |  (polling or CDC relay)    |
     |                           |---- SELECT pending -------|?
     |                           |                            |
     |                           |------- PUBLISH event ----->|
     |                           |                            |
     |                           |<--- ACK ------------------|
     |                           |                            |
     |                           |-- UPDATE outbox status --->|
     |                           |    (mark as published)     |

  Outbox Table:
  +----+------------+-------------+------------------+--------+----------+
  | id | aggregate  | event_type  | payload          | status | created  |
  +----+------------+-------------+------------------+--------+----------+
  | 1  | order-123  | OrderPlaced | {customerId...}  | pending| 10:00:01 |
  | 2  | order-456  | OrderPlaced | {customerId...}  | publish| 10:00:02 |
  +----+------------+-------------+------------------+--------+----------+
\`\`\`

## 8. Real-World Flow Example

**Order service with transactional outbox**:
1. Customer places order. Order service begins a transaction.
2. Order service inserts into orders table (customer_id, items, total, status='confirmed').
3. Order service inserts into outbox table (event_type='OrderPlaced', payload={orderId: 123, customerId: 42, total: 99.99}).
4. Transaction commits. Both the order and the event are persisted atomically.
5. Relay worker (polling every 100ms): SELECT * FROM outbox WHERE status='pending' limit 10.
6. Worker finds the OrderPlaced event. Publishes to Kafka topic 'orders'.
7. Kafka acknowledges. Worker marks outbox event status = 'published'.
8. If worker crashes between publish and status update, it will republish on restart. Consumers handle deduplication.
9. If Kafka is unavailable, worker retries with backoff. Events stay in outbox table until published.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: string; // JSON string
  status: 'pending' | 'published' | 'failed';
  createdAt: Date;
}

// Service that uses transactional outbox
class OrderServiceWithOutbox {
  constructor(private db: any, private relay: OutboxRelay) {}

  async placeOrder(customerId: string, items: Array<{ productId: string; quantity: number; price: number }>): Promise<string> {
    const orderId = crypto.randomUUID();
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 1. Business operation
      await client.query(
        'INSERT INTO orders (id, customer_id, total, status) VALUES ($1, $2, $3, $4)',
        [orderId, customerId, total, 'confirmed']
      );

      // 2. Outbox event (same transaction)
      await client.query(
        'INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, payload, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [crypto.randomUUID(), 'order', orderId, 'OrderPlaced', JSON.stringify({ orderId, customerId, total }), 'pending']
      );

      await client.query('COMMIT');
      return orderId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

// Polling-based outbox relay
class PollingOutboxRelay {
  private running = false;

  constructor(
    private db: any,
    private publisher: { publish: (topic: string, event: unknown) => Promise<void> },
    private options: { pollIntervalMs: number; batchSize: number; topic: string }
  ) {}

  start(): void {
    this.running = true;
    this.poll();
  }

  stop(): void {
    this.running = false;
  }

  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      const events = await this.db.query(
        'SELECT * FROM outbox WHERE status = $1 ORDER BY created_at ASC LIMIT $2 FOR UPDATE SKIP LOCKED',
        ['pending', this.options.batchSize]
      );

      for (const event of events.rows) {
        try {
          await this.publisher.publish(this.options.topic, JSON.parse(event.payload));
          await this.db.query('UPDATE outbox SET status = $1 WHERE id = $2', ['published', event.id]);
        } catch (err) {
          console.error(\`Failed to publish event \${event.id}: \${err}\`);
          await this.db.query('UPDATE outbox SET status = $1 WHERE id = $2', ['failed', event.id]);
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }

    setTimeout(() => this.poll(), this.options.pollIntervalMs);
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Debezium (Red Hat)**: The most popular CDC tool for transactional outbox. Connects to PostgreSQL, MySQL, MongoDB, SQL Server. Captures outbox events and streams to Kafka.
- **Uber (Schemaless)**: Uber's MySQL-based outbox for reliable event publishing across hundreds of services.
- **Amazon (DynamoDB Streams)**: DynamoDB Streams act as an outbox. Any write to DynamoDB triggers a stream event that can be consumed by Lambda or Kinesis.
- **Eventuate Tram**: Java/.NET framework for transactional messaging with outbox + CDC. Used by many enterprises for event-driven microservices.
- **Outbox in Kafka Connect**: Kafka Connect JDBC source connector can poll a database table and publish to Kafka.

## 11. Common Interview Questions

1. *What is the dual-write problem in event-driven systems?*
2. *How does the transactional outbox pattern solve it?*
3. *Compare polling-based vs CDC-based outbox relays.*
4. *What happens if the relay publishes an event but crashes before marking it as published?*
5. *How do you handle idempotency in outbox consumers?*
6. *What are the operational considerations for outbox table cleanup?*
7. *How does Debezium implement transactional outbox?*
8. *Design a transactional outbox system for an e-commerce platform.*

## 12. Related Topics & Next Steps

- **Event-Driven Architecture**: The context where outbox is used.
- **CQRS Projections**: Read model updates via outbox events.
- **Saga Pattern**: Reliable saga step execution with outbox.
- **Idempotent Consumers**: Handling duplicate events from at-least-once delivery.
- **Change Data Capture (CDC)**: Advanced outbox relay with Debezium.
- **Next Lesson**: API Composition vs Aggregator Pattern.`,
    estimatedMin: 22,
    difficulty: 'INTERMEDIATE',
    companies: ['Debezium', 'Uber', 'Amazon DynamoDB', 'Eventuate', 'Kafka Connect', 'Red Hat'],
    tags: ['transactional-outbox', 'dual-write', 'cdc', 'event-publishing', 'debezium', 'reliable-messaging']
  },
  {
    id: 'lesson-06-09',
    slug: 'architecture-patterns-09-api-composition-vs-aggregator',
    title: 'API Composition vs Aggregator Pattern',
    content: `## 1. Quick Summary

**API Composition** and **Aggregator Pattern** are two approaches for combining data from multiple microservices into a single response for the client. **API Composition** uses a **composer** service (often an API gateway) that calls multiple downstream services and combines their responses. It's simple but introduces **N+1 request latency** and tight coupling. The **Aggregator Pattern** creates a dedicated service that owns the aggregation logic, often with its own database that pre-joins data from multiple services. Aggregation is useful for **optimistic reads** and **complex queries** but adds operational complexity. Choosing between them depends on your **latency tolerance**, **data freshness requirements**, and **team structure**.

## 2. Definition

**API Composition**: A pattern where an API gateway or a dedicated composer invokes multiple downstream services and merges the results into a unified response. Each service is called independently. The composer handles the orchestration.

**Aggregator Pattern** (also Backend for Frontend Aggregator): A dedicated service that aggregates data from multiple sources, often with its own data store that pre-computes or caches the joined data. The aggregator owns the aggregation logic, not the client or gateway.

**API Gateway**: Often implements composition (calling multiple microservices). Example: GraphQL gateway resolves fields by calling different services.

## 3. Why It Exists / Problem It Solves

In a monolith, a client can get all related data with one query (e.g., order with customer details and items via a JOIN). In microservices, data is split across services:
- Order Service: order data.
- Customer Service: customer name, address.
- Product Service: product details.
- A client would need to make 3+ HTTP calls to render an order page.

API Composition solves this by having the gateway or a composer make the calls on behalf of the client.

## 4. When to Use It

| Factor | API Composition | Aggregator |
|--------|---------------|------------|
| **Simplicity** | Simple to implement | Complex (dedicated service) |
| **Latency** | Adds network calls (N+1) | Can be optimized with pre-join |
| **Data freshness** | Real-time (always fresh) | May be stale (cached/pre-computed) |
| **Client diversity** | Works for all clients | Often BFF-specific |
| **Query complexity** | Simple joins | Complex joins, filtering, pagination |
| **Team structure** | No new service ownership | Needs dedicated team/ownership |

## 5. When NOT to Use It / Tradeoffs

**API Composition**:
- **N+1 problem**: Each additional service adds latency. An order detail page might need 5+ downstream calls.
- **Error handling**: If one service is down, the composition partially fails.
- **Coupling**: The composer must know the APIs of all downstream services.
- **Chattiness**: More network traffic between services.

**Aggregator**:
- **Stale data**: Aggregated data may lag behind source services.
- **Operational complexity**: Another service to deploy, monitor, and scale.
- **Data ownership ambiguity**: Who owns the aggregated data model?
- **Over-fetching**: Aggregator may return more data than needed for a specific view.

## 6. How It Works (Deep Mechanics)

**API Composition Flow**:
1. Client sends request to API Gateway: GET /orders/123.
2. Gateway calls Order Service: GET /internal/orders/123 -> returns order data.
3. Gateway calls Customer Service: GET /internal/customers/42 -> returns customer data.
4. Gateway calls Product Service: GET /internal/products?ids=1,2,3 -> returns product data.
5. Gateway merges responses into a single JSON and returns to client.
6. If Customer Service is down, gateway may return partial response or error.

**Aggregator Pattern Flow**:
1. Aggregator has a database that stores denormalized order-customer-product data.
2. Order Service publishes OrderPlaced event.
3. Customer Service publishes CustomerUpdated event.
4. Product Service publishes ProductUpdated event.
5. Aggregator subscribes, updates its database when any source changes.
6. Client queries Aggregator directly: GET /api/orders/123 -> returns pre-joined data.
7. No downstream calls during client request.

## 7. Architecture Diagram (ASCII)

\`\`\`
API Composition (via Gateway):

  Client              API Gateway              Order Svc    Customer Svc  Product Svc
     |                     |                       |              |             |
     |-- GET /orders/123 ->|                       |              |             |
     |                     |-- GET /orders/123 ---->|              |             |
     |                     |<--- order data -------|              |             |
     |                     |-- GET /customers/42 --------------->|             |
     |                     |<--- customer name ------------------|             |
     |                     |-- GET /products?ids=1,2 ------------------------>|
     |                     |<--- product names ------------------------------|
     |                     |                       |              |             |
     |<-- merged response -|                       |              |             |

Aggregator Pattern:

  Order Svc ----OrderPlaced----> Aggregator DB
  Customer Svc -CustomerUpdate-> (pre-joined)
  Product Svc -ProductUpdate--->     |
                                     |
  Client --- GET /orders/123 ------->|
\`\`\`

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// API Composition (Gateway-based)
interface OrderService {
  getOrder(orderId: string): Promise<{ id: string; customerId: string; items: Array<{ productId: string; quantity: number }>; total: number }>;
}

interface CustomerService {
  getCustomer(customerId: string): Promise<{ id: string; name: string; email: string }>;
}

interface ProductService {
  getProducts(productIds: string[]): Promise<Array<{ id: string; name: string; price: number }>>;
}

class OrderComposer {
  constructor(
    private orders: OrderService,
    private customers: CustomerService,
    private products: ProductService
  ) {}

  async getOrderDetail(orderId: string): Promise<any> {
    // Fan-out calls in parallel
    const [order, customersPromise] = await Promise.all([
      this.orders.getOrder(orderId),
      this.customers // can't await here yet, we need customerId from order
    ]);

    const [customer, products] = await Promise.all([
      this.customers.getCustomer(order.customerId),
      this.products.getProducts(order.items.map(i => i.productId))
    ]);

    return {
      orderId: order.id,
      customer: { id: customer.id, name: customer.name, email: customer.email },
      items: order.items.map(item => ({
        ...item,
        product: products.find(p => p.id === item.productId)
      })),
      total: order.total
    };
  }
}

// Aggregator Pattern (Pre-joined data store)
interface AggregatedOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  items: Array<{ productName: string; quantity: number; price: number }>;
  total: number;
  createdAt: Date;
}

class OrderAggregator {
  private store: Map<string, AggregatedOrder> = new Map();

  async onOrderPlaced(event: { orderId: string; customerId: string; items: Array<{ productId: string; quantity: number; price: number }> }): Promise<void> {
    // Event handler: pre-compute and store
    const customer = await this.fetchCustomer(event.customerId);
    const products = await Promise.all(
      event.items.map(i => this.fetchProduct(i.productId))
    );

    this.store.set(event.orderId, {
      id: event.orderId,
      customerName: customer.name,
      customerEmail: customer.email,
      items: event.items.map((item, idx) => ({
        productName: products[idx].name,
        quantity: item.quantity,
        price: item.price
      })),
      total: event.items.reduce((s, i) => s + i.price * i.quantity, 0),
      createdAt: new Date()
    });
  }

  async getAggregatedOrder(orderId: string): Promise<AggregatedOrder | null> {
    return this.store.get(orderId) ?? null;
  }

  private async fetchCustomer(customerId: string): Promise<{ name: string; email: string }> {
    return { name: 'Alice', email: 'alice@example.com' };
  }

  private async fetchProduct(productId: string): Promise<{ name: string }> {
    return { name: 'Widget' };
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Netflix (API Composition)**: Netflix's API gateway (Zuul) composes responses from hundreds of microservices for each client request.
- **Shopify (GraphQL Composition)**: Shopify's GraphQL API allows clients to compose queries across multiple domains (products, orders, customers) with the gateway resolving fields from multiple services.
- **Facebook (GraphQL)**: Facebook's GraphQL is the canonical API composition example — a single query fetches data from multiple backend services.
- **Amazon (Aggregator)**: Product detail pages use an aggregator pattern — a dedicated service pre-joins product info, pricing, reviews, and inventory into a denormalized data store for fast reads.
- **eBay (Both)**: Uses API composition for most read paths but aggregators for search and browse pages that need complex joins.

## 11. Common Interview Questions

1. *What is the difference between API composition and the aggregator pattern?*
2. *When would you use API composition over an aggregator?*
3. *How does GraphQL implement API composition?*
4. *What is the N+1 problem in API composition?*
5. *How does the aggregator pattern handle data freshness?*
6. *How would you implement API composition with cached aggregation?*
7. *What are the error handling strategies for API composition?*
8. *Design an aggregation strategy for a product detail page.*

## 12. Related Topics & Next Steps

- **API Gateway Pattern**: Centralized entry point with composition capabilities.
- **GraphQL Federation**: Composing GraphQL schemas from multiple services.
- **Backend for Frontend (BFF)**: Aggregation tailored to specific client types.
- **CQRS**: Separating write and read models for optimized aggregation.
- **Materialized Views**: Database-level aggregation for read optimization.
- **Next Lesson**: Strangler Fig Pattern.`,
    estimatedMin: 22,
    difficulty: 'INTERMEDIATE',
    companies: ['Netflix', 'Shopify', 'Facebook', 'Amazon', 'eBay', 'GraphQL'],
    tags: ['api-composition', 'aggregator', 'api-gateway', 'graphql', 'data-federation', 'composition']
  },
  {
    id: 'lesson-06-10',
    slug: 'architecture-patterns-10-strangler-fig-pattern',
    title: 'Strangler Fig Pattern',
    content: `## 1. Quick Summary

The **Strangler Fig pattern** enables incremental migration from a **legacy system** to a **new system** by gradually replacing specific pieces of functionality. Named after the strangler fig tree that grows around a host tree and eventually replaces it, the pattern involves intercepting calls to the legacy system, routing specific features to the new system, and eventually phasing out the old system entirely. This approach minimizes **risk**, enables **continuous delivery** during migration, and allows **rollback** if problems occur. It is the most common pattern for **monolith to microservices** migration.

## 2. Definition

**Strangler Fig** is a migration pattern where:
1. A **routing layer** (reverse proxy, API gateway, load balancer) sits in front of the legacy system.
2. New functionality is built as a separate service alongside the legacy system.
3. The routing layer intercepts requests and selectively routes specific features to the new service.
4. Over time, more features are migrated to new services.
5. Once all features are migrated, the legacy system is decommissioned.
6. The new system has completely replaced the old one, just as a strangler fig replaces its host tree.

## 3. Why It Exists / Problem It Solves

Rewriting a legacy system from scratch is risky:
- **Big Bang rewrite**: Years of development with no value delivered. High risk of failure (Netscape, Friendster).
- **Feature freeze**: Users don't get new features during migration.
- **Business continuity**: Can't just turn off the legacy system.
- **Knowledge loss**: Legacy system contains years of business logic fixes.

The Strangler Fig solves these by:
1. **Incremental delivery**: Each migrated feature can be deployed independently.
2. **Risk reduction**: If a new service has issues, only that feature is affected.
3. **Continuous value**: Users see improvements throughout the migration.
4. **Rollback capability**: Each feature can be reverted to the legacy system.

## 4. When to Use It

| Scenario | Why Strangler Fig |
|----------|-------------------|
| **Monolith to microservices** | Most common — gradually extract services |
| **Legacy system modernization** | Replace outdated tech without full rewrite |
| **Third-party migration** | Switch vendors incrementally |
| **Database migration** | Move from one DB to another without downtime |
| **Cloud migration** | Move applications to cloud service by service |

## 5. When NOT to Use It / Tradeoffs

- **Tightly coupled code**: If features can't be cleanly separated, strangling is difficult.
- **Shared database**: Migrating a shared schema while keeping both systems running is complex.
- **Increased latency**: The routing layer adds a hop. Requests may go through both old and new systems.
- **Operational complexity**: Two (or more) systems running simultaneously. Twice the infrastructure.
- **Data synchronization**: Keeping data in sync between old and new systems during migration.
- **Team coordination**: Both old and new teams must coordinate during the transition.

## 6. How It Works (Deep Mechanics)

**Step 1: Intercept** — Place a reverse proxy (NGINX, HAProxy, AWS ALB) or API gateway in front of the legacy system. Route all requests to the legacy system by default.

**Step 2: Transform** — Identify a specific feature to migrate (e.g., product search). Build a new microservice for this feature. The new service has its own database, API, and deployment.

**Step 3: Route** — Update the router to intercept requests for the selected feature and route them to the new service. Other requests continue to the legacy system.

**Step 4: Test and Validate** — Monitor the new service for errors, performance, and data correctness. Use A/B testing or canary releases.

**Step 5: Expand** — Repeat for the next feature. Each iteration migrates more traffic to new services.

**Step 6: Decommission** — Once all features are migrated, remove the legacy system and the routing layer.

## 7. Architecture Diagram (ASCII)

\`\`\`
Strangler Fig Migration:

  Phase 1: Intercept
  Client -> [Router] -> Legacy System (100%)
  
  Phase 2: First Feature Migrated
  Client -> [Router] --[if /search]----> Search Service (New)
                       --[else]---------> Legacy System (Old)
  
  Phase 3: Multiple Features Migrated
  Client -> [Router] --[if /search]----> Search Service
                       --[if /checkout]-> Checkout Service
                       --[if /orders]---> Order Service
                       --[else]---------> Legacy System
  
  Phase 4: Legacy Decommissioned
  Client -> [Router] ------------------> All New Services
  Legacy System: turned off

  Router logic (pseudo):
  if request.path starts with '/api/search':
    proxy_pass http://search-service
  elif request.path starts with '/api/checkout':
    proxy_pass http://checkout-service
  else:
    proxy_pass http://legacy-system
\`\`\`

## 8. Real-World Flow Example

**E-commerce monolith to microservices**:

Phase 1: Router (NGINX) in front of Ruby on Rails monolith. All traffic goes to monolith.

Phase 2: Migrate Product Search.
- Build Search Service (Go + Elasticsearch).
- Router update: requests to /api/search -> Search Service; everything else -> monolith.
- Search results improve (faster, better relevance). Users are happy.

Phase 3: Migrate Checkout.
- Build Checkout Service (Node.js + PostgreSQL).
- Router update: requests to /api/checkout -> Checkout Service.
- Monolith still handles user auth, order history, inventory.

Phase 4: Migrate Orders and Inventory.
- Build Order Service and Inventory Service.
- Router routes remaining features.

Phase 5: Decommission monolith.
- All features migrated. No traffic to monolith.
- Monolith servers turned off. Team celebrates.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// Router that implements strangler fig routing
interface RouteRule {
  pattern: RegExp;
  target: string;
  enabled: boolean; // Canary/feature flag
}

class StranglerFigRouter {
  private routes: RouteRule[] = [];
  private defaultTarget: string;

  constructor(defaultTarget: string) {
    this.defaultTarget = defaultTarget;
  }

  addRoute(pattern: string, target: string, enabled = true): void {
    this.routes.push({ pattern: new RegExp(pattern), target, enabled });
  }

  enableRoute(pattern: string): void {
    const route = this.routes.find(r => r.pattern.source === new RegExp(pattern).source);
    if (route) route.enabled = true;
  }

  disableRoute(pattern: string): void {
    const route = this.routes.find(r => r.pattern.source === new RegExp(pattern).source);
    if (route) route.enabled = false;
  }

  async routeRequest(request: { path: string; method: string; body?: unknown }): Promise<{ status: number; body: unknown }> {
    // Check strangler fig routes first
    for (const route of this.routes) {
      if (route.enabled && route.pattern.test(request.path)) {
        try {
          return await this.forwardRequest(route.target, request);
        } catch (err) {
          console.error(\`Error routing to \${route.target}: \${err}\`);
          // Fallback to legacy system on failure
          break;
        }
      }
    }

    // Default: route to legacy system
    return this.forwardRequest(this.defaultTarget, request);
  }

  private async forwardRequest(target: string, request: { method: string; path: string; body?: unknown }): Promise<{ status: number; body: unknown }> {
    // In production, make HTTP/fetch call
    console.log(\`Forwarding \${request.method} \${request.path} to \${target}\`);
    return { status: 200, body: { message: \`Handled by \${target}\` } };
  }
}

// Usage
const router = new StranglerFigRouter('http://legacy-system.internal');

// Phase 1: All traffic to legacy
// (no routes registered)

// Phase 2: Migrate search
router.addRoute('^/api/search', 'http://search-service.internal');

// Phase 3: Migrate checkout
router.addRoute('^/api/checkout', 'http://checkout-service.internal');

// Phase 4: Migrate orders
router.addRoute('^/api/orders', 'http://order-service.internal');

// Phase 5: Disable remaining legacy routes
// (eventually all routes migrated, default target no longer needed)
\`\`\`

## 10. Real Company Use Cases

- **Amazon (Strangler Fig)**: Amazon's famous migration from a two-tier monolith (Oracle + C++) to microservices. CEO Bezos mandated API-only communication. Each feature was gradually extracted.
- **Netflix**: Migrated from a monolith datacenter to AWS cloud using strangler fig. Each service was extracted, deployed on AWS, and traffic was gradually shifted.
- **Uber**: The original monolith (Python + Django) was strangled over years into 1,000+ services. Each core domain (trips, payments, drivers) was extracted independently.
- **Shopify**: Uses strangler fig for major backend rewrites. The monolith is being gradually decomposed into modular components with well-defined APIs.
- **Microsoft (Office 365)**: Office 365 was built by strangling from on-premise Exchange, SharePoint, and Lync server products into cloud-native services.

## 11. Common Interview Questions

1. *What is the Strangler Fig pattern and why is it useful?*
2. *How do you handle data synchronization during a strangler fig migration?*
3. *What are the risks of a strangler fig migration?*
4. *How does the routing layer work in a strangler fig pattern?*
5. *What is the difference between strangler fig and big bang rewrite?*
6. *How do you handle shared state between old and new systems?*
7. *When would you NOT use the strangler fig pattern?*
8. *Design a strangler fig migration strategy for a legacy CRM system.*

## 12. Related Topics & Next Steps

- **Strangler Fig vs Tear-and-Replace**: Comparing migration strategies.
- **API Gateway**: Central routing layer for strangulation.
- **Database Migration Patterns**: Parallel run, dual-writes, schema per service.
- **Feature Flags**: Enabling/disabling migrated features during strangulation.
- **Anti-Corruption Layer**: Translating between old and new system models.
- **Next Lesson**: Backend for Frontend (BFF) Pattern.`,
    estimatedMin: 22,
    difficulty: 'INTERMEDIATE',
    companies: ['Amazon', 'Netflix', 'Uber', 'Shopify', 'Microsoft', 'Martin Fowler'],
    tags: ['strangler-fig', 'migration', 'legacy', 'monolith', 'incremental', 'modernization']
  },
  {
    id: 'lesson-06-11',
    slug: 'architecture-patterns-11-backend-for-frontend',
    title: 'Backend for Frontend (BFF) Pattern',
    content: `## 1. Quick Summary

**Backend for Frontend (BFF)** is a pattern where a dedicated backend service is created for each **client type** (web, mobile, desktop, IoT). Each BFF is tailored to the specific needs of its client — optimizing **data shapes**, **user experience**, and **interaction patterns**. Instead of having a single API that tries to serve all clients (and pleases none), BFFs provide client-specific APIs that aggregate, transform, and deliver exactly what each client needs. The BFF pattern was popularized by **Sam Newman** and **Phil Calado** (SoundCloud) and is widely adopted in **microservice architectures** with diverse client types.

## 2. Definition

**BFF (Backend for Frontend)** is a pattern where:
- Each client type has its own dedicated backend service.
- The BFF is developed and maintained by the **same team** that builds the client (frontend team owns the backend).
- The BFF adapts the generic **domain APIs** to the specific **UI requirements** of the client.
- The BFF handles client-specific concerns: session management, authentication, data aggregation, payload transformation.

**Compared to API Gateway**: An API gateway is a shared component for all clients. BFFs are per-client. Many architectures use both: API Gateway -> BFFs -> Domain Services.

## 3. Why It Exists / Problem It Solves

A generic API that serves all clients has problems:
1. **Over-fetching**: Mobile client gets desktop-size payloads with unused data.
2. **Under-fetching**: Web client needs to make 5 calls to get enough data for a page.
3. **Different interaction patterns**: Mobile is chat-based (graphical); web is mouse/keyboard; IoT is sensor-driven. One API can't optimize for all.
4. **Different optimization priorities**: Mobile needs small payloads and battery efficiency; web needs rich data and fast rendering.
5. **Different release cycles**: Mobile app stores have review times; web can deploy instantly. A shared API couples these release cycles.
6. **Team coupling**: Frontend and backend teams have conflicting priorities.

BFF solves by giving each client its own backend, owned by the frontend team. The BFF can be optimized without affecting other clients.

## 4. When to Use It

| Scenario | Why BFF |
|----------|---------|
| **Multiple client types** | Web + iOS + Android + IoT |
| **Different UX requirements** | Each client needs different data shapes |
| **Frontend team ownership** | Frontend team controls its backend |
| **Mobile optimization** | Reduce payload size, minimize API calls |
| **Rapid client evolution** | Fast iterations without breaking other clients |

## 5. When NOT to Use It / Tradeoffs

- **Single client type**: BFF adds unnecessary complexity. One API is sufficient.
- **Small team**: Maintaining multiple BFFs is expensive. Share one API gateway.
- **Simple CRUD apps**: The overhead of building and deploying a separate BFF per client isn't justified.
- **Duplicate logic**: Each BFF may duplicate common functionality (auth, logging, rate limiting).
- **Service proliferation**: Each new client type adds a new BFF. Manage with templates.

## 6. How It Works (Deep Mechanics)

**Typical Architecture**:
1. **Domain Services**: Core business logic (Order Service, Customer Service, Product Service).
2. **BFF Layer**: One service per client type. BFF aggregates domain data for client needs.
3. **API Gateway** (optional): Single entry point, routes to appropriate BFF based on client type (header, subdomain, path).
4. **Client**: Makes requests to its BFF, which returns optimized responses.

**BFF Responsibilities**:
- Aggregate data from multiple domain services.
- Transform data shapes to match UI requirements.
- Handle client-specific session/state management.
- Manage authentication tokens for the client type.
- Implement client-specific caching strategies.
- Handle client-specific error formats.

## 7. Architecture Diagram (ASCII)

\`\`\`
Without BFF:
  +------+     +------+     +------+     +------+
  | Web  |     | iOS  |     |Android|    | IoT  |
  +------+     +------+     +------+     +------+
       |           |            |            |
       +-----------+-----+------+------------+
                          |
                   +------+-------+
                   |  Shared API  |
                   |  (All-in-one)|
                   +------+-------+
                          |
               +----------+----------+
               |                     |
          +---------+          +---------+
          | Order   |          | Customer|
          | Service |          | Service |
          +---------+          +---------+

With BFF:
  +------+     +------+     +------+     +------+
  | Web  |     | iOS  |     |Android|    | IoT  |
  +------+     +------+     +------+     +------+
       |           |            |            |
  +----+--+  +----+--+  +----+--+  +----+--+
  |Web BFF|  |iOS BFF|  |Android|  |IoT BFF|
  |       |  |       |  |BFF    |  |       |
  +----+--+  +----+--+  +----+--+  +----+--+
       |           |            |            |
       +-----------+-----+------+------------+
                          |
                   +------+-------+
                   | Domain       |
                   | Services     |
                   +------+-------+
\`\`\`

## 8. Real-World Flow Example

**E-commerce with BFFs**:

**Mobile BFF** (for iOS/Android):
- GET /v1/checkout returns: order summary (total, items), payment options, delivery ETA.
- Payload size: 2KB (optimized for mobile bandwidth).
- Includes client-specific notifications (push token management).
- Strips promotional content (mobile screens are small).

**Web BFF** (for browser):
- GET /v1/checkout returns: same data PLUS product recommendations, upsells, cross-sells.
- Payload size: 10KB (desktop has more bandwidth).
- Includes SEO metadata, Open Graph tags.
- Includes promotional banners and related products.

**IoT BFF** (for smart display):
- GET /v1/checkout returns: minimal data — order status, delivery window, total.
- Payload size: 500 bytes (constrained device).
- No images, no recommendations.
- Includes voice assistant integration points.

Each BFF is built by the team that owns the client. The mobile team can change its BFF without waiting for the web team.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// Domain Services (shared)
interface OrderService {
  getOrder(orderId: string): Promise<{ id: string; items: Array<{ productId: string; quantity: number; price: number }>; total: number; status: string }>;
  createOrder(customerId: string, items: Array<{ productId: string; quantity: number }>): Promise<string>;
}

interface ProductService {
  getProducts(productIds: string[]): Promise<Array<{ id: string; name: string; imageUrl: string; price: number; description: string }>>;
}

// Mobile BFF — optimized for small payloads
class MobileBFF {
  constructor(
    private orders: OrderService,
    private products: ProductService
  ) {}

  async getCheckoutSummary(orderId: string): Promise<{
    total: number;
    itemCount: number;
    status: string;
    items: Array<{ name: string; quantity: number; price: number }>;
  }> {
    const order = await this.orders.getOrder(orderId);
    const productIds = order.items.map(i => i.productId);
    const productMap = new Map(
      (await this.products.getProducts(productIds)).map(p => [p.id, p])
    );

    return {
      total: order.total,
      itemCount: order.items.length,
      status: order.status,
      items: order.items.map(item => ({
        name: productMap.get(item.productId)?.name ?? 'Unknown',
        quantity: item.quantity,
        price: item.price
      }))
    };
  }
}

// Web BFF — optimized for rich desktop experience
class WebBFF {
  constructor(
    private orders: OrderService,
    private products: ProductService
  ) {}

  async getCheckoutPage(orderId: string): Promise<{
    order: { total: number; items: Array<{ name: string; imageUrl: string; quantity: number; price: number; description: string }> };
    recommendations: Array<{ id: string; name: string; price: number; imageUrl: string }>;
    seo: { title: string; description: string };
  }> {
    const order = await this.orders.getOrder(orderId);
    const productIds = order.items.map(i => i.productId);
    const products = await this.products.getProducts(productIds);

    return {
      order: {
        total: order.total,
        items: order.items.map((item, idx) => ({
          ...item,
          name: products[idx].name,
          imageUrl: products[idx].imageUrl,
          description: products[idx].description
        }))
      },
      recommendations: [], // Cross-sell logic
      seo: { title: 'Checkout - MyStore', description: 'Complete your purchase' }
    };
  }
}

// Router that directs to the right BFF
class BFFRouter {
  private bffs: Map<string, any> = new Map();

  register(clientType: string, bff: any): void {
    this.bffs.set(clientType, bff);
  }

  async handle(clientType: string, path: string, params: any): Promise<any> {
    const bff = this.bffs.get(clientType);
    if (!bff) throw new Error(\`No BFF for client type: \${clientType}\`);

    // Route to appropriate BFF method based on path
    if (path === '/checkout') return bff.getCheckoutSummary(params.orderId);
    throw new Error('Unknown path');
  }
}
\`\`\`

## 10. Real Company Use Cases

- **SoundCloud (BFF Originators)**: Phil Calado and Sam Newman created the BFF pattern at SoundCloud. Mobile app had different needs than web. SoundCloud's mobile BFF reduced payload size by 80% and improved mobile app performance.
- **Netflix**: Each client platform (TV, mobile, web, tablet) has its own BFF. The TV BFF returns data optimized for 10-foot UI. The mobile BFF optimizes for touch and limited bandwidth.
- **Shopify**: The checkout experience has different BFFs for web checkout, mobile SDK checkout, and POS (point of sale) terminal.
- **Spotify**: Each client (desktop, mobile web, Android, iOS, Car Mode) has a dedicated BFF that optimizes audio streaming, playlist management, and social features for the specific platform.
- **BBC**: The BBC iPlayer uses BFFs for web, mobile, and smart TV clients. Each BFF optimizes video streaming and content discovery for the device capabilities.

## 11. Common Interview Questions

1. *What is the Backend for Frontend (BFF) pattern? Why was it created?*
2. *How does BFF differ from API Gateway? Can they be used together?*
3. *What problems does BFF solve for mobile clients?*
4. *Who should own the BFF — frontend or backend team?*
5. *How do you handle common logic across multiple BFFs (auth, logging)?*
6. *What is the downside of having too many BFFs?*
7. *How does BFF relate to GraphQL and federation?*
8. *Design a BFF architecture for a multi-platform retail application.*

## 12. Related Topics & Next Steps

- **API Gateway**: Central routing vs per-client BFF.
- **GraphQL Federation**: Alternative approach where each service owns its graph, and the gateway composes them.
- **BFF vs Aggregator Pattern**: BFF is client-specific; aggregator is domain-specific.
- **Micro Frontends**: Frontend decomposition pattern that pairs with BFF.
- **Platform-specific Optimization**: Mobile vs web vs desktop differences.
- **Next Module**: Module 7 — Advanced Distributed Systems.`,
    estimatedMin: 22,
    difficulty: 'INTERMEDIATE',
    companies: ['SoundCloud', 'Netflix', 'Shopify', 'Spotify', 'BBC', 'Sam Newman'],
    tags: ['bff', 'backend-for-frontend', 'client-specific', 'mobile', 'optimization', 'api-design']
  },
];