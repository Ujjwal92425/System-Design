## 1. Hook

A good library has clear shelves. Fiction is not mixed with tax forms.
Every book has a stable label. If you want to borrow, return, reserve,
or search, the librarian does not invent a new ritual each time. The
rules are boring on purpose, because boring rules let many people use
the library without asking the librarian to explain everything.

RESTful API design is the same idea for web services. Resources have
names. Standard HTTP methods describe actions. Status codes tell the
result. Caches and clients can reason about the system because the
rules are predictable.

REST is not "JSON over HTTP." It is a style of making networked
resources understandable and evolvable.

## 2. What Is It

(a) Plain-English one-liner: REST API design exposes resources through
stable URLs and uses HTTP methods, status codes, headers, and
representations consistently.

(b) Formal definition: Representational State Transfer (REST) is an
architectural style for distributed hypermedia systems. In practical
HTTP API design, REST emphasizes resources identified by URIs, uniform
interface semantics, stateless requests, cacheability, layered systems,
and representations transferred through media types. HTTP semantics
such as GET, POST, PUT, PATCH, DELETE, status codes, cache headers, and
content negotiation are part of the contract (see:
MOD-01/02-http1-vs-http2-vs-http3-quic).

## 3. The Problem It Solves

Before REST discipline, APIs become a pile of verbs:
`/createUser`, `/deleteUser`, `/getAllUsers`, `/doPaymentThing`.
Clients memorize custom behavior for every endpoint. Caching is
unclear. Retries are dangerous. Errors are inconsistent.

After REST discipline, APIs expose resources:
`GET /users/42`, `PATCH /users/42`, `POST /orders`, `DELETE
/sessions/current`. Method semantics tell clients which calls are safe
or idempotent. Status codes and response bodies are consistent.

REST solves API predictability. It gives clients and servers a shared
language based on HTTP instead of a private vocabulary per endpoint.

## 4. Core Concept Breakdown

- **Resource:** named thing or collection, such as users, orders, or
  invoices.
- **Representation:** JSON, XML, HTML, or another format describing a
  resource state.
- **URI:** stable address for a resource or collection.
- **GET:** safe read operation that should not change server state.
- **POST:** create subordinate resource or submit non-idempotent action.
- **PUT:** replace a resource at a known URI.
- **PATCH:** partially update a resource.
- **DELETE:** remove or deactivate a resource.
- **Status code:** machine-readable outcome category.
- **Statelessness:** every request carries enough context for the
  server to process it.

## 5. How It Works

Step by step, designing an orders API:

1. **Name resources, not functions.** Use `/orders`, `/orders/{id}`,
   `/users/{id}/orders`.
2. **Choose methods by semantics.** `GET /orders/123` reads; `POST
   /orders` creates.
3. **Return meaningful status codes.** Use 201 for created, 404 for
   missing, 409 for conflict, 422 for validation.
4. **Keep requests stateless.** Auth token, idempotency key, and body
   carry necessary context.
5. **Use representations deliberately.** JSON fields should be stable
   and documented.
6. **Make safe operations safe.** GET should not charge a card or send
   email.
7. **Make idempotent operations idempotent.** PUT and DELETE should
   tolerate repeats.
8. **Design errors as contracts.** Include code, message, and details.
9. **Use pagination for collections.** Cursor pagination beats giant
   unbounded lists.
10. **Version carefully.** Add fields compatibly; break contracts only
    with explicit versioning (see: MOD-02/11-api-versioning-strategies).

Design review checks:

- **Can a client infer behavior from method and status code?**
- **Are mutations idempotent where retries are expected?**
- **Can collections be paginated and filtered predictably?**
- **Do errors help clients recover without parsing prose?**

## 6. Diagram

This lesson intentionally has no Mermaid diagram because the metadata
marks the diagram type as `none`. REST is a naming and semantic design
style; a single component diagram would add little compared with
method, status, and resource examples. The comparison tables and API
examples carry the teaching value here.

<!-- IMAGE: annotated REST endpoint table showing resource URI, HTTP
method, request body, success status, and retry safety for an orders API -->

## 7. When to Use It

Use REST-style HTTP APIs when:

- **You expose resource-oriented CRUD and workflows.**
- **Browser, mobile, and third-party clients need broad compatibility.**
- **Caching, proxies, and HTTP tooling are useful.**
- **Human-readable JSON contracts are more valuable than binary RPC
  efficiency.**

## 8. When NOT to Use It

- **Do not force REST onto high-throughput internal RPC.** gRPC may be
  better for typed low-latency service calls.
- **Do not model everything as CRUD.** Some workflows need actions, but
  name them carefully.
- **Do not use GET for mutations.** Caches, crawlers, and retries can
  trigger it.
- **Do not return 200 for every outcome.** Clients need real status
  semantics.

## 9. Real-World Example

**Stripe's API** is a strong public example of resource naming,
idempotency keys, predictable errors, pagination, and careful versioning.

**GitHub's REST API** uses resources, HTTP verbs, pagination, ETags,
rate-limit headers, and status codes in a way clients can automate.

Realistic number: a public API with 100 endpoints can become
unmaintainable if each endpoint invents its own errors and pagination.
Consistent patterns reduce SDK and documentation cost dramatically.

## 10. Production-Grade Code

```typescript
import http from "node:http";

type ApiError = { code: string; message: string; details?: unknown };

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendError(res: http.ServerResponse, status: number, error: ApiError): void {
  sendJson(res, status, { error });
}

http.createServer((req, res) => {
  if (req.method === "GET" && req.url?.startsWith("/orders/")) {
    const id = req.url.split("/")[2];
    if (!id) return sendError(res, 400, { code: "bad_request", message: "missing order id" });
    return sendJson(res, 200, { id, status: "created" });
  }

  if (req.method === "POST" && req.url === "/orders") {
    // Creation uses POST because the server owns the new resource ID.
    // Real systems should pair this with idempotency keys for safe
    // retries, especially around payments.
    return sendJson(res, 201, { id: "ord_123", status: "created" });
  }

  sendError(res, 404, { code: "not_found", message: "route not found" });
}).listen(8080);
```

Why-not-what notes:

- Errors use stable codes because clients should not parse English
  messages for control flow.
- POST creation returns 201 because the server created a resource.
- The handler uses HTTP method and path semantics rather than custom
  verb endpoints.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Uses standard HTTP semantics | Can be under-specified without discipline | API style guide |
| Works with browsers, proxies, and caches | JSON can be verbose | Compression and pagination |
| Easy for humans and tools to inspect | Weak typing compared with IDL systems | OpenAPI or schema validation |
| Resource model is intuitive | Complex workflows can be awkward | Careful action resource design |
| Broad ecosystem and SDK support | Versioning public contracts is hard | Compatibility policy |

## 12. Comparison Table

| Approach | Contract style | Best fit | Strength | Caveat |
|---|---|---|---|---|
| REST | resources and HTTP semantics | public APIs | compatibility | less strict typing |
| GraphQL | client-selected graph | complex read views | avoids overfetching | resolver cost |
| gRPC | typed service methods | internal RPC | performance and schema | browser friction |
| Webhooks | server-to-server callbacks | event notification | async integration | retry and security burden |

## 13. Numbers & Benchmarks

- **2xx:** success; **3xx:** redirection; **4xx:** client errors;
  **5xx:** server errors.
- **GET safety:** should not mutate business state.
- **PUT and DELETE:** should be idempotent by HTTP semantics.
- **Pagination:** unbounded collection responses are a common outage
  source.
- **Public API lifetime:** breaking fields may need support for months
  or years once third-party clients depend on them.

## 14. Common Pitfalls

- **Incident: GET triggered email.** A crawler followed a link and sent
  thousands of reminder emails.
- **Incident: every error was 200.** SDKs treated failed payments as
  success because status code carried no meaning.
- **Incident: unbounded list endpoint.** `GET /events` returned
  millions of rows and exhausted memory.

## 15. Interview Q&A

**Q1. What makes an API RESTful?** Model answer: resource-oriented URIs,
standard HTTP methods, stateless requests, representations, status
codes, and cache semantics.

**Q2. POST vs PUT?** Model answer: POST usually creates under a
collection or submits an action where server decides ID; PUT replaces a
resource at a known URI and should be idempotent.

**Q3. What status for validation error?** Model answer: 400 or 422 are
common; choose one consistently and include machine-readable details.

**Q4. Why is GET safe important?** Model answer: caches, browsers,
crawlers, and prefetchers may repeat GET without user intent.

**Q5. How do you design errors?** Model answer: stable error code,
human message, field details, request ID, and documentation.

## 16. Follow-up / Curveball Questions

**Curveball 1. Need `/orders/{id}/cancel`. Is that REST?** Answer
direction: acceptable if modeled as a domain action; consider `POST
/orders/{id}/cancellations` when cancellation is a resource.

**Curveball 2. Client retries `POST /orders` and creates duplicates.**
Answer direction: add idempotency keys or client-provided request IDs
(see: MOD-02/12-idempotency-in-apis).

**Curveball 3. Need one screen with ten resources.** Answer direction:
REST can compose client-side, but GraphQL, BFF, or read models may be
better for complex views.

## 17. Cheat-Sheet Summary

- REST means resource names plus HTTP semantics, not just JSON.
- GET is safe; PUT and DELETE are idempotent; POST is flexible.
- Status codes and error bodies are part of the API contract.
- Paginate collections and design retries deliberately.
- Prefer compatible evolution over breaking version churn.

## 18. Further Reading

- RFC 9110, "HTTP Semantics":
  https://www.rfc-editor.org/rfc/rfc9110
- Microsoft REST API Guidelines:
  https://github.com/microsoft/api-guidelines
- Stripe API documentation:
  https://docs.stripe.com/api

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (library analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (verb endpoints before, resources after)
4. Core Concept Breakdown - Covered (10 concepts)
5. How It Works - Covered (10 steps plus design checks)
6. Diagram - Covered with required no-diagram justification and image placeholder
7. When to Use It - Covered (4 triggers)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (Stripe, GitHub, endpoint consistency)
10. Production-Grade Code - Covered (TypeScript HTTP API skeleton)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (4 approaches)
13. Numbers & Benchmarks - Covered (5 figures)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 URL-backed sources)

No em-dashes. No emojis. Cross-links included.
