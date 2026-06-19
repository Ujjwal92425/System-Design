export const module12Lessons = [
  {
    id: 'lesson-12-01',
    slug: 'coding-craft-01-solid-principles',
    title: 'SOLID Principles — Object-Oriented Design Foundations',
    content: `## 0. Mental Model

> Think of SOLID as the building code for software. Just like a building needs proper load-bearing walls, fire exits, and electrical wiring, your code needs these five principles to remain habitable as it grows. Without them, you get a "software shack" that works today but collapses under the weight of tomorrow's requirements.

## 1. Quick Summary

**SOLID** is an acronym for five design principles that make object-oriented code **maintainable**, **extensible**, and **testable**. Introduced by Robert C. Martin (Uncle Bob), they are: **S**ingle Responsibility, **O**pen/Closed, **L**iskov Substitution, **I**nterface Segregation, **D**ependency Inversion. Following SOLID reduces the cost of change — the single biggest expense in software engineering.

## 2. Definition

| Principle | Name | Core Idea |
|-----------|------|-----------|
| **S** | Single Responsibility | A class should have one, and only one, reason to change |
| **O** | Open/Closed | Open for extension, closed for modification |
| **L** | Liskov Substitution | Subtypes must be substitutable for their base types |
| **I** | Interface Segregation | Many specific interfaces are better than one general interface |
| **D** | Dependency Inversion | Depend on abstractions, not concretions |

## 3. Why It Exists / Problem It Solves

Without SOLID, code becomes **rigid** (one change cascades everywhere), **fragile** (fixing one bug creates three more), **immobile** (can't reuse code in other projects), and **viscous** (easier to hack around the design than follow it).

## 4. When to Use

- **All the time** — SOLID is not a "sometimes" pattern. It's a baseline.
- **S** applies to every class you write
- **O** applies when you expect new behaviors (you always should)
- **L** applies the moment you use inheritance
- **I** applies when interfaces grow beyond their original scope
- **D** applies at module boundaries (database, API, filesystem)

## 5. How It Works — Deep Dive

### S — Single Responsibility Principle

A class should have one job. If "User" handles persistence, validation, email, and logging, changing any of those four concerns requires modifying User.

**Violation:**
\`\`\`typescript
class User {
  constructor(public name: string, public email: string) {}

  save() { /* SQL INSERT */ }
  sendWelcomeEmail() { /* SMTP call */ }
  validate() { /* regex checks */ }
  log() { /* write to file */ }
}
\`\`\`

**Fixed:**
\`\`\`typescript
class User { constructor(public name: string, public email: string) {} }
class UserRepository { save(user: User) { /* SQL */ } }
class EmailService { sendWelcome(user: User) { /* SMTP */ } }
class UserValidator { validate(user: User): boolean { /* checks */ } }
\`\`\`

### O — Open/Closed Principle

Add new behavior by extending, not modifying existing code.

\`\`\`typescript
// Violation: adding a new shape requires editing AreaCalculator
class AreaCalculator {
  calculate(shape: any): number {
    if (shape.type === 'circle') return Math.PI * shape.r ** 2;
    if (shape.type === 'rectangle') return shape.w * shape.h;
    throw new Error('unknown shape');
  }
}

// Fixed: each shape knows its own area
interface Shape { area(): number; }
class Circle implements Shape {
  constructor(public r: number) {}
  area() { return Math.PI * this.r ** 2; }
}
class Rectangle implements Shape {
  constructor(public w: number, public h: number) {}
  area() { return this.w * this.h; }
}
// Add Triangle later without touching existing code
\`\`\`

### L — Liskov Substitution Principle

If a function accepts a base type, it must work with any subtype without knowing about it.

\`\`\`typescript
// Violation: Penguin is a Bird but can't fly
class Bird { fly() { /* flap */ } }
class Penguin extends Bird {
  fly() { throw new Error('Penguins cannot fly'); }
}

// Fixed: separate flying behavior into its own abstraction
class Bird {}
class FlyingBird extends Bird { fly() { /* flap */ } }
class Penguin extends Bird {} // no fly method — no surprise
\`\`\`

### I — Interface Segregation Principle

Don't force classes to implement methods they don't use.

\`\`\`typescript
// Violation: a simple printer must implement scan() and fax()
interface Machine { print(doc: string): void; scan(doc: string): void; fax(doc: string): void; }

// Fixed: segregated interfaces
interface Printer { print(doc: string): void; }
interface Scanner { scan(doc: string): void; }
class SimplePrinter implements Printer {
  print(doc: string) { /* print */ }
}
\`\`\`

### D — Dependency Inversion Principle

High-level modules should not depend on low-level modules. Both should depend on abstractions.

\`\`\`typescript
// Violation: OrderService depends directly on MySQLDatabase
class MySQLDatabase { save(order: Order) { /* SQL */ } }
class OrderService {
  private db = new MySQLDatabase(); // tight coupling
  process(order: Order) { this.db.save(order); }
}

// Fixed: depend on an interface
interface OrderRepository { save(order: Order): void; }
class MySQLOrderRepository implements OrderRepository { save(order: Order) { /* SQL */ } }
class OrderService {
  constructor(private repo: OrderRepository) {} // DI
  process(order: Order) { this.repo.save(order); }
}
\`\`\`

<RoughDiagram
  nodes={[
    { id: 'client', label: 'Client Code', type: 'client', x: 50, y: 120 },
    { id: 'abstraction', label: 'Interface / Abstraction', type: 'gateway', x: 300, y: 80 },
    { id: 'implA', label: 'Concrete Impl A', type: 'worker', x: 550, y: 40 },
    { id: 'implB', label: 'Concrete Impl B', type: 'worker', x: 550, y: 200 },
  ]}
  edges={[
    { from: 'client', to: 'abstraction', label: 'depends on' },
    { from: 'abstraction', to: 'implA', label: 'implements' },
    { from: 'abstraction', to: 'implB', label: 'implements' },
  ]}
  height={280}
/>

## 6. Trade-offs

| Pro | Con |
|-----|-----|
| Code is easier to change without breaking other things | More classes and interfaces (indirection) |
| Better testability (mock dependencies via DI) | Over-engineering for trivial code |
| Enables parallel development | Learning curve for juniors |
| Reusable components across projects | Can lead to premature abstraction |

## 7. Performance Implications

SOLID's indirection has minimal runtime cost in modern VMs/JIT compilers. In critical hot paths (game loops, DSP), direct dependencies may be justified, but this is <1% of code. Profile first, optimize second.

## 8. Failure Modes

1. **Over-abstraction** — Every class gets an interface. You end up with IUserService, IUserRepository, IUserFactory, IUserValidator. Fix: only abstract at module boundaries (IO, external services, databases).

2. **The "One Method Interface" proliferation** — Following ISP to the extreme creates hundreds of single-method interfaces. Group related methods that change together.

3. **Testing-Induced DI abuse** — Don't inject everything just because you want to mock it. Inject at service boundaries, not for value objects or utility functions.

## 9. Live Architecture Diagram

<RoughDiagram
  nodes={[
    { id: 's', label: 'Single Responsibility', type: 'worker', x: 30, y: 30 },
    { id: 'o', label: 'Open / Closed', type: 'worker', x: 220, y: 30 },
    { id: 'l', label: 'Liskov Substitution', type: 'worker', x: 410, y: 30 },
    { id: 'i', label: 'Interface Segregation', type: 'worker', x: 600, y: 30 },
    { id: 'd', label: 'Dependency Inversion', type: 'worker', x: 790, y: 30 },
    { id: 'outcome', label: 'Maintainable Code', type: 'app', x: 410, y: 180 },
  ]}
  edges={[
    { from: 's', to: 'outcome', label: '' },
    { from: 'o', to: 'outcome', label: '' },
    { from: 'l', to: 'outcome', label: '' },
    { from: 'i', to: 'outcome', label: '' },
    { from: 'd', to: 'outcome', label: '' },
  ]}
  height={250}
/>

## 10. Real Production Story

**Netflix's Chaos Monkey and DIP:** Netflix's early architecture had services directly dependent on AWS SDK calls. When they migrated between AWS regions, every service had to be rewritten. They introduced an abstraction layer (DIP) — their own "persistence interface" — and multiple implementations (AWS, GCP, in-memory for testing). Switching regions became a config change. Lesson: abstract at infrastructure boundaries.

## 11. Code Examples

\`\`\`typescript
// Anti-pattern: God class violating every SOLID principle
class GodOrderManager {
  orders: Order[] = [];
  db: MySQLConnection;
  emailer: SMTPClient;
  logger: FileLogger;

  saveOrder(order: Order) { this.db.query('INSERT ...'); }
  sendConfirmation(order: Order) { this.emailer.send(...); }
  logError(err: Error) { this.logger.write(err.message); }
  validateStock(order: Order): boolean { /* ... */ }
  calculatePrice(order: Order): number { /* ... */ }
  generateInvoice(order: Order): PDF { /* ... */ }
}

// Production-grade SOLID refactor
interface OrderRepository { save(order: Order): Promise<void>; }
interface NotificationService { sendConfirmation(order: Order): Promise<void>; }
interface PricingEngine { calculate(order: Order): number; }

class OrderProcessor {
  constructor(
    private repo: OrderRepository,
    private notifier: NotificationService,
    private pricing: PricingEngine,
  ) {}

  async process(order: Order): Promise<void> {
    order.total = this.pricing.calculate(order);
    await this.repo.save(order);
    await this.notifier.sendConfirmation(order);
  }
}

// Testing becomes trivial — mock every dependency independently
class MockOrderRepo implements OrderRepository {
  saved: Order[] = [];
  async save(order: Order) { this.saved.push(order); }
}
\`\`\`

## 12. Interview Playbook

**Q:** "How do you convince a team to adopt SOLID principles?"
**A:** Don't start with theory. Find one concrete pain point — the class that keeps breaking, the feature that takes forever to add. Refactor it with the relevant principle. Show the before/after on cycle time and bug rate. Win trust, then expand.

**Q:** "Can you have too much SOLID?"
**A:** Yes. If every class has an interface, every method is a new file, and changing a field touches 7 files — you've over-applied. SOLID is a guide, not a checklist. Prefer YAGNI: introduce abstractions when you have a second implementation, not before.

## 13. Quiz

\`\`\`
- Q: Which SOLID principle does this violate: class Report { generate() {} saveToFile() {} email() {} }
  Options: S, O, L, I, D
  Correct: S (multiple responsibilities)

- Q: "Depend on abstractions, not concretions" describes which principle?
  Options: S, O, L, I, D
  Correct: D (Dependency Inversion)

- Q: Adding a new payment gateway without editing existing code is an example of:
  Options: S, O, L, I, D
  Correct: O (Open/Closed)
\`\`\``,
    estimatedMin: 20,
    difficulty: 'Beginner' as const,
    companies: ['Microsoft', 'Google', 'Amazon', 'Netflix', 'Stripe'],
    tags: ['SOLID', 'OOD', 'design-principles', 'clean-code', 'refactoring'],
  },
  {
    id: 'lesson-12-02',
    slug: 'coding-craft-02-creational-patterns',
    title: 'Creational Design Patterns — Factory, Singleton, Builder, Prototype',
    content: `## 0. Mental Model

> Creational patterns are like different ways to build a house. Sometimes you need one blueprint repeated exactly (Singleton). Sometimes you need a factory that stamps out identical widgets (Factory). Sometimes you need a custom build with different floor plans, roof types, and finishes (Builder). And sometimes you clone the existing house because building from scratch is too slow (Prototype).

## 1. Quick Summary

**Creational design patterns** abstract the instantiation process, making a system independent of how its objects are created, composed, and represented. The four essential patterns are **Singleton** (one instance), **Factory Method / Abstract Factory** (delegated creation), **Builder** (step-by-step construction), and **Prototype** (cloning).

## 2. Definition

| Pattern | Intent | Use Case |
|---------|--------|----------|
| **Singleton** | Ensure a class has exactly one instance with global access | Database connection pool, logger, configuration manager |
| **Factory Method** | Define an interface for creating objects, let subclasses decide which class to instantiate | Payment gateway factory, UI component creation |
| **Abstract Factory** | Create families of related objects without specifying concrete classes | Cross-platform UI toolkit, theme engine |
| **Builder** | Separate construction of a complex object from its representation | SQL query builder, HTML builder, meal customizer |
| **Prototype** | Create new objects by copying an existing object (clone) | Game object spawning, document templates, cache copy |

## 3. Why It Exists

Direct construction with \`new\` couples your code to concrete classes. Creational patterns decouple the "what" from the "how" — you can change which objects are created and how they're assembled without changing the code that uses them.

## 4. When to Use

- **Singleton:** Exactly one instance must coordinate actions across the system
- **Factory:** You don't know the exact type ahead of time (configuration-based, strategy-based)
- **Builder:** Objects require multi-step construction with many optional parameters
- **Prototype:** Creating new instances is expensive (database calls, network) and you have an existing instance to clone

## 5. How It Works

### Singleton

\`\`\`typescript
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private constructor() { /* connect to DB */ }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  query(sql: string) { /* execute */ }
}

// Usage
const db = DatabaseConnection.getInstance();
db.query('SELECT * FROM users');
\`\`\`

### Factory Method

\`\`\`typescript
interface PaymentGateway { charge(amount: number): Promise<void>; }

class StripeGateway implements PaymentGateway {
  async charge(amount: number) { /* Stripe API */ }
}

class PayPalGateway implements PaymentGateway {
  async charge(amount: number) { /* PayPal API */ }
}

class PaymentGatewayFactory {
  static create(type: 'stripe' | 'paypal'): PaymentGateway {
    switch (type) {
      case 'stripe': return new StripeGateway();
      case 'paypal': return new PayPalGateway();
    }
  }
}
\`\`\`

### Builder

\`\`\`typescript
class SQLQueryBuilder {
  private query: string[] = [];

  select(fields: string[]): this {
    this.query.push('SELECT ' + fields.join(', '));
    return this;
  }
  from(table: string): this {
    this.query.push('FROM ' + table);
    return this;
  }
  where(condition: string): this {
    this.query.push('WHERE ' + condition);
    return this;
  }
  build(): string {
    return this.query.join(' ') + ';';
  }
}

// Usage
const sql = new SQLQueryBuilder()
  .select(['id', 'name'])
  .from('users')
  .where('active = true')
  .build();
// "SELECT id, name FROM users WHERE active = true;"
\`\`\`

### Prototype

\`\`\`typescript
interface Prototype {
  clone(): Prototype;
}

class Report implements Prototype {
  constructor(
    public title: string,
    public data: any[],
    public format: string,
  ) {}

  clone(): Report {
    // Deep clone
    return new Report(this.title, [...this.data], this.format);
  }
}

// Usage: generate 1000 reports from one template
const template = new Report('Monthly Report', [], 'PDF');
const reports = Array.from({ length: 1000 }, () => template.clone());
\`\`\`

<RoughDiagram
  nodes={[
    { id: 'client', label: 'Client Code', type: 'client', x: 50, y: 120 },
    { id: 'factory', label: 'Factory', type: 'gateway', x: 300, y: 40 },
    { id: 'productA', label: 'Product A', type: 'worker', x: 550, y: 20 },
    { id: 'productB', label: 'Product B', type: 'worker', x: 550, y: 120 },
    { id: 'productC', label: 'Product C', type: 'worker', x: 550, y: 220 },
  ]}
  edges={[
    { from: 'client', to: 'factory', label: 'request' },
    { from: 'factory', to: 'productA', label: 'creates' },
    { from: 'factory', to: 'productB', label: 'creates' },
    { from: 'factory', to: 'productC', label: 'creates' },
  ]}
  height={280}
/>

## 6. Trade-offs

| Pattern | Pro | Con |
|---------|-----|-----|
| Singleton | Single point of control, lazy initialization | Global state, hard to test, hidden coupling |
| Factory | Decouples client from concrete types | Extra indirection, class explosion |
| Builder | Clean construction of complex objects | More code than constructor with defaults |
| Prototype | Fast cloning of expensive objects | Deep vs shallow copy complexity |

## 7. Quiz

\`\`\`
- Q: Which pattern would you use to ensure only one database connection pool exists?
  Options: Factory, Singleton, Builder, Prototype
  Correct: Singleton

- Q: A class hierarchy for creating UI buttons across Windows/Mac/Linux uses which pattern?
  Options: Singleton, Abstract Factory, Builder, Prototype
  Correct: Abstract Factory
\`\`\``,
    estimatedMin: 22,
    difficulty: 'Intermediate' as const,
    companies: ['Amazon', 'Uber', 'Spotify', 'Airbnb'],
    tags: ['design-patterns', 'creational', 'singleton', 'factory', 'builder', 'prototype'],
  },
  {
    id: 'lesson-12-03',
    slug: 'coding-craft-03-structural-patterns',
    title: 'Structural Design Patterns — Adapter, Decorator, Facade, Proxy, Composite',
    content: `## 0. Mental Model

> Structural patterns are like plumbing adapters for your code. When you visit a foreign country, you need an adapter (Adapter) for your plug. When you want to add features to a house without rebuilding it, you decorate (Decorator). When you want a simple "light switch" interface that hides complex wiring, you build a facade (Facade). When you need a bodyguard or stand-in, you use a proxy (Proxy). And when you treat individual objects and compositions uniformly, you use the composite pattern (Composite).

## 1. Quick Summary

**Structural patterns** deal with object composition — how classes and objects are assembled into larger structures while keeping them flexible and efficient. Five essential patterns: **Adapter** (make incompatible interfaces work together), **Decorator** (add behavior without subclassing), **Facade** (simplify a complex subsystem), **Proxy** (control access to an object), and **Composite** (treat individual and composite objects uniformly).

## 2. Definition

| Pattern | Intent | Real-World Analogy |
|---------|--------|-------------------|
| **Adapter** | Convert interface A to interface B so incompatible classes can cooperate | Power plug adapter |
| **Decorator** | Attach new responsibilities to an object dynamically | Wrapping a gift — layer by layer |
| **Facade** | Provide a unified interface to a set of subsystem interfaces | Restaurant menu (hides kitchen complexity) |
| **Proxy** | Provide a surrogate or placeholder for another object to control access | Credit card (proxy for bank account) |
| **Composite** | Compose objects into tree structures to represent part-whole hierarchies | File system (files and folders treated identically) |

## 3. Code Examples

### Adapter

\`\`\`typescript
// Legacy XML service
class XMLReportService {
  getXML(): string { return '<report><data>42</data></report>'; }
}

// New system expects JSON
interface JSONReportService {
  getJSON(): Record<string, any>;
}

class ReportAdapter implements JSONReportService {
  constructor(private xmlService: XMLReportService) {}

  getJSON(): Record<string, any> {
    const xml = this.xmlService.getXML();
    // Parse XML → JSON (simplified)
    return { data: 42 };
  }
}

// Usage
const jsonService: JSONReportService = new ReportAdapter(new XMLReportService());
\`\`\`

### Decorator

\`\`\`typescript
interface Coffee { cost(): number; description(): string; }

class BasicCoffee implements Coffee {
  cost() { return 5; }
  description() { return 'Coffee'; }
}

abstract class CoffeeDecorator implements Coffee {
  constructor(protected coffee: Coffee) {}
  abstract cost(): number;
  abstract description(): string;
}

class MilkDecorator extends CoffeeDecorator {
  cost() { return this.coffee.cost() + 2; }
  description() { return this.coffee.description() + ' + Milk'; }
}

class WhipDecorator extends CoffeeDecorator {
  cost() { return this.coffee.cost() + 1; }
  description() { return this.coffee.description() + ' + Whip'; }
}

// Usage: $8 coffee
const order = new WhipDecorator(new MilkDecorator(new BasicCoffee()));
console.log(order.cost()); // 8
console.log(order.description()); // "Coffee + Milk + Whip"
\`\`\`

### Facade

\`\`\`typescript
// Complex subsystem
class CPU { freeze() {} jump(pos: number) {} execute() {} }
class Memory { load(pos: number, data: string) {} }
class HardDrive { read(pos: number) { return ''; } }

// Facade
class Computer {
  private cpu = new CPU();
  private memory = new Memory();
  private hd = new HardDrive();

  start() {
    this.cpu.freeze();
    this.memory.load(0, this.hd.read(0));
    this.cpu.jump(0);
    this.cpu.execute();
  }
}

// Client calls one method instead of coordinating the subsystem
const computer = new Computer();
computer.start();
\`\`\`

### Proxy

\`\`\`typescript
interface Image { display(): void; }

class RealImage implements Image {
  constructor(private filename: string) {
    this.loadFromDisk(); // expensive
  }
  private loadFromDisk() { console.log('Loading ' + this.filename); }
  display() { console.log('Displaying ' + this.filename); }
}

class ProxyImage implements Image {
  private realImage: RealImage | null = null;
  constructor(private filename: string) {}

  display() {
    if (!this.realImage) {
      this.realImage = new RealImage(this.filename); // lazy load
    }
    this.realImage.display();
  }
}

// Usage: image only loads when first displayed
const image = new ProxyImage('photo.jpg');
// image.display(); // would trigger load
\`\`\`

### Composite

\`\`\`typescript
interface Component { render(): void; }

class Leaf implements Component {
  constructor(private name: string) {}
  render() { console.log(this.name); }
}

class Composite implements Component {
  private children: Component[] = [];

  add(child: Component) { this.children.push(child); }
  render() {
    for (const child of this.children) {
      child.render();
    }
  }
}

// Usage: tree structure
const file1 = new Leaf('file1.txt');
const file2 = new Leaf('file2.txt');
const folder = new Composite();
folder.add(file1);
folder.add(file2);
folder.render(); // renders all files
\`\`\`

<RoughDiagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 50, y: 140 },
    { id: 'target', label: 'Target Interface', type: 'gateway', x: 300, y: 60 },
    { id: 'adaptee', label: 'Adaptee (Legacy)', type: 'db', x: 300, y: 220 },
    { id: 'adapter', label: 'Adapter', type: 'worker', x: 550, y: 140 },
  ]}
  edges={[
    { from: 'client', to: 'target', label: 'uses' },
    { from: 'target', to: 'adapter', label: 'implements' },
    { from: 'adapter', to: 'adaptee', label: 'wraps' },
  ]}
  height={280}
/>

## 4. Trade-offs

| Pattern | Pro | Con |
|---------|-----|-----|
| Adapter | Reuse legacy code, interface compatibility | Extra layer, can mask design issues |
| Decorator | Flexible alternative to subclassing, composable | Many small objects, harder to debug stack |
| Facade | Simplifies client code, decouples subsystems | Can become a god object if overused |
| Proxy | Lazy loading, access control, logging | Indirect reference adds latency |
| Composite | Uniform treatment of individual/composite objects | Can make design overly general |

## 5. Quiz

\`\`\`
- Q: You need to add logging, timing, and caching to an existing service method without modifying its class. Which pattern?
  Options: Adapter, Decorator, Facade, Proxy
  Correct: Decorator

- Q: Which pattern provides a simplified interface to a complex subsystem?
  Options: Adapter, Composite, Facade, Proxy
  Correct: Facade

- Q: Files and Folders in a file system that share the same interface is an example of:
  Options: Adapter, Composite, Decorator, Proxy
  Correct: Composite
\`\`\``,
    estimatedMin: 20,
    difficulty: 'Intermediate' as const,
    companies: ['Google', 'Amazon', 'Netflix', 'Microsoft', 'Stripe'],
    tags: ['design-patterns', 'structural', 'adapter', 'decorator', 'facade', 'proxy', 'composite'],
  },
  {
    id: 'lesson-12-04',
    slug: 'coding-craft-04-behavioral-patterns',
    title: 'Behavioral Design Patterns — Observer, Strategy, Command, Template, State',
    content: `## 0. Mental Model

> Behavioral patterns are about communication between objects. Think of a newsroom: the Observer pattern is the wire service pushing breaking news to every desk. The Strategy pattern is choosing a different delivery method for print vs digital. The Command pattern is encapsulating "publish this article" as a request object that can be queued and undone. The Template pattern is the standard publishing workflow (write → edit → approve → publish). And the State pattern is how an article behaves differently when it's a draft vs published vs archived.

## 1. Quick Summary

**Behavioral patterns** concern algorithms and the assignment of responsibilities between objects. Five essential patterns: **Observer** (one-to-many dependency notification), **Strategy** (interchangeable algorithms), **Command** (encapsulate a request as an object), **Template Method** (define skeleton of algorithm, defer steps to subclasses), **State** (alter behavior when internal state changes).

## 2. Definitions

| Pattern | Intent | Example |
|---------|--------|---------|
| **Observer** | When one object changes state, all dependents are notified automatically | Event emitters, UI listeners, pub/sub |
| **Strategy** | Define a family of algorithms, make them interchangeable | Sorting strategies, payment methods, compression |
| **Command** | Encapsulate a request as an object, supporting undo/queue/log | Undo/redo, task queues, transactional operations |
| **Template Method** | Define algorithm skeleton, let subclasses override specific steps | Build pipelines, data processing flows |
| **State** | Allow an object to alter its behavior when its internal state changes | Document workflow, connection states, game states |

## 3. Code Examples

### Observer

\`\`\`typescript
interface Observer { update(data: any): void; }

class Subject {
  private observers: Observer[] = [];
  attach(obs: Observer) { this.observers.push(obs); }
  detach(obs: Observer) { this.observers = this.observers.filter(o => o !== obs); }
  notify(data: any) { this.observers.forEach(o => o.update(data)); }
}

// Usage
class Logger implements Observer {
  update(data: any) { console.log('LOG:', data); }
}
class AnalyticsTracker implements Observer {
  update(data: any) { /* send to analytics */ }
}

const subject = new Subject();
subject.attach(new Logger());
subject.attach(new AnalyticsTracker());
subject.notify({ event: 'user_signup' });
\`\`\`

### Strategy

\`\`\`typescript
interface CompressionStrategy {
  compress(data: Buffer): Buffer;
}

class ZipCompression implements CompressionStrategy {
  compress(data: Buffer): Buffer { /* zip logic */ return data; }
}
class GzipCompression implements CompressionStrategy {
  compress(data: Buffer): Buffer { /* gzip logic */ return data; }
}

class FileCompressor {
  constructor(private strategy: CompressionStrategy) {}
  setStrategy(strategy: CompressionStrategy) { this.strategy = strategy; }
  compress(data: Buffer): Buffer { return this.strategy.compress(data); }
}

// Switch strategies at runtime
const compressor = new FileCompressor(new ZipCompression());
// compressor.setStrategy(new GzipCompression());
\`\`\`

### Command

\`\`\`typescript
interface Command { execute(): void; undo(): void; }

class BankTransfer implements Command {
  constructor(private from: string, private to: string, private amount: number) {}
  execute() { /* withdraw from, deposit to */ }
  undo() { /* reverse the transfer */ }
}

class TransactionQueue {
  private history: Command[] = [];
  execute(cmd: Command) {
    cmd.execute();
    this.history.push(cmd);
  }
  undo() {
    const cmd = this.history.pop();
    cmd?.undo();
  }
}
\`\`\`

### Template Method

\`\`\`typescript
abstract class DataProcessor {
  // Template method — defines the skeleton
  process(): void {
    this.loadData();
    this.transform();
    this.save();
    this.cleanup();
  }

  abstract loadData(): void;
  abstract transform(): void;
  abstract save(): void;
  cleanup() { /* default: no-op */ } // hook
}

class CSVProcessor extends DataProcessor {
  loadData() { /* read CSV */ }
  transform() { /* parse rows */ }
  save() { /* insert to DB */ }
}

class JSONProcessor extends DataProcessor {
  loadData() { /* read JSON */ }
  transform() { /* parse objects */ }
  save() { /* insert to DB */ }
}
\`\`\`

### State

\`\`\`typescript
interface DocumentState {
  publish(): void;
  edit(): void;
  archive(): void;
}

class DraftState implements DocumentState {
  constructor(private doc: Document) {}
  publish() { this.doc.setState(new PublishedState(this.doc)); }
  edit() { /* already editable */ }
  archive() { this.doc.setState(new ArchivedState(this.doc)); }
}

class PublishedState implements DocumentState {
  constructor(private doc: Document) {}
  publish() { /* already published */ }
  edit() { this.doc.setState(new DraftState(this.doc)); } // unpublish
  archive() { this.doc.setState(new ArchivedState(this.doc)); }
}

class ArchivedState implements DocumentState {
  constructor(private doc: Document) {}
  publish() { /* cannot publish archived doc */ }
  edit() { /* cannot edit archived doc */ }
  archive() { /* already archived */ }
}

class Document {
  private state: DocumentState = new DraftState(this);
  setState(state: DocumentState) { this.state = state; }
  publish() { this.state.publish(); }
  edit() { this.state.edit(); }
  archive() { this.state.archive(); }
}
\`\`\`

<RoughDiagram
  nodes={[
    { id: 'subject', label: 'Subject', type: 'app', x: 80, y: 140 },
    { id: 'obs1', label: 'Observer A (Logger)', type: 'worker', x: 350, y: 40 },
    { id: 'obs2', label: 'Observer B (Analytics)', type: 'worker', x: 350, y: 140 },
    { id: 'obs3', label: 'Observer C (Email)', type: 'worker', x: 350, y: 240 },
  ]}
  edges={[
    { from: 'subject', to: 'obs1', label: 'notify' },
    { from: 'subject', to: 'obs2', label: 'notify' },
    { from: 'subject', to: 'obs3', label: 'notify' },
  ]}
  height={300}
/>

## 4. Quiz

\`\`\`
- Q: You need to send email, update analytics, and log whenever a new user registers. Which pattern?
  Options: Strategy, Observer, Command, State
  Correct: Observer

- Q: A checkout flow supports credit card, PayPal, and crypto payments. Which pattern?
  Options: Observer, Strategy, Command, Template
  Correct: Strategy

- Q: Implementing undo/redo in a drawing application uses which pattern?
  Options: State, Observer, Command, Template
  Correct: Command
\`\`\``,
    estimatedMin: 20,
    difficulty: 'Intermediate' as const,
    companies: ['Google', 'Uber', 'Amazon', 'Microsoft', 'Netflix'],
    tags: ['design-patterns', 'behavioral', 'observer', 'strategy', 'command', 'template', 'state'],
  },
  {
    id: 'lesson-12-05',
    slug: 'coding-craft-05-clean-code-refactoring',
    title: 'Clean Code & Refactoring Techniques',
    content: `## 0. Mental Model

> Clean code is like a well-organized kitchen. A professional chef can find any ingredient, tool, or spice instantly because everything has a place. A messy kitchen means burnt food, duplicated effort, and accidents. Code is the same — you spend 10x more time reading code than writing it, so optimize for the reader, not the writer.

## 1. Quick Summary

**Clean code** is code that is **easy to read**, **understand**, and **change**. It's not about clever tricks or concise one-liners — it's about clear intent, consistent naming, small functions, and minimal surprise. **Refactoring** is the process of improving code structure without changing its behavior. Key principles: **DRY** (Don't Repeat Yourself), **KISS** (Keep It Simple, Stupid), **YAGNI** (You Ain't Gonna Need It), and **Boy Scout Rule** (leave the code cleaner than you found it).

## 2. Core Principles

| Principle | Meaning | Application |
|-----------|---------|-------------|
| **Meaningful Names** | Names reveal intent | \`getUser()\` not \`getData()\` |
| **Small Functions** | One job, few parameters | Max 20 lines, 0-2 params ideal |
| **No Side Effects** | Functions do what they promise | Don't modify global state |
| **DRY** | Every piece of knowledge has one representation | Extract duplication into functions |
| **KISS** | Simple is better than clever | Prefer readability over brevity |
| **YAGNI** | Don't build what you don't need today | No premature abstraction |
| **Command-Query Separation** | Commands mutate, queries return | Don't do both in one method |

## 3. Refactoring Techniques

### Extract Method

\`\`\`typescript
// Before
function processOrder(order: Order) {
  console.log('Processing order ' + order.id);
  // 20 lines of validation
  if (!order.items.length) throw new Error('Empty order');
  if (order.items.some(i => i.price <= 0)) throw new Error('Invalid price');
  if (order.total <= 0) throw new Error('Invalid total');
  // ... more logic
}

// After
function processOrder(order: Order) {
  logOrder(order.id);
  validateOrder(order);
  // ... rest
}

function logOrder(id: string) { console.log('Processing order ' + id); }
function validateOrder(order: Order) {
  if (!order.items.length) throw new Error('Empty order');
  if (order.items.some(i => i.price <= 0)) throw new Error('Invalid price');
  if (order.total <= 0) throw new Error('Invalid total');
}
\`\`\`

### Replace Magic Numbers with Constants

\`\`\`typescript
// Before
if (age >= 65) { discount = price * 0.2; }

// After
const SENIOR_AGE_THRESHOLD = 65;
const SENIOR_DISCOUNT_RATE = 0.2;
if (age >= SENIOR_AGE_THRESHOLD) { discount = price * SENIOR_DISCOUNT_RATE; }
\`\`\`

### Simplify Conditionals

\`\`\`typescript
// Before
if (user.isActive && user.subscription !== null && !user.isBanned) {
  // show premium content
}

// After
const canAccessPremium = user.isActive && user.subscription !== null && !user.isBanned;
if (canAccessPremium) {
  // show premium content
}
\`\`\`

### Replace Nested Conditionals with Guard Clauses

\`\`\`typescript
// Before
function process(user: User | null) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        // main logic
      }
    }
  }
}

// After
function process(user: User | null) {
  if (!user) return;
  if (!user.isActive) return;
  if (!user.hasPermission) return;
  // main logic (no nesting)
}
\`\`\`

### Anti-Patterns to Avoid

\`\`\`typescript
// GOD CLASS — one class does everything
class Utils {
  static formatDate(d: Date): string { /* ... */ }
  static sendEmail(to: string) { /* ... */ }
  static calculateTax(amount: number) { /* ... */ }
  static generateReport() { /* ... */ }
}

// SPAGHETTI CODE — intertwined concerns, global state
let user: User;
function loadUser(id: string) { /* sets global user */ }
function renderProfile() { /* reads global user */ }

// LASAGNA CODE — too many abstraction layers for simple tasks
class UserServiceFactory {
  static create(): UserService { return new UserServiceImpl(new UserRepositoryImpl(new DatabaseConnection())); }
}
\`\`\`

### The Boy Scout Rule

Always leave the code a little cleaner than you found it. If you see a poorly named variable while fixing a bug — rename it. If you find duplicated code — extract it. The compound effect of small improvements over time is massive.

## 4. Real Production Story

**Stripe's API style guide** mandates that every endpoint function fits on one screen (66 lines). This forces developers to extract helper functions and keep the main flow readable. Their code review checklist specifically checks for "would someone reading this 6 months from now understand intent without comments?" — because comments often lie, but clean code tells the truth.

## 5. Quiz

\`\`\`
- Q: What principle does this violate? const result = a * 0.15 + b * 0.20 - c * 0.05
  Options: DRY, Magic Numbers, KISS, YAGNI
  Correct: Magic Numbers

- Q: The best name for a function that saves a user and sends a welcome email is:
  Options: saveUser(), processUser(), saveUserAndSendEmail(), handleUser()
  Correct: saveUserAndSendEmail() (or split into two functions)

- Q: "Leave code cleaner than you found it" is known as:
  Options: DRY, KISS, Boy Scout Rule, YAGNI
  Correct: Boy Scout Rule
\`\`\``,
    estimatedMin: 18,
    difficulty: 'Beginner' as const,
    companies: ['Stripe', 'GitHub', 'Google', 'Amazon', 'Microsoft'],
    tags: ['clean-code', 'refactoring', 'DRY', 'KISS', 'YAGNI', 'code-quality'],
  },
  {
    id: 'lesson-12-06',
    slug: 'coding-craft-06-api-design-best-practices',
    title: 'API Design Best Practices — REST Conventions, Pagination, Errors & OpenAPI',
    content: `## 0. Mental Model

> A well-designed API is like a well-designed ATM. You know exactly what buttons to press, what information to enter, and what the machine will return. A poorly designed ATM has cryptic buttons, unexpected fees, and cryptic error codes. Your API consumers should never need to guess.

## 1. Quick Summary

**API design best practices** cover every aspect of the interface between services: **naming conventions** (resources are nouns, actions are HTTP methods), **request/response structure** (consistent JSON envelopes), **pagination** (cursor-based for real-time, offset for simple lists), **error formatting** (standardized error objects with codes and messages), **versioning** (URL or header), and **documentation** (OpenAPI/Swagger). A great API is intuitive on the first call.

## 2. Core Conventions

### URL Structure

\`\`\`
GET    /users                  # List users
POST   /users                  # Create user
GET    /users/:id              # Get user
PUT    /users/:id              # Replace user
PATCH  /users/:id              # Partial update
DELETE /users/:id              # Delete user
GET    /users/:id/orders       # Sub-resource collection
\`\`\`

**Rules:**
- Use plural nouns (\`/users\` not \`/user\`)
- Nest resources to express hierarchy (\`/users/:id/orders\`)
- Use kebab-case for multi-word resources: \`/shipping-addresses\`
- Actions that don't map to CRUD use verbs: \`/orders/:id/cancel\`

### Pagination

\`\`\`typescript
// Offset-based (simple, stable datasets)
GET /users?offset=0&limit=20
// Response:
{
  "data": [...],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 142,
    "next": "/users?offset=20&limit=20"
  }
}

// Cursor-based (for real-time, avoids offset drift)
GET /users?cursor=abc123&limit=20
// Response:
{
  "data": [...],
  "pagination": {
    "cursor": "abc123",
    "nextCursor": "def456",
    "hasMore": true
  }
}
\`\`\`

### Standardized Errors

\`\`\`typescript
// Always return the same error structure
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Account balance 5.00 is insufficient for transfer of 100.00",
    "details": {
      "balance": 5.00,
      "required": 100.00,
      "accountId": "acc_123"
    },
    "requestId": "req_abc123",
    "timestamp": "2026-06-18T10:00:00Z"
  }
}

// HTTP status codes matter
200 — Success
201 — Created (POST)
204 — No Content (DELETE)
400 — Bad Request (validation)
401 — Unauthorized (no auth)
403 — Forbidden (no permission)
404 — Not Found
409 — Conflict (duplicate, stale version)
422 — Unprocessable Entity (semantic error)
429 — Too Many Requests (rate limit)
500 — Internal Server Error
\`\`\`

### OpenAPI Example

\`\`\`yaml
openapi: 3.0.0
paths:
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: User object
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
\`\`\`

## 3. Anti-Patterns

\`\`\`
// ❌ Verbs in URLs
POST /getUsers
POST /deleteUser

// ✅ HTTP methods convey action
GET  /users
DELETE /users/:id

// ❌ Inconsistent error format (string, then object, then array)
400 — "User not found"
404 — { "error": "Not found" }
500 — ["internal", "error"]

// ✅ Consistent format always
{ "error": { "code": "...", "message": "..." } }

// ❌ Returning 200 for everything with a status field
{ "status": "error", "code": 404, "message": "Not found" }

// ✅ Use proper HTTP status codes
404 — { "error": { "code": "NOT_FOUND", "message": "..." } }
\`\`\`

## 4. Quiz

\`\`\`
- Q: What HTTP method cancels an order: GET /orders/:id/cancel or POST /orders/:id/cancel?
  Options: GET, POST, PUT, DELETE
  Correct: POST (cancel is an action, not a resource)

- Q: Which pagination approach avoids data drift when new items are inserted?
  Options: Offset-based, Cursor-based, Page-based, Limit-based
  Correct: Cursor-based

- Q: What status code for "rate limit exceeded"?
  Options: 400, 403, 429, 503
  Correct: 429
\`\`\``,
    estimatedMin: 16,
    difficulty: 'Intermediate' as const,
    companies: ['Stripe', 'Twilio', 'GitHub', 'Google', 'Amazon'],
    tags: ['api-design', 'REST', 'OpenAPI', 'pagination', 'error-handling', 'versioning'],
  },
  {
    id: 'lesson-12-07',
    slug: 'coding-craft-07-error-handling-patterns',
    title: 'Error Handling Patterns — Exceptions, Results, Error Boundaries',
    content: `## 0. Mental Model

> Error handling is like airbags in a car. You hope you never need them, but when something goes wrong at high speed, they're the difference between a fender bender and a catastrophe. Every code path that can fail should have a planned response — not a crash.

## 1. Quick Summary

**Error handling** is how a system responds to unexpected conditions. Three main approaches: **Exceptions** (throw/catch — dominant in OOP languages), **Result Types** (return success or failure as a value — functional approach), and **Error Boundaries** (catch errors at component boundaries — React pattern). Good error handling distinguishes between **programming errors** (bugs — should crash/fail fast) and **operational errors** (network, validation — should be handled gracefully).

## 2. Pattern Comparison

| Pattern | Languages | Pros | Cons |
|---------|-----------|------|------|
| **Exceptions** | Java, C#, Python, TS | Stack traces, automatic propagation | Hidden control flow, easy to forget |
| **Result Types** | Rust, Haskell, TS (union types) | Explicit, type-safe, forces handling | Verbose, requires pattern matching |
| **Error Boundaries** | React, UI frameworks | Prevents UI crashes, graceful degradation | UI only, not for business logic |

## 3. Code Examples

### Exception Pattern

\`\`\`typescript
class InsufficientFundsError extends Error {
  constructor(public balance: number, public required: number) {
    super('Insufficient funds');
    this.name = 'InsufficientFundsError';
  }
}

function transfer(from: Account, to: Account, amount: number): void {
  if (from.balance < amount) {
    throw new InsufficientFundsError(from.balance, amount);
  }
  from.balance -= amount;
  to.balance += amount;
}

// Caller must remember to catch
try {
  transfer(alice, bob, 100);
} catch (err) {
  if (err instanceof InsufficientFundsError) {
    console.log(\`Need \${err.required - err.balance} more\`);
  }
}
\`\`\`

### Result Type Pattern

\`\`\`typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function transfer(from: Account, to: Account, amount: number): Result<void, InsufficientFundsError> {
  if (from.balance < amount) {
    return { ok: false, error: new InsufficientFundsError(from.balance, amount) };
  }
  from.balance -= amount;
  to.balance += amount;
  return { ok: true, value: undefined };
}

// Caller MUST check the result (type-safe)
const result = transfer(alice, bob, 100);
if (!result.ok) {
  console.log(\`Need \${result.error.required - result.error.balance} more\`);
}
\`\`\`

### Error Boundary (React)

\`\`\`typescript
class ErrorBoundary extends React.Component<{ fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logErrorToService(error, info); // don't swallow silently
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<OrderErrorCard />}>
  <OrderDetails orderId={id} />
</ErrorBoundary>
\`\`\`

## 4. Failure Modes

1. **Swallowed exceptions** — \`try {} catch {}\` (empty catch). The worst — the system continues in an undefined state.
2. **Catching generic Exception** — hides bugs you should fix. Catch specific error types.
3. **Exceptions for control flow** — using try/catch like if/else. Expensive and confusing.
4. **Not distinguishing operational vs programmer errors** — crashing on validation is OK if you return 400 first. Crashing on null reference is a bug.

## 5. Production Best Practices

\`\`\`typescript
// Consistency: use a Result type at service boundaries, exceptions internally
class OrderService {
  async createOrder(input: CreateOrderInput): Promise<Result<Order, OrderError>> {
    try {
      const user = await this.userRepo.findById(input.userId);
      if (!user) return { ok: false, error: new OrderError('USER_NOT_FOUND', 'User does not exist') };

      const payment = await this.paymentProcessor.charge(input.amount);
      // exception thrown here will propagate up — caught by global handler
    } catch (err) {
      // Log every error with a correlation ID
      logger.error({ error: err, input });
      return { ok: false, error: new OrderError('INTERNAL', 'Something went wrong') };
    }
  }
}

// Global error handler (Express example)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  logger.error({ correlationId, error: err.message, stack: err.stack });

  if (err instanceof ValidationError) return res.status(400).json({ error: { code: 'VALIDATION', message: err.message } });
  if (err instanceof AuthError) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });

  // Don't leak internals for unexpected errors
  res.status(500).json({ error: { code: 'INTERNAL', message: 'An unexpected error occurred', correlationId } });
});
\`\`\`

## 6. Quiz

\`\`\`
- Q: An empty catch block (try {} catch {}) is known as:
  Options: Fail-fast, Swallowed exception, Guardian pattern, Error boundary
  Correct: Swallowed exception

- Q: Which pattern forces the caller to handle errors at compile time?
  Options: Exceptions, Result Types, Error Boundaries, try/catch
  Correct: Result Types

- Q: A React component that catches rendering errors and shows a fallback UI is a:
  Options: try/catch, Result type, Error Boundary, Guard clause
  Correct: Error Boundary
\`\`\``,
    estimatedMin: 16,
    difficulty: 'Intermediate' as const,
    companies: ['Stripe', 'Microsoft', 'Google', 'Amazon', 'Netflix'],
    tags: ['error-handling', 'exceptions', 'result-types', 'error-boundaries', 'resilience'],
  },
  {
    id: 'lesson-12-08',
    slug: 'coding-craft-08-testing-patterns-tdd',
    title: 'Testing Patterns — Unit Tests, Mocking, TDD & Test Design',
    content: `## 0. Mental Model

> Tests are like a safety net for a trapeze artist. Without a net, you perform cautiously, afraid to make bold moves. With a net, you can try new tricks, recover from mistakes, and push boundaries. Good tests give you the confidence to refactor fearlessly.

## 1. Quick Summary

**Testing patterns** organize how you write automated tests. **Unit tests** verify individual components in isolation (mock external dependencies). **Integration tests** verify components work together (real database, real API). **TDD** (Test-Driven Development) writes the test before the code — red (failing test) → green (make it pass) → refactor (improve code). A good test is **FAST** (runs in ms), **ISOLATED** (no shared state), **REPEATABLE** (same result every time), and **SELF-VERIFYING** (pass/fail).

## 2. The Testing Trophy

Not the traditional pyramid. Modern testing prefers:

\`\`\`
     ╱ ╲            Static Analysis (TypeScript, ESLint)
    ╱   ╲           Unit Tests (fast, many — 70%)
   ╱     ╲          Integration Tests (fewer, slower — 20%)
  ╱       ╲         E2E Tests (few, slow — 10%)
 ╱_________╲        
\`\`\`

## 3. Code Examples

### Unit Test with Mocks

\`\`\`typescript
// Service under test
class UserService {
  constructor(private repo: UserRepository, private emailer: EmailService) {}
  async activate(id: string): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    user.activate();
    await this.repo.save(user);
    await this.emailer.sendActivation(user.email);
    return user;
  }
}

// Unit test (no real DB, no real email)
describe('UserService.activate', () => {
  it('activates user and sends email', async () => {
    const user = new User('test-id', 'test@example.com');
    const repo = { findById: vi.fn().mockResolvedValue(user), save: vi.fn() };
    const emailer = { sendActivation: vi.fn() };
    const service = new UserService(repo as any, emailer as any);

    const result = await service.activate('test-id');

    expect(result.isActive).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(user);
    expect(emailer.sendActivation).toHaveBeenCalledWith('test@example.com');
  });

  it('throws NotFoundError when user does not exist', async () => {
    const repo = { findById: vi.fn().mockResolvedValue(null), save: vi.fn() };
    const emailer = { sendActivation: vi.fn() };
    const service = new UserService(repo as any, emailer as any);

    await expect(service.activate('nonexistent')).rejects.toThrow(NotFoundError);
    expect(repo.save).not.toHaveBeenCalled();
    expect(emailer.sendActivation).not.toHaveBeenCalled();
  });
});
\`\`\`

### TDD Cycle

\`\`\`typescript
// Step 1: RED — Write a failing test first
describe('ShoppingCart.total', () => {
  it('returns 0 for empty cart', () => {
    const cart = new ShoppingCart();
    expect(cart.total).toBe(0);
  });
});

// Step 2: GREEN — Write minimal code to pass
class ShoppingCart {
  get total() { return 0; }
}

// Step 3: REFACTOR — Improve code (if needed)

// Next iteration: add item
it('calculates total with one item', () => {
  const cart = new ShoppingCart();
  cart.addItem({ price: 10, qty: 2 });
  expect(cart.total).toBe(20);
});

// Now implement addItem and update total...
\`\`\`

### Test Fixtures and Factories

\`\`\`typescript
// Instead of repeating setup in every test
function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'default-id',
    name: 'Test User',
    email: 'test@example.com',
    isActive: true,
    ...overrides,
  };
}

it('sends welcome email on signup', async () => {
  const user = createUser({ email: 'new@example.com' });
  // test with this user
});
\`\`\`

## 4. Anti-Patterns

1. **Testing implementation details** — tests that break when you refactor internals. Test behavior, not methods.
2. **Shared mutable state** — tests that depend on each other (order-dependent). Each test should set up its own state.
3. **Over-mocking** — mocking everything creates brittle tests. Mock at service boundaries, not for every call.
4. **Asserting too much** — testing every getter/setter. Focus on business logic paths.
5. **Flaky tests** — tests that pass sometimes but not always (time-dependent, random, async races). Make them deterministic.

## 5. Quiz

\`\`\`
- Q: TDD cycle is: Red → Green → ?
  Options: Deploy, Refactor, Review, Document
  Correct: Refactor

- Q: What's the problem with a test that fails when you rename a private method?
  Options: Flaky test, Testing implementation details, Slow test, No assertion
  Correct: Testing implementation details

- Q: Which kind of test is fastest to run?
  Options: E2E, Integration, Unit, Visual
  Correct: Unit
\`\`\``,
    estimatedMin: 18,
    difficulty: 'Intermediate' as const,
    companies: ['Stripe', 'GitHub', 'Netflix', 'Google', 'ThoughtWorks'],
    tags: ['testing', 'TDD', 'mocking', 'unit-tests', 'integration-tests', 'quality'],
  },
  {
    id: 'lesson-12-09',
    slug: 'coding-craft-09-concurrency-async-patterns',
    title: 'Concurrency & Async Patterns — Promises, Race Conditions, Parallelism',
    content: `## 0. Mental Model

> Concurrency is like a juggler keeping multiple balls in the air. Each ball follows its own path (async operation), and the juggler switches between them without dropping any (event loop). Parallelism is multiple jugglers each handling their own set of balls (multiple threads). Async patterns are the choreography that prevents balls from colliding (race conditions).

## 1. Quick Summary

**Concurrency** is about dealing with many things at once (structure); **parallelism** is about doing many things at once (execution). Key async patterns: **Promises** (chaining, composition), **async/await** (syntactic sugar over promises), **Promise.all** (parallel independent work), **Promise.race** (first-one-wins), **Promise.allSettled** (all results regardless of failure), and **async queues** (bounded concurrency). Critical issues: **race conditions**, **deadlocks**, **thread safety**, and **the shared mutable state problem**.

## 2. Core Patterns

### Sequential vs Parallel

\`\`\`typescript
// Sequential (slow) — each waits for previous
async function getUsersSequential(ids: string[]) {
  const results = [];
  for (const id of ids) {
    results.push(await fetchUser(id)); // 3s each, 15s total for 5
  }
  return results;
}

// Parallel (fast) — all at once
async function getUsersParallel(ids: string[]) {
  const promises = ids.map(id => fetchUser(id));
  return Promise.all(promises); // 3s total for 5
}

// Bounded concurrency — control resource usage
async function getUsersBounded(ids: string[], concurrency = 3) {
  const results = [];
  const queue = [...ids];
  async function worker() {
    while (queue.length) {
      const id = queue.shift()!;
      results.push(await fetchUser(id));
    }
  }
  const workers = Array(concurrency).fill(null).map(() => worker());
  await Promise.all(workers);
  return results;
}
\`\`\`

### Race Condition Prevention

\`\`\`typescript
// Race condition: two concurrent operations update same counter
let counter = 0;
async function incrementBad() {
  const current = counter; // read
  await someAsyncWork();   // yield (other increments happen here)
  counter = current + 1;   // write (based on stale read!)
}

// Fix: atomic operations or mutex
import { Mutex } from 'async-mutex';

const mutex = new Mutex();
async function incrementGood() {
  const release = await mutex.acquire();
  try {
    const current = counter;
    await someAsyncWork();
    counter = current + 1;
  } finally {
    release();
  }
}
\`\`\`

### Async Error Handling

\`\`\`typescript
// Bad: unhandled promise rejection
async function fail() {
  throw new Error('boom');
}
fail(); // UnhandledPromiseRejection (crashes process)

// Good: always catch at the call site
async function safe() {
  try {
    await fail();
  } catch (err) {
    console.error('Recovered:', err);
  }
}

// Pattern: Promise.allSettled for partial failures
const results = await Promise.allSettled([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3),
]);
const successes = results.filter(r => r.status === 'fulfilled').map(r => r.value);
const failures = results.filter(r => r.status === 'rejected').map(r => r.reason);
\`\`\`

<RoughDiagram
  nodes={[
    { id: 'main', label: 'Main Thread', type: 'app', x: 50, y: 100 },
    { id: 'task1', label: 'Task A (1s)', type: 'worker', x: 300, y: 30 },
    { id: 'task2', label: 'Task B (2s)', type: 'worker', x: 300, y: 100 },
    { id: 'task3', label: 'Task C (1.5s)', type: 'worker', x: 300, y: 170 },
    { id: 'result', label: 'All Results', type: 'storage', x: 550, y: 100 },
  ]}
  edges={[
    { from: 'main', to: 'task1', label: 'Promise.all' },
    { from: 'main', to: 'task2', label: 'Promise.all' },
    { from: 'main', to: 'task3', label: 'Promise.all' },
    { from: 'task1', to: 'result', label: 'all resolve' },
    { from: 'task2', to: 'result', label: 'all resolve' },
    { from: 'task3', to: 'result', label: 'all resolve' },
  ]}
  height={230}
/>

## 3. Common Pitfalls

1. **Promise.all with one failure** — one rejection rejects the entire batch. Use \`allSettled\` for tolerant workloads.
2. **Forgetting await** — \`promise\` vs \`await promise\`. The former continues without waiting, the latter waits.
3. **Callback hell** — nested callbacks from legacy code. Convert to promises or async/await.
4. **Starvation** — one task monopolizes the event loop (synchronous CPU-bound work). Use \`setImmediate\` or worker threads.
5. **Unhandled rejections** — always attach .catch() or wrap in try/catch.

## 4. Quiz

\`\`\`
- Q: You have 10 API calls that are independent. Which is the fastest approach?
  Options: Sequential await, Promise.all, Promise.race, Promise.allSettled
  Correct: Promise.all (all in parallel)

- Q: What happens when one promise in Promise.all rejects?
  Options: Others continue, All are cancelled, Error swallowed, Retry automatically
  Correct: All are effectively cancelled (main promise rejects)

- Q: An async function that modifies shared state without synchronization can cause:
  Options: Deadlock, Race condition, Starvation, Memory leak
  Correct: Race condition
\`\`\``,
    estimatedMin: 18,
    difficulty: 'Advanced' as const,
    companies: ['Google', 'Netflix', 'Amazon', 'Microsoft', 'Uber'],
    tags: ['concurrency', 'async', 'promises', 'race-conditions', 'parallelism', 'event-loop'],
  },
  {
    id: 'lesson-12-10',
    slug: 'coding-craft-10-functional-programming',
    title: 'Functional Programming Concepts — Immutability, Pure Functions, Composition',
    content: `## 0. Mental Model

> Functional programming is like cooking with recipes. Each recipe (function) takes ingredients (inputs), follows steps, and produces a dish (output) without modifying the kitchen (no side effects). You can compose recipes together: make dough → bake → frost → serve. If a recipe fails, you can retry it because it didn't dirty your kitchen.

## 1. Quick Summary

**Functional programming (FP)** is a paradigm that treats computation as the evaluation of mathematical functions and avoids changing state and mutable data. Core concepts: **pure functions** (same input → same output, no side effects), **immutability** (data never changes, new data is created), **higher-order functions** (functions that take or return functions), **function composition** (combine small functions into pipelines), and **declarative style** (what to do, not how to do it). FP leads to **predictable**, **testable**, and **parallelizable** code.

## 2. Core Concepts

### Pure Functions

\`\`\`typescript
// Impure — depends on external state, side effects
let taxRate = 0.15;
function calculateTotalImpure(amount: number): number {
  console.log('Calculating...'); // side effect
  return amount + amount * taxRate; // depends on external state
}

// Pure — same input always produces same output
function calculateTotal(amount: number, taxRate: number): number {
  return amount + amount * taxRate;
}
\`\`\`

### Immutability

\`\`\`typescript
// Mutating (bad)
const user = { name: 'Alice', age: 30 };
function birthdayBad(u: typeof user) {
  u.age += 1; // mutates the original
  return u;
}

// Immutable (good)
function birthdayGood(u: typeof user) {
  return { ...u, age: u.age + 1 }; // returns new object
}
\`\`\`

### Higher-Order Functions

\`\`\`typescript
// map, filter, reduce — the holy trinity of FP
const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map(n => n * 2);          // [2, 4, 6, 8, 10]
const evens = numbers.filter(n => n % 2 === 0);   // [2, 4]
const sum = numbers.reduce((acc, n) => acc + n, 0); // 15

// Custom higher-order function
function withLogging<T>(fn: (x: T) => void): (x: T) => void {
  return (x) => {
    console.log('Calling with', x);
    fn(x);
    console.log('Done');
  };
}

const logAndSave = withLogging(saveUser);
logAndSave({ id: 1 }); // logs before and after
\`\`\`

### Function Composition

\`\`\`typescript
// Without composition (nested, hard to read)
const result = uppercase(trim(removeNumbers(input)));

// With composition (pipeline, reads left to right)
import { pipe } from 'lodash/fp';

const processString = pipe(
  removeNumbers,
  trim,
  uppercase,
);
const result = processString(input);
\`\`\`

## 3. Practical Benefits

| Benefit | Why |
|---------|-----|
| **Testable** | Pure functions need no mocks or setup |
| **Cacheable** | Same input = same output, trivially memoize |
| **Parallelizable** | No shared state means no race conditions |
| **Refactorable** | Small, focused functions are easy to replace |
| **Debuggable** | Each function is a self-contained unit |

## 4. When Not to Use FP

- **Performance-critical code** — creating new objects constantly has GC overhead
- **I/O operations** — reading files, making API calls are inherently impure
- **Stateful UI** — React components are inherently stateful
- **Team context** — if your team is comfortable with OOP and FP is foreign, gradual adoption works better

## 5. Quiz

\`\`\`
- Q: A pure function must have which two properties?
  Options: Same input → same output, no side effects / Uses global state, returns void / Reads files, mutates params
  Correct: Same input → same output, no side effects

- Q: What does pipe(f, g, h)(x) do?
  Options: h(g(f(x))) / f(g(h(x))) / g(f(h(x))) / f(h(g(x)))
  Correct: h(g(f(x))) (evaluates left to right)

- Q: Which array method transforms each element and returns a new array of the same length?
  Options: filter, map, reduce, forEach
  Correct: map
\`\`\``,
    estimatedMin: 16,
    difficulty: 'Intermediate' as const,
    companies: ['Netflix', 'Spotify', 'Google', 'GitHub'],
    tags: ['functional-programming', 'immutability', 'pure-functions', 'composition', 'FP'],
  },
  {
    id: 'lesson-12-11',
    slug: 'coding-craft-11-dependency-injection',
    title: 'Dependency Injection & Inversion of Control',
    content: `## 0. Mental Model

> Dependency Injection is like a restaurant. The chef (service) doesn't grow their own vegetables, raise cows, or bake plates. Suppliers deliver ingredients (dependencies) to the kitchen door. If the lettuce supplier goes out of business, a new one arrives without changing the kitchen.

## 1. Quick Summary

**Dependency Injection (DI)** is a technique where an object receives its dependencies from an external source rather than creating them itself. **Inversion of Control (IoC)** means the framework controls the flow — your code is called by the framework, not the other way around. DI makes code **testable** (swap real DB with mock), **flexible** (swap implementations), and **decoupled**. Three types: **constructor injection** (cleanest), **setter injection**, and **interface injection**.

## 2. Implementation

### Without DI (Tight Coupling)

\`\`\`typescript
class OrderService {
  private db = new PostgreSQLDatabase(); // hard-coded dependency
  private emailer = new SendGridEmailer();

  async placeOrder(order: Order) {
    await this.db.save(order);
    await this.emailer.sendConfirmation(order);
  }
}
// Cannot test without real DB and real email!
\`\`\`

### With DI (Decoupled)

\`\`\`typescript
interface Database { save(entity: any): Promise<void>; }
interface EmailService { send(to: string, body: string): Promise<void>; }

class OrderService {
  constructor(
    private db: Database,        // injected
    private emailer: EmailService, // injected
  ) {}

  async placeOrder(order: Order) {
    await this.db.save(order);
    await this.emailer.send(order.userEmail, 'Order confirmed');
  }
}

// Production usage — real implementations
const db = new PostgreSQLDatabase();
const emailer = new SendGridEmailer();
const service = new OrderService(db, emailer);

// Test usage — mocks
const mockDb = { save: vi.fn() };
const mockEmailer = { send: vi.fn() };
const testService = new OrderService(mockDb as any, mockEmailer as any);
\`\`\`

### DI Container (for large apps)

\`\`\`typescript
// Simple DI container
class Container {
  private registry = new Map<string, { factory: () => any; singleton: boolean; instance?: any }>();

  register<T>(key: string, factory: () => T, singleton = false) {
    this.registry.set(key, { factory, singleton });
  }

  resolve<T>(key: string): T {
    const entry = this.registry.get(key);
    if (!entry) throw new Error(\`No registration for \${key}\`);
    if (entry.singleton) {
      if (!entry.instance) entry.instance = entry.factory();
      return entry.instance as T;
    }
    return entry.factory() as T;
  }
}

// Setup
const container = new Container();
container.register('Database', () => new PostgreSQLDatabase(), true);
container.register('EmailService', () => new SendGridEmailer(), true);
container.register('OrderService', () => new OrderService(
  container.resolve('Database'),
  container.resolve('EmailService'),
), false);
\`\`\`

## 3. Quiz

\`\`\`
- Q: What is the primary benefit of Dependency Injection?
  Options: Faster code, Less memory, Testability and flexibility, Fewer files
  Correct: Testability and flexibility

- Q: Which form of DI is generally preferred?
  Options: Constructor, Setter, Interface, Field
  Correct: Constructor injection
\`\`\``,
    estimatedMin: 14,
    difficulty: 'Intermediate' as const,
    companies: ['Google', 'Microsoft', 'Amazon', 'Netflix', 'Spotify'],
    tags: ['dependency-injection', 'IoC', 'decoupling', 'testing', 'architecture'],
  },
];
