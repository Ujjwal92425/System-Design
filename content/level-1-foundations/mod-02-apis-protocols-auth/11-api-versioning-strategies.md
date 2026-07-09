## 1. Hook

A city cannot change every road sign overnight and expect every driver
to know the new names by morning. It adds new signs, keeps old names
for a while, publishes maps, and eventually retires the old routes.

APIs are roads for software clients. Once clients depend on them,
changing them abruptly breaks traffic.

API versioning is how you evolve the road system without stranding
clients.

## 2. What Is It

(a) Plain-English one-liner: API versioning is the practice of changing
API contracts in a controlled way so old and new clients can coexist.

(b) Formal definition: API versioning is a compatibility strategy for
evolving request and response contracts, behavior, schemas, and
semantics over time. It includes compatible changes, breaking changes,
version identifiers, deprecation policies, migration windows, and
client communication. Common strategies include URI versioning, header
versioning, media-type versioning, date-based versions, and
compatibility-first evolution (see: MOD-02/01-rest-api-design-principles).

## 3. The Problem It Solves

Before versioning discipline, a backend removes a field because the new
web app no longer needs it. Mobile users on older app versions crash.
Third-party integrations silently break. Support learns from angry
customers.

After versioning discipline, additive changes happen safely. Breaking
changes get a new version or long deprecation window. Usage telemetry
shows which clients still depend on old fields. Docs explain migration.

Versioning solves contract evolution. It is less about URL style and
more about compatibility promises.

## 4. Core Concept Breakdown

- **Compatible change:** change old clients can ignore, such as adding
  optional response field.
- **Breaking change:** removal, rename, required field, type change, or
  semantic change that old clients cannot handle.
- **Deprecation:** announced plan to remove or change behavior later.
- **Sunset:** final date old behavior stops.
- **URI version:** `/v1/orders`.
- **Header version:** version selected by request header.
- **Media type version:** version in `Accept` or `Content-Type`.
- **Date version:** behavior pinned to date, common in some SaaS APIs.
- **Capability negotiation:** client declares supported features.
- **Consumer-driven contracts:** tests from client expectations.

## 5. How It Works

Step by step, evolving an orders API:

1. **Classify the change.** Additive, behavior-changing, or breaking.
2. **Prefer compatible additions.** Add optional fields instead of
   replacing old fields.
3. **Measure usage.** Logs show which clients use old version or field.
4. **Announce deprecation.** Include date, replacement, and migration
   docs.
5. **Support both versions.** Route or branch behavior deliberately.
6. **Add contract tests.** Old clients should keep passing.
7. **Expose version in response.** Debugging needs to know behavior
   served.
8. **Migrate SDKs first.** Make the easiest path the safe path.
9. **Enforce sunset only after adoption.** Use telemetry, not hope.
10. **Delete old code.** Versioning without retirement becomes
    permanent complexity.

Design review checks:

- **Is this truly breaking?**
- **Which clients are affected?**
- **What is the deprecation window?**
- **How will old code be removed?**

## 6. Diagram

This lesson intentionally has no Mermaid diagram because the metadata
marks the diagram type as `none`. API versioning is a policy and
compatibility topic; a timeline table and checklist are clearer than a
component diagram.

<!-- IMAGE: API deprecation timeline showing v1 active, v2 introduced,
deprecation notice, migration window, sunset date, and v1 removal -->

## 7. When to Use It

Use explicit versioning when:

- **Public or mobile clients cannot all update immediately.**
- **Breaking changes are unavoidable.**
- **Third-party integrations depend on stable behavior.**
- **Regulated customers need migration notice.**
- **SDKs and docs must support multiple client generations.**

## 8. When NOT to Use It

- **Do not version for every additive field.** Compatible evolution is
  cheaper.
- **Do not keep old versions forever without a business reason.**
- **Do not change semantics under the same version silently.**
- **Do not rely on docs alone.** Enforce with contract tests and
  telemetry.

## 9. Real-World Example

**Stripe** uses date-based API versions so accounts can pin behavior
and upgrade deliberately.

**GitHub REST API** uses explicit API version headers and deprecation
communication.

**Mobile APIs** often need long compatibility windows because users
upgrade apps gradually.

Realistic number: if 10 percent of mobile users remain on an old app
for 90 days, a breaking API change needs at least that long of a
compatibility path unless old clients are force-upgraded.

## 10. Production-Grade Code

```typescript
type Order = { id: string; totalCents: number; currency: string };

export function serializeOrder(order: Order, version: "2024-01-01" | "2026-01-01") {
  if (version === "2024-01-01") {
    return {
      id: order.id,
      amount: order.totalCents,
      currency: order.currency,
    };
  }
  // New versions can improve names, but old versions must keep their
  // contract until the sunset date. Compatibility is behavior, not
  // just path names.
  return {
    id: order.id,
    total: { cents: order.totalCents, currency: order.currency },
  };
}
```

Why-not-what notes:

- Versioning is implemented at serialization boundary so domain model
  does not fork unnecessarily.
- Date-like versions make behavior pinning explicit.
- Production systems log requested version and response version.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Protects old clients | Multiple versions increase code paths | Sunset discipline |
| Enables breaking improvements | Docs and SDKs multiply | Developer relations |
| Makes migrations explicit | Version negotiation can confuse clients | Clear policy |
| Supports mobile upgrade lag | Old bugs may persist longer | Backport decisions |
| Telemetry-driven removal is safer | Instrumentation required | Client identification |

## 12. Comparison Table

| Strategy | Example | Best fit | Pros | Cons |
|---|---|---|---|---|
| URI version | `/v1/orders` | simple public APIs | visible | resource URLs change |
| Header version | `API-Version` | controlled clients | clean URLs | less discoverable |
| Media type | `application/vnd.app.v2+json` | hypermedia APIs | HTTP-pure | awkward tooling |
| Date version | `2026-01-01` | SaaS APIs | precise behavior pinning | many versions |
| Compatibility-first | no explicit version | internal APIs | low overhead | requires discipline |

## 13. Numbers and Benchmarks

- **Additive fields:** usually safe if clients ignore unknown fields.
- **Breaking changes:** field removal, type change, required new input,
  or semantic change.
- **Deprecation window:** public APIs often need months.
- **Version count:** each supported version adds test and docs cost.
- **Telemetry:** version usage should be measured before sunset.

## 14. Common Pitfalls

- **Incident: removed field broke mobile.** Old app version crashed
  because response field disappeared.
- **Incident: same version changed meaning.** `status=complete` changed
  from paid to shipped, breaking analytics.
- **Incident: old version never removed.** Four versions remained and
  every feature required duplicate implementation.

## 15. Interview Q&A

**Q1. What is a breaking API change?** Model answer: any change that
can make an existing correct client fail or behave differently.

**Q2. Best versioning strategy?** Model answer: depends on clients and
contract. Prefer compatible evolution; use explicit versions for
breaking changes.

**Q3. URI vs header versioning?** Model answer: URI is visible and
simple; header keeps resource paths stable but is less discoverable.

**Q4. How do you remove an old version?** Model answer: announce,
measure usage, provide migration docs, update SDKs, set sunset, then
delete after adoption.

**Q5. Are new response fields breaking?** Model answer: they should not
be if clients follow JSON compatibility rules, but brittle clients may
still break.

## 16. Follow-up / Curveball Questions

**Curveball 1. Client parses enum exhaustively.** Answer direction:
adding enum values may be breaking for that client. Document unknown
handling.

**Curveball 2. Legal requires behavior change immediately.** Answer
direction: communicate emergency change, version if possible, add
compatibility shim, and monitor client impact.

**Curveball 3. Internal API has one client.** Answer direction: version
may be unnecessary; coordinate deploys and use contract tests.

## 17. Cheat-Sheet Summary

- Versioning protects clients while APIs evolve.
- Prefer compatible additions over breaking changes.
- Breaking changes need explicit version or deprecation path.
- Measure usage before sunsetting old behavior.
- Delete old versions or versioning becomes permanent debt.

## 18. Further Reading

- Stripe API versioning:
  https://docs.stripe.com/api/versioning
- GitHub API versioning:
  https://docs.github.com/en/rest/about-the-rest-api/api-versions
- Microsoft REST API Guidelines, versioning:
  https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#api-versioning

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (city road signs analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (breaking clients before, controlled evolution after)
4. Core Concept Breakdown - Covered (10 concepts)
5. How It Works - Covered (10 steps plus design checks)
6. Diagram - Covered with required no-diagram justification and image placeholder
7. When to Use It - Covered (5 triggers)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (Stripe, GitHub, mobile lag)
10. Production-Grade Code - Covered (TypeScript versioned serializer)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (5 strategies)
13. Numbers and Benchmarks - Covered (5 facts)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 URL-backed sources)

No em-dashes. No emojis. Cross-links included.
