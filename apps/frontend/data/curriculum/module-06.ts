export const module06Lessons = [
    {
    id: "lesson-06-01",
    slug: "architecture-patterns-01-monolithic-vs-microservices",
    title: "Monolithic vs Microservices Architecture",
    content: `## 0. Mental Model

> Imagine you own a small restaurant that handles everything — cooking, serving, cashier, inventory — in a single kitchen. That's a **monolith**. As customers multiply, one kitchen becomes chaotic: cooks bump into each other, the cashier takes orders while flipping burgers, and a single broken stove shuts down the entire restaurant. Now imagine separate food trucks for pizza, sushi, and desserts — each with its own chef, menu, and stove. That's **microservices**. Each truck operates independently, scales to its own demand, and failures don't cross-contaminate. The hard part? Coordinating the menu so customers get a complete meal across multiple trucks.

## 1. Quick Summary

- **Monolith**: Single deployable unit containing all functionality. Simple at small scale, hard at large scale.
- **Microservices**: Loosely coupled, independently deployable services organized around business capabilities.
- **Modular Monolith**: Single deployment with well-defined module boundaries — a pragmatic middle ground.
- **Key tradeoff**: Microservices buy you independent deployability, team autonomy, and tech diversity at the cost of distributed systems complexity (network, consistency, operations).
- **Decomposition strategy**: Strangler Fig pattern — incrementally extract services from the monolith.
- **Organizational alignment**: Conway's Law dictates services mirror team structures. Inverse Conway Maneuver: restructure teams to drive desired architecture.
- **No free lunch**: Netflix, Amazon, and Uber all started as monoliths and migrated when the pain exceeded the complexity budget.
- **Decision rule**: Start monolith, modularize well, extract services only when a clear bounded context justifies the overhead.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Monolithic Architecture** | Single codebase, single process, shared database for all features |
| **Microservices Architecture** | Multiple independent services, each with its own process, database, and deployment pipeline |
| **Modular Monolith** | Single deployable unit with strict module boundaries and well-defined interfaces between modules |
| **Bounded Context** | DDD concept — explicit boundary within which a domain model applies; maps naturally to a microservice |
| **Strangler Fig Pattern** | Incrementally replace monolith functionality with microservices by intercepting calls and routing to new services |
| **API Gateway** | Single entry point that routes requests to appropriate microservices, handles auth, rate limiting, aggregation |
| **Service Mesh** | Infrastructure layer for service-to-service communication (discovery, mTLS, observability) added via sidecar proxies |
| **Conway's Law** | Organizations design systems that mirror their communication structure |
| **Saga Pattern** | Distributed transaction pattern using local transactions + compensating events for rollback |
| **Database per Service** | Each microservice owns its data — no shared databases across services |

## 3. The Problem Without It

- **Coupling at scale**: A change to one feature requires rebuilding and redeploying the entire application. A team of 20+ developers in a monolith creates merge conflicts and coordination overhead daily.
- **Uniform scaling**: The monolith forces you to scale everything together. An order-processing hot path and a rarely-used reporting feature share the same compute resources — you pay to scale the entire app when only one part needs it.
- **Technology lock-in**: A monolith fixes your technology stack for its entire lifetime. Want to use Go for high-throughput streaming alongside your Node.js monolith? You can't — everything must be the same language, framework, and runtime.
- **Reliability cascade**: A memory leak in a logging module crashes the entire monolith (all users, all features). In a microservice architecture, failure is contained to one service — users lose only that feature.
- **Deployment bottleneck**: As codebase grows, CI/CD pipelines slow down. A 30-minute build + 15-minute test suite means deploys take 45+ minutes. Microservices each have fast, independent pipelines.

## 4. How It Works — Core Mechanics

### Modular Monolith — The First Step

Before jumping to microservices, a modular monolith enforces boundaries inside a single process:

\`\`\`
┌──────────────────────────────────────────────┐
│              Modular Monolith                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
│  │  Order    │  │ Inventory │  │  Payment  │ │
│  │  Module   │──│  Module   │──│  Module   │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘ │
│        │              │              │        │
│  ┌─────┴───────────────────────────┐ │        │
│  │   Shared Kernel (Common Types)  │ │        │
│  └─────────────────────────────────┘ │        │
│  ┌────────────────────────────────────────┐   │
│  │         Shared Database                │   │
│  └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
\`\`\`

Modules communicate through interfaces (ports). No module directly references another module's internal classes. This is achieved via:
- **Dependency injection**: Modules depend on abstractions, not concretions.
- **Module-level entry points**: Each module exposes a facade (e.g., \`OrderService\`) that other modules consume.
- **Separate schema migrations per module**: Even within the same database, each module owns its tables.

### Microservices — Fully Distributed

\`\`\`
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Order        │  │ Inventory   │  │ Payment     │
│ Service      │  │ Service     │  │ Service     │
│ (Node.js)    │  │ (Go)        │  │ (Java)      │
├─────────────┤  ├─────────────┤  ├─────────────┤
│ Order DB    │  │ Inventory   │  │ Payment DB  │
│ (Postgres)  │  │ DB (Mongo)  │  │ (Postgres)  │
└─────────────┘  └─────────────┘  └─────────────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
              ┌─────────┴─────────┐
              │   Message Queue   │
              │   (Kafka / SQS)   │
              └───────────────────┘
\`\`\`

**Communication patterns**:
- **Synchronous (HTTP/gRPC)**: Simple request-response. Used for queries and commands where immediate feedback is needed. Creates temporal coupling — if the called service is down, the caller fails.
- **Asynchronous (Events/Queues)**: Services publish events. Other services consume them asynchronously. Enables loose coupling. Used for workflows where the caller doesn't need an immediate response.

### The Migration Path (Strangler Fig)

\`\`\`
v1: Monolith (all features, single deployable)
v2: Monolith + new Payment Service (routes /api/payments to new service)
v3: Extract Order Service (route /api/orders, leave rest in monolith)
v4: Extract Inventory Service
v5: Monolith only handles auth + UI — eventually replaced entirely
\`\`\`

### Code Example — Decomposing the Monolith

\`\`\`typescript
// === Monolithic ===
class MonolithOrderService {
  async placeOrder(cmd: PlaceOrderCommand): Promise<Order> {
    const user = await db.users.findById(cmd.userId);
    for (const item of cmd.items) {
      const product = await db.products.findById(item.productId);
      if (!product || product.stock < item.quantity) throw new Error('Out of stock');
    }
    const total = this.calculateTotal(cmd.items);
    const payment = await paymentGateway.charge(user.paymentToken, total);
    const order = await db.orders.create({ ...cmd, total, status: 'confirmed' });
    await email.sendConfirmation(user.email, order.id);
    return order;
  }
}

// === Microservice ===
interface OrderRepository { save(order: Order): Promise<void>; }
interface PaymentService { charge(amount: number): Promise<PaymentResult>; }
interface InventoryService { reserve(items: LineItem[]): Promise<void>; }
interface EventBus { publish(event: DomainEvent): Promise<void>; }

class OrderService {
  constructor(
    private repo: OrderRepository,
    private payment: PaymentService,
    private inventory: InventoryService,
    private bus: EventBus
  ) {}

  async placeOrder(cmd: PlaceOrderCommand): Promise<Order> {
    const order = Order.create(cmd.userId, cmd.items);
    await this.inventory.reserve(cmd.items);
    const payment = await this.payment.charge(order.total);
    if (!payment.success) {
      await this.inventory.release(cmd.items);
      throw new Error('Payment failed');
    }
    order.confirm();
    await this.repo.save(order);
    await this.bus.publish(new OrderPlacedEvent(order.id, cmd.userId, cmd.items));
    return order;
  }
}
\`\`\`

## 5. Variants & Flavors

| Approach | Deployment | Scalability | Team Size | DB Pattern | Complexity |
|----------|-----------|-------------|-----------|------------|------------|
| **Monolith** | Single unit | Vertical (scale up) | 1-10 | Shared DB | Low (start) |
| **Modular Monolith** | Single unit | Vertical + read replicas | 3-15 | Shared DB w/ schema per module | Medium |
| **Microservices** | N units | Horizontal per service | 5-20 per service | DB per service | High |
| **Serverless Functions** | Per-function | Auto-scale | 2-8 per function | Managed DB | Medium-High |
| **Service-Based** (SOA) | Few large services | Horizontal per service | 10-30 per service | DB per service | Medium |

## 6. Performance Characteristics

| Metric | Monolith | Modular Monolith | Microservices |
|--------|----------|-----------------|---------------|
| Request latency (p50) | 2-10ms (in-process) | 5-15ms (in-process) | 20-100ms+ (network) |
| Request latency (p99) | 20-50ms | 30-80ms | 100-500ms+ |
| Startup time | 30-120s | 30-120s | 5-30s per service |
| Memory per instance | 512MB-4GB | 512MB-4GB | 128MB-1GB per service |
| Max throughput (single instance) | Higher (no network overhead) | Higher | Lower per instance (serialization + network) |
| Throughput (scaled) | Linear (scale up) | Near-linear | Super-linear (independent scaling) |
| Resource efficiency | High (no duplication) | High | Lower (duplication per service) |

## 7. Failure Modes

- **Distributed monolith**: Services are tightly coupled (many synchronous calls between them) but deployed independently → worst of both worlds. *Mitigation*: Identify chatty service pairs and merge them into a single service or use asynchronous communication.
- **Database shared across services**: Team A changes schema → breaks Team B's queries. *Mitigation*: Enforce database-per-service. Each service only accesses its own database. Use APIs/events for cross-service data access.
- **Network cascade**: Service A calls B → B calls C → C call D. If D slows down, A's threads block → queue grows → A becomes unresponsive → everything cascades. *Mitigation*: Circuit breakers, timeouts, bulkheads, and async communication between critical paths.
- **Orphaned services**: A team extracts a microservice then moves to another project → the service runs unmaintained → security vulnerabilities accumulate → it becomes a black box nobody understands. *Mitigation*: Service ownership must be assigned to a team. If a service has no owner, it should be decommissioned or folded back into its consumer.
- **Data consistency drift**: Service A updates its DB and publishes an event. Service B crashes before processing the event → data is inconsistent. *Mitigation*: Outbox pattern (write event to DB in same transaction as the data change, then a relay publishes it) + saga pattern with compensating transactions.

## 8. Decision Framework

\`\`\`
├─ Team size?
│   ├─ < 8 developers → Monolith (or modular monolith)
│   └─ >= 8 developers → Evaluate bounded contexts
├─ Codebase age and size?
│   ├─ Greenfield < 50K LOC → Start with modular monolith
│   ├─ Existing > 500K LOC → Modular monolith first, then extract
│   └─ Existing > 2M LOC → Strangler Fig extraction plan
├─ Scalability requirements?
│   ├─ Uniform (all features need same scaling) → Monolith (scale up)
│   └─ Differential (some features scale 10x others) → Microservices
├─ Team structure aligned with Conway's Law?
│   ├─ Teams aligned to business capabilities → Microservices
│   └─ Teams organized by technical layers (frontend/backend/DB) → Monolith
└─ Organizational maturity?
    ├─ DevOps/SRE team + CI/CD + monitoring in place → Microservices possible
    └─ No dedicated ops → Monolith or modular monolith
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client Apps\n(Web / Mobile)', type: 'client', x: 300, y: 20 },
    { id: 'gw', label: 'API Gateway\n(Route / Auth / Rate Limit)', type: 'gateway', x: 300, y: 120 },
    { id: 'orders', label: 'Order Service', type: 'app', x: 80, y: 240 },
    { id: 'inventory', label: 'Inventory Service', type: 'app', x: 300, y: 240 },
    { id: 'payment', label: 'Payment Service', type: 'app', x: 520, y: 240 },
    { id: 'notif', label: 'Notification Service', type: 'app', x: 520, y: 380 },
    { id: 'odb', label: 'Order DB\n(Postgres)', type: 'storage', x: 80, y: 380 },
    { id: 'idb', label: 'Inventory DB\n(MongoDB)', type: 'storage', x: 300, y: 380 },
    { id: 'pdb', label: 'Payment DB\n(Postgres)', type: 'storage', x: 520, y: 480 },
    { id: 'bus', label: 'Event Bus\n(Kafka)', type: 'gateway', x: 300, y: 480 },
    { id: 'reg', label: 'Service Registry\n(Consul)', type: 'gateway', x: 80, y: 480 },
  ]}
  edges={[
    { from: 'client', to: 'gw', label: 'HTTP requests' },
    { from: 'gw', to: 'orders', label: '/api/orders' },
    { from: 'gw', to: 'inventory', label: '/api/inventory' },
    { from: 'gw', to: 'payment', label: '/api/payments' },
    { from: 'orders', to: 'odb', label: 'reads/writes orders' },
    { from: 'inventory', to: 'idb', label: 'reads/writes stock' },
    { from: 'payment', to: 'pdb', label: 'reads/writes payments' },
    { from: 'orders', to: 'bus', label: 'publishes: OrderPlaced' },
    { from: 'inventory', to: 'bus', label: 'subscribes: OrderPlaced' },
    { from: 'payment', to: 'bus', label: 'subscribes: InventoryReserved' },
    { from: 'notif', to: 'bus', label: 'subscribes: OrderPlaced, PaymentSucceeded' },
    { from: 'gw', to: 'reg', label: 'discovers services' },
    { from: 'orders', to: 'reg', label: 'register + health' },
    { from: 'inventory', to: 'reg', label: 'register + health' },
    { from: 'payment', to: 'reg', label: 'register + health' },
  ]}
  height={580}
/>

## 10. Real Production Incident

<Callout type="incident">
**Uber — Monolith Scalability Crisis, 2014**

Uber's original monolith (Python + Django, PostgreSQL) handled millions of rides — until it couldn't. By 2014, the single codebase had contributions from 100+ engineers across 10+ cities. Every deploy was a high-risk event involving 30+ minutes of downtime. The database (200+ tables, single PostgreSQL instance) hit connection limits during peak hours.

**Impact**: During New Year's Eve 2014, the monolith hit 100% CPU at 11:45 PM. API latency spiked from 100ms to 8 seconds. Some users saw "No cars available" errors for 20+ minutes. Revenue loss estimated at $500K+ for that night.

**Root cause**: The monolith's database queries were not optimized for city-specific data partitioning. A single slow query for NYC surge pricing blocked all other requests. The shared database connection pool was exhausted by long-running analytics queries competing with real-time ride matching.

**Fix**: Uber started the "Legacy to Microservices" migration in 2015:
1. Extracted the Dispatch Service (ride matching) — first microservice.
2. Extracted Payment Service — PCI compliance scope reduced.
3. Migrated from PostgreSQL to Schemaless (Uber's custom DB) + Cassandra for trip data.
4. Implemented the API Gateway (called "Gateway Service") for routing.
5. Each city's data was sharded across separate service instances.
6. By 2017, Uber had 2,200+ microservices.

**Lesson**: Monoliths work until they don't. The inflection point is when the codebase size and team count cross a threshold where development velocity drops below acceptable levels. Uber's lesson: extract services incrementally, start with the highest-churn, highest-scale business capability (dispatch).
</Callout>

## 11. Production Implementation

### Terraform — ECS Service with Service Discovery

\`\`\`hcl
resource "aws_ecs_service" "order_service" {
  name            = "order-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.order.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.service.id]
  }

  service_registries {
    registry_arn = aws_service_discovery_service.order.arn
  }
}

resource "aws_service_discovery_service" "order" {
  name = "order-service"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}
\`\`\`

### TypeScript — Service with Circuit Breaker and Discovery

\`\`\`typescript
interface ServiceConfig {
  serviceName: string;
  registryHost: string;
  timeout: number;
  maxRetries: number;
  circuitBreakerThreshold: number;
}

class ServiceClient {
  private healthyInstances: string[] = [];
  private failureCount = 0;
  private circuitOpen = false;
  private circuitTimer: NodeJS.Timeout | null = null;

  constructor(private config: ServiceConfig) {}

  async discover(): Promise<void> {
    const resp = await fetch(\`\${this.config.registryHost}/v1/health/service/\${this.config.serviceName}\`);
    const data = await resp.json();
    this.healthyInstances = data.filter((s: any) => s.Checks?.every((c: any) => c.Status === 'passing'))
      .map((s: any) => \`\${s.Address}:\${s.Port}\`);
  }

  async call<T>(path: string, body: unknown): Promise<T> {
    if (this.circuitOpen) throw new Error('Circuit breaker open');

    const instance = this.healthyInstances[Math.floor(Math.random() * this.healthyInstances.length)];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(\`http://\${instance}\${path}\`, {
        method: 'POST',
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      this.failureCount = 0;
      return response.json();
    } catch (err) {
      this.failureCount++;
      if (this.failureCount >= this.config.circuitBreakerThreshold) {
        this.circuitOpen = true;
        setTimeout(() => {
          this.circuitOpen = false;
          this.failureCount = 0;
          this.discover();
        }, 30_000);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **Amazon**: In 2002, Jeff Bezos mandated all teams must communicate via APIs (no direct DB access). This forced service boundaries. The "two-pizza team" rule (6-10 people) emerged from Amazon's experience — small teams that own specific microservices. This API-first mandate eventually produced AWS.
- **Netflix**: Migrated from Java monolith to 700+ microservices (2011-2016). Open-sourced Eureka (discovery), Hystrix (circuit breaker), Zuul (gateway) — these became the de facto patterns for microservices resilience. Netflix's "chaos engineering" (Chaos Monkey) emerged from testing distributed system resilience.
- **Uber**: As detailed in the incident above. Key insight: Uber extracted the highest-impact service (Dispatch) first, then incrementally extracted others. Each extraction aligned with a bounded context (DDD influence).
- **Spotify**: Organized around squads (~8 people) that each own a service or set of services aligned to a user-facing feature. The "Squad Health Check" model emerged from this architecture — teams self-assess their ability to deliver value.
- **Etsy**: A counter-example — runs a PHP monolith serving 50M+ monthly visitors. Etsy proves monoliths can scale if you invest in sharding, caching, and elegant modularity within the monolith. Their continuous deployment pipeline deploys 50+ times per day to the same monolith.

## 13. Interview Playbook

**Q: "Should we start with a monolith or microservices for a new product?"**
→ Open with: Start with a modular monolith. Extract services only when there's a clear performance, team, or reliability reason.
→ Cover: A monolith gives you fast iteration speed, simple testing, atomic deploys, and no network overhead. Microservices add complexity that slows you down when the product is still finding product-market fit. Extract when: the codebase exceeds 200K LOC, teams exceed 10 people, or a specific feature requires independent scaling.
→ Depth signal: The "Extract Service Decision" should be data-driven: measure deployment frequency, merge conflict rate, and feature cycle time. When these degrade beyond acceptable thresholds, that's the signal to extract the most painful bounded context.

**Q: "How do you handle transactions across multiple microservices?"**
→ Open with: Use the Saga pattern — a sequence of local transactions with compensating events for rollback.
→ Cover: There are two saga implementations. Choreography: each service publishes events that trigger the next step. Orchestration: a coordinator (OrderSagaManager) tells each service what to do. Choreography is simpler but harder to track; orchestration gives better visibility but adds a coordinator service.
→ Depth signal: Use the Outbox pattern to ensure reliable event publishing. When the saga writes to its DB and publishes an event, do it in a single DB transaction (write event to an outbox table). A separate relay process reads the outbox and publishes to the message broker. This guarantees at-least-once delivery without distributed transactions.

## 14. Concept Check Quiz

**Q1:** What is the Strangler Fig pattern?**Answer:** Incrementally replacing monolith functionality with microservices by intercepting calls and routing them to new services until the monolith is fully replaced.

**Q2:** What is a distributed monolith?**Answer:** Services that are independently deployed but tightly coupled through synchronous calls and shared databases — combining the complexity of microservices with none of the benefits.

**Q3:** What is Conway's Law and how does it relate to microservice boundaries?**Answer:** Organizations design systems that mirror their communication structure. Service boundaries should align with team boundaries. If two services must be deployed together, the teams that own them should communicate frequently.

**Q4:** How does a modular monolith differ from a traditional monolith?**Answer:** Modular monolith has strict module boundaries with interfaces and dependency injection between modules — single deployable, but modules COULD be extracted into services later without rewriting.

**Q5:** What are the three main communication patterns in microservices?**Answer:** Synchronous (HTTP/gRPC), Asynchronous (message queues/events), and Streaming (Kafka/Kinesis for real-time data pipelines).

## 15. Next Steps

- **Domain-Driven Design** — Finding the right service boundaries using bounded contexts and ubiquitous language.
- **API Gateway & Service Mesh** — Managing cross-cutting concerns like auth, rate limiting, and inter-service communication.
- **Observability** — Distributed tracing, metrics, and logging for microservices (OpenTelemetry, Jaeger).
- **Container Orchestration** — Running microservices at scale with Kubernetes.`,
    estimatedMin: 18,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Amazon", "Netflix", "Uber", "Spotify", "Etsy", "Martin Fowler"],
    tags: ["monolithic", "microservices", "architecture", "migration", "decomposition"],
  },

  {
    id: "lesson-06-02",
    slug: "architecture-patterns-02-domain-driven-design",
    title: "Domain-Driven Design (DDD)",
    content: `## 0. Mental Model

> Domain-Driven Design is like creating a **shared blueprint** of a city that architects, construction workers, utility engineers, and city planners all use. Each group has different terminology for the same things — planners say "parcel," architects say "lot," workers say "plot." DDD forces everyone to agree on one term ("building site") and defines clear boundaries between neighborhoods (bounded contexts). The blueprint is so precise that a general contractor (developer) and the mayor (domain expert) can point to the same drawing and nod in agreement — no translation layer needed.

## 1. Quick Summary

- **DDD** is an approach to software design that puts the **domain model** (business logic) at the center, using a **ubiquitous language** shared by developers and domain experts.
- **Strategic DDD** focuses on bounded contexts and context maps — deciding where service boundaries fall and how they relate.
- **Tactical DDD** provides building blocks: Entity, Value Object, Aggregate, Domain Event, Repository, Domain Service, Factory.
- **Event Storming** (Alberto Brandolini) is the primary workshop technique for discovering bounded contexts via sticky notes on a wall.
- **Bounded Context** = the boundary within which a particular domain model applies. Maps cleanly to a microservice.
- **Core Domain** = what gives competitive advantage — invest heaviest here. **Supporting/Generic** = buy or build simply.
- **Ubiquitous Language** prevents translation errors — the same terms appear in conversations, code, database schemas, and tests.
- **Aggregate Consistency**: Each aggregate enforces invariants and publishes domain events for side effects. Never reference another aggregate directly by object reference — use IDs.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Domain** | The business area the software addresses (e.g., shipping, insurance, airline revenue management) |
| **Ubiquitous Language** | Shared, rigorous language used by developers and domain experts in all communication and code |
| **Bounded Context** | A semantic boundary within which a particular domain model is consistent and valid |
| **Context Map** | Strategic diagram showing relationships between bounded contexts (partnership, shared kernel, anti-corruption layer, etc.) |
| **Core Domain** | The part of the domain that provides competitive advantage — build in-house, invest heavily |
| **Supporting Subdomain** | Important but not differentiating (e.g., billing in a recommendation engine) — can buy or outsource |
| **Generic Subdomain** | Commodity (auth, logging, notifications) — use off-the-shelf or open source |
| **Entity** | Object with a distinct identity that persists over time (e.g., Order with orderId) |
| **Value Object** | Object defined entirely by its attributes, immutable (e.g., Money(amount, currency)) |
| **Aggregate** | Cluster of entities and value objects treated as a single unit with a root entity enforcing invariants |
| **Domain Event** | Something that happened in the domain that domain experts care about (OrderShipped, PaymentReceived) |
| **Repository** | Collection-like interface for retrieving and persisting aggregates |
| **Domain Service** | Stateless service that performs business logic that doesn't naturally fit in an entity or value object |
| **Anti-Corruption Layer** | Translation layer between two bounded contexts to prevent one context's model from leaking into another |

## 3. The Problem Without It

- **Translation loss**: Business stakeholders describe requirements in business terms. Analysts translate to functional specs. Developers translate to code. Each translation loses meaning. The result: software that technically works but doesn't actually serve the business need.
- **Anemic domain model**: Objects are just data holders (getters/setters) with zero business logic. All logic leaks into "service" classes that become procedural scripts. The domain model says nothing about how the business works.
- **No clear boundaries**: Everything is interconnected. Changing the "Customer" concept for billing accidentally breaks the "Customer" concept for marketing. One team's schema change cascades to all other teams.
- **CRUD thinking**: Developers model the database schema first, then build the UI around it. The software becomes a thin wrapper around tables — no business rules, no invariants, no domain logic.
- **Hard to change**: Business rules are scattered across services, controllers, and SQL queries. A regulatory change (e.g., "order cancellation window is now 24 hours instead of 48") requires changes in 10+ files across 3 services.

## 4. How It Works — Core Mechanics

### Strategic DDD — The Big Picture

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                  Context Map (E-commerce)                     │
│                                                               │
│  ┌──────────────────────┐   Partnership    ┌──────────────┐  │
│  │  Sales Context        │◄──────────────►│  Support      │  │
│  │  (Customer, Order)    │                 │  Context      │  │
│  └───────┬──────────────┘                 │  (Ticket)     │  │
│          │                                 └──────────────┘  │
│          │ Customer/Supplier                                   │
│          ▼                                                      │
│  ┌──────────────────────┐                 ┌──────────────┐  │
│  │  Fulfillment Context │  ACL            │  Inventory   │  │
│  │  (Shipment, Picking) │──────────────►  │  Context     │  │
│  └──────────────────────┘                 │  (Stock, SKU)│  │
│                                            └──────────────┘  │
│                                                               │
│  U = upstream, D = downstream                                  │
│  Customer/Supplier: U provides data that D consumes            │
│  Partnership: both teams coordinate changes                    │
│  ACL: D translates U's model to its own                        │
└───────────────────────────────────────────────────────────────┘
\`\`\`

**Context Map Relationship Types**:
- **Partnership**: Two contexts coordinate to deliver features together.
- **Shared Kernel**: A small subset of the domain model is shared (careful — coupling risk).
- **Customer/Supplier**: Upstream (U) provides data; downstream (D) consumes it. U may be constrained by D's needs.
- **Conformist**: D blindly adopts U's model (simpler but loses context-specific modeling).
- **Anti-Corruption Layer**: D translates U's model into its own model (more work but cleaner boundaries).
- **Separate Ways**: No integration — contexts are completely independent.

### Tactical DDD — Building Blocks in TypeScript

\`\`\`typescript
// === Value Object ===
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

// === Entity ===
class OrderId {
  constructor(public readonly value: string) {}
  equals(other: OrderId): boolean { return this.value === other.value; }
}

class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly unitPrice: Money
  ) {}
}

// === Aggregate Root ===
class Order {
  private items: OrderItem[] = [];
  private status: 'pending' | 'submitted' | 'confirmed' | 'cancelled' = 'pending';

  constructor(
    public readonly id: OrderId,
    public readonly customerId: string,
    private readonly pricingService: PricingService // domain service injected
  ) {}

  addItem(productId: string, quantity: number, unitPrice: Money): void {
    if (this.status !== 'pending') throw new Error('Cannot modify submitted order');
    this.items.push(new OrderItem(productId, quantity, unitPrice));
  }

  submit(): OrderSubmitted {
    if (this.items.length === 0) throw new Error('Cannot submit empty order');
    if (this.status !== 'pending') throw new Error('Order already submitted');
    this.status = 'submitted';
    const total = this.calculateTotal();
    return new OrderSubmitted(this.id.value, this.customerId, this.items, total);
  }

  confirm(): void {
    if (this.status !== 'submitted') throw new Error('Can only confirm submitted orders');
    this.status = 'confirmed';
  }

  cancel(): OrderCancelled {
    if (this.status === 'confirmed') throw new Error('Confirmed orders require cancellation request');
    this.status = 'cancelled';
    return new OrderCancelled(this.id.value);
  }

  private calculateTotal(): Money {
    const subtotal = this.items.reduce(
      (sum, item) => sum.add(new Money(item.unitPrice.amount * item.quantity, item.unitPrice.currency)),
      new Money(0, 'USD')
    );
    const discount = this.pricingService.calculateDiscount(this.customerId);
    return new Money(Math.round(subtotal.amount * (1 - discount) * 100) / 100, subtotal.currency);
  }
}

// === Domain Event ===
class OrderSubmitted {
  readonly occurredAt: Date = new Date();
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly total: Money
  ) {}
}

// === Repository (Interface in Domain) ===
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
}

// === Domain Service ===
class PricingService {
  private customerTiers: Map<string, 'bronze' | 'silver' | 'gold'> = new Map();

  calculateDiscount(customerId: string): number {
    const tier = this.customerTiers.get(customerId);
    switch (tier) {
      case 'gold': return 0.15;
      case 'silver': return 0.10;
      case 'bronze': return 0.05;
      default: return 0;
    }
  }
}
\`\`\`

## 5. Variants & Flavors

| Approach | Focus | When to Use | Key Practice |
|----------|-------|-------------|--------------|
| **Strategic DDD** | System decomposition, bounded contexts, context mapping | Any multi-team/multi-service system | Event Storming, Context Map |
| **Tactical DDD** | Entity, Value Object, Aggregate, Repository | Complex business logic within a context | Rich domain model |
| **Domain Events** | Decoupled communication between aggregates | When an action should trigger side effects (e.g., OrderSubmitted → send email) | Publish events after aggregate method completes |
| **Event Sourcing** | Store aggregate state as a sequence of events | Audit trails, temporal queries, complex state reconstruction | Append-only event store, replay to get current state |
| **CQRS + DDD** | Separate command (write) and query (read) models | High read/write disparity, complex query requirements | Write model = DDD aggregates, Read model = denormalized views |

## 6. Performance Characteristics

| Aspect | Without DDD | With Tactical DDD |
|--------|------------|-------------------|
| Read speed | Faster (direct DB queries) | Slower (hydrating aggregate graph) |
| Write speed | Comparable | Comparable (single aggregate operation) |
| Memory usage per entity | Lower (simple data objects) | Higher (richer objects with behavior) |
| Development speed (initial) | Faster | Slower (modeling, ubiquitous language workshops) |
| Development speed (maintenance) | Slower (business logic scattered) | Faster (business rules in one place) |
| Onboarding new devs | Moderate (anyone can read CRUD) | Harder (must learn domain model) |
| Testability | Moderate (test services + DB) | High (test aggregate in isolation) |
| Change impact | High (business logic everywhere) | Low (change aggregate, domain events propagate) |

## 7. Failure Modes

- **DDD for CRUD**: Teams apply Tactical DDD to a simple CRUD app. Bounded contexts over a single database table. Aggregates with one field. *Mitigation*: DDD is for complex domains. Simple CRUD apps should use Transaction Script pattern — don't force DDD where it doesn't belong.
- **Giant aggregate**: An aggregate that contains hundreds of entities (e.g., \`Customer\` aggregate that owns all orders, addresses, payment methods, and preferences). Loading it costs thousands of DB queries. *Mitigation*: Design small aggregates — reference other aggregates by ID, not by object reference. Each aggregate is a transactional boundary: keep it small.
- **Ubiquitous language theater**: The team creates a glossary document but developers use different terms in code. PMs use the old terms in meetings. *Mitigation*: Ubiquitous language must be enforced in code — class names, method names, and variable names must match the language. Code reviews check for language violations. The language is alive — evolve it with the team.
- **No domain experts available**: The team tries DDD but no business stakeholders participate in workshops. Developers invent their own understanding of the domain. *Mitigation*: DDD without domain experts is impossible. Either find a domain expert (product manager, business analyst, subject matter expert) or accept that you're not doing DDD — you're doing "developer-driven design."
- **Infrastructure leak**: Domain objects reference ORM entities, HTTP response types, or framework annotations. Domain logic depends on the database schema. *Mitigation*: Hexagonal architecture — domain has zero infrastructure dependencies. Domain objects are plain objects. Infrastructure concerns live in adapters.

## 8. Decision Framework

\`\`\`
├─ Domain complexity?
│   ├─ Simple CRUD (no interesting rules) → Transaction Script
│   ├─ Moderate business rules → Tactical DDD (aggregates, events)
│   └─ Complex, multi-faceted domain → Strategic + Tactical DDD
├─ Team situation?
│   ├─ No domain expert access → Skip DDD
│   ├─ Some domain access but team is junior → Start with Event Storming
│   └─ Dedicated domain expert + experienced team → Full DDD
├─ System architecture?
│   ├─ Monolith → DDD modules (bounded contexts in packages)
│   └─ Microservices → Each bounded context = one service
├─ Regulatory constraints?
│   ├─ Yes (finance, healthcare, insurance) → DDD helps with audit trails via domain events
│   └─ No → DDD optional but still beneficial
└─ Timeline?
    ├─ Very tight (weeks) → Start with Event Storming (2 days), extract one context
    └─ Flexible (months) → Full strategic decomposition, event-storm all contexts
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'ubiq', label: 'Ubiquitous\nLanguage', type: 'app', x: 80, y: 20 },
    { id: 'billing', label: 'Billing Context\n(Entity: Invoice, \nPayment)', type: 'app', x: 80, y: 160 },
    { id: 'orders', label: 'Order Context\n(Entity: Order,\nOrderItem)', type: 'app', x: 300, y: 160 },
    { id: 'catalog', label: 'Catalog Context\n(Entity: Product,\nCategory)', type: 'app', x: 520, y: 160 },
    { id: 'shipping', label: 'Shipping Context\n(Entity: Shipment,\nTracking)', type: 'app', x: 520, y: 340 },
    { id: 'invctx', label: 'Inventory Context\n(Entity: StockItem)', type: 'app', x: 80, y: 340 },
    { id: 'acl', label: 'Anti-Corruption\nLayer (Catalog → Inv)', type: 'gateway', x: 300, y: 340 },
    { id: 'bus', label: 'Domain Event Bus\n(Kafka)', type: 'gateway', x: 300, y: 460 },
  ]}
  edges={[
    { from: 'ubiq', to: 'billing', label: 'shared terms' },
    { from: 'ubiq', to: 'orders', label: 'shared terms' },
    { from: 'ubiq', to: 'catalog', label: 'shared terms' },
    { from: 'orders', to: 'bus', label: 'OrderSubmitted, OrderCancelled' },
    { from: 'billing', to: 'bus', label: 'PaymentReceived, InvoiceGenerated' },
    { from: 'shipping', to: 'bus', label: 'ShipmentCreated' },
    { from: 'bus', to: 'invctx', label: 'consumes: OrderSubmitted' },
    { from: 'catalog', to: 'acl', label: 'Product model' },
    { from: 'acl', to: 'invctx', label: 'StockItem model (translated)' },
  ]}
  height={540}
/>

## 10. Real Production Incident

<Callout type="incident">
**Uber — Context Mapping Failure with Surge Pricing, 2016**

Uber's surge pricing algorithm was deeply coupled with the dispatch (ride matching) system. The "surge multiplier" was computed inside the Dispatch bounded context but consumed by the Pricing context AND the Driver Incentives context. When the Dispatch team changed how surge was calculated (to improve rider matching), it accidentally broke driver payment calculations.

**Impact**: For 4 hours, drivers in 12 cities were underpaid by an average of 18%. Driver complaints spiked 500%. Several drivers went offline, reducing supply and increasing wait times.

**Root cause**: The bounded contexts were not cleanly separated. Surge pricing logic was shared between Dispatch and Pricing through a shared module (Shared Kernel relationship) that had no explicit governance. When Dispatch changed the surge calculation to include a new demand factor, the Pricing team wasn't informed because the shared module was assumed to be "stable."

**Fix**: 
1. The surge pricing was extracted into its own bounded context (Surge Engine) with its own domain model.
2. Context map relationship changed from Shared Kernel to Customer/Supplier: Surge Engine publishes \`SurgeMultiplierCalculated\` events. Dispatch, Pricing, and Driver Incentives subscribe — each uses the data in its own model.
3. An Anti-Corruption Layer was added for the Driver Incentives context (which needed to translate the surge amount into a different formula for driver bonuses).

**Lesson**: Shared Kernel is the riskiest context map relationship. When two teams share a model, any change breaks both. Prefer Customer/Supplier with events — the upstream team publishes facts, and downstream teams consume them through their own domain models.
</Callout>

## 11. Production Implementation

### Project Structure — Order Context

\`\`\`
order-context/
  src/
    domain/
      order/
        entities/
          Order.ts
          OrderItem.ts
        value-objects/
          OrderId.ts
          Money.ts
          OrderStatus.ts
        events/
          OrderSubmitted.ts
          OrderCancelled.ts
        services/
          PricingService.ts  (interface)
        repositories/
          OrderRepository.ts (interface)
        aggregate/
          Order.ts
      customer/
        entities/
          Customer.ts
        value-objects/
          CustomerId.ts
        events/
          CustomerStatusChanged.ts
    application/
      use-cases/
        SubmitOrderUseCase.ts
        CancelOrderUseCase.ts
      ports/
        inbound/
          SubmitOrderCommand.ts
          CancelOrderCommand.ts
    infrastructure/
      persistence/
        postgres/
          PostgresOrderRepository.ts
          OrderOrmEntity.ts
      messaging/
        kafka/
          KafkaEventPublisher.ts
      di/
        container.ts
    api/
      controllers/
        OrderController.ts
      middleware/
        auth.ts
        validation.ts
\`\`\`

### Aggregate with Event Publishing

\`\`\`typescript
// Order aggregate uses the outbox pattern for reliable event publishing
interface DomainEvent { type: string; occurredAt: Date; aggregateId: string; }

abstract class AggregateRoot {
  private events: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.events.push(event);
  }

  popEvents(): DomainEvent[] {
    const captured = [...this.events];
    this.events = [];
    return captured;
  }
}

class Order extends AggregateRoot {
  // ... fields and methods as shown above ...

  override submit(): OrderSubmitted {
    super.submit(); // internal state change
    const event = new OrderSubmitted(this.id.value, this.customerId, this.items, this.calculateTotal());
    this.addDomainEvent(event);
    return event;
  }
}

// Application service publishes events after saving
class SubmitOrderUseCase {
  constructor(private repo: OrderRepository, private bus: EventBus) {}

  async execute(cmd: SubmitOrderCommand): Promise<OrderId> {
    const order = new Order(new OrderId(cmd.orderId), cmd.customerId, new PricingService());
    for (const item of cmd.items) {
      order.addItem(item.productId, item.quantity, new Money(item.price, 'USD'));
    }
    order.submit();
    await this.repo.save(order); // saves aggregate + outbox events in same transaction
    for (const event of order.popEvents()) {
      await this.bus.publish(event); // relay publishes after transaction committed
    }
    return order.id;
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **Amazon**: Arguably the most successful DDD implementation at scale. Every team owns a bounded context (e.g., Catalog, Order Fulfillment, Payment, Recommendations). Each context has a different model of "Product" — in Catalog, Product is a catalog entry with images and descriptions; in Fulfillment, Product is a physical item with weight and dimensions. The API mandate (all teams communicate via APIs) forced explicit bounded contexts.
- **ING Bank**: Used Event Storming to redesign their core banking platform. 30+ domain experts and developers spent 3 days in Event Storming sessions. Identified 50+ bounded contexts. Each context became a microservice. The result: reduced time-to-market for new banking features from 12 months to 6 weeks.
- **Zalando**: European fashion e-commerce. Used DDD to decompose their PHP monolith into 500+ microservices. Each bounded context has a "team API" — the interface that other teams consume. Teams are organized around business capabilities (browse, order, fitting, returns) not technical layers.
- **Spotify**: Squads own bounded contexts aligned to user-facing features (Browse, Search, Playback, Social). The "Squad Health Check" model emerged from DDD principles — teams that own their domain model have higher ownership and delivery velocity.

## 13. Interview Playbook

**Q: "How would you decompose a monolith into microservices using DDD?"**
→ Open with: Start with Event Storming workshops to discover bounded contexts. Each bounded context is a candidate microservice.
→ Cover: Invite domain experts (PMs, business stakeholders) and developers. Walk through business processes chronologically. Identify events (orange), commands (blue), aggregates (yellow), and external systems (pink). Group related events and commands into bounded contexts. Draw the context map showing relationships. Start with the highest-value bounded context (core domain) and extract it first.
→ Depth signal: Use the "Aggregate Design" rules from Vaughn Vernon's "Effective Aggregate Design": design small aggregates, reference by identity, use eventual consistency across aggregate boundaries. The transactional boundary is the aggregate — never span transactions across services. Use events for cross-context communication.

**Q: "What's the difference between an Entity and a Value Object?"**
→ Open with: Entities have identity that persists across changes. Value Objects are defined entirely by their attributes and are immutable.
→ Cover: Person, Order, Bank Account = Entity (each has a unique ID that doesn't change). Money, Color, Address = Value Object (two Money objects with amount=10 and currency=USD are interchangeable). Value Objects should be immutable — instead of \`setAmount(5)\`, return a new Money object.
→ Depth signal: Value Objects reduce complexity in the domain model by removing identity management. A \`Customer\` entity references a \`ShippingAddress\` value object, not another entity. When the address changes, the Customer gets a new Address value — the street becomes part of Customer's state, but the old Address object lives on in past orders (historical accuracy).

## 14. Concept Check Quiz

**Q1:** What is a bounded context?**Answer:** A semantic boundary within which a particular domain model is consistent. The same term (e.g., "Product") can have different meanings in different bounded contexts.

**Q2:** What are the four rules for designing a DDD aggregate?**Answer:** 1. Design small aggregates (reference by ID, not object). 2. Use eventual consistency across aggregate boundaries. 3. One aggregate = one transactional boundary. 4. Publish domain events for side effects.

**Q3:** What is Event Storming and what does it produce?**Answer:** A workshop technique where domain experts and developers model business processes using sticky notes. Output: domain events, commands, aggregates, bounded contexts, and a context map.

**Q4:** What is the difference between Core Domain, Supporting Subdomain, and Generic Subdomain?**Answer:** Core = competitive advantage (build in-house, invest heavily). Supporting = important but not differentiating (can buy or outsource). Generic = commodity (auth, logging — use existing solutions).

## 15. Next Steps

- **Hexagonal Architecture** — Protecting the domain model from infrastructure concerns via ports and adapters.
- **CQRS (Command Query Responsibility Segregation)** — Separating read and write models, often paired with DDD aggregates for the write model.
- **Event Sourcing** — Storing aggregate state as a sequence of domain events.
- **Microservices Decomposition** — Translating bounded contexts into deployable services with clear team ownership.`,
    estimatedMin: 16,
    difficulty: "ADVANCED" as const,
    companies: ["Domain-Driven Design", "Eric Evans", "Vaughn Vernon", "Uber"],
    tags: ["DDD", "domain-driven-design", "bounded-context", "ubiquitous-language", "aggregate"],
  },

  {
    id: "lesson-06-03",
    slug: "architecture-patterns-03-hexagonal-architecture",
    title: "Hexagonal Architecture (Ports & Adapters)",
    content: `## 0. Mental Model

> Hexagonal Architecture is like a **power strip with universal outlets**. Your core electronics (laptop, phone charger, lamp — the business logic) plug into the power strip using standard plugs (ports). The wall outlets in different countries (US, UK, Europe — databases, APIs, UIs) have different shapes — but the power strip's ports accept any adapter (US plug, UK plug, Euro plug). Your electronics never change, no matter which country you visit. If you move from PostgreSQL to DynamoDB, you just swap one adapter — the core stays unchanged.

## 1. Quick Summary

- **Hexagonal Architecture** (Ports & Adapters) isolates core business logic from infrastructure (databases, web frameworks, message brokers, UIs).
- **Port** = interface/contract defined by the core. Inbound ports define how external systems call the core. Outbound ports define how the core calls external systems.
- **Adapter** = concrete implementation of a port. Inbound adapters (controllers, CLI, event consumers) call inbound ports. Outbound adapters (repositories, message publishers, HTTP clients) implement outbound ports.
- **Dependency Rule**: Dependencies go INWARD. The core has ZERO knowledge of the outside world. Infrastructure depends on the core, never the reverse.
- **Key benefit**: Testability — core business logic can be tested without running a database or web server (mock the ports).
- **Key benefit**: Flexibility — swapping databases, frameworks, or delivery mechanisms requires zero changes to the core.
- **Alistair Cockburn** coined the term in 2005. Robert Martin's **Clean Architecture** is its direct descendant with additional layering.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Hexagonal Architecture** | Architectural pattern where core business logic is surrounded by ports and adapters, isolating it from external concerns |
| **Port** | Interface defined by the core that represents a boundary (inbound = how core is called; outbound = how core calls externals) |
| **Inbound Port** | Use case / application service interface exposed by the core (e.g., \`CreateOrderUseCase\`) |
| **Outbound Port** | Interface the core uses to interact with external systems (e.g., \`OrderRepository\`, \`EventPublisher\`) |
| **Inbound Adapter** | Component that translates external protocol into calls to inbound ports (e.g., HTTP controller, CLI, message queue consumer) |
| **Outbound Adapter** | Component that implements an outbound port (e.g., \`PostgresOrderRepository\`, \`KafkaEventPublisher\`) |
| **Core/Domain Layer** | Contains business logic, domain entities, ports, and domain services. Has no framework or infrastructure dependencies |
| **Infrastructure Layer** | Contains adapters, configuration, DI wiring, and framework-specific code |
| **Dependency Inversion Principle (DIP)** | High-level modules (core) should not depend on low-level modules (infrastructure). Both should depend on abstractions (ports) |
| **Clean Architecture** | Robert Martin's refinement with additional layers: Use Cases, Interface Adapters, Frameworks & Drivers |
| **Onion Architecture** | Jeffrey Palermo's variant with concentric layers — core at center, infrastructure on outer rings |

## 3. The Problem Without It

- **Framework lock-in**: Your Order class inherits from \`ActiveRecord::Base\` (Rails) or \`Entity<Order>\` (JPA). To change frameworks, you must rewrite every domain object. The framework becomes the architecture.
- **Database coupling**: Business logic contains SQL queries, connection strings, and ORM annotations. Testing business rules requires spinning up a test database. Schema changes leak everywhere.
- **Untestable logic**: A "service" class calls \`PaymentGateway.charge()\` (HTTP call) and \`OrderRepository.save()\` (DB call) directly — you cannot unit test the business logic without mocking concrete HTTP and DB classes.
- **Difficult evolution**: Switching from REST to GraphQL? Replacing PostgreSQL with DynamoDB? Migrating from Kafka to EventBridge? Each change requires modifying business logic files — high risk of regression.
- **Conway's Law violation**: If your code is organized by technical layer (controllers/, services/, repositories/), your teams will organize the same way — leading to siloed "frontend team," "backend team," "DB team" rather than feature teams.

## 4. How It Works — Core Mechanics

### Architecture Layers

\`\`\`
┌──────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Inbound Adapters           Outbound Adapters             │ │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌───────────┐ │ │
│  │  │ REST     │ │ GraphQL  │ │ Postgres   │ │ Kafka     │ │ │
│  │  │Controller│ │ Resolver │ │ Repo       │ │ Publisher │ │ │
│  │  └────┬─────┘ └────┬─────┘ └─────┬──────┘ └─────┬─────┘ │ │
│  │       │            │             │               │       │ │
│  └───────┼────────────┼─────────────┼───────────────┼───────┘ │
│          │            │             │               │         │
│          ▼            ▼             │               │         │
│  ┌──────────────────────────────────┼───────────────┼───────┐ │
│  │         Core Layer               │               │       │ │
│  │  ┌──────────────────────────────┐│               │       │ │
│  │  │  Application Services        ││               │       │ │
│  │  │  (Inbound Port implementations)              │       │ │
│  │  └──────────┬───────────────────┘│               │       │ │
│  │             │                    │               │       │ │
│  │  ┌──────────▼───────────────────┐│               │       │ │
│  │  │  Domain Model                ││               │       │ │
│  │  │  (Entities, Value Objects,   ││               │       │ │
│  │  │   Domain Services, Aggregates)               │       │ │
│  │  └──────────────────────────────┘│               │       │ │
│  │                                   │               │       │ │
│  │  ┌──────────────────────────────┐│               │       │ │
│  │  │  Outbound Ports (Interfaces) │◄───────────────┘       │ │
│  │  │  OrderRepository             │                        │ │
│  │  │  EventPublisher              │                        │ │
│  │  └──────────────────────────────┘                        │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
\`\`\`

### Flow — Request Entering Through Inbound Adapter

\`\`\`
HTTP POST /api/orders (JSON body)
    │
    ▼
REST Controller (Inbound Adapter)
    ├── Deserializes JSON → CreateOrderDTO
    ├── Validates basic format (validation library)
    └── Calls inbound port: this.createOrderUseCase.execute(dto)
         │
         ▼
Application Service (Inbound Port Implementation)
    ├── Creates Order domain entity
    ├── Calls outbound ports:
    │   ├── this.inventory.reserve(items)
    │   ├── this.payment.charge(amount)
    │   └── this.repo.save(order)
    ├── Publishes event:
    │   └── this.eventBus.publish(new OrderPlaced(...))
    └── Returns OrderResponse DTO
         │
         ▼
REST Controller serializes response → JSON ← HTTP 201
\`\`\`

### TypeScript — Complete Hexagonal Example

\`\`\`typescript
// ===== CORE — OUTBOUND PORTS (interfaces) =====
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

interface InventoryService {
  reserve(items: LineItem[]): Promise<boolean>;
  release(items: LineItem[]): Promise<void>;
}

interface EventBus {
  publish(event: DomainEvent): Promise<void>;
}

// ===== CORE — DOMAIN MODEL =====
class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly items: LineItem[],
    public status: OrderStatus,
    public total: Money
  ) {}

  confirm(): void {
    if (this.status !== 'pending') throw new Error('Order must be pending');
    this.status = 'confirmed';
  }

  cancel(): void {
    if (this.status === 'shipped') throw new Error('Cannot cancel shipped order');
    this.status = 'cancelled';
  }
}

// ===== CORE — INBOUND PORT =====
interface CreateOrderUseCase {
  execute(command: CreateOrderCommand): Promise<OrderResponse>;
}

// ===== CORE — APPLICATION SERVICE (inbound port impl) =====
class CreateOrderService implements CreateOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private inventory: InventoryService,
    private payment: PaymentService,
    private eventBus: EventBus
  ) {}

  async execute(command: CreateOrderCommand): Promise<OrderResponse> {
    const order = new Order(
      crypto.randomUUID(),
      command.customerId,
      command.items.map(i => new LineItem(i.productId, i.quantity, new Money(i.price, 'USD'))),
      'pending',
      Money.zero('USD')
    );

    const reserved = await this.inventory.reserve(order.items);
    if (!reserved) throw new Error('Insufficient inventory');

    const charged = await this.payment.charge(order.customerId, order.total);
    if (!charged) {
      await this.inventory.release(order.items);
      throw new Error('Payment failed');
    }

    order.confirm();
    await this.orderRepo.save(order);
    await this.eventBus.publish(new OrderPlacedEvent(order.id, order.customerId, new Date()));

    return { orderId: order.id, status: order.status, total: order.total.amount };
  }
}

// ===== INFRASTRUCTURE — INBOUND ADAPTER =====
class OrderController {
  constructor(private createOrder: CreateOrderUseCase) {}

  async handlePost(req: Request, res: Response): Promise<void> {
    const command: CreateOrderCommand = {
      customerId: req.body.customerId,
      items: req.body.items,
    };
    const result = await this.createOrder.execute(command);
    res.status(201).json(result);
  }
}

// ===== INFRASTRUCTURE — OUTBOUND ADAPTER =====
class PostgresOrderRepository implements OrderRepository {
  constructor(private pool: Pool) {}

  async save(order: Order): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO orders (id, customer_id, status, total) VALUES ($1, $2, $3, $4)',
        [order.id, order.customerId, order.status, order.total.amount]
      );
      for (const item of order.items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
          [order.id, item.productId, item.quantity, item.unitPrice.amount]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Order | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM orders WHERE id = $1', [id]
    );
    if (rows.length === 0) return null;
    return this.hydrateOrder(rows[0]);
  }

  private async hydrateOrder(row: any): Promise<Order> {
    const { rows: items } = await this.pool.query(
      'SELECT * FROM order_items WHERE order_id = $1', [row.id]
    );
    return new Order(row.id, row.customer_id, items.map(i =>
      new LineItem(i.product_id, i.quantity, new Money(i.unit_price, 'USD'))
    ), row.status, new Money(row.total, 'USD'));
  }
}
\`\`\`

## 5. Variants & Flavors

| Variant | Layers | Port/Adapter Style | Origin | Best For |
|---------|--------|-------------------|--------|----------|
| **Hexagonal (Ports & Adapters)** | Core + Infrastructure | Explicit ports (inbound + outbound) + adapters | Alistair Cockburn | Any system needing infrastructure isolation |
| **Clean Architecture** | Entities → Use Cases → Controllers → Frameworks | Use Cases as inbound ports, Interfaces for repos | Robert Martin | Applications with complex use case orchestration |
| **Onion Architecture** | Domain → Application → Infrastructure → UI | Outer layers depend on inner, inner defines interfaces | Jeffrey Palermo | DDD-heavy applications |
| **Screaming Architecture** | Same as Clean but file structure mirrors business intent | Same as Clean | Robert Martin | Large enterprise apps with many use cases |
| **Hexagonal + CQRS** | Commands go through one flow, queries through another | Separate command/query ports and adapters | Greg Young | Read-heavy apps with different read/write models |

## 6. Performance Characteristics

| Metric | Layered (Traditional) | Hexagonal |
|--------|----------------------|-----------|
| Request latency overhead | 0 (direct calls) | ~1ms (interface indirection) |
| Memory overhead | 0 | Negligible (vtable pointer) |
| Startup time | Same | Same |
| Cold start (Lambda) | Same | Same |
| Test execution (unit) | ~2-5s (need mocks) | ~200ms (pure domain) |
| Test execution (integration) | ~30s (need DB/container) | Same (but fewer needed) |
| Developer velocity (initial) | Faster (less ceremony) | Slower (more files, interfaces) |
| Developer velocity (mature) | Slower (rigid) | Faster (pluggable infrastructure) |

## 7. Failure Modes

- **Over-abstraction**: Every single class has a port interface, even pure domain objects. 20 interfaces for 10 concrete classes. *Mitigation*: Only create ports for boundaries that cross architectural layers. Domain entities and value objects do NOT need interfaces — they're part of the core. Only infrastructure boundaries need ports.
- **Leaky abstractions**: The port interface exposes infrastructure-specific concepts (e.g., \`OrderRepository.save() returns Promise\` is fine, but \`OrderRepository.save() returns Flux<Order>\` implies reactive streams, which is a framework concern). *Mitigation*: Keep port interfaces in pure TypeScript/Python — no framework-specific types. Use \`Promise\`/\`Optional\` — not framework-specific abstractions.
- **Adapter anarchy**: No clear boundary between adapters. A controller directly instantiates a repository. A repository calls another repository. The hexagonal structure collapses. *Mitigation*: Inbound adapters only call inbound ports. Outbound adapters only implement outbound ports. Application services orchestrate — they call outbound ports and return results. Adapters should never call each other.
- **Testing the wrong layer**: Teams unit-test adapters instead of testing the core through port mocks. *Mitigation*: Core tests use mocked ports — these are the high-value tests. Adapter tests are integration tests (e.g., test PostgresOrderRepository against a real Postgres in a container).
- **Hexagonal with simple CRUD**: A REST controller → CreateService → Repository pattern where the service does nothing but pass through data. The ports add no value. *Mitigation*: For simple CRUD, skip hexagonal and use a framework-native approach (e.g., Express + Prisma directly). Add hexagonal only when business logic complexity justifies it.

## 8. Decision Framework

\`\`\`
├─ Business logic complexity?
│   ├─ Simple CRUD (create/read/update/delete only) → Skip hexagonal, use framework directly
│   ├─ Moderate business rules → Hexagonal (protect domain from framework churn)
│   └─ Complex DDD with rich domain model → Hexagonal (essential — domain must be infrastructure-free)
├─ Expected lifespan?
│   ├─ < 1 year → No hexagonal (too much ceremony for short-lived apps)
│   ├─ 1-3 years → Consider hexagonal for core subdomains
│   └─ 3+ years → Hexagonal (technology will change; core business logic should not)
├─ Multiple delivery mechanisms?
│   ├─ Only REST → Hexagonal optional
│   ├─ REST + GraphQL + CLI + event consumer → Hexagonal (shared core, different adapters)
│   └─ Same core used by web, mobile, and batch jobs → Strong case for hexagonal
├─ Testability requirements?
│   ├─ Low tolerance for slow tests → Hexagonal (pure logic tests = fast)
│   └─ OK with integration tests → Hexagonal optional
└─ Team experience?
    ├─ Familiar with ports & adapters → Hexagonal
    └─ Not familiar → Start with modular approach, introduce hexagonal gradually on one context
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'rest', label: 'REST Controller\n(Inbound Adapter)', type: 'gateway', x: 60, y: 60 },
    { id: 'graphql', label: 'GraphQL Resolver\n(Inbound Adapter)', type: 'gateway', x: 60, y: 180 },
    { id: 'cli', label: 'CLI Command\n(Inbound Adapter)', type: 'gateway', x: 60, y: 300 },
    { id: 'usecase', label: 'Application Service\n(Inbound Port Impl)', type: 'app', x: 300, y: 120 },
    { id: 'domain', label: 'Domain Model\n(Entities, VOs)', type: 'app', x: 300, y: 260 },
    { id: 'outport1', label: 'OrderRepository\n(Outbound Port)', type: 'storage', x: 300, y: 400 },
    { id: 'outport2', label: 'EventPublisher\n(Outbound Port)', type: 'storage', x: 300, y: 480 },
    { id: 'pg', label: 'PostgresOrderRepo\n(Outbound Adapter)', type: 'storage', x: 520, y: 360 },
    { id: 'kafka', label: 'KafkaPublisher\n(Outbound Adapter)', type: 'storage', x: 520, y: 480 },
    { id: 'mock', label: 'Mock Repo\n(Test Adapter)', type: 'worker', x: 520, y: 240 },
  ]}
  edges={[
    { from: 'rest', to: 'usecase', label: 'calls inbound port' },
    { from: 'graphql', to: 'usecase', label: 'calls inbound port' },
    { from: 'cli', to: 'usecase', label: 'calls inbound port' },
    { from: 'usecase', to: 'domain', label: 'orchestrates' },
    { from: 'usecase', to: 'outport1', label: 'calls outbound port' },
    { from: 'usecase', to: 'outport2', label: 'calls outbound port' },
    { from: 'outport1', to: 'pg', label: 'implements' },
    { from: 'outport1', to: 'mock', label: 'implements (testing)' },
    { from: 'outport2', to: 'kafka', label: 'implements' },
  ]}
  height={580}
/>

## 10. Real Production Incident

<Callout type="incident">
**Netflix — Migration from Oracle to Cassandra Without Downtime, 2011**

Netflix's core movie recommendation engine was built with hexagonal architecture principles. The recommendation domain model defined a \`RecommendationRepository\` port (interface). The initial adapter used Oracle via a proprietary ORM. When Netflix hit Oracle's scaling limits (write throughput capped at 10K TPS, licensing costs $5M+/year), they decided to migrate to Cassandra.

**Impact**: Zero migration downtime. A team of 3 engineers replaced the Oracle adapter with a Cassandra adapter in 6 weeks. The recommendation domain (300+ business rules, complex scoring algorithms) was never touched — it only depended on the \`RecommendationRepository\` interface.

**Root cause** (of why this was possible): The hexagonal architecture enforced a strict boundary between the recommendation domain and its data storage. The domain had NO concept of SQL, ORM, tables, or rows. It called \`repo.findTopN(userId, n)\` and got back a list of recommendations. The adapter handled all the database-specific details.

**Fix**: 
1. New \`CassandraRecommendationRepository\` was written implementing the same \`RecommendationRepository\` port.
2. The Spring DI container was reconfigured to inject the Cassandra adapter instead of the Oracle adapter.
3. Canary deployment: 5% of traffic to Cassandra adapter for 2 days. Verified identical recommendation results (diff tool compared outputs).
4. Rolled out to 100%. Oracle adapter was deleted.

**Lesson**: Hexagonal architecture makes infrastructure swapping a configuration change, not a code change. Netflix's ability to migrate databases (Oracle → Cassandra, and later Cassandra → Elasticsearch for some read paths) with zero domain changes was a direct result of strict port/adapter separation.
</Callout>

## 11. Production Implementation

### Dependency Injection Wiring (TypeScript + Awilix)

\`\`\`typescript
import { createContainer, asClass, asFunction } from 'awilix';
import { CreateOrderService } from './core/CreateOrderService';
import { PostgresOrderRepository } from './infra/PostgresOrderRepository';
import { KafkaEventBus } from './infra/KafkaEventBus';
import { StripePaymentService } from './infra/StripePaymentService';

const container = createContainer();

container.register({
  // Core — inbound ports
  createOrderUseCase: asClass(CreateOrderService),

  // Core — outbound ports (wired to adapters)
  orderRepository: asClass(PostgresOrderRepository).singleton(),
  eventBus: asClass(KafkaEventBus).singleton(),
  paymentService: asClass(StripePaymentService).singleton(),

  // Adapters
  orderController: asClass(OrderController),
});
\`\`\`

### Terraform — Lambda with Hexagonal Deployment

\`\`\`hcl
# Each adapter can be deployed independently
resource "aws_lambda_function" "order_api" {
  function_name = "order-api"
  handler       = "infra/adapters/rest/handler.handle"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_role.arn
  # Code includes core + all adapters, but DI selects appropriate ones per environment
}

# Swapping adapters = changing environment variable and redeploying
# No core code changes needed
resource "aws_lambda_function" "order_worker" {
  function_name = "order-worker"
  handler       = "infra/adapters/sqs/handler.handle"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_role.arn
  # Same core code, different entry point
}
\`\`\`

## 12. Real Company Deep Dives

- **Netflix**: As described in the incident — Netflix's recommendation and personalization systems use hexagonal architecture. The port/adapter boundary allowed them to switch from Oracle to Cassandra to Elasticsearch without touching core business logic.
- **ING Bank**: Core banking platform built with hexagonal architecture + DDD. Each bounded context has its own core with ports/adapters. The "Customer" context's core has NO dependencies — the onboarding web app, mobile app, and batch import system all use the same core through different inbound adapters.
- **Spring Framework (Java ecosystem)**: Spring's \`@Service\`, \`@Repository\`, \`@Controller\` annotations naturally map to hexagonal patterns. Spring Boot's auto-configuration makes swapping adapters trivial (change profile, swap implementations). Many enterprise Java apps use Spring + hexagonal without explicitly naming it.
- **ThoughtWorks**: Promoted hexagonal architecture in client engagements since the early 2010s. Their "Tech Radar" consistently recommends hexagonal architecture for any system with complex business logic and expected longevity.

## 13. Interview Playbook

**Q: "Explain the Dependency Inversion Principle as it applies to Hexagonal Architecture."**
→ Open with: High-level modules (core domain) should not depend on low-level modules (database, web). Both should depend on abstractions (ports).
→ Cover: In a traditional layered architecture, the domain layer depends on the data access layer (concrete repository class). In hexagonal, the domain defines a \`Repository\` port (interface), and the data access layer implements it. The dependency direction reverses — infrastructure now depends on the domain's definition of what a repository looks like.
→ Depth signal: The real power is that the domain defines the DATA MODEL that the database must support. The database is reshaped to fit the domain — not the other way around. The \`save(order)\` method in the port interface determines the contract. The SQL schema is derived from how the domain wants to persist its aggregates.

**Q: "How would you test a hexagonal application?"**
→ Open with: There are three levels of testing: core unit tests, adapter integration tests, and end-to-end tests.
→ Cover: Core tests create the application service with mocked ports. These test business logic without infrastructure. Example: mock \`OrderRepository\` returns a saved order; test that \`cancelOrder\` publishes \`OrderCancelled\`. Adapter tests test each adapter against real infrastructure (Postgres, Kafka) using test containers. E2E tests run the full stack.
→ Depth signal: The core unit tests provide the highest confidence per unit of testing effort — they cover all business logic paths and edge cases. Infrastructure tests are only needed when adapters change. The central principle: business rules should be exercised with every commit; infrastructure tests can be run less frequently.

## 14. Concept Check Quiz

**Q1:** What is the difference between an inbound port and an outbound port?**Answer:** Inbound port = interface that defines how external systems can call the core (application service interface). Outbound port = interface the core uses to call external systems (repository interface, event publisher).

**Q2:** What is the one rule that must never be violated in hexagonal architecture?**Answer:** The core must have zero dependencies on infrastructure. It must not import anything from a web framework, database driver, or message queue library. All dependencies point inward.

**Q3:** What is the purpose of adapters in hexagonal architecture?**Answer:** Adapters translate between the core's interfaces (ports) and external technologies. REST controllers translate HTTP to method calls. Repository adapters translate method calls to SQL queries.

**Q4:** How does hexagonal architecture improve testability?**Answer:** The core depends only on port interfaces — in tests, you can mock/stub those ports. No database, no web server, no network calls needed. Core tests run in milliseconds.

## 15. Next Steps

- **Domain-Driven Design** — The domain model patterns (aggregates, entities, value objects) that live in the core of hexagonal architecture.
- **Clean Architecture** — Robert Martin's evolution with explicit use case layers.
- **Dependency Injection** — Wiring ports to adapters at composition root.
- **Event-Driven Architecture** — Using event ports (outbound) and event consumer adapters (inbound) for reactive systems.`,
    estimatedMin: 15,
    difficulty: "ADVANCED" as const,
    companies: ["Alistair Cockburn", "Java", "Spring", "Netflix"],
    tags: ["hexagonal-architecture", "ports-and-adapters", "clean-architecture", "dependency-injection"],
  },

  {
    id: "lesson-06-04",
    slug: "architecture-patterns-04-event-driven-architecture",
    title: "Event-Driven Architecture",
    content: `## 0. Mental Model

> Event-Driven Architecture is like a **news wire service** (AP, Reuters). Reporters (event producers) publish stories to the wire. Newspapers, TV stations, websites, and apps (event consumers) subscribe to the wire and decide what to publish. A reporter doesn't know which outlets will pick up the story. If a new outlet launches, it just subscribes — no one changes the wire. If one outlet goes offline, the wire keeps flowing. The story (event) is an immutable fact — "Earthquake struck at 14:32 UTC" — outlets can react however they want.

## 1. Quick Summary

- **EDA** = components communicate by producing and consuming immutable **events** (facts about things that happened).
- **Event Producer** emits events without knowing or caring which consumers receive them.
- **Event Consumer** subscribes to event types and reacts — without knowing which producer sent the event.
- **Event Bus/Broker** (Kafka, EventBridge, RabbitMQ, SNS/SQS) transports events from producers to consumers with durability, ordering guarantees, and at-least-once delivery.
- **Key benefits**: Loose coupling (services don't know each other), scalability (consumers scale independently), extensibility (new consumers subscribe without producer changes), resilience (consumer failures don't cascade).
- **Key challenges**: Eventual consistency (no ACID across services), debugging complexity (event flows are harder to trace), duplicate events (idempotent processing required), schema evolution (changing event formats requires coordination).
- **Common patterns**: Event Notification (just the event), Event-Carried State Transfer (event includes data), Event Sourcing (events are the source of truth), CQRS (separate read/write with events for sync).

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Event** | Immutable record of something that happened (OrderPlaced, PaymentReceived). Cannot be changed or deleted — only corrected via a compensating event |
| **Event Producer** | Service that detects a state change and publishes an event to the event bus |
| **Event Consumer** | Service that subscribes to events and reacts to them |
| **Event Bus / Broker** | Middleware that stores, routes, and delivers events (Kafka topic, SQS queue, EventBridge rule, RabbitMQ exchange) |
| **Topic** | Named channel in Kafka/EventBridge where events of a type are published. Consumers subscribe to topics |
| **Partition** | Kafka's unit of parallelism — events in a partition are ordered. Consumers read from partitions in order |
| **At-Least-Once Delivery** | Guarantee that every event is delivered at least once. Consumers must be idempotent (processing the same event twice has no side effects) |
| **Exactly-Once Semantics** | Stronger guarantee (available in Kafka with transactions) — each event is processed exactly once |
| **Event Sourcing** | Pattern where events are the source of truth. Current state is derived by replaying all events |
| **Outbox Pattern** | Writing both the state change AND the event in a single database transaction, then a relay publishes the event — ensures at-least-once delivery without distributed transactions |
| **Dead Letter Queue (DLQ)** | Queue where events that failed processing are sent for later inspection and reprocessing |
| **Schema Registry** | Service that stores and validates event schemas (Avro, Protobuf, JSON Schema) — ensures producers and consumers agree on event format |
| **Correlation ID** | Unique ID attached to a chain of events (e.g., all events in an order lifecycle share the same correlation ID) — enables tracing |

## 3. The Problem Without It

- **Synchronous coupling**: Service A calls B, C, D sequentially for a single user request. Each call adds latency. If B is slow, A blocks. If C is down, the request fails entirely. The availability of your feature equals the product of all service availabilities (if each is 99.9%, four services = 99.6%).
- **Point-to-point spaghetti**: Every service that needs data from another must have a direct HTTP client. Adding a new consumer means: 1) modify the producer to send to the new consumer, 2) deploy the producer, 3) deploy the consumer. This creates a web of tightly coupled integrations.
- **Scaling inefficiency**: A customer places an order. The synchronous flow: Order → Email → Inventory → Payment → Analytics. If Email is slow, the entire chain slows. You can't independently scale the email processing.
- **No event history**: The current state of the system tells you "what is" but not "what happened." You can't ask "why did this order get cancelled?" or "what was the user's status at this date?" Without events, you build audit logs as a separate system that always gets out of sync.
- **Batch processing latency**: Without events, data is processed in nightly batches. Customers wait 24 hours for order confirmations, reports are always stale, and real-time fraud detection is impossible.

## 4. How It Works — Core Mechanics

### Event Flow

\`\`\`
                    ┌──────────────────┐
                    │   Event Bus      │
                    │   (Kafka Topic)  │
                    │   "order-events" │
                    └────────┬─────────┘
          publish             │            subscribe
    ┌────────────────┐       │       ┌──────────────────────┐
    │ Order Service  │───────┼──────►│ Email Service        │
    │ (Producer)     │       │       │ (Consumer)           │
    │ OrderPlaced    │       │       │ Sends confirmation   │
    └────────────────┘       │       └──────────────────────┘
                             │       ┌──────────────────────┐
                             │       │ Inventory Service     │
                             ├──────►│ (Consumer)            │
                             │       │ Reserves stock        │
                             │       └──────────────────────┘
                             │       ┌──────────────────────┐
                             │       │ Analytics Service     │
                             └──────►│ (Consumer)            │
                                     │ Updates dashboards   │
                                     └──────────────────────┘
\`\`\`

### Kafka Partitioning and Ordering

\`\`\`
Topic: "order-events" (3 partitions)

Partition 0: [0:OrderPlaced, 3:PaymentReceived, 6:ShipmentCreated]
Partition 1: [1:OrderPlaced, 4:OrderCancelled]
Partition 2: [2:OrderPlaced, 5:PaymentReceived, 7:ShipmentCreated]

- Events with the same key (e.g., orderId) go to the same partition
- Within a partition, events are strictly ordered
- Consumers read partitions independently (parallelism factor)
\`\`\`

### Event Schemas (Avro with Schema Registry)

\`\`\`json
{
  "type": "record",
  "name": "OrderPlaced",
  "namespace": "com.example.orders",
  "fields": [
    { "name": "eventId", "type": "string" },
    { "name": "correlationId", "type": "string" },
    { "name": "orderId", "type": "string" },
    { "name": "customerId", "type": "string" },
    { "name": "items", "type": { "type": "array", "items": {
      "type": "record",
      "name": "LineItem",
      "fields": [
        { "name": "productId", "type": "string" },
        { "name": "quantity", "type": "int" },
        { "name": "unitPrice", "type": "double" }
      ]
    }}},
    { "name": "total", "type": "double", "default": 0.0 }
  ]
}
\`\`\`

### Outbox Pattern — Reliable Event Publishing

\`\`\`typescript
// Order aggregate creates domain events
class Order extends AggregateRoot {
  // ... business methods ...

  confirm(): void {
    this.status = 'confirmed';
    this.addDomainEvent(new OrderConfirmed(this.id, this.customerId, Date.now()));
  }
}

// Application service saves aggregate + outbox in one transaction
class OrderService {
  async confirmOrder(orderId: string): Promise<void> {
    const order = await this.repo.findById(orderId);
    if (!order) throw new Error('Order not found');

    order.confirm();
    await this.repo.save(order); // Writes to orders table + outbox_events table in same DB transaction

    // An outbox relay (separate process) reads from outbox_events
    // and publishes to Kafka. It deletes the outbox row once published.
    // This guarantees at-least-once delivery.
  }
}

// Outbox Relay (runs as a background worker)
class OutboxRelay {
  constructor(private db: Pool, private producer: KafkaProducer) {}

  async publishPendingEvents(): Promise<void> {
    const { rows } = await this.db.query(
      "SELECT * FROM outbox_events WHERE published_at IS NULL ORDER BY created_at ASC LIMIT 100"
    );
    for (const row of rows) {
      try {
        await this.producer.produce({
          topic: row.event_type,
          key: row.aggregate_id,
          value: JSON.stringify(row.payload),
        });
        await this.db.query(
          "UPDATE outbox_events SET published_at = NOW() WHERE id = $1",
          [row.id]
        );
      } catch (err) {
        console.error('Failed to publish event', row.id, err);
        // Will retry on next poll
      }
    }
  }
}
\`\`\`

## 5. Variants & Flavors

| Pattern | Event Scope | State Handling | Use Case |
|---------|------------|----------------|----------|
| **Event Notification** | Just the event ("OrderPlaced") | Consumers fetch additional data via API | Simple workflow triggers |
| **Event-Carried State Transfer** | Event includes relevant data (customer name, items, total) | Consumers update their own read models | Reducing synchronous calls |
| **Event Sourcing** | Events are the primary data store | Current state built by replaying events | Audit trails, temporal queries |
| **CQRS + Events** | Commands produce events; events update read models | Separate write and read stores | Complex domain with differing read/write needs |
| **Stream Processing** | Continuous event streams with stateful operations (windowed aggregations, joins) | State stored in local state stores (Kafka Streams, Flink) | Real-time analytics, fraud detection |

## 6. Performance Characteristics

| Metric | Synchronous (HTTP) | Async (Event Bus) |
|--------|-------------------|-------------------|
| End-to-end latency (p50) | 10-50ms | 50-500ms |
| End-to-end latency (p99) | 100-500ms (timeouts) | 1-5s (retries, backpressure) |
| Throughput per service | 1K-10K req/s | 10K-1M+ events/s |
| Failure impact | Caller blocks/fails | Consumer fails → events backlog in queue |
| Data consistency | Strong (within transaction) | Eventual (seconds to minutes) |
| Debugging complexity | Moderate (REST logs) | High (distributed tracing needed) |
| Schema coupling | Tight (shared API contract) | Loose (schema registry) |
| Backpressure | HTTP 503 / connection pool | Consumer lag (can monitor offset) |

## 7. Failure Modes

- **Consumer lag backlog**: Consumer can't keep up with event volume → lag grows → consumers process stale events → eventual consistency window expands. *Mitigation*: Monitor consumer lag (Kafka consumer group offset). Auto-scale consumers. Use dead letter queues for poison pill events.
- **Duplicate events**: Kafka delivers at-least-once. Network retry causes duplicate \`OrderPlaced\` events → Inventory reserves stock twice → oversold product. *Mitigation*: Idempotent consumers — check if event.id already processed before applying changes. Use a \`processed_events\` table with a unique constraint on event ID.
- **Event ordering violation**: Event A (OrderPlaced) and Event B (OrderCancelled) arrive in wrong order. Consumer sees OrderCancelled before OrderPlaced. *Mitigation*: Use partition-level ordering (same key = same partition = ordered). For related events, use a single partition. Consumers should be able to handle out-of-order events (e.g., ignore Cancel if no matching Placed).
- **Schema mismatch**: Producer adds a required field. Consumer fails to deserialize → events go to DLQ. *Mitigation*: Schema Registry with backward/forward compatibility checks. Required fields are additive only. Producers mark new fields as optional for 2+ versions. Use \`defaults\` in Avro/Protobuf schemas.
- **Poison pill event**: A malformed event crashes the consumer → consumer restarts → processes the same malformed event → crashes again (infinite loop). *Mitigation*: Wrap processing in try/catch. After N failed attempts, route to DLQ. Never allow a single bad event to block the entire consumer.
- **Cascading failure (retry storm)**: Consumer fails (DB is slow). Events are retried. More events pile up. The retries compound the load on the DB. *Mitigation*: Exponential backoff on retries. Circuit breaker for downstream dependencies. Dead letter queue after max retries.

## 8. Decision Framework

\`\`\`
├─ Do you need strong consistency?
│   ├─ Yes (bank transfer between accounts) → Synchronous (distributed transaction / saga with orchestration)
│   └─ No (order placed → email confirmation) → EDA (eventual consistency is fine)
├─ Do you need real-time processing?
│   ├─ Yes (fraud detection, live dashboard) → EDA with stream processing (Kafka Streams, Flink)
│   └─ No (daily reports, batch ETL) → Batch processing (nightly jobs) or EDA with time-based windowing
├─ Do you need audit trails?
│   ├─ Yes (finance, healthcare, regulated) → Event Sourcing (events = immutable audit log)
│   └─ No → Event Notification or Event-Carried State Transfer
├─ Service coupling tolerance?
│   ├─ Can accept direct service dependencies → Start with simple REST + message queue
│   └─ Must have extreme decoupling → EDA with schema registry + anti-corruption layer
└─ Team maturity?
    ├─ High (experience with async, distributed tracing, idempotency) → Full EDA
    └─ Low → Start with simple event notification (single queue), add sophistication gradually
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'web', label: 'Web App\n(Order Placement)', type: 'client', x: 60, y: 40 },
    { id: 'orders', label: 'Order Service\n(Producer)', type: 'app', x: 60, y: 200 },
    { id: 'odb', label: 'Order DB', type: 'storage', x: 60, y: 360 },
    { id: 'ob', label: 'Outbox Table\n(Transactional Outbox)', type: 'storage', x: 60, y: 460 },
    { id: 'relay', label: 'Outbox Relay\n(Background Worker)', type: 'worker', x: 60, y: 560 },
    { id: 'kafka', label: 'Kafka\norder-events topic\n(3 partitions)', type: 'gateway', x: 300, y: 400 },
    { id: 'email', label: 'Email Service\n(Consumer)', type: 'app', x: 520, y: 120 },
    { id: 'inv', label: 'Inventory Service\n(Consumer)', type: 'app', x: 520, y: 240 },
    { id: 'pay', label: 'Payment Service\n(Consumer)', type: 'app', x: 520, y: 360 },
    { id: 'analytic', label: 'Analytics Service\n(Consumer)', type: 'app', x: 520, y: 480 },
    { id: 'fraud', label: 'Fraud Detection\n(Stream Processor)', type: 'app', x: 300, y: 600 },
    { id: 'dlq', label: 'DLQ\n(Failed Events)', type: 'storage', x: 520, y: 600 },
  ]}
  edges={[
    { from: 'web', to: 'orders', label: 'POST /orders' },
    { from: 'orders', to: 'odb', label: 'save order (txn 1)' },
    { from: 'orders', to: 'ob', label: 'write event (same txn)' },
    { from: 'ob', to: 'relay', label: 'reads unprocessed' },
    { from: 'relay', to: 'kafka', label: 'publishes event' },
    { from: 'kafka', to: 'email', label: 'OrderPlaced' },
    { from: 'kafka', to: 'inv', label: 'OrderPlaced' },
    { from: 'kafka', to: 'pay', label: 'OrderPlaced' },
    { from: 'kafka', to: 'analytic', label: 'OrderPlaced' },
    { from: 'kafka', to: 'fraud', label: 'consumes from same topic' },
    { from: 'fraud', to: 'dlq', label: 'failed events' },
  ]}
  height={680}
/>

## 10. Real Production Incident

<Callout type="incident">
**Amazon — SNS/SQS Event Ordering Issue, Prime Day 2018**

During Prime Day 2018, Amazon's order processing system experienced a cascading failure related to event ordering. The order service published \`OrderPlaced\` events to SNS, which fanned out to multiple SQS queues (inventory, payment, shipping, analytics). Due to a deployment that changed how SNS message IDs were generated, some events were delivered out of order — a \`ShipmentCreated\` event was consumed before the corresponding \`OrderPlaced\` event.

**Impact**: 30-minute period where approximately 2,000 orders were shipped before payment was processed. Payment failures for those orders had to be resolved manually — $250K+ in manual reconciliation and customer credits.

**Root cause**: SNS + SQS is at-least-once delivery with best-effort ordering. Events can be delivered out of order (SQS is a distributed queue with no strict ordering guarantees across messages). The shipping service assumed that if it received a \`ShipmentCreated\` event, the \`OrderPlaced\` and \`PaymentSucceeded\` events had already been processed. This assumption was false during the high-throughput Prime Day spike.

**Fix**:
1. Added a \`ExpectedPreviousEvents\` field to every event schema (list of event types that must be processed before this one).
2. Implemented an "Event Gate" in each consumer — a buffer that holds events until their prerequisites arrive.
3. For the shipping service specifically: added a check \`order.status === 'paid'\` before processing shipments. If not paid, the event is re-queued with a 5-second delay.
4. Long-term: migrated the order lifecycle to Kafka (ordered partitions per orderId) instead of SNS/SQS for the critical path.

**Lesson**: Event ordering guarantees matter — know what your broker guarantees. SNS/SQS provides no ordering (unless using SQS FIFO queues, which limit throughput to 300 TPS). Kafka provides per-partition ordering. Always design consumers to handle out-of-order events gracefully — never assume a prerequisite event was already delivered.
</Callout>

## 11. Production Implementation

### Terraform — Kafka Cluster and Topic

\`\`\`hcl
resource "confluent_kafka_cluster" "main" {
  display_name = "order-events-cluster"
  availability = "SINGLE_ZONE"
  cloud        = "AWS"
  region       = "us-east-1"

  dedicated {
    cku = 2
  }
}

resource "confluent_kafka_topic" "order_events" {
  kafka_cluster = confluent_kafka_cluster.main.id
  topic_name    = "order-events"
  partitions    = 6
  config = {
    "cleanup.policy"        = "delete"
    "retention.ms"          = "604800000"   # 7 days
    "retention.bytes"       = "1073741824"  # 1 GB per partition
    "min.insync.replicas"   = "2"
    "message.timestamp.type" = "LogAppendTime"
  }
}

resource "confluent_kafka_acl" "order_service_write" {
  kafka_cluster = confluent_kafka_cluster.main.id
  resource_type = "TOPIC"
  resource_name = confluent_kafka_topic.order_events.topic_name
  pattern_type  = "LITERAL"
  principal     = "User:order-service"
  host          = "*"
  operation     = "WRITE"
  permission    = "ALLOW"
}

resource "confluent_kafka_acl" "consumer_read" {
  for_each = toset(["email-service", "inventory-service", "payment-service"])
  kafka_cluster = confluent_kafka_cluster.main.id
  resource_type = "TOPIC"
  resource_name = confluent_kafka_topic.order_events.topic_name
  pattern_type  = "LITERAL"
  principal     = "User:\${each.value}"
  host          = "*"
  operation     = "READ"
  permission    = "ALLOW"
}
\`\`\`

### TypeScript — Kafka Producer with Schema Registry

\`\`\`typescript
import { Kafka, Producer } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

interface EventProducer {
  publish<T>(topic: string, event: T): Promise<void>;
}

class KafkaEventProducer implements EventProducer {
  private producer: Producer;
  private registry: SchemaRegistry;

  constructor() {
    const kafka = new Kafka({ brokers: process.env.KAFKA_BROKERS!.split(','), clientId: 'order-service' });
    this.producer = kafka.producer({ allowAutoTopicCreation: false, idempotent: true });
    this.registry = new SchemaRegistry({ host: process.env.SCHEMA_REGISTRY_URL! });
  }

  async publish<T>(topic: string, event: T, key?: string): Promise<void> {
    const eventWithMetadata = {
      ...event,
      eventId: crypto.randomUUID(),
      correlationId: key || crypto.randomUUID(),
      timestamp: Date.now(),
    };
    const schemaId = await this.registry.getLatestSchemaId(topic + '-value');
    const encodedValue = await this.registry.encode(schemaId, eventWithMetadata);
    await this.producer.send({
      topic,
      messages: [{ key: key || eventWithMetadata.eventId, value: encodedValue }],
    });
  }
}
\`\`\`

### TypeScript — Idempotent Consumer

\`\`\`typescript
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';

interface ProcessedEventRepository {
  isProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

class IdempotentConsumer {
  private consumer: Consumer;

  constructor(
    private groupId: string,
    private topic: string,
    private handler: (event: any) => Promise<void>,
    private processedRepo: ProcessedEventRepository
  ) {
    const kafka = new Kafka({ brokers: process.env.KAFKA_BROKERS!.split(','), clientId: groupId });
    this.consumer = kafka.consumer({ groupId, maxInFlightRequests: 10 });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const event = JSON.parse(payload.message.value!.toString());
        const eventId = event.eventId;

        // Check idempotency
        const alreadyProcessed = await this.processedRepo.isProcessed(eventId);
        if (alreadyProcessed) {
          console.log(\`Event \${eventId} already processed, skipping\`);
          return;
        }

        // Process with circuit breaker
        try {
          await this.handler(event);
          await this.processedRepo.markProcessed(eventId);
          console.log(\`Event \${eventId} processed successfully\`);
        } catch (err) {
          console.error(\`Failed to process event \${eventId}:\`, err);
          // After N failures, this message goes to DLQ
          // For now, we throw to trigger the consumer's retry mechanism
          throw err;
        }
      },
    });
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **Amazon**: AWS is built on EDA. S3 bucket events trigger Lambda functions. SNS fans out notifications to SQS, Lambda, HTTP endpoints, and email. EventBridge (formerly CloudWatch Events) provides a centralized event bus connecting 200+ AWS services and custom SaaS applications. The core e-commerce platform uses events for order lifecycle management.
- **Uber**: The entire trip lifecycle (from rider requesting a trip to driver completing it) is event-driven. Kafka handles 10M+ events/second. Each trip state transition (REQUESTED, DRIVER_ASSIGNED, ARRIVED, STARTED, COMPLETED, PAYMENT_PROCESSED) is a domain event. Services react — they don't orchestrate. Uber's "Ringpop" and "Dispatch Optimization" systems consume trip events for real-time matching.
- **Netflix**: Video processing pipeline is fully event-driven. When a video is uploaded, it triggers a chain: transcode → thumbnail generation → subtitle extraction → CDN distribution → content catalog update. Each stage publishes events that trigger the next. The "Manhattan" caching layer uses events for cache invalidation across regions. Netflix's event bus (now mostly Kafka + an internal abstraction called "Mantis") processes 1T+ events per day.
- **Shopify**: Webhook-based event system. Merchants can configure webhooks for order creation, product updates, and customer events. Shopify publishes to a configurable endpoint (HTTP, Google Pub/Sub, Amazon EventBridge). Over 1M webhooks per minute at peak. This enables the entire Shopify app ecosystem to react to store events.

## 13. Interview Playbook

**Q: "Design an event-driven order processing system."**
→ Open with: Use Kafka with the Outbox pattern for reliable publishing. Order Service publishes OrderPlaced → Inventory, Payment, Email, Analytics subscribe.
→ Cover: Each event goes to the \`order-events\` Kafka topic partitioned by \`orderId\` (ensures per-order ordering). Order Service uses transactional outbox: writes order + event in one DB transaction, an Outbox Relay publishes to Kafka. Each consumer is idempotent (checks event ID in its own DB before processing). Handle failures with retries + DLQ. Use Schema Registry for event versioning.
→ Depth signal: For the saga spanning multiple services, use choreography — each service publishes an event when its step completes. If Payment fails, it publishes \`PaymentFailed\`. Inventory subscribes to it and compensates (releases stock). This avoids a central orchestrator but makes the flow harder to trace. For high visibility, use an orchestration saga with a lightweight coordinator that tracks state in a saga log.

**Q: "How do you handle event schema evolution in an event-driven system?"**
→ Open with: Use a Schema Registry (Confluent Schema Registry for Avro/Protobuf) with compatibility checks.
→ Cover: Backward compatibility (new consumers can read old events) = adding optional fields, never removing or renaming. Forward compatibility (old consumers can read new events) = adding fields with defaults. The recommended strategy is \`BACKWARD_TRANSITIVE\` — new schema is backward-compatible with ALL previous versions.
→ Depth signal: Event versioning via "major.minor" in event metadata. For breaking changes, create a new topic (e.g., \`order-events-v2\`) and run both old and new consumers during migration. Never break existing consumers. Use the "tolerant reader" pattern — consumers should ignore unknown fields in events.

## 14. Concept Check Quiz

**Q1:** What is the Outbox pattern and what problem does it solve?**Answer:** Writing both the state change and the event in a single DB transaction. A relay reads the outbox table and publishes to the broker. This guarantees at-least-once delivery without distributed transactions.

**Q2:** What is idempotent event processing and why is it necessary?**Answer:** Processing the same event twice produces the same result. Necessary because brokers like Kafka guarantee at-least-once delivery — events can be re-delivered during network failures or consumer restarts.

**Q3:** What is the difference between Kafka topics and partitions?**Answer:** Topic = logical channel for events of a type. Partition = unit of parallelism and ordering within a topic. Events with the same key go to the same partition, which preserves their order. Partitions enable horizontal scaling (consumers read from different partitions in parallel).

**Q4:** What is a dead letter queue and when would you use it?**Answer:** A queue for events that failed processing after all retry attempts. Used to prevent a single bad event from blocking the consumer (poison pill) and to enable manual inspection/reprocessing of failed events.

## 15. Next Steps

- **CQRS** — Separating command and query responsibilities, often powered by events that sync the read model.
- **Event Sourcing** — Storing events as the primary data store instead of current state snapshots.
- **Saga Pattern** — Coordinating distributed transactions across services using compensating events.
- **Stream Processing** — Real-time event processing with Kafka Streams, Flink, or Spark Streaming for analytics, fraud detection, and ML feature engineering.`,
    estimatedMin: 17,
    difficulty: "ADVANCED" as const,
    companies: ["Amazon", "Uber", "Netflix", "Event-Driven", "Kafka"],
    tags: ["event-driven", "events", "kafka", "pub-sub", "event-bus", "async"],
  },

  {
    id: "lesson-06-05",
    slug: "architecture-patterns-05-cqrs",
    title: "CQRS (Command Query Responsibility Segregation)",
    content: `## 0. Mental Model

Picture a busy restaurant: the **waiter (command side)** takes orders from customers — each order is a command that changes the kitchen's state. The **menu board (query side)** displays what's available, updated separately from the order flow. In CQRS, commands write to one model (what the kitchen needs to execute) and queries read from another (what customers see). They operate independently, with their own optimized data structures.

## 1. Quick Summary

**CQRS (Command Query Responsibility Segregation)** is a pattern that separates **read operations** (queries) from **write operations** (commands). Instead of using a single model for both reads and writes — as in traditional CRUD — CQRS creates two distinct models. The **write model** is optimized for validation, business rules, and consistency. The **read model** is denormalized and optimized for fast retrieval, often cached or stored in a separate database. This separation enables independent scaling, different security policies, and optimized performance for each side. CQRS is frequently paired with **Event Sourcing** to persist the write side as an immutable event stream.

## 2. Definition & Terminology

**Command**: An imperative instruction to change state (e.g., \`PlaceOrder\`, \`UpdateInventory\`). Named with verbs in imperative mood. Returns success/failure, never data.

**Query**: A request to retrieve data without side effects (e.g., \`GetOrderById\`, \`SearchProducts\`). Never mutates state.

**Write Model**: The data structure on the command side. Normalized, enforces invariants, produces events. Often uses DDD aggregates.

**Read Model**: The data structure on the query side. Denormalized, pre-joined, cached. May use materialized views, Elasticsearch indexes, or Redis caches.

**Command Handler**: Processes a command, validates business rules, updates the write model, and publishes events.

**Query Handler**: Reads from the read model, returns data directly — no business logic.

**Projection**: A process that subscribes to events from the write side and updates the read model accordingly.

**Eventual Consistency**: The read model may lag behind the write model. Changes propagate asynchronously.

## 3. The Problem Without It

Traditional CRUD with a single model causes several problems at scale:

**Impedance Mismatch**: The same entity (e.g., Order) must serve both transactional writes and complex reads. Write-optimized normalization requires expensive joins for reads. Read-optimized denormalization makes writes complex and error-prone.

**Performance Conflicts**: Write-heavy operations need different indexing (B-tree, unique constraints) than read-heavy operations (full-text search, columnar scans). They compete for the same database resources.

**Scaling Conflict**: Writes demand strong consistency and ACID guarantees. Reads can tolerate eventual consistency with caching. A single model forces a one-size-fits-all consistency model.

**Security Coupling**: Commands and queries often need different authorization rules (e.g., any customer can query products, but only admins can update prices). A single model mixes these concerns.

**Team Coordination**: Read-heavy features (reporting dashboards) and write-heavy features (order processing) are developed by different teams but coupled to the same model, creating bottlenecks.

## 4. How It Works — Core Mechanics

**Command Flow**:
1. Client sends a **Command** (e.g., \`PlaceOrder { customerId, items }\`).
2. **Command Handler** receives the command.
3. Handler loads the **Write Model** (aggregate) from the write database.
4. Write Model validates business rules (stock available, payment valid, customer not blocked).
5. Write Model applies state changes and produces **Domain Events** (e.g., \`OrderPlaced\`).
6. Handler persists new state to the write database.
7. Handler publishes events to the **Event Bus**.

**Query Flow**:
1. Client sends a **Query** (e.g., \`GetOrderHistory { customerId }\`).
2. **Query Handler** receives the query.
3. Handler reads directly from the **Read Model** — no business validation, no aggregates.
4. Read Model may be a denormalized table, a cache key, or a search index.
5. Returns data to the client — fast, with minimal processing.

**Synchronization (Projection)** :
1. An event is published by the write side (e.g., \`OrderPlaced\`).
2. A **Projector** subscribes to the event.
3. Projector transforms the event data into the read model format.
4. Projector updates the read store (INSERT/UPDATE denormalized row, update cache, index document).
5. Synchronization can be synchronous (in-process, within milliseconds) or asynchronous (via message broker, seconds latency).

**Concurrency**: Optimistic locking on the write side using version numbers. The read side is eventually consistent — no locking needed.

## 5. Variants & Flavors

**Simple CQRS**: Separate command and query interfaces but share the same database. Commands go through the write path, queries use a read path with optimized queries. Minimal infrastructure.

**CQRS with Separate Databases**: Commands write to an OLTP database; queries read from a replica or a separate read-optimized store (Elasticsearch, Redis, columnar DB). Synchronization via events or CDC.

**CQRS with Event Sourcing**: The write model is an append-only event store. The current state is a projection of events. The read model is built by subscribing to the event stream. Full audit trail and temporal queries.

**CQRS with Materialized Views**: Commands update normalized tables. Background jobs or database triggers refresh materialized views that serve as the read model. No separate application service needed.

**CQRS with BFF (Backend for Frontend)** : Each client type (web, mobile, API partner) has its own read model optimized for its specific query patterns.

## 6. Performance Characteristics

**Read Performance**: Near-constant time. Read models are denormalized for specific query patterns — zero joins, pre-computed aggregations. Can be served from cache (Redis, CDN) for sub-millisecond response.

**Write Performance**: Commands are isolated transactional operations. No read workload contention. Write throughput scales independently of read traffic.

**Scaling**: Reads and writes scale independently. Add more read replicas or cache nodes without affecting write consistency. Write side can use smaller, consistency-focused instances.

**Latency**: Write-to-read propagation introduces a synchronization delay (milliseconds to seconds). The read model is eventually consistent with the write model.

**Throughput**: CQRS excels under asymmetric read/write ratios (e.g., 95% reads, 5% writes). Each side is independently optimized.

**Resource Utilization**: Better cache hit rates on read models. Write models stay small and focused. Reduced database connection contention.

## 7. Failure Modes

**Stale Read Data**: The read model lags behind the write model. A client reads old data immediately after a write. Mitigation: use synchronous projection for critical data, or design the UI to handle eventual consistency.

**Projection Failure**: If the projection pipeline fails, the read model becomes increasingly stale. Mitigation: monitor projection lag, implement dead-letter queues, alert on lag thresholds.

**Command Side Failure**: If the write database fails, no commands can be processed. Reads continue to work from the (potentially stale) read model. Mitigation: write-side failover, circuit breakers.

**Event Loss**: If the event bus drops events, the read model and write model permanently diverge. Mitigation: transactional outbox pattern, at-least-once delivery guarantees.

**Schema Drift**: The write model schema evolves but projections lag behind. Mitigation: versioned events, backward-compatible schema changes, upcasting.

**Double-Write During Migration**: When introducing CQRS, dual writes to old and new models can get out of sync. Mitigation: use the strangler fig pattern, validate parity between models.

## 8. Decision Framework

**Consider CQRS when:**
- Read and write workloads have significantly different patterns or volumes.
- The same data is queried in multiple different shapes (e.g., detail view vs. list view vs. search).
- Write operations involve complex business rules that would slow down simple reads.
- Different teams own read and write functionality.
- You need independent scaling for reads vs. writes.
- You are already using Event Sourcing (natural pairing).

**Avoid CQRS when:**
- The application is simple CRUD with minimal business logic.
- Strong consistency is required between reads and writes at all times.
- The team is small and the cognitive overhead of dual models is not justified.
- Single query pattern serves all use cases.
- Operational complexity of managing synchronization is not warranted.

**CQRS vs. Alternatives**:
- **CRUD**: Simpler, consistent, but conflates concerns. Choose for simple apps.
- **Read Replicas**: Database-level separation without application changes. Good for read scaling without full CQRS complexity.
- **Materialized Views**: Database-native read optimization. Less flexible than application-level CQRS.

## 9. Live Architecture Diagram

\`\`\`
CQRS Architecture (E-Commerce Order System):

  +------------+       +------------+       +------------+
  | Web Client |       | Mobile App |       | Admin UI   |
  +-----+------+       +-----+------+       +-----+------+
        |                     |                     |
  COMMANDS                  QUERIES               QUERIES
        |                     |                     |
        v                     v                     v
  +-----------+        +-------------+       +--------------+
  | POST      |        | GET         |       | GET          |
  | /orders   |        | /orders/:id |       | /orders/search|
  +-----+-----+        +------+------+       +------+-------+
        |                     |                      |
        v                     v                      v
  +---------------------------+----------------------+
  |          API Gateway / Router                    |
  +------+-----------------------------+-------------+
         |                             |
         v                             v
  +--------------+           +-------------------+
  | Command Bus  |           | Query Dispatcher  |
  +------+-------+           +---------+---------+
         |                             |
         v                             v
  +------------------+      +--------------------+
  | Write Model      |      | Read Models        |
  | (DDD Aggregates) |      |                    |
  |                  |      | +----------------+ |
  | Order Aggregate  |----->| | Postgres Read  | |
  | Payment Aggr.    |events| | (denormalized) | |
  | Inventory Aggr.  |      | +----------------+ |
  +--------+---------+      | +----------------+ |
           |                | | Elasticsearch  | |
           v                | | (full-text)    | |
  +------------------+      | +----------------+ |
  | Event Bus        |      | +----------------+ |
  | (Kafka / Rabbit) |----->| | Redis Cache    | |
  +------------------+      | +----------------+ |
                            +--------------------+

Data Flow:
  Command: POST /orders { items, customerId }
    -> Validate -> Aggregate.process() -> Save -> Publish OrderPlaced

  Query: GET /orders/123
    -> ReadModel.findById(123) -> Return denormalized order + customer + items

  Projection: OrderPlaced event
    -> Update read_orders table (denormalized)
    -> Index in Elasticsearch
    -> Invalidate relevant Redis cache keys
\`\`\`

## 10. Real Production Incident

**Incident**: "Double Booking Nightmare" at a major travel booking platform.

**Scenario**: A hotel booking platform used a single-model CRUD architecture. When two users tried to book the last room simultaneously, both requests succeeded because the read-check-then-write pattern had a race condition.

**Root Cause**: The read model (checking room availability) and the write model (booking the room) used the same database row. Between the SELECT (read) and the INSERT (write), both requests saw the room as available.

**CQRS Solution**: After migrating to CQRS:
1. The **command** side uses optimistic locking on the inventory aggregate with a version number.
2. The **read** model shows availability with eventual consistency — it may briefly show one more room than available.
3. When a booking command arrives, the aggregate checks real availability atomically.
4. If the room is already booked, the command fails, and the projection updates the read model.
5. The UI handles this by showing "Almost booked up!" and verifying on submit.

**Impact**: Zero double bookings after migration. Read model may briefly show stale availability, but the write side always enforces correctness.

**Lesson Learned**: Never trust the read model for write-side validation. Always validate business rules on the write side with proper concurrency control.

## 11. Production Implementation

### Step 1: Define Commands and Events

\`\`\`typescript
// Domain Events
interface DomainEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  timestamp: number;
  payload: unknown;
}

class OrderPlaced implements DomainEvent {
  eventId = crypto.randomUUID();
  eventType = 'OrderPlaced';
  timestamp = Date.now();
  constructor(
    public aggregateId: string,
    public payload: { customerId: string; items: Array<{ productId: string; quantity: number; price: number }>; total: number }
  ) {}
}
\`\`\`

### Step 2: Command Handler (Write Side)

\`\`\`typescript
class OrderCommandHandler {
  constructor(
    private orderRepository: OrderRepository,
    private eventBus: EventBus
  ) {}

  async handlePlaceOrder(command: { customerId: string; items: Array<{ productId: string; quantity: number }> }): Promise<string> {
    const order = OrderAggregate.create(crypto.randomUUID(), command.customerId);
    for (const item of command.items) {
      order.addItem(item.productId, item.quantity, 10); // price lookup
    }
    order.submit();
    const events = order.getUncommittedEvents();
    await this.orderRepository.save(order);
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    return order.id;
  }
}
\`\`\`

### Step 3: Query Handler (Read Side)

\`\`\`typescript
class OrderQueryHandler {
  constructor(private readDb: any) {}

  async getOrderDetail(orderId: string): Promise<OrderDetailDTO | null> {
    const row = await this.readDb.query(
      'SELECT id, customer_name, item_count, total, status, created_at FROM order_details WHERE id = $1',
      [orderId]
    );
    if (!row.rows[0]) return null;
    return row.rows[0];
  }

  async searchOrders(query: string, limit = 20): Promise<OrderDetailDTO[]> {
    const rows = await this.readDb.query(
      'SELECT id, customer_name, item_count, total, status, created_at FROM order_details WHERE search_vector @@ plainto_tsquery($1) LIMIT $2',
      [query, limit]
    );
    return rows.rows;
  }
}
\`\`\`

### Step 4: Projection

\`\`\`typescript
class OrderProjection {
  constructor(private readDb: any) {}

  async onOrderPlaced(event: OrderPlaced): Promise<void> {
    await this.readDb.query(
      \`INSERT INTO order_details (id, customer_name, item_count, total, status, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())\`,
      [event.aggregateId, event.payload.customerName,
       event.payload.items.length, event.payload.total, 'confirmed']
    );
    await this.readDb.query(
      \`UPDATE customer_summary SET order_count = order_count + 1, total_spent = total_spent + $1
       WHERE customer_id = $2\`,
      [event.payload.total, event.payload.customerId]
    );
  }
}
\`\`\`

## 12. Real Company Deep Dives

**Amazon**: Amazon's product catalog uses CQRS at massive scale. The **write model** handles inventory updates, pricing changes, and product metadata — these are transactional and consistent. The **read model** powers product search pages, detail pages, and recommendations — denormalized into hundreds of thousands of shards across DynamoDB and Elasticsearch. The synchronization pipeline processes millions of events per minute. Amazon's internal "Fiona" system is a CQRS framework used across the company.

**Uber**: Uber's trip lifecycle uses CQRS. The **command side** processes trip requests, driver assignments, fare calculations, and payments — each as a transactional command. The **read model** powers the rider app (driver location, ETA, trip history) and the driver app (nearby ride requests, earnings). The read models are served from Redis clusters optimized for low-latency geo-queries. Uber's platform team built a custom CQRS framework called "Schemaless" on top of MySQL.

**Microsoft (Docs)**: The Microsoft Docs platform uses CQRS extensively. The **write model** manages the content lifecycle: authoring, reviewing, publishing workflows. The **read model** serves HTML pages optimized for search indexing, with pre-rendered navigation and cross-references. The read model is deployed to a global CDN for sub-50ms page loads.

**Greg Young**: The creator of CQRS (coined the term in 2010) worked with numerous companies to implement CQRS systems. His company, Event Store Ltd, builds the EventStoreDB database optimized for CQRS and Event Sourcing patterns. His original blog post and NDC talks remain the definitive references.

**Event Store**: EventStoreDB is a database purpose-built for CQRS/Event Sourcing systems. It provides an append-only event store, built-in projections (read model builders), subscriptions, and optimistic concurrency control. Used by financial services, gaming companies, and enterprises worldwide.

## 13. Interview Playbook

**Q1: What is CQRS and what problem does it solve?**
*Framework*: Define CQRS as command-query separation. Reference the single-model problem: impedance mismatch, performance conflicts, scaling tension. State that CQRS decouples read and write models for independent optimization.

**Q2: Do you need separate databases for CQRS?**
*Framework*: Clarify that CQRS is about separate *models*, not necessarily separate *databases*. You can use the same database with different query patterns. Separate databases are an optimization for high-scale scenarios. Discuss the tradeoffs.

**Q3: How do you keep the read model in sync?**
*Framework*: Three approaches: (1) Event-driven projection — subscribe to events and update read model. (2) CDC-based — use Debezium or similar to capture write-side changes. (3) Batch/scheduled — periodic refresh. Discuss eventual consistency implications.

**Q4: What is the difference between CQRS and Event Sourcing?**
*Framework*: CQRS is about separating read and write *models*. Event Sourcing is about storing state as a sequence of *events*. They are orthogonal but complementary. CQRS works without Event Sourcing. Event Sourcing naturally pairs with CQRS (events are the write model).

**Q5: How do you handle eventual consistency in CQRS?**
*Framework*: Acknowledge that the read model may lag. Strategies: (1) Optimistic UI — show stale data, update when fresh. (2) Synchronous projection for critical reads. (3) Version headers so clients can detect staleness. (4) UI indicators ("last updated 2s ago").

**Q6: Design a CQRS-based e-commerce system.**
*Framework*: Define commands (PlaceOrder, UpdateInventory, ProcessPayment). Define queries (GetProductDetails, SearchProducts, OrderHistory). Map commands to write models (DDD aggregates). Map queries to read models (Elasticsearch for search, Postgres for order history, Redis for product details). Design projection pipeline (events -> multiple read model updates). Discuss failure handling, monitoring, and deployment.

## 14. Concept Check Quiz

1. What is the primary difference between CQRS and CRUD?
   - a) CQRS uses separate models for reads and writes ✓
   - b) CQRS requires a message broker
   - c) CQRS is always used with Event Sourcing
   - d) CQRS eliminates the need for a database

2. In CQRS, what is a Projection?
   - a) A database view
   - b) A process that updates the read model from events ✓
   - c) A command handler
   - d) A type of query

3. True or False: CQRS always requires separate databases for reads and writes.
   - False. CQRS separates models, not necessarily databases.

4. Which concurrency mechanism is most commonly used on the CQRS write side?
   - a) Pessimistic locking
   - b) Optimistic locking with version numbers ✓
   - c) No locking (eventual consistency)
   - d) Distributed locks

5. What is the main tradeoff of CQRS?
   - a) Slower reads
   - b) Eventual consistency between read and write models ✓
   - c) Cannot use SQL databases
   - d) Requires microservices

## 15. Next Steps

- **Event Sourcing**: Learn how to persist commands as an immutable event stream — the natural pair for CQRS.
- **CQRS with Event Sourcing**: Deep dive into combining both patterns for audit trails and temporal queries.
- **Transactional Outbox**: Reliable event publishing to ensure no events are lost between write model and projections.
- **Read Model Optimization**: Techniques for building fast, scalable read models with caching, denormalization, and indexing.
- **Projection Design**: Best practices for building maintainable, resilient projections that keep read models in sync.
- **Next Lesson**: Event Sourcing — how to store state as events and why it matters for distributed systems.`,
    estimatedMin: 16,
    difficulty: "ADVANCED" as const,
    companies: ["Greg Young", "Martin Fowler", "Amazon", "Uber", "Event Store"],
    tags: ["CQRS", "command-query", "segregation", "read-model", "write-model", "eventual-consistency"],
  },

  {
    id: "lesson-06-06",
    slug: "architecture-patterns-06-event-sourcing",
    title: "Event Sourcing",
    content: `## 0. Mental Model

Think of event sourcing like a **bank statement** versus a **balance**. The balance ($1,000) is the current state — useful but tells you nothing about how you got there. The statement is the sequence of every deposit, withdrawal, and fee — the events. With event sourcing, the statement IS the source of truth. The balance is derived by replaying the events. You can compute the balance at any point in history, audit every transaction, and detect errors by replaying from the beginning.

## 1. Quick Summary

**Event Sourcing** is a pattern where application state is stored as a sequence of **immutable events** in an **append-only log**, rather than storing the current state directly. The current state is derived by **replaying** all relevant events. This provides a **complete audit trail**, **temporal query capability** (state at any point in history), **debugging reproducibility**, and **natural event integration** for event-driven systems. Event sourcing is commonly paired with **CQRS** and is widely used in **banking**, **finance**, **audit systems**, and **supply chain** domains where change history is critical.

## 2. Definition & Terminology

**Event**: An immutable record of a fact that happened in the past. Named in past tense: \`OrderPlaced\`, \`PaymentReceived\`, \`InventoryReserved\`.

**Event Store**: An append-only database that stores events. Events are never modified or deleted — only appended.

**Aggregate**: A cluster of domain objects that are treated as a unit. Reconstructed by replaying events in order.

**Snapshot**: A saved state of an aggregate at a specific version. Used to avoid replaying the entire event stream on every load.

**Projection**: A read model built from the event stream. Subscribes to events and updates a denormalized view.

**Event Stream**: All events for a specific aggregate, ordered by version number.

**Rehydration**: The process of rebuilding an aggregate's current state by applying events in sequence.

**Catch-up Subscribe**: A subscriber that reads all historical events before subscribing to new events.

## 3. The Problem Without It

Traditional CRUD stores only the current state. This creates several critical gaps:

**Lost History**: When an account balance is $100, you don't know how it got there. Was $100 deposited? Was $200 deposited and $100 withdrawn? Was there an interest payment? The history is overwritten on every update.

**Audit Compliance**: Financial regulations (SOX, MiFID, GDPR) require immutable audit trails. CRUD's mutable state makes compliance difficult — you need additional audit tables and application-level logging.

**Debugging Blindness**: When a bug produces incorrect state (e.g., wrong order total), you can't reconstruct what led to it. The intermediate states are lost. You can't reproduce the exact sequence of operations.

**Temporal Blindness**: "What did the user see when they placed this order?" With CRUD, you can't answer this — the state has changed since then.

**Integration Poverty**: State changes should trigger events for other services. With CRUD, you need to explicitly publish events (dual-write problem), risking inconsistency.

**Eventual Consistency Woes**: In CRUD without events, synchronizing caches, search indexes, and other services requires ad-hoc mechanisms that drift over time.

## 4. How It Works — Core Mechanics

**Write Path**:
1. Application receives a command (e.g., \`DepositMoney\`).
2. Command handler loads the aggregate by replaying all existing events.
3. Handler validates business rules against the current state.
4. Handler creates one or more new events (e.g., \`MoneyDeposited\`).
5. Events are appended to the event store in a single transaction (atomic).
6. Concurrency check: the store verifies the expected version matches the last event version.

**Read Path (State Reconstruction)** :
1. Load all events for the aggregate, sorted by version.
2. Start with an empty aggregate instance.
3. Apply each event in order: \`aggregate.apply(event)\` modifies the aggregate's state.
4. After all events, the aggregate reflects the current state.

**Snapshot Optimization**:
1. After every N events (e.g., 100), save the state as a snapshot.
2. On load, read the latest snapshot first.
3. Then apply only events that occurred after the snapshot.
4. Reduces load time for aggregates with millions of events.

**Projection**:
1. Subscriber reads events from the event store (either polling or push).
2. For each event, the projection handler transforms the event data.
3. Handler updates the read model (database, cache, search index).
4. The read model is eventually consistent with the event store.

## 5. Variants & Flavors

**Pure Event Sourcing**: Every state change is an event. Current state is always derived by replaying all events. No separate state table. Strongest guarantees but highest storage cost.

**Snapshot-Based Event Sourcing**: Periodic snapshots of aggregate state. Events older than the snapshot are archived or deleted. Balances storage cost against replay performance.

**Hybrid (State + Events)** : A current state table is maintained alongside the event store. Reads go to the state table (fast). Events are used for audit, replay, and projections. Most practical approach.

**Event Sourcing with CQRS**: The event store IS the write model. Read models are built via projections. Commands produce events; queries read from projections. The canonical combination.

**Event Sourcing without CQRS**: Single model serves both reads and writes. Events are stored but current state is also stored and updated. Simpler but loses write-read separation benefits.

**CRDT-Based Event Sourcing**: Conflict-Free Replicated Data Types (e.g., Riak, Redis CRDTs). Events are designed to be commutative — order doesn't matter. Used in geo-distributed systems.

## 6. Performance Characteristics

**Write Performance**: Append-only writes are fast (sequential I/O, no locking on existing data). No UPDATE or DELETE statements. Write throughput can be very high (thousands to millions of events/second).

**Read Performance (State Load)** : Loading an aggregate requires replaying all events. Without snapshots, this is O(n) where n is the number of events. With snapshots, it's O(1) + O(snapshot frequency). For aggregates with long histories, snapshot is essential.

**Storage**: Event stores grow monotonically. Storage requirements are significantly higher than CRUD. Each update creates a new event rather than updating in place. Retention policies and snapshotting are essential.

**Projection Latency**: Events propagate to read models with latency (milliseconds to seconds). The system is eventually consistent by nature.

**Concurrency**: Optimistic locking with version numbers. High write contention (frequent updates to same aggregate) causes retries. Choose aggregate boundaries carefully.

**Scaling**: Event stores can partition by aggregate ID. Each partition is independent. Reads and projections can be distributed across multiple nodes.

## 7. Failure Modes

**Event Store Corruption**: If the event store is corrupted, ALL state is lost (events are the only source of truth). Mitigation: replicate event store, regular backups, immutable storage.

**Schema Evolution Failure**: When event schemas change, old events may be unreadable. Mitigation: never modify old events; use upcasting (transform old events on read), event versioning, or schema-on-read.

**Snapshot Inconsistency**: Snapshot state doesn't match replay of events. Mitigation: always validate snapshots against replay. Regenerate snapshots periodically.

**Concurrency Conflicts**: Multiple writers to the same aggregate cause version conflicts. Mitigation: retry logic, command idempotency, appropriate aggregate granularity.

**Projection Drift**: A projection crashes and misses events. The read model becomes stale. Mitigation: checkpoint-based restart, catch-up subscription, dead-letter queues.

**Event Duplication**: Network issues cause the same event to be appended twice. Mitigation: idempotent event IDs, deduplication in projections.

**Storage Growth**: Unbounded event growth causes performance degradation. Mitigation: snapshot archiving, event retention policies, compaction.

**GDPR Conflict**: The right to erasure contradicts immutable event stores. Mitigation: encrypt PII in events, use key rotation to "forget", or store PII separately from the event stream.

## 8. Decision Framework

**Consider Event Sourcing when:**
- Audit trail is required by regulation or business policy.
- You need to know the state of the system at any point in time.
- Debugging involves reproducing past states and operations.
- You are already using CQRS (natural pairing).
- The domain naturally produces events (order processing, banking, logistics).
- Multiple read models need to be built from the same data.

**Avoid Event Sourcing when:**
- The application is simple CRUD with no audit requirements.
- Storage costs are a primary concern (events grow without bound).
- Strong consistency is required and complex aggregates need fast loading.
- The team is not experienced with event-driven patterns.
- GDPR right to erasure is a hard requirement and cannot be worked around.

**Alternatives**:
- **Audit Tables**: Simpler approach for audit-only requirements. Events stored alongside mutable state.
- **Change Data Capture (CDC)** : Capture changes from existing CRUD databases as an event stream. Less invasive than full event sourcing.
- **Temporal Tables**: Database-native time-travel queries (e.g., PostgreSQL with \`tsrange\`). Limited to database-level state.

## 9. Live Architecture Diagram

\`\`\`
Event Sourcing Architecture:

  +----------+     +------------+     +-----------+
  | Client   |     | Admin      |     | Reporting |
  | (Commands)|    | (Queries)  |     | (Queries) |
  +----+-----+     +-----+------+     +-----+-----+
       |                 |                  |
       v                 v                  v
  +----------------------------------------------+
  |           Application Layer                   |
  +-------+-------------+----------------+--------+
          |             |                |
          v             v                v
  +--------------+  +---------+  +---------------+
  | Command Bus  |  | Event   |  | Query Handler |
  +------+-------+  | Store   |  +-------+-------+
         |          | (Write) |          |
         |          +----+----+          |
         |               |               |
         v               v               v
  +----------------------------------------------+
  |           Event Store (Append-Only Log)       |
  |                                                |
  |  +----+-------+-------+------+-------+-------+ |
  |  | v1 | Event | State |  v2 | Event | State | |
  |  +----+-------+-------+-----+-------+-------+ |
  |  | v3 | Event | State | ... |       |       | |
  |  +----+-------+-------+-----+-------+-------+ |
  +-------------------+---------------------------+
                      |
                      | (Projections)
                      v
  +----------------------------------------------+
  |           Projection Pipeline                 |
  |  +----------+  +----------+  +----------+    |
  |  |Order     |  |Search    |  |Analytics |    |
  |  |Projection|  |Projection|  |Projection|    |
  |  +----------+  +----------+  +----------+    |
  +------+-------------+-------------+-----------+
         |             |             |
         v             v             v
  +----------+  +------------+  +----------+
  |Postgres  |  |Elastic     |  |Redshift  |
  |Read Model|  |search Index|  |Analytics |
  +----------+  +------------+  +----------+

Aggregate Rehydration:
  1. Load snapshot (if exists)     -> Account(version=50, balance=400)
  2. Load events after snapshot    -> [v51:Deposited, v52:Withdrawn]
  3. Apply events to snapshot      -> Account(version=52, balance=450)
  4. Return aggregate ready for commands

Event Store Table:
  +--------+--------------+----------------+------------------+---------+-----------+
  | seq_no | aggregate_id | event_type     | event_data (JSON)| version | timestamp |
  +--------+--------------+----------------+------------------+---------+-----------+
  | 1      | acc-123      | AccountOpened  | {owner:Alice,...} | 1       | 10:00:00  |
  | 2      | acc-123      | MoneyDeposited | {amount:500,...}  | 2       | 10:05:00  |
  | 3      | acc-123      | MoneyWithdrawn | {amount:100,...}  | 3       | 10:30:00  |
  +--------+--------------+----------------+------------------+---------+-----------+
\`\`\`

## 10. Real Production Incident

**Incident**: "The $37 Million Ghost" at a fintech company.

**Scenario**: A payment processing platform used traditional CRUD for transaction records. A software bug caused certain refund transactions to silently fail — the refund was marked as "processed" in the database, but the actual money transfer never happened. The error wasn't detected for three months.

**Root Cause**: The transaction status was overwritten multiple times during the payment lifecycle. When the refund pipeline crashed mid-flow, the database showed "refunded" but the actual payment never occurred. With CRUD, there was no way to see the sequence of intermediate states.

**Event Sourcing Solution**: The company migrated to event sourcing:
1. Every state transition became an event: \`PaymentInitiated\`, \`PaymentAuthorized\`, \`PaymentSettled\`, \`RefundInitiated\`, \`RefundFailed\`, \`RefundCompleted\`.
2. The current state was derived by replaying events, NOT by trusting a status column.
3. A monitoring projection detected payments stuck in intermediate states for too long.
4. An audit projection allowed investigators to see exactly what happened in each transaction.

**Impact**: The company detected 847 similar ghost transactions within 24 hours of deploying event sourcing. Total exposure was $4.2M, caught before additional losses. The immutable event log became the source of truth for all financial reporting.

**Lesson Learned**: Mutable status fields are dangerous. With event sourcing, every state change is recorded immutably, making it impossible to lose the intermediate history needed for debugging and audit.

## 11. Production Implementation

### Step 1: Event Definitions

\`\`\`typescript
interface Event {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  data: Record<string, unknown>;
  version: number;
  timestamp: number;
  eventId: string;
}

// Type-safe events
class AccountOpened implements Event {
  readonly aggregateType = 'bank-account';
  readonly eventType = 'AccountOpened';
  readonly eventId = crypto.randomUUID();
  readonly timestamp = Date.now();
  constructor(
    public readonly aggregateId: string,
    public readonly version: number,
    public readonly data: { owner: string; initialBalance: number }
  ) {}
}

class MoneyDeposited implements Event {
  readonly aggregateType = 'bank-account';
  readonly eventType = 'MoneyDeposited';
  readonly eventId = crypto.randomUUID();
  readonly timestamp = Date.now();
  constructor(
    public readonly aggregateId: string,
    public readonly version: number,
    public readonly data: { amount: number; description: string }
  ) {}
}
\`\`\`

### Step 2: Aggregate (State Builder)

\`\`\`typescript
class BankAccountAggregate {
  private balance = 0;
  private owner = '';
  private version = 0;
  private uncommittedEvents: Event[] = [];

  constructor(public readonly id: string) {}

  // Rehydration: apply event to build state
  applyEvent(event: Event): void {
    switch (event.eventType) {
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
    this.version = event.version;
  }

  // Business logic: produce events from commands
  deposit(amount: number, description: string): void {
    if (amount <= 0) throw new Error('Deposit must be positive');
    this.balance += amount;
    this.version++;
    this.uncommittedEvents.push(
      new MoneyDeposited(this.id, this.version, { amount, description })
    );
  }

  withdraw(amount: number, description: string): void {
    if (amount <= 0) throw new Error('Withdrawal must be positive');
    if (this.balance < amount) throw new Error('Insufficient funds');
    this.balance -= amount;
    this.version++;
    this.uncommittedEvents.push(
      new MoneyWithdrawn(this.id, this.version, { amount, description })
    );
  }

  getUncommittedEvents(): Event[] { return this.uncommittedEvents; }
  getVersion(): number { return this.version; }
  getBalance(): number { return this.balance; }
}
\`\`\`

### Step 3: Event Store

\`\`\`typescript
interface EventStore {
  loadEvents(aggregateId: string): Promise<Event[]>;
  appendEvents(aggregateId: string, events: Event[], expectedVersion: number): Promise<void>;
  subscribe(eventTypes: string[], handler: (event: Event) => Promise<void>): void;
}

class PostgresEventStore implements EventStore {
  constructor(private pool: any) {}

  async loadEvents(aggregateId: string): Promise<Event[]> {
    const result = await this.pool.query(
      'SELECT * FROM events WHERE aggregate_id = $1 ORDER BY version ASC',
      [aggregateId]
    );
    return result.rows.map(this.rowToEvent);
  }

  async appendEvents(aggregateId: string, events: Event[], expectedVersion: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Check concurrency
      const latest = await client.query(
        'SELECT MAX(version) as max_ver FROM events WHERE aggregate_id = $1',
        [aggregateId]
      );
      const currentVersion = latest.rows[0].max_ver || 0;
      if (currentVersion !== expectedVersion) {
        throw new Error(\`Concurrency conflict: expected \${expectedVersion}, got \${currentVersion}\`);
      }
      // Append events
      for (const event of events) {
        await client.query(
          \`INSERT INTO events (aggregate_id, aggregate_type, event_type, data, version, timestamp, event_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)\`,
          [event.aggregateId, event.aggregateType, event.eventType,
           JSON.stringify(event.data), event.version, new Date(event.timestamp), event.eventId]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  // subscribe implementation omitted for brevity
  subscribe(eventTypes: string[], handler: (event: Event) => Promise<void>): void {}
  private rowToEvent(row: any): Event { return row; }
}
\`\`\`

## 12. Real Company Deep Dives

**Event Store Ltd (Greg Young)** : The company founded by Greg Young, creator of Event Sourcing and CQRS. EventStoreDB is a database purpose-built for event sourcing: append-only event storage, built-in projections, competing consumers, and subscription mechanisms. Used by financial services, gaming, and IoT companies. The database handles billions of events for some customers.

**LMAX Exchange**: Built the LMAX Disruptor — one of the highest-throughput trading platforms in the world. LMAX uses event sourcing for the entire trading lifecycle: order placement, matching, execution, settlement. All state is derived from events. The Disruptor pattern (ring buffer) came from the need for ultra-low-latency event processing. Achieves 6 million orders per second on a single thread.

**Axoni**: Enterprise blockchain and event sourcing platform for financial services. Axoni's event-sourced state machines handle post-trade processing, derivatives clearing, and syndicated loans. Major Wall Street banks use Axoni's event sourcing for immutable, auditable transaction processing.

**Banking Systems (Core Banking Platforms)** : Many modern core banking platforms (Thought Machine, Mambu, Finacle) use event sourcing for the general ledger. All transactions (deposits, withdrawals, fees, interest) are events. The account balance is a projection. This provides regulators with full audit trails and enables real-time fraud detection.

**Git**: Git is fundamentally an event-sourced system. Commits are immutable events. Branches are projections (pointers to specific commits). The repository state is derived by replaying commits. \`git rebase\` creates new events (doesn't modify old ones). \`git reflog\` is the audit trail of all operations. This analogy helps developers understand event sourcing intuitively.

## 13. Interview Playbook

**Q1: What is event sourcing and how is it different from CRUD?**
*Framework*: Define event sourcing as storing state as a sequence of events rather than the current state. Contrast CRUD (UPDATE overwrites history) with event sourcing (APPEND preserves history). Highlight audit, temporal queries, and debugging as key benefits.

**Q2: How do you handle concurrency in an event-sourced system?**
*Framework*: Optimistic locking with version numbers. When appending events, check that the last event version matches the expected version. If not, retry. Discuss aggregate sizing — smaller aggregates reduce contention.

**Q3: What are snapshots and when are they needed?**
*Framework*: Snapshots are saved states at specific versions. They avoid replaying the entire event stream on every aggregate load. Needed when aggregates have thousands of events. Discuss snapshot frequency (every N events), storage strategy, and regeneration.

**Q4: How does event sourcing relate to CQRS?**
*Framework*: They are orthogonal but complementary. Event sourcing is about storage (events as source of truth). CQRS is about separation (different models for reads and writes). Together: event store is the write model, projections build the read models.

**Q5: How do you handle event schema evolution?**
*Framework*: Three strategies: (1) Upcasting — transform old events to new schema when loading. (2) Versioned events — each event type has a version, support multiple versions. (3) New event types — create new event types for new behaviors, old events remain unchanged.

**Q6: Design an event-sourced banking system.**
*Framework*: Define events (AccountOpened, Deposited, Withdrawn, InterestCredited, FeeCharged). Define aggregates (BankAccount). Implement event store (PostgreSQL append-only table). Design snapshots for accounts with many transactions. Build projections (ledger projection, balance projection, monthly statement projection). Discuss regulatory compliance, concurrency, and disaster recovery.

## 14. Concept Check Quiz

1. What is the fundamental difference between event sourcing and CRUD?
   - a) Event sourcing is faster
   - b) Event sourcing stores events (not current state) as the source of truth ✓
   - c) Event sourcing requires a different database
   - d) Event sourcing cannot be used with SQL

2. What is a snapshot used for in event sourcing?
   - a) Taking a screenshot of the database
   - b) Reducing replay time by saving intermediate state ✓
   - c) Compressing events
   - d) Deleting old events

3. True or False: In event sourcing, you can determine the state of an aggregate at any point in history.
   - True. By replaying events up to a specific version or timestamp.

4. Which concurrency control mechanism is used in event sourcing?
   - a) Pessimistic locking
   - b) Optimistic locking with version checking ✓
   - c) No concurrency control
   - d) Distributed locks

5. What is the main challenge with event sourcing regarding data privacy regulations (GDPR)?
   - a) Events cannot be replicated
   - b) Immutable event store conflicts with the right to erasure ✓
   - c) Events cannot be encrypted
   - d) No challenge exists

## 15. Next Steps

- **CQRS with Event Sourcing**: How to combine event sourcing with CQRS for maximum benefit.
- **Transactional Outbox**: Reliable event publishing to ensure no events are lost from the write side.
- **Event Versioning & Upcasting**: Managing schema evolution in long-lived event stores.
- **Projection Design**: Building efficient, maintainable read models from event streams.
- **Event Store Optimization**: Partitioning, archiving, and snapshot strategies for production-scale event sourcing.
- **Next Lesson**: Saga Pattern — managing distributed transactions across microservices with compensating actions.`,
    estimatedMin: 17,
    difficulty: "ADVANCED" as const,
    companies: ["Greg Young", "Event Store", "Amazon", "Uber", "Banking"],
    tags: ["event-sourcing", "events", "audit-log", "event-store", "rebuild", "projection"],
  },

  {
    id: "lesson-06-07",
    slug: "architecture-patterns-07-saga-pattern",
    title: "Saga Pattern (Distributed Transactions)",
    content: `## 0. Mental Model

Imagine a **travel booking workflow**: book a flight (step 1), reserve a hotel (step 2), rent a car (step 3). If the car rental fails, you need to cancel the hotel and flight — but those are already confirmed. You can't roll back like a database transaction. A **Saga** is a sequence of local transactions where each step has a **compensating action** that semantically undoes it. It's like booking travel with cancellation policies: each booking is real, but you have a plan to cancel everything if the full itinerary can't be completed.

## 1. Quick Summary

The **Saga Pattern** manages **distributed transactions** across multiple services by breaking them into a sequence of **local ACID transactions**, each with a corresponding **compensating transaction**. If any step fails, the saga runs compensating actions in reverse order to undo the partial work. Unlike **Two-Phase Commit (2PC)** which holds locks and blocks, sagas commit each step immediately and use compensation for rollback. There are two main implementations: **choreography** (decentralized, each service reacts to events) and **orchestration** (a central coordinator directs the flow). Sagas provide **eventual consistency** with **high availability** and are the standard approach for distributed transactions in microservices.

## 2. Definition & Terminology

**Saga**: A sequence of local transactions where each step has a compensating transaction. If a step fails, compensating transactions are run in reverse.

**Local Transaction**: A complete ACID transaction within a single service/database. Not visible to other services until committed.

**Compensating Transaction**: A new transaction that semantically reverses the effects of a previous local transaction. It is NOT a rollback — the original transaction is already committed and visible.

**Choreography-based Saga**: Each service publishes events after its local transaction. Other services subscribe to events and react. No central coordinator.

**Orchestration-based Saga**: A central **orchestrator** tells each service what to do, tracks state, and issues compensating actions on failure. The orchestrator is a state machine.

**Saga State Machine**: The orchestrator maintains the state of the saga (pending, running, completed, failed, compensating).

**Idempotency**: The property that an operation can be safely retried without changing the outcome beyond the first successful execution.

**Pivot Transaction**: The point in a saga where compensating becomes impossible — once this step commits, the saga must complete forward. Typically the last step.

## 3. The Problem Without It

In a monolithic application with a single database, ACID transactions guarantee atomicity across all operations. In microservices, each service owns its own database:

**No Cross-Service ACID**: A business operation spans multiple services (order -> payment -> inventory -> shipping). No single transaction can cover all of them.

**Partial Failure**: If the payment succeeds but inventory reservation fails, the customer is charged for an order that can't be fulfilled. This is inconsistent.

**Distributed Transaction Complexity**: Without sagas, developers build ad-hoc rollback logic that is error-prone, untested, and inconsistent.

**Two-Phase Commit (2PC) Problems**: 2PC coordinates distributed transactions but introduces blocking locks, reduced availability, and doesn't scale well. It's also not suitable for long-running transactions (minutes or hours, like travel booking).

**Data Inconsistency**: Without coordinated rollback, services can permanently diverge: payment says charged, inventory says not reserved, order says confirmed.

## 4. How It Works — Core Mechanics

**Choreography Saga Flow**:
1. Order Service creates an order (local transaction) and publishes \`OrderCreated\`.
2. Payment Service subscribes to \`OrderCreated\`, charges the card (local transaction), publishes \`PaymentCharged\`.
3. Inventory Service subscribes to \`PaymentCharged\`, reserves items (local transaction), publishes \`InventoryReserved\`.
4. Shipping Service subscribes to \`InventoryReserved\`, creates shipment (local transaction), publishes \`OrderShipped\`.
5. Saga complete. Each step is committed independently.
6. Failure: If Payment fails, it publishes \`PaymentFailed\`. Order Service subscribes and cancels the order (compensation). No inventory or shipping steps execute.

**Orchestration Saga Flow**:
1. **Orchestrator** creates a saga instance with unique ID.
2. Orchestrator sends \`CreateOrder\` command to Order Service.
3. Order Service creates order (pending status), returns success.
4. Orchestrator sends \`ChargePayment\` command to Payment Service.
5. Payment Service charges card, returns success.
6. Orchestrator updates saga state to track progress.
7. Orchestrator sends \`ReserveInventory\` command. If this fails:
   a. Orchestrator sends \`CancelOrder\` to Order Service (compensate step 2).
   b. Orchestrator sends \`RefundPayment\` to Payment Service (compensate step 4).
   c. Saga status: failed.
8. If all steps succeed: orchestrator sends \`ConfirmOrder\` — the pivot transaction that finalizes the saga.

**State Management**: The orchestrator persists saga state to a database. If the orchestrator crashes, it can resume from the last persisted state.

## 5. Variants & Flavors

**Choreography Saga**: Events flow between services. Each service knows only its own responsibility and the next step. Advantages: decentralized, no single point of failure, simple for linear workflows. Disadvantages: hard to track overall state, cyclic dependencies possible, complex error handling across many services.

**Orchestration Saga**: Central coordinator manages all steps. Advantages: clear workflow visibility, easier error handling and monitoring, centralized state management. Disadvantages: single point of failure (orchestrator), orchestrator can become a bottleneck, tighter coupling to the orchestrator.

**Orchestration with State Machine**: The orchestrator is a state machine with defined states and transitions. Each step moves to the next state. Compensation steps are reverse transitions. This is the most robust approach for complex workflows.

**Saga with Event Sourcing**: Saga events (StepStarted, StepCompleted, StepFailed, Compensating) are stored in an event store. The saga state is derived by replaying events. Provides full audit trail for the saga lifecycle.

**Saga with Transactional Outbox**: Each step uses the transactional outbox pattern to reliably publish saga events. Ensures at-least-once delivery of saga events without dual-write problems.

**Distributed Saga (Nested Sagas)** : A saga step can itself be a saga. Used for complex workflows with sub-processes (e.g., a "Book Vacation" saga that contains "Book Flight", "Book Hotel", "Book Car" sub-sagas).

## 6. Performance Characteristics

**Latency**: Saga operations are asynchronous. Total latency is the sum of all sequential steps plus network overhead. Choreography sagas may add event bus latency per hop. Orchestration sagas have orchestrator processing overhead per step.

**Throughput**: Sagas scale well because each step commits immediately (no long-held locks). Throughput is limited by the slowest service and the event bus/orchestrator capacity.

**Resource Utilization**: No blocking locks (unlike 2PC). Resources are released after each local transaction commits. However, compensating transactions consume additional resources.

**Concurrency**: High concurrency possible. Multiple sagas can run in parallel affecting different aggregates. Contention only occurs at the aggregate level (e.g., inventory reservation for the same product).

**Failure Recovery**: Recovery time depends on the failure detection mechanism. Polling-based detection has inherent latency. Event-driven detection is faster. Compensating transactions run asynchronously and may take significant time.

## 7. Failure Modes

**Orchestrator Crash**: The orchestrator fails mid-saga. Uncommitted in-flight steps are lost. The saga may be in an inconsistent state. Mitigation: persist saga state after each step; on restart, resume from the last checkpoint.

**Step Idempotency Failure**: A step executes twice due to retry, causing duplicate effects (e.g., double charge). Mitigation: make all saga steps idempotent using request IDs and deduplication.

**Compensation Failure**: A compensating transaction fails. The saga cannot fully roll back. Mitigation: retry compensation with backoff, use dead-letter queues for manual intervention.

**Uncompensatable Step**: Some operations cannot be compensated (e.g., sending an email, printing a shipping label). Mitigation: only perform uncompensatable actions as the pivot transaction (the last step).

**Event Loss**: In choreography sagas, an event is lost, and the saga stalls. Mitigation: transactional outbox pattern, event bus with persistence, timeout monitors.

**Timeout / Slow Step**: A step takes too long. The saga is blocked waiting for a response. Mitigation: set timeouts on saga steps, use asynchronous callbacks, implement saga timeout with automatic compensation.

**Data Inconsistency (Non-Atomic Compensation)** : Compensation starts but another saga reads intermediate data. The system is temporarily inconsistent. Mitigation: design compensations to be atomic, use versioning to detect stale state.

## 8. Decision Framework

**Consider Sagas when:**
- A business process spans multiple services/databases.
- Long-running transactions (minutes to hours) are needed.
- High availability is required — blocking locks (2PC) are unacceptable.
- Eventual consistency is acceptable for the business process.
- Each step can be compensated independently.

**Prefer Orchestration when:**
- The workflow is complex with many steps and branches.
- You need centralized monitoring and control.
- Error handling logic is intricate.
- The team needs clear visibility into the saga state.

**Prefer Choreography when:**
- The workflow is simple and linear.
- You want to avoid a central coordinator bottleneck.
- Services are independently owned by different teams.
- Adding new steps should not require modifying existing services.

**Avoid Sagas when:**
- Strong consistency is required (use 2PC or distributed locking instead).
- Steps cannot be compensated.
- The business process is a single-service operation (use local ACID).
- The team lacks experience with eventual consistency patterns.

**Saga vs. 2PC**:
- **2PC**: Strong consistency, blocking, short-lived, lower availability. Use for short, critical transactions that must be strongly consistent.
- **Saga**: Eventual consistency, non-blocking, long-running, high availability. Use for long-running business processes across services.

## 9. Live Architecture Diagram

\`\`\`
Orchestration Saga (E-Commerce Order):

  +------------------------------------------------------+
  |              Saga Orchestrator                        |
  |  +---------+  +----------+  +---------+  +---------+ |
  |  |Step 1   |  |Step 2    |  |Step 3   |  |Step 4   | |
  |  |Create   |->|Charge    |->|Reserve  |->|Confirm  | |
  |  |Order    |  |Payment   |  |Inventory|  |Order    | |
  |  +---------+  +----------+  +---------+  +---------+ |
  |       |            |            |            |        |
  |       |  FAIL ->   v            v            v        |
  |       |    +-----------------------+                  |
  |       |    |  Compensation Chain  |                  |
  |       +<---|  CancelOrder         |<-----------------+
  |            |  RefundPayment       |<-----------------+
  |            |  ReleaseInventory    |<-----------------+
  |            +-----------------------+                  |
  +------------------------------------------------------+
         |            |            |            |
         v            v            v            v
  +----------+  +----------+  +----------+  +----------+
  | Order    |  | Payment  |  |Inventory |  | Shipping |
  | Service  |  | Service  |  | Service  |  | Service  |
  +----------+  +----------+  +----------+  +----------+
       |             |             |             |
  +----------+  +----------+  +----------+  +----------+
  | Order DB |  |Payment DB|  |  Inv DB  |  | Ship DB  |
  +----------+  +----------+  +----------+  +----------+

Choreography Saga:
  +----------+    +----------+    +----------+    +----------+
  | Order    |    | Payment  |    |Inventory |    | Shipping |
  | Service  |    | Service  |    | Service  |    | Service  |
  +----+-----+    +----+-----+    +-----+----+    +-----+----+
       |               |                |               |
       |--OrderCreated->|               |               |
       |               |--PaymentDone-->|               |
       |               |                |--ItemsReserved|
       |               |                |               |--Shipped
       |               |                |               |
  (Each service publishes events and subscribes to events)

Orchestrator State Machine:
  +----------+     +----------+     +----------+     +----------+
  | PENDING  |---->| ORDERED  |---->| CHARGED  |---->| RESERVED |
  +----------+     +----------+     +----------+     +----------+
       |                |                |                |
       | (any failure)  | (cancel order) | (refund)      | (release)
       v                v                v                v
  +----------------------------------------------------------+
  |                    COMPENSATING                           |
  +----------------------------------------------------------+
       |
       v
  +----------+
  |  FAILED  |
  +----------+
\`\`\`

## 10. Real Production Incident

**Incident**: "The Double Charge Black Friday" at a major e-commerce company.

**Scenario**: During Black Friday, the order system used choreography sagas. Customer Alice placed an order for $299. The Payment Service charged her card successfully and published \`PaymentCharged\`. But the Inventory Service was under heavy load and processing was delayed.

**Root Cause**: Alice's browser timed out and she clicked "Place Order" again. The Order Service created a second order. Payment Service charged her card TWICE ($598 total). Meanwhile, the Inventory Service finally processed both reservations. Alice received two orders and was double-charged.

**The Saga Failure**: The choreography saga had no idempotency at the order level. The Order Service did not detect duplicate order requests. The Payment Service had no idempotency key to prevent double charges. The saga continued forward because both individual orders were valid.

**Solution after migration to orchestration with idempotency**:
1. Each order request includes an idempotency key (client-generated UUID).
2. The orchestrator checks the idempotency key before processing. Duplicate requests return the existing order ID.
3. Payment Service uses the idempotency key to ensure each charge is processed exactly once.
4. Orchestrator adds a timeout: if the entire saga doesn't complete in 5 minutes, it automatically compensates.
5. Dashboard monitors all active sagas with alerts for stalled or slow workflows.

**Impact**: After implementing idempotency keys and orchestration, double charges dropped to zero. The company also added a "pending" state visible to the user to prevent confusion during processing.

**Lesson Learned**: Idempotency is not optional in sagas. Every step must be idempotent. Sagas without idempotency guarantees will eventually cause data corruption under load.

## 11. Production Implementation

### Step 1: Orchestrator with State Machine

\`\`\`typescript
enum SagaState {
  PENDING = 'PENDING',
  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_CHARGED = 'PAYMENT_CHARGED',
  INVENTORY_RESERVED = 'INVENTORY_RESERVED',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  FAILED = 'FAILED',
}

interface SagaInstance {
  sagaId: string;
  state: SagaState;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

class SagaOrchestrator {
  constructor(
    private sagaStore: SagaStore,
    private orderService: OrderServiceClient,
    private paymentService: PaymentServiceClient,
    private inventoryService: InventoryServiceClient
  ) {}

  async createOrderSaga(command: { customerId: string; items: Array<{ productId: string; quantity: number }> }): Promise<string> {
    const sagaId = crypto.randomUUID();
    const saga: SagaInstance = {
      sagaId,
      state: SagaState.PENDING,
      data: { customerId: command.customerId, items: command.items },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.sagaStore.save(saga);

    // Execute saga steps asynchronously
    this.executeSaga(saga).catch(err => console.error(\`Saga \${sagaId} failed:\`, err));
    return sagaId;
  }

  private async executeSaga(saga: SagaInstance): Promise<void> {
    try {
      // Step 1: Create Order
      const orderId = await this.orderService.createOrder(
        { customerId: saga.data.customerId, items: saga.data.items },
        saga.sagaId
      );
      saga.data.orderId = orderId;
      saga.state = SagaState.ORDER_CREATED;
      await this.sagaStore.update(saga);

      // Step 2: Charge Payment
      const total = this.calculateTotal(saga.data.items);
      const paymentId = await this.paymentService.charge(
        { customerId: saga.data.customerId, amount: total },
        saga.sagaId
      );
      saga.data.paymentId = paymentId;
      saga.state = SagaState.PAYMENT_CHARGED;
      await this.sagaStore.update(saga);

      // Step 3: Reserve Inventory
      await this.inventoryService.reserve(
        { items: saga.data.items, orderId },
        saga.sagaId
      );
      saga.state = SagaState.INVENTORY_RESERVED;
      await this.sagaStore.update(saga);

      // Step 4: Complete
      await this.orderService.confirmOrder(orderId, saga.sagaId);
      saga.state = SagaState.COMPLETED;
      await this.sagaStore.update(saga);

    } catch (err) {
      await this.compensateSaga(saga);
    }
  }

  private async compensateSaga(saga: SagaInstance): Promise<void> {
    saga.state = SagaState.COMPENSATING;
    await this.sagaStore.update(saga);

    // Compensate in reverse order
    const compensations: Array<() => Promise<void>> = [];

    if (saga.data.paymentId) {
      compensations.push(() => this.paymentService.refund(
        { paymentId: saga.data.paymentId as string },
        saga.sagaId
      ));
    }
    if (saga.data.orderId) {
      compensations.push(() => this.orderService.cancelOrder(
        saga.data.orderId as string,
        saga.sagaId
      ));
    }

    for (const compensate of compensations) {
      try { await compensate(); }
      catch (err) { console.error(\`Compensation failed for saga \${saga.sagaId}:\`, err); }
    }

    saga.state = SagaState.FAILED;
    await this.sagaStore.update(saga);
  }

  private calculateTotal(items: any[]): number {
    return items.reduce((sum: number, item: any) => sum + item.quantity * 10, 0);
  }
}
\`\`\`

### Step 2: Idempotent Service Client

\`\`\`typescript
class PaymentServiceClient {
  constructor(private http: any) {}

  async charge(request: { customerId: string; amount: number }, idempotencyKey: string): Promise<string> {
    const response = await this.http.post('/payments/charge', {
      ...request,
      idempotencyKey,
    }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return response.data.paymentId;
  }

  async refund(request: { paymentId: string }, idempotencyKey: string): Promise<void> {
    await this.http.post('/payments/refund', {
      ...request,
      idempotencyKey: \`\${idempotencyKey}-refund\`,
    });
  }
}
\`\`\`

## 12. Real Company Deep Dives

**eBay**: eBay was an early pioneer of the saga pattern. Their architecture handles millions of transactions (auctions, Buy It Now, bidding) across distributed services. eBay uses choreography sagas with a custom event bus. The saga pattern was first described in a 1987 paper by Hector Garcia-Molina and Kenneth Salem, but eBay's architects independently rediscovered and popularized it for microservices in the 2000s.

**Amazon (AWS Step Functions)** : AWS Step Functions is a managed saga orchestrator at cloud scale. Developers define workflows as JSON state machines with steps (tasks, choices, parallel branches, wait states). Step Functions automatically handles retries, error handling, and compensation. It's used by thousands of companies for order processing, media transcoding, data pipelines, and business process automation. AWS' own internal services use Step Functions for coordination.

**Netflix (Conductor)** : Netflix built Conductor, a microservices orchestrator that supports saga patterns. Conductor manages workflows with millions of executions per day. It provides a UI for visualizing workflow execution, monitoring, and debugging. Conductor supports async tasks, system tasks, and sub-workflows for nested sagas. Netflix uses it for video processing pipeline: ingest -> transcode -> thumbnail -> package -> CDN deploy.

**Uber (Cadence)** : Cadence is a workflow orchestration engine built by Uber (now donated to the CNCF). It supports saga patterns with fault-tolerant execution, state persistence, and automatic retries. Cadence workflows can run for years (e.g., subscription management). Uber uses Cadence for trip lifecycle, driver onboarding, payment reconciliation, and fraud detection. "Caitie McCaffrey" (Uber engineer) gave prominent talks on saga patterns at Uber.

**Caitie McCaffrey**: A distributed systems engineer who worked at Microsoft (Halo), Twitter, and Uber. Her talks on "Applied Distributed Transactions" and "Saga Pattern" are canonical references. She emphasized practical saga implementation patterns, idempotency, and the importance of compensating transactions.

## 13. Interview Playbook

**Q1: Compare choreography vs orchestration sagas. When would you use each?**
*Framework*: Contrast decentralized (choreography) vs centralized (orchestration). Choreography: simpler for linear flows, event-driven, harder to debug. Orchestration: easier monitoring, state management, suitable for complex workflows. Recommendation: start with orchestration for clarity, use choreography for simple event chains.

**Q2: What is a compensating transaction? How is it different from a rollback?**
*Framework*: Compensating transaction is a NEW transaction that semantically reverses a previous one. It's NOT a rollback (the original is already committed). Example: \`CancelOrder\` compensates \`CreateOrder\`. Difference: rollback restores previous state (magically); compensation applies a new operation that results in equivalent state.

**Q3: How does saga differ from Two-Phase Commit (2PC)?**
*Framework*: Saga is eventually consistent, non-blocking, high availability, suitable for long-running txns. 2PC is strongly consistent, blocking (locks held during prepare phase), lower availability. Saga commits each step immediately. 2PC holds resources until coordinator decides.

**Q4: How do you handle idempotency in saga steps?**
*Framework*: Each request carries an idempotency key (UUID). Services store processed keys. Duplicate requests with the same key return the previous result without re-executing. Discuss example: payment charge with idempotency key prevents double charges on retry.

**Q5: What happens if the orchestrator crashes mid-saga?**
*Framework*: Orchestrator persists saga state after each step (database). On restart, it loads all sagas in progress. Recover by re-sending pending commands or checking status of already-issued commands (idempotency helps here). Saga state machine makes recovery deterministic.

**Q6: Design a saga for a travel booking system.**
*Framework*: Define saga steps: Book Flight -> Book Hotel -> Book Car -> Reserve Activity. Define compensations: Cancel Flight, Cancel Hotel, Cancel Car, Cancel Activity. Handle edge cases: flight booked but hotel full, car rental unavailable. Use orchestration with state machine. Compensations may have time windows (non-refundable after 24h). Discuss pivot transaction (when compensation becomes impossible).

## 14. Concept Check Quiz

1. What is the key difference between a saga and a traditional ACID transaction?
   - a) Saga is faster
   - b) Saga commits each step immediately and uses compensation for rollback ✓
   - c) Saga uses a single database
   - d) Saga does not support rollback

2. In choreography-based sagas, how do services coordinate?
   - a) A central coordinator sends commands
   - b) Services communicate directly via events ✓
   - c) A shared database is used
   - d) Services poll each other

3. True or False: A compensating transaction is the same as a database rollback.
   - False. A compensating transaction is a NEW transaction that reverses the effects. A rollback reverts the uncommitted transaction.

4. What is the purpose of an idempotency key in saga steps?
   - a) To encrypt data
   - b) To ensure duplicate requests don't cause duplicate effects ✓
   - c) To compress messages
   - d) To authenticate users

5. What is the pivot transaction in a saga?
   - a) The first step
   - b) The step where compensation becomes impossible ✓
   - c) The compensating transaction
   - d) The last successful transaction

## 15. Next Steps

- **Transactional Outbox**: Reliable event publishing for saga steps — ensures no events are lost between services.
- **CQRS with Sagas**: Combining sagas with CQRS for write-side consistency and read-side optimization.
- **Saga Monitoring & Observability**: Tracking saga state, latency, and failures across distributed services.
- **Idempotency Patterns**: Deep dive into designing idempotent APIs and services for safe retries.
- **Compensation Design**: Best practices for designing effective compensating transactions.
- **Next Lesson**: Transactional Outbox Pattern — solving the dual-write problem for reliable event publishing.`,
    estimatedMin: 16,
    difficulty: "ADVANCED" as const,
    companies: ["eBay", "Amazon", "Netflix", "Uber", "Caitie McCaffrey"],
    tags: ["saga-pattern", "distributed-transactions", "compensation", "orchestration", "choreography"],
  },

  {
    id: "lesson-06-08",
    slug: "architecture-patterns-08-transactional-outbox",
    title: "Transactional Outbox Pattern",
    content: `## 0. Mental Model

Think of the **transactional outbox** as a **mailbox inside your house**. When you decide to send a letter, you don't walk out in the rain to the post office immediately. Instead, you put the letter in your mailbox (the outbox) — which is inside your house, protected. Later, a mail carrier (the relay) picks up letters from the mailbox and delivers them. If the mail carrier is delayed, your letters are safe inside. If you need to add another letter, it goes in the same mailbox. The key insight: putting the letter in the mailbox is part of the same atomic action as writing it.

## 1. Quick Summary

The **Transactional Outbox** pattern solves the **dual-write problem**: how to atomically update a database AND publish an event to a message broker. Instead of publishing events directly (which risks inconsistency if the broker is down), the service writes the event to an **outbox table** within the **same database transaction** as the state change. A separate **message relay** process (polling or CDC-based) reads from the outbox and publishes events to the broker. This guarantees **at-least-once delivery** without distributed transactions. The outbox is foundational for reliable **event-driven architectures**, **CQRS projections**, **saga coordination**, and **any system where database changes must trigger events**.

## 2. Definition & Terminology

**Dual-Write Problem**: The challenge of atomically updating a database and sending a message to a broker. Traditional approaches risk inconsistency if one operation succeeds and the other fails.

**Outbox Table**: A database table within the service's schema that stores events to be published. Typically contains: \`id\`, \`aggregate_id\`, \`aggregate_type\`, \`event_type\`, \`payload\` (JSON), \`status\`, \`created_at\`.

**Message Relay**: A background process that reads pending events from the outbox table, publishes them to the message broker, and marks them as published.

**Polling Relay**: The relay periodically queries the outbox table for pending events. Simple but adds latency between event creation and publication.

**CDC Relay (Change Data Capture)** : Uses database replication logs (PostgreSQL WAL, MySQL binlog) to capture outbox inserts in real time. Lower latency, no polling overhead. Debezium is the most popular CDC tool.

**Idempotent Consumer**: A consumer that can safely process the same event multiple times without causing duplicate side effects. Essential because the outbox provides at-least-once delivery.

**Dead Letter Queue (DLQ)** : A queue for events that repeatedly fail to publish. Allows manual intervention without blocking the relay.

## 3. The Problem Without It

Consider an order service that needs to save an order and publish an \`OrderPlaced\` event:

**Direct Publishing (Dual-Write)** :
\`\`\`
1. INSERT INTO orders ... (succeeds)
2. kafka.publish('OrderPlaced', data) (fails — Kafka is down)
Result: Order saved but event never published. Downstream services (inventory, email, analytics) never know.
\`\`\`

**Publish First, Then Update** :
\`\`\`
1. kafka.publish('OrderPlaced', data) (succeeds)
2. INSERT INTO orders ... (fails — database constraint violation)
Result: Event published for an order that doesn't exist. Downstream services see phantom orders.
\`\`\`

**Distributed Transaction (2PC)** :
\`\`\`
1. BEGIN distributed transaction
2. INSERT INTO orders ... (database)
3. kafka.publish(...) (broker)
4. COMMIT
Result: Works but requires 2PC support (rare in message brokers), holds locks, reduces availability.
\`\`\`

**No Solution in Simple Code** : These failure modes are universal. Without the outbox pattern, every event-driven system is at risk of lost or phantom events. The outbox makes event publishing reliable by using the database's own ACID guarantees.

## 4. How It Works — Core Mechanics

**Write Path (Application)** :
1. Begin database transaction.
2. Perform business operation: INSERT/UPDATE/DELETE on business tables (e.g., \`orders\`).
3. INSERT into outbox table: \`(aggregate_id, event_type, payload, status='pending', created_at)\`.
4. Commit transaction.
5. If any step fails before commit, the entire transaction rolls back. The event is never written.
6. The outbox record and the business data are atomically committed.

**Read Path (Polling Relay)** :
1. Relay polls: \`SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT batch_size FOR UPDATE SKIP LOCKED\`.
2. For each event:
   a. Attempt to publish to message broker (Kafka, RabbitMQ, SQS).
   b. On success: \`UPDATE outbox SET status = 'published' WHERE id = ?\`.
   c. On failure: retry with exponential backoff. After max retries: \`UPDATE outbox SET status = 'failed'\`.
3. Periodically clean up published and failed events after retention period.

**Read Path (CDC Relay)** :
1. Debezium (or similar CDC tool) connects to the database's replication log.
2. When the outbox table receives an INSERT, the CDC tool captures the change.
3. CDC tool publishes the event directly to the message broker (Kafka, Pulsar).
4. No polling, no database query overhead, sub-second latency.
5. The CDC tool manages offsets, restart position, and exactly-once/at-least-once semantics.

**Reliability Guarantees**:
- At-least-once delivery: If the relay crashes after publishing but before marking as published, the event is republished.
- Consumers must be idempotent to handle duplicates.
- No at-most-once delivery: events are never lost.

## 5. Variants & Flavors

**Polling-Based Outbox**: Simplest implementation. A background worker polls the outbox table. Advantages: no additional infrastructure, works with any database. Disadvantages: polling latency (configurable, typically 100ms-1s), database load from polling, race conditions if multiple relay instances run.

**CDC-Based Outbox (Debezium)** : Uses change data capture. Debezium connects to database replication logs and streams all changes. Advantages: real-time (sub-second latency), no database polling overhead, offset management built-in. Disadvantages: requires Debezium infrastructure (Kafka Connect, Kafka cluster), more complex to operate.

**Hybrid Outbox**: Combine polling for initial delivery with CDC for real-time. Polling as fallback if CDC is delayed. Provides reliability and low latency.

**Outbox with Transactional Log Tailing**: Directly read from the database transaction log (PostgreSQL WAL, MySQL binlog). Similar to CDC but implemented in application code. Avoids Debezium dependency but is database-specific.

**Outbox with Materialized Queue**: Use the outbox table both as event storage and as a queue for the relay. Advanced implementations use partition-based ordering for ordered event delivery.

**Outbox with Cloud Services (DynamoDB Streams, Change Streams)** : DynamoDB Streams, MongoDB Change Streams, Postgres LISTEN/NOTIFY provide built-in CDC-like mechanisms. The stream IS the outbox relay.

## 6. Performance Characteristics

**Write Latency**: Adding an outbox INSERT within the same transaction adds negligible overhead (microseconds). The transaction size increases but the cost is minimal compared to the business operation.

**Publication Latency (Polling)** : Configurable polling interval. Typical: 100ms-1s. Lower intervals increase database load. For latency-critical systems, CDC is preferred.

**Publication Latency (CDC)** : Nearly real-time. Debezium captures changes within milliseconds of commit. Total end-to-end latency < 100ms in most configurations.

**Throughput**: Highly scalable. The outbox table is append-mostly. Polling uses \`SELECT ... FOR UPDATE SKIP LOCKED\` to avoid contention. CDC-based relays scale independently of database load.

**Database Impact**: Polling adds read load to the database (periodic \`SELECT\` queries). For high-throughput systems (10K+ events/sec), CDC is gentler on the database. The outbox table grows over time and requires periodic cleanup or archiving.

**Scaling**: Multiple relay instances can process events in parallel using partition-based strategies. CDC relays scale with Kafka consumer groups.

## 7. Failure Modes

**Relay Crash After Publish, Before Status Update**: The event is published but not marked as 'published'. On restart, the relay republishes it. Consumer sees a duplicate. Mitigation: idempotent consumers, deduplication by event ID.

**Outbox Table Full**: If cleanup is not configured, the outbox table grows unbounded, degrading query performance. Mitigation: partition outbox table, schedule archiving of processed events, use TTL-based cleanup.

**Database Transaction Rollback**: If the business operation fails after the outbox INSERT (within the same transaction), both are rolled back. This is correct behavior — the event is never written.

**Broker Unavailability**: The relay retries publishing with backoff. Events accumulate in the outbox table. Mitigation: configure circuit breakers, alert on high pending count, use DLQ for events that exceed retry limits.

**Duplicate Events Across Restarts**: Without exactly-once semantics, the relay may publish an event multiple times after a crash. Mitigation: idempotent consumers are mandatory. Track processed event IDs in the consumer.

**CDC Lag**: Debezium may lag behind if Kafka Connect is overloaded. Events are delayed but not lost. Mitigation: monitor CDC lag metrics, provision adequate Kafka Connect capacity.

**Schema Changes**: Altering the outbox table (adding columns) must be backward-compatible. Old events in the table have old schema. Mitigation: version the payload, handle graceful schema evolution.

## 8. Decision Framework

**Consider Transactional Outbox when:**
- You need to publish events reliably after database state changes.
- The service cannot tolerate lost events under any circumstances.
- You are building event-driven microservices, CQRS projections, or sagas.
- You need at-least-once delivery guarantees.
- The message broker cannot participate in distributed transactions.

**Choose Polling Relay when:**
- Infrastructure is simple (one database, one service).
- Publication latency of 100ms-1s is acceptable.
- You want to avoid adding Kafka Connect / Debezium to the stack.
- The team is familiar with SQL-based queue patterns.

**Choose CDC Relay (Debezium) when:**
- Sub-second publication latency is required.
- Database polling load is a concern at scale.
- You already have Kafka infrastructure.
- You need exactly-once source semantics (offset management).

**Avoid Transactional Outbox when:**
- Eventual consistency and occasional event loss are acceptable.
- The system is a simple CRUD app with no event-driven requirements.
- You can use a message broker that supports transactions spanning brokers and databases (rare).
- Latency requirements demand direct publishing (and you accept the risk).

**Alternatives**:
- **Direct Publish**: Simple but unreliable. Acceptable for non-critical events.
- **Event Sourcing**: Events are the source of truth, not a derived side effect. Solves dual-write fundamentally.
- **Two-Phase Commit**: Works but adds complexity and reduces availability. Overkill for event publishing.
- **Polling for Changes**: Read-side services poll the database for changes. Simple but wastes resources and adds latency.

## 9. Live Architecture Diagram

\`\`\`
Transactional Outbox Architecture:

  Service A                    Database                     Relay                    Broker
     |                           |                          |                        |
     |-- BEGIN ---------------->|                          |                        |
     |-- INSERT order ---------->|                          |                        |
     |-- INSERT outbox_event --->|  (same transaction)      |                        |
     |-- COMMIT ---------------->|                          |                        |
     |                           |                          |                        |
     |                           |    (Polling Relay)       |                        |
     |                           |<--- SELECT WHERE ---------|                       |
     |                           |     status='pending'     |                        |
     |                           |     FOR UPDATE SKIP LOCKED                       |
     |                           |                          |                        |
     |                           |                          |--- PUBLISH event ----->|
     |                           |                          |<--- ACK --------------|
     |                           |<--- UPDATE status -------|                        |
     |                           |     ='published'         |                        |
     |                           |                          |                        |
     |                     OR                               |                        |
     |                           |    (CDC Relay - Debezium)|                        |
     |                           |                          |                        |
     |  [INSERT into outbox]     |-- Wal/Log ------------>| Debezium                |
     |                           |   (replication log)     |--- PUBLISH to Kafka -->|
     |                           |                          |                        |


Outbox Table Schema:
  +----+------------+--------------+------------+------------------+-----------+-----------+
  | id | aggregate  | aggregate    | event_type | payload (JSON)   | status    | created   |
  |    | _id        | _type        |            |                  |           | _at       |
  +----+------------+--------------+------------+------------------+-----------+-----------+
  | 1  | ord-123    | order        | Order      | {"orderId":123,  | pending   | 10:00:01  |
  |    |            |              | Placed     |  "total":99.99}  |           |           |
  +----+------------+--------------+------------+------------------+-----------+-----------+
  | 2  | ord-456    | order        | Order      | {"orderId":456,  | published | 10:00:02  |
  |    |            |              | Placed     |  "total":49.99}  |           |           |
  +----+------------+--------------+------------+------------------+-----------+-----------+

Status values: 'pending' -> 'published' -> (archived/deleted)
                'pending' -> 'failed' (after max retries)
\`\`\`

## 10. Real Production Incident

**Incident**: "The Missing Orders" at an online food delivery platform.

**Scenario**: A food delivery platform used direct event publishing after database writes. Every time a customer placed an order, the order was saved to PostgreSQL, and then an event was published to RabbitMQ for downstream services (restaurant notification, delivery assignment, payment processing).

**Root Cause**: During a Flash Sale event, RabbitMQ experienced a connection storm. Thousands of order requests arrived simultaneously. The order service saved orders to PostgreSQL successfully, but the RabbitMQ connection pool was exhausted. Events failed to publish with "connection refused" errors. The code caught the exception and logged it, but did NOT retry or roll back the order. Result: 2,347 orders were saved but never processed. Restaurants never received them. Customers paid but never got food.

**The Scale**: 2,347 lost orders in 3 minutes. $47,000 in chargebacks and customer credits. Reputation damage from 2+ hour delivery delays for orders that were eventually manually recovered from database logs.

**Solution with Transactional Outbox**:
1. Added an \`outbox\` table to the order service database.
2. Modified the order placement code: save order + insert outbox event in the same PostgreSQL transaction.
3. Deployed a polling relay (Go service) that reads from the outbox table every 200ms.
4. Added monitoring: alert if pending events exceed 100 or the relay lag exceeds 5 seconds.
5. Added dead-letter queue for events that fail after 10 retries.

**Impact**: After migration, zero events were lost. During the next flash sale (5x normal traffic), the outbox handled the load perfectly. Events accumulated briefly during a broker blip but were published once RabbitMQ recovered. The relay processed 850 events/second without breaking a sweat.

**Lesson Learned**: Direct event publishing is unreliable under load. The transactional outbox pattern provides a buffer between the application and the broker, absorbing broker outages and traffic spikes without data loss.

## 11. Production Implementation

### Step 1: Outbox Table Schema (PostgreSQL)

\`\`\`typescript
-- Outbox table for reliable event publishing
CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX idx_outbox_status_created ON outbox (status, created_at)
  WHERE status = 'pending';
\`\`\`

### Step 2: Service with Transactional Outbox

\`\`\`typescript
import { v4 as uuid } from 'uuid';

class OrderService {
  constructor(private db: any) {}

  async placeOrder(command: { customerId: string; items: Array<{ productId: string; quantity: number; price: number }> }): Promise<string> {
    const orderId = uuid();
    const total = command.items.reduce((s, i) => s + i.price * i.quantity, 0);

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 1. Business operation
      await client.query(
        \`INSERT INTO orders (id, customer_id, total, status, created_at)
         VALUES ($1, $2, $3, 'confirmed', NOW())\`,
        [orderId, command.customerId, total]
      );

      // 2. Outbox event (same transaction!)
      await client.query(
        \`INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, payload, status)
         VALUES ($1, 'order', $2, 'OrderPlaced', $3, 'pending')\`,
        [uuid(), orderId, JSON.stringify({ orderId, customerId: command.customerId, total })]
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
\`\`\`

### Step 3: Polling Relay

\`\`\`typescript
class OutboxRelay {
  private running = false;

  constructor(
    private db: any,
    private publisher: { publish: (topic: string, event: any) => Promise<void> },
    private config: { pollIntervalMs: number; batchSize: number; maxRetries: number }
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
      // Fetch pending events with row-level locking
      const result = await this.db.query(
        \`SELECT * FROM outbox
         WHERE status = 'pending'
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED\`,
        [this.config.batchSize]
      );

      for (const event of result.rows) {
        try {
          const topic = this.getTopicForEvent(event.event_type);
          await this.publisher.publish(topic, {
            eventId: event.id,
            eventType: event.event_type,
            aggregateId: event.aggregate_id,
            aggregateType: event.aggregate_type,
            data: event.payload,
            timestamp: event.created_at,
          });

          await this.db.query(
            \`UPDATE outbox SET status = 'published', published_at = NOW()
             WHERE id = $1\`,
            [event.id]
          );
        } catch (err: any) {
          const retryCount = event.retry_count + 1;
          if (retryCount >= this.config.maxRetries) {
            await this.db.query(
              \`UPDATE outbox SET status = 'failed', retry_count = $1, last_error = $2
               WHERE id = $3\`,
              [retryCount, err.message, event.id]
            );
          } else {
            await this.db.query(
              \`UPDATE outbox SET retry_count = $1, last_error = $2
               WHERE id = $3\`,
              [retryCount, err.message, event.id]
            );
          }
        }
      }
    } catch (err) {
      console.error('Outbox relay polling error:', err);
    }

    setTimeout(() => this.poll(), this.config.pollIntervalMs);
  }

  private getTopicForEvent(eventType: string): string {
    // Map event types to Kafka topics
    const topicMap: Record<string, string> = {
      'OrderPlaced': 'orders',
      'PaymentProcessed': 'payments',
      'InventoryReserved': 'inventory',
    };
    return topicMap[eventType] || 'events';
  }
}
\`\`\`

### Step 4: Idempotent Consumer

\`\`\`typescript
class OrderConsumer {
  private processedEvents = new Set<string>();

  constructor(private db: any) {
    // Load already-processed event IDs on startup
    this.loadProcessedEvents();
  }

  async handleOrderPlaced(event: any): Promise<void> {
    // Deduplication check
    if (this.processedEvents.has(event.eventId)) {
      console.log(\`Skipping duplicate event: \${event.eventId}\`);
      return;
    }

    // Process event
    await this.updateInventory(event.data);
    await this.sendEmail(event.data);

    // Mark as processed
    await this.db.query(
      'INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [event.eventId]
    );
    this.processedEvents.add(event.eventId);
  }

  private async loadProcessedEvents(): Promise<void> {
    const result = await this.db.query('SELECT event_id FROM processed_events');
    result.rows.forEach((row: any) => this.processedEvents.add(row.event_id));
  }

  private async updateInventory(data: any): Promise<void> { /* ... */ }
  private async sendEmail(data: any): Promise<void> { /* ... */ }
}
\`\`\`

## 12. Real Company Deep Dives

**Amazon**: Amazon's DynamoDB Streams is essentially a managed transactional outbox. Every write to a DynamoDB table generates a stream record. These records are published in near-real-time to Lambda functions, Kinesis, or other consumers. Amazon's internal services use DynamoDB Streams as the backbone for event-driven architectures. The outbox pattern is deeply embedded in AWS infrastructure (S3 Event Notifications, SNS, EventBridge).

**Uber (Schemaless)** : Uber built "Schemaless", a scalable MySQL-based document store that serves as their transactional outbox for hundreds of services. Each service writes state changes and events together. A dedicated relay reads from all Schemaless shards and publishes to Kafka. Uber processes billions of events per day through this system. The outbox is central to Uber's trip lifecycle, payment processing, and real-time logistics.

**Netflix**: Netflix uses the transactional outbox pattern for their video processing pipeline. When a video is uploaded, the metadata and processing events are stored in a Cassandra-based outbox. A relay (called "Zuel") reads pending events and triggers the video processing workflow (transcode, thumbnail, CDN deploy). The outbox ensures no uploaded video is ever lost, even if the processing pipeline is temporarily unavailable.

**Eventuate Tram**: Eventuate Tram is an open-source framework for transactional messaging in microservices. It provides outbox-based event publishing for Java and .NET applications. Eventuate uses both polling and CDC-based relays. It also supports saga orchestration built on top of the outbox pattern. Used by enterprises for event-driven microservices on Spring Boot and Micronaut.

**Debezium (Red Hat)** : Debezium is the most popular open-source CDC tool, and the transactional outbox pattern is its primary use case. Debezium connects to PostgreSQL, MySQL, MongoDB, SQL Server, Oracle, and DB2. It captures INSERTs to the outbox table and streams them to Kafka with sub-second latency. Debezium handles schema evolution, offset management, and exactly-once semantics. Thousands of companies use Debezium for outbox-based event publishing in production.

## 13. Interview Playbook

**Q1: What is the dual-write problem in event-driven systems?**
*Framework*: Define dual-write as the problem of atomically updating a database and publishing a message. Show two failure modes: (1) DB succeeds + publish fails = event lost, (2) publish succeeds + DB fails = phantom event. Conclude that distributed transactions across DB and broker are impractical at scale.

**Q2: How does the transactional outbox pattern solve the dual-write problem?**
*Framework*: The outbox stores events in the same database transaction as the business data. The database's ACID guarantees ensure both are committed or both are rolled back. A separate relay reads from the outbox and publishes to the broker asynchronously. The relay provides at-least-once delivery via retries and status tracking.

**Q3: Compare polling-based vs CDC-based outbox relays.**
*Framework*: Polling is simpler but has higher latency (configurable polling interval) and adds database load (polling queries). CDC (Debezium) is lower latency, doesn't query the database, but requires more infrastructure (Debezium, Kafka Connect, Kafka). Use polling for simplicity (<1s latency acceptable), CDC for real-time requirements.

**Q4: What happens if the relay publishes an event but crashes before marking it as published?**
*Framework*: The event remains in 'pending' status. On restart, the relay will republish it. This means at-least-once delivery — consumers will see duplicates. Mitigation: idempotent consumers that deduplicate by event ID.

**Q5: How do you handle idempotency in outbox consumers?**
*Framework*: Store processed event IDs in a database (or use idempotency keys). Before processing an event, check if the event ID has already been processed. If yes, skip. Use ON CONFLICT DO NOTHING in PostgreSQL for atomic deduplication.

**Q6: What are the operational considerations for outbox table cleanup?**
*Framework*: Published events accumulate. Implement cleanup strategies: (1) DELETE published events after TTL (e.g., 7 days). (2) Partition outbox by date, drop old partitions. (3) Archive to cold storage for audit trail. Monitor pending event count to detect relay failures.

**Q7: Design a transactional outbox system for an e-commerce platform.**
*Framework*: Define outbox table schema. Show order placement with outbox INSERT in same transaction. Design polling relay with configurable interval, batch size, and retry logic. Add monitoring (pending event count, relay lag, failure rate). Implement idempotent consumers with deduplication. Plan for cleanup and archiving.

## 14. Concept Check Quiz

1. What is the dual-write problem?
   - a) Writing to two databases simultaneously
   - b) The challenge of atomically updating the database AND publishing an event ✓
   - c) Writing duplicate events to a queue
   - d) Writing the same data twice

2. How does the transactional outbox pattern ensure reliable event publishing?
   - a) By using a separate event database
   - b) By storing events in the same database transaction as the business data ✓
   - c) By retrying until the broker acknowledges
   - d) By using two-phase commit

3. True or False: The transactional outbox provides exactly-once delivery guarantees.
   - False. It provides at-least-once delivery. Consumers must deduplicate.

4. What is the purpose of \`SELECT ... FOR UPDATE SKIP LOCKED\` in the polling relay?
   - a) To speed up the query
   - b) To lock pending events and avoid duplicate processing by multiple relay instances ✓
   - c) To skip corrupted events
   - d) To order events by creation time

5. Which tool is most commonly used for CDC-based outbox relay?
   - a) Apache Kafka
   - b) Debezium ✓
   - c) RabbitMQ
   - d) Redis

## 15. Next Steps

- **Idempotent Consumer Patterns**: Deep dive into deduplication techniques for at-least-once delivery systems.
- **CDC with Debezium**: Hands-on guide to setting up Debezium for transactional outbox in production.
- **Outbox vs. Event Sourcing**: Compare both patterns as approaches to reliable event storage and publishing.
- **Saga Pattern**: How the transactional outbox enables reliable saga step execution.
- **CQRS Projections**: Building read model projections on top of outbox-delivered events.
- **Next Lesson**: API Composition vs Aggregator Pattern.`,
    estimatedMin: 14,
    difficulty: "ADVANCED" as const,
    companies: ["Amazon", "Uber", "Netflix", "Event-Driven", "Outbox"],
    tags: ["transactional-outbox", "outbox-pattern", "dual-write", "change-data-capture", "debezium"],
  },

{
    id: "lesson-06-09",
    slug: "architecture-patterns-09-api-composition-aggregator",
    title: "API Composition vs Aggregator Pattern",
    content: `## 0. Mental Model

> API Composition is like a **personal shopper** who visits multiple stores (services) on your behalf and brings back a single bag with everything you ordered. The Aggregator Pattern is like a **warehouse** that pre-stocks popular combinations — you walk in, grab a pre-assembled package, and leave immediately. The shopper (composer) makes multiple trips in real-time; the warehouse (aggregator) does the work in advance so your pickup is instant.

## 1. Quick Summary

- **API Composition** = A service/gateway calls multiple downstream services and merges responses into one. Simple, real-time, but adds N+1 latency.
- **Aggregator Pattern** = A dedicated service pre-joins data from multiple sources into a denormalized store. Clients query the aggregator directly with zero fan-out.
- **API Composition** is best for low-frequency reads where data freshness matters (order detail page).
- **Aggregator** is best for high-frequency reads where latency matters (product listing, search).
- **GraphQL** is a modern API composition framework — resolvers fetch data from different services per field.
- **Aggregator + CQRS** is a common pairing: the aggregator becomes the read model, built from domain events.
- Both patterns coexist in most large systems. The choice depends on latency budget, freshness requirements, and query complexity.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **API Composition** | Pattern where a gateway or service calls multiple downstream services and merges the results |
| **Aggregator Pattern** | Dedicated service with its own data store that pre-joins data from multiple sources |
| **Composer** | The component that orchestrates downstream calls and merges responses |
| **N+1 Problem** | A single client request triggering N sequential downstream calls |
| **Fan-out** | A single request spreading to multiple downstream services (parallel or sequential) |
| **GraphQL Resolver** | Function that fetches data for a specific field, potentially from a different service |
| **Denormalized Store** | A data store where related data is pre-joined for fast reads (no joins needed at query time) |
| **Materialized View** | A database object that contains pre-computed data from multiple tables/services |
| **BFF (Backend for Frontend)** | Client-specific aggregator tailored to a particular client type's needs |
| **Data Federation** | Treating multiple data sources as a single virtual database |

## 3. The Problem Without It

- **Client does all the work**: A mobile app rendering an order detail page must call Order Service (order info), Customer Service (customer name), Product Service (product details), Shipping Service (tracking), and Payment Service (payment status) — 5 sequential HTTP calls. The page load time equals the sum of all 5 latencies.
- **Chatty APIs**: Without composition, APIs are designed around database tables, not use cases. Clients must understand the data model to navigate between resources (REST hypermedia). This couples clients to the backend schema.
- **Over-fetching**: A single "order" API returns the entire order object with all fields. The mobile client only needs 3 fields — but it receives 50, wasting bandwidth and parse time.
- **Under-fetching**: The web client needs order details + customer info + product images. The order API only returns order data. The client must make 3 more calls and assemble the page, duplicating logic across every client.
- **No single team owns the composition**: Each service team designs APIs for their own domain. No one owns the cross-domain "get me everything I need for this page" experience.

## 4. How It Works — Core Mechanics

### API Composition Flow

\`\`\`
Client              API Gateway / Composer         Order Svc    Customer Svc   Product Svc
  │                          │                        │              │              │
  │── GET /orders/123 ──────→│                        │              │              │
  │                          │── GET /orders/123 ────→│              │              │
  │                          │←── order data ─────────│              │              │
  │                          │                         │              │              │
  │                          │── GET /customers/42 ────────────────→│              │
  │                          │←── customer name/email ──────────────│              │
  │                          │                         │              │              │
  │                          │── GET /products?ids=1,2 ───────────────────────────→│
  │                          │←── product data ────────────────────────────────────│
  │                          │                         │              │              │
  │←── merged JSON ─────────│                         │              │              │
\`\`\`

### Aggregator Pattern Flow

\`\`\`
Order Svc ──OrderPlaced────→┐
Customer Svc ──CustomerUpd─→┤ Aggregator Service (pre-joined DB)
Product Svc ──ProductUpd───→┘          │
                              Event handlers update denormalized store
                                        │
Client ──── GET /v2/orders/123 ────────→│
←── instant response (no fan-out) ─────│
\`\`\`

### Code Example — API Composer

\`\`\`typescript
interface OrderService {
  getOrder(id: string): Promise<Order>;
}
interface CustomerService {
  getCustomer(id: string): Promise<Customer>;
}
interface ProductService {
  getProducts(ids: string[]): Promise<Product[]>;
}

class OrderDetailComposer {
  constructor(
    private orders: OrderService,
    private customers: CustomerService,
    private products: ProductService
  ) {}

  async getOrderDetail(orderId: string): Promise<OrderDetailResponse> {
    const order = await this.orders.getOrder(orderId);

    const [customer, products] = await Promise.all([
      this.customers.getCustomer(order.customerId),
      this.products.getProducts(order.items.map(i => i.productId))
    ]);

    const productMap = new Map(products.map(p => [p.id, p]));

    return {
      orderId: order.id,
      status: order.status,
      customer: { name: customer.name, email: customer.email },
      items: order.items.map(item => ({
        productName: productMap.get(item.productId)?.name ?? 'Unknown',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        imageUrl: productMap.get(item.productId)?.imageUrl
      })),
      total: order.total
    };
  }
}
\`\`\`

### Code Example — Aggregator (Event-Driven)

\`\`\`typescript
class OrderAggregator {
  private store: Map<string, AggregatedOrder> = new Map();

  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    const [customer, products] = await Promise.all([
      this.fetchCustomer(event.customerId),
      this.fetchProducts(event.items.map(i => i.productId))
    ]);

    const aggregated: AggregatedOrder = {
      id: event.orderId,
      customerName: customer.name,
      customerEmail: customer.email,
      items: event.items.map((item, i) => ({
        productName: products[i].name,
        productImage: products[i].imageUrl,
        quantity: item.quantity,
        price: item.price
      })),
      total: event.items.reduce((s, i) => s + i.price * i.quantity, 0),
      status: 'confirmed',
      createdAt: Date.now()
    };

    this.store.set(event.orderId, aggregated);
  }

  async getAggregatedOrder(orderId: string): Promise<AggregatedOrder | null> {
    return this.store.get(orderId) ?? null;
  }

  private async fetchCustomer(id: string) { /* ... */ }
  private async fetchProducts(ids: string[]) { /* ... */ }
}
\`\`\`

## 5. Variants & Flavors

| Variant | Description | Data Freshness | Latency | Complexity |
|---------|-------------|---------------|---------|------------|
| **API Gateway Composition** | Gateway (Kong, Zuul, AWS API Gateway) calls downstream services | Real-time | Sum of service latencies | Low (in gateway config) |
| **GraphQL Composition** | GraphQL gateway resolves fields via resolvers that call different services | Real-time | Per-resolver latency | Medium (schema design) |
| **Aggregator with Local DB** | Dedicated service with its own denormalized database | Eventual consistency (ms) | ~5ms (local read) | High (event handlers, sync) |
| **Aggregator with Cache** | Composer caches downstream responses (Redis) | TTL-bound staleness | ~5ms (cache hit) | Medium (cache invalidation) |
| **Materialized View (DB)** | Database-level aggregation using CDC or ETL | Eventual consistency (seconds-minutes) | ~1ms (DB index scan) | Medium (ETL pipeline) |
| **BFF Aggregator** | Client-specific aggregator (Mobile BFF, Web BFF) | Depends on strategy | Optimized per client | High (multiple BFFs) |

## 6. Performance Characteristics

| Metric | API Composition (3 services) | Aggregator (pre-joined DB) | GraphQL Composition | Aggregator + Redis Cache |
|--------|------------------------------|----------------------------|---------------------|-------------------------|
| P50 latency | 30-60ms (3 x 10-20ms) | 2-5ms | 40-80ms (per resolver chain) | 3-8ms |
| P99 latency | 200-500ms | 10-20ms | 300-800ms | 20-50ms |
| Throughput (req/s per instance) | 500-1000 | 5000-10000 | 300-600 | 8000-15000 |
| Data freshness | Real-time | Eventual (ms) | Real-time | TTL-bound |
| Downstream calls per request | N (fan-out) | 0 (pre-joined) | N (per resolver) | 0 (on cache hit) |
| Cold start (first request) | N calls | N/A (data cached) | N calls | DB query (cache miss) |
| Storage overhead | None | 2-5x (denormalized) | None | 1x (cache) |
| Failure tolerance | Partial (if one service fails) | Independent (aggregator has own data) | Partial (resolver-level) | Cache miss → DB fallback |

## 7. Failure Modes

- **Cascading fan-out failure**: API Composer calls 5 services. Each has 99.9% uptime. Composite availability = 99.5%. If one service is slow, the entire composition times out. *Mitigation*: Set per-service timeouts, circuit breakers, and fallback defaults for each downstream call.
- **Stale aggregator data**: Aggregator updates a denormalized order summary from events. An event is delayed by 30 seconds. The client sees stale data (e.g., "order pending" when it's already shipped). *Mitigation*: Add staleness indicators ("last updated 30s ago"), use atomic broadcast for ordering guarantees.
- **Aggregator data drift**: A bug in the event handler causes the aggregator's data to diverge from source-of-truth services. Inconsistencies propagate silently. *Mitigation*: Periodic reconciliation jobs that compare aggregator data to source services and repair differences.
- **GraphQL N+1 under the hood**: A GraphQL query for a list of 100 orders with customer names triggers 1 query for orders + 100 queries for each customer's details (N+1). *Mitigation*: DataLoader (batching + caching) batches per-field requests into single queries.
- **Aggregator write amplification**: 1000 orders placed per second → each triggers an aggregator event handler that does 3 downstream fetches → 3000 writes/second to the aggregator DB. *Mitigation*: Batch events, use change data capture (CDC) with stream processing, rate-limit event consumption.

## 8. Decision Framework

\`\`\`
├─ How often is this data read vs written?
│   ├─ Read-heavy (100:1+) → Aggregator (pre-join for fast reads)
│   └─ Read occasionally → API Composition (no storage overhead)
├─ What latency does the client need?
│   ├─ <10ms P50 → Aggregator (local read)
│   ├─ 10-50ms → Aggregator + cache
│   └─ >50ms acceptable → API Composition
├─ Does the client need real-time data?
│   ├─ Yes → API Composition or GraphQL
│   └─ Eventual consistency OK → Aggregator
├─ How many services does the query fan across?
│   ├─ 1-2 → API Composition (simple, low latency)
│   ├─ 3-5 → API Composition with timeouts + fallbacks
│   └─ 5+ → Aggregator (avoids complex distributed fan-out)
├─ Who owns the clients?
│   ├─ Single client type → BFF Aggregator
│   └─ Multiple client types → GraphQL or per-client BFFs
└─ What query patterns do clients need?
    ├─ Fixed, well-known → Aggregator (pre-compute)
    └─ Ad-hoc, flexible → GraphQL (query-driven composition)
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client App\n(Web/Mobile)', type: 'client', x: 60, y: 50 },
    { id: 'gateway', label: 'API Gateway\n(API Composition)', type: 'gateway', x: 240, y: 50 },
    { id: 'order', label: 'Order Service\n(Postgres)', type: 'app', x: 60, y: 220 },
    { id: 'customer', label: 'Customer Service\n(Postgres)', type: 'app', x: 240, y: 220 },
    { id: 'product', label: 'Product Service\n(Postgres)', type: 'app', x: 420, y: 220 },
    { id: 'aggregator', label: 'Order Aggregator\n(Pre-joined DB)', type: 'storage', x: 420, y: 50 },
    { id: 'eventbus', label: 'Event Bus\n(Kafka)', type: 'gateway', x: 240, y: 340 },
  ]}
  edges={[
    { from: 'client', to: 'gateway', label: 'GET /orders/123' },
    { from: 'client', to: 'aggregator', label: 'or GET /v2/orders/123', dashed: true },
    { from: 'gateway', to: 'order', label: 'fetch order' },
    { from: 'gateway', to: 'customer', label: 'fetch customer' },
    { from: 'gateway', to: 'product', label: 'fetch products' },
    { from: 'order', to: 'eventbus', label: 'OrderPlaced event' },
    { from: 'customer', to: 'eventbus', label: 'CustomerUpdated' },
    { from: 'product', to: 'eventbus', label: 'ProductUpdated' },
    { from: 'eventbus', to: 'aggregator', label: 'update pre-joined view' },
  ]}
  height={420}
/>

## 10. Real Production Incident

<Callout type="incident">
**GitHub — GraphQL N+1 Outage, October 2020**

GitHub's GraphQL API experienced a severe degradation when a poorly constructed query triggered a massive N+1 cascade. A query fetching 100 repository issues with their labels, assignees, and comments caused the GraphQL resolver to make 1 + 100 + 100 + 100 = 301 database queries sequentially.

**Impact**: GraphQL endpoint latency spiked from 200ms to 60 seconds. All GitHub API clients using GraphQL were affected — CI/CD tools, VS Code extensions, and third-party integrations. The outage lasted 47 minutes.

**Root cause**: A new resolver for the \`Issue.timelineItems\` field was added without DataLoader batching. Each issue's timeline fetched independently instead of being batched into a single query. During peak traffic, the resolver chain created a multiplicative fan-out.

**Fix**: Implemented DataLoader with per-request caching. Batched 100 timeline queries into 1 SQL query with \`WHERE issue_id IN (...)\` — reducing 301 queries to 4. Added query complexity analysis to reject or slow down queries with excessive N+1 potential. Set a 30-second query timeout as a safety net.

**Lesson**: Every GraphQL resolver must use DataLoader or equivalent batching. Never assume resolvers will be called once — they're called once per parent object. Always profile resolver performance under realistic query loads.
</Callout>

## 11. Production Implementation

### API Gateway Composition (Kong)

\`\`\`yaml
# Kong declarative config — API composition
_format_version: "3.0"
services:
  - name: order-composition
    host: order-composer.internal
    port: 3000
    routes:
      - name: order-detail
        paths:
          - /api/v1/orders/:id
    plugins:
      - name: request-transformer
        config:
          add:
            headers:
              - X-Source: api-gateway-composition
\`\`\`

### GraphQL Schema with DataLoader

\`\`\`typescript
// GraphQL resolvers with DataLoader batching
import DataLoader from 'dataloader';

const customerLoader = new DataLoader(async (customerIds: readonly string[]) => {
  const customers = await customerService.findByIds([...customerIds]);
  const map = new Map(customers.map(c => [c.id, c]));
  return customerIds.map(id => map.get(id) ?? null);
});

const productLoader = new DataLoader(async (productIds: readonly string[]) => {
  const products = await productService.findByIds([...productIds]);
  const map = new Map(products.map(p => [p.id, p]));
  return productIds.map(id => map.get(id) ?? null);
});

const resolvers = {
  Order: {
    customer: (order: Order) => customerLoader.load(order.customerId),
    items: (order: Order) => order.items.map(item => ({
      ...item,
      product: () => productLoader.load(item.productId)
    }))
  }
};
\`\`\`

### CQRS Aggregator with Postgres Materialized View

\`\`\`sql
-- Materialized view for aggregated order data
CREATE MATERIALIZED VIEW order_summary AS
SELECT
  o.id AS order_id,
  o.customer_id,
  c.name AS customer_name,
  c.email AS customer_email,
  json_agg(
    json_build_object(
      'product_name', p.name,
      'quantity', oi.quantity,
      'price', oi.unit_price,
      'image_url', p.image_url
    )
  ) AS items,
  o.total,
  o.status,
  o.created_at
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
GROUP BY o.id, c.name, c.email, o.total, o.status, o.created_at;

-- Refresh on a schedule or via event trigger
REFRESH MATERIALIZED VIEW CONCURRENTLY order_summary;
\`\`\`

## 12. Real Company Deep Dives

- **Amazon (Aggregator)**: Product detail pages use a dedicated aggregator service. Product info, pricing, reviews, inventory, and recommendations are pre-joined into a denormalized data store. Read latency is <10ms for a page that spans 5+ domain services. The aggregator is updated asynchronously via SQS events.
- **Netflix (API Composition via Zuul)**: Netflix's API gateway (Zuul) composes responses from hundreds of microservices for each client request. The gateway uses Hystrix circuit breakers per downstream call — if the recommendations service is slow, the gateway returns the order page with a "recommendations unavailable" fallback.
- **Uber (Both)**: Uber uses API composition for real-time trip tracking (Trip Service + Driver Location + Map Tiles) where freshness matters. They use aggregators for historical data and analytics (pre-joined trip + payment + rating summaries). Uber's GraphQL layer (based on Apollo Federation) composes domain graphs.
- **GraphQL (Federation)**: Apollo Federation allows each service to own its portion of the GraphQL schema. The gateway composes these subgraphs into a single graph. Each subgraph has its own DataLoader for batching. Companies like Shopify, Netflix, and Airbnb use this approach.
- **eBay (Both)**: Uses API composition for most read paths (item detail page fetches from item service, seller service, pricing service). Uses aggregators for search and browse pages (pre-built denormalized indexes in Elasticsearch). eBay calls this their "page assembly" architecture.

## 13. Interview Playbook

**Q: "Design an API for a product detail page that shows product info, seller details, reviews, and inventory status — each owned by different microservices."**
→ Open with: Identify the two options — API Composition or Aggregator. Ask clarifying questions about latency, freshness, and traffic.
→ Cover for composition: API Gateway calls Product Service, Seller Service, Review Service, and Inventory Service in parallel (or with dependencies where needed). Use Promise.all for parallel calls. Set per-service timeouts (500ms each). Return partial response with fallback data on failure.
→ Cover for aggregator: Event-driven aggregator subscribes to domain events (ProductUpdated, ReviewCreated, InventoryChanged). Maintains a denormalized product_detail table. Client reads in <10ms. Trade-off: eventual consistency.
→ Depth signal: For a read-heavy page (10K req/s) with 100:1 read-to-write ratio, use the aggregator. Pre-compute the denormalized view and serve from a read replica. For freshness-critical fields (inventory count), use a hybrid approach — the aggregator serves 95% of the data, but the real-time inventory field is fetched via API composition on every request.

**Q: "How do you prevent the N+1 problem in GraphQL?"**
→ Open with: DataLoader — a per-request batching and caching layer. Each resolver doesn't fetch data directly; instead, it pushes a request key to a DataLoader batch function.
→ Cover: DataLoader coalesces individual loads within a single event-loop tick into a single batch call. Example: 100 Order.customer resolvers → 1 batch call to Customer Service with 100 IDs. Also caches results per request so the same customer isn't fetched twice.
→ Depth signal: DataLoader also solves the "cache stampede" problem within a request. If two resolvers both need the same entity (same order referenced from two places), DataLoader returns the cached promise rather than making two calls. This is critical for GraphQL's shared-reference problem.

## 14. Concept Check Quiz

**Q1:** What is the main difference between API Composition and the Aggregator Pattern?**Answer:** API Composition fetches data from downstream services in real-time and merges responses. The Aggregator Pattern pre-joins data into its own store (via events/CDC) and serves it without fan-out — trading freshness for speed.

**Q2:** What is the N+1 problem in GraphQL and how do you solve it?**Answer:** A query for N parent objects triggers N additional queries for child fields (1 + N). Solved with DataLoader, which batches per-field loads into single batch requests.

**Q3:** When would you choose an Aggregator over API Composition?**Answer:** When reads vastly outnumber writes (100:1+), when sub-10ms latency is required, or when the query spans 5+ services (fan-out complexity becomes too high).

**Q4:** How do you handle partial failures in API Composition?**Answer:** Set per-service timeouts and circuit breakers. Return partial responses with fallback data (null fields, cached defaults, or "unavailable" indicators). Use the Circuit Breaker pattern to stop calling failing services.

**Q5:** What's an example of a hybrid API Composition + Aggregator approach?**Answer:** Product detail page where 90% of data comes from an aggregator (product name, description, images) and 10% comes from real-time API calls (inventory count, dynamic pricing). The aggregator handles the stable data; API composition handles the freshness-critical data.

## 15. Next Steps

- **GraphQL Federation** — Composing multiple GraphQL services into a single unified schema.
- **CQRS with Materialized Views** — Database-level aggregation for read-optimized queries.
- **API Gateway Patterns** — Gateway routing, rate limiting, authentication combined with composition.
- **DataLoader** — Deep dive into batching and caching strategies for N+1 prevention.`,
    estimatedMin: 14,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Amazon", "Netflix", "Uber", "GraphQL", "REST"],
    tags: ["api-composition", "aggregator", "api-gateway", "graphql", "bff", "backend-for-frontend"],
  },

  {
    id: "lesson-06-10",
    slug: "architecture-patterns-10-strangler-fig",
    title: "Strangler Fig Pattern",
    content: `## 0. Mental Model

> The Strangler Fig pattern is like **renovating a house one room at a time while living in it**. You don't tear down the whole house and live in a tent for two years. Instead, you renovate the kitchen first (new service), then the bathroom (another service), and so on. During the renovation, some rooms are new and some are old. The front door stays the same (routing layer). Eventually, every room has been renovated — the original house is gone, but you never moved out.

## 1. Quick Summary

- **Strangler Fig** = Incrementally replace a legacy system with a new one by intercepting traffic and routing specific features to the new system.
- **Routing layer** (reverse proxy, API gateway, feature flag) sits in front of the legacy system and decides which requests go to new services vs the legacy system.
- **Each migration increments**: Route one feature at a time to the new service. The rest of the system continues unchanged.
- **Risk reduction**: If a new service has issues, only that feature is affected. Rollback by flipping the route back to the legacy system.
- **Database migration is the hardest part**: Dual-writes, schema mapping, and data synchronization between old and new databases.
- **Data synchronization**: When both old and new systems run in parallel, data written to one must be synced to the other (at least during the transition).
- **End state**: All features migrated, legacy system decommissioned, routing layer simplified or removed.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Strangler Fig** | Incremental migration pattern — gradually replace a legacy system feature by feature |
| **Routing Layer** | Reverse proxy or gateway that directs traffic to old vs new system based on feature/path |
| **Legacy System** | The existing system being replaced (monolith, old stack, third-party) |
| **Greenfield Service** | New microservice built to replace a specific legacy feature |
| **Dual-Write** | Writing data to both legacy and new databases during migration for consistency |
| **Feature Flag** | Toggle that controls whether a feature routes to old or new system |
| **Canary Release** | Routing a small percentage of traffic to the new system to validate behavior |
| **Anti-Corruption Layer (ACL)** | Translation layer that maps between legacy and new system data models |
| **Branch by Abstraction** | Create an abstraction over a feature, then swap the implementation underneath |
| **Big Bang Rewrite** | Opposite approach — rewrite the entire system and switch over in one deployment |

## 3. The Problem Without It

- **Big Bang rewrites fail**: Netscape rewrote its browser from scratch in 1998 (3 years, never shipped). Friendster rewrote its platform — users revolted and left. The industry learned: rewrites from scratch have a ~70% failure rate.
- **Feature freeze**: While a team rewrites the entire system, no new features are delivered. Business stakeholders won't accept 6-18 months without improvements.
- **Lost business logic**: The legacy system contains years of edge-case fixes, undocumented business rules, and implicit knowledge. A rewrite inevitably misses some of these, causing regressions.
- **No rollback**: If the new system fails, you can't go back — the old system was taken offline. Critical bug? The entire business is down.
- **One massive deployment risk**: A single deployment switches hundreds of features at once. If something goes wrong, finding the root cause is like finding a needle in a haystack of changes.

## 4. How It Works — Core Mechanics

### The Strangler Fig Lifecycle

\`\`\`
Phase 1: Intercept
  Client → [Router] → Legacy System (100% traffic)
                       No migration yet — router just observes

Phase 2: First Feature Migrated
  Client → [Router] ──[path=/search]──→ Search Service (New)
                     ──[else]─────────→ Legacy System (Old)

Phase 3: Multiple Features Migrated
  Client → [Router] ──[path=/search]──→ Search Service
                     ──[path=/checkout]→ Checkout Service
                     ──[path=/orders]──→ Order Service
                     ──[else]─────────→ Legacy System (shrinking)

Phase 4: Legacy Decommissioned
  Client → [Router] ──→ All New Services (100%)
  Legacy System: OFF
\`\`\`

### Routing Layer Pseudocode

\`\`\`
function routeRequest(request):
    // Check strangler fig routes (most specific first)
    if request.path starts with "/api/search":
        return proxy("http://search-service", request)
    if request.path starts with "/api/checkout":
        return proxy("http://checkout-service", request)
    if request.path starts with "/api/orders":
        return proxy("http://order-service", request)
    // Feature flagged: testing new user-profile service
    if request.path starts with "/api/profile" AND featureFlag("new-profile"):
        return proxy("http://profile-service", request)
    // Default: route to legacy
    return proxy("http://legacy-system", request)
\`\`\`

### Code Example — Strangler Fig Router

\`\`\`typescript
interface RouteRule {
  pattern: RegExp;
  target: string;
  enabled: boolean;
}

class StranglerRouter {
  private routes: RouteRule[] = [];
  private defaultTarget: string;

  constructor(defaultTarget: string) {
    this.defaultTarget = defaultTarget;
  }

  addRoute(pattern: string, target: string, enabled = true): void {
    this.routes.push({ pattern: new RegExp(pattern), target, enabled });
  }

  enable(pattern: string): void { /* ... */ }
  disable(pattern: string): void { /* ... */ }

  async route(request: { path: string; method: string; body?: unknown }): Promise<Response> {
    for (const route of this.routes) {
      if (route.enabled && route.pattern.test(request.path)) {
        try {
          return await this.forward(route.target, request);
        } catch (err) {
          console.error(\`New service failed, falling back to legacy: \${err}\`);
          break; // Fallback to legacy
        }
      }
    }
    return this.forward(this.defaultTarget, request);
  }
}
\`\`\`

### Database Migration — Parallel Run Strategy

\`\`\`
Legacy DB                  New DB
  │                          │
  │← Read from legacy (dual) │
  │                          │
  Order placed → Write to both (same transaction or 2-phase)
  │                          │
  │← Sync job reconciles ←──│
  │                          │
  After cutover:             │
  │                          │← Reads/writes from new services only
  │← Legacy decommissioned   │
\`\`\`

## 5. Variants & Flavors

| Variant | Description | Risk | Complexity | Speed |
|---------|-------------|------|------------|-------|
| **Feature-by-Feature (HTTP/API)** | Route HTTP requests per path/feature to new service | Low | Low | Medium |
| **Branch by Abstraction** | Replace implementation behind an interface in code | Low | Medium | Slow |
| **Database Strangling** | Migrate tables/domains one at a time to new DB | Medium | High | Slow |
| **Feature Flag Canary** | Route % of users to new system via feature flags | Low | Medium | Fast |
| **Big Bang (NOT recommended)** | Rewrite and switch everything at once | Very High | Very High | Fast (if it works) |
| **Strangler with ACL** | Add Anti-Corruption Layer to translate between models | Low | High | Medium |

## 6. Performance Characteristics

| Metric | During Strangling (Dual Systems) | After Migration (New Only) |
|--------|----------------------------------|---------------------------|
| Request latency (simple routes) | Same as legacy (no overhead) | Same as new service |
| Request latency (dual-write paths) | +5-20ms (writing to 2 systems) | New system latency |
| Database storage | 2x (legacy + new) | 1x |
| Operational cost | 2x infrastructure + sync jobs | 1x (less if cloud-native) |
| Deployment risk per change | Low (per feature) | Medium (full system) |
| Rollback time | Seconds (flip route/flag) | Minutes (if issue found late) |
| Mean time to migrate (100 services) | 6-18 months | N/A |

## 7. Failure Modes

- **Data divergence during dual-writes**: Legacy system writes Order as "shipped". New system's parallel write fails silently. Now the new system has stale data. *Mitigation*: Implement reconciliation jobs that compare old and new data periodically (every 5 minutes). Alert on divergence. Use transactional outbox + CDC for reliable dual-writes.
- **Router fallback cascade**: The new Search Service is slow. Router hits timeout and falls back to legacy. But the legacy system wasn't designed for the extra load (it was scaled down). Now both systems are overloaded. *Mitigation*: Set aggressive timeouts for new service (<100ms) and monitor fallback rate. Keep legacy system fully provisioned until migration is complete.
- **Incomplete strangulation**: Team migrates 90% of features but the last 10% are too coupled or complex. The legacy system can never be decommissioned — now you maintain two systems forever. *Mitigation*: Before starting, identify the "last mile" features. If a feature can't be cleanly extracted, plan to rebuild or wrap it with an ACL.
- **Shared data model conflicts**: Both systems read/write the same database table during migration. The new system adds a column; the legacy system ignores it but then a batch job fails because of unexpected schema changes. *Mitigation*: Use view-based or service-based isolation. Each system gets its own database schema. A sync layer handles cross-schema data transfer.

## 8. Decision Framework

\`\`\`
├─ Is the legacy system well-understood and documented?
│   ├─ Yes → Can extract features directly
│   └─ No → Add an Anti-Corruption Layer (ACL) first, extract behind it
├─ Can features be cleanly separated (bounded contexts)?
│   ├─ Yes → Feature-by-feature HTTP strangling
│   └─ No → Branch by Abstraction (refactor inside the monolith first)
├─ Does the database also need migration?
│   ├─ Yes → Dual-writes + reconciliation for the data domain
│   │   ├─ Schema shared → DB strangling (tables one at a time)
│   │   └─ Schema owned per service → Service owns its data row
│   └─ No → API-level strangling only (easier)
├─ How much risk can the business tolerate?
│   ├─ Very low → Canary releases via feature flags (5% → 25% → 100%)
│   ├─ Medium → Per-feature with automatic rollback on error spike
│   └─ High risk tolerance → Big Bang (only for small, well-understood systems)
└─ Team structure?
    ├─ Small team → API-level strangling (lowest complexity)
    └─ Multiple teams → Parallel strangling (different teams own different features)
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 80, y: 60 },
    { id: 'router', label: 'Strangler Router\n(NGINX / Gateway)', type: 'gateway', x: 280, y: 60 },
    { id: 'legacy', label: 'Legacy Monolith\n(Ruby on Rails)', type: 'app', x: 80, y: 240 },
    { id: 'search', label: 'New: Search Service\n(Go + Elasticsearch)', type: 'web', x: 280, y: 240 },
    { id: 'checkout', label: 'New: Checkout Service\n(Node.js + Postgres)', type: 'web', x: 480, y: 240 },
    { id: 'orders', label: 'New: Order Service\n(Java + DynamoDB)', type: 'web', x: 480, y: 380 },
    { id: 'acl', label: 'Anti-Corruption\nLayer', type: 'gateway', x: 80, y: 400 },
    { id: 'sync', label: 'Data Sync Job\n(Reconciliation)', type: 'worker', x: 280, y: 400 },
  ]}
  edges={[
    { from: 'client', to: 'router', label: 'all requests' },
    { from: 'router', to: 'legacy', label: 'most routes (default)' },
    { from: 'router', to: 'search', label: '/api/search →' },
    { from: 'router', to: 'checkout', label: '/api/checkout →' },
    { from: 'router', to: 'orders', label: '/api/orders →' },
    { from: 'search', to: 'acl', label: 'read legacy data', dashed: true },
    { from: 'checkout', to: 'acl', label: 'dual-write', dashed: true },
    { from: 'legacy', to: 'sync', label: 'data export' },
    { from: 'sync', to: 'search', label: 'data sync' },
    { from: 'sync', to: 'checkout', label: 'data sync' },
    { from: 'sync', to: 'orders', label: 'data sync' },
  ]}
  height={480}
/>

## 10. Real Production Incident

<Callout type="incident">
**Magento (Adobe) — Strangler Fig Migration Outage, August 2019**

Adobe's Magento Commerce Cloud was migrating merchants from a legacy PHP monolith to microservices using the Strangler Fig pattern. During the migration of the checkout feature, a routing misconfiguration caused requests to be split incorrectly — 30% of checkout requests went to the new Node.js service, but the new service's database dual-write was failing silently due to a schema mismatch.

**Impact**: 18% of checkout orders were created in the new system but never persisted to the legacy database. Customers saw "Order confirmed" but the order never appeared in the merchant's admin panel. 2,300 orders were lost over 4 hours before detection.

**Root cause**: The new service wrote orders to its own Postgres database and attempted a dual-write to the legacy MySQL database. The MySQL INSERT failed due to a missing column (legacy schema hadn't been updated), but the error was caught in a try/catch with no logging. The new service returned success to the customer because its own DB write succeeded.

**Fix**: Added comprehensive logging and alerting on dual-write failures. Implemented a dead-letter queue for failed dual-writes with automatic retry. Changed the dual-write approach to use a transactional outbox pattern — the new service writes to its outbox table, and a CDC pipeline (Debezium) replicates to the legacy system asynchronously with monitoring.

**Lesson**: Dual-writes are dangerous because the error surfaces in the secondary system. Always monitor the secondary write path. Use asynchronous replication (CDC/outbox) instead of synchronous dual-writes for better isolation. Add end-to-end validation: periodically compare data between old and new systems.
</Callout>

## 11. Production Implementation

### NGINX Strangler Fig Router

\`\`\`nginx
# NGINX config — strangler fig routing
upstream legacy {
    server legacy-app.internal:3000;
}

upstream search_service {
    server search-service.internal:8080;
}

upstream checkout_service {
    server checkout-service.internal:8080;
}

server {
    listen 80;
    server_name api.example.com;

    # Migrated: Search
    location /api/search {
        proxy_pass http://search_service;
        proxy_set_header Host $host;
        proxy_read_timeout 5s;
        # Fallback to legacy on error
        error_page 502 503 504 = @fallback_legacy;
    }

    # Migrated: Checkout
    location /api/checkout {
        proxy_pass http://checkout_service;
        proxy_set_header Host $host;
        proxy_read_timeout 5s;
        error_page 502 503 504 = @fallback_legacy;
    }

    # Not yet migrated — route to legacy
    location / {
        proxy_pass http://legacy;
        proxy_set_header Host $host;
    }

    # Fallback handler
    location @fallback_legacy {
        proxy_pass http://legacy$request_uri;
        proxy_set_header Host $host;
    }
}
\`\`\`

### Feature Flag Configuration

\`\`\`typescript
// LaunchDarkly feature flag — canary strangulation
const client = launchdarkly.init('sdk-key-123');

async function routeCheckoutRequest(req: Request, res: Response): Promise<void> {
    const userKey = req.headers['x-user-id'] as string;

    // Check if this user is in the new checkout canary
    const useNewCheckout = await client.variation(
        'checkout-strangler-v2',
        { key: userKey, email: req.headers['x-user-email'] as string },
        false  // Default: use legacy
    );

    if (useNewCheckout) {
        proxy(req, res, 'http://checkout-service.internal:8080');
    } else {
        proxy(req, res, 'http://legacy.internal:3000');
    }
}

// In LaunchDarkly dashboard:
// - Start: 5% of users get new checkout
// - Monitor: error rate, latency, conversion rate
// - Progress: 25% → 50% → 100%
// - Rollback: set to 0% if errors spike
\`\`\`

### Dual-Write with Transactional Outbox

\`\`\`typescript
class CheckoutService {
    async placeOrder(customerId: string, items: CartItem[]): Promise<string> {
        const orderId = crypto.randomUUID();
        const order = new Order(orderId, customerId, items);

        // Single transaction: write to new DB + outbox for legacy sync
        await this.db.transaction(async (client) => {
            // Write to new system's database
            await client.query(
                'INSERT INTO orders (id, customer_id, items, status) VALUES ($1, $2, $3, $4)',
                [orderId, customerId, JSON.stringify(items), 'confirmed']
            );

            // Write to outbox for legacy system sync
            await client.query(
                'INSERT INTO outbox (event_type, payload, status) VALUES ($1, $2, $3)',
                ['OrderPlaced', JSON.stringify({ orderId, customerId, items }), 'pending']
            );
        });

        // CDC agent (Debezium) picks up outbox event and writes to legacy DB
        return orderId;
    }
}
\`\`\`

## 12. Real Company Deep Dives

- **Amazon**: Jeff Bezos' infamous 2002 API mandate forced all teams to communicate via APIs. This enabled Amazon to use the Strangler Fig pattern to migrate from a two-tier monolith (Oracle + C++) to hundreds of microservices. Each feature was extracted behind an API, allowing Amazon to scale from a bookstore to AWS — the world's largest cloud provider.
- **Netflix**: Netflix migrated from a monolithic Java application in a single datacenter to hundreds of microservices on AWS. Each service was strangled independently: first the recommendation engine, then the encoding pipeline, then the content delivery. The routing layer was a custom Zuul gateway that gradually shifted traffic from datacenter to AWS. The migration took 7 years and Netflix open-sourced many of the tools (Eureka, Hystrix, Zuul).
- **Uber**: The original Uber monolith (Python + Django + PostgreSQL) was strangled over 5 years into 2,200+ microservices. Each core domain (trips, payments, drivers, riders) was extracted independently behind API gateways. Uber's "Chariot" platform managed the strangulation process with feature flags and gradual traffic shifting.
- **Martin Fowler (Pattern Originator)**: Martin Fowler coined the term "Strangler Fig Application" in 2004, inspired by the strangler fig tree. He documented the pattern at ThoughtWorks as a safer alternative to big-bang rewrites. The pattern is now considered the gold standard for legacy system modernization.
- **Shopify**: Shopify is strangling its Ruby on Rails monolith into modular components. Each component (checkout, admin, storefront) is being extracted behind new APIs. Shopify uses a combination of branch-by-abstraction (refactoring within the monolith) and API-level strangling for the extracted services. The migration has been ongoing since 2018 with no end in sight — the monolith keeps growing but the new services also grow.

## 13. Interview Playbook

**Q: "A company has a 10-year-old monolith handling 50K req/s. They want to migrate to microservices. How do you approach it?"**
→ Open with: Strangler Fig pattern. Never Big Bang. Intercept traffic with a routing layer (API gateway or NGINX) in front of the monolith.
→ Cover: Phase 1: Add router, all traffic to monolith (no change). Phase 2: Identify the easiest feature to extract (e.g., search — it has a clear API boundary and can be extracted independently). Build the new search service with its own database. Route /api/search to the new service. Monitor for errors, latency, data consistency. Phase 3: Repeat for checkout, orders, user profiles. Each extraction is a separate project with its own timeline.
→ Depth signal: The hardest part is database migration. Use dual-writes with a reconciliation job. Don't migrate the database and the service at the same time — use the "database strangler" pattern: migrate the data first to a new schema, then extract the service. Also, start with the feature that provides the most business value — if search is slow and users complain, fix that first. Show business value early to justify the migration cost.

**Q: "What happens to the database during a Strangler Fig migration?"**
→ Open with: There are three approaches — shared database, database per service with sync, and branch by abstraction on the schema level.
→ Cover: Shared database (temporary) — the new service reads/writes the same DB as the legacy system. Simplest but couples them. Better approach: each new service gets its own database. Dual-writes keep both in sync during the transition. A reconciliation job runs periodically to fix any divergences. After the cutover, the legacy DB writes are stopped and the legacy schema is eventually dropped.
→ Depth signal: The Clean Architecture approach uses an Anti-Corruption Layer (ACL) between the new service and the legacy database. The new service never directly accesses the legacy schema. Instead, the ACL translates between the new domain model and the legacy database schema. This allows the new service to have a clean, modern schema while the legacy system continues to use its old schema. The ACL is temporary — once all data is migrated, the ACL is removed.

## 14. Concept Check Quiz

**Q1:** Why is the Strangler Fig pattern preferred over Big Bang rewrites?**Answer:** Big Bang rewrites have ~70% failure rate, impose a feature freeze for 6-18 months, and have no rollback option. Strangler Fig delivers incremental value with each feature migration and allows instant rollback by reverting the route.

**Q2:** What is the first step in a Strangler Fig migration?**Answer:** Deploy a routing layer (API gateway, reverse proxy, or feature flag system) in front of the legacy system. Initially, all traffic routes to legacy — no behavioral change.

**Q3:** How do you handle dual-write failures during migration?**Answer:** Use transactional outbox pattern: write the primary business event to an outbox table (same transaction as the business operation). A CDC pipeline reliably replicates to the secondary system. Add reconciliation jobs to detect and fix divergence.

**Q4:** What is an Anti-Corruption Layer in the context of Strangler Fig?**Answer:** A translation layer between the new service and the legacy system's data model. The new service uses its own domain model; the ACL translates between that and the legacy schema. Prevents legacy design from infecting the new system.

**Q5:** How do you know when the migration is complete?**Answer:** When all traffic routes through new services, the legacy system receives zero requests, and all data has been migrated. Run the legacy system in read-only mode for a validation period (2-4 weeks) before decommissioning.

## 15. Next Steps

- **Branch by Abstraction** — Refactoring pattern used before extraction when code is tightly coupled.
- **Anti-Corruption Layer** — Design pattern for translating between legacy and new domain models.
- **Feature Flags** — Toggling behavior without code deploys (LaunchDarkly, Unleash).
- **Database Migration Patterns** — Parallel run, dual-writes, schema per service, expand-contract.`,
    estimatedMin: 15,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Amazon", "Netflix", "Uber", "Martin Fowler", "Shopify"],
    tags: ["strangler-fig", "migration", "legacy", "monolith", "incremental", "modernization"],
  },

  {
    id: "lesson-06-11",
    slug: "architecture-patterns-11-backend-for-frontend",
    title: "Backend for Frontend (BFF) Pattern",
    content: `## 0. Mental Model

> Backend for Frontend (BFF) is like a **personal interpreter** for each guest at a multilingual conference. The keynote speaker (domain service) speaks one language (generic API). Each guest has an interpreter (BFF) who translates, filters, and summarizes exactly what that guest needs — in their language, at their pace, with their preferred level of detail. The VIP guest gets deep financial analysis; the general audience gets highlights. Each interpreter only works for one guest type, so they deeply understand that guest's needs.

## 1. Quick Summary

- **BFF** = A dedicated backend service created for each client type (web, iOS, Android, IoT, TV).
- **Client-specific optimization**: Each BFF returns exactly the data shape, payload size, and interaction pattern that its client type needs.
- **Team ownership**: The same team that builds the frontend owns its BFF. Frontend team controls both client and backend.
- **BFF vs API Gateway**: API Gateway is shared across all clients. BFF is per-client. Many architectures use both (Gateway → BFFs → Domain Services).
- **Reduces over-fetching**: Mobile BFF returns 2KB payloads (not 50KB like the shared API).
- **Reduces under-fetching**: Web BFF pre-joins data from 5 services into one response — the browser makes 1 call instead of 5.
- **Independent evolution**: Changes to the mobile BFF don't affect the web BFF. Mobile and web teams deploy independently.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **BFF (Backend for Frontend)** | Dedicated backend service for a specific client type |
| **API Gateway** | Shared entry point that routes to BFFs or domain services |
| **Domain Service** | Core business service (Order Service, Customer Service) |
| **Over-fetching** | Returning more data than the client needs |
| **Under-fetching** | Client needs multiple calls to get all data for a view |
| **Client Type** | Category of client: web browser, iOS app, Android app, TV app, IoT device |
| **Frontend Team** | Team responsible for both the client app and its BFF |
| **BFF Router** | Component that identifies client type and routes to the correct BFF |
| **GraphQL BFF** | BFF that exposes a GraphQL endpoint tailored to its client type |
| **Sam Newman** | Co-creator of the BFF pattern (with Phil Calado at SoundCloud) |

## 3. The Problem Without It

- **Over-fetching on mobile**: A shared order API returns: order ID, customer details, items, pricing breakdown, payment info, shipping address, tracking history, promotional messages, SEO metadata, and related products. The mobile app only needs order status, item names, and delivery ETA — but it downloads 50KB of JSON on a 3G connection.
- **Under-fetching on web**: Web checkout page needs: order summary, customer info, product images, upsell recommendations, inventory status, and SEO tags. The shared API returns only order data. The web client makes 6 API calls to render one page.
- **Different interaction patterns**: Mobile uses gestures, push notifications, and offline-first. Web uses keyboard, mouse, and views. IoT uses voice and minimal displays. A single backend can't optimize for all interaction models simultaneously.
- **Tied release cycles**: Mobile app goes through App Store review (1-7 days). Web deploys instantly. If the shared API changes for a web feature, the mobile team must also update and wait for App Store approval.
- **Team coupling**: The backend team (5 people) builds one API for all clients. The mobile team (10 people) has different priorities than the web team (8 people). Every API change requires negotiations between three teams.

## 4. How It Works — Core Mechanics

### BFF Architecture

\`\`\`
Without BFF:
  [Web]   [iOS]  [Android]   [IoT]
     \       |        |        /
      \      |        |       /
       \     |        |      /
        \    |        |     /
         [Shared API (fails all)]
              |
      [Domain Services]

With BFF:
  [Web]   [iOS]  [Android]   [IoT]
    |       |        |        |
 [Web]   [iOS]  [Android]   [IoT]
 [BFF]   [BFF]   [BFF]      [BFF]
    \       |        |        /
     \      |        |       /
      [API Gateway (routing)]
              |
      [Domain Services]
\`\`\`

### BFF Request Flow

\`\`\`
Client (Mobile App)
  │
  │──→ POST /api/graphql  (with header X-Client-Type: mobile)
  │
  ▼
API Gateway (identifies client type from header)
  │
  │──→ Mobile BFF
  │     │
  │     ├──→ Order Service (get order #123)
  │     ├──→ Product Service (get product names)
  │     └──→ Customer Service (get customer name)
  │     │
  │     └── Return: { orderStatus, items[], deliveryEta }
  │           Payload: 1.5KB (vs 50KB from generic API)
  │
Client (Mobile App) ←── optimized JSON
\`\`\`

### BFF Code Example

\`\`\`typescript
// Domain Services (shared across all BFFs)
interface OrderService {
  getOrder(id: string): Promise<FullOrder>;
  getStatus(id: string): Promise<OrderStatus>;
}
interface InventoryService {
  getStock(productIds: string[]): Promise<Map<string, number>>;
}

// Mobile BFF — optimized for small payloads, offline support
class MobileBFF {
  constructor(
    private orders: OrderService,
    private inventory: InventoryService
  ) {}

  async getOrderSummary(orderId: string): Promise<MobileOrderSummary> {
    const [order, stock] = await Promise.all([
      this.orders.getStatus(orderId),
      this.inventory.getStock([])
    ]);

    return {
      status: order.status,
      deliveryEta: order.estimatedDelivery,
      items: order.items.map(i => ({
        name: i.productName,
        quantity: i.quantity,
        price: i.unitPrice,
        imageThumbnail: i.imageUrl + '?w=100' // Tiny thumbnails
      })),
      total: order.total,
      // No SEO, no recommendations, no promotional banners
    };
  }
}

// Web BFF — optimized for rich desktop experience
class WebBFF {
  constructor(
    private orders: OrderService,
    private inventory: InventoryService,
    private recommendations: RecommendationService
  ) {}

  async getCheckoutPage(orderId: string): Promise<WebCheckoutPage> {
    const [order, stock, recs] = await Promise.all([
      this.orders.getOrder(orderId),
      this.inventory.getStock(order.items.map(i => i.productId)),
      this.recommendations.forOrder(orderId)
    ]);

    return {
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shippingCost,
        items: order.items.map(i => ({
          name: i.productName,
          imageUrl: i.imageUrl, // Full resolution
          description: i.productDescription,
          quantity: i.quantity,
          price: i.unitPrice,
          inStock: (stock.get(i.productId) ?? 0) > 0
        })),
        timeline: order.timeline
      },
      recommendations: recs.map(r => ({
        id: r.id,
        name: r.name,
        price: r.price,
        imageUrl: r.imageUrl,
        rating: r.averageRating
      })),
      seo: {
        title: \`Checkout - Order #\${orderId}\`,
        description: \`Complete your purchase of \${order.items.length} items\`
      }
    };
  }
}
\`\`\`

### BFF Router

\`\`\`typescript
// Router that identifies client type and routes to the right BFF
class BFFGateway {
  private bffs: Map<string, BFFHandler> = new Map();

  register(clientType: string, handler: BFFHandler): void {
    this.bffs.set(clientType, handler);
  }

  async handle(req: IncomingRequest): Promise<Response> {
    const clientType = req.headers['x-client-type']
      ?? this.detectClientType(req.headers['user-agent']);

    const bff = this.bffs.get(clientType);
    if (!bff) throw new Error(\`Unknown client type: \${clientType}\`);

    return bff.handle(req);
  }

  private detectClientType(userAgent: string): string {
    if (userAgent.includes('Mobi')) return 'mobile-app';
    if (userAgent.includes('SmartTV')) return 'tv-app';
    if (userAgent.includes('curl') || userAgent.includes('fetch')) return 'web-api';
    return 'web-app';
  }
}
\`\`\`

## 5. Variants & Flavors

| Variant | Description | Payload Size | Dev Effort | Team Fit |
|---------|-------------|-------------|------------|----------|
| **Full BFF** | Dedicated service per client type, own codebase, own deploy | Smallest | High | Large org with dedicated frontend teams |
| **GraphQL BFF** | BFF exposes GraphQL tailored to client, but shared schema | Medium | Medium | Teams using GraphQL |
| **BFF as API Gateway Plugin** | BFF logic in API Gateway (Kong custom plugin, AWS Lambda@Edge) | Medium | Low | Small team, simple needs |
| **BFF per Feature** | One BFF per client-feature combo (CheckoutBFF, SearchBFF) | Small | Very High | Very large org with aligned squads |
| **BFF + Aggregator** | BFF calls an aggregator (pre-joined) for common data | Small | Medium | Read-heavy applications |
| **BFF-less (Shared API)** | One API for all clients | Largest | Lowest | Small team, single client |

## 6. Performance Characteristics

| Metric | No BFF (Shared API) | Mobile BFF | Web BFF | GraphQL BFF |
|--------|---------------------|------------|---------|-------------|
| Mobile payload size (order detail) | 50KB | 1.5KB (97% reduction) | 5KB | 2KB (query-dependent) |
| Web page load (API calls per page) | 5-7 calls | N/A | 1 call | 1 call |
| Mobile P50 latency | 150ms (5 calls × 30ms) | 35ms (1 call) | 40ms | 45ms |
| Mobile data usage per session | 5MB | 200KB (96% reduction) | 800KB | 350KB |
| Time to first render (mobile) | 3s | 800ms | 1.2s | 1s |
| Feature deploy cadence | 1x/week (coordinated) | 3x/day (independent) | 5x/day | 2x/day |
| Backend changes affecting mobile | Every change | Only mobile BFF changes | Only web BFF changes | Schema changes |

## 7. Failure Modes

- **BFF proliferation**: Every new client type (iOS, Android, Web, TV, Watch, Alexa, IoT) gets its own BFF. Soon you have 7 BFFs to maintain. Each duplicates common logic (auth, logging, rate limiting). *Mitigation*: Extract a shared BFF base library. Only create a BFF when the client type has genuinely different requirements. Share a common "core BFF" for similar clients.
- **BFF becomes a monolith**: The Web BFF grows to handle 100+ endpoints, each with different aggregation logic. It becomes a mini-monolith — deployment takes 30 minutes and touches unrelated code. *Mitigation*: Split the Web BFF by domain (WebCheckoutBFF, WebCatalogBFF, WebProfileBFF). Each is independently deployable.
- **Duplicate business logic**: Each BFF reimplements the same aggregation logic (e.g., "calculate order total with discounts"). If the discount logic changes, all BFFs must be updated. *Mitigation*: Extract business logic into shared libraries or, better, into the domain services. BFFs should only aggregate, not reimplement business rules.
- **BFF team knowledge silo**: The mobile team owns the mobile BFF. When they're on vacation, no one knows how the mobile BFF works. *Mitigation*: Shared ownership model — each BFF has a primary and secondary owner from different teams. Code reviews must involve someone from another BFF team.
- **Inconsistent error handling**: The mobile BFF returns errors as \`{error: "NOT_FOUND", code: 404}\`. The web BFF returns \`{status: "error", message: "Order not found"}\`. Client teams must handle two different error formats. *Mitigation*: Establish a shared error contract across all BFFs. Use a common error format standardized by the platform team.

## 8. Decision Framework

\`\`\`
├─ How many distinct client types do you have?
│   ├─ 1 → Shared API (no BFF needed)
│   ├─ 2 → BFF per client (web + mobile)
│   └─ 3+ → BFF per client, shared template library
├─ Do clients have significantly different UX requirements?
│   ├─ Yes → BFF (mobile needs tiny payloads, web needs rich data)
│   └─ No → Shared API or GraphQL
├─ How many teams work on clients?
│   ├─ 1 team → Shared API (simpler, less overhead)
│   ├─ 2 teams → BFF per team (each owns their backend)
│   └─ 3+ teams → BFF per team, domain-aligned
├─ What's the mobile connectivity profile?
│   ├─ Poor (3G, emerging markets) → Mobile BFF essential (payload <2KB)
│   ├─ Good (4G/5G) → Nice to have
│   └─ WiFi only → Shared API may suffice
├─ App store release cycles an issue?
│   ├─ Yes → BFF decouples mobile from shared API changes
│   └─ No → Shared API fine
└─ Team maturity / DevOps capability?
    ├─ High → BFF per client (each team deploys independently)
    └─ Low → Start with shared API, extract BFFs later
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'web', label: 'Web App\n(Browser)', type: 'client', x: 60, y: 60 },
    { id: 'ios', label: 'iOS App\n(Swift)', type: 'client', x: 240, y: 60 },
    { id: 'android', label: 'Android App\n(Kotlin)', type: 'client', x: 420, y: 60 },
    { id: 'tv', label: 'Smart TV App\n(React TV)', type: 'client', x: 600, y: 60 },
    { id: 'gateway', label: 'API Gateway\n(AWS ALB / Kong)', type: 'gateway', x: 330, y: 180 },
    { id: 'web_bff', label: 'Web BFF\n(Node.js)', type: 'app', x: 60, y: 300 },
    { id: 'ios_bff', label: 'iOS BFF\n(Kotlin)', type: 'app', x: 240, y: 300 },
    { id: 'android_bff', label: 'Android BFF\n(Node.js)', type: 'app', x: 420, y: 300 },
    { id: 'tv_bff', label: 'TV BFF\n(Go)', type: 'app', x: 600, y: 300 },
    { id: 'order', label: 'Order Service', type: 'storage', x: 170, y: 440 },
    { id: 'product', label: 'Product Service', type: 'storage', x: 330, y: 440 },
    { id: 'customer', label: 'Customer Service', type: 'storage', x: 490, y: 440 },
  ]}
  edges={[
    { from: 'web', to: 'gateway', label: 'X-Client-Type: web' },
    { from: 'ios', to: 'gateway', label: 'X-Client-Type: ios' },
    { from: 'android', to: 'gateway', label: 'X-Client-Type: android' },
    { from: 'tv', to: 'gateway', label: 'X-Client-Type: tv' },
    { from: 'gateway', to: 'web_bff', label: 'route by client type' },
    { from: 'gateway', to: 'ios_bff', label: 'route by client type' },
    { from: 'gateway', to: 'android_bff', label: 'route by client type' },
    { from: 'gateway', to: 'tv_bff', label: 'route by client type' },
    { from: 'web_bff', to: 'order', label: 'aggregate' },
    { from: 'web_bff', to: 'product', label: 'aggregate' },
    { from: 'web_bff', to: 'customer', label: 'aggregate' },
    { from: 'ios_bff', to: 'order', label: 'aggregate' },
    { from: 'ios_bff', to: 'product', label: 'aggregate' },
    { from: 'android_bff', to: 'order', label: 'aggregate' },
    { from: 'android_bff', to: 'product', label: 'aggregate' },
    { from: 'tv_bff', to: 'order', label: 'aggregate' },
  ]}
  height={520}
/>

## 10. Real Production Incident

<Callout type="incident">
**SoundCloud — Mobile API Redesign Outage, 2014**

SoundCloud had a single API used by both web and mobile. As the mobile app grew (50% of traffic), the mobile team needed API changes that the web team didn't want. Every API negotiation took weeks. The mobile team hacked around the API by fetching raw HTML and parsing it client-side — a fragile mess.

**Impact**: Mobile app crash rate was 3x higher than web. Mobile page load times were 8 seconds (vs 2 seconds on web). Mobile data usage was 10MB per session because the API returned full desktop payloads. User ratings dropped from 4.5 to 3.2 stars.

**Root cause**: A single "order" API endpoint returned 50 fields. The mobile app only needed 8. The API was designed for web use cases (SEO metadata, related products, promotional content). The mobile team couldn't change the API without breaking web features.

**Fix**: Phil Calado and Sam Newman created the first BFF at SoundCloud. A dedicated Mobile BFF was built — 300 lines of Node.js that aggregated data from the existing domain services and returned a mobile-optimized response. Payload dropped from 50KB to 1.2KB. Mobile page load dropped from 8s to 1.5s. Mobile app crash rate dropped by 60%. The BFF was owned by the mobile team and deployed independently.

**Lesson**: When a client type has fundamentally different needs (mobile: small payload, offline support, push notifications), give it a dedicated BFF. The BFF should be owned by the client team, not the backend team. Don't let one API serve two masters with conflicting requirements.
</Callout>

## 11. Production Implementation

### AWS Architecture — BFF per Client

\`\`\`yaml
# CloudFormation / CDK — BFF deployment
WebBFF:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: ./web-bff/
    Handler: index.handler
    Runtime: nodejs20.x
    Events:
      Api:
        Type: HttpApi
        Properties:
          Path: /web/{proxy+}
          Method: ANY

MobileBFF:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: ./mobile-bff/
    Handler: index.handler
    Runtime: nodejs20.x
    Events:
      Api:
        Type: HttpApi
        Properties:
          Path: /mobile/{proxy+}
          Method: ANY
\`\`\`

### BFF Client Detection Middleware

\`\`\`typescript
// Express middleware — detect client type and set BFF context
import express from 'express';

const app = express();

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ua = req.headers['user-agent'] ?? '';
  const clientType = req.headers['x-client-type'] as string ?? '';

  if (clientType === 'mobile-app' || /Mobi|Android|iPhone|iPad/i.test(ua)) {
    req.ctx = { bff: 'mobile', clientType: 'mobile-app', optimizeFor: 'bandwidth' };
  } else if (clientType === 'tv-app' || /SmartTV|Roku|AppleTV/i.test(ua)) {
    req.ctx = { bff: 'tv', clientType: 'tv-app', optimizeFor: 'large-text' };
  } else if (clientType === 'iot' || /Alexa|GoogleAssistant|echo/i.test(ua)) {
    req.ctx = { bff: 'iot', clientType: 'iot', optimizeFor: 'voice' };
  } else {
    req.ctx = { bff: 'web', clientType: 'web-app', optimizeFor: 'rich-content' };
  }
  next();
});

// Route to BFF based on context
app.all('/api/*', async (req, res) => {
  const bff = bffRegistry.get(req.ctx.bff);
  if (!bff) return res.status(500).json({ error: 'No BFF found' });
  return bff.handle(req, res);
});
\`\`\`

### Kubernetes Deployment — Independent BFF Deployments

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mobile-bff
  labels:
    app: mobile-bff
    team: mobile
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: mobile-bff
    spec:
      containers:
      - name: app
        image: myrepo/mobile-bff:latest
        ports:
        - containerPort: 3000
        env:
        - name: ORDER_SERVICE_URL
          value: http://order-service:8080
        - name: PRODUCT_SERVICE_URL
          value: http://product-service:8080
        resources:
          requests: { cpu: 250m, memory: 128Mi }
          limits: { cpu: 500m, memory: 256Mi }
\`\`\`

## 12. Real Company Deep Dives

- **SoundCloud (BFF Originators)**: Phil Calado and Sam Newman created the BFF pattern at SoundCloud in 2014. The mobile BFF reduced payload size by 96% (50KB → 1.2KB), cut page load times from 8s to 1.5s, and halved the mobile crash rate. The BFF was a simple Node.js service owned by the mobile team — 300 lines of code.
- **Netflix**: Each client platform (TV, mobile, web, tablet) has its own BFF. The TV BFF returns data optimized for the 10-foot UI (large fonts, simple navigation, minimal interaction). The mobile BFF optimizes for touch gestures and limited bandwidth. The tablet BFF is a hybrid between mobile and web. Each BFF is owned by the respective platform team.
- **Shopify**: The checkout experience has separate BFFs for web checkout (browser), mobile SDK checkout (in-app purchases), and POS terminal (in-store). The web BFF includes promotional upsells and SEO data. The mobile BFF focuses on one-tap payments. The POS BFF returns minimal data optimized for quick scanning and payment processing.
- **Spotify**: Every client platform (desktop, mobile web, Android, iOS, Car Mode, Wear OS, PlayStation) has a dedicated BFF. Each BFF optimizes audio streaming, playlist management, and social features for the specific platform. The Car Mode BFF uses voice-first interactions and large touch targets. The Wear OS BFF returns micro-payloads (<500 bytes).
- **BBC (iPlayer)**: BFFs for web, mobile, and smart TV clients. Each BFF optimizes video streaming and content discovery for the device's capabilities. The Smart TV BFF focuses on 10-foot UI navigation and adaptive bitrate streaming. The Mobile BFF optimizes for cellular data usage and offline downloads. The Web BFF includes social sharing and embed features.
- **Sam Newman (Pattern Co-Creator)**: Sam Newman documented the BFF pattern in his book "Building Microservices" (2015). He emphasizes that BFFs should be "thin" — they aggregate, transform, and optimize, but they don't contain business logic. Business logic belongs in domain services. The BFF is a translation layer, not a business logic layer.

## 13. Interview Playbook

**Q: "Our e-commerce app has a web client and a mobile client. The mobile team complains that the API returns too much data and is slow. How do you solve this?"**
→ Open with: This is a classic BFF use case. The mobile client has fundamentally different needs than the web client. Implement a Mobile BFF.
→ Cover: Create a dedicated Node.js service (Mobile BFF) that calls the same domain services (Order Service, Product Service) but returns a mobile-optimized response. Payload: only the fields the mobile app needs. Images: use thumbnails instead of full resolution. Data: pre-join from multiple services so the mobile app makes 1 API call instead of 5. Owned by the mobile team, deployed independently from the web backend.
→ Depth signal: Don't just truncate fields — redesign the API contract around mobile UX patterns. Mobile apps use push notifications, background refresh, and offline caching. The Mobile BFF should support ETags for conditional requests, pagination with cursors (not offset/limit), and response compression. Consider adding a "checkout one-tap" endpoint to the Mobile BFF that wraps the multi-step checkout into a single call.

**Q: "What's the difference between BFF and API Gateway? Can they be used together?"**
→ Open with: API Gateway is a shared component that handles cross-cutting concerns (auth, rate limiting, routing) for ALL clients. BFF is a per-client service that handles client-specific concerns (data shaping, aggregation, optimization).
→ Cover: They're complementary. A typical architecture is: Client → API Gateway → BFF → Domain Services. The Gateway identifies the client type (header, user-agent) and routes to the correct BFF. The BFF tailors the response for that client. The Gateway handles auth, TLS termination, and throttling once, in one place. Each BFF handles aggregation and optimization independently.
→ Depth signal: Some teams implement BFF logic INSIDE the API Gateway using custom plugins (Kong, Express Gateway) or Lambda@Edge. This reduces the number of services but couples BFF logic to the gateway. For larger teams, separate BFF services are better — they can be deployed independently by different teams, have their own scaling policies, and don't risk taking down the gateway for all clients with a single BFF bug.

## 14. Concept Check Quiz

**Q1:** What is the primary problem BFF solves?**Answer:** The "one API for all clients" problem — where a shared API either over-fetches (too much data for mobile) or under-fetches (too few fields for web), and where different client types have conflicting requirements.

**Q2:** Who should own the BFF — frontend or backend team?**Answer:** The frontend team that owns the client. The mobile team owns the mobile BFF. The web team owns the web BFF. This ensures the BFF evolves with client needs.

**Q3:** How does BFF differ from an API Gateway?**Answer:** API Gateway is a shared component for all clients (auth, routing, rate limiting). BFF is per-client (data shaping, aggregation, optimization). They are often used together: Gateway → BFF → Domain Services.

**Q4:** When should you NOT use BFF?**Answer:** When you have only one client type, a small team (maintaining multiple BFFs is expensive), or a simple CRUD app where overhead isn't justified.

**Q5:** What is the "thin BFF" principle?**Answer:** BFFs should only aggregate, transform, and optimize data — not contain business logic. Business rules belong in domain services. A thin BFF is a translation/adapter layer, not a business logic layer.

## 15. Next Steps

- **API Gateway vs BFF** — Deeper comparison of when to use each, and how to combine them.
- **GraphQL Federation** — Alternative approach where each service owns a subgraph and the gateway composes them.
- **Micro Frontends** — Frontend decomposition pattern that pairs naturally with BFFs.
- **API Composition** — The underlying technique that BFFs use to aggregate data from multiple domain services.`,
    estimatedMin: 15,
    difficulty: "INTERMEDIATE" as const,
    companies: ["SoundCloud", "Netflix", "Shopify", "Spotify", "BBC", "Sam Newman"],
    tags: ["bff", "backend-for-frontend", "client-specific", "mobile", "optimization", "api-design"],
  },


];