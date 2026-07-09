## 1. Hook

You text a friend, "Are you coming?" They do not answer for ten
minutes. Maybe their phone died. Maybe they are driving. Maybe the
message was delayed. You cannot know the truth from silence alone. You
can only decide how long to wait before making another plan.

Distributed systems live in that uncertainty. A node that does not
reply may be dead, paused, overloaded, partitioned, or simply slow.
Failure detection is really suspicion management.

Timeouts are the decision line. Set them too low and you panic during
normal slowness. Set them too high and real failures take forever to
recover.

## 2. What Is It

(a) Plain-English one-liner: failure detection and timeouts decide when
a system should stop waiting for a slow component and treat it as
failed or suspicious.

(b) Formal definition: failure detection is the process of inferring
node or dependency health from signals such as heartbeats, probes,
responses, and timeouts. In asynchronous distributed systems, perfect
failure detection is impossible because delay is indistinguishable from
failure. Practical systems use timeout policies, suspicion levels,
adaptive detectors, retries, and circuit breakers to balance false
positives against slow recovery (see: MOD-07/06-gossip-protocols).

## 3. The Problem It Solves

Before disciplined timeouts, clients wait forever or retry wildly. A
slow database connection holds request threads until the web service
collapses. A load balancer keeps sending traffic to an unhealthy node.
A leader election times out every 200 ms and flaps during normal GC
pauses.

After disciplined timeouts, each call has a deadline. Failure detectors
mark nodes suspect before dead. Retries have budgets and backoff.
Clients stop waiting before their own user-facing deadline is gone.

The pattern solves bounded waiting. It cannot know failure perfectly,
but it makes the uncertainty explicit and operationally manageable.

## 4. Core Concept Breakdown

- **Timeout:** maximum time to wait before treating an operation as
  failed.
- **Deadline:** absolute end time for a whole request or workflow.
- **Heartbeat:** periodic liveness signal sent by a node.
- **Probe:** active check asking a node to respond.
- **Suspicion:** intermediate state between healthy and dead.
- **False positive:** healthy node marked failed.
- **False negative:** failed node not detected yet.
- **Adaptive timeout:** timeout adjusted from observed latency
  distribution.
- **Retry budget:** limit on how much retry traffic is allowed.
- **Jitter:** random delay added to avoid synchronized retries.

## 5. How It Works

Step by step, designing timeouts for a service call:

1. **Start with user deadline.** If the whole request must finish in
   300 ms, no dependency gets 300 ms by itself.
2. **Measure latency percentiles.** Use p50, p95, p99, and max under
   normal and degraded load.
3. **Set per-dependency timeout.** Choose a value above normal p99 but
   below the caller's remaining deadline.
4. **Use cancellation.** When timeout fires, stop work and release
   resources.
5. **Retry only if safe.** Idempotent reads or idempotency-keyed writes
   can retry; blind payment retries cannot.
6. **Use exponential backoff with jitter.** Avoid retry storms.
7. **Mark suspect before dead.** Give nodes a chance to refute
   temporary slowness.
8. **Feed health into routing.** Load balancers should avoid unhealthy
   nodes.
9. **Expose timeout metrics.** Count timeouts by dependency and
   operation.
10. **Tune from incidents.** Timeouts are not constants from a blog;
    they are workload-specific.

Design review checks:

- **What is the caller's deadline?**
- **What work is cancelled when timeout fires?**
- **Are retries bounded by budget?**
- **Does timeout failure trigger fallback, retry, circuit open, or user
  error?**

## 6. Diagram

```mermaid
flowchart TD
    REQ[Request starts] --> BUDGET[300 ms deadline]
    BUDGET --> CALLA[Service A timeout 80 ms]
    BUDGET --> CALLB[Service B timeout 120 ms]
    CALLA -->|success| MERGE[Build response]
    CALLB -->|timeout| FALLBACK[Fallback or partial response]
    FALLBACK --> MERGE
    MERGE --> DONE[Return before deadline]
```

<!-- IMAGE: request latency budget bar split across two dependencies,
showing one dependency timing out and fallback preserving the deadline -->

## 7. When to Use It

Use explicit timeouts and failure detectors when:

- **Any network call exists.** No network call should wait forever.
- **Cluster membership affects routing.** Nodes need health state.
- **Retries could amplify outages.** Retry budgets and backoff are
  required.
- **User-facing deadlines matter.** Latency budgets must be enforced.

## 8. When NOT to Use It

- **Do not set arbitrary 30-second defaults everywhere.** They can
  exhaust thread pools and user patience.
- **Do not retry non-idempotent operations blindly.** Duplicate side
  effects can be worse than failure.
- **Do not mark nodes dead from one missed heartbeat.** Transient delay
  is normal.
- **Do not ignore cancellation.** Timing out the caller while backend
  work continues still consumes capacity.

## 9. Real-World Example

**Cassandra** uses phi accrual failure detection, where suspicion is a
continuous score rather than a binary heartbeat result.

**Envoy and service meshes** expose per-route timeouts, retries, retry
budgets, and outlier detection so operators can manage dependency
failure centrally.

**AWS SDKs** and cloud clients emphasize connection timeout, request
timeout, exponential backoff, and jitter because retry storms are a
common outage multiplier.

Realistic number: if a user request has a 500 ms budget and calls three
dependencies sequentially, each with a 300 ms timeout, the timeout
policy is already impossible. Per-call timeouts must fit the end-to-end
deadline.

## 10. Production-Grade Code

```go
package main

import (
	"context"
	"math/rand"
	"time"
)

func CallWithRetry(
	ctx context.Context,
	maxAttempts int,
	baseDelay time.Duration,
	call func(context.Context) error,
) error {
	var last error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		if err := call(ctx); err == nil {
			return nil
		} else {
			last = err
		}
		if attempt == maxAttempts {
			break
		}
		delay := baseDelay * (1 << (attempt - 1))
		jitter := time.Duration(rand.Int63n(int64(delay / 2)))
		timer := time.NewTimer(delay + jitter)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
	return last
}

func WithTimeout(parent context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	// The cancel function matters because timeout without cancellation
	// leaves backend work consuming capacity after the caller gave up.
	return context.WithTimeout(parent, timeout)
}
```

Why-not-what notes:

- Retries obey the caller context, so they cannot exceed the upstream
  deadline.
- Jitter reduces synchronized retry bursts during dependency recovery.
- The code assumes the operation is safe to retry; that is a business
  precondition, not a transport detail.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Prevents waiting forever | False positives under transient slowness | Percentile-based tuning |
| Protects user-facing deadlines | Too-short timeouts cause needless failures | Latency measurement |
| Retries mask brief failures | Retries can amplify outages | Retry budgets and jitter |
| Suspicion states reduce flapping | More state to reason about | Failure detector design |
| Cancellation frees resources | Requires cooperative downstream code | Context propagation |

## 12. Comparison Table

| Mechanism | Best fit | Strength | Weakness | Key tuning |
|---|---|---|---|---|
| Fixed timeout | simple calls | easy | brittle | value from p99 latency |
| Deadline propagation | request chains | protects user SLA | needs context support | end-to-end budget |
| Heartbeat detector | cluster liveness | simple | false positives | interval and missed count |
| Phi accrual detector | variable latency clusters | adaptive suspicion | more complex | phi threshold |
| Circuit breaker | dependency protection | stops repeated calls | fallback required | failure threshold |

## 13. Numbers & Benchmarks

- **Timeout target:** often set near observed p99 plus margin, not max.
- **Retry attempts:** 2 to 3 attempts are common; more can create
  storms.
- **Backoff:** exponential backoff with jitter is standard for cloud
  APIs.
- **Deadline math:** the sum of sequential dependency timeouts must be
  less than the caller deadline.
- **Heartbeat suspicion:** many systems require multiple missed
  intervals or phi threshold before marking dead.

## 14. Common Pitfalls

- **Incident: no timeout.** A downstream TCP stall held every request
  thread until the service stopped accepting traffic.
- **Incident: retry storm.** Thousands of clients retried at the same
  instant after a dependency recovered, taking it down again.
- **Incident: leader flapping.** Election timeout was lower than normal
  GC pauses, so the cluster elected new leaders during healthy load.

## 15. Interview Q&A

**Q1. Why is perfect failure detection impossible?** Model answer: in
an asynchronous network, a slow message and a dead node look the same
for some period of time.

**Q2. What is a deadline vs timeout?** Model answer: timeout is a wait
limit for one operation; deadline is the absolute time by which the
whole request must finish.

**Q3. When should you retry?** Model answer: when the operation is safe
to repeat, failure is likely transient, and retry budget remains.

**Q4. Why add jitter?** Model answer: to prevent many clients from
retrying at the same time and creating a traffic spike.

**Q5. What is phi accrual failure detection?** Model answer: it outputs
a suspicion score based on heartbeat arrival history instead of a fixed
missed-heartbeat count.

## 16. Follow-up / Curveball Questions

**Curveball 1. p99 latency is 900 ms but product wants 300 ms response.**
Answer direction: fallback, caching, async workflow, or dependency
optimization is needed. A 300 ms timeout will fail often.

**Curveball 2. A timeout fires but the payment later succeeds.** Answer
direction: use idempotency keys and reconciliation. Timeout does not
mean the remote side did nothing.

**Curveball 3. All clients retry after exactly 1 second.** Answer
direction: add jitter, exponential backoff, retry budgets, and server
load shedding.

## 17. Cheat-Sheet Summary

- Failure detection is suspicion, not certainty.
- Every network call needs a timeout and preferably a deadline.
- Retries require idempotency, backoff, jitter, and budget.
- Too-short timeouts cause false failures; too-long timeouts waste
  capacity.
- Cancellation must stop backend work, not only caller waiting.

## 18. Further Reading

- Hayashibara et al., "The Phi Accrual Failure Detector":
  https://www.jaist.ac.jp/~defago/files/pdf/IS_RR_2004_010.pdf
- AWS Architecture Blog, "Timeouts, retries, and backoff with jitter":
  https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- Envoy documentation on timeouts and retries:
  https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (unanswered text analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (unbounded waits before, disciplined deadlines after)
4. Core Concept Breakdown - Covered (10 concepts)
5. How It Works - Covered (10 steps plus review checks)
6. Diagram - Covered (flowchart)
7. When to Use It - Covered (4 triggers)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (Cassandra, Envoy, AWS SDK practices)
10. Production-Grade Code - Covered (Go retry with context deadline)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (5 mechanisms)
13. Numbers & Benchmarks - Covered (5 figures)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 URL-backed sources)

No em-dashes. No emojis. Cross-links included.
