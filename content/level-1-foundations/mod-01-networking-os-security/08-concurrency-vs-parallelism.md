## 1. Hook

One chef can manage soup, rice, and vegetables by switching attention:
stir soup, check rice, chop vegetables, repeat. That is concurrency.
Three chefs cooking at the same time is parallelism.

Concurrency is about dealing with many tasks in progress. Parallelism
is about doing many tasks at the same instant.

People confuse them because both make systems feel capable. But the
engineering choices are different.

## 2. What Is It

(a) Plain-English one-liner: concurrency means structuring a system to
handle multiple tasks in progress, while parallelism means executing
multiple tasks at the same time.

(b) Formal definition: concurrency is a program design property where
multiple computations make progress over overlapping time periods,
often through scheduling, async I/O, coroutines, or threads.
Parallelism is a runtime execution property where multiple computations
execute simultaneously on multiple CPU cores or machines. Concurrent
programs may or may not run in parallel (see:
MOD-01/07-processes-and-threads).

## 3. The Problem It Solves

Before concurrency, a server that waits for one database call cannot do
anything else. CPU sits idle while the network is slow. Before
parallelism, a CPU-heavy job uses only one core while others are idle.

Concurrency solves waiting: handle other work while one task is blocked.
Parallelism solves CPU throughput: use multiple cores or machines to do
more work at the same instant.

The distinction solves design confusion. Async I/O does not speed up
CPU-heavy loops; more cores do not fix an API that waits sequentially on
five dependencies.

## 4. Core Concept Breakdown

- **Task:** unit of work such as request, job, or computation.
- **Concurrent:** tasks overlap in time but may take turns on one core.
- **Parallel:** tasks run simultaneously on separate cores or machines.
- **Async I/O:** concurrency by yielding while waiting for I/O.
- **Thread pool:** set of worker threads executing tasks.
- **CPU-bound:** limited by computation.
- **I/O-bound:** limited by waiting for network, disk, or locks.
- **Race condition:** timing-sensitive bug in shared state.
- **Backpressure:** slowing intake when workers or queues are saturated.

## 5. How It Works

Step by step, deciding the execution model:

1. **Classify the workload.** CPU-bound, I/O-bound, or mixed.
2. **For I/O-bound work, use concurrency.** Async I/O or modest thread
   pools overlap waits.
3. **For CPU-bound work, use parallelism.** Multiple cores, workers, or
   processes execute computations.
4. **Avoid unbounded task creation.** Concurrency without limits becomes
   memory pressure.
5. **Protect shared state.** Parallel code needs locks, channels, or
   ownership boundaries.
6. **Use queues for smoothing.** Queues absorb bursts but need limits.
7. **Add backpressure.** Reject or slow intake when downstream is full.
8. **Measure bottleneck.** CPU, I/O, lock contention, and queue wait
   need different fixes.
9. **Tune worker count.** Too few underuse resources; too many cause
   switching and contention.
10. **Keep correctness first.** Fast wrong concurrency is still wrong.

Design review checks:

- **Is work CPU-bound or I/O-bound?**
- **Can tasks share state safely?**
- **Where is backpressure applied?**
- **What queue length is acceptable?**

## 6. Diagram

```mermaid
flowchart TD
    WORK[Workload] --> TYPE{Bottleneck}
    TYPE -->|I/O wait| CONC[Concurrency: async or threads]
    TYPE -->|CPU compute| PARA[Parallelism: cores or workers]
    CONC --> LIMIT[Concurrency limit]
    PARA --> POOL[Worker pool]
    LIMIT --> BP[Backpressure]
    POOL --> BP
```

<!-- IMAGE: timeline comparing one worker interleaving three tasks
versus three workers executing three tasks simultaneously -->

## 7. When to Use It

Use concurrency when:

- **Many tasks wait on I/O.** Web servers, proxies, and API clients fit.
- **You need responsiveness.** UI and event loops stay active.
- **Tasks are mostly independent.** Overlapping waits helps.
- **Resource limits can be enforced.** Concurrency caps prevent
  overload.

Use parallelism when:

- **CPU is the bottleneck.** Encoding, compression, ML inference, and
  large computations fit.
- **Work can be partitioned.** Tasks can run independently.
- **Multiple cores or machines are available.**
- **Synchronization cost is lower than compute gain.**

## 8. When NOT to Use It

- **Do not use async to speed CPU-bound loops.** It only rearranges
  waiting.
- **Do not add threads around a saturated database.** The bottleneck
  moves downstream.
- **Do not create unbounded goroutines, promises, or tasks.**
- **Do not parallelize tiny work where coordination dominates.**

## 9. Real-World Example

**Node.js** uses concurrency through an event loop to handle many I/O
operations without one thread per connection.

**Go** uses goroutines and a scheduler to make concurrent programming
cheap, while the runtime maps runnable goroutines onto OS threads for
parallel execution.

**MapReduce-style systems** use parallelism by splitting data across
many workers.

Realistic number: a service waiting 100 ms on downstream I/O can handle
many concurrent requests on one core if work is mostly waiting. A
CPU-bound 100 ms computation needs more cores or workers for throughput.

## 10. Production-Grade Code

```go
package main

import "sync"

func ParallelMap[T any, R any](items []T, workers int, fn func(T) R) []R {
	jobs := make(chan int)
	results := make([]R, len(items))
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				// Bounded workers create parallelism without launching an
				// unbounded goroutine per item.
				results[i] = fn(items[i])
			}
		}()
	}
	for i := range items {
		jobs <- i
	}
	close(jobs)
	wg.Wait()
	return results
}
```

Why-not-what notes:

- Worker count is explicit because unbounded parallelism causes memory
  pressure and downstream overload.
- Each worker writes a unique result index, avoiding shared write races.
- This helps CPU-bound or blocking work only when `fn` can safely run
  in parallel.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Concurrency improves resource use during waits | Harder control flow | Cancellation and limits |
| Parallelism improves CPU throughput | Race and synchronization bugs | Ownership and locks |
| Async I/O handles many connections | CPU work can block event loop | Worker offload |
| Worker pools bound resource use | Queues add latency | Backpressure |
| Goroutines/tasks simplify structure | Easy to create too many | Monitoring and limits |

## 12. Comparison Table

| Approach | Best fit | Uses multiple cores | Main risk | Example |
|---|---|---|---|---|
| Async event loop | I/O-bound services | not by itself | blocking CPU work | Node.js server |
| Thread pool | blocking I/O or mixed work | yes | contention | Java web server |
| Goroutines | many concurrent tasks | yes via runtime | unbounded fanout | Go service |
| Process pool | CPU and isolation | yes | IPC overhead | image workers |

## 13. Numbers & Benchmarks

- **CPU-bound scaling:** throughput often improves up to core count,
  then flattens or worsens.
- **I/O-bound scaling:** concurrency can exceed core count because many
  tasks are waiting.
- **Queue length:** rising queue time is an early overload signal.
- **Context switching:** too many runnable threads can reduce useful CPU.
- **Backpressure:** rejecting early is often better than timing out
  late.

## 14. Common Pitfalls

- **Incident: async CPU freeze.** A single CPU-heavy handler blocked
  the event loop and delayed unrelated requests.
- **Incident: goroutine leak.** A channel was never closed, leaving
  thousands of stuck goroutines.
- **Incident: unbounded Promise fanout.** One request launched 10,000
  downstream calls and triggered rate limits.

## 15. Interview Q&A

**Q1. Concurrency vs parallelism?** Model answer: concurrency is many
tasks in progress; parallelism is many tasks executing at the same
time.

**Q2. Can one CPU core run concurrent code?** Model answer: yes, by
interleaving tasks. It cannot run them in parallel.

**Q3. Why does async help I/O-bound workloads?** Model answer: the
program can do other work while waiting for network or disk.

**Q4. Why does CPU-bound work need parallelism?** Model answer: it
needs actual compute resources, not just better waiting.

**Q5. What is backpressure?** Model answer: a mechanism to slow or
reject intake when downstream capacity is full.

## 16. Follow-up / Curveball Questions

**Curveball 1. A service has low CPU but high latency.** Answer
direction: likely I/O wait, queueing, lock contention, or downstream
latency, not lack of parallelism.

**Curveball 2. Adding workers made throughput worse.** Answer
direction: contention, context switching, database saturation, or cache
misses may dominate.

**Curveball 3. Need 10,000 concurrent connections.** Answer direction:
event-driven I/O or lightweight tasks are better than one OS thread per
connection.

## 17. Cheat-Sheet Summary

- Concurrency is structure; parallelism is simultaneous execution.
- I/O-bound work benefits from concurrency.
- CPU-bound work benefits from parallelism.
- Unbounded concurrency creates overload.
- Backpressure and limits are part of correct design.

## 18. Further Reading

- Rob Pike, "Concurrency is not Parallelism":
  https://go.dev/blog/waza-talk
- Go blog, "Pipelines and cancellation":
  https://go.dev/blog/pipelines
- Node.js guide, "Don't block the event loop":
  https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (chef analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (waiting vs CPU bottleneck)
4. Core Concept Breakdown - Covered (9 concepts)
5. How It Works - Covered (10 steps plus design checks)
6. Diagram - Covered (flowchart)
7. When to Use It - Covered (concurrency and parallelism triggers)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (Node.js, Go, MapReduce)
10. Production-Grade Code - Covered (Go bounded worker pool)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (4 approaches)
13. Numbers & Benchmarks - Covered (5 figures)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 URL-backed sources)

No em-dashes. No emojis. Cross-links included.
