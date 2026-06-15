export const module02Lessons = [
  {
    id: "lesson-02-01",
    slug: "apis-protocols-authentication-01-rest-api-design-principles",
    title: "REST API Design Principles",
    content: `## 1. Quick Summary

**REST (Representational State Transfer)** is an architectural style for designing networked applications. It uses **HTTP methods** (GET, POST, PUT, DELETE, PATCH) as verbs operating on **resources** identified by **URLs**. Resources are transferred between client and server in representations like JSON or XML. REST emphasizes **statelessness**, **uniform interface**, **cacheability**, and a **layered system**. Well-designed REST APIs are intuitive, scalable, and resilient.

## 2. Definition

REST is a set of **six constraints** defined by Roy Fielding in his 2000 doctoral dissertation:

1. **Client-Server** — Separation of concerns: UI is separate from data storage.
2. **Stateless** — Each request contains all information needed to process it. No client context stored on the server between requests.
3. **Cacheable** — Responses must explicitly indicate cacheability to improve performance.
4. **Uniform Interface** — Resources identified via URIs, manipulated through representations, self-descriptive messages, HATEOAS.
5. **Layered System** — Intermediaries (proxies, gateways, load balancers) can be inserted without client awareness.
6. **Code on Demand (optional)** — Servers can extend client functionality via executable scripts.

## 3. Why It Exists / Problem It Solves

Before REST, SOAP and XML-RPC dominated. These were complex, tightly coupled, and required significant tooling. REST emerged to provide a simpler, scalable alternative that leverages the existing HTTP protocol. It solved:
- **Tight coupling** between client and server implementations
- **Poor scalability** from stateful server designs
- **High complexity** of SOAP envelopes, WSDL, and WS-* standards
- **Limited visibility** into API behavior (no uniform interface)

## 4. When to Use It

- Building **public APIs** that third-party developers consume
- **Microservice-to-microservice** communication
- **Mobile backends** where bandwidth matters (REST is lightweight)
- **CRUD-dominated** applications where resources map naturally to endpoints
- **Caching-critical** systems where GET responses benefit from HTTP caching

## 5. When NOT to Use It / Tradeoffs

- **Real-time communication** (use WebSockets or SSE)
- **High-frequency bidirectional updates** (use gRPC streaming)
- **Complex nested queries with specific field requirements** (use GraphQL)
- **Performance-critical internal services** (gRPC has lower overhead with binary serialization)
- **Event-driven architectures** (consider message queues or event sourcing)

Tradeoffs: Over-fetching/under-fetching of data, multiple round-trips for related resources, no built-in subscription model, increasing payload sizes without field selection.

## 6. How It Works (Deep Mechanics)

Every REST interaction follows a request-response cycle over HTTP:

**Request Structure:**
- **HTTP Method**: GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE (remove)
- **URL**: /users/123 — identifies the resource
- **Headers**: Content-Type, Accept, Authorization, Cache-Control
- **Body** (for POST/PUT/PATCH): JSON or XML representation

**Response Structure:**
- **Status Code**: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 404 Not Found, 429 Rate Limited, 500 Internal Server Error
- **Headers**: Content-Type, Cache-Control, ETag, Location
- **Body**: Resource representation or error details

**Resource Naming Conventions:**
- Use **nouns** not verbs: /users not /getUsers
- **Plural** for collections: /users
- **Hierarchical** for relationships: /users/123/orders
- **Query parameters** for filtering: /users?status=active&page=2
- Use **kebab-case** or **snake_case** consistently

**Statelessness in Practice:** The server does not store session state. Each request carries authentication (JWT token in Authorization header), pagination info, and all parameters needed. This enables horizontal scaling — any server can handle any request.

## 7. Architecture Diagram

\`\`\`
CLIENT                           SERVER
+--------+                       +--------+
| Client  | -- GET /users/123 --> |  API   |
|  (App)  |    Authorization:     |  GW    |
|         |    Bearer <token>     |        |
+--------+                       +--------+
    |                                |
    | <-- 200 OK                  +--------+
    |     { "id": 123,            |  User  |
    |       "name": "Alice",       | Service|
    |       "email": "..." }       +--------+
    |                                |
+--------+                       +--------+
| Browser| -- POST /orders -->   | Order  |
|         |    { "product":      | Service|
|         |      "abc",          |        |
|         |      "qty": 2 }      +--------+
+--------+                       +--------+
    |                                |
    | <-- 201 Created            |  DB    |
    |     Location: /orders/456   |        |
    |     { "id": 456, ... }      +--------+
\`\`\`

## 8. Real-World Flow Example

**GitHub API — Fetching a user's repositories:**

1. Client sends: \`GET https://api.github.com/users/octocat/repos\`
2. GitHub API authenticates via \`Authorization: Bearer ghp_xxx\`
3. API Gateway validates token, applies rate limiting
4. User Service looks up user "octocat"
5. Repository Service queries DB for repos owned by user ID 42
6. Response returns 200 OK with an array of repo objects
7. Pagination via Link header: \`<https://api.github.com/user/repos?page=2>; rel="next"\`
8. Client follows Link header for next page if needed

## 9. Reference Implementation Example

\`\`\`typescript
import express from "express";

const app = express();
app.use(express.json());

interface User { id: string; name: string; email: string; createdAt: Date; }
const users: User[] = [];

app.get("/users", (req, res) => {
  const { page = "1", limit = "10" } = req.query;
  const start = (Number(page) - 1) * Number(limit);
  const result = users.slice(start, start + Number(limit));
  res.json({ data: result, page, limit });
});

app.post("/users", (req, res) => {
  const user: User = { id: crypto.randomUUID(), name: req.body.name, email: req.body.email, createdAt: new Date() };
  users.push(user);
  res.status(201).location(\`/users/\${user.id}\`).json(user);
});

app.get("/users/:id", (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});
\`\`\`

## 10. Real Company Use Cases

- **Stripe** — One of the most respected REST APIs. Consistent resource naming, idempotency keys, idempotent retries, clear error messages, extensive pagination.
- **GitHub API v3** — Industry-standard REST API with hypermedia links, pagination headers, conditional requests via ETags.
- **Twilio** — REST API for telephony. Every phone call and message is a resource. Stateless design allows massive scale.
- **Google Cloud APIs** — RESTful interfaces for cloud resources with consistent patterns, quota management, and authentication.

## 11. Common Interview Questions

1. "What are the six constraints of REST and why is each important?"
2. "Design a REST API for a ride-sharing service (drivers, riders, trips)."
3. "When would you use POST vs PUT vs PATCH?"
4. "How does statelessness improve scalability in REST?"
5. "What is HATEOAS and when would you use it?"
6. "How do you handle pagination in a REST API?"
7. "Design a versioning strategy for a public REST API."

## 12. Related Topics & Next Steps

- **OpenAPI / Swagger** — Standard for describing REST APIs
- **HATEOAS** — Hypermedia as the Engine of Application State
- **gRPC** — Alternative RPC framework for high-performance scenarios
- **GraphQL** — Alternative query language for flexible data fetching
- **API Gateways** — Managing, securing, and routing REST APIs at scale
- **HTTP/2 & HTTP/3** — Protocol improvements affecting REST performance`,
    estimatedMin: 12,
    difficulty: "BEGINNER" as const,
    companies: ["Stripe", "GitHub", "Twilio", "Google"],
    tags: ["REST", "API-design", "HTTP", "CRUD", "stateless"]
  },
  {
    id: "lesson-02-02",
    slug: "apis-protocols-authentication-02-graphql",
    title: "GraphQL",
    content: `## 1. Quick Summary

**GraphQL** is a query language and runtime for APIs developed by **Meta** (2012, open-sourced 2015). Clients specify exactly what data they need in a single request, eliminating **over-fetching** and **under-fetching**. A single GraphQL endpoint replaces multiple REST endpoints. The schema (typed, introspective) serves as a contract between client and server. Subscriptions enable real-time updates.

## 2. Definition

GraphQL is a **specification** with three core components:

1. **Query Language**  Clients write declarative queries selecting specific fields, filtering, paginating, and mutating data.
2. **Schema Definition Language (SDL)**  Defines types, queries, mutations, and subscriptions as a strongly-typed contract.
3. **Runtime**  Executes queries against a graph of data sources by invoking **resolvers**  functions that fetch each field's data.

## 3. Why It Exists / Problem It Solves

REST APIs suffer from:
- **Over-fetching**: /users/123 returns all fields even if only the name is needed
- **Under-fetching**: /users/123/orders requires multiple round-trips
- **N+1 problem**: Getting users and their orders needs N+1 requests
- **Tight versioning**: Evolving REST APIs requires version bumps

GraphQL solves these by allowing clients to request exactly the fields they need in a single query, and by decoupling client and server evolution through the schema contract.

## 4. When to Use It

- **Complex UIs** with nested data requirements (dashboards, social feeds)
- **Mobile apps** where bandwidth is limited and payload size matters
- **Multiple client types** (web, iOS, Android) with different data needs
- **Rapid product iteration** where backend changes should not break clients
- **Federated architectures** (Apollo Federation, schema stitching across microservices)

## 5. When NOT to Use It / Tradeoffs

- **Simple CRUD apps**  REST is simpler and sufficient
- **High-performance internal services**  gRPC outperforms GraphQL
- **File uploads**  GraphQL has no native file handling (use REST endpoints alongside)
- **Caching**  HTTP caching (ETags, Cache-Control) does not apply naturally to POST-based queries
- **Complex queries with high depth**  Malicious nested queries can cause DDoS (require query complexity analysis)

Tradeoffs: Increased server complexity, query cost analysis needed, N+1 problem requires DataLoader batching, learning curve for teams.

## 6. How It Works (Deep Mechanics)

**Schema Definition:**
\`\`\`graphql
type User {
  id: ID!
  name: String!
  email: String!
  orders: [Order!]!
}

type Query {
  user(id: ID!): User
  users(page: Int, limit: Int): [User!]!
}

type Mutation {
  createUser(name: String!, email: String!): User!
}
\`\`\`

**Query Execution Flow:**
1. Client sends POST to \`/graphql\` with query string
2. Server **parses** query into AST (Abstract Syntax Tree)
3. Server **validates** query against schema (type checking)
4. Server **executes** by traversing AST, calling resolvers for each field
5. Resolvers fetch data from databases, REST APIs, or other services
6. Results collected into response matching query shape

**Resolver Pattern:**
\`\`\`typescript
const resolvers = {
  Query: { user: (_, { id }, { dataSources }) => dataSources.usersAPI.getUser(id) },
  User: { orders: (parent, _, { dataSources }) => dataSources.ordersAPI.getOrdersByUserId(parent.id) },
};
\`\`\`

**DataLoader solves the N+1 problem** by batching and caching individual field loads within a single request.

## 7. Architecture Diagram

\`\`\`
+----------------+   POST /graphql    +-------------------+
|   Client App   |  --- query --->    |   GraphQL Server  |
| (Web / Mobile) |                    |                   |
|                |  <-- response ---  | +----- Schema ----+|
|  query: {      |                    | | Query, Mutation ||
|    currentUser {|                    | | Subscription   ||
|      name      |                    | +-----------------+|
|      avatar    |                    | |   Resolvers     ||
|      posts {   |                    | +-----------------+|
|        title   |                    |         |          |
|        likes   |                    |    +----------+    |
|      }         |                    |    |DataLoader|    |
|  }             |                    |    +----------+    |
+----------------+                    |    |  |  |   |    |
                                      |  +--+ +--+ +--+  |
                                      |  |DB| |API| |REST||
                                      |  +--+ +--+ +--+  |
                                      +-------------------+
\`\`\`

## 8. Real-World Flow Example

**GitHub's GraphQL API  Dashboard Feed:**
1. Client queries: viewer { login repositories(first: 10) { nodes { name stargazerCount } } }
2. GitHub validates OAuth token
3. Viewer resolver fetches authenticated user
4. Repositories resolver queries database with userId + limit 10
5. For each repo, primaryLanguage resolver batch-loads via DataLoader
6. Response returns single JSON matching query shape

## 9. Reference Implementation Example

\`\`\`typescript
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

const typeDefs = \`
  type Book { id: ID! title: String! author: Author! }
  type Author { id: ID! name: String! books: [Book!]! }
  type Query { books: [Book!]! author(id: ID!): Author }
  type Mutation { addBook(title: String!, authorId: ID!): Book! }
\`;

interface Book { id: string; title: string; authorId: string }
const books: Book[] = [{ id: "1", title: "Designing Data-Intensive Apps", authorId: "1" }];
const authors = [{ id: "1", name: "Martin Kleppmann" }];

const resolvers = {
  Query: {
    books: () => books,
    author: (_: unknown, { id }: { id: string }) => authors.find((a) => a.id === id),
  },
  Mutation: {
    addBook: (_: unknown, args: { title: string; authorId: string }) => {
      const book = { id: String(books.length + 1), title: args.title, authorId: args.authorId };
      books.push(book);
      return book;
    },
  },
  Book: { author: (parent: Book) => authors.find((a) => a.id === parent.authorId) },
};

const server = new ApolloServer({ typeDefs, resolvers });
startStandaloneServer(server, { listen: { port: 4000 } });
\`\`\`

## 10. Real Company Use Cases

- **GitHub**  Migrated public API v4 to GraphQL. Powers GitHub.com frontend, GitHub Mobile, and third-party integrations.
- **Shopify**  Storefront API is GraphQL-only. Merchants query exactly the product/cart data needed.
- **Meta**  Originally built for Facebook News Feed. Used across Instagram, WhatsApp, and Oculus.
- **Netflix**  Uses GraphQL (via Apollo Federation) for their TV UI, unifying data from dozens of microservices.

## 11. Common Interview Questions

1. "How does GraphQL differ from REST? When would you choose each?"
2. "What is the N+1 problem in GraphQL and how does DataLoader solve it?"
3. "How do you handle authentication and authorization in GraphQL?"
4. "What strategies exist for rate limiting and query depth limiting?"
5. "Explain GraphQL subscriptions and how they work under the hood."
6. "How would you design a federated GraphQL architecture?"
7. "What are the security considerations with a public GraphQL API?"

## 12. Related Topics & Next Steps

- **Apollo Federation**  Composing multiple GraphQL services into one
- **Relay**  Meta's GraphQL client with pagination and caching primitives
- **GraphQL Subscriptions**  Real-time via WebSockets
- **DataLoader**  Batching and caching for GraphQL resolvers
- **Schema Stitching**  Merging remote GraphQL schemas
- **Persisted Queries**  Whitelisting approved queries for security`,
    estimatedMin: 14,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Meta", "GitHub", "Shopify", "Netflix"],
    tags: ["GraphQL", "API", "schema", "resolvers", "Apollo"]
  },
  {
    id: "lesson-02-03",
    slug: "apis-protocols-authentication-03-grpc-protocol-buffers",
    title: "gRPC & Protocol Buffers",
    content: `## 1. Quick Summary

**gRPC** is a high-performance, open-source RPC framework by **Google** that uses **Protocol Buffers** (protobuf) for serialization and **HTTP/2** for transport. It supports **bidirectional streaming**, **strong typing**, and **automatic code generation** across languages. gRPC is 5-10x faster than JSON-based REST for internal services due to compact binary payloads and persistent HTTP/2 connections.

## 2. Definition

**gRPC** (gRPC Remote Procedure Calls) is a modern RPC framework based on the **protobuf** binary serialization format. It defines service contracts in \`.proto\` files and generates client/server stubs in 11+ languages. gRPC supports four service types:
1. **Unary RPC**  Single request, single response (like REST)
2. **Server Streaming**  Single request, stream of responses
3. **Client Streaming**  Stream of requests, single response
4. **Bidirectional Streaming**  Both sides stream independently

**Protocol Buffers** (protobuf) is Google's language-neutral, platform-neutral binary serialization format. It is smaller (3-10x), faster (20-100x), and more type-safe than JSON.

## 3. Why It Exists / Problem It Solves

REST/JSON APIs have significant overhead:
- **Text serialization** is verbose and slow to parse
- **No type safety**  JSON schemas (if they exist) are separate from implementation
- **HTTP/1.1 overhead**  Headers repeated per request, no multiplexing
- **Manual client generation**  Must hand-write HTTP clients per language
- **Streaming**  REST has no standardized streaming mechanism

gRPC solves these with binary protobuf, HTTP/2 multiplexing, code generation, and built-in streaming.

## 4. When to Use It

- **Microservice-to-microservice** communication (high throughput, low latency)
- **Polyglot environments** where services use different languages
- **Streaming data**  real-time feeds, logs, IoT sensor data, chat
- **Low-bandwidth / high-latency networks**  mobile, edge devices
- **Performance-critical paths**  ad serving, financial trading, gaming backends

## 5. When NOT to Use It / Tradeoffs

- **Public-facing browser APIs**  Browsers lack native gRPC support (use gRPC-Web or REST/GraphQL)
- **Simple CRUD**  REST is simpler and tooling is more mature
- **Human-readable debugging**  Protobuf is binary; need \`protoc --decode\` to read
- **Rapid prototyping**  Defining .proto files adds friction vs ad-hoc JSON endpoints
- **Small teams**  Learning curve for protobuf, code generation, and gRPC tooling

Tradeoffs: Larger payloads for tiny messages (protobuf overhead), no built-in caching (use Redis), limited browser support, schema evolution requires discipline.

## 6. How It Works (Deep Mechanics)

**Service Definition (\`.proto\` file):**
\`\`\`protobuf
syntax = "proto3";
service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (stream User);
  rpc Chat (stream ChatMessage) returns (stream ChatMessage);
}
message User { string id = 1; string name = 2; string email = 3; int32 age = 4; Address address = 5; }
message Address { string street = 1; string city = 2; string zip = 3; }
\`\`\`

**Protobuf Serialization:**
- Field numbers (1, 2, 3...) identify fields in binary (not names)
- Varint encoding for integers (small numbers use fewer bytes)
- Zigzag encoding for signed integers
- Wire types: Varint (0), 64-bit (1), Length-delimited (2), Start group (3), End group (4), 32-bit (5)

**HTTP/2 Transport:**
- Single persistent TCP connection between client and server
- Multiple streams multiplexed over one connection (no head-of-line blocking)
- Header compression (HPACK), flow control, server push
- gRPC uses trailers (headers after body) for status codes

## 7. Architecture Diagram

\`\`\`
gRPC Client                    gRPC Server
+-----------------------+     HTTP/2     +-----------------------+
| Service Stub          | =============> | Service Implementation|
| (generated code)      |                |                       |
| userClient.GetUser()  | -- req --->    | GetUser() handler     |
|                       | <-- resp ---   |                       |
| userClient.Chat()     | -- req1 -->    | Chat() duplex handler |
|                       | <-- resp1 ---  |                       |
+-----------------------+                +-----------------------+
  | Protobuf Encoder  |                  | Protobuf Decoder  |
  | HTTP/2 Framing    |                  | HTTP/2 Framing    |
  | TCP               |                  | TCP               |
  +-------------------+                  +-------------------+
\`\`\`

## 8. Real-World Flow Example

**Netflix  Internal Service Communication:**
1. Playback Service calls \`titleService.GetTitleMetadata(titleId)\` via gRPC
2. protobuf serializes request (~50 bytes vs ~250 bytes JSON)
3. HTTP/2 multiplexes this call alongside 50 other active RPCs on one TCP connection
4. Title Metadata Service deserializes, queries Cassandra, serializes response
5. Response (compressed protobuf) returns in ~3ms vs ~15ms for JSON equivalent
6. Server-streaming returns video manifest chunks as they are assembled

## 9. Reference Implementation Example

\`\`\`typescript
import * as grpc from "@grpc/grpc-js";
import { UserServiceClient, GetUserRequest, User } from "./proto/user_pb";

// Client
const client = new UserServiceClient("localhost:50051", grpc.credentials.createInsecure());
const req = new GetUserRequest();
req.setId("user-123");
client.getUser(req, (err: grpc.ServiceError | null, user: User) => {
  if (err) console.error(err);
  else console.log(user.toObject());
});

// Server
import { Server, ServerCredentials } from "@grpc/grpc-js";
import { UserServiceService } from "./proto/user_grpc_pb";
const server = new Server();
server.addService(UserServiceService, {
  getUser: (call: grpc.ServerUnaryCall<GetUserRequest, User>, callback: grpc.sendUnaryData<User>) => {
    const user = new User();
    user.setId(call.request.getId());
    user.setName("Alice");
    user.setEmail("alice@example.com");
    callback(null, user);
  },
});
server.bindAsync("0.0.0.0:50051", ServerCredentials.createInsecure(), () => server.start());
\`\`\`

## 10. Real Company Use Cases

- **Google**  gRPC powers virtually all internal Google services (AdWords, Search, YouTube, Gmail). Google Cloud API surface uses gRPC alongside REST.
- **Netflix**  gRPC for service-to-service calls. Java API layer uses gRPC to talk to backend microservices with strict contracts.
- **Uber**  Uses gRPC for real-time ride matching and driver location streaming. Protobuf schemas reduce bandwidth on mobile networks.
- **Square**  Migrated from JSON/HTTP to gRPC for internal services, reducing latency by 40% and error rates by 15%.

## 11. Common Interview Questions

1. "How does gRPC achieve better performance than REST?"
2. "Explain the four types of gRPC service methods with use cases."
3. "How do Protocol Buffers encode integers? What is varint encoding?"
4. "How do you handle gRPC errors and deadlines?"
5. "How does gRPC load balancing work?"
6. "How do you evolve protobuf schemas without breaking clients?"
7. "What is gRPC-Web and how does it work?"

## 12. Related Topics & Next Steps

- **HTTP/2 & HTTP/3**  Underlying transport protocols
- **gRPC Gateway**  Generating REST APIs from protobuf definitions
- **Service Mesh (Istio, Linkerd)**  gRPC-aware traffic management
- **Connect-Go**  Lightweight gRPC alternative for Go
- **Cap'n Proto / FlatBuffers**  Alternative zero-copy serialization formats`,
    estimatedMin: 15,
    difficulty: "ADVANCED" as const,
    companies: ["Google", "Netflix", "Uber", "Square"],
    tags: ["gRPC", "Protocol Buffers", "HTTP2", "RPC", "serialization"]
  },
  {
    id: "lesson-02-04",
    slug: "apis-protocols-authentication-04-webhooks-vs-polling-vs-websockets",
    title: "WebHooks vs Polling vs WebSockets",
    content: `## 1. Quick Summary

**WebHooks**, **Polling**, and **WebSockets** are three fundamental patterns for communicating data changes between services. **Polling** is the simplest (client repeatedly requests), **WebHooks** push data via HTTP callbacks (event-driven), and **WebSockets** maintain persistent bidirectional connections. Choose based on latency requirements, directionality, connection overhead, and server capabilities.

## 2. Definition

- **Polling (Short & Long)**: Client sends periodic HTTP requests to check for new data. Short polling requests every few seconds. Long polling holds the request open until data is available or timeout.
- **WebHooks**: Server registers a callback URL; when an event occurs, the source system sends an HTTP POST to that URL. **Event-driven push** pattern.
- **WebSockets**: A full-duplex communication protocol over a single TCP connection (ws:// or wss://). Both client and server can send messages at any time. Standardized as RFC 6455.

## 3. Why It Exists / Problem It Solves

Before these patterns, clients had no way to receive real-time data without constant requests. Each pattern solves a different dimension:
- **Polling**: Simplest to implement, no server changes needed, works through firewalls
- **WebHooks**: Eliminates wasteful polling requests, enables real-time event-driven architectures, scales better for infrequent events
- **WebSockets**: Enables true bidirectional real-time communication, eliminates HTTP overhead per message, essential for low-latency applications

## 4. When to Use It

| Pattern | Best For |
|---------|----------|
| **Polling** | Simple status checks, low-frequency updates, legacy systems, internal tools |
| **Long Polling** | Near-real-time when WebSockets unavailable (older browsers, restrictive networks) |
| **WebHooks** | Event notifications (CI/CD, payment webhooks, GitHub events), service-to-service integration |
| **WebSockets** | Real-time chat, live cursors, multiplayer games, stock tickers, collaborative editing |

## 5. When NOT to Use It / Tradeoffs

**Polling**: Wastes bandwidth and server resources if interval is too short; high latency if interval is too long; thundering herd when many clients poll simultaneously.
**Long Polling**: Still has HTTP overhead per connection; timeout handling is complex; not truly real-time (connection re-establishment latency).
**WebHooks**: Requires public-facing endpoint; no delivery guarantees (implement retries); debugging is harder; security concerns (verify payload signature).
**WebSockets**: Complex infrastructure (sticky sessions, reconnection logic); firewalls/proxies may block; scaling requires connection multiplexing; no built-in message ordering guarantees.

## 6. How It Works (Deep Mechanics)

**Polling Flow:**
\`\`\`
Client                          Server
  |-- GET /status?since=123 -->  |
  |<-- 200 { data: [...] } ---- |
  |-- GET /status?since=456 -->  |
  |<-- 200 { data: [] } ------- |
  |-- (wait 5s)                  |
  |-- GET /status?since=456 -->  |
  |<-- 200 { data: [new] } ---- |
\`\`\`

**WebSocket Handshake:**
\`\`\`
Client                                 Server
  |  GET /chat HTTP/1.1                |
  |  Upgrade: websocket                |
  |  Connection: Upgrade               |
  |  Sec-WebSocket-Key: x3JJHMbLi...   |
  |----------------------------------->|
  |  HTTP/1.1 101 Switching Protocols  |
  |  Upgrade: websocket                |
  |  Sec-WebSocket-Accept: HSmrc...    |
  |<-----------------------------------|
  |  [bidirectional frames]            |
\`\`\`

WebSocket frames have OpCode (1=text, 2=binary, 8=close, 9=ping, 10=pong), payload length, masking key (client-to-server), and payload data.

## 7. Architecture Diagram

\`\`\`
+=====================================================+
|              COMMUNICATION PATTERNS                  |
+=====================================================+
 POLLING         WEBHOOK              WEBSOCKET
+------+       +----------+          +------+
|Client|       | Producer |          |Client|
+------+       +----------+          +------+
   |               |                    |  |
   v               v                    v  v
+------+  GET   +------+  POST /cb  +------+
|Server|<------ |  S3  |----------> |Server|
+------+        +------+           +------+
 (stateless)    (event-driven)     (stateful)
                   |                    |
                   v                    v
               +------+            +------+
               |Consumer|          |Others|
               +------+            +------+
\`\`\`

## 8. Real-World Flow Example

**GitHub CI/CD Pipeline:**
1. Developer pushes code to GitHub repository
2. GitHub emits a **WebHook** (push event) to the configured CI server URL
3. CI server receives the POST, validates via HMAC signature
4. CI server starts the build pipeline
5. A **WebSocket** connection between browser and status dashboard shows real-time build logs
6. If WebSocket disconnects, the dashboard **polls** every 5s as fallback
7. Build completes, GitHub sends another **WebHook** with the check run status

## 9. Reference Implementation Example

\`\`\`typescript
import express from "express";
import crypto from "crypto";
import { WebSocketServer } from "ws";

const app = express();
app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

// WebHook receiver
app.post("/webhook", (req, res) => {
  const signature = req.headers["x-hub-signature-256"] as string;
  const hmac = crypto.createHmac("sha256", "your-secret").update(req.rawBody).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(\`sha256=\${hmac}\`))) {
    return res.status(401).send("Invalid signature");
  }
  console.log("WebHook received:", req.body);
  res.status(200).send("OK");
});

// WebSocket server
const wss = new WebSocketServer({ port: 8080 });
wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(data.toString());
    });
  });
});

// Polling endpoint
app.get("/status", (req, res) => {
  const since = Number(req.query.since) || 0;
  const updates = getUpdatesSince(since);
  res.json({ updates, timestamp: Date.now() });
});
\`\`\`

## 10. Real Company Use Cases

- **Stripe**  WebHooks for payment events (charge.succeeded, invoice.paid). Customers register endpoints. Retries with exponential backoff up to 3 days.
- **GitHub**  WebHooks for push, PR, issue events. Polling API for non-realtime needs. WebSockets for live collaboration.
- **Slack**  WebSockets (RTM API) for real-time messaging. WebHooks for outgoing integrations.
- **Figma**  WebSockets for collaborative editing. Each cursor movement pushed via WS.
- **WhatsApp**  WebSockets for message delivery. Persistent connection with keepalive pings.

## 11. Common Interview Questions

1. "Compare polling, long polling, WebSockets, and SSE. When would you use each?"
2. "How do you secure a webhook endpoint and verify payload authenticity?"
3. "Design a real-time collaborative document editor. What patterns would you use?"
4. "How do you scale WebSocket connections horizontally across multiple servers?"
5. "What is the WebSocket handshake process at the HTTP level?"
6. "How do you handle webhook retries and exactly-once delivery?"
7. "What is Server-Sent Events (SSE) and how does it compare to WebSockets?"

## 12. Related Topics & Next Steps

- **Server-Sent Events (SSE)**  Simpler one-directional push over HTTP
- **WebSocket Security**  wss://, origin checking, rate limiting
- **WebHook Retry Policies**  Exponential backoff, idempotency keys, dead letter queues
- **gRPC Streaming**  Bidirectional streaming alternative
- **Message Queues (RabbitMQ, Kafka)**  Durable event delivery between services
- **Socket.IO**  WebSocket abstraction layer with fallbacks`,
    estimatedMin: 13,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Stripe", "Slack", "GitHub", "Figma"],
    tags: ["WebHooks", "WebSockets", "Polling", "real-time", "events"]
  },
  {
    id: "lesson-02-05",
    slug: "apis-protocols-authentication-05-api-gateway",
    title: "API Gateway",
    content: `## 1. Quick Summary

An **API Gateway** is a central entry point that sits between clients and backend services. It handles **request routing**, **authentication**, **rate limiting**, **load balancing**, **caching**, **protocol translation**, and **observability**. In microservice architectures, the API Gateway pattern consolidates cross-cutting concerns so individual services stay focused on business logic. Popular implementations: **Kong**, **AWS API Gateway**, **NGINX**, **Traefik**, **Apigee**.

## 2. Definition

An **API Gateway** is a server (or layer) that acts as a **reverse proxy**, accepting API calls, applying policies, and forwarding requests to appropriate backend services. Key capabilities include:
- **Routing**  Map incoming requests to specific services based on path, headers, or query params
- **Authentication & Authorization**  Validate tokens (JWT, OAuth), enforce policies
- **Rate Limiting & Throttling**  Enforce per-client or per-API usage quotas
- **Caching**  Cache responses to reduce backend load
- **Protocol Translation**  Convert REST to gRPC, HTTP to WebSocket
- **Request/Response Transformation**  Modify headers, merge responses, strip sensitive fields
- **Observability**  Logging, metrics, distributed tracing

## 3. Why It Exists / Problem It Solves

Without an API Gateway, clients must know the location of every microservice, implement auth independently, handle service discovery, and manage SSL/TLS termination. The Gateway solves: **cross-cutting concerns duplication**, **client-service coupling**, **security fragmentation**, **inconsistent API surfaces**, and **monitoring chaos**.

## 4. When to Use It

- **Microservice architectures** with 5+ services
- **Public-facing APIs** needing unified auth, rate limiting, and documentation
- **Multi-protocol environments** (REST + gRPC + WebSocket under one domain)
- **Multi-tenant SaaS platforms** needing per-tenant routing and quotas
- **Legacy system integration**  expose legacy SOAP services as REST through the gateway

## 5. When NOT to Use It / Tradeoffs

- **Monolithic applications** with single service  adds unnecessary complexity
- **Simple 2-3 service architectures**  direct communication is simpler
- **Latency-critical paths**  Gateway adds network hop (typically 2-5ms)
- **Small teams**  Gateway is another system to maintain and operate

Tradeoffs: Single point of failure (mitigate with HA deployment), added latency, configuration complexity, potential bottleneck under high traffic.

## 6. How It Works (Deep Mechanics)

**Request Flow:** Client -> DNS -> Load Balancer -> API Gateway -> [Auth | RateLimit | Cache | Transform] -> Service

**Gateway Core Operations:**
1. **Connection Handling**: TLS termination, keep-alive pooling, HTTP/2 support
2. **Request Matching**: Regex path matching, host-based routing, header-based routing
3. **Pipeline Execution**: Plugins execute in configured order (auth first, then rate limit, then transform)
4. **Service Discovery**: Static targets, DNS resolution, Consul/etcd integration
5. **Load Balancing**: Round-robin, least-connections, consistent hashing
6. **Circuit Breaking**: Track failures, open circuit when error rate exceeds threshold

**Request Aggregation Pattern:**
\`\`\`typescript
app.get("/api/v1/dashboard/:userId", async (req, res) => {
  const [user, orders, recommendations] = await Promise.all([
    fetch(\`http://users/\${req.params.userId}\`),
    fetch(\`http://orders?userId=\${req.params.userId}&limit=5\`),
    fetch(\`http://recommendations/\${req.params.userId}\`),
  ]);
  res.json({ user: await user.json(), recentOrders: await orders.json(), recommendations: await recommendations.json() });
});
\`\`\`

## 7. Architecture Diagram

\`\`\`
+--------+   +-----------+   +-------------+   +----------------+
| Client |-> | DNS / LB  |-> | API Gateway |-> | User Service   |
+--------+   +-----------+   +-------------+   +----------------+
                                  |               |  (internal)
                                  |           +----------------+
                                  |           | Order Service  |
                                  |           +----------------+
                                  |               |
                                  |           +----------------+
                                  |           | Payment Service|
                                  |           +----------------+
                                  |
                             +---------+
                             | Plugins | JWT, Rate, Cache, Log, CORS
                             +---------+
\`\`\`

## 8. Real-World Flow Example

**Netflix API Gateway (Zuul)  Browse Homepage:**
1. Client sends \`GET /api/browse\` to Netflix.com
2. DNS resolves to AWS CloudFront + ALB
3. Traffic hits **Zuul** (Netflix's API Gateway)
4. Zuul performs: JWT validation, device type detection, A/B test assignment
5. Zuul fans out requests in parallel to: Content Service, Personalization Service, History Service, Trending Service
6. Zuul aggregates responses, strips PII fields, compresses payload (gzip)
7. Response returned in ~200ms with personalized recommendations

## 9. Reference Implementation Example

\`\`\`typescript
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing token" });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET!); next(); }
  catch { res.status(401).json({ error: "Invalid token" }); }
};

const rateLimiter = (req: any, res: any, next: any) => {
  // In-memory rate limit (use Redis in production)
  next();
};

app.use("/api/v1/users", authenticate, rateLimiter, createProxyMiddleware({ target: "http://user-service:3001", changeOrigin: true }));
app.use("/api/v1/orders", authenticate, rateLimiter, createProxyMiddleware({ target: "http://order-service:3002", changeOrigin: true }));
app.listen(8080, () => console.log("API Gateway on :8080"));
\`\`\`

## 10. Real Company Use Cases

- **Netflix (Zuul)**  Handles 1M+ requests/second. Routes to 500+ microservices. Implements circuit breakers, retries, timeouts.
- **Amazon (AWS API Gateway)**  Managed service. Integrates with Lambda, DynamoDB, Step Functions. Supports canary deployments.
- **Kong**  Open-source gateway used by Yahoo Japan, Samsung, NASA. 500+ plugins.
- **Apigee (Google)**  Used by Walmart, BMO, ADP for API monetization and developer portals.
- **Shopify**  Custom gateway handles 600K+ requests/second during Black Friday. Routes to 300+ services.

## 11. Common Interview Questions

1. "Design an API Gateway for a ride-sharing platform."
2. "How does an API Gateway differ from a reverse proxy and a load balancer?"
3. "How do you handle authentication centrally in an API Gateway?"
4. "What are the tradeoffs of request aggregation in the Gateway vs BFF?"
5. "How do you prevent the API Gateway from becoming a single point of failure?"
6. "Compare API Gateway with Service Mesh. When would you use each?"

## 12. Related Topics & Next Steps

- **Backend-for-Frontend (BFF)**  Per-client-type gateway specialization
- **Service Mesh (Istio, Linkerd)**  Sidecar proxy for service-to-service
- **GraphQL Gateway**  Merging multiple GraphQL services (Apollo Federation)
- **Kong, Traefik, Envoy**  Popular gateway implementations
- **API Management Platforms**  Monetization, developer portals, analytics`,
    estimatedMin: 13,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Netflix", "Amazon", "Kong", "Shopify"],
    tags: ["API-Gateway", "microservices", "reverse-proxy", "routing"]
  },
  {
    id: "lesson-02-06",
    slug: "apis-protocols-authentication-06-authentication-vs-authorization",
    title: "Authentication vs Authorization",
    content: `## 1. Quick Summary

**Authentication (AuthN)** verifies *who you are*  identity. **Authorization (AuthZ)** verifies *what you are allowed to do*  permissions. AuthN happens first: "Are you who you claim to be?" (password, biometrics, SSO). AuthZ follows: "Can you read this resource?" (roles, policies, ACLs). Confusing these two is the most common security design mistake in system design interviews and production systems.

## 2. Definition

- **Authentication**: The process of validating a user's identity. Methods: passwords (with hashing), multi-factor authentication (MFA), biometrics, security keys (WebAuthn), OAuth, SAML, OpenID Connect (OIDC). Output: an **identity claim** (user ID, email, roles).

- **Authorization**: The process of determining whether an authenticated entity has permission to perform an action on a resource. Models: Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC), Access Control Lists (ACLs), Policy-Based Access Control (PBAC). Output: **grant or deny** decision.

## 3. Why It Exists / Problem It Solves

Without AuthN, anyone could impersonate anyone else. Without AuthZ, every authenticated user has unlimited access. The separation ensures:
- **Defense in depth**  Compromised credentials do not grant automatic access to everything
- **Least privilege**  Users get only the permissions they need
- **Auditability**  Log who accessed what, separate from who authenticated
- **Scalable permission management**  Roles and policies scale better than per-user grants

## 4. When to Use It

- **AuthN**: Every application that needs user identity  login pages, API endpoints, mobile apps, CLI tools
- **AuthZ**: Every application with multiple user roles or varying permission levels  admin panels, multi-tenant SaaS, document sharing, payment systems

Use **RBAC** when permissions map well to job functions (admin, editor, viewer). Use **ABAC** when permissions depend on context (time, location, resource type, relationship).

## 5. When NOT to Use It / Tradeoffs

- **AuthN without AuthZ**: OK for read-only apps where all authenticated users have same access
- **Overly complex AuthZ**: Custom policy engines (ABAC) add significant complexity. Start with RBAC. Evolve to ABAC only when needed.
- **Self-built auth**: Do not build your own password hashing, session management, or MFA. Use proven libraries (bcrypt, Argon2, OAuth libraries).

Tradeoffs: AuthN adds login friction (MFA tradeoff). AuthZ adds latency (every request checks permissions). Complex AuthZ rules are hard to audit and debug.

## 6. How It Works (Deep Mechanics)

**Authentication Flow:**
1. Client sends POST /login { email, password } over HTTPS
2. Server looks up user by email
3. Server retrieves stored hash (bcrypt/Argon2) and salt
4. Server hashes provided password with same salt
5. Server compares hashes using constant-time comparison
6. If match: generate session token or JWT, return to client
7. If no match: return 401 Unauthorized

\`\`\`typescript
import bcrypt from "bcrypt";
const hash = await bcrypt.hash("user-password", 12);
const isValid = await bcrypt.compare("user-password", hash);
\`\`\`

**Authorization Flow (RBAC):**
1. Request reaches server with JWT containing user ID and roles
2. Server extracts roles from token (e.g., ["admin", "editor"])
3. Server identifies resource and action (e.g., DELETE /posts/123)
4. Server checks if any user role matches the required permission
5. If matched: allow request; else: return 403 Forbidden

\`\`\`typescript
function authorize(...allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    const userRoles = req.user.roles as string[];
    if (!allowedRoles.some((r) => userRoles.includes(r))) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
app.delete("/posts/:id", authenticate, authorize("admin"), async (req, res) => {
  await db.posts.delete(req.params.id);
  res.status(204).send();
});
\`\`\`

## 7. Architecture Diagram

\`\`\`
AUTHENTICATION                   AUTHORIZATION
+-----------+                   +-----------+
|Credentials|                   | Request   |
|(pass,MFA) |                   | + token   |
+-----+-----+                   +-----+-----+
      |                               |
      v                               v
+-----------+               +-----------+-----------+
| Identity  |               |   Policy Decision     |
| Provider  |               |   Point (PDP)         |
| (verify)  |               |                       |
+-----+-----+               | User-Role /           |
      |                     | Role-Permission map   |
      v                     +-----------+-----------+
+-----------+                           |
| Token/JWT |                 +---------+---------+
| (sub,     |                 | Grant / Deny      |
|  roles)   |                 | 200 / 403         |
+-----------+                 +-------------------+
\`\`\`

## 8. Real-World Flow Example

**AWS Console Login and S3 Access:**
1. **AuthN**: User enters email + password + MFA code at console.aws.amazon.com
2. AWS Cognito/IAM validates credentials, issues temporary credentials
3. **AuthZ**: User requests \`s3:GetObject\` on \`arn:aws:s3:::my-bucket/secret.pdf\`
4. IAM evaluates: user policies, resource policies, organization SCPs, permission boundaries
5. IAM determines Allow or Deny
6. If Allow: S3 returns the object; if Deny: 403 AccessDenied

## 9. Reference Implementation Example

\`\`\`typescript
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());

const users = [
  { id: "1", email: "alice@example.com", hash: bcrypt.hashSync("password1", 12), roles: ["admin"] },
  { id: "2", email: "bob@example.com", hash: bcrypt.hashSync("password2", 12), roles: ["viewer"] },
];

function authenticate(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing token" });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET!); next(); }
  catch { res.status(401).json({ error: "Invalid token" }); }
}

function authorize(...allowed: string[]) {
  return (req: any, res: any, next: any) => {
    const userRoles: string[] = req.user.roles;
    if (!allowed.some((r) => userRoles.includes(r))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

app.post("/login", (req, res) => {
  const user = users.find((u) => u.email === req.body.email);
  if (!user || !bcrypt.compareSync(req.body.password, user.hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ sub: user.id, email: user.email, roles: user.roles }, process.env.JWT_SECRET!, { expiresIn: "2h" });
  res.json({ token });
});

app.get("/admin/data", authenticate, authorize("admin"), (req, res) => {
  res.json({ secret: "classified data" });
});

app.get("/public/data", (req, res) => {
  res.json({ message: "anyone can see this" });
});
\`\`\`

## 10. Real Company Use Cases

- **Okta**  Identity-as-a-Service. Handles AuthN (SSO, MFA) and AuthZ (policies, app assignment) for thousands of enterprises.
- **Auth0**  AuthN and AuthZ platform. Social login, enterprise federation, passwordless, fine-grained RBAC/ABAC.
- **AWS IAM**  Fine-grained authorization for AWS. Combines user policies, group policies, roles, resource policies, permission boundaries, SCPs.
- **Google Zanzibar**  Global authorization system for Search, Drive, YouTube, Calendar. Inspired SpiceDB.

## 11. Common Interview Questions

1. "Explain the difference between authentication and authorization with concrete examples."
2. "How would you design an authorization system for a multi-tenant SaaS platform?"
3. "What is RBAC and how does it differ from ABAC?"
4. "How do you handle authorization at the API Gateway level vs the service level?"
5. "What is the principle of least privilege and how do you enforce it?"
6. "How would you design a system that supports both role-based and attribute-based permissions?"

## 12. Related Topics & Next Steps

- **OAuth 2.0 & OIDC**  Delegated authorization and identity protocols
- **SAML**  Enterprise SSO protocol
- **WebAuthn / FIDO2**  Passwordless authentication
- **RBAC vs ABAC vs ReBAC**  Authorization model comparison
- **Policy-as-Code (OPA, Cedar)**  Declarative authorization policies
- **Zero Trust Architecture**  "Never trust, always verify"`,
    estimatedMin: 10,
    difficulty: "BEGINNER" as const,
    companies: ["Okta", "Auth0", "AWS", "Google"],
    tags: ["authentication", "authorization", "RBAC", "ABAC", "security"]
  },
  {
    id: "lesson-02-07",
    slug: "apis-protocols-authentication-07-oauth2-openid-connect",
    title: "OAuth 2.0 & OpenID Connect",
    content: `## 1. Quick Summary

**OAuth 2.0** is a **delegated authorization framework** that allows a third-party application to obtain limited access to a user's resources without exposing credentials. **OpenID Connect (OIDC)** is an **identity layer** on top of OAuth 2.0 that adds authentication  it lets the client verify the user's identity and obtain basic profile information. Together they power "Login with Google/Facebook/GitHub" and most modern API authorization flows.

## 2. Definition

**OAuth 2.0** defines four roles:
1. **Resource Owner**  The user who owns the data
2. **Client**  The application requesting access
3. **Authorization Server**  Issues tokens after authenticating the resource owner
4. **Resource Server**  Hosts protected resources; validates access tokens

**OAuth 2.0 Grant Types:**
- **Authorization Code**  Most common; web and mobile apps
- **Authorization Code + PKCE**  Mobile/native apps (no client secret)
- **Client Credentials**  Server-to-server (no user involved)
- **Device Code**  Smart TVs, CLI tools, IoT
- **Refresh Token**  Obtain new access tokens without re-authentication

**OpenID Connect** adds:
- **ID Token**  A JWT containing identity claims (sub, name, email, picture)
- **UserInfo Endpoint**  Fetch additional profile data
- **Discovery Document**  Standardized metadata endpoint (\`/.well-known/openid-configuration\`)

## 3. Why It Exists / Problem It Solves

Before OAuth: sharing access meant giving your password to third-party apps (password anti-pattern). OAuth solves:
- **Credential exposure**  Never share passwords with third parties
- **Scoped access**  Limit what an app can do (read-only vs read-write)
- **Revocability**  Revoke app access without changing your password
- **Federation**  Single identity across multiple services (SSO)

OpenID Connect solves: "How does the client know who the user is?" OAuth alone only provides an access token  the client has no standard way to authenticate the user.

## 4. When to Use It

- **OAuth 2.0**: Any time you need delegated access  "Allow this app to post on my behalf"
- **OIDC**: Any time you need user identity  "Sign in with Google", enterprise SSO
- **Authorization Code + PKCE**: Default for mobile and SPA applications
- **Client Credentials**: Backend microservices calling each other, cron jobs

## 5. When NOT to Use It / Tradeoffs

- **First-party apps**  Simple session-based auth or JWT is simpler
- **Internal APIs**  API keys or mutual TLS are simpler
- **Resource-constrained devices**  OAuth handshake is chatty
- **Real-time low-latency scenarios**  Token validation adds latency

Tradeoffs: Complexity (multiple endpoints, grant types), token storage security (XSS/CSRF risks), refresh token rotation complexity, state management for CSRF (PKCE + state parameter).

## 6. How It Works (Deep Mechanics)

**Authorization Code Flow:**
\`\`\`
+--------+                               +---------------+
| Client |                               | Auth Server   |
+--------+                               +---------------+
    |                                          |
    |  Auth Request (response_type=code,       |
    |  client_id, redirect_uri, scope, state)  |
    |----------------------------------------->|
    |                                          |
    |  User authenticates + authorizes         |
    |<-- Authorization Code -------------------|
    |                                          |
    |  Token Request (code + client_secret     |
    |   + redirect_uri + code_verifier)        |
    |----------------------------------------->|
    |                                          |
    |  Tokens (access_token + id_token +       |
    |   refresh_token)                         |
    |<-----------------------------------------|
    |                                          |
    |  UserInfo Request (Bearer access_token)  |
    |----------------------------------------->|
    |  UserInfo (sub, name, email, picture)    |
    |<-----------------------------------------|
\`\`\`

## 7. Architecture Diagram

\`\`\`
+------------------+   +--------------------+   +------------------+
|   Client App     |   |  Authorization    |   |   Resource       |
|   (Web/Mobile)   |   |  Server (AS)       |   |   Server (RS)    |
+--------+---------+   +---------+----------+   +--------+---------+
         |                        |                        |
         | Auth Request           |                        |
         |----------------------->|                        |
         |                        |                        |
         | Auth Code              |                        |
         |<-----------------------|                        |
         |                        |                        |
         | Token Request          |                        |
         |----------------------->|                        |
         |                        |                        |
         | Access + ID + Refresh  |                        |
         |<-----------------------|                        |
         |                        |                        |
         | API Call (Access Token)|                        |
         |----------------------------------------------->|
         |<-----------------------------------------------|
\`\`\`

## 8. Real-World Flow Example

**"Sign in with Google" on Medium:**
1. User clicks "Sign in with Google" on Medium.com
2. Browser redirects to Google's OAuth endpoint with client_id, redirect_uri, scope=openid profile email
3. User signs into Google, sees consent screen: "Medium wants to view your email address and profile"
4. User approves; Google redirects back to Medium with authorization code
5. Medium backend exchanges code for tokens at Google's token endpoint
6. Google returns: \`{ access_token, id_token, refresh_token }\`
7. Medium validates ID Token signature (RS256, JWKS from Google's discovery endpoint)
8. Medium creates/updates user account, sets session cookie

## 9. Reference Implementation Example

\`\`\`typescript
import express from "express";
import crypto from "crypto";

const app = express();
const CLIENT_ID = "my-client-id";
const CLIENT_SECRET = "my-client-secret";
const REDIRECT_URI = "http://localhost:3000/callback";
const AUTH_SERVER = "https://accounts.example.com";

app.get("/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;

  const authUrl = \`\${AUTH_SERVER}/authorize?response_type=code&client_id=\${CLIENT_ID}&redirect_uri=\${REDIRECT_URI}&scope=openid+profile+email&state=\${state}&code_challenge=\${codeChallenge}&code_challenge_method=S256\`;
  res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  if (state !== req.session.oauthState) return res.status(400).send("CSRF detected");

  const tokenResponse = await fetch(\`\${AUTH_SERVER}/token\`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code: code as string, redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code_verifier: req.session.codeVerifier,
    }),
  });
  const tokens: any = await tokenResponse.json();
  const idToken = jwt.decode(tokens.id_token) as any;
  console.log("User:", idToken.sub, idToken.email);
  res.json({ user: idToken, accessToken: tokens.access_token });
});
\`\`\`

## 10. Real Company Use Cases

- **Google**  OAuth 2.0 + OIDC for Google Sign-In. Millions of apps. Tokens signed with RS256; JWKS endpoint rotates keys periodically.
- **Microsoft**  Azure AD / Microsoft Identity Platform. OAuth 2.0 + OIDC for Microsoft 365 and Azure.
- **Meta**  Facebook Login. Custom OAuth 2.0. Returns user data via Graph API.
- **GitHub**  OAuth 2.0 for third-party integration. Scopes for repo, read:org, workflow. No OIDC.

## 11. Common Interview Questions

1. "Explain OAuth 2.0 authorization code flow step by step."
2. "What is PKCE and why is it needed for mobile/native apps?"
3. "How does OpenID Connect add authentication on top of OAuth 2.0?"
4. "What is the difference between an access token and an ID token?"
5. "How do you securely store and rotate refresh tokens?"
6. "Design a token introspection system for validating opaque tokens at scale."
7. "What are the security implications of implicit grant flow (now deprecated)?"

## 12. Related Topics & Next Steps

- **JWT**  The token format used by OIDC
- **SAML 2.0**  Enterprise SSO alternative
- **OAuth 2.1**  Simplified (deprecates implicit grant, password grant)
- **Token Exchange**  OAuth extension for impersonation
- **FAPI**  Financial-grade API security profile`,
    estimatedMin: 16,
    difficulty: "ADVANCED" as const,
    companies: ["Google", "Microsoft", "Meta", "GitHub"],
    tags: ["OAuth2", "OpenID-Connect", "SSO", "authentication", "authorization"]
  },
  {
    id: "lesson-02-08",
    slug: "apis-protocols-authentication-08-jwt-json-web-tokens",
    title: "JWT (JSON Web Tokens)",
    content: `## 1. Quick Summary

**JSON Web Token (JWT)** is a compact, URL-safe token format for representing claims between two parties. It consists of three Base64-encoded segments: **header**, **payload**, and **signature**. JWTs are **self-contained**  the token carries all necessary information (user ID, roles, expiration) without requiring server-side session storage. They are widely used for **stateless authentication**, **OIDC ID tokens**, and **signed API requests**.

## 2. Definition

A JWT has three parts separated by dots (\`header.payload.signature\`):

\`\`\`
eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleS0xIn0.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNTE2MjQyNjIyfQ.
XbQlCRXET2iNCmICfS-OxVc_XhPKAQFH3_KZpMm_9M0
\`\`\`

**Header**: Algorithm (\`alg\`) and key ID (\`kid\`). \`{"alg": "RS256", "typ": "JWT"}\`
**Payload**: Claims (registered, public, private). \`{"sub": "123", "name": "Alice", "iat": 1516239022, "exp": 1516242622}\`
**Signature**: Verifies token integrity. Created by signing header + payload.

## 3. Why It Exists / Problem It Solves

Traditional session-based auth stores session IDs in server memory or Redis. Problems:
- **Server memory**  Each session consumes memory
- **Sticky sessions**  Requests must route to the same server
- **Horizontal scaling**  Every new server needs access to session store
- **Mobile/API**  Sessions work poorly for non-browser clients

JWTs solve these by encoding all session data in the token  no database lookup needed per request.

## 4. When to Use It

- **Stateless authentication**  API servers that scale horizontally
- **OAuth 2.0 / OIDC**  ID tokens are JWTs by spec
- **Single-use tokens**  Password reset links, email verification, magic links
- **Service-to-service auth**  Signed requests between microservices

## 5. When NOT to Use It / Tradeoffs

- **Large payloads**  JWTs are sent with every request
- **Revocation**  Cannot revoke before expiration without a blocklist
- **Sensitive data**  Payload is Base64-encoded, not encrypted
- **Short-lived tokens**  Refresh token complexity increases

Tradeoffs: Token size (500-2000 bytes), no built-in revocation, signature verification cost, clock skew issues.

## 6. How It Works (Deep Mechanics)

**Signing Algorithms:**
- **HS256 (HMAC + SHA-256)**: Symmetric. Same secret signs and verifies. Fast but secret must be shared.
- **RS256 (RSA + SHA-256)**: Asymmetric. Private key signs, public key verifies. Any service with public key can verify.
- **ES256 (ECDSA + P-256)**: Asymmetric. Smaller signatures than RSA (64 vs 256 bytes). Recommended for mobile.
- **EdDSA (Ed25519)**: Modern, fast, secure. Becoming the recommended choice.

\`\`\`typescript
import jwt from "jsonwebtoken";
const token = jwt.sign({ sub: "user-123", roles: ["admin"] }, privateKey, { algorithm: "RS256", expiresIn: "15m" });
const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
\`\`\`

**JWT Best Practices:**
- Short expiry (5-15 minutes for access tokens)
- Use asymmetric signing (RS256, ES256)
- Include \`iss\`, \`aud\`, \`iat\`, \`exp\` claims
- Never store sensitive data in payload
- Rotate signing keys periodically

## 7. Architecture Diagram

\`\`\`
JWT STRUCTURE:
+----------------------------------+
|          Header                  |
| { "alg": "RS256",               |
|   "typ": "JWT",                  |
|   "kid": "key-v2" }             |
| Base64URL(header)                |
+----------------------------------+
                .
+----------------------------------+
|          Payload                 |
| { "sub": "user-123",            |
|   "name": "Alice",               |
|   "roles": ["admin"],            |
|   "iat": 1716000000,             |
|   "exp": 1716000900 }            |
| Base64URL(payload)               |
+----------------------------------+
                .
+----------------------------------+
|          Signature               |
| RSASHA256(base64url(header) +    |
|   "." + base64url(payload),      |
|   privateKey)                    |
| Base64URL(signature)            |
+----------------------------------+
\`\`\`

## 8. Real-World Flow Example

**Auth0-powered SaaS App:**
1. User logs in via Auth0's hosted login page (OIDC)
2. Auth0 issues: access_token + id_token (JWT) + refresh_token
3. SPA stores tokens in memory (not localStorage  XSS risk)
4. SPA calls API with \`Authorization: Bearer eyJ...\`
5. API Gateway validates JWT using Auth0's JWKS endpoint
6. Gateway extracts \`sub\` from JWT, calls user service
7. When token expires after 15 min, SPA uses refresh token to get a new one silently

## 9. Reference Implementation Example

\`\`\`typescript
import jwt from "jsonwebtoken";
import express from "express";
import crypto from "crypto";

const app = express();
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });

const tokenService = {
  sign(userId: string, roles: string[]): string {
    return jwt.sign({ sub: userId, roles }, privateKey, { algorithm: "RS256", expiresIn: "15m", issuer: "api.myapp.com" });
  },
  verify(token: string): jwt.JwtPayload {
    return jwt.verify(token, publicKey, { algorithms: ["RS256"], issuer: "api.myapp.com" }) as jwt.JwtPayload;
  },
};

function authenticate(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });
  try { req.user = tokenService.verify(auth.slice(7)); next(); }
  catch { res.status(401).json({ error: "Invalid token" }); }
}

app.post("/login", (req, res) => {
  const { accessToken } = { accessToken: tokenService.sign("user-123", ["admin"]) };
  res.json({ accessToken, expiresIn: 900 });
});

app.get("/me", authenticate, (req, res) => {
  res.json({ userId: req.user.sub, roles: req.user.roles });
});
\`\`\`

## 10. Real Company Use Cases

- **Auth0**  Issues JWTs for millions of users. JWKS endpoint for token verification.
- **Google**  OIDC ID tokens are JWTs signed with RS256. JWKS rotates keys periodically.
- **Amazon Cognito**  Issues JWTs for user pools. Tokens include \`cognito:groups\` for authorization.
- **Microsoft Azure AD**  JWTs for access and ID tokens. Include \`tid\`, \`oid\`, \`roles\` claims.

## 11. Common Interview Questions

1. "What are the three parts of a JWT and how is the signature generated?"
2. "Compare HS256 vs RS256. When would you use each?"
3. "How do you handle JWT revocation without a server-side blocklist?"
4. "What are common JWT security vulnerabilities (alg=none, key confusion)?"
5. "How does JWT size impact performance compared to session IDs?"
6. "How do you implement JWKS rotation?"
7. "What is the difference between JWS, JWE, and JWK?"

## 12. Related Topics & Next Steps

- **OAuth 2.0 & OIDC**  Protocols that use JWTs as tokens
- **JWKS (JSON Web Key Set)**  Public key distribution
- **JWE (JSON Web Encryption)**  Encrypted JWT
- **PASETO**  Alternative to JWT with fewer footguns
- **Session vs Token Auth**  Comparing approaches`,
    estimatedMin: 12,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Auth0", "Google", "Amazon", "Microsoft"],
    tags: ["JWT", "tokens", "authentication", "RS256", "stateless"]
  },
  {
    id: "lesson-02-09",
    slug: "apis-protocols-authentication-09-session-vs-token-auth",
    title: "Session-Based Auth vs Token-Based Auth",
    content: `## 1. Quick Summary

**Session-based authentication** stores session state on the server (or a shared store like Redis). The client holds only a session ID (cookie). **Token-based authentication** encodes all session data into a self-contained token (JWT). Sessions are **stateful**; tokens are **stateless**. The choice affects scalability, security, mobile support, and development complexity.

## 2. Definition

**Session-Based Auth:** Server creates a session object stored in memory or Redis. Client gets a session ID in an HTTP-only cookie. Each request: browser sends cookie, server looks up session, reads user data. Session is mutable (can be updated, revoked instantly).

**Token-Based Auth:** Server creates a signed token (JWT) containing user claims. Client stores token. Each request: client sends token in \`Authorization: Bearer <token>\` header. Token is immutable.

## 3. Why It Exists / Problem It Solves

Session auth problems with modern architectures:
- **Scaling**  Session data must be shared across servers
- **Mobile/API clients**  Cookies do not work naturally for mobile apps
- **SPA/cross-origin**  CORS + cookies adds complexity

Token auth eliminates server-side session state. Any server can verify a token independently.

## 4. When to Use It

**Session Auth:** Traditional server-rendered web apps, applications needing instant revocation, simple monolithic deployments.

**Token Auth:** SPAs and mobile apps, microservice architectures, public APIs, clustered deployments, OAuth/OIDC flows.

## 5. When NOT to Use It / Tradeoffs

**Session Auth:** Horizontal scaling requires shared session store (Redis). CORS + SameSite issues. CSRF protection required. Mobile apps need custom cookie handling.

**Token Auth:** Cannot revoke instantly. Token size adds bandwidth (1-2 KB). Storage in browser is vulnerable (XSS). Refresh token rotation adds complexity. JWT verification adds CPU overhead.

## 6. How It Works (Deep Mechanics)

\`\`\`
SESSION FLOW:                        TOKEN FLOW:
Browser    Server    Redis           Client    Server
  |          |        |               |          |
  |--POST   |        |               |--POST   |
  |  /login |        |               |  /login |
  |-------->|--SET-->|               |-------->|
  |         |session |               |          |
  |<--Cookie| <------|               |<--JWT---|
  |         |        |               |          |
  |--GET    |        |               |--GET    |
  | Cookie  |--GET-->|               | Bearer  |
  |-------->| "abc"  |               | JWT     |
  |         |<--data-|               |-------->|
  |<--------|        |               |(verify  |
  |         |        |               | locally)|
  |         |        |               |<--------|
\`\`\`

## 7. Architecture Diagram

\`\`\`
SESSION-BASED:                     TOKEN-BASED:
+--------+   +---------+          +--------+   +---------+
| Client |   | Server  |          | Client |   | Server  |
+--------+   +----+----+          +--------+   +----+----+
     |            |                    |            |
+--------+   +----+----+          +--------+   +----+----+
| Load   |-> | Server  |          | Load   |-> | Server  |
|Balancer|   |   A     |          |Balancer|   |   A     |
+--------+   |(Redis)  |          +--------+   |(verify  |
     |       +---------+               |       | JWT)   |
     |            |                    |       +---------+
     |       +---------+               |            |
     +------>| Server  |               +------------+
             |   B     |                            |
             |(Redis)  |                       +---------+
             +---------+                       | Any     |
                  |                            | Server  |
             +---------+                       | (no    |
             |  Redis  |                       | state)  |
             +---------+                       +---------+
\`\`\`

## 8. Real-World Flow Example

**E-commerce Platform Migration:**
Phase 1 (Monolith, Session): Express.js + express-session + Redis. Cookie: httpOnly, secure, sameSite: lax. CSRF token in forms.
Phase 2 (Microservices, Token): Auth service issues JWTs. Each microservice validates locally using public key. Mobile app stores in iOS Keychain / Android Keystore. Refresh token in HTTP-only cookie.

## 9. Reference Implementation Example

\`\`\`typescript
import express from "express";
import session from "express-session";
import RedisStore from "connect-redis";
import Redis from "ioredis";
import jwt from "jsonwebtoken";

const app = express();
const redisClient = new Redis();

// Session-based
app.use(session({ store: new RedisStore({ client: redisClient }), secret: process.env.SESSION_SECRET!, resave: false, saveUninitialized: false, cookie: { httpOnly: true, secure: true, sameSite: "strict", maxAge: 3600000 } }));

app.post("/session/login", (req, res) => {
  const user = authenticateUser(req.body.email, req.body.password);
  if (!user) return res.status(401).send("Invalid credentials");
  req.session.userId = user.id;
  req.session.roles = user.roles;
  res.redirect("/dashboard");
});

app.post("/session/logout", (req, res) => {
  req.session.destroy(() => { res.clearCookie("connect.sid"); res.send("Logged out"); });
});

// Token-based
app.post("/token/login", (req, res) => {
  const user = authenticateUser(req.body.email, req.body.password);
  if (!user) return res.status(401).send("Invalid credentials");
  const accessToken = jwt.sign({ sub: user.id, roles: user.roles }, process.env.JWT_SECRET!, { expiresIn: "15m" });
  res.json({ accessToken });
});

function authenticateToken(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).send("Missing token");
  try { req.user = jwt.verify(token, process.env.JWT_SECRET!); next(); }
  catch { res.status(401).send("Invalid token"); }
}

app.get("/token/profile", authenticateToken, (req, res) => {
  res.json({ userId: req.user.sub, roles: req.user.roles });
});
\`\`\`

## 10. Real Company Use Cases

- **Stripe**  Token-based (API keys + JWTs for Connect)
- **GitHub**  Both: session cookie for web, tokens for API
- **Stack Overflow**  Session-based for web. Sessions in Redis cluster.
- **Shopify**  Both: session for admin (Rails + Redis), tokens for Storefront API

## 11. Common Interview Questions

1. "Compare session-based and token-based auth in terms of scalability."
2. "How do you handle token revocation vs session deletion?"
3. "What are the CSRF implications of each approach?"
4. "How does each approach handle mobile clients?"
5. "Design a hybrid auth system that uses both."
6. "Compare Redis lookups vs JWT verification performance."

## 12. Related Topics & Next Steps

- **JWT**  The most common token format
- **HTTP-Only Cookies**  Secure token storage for SPAs
- **CSRF Protection**  Required for cookie-based auth
- **SameSite Cookies**  Modern CSRF mitigation
- **Refresh Token Rotation**  Security best practices
- **OAuth 2.0 BFF**  Hybrid pattern`,
    estimatedMin: 12,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Stripe", "GitHub", "Stack Overflow", "Shopify"],
    tags: ["session-auth", "token-auth", "JWT", "cookies", "stateful-vs-stateless"]
  },
  {
    id: "lesson-02-10",
    slug: "apis-protocols-authentication-10-api-rate-limiting-throttling",
    title: "API Rate Limiting & Throttling",
    content: `## 1. Quick Summary

**Rate limiting** controls how many requests a client can make to an API within a given time window. **Throttling** is the server's response when a limit is exceeded  requests are delayed or rejected. Rate limiting protects APIs from abuse, ensures fair resource allocation, and maintains quality of service. Common algorithms: **Token Bucket**, **Leaky Bucket**, **Fixed Window**, **Sliding Window Log**, and **Sliding Window Counter**.

## 2. Definition

- **Rate Limit**: The maximum number of requests allowed per time window (e.g., 100 requests/minute).
- **Throttling**: The action taken when a rate limit is exceeded. Responses: \`429 Too Many Requests\` with \`Retry-After\` header, request queuing, or request dropping.
- **Quota**: A hard limit over a longer period (e.g., 10,000 requests/day).

**Rate Limit Headers (IETF draft):**
\`\`\`
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1716000900
Retry-After: 58
\`\`\`

## 3. Why It Exists / Problem It Solves

Without rate limiting: abusive clients exhaust server resources, DDoS attacks take down the API, noisy neighbor degrades service for all tenants, cost escalation in cloud environments. Rate limiting provides **fair resource distribution**, **abuse prevention**, **cost management**, and **predictable performance**.

## 4. When to Use It

- **Public APIs**  Essential for all public-facing APIs (GitHub, Stripe, Twitter)
- **Login endpoints**  Prevent brute-force password guessing
- **Resource-intensive operations**  Search, reports, data exports
- **Multi-tenant SaaS**  Enforce per-tenant quotas
- **Free tier plans**  Differentiate free vs paid usage

## 5. When NOT to Use It / Tradeoffs

- **Internal low-traffic APIs**  Overhead may not be justified
- **WebSocket connections**  Rate limiting is per-message, not per-request
- **Streaming responses**  Hard to apply traditional rate limiting

Tradeoffs: Adds latency (checking limits), distributed rate limiting is complex (Redis consistency), user experience impact (throttled requests fail), configuration management.

## 6. How It Works (Deep Mechanics)

**Algorithm Comparison:**
| Algorithm | Memory | Accuracy | Burst Handling | Complexity |
|-----------|--------|----------|----------------|------------|
| Fixed Window | Low | Low | Allows bursts at reset | Simple |
| Sliding Window Log | High | Perfect | Precise tracking | High |
| Token Bucket | Low | Good | Allows bursts | Simple |
| Leaky Bucket | Low | Good | Smooths bursts | Simple |

**Token Bucket:** Bucket with capacity of N tokens. Refills at R tokens/second. Each request consumes 1 token. If bucket is empty, request is denied.

**Fixed Window (Redis INCR):**
\`\`\`typescript
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = \`rl:\${userId}:\${Math.floor(Date.now() / 60000)}\`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  return count <= 100;
}
\`\`\`

## 7. Architecture Diagram

\`\`\`
+--------+   +-------------+   +-----------+   +----------+
| Client |-> | API Gateway |-> | Rate      |-> | Backend  |
|        |   |             |   | Limiter   |   | Service  |
+--------+   +-------------+   +-----------+   +----------+
                    |               |
                    |          +-----------+
                    |          |  Redis    |
                    |          | (counter) |
                    |          +-----------+
                    |
               +----------+
               | 429 Too Many Requests |
               | { error, retryAfter }  |
               +----------+
\`\`\`

## 8. Real-World Flow Example

**GitHub API Rate Limiting:**
1. Unauthenticated: 60/hour (by IP)
2. Authenticated: 5,000/hour (by user)
3. GitHub Apps: 5,000/min (higher tier)
4. Headers: \`X-RateLimit-Limit: 5000\`, \`X-RateLimit-Remaining: 4321\`, \`X-RateLimit-Reset: 1716000900\`
5. Limit exceeded: HTTP 403 with \`X-RateLimit-Remaining: 0\`
6. Conditional requests (ETag, If-None-Match) return 304 and do not reduce limit

## 9. Reference Implementation Example

\`\`\`typescript
import express from "express";
import { createClient } from "redis";

const app = express();
const redis = createClient({ url: "redis://localhost:6379" });

function rateLimiter(config: { windowMs: number; max: number }) {
  return async (req: any, res: any, next: any) => {
    const key = \`rl:\${req.ip}:\${Math.floor(Date.now() / config.windowMs)}\`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, Math.ceil(config.windowMs / 1000));
    const remaining = Math.max(0, config.max - count);
    const resetAt = Math.ceil((Math.floor(Date.now() / config.windowMs) + 1) * config.windowMs / 1000);
    res.setHeader("X-RateLimit-Limit", config.max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetAt);
    if (count > config.max) {
      return res.status(429).json({ error: "rate_limit_exceeded", retryAfter: Math.ceil((resetAt * 1000 - Date.now()) / 1000) });
    }
    next();
  };
}

app.use("/api/auth", rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use("/api/v1", rateLimiter({ windowMs: 60 * 1000, max: 100 }));

// Token Bucket
class TokenBucket {
  private tokens: number;
  private lastRefill: number = Date.now();
  constructor(private capacity: number, private refillRate: number) { this.tokens = capacity; }
  tryConsume(): boolean {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.lastRefill) / 1000) * this.refillRate);
    this.lastRefill = now;
    if (this.tokens >= 1) { this.tokens--; return true; }
    return false;
  }
}
\`\`\`

## 10. Real Company Use Cases

- **GitHub**  Tiered limits: 60/hr (unauth), 5,000/hr (auth), 5,000/min (Apps). Conditional requests exempt.
- **Twitter/X**  450 requests/15-min for v2 API. Separate limits for media, DMs, search.
- **Stripe**  100 read ops/s, 100 write ops/s per key. Idempotent requests do not count.
- **Google Maps API**  Per-key quota with $200/month free. 300 req/min rate limit.

## 11. Common Interview Questions

1. "Design a distributed rate limiter that works across multiple servers."
2. "Compare fixed window, sliding window log, and token bucket algorithms."
3. "How would you implement rate limiting for a multi-tenant SaaS API?"
4. "What headers should a rate-limited API return and why?"
5. "How do you handle rate limiting for WebSocket connections?"
6. "Design a rate limiting system for 1M requests/second."

## 12. Related Topics & Next Steps

- **API Quotas**  Long-term usage limits (daily, monthly)
- **Concurrency Limiting**  Limiting simultaneous connections
- **Circuit Breakers**  Protecting downstream services
- **Backpressure**  Flow control in distributed systems
- **Redis Lua Scripts**  Atomic rate limit operations`,
    estimatedMin: 12,
    difficulty: "INTERMEDIATE" as const,
    companies: ["GitHub", "Twitter", "Stripe", "Google"],
    tags: ["rate-limiting", "throttling", "Redis", "API-security", "429"]
  },
  {
    id: "lesson-02-11",
    slug: "apis-protocols-authentication-11-api-versioning-strategies",
    title: "API Versioning Strategies",
    content: `## 1. Quick Summary

**API versioning** is the practice of managing changes to an API without breaking existing clients. Strategies include **URI path versioning** (\`/v1/users\`), **header versioning** (\`Accept: application/vnd.myapp.v2+json\`), **query parameter versioning** (\`?version=2\`), and **no versioning** (backward-compatible evolution). The right strategy depends on API maturity, client control, and change frequency.

## 2. Definition

API versioning allows multiple API versions to coexist. Strategies:
1. **URI Path**  \`/api/v1/users\`. Most common, simplest to route.
2. **Request Header**  \`Accept: application/vnd.myapp.v2+json\`. Clean URLs, harder to test.
3. **Query Parameter**  \`/api/users?version=2\`. Simple but clutters URLs.
4. **Custom Header**  \`X-API-Version: 2\`. No standard, hidden from docs.
5. **No Versioning**  Add fields but never remove. Requires strict discipline.

## 3. Why It Exists / Problem It Solves

Without versioning: every API change breaks existing clients, mobile apps on old versions stop working, third-party integrators face unpredictable behavior. Versioning enables **safe evolution**, **gradual migration**, **graceful deprecation**.

## 4. When to Use It

- **Public APIs** consumed by third parties (Stripe, Twilio, GitHub)
- **Mobile backends** where app versions are out of your control
- **APIs with long-lived integrations** (enterprise customers)
- **Breaking changes**  removing fields, changing types, altering behavior

## 5. When NOT to Use It / Tradeoffs

- **Internal microservices**  Use backward compatibility and contract testing
- **Early-stage products**  Premature versioning adds complexity
- **GraphQL APIs**  Schema evolution via deprecation (no separate versions)

Tradeoffs: Multiple code paths to maintain, increased testing surface, legacy version tech debt.

## 6. How It Works (Deep Mechanics)

\`\`\`typescript
import express from "express";
const app = express();

// URI Path Versioning
const v1 = express.Router();
v1.get("/users", (req, res) => { res.json({ users: [{ id: 1, name: "Alice", email: "alice@old.com" }] }); });
const v2 = express.Router();
v2.get("/users", (req, res) => { res.json({ users: [{ id: 1, name: "Alice", phone: "+1-555-0100" }] }); });
app.use("/api/v1", v1);
app.use("/api/v2", v2);

// Header Versioning
app.get("/api/orders", (req, res) => {
  if ((req.headers.accept || "").includes("version=2")) return handleV2();
  return handleV1();
});

// Version Lifecycle: ACTIVE -> DEPRECATED -> SUNSET -> REMOVED
\`\`\`

## 7. Architecture Diagram

\`\`\`
     API Gateway
          |
    +-----+------+
    |     |      |
   /v1   /v2   /v3
    |     |      |
    v     v      v
+------+ +------+ +------+
| v1   | | v2   | | v3   |
| Ctrl | | Ctrl | | Ctrl |
+------+ +------+ +------+
   |        |        |
   +--------+--------+
            |
   +--------+--------+
   | Service Layer   |
   | (shared logic)  |
   +-----------------+
\`\`\`

## 8. Real-World Flow Example

**Stripe API Versioning (date-based header):**
1. Client sets version in dashboard: "API version: 2023-10-16"
2. Request includes \`Stripe-Version: 2023-10-16\` header
3. Stripe processes using that version's logic
4. New versions do not affect existing clients
5. Clients get "pending upgrade" email when 2+ years behind
6. All requests go to /v1/ regardless of version

## 9. Reference Implementation Example

\`\`\`typescript
import express from "express";
const app = express();

function deprecateVersion(sunsetDate: string, migrationUrl: string) {
  return (req: any, res: any, next: any) => {
    res.setHeader("Sunset", sunsetDate);
    res.setHeader("Link", \`<\${migrationUrl}>; rel="deprecation"\`);
    next();
  };
}

const v1 = express.Router();
v1.get("/users", (req, res) => { res.json({ users: [{ id: 1, name: "Alice", email: "alice@legacy.com" }], version: "v1" }); });

const v2 = express.Router();
v2.get("/users", (req, res) => { res.json({ users: [{ id: 1, name: "Alice", phone: "+1-555-0100" }], version: "v2" }); });

app.use("/api/v1", deprecateVersion("2025-06-30", "https://docs.example.com/v2"), v1);
app.use("/api/v2", v2);

app.get("/api/v1/sunset", (req, res) => {
  res.status(410).json({ error: "This version has been sunset", message: "Migrate to v2" });
});
\`\`\`

## 10. Real Company Use Cases

- **Stripe**  Date-based header versioning. Weekly releases. Versions maintained for 2+ years.
- **Twilio**  URI path: \`/2010-04-01/Accounts/\`. Version as date in URL.
- **GitHub**  Media type: \`Accept: application/vnd.github.v3+json\`. V3 active 10+ years.
- **Salesforce**  URI path with major.minor: \`/services/data/v58.0/\`.

## 11. Common Interview Questions

1. "Compare URI path vs header-based versioning for a public API."
2. "How do you handle versioning in a microservice architecture?"
3. "What is the deprecation process for an API version?"
4. "How do you test API clients against new versions before migration?"
5. "How does GraphQL avoid the need for API versioning?"
6. "Design an API that can evolve without versioning."

## 12. Related Topics & Next Steps

- **OpenAPI Versioning**  Documenting versioned APIs
- **Semantic Versioning**  MAJOR.MINOR.PATCH for APIs
- **Backward Compatibility**  Field addition, nullable fields, defaults
- **API Deprecation Policies**  Sunset headers, deprecation notices
- **Contract Testing**  Pact, Spring Cloud Contract`,
    estimatedMin: 10,
    difficulty: "BEGINNER" as const,
    companies: ["Stripe", "Twilio", "GitHub", "Google"],
    tags: ["API-versioning", "backward-compatibility", "deprecation", "OpenAPI"]
  },
  {
    id: "lesson-02-12",
    slug: "apis-protocols-authentication-12-idempotency-in-apis",
    title: "Idempotency in APIs",
    content: `## 1. Quick Summary

**Idempotency** is the property that performing the same operation multiple times produces the same result as performing it once. In APIs, an idempotent endpoint guarantees that multiple identical requests have the same effect as a single request. Idempotency is critical for **safe retries** in distributed systems where network failures, timeouts, and duplicates are inevitable. Clients provide an **idempotency key** header; servers detect duplicates and return the original response.

## 2. Definition

An operation is **idempotent** if \`f(f(x)) = f(x)\`. For HTTP methods:
- **GET**: Idempotent by default.
- **PUT**: Idempotent. Replacing a resource with the same representation has the same effect.
- **DELETE**: Idempotent. Deleting an already-deleted resource returns the same result.
- **PATCH**: Not inherently idempotent. JSON Merge Patch is idempotent; JSON Patch may not be.
- **POST**: Not idempotent. Multiple creates produce multiple resources.

**Idempotency Key**: A unique identifier (UUID) supplied by the client in an \`Idempotency-Key\` header. The server uses it to detect and reject duplicates.

## 3. Why It Exists / Problem It Solves

In distributed systems, failures are inevitable:
- Client sends POST /charges, timeout, retries ? **double charge**!
- PUT /users/123 retry ? safe (PUT is idempotent)
- PATCH /inventory/decrement retry ? **oversold inventory**!

Idempotency solves: duplicate processing, inconsistent state, financial errors, and unreliable retries without distributed transactions.

## 4. When to Use It

- **Payment processing**  Charge, refund, transfer operations (critical)
- **Order creation**  Prevent duplicate orders on retry
- **Resource creation**  POST endpoints where duplicates are harmful
- **Any side-effect operation**  Sending emails, provisioning resources
- **Client retry logic**  All non-idempotent mutating endpoints

## 5. When NOT to Use It / Tradeoffs

- **Read operations**  GET is already idempotent
- **Operations that should repeat**  Logging, analytics tracking
- **High-throughput, low-risk operations**  Cost may not justify guarantee

Tradeoffs: Storage cost (keys + responses), lookup latency, key management (expiration, cleanup), key collision risk.

## 6. How It Works (Deep Mechanics)

\`\`\`
Client                                    Server
  |-- POST /charges (idempotency-key: u1) -->|
  |  (Key not found ? process)              |
  |<-- 200 { id: "ch_1" }                   |
  |  (Store response by key)                |
  |                                         |
  |  [Network failure  retry]              |
  |                                         |
  |-- POST /charges (idempotency-key: u1) -->|
  |  (Key found ? return cached response)   |
  |<-- 200 { id: "ch_1" } (replayed)        |
\`\`\`

**Implementation Details:**
- Keys must be unique per client+endpoint
- Keys have TTL (typically 24 hours)
- Store original request body and full response
- Same key + different body ? 422 Unprocessable Entity
- Use atomic check-and-set (Redis SET NX)

## 7. Architecture Diagram

\`\`\`
CLIENT          API SERVER            IDEMPOTENCY STORE
  |                 |                       |
  |--- POST ------->|                       |
  |  Idem-Key: u1   |--- GET {u1} --------->|
  |                 |    (not found)        |
  |                 |<--- nil --------------|
  |                 |                       |
  |                 |--- Process request    |
  |                 |                       |
  |                 |--- SET {u1} --------->|
  |                 |    { status, body }   |
  |                 |    TTL: 86400         |
  |                 |<--- OK --------------|
  |<-- 200 ---------|                       |
  |                 |                       |
  | [RETRY]         |                       |
  |                 |                       |
  |--- POST ------->|                       |
  |  Idem-Key: u1   |--- GET {u1} --------->|
  |                 |<--- { status, body } -|
  |<-- 200 (replay)-|                       |
\`\`\`

## 8. Real-World Flow Example

**Stripe Payment Intent Creation:**
1. Mobile app creates PaymentIntent: \`POST /v1/payment_intents\`
2. App sends \`Idempotency-Key: pi_create_abc123\`
3. Stripe creates PaymentIntent, network drops before response
4. App retries with same idempotency key
5. Stripe detects duplicate, returns original PaymentIntent
6. No duplicate charge created
7. Key expires after 24 hours

## 9. Reference Implementation Example

\`\`\`typescript
import express from "express";
import { createClient } from "redis";
import crypto from "crypto";

const app = express();
app.use(express.json());
const redis = createClient({ url: "redis://localhost:6379" });

function idempotent(options: { ttl: number }) {
  return async (req: any, res: any, next: any) => {
    const idempotencyKey = req.headers["idempotency-key"] as string;
    if (!idempotencyKey) return next();

    const storageKey = \`idem:\${idempotencyKey}:\${req.path}\`;
    const claimed = await redis.set(storageKey, "processing", { NX: true, EX: options.ttl });
    if (!claimed) {
      const cached = await redis.get(\`\${storageKey}:response\`);
      if (cached) {
        const { statusCode, body } = JSON.parse(cached);
        res.set("Idempotent-Replayed", "true");
        return res.status(statusCode).json(body);
      }
      return res.status(409).json({ error: "Request is being processed" });
    }
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      redis.set(\`\${storageKey}:response\`, JSON.stringify({ statusCode: res.statusCode, body }), { EX: options.ttl });
      return originalJson(body);
    };
    next();
  };
}

app.post("/charges", idempotent({ ttl: 86400 }), (req, res) => {
  res.json({ id: \`ch_\${crypto.randomUUID()}\`, amount: req.body.amount, status: "succeeded" });
});

// Retry-safe client
async function createChargeWithRetry(chargeData: any, maxRetries = 3): Promise<any> {
  const idempotencyKey = crypto.randomUUID();
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch("http://api.example.com/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(chargeData),
      });
      if (res.ok) return res.json();
    } catch {
      if (attempt < maxRetries - 1) await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      else throw new Error("All retries failed");
    }
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Stripe**  Gold standard. Every mutating endpoint supports \`Idempotency-Key\`. 24-hour TTL. Returns \`Idempotent-Replayed: true\`.
- **Square**  \`idempotency_key\` required for all payment endpoints. 45-day retention.
- **PayPal**  \`PayPal-Request-Id\` header. Used across Payments, Payouts, Invoicing.
- **AWS**  \`IdempotencyToken\` for certain EC2 and Step Functions API calls.

## 11. Common Interview Questions

1. "What is idempotency and why is it important in API design?"
2. "Which HTTP methods are inherently idempotent and why?"
3. "Design an idempotent payment API endpoint."
4. "How do you implement idempotency for a POST /orders endpoint?"
5. "What happens if a client sends the same idempotency key with a different body?"
6. "How long should idempotency keys be stored? Tradeoffs?"
7. "How do you handle race conditions in idempotency key checking?"

## 12. Related Topics & Next Steps

- **Exactly-Once Delivery**  Guaranteeing message delivery semantics
- **Distributed Transactions**  Two-phase commit, Saga pattern
- **Retry Strategies**  Exponential backoff, jitter, circuit breakers
- **Optimistic Locking**  Version-based concurrency control
- **Saga Pattern**  Long-running transactions with compensation
- **Webhook Retries**  Idempotent webhook delivery`,
    estimatedMin: 13,
    difficulty: "ADVANCED" as const,
    companies: ["Stripe", "Square", "PayPal", "AWS"],
    tags: ["idempotency", "retries", "distributed-systems", "payment", "POST"]
  },
];
