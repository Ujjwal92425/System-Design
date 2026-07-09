## 1. Hook

At an airport, the first question is "Who are you?" A passport answers
that. The second question is "Are you allowed to enter this lounge or
board this flight?" A boarding pass, ticket class, and staff role
answer that.

Authentication is the passport check. Authorization is the permission
check.

Confusing the two creates security bugs. Knowing someone's identity
does not mean they can access every resource.

## 2. What Is It

(a) Plain-English one-liner: authentication verifies who a user or
system is, while authorization decides what that identity is allowed to
do.

(b) Formal definition: authentication is the process of establishing
the identity of a principal using credentials such as passwords,
sessions, certificates, tokens, biometrics, or keys. Authorization is
the process of evaluating policies to decide whether an authenticated
or anonymous principal may perform an action on a resource in a
context. Common authorization models include RBAC, ABAC, ACLs, and
policy-based access control.

## 3. The Problem It Solves

Before separating the concepts, systems check "logged in" and then
allow too much. A user authenticates successfully and can read another
user's invoice because the endpoint never checks ownership.

After separation, login proves identity. Every sensitive action checks
permission: user, resource, action, tenant, role, ownership, and
context. A support agent can view tickets but not issue refunds. A
customer can read only their own orders.

The distinction solves access-control clarity. Identity is necessary,
but permission is the real security decision.

## 4. Core Concept Breakdown

- **Principal:** user, service, device, or workload making a request.
- **Credential:** proof used to authenticate, such as password or key.
- **Session:** server-side remembered authentication state.
- **Token:** client-carried claim set or reference to auth state.
- **Resource:** object being accessed, such as order or document.
- **Action:** operation requested, such as read, update, delete, refund.
- **Role:** named bundle of permissions.
- **Policy:** rule deciding whether access is allowed.
- **Tenant boundary:** organization or account isolation dimension.
- **Least privilege:** grant only permissions needed.

## 5. How It Works

Step by step, handling `GET /orders/ord_123`:

1. **Extract credentials.** Cookie, bearer token, mTLS cert, or API key.
2. **Authenticate principal.** Verify credential and establish identity.
3. **Load request context.** Tenant, route, IP, device, and risk signal.
4. **Load resource metadata.** Order owner and tenant are needed.
5. **Evaluate authorization.** Can this principal read this order?
6. **Deny by default.** Missing policy should not mean allow.
7. **Return 401 or 403 correctly.** 401 means not authenticated; 403
   means authenticated but forbidden.
8. **Log decision.** Security investigations need who, action, resource,
   and result.
9. **Avoid trusting client claims alone.** Re-check resource ownership
   server-side.
10. **Test cross-tenant cases.** Authorization bugs often hide there.

Design review checks:

- **Who is the principal?**
- **What resource and action are being authorized?**
- **Where is tenant isolation enforced?**
- **What is the deny-by-default behavior?**

## 6. Diagram

This lesson intentionally has no Mermaid diagram because the metadata
marks the diagram type as `none`. The core teaching is a conceptual
distinction and policy checklist, not a flow shape. A diagram would
mostly repeat "identity then permission" without adding much value.

<!-- IMAGE: airport checkpoint visual with passport check labeled
authentication and lounge boarding-pass check labeled authorization -->

## 7. When to Use It

Use explicit authentication and authorization design when:

- **Any protected resource exists.**
- **Multi-tenant data must be isolated.**
- **Roles or permissions differ by user.**
- **Services call other services.** Workload identity matters too.
- **Audit and compliance are required.**

## 8. When NOT to Use It

- **Do not treat login as authorization.**
- **Do not trust user ID from request body for ownership.**
- **Do not encode every permission only in frontend UI.**
- **Do not make admins all-powerful without audit and step-up controls.**

## 9. Real-World Example

**GitHub** authenticates users through sessions, tokens, SSH keys, or
OAuth apps, then authorizes actions based on repository membership,
organization roles, branch protection, and token scopes.

**AWS IAM** separates principal authentication from policy evaluation
over actions and resources.

Realistic number: a SaaS app with 20 endpoints and 5 roles already has
100 role-endpoint combinations before resource ownership and tenant
rules. Central policy helpers prevent drift.

## 10. Production-Grade Code

```typescript
type Principal = { id: string; roles: string[]; tenantId: string };
type Order = { id: string; ownerId: string; tenantId: string };

export function canReadOrder(principal: Principal, order: Order): boolean {
  if (principal.tenantId !== order.tenantId) return false;
  if (principal.roles.includes("support")) return true;
  return principal.id === order.ownerId;
}

export function requireOrderRead(principal: Principal | null, order: Order): void {
  if (!principal) throw new Error("401 unauthenticated");
  // Authorization uses server-loaded order ownership. It never trusts a
  // client-provided ownerId because that would let users authorize
  // themselves by editing the request body.
  if (!canReadOrder(principal, order)) throw new Error("403 forbidden");
}
```

Why-not-what notes:

- Tenant check happens before role or ownership to prevent cross-tenant
  leakage.
- Support role grants read, not every action.
- The function separates 401 authentication failure from 403
  authorization failure.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Clear separation reduces security bugs | More checks per endpoint | Policy helpers and tests |
| Least privilege limits blast radius | Role models can grow complex | Permission governance |
| Server-side auth protects data | Requires resource lookup | Efficient policy data access |
| Audit logs support investigations | Logs may contain sensitive data | Redaction and retention |
| Central policy improves consistency | Overcentralization can slow teams | Clear ownership |

## 12. Comparison Table

| Concept | Answers | Input | Output | Common bug |
|---|---|---|---|---|
| Authentication | who are you | credential | principal | weak credential checks |
| Authorization | can you do this | principal, action, resource | allow or deny | missing ownership check |
| Accounting/audit | what happened | decision and action logs | evidence | missing request IDs |
| Delegation | who can act for whom | token or grant | scoped authority | overbroad scopes |

## 13. Numbers and Benchmarks

- **401:** unauthenticated or invalid credentials.
- **403:** authenticated but not allowed.
- **MFA:** reduces account takeover risk for sensitive actions.
- **Policy checks:** every object-level read/write needs resource
  context, not only route context.
- **Token scopes:** smaller scopes reduce damage from token leak.

## 14. Common Pitfalls

- **Incident: IDOR.** User changed `/orders/123` to `/orders/124` and
  read another customer's order.
- **Incident: frontend-only permission.** Button was hidden, but API
  still accepted the forbidden request.
- **Incident: tenant missing from query.** Admin endpoint filtered by
  role but not tenant, leaking cross-customer data.

## 15. Interview Q&A

**Q1. Authentication vs authorization?** Model answer:
authentication verifies identity; authorization checks permission for
an action on a resource.

**Q2. 401 vs 403?** Model answer: 401 means authenticate first or
credential invalid; 403 means identity is known but access is denied.

**Q3. What is least privilege?** Model answer: give only the minimum
permissions required for the task.

**Q4. What is IDOR?** Model answer: insecure direct object reference,
where users access objects by changing IDs without proper authorization.

**Q5. Where should authz live?** Model answer: server side, close to
resource access, with shared helpers or policy engine for consistency.

## 16. Follow-up / Curveball Questions

**Curveball 1. Admin can access all tenants. Safe?** Answer direction:
only with explicit role, audit, reason codes, step-up auth, and careful
UI/approval controls.

**Curveball 2. Service-to-service request has no user.** Answer
direction: authenticate workload identity and authorize service action;
propagate user context only when needed.

**Curveball 3. Authorization needs resource data but lookup is costly.**
Answer direction: cache policy metadata carefully or denormalize
ownership, but preserve correctness.

## 17. Cheat-Sheet Summary

- Authentication proves identity.
- Authorization checks allowed action on resource.
- Login is not permission.
- Always enforce authorization on the server.
- Test ownership, tenant, role, and forbidden cases.

## 18. Further Reading

- OWASP Authorization Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- AWS IAM policy evaluation logic:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (airport analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (logged-in overreach before, policy checks after)
4. Core Concept Breakdown - Covered (10 concepts)
5. How It Works - Covered (10 steps plus design checks)
6. Diagram - Covered with required no-diagram justification and image placeholder
7. When to Use It - Covered (5 triggers)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (GitHub, AWS IAM, role count)
10. Production-Grade Code - Covered (TypeScript authorization check)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (4 concepts)
13. Numbers and Benchmarks - Covered (5 facts)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 URL-backed sources)

No em-dashes. No emojis. Cross-links included.
