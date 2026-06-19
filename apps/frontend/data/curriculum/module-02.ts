export const module02Lessons = [
  {
    id: "lesson-02-01",
    slug: "apis-protocols-authentication-01-rest-api-design-principles",
    title: "REST API Design Principles",
    content: `## 0. Mental Model

> REST is a **library with a universal cataloging system**. Every book (resource) has a unique call number (URL). You use standard cards (HTTP methods) to: GET (borrow), POST (donate), PUT (replace), PATCH (update a page), DELETE (remove). The librarian (server) doesn't remember you between visits (stateless). You can browse from any catalog terminal (cache) or ask an assistant (proxy) without changing how you search.

## 1. Quick Summary

**REST (Representational State Transfer)** is an architectural style for designing networked APIs. It uses HTTP methods as verbs operating on resources identified by URLs. Resources are transferred in representations (JSON, XML). REST emphasizes statelessness, uniform interface, cacheability, and layered systems. Well-designed REST APIs are intuitive, scalable, and resilient.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Resource** | Any named information (user, order, product) identified by a URI |
| **Representation** | Snapshot of a resource's state (JSON, XML, HTML) |
| **Stateless** | Each request contains all info needed; no server-side session state |
| **HATEOAS** | Hypermedia as the Engine of Application State — responses include links for navigation |
| **Idempotent** | Same request multiple times produces same effect (GET, PUT, DELETE) |
| **Safe** | Read-only — no side effects (GET, HEAD, OPTIONS) |
| **CRUD** | Create (POST), Read (GET), Update (PUT/PATCH), Delete (DELETE) |
| **Collection** | List of resources (e.g., \`/users\`) |
| **Resource Identifier** | URL path uniquely identifying a resource |

## 3. Problem Without It

- **Before REST**: SOAP/XML-RPC dominated — complex WSDL definitions, envelopes, WS-* standards. A simple "get user" required 500 bytes of XML envelope. Tight coupling between client and server implementations.
- **No uniform interface**: Every API had its own design — some used \`/getUser?id=1\`, others \`/user.get/1\`, others \`UserService.getUser(1)\`.
- **Poor scalability**: Stateful servers (storing session data per client) couldn't scale horizontally without sticky sessions or shared session stores.
- **No caching**: Every request was unique, no HTTP caching — repeat requests always hit the server.

## 4. How It Works — Core Mechanics

**REST Constraints (Fielding 2000):**

| Constraint | Purpose | Enforced By |
|-----------|---------|-------------|
| Client-Server | Separation of concerns | HTTP protocol |
| Stateless | Each request is independent | No server-side session state |
| Cacheable | Responses marked cacheable | \`Cache-Control\`, \`ETag\` headers |
| Uniform Interface | Consistent resource interaction | HTTP methods + URIs + media types |
| Layered System | Intermediaries transparent | Proxies, gateways, load balancers |
| Code on Demand (optional) | Extend client functionality | JavaScript, applets |

**Standard REST API Pattern:**

\`\`\`
GET    /users          → List users (collection)
GET    /users/{id}     → Get single user (resource)
POST   /users          → Create new user
PUT    /users/{id}     → Replace entire user
PATCH  /users/{id}     → Partial update
DELETE /users/{id}     → Delete user

GET    /users/{id}/orders      → User's orders (sub-collection)
GET    /users/{id}/orders/{oid}→ Specific order
\`\`\`

**HTTP Status Codes:**

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Authenticated but not allowed |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Version conflict (PUT with wrong ETag) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Server Error | Server-side failure |

## 5. Variants & Flavors

| Approach | Style | Maturity | Use Case |
|----------|-------|----------|----------|
| **CRUD REST** | Resources + HTTP methods | Level 2 (Richardson) | Most common — works for 80% of APIs |
| **HATEOAS REST** | Hypermedia-driven | Level 3 | Discoverable APIs, evolvable systems |
| **RESTful** | Follows some REST principles | Level 1-2 | Pragmatic REST (most real-world APIs) |
| **Pure REST** | All 6 constraints | Level 3 | Rare — hard to implement fully |

## 6. Performance Characteristics

| Metric | REST (JSON) | REST (with caching) | SOAP (XML) |
|--------|-------------|-------------------|------------|
| Payload size (get user) | ~300B JSON | ~300B (or 304 Not Modified) | ~2KB XML |
| Serialization time | ~10µs | ~10µs | ~50µs |
| Request overhead | ~500B HTTP headers | ~500B headers | ~2KB SOAP envelope |
| Cacheability | High (with ETag/Cache-Control) | Very high | Low (POST-based) |
| Client complexity | Low | Low | High (WSDL parsing) |
| Tooling support | Universal | Universal | Degraded |

## 7. Failure Modes

- **Over-fetching**: \`/users/{id}\` returns 50 fields when client needs 2 → bandwidth waste. *Fix*: sparse fieldsets (\`?fields=name,email\`), or GraphQL.
- **Under-fetching (N+1)**: Client needs user + orders → must call \`/users/{id}\` then \`/users/{id}/orders\`. *Fix*: composite resources, GraphQL, or JSON:API includes.
- **Inconsistent error format**: 400 returns \`{"error":"bad"}\`, another 400 returns \`{"message":"Invalid"}\` → client can't parse. *Fix*: standard error schema (RFC 7807 Problem Details).
- **No versioning**: Change a field → existing clients break. *Fix*: versioning (URL, header, or content negotiation).
- **Statelessness abuse**: Every request resends auth + context → inflated request size. *Fix*: access tokens in Authorization header, include only necessary context.

## 8. Decision Framework

\`\`\`
Designing a REST API:
├── Resource identification
│   ├── Nouns, not verbs: /users not /getUsers
│   ├── Plural: /users, /orders
│   └── Consistent URL hierarchy: /resources/{id}/sub-resources
├── HTTP methods
│   ├── GET — safe, idempotent, cacheable
│   ├── POST — not safe, not idempotent (create)
│   ├── PUT — idempotent (full replace)
│   ├── PATCH — not idempotent (partial update)
│   └── DELETE — idempotent
├── Status codes
│   ├── 2xx for success, 4xx for client error, 5xx for server error
│   └── Use exact codes, not just 200/500
├── Naming conventions
│   ├── snake_case or camelCase (pick one, be consistent)
│   └── kebab-case for URLs (/order-items not /orderItems)
└── Documentation
    ├── OpenAPI 3.0 (Swagger) — machine-readable
    └── Keep docs in sync with implementation (code-first or design-first)
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show a client making requests through a layered system: Client → CDN (cache) → Reverse Proxy (NGINX) → API Server → Database. Each component is labeled with the REST concepts it uses. Arrows between Client and Server show request/response cycle with HTTP methods (GET, POST, PUT, DELETE) and status codes (200, 201, 404). The "Uniform Interface" layer shows: URIs identify resources, HTTP methods are verbs, representations are JSON.*

## 10. Real Production Incident

**GitHub API v3 → v4 Migration (GraphQL) — REST Pain Points (2020)** — GitHub's REST API (v3) became unwieldy as the platform grew. The \`/repos/{owner}/{repo}\` endpoint returned 100+ fields, most unused. Clients needed 5+ API calls to load a PR page (N+1 problem). Rate limits were frequently hit because of over-fetching and under-fetching. **The fix**: GitHub built GraphQL API (v4) where clients specify exactly what they need. A single GraphQL query replaced 5 REST calls. **Result**: Bandwidth reduced by 80%, client code simplified, rate limit effectiveness improved. **Lesson**: **REST's fixed response shapes and multiple roundtrips become a bottleneck at scale — GraphQL or JSON:API sparse fieldsets should be considered for complex UIs**.

## 11. Production Implementation

**Naive**: Single \`app.get('/users/:id', ...)\` handler. No validation, no error handling, no versioning, no auth.

**Better**: Express/Fastify with middleware: body validation (Joi/Zod), error handling middleware, auth middleware, CORS. OpenAPI docs. Consistent error format (RFC 7807). ETag support for caching.

**Production**: API gateway (Kong, AWS API Gateway) for rate limiting, auth, routing. OpenAPI 3.0 spec (design-first with Stoplight/Spectral). Automated request validation from OpenAPI. Idempotency keys on mutation endpoints. Composite resources or GraphQL for complex queries. Consistent pagination (cursor-based for production, page-based for simplicity). Monitoring with p99 latency, error budget, and API change log.

## 12. Real Company Deep Dives

- **Stripe**: Known for exceptional REST API design. Consistent resource naming, idempotency keys on all POST requests, clear error messages with types (RFC 7807). API versioning via \`Stripe-Version\` header. OpenAPI spec available.
- **GitHub**: REST API v3 is the most referenced public API. Pagination with Link headers, conditional requests with ETags, descriptive error messages. Migrated to GraphQL for v4.
- **Twilio**: REST API with consistent error format (<https://www.twilio.com/docs/api/errors>). Hypermedia links in responses. API Explorer for interactive testing.
- **Google**: Cloud APIs follow RESTful design guidelines with query parameters for filtering, pagination via pageToken, and long-running operations for async workflows.

## 13. Interview Playbook

**Q1: "What are the six REST constraints?"**
- Model answer: Client-Server, Stateless, Cacheable, Uniform Interface, Layered System, Code on Demand (optional). Stateless is the most important for scalability — no client context on the server between requests.

**Q2: "What is the difference between PUT and PATCH?"**
- Model answer: PUT replaces the entire resource (idempotent). PATCH applies partial modifications (not necessarily idempotent). PUT sends the full representation; PATCH sends only the changes (using JSON Patch or JSON Merge Patch format).

**Q3: "How do you handle pagination in a REST API?"**
- Model answer: Three approaches: (1) Page-based: \`?page=1&per_page=20\` — simple but stale with inserts. (2) Cursor-based: \`?cursor=eyJpZCI6MTAw...\` — stable, recommended for production. (3) Offset-based: \`?offset=0&limit=20\` — similar issues as page-based. Use Link header for pagination navigation (RFC 5988).

**Q4: "What is HATEOAS and why is it rarely used?"**
- Model answer: HATEOAS means responses include hypermedia links for related actions (e.g., \`{"id":1, "links": {"self": "/users/1", "orders": "/users/1/orders"}}\`). Rare because: (1) clients need to parse links (more complex), (2) most clients have hardcoded URLs anyway, (3) API discovery isn't needed for server-to-server communication.

## 14. Concept Check Quiz

**Q1: Which HTTP method is both safe and idempotent?**
- A) POST
- B) PUT
- C) GET
- D) DELETE
- **Answer: C** — GET is safe (no side effects) and idempotent (repeating returns same result).

**Q2: What status code should a REST API return for a successful resource creation?**
- A) 200 OK
- B) 201 Created
- C) 204 No Content
- D) 202 Accepted
- **Answer: B** — 201 Created indicates the resource was successfully created. Include a Location header with the new resource's URL.

**Q3: What REST constraint enables horizontal scaling without sticky sessions?**
- A) Cacheable
- B) Stateless
- C) Uniform Interface
- D) Layered System
- **Answer: B** — Statelessness means no client context is stored server-side, so any server can handle any request.

**Q4: What is the N+1 problem in REST APIs?**
- A) Getting 404 for N requests
- B) Making N additional requests for each item in a list response
- C) N simultaneous requests timeout
- D) N rate limit violations per hour
- **Answer: B** — Fetching a list of N resources then making N additional requests for each resource's details.

## 15. Next Steps

Continue to **GraphQL** (lesson-02-02) to learn how a query language for APIs solves REST's over-fetching and under-fetching problems.`,
    estimatedMin: 12,
    difficulty: "BEGINNER" as const,
    companies: ["Stripe", "GitHub", "Twilio", "Google"],
    tags: ["REST", "API-design", "HTTP", "CRUD", "stateless"],
  },

  {
    id: "lesson-02-02",
    slug: "apis-protocols-authentication-02-graphql",
    title: "GraphQL",
    content: `## 0. Mental Model

> REST is a **buffet** — you get a full plate of food whether you want everything or not. GraphQL is a **custom deli counter** — you say exactly what you want ("turkey on rye with lettuce, no tomato") and get precisely that. Nothing more, nothing less. But ordering takes more effort, and if the deli is busy, your custom order might slow down the line.

## 1. Quick Summary

**GraphQL** is a query language and runtime for APIs developed by Meta (2012, open-sourced 2015). Clients specify exactly what data they need in a single query. A GraphQL server resolves the query against a typed schema, returning precisely the requested fields. Eliminates over-fetching and under-fetching. Used by Meta, GitHub, Shopify, Netflix, Airbnb.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Schema** | Type system defining available queries, mutations, and subscriptions |
| **Query** | Read operation (equivalent to GET) |
| **Mutation** | Write operation (equivalent to POST/PUT/DELETE) |
| **Subscription** | Real-time event stream (equivalent to WebSocket push) |
| **Resolver** | Function that fetches data for a field |
| **Type** | Object type with fields (e.g., \`type User { id: ID!, name: String! }\`) |
| **Field** | A piece of data on a type |
| **Argument** | Parameters passed to a field |
| **Directive** | Decorator for fields/queries (\`@deprecated\`, \`@include\`, \`@skip\`) |
| **Fragment** | Reusable piece of query |
| **Introspection** | Query the schema itself for documentation and tooling |
| **N+1 Problem** | Multiple database queries caused by resolving nested fields individually |

## 3. Problem Without It

- **Over-fetching**: REST \`/users/1\` returns 50 fields. Client only needs \`name\` and \`email\`. 48 fields wasted. On mobile, extra 2KB per request adds up.
- **Under-fetching**: A user profile page needs user + posts + followers. REST: 3 API calls. GraphQL: 1 query.
- **Versioning pain**: REST API changes often require new version. GraphQL evolves schema via deprecation — old fields keep working, new fields added alongside.
- **Multiple endpoints**: A product page might need \`/product\`, \`/reviews\`, \`/inventory\`, \`/recommendations\` — 4 different REST endpoints to understand. GraphQL has a single endpoint.

## 4. How It Works — Core Mechanics

**GraphQL Query:**
\`\`\`graphql
query {
  user(id: "1") {
    name
    email
    posts {
      title
      createdAt
    }
  }
}
\`\`\`

**Response (exactly what was asked for):**
\`\`\`json
{
  "data": {
    "user": {
      "name": "Alice",
      "email": "alice@example.com",
      "posts": [
        {"title": "Hello", "createdAt": "2024-01-15"},
        {"title": "GraphQL", "createdAt": "2024-02-20"}
      ]
    }
  }
}
\`\`\`

**Schema Definition:**
\`\`\`graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
  followers: [User!]!
}

type Post {
  id: ID!
  title: String!
  body: String!
  createdAt: DateTime!
  author: User!
}

type Query {
  user(id: ID!): User
  posts(limit: Int = 10): [Post!]!
}

type Mutation {
  createPost(title: String!, body: String!): Post!
}
\`\`\`

**Resolver Flow:**
\`\`\`
Query.user(id: "1") 
  → Resolver fetches User from DB
  → For each requested field, resolver returns value
  → If field is a type (e.g., posts), its resolver fires
  → DataLoader batches the N+1 database calls
\`\`\`

## 5. Variants & Flavors

| Feature | REST | GraphQL | gRPC |
|---------|------|---------|------|
| Data fetching | Fixed response | Client-specified | Fixed (protobuf schema) |
| Over-fetching | Common | None | None (compact protobuf) |
| Multiple roundtrips | Common | Single request | Single RPC call |
| Schema | Implicit (OpenAPI) | Explicit (SDL) | Explicit (protobuf) |
| Caching | HTTP native | Complex (need Apollo/Relay) | N/A |
| Tooling | Swagger UI | GraphiQL, Apollo Studio | protoc, grpcurl |
| Use case | Public APIs | Complex UIs, mobile | Microservices, low-latency |

## 6. Performance Characteristics

| Metric | REST (optimized) | GraphQL | GraphQL with batching |
|--------|-----------------|---------|----------------------|
| Payload for user+posts | ~5KB (two requests) | ~2KB (one request) | ~2KB |
| Requests for profile page | 3-5 | 1 | 1 |
| Server CPU (simple query) | ~1ms | ~2-5ms (parsing + validation + resolvers) | ~3-6ms |
| N+1 query risk | Each endpoint scoped | High (need DataLoader) | Low (batch in handler) |
| Cache hit rate | High (per-endpoint) | Lower (per-query, varies) | N/A |

## 7. Failure Modes

- **N+1 problem**: Resolver for \`user.posts\` fires a SQL query for each user. 100 users = 101 queries. *Fix*: DataLoader batches and caches per-request.
- **Deeply nested queries**: \`user.followers.posts.comments.author\` — exponential resolvers. Attack vector. *Fix*: query depth limiting, complexity analysis, timeouts.
- **No native caching**: Every query is different → HTTP caching ineffective. *Fix*: Apollo Client normalized cache, persisted queries, CDN caching for public queries.
- **Complexity cost**: Simple REST endpoint: 50 lines. GraphQL equivalent: schema + resolvers + types + DataLoader = 500 lines.
- **Over-fetching costs shift to server**: Client asks for 10 fields → server resolves all 10. If client only needs 2, server still does 10x work (but less data transfer).

## 8. Decision Framework

\`\`\`
Choosing GraphQL vs REST:
├── Complex UI (dashboard, profile page)?
│   └── GraphQL (single query replaces 3-5 REST calls)
├── Mobile app (bandwidth sensitive)?
│   └── GraphQL (fetch only what's needed)
├── Public API (third-party developers)?
│   └── REST (simpler, universal caching, tooling)
├── Microservices communication?
│   └── gRPC (lower latency, binary protocol)
├── Real-time data?
│   └── GraphQL subscriptions (or WebSocket directly)
├── Simple CRUD app?
│   └── REST (GraphQL is over-engineering)
└── Existing REST API?
    └── Wrap with GraphQL gateway (Apollo Federation, GraphQL Mesh)
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should compare REST and GraphQL side by side. Left: REST — a mobile app making 3 separate HTTP requests to \`/users/1\`, \`/users/1/posts\`, \`/users/1/followers\`. Right: GraphQL — the same app making one POST request to \`/graphql\` with a query, getting one response with user, posts, and followers. The GraphQL server connects to Resolvers → DataLoaders → Database. An "N+1" warning label near the resolvers.*

## 10. Real Production Incident

**GitHub GraphQL Public API Launch (2017)** — GitHub's public GraphQL API launched and immediately faced abuse via deeply nested queries. Attackers sent queries with 7 levels of nesting (repository → issues → comments → user → repositories → ...), causing exponential database load. **Impact**: GraphQL endpoint latency spiked to 30s, cascading failures to other services. **Root cause**: No query complexity analysis or depth limiting. **Fix**: GitHub implemented query cost analysis — each field has a "cost" value, total query cost is capped. Added depth limiting (max 5 levels for public API). Implemented node ID-based pagination to prevent infinite traversal. **Lesson**: **Public GraphQL APIs MUST implement query cost analysis and depth limiting — unconstrained queries are a DDoS vector**.

## 11. Production Implementation

**Naive**: Single GraphQL schema with one resolver per type. No DataLoader. N+1 queries kill performance.

**Better**: Apollo Server with DataLoader for batching. Query depth limiting. Authentication via middleware. Subscription support with WebSocket.

**Production**: Apollo Federation (compose multiple GraphQL services into one schema). Persisted queries (clients send query hash, server looks up cached query). Query cost analysis (field-level cost caps). Rate limiting per client. Automatic persisted queries (APQ) — clients send hash, server returns cached result if benign. Schema registry (Apollo Studio) for change tracking and validation. Performance monitoring (tracing fields, resolver timing). DataLoader with Redis caching for cross-request data sharing.

## 12. Real Company Deep Dives

- **Meta**: Created GraphQL for the Facebook News Feed in 2012. Their mobile app needed to fetch posts, photos, likes, comments, user profiles in one request. Open-sourced in 2015. Relies on persisted queries for performance.
- **GitHub**: Public GraphQL API with 16 types, complex query cost analysis. Used by 50K+ third-party applications. Schema-first approach with detailed documentation.
- **Shopify**: Storefront API is GraphQL — merchants build custom storefronts querying products, collections, customers, orders. Admin API is REST. GraphQL endpoint handles 1M+ queries/day.
- **Netflix**: Uses GraphQL for their Studio UI (content management). GraphQL gateway aggregates multiple microservices (titles, metadata, rights, availability).
- **Airbnb**: Built Apollo Federation for their micro-frontend architecture. 50+ GraphQL services composed into a single schema for their web and mobile apps.

## 13. Interview Playbook

**Q1: "GraphQL vs REST — when would you choose GraphQL?"**
- Model answer: GraphQL wins when: (1) complex UIs with multiple data relationships, (2) mobile bandwidth is constrained, (3) client needs to specify data requirements, (4) multiple data sources need aggregation. REST wins for: simple CRUD, public APIs for third-party developers, systems where HTTP caching is critical.

**Q2: "What is the N+1 problem in GraphQL and how do you solve it?"**
- Model answer: Resolving a list of N items triggers N additional queries for related data. Solution: DataLoader — batches individual field resolutions into a single query per request cycle. DataLoader coalesces all \`load(id)\` calls within a single event-loop tick into one batch query.

**Q3: "How do you handle authentication in GraphQL?"**
- Model answer: Authentication happens at the transport layer (HTTP headers). The \`Authorization: Bearer <token>\` header is processed by middleware before resolvers run. The authenticated user is attached to the GraphQL context, available in every resolver.

**Q4: "What security concerns are specific to GraphQL?"**
- Model answer: (1) Deeply nested queries — implement depth limiting. (2) Query complexity — cost analysis per field. (3) Introspection leaking — disable in production or restrict. (4) Batching attacks — rate limiting, throttling per field. (5) Authorization in resolvers (not at endpoint level).

## 14. Concept Check Quiz

**Q1: What does a GraphQL query specify?**
- A) Which endpoint to call
- B) Exactly which fields to return
- C) Which HTTP method to use
- D) Which server to query
- **Answer: B** — GraphQL queries specify the exact fields needed. The server returns only those fields in the same shape.

**Q2: What tool solves the N+1 problem in GraphQL?**
- A) Apollo Client
- B) DataLoader
- C) GraphiQL
- D) Schema stitching
- **Answer: B** — DataLoader batches individual data loading calls into a single batch request per event-loop tick.

**Q3: What is the GraphQL equivalent of a REST GET request?**
- A) Mutation
- B) Query
- C) Subscription
- D) Field
- **Answer: B** — Queries are read operations. Mutations are writes. Subscriptions are real-time streams.

**Q4: Why can't standard HTTP caching work easily with GraphQL?**
- A) GraphQL only uses POST
- B) Each query is unique, so cache keys don't repeat
- C) HTTP caching is disabled for GraphQL
- D) GraphQL responses are always different
- **Answer: B** — Since clients construct arbitrary queries, the same URL with different query bodies returns different data. GET-based queries with hashed IDs (persisted queries) can be cached.

## 15. Next Steps

Continue to **gRPC & Protocol Buffers** (lesson-02-03) to learn about high-performance RPC with binary serialization — the backbone of modern microservice communication.`,
    estimatedMin: 14,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Meta", "GitHub", "Shopify", "Netflix"],
    tags: ["GraphQL", "API", "schema", "resolvers", "Apollo"],
  },

  {
    id: "lesson-02-03",
    slug: "apis-protocols-authentication-03-grpc-protocol-buffers",
    title: "gRPC & Protocol Buffers",
    content: `## 0. Mental Model

> gRPC is like a **high-speed pneumatic tube system** in an office building. Instead of walking documents between floors (REST HTTP), you put them in a standardized capsule (protobuf message) and shoot them through dedicated tubes (HTTP/2 streams). The capsule is smaller, faster, and arrives exactly as sent. Both sender and receiver agree on the capsule format ahead of time (\`.proto\` file). The system also supports: send and forget (unary), continuous stream of capsules (server streaming), or a two-way tube (bidirectional streaming).

## 1. Quick Summary

**gRPC** (Google Remote Procedure Call, 2015) is a high-performance RPC framework using **Protocol Buffers** for serialization and **HTTP/2** for transport. Supports four communication patterns: unary, server streaming, client streaming, and bidirectional streaming. Generates client and server code from \`.proto\` files. Used for microservice communication, polyglot environments, and low-latency systems.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **gRPC** | High-performance RPC framework using HTTP/2 + protobuf |
| **Protocol Buffers** | Binary serialization format (.proto files → code generation) |
| **.proto** | Schema definition file for services and messages |
| **Unary RPC** | Single request → single response (like REST) |
| **Server Streaming** | Single request → stream of responses |
| **Client Streaming** | Stream of requests → single response |
| **Bidirectional Streaming** | Both sides send/receive independently |
| **Stub** | Generated client code (can call remote methods) |
| **Channel** | HTTP/2 connection to a gRPC server |
| **Interceptor** | Middleware for logging, auth, metrics |
| **Deadline** | Client-specified timeout for an RPC call |
| **Metadata** | Key-value headers for auth, tracing, routing |

## 3. Problem Without It

- **Slow serialization**: REST JSON serialization is CPU-intensive (string parsing, reflection). Protobuf is binary — 10x faster serialization, 3x smaller payloads.
- **No typed contracts**: REST APIs use OpenAPI docs (human-readable, not executable). gRPC \`.proto\` files generate types for both client and server — mismatches caught at compile time.
- **HTTP/1.1 overhead**: REST over HTTP/1.1 needs separate connections per request. gRPC's HTTP/2 multiplexes all RPCs over one connection.
- **No streaming**: REST is request-response only. gRPC supports streaming natively — useful for real-time logs, progress updates, large data transfers.
- **Polyglot friction**: Different languages need different REST client libraries. gRPC generates native client code in 10+ languages from the same \`.proto\` file.

## 4. How It Works — Core Mechanics

**\`.proto\` Definition:**
\`\`\`protobuf
syntax = "proto3";

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (stream User);
  rpc UpdateUser (stream UpdateUserRequest) returns (User);
  rpc ChatUser (stream ChatMessage) returns (stream ChatMessage);
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
  repeated Post posts = 4;
}

message GetUserRequest {
  string id = 1;
}
\`\`\`

**Protobuf Binary Encoding:**
\`\`\`
User { id="1", name="Alice" }
→ Field 1 (string id): tag 0x0A, length 1, value "1"
→ Field 2 (string name): tag 0x12, length 5, value "Alice"
→ Total: ~11 bytes (vs ~50 bytes JSON)
\`\`\`

**gRPC Communication Patterns:**
\`\`\`
1. Unary:         Client ──req──→ Server ──resp──→ Client
2. ServerStream:  Client ──req──→ Server ──resp─→  Client
                                    ──resp─→
                                    ──resp─→
3. ClientStream:  Client ──req──→ Server ──resp──→ Client
                  Client ──req──→
                  Client ──req──→
4. Bidirectional: Client ──req──→ Server
                  Client ←─resp── Server
                  Client ──req──→ Server
                  Client ←─resp── Server
\`\`\`

## 5. Variants & Flavors

| Feature | gRPC | REST (JSON) | Thrift | GraphQL |
|---------|------|-------------|--------|---------|
| Serialization | Protobuf (binary) | JSON (text) | Thrift (binary) | JSON (text) |
| Payload size (user object) | ~30 bytes | ~200 bytes | ~35 bytes | ~200 bytes |
| Serialization speed | ~5 µs | ~15 µs | ~6 µs | ~15 µs |
| Transport | HTTP/2 | HTTP/1.1 or HTTP/2 | Raw TCP or HTTP | HTTP/1.1 or HTTP/2 |
| Streaming | Native (4 patterns) | WebSocket addition | Custom | Subscriptions |
| Code generation | Native (10+ langs) | OpenAPI tools | Native | Apollo codegen |
| Contract first | Required (.proto) | Optional (OpenAPI) | Required (IDL) | Required (SDL) |
| Browser support | Limited (gRPC-web) | Native | None | Native |

## 6. Performance Characteristics

| Metric | REST (JSON/HTTP/1.1) | gRPC (Protobuf/HTTP/2) | Improvement |
|--------|---------------------|------------------------|-------------|
| Payload size (get user) | ~200 bytes | ~30 bytes | 85% less |
| Serialization CPU (1K objects) | ~15ms | ~5ms | 3x faster |
| Requests/sec (single connection) | 10K | 50K | 5x more |
| Connection utilization | 6 connections per domain | 1 HTTP/2 connection | 6x less overhead |
| Network bandwidth (1M requests) | ~200 MB | ~30 MB | 85% less |
| Latency (p99, same data center) | ~5ms | ~2ms | 2.5x faster |

## 7. Failure Modes

- **No browser support**: Browsers can't call gRPC directly (need gRPC-web with Envoy proxy). *Fix*: use gRPC-web or expose REST for browser clients.
- **Large message overhead**: Loading 1M records into memory → protobuf message > 100MB → OOM. *Fix*: use streaming, paginate responses.
- **Deadline propagation failure**: Service A calls B with 5s deadline, B calls C without propagating → B waits 30s for C while A already timed out. *Fix*: always propagate deadlines and cancellation contexts.
- **Versioning challenges**: Changing a proto field type breaks wire compatibility. *Fix*: protobuf best practices — never change field numbers, use \`reserved\`, add new fields instead of modifying.
- **Load balancer ignorance**: HTTP/2 long-lived connections → L4 load balancers see one TCP connection, can't distribute requests. *Fix*: use L7 load balancer (Envoy, NGINX) that understands gRPC, or client-side load balancing.

## 8. Decision Framework

\`\`\`
Choosing gRPC vs REST:
├── Microservice-to-microservice?
│   └── gRPC (low latency, typed contracts, streaming)
├── Browser client?
│   └── REST or gRPC-web with proxy
├── Mobile app?
│   └── gRPC (protobuf is smaller, faster JSON)
├── Public API?
│   └── REST (universal compatibility)
├── Real-time streaming (logs, events)?
│   └── gRPC bidirectional streaming
├── Polyglot environment (5+ languages)?
│   └── gRPC (native codegen for all languages)
├── Performance critical (high throughput)?
│   └── gRPC (protobuf is 3x smaller, 10x faster to serialize)
└── Simple CRUD app with simple clients?
    └── REST (gRPC is over-engineering)
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show a polyglot microservice architecture. Service A (Go) and Service B (Python) communicate via gRPC over HTTP/2. Each has a \`.proto\` file defining the contract, and generated "stubs" for both client and server. The four RPC patterns are shown as separate callouts: Unary (single arrow), Server Streaming (one arrow in, multiple out), Client Streaming (multiple arrows in, one out), Bidirectional Stream (dual arrow pipe). An Envoy proxy sits between a browser (gRPC-web) and a gRPC server.*

## 10. Real Production Incident

**Netflix's gRPC Migration — Connection Limits (2020)** — Netflix transitioned from REST to gRPC for internal microservices. Their Envoy sidecar proxies initially misconfigured HTTP/2 max concurrent streams (default: 100 per connection). With 500+ microservices exchanging millions of RPCs, the stream limit caused RPC queueing and timeouts. **Impact**: gRPC call latency increased from 2ms to 500ms during peak traffic. **Root cause**: HTTP/2 flow control and stream concurrency limits were not tuned for Netflix's volume. **Fix**: Increased \`max_concurrent_streams\` to 1000, tuned HTTP/2 initial window size from 64KB to 4MB, implemented client-side load balancing (not just L4). **Lesson**: **gRPC's HTTP/2 underpinnings require tuning connection-level parameters — default HTTP/2 settings are designed for browsers (few connections, low concurrency), not microservice meshes (thousands of RPCs per connection)**.

## 11. Production Implementation

**Naive**: gRPC server with default settings. No timeouts, no streaming. One service, no load balancing.

**Better**: gRPC with \`go-grpc\` or Java gRPC. Unary RPCs with deadlines (5s). Server reflection for debugging. TLS for authentication. Health checking protocol.

**Production**: gRPC with service mesh (Istio/Linkerd with Envoy sidecar). Client-side load balancing (look-aside load balancing with service discovery). Bi-directional streaming for real-time data. Interceptors for: auth (JWT), tracing (OpenTelemetry), rate limiting, circuit breaking. Exponential backoff with jitter for retries. Maximum message size limits (4MB default, tune per service). Compression (gzip for large messages). Graceful shutdown (drain in-flight requests). Error handling with gRPC status codes (INVALID_ARGUMENT, UNAVAILABLE, DEADLINE_EXCEEDED).

## 12. Real Company Deep Dives

- **Google**: Created gRPC and uses it for all internal microservice communication. Google's Borg (predecessor to Kubernetes) uses gRPC extensively. Google Ads API, Google Maps API, and many Cloud APIs expose gRPC endpoints.
- **Netflix**: Migrated from REST to gRPC for internal services (2020-2022). Combined with Envoy sidecar mesh. Saw 70% reduction in latency and 85% reduction in bandwidth.
- **Uber**: Uses gRPC for dispatch and payment microservices. Combined with Ringpop (application-layer sharding). Protobuf for all service contracts.
- **Square**: gRPC for point-of-sale and payment processing. Low latency is critical for payment authorization. Uses gRPC streaming for real-time order status.

## 13. Interview Playbook

**Q1: "How is gRPC different from REST?"**
- Model answer: (1) Binary protobuf vs JSON — 3x smaller, 10x faster serialization. (2) HTTP/2 multiplexed vs HTTP/1.1 connections. (3) Strongly typed contract (.proto) vs loose schema. (4) Four communication patterns vs request-response only. (5) Code generation from .proto vs manual REST client writing.

**Q2: "How does Protocol Buffers serialization work?"**
- Model answer: Protobuf uses a binary wire format with field tags (field number + wire type). Variable-length integers (varint) for small numbers. Strings are length-delimited. No self-description — both sides must have the schema. This makes protobuf compact but requires schema distribution.

**Q3: "What are the streaming patterns in gRPC?"**
- Model answer: (1) Unary: single request, single response. (2) Server streaming: single request, stream of responses (e.g., list objects). (3) Client streaming: stream of requests, single response (e.g., upload file). (4) Bidirectional: both sides stream independently (e.g., chat).

**Q4: "How does gRPC handle load balancing?"**
- Model answer: gRPC's HTTP/2 long-lived connections make L4 load balancing ineffective (single connection → single backend). Solutions: (1) Client-side load balancing — client discovers backends, distributes calls. (2) Look-aside load balancing (gRPC-LB protocol). (3) Sidecar proxy (Envoy) handles load balancing per request.

## 14. Concept Check Quiz

**Q1: What transport protocol does gRPC use?**
- A) HTTP/1.1
- B) HTTP/2
- C) Raw TCP
- D) UDP
- **Answer: B** — gRPC uses HTTP/2 for multiplexing, streaming, and efficient connection utilization.

**Q2: What serialization format does gRPC primarily use?**
- A) XML
- B) JSON
- C) Protocol Buffers
- D) YAML
- **Answer: C** — Protocol Buffers (protobuf) is the default. gRPC also supports flatbuffers and other serializers.

**Q3: Which gRPC pattern is best for real-time chat?**
- A) Unary
- B) Server streaming
- C) Client streaming
- D) Bidirectional streaming
- **Answer: D** — Bidirectional streaming allows both sides to send messages independently in real-time.

**Q4: What is the main reason gRPC isn't used directly in browsers?**
- A) Browsers don't support HTTP/2
- B) Browsers can't access gRPC's HTTP/2 trailers (required for response)
- C) Protobuf is too large for browsers
- D) Browsers block all binary protocols
- **Answer: B** — gRPC requires HTTP/2 trailers (headers after the body), which browser Fetch API and XHR don't expose. gRPC-web solves this with a proxy (Envoy).

## 15. Next Steps

Continue to **WebHooks vs Polling vs WebSockets** (lesson-02-04) to compare the different strategies for real-time and event-driven communication.`,
    estimatedMin: 15,
    difficulty: "ADVANCED" as const,
    companies: ["Google", "Netflix", "Uber", "Square"],
    tags: ["gRPC", "Protocol Buffers", "HTTP2", "RPC", "serialization"],
  },

  {
    id: "lesson-02-04",
    slug: "apis-protocols-authentication-04-webhooks-vs-polling-vs-websockets",
    title: "WebHooks vs Polling vs WebSockets",
    content: `## 0. Mental Model

> You need to know when a package arrives at the warehouse. **Polling** is calling the warehouse every 5 minutes to ask "Is it here yet?" — simple but wastes everyone's time. **WebHooks** is giving the warehouse your phone number and asking them to call you when it arrives — efficient but requires them to remember you. **WebSockets** is keeping the phone line open constantly — instant updates but expensive to maintain.

## 1. Quick Summary

**Polling**: Client repeatedly asks server for new data. Simple, but wasteful (most requests return nothing). **Long Polling**: Server holds request open until data arrives. Better, but still one request per event. **WebHooks**: Server sends HTTP POST to client-provided URL when event happens (reverse API). **WebSockets**: Persistent bidirectional connection for real-time communication. Each approach trades off latency, server load, and complexity.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Polling** | Client repeatedly requests server at fixed intervals |
| **Short Polling** | Client polls at regular intervals (e.g., every 5s) |
| **Long Polling** | Server holds connection until data or timeout |
| **WebHook** | HTTP callback triggered by server-side events |
| **WebSocket** | Persistent full-duplex connection over TCP |
| **Server-Sent Events (SSE)** | Server → Client text-based event stream over HTTP |
| **Event Stream** | Sequence of events consumed by a subscriber |
| **Delivery URL** | WebHook endpoint registered by the subscriber |
| **Retry Policy** | WebHook retry logic on failure (exponential backoff) |
| **Signature** | HMAC hash verifying WebHook authenticity |

## 3. Problem Without It

- **Short polling 5s interval**: 99% of requests return "no new data." At 10K clients, that's 2M useless requests/hour. Wasted bandwidth and server CPU.
- **No server-initiated communication**: HTTP is client-initiated. The server can't push data without the client asking first.
- **Real-time needs**: Chat messages, live collaboration, stock tickers — polling delays them by the poll interval (5s minimum).
- **WebHook chaos**: No standard WebHook delivery mechanism → every service implements differently, no retry/verification common.

## 4. How It Works — Core Mechanics

**Polling (Short):**
\`\`\`
Client: Any new messages?    Server: No.
Client: Any new messages?    Server: No.
Client: Any new messages?    Server: Yes! [data]
Client: Any new messages?    Server: No.
\`\`\`
Waste: 3 out of 4 requests return nothing.

**Long Polling:**
\`\`\`
Client: Any new messages?    Server: [holds connection...]
                             Server: Yes! [data] (closes)
Client: Any new messages?    Server: [holds connection...]
\`\`\`
Better: one request per event. But server must maintain open connections.

**WebHooks:**
\`\`\`
Event happens → Server → POST https://client.example.com/webhook
                        → Payload: { event: "order.created", data: {...} }
                        → Client responds 200 OK
\`\`\`
Server delivers the event. Client must be reachable (public URL or VPN).

**WebSockets:**
\`\`\`
Client → Server: Upgrade to WebSocket
Server → Client: 101 Switching Protocols
[Persistent full-duplex connection]
Server → Client: { type: "message", data: "Hello" }
Client → Server: { type: "typing", data: true }
\`\`\`

## 5. Variants & Flavors

| Feature | Short Polling | Long Polling | SSE | WebSockets | WebHooks |
|---------|--------------|-------------|-----|------------|----------|
| Direction | Client → Server | Client → Server | Server → Client | Bidirectional | Server → Client |
| Transport | HTTP | HTTP (held) | HTTP (persistent) | TCP (upgraded) | HTTP (separate) |
| Connection count | High | High (held) | Low (held) | Low (held) | None (per event) |
| Latency | Interval (5-60s) | Event-driven | ~100ms | ~10ms | Event-driven |
| Server complexity | Low | Medium | Medium | High | Medium |
| Client complexity | Low | Low | Low | Medium | Medium |
| Firewall traversal | Always | Always | Always | May be blocked | Requires public URL |
| Reconnection | Automatic | Automatic | Automatic | Manual | N/A (HTTP) |

## 6. Performance Characteristics

| Metric | Short Polling (5s) | Long Polling | SSE | WebSockets | WebHooks |
|--------|-------------------|-------------|-----|------------|----------|
| Requests per msg (1K clients) | 12,000 req/msg (5s interval) | 1 req/msg | 0 (persistent) | 0 (persistent) | 1 POST/msg |
| Server connections | Low (request/reply) | = client count | = client count | = client count | None |
| Memory per client | ~2KB | ~5KB (held conn) | ~5KB | ~10KB | ~0 |
| Messages/sec per server | 10K | 50K | 100K | 100K+ | 100K+ |
| Scalability limit | Request rate | Concurrent connections | Concurrent connections | Concurrent connections | Outbound HTTP capacity |

## 7. Failure Modes

- **Polling storms**: Many clients poll simultaneously after an incident (thundering herd). *Fix*: jitter (randomize poll intervals), staggered polling.
- **Long polling timeout**: Connection drops after 30s (proxy timeout). Client must reconnect. *Fix*: shorter poll timeout, immediate reconnect.
- **WebHook delivery failure**: Server is down when WebHook fires → event lost. *Fix*: retry with exponential backoff, dead letter queue, idempotency keys.
- **WebHook verification missing**: Anyone can POST to the WebHook URL → fake events. *Fix*: HMAC signature verification (secret key), IP allowlisting.
- **WebSocket reconnection storm**: All clients reconnect simultaneously after server restart. *Fix*: jittered exponential backoff, connection draining.

## 8. Decision Framework

\`\`\`
Choosing the right real-time approach:
├── Client polls for new data (simple)?
│   └── Short polling (if acceptable latency > 30s) 
├── Event-driven, server to client (push)?
│   ├── Server knows client URL → WebHooks (most efficient)
│   ├── Client is browser → SSE (simpler than WebSocket)
│   └── Client needs bidirectional → WebSockets
├── Real-time collaboration (Figma, Google Docs)?
│   └── WebSockets (bidirectional, low latency)
├── Financial data / live sports?
│   └── WebSockets or SSE (push with low latency)
├── Payment confirmation / CI build result?
│   └── WebHooks (server calls client when done)
├── Chat application?
│   └── WebSockets (bidirectional, persistent)
└── IoT sensor data (many devices)?
    └── Long polling or MQTT (WebSocket-based)
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show four panels. (1) Polling: Client → Server with repeated "Any data?" arrows, most returning "No". (2) Long Polling: Client → Server arrow with "waiting..." label, Server eventually responds. (3) WebHooks: Event → Server, then Server → Client WebHook with POST arrow. (4) WebSockets: Persistent bidirectional pipe between Client and Server. Each panel has latency and efficiency callouts.*

## 10. Real Production Incident

**Stripe WebHook Reliability Design (Stripe's Architecture)** — Stripe processes millions of payment events daily via WebHooks. Early on, they found that 5% of merchants had unreachable WebHook endpoints (down servers, misconfigured firewalls, expired TLS certs). **Impact**: Payment confirmations lost, merchants didn't know orders succeeded, support tickets flooded. **Fix**: Stripe implemented: (1) Exponential backoff retry (immediate → 5min → 30min → 2h → 6h → 12h). (2) WebHook signatures (HMAC-SHA256 with signing secret). (3) Dashboard for WebHook delivery history and manual replay. (4) Idempotency keys on WebHook events (same event can be sent multiple times safely). (5) Dead letter queue after 3 days of failures. **Lesson**: **WebHooks require robust delivery guarantees — signature verification prevents spoofing, retry with backoff handles transient failures, and a dead letter queue ensures no event is permanently lost**.

## 11. Production Implementation

**Naive**: Short polling with setInterval. No backoff. No error handling. Server returns all data every time.

**Better**: Long polling with proper timeout handling. WebSocket with reconnection logic. WebHook with HMAC signature verification and retry logic.

**Production**: Hybrid approach — WebSocket for real-time bidirectional communication, WebHooks for event notifications to external services. SSE for server-to-client streaming (simpler, browser-native EventSource API). Implement exponential backoff with jitter for all reconnections. Use message queues (Redis pub/sub, RabbitMQ, Kafka) for cross-instance event distribution. WebHook delivery tracking with idempotency keys. Circuit breaker for WebHook delivery endpoints. Rate limiting for outgoing WebHooks. Monitor: WebSocket connection count, poll rate, WebHook delivery success rate, event latency.

## 12. Real Company Deep Dives

- **Stripe**: Industry-leading WebHook implementation. Every event (charge.succeeded, invoice.payment_failed) has a unique ID, HMAC signature, and idempotency key. Dashboard shows delivery attempts and allows manual replay.
- **Slack**: Real-time messaging via WebSocket (RTM API) and Event API (WebHooks). Slack's Events API delivers events to registered URLs with retry and signature verification.
- **GitHub**: WebHooks for repository events (push, PR, issues). Users register WebHook URLs in repo settings. GitHub sends HMAC-signed payloads with \`X-Hub-Signature-256\`. Support for secret scanning and delivery history.
- **Figma**: Real-time collaboration via WebSocket with operational transforms. Changes sent as binary WebSocket frames. Persistent connection with reconnection and state reconciliation.
- **Binance**: Market data via WebSocket (stream.binance.com). 100K+ messages/sec per connection. Order book depth, trade updates, candlestick data. WebSocket for real-time, REST for historical.

## 13. Interview Playbook

**Q1: "WebHooks vs Polling — when to use each?"**
- Model answer: Polling when: client controls interval, server can't push, acceptable latency is higher (5-60s). WebHooks when: server-initiated, lower latency needed, client is reachable. WebHooks are more efficient (one request per event vs many polls).

**Q2: "How do you make WebHooks reliable?"**
- Model answer: (1) Retry with exponential backoff. (2) HMAC signature verification. (3) Idempotency keys (dedup repeated deliveries). (4) Dead letter queue for persistent failures. (5) Delivery logging and dashboard. (6) Circuit breaker for failing endpoints.

**Q3: "What are the tradeoffs between WebSockets and SSE?"**
- Model answer: SSE is simpler (EventSource API, automatic reconnection, works through HTTP proxies). Only server → client. WebSocket is bidirectional, lower latency (no HTTP overhead after upgrade), but more complex (manual reconnection, proxy issues). Use SSE for notifications, logs, live scores. Use WebSocket for chat, collaboration, gaming.

**Q4: "How would you implement a real-time notification system?"**
- Model answer: (1) WebSocket for browser clients (persistent connection). (2) SSE fallback for browsers without WebSocket. (3) WebHooks for external service notifications. (4) Message queue (Redis pub/sub) to fan out events across server instances. (5) Event store for delivery tracking and replay. (6) Client-side reconnection with exponential backoff.

## 14. Concept Check Quiz

**Q1: Which approach requires no persistent server connection?**
- A) WebSockets
- B) Short polling
- C) SSE
- D) Long polling
- **Answer: B** — Short polling opens a new HTTP connection, gets response, closes. No persistent connection needed.

**Q2: What problem does WebHook signature verification solve?**
- A) Encryption of event data
- B) Authentication — verifying the WebHook came from the claimed source
- C) Compression of large payloads
- D) Rate limiting
- **Answer: B** — HMAC signature verifies the WebHook payload was sent by the claimed sender and hasn't been tampered with.

**Q3: Which is the most efficient approach in terms of server resources?**
- A) Short polling (5s)
- B) Long polling
- C) WebHooks
- D) WebSockets
- **Answer: C** — WebHooks require no persistent connections. One HTTP request per event. WebSockets and long polling maintain persistent connections consuming server memory.

**Q4: What is SSE's key limitation compared to WebSockets?**
- A) Higher latency
- B) Server → Client only (no client → server data)
- C) Requires special browser permissions
- D) Binary data not supported
- **Answer: B** — SSE is unidirectional (server → client). For client → server data, you'd need separate HTTP requests.

## 15. Next Steps

Continue to **API Gateway** (lesson-02-05) to learn how a unified entry point handles routing, authentication, rate limiting, and protocol translation for microservice architectures.`,
    estimatedMin: 13,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Stripe", "Slack", "GitHub", "Figma"],
    tags: ["WebHooks", "WebSockets", "Polling", "real-time", "events"],
  },
  {
    id: "lesson-02-05",
    slug: "apis-protocols-authentication-05-api-gateway",
    title: "API Gateway",
    content: `## 0. Mental Model

> An API Gateway is a **reception desk at a corporate headquarters**. All visitors (API clients) enter through the main lobby. The receptionist: checks ID (authentication), verifies the visitor is expected (authorization), routes to the correct floor (routing), enforces visitor limits (rate limiting), logs everyone in/out (audit), and sometimes answers simple questions directly (response transformation). The rest of the building (microservices) stays secure behind locked doors.

## 1. Quick Summary

An **API Gateway** is a single entry point for all client requests in a microservice architecture. It handles cross-cutting concerns: request routing, authentication, rate limiting, caching, logging, request/response transformation, and protocol translation. Examples: Kong, AWS API Gateway, NGINX, Envoy, Traefik, Zuul (Netflix). Without it, every microservice would need to implement these concerns independently.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **API Gateway** | Single entry point routing requests to backend services |
| **Reverse Proxy** | Forwards requests to backends (subset of gateway functionality) |
| **Service Mesh** | Infrastructure layer managing service-to-service communication (sidecar proxy) |
| **Upstream** | Backend service the gateway routes to |
| **Route** | Mapping from gateway endpoint to upstream service |
| **Plugin** | Gateway extension (auth, rate limiting, logging, transformation) |
| **Backend-for-Frontend (BFF)** | Pattern: separate gateway per client type (web, mobile, IoT) |
| **Aggregation** | Gateway combining multiple backend responses into one |
| **Edge Gateway** | Gateway at the network edge (CDN-level, before traffic enters VPC) |
| **Internal Gateway** | Gateway for inter-service communication (internal network) |

## 3. Problem Without It

- **Client complexity**: A mobile app needs to call 8 different microservices (users, products, orders, payments, shipping, reviews, recommendations, search). Without a gateway, the client manages 8 base URLs, 8 auth schemes, 8 error formats.
- **Duplicate cross-cutting concerns**: Every microservice implements authentication, rate limiting, logging, CORS, request validation independently → inconsistent, buggy, hard to update.
- **Backend exposure**: Every microservice needs a public IP and port. Attack surface = number of services × number of ports.
- **Protocol mismatch**: Some services speak gRPC, others REST, others GraphQL. Clients want JSON. Gateway translates.
- **No centralized control**: Rate limits, throttling, and quotas are scattered across services → hard to enforce global limits.

## 4. How It Works — Core Mechanics

**Request Flow Through Gateway:**
\`\`\`
Client → DNS → CDN → API Gateway
                        ├── Auth Plugin → JWT verification
                        ├── Rate Limiter → Redis counter
                        ├── Request Transformer → Add headers
                        ├── Router → Match URL to service
                        ├── Circuit Breaker → Health check
                        └── Response Transformer → Remove internal fields
Client ← ← ← ← ← ← ← ← API Gateway
\`\`\`

**Typical Gateway Architecture:**
\`\`\`
                            ┌─────────────────┐
                            │   API Gateway    │
                            │  (Kong, NGINX,   │
                            │   Envoy, AWS GW) │
                            └────────┬────────┘
                    ┌─────────────────┼──────────────────┐
                    ▼                 ▼                    ▼
            ┌──────────────┐ ┌──────────────┐ ┌────────────────┐
            │ User Service │ │Order Service │ │ Payment Service │
            │ (REST)       │ │ (gRPC)       │ │ (SOAP legacy)   │
            └──────────────┘ └──────────────┘ └────────────────┘
\`\`\`

**Gateway Responsibility Matrix:**

| Concern | Without Gateway | With Gateway |
|---------|----------------|--------------|
| Authentication | Every service | Gateway (once) |
| Rate Limiting | Every service | Gateway (centralized) |
| TLS termination | Every service | Gateway (offloaded) |
| CORS | Every service | Gateway (centralized) |
| Request validation | Every service | Gateway (schema-based) |
| Response caching | Individually | Gateway (unified) |
| Monitoring | Per-service metrics | Gateway + per-service |
| Client updates | Every client change | Gateway handles routing |

## 5. Variants & Flavors

| Gateway | Language | Key Strength | Notable Users |
|---------|----------|-------------|---------------|
| **Kong** | Lua/OpenResty | Plugin ecosystem, DB-backed | Airbus, Mitsubishi |
| **NGINX Plus** | C | Performance, maturity | Netflix CDN, WordPress.com |
| **Envoy** | C++ | Service mesh native, L7 advanced | Lyft, Apple, Google |
| **Traefik** | Go | Cloud-native, auto-discovery (K8s, Docker) | Shopify, Adobe |
| **AWS API Gateway** | Managed | Serverless, AWS integration | Thousands of companies |
| **Zuul (Netflix)** | Java | Netflix-oss, dynamic routing | Netflix |
| **KrakenD** | Go | Performance, configuration-driven | Various |
| **Apollo Gateway** | JS/TS | GraphQL federation | Netflix, Airbnb |

## 6. Performance Characteristics

| Metric | NGINX | Envoy | Kong | AWS API Gateway |
|--------|-------|-------|------|----------------|
| Throughput (req/s, single instance) | 100K+ | 80K+ | 30K+ | 10K+ (scaling) |
| P99 latency added | <100µs | <200µs | <500µs | ~5ms |
| Config reload | Hot reload (reload signal) | Hot reload (xDS) | DB-driven | Instant (managed) |
| Plugin overhead per plugin | ~10µs | ~20µs | ~50µs | N/A |
| Memory per connection | ~5KB | ~10KB | ~15KB | Managed |

## 7. Failure Modes

- **Gateway SPOF**: If the gateway goes down, all services are unavailable. *Fix*: multiple gateway instances behind load balancer, health checks, auto-scaling.
- **Latency tax**: Every request passes through the gateway → adds latency. *Fix*: minimize plugin chain, use high-performance gateway (Envoy, NGINX), bypass gateway for internal service-to-service calls.
- **Tight coupling to gateway**: Custom gateway plugins become business logic → gateway is now a monolith. *Fix*: keep plugins for cross-cutting concerns only; business logic belongs in services.
- **Request timeouts**: Gateway timeout too short → slow upstream service returns 504. Timeout too long → gateway holds connections under backpressure. *Fix*: tune timeouts per route, implement circuit breakers.
- **Configuration drift**: Gateway config managed manually → out of sync with actual services. *Fix*: Infrastructure as Code (Terraform, Pulumi), GitOps for gateway config.

## 8. Decision Framework

\`\`\`
When to use an API Gateway:
├── Multiple microservices (3+)?
│   └── Yes — client shouldn't manage N endpoints
├── Need centralized auth?
│   └── Yes — JWT verification once, not per service
├── Multiple client types (web, mobile, IoT)?
│   └── Consider Backend-for-Frontend (BFF) per client type
├── Need rate limiting / throttling?
│   └── Yes — centralized enforcement
├── Greenfield project?
│   └── Start without gateway, add when 3+ services
├── Service mesh (Istio, Linkerd)?
│   └── Use mesh for internal traffic, gateway for external
├── Serverless architecture?
│   └── AWS API Gateway or similar (native integration)
└── Need protocol translation (gRPC → REST)?
    └── Yes — gateway handles it (Envoy gRPC-JSON transcoder)
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show a typical API Gateway deployment. Left: Client (mobile app, browser, IoT device) all connecting to a central "API Gateway" box. The gateway has plugin boxes stacked on top: Auth, Rate Limiter, Logger, Cache. Right of the gateway: 3-4 microservices (Users, Orders, Payments, Shipping) each with their own database. The gateway routes to each based on URL path. A "Service Mesh" layer below shows sidecar proxies handling internal service-to-service traffic. Arrows show: external traffic → gateway → services (left to right), and gateway → services → gateway → client (right to left for responses).*

## 10. Real Production Incident

**Netflix API Gateway — Zuul to Envoy Migration (2020)** — Netflix's Zuul gateway handled 100B+ requests/day but had scaling issues. Zuul 1 (Servlet-based) was blocking: each request consumed a thread. At peak traffic, 20K+ threads caused context switching overhead, GC pauses, and CPU saturation. **Impact**: Latency spikes during peak hours, thread pool exhaustion under load. **Fix**: Netflix rewrote Zuul 2 (Netty-based, non-blocking) and later migrated to Envoy for their service mesh. Zuul 2 handles 100K+ requests/sec per instance with 10x fewer threads. **Lesson**: **Thread-per-request gateway architectures don't scale — non-blocking I/O (event loop, async) is essential for high-throughput gateways handling 100K+ concurrent requests**.

## 11. Production Implementation

**Naive**: Single NGINX with static config pointing to backend servers. No auth, no rate limiting. Manual config updates.

**Better**: Kong or NGINX Plus with: JWT auth plugin, rate limiting (Redis-backed), request/response transformation, health checks, basic monitoring.

**Production**: Gateway deployed as a fleet behind L4 load balancer (NLB). Auto-scaling based on request rate and latency. Route configuration via API (Kong Admin API, Envoy xDS). Service mesh (Istio) with Envoy sidecar for internal traffic, separate gateway (Ingress Gateway) for external traffic. Canary deployments — route % traffic to new service version. Structured logging with correlation IDs. Circuit breakers per upstream. Rate limiting per client (API key based). WebSocket and gRPC support at gateway level. Dashboard for gateway metrics (latency per route, error rate, rate limit hits).

## 12. Real Company Deep Dives

- **Netflix**: Zuul gateway handles 100B+ requests/day. Routes to 1000+ microservices. Dynamic routing (canary, red-black). Built on Netty (non-blocking I/O). Replaced Zuul 1 (thread-per-request) with Zuul 2 (event-driven) for performance.
- **Amazon**: AWS API Gateway handles millions of APIs. Integrates with Lambda, DynamoDB, SQS. Features: throttling, caching, API keys, WAF integration, OpenAPI import. Used by thousands of companies.
- **Kong**: Open-source gateway with 200+ plugins. DB-backed configuration (PostgreSQL/Cassandra). Used by Airbus, Mitsubishi, Farenheit. Kong Gateway Enterprise adds service mesh features.
- **Shopify**: Uses Traefik as edge gateway. Dynamic configuration via Kubernetes CRDs. Routes to 500+ microservices. Canary deployments at gateway level.
- **Lyft**: Created Envoy (now CNCF graduated). Envoy is both edge gateway and sidecar proxy. Used by Lyft, Apple, Google, and thousands of companies for service mesh.

## 13. Interview Playbook

**Q1: "What problems does an API Gateway solve?"**
- Model answer: (1) Single entry point for multiple microservices. (2) Centralized cross-cutting concerns: auth, rate limiting, logging, CORS. (3) Protocol translation (gRPC → REST, HTTP → WebSocket). (4) Backend encapsulation (hide service architecture). (5) Request aggregation (combine multiple service responses).

**Q2: "API Gateway vs Service Mesh — what's the difference?"**
- Model answer: API Gateway handles external (north-south) traffic — client to service. Service Mesh handles internal (east-west) traffic — service to service. Gateway is a single component; mesh is a sidecar-per-pod infrastructure layer. Many deployments use both: gateway at the edge, mesh internally.

**Q3: "What is the Backend-for-Frontend pattern?"**
- Model answer: Instead of one gateway for all clients, create a separate BFF per client type (web BFF, mobile BFF, IoT BFF). Each BFF is tailored to that client's needs — mobile BFF returns smaller payloads, web BFF returns HTML, IoT BFF uses binary protocols. Reduces gateway complexity and client-specific logic.

**Q4: "How does a gateway handle service discovery?"**
- Model answer: Three approaches: (1) Static config — list upstream addresses manually. (2) DNS-based — gateway DNS-resolves upstream hostname (round-robin). (3) Dynamic — gateway watches service registry (Consul, etcd, K8s API) and updates routing on the fly. Dynamic is preferred for cloud-native.

## 14. Concept Check Quiz

**Q1: What is the primary purpose of an API Gateway?**
- A) Database query optimization
- B) Single entry point for microservice requests
- C) Front-end UI rendering
- D) SSL certificate generation
- **Answer: B** — API Gateway provides a single entry point routing requests to appropriate microservices, handling cross-cutting concerns centrally.

**Q2: Which gateway is most commonly used as a service mesh sidecar proxy?**
- A) Kong
- B) NGINX
- C) Envoy
- D) Traefik
- **Answer: C** — Envoy is the most widely used sidecar proxy in service meshes (Istio, Consul Connect, App Mesh).

**Q3: What problem does the Backend-for-Frontend pattern solve?**
- A) Service discovery
- B) Different client types need different API surfaces
- C) Database schema conflicts
- D) TLS certificate management
- **Answer: B** — BFF creates separate gateway instances per client type, each optimized for that client's needs (payload size, data format, features).

**Q4: Why is thread-per-request API gateway architecture problematic at scale?**
- A) Threads are too fast
- B) Each thread consumes memory and CPU for context switching
- C) Threads can't handle HTTP requests
- D) Threads are only available in Java
- **Answer: B** — Thread-per-request creates thousands of threads, each consuming stack memory (1MB+) and causing context switching overhead. Non-blocking I/O handles more connections with fewer threads.

## 15. Next Steps

Continue to **Authentication vs Authorization** (lesson-02-06) to understand the fundamental security concepts that gateways enforce — identity verification and access control.`,
    estimatedMin: 13,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Netflix", "Amazon", "Kong", "Shopify"],
    tags: ["API-Gateway", "microservices", "reverse-proxy", "routing"],
  },

  {
    id: "lesson-02-06",
    slug: "apis-protocols-authentication-06-authentication-vs-authorization",
    title: "Authentication vs Authorization",
    content: `## 0. Mental Model

> **Authentication** is showing your ID card at the airport security checkpoint — "You are who you say you are." **Authorization** is the boarding pass — "You are allowed to board flight 42." You can be authenticated (have ID) but not authorized (no boarding pass). You can never be authorized without authentication (can't board without ID), except for public areas (unauthenticated access).

## 1. Quick Summary

**Authentication** verifies identity — "Who are you?" (login, password, biometric, SSO). **Authorization** verifies permissions — "What are you allowed to do?" (RBAC roles, ABAC policies, ACLs). Authentication precedes authorization. Both are essential for secure systems. Common patterns: OAuth 2.0 for delegated authorization, OpenID Connect for authentication, JWTs for carrying both identity and permissions.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Authentication (AuthN)** | Verifying identity — proving you are who you claim to be |
| **Authorization (AuthZ)** | Verifying permissions — determining what an identity can do |
| **Principal** | The entity being authenticated (user, service, device) |
| **Credential** | Evidence of identity (password, biometric, token, certificate) |
| **MFA** | Multi-Factor Authentication — two+ credential types |
| **SSO** | Single Sign-On — one authentication for multiple services |
| **RBAC** | Role-Based Access Control — permissions assigned to roles, roles to users |
| **ABAC** | Attribute-Based Access Control — policies based on user/resource/environment attributes |
| **ACL** | Access Control List — explicit list of who can access what |
| **IAM** | Identity and Access Management — comprehensive identity framework |
| **PAP** | Policy Administration Point — where policies are defined |
| **PDP** | Policy Decision Point — where access decisions are made |
| **PEP** | Policy Enforcement Point — where access is enforced |

## 3. Problem Without It

- **No authentication**: Anyone can access any resource. Unsecured APIs are quickly found and exploited by bots.
- **No authorization**: Authenticated user can access any feature — Alice can see Bob's private data, junior employee can delete production database.
- **Credential stuffing**: Users reuse passwords → one breach compromises many accounts. MFA prevents this.
- **No audit trail**: Cannot answer "who accessed what and when?" after a security incident.
- **Permission management chaos**: Every service implements its own auth → 50 different formats, inconsistent policies, no centralized audit.

## 4. How It Works — Core Mechanics

**Authentication Flow (Password-based):**
\`\`\`
User → Server: POST /login { email, password }
Server → DB: SELECT hash FROM users WHERE email = ?
Server: bcrypt.verify(password, hash) → match/mismatch
Server → User: { token: "eyJhbGciOiJIUzI1NiIs..." }
\`\`\`

**Authorization Decision Flow:**
\`\`\`
Request: User "Alice" tries to DELETE /orders/42
PEP (API Gateway): intercepts request, extracts user ID from JWT
PEP → PDP: "Can Alice DELETE order 42?"
PDP → Policy Store: "Role: admin. Policy: admins can delete any order. Result: PERMIT"
PDP → PEP: "PERMIT" (with obligations: log, audit)
PEP → Backend: forwards request
\`\`\`

**Access Control Models:**

| Model | Principle | Example |
|-------|-----------|---------|
| **DAC** | Owner controls access | Unix file permissions (rwx) |
| **MAC** | System-enforced labels | Government classified (TS/SCI) |
| **RBAC** | Roles assigned to users | "admin", "editor", "viewer" |
| **ABAC** | Attribute-based rules | "user.department == resource.department AND time > 9am" |
| **ReBAC** | Relationship-based | "user is member of org that owns resource" |

## 5. Variants & Flavors

| Feature | RBAC | ABAC | ReBAC |
|---------|------|------|-------|
| Complexity | Low | High | Medium |
| Flexibility | Low (role explosion) | High (any attribute) | Medium |
| Maintenance | Role management | Policy authoring | Relationship management |
| Performance | Fast (role lookup) | Slower (policy evaluation) | Medium (graph traversal) |
| Use case | Simple apps, enterprise | Cloud, fine-grained | Google Docs, Figma (shared resources) |
| Example | Google Workspace admin roles | AWS IAM policies | Google Drive sharing |

## 6. Performance Characteristics

| Operation | Local DB (bcrypt verify) | Redis session check | JWT verify (local) | JWT verify (with remote introspect) |
|-----------|-------------------------|-------------------|-------------------|------------------------------------|
| Authentication latency | ~10ms (bcrypt cost 10) | ~1ms | ~0.5ms | ~5-20ms |
| Authorization latency | ~2ms (RBAC role lookup) | ~1ms | ~0.1ms (JWT claim check) | ~5-15ms (PDP call) |
| Scalability | DB read capacity | Redis throughput | Stateless (no backend) | PDP auto-scaling |
| Complexity | Medium | Medium | Low | High |

## 7. Failure Modes

- **AuthN bypass**: Attacker finds an endpoint that doesn't authenticate (SSRF, internal API exposed). *Fix*: deny-by-default, gateway-level auth check.
- **AuthZ confusion**: Principal can't be determined due to token parsing errors → fallback to "permit" or "deny"? *Fix*: always fail closed (deny on uncertainty).
- **Role explosion**: 500 roles with slight differences → unmanageable. *Fix*: use ABAC or composite roles, minimize role count.
- **Privilege escalation**: User modifies their own JWT claims → assigns admin role. *Fix*: sign JWTs server-side, verify signature, never trust client claims.
- **Inconsistent policy enforcement**: API gateway enforces auth, but service also enforces → different logic → bypass. *Fix*: defense in depth but ensure consistency.

## 8. Decision Framework

\`\`\`
Designing authentication and authorization:
├── Simple app (one service)?
│   ├── AuthN: bcrypt + session cookie or JWT
│   └── AuthZ: middleware checking user role from session/token
├── Microservices?
│   ├── AuthN: centralized identity (OIDC, Auth0, Okta)
│   ├── AuthZ: RBAC (start simple) or ABAC (if fine-grained needed)
│   └── Enforcement: API gateway (PEP) + PDP service
├── Enterprise (many apps)?
│   ├── SSO (OIDC/SAML) — one login for all apps
│   ├── Identity Provider (Okta, Azure AD, Google Workspace)
│   └── MFA mandatory for admin accounts
├── API-only (no UI)?
│   ├── API keys + OAuth 2.0 Client Credentials
│   └── Scope-based authorization (OAuth scopes)
├── Fine-grained (Google Docs, Figma)?
│   ├── ReBAC with relationship graph
│   └── Policy engine (Open Policy Agent, Google Zanzibar)
└── Compliance-heavy (PCI, HIPAA, SOC2)?
    ├── ABAC with attribute validation
    └── Complete audit trail (who, what, when, result)
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show a two-part flow. Part 1 (Authentication): Client → Login page → Identity Provider (IdP) → Token issued → Client stores token. The IdP checks credentials against a user store and optionally sends MFA challenge. Part 2 (Authorization): Client makes API request with token → PEP (API Gateway) checks with PDP → PDP evaluates policy against Policy Store → returns Permit/Deny → PEP forwards or rejects. Below: RBAC pyramid — Users → Roles → Permissions, and ABAC diagram — Subject Attributes + Resource Attributes + Environment Attributes → Policy → Decision.*

## 10. Real Production Incident

**Capital One's SSRF and Authorization Failure (2019)** — A former AWS employee exploited a WAF misconfiguration (SSRF) in Capital One's web application. The compromised web server had IAM role permissions to read S3 objects. **Root cause**: Authorization at the network perimeter (WAF) failed to block requests to the metadata endpoint (169.254.169.254). Once inside, the server's IAM role was overprivileged — it could read ANY S3 bucket, not just the specific buckets needed. **Impact**: 100M+ credit card applications exposed, $190M fine. **Fix**: (1) WAF rules to block metadata endpoint, (2) least-privilege IAM policies (specific buckets only), (3) IMDSv2 (session-based metadata, not request-based). **Lesson**: **Authorization must be defense-in-depth — network-level (WAF blocks SSRF), identity-level (IAM least-privilege), and application-level (service enforces own authorization)**.

## 11. Production Implementation

**Naive**: Password stored in plaintext. User roles hardcoded. No session timeout. Same middleware for auth and authorization.

**Better**: bcrypt/argon2 for passwords. JWT with RS256 signed by identity service. RBAC roles stored in JWT claims. Auth middleware checks JWT signature. Authorization middleware checks role-based permissions.

**Production**: Decoupled identity provider (Auth0, Okta, Keycloak, or custom OIDC). Short-lived access tokens (15min) + long-lived refresh tokens (7 days). MFA for sensitive operations. Step-up authentication (bank transfer requires re-auth). Policy-as-code (Open Policy Agent, Cedar). Attribute-based authorization for fine-grained control. Audit logging of all auth decisions. Token revocation via blocklist (if immediate revocation needed). Rate limiting on auth endpoints (prevent brute force). Session monitoring (detect token reuse from different geographies).

## 12. Real Company Deep Dives

- **Okta**: Enterprise identity and access management. 15K+ customers. Provides SSO, MFA, lifecycle management. OAuth 2.0 + OIDC compliant. Used by Nordstrom, JetBlue, Moody's.
- **Auth0**: Developer-friendly auth platform. 30K+ customers. Social login, passwordless, MFA. Fine-grained authorization with Auth0 Rules. Acquired by Okta ($6.5B).
- **AWS IAM**: Fine-grained ABAC with conditions (IP, time, MFA, resource tags). Policy evaluation engine handles 100K+ policies. Supports trust policies, resource policies, service control policies.
- **Google Zanzibar**: Global authorization system for Google's services (YouTube, Drive, Calendar, Photos). ReBAC model. Handles 100M+ authorization checks/sec with <10ms p99 latency. Open-sourced as SpiceDB.

## 13. Interview Playbook

**Q1: "Authentication vs Authorization — what's the difference?"**
- Model answer: Authentication verifies identity ("who are you?"). Authorization verifies permissions ("what can you do?"). Authentication produces an identity (user ID). Authorization uses that identity to check policies. Authentication always comes first.

**Q2: "What is the difference between RBAC and ABAC?"**
- Model answer: RBAC assigns roles to users, permissions to roles (simpler, role explosion problem). ABAC uses attributes of user, resource, and environment to evaluate policies (more flexible, more complex). RBAC is easier to implement; ABAC scales to fine-grained, organization-wide policies.

**Q3: "How do you implement authorization in a microservice architecture?"**
- Model answer: Centralized PDP (policy decision point) — services ask PDP "can user X do action Y on resource Z?" PDP evaluates policy and returns permit/deny. PEP (policy enforcement point) in API gateway or service mesh enforces the decision. Use OAuth 2.0 scopes for coarse-grained, ABAC for fine-grained.

**Q4: "What is OAuth 2.0 and what problem does it solve?"**
- Model answer: OAuth 2.0 is a delegated authorization framework. It allows a third-party app to access resources on behalf of a user without sharing the user's password. Uses tokens (access token, refresh token) instead of credentials. Scopes limit what the token can do.

## 14. Concept Check Quiz

**Q1: Which comes first in a secure system — authentication or authorization?**
- A) Authorization (decide permissions first)
- B) Authentication (verify identity first)
- C) Both simultaneously
- D) Neither — they are independent
- **Answer: B** — You must know WHO the user is before deciding WHAT they can do.

**Q2: What is the primary advantage of ABAC over RBAC?**
- A) Simpler to implement
- B) Fine-grained, context-aware policies
- C) Faster decision performance
- D) Fewer policies needed
- **Answer: B** — ABAC evaluates multiple attributes (user department, time of day, resource classification) for fine-grained access control.

**Q3: What does "fail closed" mean in authorization?**
- A) Temporarily allow all access during failure
- B) Deny access if authorization system is unavailable
- C) Close the connection
- D) Fall back to cached decisions
- **Answer: B** — Fail closed = default deny. If authorization system can't be reached, deny the request rather than allowing it.

**Q4: Which protocol is used for Single Sign-On (SSO)?**
- A) OAuth 2.0
- B) OpenID Connect
- C) SAML
- D) All of the above
- **Answer: D** — OIDC and SAML are used for SSO. OAuth 2.0 provides the authorization framework that OIDC builds on for authentication.

## 15. Next Steps

Continue to **OAuth 2.0 & OpenID Connect** (lesson-02-07) to dive deep into the industry-standard protocols for delegated authorization and federated identity.`,
    estimatedMin: 10,
    difficulty: "BEGINNER" as const,
    companies: ["Okta", "Auth0", "AWS", "Google"],
    tags: ["authentication", "authorization", "RBAC", "ABAC", "security"],
  },

  {
    id: "lesson-02-07",
    slug: "apis-protocols-authentication-07-oauth2-openid-connect",
    title: "OAuth 2.0 & OpenID Connect",
    content: `## 0. Mental Model

> OAuth 2.0 is a **valet parking system**. You hand your car keys (credentials) to a valet (third-party app), but instead of giving them full access, you give them a special valet key (access token) that only works for certain operations (scopes), for a limited time (expiration). The valet can park your car but can't open the trunk. OpenID Connect adds an **ID card** — the valet also verifies who you are, not just that you're allowed to drive.

## 1. Quick Summary

**OAuth 2.0** (2012) is a delegated authorization framework — one service can access resources on behalf of a user without seeing the user's password. **OpenID Connect (OIDC)** (2014) is an authentication layer on top of OAuth 2.0 — it adds an ID Token (JWT) that verifies the user's identity. Together they power "Login with Google," "Sign in with Apple," and enterprise SSO.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Resource Owner** | User who owns the data (you) |
| **Client** | Third-party app requesting access (e.g., a calendar app) |
| **Authorization Server** | Issues tokens (Google, Auth0, Okta) |
| **Resource Server** | Hosts protected resources (Google Calendar API) |
| **Access Token** | Short-lived credential for API access (typically 15-60 min) |
| **Refresh Token** | Long-lived credential to get new access tokens (days/weeks) |
| **ID Token** | OIDC: JWT containing user identity claims (sub, email, name) |
| **Scope** | Permission granularity (e.g., "calendar:read", "contacts:write") |
| **Authorization Code** | Temporary code exchanged for tokens (PKCE-enhanced) |
| **Grant Type** | OAuth 2.0 flow: Authorization Code, Client Credentials, Implicit, etc. |
| **PKCE** | Proof Key for Code Exchange — protects authorization code flow for mobile apps |
| **Discovery URL** | OIDC: \`/.well-known/openid-configuration\` — metadata endpoint |

## 3. Problem Without It

- **Password sharing**: To use a third-party calendar app with Google Calendar, you'd give it your Google password. Now the app has full access to your entire account (email, Drive, Photos, etc.).
- **No revocation**: Once you give your password, you can't selectively revoke the app's access without changing your password (which affects all other apps too).
- **No scope limitation**: The calendar app could read your email or delete your files — there's no way to limit "this app can only read calendar events."
- **No consents**: The user is never asked "Do you want to allow Calendar App to read your Google Calendar events?" — permission is implicit.
- **No standards**: Every service implements its own auth — incompatible, custom, insecure.

## 4. How It Works — Core Mechanics

**OAuth 2.0 Authorization Code Flow (with PKCE):**

\`\`\`
Browser (User)    Calendar App         Google Auth Server    Google Calendar API
    |                  |                      |                     |
    |   Click "Login   |                      |                     |
    |   with Google"   |                      |                     |
    |─────────────────>|                      |                     |
    |                  |--- Auth Request ----->|                     |
    |                  |   (client_id, scope,  |                     |
    |                  |    redirect_uri,      |                     |
    |                  |    code_challenge)    |                     |
    |  Login Screen    |                      |                     |
    |<─────────────────|──────────────────────|                     |
    |─────────────────>| (user logs in)       |                     |
    |                  |                      |                     |
    |  Consent Screen  |                      |                     |
    |<─────────────────|──────────────────────|                     |
    |  (allow calendar |                      |                     |
    |   app to read    |                      |                     |
    |   calendar?)     |                      |                     |
    |─────────────────>| (user approves)      |                     |
    |                  |                      |                     |
    |                  |<-- Auth Code ---------|                     |
    |                  |   (temporary)        |                     |
    |                  |--- Code + Verifier -->|                     |
    |                  |   (exchange for      |                     |
    |                  |    tokens)           |                     |
    |                  |<-- Access + Refresh --|                     |
    |                  |   + ID Token (OIDC)  |                     |
    |                  |                      |                     |
    |                  |--- API request ------>|                    |
    |                  |   (Access Token)     |  Calendar API call  |
    |                  |<-- Response ---------|                     |
\`\`\`

**OAuth 2.0 Grant Types:**

| Grant Type | Use Case | Security |
|-----------|----------|----------|
| Authorization Code | Web apps, mobile apps (with PKCE) | Most secure |
| Client Credentials | Server-to-server, no user involved | Machine-to-machine |
| Device Code | Smart TVs, CLI tools, IoT | Input-limited devices |
| Implicit (deprecated) | Browser-only apps (no client secret) | Insecure — use PKCE instead |
| Refresh Token | Getting new access tokens | Requires secure storage |

**OIDC ID Token (JWT):**
\`\`\`json
{
  "iss": "https://accounts.google.com",
  "sub": "1234567890",
  "aud": "my-app-id",
  "exp": 1715623200,
  "iat": 1715536800,
  "email": "alice@example.com",
  "email_verified": true,
  "name": "Alice Smith",
  "picture": "https://...photo.jpg"
}
\`\`\`

## 5. Variants & Flavors

| Feature | OAuth 2.0 | OIDC | SAML 2.0 |
|---------|-----------|------|----------|
| Purpose | Authorization | Authentication + Authorization | Authentication + Authorization |
| Token format | Opaque or JWT | JWT (ID token) | XML (SAML assertion) |
| Transport | JSON | JSON | XML over HTTP POST/Redirect |
| Complexity | Medium | Medium | High |
| Mobile support | Good (PKCE) | Good | Poor |
| Enterprise support | Growing | Growing | Mature (ADFS, Okta) |
| Delegation | Yes | Yes | No (direct SSO) |
| Standard since | 2012 | 2014 | 2005 |

## 6. Performance Characteristics

| Metric | OAuth 2.0 (Auth Code) | OAuth 2.0 (Client Credentials) | OIDC (with token validation) |
|--------|----------------------|-------------------------------|------------------------------|
| Token issuance latency | ~500ms (includes user interaction) | ~10ms (direct grant) | ~200ms (idP roundtrip) |
| Token validation (local JWT) | ~0.5ms (signature check) | ~0.5ms | ~0.5ms |
| Token validation (remote introspect) | ~10-20ms | ~10-20ms | ~10-20ms |
| User interaction | Required (1-2 redirects) | None | Required (1 redirect) |
| Refresh token rotation | Recommended | N/A | N/A |

## 7. Failure Modes

- **Authorization code interception**: Attacker steals the auth code (via redirect URL leak). *Fix*: PKCE (code verifier + challenge) — attacker can't exchange code without verifier.
- **CSRF on redirect URI**: Attacker tricks user's browser into completing OAuth flow with attacker's client. *Fix*: \`state\` parameter (random string, verified on return).
- **Open redirector**: Redirect URI contains \`?redirect=http://evil.com\` → attacker steals code. *Fix*: strict redirect URI allowlist.
- **Token leakage via referrer**: Access token appears in URL → referrer header leaks to third parties. *Fix*: use \`form_post\` response mode, never put tokens in URL fragments.
- **Refresh token theft**: Attacker steals long-lived refresh token → indefinite access. *Fix*: refresh token rotation (server issues new refresh token each use), revocation on anomaly detection.

## 8. Decision Framework

\`\`\`
What to use for your authentication/authorization:
├── Third-party login (Google, GitHub, Apple)?
│   └── OAuth 2.0 + OIDC (standard "Login with X")
├── Enterprise SSO (Okta, Azure AD)?
│   └── OIDC or SAML (both supported by enterprise IdPs)
├── Mobile app login?
│   └── OAuth 2.0 Authorization Code with PKCE (no client secret)
├── Server-to-server API access?
│   └── OAuth 2.0 Client Credentials Grant
├── Smart TV / CLI tool login?
│   └── OAuth 2.0 Device Authorization Grant
├── API gateway authentication?
│   └── Validate access tokens (opaque via introspection, JWT via signature)
└── Custom identity system?
    └── Use OIDC as the protocol — don't build your own protocol
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show four boxes: Resource Owner (user), Client App (third-party), Authorization Server (Google), Resource Server (Google Calendar API). Arrows trace the Authorization Code flow: (1) Client → Auth Server: auth request with code_challenge, (2) Auth Server → User: login + consent, (3) Auth Server → Client: auth code, (4) Client → Auth Server: code + verifier → tokens, (5) Client → Resource Server: API call with access token. A callout shows the ID Token (JWT) being decoded: sub, email, name, iss, aud, exp.*

## 10. Real Production Incident

**GitHub OAuth Token Theft — OctoScan Incident (2021)** — Attackers compromised a GitHub OAuth App (OctoScan) used by Heroku and Travis CI. The app had OAuth scopes for reading private repositories. When attackers stole the app's OAuth tokens (from a compromised developer machine), they could access any private repository the app had been authorized for. **Impact**: Private repos of major companies (including Heroku's source code, npm, Docker images) exposed. **Root cause**: OAuth tokens are valid until revoked — there was no token rotation or short expiry. **Fix**: GitHub (and the industry) adopted: (1) Fine-grained personal access tokens (repository-specific, permission-scoped). (2) OAuth token expiration with refresh token rotation. (3) Anomaly detection on token usage. (4) Suspicious OAuth app review. **Lesson**: **OAuth tokens are credentials — they must have short lifetimes, rotation, and revocation mechanisms. A stolen long-lived OAuth token provides indefinite access to authorized scopes**.

## 11. Production Implementation

**Naive**: Implement OAuth from scratch. Rolling your own crypto, token generation, and consent UI. Almost certainly insecure.

**Better**: Use a managed identity provider (Auth0, Okta, Keycloak, Firebase Auth). Implement standard OAuth 2.0 + OIDC. Use PKCE for mobile apps. Validate ID tokens locally (JWT signature verification).

**Production**: Identity provider with MFA, anomaly detection, and conditional access policies. Token lifetimes: access token (15 min), refresh token (7 days, rotate on use). PKCE required for all public clients (mobile, SPA). \`state\` parameter with CSRF token. Strict redirect URI allowlist. Refresh token rotation (server invalidates old refresh token). Token revocation endpoint. Discovery URL for dynamic client configuration. Audit logging of all token issuances and consents. Rate limiting on token endpoints. Certificate-bound access tokens (DPoP — Demonstrating Proof of Possession) for high-security APIs.

## 12. Real Company Deep Dives

- **Google**: OAuth 2.0 + OIDC for all Google APIs. 1B+ users. Google Sign-In used by millions of websites. Google's OAuth endpoints handle 100M+ token requests/day.
- **Microsoft**: Azure AD uses OIDC + SAML. Microsoft identity platform serves 500M+ users. Conditional Access policies (location, device compliance, risk score).
- **Meta**: Facebook Login (OAuth 2.0 variant) used by 10M+ apps. Meta's Graph API uses OAuth tokens with scopes.
- **GitHub**: OAuth 2.0 for third-party app access. Fine-grained personal access tokens (2022). GitHub Apps use OAuth with webhook-based token exchange.
- **Okta**: Enterprise identity platform. 15K+ customers. OIDC certified. Provides lifecycle management, MFA, adaptive authentication.

## 13. Interview Playbook

**Q1: "How does OAuth 2.0 Authorization Code flow work?"**
- Model answer: (1) Client redirects user to Authorization Server. (2) User authenticates and consents. (3) Auth Server returns authorization code to client. (4) Client exchanges code (+ client secret + PKCE verifier) for tokens. (5) Client uses access token to call Resource Server. PKCE prevents code interception attacks.

**Q2: "OAuth 2.0 vs OpenID Connect — what's the difference?"**
- Model answer: OAuth 2.0 is for delegated authorization — "app can access user's calendar." OpenID Connect adds authentication on top — "app knows user is alice@example.com." OIDC provides an ID Token (JWT) containing user identity claims. OAuth 2.0 gives an Access Token for API access; OIDC adds identity verification.

**Q3: "What is PKCE and why is it needed?"**
- Model answer: PKCE (Proof Key for Code Exchange) protects the authorization code flow for public clients (mobile, SPA) that can't securely store a client secret. The client generates a random \`code_verifier\` and sends its SHA-256 hash (\`code_challenge\`) in the initial request. When exchanging the code, the client sends the original \`code_verifier\` — the server hashes and compares. Even if the code is intercepted, the attacker can't exchange it without the verifier.

**Q4: "Access token vs Refresh token — what's the difference?"**
- Model answer: Access token (short-lived, 15-60 min) — used to call APIs. Refresh token (long-lived, days/weeks) — used to get new access tokens when they expire. Refresh tokens should be stored more securely (server-side or secure enclave) and should be rotated (old invalidated on use).

## 14. Concept Check Quiz

**Q1: What problem does OAuth 2.0 primarily solve?**
- A) User authentication
- B) Delegated authorization without password sharing
- C) Password storage
- D) Single sign-on for enterprise
- **Answer: B** — OAuth 2.0 allows third-party apps to access resources on behalf of a user without sharing the user's password.

**Q2: What does OpenID Connect add to OAuth 2.0?**
- A) Client credentials grant
- B) ID Token (JWT) for user identity verification
- C) Refresh tokens
- D) PKCE
- **Answer: B** — OpenID Connect adds an ID Token (JWT) that verifies the user's identity, building on OAuth 2.0's authorization framework.

**Q3: Why is the Implicit grant type deprecated?**
- A) It's too slow
- B) Access tokens are exposed in the URL fragment, insecure
- C) It requires a client secret
- D) It doesn't support mobile apps
- **Answer: B** — Implicit grant returned tokens in the URL fragment, making them vulnerable to referrer leakage and other attacks. The Authorization Code with PKCE is now recommended.

**Q4: What is the purpose of the \`state\` parameter in OAuth 2.0?**
- A) Store user data
- B) Prevent CSRF attacks
- C) Encrypt the authorization code
- D) Identify the client
- **Answer: B** — The \`state\` parameter contains a random value that the client verifies on return to prevent CSRF attacks on the OAuth redirect.

## 15. Next Steps

Continue to **JWT (JSON Web Tokens)** (lesson-02-08) to understand the token format used by OAuth 2.0 and OIDC — how JWTs encode claims, how signatures work, and best practices for secure token handling.`,
    estimatedMin: 16,
    difficulty: "ADVANCED" as const,
    companies: ["Google", "Microsoft", "Meta", "GitHub"],
    tags: ["OAuth2", "OpenID-Connect", "SSO", "authentication", "authorization"],
  },

  {
    id: "lesson-02-08",
    slug: "apis-protocols-authentication-08-jwt-json-web-tokens",
    title: "JWT (JSON Web Tokens)",
    content: `## 0. Mental Model

> A JWT is like a **laminated ID badge**. The badge contains your photo, name, and role (claims). It has a hologram (digital signature) that proves it was issued by the company (server) and hasn't been tampered with. Anyone in the building (any service) can read your info from the badge and verify the hologram without calling HR (no database lookup). But if your badge is stolen, the thief can impersonate you until it expires (no revocation).

## 1. Quick Summary

**JWT (JSON Web Token)** is a compact, URL-safe token format for representing claims between parties. It consists of three Base64-encoded segments: header, payload, and signature. JWTs can be signed (JWS — JSON Web Signature) or encrypted (JWE — JSON Web Encryption). Used for: authentication tokens, authorization claims, and secure data exchange.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **JWT** | JSON Web Token — self-contained token format (header.payload.signature) |
| **JWS** | JSON Web Signature — signed JWT (integrity + authentication) |
| **JWE** | JSON Web Encryption — encrypted JWT (confidentiality) |
| **JOSE** | JSON Object Signing and Encryption — JWT family of standards |
| **Header** | Algorithm (\`alg\`) and token type (\`typ\`) |
| **Payload** | Claims — statements about the entity (sub, iss, exp, etc.) |
| **Signature** | Cryptographic signature of header + payload |
| **Claim** | Key-value pair in the payload (registered, public, or private) |
| **Registered Claims** | Standard claims: \`iss\` (issuer), \`sub\` (subject), \`aud\` (audience), \`exp\` (expiry), \`iat\` (issued at), \`jti\` (ID) |
| **Unsecured JWT** | \`alg: none\` — no signature (must be rejected by validation libraries) |

## 3. Problem Without It

- **Session tokens (opaque)**: Server stores session in DB, sends session ID to client. Every request requires DB lookup → latency + DB load. Stateless JWT eliminates DB lookup.
- **No standard format**: Every service uses different token formats — custom base64, serialized JSON, binary. JWT provides a universal format.
- **No verification**: Opaque tokens can't be verified without the issuing server. JWT self-verifies via signature — any service with the public key can validate.
- **Coupled session store**: Session-based auth requires shared Redis or session DB across services. JWT is stateless — any service can verify locally.

## 4. How It Works — Core Mechanics

**JWT Structure:**
\`\`\`
eyJhbGciOiJSUzI1NiIsICJ0eXAiOiJKV1QifQ.    ← Header (Base64-encoded)
eyJzdWIiOiIxMjM0NTY3ODkwIiwgIm5hbWUiOiJBbGljZSJ9.  ← Payload (Base64-encoded)
MEyUuvR3RI2QeL4iLq...                               ← Signature (RS256)
\`\`\`

**Decoded:**
\`\`\`
Header:  {"alg": "RS256", "typ": "JWT"}
Payload: {"sub": "1234567890", "name": "Alice", "iat": 1715536800, "exp": 1715623200}
Signature: RSASHA256(base64url(header) + "." + base64url(payload), privateKey)
\`\`\`

**Signature Types:**

| \`alg\` | Type | Description |
|-------|------|-------------|
| \`HS256\` | Symmetric | HMAC with SHA-256 (same key signs and verifies) |
| \`RS256\` | Asymmetric | RSA with SHA-256 (private key signs, public key verifies) |
| \`ES256\` | Asymmetric | ECDSA with P-256 and SHA-256 |
| \`EdDSA\` | Asymmetric | Edwards-curve Digital Signature Algorithm (Ed25519) |
| \`none\` | Unsecured | No signature (insecure, reject in validation) |

**Verification Flow:**
\`\`\`
Service receives JWT:
1. Split by "." → header, payload, signature
2. Decode header → check alg (reject "none")
3. Check exp (reject if expired)
4. Check iss (matches expected issuer)
5. Check aud (matches our service)
6. Verify signature using public key
✓ All checks pass → extract claims from payload
\`\`\`

## 5. Variants & Flavors

| Feature | Opaque Token (Session ID) | JWT (Self-contained) |
|---------|--------------------------|----------------------|
| Storage | Server-side (Redis/DB) | None (client stores) |
| Verification | DB lookup (read) | Local (signature verify) |
| Revocation | Immediate (delete from DB) | Difficult (add to blocklist) |
| Size | Small (~32 bytes) | Larger (~1-4KB) |
| Payload | Not human-readable | Self-contained (claims visible) |
| Expiration | Session timeout | \`exp\` claim |
| Cross-service | Needs shared session store | Works with shared public key |

## 6. Performance Characteristics

| Metric | Opaque Token (Redis verify) | JWT (local verify) |
|--------|----------------------------|-------------------|
| Verification latency | ~1-3ms (network round trip) | ~0.2-0.5ms (local) |
| Verification throughput | Redis capacity (100K ops/s) | Unlimited (local CPU) |
| Token size | ~32 bytes (session ID) | ~1-4KB (JWT claims) |
| Bandwidth per request | Minimal | Moderate (on every request) |
| Revocation speed | Instant (delete from Redis) | Slow (blocklist or short TTL) |

## 7. Failure Modes

- **No signature verification**: Library accepts \`alg: none\` → attacker forges any JWT. *Fix*: use libraries that reject \`none\` by default, always verify signature.
- **Key confusion (RS256 vs HS256)**: Library uses public key as HMAC secret → attacker signs with public key (available) and library verifies with same key. *Fix*: always specify expected algorithm, use asymmetric (RS256/ES256) for multi-service scenarios.
- **No expiry**: JWT never expires → stolen token works forever. *Fix*: always set \`exp\` (15-60 min for access tokens).
- **JWT not invalidated**: User logs out but JWT still valid. *Fix*: short-lived tokens + refresh token rotation, blocklist if immediate revocation needed.
- **Sensitive data in payload**: JWT payload is base64-encoded, not encrypted. Anyone who intercepts it can read claims. *Fix*: never put secrets (passwords, SSNs) in JWT payload. Use JWE (encrypted JWT) if needed.
- **\`sub\` not unique**: Using email as subject → user changes email → can't revoke old tokens. *Fix*: use immutable, unique user ID as \`sub\`.

## 8. Decision Framework

\`\`\`
When to use JWTs:
├── Stateless authentication (no session store)?
│   └── Yes — verifiable by any service with public key
├── OAuth 2.0 / OpenID Connect?
│   └── Required — access tokens (opaque or JWT), ID tokens (always JWT)
├── Microservice authentication?
│   └── JWT with RS256 — any service can verify with public key
├── API-only auth (no user)?
│   └── OAuth 2.0 Client Credentials → Access Token (opaque or JWT)
├── Need immediate revocation?
│   └── Opaque tokens (Redis check) — JWT revocation is complex
├── High-traffic API (100K+ req/s)?
│   └── JWT (local verify, no DB hit per request)
├── Mobile app?
│   └── JWT + short expiry + refresh token rotation
└── Server-side rendering (HTML)?
    └── Session cookie (opaque, server-stored) — simpler, no JWT complexity
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show a JWT being decoded into three Base64 segments. A magnifying glass over the Payload reveals claims: sub, name, email, iat, exp, iss, aud. A "Signature" box shows the signing process: Header + Payload → RSASHA256 (private key) → Signature. Verification shows the reverse: JWT → split → Header + Payload → RSASHA256 (public key) → compare to Signature. Below, a token lifecycle: User logs in → JWT issued (15min) → Client uses for API calls → Expired → Refresh token exchanges for new JWT.*

## 10. Real Production Incident

**Auth0 JWT Library Vulnerability (CVE-2022-23529, Dec 2022)** — A critical vulnerability in multiple JWT libraries (including Auth0's \`jsonwebtoken\` for Node.js) allowed attackers to bypass signature verification. By crafting a JWT with \`alg: none\` and embedding a special payload, the vulnerable library would skip signature verification entirely. **Impact**: Any application using vulnerable library versions could accept forged JWTs, allowing attackers to impersonate any user. **Root cause**: The library's verification logic checked for \`alg: none\` after parsing, but an obscure code path didn't perform the check if the \`secretOrPublicKey\` parameter was a string. **Fix**: Library patches released (upgrade to fixed version). **Lesson**: **Always: (1) use libraries that explicitly deny \`alg: none\`, (2) pin specific algorithm (not "auto-detect"), (3) audit JWT library updates — JWT vulnerabilities are critical and appear regularly**.

## 11. Production Implementation

**Naive**: JWT with HS256 (shared secret). Secret hardcoded in source code. No expiry. Full user object in payload.

**Better**: RS256 (asymmetric — private key signs, public keys verify across services). Short expiry (15 min). Minimum claims: \`sub\`, \`iat\`, \`exp\`, \`iss\`, \`aud\`. Key rotation supported (multiple public keys by \`kid\` header).

**Production**: OIDC-compliant identity provider issues JWTs. RS256 or ES256 (ECC is faster and smaller). JWT with \`jti\` (unique token ID) for blocklisting specific tokens. Key rotation with \`kid\` header. Automated key rotation (rotate signing keys every 90 days). JWT validation middleware at API gateway (reject expired, verify signature, check audience). Refresh token rotation (spinning refresh tokens — old invalidated on use). Revocation via blocklist (Redis, short TTL matching token expiry). Monitor JWT error rate (expired tokens, invalid signatures, malformed tokens).

## 12. Real Company Deep Dives

- **Auth0**: JWT-based identity platform. Issues 10M+ JWTs daily. Supports RS256, ES256, and HS256. JWT validation rules configurable per tenant. Auth0 Marketplace with thousands of integrations.
- **Google**: OIDC ID tokens are JWTs (RS256). Google's public keys are available at \`https://www.googleapis.com/oauth2/v3/certs\`. Every Google Sign-In user gets a JWT.
- **Amazon**: AWS Cognito issues JWTs for user pools. Cognito-hosted UI supports OAuth 2.0 + OIDC. AWS APIs validate JWTs with region-specific public keys.
- **Microsoft**: Azure AD issues JWTs (RS256) for OIDC authentication. The \`tid\` claim (tenant ID) is used for multi-tenant validation. Microsoft identifies the correct signing key via the \`kid\` header.

## 13. Interview Playbook

**Q1: "What is a JWT and how is it structured?"**
- Model answer: JWT = JSON Web Token, a compact URL-safe token format. Three parts: header (algorithm + type), payload (claims), signature (cryptographic verification). Each part is Base64-encoded, separated by dots. Example: \`xxxxx.yyyyy.zzzzz\`.

**Q2: "Session tokens vs JWT — which is better?"**
- Model answer: JWT is stateless — no server-side storage, faster verification (local signature check vs DB lookup). Session tokens support instant revocation, are smaller, and simpler. Use JWT when you need stateless auth across multiple services (microservices). Use session tokens for simple single-service apps where immediate revocation matters.

**Q3: "How do you handle JWT revocation?"**
- Model answer: (1) Short expiry (15 min) — tokens self-revoke. (2) Token blocklist (Redis with TTL matching token expiry) for immediate revocation. (3) Refresh token rotation — old refresh tokens invalidated on use. (4) Change signing key (requires all users to re-authenticate).

**Q4: "What are common JWT security vulnerabilities?"**
- Model answer: (1) \`alg: none\` — attacker forges unsigned JWT. (2) Key confusion — attacker tricks library into using public key as HMAC secret. (3) Weak secret in HS256 — brute-forced. (4) No expiry — stolen token works forever. (5) Sensitive data in payload (only base64, not encrypted). (6) Improper audience validation — token meant for service A used on service B.

## 14. Concept Check Quiz

**Q1: How many parts does a JWT have, separated by dots?**
- A) 2
- B) 3
- C) 4
- D) 5
- **Answer: B** — Header, Payload, Signature (header.payload.signature).

**Q2: Which signing algorithm should ALWAYS be rejected by JWT validation?**
- A) HS256
- B) RS256
- C) none
- D) ES256
- **Answer: C** — \`alg: none\` means no signature, allowing anyone to forge arbitrary JWTs. Always reject unsigned tokens.

**Q3: What is the advantage of RS256 over HS256?**
- A) Faster verification
- B) Asymmetric — private key signs, public keys verify
- C) Smaller token size
- D) No key management needed
- **Answer: B** — RS256 uses asymmetric cryptography. The signing (private) key is kept secret on the issuer. Verification (public) keys can be distributed to any service. HS256 requires all verifiers to know the shared secret.

**Q4: What claim indicates when a JWT expires?**
- A) \`iat\`
- B) \`jti\`
- C) \`exp\`
- D) \`nbf\`
- **Answer: C** — \`exp\` (expiration time) is a registered claim. The JWT must not be accepted for processing after this time.

## 15. Next Steps

Continue to **Session-Based Auth vs Token-Based Auth** (lesson-02-09) to compare the two dominant authentication strategies and understand when each is appropriate.`,
    estimatedMin: 12,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Auth0", "Google", "Amazon", "Microsoft"],
    tags: ["JWT", "tokens", "authentication", "RS256", "stateless"],
  },
  {
    id: "lesson-02-09",
    slug: "apis-protocols-authentication-09-session-vs-token-auth",
    title: "Session-Based Auth vs Token-Based Auth",
    content: `## 0. Mental Model

> **Session-based auth** is like a **hotel**: you check in (login), the front desk writes your room number in a ledger (server-side session), and gives you a physical key (session cookie). Every time you come back, you show the key, and the desk checks the ledger. If the ledger is lost (server restart), your key is useless. **Token-based auth** is like a **concert wristband**: once you show your ID at the entrance, you get a wristband (JWT) that security guards can read and verify without checking any central registry.

## 1. Quick Summary

**Session-based auth**: Server stores session data (typically in Redis/DB), client holds a session ID cookie. Verifying requires server-side lookup. **Token-based auth**: Client holds a self-contained token (JWT) with claims and signature. Any service verifies locally without server-side state. Sessions are simpler to revoke; tokens scale better across microservices.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Session** | Server-stored state associated with a session ID |
| **Session ID** | Random token (opaque) identifying a session |
| **Cookie** | HTTP header for storing session ID on client |
| **HttpOnly Cookie** | Cookie not accessible via JavaScript (XSS protection) |
| **Secure Cookie** | Cookie only sent over HTTPS |
| **SameSite Cookie** | Restricts cookie to same-site requests (CSRF protection) |
| **Access Token** | Short-lived credential for API authorization |
| **Refresh Token** | Long-lived credential to obtain new access tokens |
| **Stateless Auth** | No server-side session state; client has everything needed |
| **Token Revocation** | Invalidating a token (hard for stateless JWTs) |

## 3. Problem Without It

- **No persistent login**: User refreshes page → logged out. Every page load requires re-authentication.
- **No cross-service auth**: User logs into service A, then accesses service B → must log in again. Session sharing requires shared session store.
- **Vertical scaling wall**: With session-based auth, sessions stored on one server → user must stick to same server (sticky sessions). Token-based auth enables horizontal scaling — any server validates any request.
- **Mobile app challenges**: Cookies don't work the same way on mobile. Token-based auth works across all platforms (HTTP headers).
- **Revocation complexity**: Session: delete from Redis, done. JWT: can't modify the token; need blocklist or short expiry.

## 4. How It Works — Core Mechanics

**Session-Based Auth Flow:**
\`\`\`
Client                    Server                    Redis
  |  POST /login           |                         |
  |  { email, password }   |                         |
  |----------------------->|                         |
  |                        | Verify credentials      |
  |                        | Create session:          |
  |                        |   sessionId: "sess_abc"  |
  |                        |   userId: 42             |
  |                        |   role: "admin"          |
  |                        |   expires: +24h          |
  |                        | Store session ---------->|
  |  Set-Cookie:           |                         |
  |  sessionId=sess_abc    |                         |
  |<-----------------------|                         |
  |                        |                         |
  |  GET /api/orders       |                         |
  |  Cookie: sessionId=..  |                         |
  |----------------------->|                         |
  |                        | Lookup session -------->|
  |                        |<------ session data ----|
  |                        | Check role == "admin"   |
  |<-- 200 OK, orders ----|                         |
\`\`\`

**Token-Based Auth Flow (JWT):**
\`\`\`
Client                    Server
  |  POST /login           |
  |  { email, password }   |
  |----------------------->|
  |                        | Verify credentials
  |                        | Sign JWT:
  |                        |   { sub: 42, role: "admin",
  |                        |     exp: now + 15min }
  |  { access_token: "eyJ...", refresh_token: "eyJ..." }
  |<-----------------------|
  |                        |
  |  GET /api/orders       |
  |  Authorization: Bearer eyJ...
  |----------------------->|
  |                        | Verify JWT signature
  |                        | Extract claims (userId=42, role="admin")
  |                        | No DB/Redis lookup needed
  |<-- 200 OK, orders ----|
\`\`\`

## 5. Variants & Flavors

| Feature | Session (Server-Side) | JWT (Stateless Token) | Opaque Token |
|---------|----------------------|----------------------|--------------|
| Server state | Yes (Redis/DB) | No | No (introspection endpoint) |
| Revocation | Instant (delete session) | Via blocklist or short expiry | Via blocklist or introspection |
| Verification cost | DB read (1-3ms) | Local crypto (0.2ms) | API call to auth server (5-20ms) |
| Size on wire | ~32 bytes (session ID) | ~1-4KB (JWT) | ~32 bytes (opaque token) |
| Cross-service | Needs shared session store | Works with shared public key | Needs auth server for verification |
| CSRF protection | Required (cookie-based) | Not needed (header-based) | Not needed |
| Complexity | Medium | Medium | Low (delegated to auth server) |
| Use case | Monolith, simple apps | Microservices, APIs | High-security, instant revocation |

## 6. Performance Characteristics

| Metric | Session (Redis) | JWT (Local) | Opaque Token (Introspect) |
|--------|----------------|-------------|--------------------------|
| Auth verification latency | ~2ms (Redis get) | ~0.3ms (signature verify) | ~10ms (auth server call) |
| Auth verification cost | $0.20/1M req (Redis) | $0.00 (CPU) | $0.50/1M req (auth server) |
| Scalability | Redis cluster capacity | Unlimited (CPU bound) | Auth server capacity |
| Token size overhead | ~50 bytes (cookie) | ~2KB (header) | ~50 bytes (header) |
| Revocation latency | <1ms (Redis delete) | Until token expiry (15min) | <5ms (blocklist check) |

## 7. Failure Modes

- **Sticky session lock-in**: Load balancer must route to same server (or use shared Redis). Without sticky sessions, user bounces between servers → not logged in. *Fix*: use centralized Redis/DB for sessions.
- **Session fixation**: Attacker gives victim a known session ID, victim logs in → attacker shares the session. *Fix*: regenerate session ID on login.
- **JWT too large**: Including many claims → 10KB+ JWT → every request is slower. *Fix*: minimal claims, use opaque token with introspect for large claims.
- **Token in URL**: Access token passed in URL → logged, cached, leaked via referrer. *Fix*: always use Authorization header (never URL).
- **No CSRF protection for cookies**: Session cookies vulnerable to cross-site request forgery. *Fix*: SameSite cookies, CSRF tokens, \`Double Submit Cookie\` pattern.

## 8. Decision Framework

\`\`\`
Choosing session vs token auth:
├── Monolithic app (single server)?
│   └── Session-based (simpler, easier revocation)
├── Microservices (multiple services)?
│   └── JWT (stateless, any service validates)
├── Mobile app (no cookies)?
│   └── Token-based (Bearer token in Authorization header)
├── Public API (third-party clients)?
│   └── Token-based (OAuth 2.0 access tokens)
├── Need instant revocation?
│   └── Session-based or opaque tokens with introspection
├── High-traffic API (100K+ req/s)?
│   └── JWT (no DB lookup per request)
├── GraphQL (single endpoint)?
│   └── Token-based (session lookup adds latency to every resolver)
└── Server-rendered HTML (Django, Rails)?
    └── Session-based (cookie works naturally with forms)
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should compare two architectures side by side. Left (Session): Client → Load Balancer (sticky session) → App Server 1 → Redis. If user is routed to App Server 2, session check fails without sticky sessions. Redis acts as shared session store. Right (Token): Client → Load Balancer (any server) → App Server 1 or 2 → validates JWT locally. No sticky sessions needed, no shared state. Below: token lifecycle showing short-lived access token (15min) and long-lived refresh token (7 days) with rotation.*

## 10. Real Production Incident

**Stack Overflow's DDoS from Redis Session Store (2017)** — Stack Overflow uses session-based auth with Redis as the session store. During a traffic spike from Reddit, the number of unauthenticated visitors (each creating a new session) overwhelmed Redis. **Impact**: Redis CPU hit 100%, session read/write latency went from 1ms to 500ms, page load times increased 10x. Authenticated users were affected because their session lookups queued behind the anonymous session writes. **Fix**: Stack Overflow moved anonymous visitors to a cookie-only session (no server-side storage), keeping Redis sessions only for authenticated users. **Lesson**: **Session-based auth shifts access control latency to the session store — offloading anonymous sessions to client-side storage (cookies) reduces server-side session store load dramatically**.

## 11. Production Implementation

**Naive**: In-memory session store (single server). User data in session. No CSRF protection. No HTTPS.

**Better**: Redis-backed sessions with TLS. HttpOnly + Secure + SameSite cookies. Session regeneration on login. Session expiry with sliding window. For token-based: JWT with RS256, short expiry, refresh tokens.

**Production**: Session-based for HTML apps: Redis cluster (persistent, replicated). Session data minimal (userId + role + expiry). Anti-CSRF tokens for state-changing requests. Token-based for APIs: short-lived access tokens (15min), rotating refresh tokens (7 days). Certificate-bound tokens (DPoP) for high-security APIs. Session/token monitoring: active sessions per user, token usage anomalies, revocation events. Graceful session migration during deployments. Rate limiting on auth endpoints. MFA step-up for sensitive operations.

## 12. Real Company Deep Dives

- **Stripe**: Token-based auth with API keys (opaque tokens). Keys are long-lived but can be revoked immediately. Dashboard session uses cookies with session store. Stripe's API uses secret keys (server-side) and publishable keys (client-side).
- **GitHub**: Both session (web UI) and token (API). Personal access tokens (fine-grained, repo-scoped). OAuth tokens for third-party apps. GitHub's session store is Redis-backed.
- **Stack Overflow**: Session-based auth with Redis. Anonymous users use cookie-only sessions. Authenticated sessions in Redis with sliding expiry (14 days). CSRF tokens on all POST requests.
- **Shopify**: Session-based for admin dashboard (cookie + Redis). Token-based for Storefront API (public access, OAuth 2.0). Both patterns coexist in the same platform.

## 13. Interview Playbook

**Q1: "Session-based vs token-based auth — which is better?"**
- Model answer: Neither is universally better. Sessions are simpler for monoliths, support instant revocation, and are the standard for server-rendered HTML. Tokens (JWT) scale better across microservices, work natively on mobile, and enable stateless verification. Hybrid approaches exist — sessions for web UI, tokens for API.

**Q2: "How would you implement authentication for a microservice architecture?"**
- Model answer: Centralized auth service issues JWT access tokens (RS256 signed). All other services validate JWT locally using the auth service's public key. Short-lived tokens (15min) + rotating refresh tokens. OAuth 2.0 + OIDC for third-party apps. API gateway handles token validation for external requests.

**Q3: "How do you handle token revocation?"**
- Model answer: (1) Short expiry — tokens self-destruct. (2) Token blocklist (Redis with TTL matching token expiry) — check before accepting. (3) Refresh token rotation — old refresh token invalidated on use. (4) Change signing key — invalidate all tokens (last resort). For stateless JWTs, revocation always requires a tradeoff between complexity and immediacy.

**Q4: "What is CSRF and how do you prevent it with session auth?"**
- Model answer: CSRF (Cross-Site Request Forgery) — attacker tricks user's browser into making a state-changing request to your site while authenticated. Prevention: (1) SameSite cookies (Strict or Lax), (2) CSRF tokens in forms, (3) Custom request headers, (4) Double Submit Cookie pattern. Token-based auth is naturally CSRF-resistant because tokens are sent in Authorization header (not automatically by the browser).

## 14. Concept Check Quiz

**Q1: What is the main advantage of token-based auth over session-based auth?**
- A) Simpler server code
- B) Stateless — no server-side session storage needed
- C) Instant revocation
- D) Works without HTTPS
- **Answer: B** — Token-based auth (JWT) is stateless — the token contains all information needed. No server-side session store (Redis/DB) required.

**Q2: Which pattern supports instant revocation?**
- A) JWT with short expiry
- B) Session cookie with server-side store
- C) JWT with blocklist
- D) Both B and C
- **Answer: D** — Server-side sessions can be deleted instantly. JWT blocklists (Redis) also enable near-instant revocation. Plain JWT without blocklist can't be revoked.

**Q3: Why are session cookies vulnerable to CSRF?**
- A) CSRF is not a cookie issue
- B) Browsers automatically include cookies with cross-origin requests
- C) Cookies are encrypted
- D) Cookies expire too quickly
- **Answer: B** — Browsers automatically attach cookies to requests for the target domain, even from different origins. SameSite cookies mitigate this. Token-based auth avoids CSRF because tokens are sent manually in headers.

**Q4: What is a refresh token used for?**
- A) To change the user's password
- B) To obtain a new access token without re-authentication
- C) To revoke all sessions
- D) To verify the user's email
- **Answer: B** — Refresh tokens are long-lived credentials that can be exchanged for short-lived access tokens. They enable persistent login sessions without storing long-lived access tokens.

## 15. Next Steps

Continue to **API Rate Limiting & Throttling** (lesson-02-10) to learn how to protect APIs from abuse and ensure fair resource allocation.`,
    estimatedMin: 12,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Stripe", "GitHub", "Stack Overflow", "Shopify"],
    tags: ["session-auth", "token-auth", "JWT", "cookies", "stateful-vs-stateless"],
  },

  {
    id: "lesson-02-10",
    slug: "apis-protocols-authentication-10-api-rate-limiting-throttling",
    title: "API Rate Limiting & Throttling",
    content: `## 0. Mental Model

> Rate limiting is like a **nightclub bouncer**. The club has a maximum capacity (system limit), but also rules: regular guests get 1 drink every 10 minutes (per-user limit), VIPs get 5 drinks every 10 minutes (higher tier). If someone tries to order too fast, the bouncer waits at the door (queue) or turns them away (429 Too Many Requests). Some guests are permanently banned (blocklisted). The bouncer keeps a clicker counter (token bucket algorithm) for each guest.

## 1. Quick Summary

**Rate limiting** controls how many requests a client can make within a time window. Prevents abuse, ensures fair resource allocation, and protects backend services from overload. Common algorithms: token bucket, leaky bucket, fixed window, sliding window, and sliding log. Implemented at API gateway (global), application middleware (per-endpoint), or infrastructure (network-level).

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Rate Limit** | Maximum requests allowed in a time window |
| **Throttling** | Actively slowing down requests when limit is exceeded |
| **Quota** | Total requests allowed over a longer period (daily/monthly) |
| **Burst** | Temporary traffic spike exceeding steady-state limit |
| **Token Bucket** | Algorithm: tokens refill at steady rate, burst up to bucket size |
| **Leaky Bucket** | Algorithm: queue processes requests at fixed rate |
| **Fixed Window** | Counter resets at fixed intervals (e.g., top of the minute) |
| **Sliding Window** | Counter based on rolling time window (more accurate) |
| **Sliding Log** | Log of all request timestamps within window (most accurate) |
| **429 Too Many Requests** | HTTP status code for rate-limited requests |
| **Retry-After** | Header indicating when client can retry |

## 3. Problem Without It

- **Abuse**: A single client sends 10,000 requests/second → backend overwhelmed → all users experience downtime.
- **No fair sharing**: One noisy tenant consumes 90% of capacity → other tenants' requests are dropped or delayed.
- **Uncontrolled bursts**: A viral tweet sends 100x normal traffic → database connection pool exhausted → cascading failure.
- **No cost attribution**: Without rate limits, you pay for infrastructure scaled to worst-case abuse, not normal usage.
- **Brute force attacks**: Login endpoint with no rate limit → attacker tries 1M passwords in 10 minutes.

## 4. How It Works — Core Mechanics

**Token Bucket Algorithm:**
\`\`\`
Bucket capacity: 10 tokens
Refill rate: 1 token per second

Request at t=0s:  tokens=10 → consume 1 → tokens=9 ✓
Request at t=1s:  tokens=9  → refill=10 → consume 1 → tokens=9 ✓
Request at t=5s:  tokens=9  → refill=10 → consume 1 → tokens=9 ✓
... (steady state: 1 request/second sustained, burst up to 10)

Burst at t=10s:   tokens=9 → 10 rapid requests → tokens=-1 ✗ (429)
\`\`\`

**Fixed Window Counter:**
\`\`\`
Window: 1 minute, Limit: 100 requests

Requests at 10:05:00 - 10:05:59: 95 requests
  10:05:30: still under limit → ✓
Requests at 10:05:00 - 10:05:59: 101 requests
  10:05:45: exceeded limit → 429

Problem: 100 requests at 10:05:58 + 100 requests at 10:06:02
  = 200 in 4 seconds (window boundary issue)
\`\`\`

**Sliding Window Log:**
\`\`\`
Log: [(10:05:01), (10:05:15), (10:05:30), (10:05:45)]
New request at 10:06:00:
  Remove timestamps before 10:05:00 (outside 60s window)
  Count remaining: 4 < limit=100 → ✓
  Add (10:06:00) to log
  
Most accurate, but O(n) memory per client (store all timestamps).
\`\`\`

**Redis-based Fixed Window with Lua:**
\`\`\`lua
-- Key: rate_limit:{client_id}:{endpoint}:{window}
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, ttl)
end
if current > limit then
    return 0  -- rate limited
end
return 1  -- allowed
\`\`\`

## 5. Variants & Flavors

| Algorithm | Memory | Accuracy | Burst Handling | Implementation |
|-----------|--------|----------|---------------|----------------|
| **Fixed Window** | O(1) per key | Low (boundary issue) | Allows bursts up to limit | Simplest, most common |
| **Token Bucket** | O(1) per key | Medium | Allows controlled bursts | API Gateway standard |
| **Leaky Bucket** | O(queue) | Medium | Smooths traffic | Queue-based systems |
| **Sliding Window** | O(1) per key | High (no boundary issue) | Allows bursts up to limit | Redis sorted sets |
| **Sliding Log** | O(n) per key | Highest | Per-request accuracy | When precision > cost |
| **GCRA** | O(1) | High | Controlled bursts | Rate limiting in Varnish |

## 6. Performance Characteristics

| Metric | Fixed Window (Redis) | Token Bucket (Redis) | Sliding Window (Local, in-memory) |
|--------|---------------------|---------------------|-----------------------------------|
| Latency added per request | ~1ms (Redis round trip) | ~1ms | ~0.01ms (local) |
| Memory per client | 1 key | 1 key | Fixed (counter) |
| Redis ops per request | 1 (INCR + EXPIRE) | 2 (GET + SET) | 0 (local) |
| Accuracy at boundaries | Low | Good | Good |
| Distributed consistency | High (Redis) | High | Low (per-instance, needs sync) |
| Burst handling | First N in window | Bucket capacity | Window-based |

## 7. Failure Modes

- **Redis failure**: Rate limiter relies on Redis → Redis down → either allow all (fail open) or block all (fail closed). *Fix*: local fallback cache, Redis cluster with automatic failover.
- **Clock skew**: Distributed rate limiters on different servers see different times → inconsistent enforcement. *Fix*: use centralized time source (Redis), or sliding window with ordered timestamps.
- **Race condition**: Two requests check counter simultaneously, both see 99 < 100, both increment → 101 requests pass. *Fix*: atomic operations (Redis INCR, Lua scripts).
- **Thundering herd on reset**: All clients wait for window reset and retry simultaneously → spike. *Fix*: request jitter, gradual window reset.
- **Too many keys**: Rate limiting per-user per-endpoint per-minute → 1M users × 10 endpoints × 1440 minutes = 14.4B keys. *Fix*: aggregate rate limits, use probabilistic data structures (Count-Min Sketch).

## 8. Decision Framework

\`\`\`
Designing rate limits:
├── Public API (third-party clients)?
│   ├── Per-user: 100 req/min (free tier), 10K req/min (paid)
│   ├── Per-endpoint: login (5/min), search (10/min), data (100/min)
│   └── Global: 100K req/min total
├── Internal microservices?
│   ├── Per-service client: 10K req/min
│   ├── Per-endpoint: based on capacity
│   └── Circuit breaker for cascading failures
├── Login endpoint (anti-brute-force)?
│   ├── Per-IP: 5 req/min (anonymous)
│   ├── Per-account: 5 req/min (authenticated)
│   └── Exponential lockout after N failures: 1min → 5min → 30min
├── Data-heavy endpoints (search, export)?
│   └── Concurrent request limit (max 3 concurrent, queue the rest)
├── Webhook delivery?
│   ├── Max 10 webhooks/sec per target
│   └── Retry with backoff, not rate limit
└── Free tier vs Paid tier?
    ├── Free: 100 req/min, no burst
    └── Paid: 10K req/min, burst of 500
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show rate limiting at two layers. Layer 1 (Global): API Gateway with a "Rate Limiter" plugin checking Redis counters for each client. Requests over limit get 429 response with Retry-After header. Layer 2 (Application): Each microservice has its own rate limiter (local token bucket) for granular control. The diagram shows the four algorithms as callouts: Fixed Window (counter resets each minute, arrow at 10:05:00 → 10:06:00), Token Bucket (bucket with tokens draining and refilling), Leaky Bucket (queue with fixed outflow), Sliding Window (timeline with rolling 60s window).*

## 10. Real Production Incident

**Twitter API Rate Limiting Failure (2023)** — Twitter (now X) changed its API rate limits in July 2023, reducing unauthenticated tweet viewing from 600 to 300 per day and verified from 6000 to 600. **Impact**: Thousands of third-party apps broke, users couldn't load tweets, screenshots of error messages went viral. **Root cause**: The drastic limit reduction was intended to prevent data scraping for AI training, but the implementation used a single global counter — when the limit was hit, ALL users (not just scrapers) were blocked. **Fix**: Twitter implemented per-IP and per-user rate limiting separately, added CAPTCHA challenges, and restored viewing limits gradually. **Lesson**: **Rate limiting must distinguish between abusive and legitimate traffic — global rate limits that affect all users punish everyone for one abuser's behavior. Use per-client quotas, anomaly detection, and challenge-based throttling instead**.

## 11. Production Implementation

**Naive**: In-memory fixed window counter per IP. Resets every minute. No Redis, no carryover. Loses all data on restart.

**Better**: Redis-based sliding window (sorted sets). Per-user and per-endpoint limits. HTTP 429 response with proper headers (\`Retry-After\`, \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`).

**Production**: Multi-layer rate limiting: (1) Infrastructure — network-level (Cloudflare, AWS WAF) blocks DDoS-level traffic. (2) API Gateway — per-client, per-endpoint, global (Redis-backed sliding window). (3) Application — per-user, per-action (local token bucket or Redis). Tired limits (free/paid/enterprise). Circuit breaker pattern — when error rate exceeds threshold, stop sending requests. Rate limit headers on EVERY response. Rate limit configuration via API (dynamic, no deploy). Monitoring: rate limit hit rate, top blocked clients, false positive rate. Proactive rate limit increase notifications for power users.

## 12. Real Company Deep Dives

- **GitHub**: Rate limiting per authenticated user (5,000 req/hour for API). Unauthenticated: 60 req/hour. GraphQL: cost-based (points per field, 500 points max per query). Retry-After headers on 429 responses. GitHub's rate limits are tiered by plan.
- **Twitter/X**: Tiered rate limits based on endpoint and authentication. Search: 450 req/15min. Timeline: 300 req/3h. Streaming: 1 connection per account. Per-endpoint documentation with current limits.
- **Stripe**: Rate limiting per API key. Default: 100 read ops/s, 100 write ops/s. Higher limits available on request. Stripe sends \`X-Request-Id\` and rate limit headers on every response. If you exceed limits, Stripe returns 429 with \`Retry-After\`.
- **Google**: Google Cloud APIs use quota-based rate limiting. Per-project, per-user, per-region quotas. Quota can be increased via support request. Google's rate limiting is integrated with their billing system.
- **Cloudflare**: Rate limiting at edge (global network). Three tiers: (1) DDoS — L3/4 mitigation, (2) Rate Limiting — per-IP, per-path, (3) Advanced Rate Limiting — per-session, per-country, custom criteria.

## 13. Interview Playbook

**Q1: "What rate limiting algorithms do you know?"**
- Model answer: (1) Fixed Window — simple counter, resets at window boundary (boundary spike problem). (2) Token Bucket — tokens refill at steady rate, allows bursts up to bucket size. (3) Leaky Bucket — queue with fixed drain rate, smooths traffic. (4) Sliding Window — rolling time window, more accurate. (5) Sliding Log — stores all timestamps, most accurate but memory-heavy.

**Q2: "How would you design a rate limiter for a distributed system?"**
- Model answer: Centralized Redis with Lua scripts for atomic operations. Use sliding window (sorted sets) for accuracy. Fallback to local in-memory rate limiter if Redis is unavailable. Use token bucket for burst control. Multi-layer: infrastructure (DDoS), gateway (per-client), application (per-user).

**Q3: "What HTTP headers should a rate-limited API return?"**
- Model answer: \`X-RateLimit-Limit\` (max requests allowed), \`X-RateLimit-Remaining\` (remaining in window), \`X-RateLimit-Reset\` (window reset Unix timestamp). On 429: \`Retry-After\` (seconds until client can retry). \`X-Request-Id\` for debugging.

**Q4: "How do you handle rate limiting for WebSockets?"**
- Model answer: WebSocket connections are persistent, not request-based. Approaches: (1) Message-based — count messages per time window. (2) Connection-based — limit total connections per client. (3) Bandwidth-based — limit bytes transferred. Use token bucket with per-connection counters. Send rate limit warning as WebSocket message before disconnecting.

## 14. Concept Check Quiz

**Q1: What HTTP status code indicates a request was rate limited?**
- A) 400 Bad Request
- B) 403 Forbidden
- C) 429 Too Many Requests
- D) 503 Service Unavailable
- **Answer: C** — 429 Too Many Requests is the standard status code for rate-limited requests.

**Q2: Which rate limiting algorithm allows controlled bursts?**
- A) Fixed Window
- B) Token Bucket
- C) Sliding Log
- D) Leaky Bucket
- **Answer: B** — Token Bucket allows bursts up to the bucket capacity while maintaining a steady long-term rate.

**Q3: What problem does the fixed window algorithm have?**
- A) Too much memory usage
- B) A burst at window boundary can double the allowed traffic
- C) It doesn't support per-user limits
- D) It's too complex to implement
- **Answer: B** — Requests can spike at the boundary between windows, allowing 2x the limit in a short period (N requests at 10:05:59 and N more at 10:06:01).

**Q4: Why is Redis a common choice for distributed rate limiting?**
- A) It's the fastest database
- B) It provides atomic operations (INCR, Lua scripts) needed for race-free counting
- C) It supports SQL queries
- D) It automatically scales
- **Answer: B** — Redis provides atomic operations (INCR, Lua scripts) essential for correct distributed rate limiting without race conditions.

## 15. Next Steps

Continue to **API Versioning Strategies** (lesson-02-11) to learn how to evolve APIs without breaking existing clients.`,
    estimatedMin: 12,
    difficulty: "INTERMEDIATE" as const,
    companies: ["GitHub", "Twitter", "Stripe", "Google"],
    tags: ["rate-limiting", "throttling", "Redis", "API-security", "429"],
  },

  {
    id: "lesson-02-11",
    slug: "apis-protocols-authentication-11-api-versioning-strategies",
    title: "API Versioning Strategies",
    content: `## 0. Mental Model

> API versioning is like **renovating your house while tenants live in it**. You can't tear down the kitchen (v1 endpoint) if someone is cooking. Instead, you build a new kitchen (v2 endpoint) in the extension. Old tenants keep using the old kitchen until they move out. You might announce "Old kitchen closes in 6 months" (deprecation policy) and give new tenants the new kitchen.

## 1. Quick Summary

**API versioning** manages changes to an API without breaking existing clients. Strategies: URL versioning (\`/v1/users\`), header versioning (\`Accept: application/vnd.api+json;version=2\`), query parameter versioning (\`?version=2\`), and content negotiation. Best practices: maintain backward compatibility, deprecate gradually, give migration timelines, and remove only when usage drops to zero.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Versioning** | Strategy for managing API evolution |
| **Backward Compatible** | New version doesn't break existing clients |
| **Breaking Change** | Change that breaks existing client code |
| **Deprecation** | Announcing a version will be removed in the future |
| **Sunset** | Date when a deprecated version stops working |
| **URL Versioning** | Version in URL path (\`/v1/users\`, \`/v2/users\`) |
| **Header Versioning** | Version in HTTP headers (\`Accept\`, \`X-API-Version\`) |
| **Query Versioning** | Version as query parameter (\`?version=1\`) |
| **Content Negotiation** | Version based on media type (\`application/vnd.api+json;v=2\`) |
| **Semantic Versioning** | Major.Breaking.Minor (e.g., API v2.1.0 → major breaking change) |

## 3. Problem Without It

- **Breaking changes kill clients**: Rename a field (\`firstName\` → \`givenName\`) → every client breaks overnight. Mobile apps with 2-week review cycles can't update fast enough.
- **No evolution path**: API can't improve because old clients must keep working. Stagnant API dies.
- **One version for all**: New feature that changes response format affects all clients — even those that don't need the change.
- **No deprecation notice**: Clients discover API removal when their integration breaks in production at 3 AM.

## 4. How It Works — Core Mechanics

**URL Versioning (most common):**
\`\`\`
GET /v1/users/42  → { "name": "Alice", "email": "alice@example.com" }
GET /v2/users/42  → { "display_name": "Alice", "contact": {"email": "alice@example.com"} }
\`\`\`
Pros: Explicit, easy to route. Cons: URL pollution, clients hardcode version.

**Header Versioning (RESTful):**
\`\`\`
GET /users/42
  Accept: application/vnd.company.v1+json
  → { "name": "Alice", "email": "alice@example.com" }

GET /users/42
  Accept: application/vnd.company.v2+json
  → { "display_name": "Alice", "contact": {"email": "alice@example.com"} }
\`\`\`
Pros: Clean URLs, supports content negotiation. Cons: Harder to test (browsers), less discoverable.

**Query Parameter Versioning:**
\`\`\`
GET /users/42?version=1  → { "name": "Alice", "email": "alice@example.com" }
GET /users/42?version=2  → { "display_name": "Alice", "contact": {"email": "alice@example.com"} }
\`\`\`
Pros: Simple. Cons: Parameter can be cached, conflicts with other query params.

**Breaking vs Non-Breaking Changes:**

| Change Type | Example | Breaking? |
|-------------|---------|-----------|
| Adding a field | New field \`phone\` in response | No (clients ignore unknown fields) |
| Adding an endpoint | \`POST /v1/export\` | No |
| Changing field name | \`name\` → \`fullName\` | Yes |
| Removing a field | Remove \`email\` from response | Yes |
| Changing field type | \`id\` from string to int | Yes |
| Changing enum values | \`status: "active"\` → \`"activated"\` | Yes |
| Removing endpoint | DELETE \`DELETE /v1/users\` | Yes |
| Changing error codes | 404 → 403 for same condition | Yes |

## 5. Variants & Flavors

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URL Path** | \`/v1/users\` | Explicit, easy to route | URL pollution, hard for clients to upgrade |
| **Accept Header** | \`Accept: app/vnd.v2+json\` | Clean URL, RESTful | Harder to test, discover |
| **Custom Header** | \`X-API-Version: 2\` | Simple | Non-standard, can be stripped by proxies |
| **Query Param** | \`?version=2\` | Simple, easy to debug | Cache conflicts, not RESTful |
| **Content Negotiation** | \`Content-Type: app/vnd.v2+json\` | True REST | Complex, POST-only |
| **No Versioning** | Always backward compatible | Simplest | Hard at scale |

## 6. Performance Characteristics

| Strategy | Routing Cost | Caching Impact | Client Migration Ease |
|----------|-------------|----------------|----------------------|
| URL Path | None (standard route) | Good (different URL = different cache key) | Medium |
| Accept Header | Negligible (header parse) | Complex (vary header) | Medium |
| Custom Header | Negligible | Complex (vary header) | Medium |
| No Versioning | None | Good | None needed (backward compat) |

## 7. Failure Modes

- **Too many versions**: Maintaining v1, v2, v3, v4 simultaneously → 4x code complexity, 4x testing, 4x bugs. *Fix*: maximum 2 supported versions (current + previous).
- **No migration deadline**: Clients stay on v1 forever → you can never remove it. *Fix*: deprecation timeline (v1 deprecated 12 months after v2 GA, removed 6 months later).
- **Caching conflicts with header versioning**: CDN caches v1 response for v2 client (same URL, different Accept header). *Fix*: \`Vary: Accept\` header on responses.
- **Breaking change in minor version**: "Minor" API release changes response — clients break. *Fix*: follow semantic versioning strictly.
- **No version in docs**: Client uses wrong version → confusing errors. *Fix*: document version in responses (\`X-API-Version\`) and error messages.

## 8. Decision Framework

\`\`\`
Versioning strategy decision:
├── Public API (many external clients)?
│   └── URL versioning (\`/v1/...\`) — most explicit, easy for clients
├── Internal API (same team, microservices)?
│   └── No versioning, always backward compatible
├── Mobile app (slow client updates)?
│   └── URL versioning with long deprecation period (6-12 months)
├── Fast-moving startup?
│   └── No versioning or header versioning — add fields, never remove
├── Enterprise (contract-based)?
│   └── Content negotiation (Accept header) — formal contract per version
└── GraphQL API?
    └── No versioning — add fields, deprecate old fields with @deprecated
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show a timeline from v1 to v3. At the top: versions in URL path (\`/v1/\`, \`/v2/\`, \`/v3/\`). Below, the API Gateway routing \`Accept: ...vnd.v1+json\` to the v1 code path and \`...vnd.v2+json\` to v2. A "Deprecation callout" shows: v1 → GA (Sept 2023) → v2 GA (Mar 2024) → v1 Deprecated notice (Sept 2024) → v1 Sunset (Mar 2025). A client with "Didn't migrate" shows error 410 Gone.*

## 10. Real Production Incident

**Twitter API v1 → v2 Migration (2020-2023)** — Twitter announced v2 API in 2020 with a promise to maintain v1.1 indefinitely. However, in 2023, they abruptly deprecated v1.1 (breaking thousands of apps) and introduced paid API tiers. **Impact**: Thousands of bots, research tools, and third-party apps stopped working. Public service accounts (weather alerts, transit updates) went dark. **Root cause**: No gradual deprecation plan — the sunset was sudden without migration timeline. **Lesson**: **Abrupt API deprecation destroys trust and breaks the ecosystem. A proper deprecation policy: (1) announce 12+ months before removal, (2) communicate via email + docs + status page, (3) provide migration guides and tools, (4) monitor remaining usage and offer extended support for critical clients**.

## 11. Production Implementation

**Naive**: Copy-paste entire controller for each version (\`/v1/users/\`, \`/v2/users/\`). Duplicated code, diverges over time.

**Better**: Shared business logic, versioned serializers (transform layer). One controller, multiple response formatters. URL versioning. Deprecation header in v1 responses (\`Sunset: Sat, 31 Dec 2025 23:59:59 GMT\`).

**Production**: Internal API: no versioning, always backward compatible (add fields, never remove). External API: URL versioning (max 2 supported versions). Deprecation via \`Sunset\` HTTP header and \`Deprecation\` header (RFC 8594). Version-specific request/response schemas (OpenAPI per version). Automated testing — run all existing client tests against new version. Deprecation dashboard showing active clients on old versions. Graceful migration — one version's data transforms automatically for the other version (internal mapping layer). Client notification system — email + dashboard banner when a client is on a deprecated version.

## 12. Real Company Deep Dives

- **Stripe**: URL versioning with dates (\`/v1/charges\`, 2020-08-27 version). Stripe supports 2+ year deprecation cycles. Version is controlled via \`Stripe-Version\` header (not URL). Each version's behavior is documented precisely. Stripe's API changelog is the gold standard.
- **Twilio**: URL versioning (\`/2010-04-01/Accounts/...\`). Twilio dates their versions (YYYY-MM-DD format). Long deprecation periods. Version-specific documentation and migration guides.
- **GitHub**: URL versioning (\`/api/v3\`). GitHub deprecated v1 and v2 gradually. API v3 has been backward compatible for 10+ years. GitHub deprecated v3's specific endpoints with \`Deprecation\` header warnings.
- **Google**: Google Cloud APIs use versioning in URL (\`/v1/projects/...\`). Google maintains backward compatibility within a major version. Breaking changes trigger a new major version. Deprecation policy: 12-month notice for breaking changes.
- **Shopify**: URL versioning (\`/admin/api/2024-01/...\`). Shopify releases quarterly API versions. Each version supported for 12 months from release. REST and GraphQL both versioned.

## 13. Interview Playbook

**Q1: "How do you version a REST API?"**
- Model answer: Four common strategies: (1) URL path (\`/v1/users\`), (2) Accept header (\`Accept: application/vnd.v2+json\`), (3) Custom header (\`X-API-Version: 2\`), (4) Query parameter (\`?version=2\`). URL path is most common for public APIs. Header versioning is more RESTful. Choose based on client needs.

**Q2: "What makes a change backward compatible?"**
- Model answer: Adding fields (clients ignore unknown), adding endpoints, relaxing input constraints, making error messages more specific. Breaking: removing/renaming fields, changing field types, removing endpoints, tightening input validation, changing error semantics.

**Q3: "How do you deprecate an API version?"**
- Model answer: (1) Announce deprecation with sunset date (12+ months notice). (2) Add \`Deprecation\` and \`Sunset\` HTTP headers to responses. (3) Notify affected clients via email/dashboard. (4) Provide migration guide and support. (5) Monitor remaining usage. (6) At sunset, return 410 Gone with link to new version.

**Q4: "Does GraphQL need versioning?"**
- Model answer: GraphQL doesn't need explicit versioning because clients specify exact fields. Adding new fields doesn't break existing queries. Deprecation is done via \`@deprecated\` directive. However, removing a type or changing resolver behavior (e.g., new auth requirement) is still a breaking change. GraphQL minimizes versioning needs but doesn't eliminate them entirely.

## 14. Concept Check Quiz

**Q1: Which change IS backward compatible?**
- A) Renaming \`firstName\` to \`givenName\`
- B) Adding an optional \`phone\` field to the response
- C) Changing \`id\` from integer to string
- D) Removing the \`email\` field
- **Answer: B** — Adding a new field is backward compatible. Clients that ignore unknown fields will work fine.

**Q2: What HTTP header indicates a deprecated version?**
- A) Warning
- B) Deprecation
- C) Retry-After
- D) X-Deprecated
- **Answer: B** — The \`Deprecation\` header (RFC 8594) indicates the response uses a deprecated API version.

**Q3: What is the recommended maximum number of supported API versions?**
- A) 1
- B) 2 (current + previous)
- C) 4
- D) Unlimited
- **Answer: B** — Maintain current version and one previous version. More than 2 creates maintenance burden and confusion.

**Q4: Why doesn't GraphQL typically need API versioning?**
- A) GraphQL doesn't support versioning
- B) Clients request exact fields, so new fields don't break old queries
- C) GraphQL automatically migrates clients
- D) GraphQL APIs never change
- **Answer: B** — Client-specified queries mean adding fields is backward compatible. Deprecated fields use \`@deprecated\` directive.

## 15. Next Steps

Continue to **Idempotency in APIs** (lesson-02-12) — the final lesson in this module — to understand how to safely retry API requests without duplicate side effects.`,
    estimatedMin: 10,
    difficulty: "BEGINNER" as const,
    companies: ["Stripe", "Twilio", "GitHub", "Google"],
    tags: ["API-versioning", "backward-compatibility", "deprecation", "OpenAPI"],
  },

  {
    id: "lesson-02-12",
    slug: "apis-protocols-authentication-12-idempotency-in-apis",
    title: "Idempotency in APIs",
    content: `## 0. Mental Model

> Idempotency is like a **vending machine with a "please wait" light**. You insert $2 and press "Coke." The machine dispenses a Coke but the network cuts out before showing "Success." You don't know if it worked. If you press "Coke" again without idempotency, you might get two Cokes for $4 (duplicate charge). With idempotency, you press the same button with a receipt number (idempotency key), and the machine says "You already got your Coke" without charging again.

## 1. Quick Summary

**Idempotency** ensures that applying an operation multiple times produces the same result as applying it once. In APIs, POST requests (which normally create resources) are made idempotent using **idempotency keys** — the client sends a unique key, and the server deduplicates requests with the same key. Essential for payment processing, order creation, and any operation where retries could cause duplicate side effects.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Idempotent** | Operation produces same result regardless of how many times it's applied |
| **Idempotency Key** | Unique client-generated identifier for dedup (\`Idempotency-Key\` header) |
| **Safe Method** | HTTP method that doesn't modify state (GET, HEAD, OPTIONS) |
| **Idempotent Method** | HTTP method that can be repeated safely (GET, PUT, DELETE, PATCH if-tags) |
| **Non-Idempotent Method** | POST — creates new resources, repeated execution creates duplicates |
| **Dedup** | Detecting and rejecting duplicate requests |
| **Stripe API** | Gold standard for idempotency implementation |
| **Retry** | Re-sending a failed request (needs idempotency for POST) |

## 3. Problem Without It

- **Duplicate payment**: User pressed "Pay Now" → network timeout → presses again → two charges. Without idempotency, the same payment is processed twice.
- **Duplicate order**: POST /orders called twice → two orders created instead of one. Customer gets double-shipped, double-billed.
- **No safe retry**: Any network error for a POST request is unrecoverable — you don't know if the server processed it or not. The only safe option is to ask the user to check manually.
- **Financial reconciliation nightmare**: Duplicate charges require manual refunds, customer support tickets, and reputational damage.

## 4. How It Works — Core Mechanics

**Idempotent POST with Idempotency Key:**
\`\`\`
Client                          Server
  | POST /payments               |
  | Idempotency-Key: unique-123  |
  | Amount: $100                 |
  |----------------------------->|
  |                               | Check: key "unique-123" exists?
  |                               | No → process payment, store key→result
  |<-- 201 Created { id: "ch_1" } |
  |                               |
  | (network timeout, client retries)
  |                               |
  | POST /payments               |
  | Idempotency-Key: unique-123  |
  | Amount: $100                 |
  |----------------------------->|
  |                               | Check: key "unique-123" exists?
  |                               | Yes → return stored result
  |<-- 200 OK { id: "ch_1" }     |
  |     (same response,          |
  |      no duplicate charge)    |
\`\`\`

**Server-Side Implementation (Redis):**
\`\`\`python
def create_payment(request):
    key = request.headers.get('Idempotency-Key')
    if not key:
        return 400, {"error": "Idempotency-Key header required"}

    # Check if we've seen this key before
    existing = redis.get(f"idempotency:{key}")
    if existing:
        return 200, json.loads(existing)  # Return original result

    # Process the payment
    result = payment_service.charge(request.amount)
    
    # Store result with key (TTL = 24h)
    redis.setex(f"idempotency:{key}", 86400, json.dumps(result))
    
    return 201, result
\`\`\`

**HTTP Method Idempotency:**

| Method | Idempotent? | Safe? | Notes |
|--------|-------------|-------|-------|
| GET | Yes | Yes | Always idempotent and safe |
| HEAD | Yes | Yes | Same as GET, no body |
| PUT | Yes | No | Same resource state after N calls |
| DELETE | Yes | No | First returns 200, subsequent 404 |
| POST | No | No | Creates new resource each time |
| PATCH | No | No | Not inherently idempotent (use If-Match or conditional) |

## 5. Variants & Flavors

| Approach | Mechanism | Best For |
|----------|-----------|----------|
| **Idempotency Key Header** | \`Idempotency-Key: <UUID>\` | POST/PATCH mutation endpoints |
| **Conditional Requests** | \`If-Match\` / \`If-None-Match\` with ETag | PUT updates (conflict detection) |
| **Optimistic Locking** | \`version\` field in resource | Database-level idempotency |
| **Database UNIQUE Constraint** | Dedup at DB level | Preventing duplicate records |
| **Client-Generated ID** | Client provides resource ID on POST | POST becomes "upsert" behavior |
| **Deduplication Token** | Token checked before processing | Message queues (Kafka, SQS) |

## 6. Performance Characteristics

| Metric | Idempotency Key (Redis) | Client-Generated ID (DB unique) | Conditional Request (ETag) |
|--------|------------------------|-------------------------------|---------------------------|
| Latency added | ~1ms (Redis check) | ~5ms (DB unique check) | Negligible (server-side check) |
| Storage | Idempotency key → result (TTL 24h) | ID in DB (persistent) | Resource ETag (already stored) |
| Key scope | Per-service (different keyspaces) | Global unique | Per-resource |
| Expiry | Required (key TTL) | Optional (key lives forever) | N/A (per-resource version) |
| Race condition handling | Atomic (Redis SETNX) | DB transaction | Optimistic (retry on conflict) |

## 7. Failure Modes

- **Idempotency key expiry too short**: Key expires (24h), client retries after expiry → duplicate processed. *Fix*: TTL longer than maximum expected retry interval (48h+), or keep keys permanently for financial operations.
- **Stale key result**: Key returns original result, but server state changed (e.g., refund processed). *Fix*: keys must map to operation, not result. Always re-execute idempotent semantics.
- **Key collision**: Two clients independently generate same idempotency key → second request incorrectly deduplicated. *Fix*: use UUID v4 with sufficient entropy (122 random bits). Collision risk is negligible at scale.
- **Idempotency across microservices**: Key checked in service A, but operation spans A→B→C. *Fix*: distributed idempotency (propagate key across services, dedup at each boundary).
- **No idempotency on read**: Client retries GET with same params → works fine (GET is idempotent). But a GET that triggers a side effect (rare anti-pattern) breaks idempotency.

## 8. Decision Framework

\`\`\`
When to implement idempotency:
├── Payment processing?
│   └── MANDATORY. Duplicate payment is a P0 incident.
├── Order creation?
│   └── REQUIRED. Duplicate orders cost money and trust.
├── Any POST/PATCH mutation?
│   ├── Internal API: optional (can use DB dedup instead)
│   └── External API: REQUIRED (network retries are inevitable)
├── PUT (already idempotent)?
│   └── Good to have (idempotency key prevents race conditions)
├── DELETE (already idempotent)?
│   └── Not needed (DELETE returns 200 first time, 404 subsequent)
├── Idempotency key scope?
│   └── Per-resource (different key per operation type + resource)
└── Key expiry?
    ├── Payments: 24-48h (longer than retry window)
    └── Orders: permanent (never expire, detect true duplicates)
\`\`\`

## 9. Live Architecture Diagram

*The \`<RoughDiagram>\` should show a sequence diagram with two identical POST requests. First request: Client → Server with \`Idempotency-Key: abc-123\`, Server checks Redis (miss), processes payment, stores key→result in Redis, returns 201. Second request (retry): Client → Server with same key, Server checks Redis (hit), returns stored 200 result (no duplicate). A "Without Idempotency" panel shows two identical POST requests creating TWO charges (400 Bad Duplicate).*

## 10. Real Production Incident

**Stripe's Duplicate Charge Bug (2015)** — Early Stripe API users occasionally saw duplicate charges when network retries happened at specific timing windows. **Root cause**: The idempotency check and charge processing were not atomic — a race condition existed between checking the key and processing the charge. Two concurrent requests with the same key could both pass the check and both process. **Impact**: Duplicate charges, customer support tickets, merchant trust erosion. **Fix**: Stripe moved to atomic idempotency using Redis \`SET NX\` (set if not exists) — only the first request to set the key proceeds. All subsequent requests return the stored result. Additionally, Stripe added database-level dedup using an idempotency key unique constraint. **Lesson**: **Idempotency requires atomic operations — without atomic check-and-set, race conditions create duplicates even with idempotency keys. Use Redis \`SET NX\`, database unique constraints, or distributed locks**.

## 11. Production Implementation

**Naive**: Check if idempotency key exists in DB, process request, store result. Two SQL statements, not atomic → race condition.

**Better**: Atomic check using Redis \`SET NX\` with TTL. Store the processing result. Return stored result on duplicate. Use UUID v4 for key generation on client side.

**Production**: Idempotency with atomic operations (Redis \`SET NX\`, DB unique constraint on idempotency key). Configurable key scope (per-user, per-endpoint, global). Maximum key TTL: 24h default, 7 days for financial operations. Idempotency key format: UUID v4 (128-bit random). Key prefix by resource type (\`payment:uuid\`, \`order:uuid\`). Stale key cleanup (background job removes expired keys). Idempotency key can be replayed (same key, same request = same response). Response caching by idempotency key (for GET-like POST requests). Monitor: idempotency hit rate, duplicate detection rate, key collision rate.

## 12. Real Company Deep Dives

- **Stripe**: The gold standard. Requires \`Idempotency-Key\` on every POST request. Keys expire after 24h but Stripe recommends generating new keys. Stripe's API returns the same response for the same key+request. Stripe's payment intents API uses idempotency extensively.
- **Square**: Similar idempotency approach to Stripe. \`Idempotency-Key\` header required for mutations. Square's API documentation emphasizes idempotency for payment processing.
- **PayPal**: Idempotency via \`PayPal-Request-Id\` header. If a request fails, resend with same ID. PayPal recommends UUIDs. Idempotency keys expire after 24 hours.
- **AWS**: Many AWS SDK APIs are idempotent by design (IdempotencyToken). CloudFormation, Lambda, and Step Functions use client-generated tokens for idempotent API calls.
- **GitHub**: GitHub's API uses idempotency for some POST endpoints (like creating deployments). They recommend generating UUIDs on the client side.

## 13. Interview Playbook

**Q1: "What is idempotency and why is it important in API design?"**
- Model answer: Idempotency means applying an operation multiple times produces the same result as once. Critical for POST requests where network retries could create duplicate resources (e.g., duplicate payment, duplicate order). Implemented via \`Idempotency-Key\` header — server stores the key and result, returns cached result for duplicate requests.

**Q2: "How would you implement idempotency for a payment API?"**
- Model answer: (1) Client generates UUID v4 as idempotency key. (2) Server checks if key exists (Redis SET NX). (3) First request: process payment, store key→result in Redis (TTL: 24h). (4) Duplicate requests: return stored result. (5) Add DB-level unique constraint on (idempotency_key, merchant_id) for safety.

**Q3: "What's the difference between idempotent and safe HTTP methods?"**
- Model answer: Safe methods don't change server state (GET, HEAD, OPTIONS). Idempotent methods produce same result regardless of repetition (GET, PUT, DELETE). All safe methods are idempotent, but not all idempotent methods are safe (PUT modifies state but is idempotent).

**Q4: "How do you handle idempotency across microservices?"**
- Model answer: (1) Propagate the idempotency key across service boundaries (HTTP header or message metadata). (2) Each service maintains its own idempotency store scoped to its operations. (3) Use distributed tracing to correlate operations across services. (4) For sagas/choreography, the idempotency key is the saga ID — each step checks its part of the key.

## 14. Concept Check Quiz

**Q1: Which HTTP method is NOT idempotent by default?**
- A) GET
- B) PUT
- C) DELETE
- D) POST
- **Answer: D** — POST is not idempotent. Multiple identical POST requests create multiple resources. GET, PUT, and DELETE are idempotent.

**Q2: What header is commonly used for idempotency keys?**
- A) X-Request-ID
- B) Idempotency-Key
- C) Retry-After
- D) Cache-Control
- **Answer: B** — \`Idempotency-Key\` (standardized by Stripe, widely adopted) contains a unique client-generated identifier for deduplication.

**Q3: What is the main risk of an idempotency key expiring too quickly?**
- A) Keys never expire
- B) A legitimate retry after expiry could create a duplicate
- C) Keys take too much memory
- D) Clients forget to send keys
- **Answer: B** — If the idempotency key TTL is shorter than the client's retry window, a retry after key expiry will be processed as a new request, creating a duplicate.

**Q4: Why is UUID v4 the recommended format for idempotency keys?**
- A) UUIDs are human-readable
- B) 122 random bits make collision negligible
- C) UUIDs are short
- D) UUIDs are automatically generated by browsers
- **Answer: B** — UUID v4 generates 122 random bits. The collision probability at 1 billion keys per second for 100 years is about 50%. In practice, collisions are so unlikely they can be ignored.

## 15. Next Steps

Congratulations on completing Module 02 — APIs, Protocols & Authentication! You've learned the full spectrum from REST design principles through GraphQL, gRPC, API Gateways, authentication, OAuth 2.0, JWT, session management, rate limiting, versioning, and idempotency. Continue to **Module 03: Databases** where you'll explore SQL vs NoSQL, ACID transactions, indexing, replication, sharding, and distributed database patterns.`,
    estimatedMin: 13,
    difficulty: "ADVANCED" as const,
    companies: ["Stripe", "Square", "PayPal", "AWS"],
    tags: ["idempotency", "retries", "distributed-systems", "payment", "POST"],
  },

];