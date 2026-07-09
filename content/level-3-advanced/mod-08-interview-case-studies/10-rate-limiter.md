## 1. Hook

Imagine a coffee shop with one barista and a steady stream of people
asking for coffee. The barista can make exactly one coffee per 30
seconds. If 60 people walk in at 8am and ask all at once, the barista's
reaction is to either ignore some, ask others to wait, or make a
mess. To prevent meltdown, the shop puts up a small sign: "One coffee
per person per minute." Anyone who comes back faster gets a polite
"please wait" - and anyone who tries to order 5 at once is told "I can
make one for you now; come back in five minutes for the rest." Online,
the shop can also enforce that a single person doesn't somehow tip the
barista to make ten coffees by sneaking in ten times; their phone
number logs each request.

A rate limiter is that sign and that log at internet scale. Every API
endpoint you own has a "barista" that can only handle so many requests
per second. The rate limiter is a service that sits in front of your
API and decides, per caller, whether their next request is allowed in
or politely rejected (HTTP 429 Too Many Requests). The hard parts the
sign hides: choosing the right algorithm (one-per-minute, sliding
window, leaky bucket), keeping state at scale without losing safety
when the limiter itself has to be replicated across many servers,
and deciding whether to enforce per-user, per-IP, per-tenant, or
some weighted combination.

## 2. What Is It

(a) Plain-English: a rate limiter is a piece of software (or a service
in front of your API) that counts each caller's recent requests and
rejects the ones that exceed an agreed limit, like "100 per user per
minute."

(b) Formal definition: a rate limiter is a stateful admission control
middleware that tracks per-key request counts over time and decides
allow or deny based on a configured policy (fixed window, sliding
window, token bucket, or leaky bucket). It must be deterministic for a
given request key, survive restarts with at-most-once count drift,
and scale across a cluster of limiting nodes via shared counters
(typically Redis) or via approximately-correct per-node counters
consolidated asynchronously. It is usually paired with a backoff
header (Retry-After) on deny and a soft quota (warn beyond X, deny
beyond Y) for tiered policy.

## 3. The Problem It Solves

Before rate limiting was standard, every public API was at the mercy
of its callers. A single misconfigured script in a customer's CI loop
could request your endpoints at 10,000 QPS - far above what the
backends could absorb - and either kill the server or get the
underlying database saturated. Worse, one user hammering the
expensive `/search` endpoint would starve every other user's
`/health` and `/auth` calls. There was no notion of fairness between
tenants, no protection against accidental or malicious floods, and no
way to monetize tiered access (Free = 100 / day, Pro = 1M / day).

After rate limiters became standard, every public API defines a
per-key limit, returns clean 429s with Retry-After headers, and a
well-behaved client backs off cleanly. Tiered plans became a sales
tool: the API limit became the upgrade lever, not the feature set.
The hard operational problem - "what happens when 10x normal traffic
arrives in one minute" - has an answer that is not "the database dies."
The problem solved is fairness, stability, and tiered monetization of
an otherwise-blind HTTP endpoint.

## 4. Core Concept Breakdown

- **Limit key:** the bucket identifier; typically user id, API key, IP
  address, or a combination (`tenantId:endpoint`). The choice of key
  is a policy decision: per-user lets you throttle individuals;
  per-IP catches abusers without accounts.
- **Limit policy:** the rule for how many requests per window. Common
  shapes: 100 per minute, 1000 per hour, 10 per second, or tiered
  (Free = 100/day, Pro = 1M/day).
- **Fixed window:** the simplest algorithm - the current minute bucket
  is determined (e.g., epoch/60), the counter is incremented, denied on
  the (N+1)-th request in that bucket. Easy to compute but allows 2x
  burst at the boundary (one bucket ends and the next begins with full
  quota).
- **Sliding window:** uses two counters: the previous window's count
  and the current window's count; the effective rate is interpolated
  based on the position within the current window. Smoother than fixed
  window but more state and arithmetic.
- **Token bucket:** a bucket holds up to N tokens; each request consumes
  one; tokens refill at a rate of R per second. Allows bursts up to
  bucket size while smoothing the long-term rate. Best for bursty
  traffic.
- **Leaky bucket:** requests enter a queue at any rate; the queue
  drains at a fixed rate; excess is dropped or queued. A strict
  rate smoother.
- **Backing store:** Redis is the production default for distributed
  counters because `INCR` with `EXPIRE` is atomic and very fast (under
  1ms). For approximate-correct limits, per-node counters
  periodically snapshotted to a shared store work fine.
- **Response on deny:** HTTP 429 with `Retry-After` header, plus
  optional response body with the limit and remaining count.
- **Tiered policy:** different limit per pricing plan. The policy
  service answers per key with the limit number; the limiter enforces.
- **Soft vs hard limits:** warn+x-ray traffic above a soft limit, deny
  above the hard limit. Useful for honest mistakes (warn) vs abuse (deny).
- **Multi-region sharding:** use `(userId mod N)` to map a key to a
  specific region of limiters to keep state local; cross-region queries
  add ~50ms - too slow for limit enforcement on a hot path.

## 5. How It Works

Step by step, the path of one request through the limiter:

1. **A client sends an HTTP request** to your API. Before the request
   reaches the business logic, the rate limiter middleware intercepts
   it.
2. **The middleware extracts the limit key.** If the caller is
   authenticated, the key is the user id or tenant id; otherwise the
   key is the source IP (with optional `X-Forwarded-For` parsing).
3. **The middleware looks up the policy** for that key. The policy is
   either statically configured or fetched from a policy service that
   knows the user's tier (Free, Pro, Enterprise).
4. **The middleware constructs the redis key** for the chosen algorithm:
   for fixed window, it is `rl:userid:2020-04-09T13:42`. For sliding
   window, two keys: `rl:userid:prev_window` and `rl:userid:curr`.
5. **The middleware calls the limit algorithm** in Redis, often with
   a Lua script (`INCR` plus `EXPIRE` if first time). The Lua script is
   atomic over the redis-shard, so concurrent requests are serialized.
6. **The Lua script returns** the new counter value and the time to
   live (TTL) of the key. The middleware compares the counter to the
   limit.
7. **If the counter is at or below the limit**, the request proceeds
   to the API handler; the middleware sets request-scoped headers like
   `X-RateLimit-Remaining: 99` so the client can read its band.
8. **If the counter is above the limit**, the middleware denies the
   request: returns HTTP 429, sets `Retry-After: <seconds-until-
   refilled>`, and short-circuits with no business-logic call.
9. **If the request reached a soft limit threshold** (e.g., 80% of
   limit), the middleware emits a warning metric and tags the
   request with `X-RateLimit-Warning: approaching-limit` so the team
   observes trends.
10. **A background job tracks bandwidth usage patterns** by user and
    by endpoint, surfacing surprising callers (sudden 100x traffic by
    a typical user often means stolen key) and predicting needs for
    tier upgrades.
11. **Multi-region enforcement:** when the API is deployed to multiple
    regions, the limiter state is sharded by `(userId mod N)` so each
    key maps to a specific redis cluster; that cluster is the only
    authority for that user. This avoids race conditions across
    regions and keeps limiter latency under 5ms per check.

## 6. Diagram

```mermaid
flowchart TD
    C[Client request] --> MW[Limiter middleware]
    MW --> KEY[Extract limit key user or IP]
    KEY --> POL[Look up policy by tier]
    POL --> REDIS[(Redis Lua script INCR + EXPIRE)]
    REDIS --> DEC{Count <= limit?}
    DEC -->|yes| API[Forward to API handler]
    API --> MW
    DEC -->|no| DENY[Return HTTP 429 Retry-After]
    DENY --> C
    API --> C
    KEY --> SOFT{Soft limit?}
    SOFT -->|warn| METRIC[Emit approaching-limit metric]
    METRIC --> REDIS
```

<!-- GIF: animation of a token bucket filling at 1 token per second,
showing a burst of 5 requests consuming 5 tokens at once and getting
through, then a 6th immediate request shown being rejected with 429,
and the bucket refilling over the next 5 seconds -->

## 7. When to Use It

Use a rate limiter when one or more of these hold:

- **Your API is publicly reachable** or reachable by tenants you
  cannot fully control. Even an internal API benefits from a
  protective layer.
- **You monetize tiered access**: free users get a low quota, paid
  tiers get more, and the quota is enforced in software not in
  contracts.
- **You have expensive endpoints** that take real CPU (search, image
  processing, ML inference) where one user can saturate a worker pool
  in seconds.
- **You need fairness across tenants** so one noisy user cannot crowd
  out the others.
- **You want to limit client-side retry storms** that still respect
  your retry-after guidance rather than escalating to backpressure
  cascades.

## 8. When NOT to Use It

- **For internal inter-service calls inside a closed cluster** where
  the caller is your own worker pool and traffic is naturally bounded
  by upstream; rate-limiting there adds latency for no benefit.
- **For one-shot batch jobs** with no client loop - there is no
  continuous caller to rate against.
- **For the case of "I don't know how to handle hot traffic"**: if your
  business logic is unstable under load, a rate limiter hides the
  symptom, not the cure. Your hot endpoint will still die at 99th
  percentile under the limit; the limit just pushes saturation to a
  different user.
- **Where approximate correctness** matters more than durability. If
  a 5% drift in count is fine, you do not need shared Redis - per-node
  counters periodically consolidated are dramatically cheaper.
- **Where you need per-IP throttling and the IP is unstable** (mobile
  network, NATted offices). Per-IP rules are blunt; consider per-token
  instead.

## 9. Real-World Example

**Stripe** publishes their documented API rate limit (100 requests per
minute for live mode by default, with higher limits on upgrade tiers)
on their public docs; their limit headers include `Stripe-RateLimit-
Limit`, `Stripe-RateLimit-Remaining`, and `Stripe-RateLimit-Reset`.
Mid-tier customers such as platforms processing payments for others
get up to 1000 req/sec; large enterprise customers negotiate custom
limits.

**GitHub** enforces 5,000 authenticated requests per hour per user,
with 30 requests per minute for unauthenticated requests to a tokenless
endpoint; they classify the limit by endpoint class and return the
documented 429 with documented quota-consumption responses on
secondary rate limits (search, code).

**Cloudflare** uses rate limiting on the edge for DDoS protection at
the network layer (per-IP per-path); their rate limit rules trigger
challenges for IPs exceeding threshold requests/second. They cache
the per-IP counter at the edge node serving the request (no shared
store across regions), because the same IP typically hits the same
edge persistently for a few minutes.

## 10. Production-Grade Code

```typescript
import { Redis } from "ioredis";

interface Policy {
  limit: number;       // maximum requests allowed
  windowSec: number;   // window in seconds
}

// Rate limit key often combines tier + endpoint + userId so limits
// are scoped properly. For brevity, this implementation uses just
// `userId` as the discriminator.
export class FixedWindowLimiter {
  constructor(private readonly redis: Redis) {}

  async check(userId: string, policy: Policy): Promise<LimitDecision> {
    // The window is the current minute slot. Using a unix-seconds bucket
    // collapses the JSON of multiple windows into a fixed time period.
    const now = Math.floor(Date.now() / 1000);
    const windowKey = Math.floor(now / policy.windowSec);
    const redisKey = `rl:${userId}:${windowKey}`;
    // Single roundtrip: INCR (atomic across the single Redis shard),
    // then EXPIRE if first time so we never leak old keys.
    const result = (await this.redis.multi()
      .incr(redisKey)
      .expire(redisKey, policy.windowSec, "NX")
      .exec()) as [[null, number], [null, 0 | 1]];
    const count = result[0][1];
    if (count <= policy.limit) {
      return {
        allowed: true,
        remaining: policy.limit - count,
        resetAt: (windowKey + 1) * policy.windowSec,
      };
    }
    return {
      allowed: false,
      remaining: 0,
      resetAt: (windowKey + 1) * policy.windowSec,
      retryAfterSec: (windowKey + 1) * policy.windowSec - now,
    };
  }
}

export class TokenBucketLimiter {
  // Lua script atomically compares, decrements, and refills in one
  // server-side atomic op. Refill rate is per-second tokens.
  private readonly luaScript = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local capacity = tonumber(ARGV[2])
    local refillPerSec = tonumber(ARGV[3])
    local want = tonumber(ARGV[4])
    local data = redis.call("HMGET", key, "tokens", "lastRefill")
    local tokens = tonumber(data[1]) or capacity
    local lastRefill = tonumber(data[2]) or now
    local elapsed = math.max(0, now - lastRefill)
    tokens = math.min(capacity, tokens + elapsed * refillPerSec)
    if tokens < want then
      redis.call("HMSET", key, "tokens", tokens, "lastRefill", now)
      return {0, tostring(tokens)}
    end
    tokens = tokens - want
    redis.call("HMSET", key, "tokens", tokens, "lastRefill", now)
    return {1, tostring(tokens)}
  ` as unknown as string;

  constructor(private readonly redis: Redis) {}

  async consume(
    userId: string,
    capacity: number,
    refillPerSec: number,
    tokensWanted: number = 1
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Math.floor(Date.now() / 1000);
    const result = (await this.redis.eval(
      this.luaScript,
      1,
      `tb:${userId}`,
      now,
      capacity,
      refillPerSec,
      tokensWanted
    )) as [0 | 1, string];
    return { allowed: result[0] === 1, remaining: Number(result[1]) };
  }
}

interface LimitDecision {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec?: number;
}

const DEFAULT_POLICY: Record<string, Policy> = {
  free: { limit: 100, windowSec: 60 },
  pro: { limit: 1000, windowSec: 60 },
  enterprise: { limit: 10000, windowSec: 60 },
};

export class LimitMiddleware {
  private readonly fixed: FixedWindowLimiter;
  private readonly token: TokenBucketLimiter;

  constructor(redis: Redis) {
    this.fixed = new FixedWindowLimiter(redis);
    this.token = new TokenBucketLimiter(redis);
  }

  async enforce(req: { user: { id: string; tier: string } }): Promise<{
    status: 200 | 429;
    headers: Record<string, string>;
  }> {
    const policy = DEFAULT_POLICY[req.user.tier] ?? DEFAULT_POLICY.free;
    const decision = await this.fixed.check(req.user.id, policy);
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(policy.limit),
      "X-RateLimit-Remaining": String(decision.remaining),
      "X-RateLimit-Reset": String(decision.resetAt),
    };
    if (!decision.allowed) {
      const retryAfter = decision.retryAfterSec ?? policy.windowSec;
      return { status: 429, headers: { ...headers, "Retry-After": String(retryAfter) } };
    }
    return { status: 200, headers };
  }
}
```

Why-not-what notes:
- `INCR` + `EXPIRE` is atomic on a Redis shard per key, so collisions
  on the same key produce correct counts; for thousands of QPS against
  the same user this is fine. For multi-million QPS on a single key,
  consider sharding the count by suffix and aggregating.
- The Lua script for token bucket is server-side atomic - one round-
  trip with all the arithmetic; the alternative (read-modify-write
  round-trips) introduces a race where two clients both read tokens=10,
  both consume, write tokens=8 instead of tokens=9.
- `EXPIRE` is set with the `NX` flag so it's only applied once at key
  creation; subsequent requests in the same window do not extend the
  TTL.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Stops floods before reaching business logic, saving DB and CPU | A limiter state lookup on every request adds latency (1-5ms typical) | Network + Redis shard cost; for very high QPS consider in-memory per-node limiter with deferred sync |
| Tiered limits become a sales tool for monetized APIs | Multi-tier policy service introduces a separate dependency; if it goes down, default to most restrictive | Per-tenant caching of the policy with a fallback default of the free tier |
| 429 + Retry-After is well-behaved: clients back off cleanly | Clients that ignore Retry-After form retry storms; needs backpressure propagation on the server side | A penalty box algorithm; clients ignoring Retry-After upgrade to a faster 429 (or a drop-tail) |
| Token bucket allows short bursts while smoothing the long-term rate | Token bucket requires a configuration of capacity and refill; under-tuned parameters mean bursts overwhelm the backend | Per-endpoint tuning; consider matching bucket capacity to operation cost (cheap endpoints allow large bursts) |
| Per-region sharding keeps state local; <5ms per check | A user jumping regions (mobile EU -> US) loses their accumulated count | Acceptable drift; for tighter, a global counter broker is required (rare) |

## 12. Comparison Table

| Algorithm | Memory | Smoothing | Burst tolerance | Best fit |
|---|---|---|---|---|
| Fixed window | 1 counter per key per window | Burst at boundaries (2x traffic can pass through) | None within a window | Simple, low-state, exact-count APIs like GitHub's auth quota |
| Sliding window (counter weighted) | 2 counters per key | Smooth: rate computed as weighted average | Tunable via weight | APIs that need a steady "per minute" smoothed rate |
| Sliding window (sorted set) | All timestamps per key, expires in order | Exact sliding window | None | Very strict "exactly N requests in any rolling 60 seconds" |
| Token bucket | Bucket size + last refill time | Smooth long-term; allows burst up to bucket size | High | Burst-tolerant APIs where a few quick calls should pass |
| Leaky bucket | Queue depth | Strict slow rate no bursts | Low | Strict shape of egress; often used to pace outbound calls to a third party |

Most production public APIs use fixed window for sanity (cheap, exact-
count) plus sliding window for stricter limits. Token bucket is the
default for traffic shaping because of its natural fit for bursty
client behavior.

## 13. Numbers & Benchmarks

- **Per-check latency** with a co-located Redis shard: 1 to 3ms p99
  per check.
- **Cost of Lua-script token bucket check:** around 0.5ms per check
  (one round-trip with the whole computation server-side).
- **Default public API limit benchmark:** 100 per minute per user is
  the most common default for a free tier; 1000 per minute for Pro;
  10k+ for Enterprise. Stripe, GitHub, Twitter roughly group to this
  band.
- **Counter cardinality:** one counter per user per active minute; for
  100 million active users, the steady-state key count is around 100
  million TTL keys, each lifetime of 60 seconds, churning about 1.66M
  keys/sec. Redis can sustain that comfortably; sharding is the
  safety net.
- **Memory footprint per key:** roughly 80-100 bytes per key in Redis
  (key, value, expiry metadata). 100 million keys = 8-10 GB.
- **Latency cost on the API hot path:** single-digit milliseconds,
  well below average HTTP request handling time of 50-200ms; usually
  negligible compared to the rest of the request.

## 14. Common Pitfalls

- **Forgetting EXPIRE on the counter key.** Engineers ship `INCR`
  without `EXPIRE` and a year later Redis has been collecting keys
  since day one and OOMs at peak. Always pair `INCR` with `EXPIRE
  NX`, and let the first request in a window prime the TTL.
- **Choosing the wrong key.** Per-IP only limits entire offices
  behind a NAT; per-user only allows the same user to hit you from
  many IPs (which they can do from a botnet). Production setups use
  per-user for authenticated and per-IP for unauthenticated fallback,
  and they often combine the two for abuse-suspected IPs.
- **Cluster-wide per-node counters without eventual synchronization.**
  A limiter that keeps per-node counters in memory and never replicates
  them silently allows 10x the limit if 10 nodes serve the same user.
  Either share the counter via Redis (correct) or replicate every
  few seconds (approximate correctness, OK for many tiers).

## 15. Interview Q&A

**Q1. How would you design a rate limiter that supports 1M requests
per second?**
Model answer: keep the algorithm simple (fixed window or token bucket,
both O(1) keys). For state, use Redis Cluster sharded by userId so
per-user counters live on one shard; Lua scripts for atomic ops avoid
round-trips. The API limiter is a small service in front of every
endpoint with a per-region Redis cluster; per-region sharding means a
user's counters stay close to home. Lazy policy cache avoids a policy-
service lookup per request.

**Q2. Why use Redis for the counter instead of in-memory?**
Model answer: shared state. In-memory per-node counters lose accuracy
when the user bounces across nodes (load-balancer shift, multi-region).
Redis with a single authority per key gives exact count. For high-QPS
services that can tolerate small drift (5 percent), per-node in-memory
plus deferred sync is dramatically cheaper - production teams choose
this for the cheapest tiers.

**Q3. Token bucket vs sliding window - when do you pick which?**
Model answer: token bucket for bursty client behavior like an end-user
front-end where 50 quick clicks at app-open is normal. Sliding window
for explicit per-minute guarantee; useful when the pinned limit equals
your safe backend capacity.

**Q4. How do you handle a client that ignores Retry-After?**
Model answer: a penalty box. Track the number of 429s returned to the
caller in the last minute; once they cross a threshold (e.g., 50), the
client is put in a penalty box - the limiter silently drops requests
for 60 seconds. The next request from a penalty-box client sees 429
with a much higher Retry-After to break retry loops.

**Q5. How do you enforce multiple limit dimensions?**
Model answer: one counter per dimension. A user has a per-minute
counter, per-day counter, per-tenant counter, and per-endpoint
counter. Each counter check is independent; the request is allowed
only if all pass. The trickiest part is selecting the right order:
cheapest checks first (e.g., per-day is cheap because the count is
small and rarely exceeds), most expensive last.

**Q6. How does the policy service-scale without bottlenecking?**
Model answer: cache the policy per (tier, endpoint) for several
minutes. Cache hits avoid the per-request call to the policy store;
cache misses (rare - tier seldom changes) incur a per-key lookup. The
policy store never sits hot on the request path; rate update events
flow over a Kafka topic the limiter service subscribes to and updates
its cache asynchronously.

## 16. Follow-up / Curveball Questions

**Curveball 1. A single user posts 1M requests in a minute and your
limiter ensemble grows slow; the user islet through 200k requests
before you protect them. What happened?**
Answer direction: per-region ensembles don't see the same shard early;
the user's requests spread across multiple regions and each saw only
~50k locally (under limit). The fix is global counter synchronization
across regions, or consistent hashing of the user to a single region
so the limiter is always local.

**Curveball 2. Your service talks to an external API that rate-limits
you to 1 req/sec; how do you implement an outbound limiter?**
Answer direction: leaky bucket works best here - outbound requests
enter a queue; worker drains it at 1 req/sec; further queued requests
wait. For burst tolerance (the external limit allows token refill
micro-bursts), use token bucket sized appropriately.

**Curveball 3. You add a "high-priority" tier where the rate limit is
10x; how do you enforce priority not just for rate but for response
latency too?**
Answer direction: priority-queuing at the upstream service - if the
backend handler uses a queue, the high-tier requests go in front;
combined with the rate limit, their bandwidth is allowed and the queue
order ensures their bandwidth is fulfilled first when latency of
backend work matters. Alternatively, scale out with dedicated backend
pools for high-tier traffic.

## 17. Cheat-Sheet Summary

- A rate limiter counts per-key requests in a window and denies when
  above the limit; common algorithms are fixed window, sliding window,
  and token bucket.
- Production state for limiters is Redis with Lua scripts for atomic
  INCR + EXPIRE; per-region sharding by key keeps checks local.
- 429 + Retry-After is the polite contract; clients honor it or your
  penalty box kicks in to silence them.
- Per-key policies map to tier; the policy service sits behind a
  cache and limits evaluate fast.
- Per-IP catches abusers without accounts; per-user is the fairness
  baseline; both combined catch most abuse patterns.

## 18. Further Reading

- Redis documentation: "Pattern: Rate limiter" - the canonical Redis
  docs walkthrough of three algorithms using Lua scripts.
- Stripe documentation: "Rate limits" - a public write-up of what the
  headers `X-RateLimit-Limit`, `X-RateLimit-Remaining` and friends
  look like for tiered API access.
- Cloudflare blog: "How we built rate limiting capable of scaling to
  millions of domains" - case study of edge rate limiting using
  per-node counters and a global aggregator for accuracy trade-offs.

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered in depth (coffee shop analogy, no jargon, ~230 words)
2. What Is It - Covered in depth (plain-English + formal definition)
3. The Problem It Solves - Covered in depth (pre-limiter API flood exhaustion vs tier enforcement)
4. Core Concept Breakdown - Covered in depth (10 bullets, each concrete)
5. How It Works - Covered in depth (11 numbered story-style steps)
6. Diagram - Covered in depth (mermaid flowchart with middleware, policy, Redis Lua, soft limit; gif placeholder)
7. When to Use It - Covered in depth (5 concrete triggers)
8. When NOT to Use It - Covered in depth (5 anti-patterns)
9. Real-World Example - Covered in depth (Stripe 100 req/min, GitHub 5000/hr, Cloudflare edge)
10. Production-Grade Code - Covered in depth (TypeScript FixedWindow + Token Bucket via Lua + middleware)
11. Trade-offs Table - Covered in depth (5-row Pros/Cons/Cost)
12. Comparison Table - Covered in depth (5 algorithms x 5 dimensions)
13. Numbers & Benchmarks - Covered in depth (6 concrete numbers)
14. Common Pitfalls - Covered in depth (3 incident-style mistakes)
15. Interview Q&A - Covered in depth (6 reasoning Q&A)
16. Follow-up / Curveball Questions - Covered in depth (3 senior follow-ups)
17. Cheat-Sheet Summary - Covered in depth (5 standalone lines)
18. Further Reading - Covered in depth (3 high-signal sources)

No section skipped. No "and so on" / "similarly" / "etc." substitutions.
No em-dashes. No emojis. Word count well above floor.
