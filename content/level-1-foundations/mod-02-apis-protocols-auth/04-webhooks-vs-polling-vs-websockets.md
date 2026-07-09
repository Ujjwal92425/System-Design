## 1. Hook

If you are waiting for a package, you have three choices. You can keep
opening the door every five minutes to check. You can ask the delivery
company to text you when it arrives. Or you can stay on a live phone
call with the driver.

Polling is checking repeatedly. Webhooks are the text message. WebSockets
are the live call.

All three are valid. The right one depends on freshness, reliability,
direction of communication, and operational cost.

## 2. What Is It

(a) Plain-English one-liner: polling repeatedly asks for updates,
webhooks let a server call you when something happens, and WebSockets
keep a persistent two-way connection open for real-time communication.

(b) Formal definition: polling is a client-initiated request pattern
where the client periodically queries a server for state. Webhooks are
server-to-server HTTP callbacks triggered by events, usually with
signature verification and retry delivery. WebSockets are persistent,
full-duplex connections upgraded from HTTP that allow client and server
to exchange messages anytime over one connection (see:
MOD-02/01-rest-api-design-principles).

## 3. The Problem It Solves

Before choosing a pattern, teams use polling for everything. Clients
ask every few seconds even when nothing changed. Servers waste work.
Users still see stale data between polls.

Webhooks reduce waste for external integrations: call the receiver only
when an event happens. WebSockets reduce latency for interactive apps:
keep a connection open and push updates immediately.

The choice solves update delivery. It decides who initiates, how fresh
data must be, and how failures are retried.

## 4. Core Concept Breakdown

- **Polling:** repeated client requests on a schedule.
- **Long polling:** request waits until update or timeout.
- **Webhook:** event-triggered HTTP callback from producer to consumer.
- **Webhook signature:** HMAC or similar proof that callback is genuine.
- **Retry policy:** redelivery after failure.
- **WebSocket:** persistent full-duplex connection.
- **Heartbeat:** keepalive message to detect broken connections.
- **Backpressure:** avoiding message floods to slow receivers.
- **Ordering:** guarantees differ by pattern and implementation.
- **Replay:** ability to fetch missed events after downtime.

## 5. How It Works

Step by step, payment status updates:

1. **Polling client asks status.** `GET /payments/{id}` every few
   seconds.
2. **Server returns current state.** Client repeats until terminal.
3. **Webhook receiver registers endpoint.** Payment provider stores URL
   and secret.
4. **Payment event occurs.** Provider sends `payment.succeeded` to
   receiver.
5. **Receiver verifies signature.** It rejects forged callbacks.
6. **Receiver stores event idempotently.** Duplicate webhooks are
   normal.
7. **Provider retries failures.** Non-2xx responses retry with backoff.
8. **WebSocket client connects.** App upgrades to persistent
   connection.
9. **Server pushes messages.** Updates arrive with low latency.
10. **Client reconnects and catches up.** Last seen event ID prevents
    missed updates.

Design review checks:

- **Who can initiate network calls?**
- **How fresh must the update be?**
- **What happens when receiver is down?**
- **Can missed messages be replayed?**

## 6. Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant R as Receiver
    C->>S: Poll GET status
    S-->>C: Current state
    S->>R: Webhook event callback
    R-->>S: 2xx after verify and store
    C->>S: WebSocket connect
    S-->>C: Push update
```

<!-- IMAGE: three side-by-side timelines comparing polling intervals,
webhook callback with retry, and WebSocket persistent push -->

## 7. When to Use It

Use polling when:

- **Updates are infrequent or freshness is loose.**
- **Client cannot receive inbound calls.**
- **Simplicity matters more than immediacy.**

Use webhooks when:

- **Server-to-server event notification is needed.**
- **Receiver has a public endpoint.**
- **Retries and signatures can be implemented.**

Use WebSockets when:

- **Low-latency two-way communication is needed.**
- **Many updates flow during one session.**

## 8. When NOT to Use It

- **Do not poll at high frequency for rare events.** It wastes capacity.
- **Do not trust webhooks without signature verification.**
- **Do not use WebSockets when simple request-response is enough.**
- **Do not assume WebSockets guarantee message persistence.** You need
  catch-up logic.

## 9. Real-World Example

**Stripe webhooks** notify merchants about payment and subscription
events, with signatures and retries.

**Slack and chat apps** use WebSockets or similar persistent channels
for interactive real-time messaging.

**CI dashboards** often start with polling because build state changes
slowly and simplicity wins.

Realistic number: polling 10,000 clients every 5 seconds creates 2,000
requests per second even if nothing changes. Webhooks send near zero
traffic when no events occur.

## 10. Production-Grade Code

```typescript
import crypto from "node:crypto";
import http from "node:http";

const SECRET = "webhook_secret";

function verifySignature(body: string, signature: string): boolean {
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/webhooks/payments") {
    res.writeHead(404).end();
    return;
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const signature = String(req.headers["x-signature"] ?? "");
    if (!signature || !verifySignature(body, signature)) {
      res.writeHead(401).end();
      return;
    }
    // Store by event ID before side effects so provider retries cannot
    // duplicate emails, shipments, or credits.
    res.writeHead(204).end();
  });
}).listen(8080);
```

Why-not-what notes:

- Webhook verification uses timing-safe comparison to reduce signature
  leak risk.
- The handler must persist event IDs idempotently before side effects.
- Production receivers also enforce timestamps to prevent replay attacks.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Polling is simple | Wasteful and stale | Poll interval tuning |
| Long polling improves freshness | Holds connections open | Connection capacity |
| Webhooks are efficient | Receiver must be public and reliable | Signature, retries, idempotency |
| WebSockets are low-latency | Persistent connection operations | Heartbeats and scaling |
| WebSockets support two-way messaging | Missed messages need catch-up | Replay store |

## 12. Comparison Table

| Pattern | Initiator | Freshness | Reliability burden | Best fit | Caveat |
|---|---|---|---|---|---|
| Polling | client | interval-based | low | simple status checks | waste |
| Long polling | client | near-real-time | medium | notifications | connection load |
| Webhook | producer server | near-real-time | receiver and sender | integrations | public endpoint |
| WebSocket | both | real-time | app protocol | chat, games, live UI | connection scaling |

## 13. Numbers and Benchmarks

- **Polling load:** clients divided by interval equals baseline RPS.
- **Webhook retry:** providers often retry for hours or days depending
  on service.
- **WebSocket heartbeat:** 15 to 60 seconds is common.
- **Connection count:** WebSockets require memory per connected client.
- **Duplicate delivery:** webhooks should be treated as at-least-once.

## 14. Common Pitfalls

- **Incident: polling storm.** Mobile clients synchronized every 10
  seconds and overloaded the API.
- **Incident: webhook replay.** Attacker resent an old valid payload
  because timestamp checks were missing.
- **Incident: WebSocket missed messages.** Client reconnected after
  network drop and had no last-event catch-up.

## 15. Interview Q&A

**Q1. Polling vs webhook?** Model answer: polling is client asks
repeatedly; webhook is producer calls receiver when event happens.

**Q2. Webhook vs WebSocket?** Model answer: webhook is server-to-server
HTTP callback; WebSocket is persistent full-duplex connection.

**Q3. How do you secure webhooks?** Model answer: HMAC signature,
timestamp, replay window, TLS, allowlists where possible, and
idempotent event storage.

**Q4. Are WebSockets reliable?** Model answer: the connection carries
messages while alive, but apps need reconnect and catch-up for missed
messages.

**Q5. When is polling acceptable?** Model answer: low freshness needs,
low client count, simple operations, or clients behind NAT that cannot
receive callbacks.

## 16. Follow-up / Curveball Questions

**Curveball 1. Receiver is down during webhook delivery.** Answer
direction: provider retries; receiver should also support event list
API to backfill missed events.

**Curveball 2. Need real-time plus persistence.** Answer direction: use
WebSocket for live push and durable event log or REST endpoint for
catch-up.

**Curveball 3. Poll interval is 1 second for 1 million clients.**
Answer direction: that is 1 million RPS baseline. Use push, long
polling, batching, or adaptive polling.

## 17. Cheat-Sheet Summary

- Polling repeatedly asks for state.
- Webhooks deliver event callbacks to registered endpoints.
- WebSockets keep a persistent two-way connection open.
- Webhooks need signatures, retries, and idempotency.
- WebSockets need heartbeat, backpressure, reconnect, and catch-up.

## 18. Further Reading

- RFC 6455, "The WebSocket Protocol":
  https://www.rfc-editor.org/rfc/rfc6455
- Stripe webhook documentation:
  https://docs.stripe.com/webhooks
- GitHub webhook documentation:
  https://docs.github.com/en/webhooks

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (package update analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (polling for everything before, pattern choice after)
4. Core Concept Breakdown - Covered (10 concepts)
5. How It Works - Covered (10 steps plus design checks)
6. Diagram - Covered (sequenceDiagram)
7. When to Use It - Covered (polling, webhooks, WebSockets)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (Stripe, Slack/chat, CI dashboards)
10. Production-Grade Code - Covered (TypeScript signed webhook receiver)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (4 patterns)
13. Numbers and Benchmarks - Covered (5 figures)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 URL-backed sources)

No em-dashes. No emojis. Cross-links included.
