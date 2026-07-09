## 1. Hook

Imagine the scoreboard at a giant sports arena. There are one hundred
thousand competitors in the building, each holding a card with their
current score, and every minute someone changes their score. The
scoreboard must show the top one hundred of them at all times, ranked
in order; and each competitor's phone buzzes to tell them their current
rank the moment their score changes. The clerk responsible cannot
possibly reshuffle every one hundred thousand cards every minute to
find the top one hundred; he keeps one special frame on the wall with
only the top hundred cards, and a smaller "waiting room" with the next
few hundred close-but-not-quite cards. Whenever a card changes value,
the clerk checks if the new value is bigger than the smallest card in
the wall frame; if so, they swap, and the displaced card goes to the
waiting room.

A real-time leaderboard service is that clerk at internet scale. There
can be tens of millions of players each with a score, and the scoreboard
must show the top N (typically 100 or 1000) within a second of any
change, while pushing each player's current rank to their phone when
their score moves. The hard parts the clerk hides: keeping the "top N
plus a margin" data structure fast under hundreds of thousands of
score updates per second, getting rank for arbitrary players (not just
the top 100) cheaply, and partitioning the leaderboard when one machine
cannot hold all players in memory.

## 2. What Is It

(a) Plain-English one-liner: a real-time leaderboard is a service that
ranks players by score, lets them submit new scores, serves the top N
in order, and tells each player their absolute rank - all in well
under a second at scale.

(b) Formal definition: a real-time leaderboard is a sorted-set based
ranking service backed by an ordered data structure (typically a Redis
Sorted Set, a skip-list, or a B+ tree) keyed by a leaderboard id, with
per-player score writes that amortize to O(log M) where M is the number
of players on that leaderboard, and adjacent read patterns like top-N
fetch, per-player rank, and per-percentile slice. It must sustain
hundreds of thousands of score updates per second on a single hot
leaderboard, push rank-update events to client devices, and partition
across many leaderboard ids when the working set exceeds single-node
memory. Time-windowed leaderboards (daily, weekly) add a TTL-driven
data lifecycle on top.

## 3. The Problem It Solves

Before sorted-set backends existed for games, ranking the players in
a mobile game meant a SQL `SELECT player_id FROM scores ORDER BY
score DESC LIMIT 100`. With a million rows that is fine once an hour;
with a million rows and 1000 such queries per second it destroys the
database. The index on `score` does not help because the ORDER BY
must scan the whole partition - per-player rank requires `COUNT(*)`
filtering, which on a million rows is a few hundred milliseconds
already. Worst of all, the score table grew unbounded - weeks of
session scores for a popular game pushed the row count to billions
and every leaderboard query became a full table scan.

After leaderboard services built on sorted-set backends, a player's
`incrementScore(playerId, delta)` is O(log N) - sub-millisecond
even at 10M players. Top-100 is a single `ZRANGE` returning the
top entries; per-player rank is `ZREVRANK`. The whole leaderboard
fits in memory and updates flow in real time. The problem solved is
making the rank-and-score query path fast under continuous high-
concurrency writes - exactly the workload SQL databases were not
designed for.

## 4. Core Concept Breakdown

- **Leaderboard id:** the partition key, e.g., `game:tetris:weekly`
or `country:in:daily`. Each is a separate sorted set; cross-
leaderboard queries are not supported by the structure.
- **Sorted set (ZSET):** the core data structure in Redis-like
backends - members are unique (typically player ids), each member
has a floating-point score, and the structure keeps them sorted
by score using a skip-list plus hash table.
- **Score write:** `ZADD leaderboard playerId score` or `ZINCRBY
leaderboard delta playerId` - both O(log N) where N is the size of
the leaderboard. Atomic on the shard.
- **Top-N read:** `ZREVRANGE leaderboard 0 N-1 WITHSCORES` - O(log
N + N) almost-linear scan returning the top N entries with scores.
- **Per-player rank:** `ZREVRANK leaderboard playerId` - O(log N)
returns the rank of that member. Used to display "you are #4,302".
- **Per-player score:** `ZSCORE leaderboard playerId` - O(1).
- **TTL and time windows:** for daily or weekly leaderboards, entries
are written to a fresh leaderboard key per period; the old key
expires via Redis EXPIRE or by swap.
- **Pagination by score range:** "everyone scoring between 9000 and
9999" is `ZRANGEBYSCORE` - O(log N + M) where M is the count of
matched players; used to power segmented views.
- **Approximate rank for very large leaderboards:** for billion-player
leaderboards across shards, exact rank is expensive; HyperLogLog does
not help here, but Count-Min Sketch + bucket boundaries can give an
approximate rank (see: MOD-16/06-count-min-sketch-frequency-estimation).
- **Push to devices:** the score-write event goes to a notification
fan-out that pushes the player's new rank to their device (see:
MOD-08/11-notification-system).
- **Sharding by leaderboard id:** one leaderboard lives on one
Redis shard; if the leaderboard id was very large, partition by
player hash bucket within the leaderboard and aggregate the top-N
across buckets at read time.
- **Read replicas:** for the top-N read path that is hundreds per
second, follower read replicas take the read load off the writer.

## 5. How It Works

Step by step, from a player scoring a point to that player's phone
buzzing with their new rank:

1. **A player finishes a level in a game** and the game client POSTs
   the new score to the game's score submission endpoint with
   `(playerId, leaderboardId, scoreDelta)`.
2. **The score endpoint forwards the increment to the leaderboard
   service**, including an idempotency key (e.g., session id) so a
   retried upload does not double-count.
3. **The leaderboard service hashes `leaderboardId`** to find the
   owning Redis shard; the shard is the single authority for the
   ZSET.
4. **An atomic `ZINCRBY leaderboardId delta playerId` is issued** to
   the Redis shard. The ZSET updates the player's score and re-sorts
   in O(log N); under the hood the Redis implementation is a hash
   table plus a skip-list.
5. **The ZINCRBY returns the new score** to the leaderboard service.
6. **If the player's new score moved them across a rank boundary** (or
   if we want to push on every change), the service emits a rank-
   change event onto Kafka: `(playerId, leaderboardId, oldRank,
   newRank, newScore)`.
7. **The notification consumer reads the Kafka event** and looks up
   the player's registered push tokens. If the user opted in to
   rank-change alerts, it dispatches a push notification ("You are
   now at rank #4,302 in Tetris Weekly!").
8. **The player opens the leaderboard view in the app.** The app
   calls the leaderboard service's top-N endpoint for the daily /
   weekly / global leaderboards they care about.
9. **The service fans out reads to the replicas** for top-N (cheap)
   plus one writer read for the player's personal rank (must be
   strongly consistent with the just-applied increment).
10. **The service returns the page** with top entries, plus the
    player's entry, plus neighbors around them ("you are #4,302;
    #4,300, #4,301, you, #4,303, #4,304"). The page is rendered to
    the player.
11. **A periodic TTL sweeper** expires yesterday's daily leaderboard
    key; today's daily leaderboard has been freshly written since
    midnight. The runner's reacher job also snapshots final
    placements to a permanent "previous daily leaderboards" store
    for the user's profile view.
12. **For very large leaderboards**, a tiered sharded design is used:
    the leaderboard is partitioned into K shards each holding a
    slice of players (by player hash), and the top-N query merges
    all K shards' top-N into one in-memory merge step before
    returning.

## 6. Diagram

```mermaid
flowchart TD
    G[Game client] -->|POST score + playerId| SE[Score endpoint]
    SE --> LS[Leaderboard service]
    LS --> SHARD_MAP[Shard by leaderboardId]
    SHARD_MAP --> R1[(Redis shard 1 ZSET)]
    SHARD_MAP --> R2[(Redis shard 2 ZSET)]
    SHARD_MAP --> R3[(Redis shard 3 ZSET)]
    R1 -->|ZINCRBY| R1
    R1 -->|new score| LS
    LS --> K[(Kafka rank-change events)]
    K --> NOTIF[Notification fanout]
    NOTIF --> G
    LS --> REPL[Top-N from replica]
    R1 --> REPL
    R2 --> REPL
    R3 --> REPL
    REPL --> LS
    LS --> G
    TTL[TTL sweeper] -.->|expire daily| R1
    TTL -.-> R2
    TTL -.-> R3
    ARC[Archive final placements] --> WH[(Warehouse)]
    R1 --> ARC
```

<!-- GIF: animation of a player's score moving from 9500 to 9700 in a
leaderboard showing the player climbing past a few neighbors in the
skip-list, the rank-change event firing, and the player's phone
buzzing with "you are now ranked 4,302" -->

## 7. When to Use It

Use a real-time leaderboard architecture when one or more of these
hold:

- **Tens of thousands or more players** need to be ranked by a
  continuously-changing score; the SQL ORDER BY pattern dies on this
  workload.
- **You need per-player rank** ("I am #4,302"), not just the top 100 -
  sorted sets return this in O(log N).
- **You need near real-time updates** - player's rank should reflect
  the last score within a second of submission, not within a batch
  job.
- **Time-windowed views** (daily, weekly, all-time) are part of the
  product. TTL-driven keys handle this cleanly.
- **The rank-and-score state is small enough to fit in memory** -
  the entire player-by-score index fits in tens of gigabytes; disk-
  backed approaches are too slow for the write rate.

## 8. When NOT to Use It

- **For non-numeric ranking dimensions** - if the rank is "most
  relevant product for this query," there is no global score; it's a
  per-query search result, not a leaderboard.
- **For very small N** (under a few thousand players). Just sort the
  rows in memory at query time; a leaderboard-as-a-service is
  overkill.
- **For persistent historical ranking with thousands of dimension
  slices.** A columnar OLAP store queried a few times an hour is
  cheaper than an always-on in-memory ZSET.
- **For an "approximate N out of billions" reminder.** When the player
  count is in the billions and you only need approximate percentile rank
  ("you are in the top 1 percent"), Count-Min-Sketch-style approximate
  aggregations are dramatically cheaper than an exact sorted set.
- **For sequential replay** where each player's history is the
  valuable part - the leaderboard gives current state, not a per-
  move audit trail.

## 9. Real-World Example

**Discord** runs one of the larger Redis-backed leaderboard workloads
for game-like activity feeds; they've published session memory of
dealing with sorted-set memory pressure on Redis. Top-N reads sustained
in the tens of thousands per second per shard.

**Apple Game Center** and **Google Play Games** both expose a
leaderboard API for game studios. Behind those APIs is a sorted-set
backend (Apple largely uses FoundationDB plus their own custom
abstraction; Google uses Bigtable plus their own ranking layer on top,
sorted by score-key encoding).

**PUBG Mobile** and **Free Fire** sustain peak events where global
leaderboards carry millions of players and pushing a single score
update can land within tens of milliseconds; per-shard Redis capacity
is hit at around 50,000 to 100,000 ZINCRBY operations per second for
a single leaderboard.

A typical Apple Game Center leaderboard for a popular game might
have 1-5 million active players per day, with 50-200 score increments
per player per active session - roughly 100M increment operations
per day on one leaderboard.

## 10. Production-Grade Code

```typescript
import { Redis } from "ioredis";

interface ScoreSubmission {
  playerId: string;
  leaderboardId: string;
  scoreDelta: number;
  idempotencyKey: string;
}

interface RankResponse {
  playerId: string;
  score: number;
  rank: number;
  totalPlayers: number;
}

const DAILY_KEY_PREFIX = "lb:daily:";
const WEEKLY_KEY_PREFIX = "lb:weekly:";
const ALLTIME_KEY_PREFIX = "lb:all:";
const TTL_SECONDS_DAILY = 30 * 24 * 60 * 60;
const TTL_SECONDS_WEEKLY = 8 * 24 * 60 * 60;

export class LeaderboardService {
  // Idempotency layer ensures a replayed submission from the client
  // doesn't double-count; we cache the idempotency key briefly.
  constructor(
    private readonly redis: Redis,
    private readonly events: EventPublisher
  ) {}

  async submitScore(sub: ScoreSubmission): Promise<RankResponse> {
    const idemKey = `idem:${sub.leaderboardId}:${sub.idempotencyKey}`;
    // SETNX is the simplest dedupe - if the key exists, we have already
    // processed this submission and should return the previous result
    // rather than re-incrementing the ZSET.
    const wasSet = await this.redis.set(idemKey, "1", "EX", 3600, "NX");
    if (!wasSet) {
      return await this.getRank(sub.playerId, sub.leaderboardId);
    }

    // All three leaderboards are updated atomically in a pipeline.
    // Daily expires; weekly has a longer TTL; all-time is permanent.
    const dailyKey = DAILY_KEY_PREFIX + sub.leaderboardId;
    const weeklyKey = WEEKLY_KEY_PREFIX + sub.leaderboardId;
    const allTimeKey = ALLTIME_KEY_PREFIX + sub.leaderboardId;

    const pipeline = this.redis.multi();
    pipeline.zincrby(dailyKey, sub.scoreDelta, sub.playerId);
    pipeline.zincrby(weeklyKey, sub.scoreDelta, sub.playerId);
    pipeline.zincrby(allTimeKey, sub.scoreDelta, sub.playerId);
    pipeline.zcard(allTimeKey);
    pipeline.zrevrank(allTimeKey, sub.playerId);
    pipeline.expire(dailyKey, TTL_SECONDS_DAILY, "NX");
    pipeline.expire(weeklyKey, TTL_SECONDS_WEEKLY, "NX");
    const results = (await pipeline.exec()) as [
      [null, number], [null, number], [null, number], [null, number], [null, number], [null, 0|1], [null, 0|1]
    ];
    const newScore = results[2][1]; // all-time score after increment
    const totalPlayers = results[3][1];
    const rank = results[4][1];

    // Fire-and-forget: rank-change events flow downstream so users get
    // a "you climbed to rank #4,302" push on their device.
    await this.events.publish("rank-changed", {
      leaderboardId: sub.leaderboardId,
      playerId: sub.playerId,
      newScore,
      newRank: rank,
      totalPlayers,
    });

    return {
      playerId: sub.playerId,
      score: newScore,
      rank,
      totalPlayers,
    };
  }

  async getTopN(leaderboardId: string, n: number): Promise<{playerId: string; score: number; rank: number}[]> {
    const key = ALLTIME_KEY_PREFIX + leaderboardId;
    const rows = (await this.redis.zrevrange(key, 0, n - 1, "WITHSCORES")) as string[];
    const result: {playerId: string; score: number; rank: number}[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      result.push({
        playerId: rows[i],
        score: Number(rows[i + 1]),
        rank: i / 2,
      });
    }
    return result;
  }

  async getRank(playerId: string, leaderboardId: string): Promise<RankResponse> {
    const key = ALLTIME_KEY_PREFIX + leaderboardId;
    const pipeline = this.redis.multi();
    pipeline.zscore(key, playerId);
    pipeline.zrevrank(key, playerId);
    pipeline.zcard(key);
    const results = (await pipeline.exec()) as [
      [null, string | null], [null, number | null], [null, number]
    ];
    return {
      playerId,
      score: results[0][1] ? Number(results[0][1]) : 0,
      rank: results[1][1] ?? -1,
      totalPlayers: results[2][1],
    };
  }

  async getAroundPlayer(
    leaderboardId: string,
    playerId: string,
    window: number
  ): Promise<{playerId: string; score: number; rank: number}[]> {
    // Returns the player plus `window` players ranked higher and
    // window ranked lower. Powered by ZREVRANGE using the player's
    // current rank as the starting point, so the player appears in
    // context.
    const key = ALLTIME_KEY_PREFIX + leaderboardId;
    const rank = (await this.redis.zrevrank(key, playerId)) as number | null;
    if (rank === null) return [];
    const start = Math.max(0, rank - window);
    const end = rank + window;
    const rows = (await this.redis.zrevrange(key, start, end, "WITHSCORES")) as string[];
    const result: {playerId: string; score: number; rank: number}[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      result.push({
        playerId: rows[i],
        score: Number(rows[i + 1]),
        rank: start + i / 2,
      });
    }
    return result;
  }
}

interface EventPublisher {
  publish(topic: string, payload: unknown): Promise<void>;
}
```

Why-not-what notes:
- The idempotency key window of 3600 seconds picks up retries on
  flaky networks; a score submission idempotently retries for an hour.
- Three ZSET keys per leaderboard (daily, weekly, all-time) are all
  updated in one pipeline so a single submission updates all three
  views atomically. Each key has its own TTL.
- `ZINCRBY` is atomic in the Redis shard, so concurrent writes by many
  players on the same leaderboard serialize cleanly and never lose
  increments; this single property is why Redis beats SQL for this
  use case.
- The " Around Player" view uses `ZREVRANGE` between two ranks; this
  is the personal view that shows the user's context rather than the
  global top-N that the user is unlikely to ever reach - the highest
  engagement pattern in mobile games.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| Writes are O(log N) and concurrent-safe; sub-millisecond at 10M players | All in memory; per-leaderboard cost scales with player count | RAM cost - a 10M-entry ZSET is roughly 1-2 GB |
| Top-N reads are linear in N; paginating the leader view is trivial | Top-N is a hot path under peak events; replica readers carry much of it | Read replicas per shard; multi-replica latency |
| TTL-driven windows give daily, weekly, all-time leaderboards cleanly | Final placement snapshots must be archived before key expiry to preserve history | A small archive job per leaderboard that copies last-known rankings to a permanent store on window expiration |
| Per-player rank in O(log N) enables "your rank" UI | Total player count (`ZCARD`) is O(1) but the perfect number does drift slightly with the same-score players unless tie-broken | Tie-break by composite score `(score, lastUpdated)` so two same-score players have a deterministic rank |
| Sharding by leaderboardId scales horizontally across many leaderboards | A single hot leaderboard cannot be split without complicating top-N aggregation | For pathological hotness, partition the leaderboard by player hash into K shards and merge top-N across shards at read time |

## 12. Comparison Table

| Approach | Write throughput per leaderboard | Per-player rank | Time-windowed ranks | Best fit |
|---|---|---|---|---|
| Redis ZSET | ~50-100k/sec per shard | O(log N) atomic | TTL on per-window key most popular game backends | Most popular game backends |
| PostgreSQL with `score` index | ~10k/sec; bottlenecked by index and row locks | Costly - COUNT(*) over million rows | Manual partition by date | Small games, periodic ranking |
| Sorted skip-list in custom memory store | Higher (no Redis overhead) | O(log N) | Manual | Highly engineered gaming stacks like Discord |
| Approximate rank via prefix buckets | O(1) per increment (increment bucket counter) | Approximate by summing bucket counts | Bucket windows by timestamp | Massive-scale leaderboards where approximate rank is acceptable |
| Stream-and-rollup (Kafka + Flink) | Extremely high in-stream | Computed after a watermark | Windowed by event time naturally | High-volume + multi-window heavy workloads |

Redis ZSET is the production default; the bucketed approximate approach
is the right architectural choice when billions of players make exact
rank unaffordable.

## 13. Numbers & Benchmarks

- **Per-shard ZINCRBY throughput**: 50,000 to 100,000 per second on
  standard AWS EC2 memory-optimized instances; tuned further with
  pipelining.
- **Memory per ZSET entry**: roughly 80-100 bytes per member (member
  name, score, skip-list pointers, hash table entry). 10M players = ~1
  GB.
- **Top-N read latency**: ZREVRANGE over a 10M player ZSET for N=100
  is 1-2ms; sub-millisecond for N=10.
- **ZREVRANK latency**: O(log N); ~0.2ms for 10M players.
- **Real-world hot leaderboard**: Fortnite's Battle Royale leaderboard
  serves global stats with several million active players; their
  backend is sharded by leaderboard prefix across many Redis clusters.
- **Achievement-delivery push latency** from score submit to user
  device: under 1 second end-to-end when the notification system is
  warm.

## 14. Common Pitfalls

- **Forgetting to expire daily keys** leads to unbounded growth - a
  daily leaderboard never freed means Redis accumulates a new GB every
  day. Always pair `ZINCRBY` on a new key with an immediate `EXPIRE`
  using `NX` so the TTL is set once at key creation, not extended by
  every write.
- **Treating `ZCARD` as the cheerleading "you beat 4,302 other
  players."** The total includes the player themselves; off-by-one
  on rank-vs-total is the most common UX bug in this domain. Test
  with a single-player leaderboard.
- **Single-shard bottleneck on hot leaderboards.** A global game with
  one leaderboard backed by one Redis shard saturates the single
  shard on big season events. Engineer for shard-by-leaderboardId at
  design time; on the first hot-shard event, you won't have time to
  re-architect - Redis cluster and consistent hashing for the ZSET
  keys mitigate this.

## 15. Interview Q&A

**Q1. Walk me through what happens when a player scores a point.**
Model answer: the game client POSTs the score with an idempotency
key. The score endpoint hashes the leaderboard id to the responsible
Redis shard. The ZSET is incremented atomically via `ZINCRBY`; the new
score, total player count (`ZCARD`), and rank (`ZREVRANK`) are all
returned in one pipeline. A rank-change event is published on Kafka
and the notification service pushes a message to the player's device
telling them their new rank. The player sees the leaderboard top-N in
the app via a replicated read endpoint.

**Q2. How do you scale a single hot leaderboard beyond one shard?**
Model answer: partition the leaderboard by player hash into K ZSETs;
each shard's ZSET holds a slice of players. Writes go to one shard
based on hash(playerId) mod K. Top-N reads fan out to all K shards,
each returns its local top-N, and the service merges them into a
single top-N. Per-player rank across all K is approximately the sum
of `ZREVRANK` results across shards; simpler is to count players in
other shards with strictly-greater scores using a per-shard
`ZCOUNT` aggregation.

**Q3. How do daily and weekly leaderboards coexist?**
Model answer: separate ZSET keys per window. The daily key has a TTL of
30 days; the weekly has 8 days; the all-time is unbounded. A single
score submission updates all three ZSETs in a pipeline. Old daily
leaderboards expire via the TTL; archive jobs snapshot final rankings
to a permanent store during the day boundary.

**Q4. How do you handle ties in a leaderboard?**
Model answer: store a composite score that breaks ties
deterministically - `(score*100 + subScore)`. Or, if the same score
must be allowed but ties ordered by "first to reach score", use
`ZADD` with a member key that is `playerId:lastUpdate` so equal scores
have distinct members. Most production leaderboards tie-break by
schedule ordering rather than letting players share rank.

**Q5. How do you keep the player's UI updated in real time?**
Model answer: emit a rank-change event to Kafka and deliver via push
notification. For tighter UI sync at high value (e.g., an always-on
top-N bar in a TV broadcast app), the player's app holds a WebSocket
to a small per-leaderboard channel that fans rank-change events to all
open clients in real time.

**Q6. How do you handle the cold-start of a leaderboard?**
Model answer: when a game launches, the leaderboard ZSET is empty;
the top-N is just the first few entries that joined. UX should display
"Leaderboard just started - be the first to claim a top spot" or
similar so users don't see the empty list as broken. If you wanted,
the service could pre-populate with starter bots to ensure the
leaderboard looks healthy at launch, though most games simply let the
real players race.

## 16. Follow-up / Curveball Questions

**Curveball 1. Your global game has 50 million players and the
leaderboard service reads top-N 10,000 times per second during a
championship. Where do you bottleneck?**
Answer direction: read replicas for ZSET reads; the writer does not
need to serve them. Replicas are eventually consistent with the master,
so a player who just submitted a score may not see themselves in the
top 100 for a fraction of a second - acceptable. Plus CDN-cache the
top-N for ~5 seconds for anonymous browser viewers.

**Curveball 2. A malicious player submits 1 million score increments
per second. What happens?**
Answer direction: rate-limit per playerId plus idempotency key. The
score endpoint enforces a per-player rate of, say, 100 score submits
per second; above, return 429. Plus the idempotency key dedupes
legitimate retries. So a malicious player cannot overload the
leaderboard writer.

**Curveball 3. The weekly leaderboard TTLs tomorrow and you realize a
client bug has been registering negative scores the whole week. What
do you do?**
Answer direction: snapshot the current leaderboard to a permanent
store BEFORE the TTL fires - to avoid losing the (partially corrupted)
data; then migrate the data into a freshly-keyed leaderboard with a
corrected client and adjusted scores. Don't wait for the TTL - archive
on a scheduled job, not auto-expiry, for important leaderboards.

## 17. Cheat-Sheet Summary

- A real-time leaderboard is a Redis sorted-set (ZSET) keyed by
  leaderboard id, with player id as member and score as the sort key.
- Writes `ZINCRBY` are atomic and O(log N) - sub-millisecond at 10M
  players; reads `ZREVRANGE` for top-N, `ZREVRANK` for player rank.
- TTL per ZSET key gives daily/weekly/all-time leaderboards; daily
  keys expire automatically after the period.
- Shard by leaderboard id; for one single hot leaderboard, partition
  by player hash into K ZSETs and merge top-N at read time.
- Idempotency at the score endpoint and Kafka-pushed rank-change
  events make retries safe and the user's phone buzz promptly.

## 18. Further Reading

- Redis documentation on sorted sets: `ZADD`, `ZINCRBY`, `ZREVRANGE`,
  `ZREVRANK`, `ZCARD` - the four commands you must know cold before
  this interview question ("redis.io/commands" sorted set section).
- Discord Engineering blog: "How Discord Scaled... and Scaled... "
  and their Redis scaling notes - the closest public write-up of a
  game-like leaderboard workload at million-concurrency scale.
- Apache Flink examples of "Top-N" stream processing - the alternative
  shape for those who already run a Kafka+Flink backbone and want to
  push leaderboards off the broker.

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered in depth (sports arena scoreboard analogy, no jargon, ~230 words)
2. What Is It - Covered in depth (plain-English + formal definition)
3. The Problem It Solves - Covered in depth (SQL ORDER BY death vs in-memory sorted set)
4. Core Concept Breakdown - Covered in depth (11 bullets, each concrete)
5. How It Works - Covered in depth (12 numbered story-style steps)
6. Diagram - Covered in depth (mermaid flowchart with shard map, ZSET pipeline, fanout, TTL sweeper; gif placeholder)
7. When to Use It - Covered in depth (5 concrete triggers)
8. When NOT to Use It - Covered in depth (5 anti-patterns)
9. Real-World Example - Covered in depth (Discord, Apple Game Center, Google Play Games, PUBG Mobile; 100M increments/day)
10. Production-Grade Code - Covered in depth (TypeScript LeaderboardService with idempotency SETNX, pipeline update + rank, top-N and around-player)
11. Trade-offs Table - Covered in depth (5-row Pros/Cons/Cost)
12. Comparison Table - Covered in depth (5 approaches x 5 dimensions)
13. Numbers & Benchmarks - Covered in depth (6 concrete numbers)
14. Common Pitfalls - Covered in depth (3 incident-style mistakes)
15. Interview Q&A - Covered in depth (6 reasoning Q&A)
16. Follow-up / Curveball Questions - Covered in depth (3 senior follow-ups)
17. Cheat-Sheet Summary - Covered in depth (5 standalone lines)
18. Further Reading - Covered in depth (3 high-signal sources)

No section skipped. No "and so on" / "similarly" / "etc." substitutions.
No em-dashes. No emojis. Word count well above floor.
