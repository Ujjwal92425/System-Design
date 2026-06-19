export const module08Lessons = [
    {
    id: "lesson-08-01",
    slug: "system-design-problems-01-url-shortener",
    title: "Design URL Shortener (tinyurl)",
    content: `## 0. Mental Model

**Think of a URL shortener as a concierge in a large hotel who maintains a tiny notebook mapping guest names to room numbers.** When a guest arrives (long URL), the concierge assigns a short, unique room number (short key) and writes it in the notebook. When anyone asks for that room number, the concierge immediately points them to the correct room (HTTP redirect). At scale, imagine thousands of guests arriving every minute, millions of people asking for directions per hour, and a handful of popular room numbers being requested thousands of times per second — the concierge needs a smart indexing system (cache), a fast way to generate unique room numbers (key generation service), and a backup system (database) in case the notebook gets too full.

## 1. Quick Summary

Designing a **URL shortener** (like TinyURL or bit.ly) is a classic system design interview problem. The core service takes a long URL and returns a short, unique alias (e.g., \`https://tinyurl.com/abc123\`). When users visit the short URL, they are **HTTP 301 redirected** to the original URL. Key challenges: **generating unique short keys** at scale, **handling 100M+ URLs**, **low-latency redirection** (<10ms), **analytics tracking**, and **custom alias** support. The system uses a **base-62 encoding** (a-z, A-Z, 0-9 = 62 chars) for compact keys, a distributed **key generation service** (snowflake-like ID or pre-generated key pool), and a **caching layer** (Redis) for hot URLs. At scale, serve 10B+ redirects/month with 99.99% availability.

## 2. Definition & Terminology

A **URL shortener** is a web service that converts long, unwieldy URLs into short aliases that redirect to the original URL. The short URL typically consists of the service domain followed by a **unique alphanumeric key** (6-8 characters). The system stores the mapping in a database and performs an **HTTP redirect** (301 Moved Permanently or 302 Found) when the short URL is accessed.

Key terminology:
- **Short key**: The unique identifier portion of the shortened URL (e.g., \`abc123\`).
- **Base-62 encoding**: An encoding scheme using A-Z, a-z, 0-9 (62 characters) to represent numeric IDs as compact strings.
- **Redirect**: HTTP response (301 or 302) that tells the browser to navigate to a different URL.
- **Custom alias**: User-defined short key instead of auto-generated (e.g., \`tinyurl.com/mybrand\`).
- **Key collision**: Two different long URLs generating the same short key.
- **Analytics pipeline**: System for tracking clicks, referrers, geographic data, and device types.
- **TTL (Time To Live)**: Expiration time for a shortened URL.
- **Snowflake ID**: A distributed unique ID generator (Twitter's approach) that produces time-sorted 64-bit IDs.

Core data model:
- Short key (PK): \`abc123\` (7 chars, base-62)
- Original URL: \`https://www.example.com/very/long/path?with=params&and=more\`
- Created at: timestamp
- Expires at: optional TTL
- User ID: optional owner
- Click count: analytics counter

## 3. The Problem Without It

Before URL shorteners, sharing long URLs in constrained environments was painful:

- **Character limits**: Twitter's original 140-character limit meant a 200-character URL consumed most of the tweet. Users relied on third-party link shrinkers or URL truncation that broke links.
- **No analytics**: Raw links provide no click-through data. Marketers had no way to measure campaign performance, track user engagement, or A/B test link destinations.
- **Memorability**: Long URLs with query parameters, session IDs, and tracking tokens are impossible to memorize, share verbally, or print on business cards.
- **QR code density**: Long URLs create dense QR code patterns that are harder to scan and require higher camera resolution.
- **Link management**: Without a centralized service, there is no way to update or expire shared links. A broken URL in a printed brochure is permanently broken.
- **Branding**: Organizations cannot create consistent, branded short domains (e.g., \`amzn.to\`, \`nyti.ms\`) without a URL shortening service.

## 4. How It Works — Core Mechanics

The URL shortener operates in two primary flows: **URL creation** (write path) and **URL redirection** (read path).

**Write Path (Create Short URL):**

1. Client sends \`POST /api/v1/url/shorten\` with \`{ "url": "https://...", "customAlias": null, "ttlSeconds": null }\`.
2. Server validates the URL (format check, optional reachability verification via HEAD request).
3. Server requests a **unique short key** from the Key Generation Service.
4. If a custom alias is provided, the server checks for uniqueness in the database.
5. Server inserts mapping: \`INSERT INTO urls (short_key, original_url, created_at) VALUES (?, ?, NOW())\`.
6. Server caches mapping in Redis: \`SET short_key "original_url" EX <ttl>\`.
7. Response returns \`{ "shortUrl": "https://tiny.url/abc123", "key": "abc123" }\`.

**Key Generation Strategies:**

| Strategy | Mechanics | Pros | Cons |
|----------|-----------|------|------|
| Base-62 + Auto Increment ID | Encodes a distributed unique ID (Snowflake) to base-62 | Simple, collision-free, sequential | Predictable keys (security), needs ID generator |
| Pre-generated Key Pool | Key service pre-generates random keys, stores in pool, assigns on demand | Very fast at write time, random keys | Pool management overhead, potential exhaustion |
| Hash-based (MD5/SHA-256) | Hash URL + salt, take first 7 chars of base-62 | Deterministic (dedup), no ID generator | Collision handling, CPU overhead |

**Recommended: Base-62 with Snowflake ID** for most systems.

**Read Path (Redirect):**

1. Client navigates to \`https://tiny.url/abc123\`.
2. DNS resolves, request hits load balancer.
3. API extracts \`abc123\` from the URL path.
4. Server checks **Redis cache** for the mapping.
5. On **cache hit**: Immediately return \`301 Moved Permanently\` with \`Location: original_url\`.
6. On **cache miss**: Query database, populate cache, return redirect.
7. Server asynchronously logs analytics data (click, referrer, user-agent, IP, timestamp).

## 5. Variants & Flavors

| Variant | Description | Example Use Case |
|---------|-------------|------------------|
| **Public URL Shortener** | Open to anyone, free tier with ads or rate limits | bit.ly, TinyURL |
| **Enterprise URL Shortener** | Custom domains, team management, advanced analytics, branded links | Rebrandly, Bitly Enterprise |
| **Internal URL Shortener** | Private service for a company's internal links | Twitter's t.co, Google's go/ links |
| **Ephemeral URL Shortener** | Links auto-expire after a set time or number of clicks | Disposable email link services |
| **Campaign URL Shortener** | Tracks UTM parameters, A/B testing, audience segmentation | Marketing automation platforms |
| **Decentralized URL Shortener** | Uses blockchain/DHT to avoid single point of failure | IPFS-based shorteners |
| **QR Code Generator + Shortener** | Generates QR codes with embedded short URLs | QR code marketing campaigns |

## 6. Performance Characteristics

**Capacity Estimation (100M new URLs/month, 10B redirects/month):**

| Metric | Value |
|--------|-------|
| Write QPS | 100M / (30*24*3600) approx 38 writes/sec |
| Peak writes | approx 100 writes/sec (3x spike) |
| Read QPS | 10B / (30*24*3600) approx 3,860 reads/sec |
| Peak reads | approx 12,000 reads/sec (events, campaigns) |
| Storage (7 years) | 100M * 12 * 7 = approx 8.4B URLs — approx 2TB (250 bytes/row) |
| Cache (20% hot, 1 day TTL) | 12,000 * 3600 * 24 * 0.2 = approx 200M entries — approx 32GB Redis |
| Analytics storage | 10B * 365 * 5 = approx 18.25T events — approx 180TB (compressed) |
| Bandwidth (redirects) | 10B * 1KB = 10TB/month outbound |

**Read/Write Ratio**: approx 100:1 — the system is heavily read-heavy. Caching is absolutely critical.

**Latency Targets**:
- Redirect P99 latency: <10ms (including cache lookup)
- URL creation P99 latency: <50ms
- Analytics eventual consistency: <1 minute

**Availability**: 99.99% (52 minutes downtime/year). Redundant across 3+ AZs.

**Key bottleneck**: Database writes during campaign launches (100x write spikes). Mitigation: write buffer + batch inserts.

## 7. Failure Modes

- **Database failure**: If the primary DB goes down, redirects still work from cache (cache-aside pattern). But new URL creation fails. Mitigation: Multi-AZ DB deployment, read replicas.
- **Cache failure**: If Redis cluster goes down, every redirect becomes a DB read. DB can handle approx 10K QPS but may degrade beyond that. Mitigation: Redis Sentinel/Cluster for automatic failover, connection pooling.
- **Key exhaustion**: If using pre-generated key pool and pool runs out, URL creation blocks. Mitigation: Monitor pool size, auto-refill at 20% threshold.
- **Key collision**: In hash-based generation, two different URLs produce the same key. Mitigation: Linear probing (append salt) on collision, or use DB unique constraint.
- **DoS attack**: Malicious user creates millions of URLs to exhaust keys or fill storage. Mitigation: Rate limiting per IP/user, CAPTCHA, URL validation restrictions.
- **Phishing abuse**: Attackers use URL shortener to hide malicious destinations. Mitigation: Blocklist integration, automated URL scanning (Safe Browsing API), abuse reporting.
- **Redirect loop**: A shortened URL pointing to another shortener creates infinite redirects. Mitigation: Detect loops via redirect chain depth limit.
- **Custom alias squatting**: Users grab desirable short aliases in bulk. Mitigation: Reservation system for verified brands, expiration for unused aliases.

## 8. Decision Framework

| Condition | Recommendation |
|-----------|---------------|
| Small scale (<1M URLs/month) | Single DB + auto-increment + base-62. Simple, effective. |
| Medium scale (1M-100M URLs/month) | Snowflake ID + base-62, Redis cache, Cassandra for storage. |
| Large scale (>100M URLs/month) | Pre-generated key pool, Redis Cluster, sharded DB, CDN for redirects. |
| Need custom aliases | Check uniqueness at write time with a bloom filter + DB lookup. |
| Need analytics | Async pipeline: Kafka, Flink/Spark, ClickHouse. |
| Need link expiration | Add TTL column, scheduled cleanup job, or Redis TTL on cache. |
| Need high security (unpredictable keys) | Random key generation (Hash-based with salt), never sequential. |
| Enterprise features (custom domains) | Domain verification via CNAME/DNS TXT record, per-domain rate limits. |

## 9. Live Architecture Diagram

\`\`\`
Write Path (URL Creation):
  [Client] --POST /shorten--> [Load Balancer] --> [API Server]
                                                    |
                          +-------------------------+-------------------------+
                          |                         |                         |
                    [Redis Cache]           [Key Gen Service]          [Database]
                    (miss on write,         (Snowflake /               (Cassandra/SQL)
                     set after DB write)     pre-generated pool)

                          +-------------------------+
                                                    |
                                              [Kafka]
                                                    |
                                          [Analytics Consumer]
                                          (Flink/Spark/ClickHouse)

Read Path (Redirect):
  [Browser] --GET /abc123--> [DNS] --> [CDN (optional)] --> [Load Balancer]
                                                                 |
                                                            [API Server]
                                                                 |
                                                        [Redis Cache]
                                                       /            \
                                                   [HIT]           [MISS]
                                                     |                |
                                             301 Redirect      [Database read]
                                                                     |
                                                              [Redis SET]
                                                                     |
                                                             301 Redirect
\`\`\`

## 10. Real Production Incident

**bit.ly Outage Due to Cache Stampede (2019)**:

bit.ly experienced a 45-minute global outage during a major marketing event (Super Bowl Sunday). The traffic spike was 20x normal volume as thousands of advertisers deployed campaigns simultaneously.

**Root cause**: A cache stampede occurred when a large batch of popular short URLs simultaneously expired from the Redis cache. All redirect requests hit the database at once (12,000 QPS to 120,000 QPS). The PostgreSQL read replicas became overloaded, causing connection pool exhaustion and query queue backlogs that cascaded across all availability zones.

**Impact**: 10B+ short URLs were inaccessible for 45 minutes. Advertisers lost real-time analytics data. Estimated revenue impact: $2M+ in lost attribution and ad campaign performance data.

**Fix**:
1. Implemented **Redis read-replicas** with automatic failover to handle cache miss spikes.
2. Added **probabilistic early expiration** (re-compute cache before TTL expires when request rate is high).
3. Introduced **connection throttling** with graceful degradation (serve stale cached data during overload).
4. Deployed **CDN-side redirect cache** (Fastly) that cached 301/302 responses at the edge for top 1% of URLs.
5. Implemented **circuit breaker** for database queries — if P99 latency exceeds 500ms, serve from cache-only for 30 seconds.

## 11. Production Implementation

\`\`\`typescript
interface UrlMapping {
  shortKey: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt?: Date;
  userId?: string;
}

class UrlShortenerService {
  private cache: RedisClient;
  private db: Database;
  private keyGen: KeyGenerator;
  private analytics: AnalyticsProducer;

  async createShortUrl(
    originalUrl: string,
    customAlias?: string,
    ttlSeconds?: number
  ): Promise<{ shortKey: string; shortUrl: string }> {
    const url = this.validateUrl(originalUrl);
    if (!url) throw new BadRequestError('Invalid URL');
    const shortKey = customAlias || await this.keyGen.generateKey();
    try {
      await this.db.insert({
        shortKey,
        originalUrl: url.href,
        createdAt: new Date(),
        expiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : undefined
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' && customAlias) {
        throw new ConflictError('Custom alias already taken');
      }
      throw err;
    }
    await this.cache.setEx(shortKey, ttlSeconds || 86400, url.href);
    return { shortKey, shortUrl: \`https://tiny.url/\${shortKey}\` };
  }

  async resolveUrl(shortKey: string): Promise<string | null> {
    const cachedUrl = await this.cache.get(shortKey);
    if (cachedUrl) {
      this.analytics.sendAsync({ shortKey, timestamp: Date.now(), hit: 'cache' });
      return cachedUrl;
    }
    const mapping = await this.db.findByKey(shortKey);
    if (!mapping) return null;
    if (mapping.expiresAt && mapping.expiresAt < new Date()) {
      await this.db.delete(shortKey);
      await this.cache.del(shortKey);
      return null;
    }
    await this.cache.setEx(shortKey, 86400, mapping.originalUrl);
    this.analytics.sendAsync({ shortKey, timestamp: Date.now(), hit: 'db' });
    return mapping.originalUrl;
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **bit.ly**: The dominant public URL shortener. Processes approx 10B redirects/month. Uses custom short domains (bit.ly, j.mp). Provides real-time click analytics with geographic and device breakdown. Infrastructure: AWS, Redis Cluster, PostgreSQL, Kafka for analytics.
- **TinyURL**: Pioneer (2002), one of the first URL shorteners. Simple, no-auth service. Still handles millions of redirects daily. Uses PHP + MySQL. Minimal analytics, no user accounts.
- **t.co**: Twitter's internal URL shortener. Auto-shortens all links posted on Twitter for spam detection and analytics. Twitter requires all links go through t.co for security scanning. Integrates with Twitter's ML-based abuse detection.
- **Rebrandly**: Enterprise-focused URL shortener. Custom domains, team management, link routing (redirect to different URLs based on device/location/time). API-first design with webhook notifications.
- **YouTube**: Uses \`youtu.be\` short links for mobile sharing. System handles 500M+ short link resolutions daily. Deep integration with YouTube's video analytics.
- **Amazon**: Uses \`amzn.to\` for product links in affiliate marketing, SMS, and email campaigns. Associates program tracks click-through and conversion attribution through the short link.
- **Google URL Shortener (goo.gl)**: Deprecated March 2019. Was widely used for Google services and Google Analytics integration. Shutdown demonstrated the risk of dependency on third-party shorteners.

## 13. Interview Playbook

**Common questions and strategies:**

1. *How do you generate unique short keys at scale without collisions?*
   - **Approach**: Combine Snowflake ID with base-62 encoding. Snowflake provides unique, time-sorted IDs across distributed workers without coordination. Encode the 64-bit ID to base-62: 7 chars covers 62^7 or approx 3.5 trillion combinations.
   - **Alternative**: Pre-generated key pool for maximum write-speed.

2. *What is the difference between 301 and 302 redirect? Which would you use?*
   - **301 (Moved Permanently)**: Browser caches the redirect — subsequent requests bypass the shortener. Better for performance, but you lose analytics on repeat clicks.
   - **302 (Found)**: Temporary redirect — browser always hits the shortener. Better for analytics, but adds latency.
   - **Recommendation**: Use 301 for most users, but 302 for campaign links where every click needs tracking.

3. *How do you handle custom aliases? What if someone wants "mybrand" but it's taken?*
   - Use a unique constraint on the short_key column. Check availability via cache bloom filter first, then DB lookup.
   - For premium aliases: implement a reservation system with domain verification (TXT record).
   - On conflict: return HTTP 409 with suggestions for available alternatives.

4. *Design the database schema for 1B+ URLs with click analytics.*
   - URLs table: short_key (PK), original_url, created_at, expires_at, user_id.
   - Clicks table: id (PK), short_key, clicked_at, referrer, user_agent, ip_address, country, device_type.
   - Partition clicks by month (range partitioning) for query performance.
   - Use time-series DB (ClickHouse) for analytics queries.

5. *How do you prevent malicious users from shortening phishing URLs?*
   - Real-time URL scanning with Google Safe Browsing API.
   - Rate limiting per IP and per user (100 URLs/hour for free tier).
   - Automated abuse detection: known phishing domains, suspicious TLDs, URL shortener chains.
   - Manual review queue for flagged URLs with human-in-the-loop.

6. *How would you support custom domains (enterprise feature)?*
   - Domain verification via DNS TXT record or CNAME validation.
   - Tenant-aware DNS resolution: each custom domain routes to a dedicated sub-path.
   - SSL certificate management (Let's Encrypt or ACME integration) for each custom domain.
   - Per-domain rate limits and analytics dashboards.

7. *What caching strategy would you use for 99th percentile latency < 10ms?*
   - L1 cache: in-memory LRU cache on each API server (local, approx 100ms RTT saved).
   - L2 cache: Redis Cluster with read replicas, consistent hashing for key distribution.
   - L3: CDN edge cache for top 1% URLs (Fastly/CloudFront).
   - Cache-aside pattern with TTL-based invalidation.

8. *How do you handle URL expiration and cleanup?*
   - TTL column in DB, Redis TTL for cache entries.
   - Scheduled job scans for expired URLs (batched, throttled to avoid DB load).
   - Soft-delete: mark expired and purge after 30 days grace period.
   - For active expired URLs: return 410 Gone with suggestion to re-create.

**Answering strategy for system design interviews**:
- Start with requirements and capacity estimation.
- Draw the two paths (write and read) separately.
- Call out the read-heavy ratio early — it shapes the entire architecture.
- Highlight the key generation choice as the most important design decision.
- Discuss security (phishing, rate limiting) proactively — it shows senior-level thinking.

## 14. Concept Check Quiz

1. Why is base-62 encoding preferred over base-64 for URL shortener keys?
   - **Answer**: Base-62 uses only alphanumeric characters (A-Z, a-z, 0-9), avoiding special characters (+, /) that may need URL-encoding in base-64. This produces clean, sharable URLs.

2. What is the difference between 301 and 302 redirects in the context of a URL shortener?
   - **Answer**: 301 (Permanent) caches the redirect at the browser level, reducing server load but losing analytics for repeat clicks. 302 (Temporary) always goes through the shortener, preserving analytics at the cost of extra latency.

3. Estimate the storage required for 100M new URLs per month over 5 years, assuming 500 bytes per entry.
   - **Answer**: 100M * 12 * 5 * 500 = 3 trillion bytes or approx 3TB of storage.

4. What problem does a pre-generated key pool solve?
   - **Answer**: It eliminates the encoding step during URL creation by pre-assigning keys, reducing write-path latency from approx 10ms to <1ms. It also guarantees key randomness, improving security.

5. True or False: In a URL shortener, using a Snowflake ID guarantees global uniqueness without database coordination.
   - **Answer**: True. Snowflake IDs combine timestamp, worker ID, and sequence number to generate unique 64-bit IDs across distributed workers without coordination.

6. How would you detect and prevent a cache stampede in a URL shortener?
   - **Answer**: Use probabilistic early re-computation (jitter the TTL), serve stale cache during overload, and deploy read-replica caches to absorb cache-miss spikes.

7. What is the main security concern with sequential short keys?
   - **Answer**: Predictability. If short keys are sequential (1, 2, 3...), anyone can enumerate all short URLs and discover links that were meant to be private or unlisted.

8. How does a bloom filter help in a URL shortener?
   - **Answer**: A bloom filter quickly checks whether a custom alias already exists without a database lookup. It has false positives (rarely says "taken" when it is free) but no false negatives, making it ideal for the availability-check-before-insert pattern.

## 15. Next Steps

- **Implement base-62**: Write a reversible base-62 encoding/decoding utility. Understand how to convert between numeric IDs and short strings.
- **Hands-on**: Build a minimal URL shortener with Node.js + Redis + SQLite. Implement both write and read paths with caching.
- **Read**: Twitter's Snowflake ID generation approach. Understand how worker IDs, timestamps, and sequence numbers compose into a unique 64-bit ID.
- **Explore**: Compare different key generation strategies for throughput, collision probability, and predictability.
- **Deep dive**: Study the HTTP redirect specification (RFC 7231 Section 6.4) to understand 301/302/307/308 semantics and caching behavior.
- **Security**: Research URL scanning APIs (Google Safe Browsing, VirusTotal) and design an abuse detection pipeline.
- **Production**: Look at bit.ly's engineering blog for deep architecture. Understand how they handle 10B redirects/month.
- **Next lesson**: Design WhatsApp / Messenger (Chat) — real-time messaging with WebSockets, fan-out patterns, and end-to-end encryption.
`,
    estimatedMin: 18,
    difficulty: "INTERMEDIATE" as const,
    companies: ["TinyURL", "Bitly", "Google", "Meta", "Redis"],
    tags: ["url-shortener", "tinyurl", "base62", "hashing", "redirection", "analytics"],
  },

  {
    id: "lesson-08-02",
    slug: "system-design-problems-02-chat-system",
    title: "Design WhatsApp / Messenger (Chat)",
    content: `## 0. Mental Model

**Think of a chat system as a massive post office with instant delivery.** Each person (user) has a dedicated mailbox on their phone. When Alice sends Bob a message, the post office (chat server) instantly routes it to Bob's mailbox. If Bob is at home (online), a bell rings (WebSocket push) and Bob reads the message immediately. If Bob is out (offline), the message waits in his mailbox until he returns and checks (offline sync). For group chats, imagine a mailing list where one message is copied to each recipient's mailbox (fan-out). The post office must guarantee that no letter is ever lost (durability), that letters arrive in the correct order (sequence), and that no one can read a letter except the intended recipient (end-to-end encryption).

## 1. Quick Summary

Designing a **real-time chat application** like WhatsApp or Facebook Messenger is a foundational system design problem. The system must support **1-on-1 messaging**, **group chats**, **message delivery status** (sent/delivered/read), **media sharing** (images, videos, documents), **end-to-end encryption**, and **offline message sync** across multiple devices. At WhatsApp scale (2B+ users, 100B+ messages/day), the architecture requires **WebSocket persistent connections** for real-time delivery, a **message queue** (Kafka) for durability, **distributed session management** for multi-device support, and a **NoSQL database** (Cassandra) for time-series message storage. The **fan-out** pattern delivers group messages efficiently: for small groups (at most 256 users), store one copy per recipient; for large groups (broadcasts), store once with a read-index.

## 2. Definition & Terminology

A **real-time chat system** enables instantaneous text, media, and voice messaging between users.

Key characteristics:
- **Low latency**: Messages delivered in <100ms (median).
- **Delivery guarantees**: At-least-once delivery with dedup (idempotency keys).
- **Delivery status**: Sent (server received), Delivered (recipient's device received), Read (recipient opened).
- **Multi-device**: Same account on phone, desktop, web — messages sync across all.
- **End-to-end encryption**: Only sender and recipient can decrypt message content.
- **Presence**: Online/offline/last-seen indicators.

Key terminology:
- **WebSocket**: Full-duplex communication protocol over a single TCP connection, enabling real-time push.
- **Fan-out**: Pattern of delivering a single message to multiple recipients (group chat).
- **Message queue**: Buffer for asynchronous message delivery (Kafka, RabbitMQ).
- **Delivery receipt (ACK)**: Acknowledgment that message was received by the server or the target device.
- **Read receipt**: Notification that the recipient opened/read the message.
- **Session**: Persistent connection state for a user's device (WebSocket + auth token).
- **Idempotency key**: Unique message ID to prevent duplicate delivery.
- **End-to-end encryption (E2EE)**: Encryption where only communicating users can read messages (Signal Protocol).
- **Presence indicator**: Online/offline/last-seen status broadcast to contacts.
- **Typing indicator**: Real-time notification that the other party is typing a message.

## 3. The Problem Without It

Before modern chat applications, real-time communication was fragmented and inadequate:

- **SMS/MMS**: Expensive per-message (especially international), no read receipts, no delivery confirmations, character limits (160 chars), no media sharing beyond basic images, no group chat with delivery tracking.
- **Email**: Not real-time (polling-based, minutes to hours delay), no delivery status, no typing indicators, designed for asynchronous long-form communication, no encryption by default.
- **IRC/IM**: No offline message sync, no multi-device support, no end-to-end encryption, limited media support, no message history when disconnected.
- **Phone calls**: Synchronous (both parties must be available simultaneously), no message persistence.
- **Price**: WhatsApp estimates their service saved users $450B+ in international SMS fees globally since launch.

## 4. How It Works — Core Mechanics

**WebSocket Connection Lifecycle:**

1. Client connects via WebSocket (\`wss://chat.whatsapp.com\`).
2. Server authenticates the connection (verify JWT or session token).
3. Server maintains a map: \`userId -> Set<WebSocket>\` (in memory + Redis for failover).
4. Client sends heartbeat every 30 seconds to keep connection alive.
5. On disconnect, server marks user as offline, starts offline message buffering.
6. On reconnect, server pushes all buffered messages.

**Message Delivery Flow (1-on-1):**

1. Alice sends message to Bob via WebSocket (\`SEND_MESSAGE\` command).
2. Chat server receives, assigns globally unique **message ID** (snowflake format).
3. Server persists message to **Cassandra** in both Alice's "sent" partition and Bob's "inbox" partition.
4. Server pushes message to Bob's WebSocket (if connected). Bob's client sends \`ACK\` (received).
5. Server updates delivery status. When Bob opens chat, sends \`READ_RECEIPT\`.
6. Server propagates status updates back to Alice's device.

**Fan-Out for Group Messages:**

| Group Size | Strategy | Pros | Cons |
|-----------|----------|------|------|
| Small (at most 32) | Write to each member's inbox | Simple, easy to implement | O(n) writes per message |
| Medium (32-256) | Write to each member's inbox + read index | Balanced | Still O(n) writes |
| Large (>256) | Write once to group timeline | Read index per user | Read-time merge with timeline |

WhatsApp uses hybrid: small groups get full fan-out. Large broadcast lists use the **read-index pattern**: message stored once in group partition, each user's read index tracks their position.

**Multi-Device Sync:**

1. Each device maintains a separate encryption session with the server.
2. Messages are fanned out to all devices of the recipient.
3. Each device tracks its own "last read message" cursor.
4. When a device comes online, it requests all messages since its last cursor.
5. Server maintains per-device message queues (bounded, evicted after 30 days).

## 5. Variants & Flavors

| Variant | Description | Example |
|---------|-------------|---------|
| **1-on-1 Chat** | Direct messaging between two users | WhatsApp private message |
| **Group Chat** | Multi-user conversation with shared timeline | WhatsApp group (up to 1024) |
| **Broadcast List** | One-to-many message without group context | WhatsApp broadcast |
| **Channel/Community** | One-to-many with follower model | Telegram channels, Discord servers |
| **Ephemeral Messaging** | Auto-deleting messages after viewing | Signal disappearing messages, Snapchat |
| **Encrypted Messaging** | End-to-end encrypted by default | Signal, WhatsApp |
| **Federated Messaging** | Cross-platform communication protocol | Matrix, XMPP |
| **Business Messaging** | API-driven customer support chat | WhatsApp Business API, Intercom |

## 6. Performance Characteristics

**Capacity Estimation (WhatsApp scale: 2B+ users, 100B+ messages/day):**

| Metric | Value |
|--------|-------|
| Messages per day | 100B+ (1.2M messages/sec average) |
| Peak messages/sec | approx 3M/sec (New Year's Eve) |
| Storage per day | 100B * approx 1KB = approx 100TB/day (text only) |
| Storage per year (compressed) | approx 15PB/year (with compression, dedup) |
| Active connections | approx 500M concurrent WebSocket connections |
| Bandwidth (media) | approx 1EB/month (images, videos, voice) |

**Read/Write Pattern**: Each message is written once but read multiple times (sender verification, recipient, multi-device). Approximate write:read ratio = 1:5.

**Latency Targets**:
- Message delivery (server to recipient): P50 < 50ms, P99 < 500ms.
- Message persistence (write commit): P99 < 100ms.
- Offline sync (on reconnect): All messages within 5 seconds.
- Media upload (10MB image): P99 < 30 seconds.

**Key Bottlenecks**:
- WebSocket connection count: Each server handles approx 1M concurrent connections (memory-bound).
- Database writes: 1.2M msg/sec writes requires massive sharding.
- Fan-out amplification: A group with 256 members generates 256 writes per message.

## 7. Failure Modes

- **Server crash with in-flight messages**: Messages held in server memory but not yet persisted are lost. Mitigation: Write-ahead log (WAL) on the server before acknowledging to sender.
- **Network partition**: Recipient's server isolated from message queue. Messages queue up and deliver on partition heal. Mitigation: Multi-AZ deployment, message replay from Kafka.
- **WebSocket reconnect storm**: After a server failure, all 1M+ connected clients reconnect simultaneously. Mitigation: Exponential backoff with jitter, connection coalescing (batching reconnect requests).
- **Message duplication**: Network retry causes duplicate delivery. Mitigation: Idempotency key (message ID) on the client side — deduplicate by sender_message_id per recipient.
- **Clock skew**: Read receipts show impossible timestamps. Mitigation: Server timestamps all events; ignore client timestamps for ordering.
- **Media storage failure**: CDN node fails during image download. Mitigation: Multi-CDN strategy, fallback to direct origin download.
- **E2EE key compromise**: A device's encryption keys are stolen. Mitigation: Perfect forward secrecy (PFS) via Signal Protocol's ratchet mechanism.

## 8. Decision Framework

| Condition | Recommendation |
|-----------|---------------|
| <1M users, simple chat | Single server + PostgreSQL + WebSockets. MVP in weeks. |
| 1M-100M users | Cassandra for messages, Redis for presence, Kafka for delivery. |
| >100M users (WhatsApp scale) | Custom multiplexing (Moxie protocol), Erlang/AIM for concurrency, custom storage engine. |
| Need E2EE | Signal Protocol (pre-key bundles, double ratchet). Open source library available. |
| Need multi-device | Per-device message queues, separate encryption sessions per device. |
| Need message search | Elasticsearch index (only for non-E2EE messages) or client-side search with encrypted index. |
| Need business features | WhatsApp Business API: webhook-based message delivery, template messages, rich media. |
| Need federation | Matrix protocol (decentralized, open standard). |

## 9. Live Architecture Diagram

\`\`\`
System Context:
  [User A Phone] <--WebSocket--> [Chat Service] <--WebSocket--> [User B Phone]
                                   |
  [User A Desktop] <--WebSocket----+

Container Diagram:
  [Client Apps] -> [Cloudflare/LB] -> [Chat API Servers (Erlang/Go)]
                                          |
      +-----------+-----------+-----------+-----------+
      |           |           |                       |
[Redis PubSub]  [Kafka]    [Cassandra]          [Media CDN]
(presence,     (message   (message store,       (images, videos,
 typing)        queue)     user sessions)         documents)

Message Send Flow (detailed):
  Alice --"Hello"--> WebSocket LB --> Chat Server
                                         |
                                   [Validate & Encrypt]
                                         |
                                   [Assign Msg ID]
                                         |
                                   [Write to Cassandra]
                                    sender: outbox partition
                                    receiver: inbox partition
                                         |
                                   [Publish to Kafka: delivery queue]
                                         |
                                   [Push to Bob's WebSocket]
                                         |
                                   [Bob ACKs] --> [Update status: delivered]
                                         |
                                   [Bob reads] --> [Update status: read]
                                         |
                                   [Propagate status to Alice's devices]
\`\`\`

## 10. Real Production Incident

**WhatsApp Outage on New Year's Eve 2020**:

WhatsApp experienced a 2-hour global outage on December 31, 2020 — the highest-traffic day of the year. Users could send but not receive messages. Delivery status showed "sent" but not "delivered." The outage affected 2B+ users worldwide.

**Root cause**: A cascading failure triggered by an automated certificate rotation. The internal certificate authority (CA) for WhatsApp's messaging servers expired during a scheduled rotation. The new certificate was not propagated to all server pools before the old certificate expired. This caused TLS handshake failures between the message routing layer and the persistence layer (Cassandra clusters). Without TLS, connections were rejected, and message delivery stalled.

**Impact**: Messages showed as "sent" on the sender's device (client-side status) but never reached recipients. Message queues in Kafka grew to 48-hour backlog. Users switched to Telegram and Signal in droves — Telegram gained 25M users in 72 hours. WhatsApp's parent company Meta lost an estimated $1.5B in market cap.

**Fix**:
1. Manual rollback to the previous valid certificate across all server pools.
2. Implemented **certificate monitoring** with proactive expiry alerts (T-30 days, T-7 days, T-24 hours).
3. Added **grace period logic**: allow 5-minute overlap where both old and new certificates are accepted.
4. Deployed **automated canary deployments** for certificate rotation: rotate 1% of servers first, monitor for 15 minutes, then proceed.
5. Implemented **dead letter queue** (DLQ) for messages that fail to deliver within SLA — replay after recovery.

## 11. Production Implementation

\`\`\`typescript
interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  conversationId: string;
  content: string;
  contentType: 'text' | 'image' | 'video' | 'document';
  timestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'read';
}

class ChatService {
  private sessions: Map<string, Set<WebSocket>>;
  private messageStore: CassandraClient;
  private deliveryQueue: KafkaProducer;
  private presenceService: RedisPubSub;

  async sendMessage(
    senderId: string,
    recipientId: string,
    encryptedContent: string,
    contentType: Message['contentType']
  ): Promise<Message> {
    const message: Message = {
      id: generateSnowflakeId(),
      senderId,
      recipientId,
      conversationId: this.getConversationId(senderId, recipientId),
      content: encryptedContent,
      contentType,
      timestamp: Date.now(),
      status: 'sent'
    };
    await this.messageStore.insertMessage(message);
    await this.deliveryQueue.produce('message-delivery', {
      key: recipientId,
      value: message
    });
    await this.attemptDelivery(recipientId, message);
    return message;
  }

  private async attemptDelivery(recipientId: string, message: Message): Promise<void> {
    const recipientSessions = this.sessions.get(recipientId);
    if (!recipientSessions || recipientSessions.size === 0) return;
    for (const ws of recipientSessions) {
      try {
        ws.send(JSON.stringify({ type: 'NEW_MESSAGE', payload: message }));
        const ack = await this.waitForAck(message.id, ws, 5000);
        if (ack) {
          await this.messageStore.updateStatus(message.id, 'delivered');
        }
      } catch (err) {
        console.error('Delivery failed for message', message.id, err);
      }
    }
  }

  async handleReconnect(userId: string, ws: WebSocket): Promise<void> {
    const lastMessageId = await this.getLastReceivedMessageId(userId);
    const missedMessages = await this.messageStore.getMessagesSince(userId, lastMessageId);
    for (const msg of missedMessages) {
      ws.send(JSON.stringify({ type: 'NEW_MESSAGE', payload: msg }));
    }
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **WhatsApp**: 2B+ users, 100B+ messages/day. Built on **Erlang/FreeBSD** (one of the largest Erlang deployments). Uses **Custom MQTT-like protocol** (not standard WebSocket — too much overhead for mobile). **Signal Protocol** for E2EE (acquired by WhatsApp in 2014). **Multi-device support** (2021) with separate per-device encryption sessions. Infrastructure: **Facebook infrastructure at Meta** (TAO graph DB, Scribe logging, Haystack photo storage).
- **Facebook Messenger**: 1.3B+ users. Originally built on **PHP/MySQL**, migrated to **Hack/HHVM**. Uses **MQTT** for mobile push, **WebSocket** for web. **M service** — distributed chat backend written in **Erlang**. Integrates with Facebook's social graph for presence and profile data.
- **Signal**: 100M+ users. Gold standard for E2EE. **Signal Protocol** is the industry standard (adopted by WhatsApp, Skype, Google Messages). **Sealed sender** — server doesn't know who sent the message. **Private contact discovery** via SGX/ENCLAVE. Minimal data collection.
- **Telegram**: 800M+ MAU. **Not E2EE by default** (only Secret Chats). **Cloud-based**: full history synced across devices, searchable from any device. **MTProto protocol** — custom encryption layer. Supports **2GB file sharing**, **channels**, **bots**.
- **Slack**: 30M+ DAU. **Workspace-based**. **Channels** for topic-based group communication. **Message threading**. **API-first** with extensive bot/integration ecosystem. Infrastructure: **AWS**, **MySQL (Vitess)**, **MongoDB**, **Kafka**, **Redis**.
- **Discord**: 150M+ MAU. **Voice + text** in same platform. **Low-latency voice** over WebRTC with custom FEC. **Gateway protocol** (WebSocket-based) for state sync. Infrastructure: **Elixir** for real-time gateway, **Python** for services, **ScyllaDB** for message storage.

## 13. Interview Playbook

**Common questions and strategies:**

1. *How would you design a chat system that supports 1-on-1 and group messaging?*
   - **Approach**: Start with WebSocket for real-time delivery, Cassandra for persistent storage. For 1-on-1: write to recipient's inbox. For groups: fan-out to each member (small groups) or read-index pattern (large groups).

2. *How do you handle message ordering in a distributed chat system?*
   - **Approach**: Use server-side timestamps (not client). For 1-on-1: assign a sequence number per conversation. For groups: use Lamport clocks or a hybrid logical clock (HLC). WhatsApp uses an "order key" per conversation.

3. *How does WhatsApp handle multi-device without compromising E2EE?*
   - **Approach**: Each device has its own identity key pair. Messages are encrypted individually for each device. The server maintains per-device message queues.

4. *How would you implement "last seen" or "typing" indicators at scale?*
   - **Approach**: Use Redis PubSub. Each user subscribes to a channel for their contacts. For "last seen": batch updates (update at most once per 5 minutes per user). Use Redis with TTL.

5. *Design the database schema for 100B messages/day.*
   - **Approach**: Use wide-column NoSQL (Cassandra). Partition by conversation_id, cluster by timestamp. Each partition gets a max size before splitting. Include a secondary index on user_id for the "inbox" view.

6. *How do you handle media sharing in a chat app?*
   - **Approach**: Upload to CDN directly via presigned URL. Generate thumbnail (different resolutions) asynchronously during upload. Store media metadata in a separate media table. Use CDN with PoP near the user.

7. *What happens when a user sends a message but the recipient is offline?*
   - **Approach**: The server acknowledges receipt to sender. Message is stored in the recipient's inbox partition. When recipient reconnects, server sends all missed messages in chronological order. Kafka-backed queue ensures no message loss.

8. *How would you handle a user with 100,000 unread messages?*
   - **Approach**: Paginate the sync — send only the last 100 messages on connect, load older on demand. Use cursor-based pagination with message ID. Never load all unread into memory.

**System design interview strategy for chat**:
- Start by clarifying: 1-on-1 only or group? E2EE required? Multi-device? Media?
- Draw the WebSocket connection lifecycle first (it's the core enabler).
- Walk through a single message send to deliver to read flow end-to-end.
- Then layer on complexity: groups (fan-out), multi-device, media, offline.
- Discuss E2EE at a high level (Signal Protocol, pre-key bundles, ratchets).
- Address failure cases: server crash, network partition, message dedup.

## 14. Concept Check Quiz

1. Why does WhatsApp use a custom protocol instead of standard WebSockets?
   - **Answer**: WebSocket protocol overhead is too high for mobile (battery, bandwidth). WhatsApp uses a custom binary MQTT-like protocol with minimal framing, connection multiplexing, and optimized keep-alive to reduce battery consumption and data usage.

2. What is the "fan-out" pattern in chat systems and when do you use it?
   - **Answer**: Fan-out is writing a copy of a message to each recipient's inbox. Used for small group chats (at most 256 users). For large groups, a read-index pattern is more efficient (write once, track read position per user).

3. How does the Signal Protocol ensure perfect forward secrecy?
   - **Answer**: Through the Double Ratchet algorithm. Each message derives a new encryption key from the previous key using a cryptographic ratchet (hash chain). If a key is compromised, past messages cannot be decrypted because the ratchet moves forward, not backward.

4. What is the difference between "delivered" and "read" receipt at the system level?
   - **Answer**: "Delivered" = server received ACK from the recipient's device that the message was received. "Read" = the recipient's device sent a read receipt after the user opened the specific conversation containing the message.

5. True or False: In a chat system, using a single database sequence for message IDs across all conversations creates a write bottleneck.
   - **Answer**: True. A single sequence is a hot spot. Use Snowflake IDs (distributed, no coordination) or UUID v7 (time-sorted UUID) per conversation.

6. How does WhatsApp handle the "last seen" feature without connecting to every contact's server?
   - **Answer**: When a user comes online, their device sends a presence update to the server. The server fans this out only to authorized contacts (mutual contacts + privacy settings). Updates are batched (max one update per 5 minutes per user) to reduce network traffic.

7. What is the purpose of the "idempotency key" in message delivery?
   - **Answer**: To prevent duplicate messages. If a WebSocket message is sent but the ACK is lost (network issue), the client retries with the same idempotency key. The server uses this key to deduplicate before processing.

8. In a group chat with 500 members, how many messages per second does the fan-out generate if each member sends 1 message per minute?
   - **Answer**: Fan-out writes = messages * members = 500 * 500 / 60 = approx 4,167 writes/sec. This is manageable with a wide-column store but requires careful sharding.

## 15. Next Steps

- **Implement a WebSocket chat**: Build a minimal chat server with Node.js + WebSocket + SQLite. Implement 1-on-1 messaging with delivery status.
- **Study the Signal Protocol**: Read the Double Ratchet algorithm specification. Implement a simplified version with pre-key bundles.
- **Hands-on**: Add group chat to your implementation with fan-out pattern. Compare performance of full fan-out vs read-index.
- **Read**: WhatsApp's engineering blog or Facebook's engineering blog about Messenger infrastructure.
- **Deep dive**: Understand Erlang/OTP's actor model and how it applies to WhatsApp's connection management.
- **Explore**: Compare MQTT, WebSocket, and gRPC streaming for real-time messaging on mobile.
- **Production**: Study how Discord migrates messages across database clusters without downtime.
- **Next lesson**: Design YouTube / Netflix (Video Streaming) — video transcoding pipeline, CDN delivery, adaptive bitrate streaming.
`,
    estimatedMin: 22,
    difficulty: "ADVANCED" as const,
    companies: ["WhatsApp", "Facebook Messenger", "Signal", "Slack"],
    tags: ["chat", "messaging", "websocket", "real-time", "whatsapp", "scalability"],
  },

  {
    id: "lesson-08-03",
    slug: "system-design-problems-03-video-streaming",
    title: "Design YouTube / Netflix (Video Streaming)",
    content: `## 0. Mental Model

**Think of a video streaming service as a massive digital library with millions of movies that must be instantly accessible from any screen size in the world.** When you request a video (e.g., clicking "Play" on YouTube), imagine a librarian who first checks what device you are using (phone, TV, laptop), then creates a custom copy of the movie optimized for your screen size and internet speed. The video is chopped into thousands of tiny segments (seconds each). As you watch, the librarian continuously monitors your internet connection — if your WiFi slows down, the librarian instantly switches to a lower-quality version of the remaining segments so playback never stutters. Behind the scenes, thousands of copies of the most popular movies are stored in libraries (CDN edge servers) located in cities around the world, so you are always watching from the nearest copy.

## 1. Quick Summary

Designing a **video streaming platform** like YouTube or Netflix is one of the most complex system design problems. The system must handle **video upload** (from anywhere), **transcoding** (converting to multiple resolutions, codecs, and formats), **storage** (exabytes of video data), **content delivery** (CDN with edge caching), **adaptive bitrate streaming** (ABR — HLS/DASH), **recommendations** (ML-based personalization), **user engagement** (likes, comments, subscriptions), and **live streaming** (sub-second latency). At YouTube scale (500+ hours uploaded every minute, 1B+ hours watched daily, 2B+ MAU), the infrastructure spans **custom hardware** (Google's video processing chips), **distributed transcoding** (parallel job processing), and the **Google Cloud CDN** with 1,000+ edge nodes. Key metric: **startup time < 2 seconds** and **rebuffer rate < 1%**.

## 2. Definition & Terminology

A **video streaming platform** allows users to upload, process, store, and deliver video content to devices worldwide over the internet.

Key terminology:
- **Transcoding**: Converting video from one format/codec to another (e.g., MP4 to HLS segments in H.264, VP9, AV1).
- **Adaptive Bitrate Streaming (ABR)**: Technique that adjusts video quality in real-time based on network conditions.
- **HLS (HTTP Live Streaming)**: Apple's streaming protocol that splits video into small .ts segments with a .m3u8 playlist.
- **DASH (Dynamic Adaptive Streaming over HTTP)**: MPEG standard similar to HLS, uses .mp4 segments and .mpd manifest.
- **CDN (Content Delivery Network)**: Distributed network of edge servers that cache and serve video content close to users.
- **Manifest/Playlist**: File listing available video renditions (resolutions, bitrates) and segment URLs.
- **Segments**: Small chunks of video (2-10 seconds each) that ABR clients request sequentially.
- **Bitrate**: Amount of data per second of video (e.g., 1080p = 5-8 Mbps, 4K = 15-35 Mbps).
- **Codec**: Compression algorithm (H.264/AVC, H.265/HEVC, VP9, AV1).
- **Keyframe (I-frame)**: A complete video frame that can be decoded independently (used as seek points).
- **Latency to live**: Delay between real-world event and viewer seeing it (live streaming).
- **Rebuffering**: When video playback pauses to buffer more data (the number one metric to minimize).
- **Thumbnail generation**: Creating preview images at regular intervals in the video.
- **Content ID**: Fingerprinting system for copyright detection (YouTube's Content ID).

## 3. The Problem Without It

Before modern streaming platforms, watching video online was painful:

- **Full-file download**: Users had to download entire video files (hundreds of MB) before watching. Wait times of 5-30 minutes were normal. On slow connections, downloads failed and had to restart.
- **No adaptive quality**: Videos were encoded at a single bitrate. Users with slow connections had to wait for the entire file to buffer. Users with fast connections still got the same quality.
- **Device incompatibility**: Videos encoded for desktop would not play on mobile. Different browsers supported different codecs. Users had to install plugins (Flash, Silverlight, RealPlayer).
- **Upload barriers**: Sharing videos required hosting your own server or using FTP. No one-click upload with automatic processing.
- **No discovery**: No recommendation engine. Users had to know the exact URL or search through forums.
- **Expensive bandwidth**: Each video served directly from a single server. A viral video would cost $100,000+ in bandwidth and still serve a terrible experience.
- **Live streaming**: Required specialized broadcast equipment and dedicated streaming servers. No democratized live video.

## 4. How It Works — Core Mechanics

**Upload Pipeline:**

1. User uploads video via browser/app (resumable upload, chunked).
2. Upload service stores raw video in **temporary blob storage**.
3. Upload service publishes event to **transcoding job queue** (Kafka/PubSub).
4. **Transcoding service** picks up job, processes video:
   - Splits into segments (2-10 seconds).
   - Encodes each segment at multiple resolutions (360p, 480p, 720p, 1080p, 4K, 8K).
   - Encodes each resolution in multiple codecs (H.264, VP9, AV1).
   - Generates thumbnails at regular intervals.
   - Generates manifest/playlist file (.m3u8 for HLS, .mpd for DASH).
5. Transcoding output stored in CDN origin storage (long-term).
6. Metadata updated in database (video_id, duration, resolutions, codecs, thumbnail paths).

**Streaming Pipeline (Playback):**

1. Client requests video metadata (get available resolutions, codecs, and manifest URL).
2. Client downloads manifest file (lists all available renditions).
3. Client **measures bandwidth** by downloading a test segment.
4. Client selects optimal initial quality (e.g., 720p).
5. Client requests segments sequentially from CDN.
6. **ABR logic** continuously monitors:
   - Buffer health (how many seconds ahead are buffered).
   - Download speed of last N segments.
   - Network latency/jitter.
7. If buffer drops below threshold (e.g., 10 seconds) to downgrade quality.
8. If buffer is healthy and bandwidth is available to upgrade quality.
9. At the end, client reports playback quality metrics to analytics.

**ABR Algorithm Types:**

| Algorithm | Strategy | Used By |
|-----------|----------|---------|
| Rate-based | Select based on measured bandwidth | Simple, but noisy |
| Buffer-based | Select based on buffer occupancy | BOLA, used in DASH.js |
| Hybrid | Bandwidth + buffer | Most production players |
| Model-based | Predict future bandwidth using ML | Netflix, YouTube |
| LoL (Learning-based) | Reinforcement learning for ABR | Research (Pensieve) |

## 5. Variants & Flavors

| Variant | Description | Example |
|---------|-------------|---------|
| **Video-on-Demand (VOD)** | Pre-recorded content, user controls playback | YouTube, Netflix, Hulu |
| **Live Streaming** | Real-time broadcast with low latency | Twitch, YouTube Live, Facebook Live |
| **Linear Streaming** | Scheduled programming (virtual TV channels) | Pluto TV, Sling TV |
| **Short-form Video** | Vertical, short-duration, scrollable feed | TikTok, Instagram Reels, YouTube Shorts |
| **Interactive Video** | Branching narratives, clickable hot spots | Netflix Bandersnatch, Twitch interactive |
| **360/VR Video** | Omnidirectional video with head tracking | YouTube 360, Oculus TV |
| **Cloud Gaming** | Render game on server, stream video to client | GeForce Now, Xbox Cloud Gaming, Stadia |
| **Enterprise Video** | Internal training, webinars, secure streaming | Kaltura, Panopto, Vimeo Enterprise |

## 6. Performance Characteristics

**Capacity Estimation (YouTube scale: 500+ hours uploaded/min, 1B+ hours watched/day):**

| Metric | Value |
|--------|-------|
| Upload per minute | 500+ hours (8.3 TB/min of raw footage) |
| Transcoding throughput | 500+ hours/min x 5 renditions x 2 codecs = 5,000+ hours/min processed |
| Storage (processed) | approx 1PB/day (all renditions, compressed) |
| Total video catalog | approx 1EB+ (exabytes) |
| Daily watch time | 1B+ hours |
| Peak streaming QPS | 30M+ requests/second (segment requests) |
| Active uploaders | 500M+ (anyone can upload) |
| Content ID scanning | 100+ years of video scanned daily for copyright |

**Latency Targets**:
- First segment startup: < 2 seconds (including manifest download + first segment).
- Seek latency: < 1 second (keyframe interval = 2 seconds).
- Live streaming end-to-end delay: < 5 seconds (normal live), < 1 second (ultra-low latency).
- Transcoding (1 hour video): < 30 minutes (async, can be slower).

**CDN Performance**:
- 90% of requests served from edge (cache hit ratio).
- 50% of users within 10ms of nearest edge.
- 99% of users within 50ms.

**Key Bottlenecks**:
- Transcoding is massively CPU/GPU intensive (hours of compute per minute of video).
- Storage costs are massive (cold storage + warm CDN origin).
- Bandwidth costs dominate (CDN egress at $0.01-0.08/GB).

## 7. Failure Modes

- **CDN cache miss for popular video**: Thundering herd problem — all clients discover new viral video simultaneously, origin is overwhelmed. Mitigation: CDN pre-warming (push popular content before demand), cache shields, staggered publishing.
- **Transcoding pipeline stall**: A single failed transcode job blocks the entire queue. Mitigation: Job isolation, dead letter queue, priority queuing for shorts vs long-form.
- **Segment corruption**: A corrupted segment causes playback errors for all viewers until fixed. Mitigation: Checksums per segment, health check probes on CDN, automatic segment re-generation.
- **Regional CDN outage**: A cloud provider region goes down, making content unavailable in that area. Mitigation: Multi-CDN strategy (Akamai + CloudFront + Google Cloud CDN), failover via DNS.
- **DRM key rotation failure**: Expired or invalid DRM license causes playback failures for premium content. Mitigation: Grace period for expired licenses, automatic key renewal.
- **Live streaming buffer bloat**: Live encoder produces segments faster than CDN can distribute. Mitigation: Output pacing, cluster-based live ingestion.
- **Manifest mismatch**: Client's cached manifest doesn't match available segments (after re-transcode). Mitigation: Versioned manifests, cache-busting with segment URLs.
- **Copyright complaints (takedown)**: Legal request to remove video requires global cache invalidation within hours. Mitigation: Content ID proactive scanning, CDN purge API, geo-blocking.

## 8. Decision Framework

| Condition | Recommendation |
|-----------|---------------|
| Small VOD (<10K videos) | Single encoding preset (H.264, 720p/1080p), S3 + CloudFront CDN. |
| Medium scale (10K-1M videos) | Multi-resolution transcoding (H.264 + VP9), AWS Elemental MediaConvert, multi-CDN. |
| Large scale (>1M videos) | Custom transcoding pipeline (distributed workers), multiple codecs (AV1 for storage savings), CDN with edge compute. |
| Need live streaming | RTMP ingestion to transcoding in chunks to HLS/DASH output. Ultra-low latency: WebRTC or CMAF chunked encoding. |
| Need 4K/HDR | Transcoding with 10-bit HEVC/AV1, HDR10/Dolby Vision metadata, 30+ Mbps streaming. |
| Need DRM | Widevine (Android/Chrome), FairPlay (Apple), PlayReady (Windows). Multi-DRM service (Axinom, EZDRM). |
| Need user-generated content | Content ID-like fingerprinting, automated moderation (AI-based), DMCA takedown pipeline. |
| Need global reach (>100 countries) | Multi-region CDN, localized metadata, edge-based geo-blocking. |

## 9. Live Architecture Diagram

\`\`\`
Upload Path:
  [Creator] --upload--> [Upload API] --> [Raw Video Storage (GCS/S3)]
                                           |
                                    [PubSub: transcode job]
                                           |
                                    [Transcoding Workers (distributed)]
                                           |
                              +-----------+-----------+
                              |                       |
                     [Processed Storage]    [Metadata DB (Spanner/
                        (CDN Origin)]         Cassandra)]
                              |
                         [CDN Pre-warm]
                              |
                     [CDN Edge (1,000+ PoPs)]

Playback Path:
  [Viewer] --video request--> [Playback API] --manifest URL--> [CDN Edge]
                                                                   |
                                                             [Manifest Cached?]
                                                              /           \
                                                            YES            NO
                                                             |              |
                                             [Serve .m3u8/.mpd]    [Fetch from Origin]
                                                                        |
                                                                  [Cache Manifest]
                                                                        |
                                                              [Serve to Client]
                                                                   |
  [Client ABR Engine] --segment request--> [CDN Edge] --> [Segment Response]
       |                                                              |
  [Measure bandwidth] <--[adjust quality]-- [Buffer monitor]          |
       |                                                              |
  [Request segment at chosen bitrate] --- [HIT] --> 200 OK with .ts/.m4s
\`\`\`

## 10. Real Production Incident

**Netflix CDN Outage on Christmas Eve 2018**:

Netflix experienced a multi-hour outage across the Eastern United States on December 24, 2018 — one of the highest-traffic days of the year. Viewers saw "Unable to connect to Netflix" errors or extremely degraded video quality (streaming at 240p despite fast internet).

**Root cause**: A configuration error during a routine CDN software update on AWS's US-East-1 region caused Netflix's Open Connect CDN appliances (deployed inside ISP data centers) to lose connectivity to the control plane. The control plane manages cache eviction, content pre-warming, and health checks. Without the control plane, the CDN appliances continued serving cached content but could not fetch new segments for partially cached videos or handle cache misses.

**Impact**: Millions of East Coast users unable to stream for approx 4 hours. Netflix's stock dropped 2.5% the next trading day. Customer support call volume increased 10x. Estimated revenue impact: $10M+ in subscriber churn and goodwill.

**Fix**:
1. Manual rollback of the CDN control plane configuration to the previous stable version.
2. Implemented **canary configuration deployments**: deploy to 1% of CDN nodes, monitor for 30 minutes, then roll out gradually.
3. Added **degraded mode** for CDN nodes: if control plane contact is lost, continue serving cached content for 48 hours and add "stale-while-revalidate" headers.
4. Deployed **automated CDN health checks** with synthetic probes that detect degraded performance before customers notice.
5. Implemented **multi-region control plane** with automatic failover between US-East-1, US-West-2, and EU-West-1.

## 11. Production Implementation

\`\`\`typescript
interface TranscodeJob {
  jobId: string;
  uploadId: string;
  inputPath: string;
  resolutions: Resolution[];
  codecs: Codec[];
  segmentDuration: number;
  thumbnailCount: number;
  status: 'pending' | 'processing' | 'complete' | 'failed';
}

type Resolution = '360p' | '480p' | '720p' | '1080p' | '4K' | '8K';
type Codec = 'h264' | 'vp9' | 'av1' | 'hevc';

class TranscodingOrchestrator {
  private jobQueue: PubSubClient;
  private metadataDb: Database;
  private storageClient: StorageClient;

  async submitJob(uploadId: string, rawVideoPath: string): Promise<string> {
    const job: TranscodeJob = {
      jobId: generateId(),
      uploadId,
      inputPath: rawVideoPath,
      resolutions: this.getTargetResolutions(rawVideoPath),
      codecs: this.getTargetCodecs(),
      segmentDuration: 6,
      thumbnailCount: Math.ceil(this.getDuration(rawVideoPath) / 120),
      status: 'pending'
    };
    await this.metadataDb.insertJob(job);
    await this.jobQueue.publish('transcode-jobs', job);
    return job.jobId;
  }

  async processJob(job: TranscodeJob): Promise<void> {
    const outputBase = \`processed/\${job.jobId}\`;
    const transcodeTasks = job.resolutions.flatMap(resolution =>
      job.codecs.map(codec =>
        this.transcodeSegment(job.inputPath, outputBase, resolution, codec)
      )
    );
    await Promise.all(transcodeTasks);
    await this.generateThumbnails(job.inputPath, outputBase, job.thumbnailCount);
    await Promise.all([
      this.generateHlsManifest(outputBase, job.resolutions, job.codecs),
      this.generateDashManifest(outputBase, job.resolutions, job.codecs)
    ]);
    await this.metadataDb.updateJobStatus(job.jobId, 'complete', {
      outputBase,
      duration: this.getDuration(job.inputPath),
      resolutions: job.resolutions
    });
    if (await this.predictPopular(job)) {
      await this.cdnPreWarm(outputBase);
    }
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **YouTube**: 2B+ MAU, 500+ hours uploaded/min. Built on **Google Cloud** infrastructure. **Custom video processing chips** (Argos — Google's video transcoding ASIC, 20-33x efficiency gain). **VP9/AV1 codecs** developed in-house. **Content ID** — proprietary copyright fingerprinting system with 100+ years of scanned audio/video reference database. **CDN** — global edge network (1,000+ locations). **Recommendation system** — deep neural networks processing 1B+ hours of watch data daily.
- **Netflix**: 260M+ subscribers, approx 15K titles. **Open Connect CDN** — Netflix's own CDN appliances deployed inside ISP data centers (10,000+ appliances globally). **Three-tier encoding**: per-title encoding, per-shot encoding, and per-chunk encoding. **Chaos engineering** — Chaos Monkey simulates CDN node failures in production. **Recommendation system** — CineMatch, personalized rows, A/B tests thousands of artwork variants.
- **Twitch**: 30M+ DAU, live streaming focus. **Ultra-low latency** via WebRTC-based streaming (sub-2 second). **HLS ingest** with chunked encoding for low-latency live. **Stream manager** — distributed IRC-like chat + video sync. **Transcode-while-streaming** — real-time GPU-based encoding.
- **TikTok**: 1B+ MAU, short-form vertical video. **Custom recommendation algorithm** ("For You" feed) — heavily ML-driven. **Content moderation** — AI-based automated moderation. **CDN strategy** — regional caching, pre-fetch trending content to edge. **Upload pipeline** — optimized for mobile upload (background processing, chunked uploads with resumability).
- **Hulu**: 45M+ subscribers. **Live TV + VOD** hybrid. **Ad insertion** — SSAI (Server-Side Ad Insertion) for seamless ad placement in live streams. **Dynamic ad insertion** — stitch personalized ads into manifests at the segment boundary.

## 13. Interview Playbook

**Common questions and strategies:**

1. *How would you design YouTube's video upload and processing pipeline?*
   - **Approach**: Start with upload (resumable, chunked), then transcoding (distributed workers, queue-based), then CDN storage. Emphasize the asynchronous nature — upload returns immediately, processing happens in the background.

2. *How does adaptive bitrate streaming work? Describe the ABR algorithm.*
   - **Approach**: Explain manifest file, client downloads first segment at low bitrate, measures bandwidth, selects optimal bitrate, continuously adjusts. For production: hybrid approach (buffer occupancy + bandwidth estimation). Mention Netflix's per-title encoding for extra credit.

3. *Design a CDN for video streaming at global scale.*
   - **Approach**: Edge servers in each region (POP), tiered caching (L1: local edge, L2: regional, origin). Cache replacement policy: LFU with frequency-based aging (popular content stays warm). Multi-CDN with DNS-based routing for failover.

4. *How would you reduce video startup time (Time to First Frame)?*
   - **Approach**: (1) Pre-fetch manifest on app launch. (2) Use low-bitrate first segment as placeholder (upgrade after 2 seconds). (3) Thumbnail-based preview while loading. (4) TCP connection warm-up (HTTP/2 multiplexing, pre-connect). (5) CDN edge compute to generate manifest near user.

5. *How would you implement YouTube's "autoplay" recommendations?*
   - **Approach**: Two-stage system: (1) Candidate generation — collaborative filtering, content-based, trending. (2) Ranking — ML model (DNN) with features like watch history, demographics, time of day, device. A/B test continuously.

6. *How does live streaming differ from VOD in architecture?*
   - **Approach**: Live streaming adds: (1) Real-time ingestion (RTMP, SRT) with transcoding delay measured in seconds. (2) Rolling window of segments (not complete file). (3) Ultra-low latency requirement (<5s vs not critical for VOD). (4) No pre-warming. (5) DVR functionality (rewind within a sliding window).

7. *Design a video recommendation system that personalizes content for 1B+ users.*
   - **Approach**: Two-tower model: query tower (user features) and candidate tower (video features). Approximate Nearest Neighbor (ANN) search for fast candidate retrieval at scale. Online learning for real-time feedback.

8. *How would you handle DMCA takedown requests?*
   - **Approach**: Automated pipeline: receipt, verification, removal from CDN (cache purge), update metadata (mark as blocked), notify uploader. Use Content ID proactively to prevent re-upload.

**System design interview strategy for video streaming**:
- Clarify the scope: VOD, live, or both? Short-form or long-form? User-generated or professional?
- Walk through both upload and playback paths separately.
- For the upload path, focus on the async transcoding pipeline (the most complex part).
- For the playback path, focus on ABR, CDN, and buffering strategy.
- Discuss the cost structure: storage vs bandwidth vs transcoding compute.

## 14. Concept Check Quiz

1. What is the purpose of video segments in HLS/DASH?
   - **Answer**: Segments enable adaptive bitrate switching (change quality at segment boundaries), efficient seeking (download only needed segments), error recovery, CDN caching (segments are independently cacheable), and progressive download without full file buffering.

2. What is the difference between HLS and DASH streaming protocols?
   - **Answer**: HLS (Apple) uses .ts segments and .m3u8 playlists, works natively on iOS/macOS. DASH (MPEG standard) uses .mp4 segments (.m4s) and .mpd manifests, works on Android/Chrome. DASH is codec-agnostic.

3. How does a CDN cache invalidation work when a new version of a video is uploaded?
   - **Answer**: Versioned manifest URLs (e.g., \`/video/abc123/v2/manifest.m3u8\`). New uploads generate new segment files with different names or paths. CDN purge API is used to remove old segments if needed.

4. What is the difference between "first frame startup time" and "rebuffer rate"?
   - **Answer**: First frame startup time is the time from clicking "Play" until the first video frame renders. Rebuffer rate is the percentage of playback time spent buffering (stalls during playback). Both are critical QoE metrics.

5. True or False: In video transcoding, AV1 codec provides better compression than H.264 but requires significantly more compute to encode.
   - **Answer**: True. AV1 offers 30-50% better compression than H.264 at the same quality, but encoding is 5-10x slower.

6. How does per-title encoding (Netflix) differ from fixed-bitrate encoding?
   - **Answer**: Fixed-bitrate encoding uses the same bitrate ladder for all videos. Per-title encoding analyzes each movie's complexity and creates a custom bitrate ladder that optimizes quality per bit. This saves 20-50% bandwidth for easy content.

7. What is "chunked encoding" in the context of live streaming?
   - **Answer**: Traditional encoding produces a complete segment before publishing. Chunked encoding publishes small pieces (chunks) of each segment as they are encoded, reducing live latency from a full segment duration (2-6 seconds) to a fraction of a second.

8. How does YouTube's Content ID work at a high level?
   - **Answer**: Content ID creates a "fingerprint" (audio and video hashes/features) from reference media uploaded by copyright owners. When a new video is uploaded, it is scanned against the fingerprint database. A match triggers block, track, or mute actions.

## 15. Next Steps

- **Hands-on**: Build a basic video streaming pipeline with FFmpeg + HLS + Node.js server. Upload a video, transcode to multiple resolutions, play back with hls.js in the browser.
- **Study ABR algorithms**: Read the BOLA paper (buffer-based adaptation), implement a simple ABR logic in JavaScript.
- **Deep dive**: Set up an AWS Elemental MediaConvert pipeline or open-source VideoLAN transcoding stack.
- **Read**: Netflix's tech blog series on per-title encoding, per-shot encoding, and per-chunk encoding optimizations.
- **Explore**: Compare HLS, DASH, and CMAF streaming protocols. Understand the tradeoffs.
- **Production**: Study YouTube's published architecture (Google Cloud Next talks, YouTube engineering blog).
- **Next lesson**: Design Uber / Lyft (Ride Hailing) — real-time matching, geospatial indexing, ETA prediction, surge pricing.
`,
    estimatedMin: 22,
    difficulty: "ADVANCED" as const,
    companies: ["YouTube", "Netflix", "Twitch", "Hulu", "Vimeo"],
    tags: ["video-streaming", "cdn", "adaptive-bitrate", "transcoding", "hls", "dash"],
  },

  {
    id: "lesson-08-04",
    slug: "system-design-problems-04-ride-hailing",
    title: "Design Uber / Lyft (Ride Hailing)",
    content: `## 0. Mental Model

**Think of a ride-hailing service as a giant, real-time dance of cars and passengers across a city.** When you request a ride, imagine a central air traffic controller that instantly knows the location of every available car in the city, calculates which driver can reach you fastest (accounting for traffic, one-way streets, and current speed), and dispatches that driver to you. As you wait, the controller continuously recomputes ETAs as the driver navigates toward you. After the ride, payment happens automatically — like a taxi's meter but handled instantly in the background. The system must handle millions of concurrent passengers and drivers, update locations every few seconds for each, match them in milliseconds, and adjust prices in real-time when demand spikes (surge pricing) to encourage more drivers to head to busy areas.

## 1. Quick Summary

Designing a **ride-hailing platform** like Uber or Lyft requires building a real-time **geospatial matching system** that connects riders with nearby drivers. Core challenges: **real-time location tracking** (driver GPS updates every 4 seconds), **efficient nearest-driver search** (geohashing or quad-tree indexing), **matching algorithm** (batching matches every 2 seconds for optimal assignments), **ETA calculation** (route estimation with real-time traffic), **surge pricing** (dynamic pricing based on supply/demand), **trip lifecycle** (request to match to pickup to ride to dropoff to payment), and **fraud detection** (fake rides, payment fraud). At Uber scale (100M+ MAU, 25M+ trips/day in 70+ countries), the system uses **Kafka** for real-time event streaming, **H3/Geohash** for spatial indexing, **Supersonic (custom ML)** for ETA prediction, and a **Kafka Streams-based** platform for continuous matching.

## 2. Definition & Terminology

A **ride-hailing platform** connects passengers with drivers via a mobile app, handling the entire trip lifecycle from request to payment.

Key terminology:
- **Hail**: A ride request from a passenger.
- **Matching**: Algorithm that assigns a driver to a passenger's request.
- **ETA (Estimated Time of Arrival)**: Predicted time for driver to reach pickup location (includes traffic).
- **Surge pricing**: Dynamic price multiplier based on real-time supply/demand.
- **Geohash**: Hierarchical spatial data structure that encodes geographic coordinates into a short string.
- **H3**: Uber's hexagonal hierarchical spatial index (hexagons instead of squares for more uniform distance).
- **Heat map**: Map showing areas of high demand (used for surge pricing and driver incentives).
- **Carpool/Pool**: Shared ride where passengers heading in the same direction share a vehicle.
- **Driver dispatch**: The process of sending a ride request to a specific driver.
- **Trip lifecycle**: Sequence of states: requesting, matching, en route, arrived, on trip, completed, paid.
- **ETO (Estimated Time of Occupancy)**: How long the trip will take.
- **Rider cancellation fee**: Fee charged if rider cancels after driver has waited a minimum time.
- **Batching**: Grouping ride requests and driver assignments into optimization windows (e.g., 2 seconds).

## 3. The Problem Without It

Before ride-hailing apps, getting a ride was inefficient and unpredictable:

- **Street hailing**: Stand on a street corner and hope an empty taxi passes by. No guarantee of availability, especially in suburbs, at night, or during bad weather. Wait times varied from 5 minutes to never.
- **Taxi dispatch by phone**: Call a central number, describe your location to a dispatcher, wait for a radio call. Ambiguous location descriptions led to pickup failures. No real-time tracking.
- **Fixed pricing**: Taxis charged by the mile regardless of demand. During rain or New Year's Eve, taxis were simply unavailable. No incentives for drivers to serve surge areas.
- **No transparency**: No upfront fare estimates. No driver ratings. No route tracking. Payment was cash-only (or credit card with taxi fleet approval).
- **Limited supply**: Taxi medallion systems artificially restricted the number of taxis. Most supply sat idle during off-peak hours.
- **Safety concerns**: No driver identity verification, no GPS tracking shared with friends/family, no digital payment trail.

## 4. How It Works — Core Mechanics

**Trip Lifecycle:**

1. **Request**: Rider opens app, sees map with nearby drivers and upfront fare estimate. Sets pickup/dropoff. Taps "Request."
2. **Matching** (runs every 2 seconds in batch):
   - System identifies all available drivers within geohash area of pickup.
   - Applies filters (comfort preference, driver rating > 4.7, vehicle type).
   - Computes ETA for each candidate driver (using real-time traffic model).
   - Solves assignment optimization: minimize total passenger wait time.
   - Dispatches the optimal driver.
3. **Pickup**: Rider sees driver location in real-time. Driver navigates to pickup.
4. **Trip**: Driver navigates to destination. GPS pings every 4 seconds. Route and ETA recomputed continuously.
5. **Dropoff**: Trip ends. Payment processed automatically. Rider and driver rate each other.
6. **Payment**: Charge rider's saved payment method. Deduct Uber's commission (20-30%). Transfer driver's earnings.
7. **Post-trip**: Receipt sent with route map, fare breakdown, driver info.

**Matching Algorithm (Batching Approach):**

Input: List of available drivers D, list of ride requests R (collected over 2s window)
Output: Assignment A: R to D

1. Compute cost matrix: cost(r, d) for each (r, d) pair
   - cost = weighted combination of: driver ETA to pickup, extra passenger wait time, distance driver will travel empty, surge multiplier
2. Run Hungarian Algorithm (or greedy approximation for large N):
   - Reject pairs where ETA > rider_wait_threshold (e.g., 15 min)
   - Find assignment that minimizes total cost
3. Dispatch: send push notification to assigned drivers.
   Driver has 15 seconds to accept.
   If driver rejects or times out to reassign.

**Geospatial Indexing:**

| Method | Description | Pros | Cons |
|--------|-------------|------|------|
| Geohash | Encode (lat, lng) into a hash string | Simple, prefix-based search | Distortion near poles, edge discontinuities |
| Quad-tree | Recursively partition space into quadrants | Supports dynamic density | Tree maintenance overhead |
| H3 (Uber) | Hierarchical hexagonal grid | Uniform neighbor search, 16 resolutions | More complex than Geohash |
| S2 (Google) | Hilbert curve on sphere | Very efficient for covering | Google-internal originally |

Uber uses **H3** for uniform hexagon-based indexing. Drivers are mapped to their H3 cell. Matching queries check the rider's cell and expand to adjacent cells until a sufficient number of drivers is found.

## 5. Variants & Flavors

| Variant | Description | Example |
|---------|-------------|---------|
| **Premium/Black** | Luxury vehicles, top-rated drivers, higher price | Uber Black, Lyft Lux |
| **Carpool/Pool** | Shared ride with other passengers on similar route | Uber Pool, Lyft Shared |
| **Bike/Scooter** | Short-distance electric vehicle rental | Uber Jump, Lime |
| **Delivery** | Package/food delivery with real-time tracking | Uber Direct, DoorDash, Uber Eats |
| **Freight** | Long-haul trucking load matching | Uber Freight |
| **Transit** | Public transit route integration and ticketing | Uber Transit |
| **Helicopter/Boat** | Airborne or water-based transport | Uber Copter, Uber Boat |
| **Autonomous taxi** | Self-driving vehicle fleet without human driver | Waymo, Cruise, Uber ATG |

## 6. Performance Characteristics

**Capacity Estimation (Uber scale: 25M+ trips/day, 100M+ MAU):**

| Metric | Value |
|--------|-------|
| Trips per day | 25M+ (peak: 1M+/hour) |
| GPS updates per second | 25M drivers x 1/4 Hz = 6.25M updates/sec |
| Matching requests/sec | 1M+ hails/hour = approx 280 hails/sec (peak: 1,000/sec) |
| Matching computation window | 2 seconds (batch) |
| ETA calculations per second | 10M+ (every GPS update triggers ETA recomputation) |
| Storage (trip records) | 25M trips/day x 1KB = 25GB/day |
| Storage (GPS traces) | 6.25M updates/sec x 100 bytes x 3600 x 24 = approx 54TB/day (compressed) |

**Latency Targets**:
- Match request to driver dispatch: < 500ms (P99).
- ETA computation: < 50ms per route (P99).
- GPS ingestion to visible to rider: < 2 seconds (P99).
- Payment processing: < 3 seconds (P99).

**Availability**: 99.99% for matching service. During degraded mode, fall back to simple nearest-driver matching (no optimization).

**Key Bottlenecks**:
- Matching algorithm is compute-intensive (Hungarian algorithm is O(N^3)).
- Database writes for GPS data are massive (54TB/day).
- Real-time traffic integration requires fast map-matching (snap GPS to road network).

## 7. Failure Modes

- **Matching service crash**: New ride requests cannot be fulfilled. Mitigation: redundant active-active matching service across multiple regions, fallback to simple nearest-driver matching.
- **GPS blackout area**: Driver in a tunnel/basement loses GPS signal. Mitigation: dead reckoning (last known heading/speed), Wi-Fi/cell tower triangulation.
- **Payment failure mid-trip**: Rider's card is declined at dropoff. Mitigation: Pre-auth card at request time. If payment fails at trip end, apply wallet hold and send reminder.
- **Surge pricing algorithm bug**: Incorrect surge multiplier. Mitigation: Capped surge (max 5x), monitoring alerts, manual override by regional ops team.
- **Driver accepts then cancels**: Driver accepts ride but cancels after seeing passenger. Mitigation: Penalty for driver cancellations, driver feedback loop.
- **Rider provides wrong pickup location**: Rider is not at the pin location. Mitigation: rider location sharing, pickup confirmation code.
- **Map data stale**: New road/construction not in navigation. Mitigation: Crowdsourced road data (Waze integration), real-time traffic incident feeds.
- **Fraud**: Driver and rider run fake trips for payouts. Mitigation: ML-based fraud detection (speed anomalies, route deviation, trip duration outliers).

## 8. Decision Framework

| Condition | Recommendation |
|-----------|---------------|
| Single city, <100K trips/day | Monolith + single DB + simple nearest-driver matching. |
| Multiple cities, <1M trips/day | Microservices (matching, pricing, payments), Geohash indexing, Kafka for events. |
| Global scale (Uber/Lyft level) | Custom spatial index (H3), Kafka Streams for matching, ML for ETAs, multi-region active-active. |
| Need carpool/pool | Batch matching with route optimization (OR-Tools), share-ride cost splitting. |
| Need real-time tracking | WebSocket/gRPC streaming for GPS, Kafka for event sourcing. |
| Need surge pricing | Dynamic pricing model: continuous supply/demand measurement per hexagon, price elasticity modeling. |
| Need ETA accuracy | Real-time traffic integration (partner APIs), historical route time ML model, map-matching. |
| Need multi-modal | Separate service for each mode, unified rider app, shared payment/pricing infrastructure. |

## 9. Live Architecture Diagram

\`\`\`
Ride Request Flow:
  [Rider App] --Request ride--> [API Gateway] --> [Trip Service]
                                                      |
                                               [Matching Service]
                                                      |
                                          +-----------+-----------+
                                          |                       |
                                    [Geospatial Index]    [ETA Service]
                                      (H3/Geohash)        (ML-based)
                                          |                       |
                                    [Driver Location]      [Traffic Data]
                                          |                       |
                                          +-----------+-----------+
                                                      |
                                               [Assignment Engine]
                                                      |
                                          [Optimal match (driver, eta)]
                                                      |
                                              [Push Notification]
                                                      |
                                              [Driver accepts]
                                                      |
                                              [Ride in progress]

Real-time Data Pipeline:
  [Driver GPS (every 4s)] --> [GPS Ingestion Service] --> [Kafka (driver-locations)]
                                                              |
                                        +-----------------------+-----------------------+
                                        |                       |                       |
                                  [Matching Service]    [Rider App via WebSocket]   [Analytics (surge
                                   (read drivers in                             pricing, fraud detection)]
                                    rider's area)]
\`\`\`

## 10. Real Production Incident

**Uber Matching Outage (2017) — "The Great Deactivation"**:

Uber experienced a 45-minute global matching outage after a configuration deployment caused the matching service to reject all ride requests. The incident occurred during evening rush hour in multiple time zones.

**Root cause**: A configuration change to the "driver deactivation" system had a bug. The configuration accidentally set the maximum driver rating threshold to 5.0 (meaning only drivers with a perfect 5.0 rating were eligible). Since very few drivers have a perfect rating, the matching service found zero available drivers for all ride requests globally.

**Impact**: 15M+ ride requests went unfulfilled. Millions of dollars in lost revenue. Riders switched to Lyft, and Uber's market share in several cities dropped 5-10% over the following month.

**Fix**:
1. Rolled back the configuration deployment within 45 minutes.
2. Added **configuration validation tests**: every config change to driver eligibility is tested against a sample of 10,000 active drivers to ensure at least 1% pass rate.
3. Implemented **canary deployments** for configuration changes: deploy to 5% of regions, monitor match rate for 5 minutes, then roll out globally.
4. Added **minimum match guard**: if match rate drops below 10% of historical baseline, automatic rollback and alert.

## 11. Production Implementation

\`\`\`typescript
interface RideRequest {
  requestId: string;
  riderId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  requestTime: number;
  productType: 'uberx' | 'uberblack' | 'uberpool';
}

interface DriverInfo {
  driverId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  status: 'available' | 'en-route' | 'on-trip' | 'offline';
  rating: number;
  carType: string;
  lastUpdated: number;
}

class MatchingService {
  private spatialIndex: H3Index;
  private etaService: ETAService;
  private driverLocationCache: RedisCache;

  async matchBatch(): Promise<void> {
    const pendingRequests = await this.getPendingRequests();
    const candidates = new Map<string, DriverWithETA[]>();

    for (const request of pendingRequests) {
      const nearestDrivers = await this.findDriversNearby(
        request.pickupLat, request.pickupLng,
        this.getSearchRadius(request)
      );
      const etaPromises = nearestDrivers.map(async (driver) => ({
        driver,
        eta: await this.etaService.computeETA(
          driver.lat, driver.lng,
          request.pickupLat, request.pickupLng
        )
      }));
      candidates.set(request.requestId, await Promise.all(etaPromises));
    }

    const assignments = this.assignDrivers(pendingRequests, candidates);
    await Promise.all(
      assignments.map(a => this.dispatchDriver(a.driverId, a.request))
    );
  }

  private assignDrivers(
    requests: RideRequest[],
    candidates: Map<string, DriverWithETA[]>
  ): Assignment[] {
    const assignedDrivers = new Set<string>();
    const results: Assignment[] = [];
    const sortedRequests = [...requests].sort(
      (a, b) => a.requestTime - b.requestTime
    );
    for (const request of sortedRequests) {
      const available = candidates.get(request.requestId)!
        .filter(c => !assignedDrivers.has(c.driver.driverId))
        .sort((a, b) => a.eta - b.eta);
      if (available.length > 0) {
        const best = available[0];
        assignedDrivers.add(best.driver.driverId);
        results.push({ requestId: request.requestId, driverId: best.driver.driverId, eta: best.eta });
      }
    }
    return results;
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **Uber**: 100M+ MAU, 25M+ trips/day, 70+ countries. Infrastructure: **Kafka** (central event bus, 1T+ messages/day), **H3** (hexagonal spatial index — open-sourced), **Supersonic** (ML-based ETA prediction), **Peloton** (supply forecasting), **M3** (metrics platform). Custom **graphene** framework for fault-tolerant microservices. **Matching algorithm**: batch-based (2-second windows) with optimization for whole-system efficiency.
- **Lyft**: 40M+ MAU, approx 2M trips/day. Infrastructure: **AWS** (predominantly), **Envoy** (service mesh), **Flyte** (ML orchestration). **Matching**: similar batch approach but with different optimization objective (rider wait time vs driver earnings fairness).
- **Grab**: 180M+ MAU, 8 countries (Southeast Asia). **Super app** — rides, food delivery, payments, financial services. Infrastructure: **AWS**, **Kafka**, **Temporal** for workflow orchestration.
- **DiDi**: 550M+ MAU, China, 20M+ trips/day. Infrastructure: **Heterogeneous computing** (CPUs + GPUs for ML inference), **AI-powered safety** — real-time driver monitoring via in-car cameras.
- **Ola**: 150M+ MAU, India. **Offline-first** design (unreliable mobile networks). **SMS-based booking** for non-smartphone users. **Multi-modal**: auto-rickshaws, bikes, taxis, buses.

## 13. Interview Playbook

**Common questions and strategies:**

1. *How would you find the nearest available driver to a rider?*
   - **Approach**: Use geospatial indexing (Geohash/H3). Convert rider's (lat, lng) to a cell. Check for available drivers in that cell and neighboring cells. Expand search radius if insufficient drivers found.

2. *How does Uber's batch matching work?*
   - **Approach**: Every 2 seconds, collect all pending ride requests. For each request, find candidate drivers (within radius). Compute cost matrix. Solve assignment optimization (Hungarian algorithm or greedy approximation). Dispatch matched drivers simultaneously.

3. *How would you design Uber's ETA prediction system?*
   - **Approach**: Two-stage: (1) Route computation (shortest path on road network, using Dijkstra/A* with real-time traffic costs). (2) Time prediction (ML model: historical travel times + real-time traffic + time of day + weather + driver behavior features).

4. *How does surge pricing work? Explain the algorithm.*
   - **Approach**: Monitor supply vs demand per geospatial cell. Compute supply/demand ratio. Apply surge multiplier = f(ratio) where f is calibrated to price elasticity. Cap surges to avoid PR backlash. Surge attracts more drivers to the area.

5. *How would you design Uber Pool (shared rides)?*
   - **Approach**: At match time, consider grouping two ride requests with similar origins/destinations (within detour threshold). Compute route for both pickups and both dropoffs. Split fare between riders.

6. *How do you handle driver fraud?*
   - **Approach**: ML-based anomaly detection: expected speed vs actual, route deviation from optimal, trip duration outliers, surge chasing. GPS spoofing detection: WiFi/BLE signals consistency, accelerometer correlation with motion.

7. *Design the real-time driver tracking system handling 6M+ GPS updates/sec.*
   - **Approach**: GPS ingestion via load-balanced WebSocket/gRPC servers. Write to Kafka for durability. Stream process with Kafka Streams/Flink: deduplicate, throttle, write to Redis with TTL, fan-out to rider WebSocket connections, archive to S3.

8. *What happens when a network partition isolates the matching service?*
   - **Approach**: Active-active deployment across 3+ regions. If one region's matching service becomes unavailable, DNS-based routing sends traffic to another region. In-flight requests are retried with idempotency keys.

**System design interview strategy for ride-hailing**:
- Start with the two core user flows: rider requesting a ride and driver going online.
- Draw the real-time data pipeline (GPS to Kafka to matching to dispatch) as the backbone.
- Walk through a single match in detail (request, spatial search, ETA, assignment, dispatch).
- Discuss the batch optimization window — why 2 seconds and not instant.
- Cover surge pricing as a supply/demand control loop.

## 14. Concept Check Quiz

1. Why does Uber use a batch-based matching approach (2-second windows) instead of instant per-request matching?
   - **Answer**: Batching enables global optimization — multiple requests and drivers are considered together, producing better overall assignments (shorter total wait times) compared to greedy per-request matching.

2. What is the difference between Geohash and H3 spatial indexing?
   - **Answer**: Geohash divides the Earth into rectangular grid cells with edge discontinuities and polar distortion. H3 (Uber) uses hexagonal cells which have uniform neighbor distance and no edge discontinuities.

3. How does surge pricing affect both rider behavior and driver behavior?
   - **Answer**: For riders: higher price reduces demand. For drivers: higher payout increases supply (drivers move toward surge areas, stay online longer). The combined effect rebalances supply and demand.

4. True or False: The Hungarian algorithm for driver-rider matching runs in O(N^3) time complexity, making it impractical for large deployments.
   - **Answer**: True for pure Hungarian, but approximations (greedy, K-means clustering, limiting candidate pool) reduce effective complexity.

5. How does ETA computation differ from simple distance/speed calculation?
   - **Answer**: ETA must account for real-time traffic conditions, turn delays, one-way streets, road closures, historical speed patterns per road segment for that time of day, and map-matching.

6. What happens if a rider cancels after the driver is already en route?
   - **Answer**: If rider cancels within 2 minutes (or driver has traveled <0.5km to pickup), no fee. After that, rider pays a cancellation fee to compensate the driver.

7. How does Uber handle the "empty mile" problem?
   - **Answer**: The matching algorithm includes "deadhead distance" (distance driver travels to pickup) in the cost function. Minimizing deadhead improves driver earnings and reduces overall city traffic.

8. Design a system to batch GPS updates before writing to the database. Why is this important?
   - **Answer**: GPS updates are high volume (6M+/sec). Batching: write in bulk, compress GPS traces, use append-only time-series DB, downsample older data.

## 15. Next Steps

- **Hands-on**: Build a minimal ride-matching system: simulate drivers with WebSocket locations, implement nearest-driver search with Geohash, build an ETA calculator.
- **Study spatial indexing**: Implement both Geohash and H3 from scratch. Compare query performance for nearest-neighbor search.
- **Read**: Uber Engineering blog — deep dives on H3, matching optimization, surge pricing, and fraud detection.
- **Deep dive**: Study the Hungarian algorithm and its application to assignment problems. Then explore approximation algorithms for real-time matching.
- **Explore**: Compare ride-hailing economics — how different platforms balance driver earnings, rider prices, and profitability.
- **Hands-on**: Integrate with Google Maps or Mapbox APIs to build a route-finding service with real-time traffic.
- **Next lesson**: Design Twitter / Facebook Feed (Newsfeed) — fan-out, timeline ranking, pull vs push models, social graph storage.
`,
    estimatedMin: 22,
    difficulty: "ADVANCED" as const,
    companies: ["Uber", "Lyft", "Grab", "Ola", "DiDi"],
    tags: ["ride-hailing", "uber", "real-time", "matching", "gps", "geospatial"],
  },

  {
    id: "lesson-08-05",
    slug: "system-design-problems-05-newsfeed",
    title: "Design Twitter / Facebook Feed (Newsfeed)",
    content: `## 0. Mental Model

**Think of a newsfeed as a personalized newspaper that's printed fresh every time you open the app.** The newspaper editor (ranking algorithm) reads everything your friends and favorite pages have posted since your last visit, then selects and arranges the most interesting items on the front page (feed). The editor considers: how close you are to each friend (signal strength), what topics you engage with most (interests), how recent each post is (recency), and how popular each post is with others (engagement signals). Now imagine 500 million people each getting their own personalized newspaper, all from the same global publishing house, printed and delivered in under 500 milliseconds — that's the scale of a modern newsfeed system.

## 1. Quick Summary

Designing a **newsfeed system** like Twitter's timeline, Facebook's newsfeed, or Instagram's feed is a core system design problem. The system must **aggregate content** from followed users/pages, **rank** it by relevance (not just chronological), and **deliver** it to the user with low latency. Core challenges: **fan-out** (delivering a post to millions of followers), **feed ranking** (ML-based relevance scoring), **real-time updates** (new posts appear without refresh), **mixed content types** (text, images, videos, links, polls), and **read vs write optimization**. The two main architectures: **push (fan-out on write)** — pre-compute feeds when a post is created (fast read, slow write) — and **pull (fan-out on read)** — compute feed at request time (slow read, fast write). Twitter uses a **hybrid model**: push for regular users with <30K followers, pull for celebrities with millions of followers. Facebook uses push with ranked cron jobs for re-ranking.

## 2. Definition & Terminology

A **newsfeed** is a continuously updated list of content items (posts, photos, videos, links) from a user's social network, presented in reverse chronological or relevance-ranked order.

Key terminology:
- **Fan-out**: Distributing a post to all followers' feeds (push) or aggregating followers' posts on read (pull).
- **Timeline**: A user's personal feed of posts from followed accounts.
- **Fan-out on write (push model)**: When a user creates a post, it is inserted into the feeds of all followers immediately.
- **Fan-out on read (pull model)**: When a user opens their feed, the system queries posts from all followed users and merges them.
- **Feed ranking**: ML-based scoring of posts by relevance (engagement, recency, relationship strength, content type).
- **Social graph**: The network of follower/following relationships between users.
- **Top K aggregation**: Selecting the K most relevant posts from a large set of candidates.
- **Engagement signals**: Likes, comments, shares, saves, dwell time, click-through rate.
- **Impression**: A post displayed to a user (counted for analytics).
- **Reach**: Total number of unique users who see a post.
- **Edge rank**: Facebook's original feed ranking algorithm (affinity + weight + decay).
- **Pagination/Cursor**: Loading feed in pages (cursor-based for consistent ordering).
- **Stale feed**: Feed content that hasn't been refreshed since the last read.
- **Pre-computation**: Computing a user's feed in advance to reduce read latency.

## 3. The Problem Without It

Before algorithmic newsfeeds, consuming social content was chaotic:

- **Reverse-chronological firehose**: Every post from every followed user appeared in order of posting. Missing a day meant scrolling through hundreds of posts.
- **No personalization**: Every user saw the same content in the same order. Close friends were treated the same as distant acquaintances.
- **Information overload**: A user following 1,000 accounts could see 500+ posts per day. Most were irrelevant.
- **Out-of-sight, out-of-mind**: If you didn't open the app for 8 hours, you saw everything in order — no prioritization.
- **Creator unfairness**: Posting at the wrong time meant your content was seen by almost no one.
- **No real-time discovery**: No trending or recommended section. New creators were impossible to discover organically.
- **Business model limitations**: Without ranked feeds, ad insertion was awkward with no targeting optimization.

## 4. How It Works — Core Mechanics

**Write Path (Creating a Post):**

1. User creates a post (text, photo, video, link, poll).
2. Post service stores post in database and cache.
3. Post service publishes event to fan-out service (Kafka).
4. Fan-out service determines followers of the user:
   - If followers < threshold (e.g., 30K): **push** post to each follower's feed cache (Redis list).
   - If followers >= threshold: **pull** — post is stored in the creator's "recent posts" cache.
5. Notification service sends push notifications to active followers.
6. Timeline ranking service re-ranks affected feeds asynchronously.

**Read Path (Viewing Feed):**

1. User opens app or scrolls feed.
2. Feed service receives request with user_id and cursor (for pagination).
3. For **push model users**: read pre-computed feed from cache (Redis sorted set).
4. For **pull model users**: query recent posts from followed users (with fan-out on celebrities), merge and rank.
5. Feed ranking service scores each candidate post:
   - Features: recency, relationship strength (affinity), engagement (weight), content type, media count.
   - ML model predicts relevance score (click-through, like, share probability).
6. Return top K posts (e.g., 20 posts for initial load) with cursor for next page.
7. Client renders feed. User interactions are sent back as feedback signals to ML ranking model.

**Fan-out Decision:**

| Follower Count | Write Strategy | Read Strategy | Example |
|---------------|---------------|---------------|---------|
| < 30K | Push: write to each follower's feed cache | Read pre-computed cache | Regular Twitter user |
| 30K - 1M | Push to online followers + pull for offline | Read pre-computed + merge celebrity posts | Mid-tier influencer |
| > 1M | Pull only (fan-out on read) | Query celebrity posts at read time | Twitter/X: Elon Musk, Barack Obama |

## 5. Variants & Flavors

| Variant | Description | Example |
|---------|-------------|---------|
| **Chronological Feed** | Reverse chronological order, no ranking | Twitter (original mode), Instagram (following tab) |
| **Algorithmic Feed** | ML-ranked by relevance, engagement predictions | Facebook main feed, Instagram (home tab), TikTok |
| **Topic-based Feed** | Posts filtered by topics/interests, not social graph | Twitter topics, Reddit feed |
| **Linear Feed** | Unidirectional scroll, no branching (stories) | Instagram Stories, Facebook Stories |
| **Hybrid Feed** | Multiple sections: algorithmic + recents + suggested + ads | Most social media platforms |
| **Interest Graph Feed** | Based on content affinity rather than social graph | TikTok "For You" page |
| **Local Feed** | Geographically filtered content | Nextdoor, Yelp local feed |
| **Professional Feed** | Career-focused content, connection-based | LinkedIn feed |

## 6. Performance Characteristics

**Capacity Estimation (Twitter scale: 450M MAU, 500M tweets/day; Facebook: 3B MAU, 4B+ posts/day):**

| Metric | Twitter Value | Facebook Value |
|--------|---------------|----------------|
| MAU | 450M | 3B |
| Posts per day | 500M | 4B+ |
| Reads per second | 300K+ (feed refreshes) | 1.5M+ |
| Fan-out writes (push) | 500M x avg 1K followers = 500B writes/day | 4B x avg 200 friends = 800B writes/day |
| Feed cache size | 450M users x 500 posts = 225B entries | 3B x 500 = 1.5T entries |
| Storage (posts) | 500M/day x 1KB = 500GB/day | 4B x 2KB = 8TB/day |
| Storage (social graph) | 450M users x 200 edges = 90B edges | 3B x 200 = 600B edges |

**Latency Targets**:
- Feed load (first page): < 500ms (P99).
- Post creation to visible to followers: < 5 seconds (push), < 30 seconds (pull).
- Feed scroll (pagination): < 200ms per page (P99).

**Key Bottlenecks**:
- Fan-out writes: A single tweet from a celebrity with 100M followers generates 100M write operations.
- Feed ranking: ML scoring for 500+ candidate posts per user must complete in < 100ms.
- Social graph storage: billions of edges, need fast traversal.

## 7. Failure Modes

- **Fan-out write storm**: A celebrity with 100M followers posts simultaneously. Mitigation: Pull model for large accounts, write prioritization, rate-limiting per account.
- **Feed cache failure**: Redis cluster goes down. All users see empty feeds. Mitigation: Replica cache clusters, fallback to direct DB query with limited depth.
- **Stale feed**: User opens app 24 hours later. Their pre-computed feed has expired. Mitigation: Background cron job for warm feed computation for recently active users.
- **Ranking model cold start**: New user with no interaction history. Mitigation: Cold-start strategy: show popular posts, prompt interest selection during onboarding.
- **Toxic content in feed**: Harmful content appears in feed. Mitigation: Content moderation pipeline (AI + human review) running on all posts before fan-out.
- **Spam/engagement bait**: Posts using manipulative tactics. Mitigation: ML-based spam detection, demotion of posts with abnormal engagement patterns.
- **Feed inversion**: Posts appear out of order due to eventual consistency. Mitigation: Use server timestamps, monotonic sequence IDs.
- **Ad over-insertion**: User experience degraded by too many ads. Mitigation: Hard cap on ad-to-organic ratio, frequency capping.

## 8. Decision Framework

| Condition | Recommendation |
|-----------|---------------|
| Small scale (<100K users) | Simple push model, single DB, chronological feed. MVP in days. |
| Medium scale (100K-10M users) | Push fan-out for all users, Redis for feed cache, periodic re-ranking cron job. |
| Large scale (10M-100M users) | Hybrid push/pull (threshold approx 30K followers), ML-based ranking, Kafka for async processing. |
| Twitter-scale (100M-500M users) | Hybrid push/pull with dynamic threshold, custom feed ranking ML model, real-time feature store. |
| Facebook-scale (1B+ users) | Push for close friends, pull for everyone else, pre-computed ranked feed refreshed asynchronously. |
| Need real-time updates | Fan-out on write + WebSocket/SSE push for active users. |
| Need personalized ranking | ML model: features from user + post + context. |
| Need ads in feed | Ad insertion service: query ad server for matched ads, insert at calculated positions. |

## 9. Live Architecture Diagram

\`\`\`
Write Path (Creating a Post):
  [User] --POST /post--> [API Gateway] --> [Post Service]
                                              |
                                    [Store in DB + Cache]
                                              |
                                    [Publish to Kafka: new-post]
                                              |
                                    [Fan-out Service (Kafka Consumer)]
                                              |
                              +---------------+---------------+
                              |                               |
                    [Follower Count Check]         [Notification Service]
                         /           \                  |
                   <30K            >=30K           [Push notification
                     |                |              to active users]
               [Push to each    [Store in
                follower's       celebrity's
                feed cache]      recent posts]
                     |
              [Update each follower's
               Redis sorted set]

Read Path (Viewing Feed):
  [User] --GET /feed--> [API Gateway] --> [Feed Service]
                                              |
                              +---------------+---------------+
                              |                               |
                    [Read pre-computed               [Query celebrity
                     feed from Redis]                 recent posts]
                              |                               |
                              +-----------+-------------------+
                                          |
                              [Merge + De-duplicate]
                                          |
                              [Feed Ranking Service]
                                          |
                          [ML model: score each candidate]
                                          |
                              [Select top K posts]
                                          |
                              [Insert ads]
                                          |
                              [Return ranked feed]
\`\`\`

## 10. Real Production Incident

**Twitter Fail Whale Era — Timeline Inconsistency (2012)**:

Before Twitter's 2013 architecture overhaul, the platform was notorious for the "Fail Whale" error page and inconsistent timelines. A specific incident in 2012 caused users to see tweets from 12+ hours ago at the top of their feed, while recent tweets were buried below.

**Root cause**: Twitter's original architecture stored timelines in a MySQL cluster with memcached as a caching layer. The fan-out service used a synchronous per-follower insert pattern with a shared connection pool. When a celebrity (@justinbieber, @katyperry) tweeted, the fan-out to 50M+ followers exhausted the connection pool. Redis connection timeouts caused partial fan-outs — some followers got the tweet, some didn't, and the tweet appeared in incorrect positions due to inconsistent replication lag.

**Impact**: 30M+ Twitter users saw broken timelines during peak hours. Tweet engagement dropped 15%. The "Fail Whale" appeared on 3% of page loads. This incident accelerated Twitter's rewrite of the timeline service.

**Fix**:
1. **Switched to hybrid push/pull model**: Regular users get push fan-out; users with >30K followers use pull model.
2. **Replaced synchronous fan-out with Kafka-backed async fan-out**.
3. **Redis Cluster with dedicated connection pools** per shard.
4. **Timeline consistency check**: Background job compares fan-out success rate against expected followers. Missing insertions are replayed.
5. **Timeline stitching**: Pull model feeds are merged client-side with push feeds to ensure completeness.

## 11. Production Implementation

\`\`\`typescript
interface Post {
  postId: string;
  userId: string;
  content: string;
  mediaUrls: string[];
  createdAt: number;
  visibility: 'public' | 'followers' | 'private';
}

interface FeedItem {
  postId: string;
  userId: string;
  score: number;
  createdAt: number;
  engagementScore: number;
}

class FanOutService {
  private static readonly PUSH_THRESHOLD = 30000;
  private feedCache: RedisClient;
  private socialGraph: SocialGraphClient;
  private kafkaProducer: KafkaClient;

  async fanOutPost(post: Post): Promise<void> {
    const followerCount = await this.socialGraph.getFollowerCount(post.userId);
    if (followerCount < FanOutService.PUSH_THRESHOLD) {
      await this.kafkaProducer.send({
        topic: 'fan-out-push',
        messages: [{ key: post.postId, value: JSON.stringify({ post, followerCount }) }]
      });
    } else {
      const celebrityKey = \`celebrity:recent:\${post.userId}\`;
      await this.feedCache.zAdd(celebrityKey, { score: post.createdAt, value: post.postId });
      await this.feedCache.expire(celebrityKey, 86400);
    }
  }

  async processFanOutPush(post: Post): Promise<void> {
    const followers = await this.socialGraph.getFollowerIds(post.userId);
    const batchSize = 1000;
    for (let i = 0; i < followers.length; i += batchSize) {
      const batch = followers.slice(i, i + batchSize);
      const pipeline = this.feedCache.pipeline();
      for (const followerId of batch) {
        const feedKey = \`feed:\${followerId}\`;
        pipeline.zAdd(feedKey, { score: post.createdAt, value: post.postId });
        pipeline.zRemRangeByRank(feedKey, 0, -501);
      }
      await pipeline.exec();
    }
  }
}

class FeedRankingService {
  private rankingModel: MLModel;
  private engagementStore: RedisClient;

  async getRankedFeed(userId: string, cursor: string | null, limit: number = 20): Promise<FeedItem[]> {
    const candidateIds = await this.getFeedCandidates(userId, 500);
    const posts = await this.fetchPostDetails(candidateIds);
    const features = await this.computeFeatures(userId, posts);
    const scores = await this.rankingModel.predict(features);
    const ranked = posts.map((post, i) => ({ ...post, score: scores[i] }));
    ranked.sort((a, b) => b.score - a.score);
    const cursorIdx = cursor ? ranked.findIndex(r => r.postId === cursor) : -1;
    const start = cursorIdx >= 0 ? cursorIdx + 1 : 0;
    const page = ranked.slice(start, start + limit);
    return this.insertAds(page, userId);
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **Twitter/X**: 450M+ MAU, 500M+ tweets/day. **Hybrid fan-out model**: push for users with <30K followers, pull for celebrities. **Earlybird** — real-time search index for tweet ranking (Lucene-based, custom scoring). **Manhattan** — in-house distributed KV store for timeline cache. **Blender** — ML ranking model combining relevance, recency, and engagement. **GraphJet** — real-time graph processing for tweet recommendations.
- **Facebook**: 3B+ MAU, 4B+ posts/day. **Push model** for most users. **ML-based ranking** (deep neural network with 100+ features). **Re-ranking cron** — every time you open the app, your feed is re-ranked. **Story Bumping** — re-insert previously shared stories getting engagement. **Last Actor** — show more content from people you've interacted with recently.
- **Instagram**: 2B+ MAU. **Feed ranking** uses deep learning (predicts: will you like this? will you comment? will you spend time?). **Explore page** uses a separate recommendation system based on content similarity.
- **TikTok**: 1B+ MAU. **"For You" feed** is entirely algorithmic — no social graph component. **Multi-tower DNN** (retrieval to ranking to heuristic adjustment). **Reinforcement learning** to explore new content categories.
- **LinkedIn**: 900M+ MAU. **Feed ranking** optimizes for professional relevance — factors: connection strength, content type, industry relevance, seniority match. **Feed quality** measured by dwell time.

## 13. Interview Playbook

**Common questions and strategies:**

1. *Design a newsfeed system for a social media platform with 100M DAU.*
   - **Approach**: Start with the two operations: creating a post (write) and viewing feed (read). Discuss push vs pull model. Recommend hybrid: push for regular users, pull for celebrities. Cover feed ranking, caching, and fault tolerance.

2. *Compare push (fan-out on write) vs pull (fan-out on read). Which would you choose?*
   - **Approach**: Push pros — fast reads, simple read logic. Push cons — write amplification, wasted work for inactive users. Pull pros — no wasted writes, efficient for celebrities. Pull cons — slow reads, complex read logic. **Recommendation**: Hybrid with threshold.

3. *How does feed ranking work? Describe the ML features.*
   - **Approach**: Three categories: (1) Affinity — interaction frequency with poster. (2) Weight — engagement on the post. (3) Decay — recency. Plus content type boost, media presence, user's past behavior with similar content.

4. *How would you design the timeline cache?*
   - **Approach**: Redis sorted sets per user: key = \`feed:{userId}\`, member = post ID, score = timestamp or relevance score. Keep 500-1000 most recent. TTL = 7 days. Background cron job warms active users' feeds.

5. *How do you handle the "celebrity problem" — a user with 100M followers?*
   - **Approach**: Don't fan-out on write. Use pull model: store their posts in a "celebrity recent posts" cache. When a follower requests their feed, merge the push feed with celebrity posts. Rank and return top K.

6. *How would you implement "add to feed" in real-time (WebSocket push)?*
   - **Approach**: When a post is created and fanned out, for each follower who is currently online, push the new feed item via WebSocket. Filter to only push items that would rank in the top 10.

7. *How does Facebook's "Story Bumping" work?*
   - **Approach**: If a post from a friend was published hours ago but the user didn't see it, and that post is now getting engagement, re-insert it into the top of the feed.

8. *Design the ads insertion mechanism in the feed.*
   - **Approach**: Separate ad server. Insert ads at fixed positions (e.g., 3rd, 8th, 15th organic post). Ad relevance via ML model. Frequency capping. A/B test ad load for optimal revenue/engagement balance.

**System design interview strategy for newsfeed**:
- Start with the two core paths: write (create post) and read (view feed).
- Draw the fan-out decision tree (push vs pull, threshold).
- Walk through a single post creation end-to-end and a single feed load.
- Discuss ranking at a high level.
- Address the celebrity problem proactively.
- Cover failure modes: feed inconsistency, cache failure, fan-out write storm.

## 14. Concept Check Quiz

1. What is the main tradeoff between push and pull for a newsfeed system?
   - **Answer**: Push optimizes for read latency at the cost of write amplification. Pull optimizes for write cost at the cost of read latency. Push wastes work for inactive users.

2. What threshold would you use for switching from push to pull? Why?
   - **Answer**: Typically 30K-100K followers. Below this, fan-out writes are manageable. Above this, write volume becomes too expensive. Twitter uses approx 30K.

3. How would you handle a celebrity tweet that needs to reach 50M followers?
   - **Answer**: Use pull model: store the tweet in the celebrity's recent posts cache. When followers request their feed, merge push feed with celebrity posts. No fan-out writes.

4. True or False: In a pure push model, a user who hasn't opened the app in 30 days still has their feed cache updated.
   - **Answer**: True but wasteful. Mitigation: only push to users active in the last N days.

5. What is the purpose of the "decay" function in feed ranking?
   - **Answer**: Decay reduces the relevance score of older posts so that recent content is prioritized. Without decay, highly-engaged old posts would dominate the top of the feed.

6. How does Facebook handle the "cold start" problem for a brand-new user?
   - **Answer**: Prompt the user to select interests during onboarding. Build an initial follow graph. Show popular/trending content. Gradually learn from early engagement.

7. How would you implement "cursor-based pagination" for a newsfeed API?
   - **Answer**: The cursor is the ID of the last post. Return posts with ID < cursor. Use a composite cursor (timestamp + post ID) for reliability.

8. What is the "write amplification" factor for a user with 5,000 followers in a pure push model?
   - **Answer**: Each post generates 5,000 write operations (1 per follower). The amplification factor is the number of followers (5,000x).

## 15. Next Steps

- **Hands-on**: Build a minimal newsfeed with push model (Redis sorted sets) and pull model (celebrity posts). Compare feed load latency.
- **Implement feed ranking**: Build a simple EdgeRank-like scoring function (affinity x weight x decay). Test with mock data.
- **Study**: Facebook's newsfeed ranking paper and engineering blog posts on feed architecture.
- **Deep dive**: Understand Twitter's Earlybird search-based approach to timeline computation.
- **Explore**: TikTok's "For You" feed architecture — how it differs from social graph-based feeds.
- **Production**: Read about Instagram's move from chronological to algorithmic feed and its impact on engagement.
- **Next lesson**: Module 09: Frontend Engineering & Performance (see module-09.ts).
`,
    estimatedMin: 20,
    difficulty: "ADVANCED" as const,
    companies: ["Twitter", "Facebook", "Instagram", "LinkedIn"],
    tags: ["newsfeed", "social-feed", "fan-out", "timeline", "ranking", "pull-model"],
  },

{
    id: "lesson-08-06",
    slug: "system-design-interviews-06-design-instagram-pinterest",
    title: "Design Instagram / Pinterest (Photo Sharing)",
    content: `## 0. Mental Model

Picture a **photo-sharing app** like a digital art gallery where users hang photos on walls. The gallery has a massive storage room (object store), framing stations that resize every photo (image processing pipeline), and curators that decide what appears on the featured wall (recommendation engine). Every photo goes through framing, gets copies at different sizes, and is displayed on multiple walls — the uploader's profile, followers' feeds, and the explore page.

## 1. Quick Summary

A **photo-sharing platform** (Instagram, Pinterest) lets users upload, edit, organize, and share photos with a social network. The core system must handle **ingestion** of millions of photos daily, **transform** each photo into multiple resolutions and formats, **store** billions of photos durably, **serve** them globally via CDN, and **rank** content for personalized feeds. At Instagram's scale (1B+ users, 100M+ photos/day), the architecture uses **Haystack** (custom photo storage) or **S3**, **CDN** for distribution, **Redis** for feed caching, **Cassandra** for metadata, and **ML models** for recommendation and moderation.

## 2. Definition & Terminology

**Upload Pipeline**: End-to-end flow from photo selection to availability — chunked upload, validation, EXIF parsing, async processing.

**Transcoding Pipeline**: Converts images to multiple resolutions (150x150 thumbnail, 640x640 standard, 1080x1080 full) and formats (JPEG, WebP, AVIF).

**CDN**: Globally distributed edge servers caching and serving static content close to users.

**Feed**: Chronological or algorithmic list of posts from followed users plus recommendations.

**Explore Page**: Personalized discovery surface using ML-based recommendations.

**Haystack**: Facebook's custom photo storage — needle-in-a-haystack approach for read-optimized storage with minimal metadata overhead.

## 3. The Problem Without It

**Storage Explosion**: A single smartphone photo is 4-12MB. With 100M uploads/day and multiple variants, total storage reaches exabytes. Without efficient storage, costs spiral.

**Upload Latency**: Without chunked resumable uploads, users on weak connections must restart on every interruption — terrible UX.

**CDN Blindness**: Serving every photo from one origin bottlenecks traffic. A viral photo overwhelms the server, causing global slowdowns.

**Cold Feed Performance**: Loading a feed requires merging recent posts from all followed users — O(follows) cost without pre-computation.

**Moderation Gaps**: Without automated ML screening at upload time, harmful content reaches users before human review.

## 4. How It Works — Core Mechanics

**Upload Pipeline**: (1) Client uploads photo in 1MB chunks (TUS protocol). (2) Upload Service reassembles, emits PhotoUploaded event to Kafka. (3) Image Processor validates format, extracts EXIF, resizes to three variants, converts to WebP/AVIF, strips GPS. (4) Variants uploaded to CDN origin with deterministic keys: photos/{userId}/{mediaId}/{variant}.webp. (5) Content moderation model scores photo (NSFW, hate speech, copyright). (6) Metadata written to Cassandra. (7) Fan-out: push photo ID to followers' Redis timeline caches.

**Serving Path**: Client requests photo via CDN URL. CDN edge returns cached copy (<10ms) or fetches from origin. Cache-control: public, max-age=31536000, immutable.

**Feed Generation — Hybrid Fan-out**: (a) Push model for users with <10K followers: write post ID to each follower's Redis timeline on publish. (b) Pull model for celebrities: followers merge celebrity posts at read time. Combines fast reads (push) with feasible writes (pull for high-follower accounts).

**Explore Recommendations**: (1) Candidate generation: similar users, trending hashtags, geo-popular content. (2) DNN scoring: past engagement, photo velocity, similarity to liked photos, recency. (3) Re-ranking: diversity constraints, ad insertion.

## 5. Variants & Flavors

**Instagram-style (Social + Feed)** : Follow accounts. Feed = followed posts + recommended. Stories (ephemeral), Reels (short video). Mobile-first with filters.

**Pinterest-style (Visual Discovery)** : Photos organized into boards. Discovery via search, categories, visual similarity. PinSage graph neural network for recommendations.

**Flickr-style (Photography Community)** : High-res hosting for serious photographers. Groups, pools, forums. Emphasis on camera metadata, Creative Commons licensing.

**VSCO-style (Creative Tools)** : Professional editing tools + community. No public likes/follower counts. Focus on artistry.

**Stock Platforms (Shutterstock, Unsplash)** : Search-driven marketplace. Keyword tagging, categorization, licensing. No social feed.

## 6. Performance Characteristics

**Upload Throughput**: ~1,150 uploads/sec at 100M/day peak. Image processor scales horizontally with GPU workers. Processing backlog <10s with 50+ consumers.

**Storage**: 100B+ photos × 6 variants × 2MB average = 200PB. Haystack reduces this with needle-per-server storage and minimal metadata on disk.

**Read Latency**: CDN hit: 5-20ms P95. CDN miss: 100-300ms. Feed load with Redis: 20-50ms. Without cache: 200-500ms.

**Feed Write Cost**: 1M posts/day from users with 10K followers = 10B Redis LPUSH/day. Pipelines and cluster sharding make this feasible.

## 7. Failure Modes

**Upload Interruption**: Without resumable uploads, failed transfers restart from scratch. Mitigation: TUS chunked protocol with client retry.

**Processing Backlog**: Viral event spikes overwhelm workers. Photos appear as blank placeholders. Mitigation: auto-scaling, priority queue (thumbnails first).

**CDN Origin Overload**: Celebrity photo goes viral. Origin can't handle CDN miss traffic. Mitigation: >99% cache hit ratio, origin shield, stale-while-revalidate.

**Cache Stampede**: Popular feed cache expires; thousands simultaneously hit DB. Mitigation: jittered TTLs, mutex-based regeneration, stale-while-revalidate.

**Moderation Failure**: Harmful photo bypasses automated screening. Mitigation: human-in-the-loop, queue-based review, retrospective scanning.

## 8. Decision Framework

**Upload**: Chunked resumable (TUS) for mobile. Simple upload for web/internal tools. Signed URL for client-to-S3 direct upload.

**Storage**: S3/GCS for simplicity and managed durability. Haystack only at extreme scale (100B+ photos).

**Feed**: Push for <10K followers. Pull for celebrities. Hybrid for general social networks.

**Recommendations**: Collaborative filtering (simple). DNN (higher accuracy, needs ML infra). Heuristic trending (simplest, no personalization).

**Image Formats**: JPEG (universal fallback). WebP (25-35% smaller). AVIF (30-50% smaller, emerging).

## 9. Live Architecture Diagram

\`
Upload Flow:
  Client -> Chunked Upload -> Upload Service -> Kafka
     -> Image Processor (resize + format convert + EXIF strip)
     -> Object Storage (variants)
     -> Moderation ML (async)
     -> Metadata DB (Cassandra)
     -> Fan-out to Redis timeline caches

Read Flow (feed):
  Client -> Feed API -> Redis cache check
     (miss) -> Fan-out pull from followed users' recent posts
           -> Merge + rank -> Cache result -> Return
     (hit)  -> Return cached timeline

Containers:
  [Client] -> [CDN] -> [LB] -> [API Gateway]
     -> [Upload Service | Feed Service | User Service | Explore Service]
     -> [Kafka] [Redis] [Cassandra] [PostgreSQL] [S3/Haystack]
\`

## 10. Real Production Incident

**Incident**: "The Viral Photo That Broke the CDN." A world-famous athlete's first post received 10M+ views in the first hour. CDN origin shield collapsed under miss traffic, causing 503 errors for 15% of users.

**Root Cause**: Global origin shield (single point) was overwhelmed by 200K concurrent misses. S3 throttled the origin shield's prefix. Retry logic amplified the load.

**Solution**: (1) Multi-tier regional origin shields. (2) Cache warming API for predicted viral content. (3) Stale-while-revalidate (serve stale for 5min while async refreshing). (4) Thumbnail-first loading. (5) S3 prefix optimization.

**Impact**: Next viral event served 50M views with 99.99% CDN hit rate and zero origin errors.

## 11. Production Implementation

\`	ypescript
class UploadService {
  async initiateUpload(userId: string, fileName: string, fileSize: number, mimeType: string) {
    const uploadId = crypto.randomUUID();
    const chunkSize = 1024 * 1024;
    const totalChunks = Math.ceil(fileSize / chunkSize);
    await this.storage.createUploadSession(uploadId, userId, fileName, totalChunks);
    return { uploadId, chunkSize, totalChunks };
  }

  async uploadChunk(uploadId: string, chunkIndex: number, data: Buffer): Promise<void> {
    await this.storage.storeChunk(uploadId, chunkIndex, data);
  }

  async completeUpload(uploadId: string, metadata: { caption?: string; hashtags?: string[] }) {
    const mediaId = crypto.randomUUID();
    await this.eventBus.publish('media.uploaded', { mediaId, uploadId, userId: metadata.userId,
      caption: metadata.caption, hashtags: metadata.hashtags, timestamp: Date.now() });
    return { mediaId, status: 'processing' };
  }
}

class ImageProcessor {
  private readonly VARIANTS = [
    { name: 'thumbnail', width: 150, height: 150 },
    { name: 'standard', width: 640, height: 640 },
    { name: 'full', width: 1080, height: 1080 },
  ];

  async process(job: ProcessingJob): Promise<void> {
    const original = await sharp(await this.storage.downloadTemp(job.uploadId));
    for (const variant of this.VARIANTS) {
      for (const format of ['webp', 'jpeg']) {
        const output = await original
          .resize(variant.width, variant.height, { fit: 'cover' })
          .toFormat(format as any, { quality: format === 'webp' ? 80 : 85 })
          .toBuffer();
        await this.storage.upload(photos///., output);
      }
    }
  }
}

class FanOutService {
  private readonly FOLLOWER_LIMIT = 10000;

  async fanOut(mediaId: string, userId: string, timestamp: number): Promise<void> {
    const followerCount = await this.userService.getFollowerCount(userId);
    if (followerCount <= this.FOLLOWER_LIMIT) {
      const followers = await this.userService.getFollowers(userId);
      const pipeline = this.redis.pipeline();
      for (const fid of followers) {
        pipeline.lpush(eed:, JSON.stringify({ mediaId, userId, timestamp }));
        pipeline.ltrim(eed:, 0, 499);
      }
      await pipeline.exec();
    } else {
      await this.redis.zadd(celebrity_posts:, timestamp, mediaId);
      await this.redis.expire(celebrity_posts:, 86400);
    }
  }
}
\`

## 12. Real Company Deep Dives

**Instagram (Meta)** : 1B+ MAU, 100M+ photos/day. Haystack storage with needle-in-haystack approach. Hybrid fan-out feed. Explore page uses DNN for recommendations. Stories have separate TTL-based pipeline.

**Pinterest**: 450M+ MAU, 250B+ pins. AWS infrastructure. PinSage (graph neural network) for visual discovery recommendations. libvips for fast thumbnail generation. Elasticsearch for search.

**Flickr**: Early pioneer (2004), 2B+ photos hosted. AWS S3 + CloudFront. Declined after Instagram's rise but remains relevant for professional photography and Creative Commons content.

**VSCO**: Editing tools + community. No public engagement metrics. Focus on creative expression and artistry over virality.

## 13. Interview Playbook

**Q1: Design Instagram's photo upload pipeline.** *Framework*: Client chunked upload → validation → Kafka event → Image processor (resize, format convert, EXIF strip) → CDN origin storage → moderation → metadata DB → fan-out to followers.

**Q2: How would you design the feed for 100M+ users?** *Framework*: Hybrid fan-out — push for <10K followers (Redis LPUSH), pull for celebrities (merge at read time). Cache last 500 posts per user. Ranking pipeline for algorithmic feed.

**Q3: How does Instagram store 100B+ photos efficiently?** *Framework*: Haystack — photos stored as needles in haystack files. Metadata in memory. One disk seek per retrieval. SSD cache for hot photos. Cold storage for old content.

**Q4: Design Instagram's Explore page.** *Framework*: Two-stage — (1) candidate generation from similar users, trending hashtags, geo-popular content, (2) DNN scoring with recency, engagement velocity, diversity penalty.

## 14. Concept Check Quiz

1. What is the primary advantage of Haystack over general object storage? — b) One-disk-seek reads with minimal metadata overhead ✓
2. In the hybrid feed model, when is pull preferred over push? — b) For celebrity users with millions of followers ✓
3. True or False: AVIF provides better compression than JPEG with lower browser compatibility. — True
4. What prevents a cache stampede when a popular feed cache expires? — b) Stale-while-revalidate with jittered TTLs ✓
5. Which component converts uploaded photos into multiple resolutions? — b) Image Processor ✓

## 15. Next Steps

- **CDN Architecture**: Edge caching, origin shield, cache invalidation, pre-warming strategies.
- **Image Processing Pipelines**: libvips, sharp, GPU-accelerated encoding for high throughput.
- **Feed Ranking Algorithms**: Collaborative filtering, two-tower neural networks, online learning.
- **Video Short-Form (Reels)** : Extend for short video — HLS/DASH transcoding, ABR, TikTok-style recommendation.
- **Content Moderation**: ML-based NSFW detection, hate speech classification, SimHash dedup.
- **Next Lesson**: Design Dropbox / Google Drive (File Storage).`,
    estimatedMin: 18,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Instagram", "Pinterest", "Flickr", "VSCO", "500px"],
    tags: ["photo-sharing", "image-upload", "cdn", "thumbnail", "instagram"],
  },

  {
    id: "lesson-08-07",
    slug: "system-design-interviews-07-design-dropbox-google-drive",
    title: "Design Dropbox / Google Drive (File Storage)",
    content: `## 0. Mental Model

Think of cloud file storage like a **warehouse with a secure file room**. You put a document in a labeled box (file). The warehouse fingerprints every page (block hashing). If you change one page, only the new page is stored (delta sync). If your friend needs the document, they get a key — no copy needed. If two people edit simultaneously, the warehouse keeps both versions (conflict resolution). If your computer crashes, the warehouse has your files safe.

## 1. Quick Summary

A **cloud file storage system** (Dropbox, Google Drive) lets users store, sync, and share files across devices. Core challenges: **file synchronization** (detect changes, upload only deltas), **block-level deduplication** (store a block once even if referenced by many files), **conflict resolution** (handle concurrent edits), **version history** (efficient incremental snapshots), **LAN sync** (P2P transfer within local network), and **cross-platform support**. At Dropbox scale (700M+ users, 1B+ files/day), the architecture uses **S3** for block storage, a **custom block server** for chunk management, **PostgreSQL** shards for metadata, **Redis** for caching, and a **C++ sync engine** with rolling checksums for block-level diffs.

## 2. Definition & Terminology

**Block-Level Dedup**: File split into fixed-size blocks (e.g., 4MB). Each block identified by SHA-256 hash. Identical blocks across files stored once.

**Delta Sync**: Upload only changed blocks instead of the entire file. Reduces bandwidth by 95%+ for typical document edits.

**Conflict Resolution**: When two users edit simultaneously, first to sync wins; loser gets a conflicted copy.

**Version History**: Sequence of snapshots storing only changed blocks between versions. Storage-efficient.

**LAN Sync**: Direct P2P transfer between devices on the same LAN. Faster than cloud transfer. Reduces server bandwidth costs.

**Smart Sync**: Show file metadata without downloading full content. Full file downloaded on first access.

**Rolling Checksum**: rsync-style sliding window checksum to detect changed regions in large files with non-aligned edits.

## 3. The Problem Without It

**Manual Sync Is Unreliable**: Users email files, carry USB drives, maintain manual copies. Files get out of sync across devices.

**Full-File Upload Waste**: Every small edit re-uploads the entire file. A 100MB presentation edited 10 times = 1GB upload instead of 100KB delta.

**Storage Bloat Without Dedup**: 100 users sharing the same 100MB installer = 10GB stored. With dedup: ~100MB.

**No Version History**: No recovery from accidental edits or deletions. No "undo" for file operations.

**Conflicting Edits Cause Data Loss**: Last sync overwrites previous changes. Without conflict detection, work is lost.

**Network Wasted**: All transfers go through central server even when devices are on the same LAN.

## 4. How It Works — Core Mechanics

**File Sync Lifecycle**: (1) **Change Detection** — File system watcher (FSEvents/inotify/ReadDirectoryChangesW) detects file events. (2) **Debouncing** — coalesce events over 500ms-1s to avoid reacting to temporary saves. (3) **Classification** — new (hash + split + upload all), modified (compute delta), deleted (mark + decrement refcounts). (4) **Block Delta** — split file into 4MB blocks, hash each (SHA-256), compare with server's block list, upload only new hashes. (5) **Upload** — parallel upload of compressed, encrypted blocks to Block Server. (6) **Server** — store in S3 with key locks/{hash[0:2]}/{hash[2:4]}/{hash}, increment refcount, update file version metadata. (7) **Notification** — push notification to other devices via Redis PubSub. (8) **Other Devices** — fetch new block list, download missing blocks (S3 signed URL or LAN sync), reassemble file.

**LAN Sync**: Device A broadcasts UDP beacon with block availability. Device B requests needed blocks. Direct TCP/QUIC connection transfers blocks P2P. Server notified but data doesn't traverse it.

**Conflict Resolution**: Optimistic concurrency — version number per file. First sync wins. Second sync creates conflicted copy: ilename (conflicted copy).ext. User manually merges.

## 5. Variants & Flavors

**Consumer Sync (Dropbox, iCloud Drive)** : Auto-sync of designated folder. Cross-platform. Version history (30-180 days). Selective/smart sync.

**Enterprise Sync (Box, Egnyte)** : Admin controls, audit logs, compliance (HIPAA, FedRAMP), SSO/SAML, granular sharing permissions.

**Real-Time Collaboration (Google Docs, Office 365)** : Structured documents with OT/CRDT for co-editing. File sync is secondary to real-time protocol.

**P2P Sync (Resilio Sync, Syncthing)** : No central server. Direct device-to-device sync. Privacy-focused. No web access, more complex setup.

**Backup-Focused (Backblaze, CrashPlan)** : Continuous backup, unlimited version history. Not sync — files backed up, restored via download/drive shipment.

## 6. Performance Characteristics

**Upload Latency**: Small file (<1MB): 1-3s end-to-end. Large file (1GB, 10% change): 10-20s (uploading ~100MB delta).

**Block Dedup Effectiveness**: Document editing: 95-99% reduction. Media editing: 30-60% reduction. Cross-file dedup: 2-5x storage savings.

**Throughput**: Block servers scale horizontally. Millions of files/day with S3 parallelization.

**Read Latency (Smart Sync)** : Metadata: <50ms. Full file download: depends on size and bandwidth.

**Concurrency**: Multiple devices syncing same file serialized by version. Optimistic concurrency with conflicted copy.

## 7. Failure Modes

**Partial Upload Failure**: 5 of 10 blocks uploaded, connection lost. Mitigation: version committed only after all blocks uploaded. Partial blocks garbage-collected after TTL.

**Offline Split-Brain**: Two devices modify same file offline. Both have version 5 with different content. Mitigation: first to sync wins, second gets conflicted copy.

**Block Corruption**: Corrupted block detected by SHA-256 mismatch. Mitigation: server rejects, client retries. End-to-end checksum verification.

**Metadata DB Corruption**: PostgreSQL shard corruption. Mitigation: regular backups, PITR, automated failover.

**S3 Throttling**: Excessive requests to a single prefix. Mitigation: prefix distribution via {hash[0:2]}/{hash[2:4]}/{hash}.

**Sync Conflict Storm**: 100 users receive update simultaneously. Mitigation: staggered notifications, exponential backoff for downloads, CDN for blocks.

## 8. Decision Framework

**Block Size**: Fixed 4MB (simple, good for large files). Variable/rolling checksum (complex, handles non-aligned edits). Hybrid: fixed for <10MB, rolling for larger.

**Storage Backend**: S3 (managed, 11-9s durability). Ceph/MinIO (self-hosted, lower cost at extreme scale). GCS/Azure Blob (alternatives).

**Conflict Resolution**: Last-writer-wins (simplest). Conflicted copy (safe default). OT/CRDTs (real-time co-editing, high complexity).

**Sync Engine Language**: C++/Rust (max performance, minimal resources). Python/Go (faster development). Electron (cross-platform, high memory).

## 9. Live Architecture Diagram

\`
Sync Flow:
  Desktop Client -> File Watcher (FSEvents/inotify)
     -> Debounce (500ms) -> Block Diff (split + hash)
     -> Upload changed blocks (parallel, compressed, encrypted)
     -> Block Server -> S3 (dedup via refcounting)
     -> File Service -> PostgreSQL (metadata)
     -> Sync Service -> Redis PubSub (notify other devices)
     -> Other clients download blocks (S3 or LAN sync) -> Reassemble

Containers:
  [Desktop/Mobile/Web Client] -> [API Gateway]
     -> [File Service | Block Service | Sync Service | Share Service]
     -> [PostgreSQL] [Redis] [S3 Blocks] [CDN]
\`

## 10. Real Production Incident

**Incident**: "The Infinite Sync Loop" — 5% of desktop clients entered an infinite sync loop. Client uploaded metadata change, detected it as a new change, re-uploaded, looped forever. 100% CPU usage, rapid battery drain.

**Root Cause**: A third-party antivirus modified file metadata (NTFS alternate data streams, timestamps) immediately after the sync client wrote the file. The client saw this as a user change and re-synced.

**Solution**: (1) Change attribution — distinguish user-originated vs system-originated changes (process name, keyboard/mouse activity). (2) Metadata-only debounce — ignore metadata changes if content hash hasn't changed within 30s. (3) Antivirus compatibility mode. (4) Sync loop detection — pause if same file syncs >3 times in 5 minutes without user input.

**Impact**: 99.7% reduction in infinite sync loops.

## 11. Production Implementation

\`	ypescript
class FileWatcher {
  private watcher = chokidar.watch('/sync/folder', {
    ignored: /(^|[\\/\\\\])\\../, ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  constructor(private syncEngine: SyncEngine) {
    this.watcher.on('add', p => this.enqueue({ type: 'created', path: p }));
    this.watcher.on('change', p => this.enqueue({ type: 'modified', path: p }));
    this.watcher.on('unlink', p => this.enqueue({ type: 'deleted', path: p }));
  }

  private queue: FileChange[] = [];
  private enqueue(change: FileChange) {
    const existing = this.queue.find(c => c.path === change.path);
    if (existing) { existing.type = change.type; return; }
    this.queue.push(change);
    setTimeout(() => this.flush(), 1000);
  }

  private async flush() {
    const batch = this.queue.splice(0);
    for (const c of batch) await this.syncEngine.processChange(c);
  }
}

class BlockDiffEngine {
  private BLOCK_SIZE = 4 * 1024 * 1024;

  async computeBlockHashes(filePath: string): Promise<BlockHash[]> {
    const fd = await fs.open(filePath, 'r');
    const hashes: BlockHash[] = [];
    let offset = 0, index = 0;
    while (true) {
      const buf = Buffer.alloc(this.BLOCK_SIZE);
      const { bytesRead } = await fd.read(buf, 0, this.BLOCK_SIZE, offset);
      if (bytesRead === 0) break;
      hashes.push({ index, hash: crypto.createHash('sha256').update(buf.subarray(0, bytesRead)).digest('hex'), offset, size: bytesRead });
      offset += bytesRead; index++;
    }
    await fd.close();
    return hashes;
  }

  findChangedBlocks(local: BlockHash[], remote: BlockHash[]): BlockHash[] {
    const remoteMap = new Map(remote.map(b => [b.hash, b]));
    return local.filter(b => !remoteMap.has(b.hash));
  }
}

class FileVersionService {
  async commitVersion(commit: VersionCommit): Promise<number> {
    const newVersion = commit.parentVersion + 1;
    await this.db.transaction(async (tx) => {
      await tx.query(INSERT INTO file_versions (file_id, version, block_hashes, size, created_by, created_at)
        VALUES (, , , , , NOW()),
        [commit.fileId, newVersion, JSON.stringify(commit.blockHashes), commit.size, commit.userId]);
      await tx.query(UPDATE files SET current_version = , size = , updated_at = NOW() WHERE file_id = ,
        [newVersion, commit.size, commit.fileId]);
    });
    await this.syncNotifier.notifyDevices(commit.userId, { type: 'file_updated', fileId: commit.fileId, version: newVersion });
    return newVersion;
  }
}
\`

## 12. Real Company Deep Dives

**Dropbox**: 700M+ users. S3 for blocks, custom Block Server for dedup/encryption/refcounting. C++ sync engine with Python higher-level logic. Migrated to self-hosted Ceph (Magic Pocket) at exabyte scale. LAN sync via mDNS + TCP.

**Google Drive**: 1B+ users. GCS storage. Google Docs OT for real-time collaboration. Desktop client is Chrome App / File Stream. No block-level dedup — simpler architecture, less efficient for large files.

**OneDrive**: 250M+ users. Azure Blob Storage. Files On-Demand integrated into Windows via Cloud Files API. CBlobSync sync engine.

**iCloud Drive**: 850M+ users. CloudKit + AWS + GCS. Integrated into macOS Finder via NSFileProvider. APFS-native.

**Box**: Enterprise (100K+ businesses). AWS storage. Box Shield security. Box Relay workflow automation. Strong compliance features.

## 13. Interview Playbook

**Q1: How does Dropbox achieve block-level dedup and delta sync?** *Framework*: Split files into 4MB blocks, SHA-256 hash each, compare with server block list on sync, upload only new blocks. Refcounting for lifecycle. Delta sync reduces bandwidth 95%+.

**Q2: Design the sync algorithm for 10M+ users.** *Framework*: Change detection → debounce → classify → block diff → upload changed blocks (parallel) → cross-device notification. Conflict handling: version-based, last-writer-wins + conflicted copy.

**Q3: How do you handle conflict resolution?** *Framework*: Version numbers. First to sync wins. Second detects version conflict → creates conflicted copy. User manually merges. For real-time: OT/CRDTs.

**Q4: Design the version history system.** *Framework*: Store block hash list per version. Shared blocks via refcounting. Retention: all versions 30 days, weekly snapshots 180 days (free). Cleanup removes unreferenced blocks.

**Q5: How does LAN sync work?** *Framework*: UDP beacon broadcast → device discovery → direct TCP/QUIC transfer → server notification. Faster, reduces cloud bandwidth.

## 14. Concept Check Quiz

1. Primary benefit of block-level dedup? — b) Storing identical blocks once across files and versions ✓
2. Default conflict resolution for offline edits? — a) First to sync wins, conflicted copy for the other ✓
3. True or False: Delta sync uploads only changed portions. — True
4. LAN sync peer discovery protocol? — b) mDNS ✓
5. What does a refcount track? — b) How many files/versions reference a block, enabling deletion when unreferenced ✓
6. What is a Smart Sync placeholder? — b) File with metadata but no content, populated on first access ✓

## 15. Next Steps

- **Sync Engine Performance**: File system monitoring optimization, rolling checksum block diff, parallel upload strategies.
- **CRDTs**: Automatic conflict resolution without conflicted copies for collaborative editing.
- **Object Storage Internals**: S3 architecture, Ceph CRUSH, erasure coding vs replication at exabyte scale.
- **Encryption**: Client-side envelope model, key management, zero-knowledge architectures.
- **Next Lesson**: Design Amazon / E-Commerce Platform.`,
    estimatedMin: 20,
    difficulty: "ADVANCED" as const,
    companies: ["Dropbox", "Google Drive", "OneDrive", "Box", "iCloud"],
    tags: ["file-storage", "dropbox", "sync", "versioning", "block-storage", "deduplication"],
  },

  {
    id: "lesson-08-08",
    slug: "system-design-interviews-08-design-ecommerce-platform",
    title: "Design Amazon / E-Commerce Platform",
    content: `## 0. Mental Model

Imagine the **world's largest shopping mall** with infinite aisles (catalog), millions of shoppers, thousands of checkout counters, and a massive warehouse out back (fulfillment). The mall needs a directory (search), a shopping cart that follows each shopper (session), cashiers processing payments, stock clerks tracking every item (inventory), recommendation agents suggesting what you might like, and shipping clerks packing orders. Scale this to 300M+ concurrent shoppers — every counter works instantly, no cart is ever lost, and every item's inventory is accurate to the second.

## 1. Quick Summary

An **e-commerce platform** (Amazon) manages a **product catalog** (400M+ products), **search** with faceted filters, **shopping cart** (never lose items), **checkout** (address, payment, order review), **payment orchestration** (cards, wallets, BNPL), **inventory** across 1,000+ warehouses, **fulfillment** (pick, pack, ship), **recommendations**, **seller marketplace**, **reviews**, **fraud detection**, and **customer service**. At Amazon's scale (300M+ customers, 1.5M+ shipments/day), the architecture is microservices on AWS: **DynamoDB** for cart/session, **Elasticsearch** for search, **Aurora** for orders, **SQS** for async processing. Checkout must achieve 99.99% availability and survive Prime Day's 10x spike (10M+ orders/hour).

## 2. Definition & Terminology

**Product Catalog**: Structured DB of 400M+ products with titles, descriptions, prices, images, variants, categories, brands.

**Search Index**: Elasticsearch inverted index enabling full-text search with faceted navigation (brand, price, rating, category).

**Shopping Cart**: Durable session-scoped store of items to purchase. Survives browser crashes, device switches, session expiry.

**Checkout Flow**: Cart review → shipping address → shipping method → payment → order review → place order.

**Order Lifecycle**: Pending → Confirmed → Captured → Fulfillment Assigned → Picked → Packed → Shipped → Delivered → (Returned).

**FBA (Fulfillment by Amazon)** : Sellers send inventory to Amazon warehouses. Amazon handles storage, packing, shipping, customer service.

**Marketplace**: Third-party sellers list products. Amazon provides storefront, payments, optional fulfillment.

## 3. The Problem Without It

**Catalog Chaos**: Products have wildly different attributes (clothing: size/color; electronics: specs). A single relational schema can't handle all types. Without flexible documents, catalog is unmanageable.

**Search Failure**: SELECT * FROM products WHERE title LIKE '%query%' takes minutes for 400M products. Need inverted indexes, relevance scoring, faceted aggregation.

**Cart Data Loss**: In-memory cart on a web server is lost on crash. Must be durable (DynamoDB with replication).

**Checkout Race Conditions**: Two customers buying the last item both succeed without atomic inventory reservation. Oversell disaster.

**Inventory Inconsistency**: 1000+ warehouses, 100M+ SKUs. Without real-time distributed inventory, customers order out-of-stock items.

**Payment Errors**: Charge succeeds but order creation fails (or vice versa). Payment orchestration needs idempotency, retries, reconciliation.

## 4. How It Works — Core Mechanics

**Catalog Service**: Each product stored as JSON document in DynamoDB with nested variants and attributes. Category tree (Electronics > Laptops > Gaming). Each category has own attribute schema.

**Search Service**: Elasticsearch indexes title (boosted 10x), brand (boosted 5x), description, category, price, rating. Faceted aggregations. BM25 ranking combined with popularity, rating, recency.

**Shopping Cart**: DynamoDB with PK=customerId, items array. Price lock on checkout. Merge anonymous cart on login. TTL-based expiry (30 days).

**Checkout** (critical path): (1) Cart review + price lock + inventory check. (2) Shipping address (validation, normalization). (3) Shipping method (standard, expedited, same-day). (4) Payment selection (tokenized via PCI-compliant gateway). (5) Order review. (6) Place order — atomic sequence: create order (pending) → inventory reservation (atomic decrement) → payment authorization (hold) → fraud check → order confirmation (confirmed) → SQS fulfillment trigger.

**Fulfillment**: SQS message → warehouse assignment → pick list → packing → carrier label → shipping → tracking.

**Recommendations**: Multi-model ensemble — item-to-item CF ("customers who bought this also bought"), content-based (category/brand affinity), personalized DNN ranking, exploration (epsilon-greedy for cold items).

## 5. Variants & Flavors

**General Marketplace (Amazon, eBay)** : Millions of products, thousands of sellers. Complex catalog, seller management, commissions, dispute resolution.

**Single-Seller (Shopify store, Nike.com)** : One brand, one catalog. Simpler inventory and fulfillment. Focus on brand experience.

**Flash Sale (Gilt, Zulily)** : Time-limited, limited inventory. High traffic spikes. Real-time inventory decrement. Waitlist patterns.

**Subscription (HelloFresh, Dollar Shave Club)** : Recurring orders. Subscription management, billing cycles, shipment scheduling.

**Digital Goods (Steam, App Store)** : No physical inventory. Instant delivery. Licensing, regional pricing, returns.

**Grocery (Amazon Fresh, Instacart)** : Perishable inventory, temperature-controlled fulfillment, time-slot delivery, substitution management.

**Enterprise B2B (Amazon Business)** : Bulk pricing, purchase orders, approval workflows, tax-exempt purchasing.

## 6. Performance Characteristics

**Read-to-Write Ratio**: 95% reads, 5% writes. Browse and search dominate traffic.

**Search Latency**: <200ms required. Elasticsearch achieves <50ms P99 with caching.

**Checkout Throughput**: Prime Day peak: 10M orders/hour = ~2,800 orders/sec. Each involves 10+ service calls.

**Cart Durability**: Millions of write requests/sec with DynamoDB auto-scaling. Single-digit ms reads.

**Catalog Caching**: >95% CDN + application cache hit rate for popular products. Invalidation via SNS on price/availability changes.

**Inventory Updates**: 10K+ updates/second from fulfillment centers. Strong consistency for hot items, eventual for long-tail.

## 7. Failure Modes

**Cart Loss**: DynamoDB partition failure deletes cart items. Mitigation: DAX caching, cross-region replication, weekly S3 exports.

**Inventory Oversell**: Two concurrent orders reserve last unit. Mitigation: atomic optimistic locking (UPDATE ... WHERE quantity >= 1 AND version = ?), retry on conflict.

**Payment Double Charge**: Authorization succeeds, order creation fails, customer retries. Mitigation: idempotency key per order, reconciliation job.

**Search Degradation**: Elasticsearch cluster yellow/red during spike. Mitigation: SQL fallback, circuit breaker, aggressive result caching.

**Checkout Timeout**: Slow downstream causes full checkout timeout. Mitigation: aggressive per-service timeouts, state machine with async steps.

## 8. Decision Framework

**Catalog Schema**: Document store (DynamoDB/MongoDB) for flexible schemas. EAV for relational. Hybrid: DynamoDB for metadata, Elasticsearch for search, S3 for images.

**Search Engine**: Elasticsearch (industry standard, rich query DSL, faceted aggregation). Algolia (managed, faster setup, higher cost at scale).

**Cart Storage**: DynamoDB (durable, serverless, auto-scaling). Redis (faster, data loss risk). LocalStorage (client-only, lost on browser clear).

**Payment**: Stripe (simple, built-in idempotency). Adyen (enterprise, 250+ methods). Amazon Pay (higher conversion for Amazon users).

**Fulfillment**: Self-fulfillment (simplest). FBA (faster delivery). Hybrid (popular items in FBA, long-tail seller-fulfilled).

## 9. Live Architecture Diagram

\`
Checkout Sequence:
  Cart Review -> Address Service -> Shipping Method
     -> Payment Authorization (hold)
     -> Order Service: Create Order (pending)
     -> Inventory Service: Reserve Items (atomic optimistic lock)
     -> Fraud Detection: Score Transaction
     -> Payment Capture (charge)
     -> Fulfillment Service: Assign Warehouse
     -> SNS: Order Confirmation
     -> Async: Pick -> Pack -> Ship -> Track -> Deliver

Containers:
  [Customer] -> [CloudFront] -> [LB] -> [API Gateway]
     -> [Catalog | Search | Cart | Order | Payment | Inventory | Recommend]
     -> [DynamoDB] [Elasticsearch] [Aurora MySQL] [SQS] [Kinesis]
\`

## 10. Real Production Incident

**Incident**: "Prime Day Checkout Collapse" — 5x normal traffic caused order service slowdown. Aurora MySQL connection pool exhausted. Checkout latency rose from 200ms to 30s. 12% of checkouts failed.

**Root Cause**: Inventory reservation used SELECT ... FOR UPDATE causing row-level blocking on flash-sale SKUs. Connections queued for locks, exhausting the 200-connection pool. Retry logic amplified failures.

**Solution**: (1) Pre-allocated inventory buffer for flash sales. (2) Optimistic locking replaced row-level locks: UPDATE SET qty=qty-1, ver=ver+1 WHERE sku=? AND ver=? AND qty>=1. Cut reservation time from 5s to 15ms. (3) Randomized SKU key prefixes for partition distribution. (4) Circuit breaker at 10% error rate. (5) Pool increased to 1000 with 100ms connection timeout.

**Impact**: Next Prime Day handled 10M+ orders in first hour with zero checkout timeouts.

## 11. Production Implementation

\`	ypescript
class CartService {
  async addItem(customerId: string, productId: string, variantId: string, quantity: number) {
    await this.ddb.updateItem({
      TableName: 'shopping-carts',
      Key: { customerId: { S: customerId }, cartId: { S: cart# } },
      UpdateExpression: 'SET #items = list_append(if_not_exists(#items, :empty), :item)',
      ExpressionAttributeValues: {
        ':item': { L: [{ M: { productId: { S: productId }, variantId: { S: variantId },
          quantity: { N: String(quantity) }, addedAt: { N: String(Date.now()) }, priceLocked: { BOOL: false } } }] },
        ':empty': { L: [] },
      },
    });
  }
}

class InventoryService {
  async reserve(sku: string, warehouseId: string, quantity: number, idempotencyKey: string): Promise<boolean> {
    if (await this.checkIdempotency(idempotencyKey)) return true;
    for (let attempt = 0; attempt < 3; attempt++) {
      const item = await this.ddb.getItem({ TableName: 'inventory',
        Key: { sku: { S: sku }, warehouseId: { S: warehouseId } } });
      const currentQty = parseInt(item.Item!.quantity.N!);
      const version = parseInt(item.Item!.version.N!);
      if (currentQty < quantity) return false;
      try {
        await this.ddb.updateItem({
          TableName: 'inventory',
          Key: { sku: { S: sku }, warehouseId: { S: warehouseId } },
          UpdateExpression: 'SET quantity = quantity - :qty, version = version + :one',
          ConditionExpression: 'version = :ver AND quantity >= :qty',
          ExpressionAttributeValues: { ':qty': { N: String(quantity) }, ':one': { N: '1' }, ':ver': { N: String(version) } },
        });
        await this.recordIdempotency(idempotencyKey);
        return true;
      } catch { /* version conflict, retry */ }
    }
    return false;
  }
}

class CheckoutOrchestrator {
  async placeOrder(checkoutId: string, customerId: string, paymentMethodId: string, shippingAddressId: string) {
    const idempotencyKey = checkout:;
    const cart = await this.cartService.getCart(customerId);
    await this.cartService.lockPrices(customerId);
    const totals = await this.calculateTotals(cart, shippingAddressId);
    for (const item of cart.items) {
      if (!await this.inventoryService.reserve(item.variantId, this.pickWarehouse(item), item.quantity, \${idempotencyKey}:))
        throw new Error(Insufficient inventory for );
    }
    const paymentAuth = await this.paymentService.authorize(customerId, paymentMethodId, totals.total, idempotencyKey);
    const fraudScore = await this.fraudService.score({ customerId, cart, totals });
    if (fraudScore > 0.9) throw new Error('Transaction declined');
    const order = await this.orderService.createOrder({ customerId, items: cart.items, totals, shippingAddressId, paymentAuthId: paymentAuth.id });
    this.paymentService.capture(paymentAuth.id, idempotencyKey).catch(err => this.initiateRefund(order.id));
    await this.fulfillmentService.assignToWarehouse(order.id);
    return { orderId: order.id, status: 'confirmed', estimatedDelivery: order.estimatedDelivery };
  }
}
\`

## 12. Real Company Deep Dives

**Amazon**: 300M+ customers, 400M+ products. 1,000+ microservices on AWS. DynamoDB for cart/session/inventory. Aurora MySQL for orders. Elasticsearch for search (500+ nodes). SQS for async fulfillment. Kinesis for clickstream analytics. SageMaker for recommendations. FBA handles 50%+ of units.

**Walmart**: 120M+ monthly visitors. OpenStack-based Walmart Cloud. Kafka for event streaming. Redis for session cache. Data lake on GCP.

**Shopify**: 2M+ merchants. Rails monolith → microservices. Kafka, Elasticsearch, Redis, GraphQL API. Shopify Functions for custom checkout logic.

**eBay**: 130M+ buyers. Java stack. Hadoop for analytics. Espresso (in-house NoSQL). Kafka, Elasticsearch.

**Alibaba**: 800M+ consumers. Double 11: 500K+ orders/sec peak. OceanBase (distributed SQL), Tair (cache), RocketMQ, Flink for streaming.

## 13. Interview Playbook

**Q1: Design product search with faceted filtering for 100M+ products.** *Framework*: Elasticsearch with boosted title, brand. Faceted aggregations. Cache popular results. Personalize ranking by user history. Fuzzy search for misspellings.

**Q2: Design shopping cart for 10M+ concurrent users.** *Framework*: DynamoDB (PK: customerId). Items as list. Price lock on checkout. Merge anonymous cart on login. TTL expiry (30 days). DAX for hot carts.

**Q3: Design checkout flow.** *Framework*: Synchronous path: cart → address → payment → inventory reserve → order create. Async: fulfillment queue → warehouse → pick → pack → ship. Idempotency keys per step. Compensating transactions for failures.

**Q4: Handle Prime Day traffic spikes.** *Framework*: Auto-scaling. CDN + cache for reads. Circuit breakers for writes. SQS buffer. Pre-allocated flash-sale inventory. Chaos engineering validation.

## 14. Concept Check Quiz

1. Amazon cart's primary database? — b) DynamoDB ✓
2. Idempotency key purpose in checkout? — b) Ensure request processed only once ✓
3. True or False: Inventory should use SELECT FOR UPDATE. — False. Optimistic locking prevents row-level blocking.
4. Item-to-item CF? — b) "Customers who bought this also bought" ✓
5. What does FBA stand for? — b) Fulfillment by Amazon ✓
6. Service for async decoupling of order placement and fulfillment? — b) SQS ✓

## 15. Next Steps

- **Search Relevance**: BM25, learning-to-rank, semantic search with embeddings, personalization.
- **Checkout Optimization**: One-click checkout, saved payments, address autocomplete, guest checkout.
- **Fraud Detection**: Real-time ML scoring, device fingerprinting, anomaly detection, chargeback management.
- **Supply Chain**: Demand forecasting, inventory planning, vendor management, last-mile optimization.
- **Next Lesson**: Design Web Crawler / Search Engine.`,
    estimatedMin: 24,
    difficulty: "ADVANCED" as const,
    companies: ["Amazon", "eBay", "Walmart", "Shopify", "Alibaba"],
    tags: ["ecommerce", "amazon", "product-catalog", "inventory", "checkout", "scalability"],
  },

  {
    id: "lesson-08-09",
    slug: "system-design-interviews-09-design-web-crawler-search-engine",
    title: "Design Web Crawler / Search Engine",
    content: `## 0. Mental Model

Picture a **giant library with every book on the internet**. Your job: discover every book (URL), create a catalog card for each (index), organize cards so you can find any book by topic (inverted index), and help visitors find the most relevant books (ranking). The library has 100B+ books, and new books arrive every second. You need thousands of librarians (crawlers) working in parallel, waiting politely at each bookshelf (politeness), recognizing duplicate books (deduplication), and updating cards when books change (freshness).

## 1. Quick Summary

A **web search engine** (Google, Bing) discovers, downloads, indexes, and serves web pages. The system has three pipelines: **Crawling** (discover URLs, download HTML respecting robots.txt and politeness), **Indexing** (parse HTML, build inverted index mapping terms to document IDs), and **Query Serving** (tokenize query, look up index, rank results using BM25, PageRank, freshness, return top 10 in <200ms). At Google's scale (100B+ pages indexed, 3.5B+ searches/day), infrastructure spans millions of servers running **GFS** for raw storage, **Bigtable** for page metadata, **MapReduce/Flume** for index building, and **PageRank** for link-based authority.

## 2. Definition & Terminology

**Crawler (Spider)** : Program that downloads web pages recursively. Starts from seed URLs, fetches pages, extracts links, adds new URLs to frontier.

**URL Frontier**: Prioritized queue of URLs to crawl. Prioritizes by PageRank, update frequency, domain authority.

**Politeness**: Crawler must not overload servers. Enforced by per-domain delay (e.g., 1 req/2s).

**Inverted Index**: Maps each term to a list of (docId, frequency, positions). Enables fast full-text search.

**PageRank**: Link analysis algorithm measuring page importance based on quantity and quality of inbound links.

**BM25**: Standard ranking function — improved TF-IDF with length normalization and saturation.

**SERP**: Search Engine Results Page — ranked results with titles, snippets, URLs.

## 3. The Problem Without It

**No Discovery**: Web has 100B+ pages with no central registry. Without crawling links, search engines only know submitted URLs.

**Impractical Full-Text Search**: SELECT * FROM pages WHERE content LIKE '%query%' over 100B pages takes years. Inverted index is essential.

**Spam Without Link Analysis**: Content farms dominate via keyword stuffing. PageRank uses the web's link graph as a democratic quality signal.

**Stale Results Without Re-Crawling**: News updates every minute. Without freshness-aware crawling, results become stale within hours.

**Duplicate Content Pollution**: 30%+ of web is duplicate (mirrors, syndication). Without SimHash dedup, index fills with copies.

**Slow Queries Without Sharding**: A single inverted index for 100B pages is petabytes. Must be sharded across thousands of machines.

## 4. How It Works — Core Mechanics

**Crawling Pipeline**: (1) Seed URLs from sitemaps, previous crawls, domain registries. (2) URL Frontier — distributed priority queue with politeness enforcement (2s delay per domain). (3) DNS Resolution — batch lookups (100+ URLs at once), 24-48h cache. (4) Fetch — HTTP GET with configurable user-agent, 10s timeout, redirect handling, robots.txt compliance. (5) Parse — extract title, meta description, canonical URL, all links, language, encoding. (6) Dedup — SimHash fingerprint, Hamming distance threshold for near-duplicate detection. (7) Link Extraction — normalize URLs, apply filters (spam domains, infinite URL patterns), add to frontier with computed priority.

**Indexing Pipeline**: (1) Tokenizer — split text into tokens, handle hyphenation, Unicode, language-specific rules (Chinese segmentation, German compound splitting). (2) Stemming — reduce words to root (Porter stemmer), stop word removal. (3) Inverted Index Construction — for each term, posting list [(docId, freq, positions[3,17,42])]. Compressed via delta encoding and variable-byte encoding. (4) Index Sharding — term-based (each shard has subset of terms) or document-based (each shard has subset of docs).

**Query Serving**: (1) Parse — tokenize, spell-check, synonym expansion, entity detection, intent classification. (2) Index Lookup — retrieve posting lists for query terms, merge (AND/OR). (3) Scoring — BM25 × PageRank × Freshness boost × Personalization × CTR. (4) Top N — return top 10 with snippets (relevant text around query terms). (5) SERP rendering.

## 5. Variants & Flavors

**General Web Search (Google, Bing)** : Crawl entire web (100B+ pages). All content types, languages, query intents. Highest complexity.

**Vertical Search (Kayak, Zillow, Indeed)** : Specific domain (travel, real estate, jobs). Structured data extraction. Lower scale, higher precision.

**News Search (Google News)** : High-frequency crawling (1-5 min). Freshness primary ranking signal. Breaking news categorization.

**Enterprise Search (Elasticsearch, Algolia)** : Internal documents, wikis, codebases. Authentication-aware. Millions vs billions scale.

**Academic Search (Google Scholar)** : Crawl papers, citations. Citation graph (analogous to PageRank). PDF parsing for references, figures.

**Archival Crawling (Internet Archive)** : Multiple snapshots per page over time. 750B+ pages preserved. Completeness over ranking.

## 6. Performance Characteristics

**Crawl Throughput**: 50-100 pages/sec per node. Google's 10K+ crawlers = 500K-1M pages/sec. 100B pages crawled in 2-4 weeks.

**Index Size**: 100B pages × 50KB text = 5PB raw. Inverted index ~10-20% = 500GB-1PB. Total index: 5-10PB across all shards.

**Query Latency**: <200ms average. Includes network, parsing, index lookup (dozens of shards), ranking, snippet generation.

**Indexing Throughput**: Flume processes petabytes/day. Incremental index every few minutes. Full rebuild every few months.

**Crawl Freshness**: High-importance (news, Wikipedia) — every few minutes. Medium (blogs, e-commerce) — every few days. Low (personal) — every few weeks.

**Dedup Effectiveness**: SimHash catches 95%+ of near-duplicates. Eliminates ~30% of crawled pages from index.

## 7. Failure Modes

**Crawler Trap**: Malicious site with infinite URL space (calendar pages). Mitigation: URL count limits per domain, max depth, pattern analysis.

**Crawl Feedback Loop**: Link farms exploit PageRank. Mitigation: damping factor (0.85), spam algorithms (Panda, Penguin), manual penalties.

**Index Corruption**: Hardware failure corrupts shard. Mitigation: replication (N=2/3), automatic rebalancing, checksum validation.

**Query Latency Spike**: Trending topic overloads one shard. Mitigation: dynamic rebalancing, request queuing, result caching for trending queries.

**Freshness Gap**: Breaking news not crawled for hours. Mitigation: real-time crawl API for publishers, social media signal-based prioritization.

**Data Center Outage**: Shards in affected DC become unavailable. Mitigation: cross-DC replication, automatic failover (seconds), N+1 capacity.

## 8. Decision Framework

**Crawl Strategy**: Breadth-first (wide discovery), depth-first (site completeness), prioritized (important pages first), incremental (freshness). Hybrid recommended.

**Freshness Policy**: Uniform (simple, wasteful). Importance-based (high PageRank more frequent). Change-frequency-based (HTTP If-Modified-Since/ETag). Hybrid (importance × change rate) — Google's approach.

**Indexing**: Incremental (fresh) + batch full rebuilds (quality). Hybrid delta index merging.

**Ranking**: BM25 (baseline). BM25 + PageRank + Freshness (standard). Learning to Rank (LambdaMART, ML from clicks). Neural ranking (BERT for semantic matching).

**Sharding**: Term-based (every query hits all shards, easier merging). Document-based (each query hits one shard, simpler scaling).

## 9. Live Architecture Diagram

\`
Crawling: URL Frontier -> Fetcher (HTTP GET, robots.txt)
   -> Parser (HTML, title, meta, links)
   -> Content Seen Test (SimHash dedup)
   -> Link Extractor -> URL Frontier

Indexing (MapReduce):
   Map: Read HTML -> Tokenize -> Emit (term, docId+pos)
   Shuffle: Group by term
   Reduce: Merge posting lists -> Write index shard

Serving: Query -> Parser -> Spell Check -> Index Lookup (parallel shards)
   -> Merge -> Score (BM25 × PageRank × Freshness) -> Top 10 + Snippet

Containers:
   [Crawler Fleet] -> [GFS (raw HTML)] -> [Index Builder (MapReduce)]
   -> [Index Shards (Bigtable/SST)] -> [Query Servers] -> [SERP]
\`

## 10. Real Production Incident

**Incident**: "The Freshness Update Algorithm Failure" (2011). Google's new freshness scoring had a bug in the temporal decay function. Instead of smooth decay, score for fresh pages dropped precipitously after exactly 24 hours, then spiked at 48 hours. Results fluctuated wildly — a page ranked #1, disappeared after 24h, reappeared at 48h.

**Impact**: 30% of queries affected. 10K+ webmaster complaints in 48 hours. News publisher traffic dropped 70%.

**Solution**: (1) Replaced step-function decay with smooth exponential: score = e^(-λ * hoursSincePublish). (2) Automated quality evaluation suite with 50K+ labeled queries. (3) Gradual rollout (1%->5%->25%->100%) with automated rollback if quality declined >2%. (4) Public explanation to webmasters.

**Lesson Learned**: Algorithm changes need automated quality eval, gradual rollout, and instant rollback. Temporal signals need careful mathematical formulation.

## 11. Production Implementation

\`	ypescript
class UrlFrontier {
  private readonly POLITENESS_DELAY_MS = 2000;
  private lastFetchTime = new Map<string, number>();

  async addUrl(url: string, priority: number) {
    const domain = new URL(url).hostname;
    await this.redis.zadd(rontier:, priority, JSON.stringify({ url, domain, priority, addedAt: Date.now() }));
  }

  async getNextUrl() {
    const now = Date.now();
    const keys = await this.redis.keys('frontier:*');
    for (const key of keys) {
      const domain = key.replace('frontier:', '');
      if (now - (this.lastFetchTime.get(domain) || 0) < this.POLITENESS_DELAY_MS) continue;
      const result = await this.redis.zpopmax(key);
      if (result && result.length >= 2) {
        this.lastFetchTime.set(domain, now);
        return JSON.parse(result[1]);
      }
    }
    return null;
  }
}

class WebFetcher {
  private robotsCache = new Map<string, any>();

  async fetch(url: string) {
    const domain = new URL(url).hostname;
    const robots = await this.getRobotsTxt(domain);
    if (!robots.isAllowed(url, 'Googlebot')) return { statusCode: 403, error: 'robots.txt disallowed' };
    const response = await axios.get(url, { timeout: 10000, maxRedirects: 5, headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
      'Accept': 'text/html',
    }});
    return { statusCode: response.status, html: response.data, headers: response.headers };
  }
}

class IndexBuilder {
  private stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or']);

  buildIndex(documents: Array<{ docId: number; text: string }>) {
    const index = new Map<string, Posting[]>();
    for (const doc of documents) {
      const tokens = doc.text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 0 && !this.stopWords.has(t));
      const termPositions = new Map<string, number[]>();
      tokens.forEach((term, pos) => {
        if (!termPositions.has(term)) termPositions.set(term, []);
        termPositions.get(term)!.push(pos);
      });
      for (const [term, positions] of termPositions) {
        if (!index.has(term)) index.set(term, []);
        index.get(term)!.push({ docId: doc.docId, frequency: positions.length, positions });
      }
    }
    for (const [, postings] of index) postings.sort((a, b) => a.docId - b.docId);
    return index;
  }
}

class BM25Scorer {
  private k1 = 1.2; private b = 0.75;
  constructor(private totalDocs: number, private avgDocLen: number) {}

  score(query: string[], docId: number, docLength: number, tf: Map<string, number>, df: Map<string, number>) {
    let score = 0;
    for (const term of query) {
      const termFreq = tf.get(term) || 0;
      const idf = Math.log(1 + (this.totalDocs - (df.get(term) || 0) + 0.5) / ((df.get(term) || 0) + 0.5));
      score += idf * (termFreq * (this.k1 + 1)) / (termFreq + this.k1 * (1 - this.b + this.b * docLength / this.avgDocLen));
    }
    return score;
  }
}
\`

## 12. Real Company Deep Dives

**Google**: 3.5B+ searches/day, 100B+ pages. GFS, Bigtable, MapReduce/Flume, Spanner, PageRank, BERT, RankBrain, MUM. Googlebot runs on 10K+ servers. Key algorithms: PageRank (1998), Caffeine (2010, continuous indexing), Hummingbird (2013, semantic), RankBrain (2015, ML), BERT (2019, NLP).

**Bing**: 1B+ searches/day. Azure infrastructure. Bingbot crawler. InMage incremental crawl. ChatGPT integration (2023). Powers Yahoo and DuckDuckGo.

**DuckDuckGo**: Privacy-first. No crawling — aggregates from Bing API, Yahoo BOSS, 400+ sources. No tracking, no filter bubble.

**Baidu**: 650M+ MAU in China. Baiduspider crawler. Chinese NLP (segmentation, NER). Custom distributed systems on Baidu Cloud.

**Common Crawl**: Non-profit, open web crawl. 3-5B pages/month on AWS S3. Used by researchers and AI companies for LLM training.

## 13. Interview Playbook

**Q1: Design a web crawler for 1B pages/month.** *Framework*: URL frontier (priority queue + politeness), DNS caching, distributed fetchers (1000+ nodes), HTML parser, SimHash dedup, politeness per domain (2s delay), robots.txt, URL normalization, crawl budget management.

**Q2: How does PageRank work?** *Framework*: Page rank = sum of linking pages' ranks / their outbound links. Damping factor 0.85 (random jump probability). Solved via power iteration. Dead ends handled by teleportation.

**Q3: Design the inverted index.** *Framework*: For each term, store (docId, frequency, positions). Compress via delta encoding + variable-byte. Store in SSTables. Term-based sharding with replication.

**Q4: How does a search engine handle duplicate content?** *Framework*: SimHash fingerprint + Hamming distance threshold. 95%+ catch rate. Eliminates ~30% of pages from index.

**Q5: Design query serving for <200ms response.** *Framework*: Query -> spell check -> index lookup (parallel to shards) -> merge results -> score -> top N -> snippet -> cache. Each shard returns top 100 locally. Popular queries cached.

## 14. Concept Check Quiz

1. Data structure enabling fast full-text search? — b) Inverted index ✓
2. PageRank damping factor purpose? — b) Model probability of random jump to new page ✓
3. True or False: Crawler should download pages as fast as possible. — False. Must respect politeness delays.
4. Near-duplicate detection technique? — b) SimHash ✓
5. What is BM25? — b) Text relevance scoring function ✓
6. What is a posting list? — b) List of (docId, frequency, positions) for a term ✓
7. Google neural language understanding update? — c) BERT ✓

## 15. Next Steps

- **PageRank**: Power iteration, random surfer model, teleportation, personalized PageRank.
- **Learning to Rank**: LambdaRank, LambdaMART, neural ranking models for optimized result ordering.
- **Near-Duplicate Detection**: SimHash, MinHash, shingling for similarity at web scale.
- **Semantic Search**: Transformer models (BERT, T5) for query intent understanding beyond keywords.
- **Next Lesson**: Design Rate Limiter.`,
    estimatedMin: 20,
    difficulty: "ADVANCED" as const,
    companies: ["Google", "Bing", "Common Crawl", "Internet Archive"],
    tags: ["web-crawler", "search-engine", "crawling", "indexing", "page-rank", "distributed-crawling"],
  },

  {
    id: "lesson-08-10",
    slug: "system-design-interviews-10-design-rate-limiter",
    title: "Design Rate Limiter",
    content: `## 0. Mental Model

Picture a **bouncer at a nightclub** with capacity limit — only 100 people inside at once. Each person shows ID (rate limit key: IP, API key, user ID). The bouncer has strategies: (1) **Token Bucket**: give each person 5 tickets at entry, they hand one per entry, save unused tickets for bursts, get 1 new ticket per minute. (2) **Leaky Bucket**: people enter at exactly 1 per 30 seconds, no faster. (3) **Fixed Window**: max 100 per hour — but if 100 come in the first minute, the other 59 minutes are empty. (4) **Sliding Window**: track each person's entry timestamps for the last hour; if 100 entries, deny. The bouncer does this for thousands per second, in sub-millisecond decisions.

## 1. Quick Summary

A **rate limiter** controls how many requests a client can make within a time window. It prevents **abuse**, **DDoS**, **resource exhaustion**, and ensures **fair usage**. Common algorithms: **Token Bucket** (allows bursts), **Leaky Bucket** (smooths traffic), **Fixed Window** (simple, 2x boundary bursts), **Sliding Window Log** (most accurate, memory-heavy), **Sliding Window Counter** (efficient via Redis Sorted Sets). At high scale (100K+ req/sec), rate limiters need sub-millisecond decisions. Production systems use **Redis** with Lua scripting for atomic checks, deployed as API gateway middleware. Distributed rate limiting adds **consistent hashing** (sticky routing) or **centralized Redis cluster**.

## 2. Definition & Terminology

**Rate Limit**: Cap on operations a caller can perform in a time window.

**Rate Limit Key**: What's limited (user ID, IP, API key, endpoint, or combination).

**Window**: Time interval (1 second, 1 minute, 1 hour, 1 day).

**Hard Throttling**: Exceeded requests immediately rejected (HTTP 429).

**Soft Throttling**: Exceeded requests delayed (queued) with bounded queue depth.

**Token Bucket**: Allows bursts up to capacity, then refills at a steady rate.

**HTTP 429 Too Many Requests**: Standard rate-limit response.

**Retry-After Header**: Seconds client should wait before retrying.

## 3. The Problem Without It

**Abusive Clients**: A single misconfigured client can saturate all server resources. Web scrapers crawl max speed. Buggy apps send infinite retries. One client causes DoS for everyone.

**Brute-Force Attacks**: Attackers try millions of passwords against login endpoints. Without rate limits (5 attempts/min/IP), they exhaust the dictionary in hours.

**API Cost Explosion**: Usage-based pricing APIs (Twilio, Stripe, OpenAI) suffer cost abuse. A runaway integration runs up + bills in minutes.

**Database Overload**: Sudden traffic spike overwhelms the database. Rate limiting sheds excess load before it reaches backends.

**Unfair Resource Allocation**: One noisy tenant consumes all resources in multi-tenant systems.

**DDoS Vulnerability**: Without rate limiting at the gateway, attacks overwhelm infrastructure.

## 4. How It Works — Core Mechanics

**Token Bucket Algorithm**: (1) Each key has a bucket with capacity (max tokens), 
efillRate (tokens/sec), 	okens (current count), lastRefill (timestamp). (2) On request: delta = now - lastRefill, 	okens = min(capacity, tokens + delta * refillRate). If 	okens >= 1: decrement, allow. Else: deny (429). (3) Burst: unused tokens accumulate up to capacity for burst usage.

**Fixed Window Counter**: (1) windowStart = floor(now / windowSeconds) * windowSeconds. (2) Redis key: 
atelimit:{key}:{windowStart}. (3) INCR, if > limit: deny. TTL = windowSeconds. (4) Problem: 2x requests at boundary (100 in last minute of window A + 100 in first minute of window B = 200 in adjacent minutes).

**Sliding Window Log** (most accurate): (1) Maintain Sorted Set of timestamps per key. (2) On request: remove expired timestamps (ZREMRANGEBYSCORE), count remaining (ZCARD). (3) If count < limit: ZADD, allow. (4) Memory proportional to request volume per window.

**Sliding Window Counter** (efficient hybrid): Track two counters (current + previous window). Estimate: count = current * (1 - overlap) + previous * overlap. Good accuracy, constant memory.

## 5. Variants & Flavors

**Global Rate Limit**: One limit shared across all clients. Protects system from total overload. Simple but unfair — one bad client exhausts global limit.

**Per-User / Per-IP / Per-API-Key**: Most common. Each client gets its own limit. Fair isolation. More Redis keys.

**Hierarchical Rate Limits**: Per-endpoint (e.g., 1000 req/hr for /api/search), per-user (100 req/min), per-IP (10 req/sec). Multiple levels checked in order.

**Concurrent Request Limiter**: Limits number of in-flight requests (not per time window). Protects against connection exhaustion.

**Queue-Based Throttling (Soft)** : Instead of 429, queue excess requests and process them as capacity becomes available. Better UX. More complex.

**Client-Side Rate Limiting**: Client calculates remaining capacity using response headers (X-RateLimit-Remaining). Server enforces as backup.

## 6. Performance Characteristics

**Decision Latency**: Sub-millisecond for all algorithms. Redis Lua script EVAL adds ~0.5ms network round trip. In-memory local counters are fastest (<0.1ms).

**Memory Usage**: Fixed Window: 1 key per window per client. Token Bucket: 1 key per client. Sliding Window Log: N timestamps per window per client (most memory). Sliding Window Counter: 2 keys per client.

**Accuracy**: Sliding Window Log (exact) > Sliding Window Counter (estimated) > Token Bucket (burst-capable) > Fixed Window (2x boundary burst).

**Throughput**: Redis single instance handles 100K+ checks/sec. Redis cluster scales to millions/sec. Lua script ensures atomicity.

## 7. Failure Modes

**Redis Outage**: Rate limiter loses state. All requests allowed until Redis recovers. Mitigation: Redis Cluster, sentinel, fallback to local in-memory counters (less accurate).

**Clock Skew**: Distributed servers have different clocks. Sliding window calculations become inaccurate. Mitigation: NTP synchronization, use Redis server time (TIME command) in Lua scripts.

**Key Exhaustion**: Rate-limited clients keep incrementing keys, filling Redis memory. Mitigation: TTL on all rate limit keys, aggressive expiry.

**Race Condition (Non-Atomic)** : Without Lua/Redis atomicity, two concurrent requests can both read count=99 (under limit) and both increment. Mitigation: always use atomic operations (Redis INCR, Lua EVAL).

**Distributed Inconsistency**: Without consistent hashing, a client's requests go to different rate limiter instances, each allowing the request. Total exceeds limit. Mitigation: sticky routing (consistent hashing) or centralized Redis.

## 8. Decision Framework

**Choose Token Bucket**: Most versatile. Allows bursts up to capacity, then enforces steady rate. Used by AWS, Stripe. Good default.

**Choose Leaky Bucket**: When you need smooth, predictable request flow. Traffic shaping for network QoS.

**Choose Fixed Window**: Simplest implementation. Acceptable when 2x boundary burst is tolerable. Low memory.

**Choose Sliding Window Log**: When exact accuracy is required (compliance, billing). High memory cost.

**Choose Sliding Window Counter**: Best balance of accuracy and memory. Good for most production APIs.

**Storage**: Redis (standard, most production systems). Local memory (simple, no dependency, leader election needed for distributed). Database (slow, not recommended for high throughput).

## 9. Live Architecture Diagram

\`
Flow:
  Client -> API Gateway -> Rate Limiter Middleware
     -> Extract key (API key, IP, user ID)
     -> Lookup rules (limit, window, algorithm)
     -> Redis EVAL rate_limit.lua (atomic)
     -> If under limit: forward to backend
     -> If over limit: return 429 + Retry-After header

Redis Lua Script (Sliding Window Counter):
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local windowStart = now - window
  redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
  local count = redis.call('ZCARD', key)
  if count < limit then
    redis.call('ZADD', key, now, now .. ':' .. math.random())
    redis.call('EXPIRE', key, window)
    return 1  -- allowed
  else
    return 0  -- denied
  end
\`

## 10. Real Production Incident

**Incident**: "The GitHub API Rate Limit Meltdown" — GitHub's unauthenticated rate limit (60 req/hr) used a fixed window algorithm. At the boundary of each hour, a massive spike of requests hit all at once (all clients whose windows reset simultaneously). This caused a 10x traffic spike every hour, overwhelming API servers.

**Root Cause**: Fixed window with aligned boundaries (all keys reset at the same UTC hour boundary). Millions of clients' counters reset simultaneously, causing a thundering herd.

**Solution**: (1) Switched to sliding window with 15-minute granularity. (2) Added jitter to window alignment — each key's window start is offset by a hash of the key. (3) Implemented conditional requests (If-None-Match) so cached responses don't count toward limit. (4) Added Retry-After header with precise timing.

**Lesson Learned**: Aligned fixed windows cause thundering herds. Sliding windows and jittered offsets prevent boundary spikes.

## 11. Production Implementation

\`	ypescript
class TokenBucket {
  constructor(private redis: RedisClient) {}

  async allow(key: string, capacity: number, refillRate: number): Promise<boolean> {
    const result = await this.redis.eval(
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local refillRate = tonumber(ARGV[3])

      local data = redis.call('GET', key)
      local tokens, lastRefill
      if data then
        local d = cjson.decode(data)
        tokens = d.tokens
        lastRefill = d.lastRefill
      else
        tokens = capacity
        lastRefill = now
      end

      local delta = math.max(0, now - lastRefill)
      tokens = math.min(capacity, tokens + delta * refillRate)

      if tokens >= 1 then
        tokens = tokens - 1
        redis.call('SET', key, cjson.encode({ tokens = tokens, lastRefill = now }), 'EX', math.ceil(capacity / refillRate) + 1)
        return 1
      else
        redis.call('SET', key, cjson.encode({ tokens = tokens, lastRefill = lastRefill }), 'EX', math.ceil(capacity / refillRate) + 1)
        return 0
      end
    , 1, key, Date.now() / 1000, capacity, refillRate);
    return result === 1;
  }
}

class SlidingWindowCounter {
  constructor(private redis: RedisClient) {}

  async allow(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    const result = await this.redis.eval(
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local windowSeconds = tonumber(ARGV[4])

      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
      local count = redis.call('ZCARD', key)

      if count < limit then
        redis.call('ZADD', key, now, now .. ':' .. math.random())
        redis.call('EXPIRE', key, windowSeconds * 2)
        return cjson.encode({ allowed = 1, remaining = limit - count - 1, resetAt = now + windowSeconds })
      else
        return cjson.encode({ allowed = 0, remaining = 0, resetAt = now + windowSeconds })
      end
    , 1, key, now, windowStart, limit, windowSeconds);

    return JSON.parse(result);
  }
}

// Rate limiter middleware for API Gateway
function rateLimitMiddleware(rules: RateLimitRule[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const rule of rules) {
      const key = extractKey(req, rule.keyType);
      const result = await rateLimiter.allow(key, rule.limit, rule.windowSeconds);
      res.setHeader('X-RateLimit-Limit', rule.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt);
      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil(result.resetAt - Date.now() / 1000));
        return res.status(429).json({ error: 'Too Many Requests', retryAfter: result.resetAt });
      }
    }
    next();
  };
}
\`

## 12. Real Company Deep Dives

**Twitter API**: Multiple tiers (Essential: 500K tweets/month, Elevated: 2M/month). Per-endpoint and per-user limits. App limit: 450 req/15-min. User limit: 300 req/15-min.

**GitHub API**: 5000 req/hr (authenticated), 60 req/hr (unauthenticated). Per-endpoint limits. Conditional requests don't count. Moved from fixed window to sliding window after thundering herd incident.

**Stripe API**: Token bucket — 100 read ops/sec, 100 write ops/sec per API key. Burst up to 100. Keys in Stripe-Version header.

**AWS API Gateway**: Token bucket with burst. Standard: 10,000 req/sec per region. Per-API-key throttling. Can request increase.

**Cloudflare**: Per-IP and per-path matching. Fixed window or rate-based. Custom response pages. 1M+ rules supported.

**Google APIs**: 60 req/user/min/API (varies). Quota enforcement per project per method. Exponential backoff recommended.

## 13. Interview Playbook

**Q1: Compare rate limiting algorithms.** *Framework*: Token Bucket (bursts up to capacity), Leaky Bucket (smooth rate), Fixed Window (simple, 2x boundary), Sliding Window Log (exact, memory-heavy), Sliding Window Counter (efficient, good accuracy). Recommendation: Token Bucket or Sliding Window Counter for most APIs.

**Q2: Design a distributed rate limiter for 1000+ servers.** *Framework*: Centralized Redis cluster as single source of truth. Consistent hashing for sticky routing (same client → same node). Lua scripts for atomicity. Fallback to local counters during Redis outage. Circuit breaker if Redis latency spikes.

**Q3: Design Redis data structures and Lua scripts.** *Framework*: Token Bucket (single hash key: tokens + lastRefill). Sliding Window (Sorted Set of timestamps). Fixed Window (simple INCR key). Lua ensures atomic check-and-increment.

**Q4: How to handle rate limiting for unauthenticated users (by IP)?** *Framework*: Extract IP from X-Forwarded-For or connection. Apply lower limits than authenticated. Risk: NAT users share IPs. Mitigation: use IP + User-Agent fingerprint for better isolation.

**Q5: What headers should a rate-limited API return?** *Framework*: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, and Retry-After (seconds) on 429.

**Q6: Design multi-tier rate limiting for a SaaS platform.** *Framework*: Per-user (1000 req/hr), per-endpoint (100 req/min for expensive endpoints), per-IP (10 req/sec). Check in order: most restrictive wins. Each tier has its own Redis key and Lua check.

## 14. Concept Check Quiz

1. Which algorithm allows bursts up to capacity? — a) Token Bucket ✓
2. Fixed Window limitation? — b) Allows 2x requests at window boundaries ✓
3. True or False: Sliding Window Log is the most memory-efficient algorithm. — False. It's the most memory-heavy.
4. What ensures atomic rate limit operations in Redis? — c) Lua scripts (EVAL) ✓
5. What does Retry-After header indicate? — a) Seconds client should wait before retrying ✓
6. How to prevent distributed rate limiter inconsistency? — b) Consistent hashing for sticky routing ✓
7. GitHub's rate limit incident root cause? — a) Fixed window with aligned hourly boundaries ✓

## 15. Next Steps

- **Token Bucket vs Leaky Bucket**: Burst handling and traffic shaping tradeoffs.
- **Redis Lua Scripting**: Atomic operations for rate limit checks and counter management.
- **Consistent Hashing**: Distributing rate limit state across Redis cluster nodes.
- **API Gateway Architecture**: Rate limiting at gateway vs application layer.
- **DDoS Mitigation**: Rate limiting as part of defense-in-depth strategy.
- **Next Lesson**: Design Notification System.`,
    estimatedMin: 15,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Cloudflare", "AWS", "GitHub", "Shopify", "Google"],
    tags: ["rate-limiter", "throttling", "token-bucket", "leaky-bucket", "api-gateway"],
  },

      {
    id: "lesson-08-11",
    slug: "system-design-problems-11-notification-system",
    title: "Design Notification System",
    content: `## 0. Mental Model

> A notification system is like a **post office sorting facility**. Letters (notifications) arrive from many senders (microservices). The facility sorts them by destination, mode of delivery (airmail, ground, courier), and priority (overnight, standard). It knows each recipient's preferences (no junk mail, hold during vacation). Some letters need confirmation of receipt. The facility doesn't write the letters — it just delivers them reliably.

## 1. Quick Summary

- **Notification system** delivers messages to users across channels: push (APNs/FCM), email (SendGrid/SES), SMS (Twilio), and in-app (WebSocket).
- **Core pipeline**: Ingest events (Kafka) → Enrich (user preferences, locale) → Render (template engine) → Route (channel selection) → Rate limit → Deliver (channel workers) → Feedback (delivery analytics).
- **Key challenges**: At-least-once delivery without duplicates, cost optimization (SMS is 100x more expensive than push), per-user rate limiting, template rendering in 100+ languages, and third-party reliability.
- **Scalability**: Kafka partitions by user_id for ordering, Redis for rate-limit counters, Cassandra for notification history, worker pools per channel for independent scaling.
- **Delivery guarantees**: At-least-once with idempotency keys. No exactly-once guarantee from third-party gateways (APNs, FCM).

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Push Notification** | Alert delivered to a mobile device via APNs (iOS) or FCM (Android) |
| **Email Notification** | HTML/plain-text message sent via SMTP or third-party (SendGrid, SES) |
| **SMS Notification** | Text message via Twilio, Vonage, or direct carrier SMPP connections |
| **In-App Notification** | Toast/banner rendered inside the application (WebSocket or polling) |
| **Webhook** | HTTP callback to a customer-provided endpoint |
| **Delivery Rate** | % of notifications successfully delivered to the gateway |
| **Open Rate** | % of delivered notifications that were opened by the user |
| **Channel Router** | Decides which channels to use based on user preferences and priority |
| **Template Engine** | Renders notification body from templates with user-specific variables |
| **Rate Limiter** | Enforces per-user, per-channel, per-time-window limits (Redis) |
| **Dead Letter Queue** | Failed notifications after max retries, requiring manual review |

## 3. The Problem Without It

- **Inconsistent implementation**: Every microservice builds its own notification logic → inconsistent user experience, duplicated effort across teams.
- **No preference management**: Users receive either too many notifications or miss critical ones. No unified opt-in/opt-out across channels.
- **Unreliable delivery**: No retry logic, no fallback channel, no delivery confirmation. Notifications silently fail.
- **Uncontrolled costs**: SMS is used for non-critical messages because there is no cost-aware routing → monthly bill surprises.
- **No analytics**: Product teams cannot measure which notifications drive engagement, which channels perform best.

## 4. How It Works — Core Mechanics

\`\`\`
Notification Pipeline:
  [Service A] --Kafka event--> [Pre-processor]
                                    |
                            [Enrich: user profile, preferences, locale]
                                    |
                            [Template Engine: render body]
                                    |
                            [Channel Router: push? email? SMS?]
                                    |
                            [Rate Limiter: Redis counters]
                                    |
                            [Deduplication: Redis TTL key]
                                    |
                            [Channel Queues (Kafka topic per channel)]
                                    |
                +-------------------+-------------------+
                |                   |                   |
          [Push Worker]      [Email Worker]      [SMS Worker]
                |                   |                   |
          [APNs/FCM]         [SendGrid/SES]      [Twilio/SMPP]
                |                   |                   |
          User Device          User Inbox         User Phone
\`\`\`

**Rate Limiting Strategy**:
- Per-user, per-channel, per-time-window counters in Redis sorted sets (sliding window).
- Separate limits per notification priority (transactional vs marketing).
- Quarantine: if user receives >10 notifications in 5 minutes, auto-downgrade to email-only for 1 hour.

**Template Rendering**:
- Templates cached in Redis (TTL=5 min) to avoid DB reads at render time.
- Variables validated at template creation time, not render time.
- Render in a sandboxed JavaScript VM (QuickJS) for safety.

## 5. Variants & Flavors

| Approach | Provider | Use Case | Pros | Cons |
|----------|----------|----------|------|------|
| **Managed (Firebase)** | Google FCM | Mobile push | Free, global, reliable | iOS limits, no SMS |
| **Managed (Twilio)** | Twilio SendGrid | SMS + Email | Global carrier coverage | Expensive at scale |
| **Managed (Amazon SNS)** | AWS | Multi-channel | AWS integration, fan-out | Limited control |
| **Self-built (Kafka+Workers)** | Custom | High-volume, custom logic | Full control, cost optimization | Operational overhead |
| **Open-source (Novu)** | Novu | Notification infrastructure | Multi-channel, templates, preferences | Smaller community |

## 6. Performance Characteristics

| Metric | Push (APNs/FCM) | Email (SendGrid) | SMS (Twilio) |
|--------|----------------|------------------|--------------|
| P99 delivery latency | 500ms-5s | 5s-60s | 1s-10s |
| Max throughput (single worker) | 10K req/s (HTTP/2) | 1K req/s (SMTP) | 100 req/s (HTTP) |
| Cost per notification | Free | ~$0.001 | ~$0.01 |
| Delivery guarantee | Best-effort | Best-effort | High (SMPP) |
| Payload limit | 4KB | 25MB (with attachments) | 160 chars/segment |
| Open rate | 3-10% | 15-25% | 90%+ |
| Rate limit (per second) | Unlimited (Apple) | ~250/s (SES per account) | ~100/s (US carriers) |

## 7. Failure Modes

- **Third-party gateway outage**: APNs or FCM goes down → all push notifications fail. *Mitigation*: Fallback channel (push fails → email). Multi-region deployment (APNs has multiple instances).
- **Rate limit exceeded**: Downstream API (Twilio, SendGrid) returns 429 → notifications queued but delayed. *Mitigation*: Exponential backoff with jitter. Pre-allocate rate limit capacity with providers.
- **Invalid device token**: Device token expires or is revoked → push delivery fails permanently. *Mitigation*: Track delivery failures per token. Auto-remove tokens after N consecutive failures.
- **Template rendering failure**: Template has syntax error or missing variable → notification content is garbled. *Mitigation*: Validate templates at creation time. Use default template as fallback.
- **Deduplication failure**: Same event processed twice → user gets duplicate notification. *Mitigation*: Idempotency key in Redis with TTL. Compare event type + user id + timestamp.
- **Kafka consumer lag**: Partition rebalance or backlog → notifications delayed by minutes/hours. *Mitigation*: Monitor consumer lag. Auto-scale worker pool.

## 8. Decision Framework

\`\`\`
├─ Number of notifications per day?
│   ├─ <1K → Simple: Firebase + SendGrid API directly
│   ├─ 1K-100K → Managed: SNS or Novu
│   └─ >100K → Self-built: Kafka + workers + Redis + Cassandra
├─ Channels needed?
│   ├─ Push only → FCM/APNs directly
│   ├─ Push + Email → SendGrid + FCM
│   └─ Push + Email + SMS → Twilio + FCM + SendGrid
├─ Customization?
│   ├─ Low → Managed template system (SendGrid dynamic templates)
│   └─ High → Self-built template engine (Liquid/Mustache sandbox)
├─ Cost sensitivity?
│   ├─ SMS needed → Optimize channel router (use SMS only for critical)
│   └─ Free only → Push + email only, no SMS
└─ Team?
    ├─ Small → Managed (Firebase + SendGrid + Twilio APIs)
    └─ Large → Self-built (Kafka + workers + monitoring)
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'svc', label: 'Microservices', type: 'app', x: 80, y: 80 },
    { id: 'kafka', label: 'Kafka\n(Events)', type: 'cache', x: 250, y: 80 },
    { id: 'prep', label: 'Pre-processor\n(Enrich + Template)', type: 'app', x: 250, y: 220 },
    { id: 'router', label: 'Channel Router', type: 'gateway', x: 250, y: 360 },
    { id: 'redis', label: 'Redis\n(Rate Limit + Dedup)', type: 'cache', x: 80, y: 360 },
    { id: 'push', label: 'Push Worker\n(APNs/FCM)', type: 'web', x: 80, y: 500 },
    { id: 'email', label: 'Email Worker\n(SendGrid/SES)', type: 'web', x: 250, y: 500 },
    { id: 'sms', label: 'SMS Worker\n(Twilio)', type: 'web', x: 420, y: 500 },
    { id: 'cass', label: 'Cassandra\n(History)', type: 'storage', x: 420, y: 80 },
    { id: 'analytics', label: 'Analytics\n(Flink + ClickHouse)', type: 'metrics', x: 420, y: 220 },
  ]}
  edges={[
    { from: 'svc', to: 'kafka', label: 'notification events' },
    { from: 'kafka', to: 'prep', label: 'consume' },
    { from: 'prep', to: 'router', label: 'rendered' },
    { from: 'redis', to: 'router', label: 'rate limit check' },
    { from: 'router', to: 'push', label: 'push queue' },
    { from: 'router', to: 'email', label: 'email queue' },
    { from: 'router', to: 'sms', label: 'sms queue' },
    { from: 'push', to: 'cass', label: 'delivery status' },
    { from: 'email', to: 'cass', label: 'delivery status' },
    { from: 'sms', to: 'cass', label: 'delivery status' },
    { from: 'cass', to: 'analytics', label: 'feedback stream' },
  ]}
  height={600}
/>

## 10. Real Production Incident

<Callout type="incident">
**Twilio SMS Outage — February 2023**

Twilio experienced a 5-hour SMS delivery outage across North America due to a carrier partner's network failure. An upstream SS7 provider had a cascading failure that prevented SMS message delivery to major US carriers (Verizon, AT&T, T-Mobile).

**Impact**: Thousands of businesses (Uber, Airbnb, DoorDash, Instacart) could not send SMS notifications — ride confirmations, 2FA codes, delivery updates. Customer support tickets spiked 10x. Estimated $10M+ in lost revenue and customer trust.

**Root cause**: A single carrier partner's SS7 routing table became corrupted during a software update. The corrupted routes propagated to Twilio's direct carrier connections. All SMS traffic to that carrier was blackholed.

**Fix**: Twilio activated automatic failover to alternative carrier routes (cold standby). Implemented SS7 route health monitoring with automatic circuit breaker. Added geographic redundancy for carrier connectivity.

**Lesson**: Every notification channel has an upstream dependency that can fail. Always have a fallback channel strategy. Critical alerts (2FA, password reset) should use at least two independent delivery channels — if SMS fails, send via push or email.
</Callout>

## 11. Production Implementation

### Kafka Event Schema
\`\`\`json
{
  "eventType": "delivery_completed",
  "userId": "alice_789",
  "notificationId": "ntf_a1b2c3",
  "priority": "HIGH",
  "channels": ["push", "email"],
  "template": "delivery_completed/en-US/push",
  "data": {
    "earnings": 12.50,
    "customerName": "Bob"
  },
  "dedupKey": "delivery_completed:alice_789:1710000000",
  "ttl": 86400
}
\`\`\`

### Rate Limiter (Redis)
\`\`\`python
import time, redis

r = redis.Redis()

def check_rate_limit(user_id, channel, limit, window_seconds=3600):
    key = f"rate:{channel}:{user_id}"
    now = int(time.time())
    window_start = now - window_seconds
    r.zremrangebyscore(key, 0, window_start)
    count = r.zcard(key)
    if count >= limit:
        return False
    r.zadd(key, {now: now})
    r.expire(key, window_seconds)
    return True
\`\`\`

### Push Worker (Node.js)
\`\`\`typescript
import { APNs } from '@apple/apns';
import { FCM } from 'fcm-node';

async function sendPush(notification: Notification): Promise<DeliveryResult> {
  const { deviceToken, platform, payload } = notification;
  if (platform === 'ios') {
    return apns.send({
      token: deviceToken,
      alert: { title: payload.title, body: payload.body },
      priority: 10,
      topic: 'com.myapp',
    });
  }
  return fcm.send({
    to: deviceToken,
    notification: { title: payload.title, body: payload.body },
  });
}
\`\`\`

## 12. Real Company Deep Dives

- **Meta**: 100B+ push notifications per day. Uses Chronos (event processing) and Aurora (async workers). Template engine with 100K+ templates in 100+ languages. ML-based send-time optimization and channel selection.
- **Twilio**: Leading SMS and email API provider. Handles billions of messages monthly across SMS, voice, email (SendGrid), and WhatsApp. Uses Kafka for queuing, Spark for fraud detection, and custom carrier-grade SMPP infrastructure.
- **Firebase Cloud Messaging (Google)**: Delivers 1B+ push notifications/day across Android, iOS, and Web. Uses gRPC for high-throughput delivery with global load balancing.
- **Amazon SNS**: Fully managed pub/sub notification service supporting push, email, SMS, HTTP/S webhooks, and Lambda triggers. Handles 100M+ messages/day across AWS services.
- **Uber**: Transactional notifications (ride status, payment receipts, safety alerts). Uses Ringpop for consistent hashing, Kafka for event ingestion, and Twilio for SMS. Critical alerts use push + SMS with escalation.
- **OneSignal**: Multi-channel platform (push, email, SMS, in-app). 3M+ developers, 2B+ users. Uses Go for high-performance delivery workers, Redis for rate limiting, and Kafka for event streaming.

## 13. Interview Playbook

**Q: "Design a notification system that delivers 10M+ notifications per day."**
→ Open with: Kafka for event ingestion, worker pools per channel (push/email/SMS), Redis for rate limiting and deduplication, template engine for rendering, and Cassandra for history.
→ Cover: User preferences determine channels. Rate limiter prevents notification fatigue. Template engine supports 100+ languages. At-least-once delivery with idempotency keys. Fallback channels (if push fails → email).
→ Depth signal: For critical alerts (2FA, password reset), use ALL channels in parallel with a "first response wins" strategy. For marketing, use the cheapest channel that achieves target engagement. ML can optimize channel selection based on historical user behavior.

**Q: "How do you handle third-party gateway failures?"**
→ Open with: Circuit breaker pattern for each gateway. Fallback to alternative channel. Dead letter queue for failed notifications.
→ Cover: APNs/FCM/Twilio each have different failure modes. Push: retry with exponential backoff (max 3). Email: retry with backoff, check bounce feedback. SMS: fallback to alternative carrier route.
→ Depth signal: Monitor gateway health via synthetic notifications sent to test devices every minute. If latency exceeds threshold or error rate spikes, activate circuit breaker and route to fallback channel.

## 14. Concept Check Quiz

**Q1:** What are the main channels in a notification system?**Answer:** Push (APNs/FCM), email (SendGrid/SES), SMS (Twilio), in-app (WebSocket), and webhook.

**Q2:** Why use a message queue (Kafka) in a notification system?**Answer:** Decouples event producers from delivery workers, provides buffering during traffic spikes, enables parallel processing per channel, and allows replay on failure.

**Q3:** How do you prevent notification fatigue?**Answer:** Per-user, per-channel rate limiting. Separate limits for transactional vs marketing. Quarantine mechanism for users receiving too many notifications in a short window.

**Q4:** What is a dead letter queue?**Answer:** A queue for notifications that failed delivery after max retries. Requires manual review to identify systemic issues.

**Q5:** How do you handle device token expiration?**Answer:** Track delivery failures per token. Remove tokens after N consecutive failures. Request client to re-register token periodically (every 24h).

## 15. Next Steps

- **Distributed Key-Value Store** — Storage patterns for notification history and user preferences.
- **Rate Limiting** — Deep dive into algorithms (token bucket, sliding window, leaky bucket).
- **Distributed Tracing** — Observability across the notification pipeline.
- **Idempotency** — Ensuring exactly-once semantics for notification delivery.`,
    estimatedMin: 18,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Twilio", "Apple Push", "Firebase", "OneSignal", "Amazon SNS"],
    tags: ["notification-system", "push-notification", "sms", "email", "twilio"],
  },

  {
    id: "lesson-08-12",
    slug: "system-design-problems-12-distributed-key-value-store",
    title: "Design Distributed Key-Value Store",
    content: `## 0. Mental Model

> A distributed key-value store is like a **giant locker room**. Each locker has a unique number (key) and holds whatever you put inside (value). The room has many rows of lockers (nodes), and a map on the wall (consistent hash ring) tells you which row to check. If a row is full, a new row is added and only a few items need to move. If a row catches fire, copies exist in other rows (replication). The map is on the wall, but everyone knows how to read it — no central attendant needed.

## 1. Quick Summary

- **Distributed KV store** stores data as opaque values indexed by unique keys across multiple machines. Examples: DynamoDB, Cassandra, Redis Cluster, etcd.
- **Consistent hashing** with virtual nodes partitions data across nodes. Adding/removing a node only moves N/T fraction of data (N = replicas, T = total virtual nodes).
- **Replication**: Each key is stored on N nodes (preference list). Configurable quorum: W + R > N for strong consistency.
- **Failure handling**: Hinted handoff (temporary), Merkle tree anti-entropy (permanent), gossip protocol for membership.
- **Tunable consistency**: Per-query choice between eventual (fast, maybe stale) and strong (latest, 2x latency).

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Consistent Hashing** | Data partitioning scheme; each node owns a range of a hash ring |
| **Virtual Node** | Each physical node represented by T virtual tokens on the ring |
| **Preference List** | First N healthy nodes responsible for a key (clockwise from key) |
| **Quorum** | W = write quorum, R = read quorum. W + R > N = strong consistency |
| **Hinted Handoff** | Temporary failure: write stored on another node with a hint for later forwarding |
| **Merkle Tree** | Hash tree for efficient anti-entropy (compare data across nodes) |
| **Gossip Protocol** | Decentralized membership and failure detection |
| **SSTable** | Immutable sorted file on disk (LSM-tree component) |
| **MemTable** | In-memory sorted buffer, flushed to SSTable when full |
| **Compaction** | Merge SSTables, discard tombstones, rebuild indexes |
| **Vector Clock** | (node, counter) pairs for detecting concurrent updates |
| **LSM-Tree** | Log-structured merge tree — write-optimized storage structure |

## 3. The Problem Without It

- **Single-node bottleneck**: A single database server handles all reads and writes. At 1M+ requests/second, the server cannot keep up.
- **No fault tolerance**: One server failure = complete data unavailability. With replication, N servers can survive N-1 failures.
- **Manual sharding**: Application code must partition data across databases. Adding a shard requires moving data manually.
- **Costly consistency vs availability tradeoff**: Traditional databases choose consistency > availability (CAP). During network partitions, the database becomes unavailable.
- **No incremental scalability**: Scaling from 3 nodes to 100 requires a complete re-shard. KV stores handle this automatically.

## 4. How It Works — Core Mechanics

\`\`\`
Consistent Hash Ring (0 to 2^64 - 1):
        ___
    ___/   \___
   /           \
  |    Node A   |
  |  (vNodes:   |
   \  A1, A2)  /
    \___   ___/
        \_/      ← Key "session:alice" hashes here
   ___/   \___
  /           \
  |    Node B   |
  |  (vNodes:   |
   \  B1, B2,  /
    \_ B3) ___/
        \_/
   ___/   \___
  /           \
  |    Node C   |
  |  (vNodes:   |
   \  C1, C2)  /
    \___   ___/

Write Path (N=3, W=2):
  1. Client sends PUT(key, value, consistency=QUORUM)
  2. Coordinator (any node) hashes key → position on ring
  3. Preference list: next N virtual nodes → physical nodes [B, C, A]
  4. Coordinator sends write to B, C, A in parallel
  5. B and C acknowledge (W=2), A is slow
  6. Client gets success. Hint stored for A on another node.

Read Path (N=3, R=2):
  1. Client sends GET(key, consistency=QUORUM)
  2. Coordinator sends read to preference list [B, C, A]
  3. B and C respond with versions. B has v5, C has v5
  4. Coordinator returns the value (version 5)
  5. If versions differ (v5 vs v4), read repair writes v5 to stale node
\`\`\`

## 5. Variants & Flavors

| System | Consistency | Protocol | Storage | Use Case |
|--------|------------|----------|---------|----------|
| **DynamoDB** | Tunable (eventual/strong) | Custom (Dynamo paper) | LSM-tree (internal) | Amazon shopping cart, session store |
| **Cassandra** | Tunable (eventual/strong) | Gossip + hinted handoff | LSM-tree (SSTables) | Time-series, messaging, IoT |
| **Redis Cluster** | Eventual (async replication) | Hash slots (16384) | In-memory + AOF/RDB | Caching, sessions, leaderboards |
| **etcd** | Strong (Raft consensus) | Raft | B-tree (boltdb) | K8s config, service discovery |
| **FoundationDB** | Strong (ACID transactions) | Paxos + custom | B-tree (SSD) | Apple iCloud, App Store |
| **ScyllaDB** | Tunable (Cassandra-compatible) | Gossip + hinted handoff | LSM-tree (Seastar) | High-throughput Cassandra alternative |

## 6. Performance Characteristics

| Metric | DynamoDB | Cassandra | Redis Cluster | etcd |
|--------|----------|-----------|---------------|------|
| Read latency P99 (single key) | 5ms | 10ms | 1ms | 5ms |
| Write latency P99 | 5ms | 10ms | 1ms | 10ms |
| Max throughput (single node) | 10K req/s | 5K req/s | 100K req/s (in-memory) | 10K req/s |
| Scaling model | Auto (serverless) | Add nodes | Add shards | Add nodes |
| Consistency model | Tunable | Tunable | Eventual | Linearizable |
| Persistence | SSD (auto) | SSD (local) | RAM + optional AOF | SSD (boltdb) |
| Max value size | 400KB | 2GB | 512MB | 1.5MB |

## 7. Failure Modes

- **Hot key**: A single key (celebrity profile, viral product) receives 10x normal traffic → one partition overloaded. *Mitigation*: Application-level cache (Redis/memcached). Add salt to hot key to spread across partitions. DynamoDB DAX for microsecond reads.
- **Hinted handoff flood**: Many nodes fail simultaneously → hints pile up on remaining nodes → memory pressure → cascading failure. *Mitigation*: Limit hint count per node. Drop hints if queue is full (let anti-entropy handle).
- **Slow node (straggler)**: One node has high latency or disk I/O pressure → all coordinator requests to that node wait for timeout → P99 latency spikes. *Mitigation*: Speculative retry (send read to one additional replica, use fastest response). Monitor per-node latency.
- **Compaction storm**: All nodes compact simultaneously → disk I/O saturation → read/write latency spikes. *Mitigation*: Stagger compaction schedules. Reserve disk bandwidth for compaction vs user I/O.
- **Network partition**: Ring splits into two sides that cannot communicate. Each side continues operating independently → conflicting writes. *Mitigation*: Sloppy quorum (accept writes on either side). Vector clocks detect conflicts on merge. Read repair reconciles.
- **Gossip convergence delay**: After node join/leave, gossip takes time to propagate across large clusters. *Mitigation*: Seed nodes for faster initial discovery. Use aggressive gossip interval (100ms) for failure detection.

## 8. Decision Framework

\`\`\`
├─ Consistency requirement?
│   ├─ Strong (linearizable) → etcd, FoundationDB, Zookeeper
│   ├─ Eventual (AP) → Cassandra, DynamoDB (eventual), Redis Cluster
│   └─ Tunable (per query) → DynamoDB, Cassandra
├─ Workload pattern?
│   ├─ Read-heavy → Redis (in-memory), DynamoDB + DAX
│   ├─ Write-heavy → Cassandra, ScyllaDB (LSM-tree optimized)
│   └─ Balanced → DynamoDB (auto-scaling)
├─ Operational preference?
│   ├─ Serverless → DynamoDB (no ops)
│   ├─ Self-managed → Cassandra, ScyllaDB
│   └─ Kubernetes-native → etcd
├─ Scale?
│   ├─ <100GB → Redis (single node + replica)
│   ├─ 100GB-10TB → DynamoDB or Cassandra (3-10 nodes)
│   └─ >10TB → Cassandra or ScyllaDB (20+ nodes)
└─ Data model?
    ├─ Simple KV → Redis, DynamoDB
    ├─ Wide-column → Cassandra (CQL), ScyllaDB
    └─ Document → DynamoDB, FoundationDB Document Layer
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client / App', type: 'client', x: 80, y: 80 },
    { id: 'coord', label: 'Coordinator\n(any node)', type: 'gateway', x: 250, y: 80 },
    { id: 'ring', label: 'Consistent Hash Ring\n(virtual nodes)', type: 'cache', x: 250, y: 220 },
    { id: 'nodeA', label: 'Node A\n(Data + Gossip)', type: 'web', x: 80, y: 380 },
    { id: 'nodeB', label: 'Node B\n(Data + Gossip)', type: 'web', x: 250, y: 380 },
    { id: 'nodeC', label: 'Node C\n(Data + Gossip)', type: 'web', x: 420, y: 380 },
    { id: 'diskA', label: 'SSTables', type: 'storage', x: 80, y: 500 },
    { id: 'diskB', label: 'SSTables', type: 'storage', x: 250, y: 500 },
    { id: 'diskC', label: 'SSTables', type: 'storage', x: 420, y: 500 },
    { id: 'gossip', label: 'Gossip Protocol\n(heartbeat + membership)', type: 'metrics', x: 420, y: 80 },
  ]}
  edges={[
    { from: 'client', to: 'coord', label: 'GET/PUT' },
    { from: 'coord', to: 'ring', label: 'hash(key)' },
    { from: 'ring', to: 'nodeA', label: 'preference list' },
    { from: 'ring', to: 'nodeB', label: 'preference list' },
    { from: 'ring', to: 'nodeC', label: 'preference list' },
    { from: 'coord', to: 'nodeA', label: 'read/write' },
    { from: 'coord', to: 'nodeB', label: 'read/write' },
    { from: 'coord', to: 'nodeC', label: 'read/write' },
    { from: 'nodeA', to: 'diskA', label: 'flush/compact' },
    { from: 'nodeB', to: 'diskB', label: 'flush/compact' },
    { from: 'nodeC', to: 'diskC', label: 'flush/compact' },
    { from: 'nodeA', to: 'gossip', label: 'heartbeat' },
    { from: 'nodeB', to: 'gossip', label: 'heartbeat' },
    { from: 'nodeC', to: 'gossip', label: 'heartbeat' },
  ]}
  height={580}
/>

## 10. Real Production Incident

<Callout type="incident">
**Amazon DynamoDB — Christmas Eve Outage, 2022**

On December 24, 2022, Amazon DynamoDB experienced a 4-hour multi-region outage that affected Amazon.com's shopping cart, checkout, and recommendation systems during the peak holiday shopping period.

**Impact**: Amazon.com's checkout was non-functional for 4 hours on Christmas Eve. Estimated revenue loss: $200M+. Thousands of AWS services that depend on DynamoDB (Lambda, SQS, SNS) experienced cascading failures.

**Root cause**: A routine software deployment introduced a bug in the DynamoDB metadata and placement service. The bug caused the placement service to incorrectly compute the storage capacity of certain partitions. The placement service began moving data between partitions at an extremely high rate, causing cascading control-plane overload. The control plane could not keep up with placement decisions, leading to data-plane unavailability.

**Fix**: Rolled back the deployment. Added canary deployments with gradual rollout (1% → 5% → 20% → 100%) for all control-plane changes. Implemented placement rate limiting to prevent cascading data movement.

**Lesson**: Control-plane failures can be more dangerous than data-plane failures. A bug in how data is placed/routed (even with a correct storage engine) can bring down the entire system. Always canary control-plane changes and rate-limit automated data movement.
</Callout>

## 11. Production Implementation

### DynamoDB Table Definition
\`\`\`typescript
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const table = await dynamo.createTable({
  TableName: 'Sessions',
  KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
  BillingMode: 'PAY_PER_REQUEST',
  AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
});

// Strongly consistent read
const result = await dynamo.getItem({
  TableName: 'Sessions',
  Key: { userId: { S: 'alice_789' } },
  ConsistentRead: true, // W + R > N
});
\`\`\`

### Cassandra CQL Schema
\`\`\`cql
CREATE KEYSPACE IF NOT EXISTS user_data
  WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'us-east-1': 3, 'us-west-2': 3
  };

CREATE TABLE IF NOT EXISTS user_data.sessions (
  user_id text PRIMARY KEY,
  session_data text,
  expires_at timestamp,
  created_at timestamp
) WITH compaction = {
  'class': 'LeveledCompactionStrategy',
  'sstable_size_in_mb': 64
};
\`\`\`

### Vector Clock Implementation
\`\`\`python
class VectorClock:
    def __init__(self, node_id):
        self.node_id = node_id
        self.clock = {}  # node_id -> counter

    def tick(self):
        self.clock[self.node_id] = self.clock.get(self.node_id, 0) + 1

    def merge(self, other):
        merged = dict(self.clock)
        for node, counter in other.clock.items():
            merged[node] = max(merged.get(node, 0), counter)
        return merged

    def compare(self, other):
        self_gt = any(self.clock.get(n, 0) > other.clock.get(n, 0) for n in self.clock)
        other_gt = any(other.clock.get(n, 0) > self.clock.get(n, 0) for n in other.clock)
        if self_gt and not other_gt: return "AFTER"
        if other_gt and not self_gt: return "BEFORE"
        if self_gt and other_gt: return "CONCURRENT"
        return "EQUAL"
\`\`\`

## 12. Real Company Deep Dives

- **Amazon DynamoDB**: Powers Amazon.com shopping cart, session store, game leaderboards, and 200K+ AWS customers. Single-digit ms latency at any scale. DAX for microsecond reads. Global Tables for active-active multi-region replication.
- **Apple (FoundationDB)**: Distributed KV store with ACID transactions across all keys. Uses deterministic simulation testing for correctness. Powers iCloud, App Store, and Siri.
- **Netflix (Cassandra)**: User activity, viewing history, and recommendations. Uses Cassandra for time-series data (billions of events/day). Tunable consistency for different data types.
- **Uber (Cassandra)**: Trip data, driver location history, and dispatch metadata. 100+ TB across multiple Cassandra clusters. Custom tooling for repair and monitoring.
- **Discord (ScyllaDB)**: Message store with billions of messages per day. Migrated from Cassandra to ScyllaDB for 10x throughput improvement on same hardware. Seastar shared-nothing architecture.

## 13. Interview Playbook

**Q: "Design a distributed key-value store like DynamoDB."**
→ Open with: Consistent hashing with virtual nodes for partitioning. Replication factor N=3. Tunable consistency (W + R > N). Gossip for failure detection. Hinted handoff for temporary failures. Merkle trees for anti-entropy.
→ Cover: Virtual nodes provide better load distribution and faster rebalancing than simple range partitioning. Write path: coordinator → preference list → N replicas → wait for W acks. Read path: N replicas → wait for R responses → pick latest version.
→ Depth signal: For strong consistency, use W=2, R=2 with N=3. During network partitions, the system prefers availability (accepts writes on both sides) and relies on vector clocks for conflict detection on merge. This is the AP approach from CAP theorem.

**Q: "How does hint handoff differ from Merkle tree anti-entropy?"**
→ Open with: Hinted handoff handles temporary failures (node down for seconds/minutes). Anti-entropy handles permanent failures (node down for hours/days, may have lost data).
→ Cover: Hinted handoff: coordinator stores writes on another node, forwards when target recovers. Fast, low overhead. Anti-entropy: compare Merkle trees, identify differences, synchronize. Slower but handles full reconciliation.
→ Depth signal: Hinted handoff is best-effort — hints can be dropped if queue is full. Anti-entropy is the safety net that ensures all replicas eventually converge. Both are needed for a complete failure handling strategy.

## 14. Concept Check Quiz

**Q1:** What is the purpose of virtual nodes in consistent hashing?**Answer:** Better load distribution (smooths hot spots), faster rebalancing (move virtual nodes, not entire ranges), and support for heterogeneous capacity.

**Q2:** What does W=2, R=2, N=3 mean?**Answer:** Data replicated to 3 nodes. Writes must acknowledge from 2 nodes. Reads must respond from 2 nodes. Since W+R > N (4>3), this provides strong consistency.

**Q3:** How does a Merkle tree help with anti-entropy?**Answer:** Each node builds a hash tree of its key ranges. Comparing root hashes quickly identifies if data differs. If root differs, recursively walk the tree to find the exact differing sub-range. Only sync the difference, not full data.

**Q4:** What happens during a network partition in a Dynamo-style system?**Answer:** Each partition side continues accepting writes (AP). Writes on different sides may conflict. When partition heals, hinted handoff + Merkle tree anti-entropy reconcile differences. Vector clocks detect conflicting writes, which are resolved by the application (last-writer-wins or CRDT).

**Q5:** Why use LSM-trees instead of B-trees for write-heavy workloads?**Answer:** LSM-trees write sequentially to MemTable (in-memory) and flush to SSTable (sequential disk write). B-trees write to random disk locations on every update. LSM-trees have 10-100x better write throughput at the cost of more CPU for compaction and higher read amplification.

## 15. Next Steps

- **Consensus Algorithms (Raft/Paxos)** — Strongly consistent replication for metadata stores.
- **Leader Election** — How distributed systems select a primary node for coordination.
- **Gossip Protocol** — Deep dive into decentralized failure detection and membership.
- **Vector Clocks** — Conflict detection for concurrent updates in distributed systems.`,
    estimatedMin: 20,
    difficulty: "ADVANCED" as const,
    companies: ["Amazon DynamoDB", "Redis", "Cassandra", "etcd", "FoundationDB"],
    tags: ["key-value-store", "dynamodb", "distributed-storage", "consistent-hashing", "lsm-tree"],
  },

  {
    id: "lesson-08-13",
    slug: "system-design-problems-13-real-time-leaderboard",
    title: "Design Real-Time Leaderboard",
    content: `## 0. Mental Model

> A real-time leaderboard is like the **scoreboard at a sports stadium**. As players score points, the board updates instantly. Fans can see the top 10, search for their favorite player's rank, and watch positions change in real-time. Behind the board, a crew (Redis Sorted Sets) sorts and ranks every player's score in milliseconds — updating the display without ever re-sorting the entire list.

## 1. Quick Summary

- **Redis Sorted Sets (ZSET)** provide O(log N) operations for score updates (ZADD, ZINCRBY), rank queries (ZREVRANK), and range queries (ZREVRANGE).
- **Tie-breaking**: Encode "first to reach wins" by packing timestamp into the score: \`encoded = points * 10^12 + (MAX_TS - timestamp)\`.
- **Caching**: Top-100 leaderboard response cached for 10s (handles 99% of reads). User rank cached for 1s.
- **Sharding**: For 100M+ players, shard by score range or use active/inactive separation. Approximate leaderboards with Count-Min Sketch.
- **Time-scoped**: Daily, weekly, monthly, all-time leaderboards with Redis TTL for automatic expiration.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Redis ZSET** | Sorted Set — ordered by score, O(log N) for add/rank/range |
| **ZADD** | Add or update a member's score in a sorted set |
| **ZINCRBY** | Atomically increment a member's score |
| **ZREVRANK** | Get rank from highest score (0 = #1) |
| **ZREVRANGE** | Get members by rank range (highest to lowest) |
| **ZREVRANGEBYSCORE** | Get members by score range (high to low) |
| **ZSCORE** | Get a member's current score |
| **ZREMRANGEBYRANK** | Trim the sorted set (remove lowest ranks) |
| **Tie-Breaking** | Deterministic ordering for equal scores |
| **Score Encoding** | Packing timestamp/other data into the score field |
| **Leaderboard Scope** | Global, friends-only, regional, daily, weekly, monthly |
| **Sharding** | Dividing the player population across multiple Redis instances |

## 3. The Problem Without It

- **SQL ORDER BY is O(N log N)**: Sorting 10M+ rows by score on every request is prohibitively slow. Even with indexes, \`ORDER BY score DESC LIMIT 100\` requires scanning the index (not O(log N) for updating).
- **No incremental update**: After every score change, you must re-sort the entire dataset. With 1M+ players, this is O(N log N) per update.
- **No deterministic tie-breaking**: Equal scores produce non-deterministic or unstable ordering. Redis ZSET uses lexicographic order of member ID for equal scores.
- **No time-scoping**: Creating daily/weekly leaderboards requires separate tables, TTL cleanup, and complex queries.
- **No real-time push**: Players expect to see rank changes instantly. Polling a SQL database every second doesn't scale.

## 4. How It Works — Core Mechanics

\`\`\`
Score Update Flow:
  Player earns 150 points
    → Game Server → Kafka → Leaderboard Worker
    → Redis pipeline:
        ZINCRBY leaderboard:daily:2024-03-15 150 "alice_123"
        ZINCRBY leaderboard:weekly:2024-W11 150 "alice_123"
    → ZREVRANK leaderboard:daily:2024-03-15 "alice_123" → rank #47
    → If rank changed significantly:
        WebSocket push to client: {"rank": 47, "score": 5750}

Read Flow (Top 100):
  Client requests leaderboard
    → Leaderboard API → Check cache (top100, TTL=10s)
    → If hit: return cached JSON
    → If miss: ZREVRANGE leaderboard:daily:2024-03-15 0 99 WITHSCORES
    → Cache result (TTL=10s) → Return JSON

Tie-Breaking (first to score wins):
  encoded_score = points * 10^12 + (MAX_TIMESTAMP - elapsed_seconds)
  Example: 5000 points at t=1710000000
    → encoded = 5000 * 10^12 + (2^42 - 1710000000)
    = 5000000000000000000 + ...

  When comparing, higher encoded score = better rank.
  First player to reach 5000 points has higher timestamp, so higher encoding.
\`\`\`

## 5. Variants & Flavors

| Approach | Data Structure | Read Latency | Write Latency | Accuracy | Max Scale |
|----------|---------------|-------------|--------------|----------|-----------|
| **Redis ZSET (single)** | Sorted Set | 1ms | 1ms | Exact | 100M members |
| **Redis Cluster (sharded)** | Multiple ZSETs | 2ms | 2ms | Exact | 1B+ members |
| **Score-Range Sharding** | Per-range ZSETs | 3ms | 2ms | Exact | 1B+ members |
| **Active/Inactive** | Hot ZSET + Cold archive | 2ms | 2ms | Approximate (±1%) | 10B+ members |
| **Count-Min Sketch** | Probabilistic counters | 0.1ms | 0.1ms | Approximate (±5%) | Unlimited |
| **SQL + Redis cache** | PG + Redis cache | 10ms (miss) | 10ms | Exact | 10M members |

## 6. Performance Characteristics

| Metric | Redis ZSET (1M) | Redis ZSET (100M) | Sharded Redis | SQL Index |
|--------|----------------|-------------------|---------------|-----------|
| ZADD latency (p50) | 0.5ms | 1ms | 2ms | 10ms |
| ZREVRANK latency (p50) | 0.3ms | 0.8ms | 2ms | 50ms |
| ZREVRANGE top 100 (p50) | 0.3ms | 0.5ms | 2ms | 5ms (cached) |
| Memory per member | ~50 bytes | ~50 bytes | ~55 bytes | ~100 bytes |
| Max write throughput (single) | 100K/s | 50K/s | 500K/s (cluster) | 5K/s |
| Top-100 cache hit ratio | 99% | 99% | 99% | 99% |

## 7. Failure Modes

- **Redis OOM**: ZSET grows unbounded → Redis hits maxmemory → evictions or write failures. *Mitigation*: Set maxmemory-policy allkeys-lru. Trim low-ranked members: \`ZREMRANGEBYRANK leaderboard:global 100000 -1\`. Archive old data to cold storage.
- **Redis master failure**: ZSET data lost if not persisted. *Mitigation*: Redis Sentinel for automatic failover. AOF persistence (fsync every 1s). Redis Cluster with master-replica per shard.
- **Score overflow**: 64-bit double precision loses integer precision above 2^53. *Mitigation*: Keep scores within 53-bit integer range. Use two-level scoring (primary integer + secondary float) if needed.
- **Stale top-100 cache**: Players see outdated rankings. *Mitigation*: TTL-based invalidation (10s). Write-through invalidation on significant rank changes.
- **Shard imbalance**: Some score ranges have more players than others → hot shards. *Mitigation*: Dynamic range splitting. Consistent hash by player ID instead of score range.

## 8. Decision Framework

\`\`\`
├─ Number of players?
│   ├─ <100K → Single Redis ZSET (simple, exact)
│   ├─ 100K-10M → Redis ZSET + top-100 cache
│   ├─ 10M-100M → Redis Cluster + score-range sharding
│   └─ >100M → Active/inactive sharding or approximate (CMS)
├─ Update frequency?
│   ├─ <1K updates/sec → Single Redis node
│   ├─ 1K-100K updates/sec → Redis pipeline + batch writes
│   └─ >100K updates/sec → Redis Cluster + Kafka buffering
├─ Accuracy needed?
│   ├─ Exact → Redis ZSET (sorted set)
│   └─ Approximate OK → Count-Min Sketch (lower memory)
├─ Scopes?
│   ├─ Single (all-time) → One ZSET
│   ├─ Multiple (daily+weekly+monthly) → Separate ZSET per scope with TTL
│   └─ Friends/Regional → Compute on demand (Lua script + cache)
└─ Real-time push?
    ├─ Yes → WebSocket push on rank change
    └─ No → Polling every 30s (reduce load)
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'player', label: 'Player / Client', type: 'client', x: 80, y: 60 },
    { id: 'game', label: 'Game Server', type: 'app', x: 80, y: 200 },
    { id: 'kafka', label: 'Kafka\n(Score Events)', type: 'cache', x: 250, y: 200 },
    { id: 'worker', label: 'Leaderboard\nWorker', type: 'web', x: 250, y: 340 },
    { id: 'redis', label: 'Redis Cluster\n(ZSETs + Cache)', type: 'cache', x: 250, y: 480 },
    { id: 'api', label: 'Leaderboard\nAPI', type: 'gateway', x: 420, y: 200 },
    { id: 'ws', label: 'WebSocket\nPush Service', type: 'app', x: 420, y: 340 },
  ]}
  edges={[
    { from: 'player', to: 'game', label: 'play/game' },
    { from: 'game', to: 'kafka', label: 'score event' },
    { from: 'kafka', to: 'worker', label: 'consume' },
    { from: 'worker', to: 'redis', label: 'ZINCRBY' },
    { from: 'player', to: 'api', label: 'GET leaderboard' },
    { from: 'api', to: 'redis', label: 'ZREVRANGE / cache' },
    { from: 'worker', to: 'ws', label: 'rank change' },
    { from: 'ws', to: 'player', label: 'WebSocket push' },
  ]}
  height={560}
/>

## 10. Real Production Incident

<Callout type="incident">
**Redis Cluster Outage in Gaming Leaderboard — 2020**

A major mobile gaming company experienced a 2-hour leaderboard outage during a global tournament event. Redis Cluster nodes started hitting memory limits, causing evictions and write failures. The leaderboard stopped updating — 10M+ active players could not see their current rank.

**Impact**: Tournament engagement dropped 60%. Players could not track their progress, leading to frustration and churn. $5M in lost in-app purchases during the outage.

**Root cause**: The ZSET for the all-time leaderboard was unbounded — it contained all 200M player accounts, even those inactive for years. Each active tournament match produced a ZINCRBY update for every participating player. During peak hours, 100K+ writes/sec hit the Redis cluster. Memory usage grew linearly with player count, eventually exhausting available RAM on the shards.

**Fix**: Implemented ZREMRANGEBYRANK to trim ZSETs to top 100K players daily. Archived low-ranked player data to Cassandra. Added memory monitoring with PagerDuty alerts. Implemented per-shard maxmemory limits with eviction fallback.

**Lesson**: Distributed leaderboards require active memory management. ZSETs grow unbounded unless trimmed. Always plan for worst-case player count and set trim policies. Monitor Redis memory usage with time-series forecasting.
</Callout>

## 11. Production Implementation

### Redis Commands (Leaderboard Operations)
\`\`\`bash
# Update score (atomic increment)
ZINCRBY leaderboard:daily:2024-03-15 150 "alice_123"

# Get player's rank (0 = #1)
ZREVRANK leaderboard:daily:2024-03-15 "alice_123"

# Get top 100 with scores
ZREVRANGE leaderboard:daily:2024-03-15 0 99 WITHSCORES

# Get player's score
ZSCORE leaderboard:daily:2024-03-15 "alice_123"

# Get neighbors around player (10 above, 10 below)
ZREVRANGE leaderboard:daily:2024-03-15 37 57 WITHSCORES

# Trim to top 100K (free memory)
ZREMRANGEBYRANK leaderboard:daily:2024-03-15 100000 -1

# Set TTL for daily leaderboard (expire after 48h)
EXPIRE leaderboard:daily:2024-03-15 172800
\`\`\`

### Tie-Breaking (Python)
\`\`\`python
import time

MAX_TS = 2**42

def encode_score(points, timestamp=None):
    ts = timestamp or int(time.time())
    return points * 10**12 + (MAX_TS - ts)

def decode_score(encoded):
    points = encoded // 10**12
    ts = MAX_TS - (encoded % 10**12)
    return points, ts
\`\`\`

### Lua Script for Friends Leaderboard
\`\`\`lua
-- Compute friends leaderboard for a user
local friend_ids = redis.call('SMEMBERS', 'friends:' .. KEYS[1])
if #friend_ids == 0 then
  return {}
end
table.insert(friend_ids, KEYS[1])
local results = {}
for _, fid in ipairs(friend_ids) do
  local score = redis.call('ZSCORE', KEYS[2], fid)
  if score then
    table.insert(results, {fid, score})
  end
end
table.sort(results, function(a, b) return a[2] > b[2] end)
return results
\`\`\`

## 12. Real Company Deep Dives

- **Discord**: Uses Redis Sorted Sets for real-time leaderboards in gaming communities. 150M+ monthly active users. Each server (guild) has multiple leaderboards. Redis Cluster across 20+ shards.
- **Strava**: Activity leaderboards (segments) use Redis ZSETs. Millions of athletes competing for fastest times on running/cycling segments. Tie-breaking by exact timestamp (encoded score).
- **LeetCode**: Weekly and all-time contest leaderboards. Redis ZSET with tie-breaking by completion time. Handles 1M+ participants per contest. Top 100 cached for 5s.
- **Apple Game Center**: Global leaderboards for iOS games. Uses Redis Sorted Sets at scale. Daily, weekly, all-time scopes. Choreographed and friends-only variants.
- **Uber**: Real-time driver earnings leaderboards for gamification. Drivers compete for highest earnings in their city/region. Weekly reset with automatic TTL expiration.

## 13. Interview Playbook

**Q: "Design a real-time leaderboard for a game with 100M players."**
→ Open with: Redis Sorted Sets for O(log N) rank/score/range operations. Caching (top-100 TTL=10s). Sharding by score range for 100M+ players. Tie-breaking via encoded scores.
→ Cover: Single Redis ZSET handles up to 100M members (5GB memory). For more, shard by score range and merge results. Active/inactive separation: hot ZSET for active players (last 24h), rank is active_rank + estimated_inactive_count.
→ Depth signal: For true global scale (1B+), use approximate leaderboards with Count-Min Sketch or HyperLogLog. Trade exact rank for constant memory and O(1) operations. Accept ±5% rank error.

**Q: "How do you handle tie-breaking in a leaderboard?"**
→ Open with: Encode timestamp into the score field. Higher encoded score = better rank for same point value.
→ Cover: \`encoded_score = points * 10^12 + (MAX_TIMESTAMP - timestamp)\`. This preserves integer comparison — higher points = higher rank; same points = earlier timestamp wins. Decode for display.
→ Depth signal: Be aware of 64-bit double precision limits (53-bit integer). For very large point values, you may need two-level scoring or separate tie-breaking using lexicographic member ID ordering.

## 14. Concept Check Quiz

**Q1:** What data structure does Redis use for Sorted Sets?**Answer:** Skip list + hash table. Skip list provides O(log N) sorted operations. Hash table provides O(1) member lookup for ZSCORE.

**Q2:** How do you implement time-scoped leaderboards (daily, weekly) without duplicate code?**Answer:** Use key prefixes: \`leaderboard:daily:YYYY-MM-DD\`, \`leaderboard:weekly:YYYY-WW\`, \`leaderboard:monthly:YYYY-MM\`. Set TTL for automatic expiration. Same ZADD/ZINCRBY logic for all scopes.

**Q3:** What happens when a ZSET runs out of memory?**Answer:** Redis evicts keys based on maxmemory-policy. If ZSET is evicted, all data is lost. Mitigation: trim low-ranked members regularly, set maxmemory, monitor memory usage.

**Q4:** How do you compute a "friends" leaderboard efficiently?**Answer:** Use a Lua script that fetches friend IDs from a set, gets each friend's ZSCORE, sorts in Lua, and caches the result. Alternatively, compute periodically and cache in a temporary ZSET with TTL.

**Q5:** What is the difference between ZREVRANK and ZRANK?**Answer:** ZREVRANK returns rank from highest score (0 = #1). ZRANK returns rank from lowest score (0 = last place).

## 15. Next Steps

- **Distributed Key-Value Store** — Storage fundamentals that leaderboards depend on.
- **Redis Deep Dive** — Advanced Redis features: streams, pub/sub, Lua scripting, cluster management.
- **Rate Limiting** — Sliding window counters, token bucket algorithms using Redis.
- **Gaming Infrastructure** — Matchmaking, state synchronization, anti-cheat systems.`,
    estimatedMin: 15,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Redis", "Leaderboard", "Gaming", "Gamification"],
    tags: ["leaderboard", "real-time", "sorted-set", "gaming", "ranking"],
  },

  {
    id: "lesson-08-14",
    slug: "system-design-problems-14-parking-lot-system",
    title: "Design Parking Lot System (OO Design + Scale)",
    content: `## 0. Mental Model

> A parking lot system is like a **valet service for a massive stadium**. Cars arrive, get a ticket with a spot number, and the valet tracks where every car is parked. The valet knows which spots are free, which are taken, and how many spots remain. For a multi-level lot with electric vehicle charging, premium spots, and hourly rates, the valet needs a system — not just a notebook. Now scale this to 10,000 spots across 5 levels with real-time availability, payment integration, and license plate recognition.

## 1. Quick Summary

- **Parking lot design** is a classic OO design + scalability question. Start with objects (ParkingLot, Level, Spot, Vehicle, Ticket), then scale to 10K+ spots.
- **Core objects**: ParkingLot (singleton, manages levels), Level (has rows of spots), Spot (size: compact/large/EV, status: available/occupied/reserved), Vehicle (license plate, type), Ticket (entry time, spot ID, payment status), PaymentProcessor (cash/card/mobile).
- **Spot assignment**: Find nearest available spot based on vehicle type. Use a min-heap per spot type for O(1) nearest-spot retrieval.
- **Pricing model**: Hourly rate with surge pricing (event days). Peak hours cost more. Monthly passes for regular customers.
- **Scalability**: For 10K+ spots, use in-memory spot manager (Redis) + database for historical data. Microservices: SpotService, TicketService, PaymentService, NotificationService.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **ParkingLot** | Top-level entity managing multiple levels and entry/exit points |
| **Level** | A floor in the parking lot, contains multiple rows of spots |
| **Spot** | Individual parking space with size, location, and status |
| **Vehicle** | Entity with license plate, type (motorcycle, car, truck, EV) |
| **Ticket** | Records entry time, spot, vehicle, payment status |
| **Payment** | Transaction record with amount, method (cash/card/mobile), time |
| **Rate** | Pricing per hour/event/duration for different spot types |
| **EntryPanel** | Kiosk at entrance — issues ticket, opens gate |
| **ExitPanel** | Kiosk at exit — accepts payment, validates ticket |
| **DisplayBoard** | Shows real-time available spots per level/type |
| **Reservation** | Pre-booked spot for a specific time window |
| **Valet** | Service where attendant parks the car (optional) |

## 3. The Problem Without It

- **No centralized tracking**: Without a system, parking attendants don't know which spots are free. Customers drive around randomly looking for spots → congestion.
- **No revenue management**: Flat-rate pricing misses opportunities. Surge pricing during events can increase revenue 3x.
- **No reservation system**: Customers can't reserve spots in advance. They arrive and hope a spot is available.
- **No analytics**: Without data, you can't optimize pricing, predict peak hours, or plan capacity expansion.
- **Manual payment processing**: Cash-only payments at exit booths → long queues. No mobile payment, no automatic billing.
- **No EV charging management**: EV spots with chargers need separate tracking — who is charging, how long, billing for electricity.

## 4. How It Works — Core Mechanics

\`\`\`
Parking Lot Flow:
  Entry:
    Customer arrives → License plate camera (LPR) reads plate
      → EntryPanel checks if spot available (DisplayBoard updates)
      → If available: issues ticket (QR code) → Opens gate
      → Ticket record: {ticketId, licensePlate, entryTime, spotId}
      → Spot status: OCCUPIED

  Parking:
    Customer parks in assigned spot
      → Spot sensor confirms occupancy
      → If EV spot: charger starts (if plugged in)

  Exit:
    Customer scans ticket at ExitPanel
      → System calculates duration × rate = amount
      → Customer pays (cash/card/mobile app)
      → Payment verified → Opens gate
      → Spot status: AVAILABLE
      → Ticket record: {exitTime, amountPaid, paymentMethod}

Spot Assignment Algorithm:
  Priority: Premium/Monthly spots first (for subscribers) → EV spots → Compact → Large
  For each spot type, maintain a min-heap ordered by distance-to-entrance
  Assign the nearest available spot matching the vehicle type
  When spot freed, push back into heap

Pricing Model:
  Base rate: $2/hr (compact), $3/hr (large), $4/hr (EV with charging)
  Peak multiplier: Weekday 8-10AM and 5-7PM → 1.5x
  Event surcharge: Stadium event days → 2x
  Monthly pass: $200 (any spot), $300 (premium/reserved)
  EV charging: $1/kWh (added to ticket)
\`\`\`

## 5. Variants & Flavors

| Pattern | Approach | Pros | Cons | Best For |
|---------|----------|------|------|----------|
| **Single-level** | Basic OO design | Simple, easy to implement | Doesn't scale | Interviews, small lots |
| **Multi-level + Sensors** | Spot sensors + central DB | Real-time tracking, analytics | Infrastructure cost | Large parking garages |
| **Automated (Robotic)** | Robot moves cars to spots | 2x capacity (no aisles), zero emissions | $50K+/spot, slow retrieval | High-density urban |
| **Valet Parking** | Attendant parks the car | No customer driving, premium service | Labor cost, wait times | Restaurants, hotels |
| **Street Parking (Smart)** | Per-space sensors + mobile app | Distributed, lower cost | Sensor maintenance, vandalism | City street parking |
| **License Plate Recognition** | Camera-based entry/exit | No tickets needed, seamless | Camera + OCR cost, privacy | Airports, malls |

## 6. Performance Characteristics

| Metric | Small (100 spots) | Medium (1000 spots) | Large (10000 spots) | Mega (50000 spots) |
|--------|------------------|--------------------|--------------------|--------------------|
| Entry time | 5s (manual) | 3s (LPR) | 2s (LPR + pre-auth) | 1s (pre-booked) |
| Spot assignment | O(n) scan | O(log n) heap | O(log n) heap + cache | O(log n) sharded |
| Exit payment | 30s (cash) | 15s (card) | 5s (mobile app) | 2s (auto-bill) |
| DB writes/day | 500 | 5K | 50K | 250K |
| Cache hit ratio | 90% | 95% | 99% (Redis) | 99.9% (Redis cluster) |
| Concurrency | Single DB | Read replicas | Write shards | Multi-region |

## 7. Failure Modes

- **Gate stuck open/closed**: Mechanical failure prevents entry/exit. *Mitigation*: Manual override. Dual gate mechanism (redundant motors). Backup power for critical gates.
- **LPR camera failure**: Camera can't read license plate. *Mitigation*: Fallback to manual ticket issuance. QR code scanner as backup.
- **Spot sensor false positive**: Sensor shows occupied when spot is empty (or vice versa). *Mitigation*: Camera-based confirmation. Manual override by attendant. Periodic calibration.
- **Payment system down**: Credit card processor unavailable. *Mitigation*: Offline payment queue (process when back online). Cash acceptance always available. Pre-authorized mobile payments work offline.
- **Database full**: Ticket records accumulate without archiving → disk full. *Mitigation*: Archive tickets older than 90 days to cold storage (S3). Partition by date for easy archival.
- **Power outage**: Entire lot goes dark. *Mitigation*: Battery backup for gates, cameras, and payment terminals. UPS for servers. Generator for critical infrastructure.

## 8. Decision Framework

\`\`\`
├─ Scale?
│   ├─ <500 spots → Single DB + in-memory spot tracking
│   ├─ 500-5000 → Redis cache + PostgreSQL (sharded by level)
│   └─ >5000 → Microservices + Redis cluster + event sourcing
├─ Automation level?
│   ├─ Manual → Attendant at each gate
│   ├─ Semi-auto → LPR entry + mobile payment
│   └─ Full-auto → LPR entry/exit + auto-billing + robot parking
├─ Payment methods?
│   ├─ Cash only → Simple exit booth
│   ├─ Card + mobile → Stripe/Square integration
│   └─ Pre-auth + auto-bill → Subscription or mobile app
├─ Reservations?
│   ├─ No → First-come first-served
│   ├─ Yes (limited) → 20% spots reserved, 80% FCFS
│   └─ Yes (all) → Full booking system with overbooking buffer
└─ Event parking?
    ├─ No → Flat rate
    ├─ Yes → Surge pricing + reserved event spots
    └─ Yes (major stadium) → Pre-paid event parking + shuttle
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'entry', label: 'Entry Panel\n(LPR + Ticket)', type: 'client', x: 80, y: 60 },
    { id: 'exit', label: 'Exit Panel\n(Payment + Validator)', type: 'client', x: 80, y: 200 },
    { id: 'mobile', label: 'Mobile App\n(Reserve + Pay)', type: 'client', x: 80, y: 340 },
    { id: 'api', label: 'API Gateway', type: 'gateway', x: 250, y: 200 },
    { id: 'spot', label: 'Spot Service\n(Assignment)', type: 'app', x: 420, y: 60 },
    { id: 'ticket', label: 'Ticket Service', type: 'app', x: 420, y: 200 },
    { id: 'pay', label: 'Payment Service', type: 'app', x: 420, y: 340 },
    { id: 'redis', label: 'Redis\n(Spot Cache)', type: 'cache', x: 600, y: 60 },
    { id: 'db', label: 'PostgreSQL\n(Main Data)', type: 'storage', x: 600, y: 200 },
    { id: 'board', label: 'Display Board\n(Availability)', type: 'metrics', x: 250, y: 340 },
  ]}
  edges={[
    { from: 'entry', to: 'api', label: 'entry request' },
    { from: 'exit', to: 'api', label: 'exit + payment' },
    { from: 'mobile', to: 'api', label: 'reserve/pay' },
    { from: 'api', to: 'spot', label: 'assign spot' },
    { from: 'api', to: 'ticket', label: 'create/close' },
    { from: 'api', to: 'pay', label: 'process' },
    { from: 'spot', to: 'redis', label: 'R/W spots' },
    { from: 'spot', to: 'db', label: 'persist' },
    { from: 'ticket', to: 'db', label: 'CRUD' },
    { from: 'pay', to: 'db', label: 'transaction' },
    { from: 'spot', to: 'board', label: 'update count' },
  ]}
  height={420}
/>

## 10. Real Production Incident

<Callout type="incident">
**Airport Parking System Outage — Heathrow Terminal 5, 2019**

Heathrow Airport's Terminal 5 parking system experienced a 6-hour outage during the busy summer holiday period. The system — responsible for 12,000 parking spots across 5 levels — stopped issuing tickets and accepting payments.

**Impact**: 3-mile traffic queue on the M25 approach road. 10,000+ passengers missed flights. Airport lost £2M in parking revenue. Emergency overflow parking on taxiways.

**Root cause**: A database migration script had a bug that created a deadlock on the \`tickets\` table during peak hour. The migration was scheduled for 2AM but was delayed to 8AM (peak arrival time). When it ran, it held a table-level lock. All entry/exit transactions (which require INSERT/UPDATE on tickets) blocked. Connection pool exhausted. System became completely unresponsive.

**Fix**: Killed the migration process. Restored from pre-migration snapshot (10 minutes of data loss). Added circuit breaker: if migration runs outside maintenance window, abort automatically. Added read-replica for reporting queries to avoid locking the primary.

**Lesson**: Never run schema migrations during peak hours. Always test migration scripts under realistic load. Use online schema change tools (gh-ost, pt-online-schema-change) for zero-downtime migrations on high-traffic tables.
</Callout>

## 11. Production Implementation

### Core Classes (Python)
\`\`\`python
from enum import Enum
from datetime import datetime
import heapq

class SpotType(Enum):
    COMPACT = "compact"
    LARGE = "large"
    EV = "ev"
    HANDICAP = "handicap"
    PREMIUM = "premium"

class SpotStatus(Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"

class VehicleType(Enum):
    MOTORCYCLE = "motorcycle"
    CAR = "car"
    TRUCK = "truck"
    EV = "ev"

class Spot:
    def __init__(self, spot_id, level, row, spot_type):
        self.spot_id = spot_id
        self.level = level
        self.row = row
        self.spot_type = spot_type
        self.status = SpotStatus.AVAILABLE
        self.distance_to_entrance = level * 100 + row * 10

class SpotManager:
    def __init__(self):
        self.spots = {}
        self.available = {t: [] for t in SpotType}

    def add_spot(self, spot):
        self.spots[spot.spot_id] = spot
        heapq.heappush(self.available[spot.spot_type],
                       (spot.distance_to_entrance, spot.spot_id))

    def assign_spot(self, vehicle_type):
        spot_type = self._get_spot_type(vehicle_type)
        if not self.available[spot_type]:
            return None
        _, spot_id = heapq.heappop(self.available[spot_type])
        spot = self.spots[spot_id]
        spot.status = SpotStatus.OCCUPIED
        return spot

    def release_spot(self, spot_id):
        spot = self.spots[spot_id]
        spot.status = SpotStatus.AVAILABLE
        heapq.heappush(self.available[spot.spot_type],
                       (spot.distance_to_entrance, spot_id))

class Ticket:
    def __init__(self, ticket_id, license_plate, spot_id):
        self.ticket_id = ticket_id
        self.license_plate = license_plate
        self.spot_id = spot_id
        self.entry_time = datetime.now()
        self.exit_time = None
        self.amount = 0
        self.paid = False

class ParkingLot:
    def __init__(self, name, levels, spots_per_level):
        self.name = name
        self.spot_manager = SpotManager()
        for level in range(levels):
            for row in range(spots_per_level // 4):
                for st in SpotType:
                    if st == SpotType.PREMIUM and row > spots_per_level // 8:
                        continue
                    spot = Spot(f"L{level}R{row}{st.value[0]}", level, row, st)
                    self.spot_manager.add_spot(spot)
\`\`\`

### API Endpoints
\`\`\`typescript
// Entry: vehicle arrives
POST /api/v1/entry
{ licensePlate: "ABC123", vehicleType: "car", isEV: false }
Response: { ticketId: "T-20240315-0001", spotId: "L2R5C", entryTime: "2024-03-15T10:30:00Z" }

// Exit: vehicle leaves
POST /api/v1/exit
{ ticketId: "T-20240315-0001", paymentMethod: "card" }
Response: { amount: 12.50, duration: "2h15m", spotFreed: true }

// Reservation
POST /api/v1/reserve
{ licensePlate: "ABC123", entryTime: "2024-03-16T18:00:00", duration: "3h", spotType: "EV" }
Response: { reservationId: "R-001", spotId: "L1E3EV" }

// Get availability
GET /api/v1/availability
Response: { levels: [
  { level: 1, total: 500, available: 42, byType: { compact: 10, large: 20, ev: 8, handicap: 4 } },
  ...
]}
\`\`\`

## 12. Real Company Deep Dives

- **ParkMobile**: Largest parking app in the US (30M+ users). Handles parking payments for 2000+ cities. Uses microservices (Payment, Reservation, Spot) with Redis caching. License plate recognition for seamless entry/exit.
- **SpotHero**: Online parking reservation marketplace. 10K+ parking facilities across North America. Real-time availability API with pricing optimization. Uses event sourcing for ticket history.
- **Airports (Heathrow, JFK, SFO)**: Multi-level parking with LPR, automated payment, and loyalty programs. 10K-50K spots per facility. Redundant systems with manual fallback. Pre-book online with guaranteed spots.
- **Amazon/Google HQ**: Corporate parking with employee badge scanning, carpool incentives, and EV charging management. Integrated with calendar for peak-day capacity planning.
- **Uber Parking (Uber Eats)**: Dedicated pickup spots for delivery drivers. Time-limited (15 min) with license plate camera enforcement. Real-time spot availability in the Uber Eats driver app.

## 13. Interview Playbook

**Q: "Design a parking lot system (OO design + scale)."**
→ Open with: Core objects: ParkingLot → Level → Spot → Vehicle → Ticket → Payment. Identify relationships (composition: ParkingLot has Levels, Level has Spots). Define enums (SpotType, SpotStatus, VehicleType, PaymentMethod).
→ Cover: Spot assignment: O(log n) with min-heaps per spot type (nearest available). Pricing: hourly rate with peak/event multipliers. Ticket: tracks entry/exit time, calculates duration × rate. Payment: cash, card, mobile. Display board shows real-time availability.
→ Depth signal: For 10K+ spots, use Redis for real-time spot tracking (sub-ms reads), PostgreSQL for ticket persistence, and event-driven architecture (Kafka) for sensor events. Use CQRS: in-memory spot manager for assignments, DB for audit/history. Reserve 10% spots for monthly pass holders, 20% for EV/premium, rest for general.

**Q: "How do you handle peak hours and surge pricing?"**
→ Open with: Dynamic pricing based on real-time demand. Base rate × multiplier (events, peak hours, holidays).
→ Cover: Multipliers: weekday peak (1.5x), event days (2x), holidays (1.5x). Monthly passes at fixed price (revenue stability). EV charging: separate billing by kWh. Pre-reserved spots: premium pricing for guaranteed availability.
→ Depth signal: Use ML to predict demand based on historical data, event schedule, weather, and local happenings. Train model to suggest optimal multipliers for max revenue while maintaining >80% occupancy. A/B test pricing changes.

## 14. Concept Check Quiz

**Q1:** What are the core objects in a parking lot design?**Answer:** ParkingLot (has Levels), Level (has rows of Spots), Spot (type, status, location), Vehicle (license plate, type), Ticket (entry/exit time, spot, payment), PaymentProcessor.

**Q2:** How would you implement nearest-spot assignment efficiently?**Answer:** Min-heap per spot type, keyed by distance-to-entrance. O(1) to get nearest spot. O(log n) to reinsert when spot is freed.

**Q3:** What database would you use for real-time spot availability?**Answer:** Redis (in-memory, fast). Spot data in Redis with periodic persistence to PostgreSQL. Redis handles 100K+ reads/sec with sub-ms latency.

**Q4:** How do you handle a customer who loses their ticket?**Answer:** Look up by license plate (LPR camera captured entry). If not available, charge maximum daily rate as penalty. Log incident for audit.

**Q5:** How do you price EV charging in a parking lot?**Answer:** Separate billing: parking fee (by time) + electricity fee (by kWh). Track charging start/end time. Integrate with charger API to measure kWh consumed.

## 15. Next Steps

- **Object-Oriented Design** — Deep dive into SOLID principles, design patterns, and UML.
- **System Design Interview Framework** — Step-by-step approach for any design question.
- **Real-Time Systems** — Event-driven architectures for real-time sensor data processing.
- **Payment Systems** — Payment processing, idempotency, fraud detection, and reconciliation.`,
    estimatedMin: 16,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Google", "Amazon", "Uber", "Microsoft"],
    tags: ["parking-lot", "oo-design", "object-oriented", "low-level-design", "scalability"],
  },


];
