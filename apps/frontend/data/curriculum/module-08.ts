export const module08Lessons = [
  {
    id: 'lesson-08-01',
    slug: 'system-design-interviews-01-design-url-shortener',
    title: 'Design URL Shortener (tinyurl)',
    content: `## 1. Quick Summary

Designing a **URL shortener** (like TinyURL or bit.ly) is a classic system design interview problem. The core service takes a long URL and returns a short, unique alias (e.g., \`https://tinyurl.com/abc123\`). When users visit the short URL, they are **HTTP 301 redirected** to the original URL. Key challenges: **generating unique short keys** at scale, **handling 100M+ URLs**, **low-latency redirection** (<10ms), **analytics tracking**, and **custom alias** support. The system uses a **base-62 encoding** (a-z, A-Z, 0-9 = 62 chars) for compact keys, a distributed **key generation service** (snowflake-like ID or pre-generated key pool), and a **caching layer** (Redis) for hot URLs. At scale, serve 10B+ redirects/month with 99.99% availability.

## 2. Definition

A **URL shortener** is a web service that converts long, unwieldy URLs into short aliases that redirect to the original URL. The short URL typically consists of the service domain followed by a **unique alphanumeric key** (6-8 characters). The system stores the mapping in a database and performs an **HTTP redirect** (301 Moved Permanently or 302 Found) when the short URL is accessed.

Core data model:
- Short key (PK): \`abc123\` (7 chars, base-62)
- Original URL: \`https://www.example.com/very/long/path?with=params&and=more\`
- Created at: timestamp
- Expires at: optional TTL
- User ID: optional owner

## 3. Why It Exists / Problem It Solves

URL shortening solves several practical problems:
- **Character limits**: Twitter's original 140-char limit made long URLs impossible to share.
- **Memorability**: Short links are easier to share verbally, in print, or in SMS.
- **Tracking & Analytics**: Short links act as a proxy for click-through rate (CTR) measurement.
- **Link management**: Brands use custom short domains for consistent link branding (e.g., \`amzn.to\`).
- **QR codes**: Short URLs fit better in QR codes (denser encoding for shorter strings).

## 4. When to Use It

- **Social media sharing**: Twitter, LinkedIn, SMS where character count matters.
- **Email marketing**: Track click rates per campaign.
- **QR code generation**: Shorter URLs = less dense QR patterns = easier scanning.
- **Affiliate marketing**: Track which partners drive traffic.
- **SMS/MMS campaigns**: Character limits in text messages.

## 5. When NOT to Use It / Tradeoffs

- **Security risk**: Short URLs hide the destination. Malicious actors use them for phishing (URL obscurity).
- **Link rot**: If the shortening service shuts down, all short links break (single point of dependency).
- **Redirect latency**: Each redirect adds an extra HTTP round trip (100-300ms).
- **SEO concerns**: Redirects dilute link equity (301 passes most, 302 passes none).
- **Custom domains**: Need to support vanity domains for enterprise customers.
- **Hot links with TTL**: Expired short URLs lead to 404 errors for users.

## 6. System Design Deep Dive

**Capacity Estimation** (100M new URLs/month, 10B redirects/month):

| Metric | Value |
|--------|-------|
| Write QPS | 100M / (30*24*3600) ≈ **38 writes/sec** |
| Peak writes | **~100 writes/sec** (3x spike) |
| Read QPS | 10B / (30*24*3600) ≈ **3,860 reads/sec** |
| Peak reads | **~12,000 reads/sec** |
| Storage (7 years) | 100M * 12 * 7 ≈ **8.4B URLs** → ~**2TB** (250 bytes/row) |
| Cache (20% hot, 1 day TTL) | 12,000 * 3600 * 24 * 0.2 ≈ **200M entries** → ~**32GB** Redis |

**Key Generation Strategies**:

1. **Base-62 encoding of auto-increment ID**:
   - Use distributed unique ID generator (Snowflake, or DB sequence).
   - Encode ID to base-62: \`abc123\` = 62^6 ≈ 56B combinations (6 chars is enough).
   - Pros: Simple, collisions impossible, sequential keys.
   - Cons: Predictable keys (security concern), need ID generator.

2. **Pre-generated key pool**:
   - A key-generation service pre-generates K random keys and stores them in a DB table.
   - When a URL creation request arrives, grab a pre-generated key and mark it used.
   - Pros: Very fast (no encoding at write time), keys are random.
   - Cons: Need to manage pool size, potential for exhaustion.

3. **Hash-based (MD5/SHA-256)**:
   - Hash the original URL + salt, take first 7 chars of base-62 encoded hash.
   - Pros: Deterministic for same URL (dedup possible).
   - Cons: Collision handling needed, CPU overhead.

**Recommended: Base-62 with Snowflake ID** for most systems.

## 7. Architecture Diagram (C4)

\`\`\`
Context Level:
  [User] -> [URL Shortener Service] -> [Internet] -> [Original URL Host]

Container Level:
  [Client] -> [DNS] -> [CDN] -> [Load Balancer] -> [Web Servers (API)]
                                                       |
                    +------------------+----------------+
                    |                  |                 |
              [Redis Cache]    [Key Gen Service]   [DB (Cassandra/SQL)]
                                                     |
                                              [Analytics Pipeline]
                                                    |
                                              [Spark/Hadoop]

Component Level:
  POST /shorten:  Client -> API -> Auth -> Key Gen -> DB Insert -> Cache Set -> Response
  GET /{key}:     Client -> API -> Cache Check (miss) -> DB Read -> Cache Set -> 301 Redirect
\`\`\`

## 8. Real-World Flow Example

1. User pastes \`https://www.example.com/very/long/article?utm_source=twitter&utm_medium=social\` into TinyURL.
2. Browser sends \`POST /api/v1/shorten\` with JSON body \`{"url": "...", "custom": null}\`.
3. Load balancer routes request to an available web server.
4. Web server validates URL (check format, optionally make HEAD request to verify it's reachable).
5. Server calls **Key Generation Service**: returns \`aB3xK9m\` (base-62 encoded Snowflake ID).
6. Server inserts into DB: \`INSERT INTO urls (short_key, original_url, created_at) VALUES ('aB3xK9m', '...', NOW())\`.
7. Server caches in Redis: \`SET aB3xK9m "https://www.example.com/..." EX 86400\`.
8. Response returns: \`{"short_url": "https://tinyurl.com/aB3xK9m", "key": "aB3xK9m"}\`.
9. User shares link on Twitter.
10. 1000 users click the link. Each click: DNS resolves, request hits API.
11. API extracts \`aB3xK9m\` from path, checks Redis (hit after first click).
12. API sends \`301 Moved Permanently\` with \`Location: https://www.example.com/...\`.
13. Browser follows redirect. Analytics pipeline logs the click asynchronously.

## 9. API & Data Model Design

**REST API Endpoints**:

\`\`\`
POST   /api/v1/url/shorten
  Request:  { "url": "https://...", "customAlias": "mybrand", "ttlSeconds": 86400 }
  Response: { "shortUrl": "https://tiny.url/mybrand", "key": "mybrand", "expiresAt": "..." }

GET    /{shortKey}
  Response: 301 Location: original URL (redirect)

DELETE /api/v1/url/{shortKey}
  Response: 200 OK

GET    /api/v1/url/{shortKey}/stats
  Response: { "clicks": 12345, "lastClicked": "...", "topReferrers": [...] }

POST   /api/v1/url/batch
  Request:  { "urls": ["https://...", "https://..."] }
  Response: { "shortUrls": [...] }
\`\`\`

**Database Schema**:

\`\`\`sql
-- URLs table
CREATE TABLE urls (
    id BIGINT PRIMARY KEY,             -- Snowflake ID
    short_key VARCHAR(10) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    user_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_custom BOOLEAN DEFAULT FALSE,
    INDEX idx_short_key (short_key),
    INDEX idx_user_id (user_id)
);

-- Click analytics table (OLAP / time-series)
CREATE TABLE clicks (
    id BIGINT PRIMARY KEY,
    short_key VARCHAR(10) NOT NULL,
    clicked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    referrer VARCHAR(512),
    user_agent TEXT,
    ip_address VARCHAR(45),
    country VARCHAR(2),
    device_type VARCHAR(20),
    INDEX idx_short_key_time (short_key, clicked_at)
) PARTITION BY RANGE (YEAR(clicked_at));
\`\`\`

## 10. Real Company Use Cases

- **bit.ly**: The most popular URL shortener for social media. Processes ~10B redirects/month. Uses custom short domains (bit.ly, j.mp). Provides real-time click analytics.
- **TinyURL**: One of the first URL shorteners (2002). Simple, no-auth service. Still handles millions of redirects daily.
- **Rebrandly**: Enterprise-focused URL shortener with custom domains, team management, and link routing.
- **t.co**: Twitter's internal URL shortener. Auto-shortens all links posted on Twitter for spam detection and analytics. Twitter requires all links go through t.co.
- **YouTube**: Uses \`youtu.be\` short links for mobile sharing of videos.
- **Amazon**: Uses \`amzn.to\` for product links in affiliate marketing, SMS, and email campaigns.
- **Google URL Shortener (goo.gl)**: Deprecated March 2019. Was widely used for Google services and Google Analytics integration.

## 11. Common Interview Questions

1. *How do you generate unique short keys at scale without collisions?*
2. *What's the difference between 301 and 302 redirect? Which would you use?*
3. *How do you handle custom aliases? What if someone wants "mybrand" but it's taken?*
4. *Design the database schema for 1B+ URLs with click analytics.*
5. *How do you prevent malicious users from shortening phishing URLs?*
6. *How would you support custom domains (enterprise feature)?*
7. *What caching strategy would you use for 99th percentile latency < 10ms?*
8. *How do you handle URL expiration and cleanup?*

## 12. Related Topics & Next Steps

- **Base-62 encoding**: Compact key representation and reversible encoding.
- **Snowflake ID generator**: Distributed unique ID generation without coordination.
- **HTTP Redirects**: 301 vs 302 semantics, caching behavior, SEO implications.
- **Click Analytics Pipeline**: Real-time vs batch analytics for billion-scale data.
- **Bloom Filters**: Efficiently check if short key exists before attempting insertion.
- **Next Lesson**: Design WhatsApp / Messenger (Chat).`,
    estimatedMin: 35,
    difficulty: 'INTERMEDIATE',
    companies: ['TinyURL', 'bit.ly', 'Twitter', 'Rebrandly', 'YouTube', 'Amazon'],
    tags: ['url-shortener', 'base62', 'redirect', 'caching', 'analytics', 'key-generation']
  },
  {
    id: 'lesson-08-02',
    slug: 'system-design-interviews-02-design-whatsapp-messenger',
    title: 'Design WhatsApp / Messenger (Chat)',
    content: `## 1. Quick Summary

Designing a **real-time chat application** like WhatsApp or Facebook Messenger is a foundational system design problem. The system must support **1-on-1 messaging**, **group chats**, **message delivery status** (sent/delivered/read), **media sharing** (images, videos, documents), **end-to-end encryption**, and **offline message sync** across multiple devices. At WhatsApp scale (2B+ users, 100B+ messages/day), the architecture requires **WebSocket persistent connections** for real-time delivery, a **message queue** (Kafka) for durability, **distributed session management** for multi-device support, and a **NoSQL database** (Cassandra) for time-series message storage. The **fan-out** pattern delivers group messages efficiently: for small groups (≤256 users), store one copy per recipient; for large groups (broadcasts), store once with a read-index.

## 2. Definition

A **real-time chat system** enables instantaneous text, media, and voice messaging between users. Key characteristics:
- **Low latency**: Messages delivered in <100ms (median).
- **Delivery guarantees**: At-least-once delivery with dedup (idempotency keys).
- **Delivery status**: Sent (server received), Delivered (recipient's device received), Read (recipient opened).
- **Multi-device**: Same account on phone, desktop, web — messages sync across all.
- **End-to-end encryption**: Only sender and recipient can decrypt message content.
- **Presence**: Online/offline/last-seen indicators.

## 3. Why It Exists / Problem It Solves

Before modern chat apps, communication was: SMS (costly, no read receipts), email (slow, not real-time), or IRC (no offline sync). WhatsApp solved:
- **Free messaging**: Over data/WiFi instead of SMS (saved users $450B+ in SMS fees globally).
- **Cross-platform**: Same experience on iOS, Android, Web, Desktop.
- **Group communication**: Broadcasts, polls, admin controls.
- **Rich media**: Photos, videos, voice notes, documents, location sharing.
- **Privacy**: End-to-end encryption by default (Signal Protocol).

## 4. When to Use It

- **Personal messaging**: 1-on-1 chat with delivery status and read receipts.
- **Group coordination**: Team chats, family groups, event planning (up to 1024 users per group on WhatsApp).
- **Business messaging**: WhatsApp Business API for customer support, order updates, appointment reminders.
- **Broadcast lists**: Send a message to multiple recipients without creating a group.
- **Community features**: Large-scale announcement groups with threaded replies.

## 5. When NOT to Use It / Tradeoffs

- **Not a replacement for email**: No formal threading, search is basic, no labels/folders.
- **Not for formal communication**: No message retention policies (unless business), no e-discovery.
- **Media storage costs**: Images and videos are stored on servers temporarily. WhatsApp deletes undownloaded media after 30 days.
- **End-to-end encryption limits**: Server can't read messages, so no server-side search, spam detection on content, or cloud backup (unless user provides encryption key).
- **Multi-device complexity**: Each device maintains separate encryption sessions. Messages must be fanned out to all devices.
- **Bandwidth**: Large media files can strain servers. WhatsApp compresses images to ~100KB.

## 6. System Design Deep Dive

**WebSocket Connection Lifecycle**:
1. Client connects to chat server via WebSocket (\`wss://chat.whatsapp.com\`).
2. Server authenticates the connection (verify JWT or session token).
3. Server maintains a map: \`userId -> WebSocket connection\` (in memory + Redis for failover).
4. Client sends heartbeat every 30 seconds to keep connection alive.
5. On disconnect, server marks user as offline, starts offline message buffering.

**Message Delivery Flow** (1-on-1):
1. Alice sends message to Bob. Client sends \`SEND_MESSAGE\` command via WebSocket.
2. Chat server receives, assigns a globally unique **message ID** (snowflake format).
3. Server persists message to **Cassandra** in both Alice's "sent" partition and Bob's "inbox" partition.
4. Server pushes message to Bob's WebSocket (if connected). Bob's client sends \`ACK\` (received).
5. Server updates delivery status. When Bob opens chat, sends \`READ_RECEIPT\`.
6. Server propagates status updates back to Alice's device.

**Fan-Out for Group Messages**:

| Group Size | Strategy | Pros | Cons |
|-----------|----------|------|------|
| Small (≤32) | Write to each member's inbox | Simple, easy to implement | O(n) writes per message |
| Medium (32-256) | Write to each member's inbox + read index | Balanced | Still O(n) writes |
| Large (>256) | Write once to group timeline | Read index per user | Read-time merge with timeline |

WhatsApp uses hybrid: small groups get full fan-out. Large broadcast lists use the **read-index pattern**: message stored once in group partition, each user's read index tracks their position.

## 7. Architecture Diagram (C4)

\`\`\`
System Context:
  [User A Phone] <--WebSocket--> [Chat Service] <--WebSocket--> [User B Phone]
                                   |
  [User A Desktop] <--WebSocket----+

Container Diagram:
  [Client Apps] -> [Cloudflare] -> [LB] -> [Chat API Servers]
                                              |
          +-----------+-----------+-----------+-----------+
          |           |           |                       |
    [Redis PubSub]  [Kafka]    [Cassandra]          [Media CDN]
    (presence,     (message   (message store,       (images, videos,
     typing)        queue)     user sessions)         documents)

Component Diagram - Message Send:
  Sender -> WebSocket -> Chat Server
                           |
                     [Validate & Encrypt]
                           |
                     [Assign Msg ID]
                           |
          +----------------+----------------+
          |                |                |
     [Kafka Topic]   [Cassandra Write]  [Redis PubSub]
     (async backup)  (persistence)      (real-time push)
          |                |
     [Receiver WebSocket]  [Offline if disconnected]
\`\`\`

## 8. Real-World Flow Example

1. **Alice opens WhatsApp** on her phone. Client establishes WebSocket connection \`wss://va.whatsapp.net\`. Client sends authentication packet with device ID and auth token.
2. **Alice types a message** "Hey Bob! See you at 6pm?" Client shows single gray tick (sent from device).
3. **Client sends** protobuf-encoded message: \`{messageId: "msg_abc123", to: "bob_uid", type: "text", payload: "Hey Bob! See you at 6pm?", timestamp: 1710000000}\`.
4. **Chat server** receives, decodes, validates. Checks Bob's connection status in Redis (\`user:bob_uid:connection -> websocket_server_5\`).
5. **Server persists** to Cassandra: \`INSERT INTO messages (conv_id, message_id, from_uid, to_uid, content, status, created_at) VALUES ('alice_bob', 'msg_abc123', 'alice_uid', 'bob_uid', 'encrypted_blob', 'sent', NOW())\`.
6. **Server pushes** to Bob's WebSocket (server 5). Message appears on Bob's phone. Bob's phone sends back \`ACK\` with message ID.
7. **Server updates status** to "delivered". Pushes delivery receipt to Alice's WebSocket. Alice sees double gray ticks.
8. **Bob opens the chat**. His phone sends \`READ_RECEIPT\` for msg_abc123.
9. **Server updates** Cassandra status to "read". Pushes read receipt to Alice. Alice sees double blue ticks.
10. **Alice's desktop** also receives the message via its own WebSocket session (multi-device sync).

## 9. API & Data Model Design

**WebSocket Commands** (binary protobuf):

\`\`\`protobuf
message ClientMessage {
  string message_id = 1;
  enum Type { TEXT = 0; IMAGE = 1; VIDEO = 2; AUDIO = 3; DOCUMENT = 4; LOCATION = 5; }
  Type type = 2;
  string recipient_id = 3;       // user ID or group ID
  string payload = 4;            // encrypted content
  int64 timestamp = 5;
  string reply_to_message_id = 6;
}

message ServerMessage {
  string message_id = 1;
  enum Type { MESSAGE = 0; DELIVERY_ACK = 1; READ_ACK = 2; PRESENCE = 3; TYPING = 4; }
  Type type = 2;
  string from_id = 3;
  string payload = 4;
  int64 timestamp = 5;
}
\`\`\`

**Database Schema**:

\`\`\`sql
-- Messages table (Cassandra-style CQL)
CREATE TABLE messages_by_conversation (
    conversation_id TEXT,          -- deterministic: sorted(user1, user2) or group_id
    message_id TIMEUUID,           -- time-based UUID for sorting
    sender_id TEXT,
    recipient_id TEXT,             -- user ID or group ID
    content BLOB,                  -- encrypted message body
    message_type INT,              -- 0=text, 1=image, ...
    media_path TEXT,               -- CDN URL for media
    status INT,                    -- 0=sent, 1=delivered, 2=read
    created_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (conversation_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);

-- User devices table
CREATE TABLE user_devices (
    user_id TEXT,
    device_id TEXT,
    device_type TEXT,              -- '"'"'phone'"'"', '"'"'desktop'"'"', '"'"'web'"'"'
    registration_id TEXT,          -- for push notifications
    last_seen TIMESTAMP,
    PRIMARY KEY (user_id, device_id)
);

-- Group participants
CREATE TABLE group_participants (
    group_id TEXT,
    user_id TEXT,
    joined_at TIMESTAMP,
    role INT,                      -- 0=member, 1=admin, 2=creator
    PRIMARY KEY (group_id, user_id)
);
\`\`\`

## 10. Real Company Use Cases

- **WhatsApp (Meta)**: 2B+ users, 100B+ messages/day. Uses custom **Ejabberd** (Erlang XMPP server) variant for connection management, **Apache Kafka** for message queuing, **Cassandra** for message storage, **ScyllaDB** for some workloads. End-to-end encryption via **Signal Protocol**.
- **Facebook Messenger**: 1B+ users. Uses **MQTT** protocol (lightweight publish-subscribe) for real-time messaging. Built on **Haskell** servers for connection management. Uses **TAO** (Facebook's distributed graph) for social graph queries.
- **iMessage (Apple)**: Uses **APNs** (Apple Push Notification service) for delivery. End-to-end encrypted. Messages stored in **CloudKit** for iCloud sync.
- **Telegram**: 900M+ users. Uses **MTProto** protocol. Supports **1M+ member groups**, **channels** for broadcasting. Cloud-based (no E2EE by default, Secret Chats are E2EE). Uses **PostgreSQL** and custom NoSQL layer.
- **Slack**: Enterprise team chat. Uses **WebSockets** (RTM API) and **HTTP API**. **Kafka** for message pipeline, **Cassandra** for message store, **Elasticsearch** for search.

## 11. Common Interview Questions

1. *How does WhatsApp ensure a message is delivered exactly once?*
2. *Design the multi-device synchronization for a chat app.*
3. *How would you implement end-to-end encryption for a group chat with 100 members?*
4. *Design the presence system (online/offline/last-seen) for 100M concurrent users.*
5. *How does WhatsApp send images and videos? Design the media upload and CDN integration.*
6. *Design the fan-out strategy for a group with 1M members (like Telegram channels).*
7. *How would you implement message search for a chat app with 500B messages?*
8. *Design the typing indicator system (real-time, low-latency, scalable).*

## 12. Related Topics & Next Steps

- **WebSocket Protocol**: Persistent full-duplex communication for real-time apps.
- **Pub/Sub Systems**: Redis PubSub, Kafka for message fan-out.
- **E2E Encryption**: Signal Protocol, Double Ratchet Algorithm, X3DH.
- **Cassandra Time-Series**: Partitioning strategies for message data.
- **Multi-Device Architecture**: Session management across devices.
- **Next Lesson**: Design YouTube / Netflix (Video Streaming).`,
    estimatedMin: 40,
    difficulty: 'INTERMEDIATE',
    companies: ['WhatsApp', 'Meta', 'Facebook Messenger', 'Telegram', 'Apple iMessage', 'Slack'],
    tags: ['chat', 'websocket', 'real-time', 'messaging', 'e2ee', 'fan-out']
  },
  {
    id: 'lesson-08-03',
    slug: 'system-design-interviews-03-design-youtube-netflix',
    title: 'Design YouTube / Netflix (Video Streaming)',
    content: `## 1. Quick Summary

Designing a **video streaming platform** like YouTube or Netflix requires building a system that ingests, processes, stores, and delivers video content to millions of concurrent viewers worldwide. The core challenges: **encoding videos into multiple bitrates** (360p to 4K HDR), **adaptive bitrate streaming** (ABR) using HLS/DASH protocols, **CDN distribution** for low-latency playback, **recommendation engine** for content discovery, and **handling 500+ hours of uploads per minute** (YouTube scale). The architecture includes an **upload pipeline** (chunked upload → transcoding queue → CDN distribution), a **playback pipeline** (CDN edge → client ABR logic), and **metadata services** (Elasticsearch for search, Cassandra for view counts). At Netflix scale (250M+ subscribers), the system also handles **regional licensing**, **DRM**, and **offline downloads**.

## 2. Definition

A **video streaming platform** allows users to upload, process, and view video content over the internet. Key capabilities:
- **Upload ingestion**: Accept large video files (up to 4K/8K, HDR) and validate integrity.
- **Transcoding/Encoding**: Convert uploaded video into multiple resolutions and codecs (H.264, H.265, VP9, AV1).
- **Adaptive Bitrate Streaming (ABR)**: Client automatically selects the best quality based on network conditions.
- **Content Delivery Network (CDN)**: Cache video segments at edge locations close to users.
- **Recommendation System**: Personalize content feed based on viewing history, likes, and demographics.
- **DRM & Licensing**: Protect copyrighted content from unauthorized access.

## 3. Why It Exists / Problem It Solves

Before YouTube (2005), sharing video online was nearly impossible: email attachments maxed at 10MB, no streaming protocols existed for web, and hosting video required expensive dedicated servers. YouTube solved:
- **Consumer video upload**: Anyone can upload and share video for free.
- **Streaming without download**: Progressive download → true streaming with Flash → HTML5 video.
- **Worldwide distribution**: CDN caching makes video fast everywhere.
- **Monetization**: Ad revenue sharing for creators (YouTube Partner Program).
- **Live streaming**: Real-time video delivery at massive scale.
- **Netflix solved**: Replacing physical DVD rental with instant streaming (2007). Pioneered adaptive streaming and CDN appliance (Open Connect).

## 4. When to Use It

- **Video hosting/sharing**: Creators uploading content for public audience.
- **Subscription streaming**: Netflix, Disney+, HBO Max for licensed content.
- **Live streaming**: Twitch for gaming, YouTube Live for events, Zoom for meetings.
- **Educational platforms**: Coursera, Udemy for course video delivery.
- **Enterprise video**: Internal training videos, town halls (Vimeo, Panopto).
- **User-generated content**: TikTok, Instagram Reels (short-form video).

## 5. When NOT to Use It / Tradeoffs

- **Extremely high infrastructure costs**: CDN bandwidth is the #1 cost. Netflix spends ~$1B/year on CDN. YouTube pays billions in bandwidth.
- **Latency vs quality tradeoff**: Live streaming has 10-30s delay. Low-latency streaming requires WebRTC (higher cost).
- **Storage costs**: Raw footage is huge. YouTube stores all original uploads (exabyte-scale). Compression reduces delivered size but increases CPU cost.
- **Encoding complexity**: Transcoding a 4K video takes hours. Need massive GPU/ASIC clusters (YouTube uses VP9 hardware encoders).
- **DRM friction**: DRM breaks some browsers/devices. Users can't easily download/copy protected content.
- **Regional licensing**: Netflix has different catalogs per country. Content must be geo-blocked.

## 6. System Design Deep Dive

**Upload Pipeline**:
1. Client uploads video in **chunks** (e.g., 5MB each) via resumable upload protocol.
2. API server validates each chunk, stores in **temporary blob storage**.
3. On completion, API creates a **transcoding job** message in Kafka.
4. **Transcoding workers** (GPU/ASIC-accelerated) pull jobs, perform:
   - **Inspection**: Validate container format (MP4, MOV), codec, resolution.
   - **Segmenting**: Split video into 2-10 second segments (GOP-aligned).
   - **Encoding**: Encode each segment to target bitrates (e.g., 144p, 360p, 720p, 1080p, 4K).
   - **Packaging**: Generate HLS manifest (.m3u8) and DASH manifest (.mpd).
   - **Thumbnails**: Extract frames at intervals, generate thumbnail strips.
5. Upload segments to **CDN origin** storage.
6. Update **metadata service** (Elasticsearch) with video title, description, thumbnails.

**Playback Pipeline**:
1. Client requests video playback. Player fetches **manifest file** from CDN.
2. Manifest lists available resolutions, segment URLs, and codecs.
3. Player starts with **highest safe bitrate** based on detected bandwidth.
4. ABR algorithm downloads segments sequentially. If buffer fills fast, upgrade to higher resolution. If buffer drains, downgrade.
5. Player prefetches 2-3 segments ahead for smooth playback.
6. CDN edge serves segments from cache. Misses go to origin server.

**CDN Architecture**:
- YouTube uses **Google Global Cache** (GGC appliances in ISP data centers).
- Netflix uses **Open Connect Appliances** (OCAs) — custom FreeBSD servers at ISP peering points.
- Tier 1: Edge caches (ISP POPs). Tier 2: Regional caches. Tier 3: Origin servers.

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [Upload Client] -> [LB] -> [Upload API] -> [Kafka] -> [Transcoding Workers]
                                                              |
                                                    [GPU Farm]
                                                              |
                                            +--------+--------+--------+
                                            |        |        |        |
                                     [CDN Origin] [Metadata DB] [Thumbnail Gen]
                                            |
                                    [CDN Edge Servers]
                                            |
  [Viewer Client] <--HLS/DASH--- [CDN Edge Cache] (ISP POP)

Component Diagram - Playback:
  User clicks video
     |
  Player fetches manifest.m3u8 from CDN
     |
  Manifest lists: 360p_000.ts, 360p_001.ts, ..., 1080p_000.ts, ...
     |
  ABR Selector: determines initial bitrate
     |
  Segment Downloader: downloads .ts segments in order
     |
  Buffer Manager: controls prefetching
     |
  Decoder -> Render

Netflix Open Connect:
  [OCA in ISP A] <---> [OCA in ISP B] <---> [OCA in ISP C]
       |                      |                     |
  [Netflix Origin] <--- Regional routing tables
\`\`\`

## 8. Real-World Flow Example

1. **Creator uploads** a 4K HDR video (20GB). YouTube client splits into 4MB chunks, uploads in parallel.
2. **Upload API** receives chunks, stores in GCS (Google Cloud Storage). Each chunk verified by checksum.
3. **Upload completes**. YouTube sends email: "Your video is being processed."
4. **Transcoding job** queued in Kafka. A **VP9 hardware encoder** pod picks up the job.
5. Video is segmented into 6-second GOP-aligned segments. Encoded to: 144p (H.264), 360p (VP9), 720p (VP9), 1080p (VP9), 4K (VP9.2 HDR), 8K (AV1).
6. **Thumbnail generator** extracts frames at 0s, 5s, 10s, 30s, 60s. Generates 3 thumbnail sizes.
7. **Speech-to-text** generates captions. **Content ID** scans for copyright matches.
8. Manifest files generated: HLS (.m3u8), DASH (.mpd).
9. All segments uploaded to **Google CDN** (edge cache). Video goes live.
10. **Viewer in India** clicks the video. Player fetches manifest from nearest CDN edge (GGC in Mumbai ISP).
11. Player detects 5 Mbps bandwidth, selects 1080p stream. Downloads segments sequentially.
12. ABR detects stable 50ms latency, stays at 1080p. Prefetches 3 segments ahead.
13. 30 seconds in, network drops to 1 Mbps. ABR downgrades to 360p. Buffer avoids stall.
14. Network recovers. ABR upgrades to 720p, then 1080p.

## 9. API & Data Model Design

**REST API Endpoints**:

\`\`\`
POST   /api/v1/videos/upload/init
  Request:  { "filename": "my_video.mp4", "size": 21474836480, "contentType": "video/mp4" }
  Response: { "uploadId": "up_abc123", "chunkSize": 4194304, "chunkUrls": [...] }

PUT    /api/v1/videos/upload/{uploadId}/chunk/{chunkNumber}
  Headers: Content-Range: bytes 0-4194303/21474836480
  Response: 201 Created

POST   /api/v1/videos/upload/{uploadId}/complete
  Response: { "videoId": "vid_xyz789", "status": "processing" }

GET    /api/v1/videos/{videoId}/manifest
  Response: { "hls": "https://cdn.example.com/manifest.m3u8", "dash": "..." }

GET    /api/v1/videos/{videoId}
  Response: { "title": "...", "duration": 1234, "thumbnails": [...], "views": 56789 }
\`\`\`

**Database Schema**:

\`\`\`sql
CREATE TABLE videos (
    video_id TEXT PRIMARY KEY,
    upload_id TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    channel_id TEXT NOT NULL,
    duration_seconds INT,
    status INT,                    -- 0=uploading, 1=processing, 2=ready, 3=error
    privacy INT,                   -- 0=public, 1=unlisted, 2=private
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_channel_id (channel_id)
);

CREATE TABLE video_renditions (
    id BIGINT PRIMARY KEY,
    video_id TEXT NOT NULL,
    resolution TEXT NOT NULL,      -- '"'"'144p'"'"', '"'"'360p'"'"', '"'"'720p'"'"', '"'"'1080p'"'"', '"'"'4K'"'"'
    codec TEXT NOT NULL,           -- '"'"'h264'"'"', '"'"'vp9'"'"', '"'"'av1'"'"'
    bitrate_kbps INT,
    segment_duration_seconds INT,
    manifest_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    INDEX idx_video_rendition (video_id)
);

CREATE TABLE video_views (
    video_id TEXT,
    viewed_at TIMESTAMP,
    viewer_id TEXT,
    watch_time_seconds INT,
    country TEXT,
    device_type TEXT,
    PRIMARY KEY (video_id, viewed_at, viewer_id)
);
\`\`\`

## 10. Real Company Use Cases

- **YouTube (Google)**: 500+ hours of video uploaded per minute. 2B+ monthly active users. Uses **Google Cloud Storage** for raw uploads, **Google CDN** (GGC) for delivery, **VP9** and **AV1** codecs for compression. **Content ID** system scans 100+ years of video daily for copyright.
- **Netflix**: 250M+ subscribers, 15K+ titles. Uses **AWS** and its own **Open Connect CDN** (17,000+ appliances in 1,000+ ISP locations). **Chaos Monkey** tests resilience. Custom **encoding pipeline** (per-title encoding optimization).
- **Twitch (Amazon)**: Live streaming for gaming. Uses **WebRTC** for sub-second latency (Twitch Enhanced Broadcasting). **HLS** for VOD. **Amazon CloudFront** CDN. Supports 2.5M+ concurrent viewers for major events.
- **TikTok (ByteDance)**: Short-form video (15s-10min). Uses **custom CDN** with edge computing. **Recommendation engine** (For You Page) drives engagement. Processes 1M+ video uploads per day.
- **Disney+**: Uses **BAMTech** (MLB Advanced Media technology) for streaming. **AWS** + **Akamai** CDN. Launched with 10M+ subscribers on day one.

## 11. Common Interview Questions

1. *Design the video upload pipeline for a platform like YouTube.*
2. *How does adaptive bitrate streaming work? Explain HLS/DASH.*
3. *Design the recommendation system for Netflix/YouTube.*
4. *How would you reduce bandwidth costs for video delivery?*
5. *Design a live streaming system with <5 second latency.*
6. *How does Netflix'"'"''"'"'s Open Connect CDN work?*
7. *Design the transcoding pipeline — what codecs and resolutions do you support?*
8. *How would you implement watch history and resume playback across devices?*

## 12. Related Topics & Next Steps

- **HLS vs DASH**: Adaptive streaming protocols compared.
- **VP9 vs AV1**: Next-generation video codecs and encoding tradeoffs.
- **CDN Architecture**: Edge caching, origin shield, cache hierarchy.
- **ABR Algorithms**: Buffer-based vs rate-based, BOLA, MPC.
- **DRM Systems**: Widevine, FairPlay, PlayReady — how they protect content.
- **Recommendation Systems**: Collaborative filtering, deep learning, Explore-Exploit.
- **Next Lesson**: Design Uber / Lyft (Ride Hailing).`,
    estimatedMin: 45,
    difficulty: 'ADVANCED',
    companies: ['YouTube', 'Netflix', 'Twitch', 'TikTok', 'Disney+', 'Google'],
    tags: ['video-streaming', 'cdn', 'transcoding', 'hls', 'abr', 'recommendation']
  },
  {
    id: 'lesson-08-04',
    slug: 'system-design-interviews-04-design-uber-lyft',
    title: 'Design Uber / Lyft (Ride Hailing)',
    content: `## 1. Quick Summary

Designing a **ride-hailing platform** like Uber or Lyft requires coordinating **riders**, **drivers**, and **dispatch** in real-time over a geographic area. The core system must: match riders to nearby drivers (<10 seconds), compute **ETAs** using traffic-aware routing, calculate **dynamic pricing** (surge), process payments, and handle **trip lifecycle** (request → accept → pickup → ride → dropoff → payment). At Uber scale (25M+ trips/day), the architecture uses **quadtree** or **grid-based** spatial indexing for driver discovery, **Geohash** for location bucketing, **Kafka** for real-time location streams, **Ringpop** for consistent hashing across dispatch servers, and **ML models** for ETA prediction and surge pricing. The **supply-demand** optimization problem is solved via **dynamic pricing** with price elasticity models.

## 2. Definition

A **ride-hailing system** connects passengers with drivers via a mobile platform. Key components:
- **Rider app**: Request ride, see ETA, track driver, pay.
- **Driver app**: Receive trip requests, navigate, accept payments.
- **Dispatch service**: Match riders to drivers based on proximity, ETA, pricing.
- **Mapping & Routing**: Compute ETAs, optimal routes, traffic conditions.
- **Pricing Engine**: Base fare + time/distance + surge multiplier.
- **Payment System**: Process credit cards, digital wallets, split fare.

## 3. Why It Exists / Problem It Solves

Before Uber (2009), hailing a taxi meant: standing on a street corner waving (inefficient), calling a dispatcher (slow, no tracking), or calling a taxi company (unreliable). Uber solved:
- **Instant booking**: Tap a button, car arrives in 5-10 minutes.
- **Transparent pricing**: Upfront fare estimate — no haggling, no hidden fees.
- **Driver tracking**: See your driver'"'"''"'"'s location and ETA in real-time.
- **Cashless payments**: Auto-charge credit card — no fumbling for cash.
- **Rating system**: Both parties rate each other, improving quality.
- **Driver flexibility**: Drivers choose when to work (independent contractor model).

## 4. When to Use It

- **City transportation**: Primary use case — point A to point B in urban areas.
- **Airport transfers**: Scheduled and on-demand airport rides.
- **Food delivery**: Uber Eats, Uber Direct (package delivery).
- **Freight/logistics**: Uber Freight connects shippers with truck drivers.
- **Bike/scooter sharing**: Uber Jump (electric bikes/scooters).
- **Public transit integration**: Uber Transit shows public transport options.

## 5. When NOT to Use It / Tradeoffs

- **Low density areas**: Few drivers → long wait times, high surge pricing.
- **Surge pricing backlash**: Customers dislike 2-5x multipliers during peak demand.
- **Driver churn**: High turnover due to low earnings after platform fees (Uber takes 25-30%).
- **Regulatory challenges**: Many cities restrict or ban ride-hailing (licensing, insurance requirements).
- **Traffic dependency**: ETA accuracy depends on real-time traffic data quality.
- **Safety concerns**: Driver/rider vetting, background checks, incident response.
- **Not profitable at scale**: Uber, Lyft have rarely posted annual profits due to subsidies and R&D costs.

## 6. System Design Deep Dive

**Spatial Indexing for Driver Discovery**:

The fundamental operation: find nearest N active drivers to a rider'"'"''"'"'s location.

1. **Geohash** (Uber uses Hexagonal Hierarchical Spatial Index — H3):
   - Divide the world into a grid of cells (Geohash precision: 5 for city neighborhoods, 7 for street-level).
   - Each driver broadcasts their current Geohash cell via WebSocket every 3-5 seconds.
   - Redis/SortedSet maps: \`geohash_cell -> Set<driver_id>\`.
   - When rider requests, compute rider'"'"''"'"'s Geohash, query neighboring cells.

2. **QuadTree** (alternative):
   - In-memory spatial tree partitioning the service area.
   - Drivers inserted as points. Range query for nearest neighbors.

3. **H3 Hexagonal Grid** (Uber'"'"''"'"'s solution):
   - Uses hexagons (consistent distance from center to edge).
   - **Hierarchical**: resolution 0 to 15. Resolution 9 averages ~174m per hexagon.
   - Enables consistent nearest-neighbor search across all cells.

**Dispatch Algorithm**:
1. Rider requests ride (\`POST /api/v1/ride/request\`).
2. Dispatch server determines rider'"'"''"'"'s H3 cell + neighboring cells (6 + 12 + 18 = 36 cells).
3. Query Redis for drivers in these cells. Filter by status (available), driver type (UberX, XL, Black).
4. If no drivers: expand search radius (next ring of H3 cells), apply surge pricing.
5. For each candidate driver, compute **pickup ETA** (based on real-time traffic and distance).
6. Sort drivers by ETA. Select top N candidates (e.g., 5).
7. Send trip offer to top candidate driver via push notification + WebSocket.
8. Driver has 15 seconds to accept. If reject/timeout, move to next candidate.
9. Once accepted, compute **optimal route** to pickup → route to dropoff.
10. Provide upfront fare to rider (base + time estimate + distance + surge).

**Dynamic Pricing (Surge)**:
- Monitor **supply** (available drivers) and **demand** (ride requests) per geohash cell.
- Compute **surge multiplier** = max(1, demand/supply * elasticity factor).
- Apply to fare calculation. Display surge multiplier to rider before confirmation.

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [Rider App] <--WebSocket/HTTP--> [API Gateway] <--WebSocket/HTTP--> [Driver App]
                                      |
  +--------+--------+--------+--------+--------+--------+--------+
  |        |        |        |        |        |        |        |
 [Auth]  [Rider   [Driver  [Trip    [Payment [Dispatch[Location
  Service] Service] Service] Service] Service] Service] Stream]
                                                     |
  +--------+---------+--------+--------+-------------+--------+
  |        |          |        |        |             |        |
 [Redis   [Kafka    [H3 Grid [Routing [Prediction   [Surge  [Analytics
  Driver   Location] Index]   Service] Service]      Engine]  Pipeline]
  State]   Stream]

Dispatch Flow:
  Rider requests ride
     |
  Dispatch Service: compute H3 neighborhoods
     |
  Redis query: get drivers in H3 cells
     |
  Filter + sort by ETA
     |
  Kafka: send offer to top driver
     |
  Driver accepts (15s timeout)
     |
  Trip service creates ride
     |
  Routing service: compute optimal route
     |
  Push trip details to both apps
\`\`\`

## 8. Real-World Flow Example

1. **Rider opens Uber app** in San Francisco (37.7749°N, 122.4194°W). App sends current location.
2. Rider enters destination (Embarcadero), selects UberX. Tap **Request**.
3. **Dispatch service** receives request with rider H3 cell: \`8928308280fffff\` (resolution 9, ~174m hexagon).
4. Queries Redis: \`H3_8928308280fffff -> set of driver IDs\`. Returns 3 available drivers.
5. Expands to neighboring cells (H3 ring 1): finds 8 more drivers. Ring 2: 15 more. Total: 26 candidates.
6. For each candidate, computes **pickup ETA** via routing service (traffic model, 1-8 minutes).
7. Sorts by ETA. Top 5: [Driver A (2min), Driver B (3min), Driver C (4min), Driver D (4min), Driver E (5min)].
8. Dispatch sends trip offer to **Driver A** via push notification.
9. Driver A has 15 seconds. App plays sound, driver taps **Accept**.
10. Dispatch updates trip state to "accepted". Rider sees driver info, car location, ETA.
11. Driver navigates to pickup (5 blocks away). Rider gets notification: "Your driver is arriving now."
12. Driver arrives. Both parties confirm: **Pickup** (geofence check). Trip starts.
13. During trip: Driver follows navigation. Rider'"'"''"'"'s app shows progress on map.
14. Trip ends at Embarcadero. **Payment service**: compute fare ($15.50 = $2 base + $7.50 distance + $5.00 time + $1.00 booking fee). Charge rider'"'"''"'"'s saved card.
15. Both parties rate each other (1-5 stars). Payment receipt sent to rider. Driver sees earnings.

## 9. API & Data Model Design

**REST API Endpoints**:

\`\`\`
POST   /api/v1/ride/request
  Request:  { "pickupLat": 37.7749, "pickupLng": -122.4194, "dropoffLat": 37.7932, "dropoffLng": -122.3989, "rideType": "uberx" }
  Response: { "tripId": "trip_abc123", "status": "finding_driver", "estimatedFare": 15.50, "estimatedPickupMinutes": 3 }

GET    /api/v1/trip/{tripId}/status
  Response: { "status": "accepted", "driver": { "id": "drv_456", "name": "John", "car": {...}, "location": {...}, "etaMinutes": 2 } }

POST   /api/v1/trip/{tripId}/accept  (driver)
  Response: { "status": "accepted", "pickupLocation": {...} }

POST   /api/v1/trip/{tripId}/start   (driver)
  Request: { "otp": "1234" }  -- rider'"'"''"'"'s PIN
  Response: { "status": "on_trip" }

POST   /api/v1/trip/{tripId}/complete
  Response: { "fare": 15.50, "paymentMethod": "visa_****4242", "receiptUrl": "..." }

POST   /api/v1/location/update (driver WebSocket)
  Payload: { "driverId": "drv_456", "lat": 37.775, "lng": -122.420, "timestamp": 1710000000123 }
\`\`\`

**Database Schema**:

\`\`\`sql
-- Trips table
CREATE TABLE trips (
    trip_id TEXT PRIMARY KEY,
    rider_id TEXT NOT NULL,
    driver_id TEXT,
    pickup_location GEOGRAPHY(POINT) NOT NULL,
    dropoff_location GEOGRAPHY(POINT),
    pickup_time TIMESTAMP,
    dropoff_time TIMESTAMP,
    status TEXT,                   -- '"'"'requested'"'"', '"'"'finding_driver'"'"', '"'"'accepted'"'"', '"'"'arrived'"'"', '"'"'on_trip'"'"', '"'"'completed'"'"', '"'"'cancelled'"'"'
    ride_type TEXT,                -- '"'"'uberx'"'"', '"'"'uberxl'"'"', '"'"'uber_black'"'"'
    estimated_fare DECIMAL(10,2),
    actual_fare DECIMAL(10,2),
    surge_multiplier DECIMAL(3,2) DEFAULT 1.00,
    distance_miles DECIMAL(8,2),
    duration_minutes INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_rider (rider_id),
    INDEX idx_driver (driver_id),
    INDEX idx_status_created (status, created_at)
);

-- Fare rules table
CREATE TABLE fare_rules (
    city TEXT,
    ride_type TEXT,
    base_fare DECIMAL(10,2),
    per_mile DECIMAL(10,2),
    per_minute DECIMAL(10,2),
    min_fare DECIMAL(10,2),
    booking_fee DECIMAL(10,2),
    PRIMARY KEY (city, ride_type)
);
\`\`\`

## 10. Real Company Use Cases

- **Uber**: 25M+ trips/day, 5M+ drivers, 10K+ cities. Built on **H3** hexagonal spatial index, **Peloton** (Ringpop-based) dispatch platform, **Apache Kafka** for location streaming, **Apache HDFS** + **Spark** for analytics. Microservices in **Go** and **Java**.
- **Lyft**: 20M+ riders/month. Uses **AWS** infrastructure. **OpenStreetMap** for mapping. **Tornado** (Python async) for real-time servers. **DynamoDB** for trip data.
- **Didi Chuxing**: China'"'"''"'"'s largest ride-hailing (550M+ users). Uses **H3**-like spatial indexing, **Flink** for real-time stream processing. Handles 10B+ route requests/day.
- **Gojek**: Indonesia'"'"''"'"'s super-app (ride-hailing + food + payments). Uses **Kafka** + **Flink** for real-time dispatch. **PostgreSQL** + **Redis** for trip management.
- **Grab**: Southeast Asia'"'"''"'"'s ride-hailing leader. Uses **AWS** + **Kafka** + **Redis** + **MongoDB**. **ML-based ETA prediction** with historical traffic patterns.

## 11. Common Interview Questions

1. *Design the driver-rider matching system for a city with 100K active drivers.*
2. *How would you implement surge pricing? What factors influence the multiplier?*
3. *Design the real-time location tracking system for 1M active drivers.*
4. *How does the dispatch system handle 10K+ ride requests per second during peak hours?*
5. *Design the ETA prediction service. How do you handle real-time traffic?*
6. *How would you implement the trip fare calculation? What about mid-trip route changes?*
7. *Design the rating system. How do you detect fraudulent ratings?*
8. *How would you support scheduled rides (book a ride for tomorrow morning)?*

## 12. Related Topics & Next Steps

- **H3 Hexagonal Grid**: Uber'"'"''"'"'s spatial index for efficient proximity queries.
- **Geohash**: Alternative spatial indexing (latitude/longitude encoding).
- **Real-Time Stream Processing**: Kafka + Flink for location data.
- **Dynamic Pricing Models**: Supply-demand curves, price elasticity.
- **Route Optimization**: Dijkstra/A* with real-time traffic (OSRM, Google Maps API).
- **Payment Orchestration**: Stripe, Braintree integration with split payments.
- **Next Lesson**: Design Twitter / Facebook Feed (Newsfeed).`,
    estimatedMin: 45,
    difficulty: 'ADVANCED',
    companies: ['Uber', 'Lyft', 'Didi', 'Gojek', 'Grab'],
    tags: ['ride-hailing', 'spatial-indexing', 'h3', 'dispatch', 'dynamic-pricing', 'eta']
  },
  {
    id: 'lesson-08-05',
    slug: 'system-design-interviews-05-design-twitter-facebook-newsfeed',
    title: 'Design Twitter / Facebook Feed (Newsfeed)',
    content: `## 1. Quick Summary

Designing a **newsfeed system** (Twitter timeline, Facebook News Feed) requires ingesting content from **followed users/pages** and presenting it in a **chronological or ranked order**. Core challenges: **fan-out on write** (push new posts to followers'"'"''"'"' feeds) vs **fan-out on read** (pull posts from followed users when loading), **ranking algorithm** (relevance score based on recency, affinity, engagement signals), **low-latency delivery** (<500ms for feed load), and **handling 500M+ daily active users** generating 1B+ posts. Twitter uses a **hybrid fan-out**: celebrities/posted-ago tweets use pull (read-time merge); regular users get push (pre-computed timeline cached in Redis). Facebook uses **machine learning ranking** (Deep Neural Networks) with thousands of signals to score each post. The feed is generated via a **candidate generation** → **scoring** → **re-ranking** pipeline.

## 2. Definition

A **newsfeed** is a personalized, continuously updating list of content items (posts, tweets, photos, videos, ads) displayed to a user from their social graph. Key characteristics:
- **Content types**: Text, images, videos, links, polls, live streams.
- **Feed models**: Chronological (Twitter by default), Algorithmic (Facebook), Hybrid (Instagram, LinkedIn).
- **Delivery**: Infinite scroll with pagination (cursor-based).
- **Personalization**: Each user sees a unique feed ordered by predicted relevance.

## 3. Why It Exists / Problem It Solves

Before algorithmic feeds, social networks showed posts in **reverse chronological order**. Problems with pure chronological:
- **Information overload**: Users following 1000+ accounts see hundreds of posts per hour.
- **Missed important content**: A post from a close friend gets buried under memes from a celebrity.
- **Timezone bias**: Posts from users in different timezones appear at odd hours.
- **Engagement optimization**: Chronological ordering doesn'"'"'t consider content quality or user preferences.

Algorithmic feeds solve: **relevance filtering** (show what matters), **engagement optimization** (maximize likes, shares, comments), **time-shifting** (show best content from the past 24 hours), and **monetization** (intersperse ads naturally).

## 4. When to Use It

- **Social networks**: Facebook, Twitter, Instagram, LinkedIn, TikTok.
- **Content platforms**: Medium (following feed), YouTube (subscription feed), Reddit (home feed).
- **News aggregators**: Google News, Apple News, Flipboard.
- **E-commerce**: Personalized product feeds on Amazon, Shopify.
- **Job platforms**: LinkedIn job recommendations, Indeed feed.

## 5. When NOT to Use It / Tradeoffs

- **Echo chambers**: Algorithmic feeds amplify confirmation bias. Users see content they agree with, not diverse viewpoints.
- **Engagement hacking**: Clickbait, outrage, and sensationalism optimize for engagement metrics.
- **Cold start problem**: New users with no interaction history get generic feeds until the algorithm learns.
- **Recency vs relevance tradeoff**: Strong ranking may bury breaking news.
- **Computation cost**: Ranking 1000+ candidates per user is expensive.
- **Write amplification**: Fan-out on write (push model) creates huge write volume for celebrities with millions of followers.

## 6. System Design Deep Dive

**Fan-Out Strategies**:

| Strategy | Write Amplification | Read Latency | Best For |
|----------|--------------------|-------------|----------|
| **Push (Fan-out on Write)** | O(followers) per post | O(1) | Regular users with few followers |
| **Pull (Fan-out on Read)** | O(1) per post | O(follows) | Celebrities with millions of followers |
| **Hybrid** | Varies | Varies | Twitter'"'"''"'"'s approach |

**Twitter'"'"''"'"'s Hybrid Approach**:
- For users with **few followers (<10K)**: Push model. Write tweet to all followers'"'"''"'"' timelines (Redis lists).
- For **celebrities (>10K followers)**: Pull model. Tweet stored in the celebrity'"'"''"'"'s tweet list. When followers load feed, merge celebrity tweets at read time.

**Ranking Pipeline (Facebook-style)**:

1. **Candidate Generation**: Fetch all posts from followed accounts + suggested content + ads. ~1,500 candidates per feed load.
2. **Light Scoring** (first pass): Quick features (recency, affinity with author, content type). Keep top ~500.
3. **Heavy Scoring** (second pass): Deep learning model (DNN). Thousands of signals per post.
4. **Business Rules**: Penalize clickbait, low-quality content. Insert ads at optimal positions.
5. **Re-ranking**: Apply diversity rules (not too many posts from same source, variety of content types).
6. **A/B Testing**: Multiple ranking models run in shadow mode. Metrics compared before deployment.

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [Client App] <--HTTP/2--> [API Gateway] -> [Feed Service]
                                                  |
  +-----------+-----------+-----------+-----------+
  |           |           |           |           |
 [Redis     [Social     [Ranking   [Candidate  [Ad
  Timeline]  Graph]      Engine]    Generator]  Service]
                            |
                     [ML Model]
                     (TensorFlow)

Fan-out on Write flow:
  User A posts a tweet
     |
  Twitter Service
     |
  If A'"'"''"'"'s followers < 10K:
     For each follower B:
       Redis: LPUSH B'"'"''"'"'s timeline with tweet_id
  If A'"'"''"'"'s followers > 10K:
     Redis: SADD celebrity_tweets A'"'"''"'"'s tweet
     (pulled at read time for each follower)

Fan-out on Read flow:
  User B opens feed
     |
  Feed Service:
     |
  For each user B follows:
     If user is regular: LRANGE Redis timeline -> tweet IDs
     If user is celebrity: ZREVRANGE celebrity tweets
     |
  Merge all tweet IDs, deduplicate
     |
  Ranking Engine scores and reorders
     |
  Fetch tweet content from Memcache/Cassandra
     |
  Render JSON response with pagination cursor
\`\`\`

## 8. Real-World Flow Example

1. **User A** (regular user, 500 followers) posts: \`Having a great day at the beach! #summer\`.
2. **Write path**: Tweet written to Cassandra (tweets table). Twitter checks A'"'"''"'"'s follower count: 500 < 10K → use push model.
3. For each of A'"'"''"'"'s 500 followers, \`LPUSH follower_timeline:{user_id} tweet_123456\`.
4. **User B** (follows A) opens Twitter app. App requests \`GET /api/v2/timeline/home.json\`.
5. **Feed service** identifies B'"'"''"'"'s timeline key in Redis.
6. If not cached: generate on read. For each followed user:
   - If regular: \`LRANGE timeline:{followed_id} 0 199\`.
   - If celebrity: \`ZREVRANGE celebrity_tweets:{followed_id} 0 199\`.
7. Merge all tweet IDs. Deduplicate. Final set: ~500 unique tweet IDs.
8. **Ranking engine** scores each tweet. Features: recency, affinity, engagement, content type.
9. Top ~50 tweets selected (pagination: cursor-based for next page).
10. **Rendering**: Fetch tweet content from cache. Render JSON.
11. Response to client: \`{ "tweets": [...], "nextCursor": "abc...", "sinceCursor": "xyz..." }\`.
12. Client renders feed. User B scrolls down → sends \`cursor=abc...\` for next page.

## 9. API & Data Model Design

**REST API Endpoints**:

\`\`\`
GET    /api/v2/timeline/home.json
  Query: count=50, cursor=next_page_token, since_id=last_seen_tweet_id
  Response: { "tweets": [...], "nextCursor": "...", "sinceCursor": "..." }

POST   /api/v2/tweets
  Request:  { "text": "Hello world!", "mediaIds": ["123", "456"], "replyToId": null }
  Response: { "tweetId": "tweet_123456", "createdAt": "..." }

POST   /api/v2/tweets/{tweetId}/like
  Response: 200 OK

POST   /api/v2/tweets/{tweetId}/retweet
  Response: { "retweetId": "tweet_789012" }
\`\`\`

**Database Schema**:

\`\`\`sql
-- Tweets table (Cassandra-style)
CREATE TABLE tweets (
    tweet_id TIMEUUID PRIMARY KEY,
    user_id TEXT,
    text TEXT,
    media_ids LIST<TEXT>,
    reply_to_id TEXT,
    retweet_count COUNTER,
    like_count COUNTER,
    created_at TIMESTAMP,
    INDEX idx_user_id (user_id)
);

-- Follows graph (Cassandra)
CREATE TABLE follows (
    follower_id TEXT,
    followee_id TEXT,
    followed_at TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id)
);
\`\`\`

## 10. Real Company Use Cases

- **Twitter**: 250M+ DAU, 500M+ tweets/day. **Hybrid fan-out** (push for regular, pull for celebrities). **Manhattan** (Twitter'"'"''"'"'s KV store) for real-time timeline cache.
- **Facebook**: 2B+ DAU. **TAO** (graph DB), **Deep Neural Networks** for News Feed ranking. Thousands of features, training on billions of examples daily.
- **Instagram**: 500M+ DAU. Chronological feed then algorithmic feed. Ranking signals: engagement history, profile exploration, content freshness.
- **LinkedIn**: 300M+ MAU. **Multi-Task Learning** for feed ranking (relevance + engagement + content quality).
- **Reddit**: 50M+ DAU. **Home feed** combines subscribed subreddits with hot/best/new sorting.

## 11. Common Interview Questions

1. *Design Twitter'"'"''"'"'s timeline: compare push vs pull fan-out models.*
2. *How does Facebook rank 1,500 candidate posts in under 500ms?*
3. *Design the newsfeed for a social network with 100M DAU.*
4. *How would you implement infinite scroll with cursor-based pagination?*
5. *Design the like and retweet counter system. How do you handle counter consistency?*
6. *How does the feed system handle real-time updates (new tweet appears without refresh)?*
7. *Design the ad insertion strategy for a newsfeed.*
8. *How would you implement "See first" / "Favorites" feature for specific users?*

## 12. Related Topics & Next Steps

- **Fan-out Patterns**: Push vs pull vs hybrid strategies for social feeds.
- **Feed Ranking**: Machine learning models, feature engineering, A/B testing.
- **Cursor-Based Pagination**: Efficient pagination for infinite scrolling feeds.
- **Social Graph Storage**: Graph databases (Neo4j, TAO) for friend/follow relationships.
- **Real-Time Updates**: WebSockets, long-polling, Server-Sent Events for live feed updates.
- **Ad Tech**: Real-time bidding, ad relevance, and revenue optimization.
- **Next Lesson**: Design Instagram / Pinterest (Photo Sharing).`,
    estimatedMin: 40,
    difficulty: 'ADVANCED',
    companies: ['Twitter', 'Facebook', 'Instagram', 'LinkedIn', 'Reddit', 'Meta'],
    tags: ['newsfeed', 'timeline', 'social-network', 'fan-out', 'ranking', 'feed']
  },
  {
    id: 'lesson-08-06',
    slug: 'system-design-interviews-06-design-instagram-pinterest',
    title: 'Design Instagram / Pinterest (Photo Sharing)',
    content: `## 1. Quick Summary

Designing a **photo sharing platform** like Instagram or Pinterest requires building a system for **image upload, processing, storage, and delivery** combined with a **social graph** and **content discovery** feed. Core challenges: **image optimization** (resizing, compression, format conversion to WebP/AVIF), **CDN delivery** with cache invalidation, **feed generation** (explore page, hashtag search, recommendations), and **storage at scale** (100B+ photos for Instagram). At Instagram scale (1B+ MAU, 100M+ photos uploaded daily), the system uses **Python/Django** monolith (initially), later migrated to **microservices** with **Cassandra** for feeds, **PostgreSQL** for metadata, **Redis** for session/caching, **Apache Kafka** for async processing, and **Akamai/Facebook CDN** for image delivery.

## 2. Definition

A **photo sharing platform** allows users to capture, upload, apply filters/edit, and share photos with followers or the public. Key capabilities:
- **Upload pipeline**: Resumable uploads, EXIF extraction, auto-tagging.
- **Image processing**: Resize to multiple resolutions, convert to next-gen formats (WebP, AVIF), apply filters.
- **Feed**: Chronological/algorithmic feed of photos from followed users.
- **Discovery**: Explore page (ML-based recommendations), hashtag search, location search.
- **Social features**: Like, comment, share, save/bookmark, story (ephemeral content).
- **Profile**: User gallery grid, bio, follower/following counts.

## 3. Why It Exists / Problem It Solves

Before Instagram (2010), mobile photo sharing was poor: phones had cameras but sharing required email or MMS (low quality, expensive). Instagram solved:
- **Mobile-first photo sharing**: Take photo → apply filter → share in 3 taps.
- **Photo quality**: Filters made amateur photos look professional.
- **Social discovery**: Find friends via Facebook integration, explore new content.
- **Square format**: Standardized 1:1 aspect ratio (inspired by Polaroid, Kodak Instamatic).

## 4. When to Use It

- **Personal photo sharing**: Share life moments with friends/family.
- **Brand marketing**: Product showcases, influencer partnerships.
- **Visual discovery**: Pinterest boards for inspiration.
- **E-commerce**: Instagram Shopping, product tagging.
- **Content creation**: Professional photographers, artists, designers portfolio.
- **Ephemeral content**: Instagram Stories (24h lifespan) for casual sharing.

## 5. When NOT to Use It / Tradeoffs

- **High storage costs**: Original + resized versions consume massive storage.
- **CDN costs**: Global CDN delivery for billions of photos is expensive.
- **Moderation challenges**: Inappropriate content must be detected via AI/ML at upload time.
- **Copyright infringement**: Users upload copyrighted images without permission.
- **Bandwidth consumption**: Auto-playing videos, high-res images consume user data.
- **Algorithmic filter bubbles**: Explore page shows similar content, reducing diversity.

## 6. System Design Deep Dive

**Image Upload Pipeline**:

1. Client uploads image in chunks (TUS protocol — resumable).
2. Upload API receives chunks, stores in **temporary blob storage**.
3. On completion: create async message in Kafka for **image processing**.
4. Image processor (Python Pillow + libvips or C++ with OpenCV):
   - **Inspect**: Validate format (JPEG, PNG, HEIC), dimensions, EXIF orientation.
   - **Thumbnail**: Resize to 150x150 (profile thumbnail).
   - **Standard**: Resize to 640x640 (feed display).
   - **Full**: Resize to 1080x1080 (max resolution for feed).
   - **Format conversion**: Generate WebP (lossless), AVIF (next-gen) versions.
   - **EXIF stripping**: Remove GPS location if user disabled geotagging.
5. Upload all variants to **CDN origin storage** (e.g., Facebook'"'"''"'"'s Haystack, or S3).
6. **Content moderation**: AI model checks for NSFW, violence, hate symbols.
7. **Auto-tagging**: ML models generate hashtags (image classification → relevant tags).
8. Update metadata (PostgreSQL): photo ID, user ID, caption, hashtags, location.
9. Trigger **fan-out** to followers'"'"''"'"' feeds.

**Image Storage (Facebook Haystack)**:

Facebook developed **Haystack** (2009) for efficient photo storage:
- **Thousands of photos per user**: Avoid metadata lookup overhead by embedding metadata in file path.
- **Read-optimized**: Photos are read far more than written (100:1 read:write ratio).
- **Minimal metadata**: Store only needle (photo ID) → haystack (file path + offset).
- **One disk seek per read**: Metadata in memory, photo file on disk with direct I/O.

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [Client] --HTTP/HTTPS--> [LB] -> [API Gateway]
                                          |
  +-------+--------+--------+-------+---------+-------+
  |       |        |        |       |         |       |
 [Upload  [Feed    [User     [Social [Explore  [Search [Story
  Service] Service] Profile]  Graph]  Service]  Service]Service]
  |        |        |        |       |         |       |
 [Kafka]  [Redis]  [Cassandra] [PostgreSQL] [CDN Origin] [ML Pipeline]
  |                 |                              |
 [Image             |                          [FAST CDN
  Processor]        |                           Edge Cache]

Upload Flow:
  Client -> Upload API (chunked) -> Temp Storage
     -> Kafka: "image_uploaded" event
     -> Image Processor:
        -> Resize (thumb, standard, full)
        -> Convert (WebP, AVIF)
        -> Strip EXIF
        -> Upload variants to CDN origin
     -> Update DB: photo metadata
     -> Fan-out to timeline feeds
\`\`\`

## 8. Real-World Flow Example

1. **User takes a photo** on iPhone (12MP, 4032x3024, 4MB HEIC file).
2. Instagram app opens, user selects filter (Valencia), adds caption "Beautiful sunset #sunset".
3. Tap **Share**. Upload begins: 4MB file split into 1MB chunks.
4. Upload API stores chunks in temp storage. Last chunk triggers completion.
5. Kafka message: \`{mediaId: "media_456", userId: "user_789", format: "heic"}\`.
6. Image processor reads temp file. Validates image. Strips GPS EXIF.
7. Resizes to 3 sizes: Thumbnail 150x150, Standard 640x640, Full 1080x1080 + WebP versions.
8. Uploads 6 variant files to CDN origin.
9. **NSFW detector**: TensorFlow model scores image. Score < 0.01 (safe).
10. **Hashtag extractor**: Parses caption, extracts #sunset. Updates hashtag index.
11. **Fan-out**: User has 1,200 followers. Push photo ID to each follower'"'"''"'"'s Redis timeline list.
12. **Follower A** opens Instagram. Feed service reads timeline from Redis. Fetches metadata from cache.
13. Feed rendered. Follower A double-taps to like.

## 9. API & Data Model Design

**REST API Endpoints**:

\`\`\`
POST   /api/v1/media/upload/init
  Request:  { "fileSize": 4194304, "fileType": "image/heic", "aspectRatio": "1:1" }
  Response: { "mediaId": "media_456", "chunkSize": 1048576, "chunksCount": 4 }

POST   /api/v1/media/upload/{mediaId}/complete
  Request:  { "caption": "Beautiful sunset", "hashtags": ["sunset"], "filter": "valencia" }
  Response: { "mediaId": "media_456", "status": "processing" }

GET    /api/v1/feed/home
  Query: limit=30, cursor=abc123
  Response: { "items": [...], "nextCursor": "def456" }

POST   /api/v1/media/{mediaId}/like
  Response: 200 OK
\`\`\`

**Database Schema**:

\`\`\`sql
-- Media table (PostgreSQL sharded by user_id)
CREATE TABLE media (
    media_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    caption TEXT,
    hashtags TEXT[],
    location_id TEXT,
    aspect_ratio DECIMAL(4,2),
    width INT, height INT,
    filter TEXT,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_user_id_uploaded (user_id, uploaded_at DESC),
    INDEX idx_hashtags USING GIN (hashtags)
);

-- User followers (Cassandra)
CREATE TABLE follows (
    follower_id TEXT,
    followee_id TEXT,
    followed_at TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id)
);

-- Likes (Cassandra, counter table)
CREATE TABLE media_likes (
    media_id TEXT,
    user_id TEXT,
    liked_at TIMESTAMP,
    PRIMARY KEY (media_id, user_id)
);
\`\`\`

## 10. Real Company Use Cases

- **Instagram (Meta)**: 1B+ MAU, 100M+ photos uploaded daily. **Haystack** (custom photo storage), **FAST** (Facebook CDN). **ML Explore** ranking uses **Deep Neural Networks**.
- **Pinterest**: 450M+ MAU, 250B+ pins saved. Uses **AWS**. **Visual search** (Pinterest Lens) powered by **computer vision**. **PinSage** (graph neural network) for recommendations.
- **Flickr**: Early photo sharing pioneer. 2B+ photos hosted. Declined after Instagram'"'"''"'"'s rise.
- **500px**: Professional photography community. Uses **AWS** + **CloudFront** CDN.
- **VSCO**: Photo editing + sharing. Focus on creative tools.

## 11. Common Interview Questions

1. *Design the image upload and processing pipeline for 100M+ uploads/day.*
2. *How would you design the Explore page with ML-based recommendations?*
3. *Design the Instagram Stories feature (ephemeral content with 24-hour TTL).*
4. *How does the photo storage system handle exabytes of data?*
5. *Design the hashtag search and trending topics feature.*
6. *How would you implement the like and comment system for high-traffic posts?*
7. *Design Instagram Direct messaging.*
8. *How would you support video uploads (Reels)?*

## 12. Related Topics & Next Steps

- **Image Processing Pipelines**: Resizing, thumbnails, format conversion (WebP, AVIF).
- **CDN Architecture**: Edge caching, origin shield, cache invalidation strategies.
- **Computer Vision**: Content moderation, auto-tagging, visual search.
- **Feed Ranking**: ML-based personalization for Explore page.
- **Photo Storage Systems**: Haystack, S3-compatible object stores.
- **Stories Architecture**: Ephemeral content with auto-deletion.
- **Next Lesson**: Design Dropbox / Google Drive (File Storage).`,
    estimatedMin: 40,
    difficulty: 'ADVANCED',
    companies: ['Instagram', 'Pinterest', 'Facebook', 'Flickr', 'VSCO'],
    tags: ['photo-sharing', 'image-processing', 'cdn', 'feed', 'explore', 'storage']
  },
  {
    id: 'lesson-08-07',
    slug: 'system-design-interviews-07-design-dropbox-google-drive',
    title: 'Design Dropbox / Google Drive (File Storage)',
    content: `## 1. Quick Summary

Designing a **cloud file storage platform** like Dropbox or Google Drive requires building a system for **file upload, sync, sharing, collaboration, and version history** across multiple devices. Core challenges: **delta sync** (upload only changed parts of a file), **conflict resolution** (two users edit the same file simultaneously), **LAN sync** (peer-to-peer file sharing within local network for speed), **block-level deduplication**, **chunked upload** with resumability, and **cross-device synchronization** with offline support. At Dropbox scale (700M+ users, 1B+ files saved daily), the architecture uses **Amazon S3** for block storage, **custom block server** for chunk management, **PostgreSQL shards** for metadata, **Redis** for session management, and **Ceph** (later migration) for storage. The **sync engine** (C++ client) monitors file changes, computes block-level diffs, and uploads only changed blocks.

## 2. Definition

A **cloud file storage system** stores files on remote servers and synchronizes them across devices. Key capabilities:
- **Cross-platform sync**: Files on Windows, macOS, Linux, iOS, Android, web.
- **File versioning**: Access previous versions (30-day history for free, 180-day for paid).
- **Sharing**: Share links with password protection, expiry, download limits.
- **Collaboration**: Real-time co-editing (Google Docs), comments, file requests.
- **Offline access**: Mark files for offline sync, changes sync when online.
- **Smart Sync**: See file metadata without downloading full file (on-demand sync).

## 3. Why It Exists / Problem It Solves

Before Dropbox (2007), file sharing between devices meant: email attachments (25MB limit), USB flash drives (lost, infected), FTP servers (complex setup), or network shares (VPN required). Dropbox solved:
- **Automatic sync**: Files in Dropbox folder sync to all devices automatically.
- **No configuration**: Works out of the box, no server setup.
- **File recovery**: Undelete files, access previous versions.
- **Share links**: Send a link instead of a file attachment.
- **LAN sync**: Sync between devices on the same network without uploading to cloud.
- **Selective sync**: Choose which folders sync to which device.

## 4. When to Use It

- **Personal backup**: Automatic backup of documents, photos to the cloud.
- **Team collaboration**: Shared team folders (Dropbox Business, Google Shared Drives).
- **File sharing**: Send large files (up to 100GB via Dropbox Transfer).
- **Remote work**: Access files from any device, anywhere.
- **Co-editing**: Google Docs, Sheets, Slides real-time collaboration.
- **Media storage**: Google Photos backup.

## 5. When NOT to Use It / Tradeoffs

- **Large file sync**: Initial sync of large files (10GB+) is slow on limited bandwidth.
- **Conflicts**: Two users editing the same file simultaneously creates conflicting copies.
- **Privacy concerns**: Cloud provider has access to files (unless encrypted client-side).
- **Cost at scale**: 2TB plan costs $10-12/month. For 10TB+, costs add up.
- **Bandwidth consumption**: Auto-syncing large files can saturate office internet.
- **No true real-time collaboration**: Dropbox/Drive sync files, not real-time edits.

## 6. System Design Deep Dive

**File Upload & Sync Flow**:

1. **File monitoring**: Client file system watcher (ReadDirectoryChangesW on Windows, FSEvents on macOS, inotify on Linux) detects file changes.
2. **Delta computation**: Compare new file hash (SHA-256) with cached hash. If hash matches → no change.
3. **Block-level diff**: Split file into **4MB blocks** (256KB for smaller files). Compute block hashes. Compare with server block list.
4. **Upload changed blocks**: Send only blocks with new hashes (compressed, encrypted). Resumable upload.
5. **Server reassembly**: Block server reassembles file from blocks, stores blocks in S3 with block ID as key.
6. **Metadata update**: Update file metadata (size, modified time, version number) in PostgreSQL.
7. **Notification**: Push notification to other connected devices.
8. **Client sync**: Other devices pull block list, download new blocks, reassemble file locally.

**Block Deduplication**:
- Same block hash across different files → stored once, referenced multiple times.
- Block ID = SHA-256(block content). S3 key = \`blocks/{hash[0:2]}/{hash[2:4]}/{hash}\`.
- Reference counting: \`block_refcount: {hash} -> count\`. On file delete, decrement refcount.

**Conflict Resolution**:
- User A modifies file, User B modifies same file before sync → Last writer wins. Loser gets "conflicted copy".
- Same file created by A and B independently → First upload wins. Second gets "(1)" added to filename.

**Version History**:
- Each file write creates a new **version record**: \`{fileId, versionNumber, blockHashes[], createdAt, modifiedBy}\`.
- Blocks shared across versions → no additional storage cost for revisions.
- Version pruning: Keep all versions for 30 days (free), then weekly snapshots for 180 days (paid).

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [Client Desktop] <--HTTPS/WSS--> [API Gateway]
  [Client Mobile]  <--HTTPS/WSS--> [API Gateway]
                                         |
  +-----------+-----------+-----------+--+--------+-----------+
  |           |           |           |           |           |
 [Auth       [File       [Block      [Sync       [Share      [Admin
  Service]    Service]    Service]    Service]    Service]    Service]
  |           |           |           |           |           |
  |      [PostgreSQL] [Block Server][Redis PubSub][Elastic  [Billing]
  |           |           |                        Search]
  |           |      [Amazon S3]
  |           |           |
  |      +----+----+
  |      |         |
  [Redis][Memcache]

Sync Flow:
  Monitor (watches FS events)
     |
  Queue: coalesce rapid events (500ms debounce)
     |
  Diff: compare file hash and block hashes with server
     |
  Upload changed blocks (parallel, compressed, encrypted)
     |
  Block Server: store blocks -> S3, update block refcounts
     |
  File Service: update metadata, create new version
     |
  Sync Service: push notification via Redis PubSub
     |
  Other clients: download new blocks, reassemble, apply to FS
\`\`\`

## 8. Real-World Flow Example

1. **User A** creates "Report.docx" (2MB). Places in Dropbox folder.
2. **Client watcher** detects new file via FSEvents. SHA-256 hash computed.
3. Client splits into blocks. Uploads block to Block Server.
4. Block Server stores in S3: \`/blocks/d4/e5/d4e5f6a7...\`. Refcount = 1.
5. File Service creates record in PostgreSQL: \`{fileId: F001, name: "Report.docx", version: 1}\`.
6. Sync Service sends push notification to User A's other devices.
7. User A's phone downloads blocks from S3 via signed URL.
8. **User A modifies** file (adds 3 pages, file grows to 2.5MB).
9. Client computes SHA-256: new hash. Split into blocks: first block unchanged, second block new.
10. Client uploads only the changed block (500KB).
11. File Service creates version 2. Other devices download just the new block.
12. **User B** shares folder with User A. File syncs to User B's devices.

## 9. API & Data Model Design

**REST API Endpoints**:

\`\`\`
POST   /api/v1/files/create
  Request:  { "name": "Report.docx", "parentFolderId": "FOLDER_001", "size": 2097152 }
  Response: { "fileId": "F001", "uploadUrl": "..." }

POST   /api/v1/blocks/upload
  Headers: Content-Type: application/octet-stream
  Query: blockHash=d4e5f6a7..., compressed=true
  Response: { "blockHash": "d4e5f6a7...", "size": 520000 }

POST   /api/v1/files/{fileId}/commit
  Request:  { "version": 2, "blockHashes": ["d4e5f6a7...", "f1g2h3i4..."], "size": 2621440 }
  Response: { "versionId": "V002" }

GET    /api/v1/files/{fileId}/blocks
  Query: version=2
  Response: { "blocks": [{"hash": "d4e5f6a7...", "url": "signed_url_1"}, {"hash": "f1g2h3i4...", "url": "signed_url_2"}] }

POST   /api/v1/sharing/create-link
  Request:  { "fileId": "F001", "permission": "view" }
  Response: { "shareUrl": "https://dropbox.com/s/abc123" }

GET    /api/v1/files/{fileId}/versions
  Response: { "versions": [{"versionId": "V001", "createdAt": "...", "size": 2097152}, {"versionId": "V002", "createdAt": "...", "size": 2621440}] }
\`\`\`

**Database Schema**:

\`\`\`sql
-- Files table (PostgreSQL, sharded by user_id)
CREATE TABLE files (
    file_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    parent_folder_id TEXT,
    is_folder BOOLEAN DEFAULT FALSE,
    size BIGINT DEFAULT 0,
    mime_type TEXT,
    current_version INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_user_folder (user_id, parent_folder_id)
);

-- File versions
CREATE TABLE file_versions (
    file_id TEXT,
    version INT,
    block_hash TEXT[],
    size BIGINT,
    created_by TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY (file_id, version DESC)
);

-- Block reference counting
CREATE TABLE block_refcount (
    block_hash TEXT PRIMARY KEY,
    block_size INT,
    compressed_size INT,
    s3_key TEXT,
    refcount INT DEFAULT 1,
    created_at TIMESTAMP
);
\`\`\`

## 10. Real Company Use Cases

- **Dropbox**: 700M+ users, 500K+ business teams. Initially **Amazon S3**, later **Ceph** (self-hosted). **Sync engine** in **C++**. **PostgreSQL** shards for metadata.
- **Google Drive**: 1B+ users, 15GB free tier. **Google Cloud Storage**. **Google Docs** for real-time collaboration (OT/CRDT-based).
- **Microsoft OneDrive**: 250M+ users. **Azure Blob Storage**. **Files On-Demand** — see files without downloading.
- **iCloud Drive (Apple)**: 850M+ iCloud users. **Apple CloudKit** + **AWS** + **Google Cloud**.
- **Box**: Enterprise-focused (100K+ businesses). **AWS**. **Box Shield** for security.
- **MEGA**: 250M+ users. **Client-side encryption** (zero-knowledge). GDPR compliant.

## 11. Common Interview Questions

1. *How does Dropbox achieve block-level deduplication and delta sync?*
2. *Design the file synchronization algorithm for 10M+ users.*
3. *How would you handle conflict resolution when two users edit the same file?*
4. *Design the version history system. How do you manage storage of multiple versions?*
5. *How does LAN sync work? (peer-to-peer sync within local network)*
6. *Design the share link system with permissions (view, edit, expiry, password).*
7. *How would you implement Smart Sync (on-demand file download)?*
8. *Design the search feature for 100B+ files across an organization.*

## 12. Related Topics & Next Steps

- **Block-Level Deduplication**: Content-addressable storage, Merkle trees.
- **Delta Sync Algorithms**: rsync-like rolling checksums, block hash comparison.
- **Conflict-Free Replicated Data Types (CRDTs)**: For real-time co-editing.
- **Operational Transformation (OT)**: Google Docs collaboration algorithm.
- **Object Storage**: S3, Ceph, MinIO architecture and tradeoffs.
- **File System Watchers**: Cross-platform file monitoring (FSEvents, inotify, ReadDirectoryChangesW).
- **Next Lesson**: Design Amazon / E-Commerce Platform.`,
    estimatedMin: 45,
    difficulty: 'ADVANCED',
    companies: ['Dropbox', 'Google Drive', 'OneDrive', 'iCloud', 'Box', 'MEGA'],
    tags: ['file-storage', 'sync', 'deduplication', 'versioning', 'block-store', 'collaboration']
  },
  {
    id: 'lesson-08-08',
    slug: 'system-design-interviews-08-design-ecommerce-platform',
    title: 'Design Amazon / E-Commerce Platform',
    content: `## 1. Quick Summary

Designing an **e-commerce platform** like Amazon requires building a multifaceted system handling **product catalog** (400M+ products), **search** (product search with faceted navigation), **shopping cart**, **order processing**, **payment orchestration**, **inventory management**, **recommendation engine**, **seller marketplace**, **reviews**, **warehouse/logistics** (Fulfillment by Amazon), and **customer service**. At Amazon scale (300M+ active customers, 1.5M+ products shipped daily), the architecture is **microservices-based** with **DynamoDB** for shopping cart, **Elasticsearch** for product search, **Aurora/MySQL** for order management, **Amazon SQS** for async order processing, and **ML models** for product recommendations. The **checkout flow** is the most critical path — must be highly available (99.99%) and handle peak traffic (Prime Day: 10M+ orders/hour).

## 2. Definition

An **e-commerce platform** is a digital marketplace where buyers and sellers transact goods/services. Core components:
- **Product catalog**: Structured product data (title, description, price, images, variants, attributes).
- **Search & discovery**: Full-text search with filters (category, brand, price range, rating).
- **Shopping cart**: Temporary hold of selected items before purchase.
- **Checkout**: Address selection, payment method, order review, place order.
- **Order management**: Order lifecycle (pending → confirmed → shipped → delivered → returned).
- **Payment processing**: Credit cards, digital wallets, BNPL.
- **Inventory**: Real-time stock count, warehouse allocation, low-stock alerts.
- **Fulfillment**: Pick-pack-ship from warehouses, carrier integration.
- **Seller marketplace**: Third-party sellers list products, Amazon handles payments and logistics.

## 3. Why It Exists / Problem It Solves

Before Amazon (1994), shopping meant: driving to stores (time-consuming), limited selection (store shelf space), no price comparison, no reviews. Amazon solved:
- **Infinite selection**: Millions of products in one place.
- **Price comparison**: Visible prices, used/new options, third-party sellers.
- **Product reviews**: Crowd-sourced quality assessment.
- **Fast delivery**: Amazon Prime (2-day, now 1-day/same-day in many areas).
- **One-click ordering**: Saved address and payment.
- **Fulfillment as a service**: FBA lets sellers store inventory in Amazon warehouses.

## 4. When to Use It

- **Physical goods retail**: Electronics, books, clothing, groceries, furniture.
- **Digital goods**: E-books (Kindle), streaming (Prime Video), software.
- **Subscription**: Monthly boxes, Subscribe & Save.
- **Marketplace**: Third-party sellers reach Amazon customer base.
- **Enterprise procurement**: Amazon Business for corporate purchasing.
- **Local delivery**: Amazon Fresh, Whole Foods, Amazon Hub (lockers).

## 5. When NOT to Use It / Tradeoffs

- **Complexity**: E-commerce is notoriously complex. Hundreds of interconnected services.
- **Inventory accuracy**: Real-time inventory across 100M+ SKUs and 1000+ warehouses is extremely hard.
- **Fraud risk**: Payment fraud, account takeovers, fake reviews, counterfeit products.
- **Seller competition**: Amazon competes with third-party sellers.
- **Thin margins**: E-commerce retail margin is ~2-5%. Profit comes from AWS + Ads.
- **Returns processing**: 15-30% return rate for apparel, costly reverse logistics.
- **Peak traffic**: Black Friday / Prime Day cause 10x traffic spikes.

## 6. System Design Deep Dive

**Catalog Service**:
- Stores product metadata in **document database** (DynamoDB): one document per product with all variants and attributes nested.
- Products organized in a **category tree** (Electronics > Laptops > Gaming Laptops).
- Each product has **variants** (color, size, storage) — SKU-level inventory.

**Search Service**:
- Uses **Elasticsearch** for full-text search.
- Index schema: title (boosted), description, brand, category, price, rating, review count.
- Faceted search: filter by category, brand, price range, rating, color, size.
- Ranking: text relevance + popularity + sales velocity + recency.

**Shopping Cart Service**:
- Must be **durable** (don't lose items) and **always available**.
- Uses **DynamoDB**: Key = \`userId\`, Value = \`list<{productId, variantId, quantity, addedAt}>\`.
- Price lock: When user proceeds to checkout, prices are locked.
- Cart merge: Merge saved-for-later items with current cart.
- Cart expiry: Unchecked items removed after 30 days.

**Order Processing (Checkout Flow)**:
1. **Review Cart**: Show items with current prices, estimated delivery.
2. **Shipping Address**: User selects/enters address. Geocode for warehouse assignment.
3. **Shipping Method**: Standard, expedited, same-day.
4. **Payment**: Select card/Amazon Pay. Authorization holds funds.
5. **Review Order**: Final summary.
6. **Place Order**: Create order with status="pending".
7. **Inventory Reservation**: Decrement available stock.
8. **Payment Capture**: Charge the card.
9. **Fulfillment Assignment**: Assign to nearest warehouse.
10. **Order Confirmation**: Email/SMS to customer.
11. **Async Processing**: Fulfillment picks items, packs, ships. Tracking updates via carrier API.

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [Customer] --HTTPS--> [CloudFront CDN] -> [LB] -> [API Gateway]
                                                            |
  +-----------+----------+----------+---------+-----------+--+--------+
  |           |          |          |         |           |           |
 [Catalog   [Search    [Cart      [Order    [Payment   [Inventory  [Recommendation
  Service]   Service]   Service]   Service]  Service]   Service]    Service]
     |          |          |         |          |          |           |
 [DynamoDB] [Elastic  [DynamoDB] [Aurora  [Stripe/  [DynamoDB]  [ML Model
  (Catalog)] search]   (Cart)]    MySQL]   Plaid]    (Inventory)] (Personalize)]
     |                                      |
     |                                 [Fraud Detection]
     |                                      |
  +--+--+                   +------+-------+---+
  |     |                   |      |           |
 [S3   [Image             [SQS   [SNS       [Kinesis
  Product  CDN]            Queue]  Notify]    Stream]

Checkout Sequence:
  Customer -> Cart Service (review)
     -> Checkout -> Address Service -> Shipping Method
     -> Payment Service (authorize)
     -> Order Service (create order)
     -> Inventory Service (reserve stock)
     -> Payment Service (capture)
     -> Fulfillment Service (assign warehouse)
     -> Customer notified via SNS/Email
\`\`\`

## 8. Real-World Flow Example

1. **Customer opens Amazon app**. Types "wireless noise cancelling headphones" in search bar.
2. **Search Service** queries Elasticsearch. Returns 2,000 matching products ranked by relevance × popularity.
3. **Faceted filters**: Customer filters by brand (Sony, Bose), price ($100-$300), rating (4+ stars). Refined to 47.
4. Customer clicks **Sony WH-1000XM5** ($349.99, 4.7 stars, 12,345 ratings).
5. **Catalog Service** returns product detail page: images, description, specifications, reviews.
6. **Recommendation Service** suggests "Frequently Bought Together."
7. Customer selects black, adds to cart. **Cart Service** writes to DynamoDB.
8. Customer clicks **Proceed to Checkout**.
9. **Checkout**: Address pre-selected, shipping method standard (free Prime), payment default card.
10. Customer clicks **Place Your Order**.
11. **Order Service** creates order: \`orderId: "ORD-123456789"\`.
12. **Inventory Service** decrements quantity: from 50 to 49.
13. **Payment Service** authorizes $358.49. Fraud detection scores: low risk. Captured.
14. **Fulfillment Service** assigns to Dallas warehouse. Robot picks item.
15. **Shipment**: Package boxed, labeled. UPS scan. Tracking created.
16. **Customer notified**: "Your order has shipped! Tracking: 1Z999AA10123456784."
17. Wednesday: Package delivered. Customer rates 5 stars.

## 9. API & Data Model Design

**REST API Endpoints**:

\`\`\`
GET    /api/v1/products/search
  Query: q=wireless+headphones&category=electronics&price_min=100&price_max=300&sort=popularity
  Response: { "totalResults": 47, "products": [...], "facets": {...} }

GET    /api/v1/products/{productId}
  Response: { "productId": "...", "title": "...", "price": 349.99, "images": [...], "rating": 4.7, "reviewCount": 12345 }

POST   /api/v1/cart/items
  Request:  { "productId": "B0B5XYZ", "variantId": "black", "quantity": 1 }
  Response: { "cartId": "cart_123", "itemCount": 1, "total": 349.99 }

POST   /api/v1/checkout/init
  Response: { "checkoutId": "chk_456", "cart": {...}, "addresses": [...], "paymentMethods": [...] }

POST   /api/v1/checkout/{checkoutId}/place
  Request:  { "addressId": "addr_789", "paymentMethodId": "pm_012", "shippingMethod": "standard" }
  Response: { "orderId": "ORD-123456789", "status": "confirmed", "estimatedDelivery": "2024-03-15" }
\`\`\`

**Database Schema**:

\`\`\`sql
-- Products catalog (DynamoDB document)
-- Single table: PK = product_id, SK = variant_id

CREATE TABLE products (
    product_id TEXT,
    variant_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category_id TEXT NOT NULL,
    brand TEXT,
    price DECIMAL(10,2) NOT NULL,
    list_price DECIMAL(10,2),
    images TEXT[],
    attributes JSONB,
    rating DECIMAL(2,1),
    review_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (product_id, variant_id)
);

-- Customer orders (Aurora/MySQL, sharded by order_id)
CREATE TABLE orders (
    order_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '"'"'pending'"'"',
    subtotal DECIMAL(10,2),
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2),
    total DECIMAL(10,2),
    shipping_address_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_customer_id (customer_id)
);

CREATE TABLE order_items (
    order_id TEXT,
    item_id INT,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_id, item_id)
);
\`\`\`

## 10. Real Company Use Cases

- **Amazon**: 300M+ customers, 400M+ products. **Microservices**. **DynamoDB** for cart, session, inventory. **Aurora** for orders. **Elasticsearch** for search. **SQS** for async processing. **Kinesis** for real-time analytics.
- **Walmart**: 120M+ monthly visitors. **Walmart Cloud** (OpenStack). **Kafka** for event streaming. **Memorystore (Redis)** for cache.
- **Shopify**: 2M+ merchants. **Ruby on Rails** monolith to microservices. **Kafka**, **Elasticsearch**, **Redis**. **GraphQL API**.
- **eBay**: 130M+ buyers. **Java** stack. **Apache Hadoop** for analytics. **Espresso** (in-house NoSQL).
- **Alibaba**: 800M+ consumers. **Double 11** processes 500K+ orders/second peak. **OceanBase** (distributed SQL), **Tair** (cache), **RocketMQ**, **Flink**.

## 11. Common Interview Questions

1. *Design the product search with faceted filtering for 100M+ products.*
2. *How would you design the shopping cart for 10M+ concurrent users?*
3. *Design the order processing flow from checkout to delivery.*
4. *How do you handle inventory management across 100+ warehouses?*
5. *Design the product recommendation system for an e-commerce site.*
6. *How would you handle Black Friday/Prime Day traffic spikes?*
7. *Design the seller marketplace (third-party sellers).*
8. *How would you implement a review and rating system with fraud detection?*

## 12. Related Topics & Next Steps

- **Search Relevance**: TF-IDF, BM25, Elasticsearch scoring, learning-to-rank.
- **Recommendation Systems**: Collaborative filtering, content-based, hybrid.
- **Payment Orchestration**: Payment gateway integration, authorization vs capture.
- **Inventory Management**: Multi-warehouse allocation, demand forecasting.
- **Fulfillment Optimization**: Warehouse robotics, bin packing, carrier selection.
- **Next Lesson**: Design Web Crawler / Search Engine.`,
    estimatedMin: 50,
    difficulty: 'ADVANCED',
    companies: ['Amazon', 'Walmart', 'Shopify', 'eBay', 'Alibaba'],
    tags: ['ecommerce', 'catalog', 'cart', 'checkout', 'search', 'inventory', 'recommendation']
  },
  {
    id: 'lesson-08-09',
    slug: 'system-design-interviews-09-design-web-crawler-search-engine',
    title: 'Design Web Crawler / Search Engine',
    content: `## 1. Quick Summary

Designing a **web crawler** and **search engine** (like Google Search) requires building a system that discovers, downloads, indexes, and serves web pages in response to user queries. Core components: **Crawler** (URL frontier, politeness policies, HTML fetchers), **Indexer** (parse HTML, extract content, build inverted index), **Query Processor** (tokenize, spell-check, rank results), and **Storage** (doc store for raw pages, index store for inverted index). At Google scale (100B+ web pages, 3.5B+ searches/day), the system processes petabytes of data daily using **Google File System**, **Bigtable** for page storage, **MapReduce/Flume** for index building, and **PageRank** for ranking. The pipeline must handle duplicate detection (near-duplicate shingling), spam filtering, and incremental updates.

## 2. Definition

A **web search engine** retrieves web pages matching a query and ranks them by relevance. Pipeline:
- **Crawling**: Discover URLs via sitemaps and links, fetch HTML content respecting \`robots.txt\`.
- **Indexing**: Parse HTML, extract text/metadata, build **inverted index** (term → list of document IDs).
- **Ranking**: Score documents by relevance using signals (TF-IDF, BM25, PageRank, CTR).
- **Serving**: Query processor distributes query to index servers, merges results, ranks, returns top 10.

**Web Crawler**: A program that systematically downloads web pages. Key constraints:
- **Politeness**: Don't overload a server — use delays between requests.
- **Freshness**: Re-crawl pages based on change frequency.
- **Scalability**: Crawl billions of pages across thousands of servers.
- **Robustness**: Handle DNS failures, timeouts, malformed HTML, redirect loops.

## 3. Why It Exists / Problem It Solves

Before Google (1998), web search was: Yahoo (human-curated directory — didn't scale), AltaVista (keyword search but spam-filled). Google's breakthrough:
- **PageRank**: Rank pages by link authority, not keyword density.
- **Scalable crawl**: Google could index 25M+ pages by 1998.
- **Quality results**: PageRank + anchor text + proximity search.
- **Web crawlers solve**: Discovery of new/updated content at scale.

## 4. When to Use It

- **General web search**: Google, Bing, DuckDuckGo.
- **Vertical search**: Specialized search (Jobs, Real estate, Shopping).
- **News aggregation**: Google News (crawl news sites every few minutes).
- **SEO tools**: Ahrefs, Semrush (crawl for backlink analysis).
- **Archival**: Internet Archive (Wayback Machine) — preserve historical web snapshots.

## 5. When NOT to Use It / Tradeoffs

- **Enormous resource cost**: Google uses 2M+ servers. Electric bill alone is billions.
- **Legal/compliance**: GDPR right-to-be-forgotten, copyright (DMCA), content licensing.
- **Spam and SEO manipulation**: Content farms, link farms. Google updates algorithms 500+ times/year.
- **Privacy**: Search history, click tracking raise privacy concerns.
- **Freshness vs quality tradeoff**: Re-crawling too often wastes resources.
- **Duplicate content**: 30%+ of web is duplicate. Dedup is expensive (SimHash, MinHash).

## 6. System Design Deep Dive

**Web Crawler Architecture**:

1. **URL Frontier**: Distributed priority queue of URLs to crawl. Prioritizes by page importance, crawl freshness, host-bounded.
2. **DNS Resolver**: Batch DNS lookups for performance. Cache millions of entries.
3. **Fetcher**: HTTP GET with configurable user-agent, timeout, retries. Handle redirects, decompression.
4. **Parser**: HTML parsing, extract links, extract metadata (title, meta description).
5. **Content Seen Test**: Detect duplicates via **SimHash** (fuzzy fingerprint). If 95%+ similar, skip indexing.
6. **Link Extractor**: Extract all \`<a href>\` links. Normalize, add to URL frontier.
7. **Politeness Filter**: Track per-domain request rate. Token bucket — max 1 req/2s per domain.

**Inverted Index Building**:

1. **Tokenizer**: Split text into tokens. Unicode normalization, case folding, stemming.
2. **Analyzer**: Remove stop words, apply language detection.
3. **Inverted List**: For each term, posting list \`[(docId1, positions[3, 17, 22]), ...]\`.
4. **Index Sharding**: Partition by term (Google uses term-based sharding).
5. **Index Merge**: Batch-sort postings, write to SSTables.

**Ranking**:
- **Query-dependent signals**: TF-IDF, BM25, term proximity, title/URL match.
- **Query-independent signals**: PageRank, domain authority, freshness.
- **Personalization**: Location, search history.
- **Click-through rate**: Historical CTR for query+result combination.

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [Web] --HTTP--> [Crawler Cluster]
                     |
  +----------+--------+--------+----------+
  |          |        |        |          |
 [URL      [DNS     [Fetcher [Parser   [Content
  Frontier]  Cache]   Farm]    Farm]     Seen Test]
                     |                   |
                     |             [Duplicate
                     |              Detection]
                     |
              [Raw HTML Storage (GFS)]
                     |
              [Indexer Pipeline]
                     |
  +----------+--------+--------+
  |          |        |        |
 [Parser   [Inverted [Forward [PageRank
  Stage]    Index]    Index]   Solver]
                     |
              [Index Shards]
              (Bigtable/SSTables)
                     |
  [User] --HTTP--> [Query Processor]
                     |
              [Ranking Service]
                     |
              [Top 10 Results]

Crawl Flow:
  URL Frontier -> Fetcher -> Parser -> Content Seen? -> Indexer
       ^                                |                    |
       |                           [Store raw HTML]     [Build Index]
       |                                |
  [Link Extractor] <-- Parser extracts links
       |
  [URL Frontier] URL added with priority score
\`\`\`

## 8. Real-World Flow Example

1. **URL Frontier** starts with seed URLs (sitemaps from top 10M domains).
2. Fetcher picks URL: \`https://en.wikipedia.org/wiki/System_design\`.
3. Politeness filter: last request to en.wikipedia.org was 3 seconds ago (max 1 req/2s). OK.
4. DNS resolver: \`en.wikipedia.org → 208.80.154.224\` (cached).
5. Fetcher sends HTTP GET with Googlebot user-agent.
6. Response: 200 OK, Content-Type: text/html, Content-Length: 89214.
7. Parser extracts title "System design - Wikipedia", 142 outbound links.
8. Content seen test: SimHash = 0x4F2A... No match. New page!
9. Raw HTML stored in GFS.
10. Indexer: Tokenize → 5,432 unique terms. Build inverted index.
11. Link extractor normalizes links. Adds to URL frontier: \`https://en.wikipedia.org/wiki/Distributed_computing\`, etc.
12. Later, user searches "system design interview":
    - Query processor tokenizes: ["system", "design", "interview"].
    - Looks up inverted index for each term. Retrieves posting lists.
    - Intersect: documents containing all three terms (50K results).
    - Rank by BM25 × PageRank × domain authority × freshness.
    - Top result: Wikipedia article. SERP returned in <200ms.

## 9. API & Data Model Design

**REST API Endpoints (Internal)**:

\`\`\`
POST /internal/crawl/seed
  Request:  { "urls": ["https://example.com"], "priority": 0.9 }
  Response: { "jobId": "crawl_123", "urlsAdded": 1 }

GET  /internal/index/query
  Query: q=system+design+interview, page=1, rpp=10
  Response: { "totalResults": 50000, "results": [{"title": "...", "url": "...", "snippet": "..."}] }
\`\`\`

**Database Schema**:

\`\`\`sql
-- URL Frontier (distributed queue, e.g., Redis SortedSet)
-- Key: url_frontier -> ZSet<url, priority_score>

-- Crawled documents (Bigtable row)
-- RowKey: reversed_domain/url_path/timestamp
-- ColumnFamily: raw { html, http_headers, fetch_time }
-- ColumnFamily: meta { title, description, language, simhash }
-- ColumnFamily: links { outbound: [url1, url2, ...] }

-- Inverted Index (Bigtable/SSTables)
-- RowKey: term
-- ColumnFamily: postings { docId: term_frequency + positions_bitmap }

-- Robots cache (Memcache/Redis)
-- Key: robots:{domain} -> { disallowed_paths: [...], crawl_delay: 2 }

-- Domain crawl stats (Cassandra)
CREATE TABLE domain_stats (
    domain TEXT PRIMARY KEY,
    last_crawled TIMESTAMP,
    crawl_count COUNTER,
    avg_response_time_ms INT,
    error_rate DECIMAL(5,4)
);
\`\`\`

## 10. Real Company Use Cases

- **Google Search**: 3.5B+ searches/day, 100B+ pages indexed. **Caffeine** (continuous indexing, 2010). **Hummingbird** (semantic search, 2013). **RankBrain** (ML ranking, 2015). **BERT** (language understanding, 2019). Infrastructure: **GFS**, **Bigtable**, **Spanner**, **MapReduce/Flume**, **TPUs**.
- **Bing (Microsoft)**: 1B+ searches/day. **Azure** infrastructure. **InMage** for incremental crawl. **ChatGPT integration** (2023).
- **DuckDuckGo**: Privacy-focused. Uses **Bing API** + **Yahoo BOSS** + 400+ sources.
- **Baidu**: China's dominant search. **Baiduspider** crawls 10B+ pages. **NLP** for Chinese queries.
- **Common Crawl**: Non-profit, open web crawl. PB-scale archives on AWS S3. Used by researchers.

## 11. Common Interview Questions

1. *Design a web crawler that can crawl 1B pages per month.*
2. *How does Google'"'"''"'"'s PageRank algorithm work?*
3. *Design the inverted index for a search engine. How do you handle indexing updates?*
4. *How does a search engine handle duplicate content and spam?*
5. *Design the URL frontier — how do you prioritize which pages to crawl next?*
6. *How would you implement a freshness policy for re-crawling?*
7. *Design the query processing pipeline from input to results.*
8. *How does Google detect and penalize black-hat SEO?*

## 12. Related Topics & Next Steps

- **PageRank Algorithm**: Power iteration, random surfer model.
- **Inverted Index**: Term-doc matrix, posting lists, skip pointers, compression.
- **BM25/TF-IDF**: Text relevance scoring functions.
- **SimHash**: Near-duplicate detection for web pages.
- **Bloom Filters**: URL seen test (efficient set membership).
- **MapReduce/Flume**: Distributed index building pipeline.
- **Robots Exclusion Protocol**: robots.txt semantics.
- **Next Lesson**: Design Rate Limiter.`,
    estimatedMin: 45,
    difficulty: 'ADVANCED',
    companies: ['Google', 'Bing', 'Microsoft', 'Baidu', 'Common Crawl', 'DuckDuckGo'],
    tags: ['web-crawler', 'search-engine', 'pagerank', 'inverted-index', 'crawling', 'indexing']
  },
  {
    id: 'lesson-08-10',
    slug: 'system-design-interviews-10-design-rate-limiter',
    title: 'Design Rate Limiter',
    content: `## 1. Quick Summary

Designing a **rate limiter** is a system design classic — it controls the rate at which a user, IP, or API key can make requests to a service. Rate limiters prevent **abuse**, **DDoS attacks**, **resource exhaustion**, and ensure **fair usage**. Common algorithms: **Token Bucket** (allow bursts up to capacity), **Leaky Bucket** (smooth request rate), **Fixed Window Counter** (simple, boundary spikes), **Sliding Window Log** (precise, memory-heavy), and **Sliding Window Counter** (Redis Sorted Sets — efficient and accurate). At scale (100K+ requests/sec), rate limiters must be **highly available** and **fast** (sub-millisecond decision). Systems use **Redis** (atomic Lua scripts for counters) or **client-side rate limiting with server-side enforcement**. Distributed rate limiting adds complexity: **consistent hashing** for sticky rate limits or **centralized Redis cluster**.

## 2. Definition

A **rate limiter** restricts the number of operations a caller can perform within a time window. Key concepts:
- **Limit**: Maximum allowed operations per window.
- **Window**: Time interval (1 second, 1 minute, 1 hour, 1 day).
- **Key**: What is being rate-limited (user ID, IP address, API key, endpoint).
- **Throttling**: Blocking or delaying requests that exceed the limit.

**HTTP Status Codes for Rate Limiting**:
- **429 Too Many Requests**: Standard response.
- **Retry-After** header: How long the client should wait before retrying.
- **X-RateLimit-Limit**: The limit.
- **X-RateLimit-Remaining**: Remaining requests.
- **X-RateLimit-Reset**: Time when the window resets.

## 3. Why It Exists / Problem It Solves

Without rate limiting:
- A single misconfigured client can saturate server resources, causing denial of service for others.
- Web scrapers can extract all data from public APIs overnight.
- Brute-force login attacks can try millions of passwords.
- DDoS attacks can overwhelm backend services.

Rate limiting solves: **fair resource allocation**, **cost control** (API pricing tiers), **security** (brute-force protection), **infrastructure protection** (DDoS mitigation), and **SLA enforcement**.

## 4. When to Use It

- **API gateways**: Enforce API key rate limits (e.g., 1000 req/hour for free tier, 10000 for paid).
- **Login endpoints**: 5 attempts per minute per IP to prevent brute-force.
- **Social media APIs**: Twitter API: 450 requests per 15-minute window.
- **Web application firewalls**: Rate limit per IP to mitigate DDoS.
- **Database connection pooling**: Limit concurrent connections per user.
- **Web scraping protection**: Rate limit by IP + User-Agent fingerprint.

## 5. When NOT to Use It / Tradeoffs

- **Distributed rate limiting is hard**: Coordinating across multiple servers adds latency and complexity.
- **False positives**: Legitimate users may hit limits during flash crowds.
- **Accuracy vs performance tradeoff**: Sliding window log is most accurate but memory-heavy. Fixed window is fast but allows 2x bursts at boundaries.
- **Redis dependency**: Most high-scale implementations use Redis — adds operational complexity and cost.
- **Client-side bypass**: Determined clients can rotate IPs or API keys.
- **Hard vs soft throttling**: Hard throttling (block) may break legitimate traffic. Soft throttling (delay/queue) improves UX but adds complexity.

## 6. System Design Deep Dive

**Algorithm Comparison**:

| Algorithm | Accuracy | Memory | Burst Handling | Use Case |
|-----------|----------|--------|---------------|----------|
| Token Bucket | Good | Low | Allows bursts | Most versatile, used by AWS, Stripe |
| Leaky Bucket | Good | Low | Smooths bursts | Traffic shaping |
| Fixed Window | Poor (boundary spikes) | Low | Allows 2x bursts | Simple cases |
| Sliding Window Log | Exact | High | Precise | Compliance/Critical APIs |
| Sliding Window Counter | Good | Medium | Good balance | Redis Sorted Set implementation |

**Token Bucket Algorithm**:
1. Bucket has capacity C tokens. Refill at rate R tokens/second.
2. Each request consumes 1 token.
3. If tokens remain, request allowed. If empty, request denied.
4. Token bucket allows bursts up to C requests at once, then smooths to rate R.
5. Implementation: Store \`{tokens: N, last_refill: timestamp}\` per key in Redis.

**Sliding Window Counter** (Redis Sorted Set):
1. For each rate limit key, maintain a Sorted Set of request timestamps.
2. Key: \`ratelimit:{key}:{endpoint}\`, Score: timestamp, Value: unique request ID.
3. On request: \`ZREMRANGEBYSCORE {key} 0 {now - window}\` (remove expired entries).
4. \`ZCOUNT {key} {now - window} {now}\` (count requests in window).
5. If count < limit: \`ZADD {key} {timestamp} {requestId}\`, allow request.
6. Set TTL on key: \`EXPIRE {key} {window}\`.

**Distributed Rate Limiting**:
- **Centralized Redis cluster**: Single source of truth. All servers read/write to same Redis.
- **Consistent hashing partition**: Rate limit key → Redis node. Sticky, but node failure loses limits.
- **Local + sync approach**: Each server maintains local counters, periodically syncs to Redis. Less accurate but faster.

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [Client] -> [API Gateway / Load Balancer] -> [Rate Limiter Middleware]
                                                     |
                                               [Redis Cluster]
                                                     |
                                            [Application Servers]

Flow:
  Request arrives at API Gateway
     |
  Rate Limiter Middleware:
     |
  Extract rate limit key (API key, IP, user ID)
     |
  Lookup rules: { key_type: "api_key", limit: 1000, window: 3600 }
     |
  Redis: EVAL rate_limit.lua (atomic script)
     |
  Script: check current count, increment, compare
     |
  If under limit: allow -> forward to backend
  If over limit: deny -> return 429 with Retry-After header
     |
  Redis: set TTL if new window

Redis Lua Script (sliding window counter):
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local window_start = now - window
  
  redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
  local count = redis.call('ZCARD', key)
  
  if count < limit then
    redis.call('ZADD', key, now, now .. ':' .. math.random())
    redis.call('EXPIRE', key, window)
    return 1  -- allowed
  else
    return 0  -- denied
  end
\`\`\`

## 8. Real-World Flow Example

1. **Client** sends \`GET /api/v1/users HTTP/1.1\` with header \`Authorization: Bearer sk_live_abc123\`.
2. **API Gateway** receives request. Rate Limiter Middleware extracts API key \`sk_live_abc123\`.
3. Middleware queries rule cache: developer \`dev_456\` has limit 1000 requests/hour.
4. Constructs Redis key: \`ratelimit:sk_live_abc123:/api/v1/users:hour\`.
5. Sends Lua script to Redis: check count in sliding 3600s window.
6. Redis: current count = 843 (under limit 1000). Script adds timestamp to sorted set. Returns allowed.
7. Middleware adds response headers:
   - \`X-RateLimit-Limit: 1000\`
   - \`X-RateLimit-Remaining: 156\`
   - \`X-RateLimit-Reset: 1711839600\`
8. Request forwarded to backend. Backend returns response.
9. Client sends 157 more requests in the next 10 minutes. Count reaches 1000.
10. 1001st request: Redis script returns denied. Middleware returns:
   - \`HTTP 429 Too Many Requests\`
   - \`Retry-After: 1850\` (seconds until window clears oldest entries)
   - \`X-RateLimit-Remaining: 0\`
11. Client can retry after 1850 seconds (or wait for sliding window to expire old entries).

## 9. API & Data Model Design

**Rate Limit Configuration Model**:

\`\`\`typescript
interface RateLimitRule {
  keyType: 'api_key' | 'ip' | 'user_id' | 'endpoint';
  limit: number;           // max requests
  windowSeconds: number;   // time window
  throttleResponse: '429' | 'queue' | 'degrade';
  burstMultiplier?: number; // token bucket burst capacity
}
\`\`\`

**Database Schema**:

\`\`\`sql
-- Rate limit rules (PostgreSQL)
CREATE TABLE rate_limit_rules (
    id TEXT PRIMARY KEY,
    key_type TEXT NOT NULL,           -- '"'"'api_key'"'"', '"'"'ip'"'"', '"'"'user_id'"'"', '"'"'endpoint'"'"'
    key_pattern TEXT,                  -- e.g., '"'"'/api/v1/*'"'"' for endpoint matching
    limit_value INT NOT NULL,
    window_seconds INT NOT NULL,
    burst_capacity INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- API keys and their tiers
CREATE TABLE api_keys (
    api_key TEXT PRIMARY KEY,
    developer_id TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT '"'"'free'"'"',  -- '"'"'free'"'"', '"'"'pro'"'"', '"'"'enterprise'"'"'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- API key rate limit configuration
CREATE TABLE api_key_limits (
    tier TEXT PRIMARY KEY,
    requests_per_hour INT,
    requests_per_day INT,
    concurrent_limit INT,
    burst_capacity INT
);
\`\`\`

**Redis Key Structure**:

\`\`\`
// Token Bucket
ratelimit:token_bucket:{key} -> { "tokens": 10, "last_refill": 1711839600 }

// Sliding Window Counter
ratelimit:sliding:{key}:{endpoint} -> SortedSet<timestamp, requestId>

// Fixed Window Counter
ratelimit:fixed:{key}:{endpoint}:{window_start} -> Counter (INCR)
\`\`\`

## 10. Real Company Use Cases

- **Twitter API**: Multiple tiers (Essential: 500K tweets/month, Elevated: 2M/month). Per-endpoint and per-user limits. App rate limit: 450 requests/15-min window. User rate limit: 300 requests/15-min window.
- **GitHub API**: 5000 requests/hour per authenticated user (60 req/hour for unauthenticated). Per-endpoint limits. Conditional requests don't count toward limit.
- **Stripe API**: Token bucket algorithm. 100 read ops/second, 100 write ops/second per API key. Burst up to 100 requests. Keys in header \`Stripe-Version\`.
- **AWS API Gateway**: Token bucket with burst. Standard: 10,000 requests/second per region. Can request increase. Per-API key throttling.
- **Cloudflare Rate Limiting**: Per-IP and per-path matching. Fixed window or rate-based. Custom response pages for blocked requests. 1M+ rules supported.
- **Google APIs**: 60 requests/user/minute/API (varies). Quota enforcement per project per method. Exponential backoff recommended.

## 11. Common Interview Questions

1. *Compare rate limiting algorithms: Token Bucket vs Sliding Window vs Fixed Window.*
2. *Design a distributed rate limiter for 1000+ application servers.*
3. *How would you implement rate limiting for a social media API with burst support?*
4. *Design the Redis data structures and Lua scripts for efficient rate limiting.*
5. *How do you handle rate limiting for unauthenticated users (by IP)?*
6. *What headers should a rate-limited API return? Design the response format.*
7. *How would you support hierarchical rate limits (per-user, per-endpoint, global)?*
8. *Design a rate limiter that gracefully degrades service instead of blocking.*
9. *How do you test rate limiters at scale?*
10. *What are the tradeoffs between centralized and distributed rate limiting?*
11. *How would you implement rate limiting for WebSocket connections?*
12. *Design a multi-tier rate limiting strategy for a global SaaS platform.*

## 12. Related Topics & Next Steps

- **Token Bucket vs Leaky Bucket**: Burst handling and traffic shaping tradeoffs.
- **Redis Sorted Sets**: Efficient sliding window counter implementation.
- **Lua Scripting in Redis**: Atomic operations for rate limit checks.
- **Consistent Hashing**: Distributing rate limit state across Redis nodes.
- **API Gateway Architecture**: Rate limiting at the gateway vs application layer.
- **DDoS Mitigation**: Rate limiting as part of a defense-in-depth strategy.
- **Next Lesson**: Design Notification System.`,
    estimatedMin: 35,
    difficulty: 'INTERMEDIATE',
    companies: ['Twitter', 'GitHub', 'Stripe', 'AWS', 'Cloudflare', 'Google'],
    tags: ['rate-limiter', 'token-bucket', 'sliding-window', 'redis', 'throttling', 'api-gateway']
  },
  {
    id: 'lesson-08-11',
    slug: 'system-design-interviews-11-design-notification-system',
    title: 'Design Notification System',
    content: `## 1. Quick Summary

Designing a **notification system** is a common design problem that involves delivering **push notifications** (mobile), **emails**, and **SMS** to users across multiple channels. The core system must: **ingest notification requests** from various services, **template render** personalized content, **route to the correct channel** (push/email/SMS/in-app), **manage delivery preferences** (user opt-in/opt-out), **handle rate limits** (per user, per channel), and **provide analytics** (delivery rate, open rate). At scale (1B+ notifications/day for Facebook/Meta), the architecture uses **message queues** (Kafka) for buffering, **distributed worker pools** for channel delivery, **DynamoDB/Cassandra** for notification history, and **Spark/Flink** for real-time analytics. The notification system must be **highly reliable** (at-least-once delivery), **low latency** (push <500ms), and **cost-effective** (SMS is expensive, email is moderate, push is cheap).

## 2. Definition

A **notification system** delivers timely information to users about events they care about. Types:
- **Push notification**: Alert on mobile device via APNs (Apple) or FCM (Google).
- **Email**: HTML or plain text via SMTP or third-party services (SendGrid, SES).
- **SMS**: Text message via Twilio, Vonage, or direct carrier connections.
- **In-app notification**: Banner, toast, or badge within the application (WebSocket or polling).
- **Webhook**: HTTP callback to customer-provided endpoint.

Key metrics:
- **Delivery rate**: % of notifications successfully delivered.
- **Open rate**: % of delivered notifications that were opened/read.
- **Click-through rate (CTR)**: % of opened notifications where user took action.
- **Opt-out rate**: % of users who disable notifications.

## 3. Why It Exists / Problem It Solves

Without a centralized notification system:
- Each microservice implements its own notification logic → duplication, inconsistency.
- Users receive spam because there's no centralized preference management.
- Notification delivery is unreliable — no retries, no delivery tracking.
- No analytics on which notifications drive user engagement.

A unified notification system solves: **centralized preference management**, **consistent delivery across channels**, **template management** (consistent branding), **delivery analytics** (understand what works), **rate limiting** (prevent notification fatigue), and **cost optimization** (route to cheapest effective channel).

## 4. When to Use It

- **User onboarding**: Welcome email, push notification to complete profile.
- **Transaction alerts**: Payment confirmation, shipping update, password change.
- **Marketing campaigns**: Promotional emails, re-engagement push notifications.
- **Social interactions**: Like, comment, follow, mention notifications.
- **System alerts**: Billing issues, account suspension, security alerts.
- **Real-time updates**: Live stream started, friend online, meeting reminder.
- **Scheduled reminders**: Calendar events, payment due dates, subscription renewal.

## 5. When NOT to Use It / Tradeoffs

- **Push notification deliverability**: iOS/Android can delay or batch notifications. No guarantee of instant delivery.
- **Email deliverability**: Spam filters may block legitimate emails. Domain reputation management is required.
- **SMS costs**: $0.0075-$0.02 per SMS in US. Not cost-effective for high-volume transactional comms.
- **User opt-out risk**: Too many notifications → user disables all notifications permanently.
- **Template complexity**: Supporting multiple languages, dynamic content, A/B testing is complex.
- **At-least-once vs exactly-once**: Notifications may be delivered more than once (idempotency is client's responsibility).
- **Third-party dependency**: APNs, FCM, SendGrid, Twilio — all can go down or change APIs.

## 6. System Design Deep Dive

**Notification Pipeline**:

1. **Ingestion**: Services produce notification events to Kafka topic \`notification_events\`.
2. **Pre-processor**: Consumes from Kafka. Validates event schema. Enriches with user data (name, language, preferences).
3. **Template Engine**: Renders notification content from templates (Mustache/Handlebars). Populates with user-specific variables.
4. **Channel Router**: Determines best channel(s) based on:
   - User preference (push allowed? email allowed? SMS only for critical?).
   - Notification priority (CRITICAL → all channels, LOW → push only).
   - Channel delivery history (user always ignores email → try push).
5. **Rate Limiter**: Enforces per-user, per-channel, per-hour limits. Prevents notification fatigue.
6. **Deduplication**: If same event type for same user within dedup window, skip or coalesce.
7. **Delivery Workers**: Channel-specific workers (Push Worker, Email Worker, SMS Worker).
8. **Delivery**: Push → FCM/APNs. Email → SendGrid/SES. SMS → Twilio.
9. **Feedback Loop**: Track delivery status (sent, delivered, opened, clicked, bounced, opted-out).
10. **Analytics**: Real-time dashboard showing delivery rates, open rates, CTR by channel, campaign, user segment.

**Push Notification Delivery**:
1. User installs app, grants notification permission. App receives device token from APNs/FCM.
2. App sends token to server: \`POST /api/v1/devices {token, platform, userId}\`.
3. When sending push: Push Worker sends HTTP/2 request to APNs or FCM with device token.
4. APNs/FCM attempts delivery to device. Returns success/failure.
5. On failure (invalid token): remove device record. On success: record delivery.

**Template Engine**:
- Templates stored in database or CDN (for fast retrieval).
- Support variable substitution: \`Hello {{firstName}}, your order {{orderId}} has shipped!\`.
- Support localization: \`templates/{templateId}/{locale}.html\`.
- Support A/B testing: percentage of users get variant A vs variant B.

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [Service A] --Kafka--> [Notification Service] --Kafka--> [Channel Workers]
  [Service B] --Kafka--> [Notification Service] --HTTP----> [Third-party APIs]
                              |
                        [Pre-processor]
                              |
                        [Template Engine]
                              |
                        [Channel Router]
                              |
                        [Rate Limiter]
                              |
                        [Deduplication]
                              |
              +-----------+---+---+-----------+
              |           |       |           |
        [Push Worker] [Email   [SMS      [In-App
                       Worker]  Worker]    Worker]
              |           |       |           |
         [APNs/FCM]  [SendGrid] [Twilio]  [WebSocket]

Message Flow:
  Service produces notification event to Kafka
     |
  Pre-processor consumes, enriches with user data
     |
  Template Engine renders content
     |
  Channel Router decides: push + email
     |
  Rate Limiter checks per-user per-channel limits
     |
  Dedup: same event within 1 hour? Skip.
     |
  Push Worker: send to FCM (Android) or APNs (iOS)
  Email Worker: send via SendGrid
     |
  Feedback: track delivery, opens, clicks -> Kafka -> Analytics
\`\`\`

## 8. Real-World Flow Example

1. **User A** lists their apartment on Airbnb. Guest B books instantly.
2. **Booking Service** produces event to Kafka: \`{eventType: "booking_confirmed", userId: "user_A", data: {guestName: "B", checkIn: "2024-03-15", payout: 350}}\`.
3. **Pre-processor** consumes event. Fetches User A profile: name "Alice", locale "en-US", preferences {push: true, email: true, sms: false}.
4. **Template Engine** loads template \`booking_confirmed/en-US\`. Renders: "Hi Alice! Bob has booked your apartment from Mar 15-17. You'll earn $350."
5. **Channel Router**: Priority is "high" (financial transaction) → push + email.
6. **Rate Limiter**: User A has received 2 push notifications in the last hour (limit: 5/hour). Email: 1 in last hour (limit: 10/hour). Both OK.
7. **Deduplication**: No duplicate booking confirmation for User A in last 24 hours. Proceed.
8. **Push Worker**: Sends to FCM with device token "fcm_token_alice_phone". FCM delivers to Alice's phone. Notification appears.
9. **Email Worker**: Renders HTML email, sends via SendGrid. Alice receives email "You have a new booking!"
10. Alice opens push notification → deep link to booking details. Open tracked.
11. **Feedback Loop**: Push delivered (200 OK from FCM). Email delivered (250 OK from SendGrid). Both logged to analytics.
12. Later: Alice clicks email link → CTR tracked.

## 9. API & Data Model Design

**REST API Endpoints**:

\`\`\`
POST   /api/v1/notifications/send
  Request:  { "userId": "user_A", "eventType": "booking_confirmed", "data": { "guestName": "Bob", "payout": 350 } }
  Response: { "notificationId": "notif_abc123", "status": "queued" }

POST   /api/v1/devices/register
  Request:  { "userId": "user_A", "deviceToken": "fcm_token_xyz", "platform": "android" }
  Response: { "deviceId": "dev_789", "status": "active" }

GET    /api/v1/notifications/{userId}/history
  Query: limit=20, cursor=abc
  Response: { "notifications": [...], "nextCursor": "def" }

POST   /api/v1/notifications/preferences
  Request:  { "userId": "user_A", "channels": { "push": true, "email": false, "sms": false } }
  Response: 200 OK

POST   /api/v1/notifications/{notificationId}/track/open
  Response: 200 OK

POST   /api/v1/notifications/{notificationId}/track/click
  Response: 200 OK
\`\`\`

**Database Schema**:

\`\`\`sql
-- Notification events (Cassandra for time-series)
CREATE TABLE notification_events (
    event_id TIMEUUID PRIMARY KEY,
    user_id TEXT,
    event_type TEXT,                 -- '"'"'booking_confirmed'"'"', '"'"'payment_received'"'"', etc.
    channel TEXT,                    -- '"'"'push'"'"', '"'"'email'"'"', '"'"'sms'"'"', '"'"'in_app'"'"'
    status TEXT,                     -- '"'"'queued'"'"', '"'"'sent'"'"', '"'"'delivered'"'"', '"'"'opened'"'"', '"'"'clicked'"'"'
    rendered_content TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_event_type (event_type)
);

-- User notification preferences
CREATE TABLE notification_preferences (
    user_id TEXT PRIMARY KEY,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    marketing_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,          -- don'"'"'t send during quiet hours
    quiet_hours_end TIME,
    daily_limit_push INT DEFAULT 10,
    daily_limit_email INT DEFAULT 20
);

-- User devices for push
CREATE TABLE user_devices (
    user_id TEXT,
    device_id TEXT,
    platform TEXT,                   -- '"'"'ios'"'"', '"'"'android'"'"', '"'"'web'"'"'
    device_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, device_id)
);

-- Templates
CREATE TABLE notification_templates (
    template_id TEXT,
    locale TEXT,                     -- '"'"'en-US'"'"', '"'"'es-ES'"'"', '"'"'fr-FR'"'"'
    event_type TEXT,
    channel TEXT,                    -- '"'"'push'"'"', '"'"'email'"'"', '"'"'sms'"'"'
    subject TEXT,                    -- email subject line
    body_template TEXT NOT NULL,     -- Mustache/Handlebars template
    from_address TEXT,               -- sender email/name
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (template_id, locale)
);
\`\`\`

## 10. Real Company Use Cases

- **Facebook/Meta**: 100B+ push notifications per day. Uses **Chronos** (event processing) and **Aurora** (async worker framework). **Template engine** with 100K+ templates in 100+ languages. **ML-based send time optimization**.
- **Twitter**: Push notifications for likes, retweets, DMs. Uses **Manhattan** KV store for device tokens. **Rate limited** per user (too many → aggregate notifications).
- **Uber**: Transactional notifications (ride status, payment receipt, safety alerts). **Push + SMS** for critical alerts (driver arrived, emergency). Uses **Twilio** for SMS.
- **Slack**: Real-time in-app + push for mentions, DMs. **WebSocket** for in-app. **APNs/FCM** for push. **Email digests** for inactivity.
- **Amazon**: Order confirmations, shipping updates, deal alerts. **SES** for email. **SNS** for push/SMS. **Pinpoint** for campaign management.
- **Airbnb**: Booking confirmations, messages, reviews. **SendGrid** for email. **Twilio** for SMS. **Custom push notification service**.

## 11. Common Interview Questions

1. *Design a notification system that delivers 10M+ notifications per day.*
2. *How would you handle user notification preferences and quiet hours?*
3. *Design the template engine for multi-language, multi-channel notifications.*
4. *How do you ensure at-least-once delivery without duplicates?*
5. *Design the rate limiting strategy for notifications (don'"'"'t spam users).*
6. *How would you implement A/B testing for notification content?*
7. *Design the analytics pipeline for tracking delivery, open, and click rates.*
8. *How do you handle third-party delivery failures (APNs down, SendGrid rate limit)?*

## 12. Related Topics & Next Steps

- **Delivery Channels**: APNs vs FCM vs Web Push API.
- **Template Engines**: Mustache, Handlebars, Liquid — server-side rendering.
- **Message Queues**: Kafka topics for event ingestion and worker coordination.
- **Idempotency**: Ensuring notifications aren'"'"'t sent multiple times for the same event.
- **Quiet Hours**: Respecting user sleep schedules.
- **A/B Testing**: Statistical significance for notification optimization.
- **Next Lesson**: Design Distributed Key-Value Store.`,
    estimatedMin: 40,
    difficulty: 'INTERMEDIATE',
    companies: ['Facebook', 'Twitter', 'Uber', 'Slack', 'Amazon', 'Airbnb'],
    tags: ['notification-system', 'push', 'email', 'sms', 'template-engine', 'delivery']
  },
  {
    id: 'lesson-08-12',
    slug: 'system-design-interviews-12-design-distributed-key-value-store',
    title: 'Design Distributed Key-Value Store',
    content: `## 1. Quick Summary

Designing a **distributed key-value store** (like **DynamoDB**, **Cassandra**, or **Redis Cluster**) requires building a system that stores and retrieves values by key across multiple nodes while providing **scalability**, **high availability**, and **configurable consistency**. Core challenges: **data partitioning** (consistent hashing with virtual nodes), **replication** (synchronous vs asynchronous), **consistency models** (eventual vs strong), **failure detection** (gossip protocol), **quorum-based reads/writes**, **hinted handoff** for temporary failures, **anti-entropy** for permanent failures (Merkle trees), and **membership management**. DynamoDB uses **consistent hashing** with **virtual nodes**, **vector clocks** for conflict detection, **sloppy quorums** during failures, and **gossip** for node failure detection. Cassandra extends Dynamo with **CQL** and **tunable consistency** per query.

## 2. Definition

A **distributed key-value store** is a NoSQL database that stores data as key-value pairs across multiple machines. Key design goals:
- **Scalability**: Linear performance scaling as nodes are added.
- **Availability**: System continues operating despite node failures.
- **Durability**: Data survives disk failures (replication across nodes/racks/data centers).
- **Configurable consistency**: Trade consistency for availability per operation.

**DynamoDB** (Amazon Dynamo-style) architecture principles:
- **Incremental scalability**: Add/remove nodes with minimal disruption.
- **Symmetry**: Every node has the same responsibilities.
- **Decentralization**: No single point of failure (no master).
- **Heterogeneity**: Nodes can have different capacities.

## 3. Why It Exists / Problem It Solves

Traditional relational databases with ACID transactions don'"'"'t scale horizontally for high-throughput, low-latency workloads:
- **Single-master replication** limits write throughput.
- **Synchronous replication** across data centers adds latency.
- **Joins and indexes** become slow at petabyte scale.

Distributed key-value stores solve: **high-throughput writes** (millions of writes/sec), **low-latency reads** (single-digit ms P99), **automatic partitioning** (no manual sharding), **multi-data center replication**, and **always-on availability** (no downtime for node failures or maintenance).

## 4. When to Use It

- **Session store**: User session data (DynamoDB, Redis, Cassandra).
- **Shopping cart**: DynamoDB for Amazon'"'"''"'"'s shopping cart.
- **Product catalog**: Document-based catalog (DynamoDB, Cassandra).
- **User profiles**: High-read, high-write user data.
- **Time-series data**: IoT sensor data, metrics (Cassandra, ScyllaDB).
- **Message queues**: Simple queues (Redis, DynamoDB Streams).
- **Metadata store**: For large-scale distributed systems.

## 5. When NOT to Use It / Tradeoffs

- **No complex queries**: No joins, no aggregations, no foreign keys.
- **No ACID transactions across partitions**: Limited transactional support (DynamoDB Transactions exist but have overhead).
- **Eventual consistency**: By default, reads may return stale data. Strong consistency costs 2x latency.
- **Large objects**: Values >10MB are inefficient. Store in S3, keep pointer in KV store.
- **Hot keys**: A single popular key (celebrity user, viral product) overloads one partition.
- **Operational complexity**: Running Cassandra/ScyllaDB requires significant ops expertise.

## 6. System Design Deep Dive

**Data Partitioning with Consistent Hashing**:

1. Hash each key to a position on a **ring** (0 to 2^64 - 1).
2. Each node owns a range of the ring.
3. **Virtual nodes**: Each physical node is represented by T virtual nodes (e.g., T=256) scattered across the ring.
4. Benefits: Better load distribution (smooths hot spots), faster rebalancing when nodes join/leave.

**Replication**:

1. Each key is replicated to N nodes (replication factor, e.g., N=3).
2. **Preference list**: First N unique nodes after the key'"'"''"'"'s position on the ring (clockwise).
3. Replicas placed across racks/data centers for fault isolation.

**Read/Write Operations (Quorum)**:

- N = replication factor. W = write quorum. R = read quorum.
- W + R > N = strong consistency for reads/writes.
- Typical: N=3, W=2, R=2 (strong consistency for single-data-center).
- Write: Coordinator sends write to all N replicas. Waits for W acknowledgments.
- Read: Coordinator sends read to all N replicas. Waits for R responses. Returns latest version (by timestamp/vector clock).

**Failure Handling**:

- **Hinted handoff**: When a replica is unavailable, coordinator stores a hint for that replica (on a different node). When replica recovers, hint forwarded.
- **Read repair**: On read, coordinator compares responses from replicas. If inconsistent, writes the latest version back to stale replicas.
- **Anti-entropy (Merkle trees)**: Periodically, nodes compare Merkle trees (hash tree of key ranges). If trees differ, synchronize the differing sub-range.

**Membership and Failure Detection**:

- **Gossip protocol**: Each node periodically (e.g., 1 second) gossips with a random other node. Exchange membership information (heartbeat counters, node status).
- **Failure detection**: If heartbeat counter hasn'"'"'t increased for N seconds, mark node as suspect. After T seconds, mark as dead.

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [Client] -> [Load Balancer] -> [Coordinator (any node)]
                                      |
                              [Ring of Virtual Nodes]
                                      |
  +----------+----------+-------------+-------------+----------+
  |          |          |             |             |          |
 [Node A]  [Node B]  [Node C]     [Node D]     [Node E]
  |          |          |             |             |          |
 [Data]    [Data]    [Data]        [Data]       [Data]
 [Merkle   [Merkle   [Merkle        [Merkle      [Merkle
  Tree]     Tree]     Tree]          Tree]        Tree]
                     |
              [Gossip Protocol]
              (membership & failure detection)

Consistent Hashing Ring:

       Node D
         |
    --- Node C ---
   |       |       |
  Node B  ...    Node E
   |       |       |
    --- Node A ---
         |
       (key placed here)

Read Path:
  Client sends GET(key)
     |
  Coordinator: hash(key) -> determine preference list (N nodes)
     |
  Send read to all N replicas (in parallel)
     |
  Wait for R responses
     |
  If vector clocks diverge: detect conflict, read repair
     |
  Return latest value to client

Write Path:
  Client sends PUT(key, value)
     |
  Coordinator: hash(key) -> determine preference list
     |
  Send write to all N replicas
     |
  If replica down: write hint (hinted handoff)
     |
  Wait for W acknowledgments
     |
  Return success to client
\`\`\`

## 8. Real-World Flow Example

1. **Client** wants to store \`user_profile:789\` → \`{name: "Alice", email: "alice@example.com"}\`.
2. **Coordinator** (any node in the cluster, say Node C) receives PUT request.
3. Node C hashes key \`user_profile:789\` using consistent hash: position 0x4F2A on ring.
4. Preference list (N=3): Node D (owns range 0x4000-0x5000), Node E (0x5000-0x6000), Node F (0x6000-0x7000).
5. Node C sends write to D, E, F in parallel. Nodes D and E acknowledge (W=2). Node F is slow, doesn'"'"'t respond within timeout.
6. Node F unavailable → Node C writes a hint (hinted handoff) on Node A: \`{key: "user_profile:789", value: ..., hint_for: Node F}\`.
7. PUT acknowledged after 2/3 responses (W=2). Returned to client.
8. **Later, Node F recovers**. Node A forwards the hint to Node F. Node F applies the write.
9. **Client reads** \`user_profile:789\`. Coordinator (Node G) sends read to D, E, F (N=3).
10. R=2: Nodes D and E respond. D has version 2 (latest), E has version 2 (same). No conflict. Return value.
11. **Network partition** occurs. Half the ring can'"'"'t reach the other half.
12. Writes to the minority side (2 of 5 nodes) can'"'"'t achieve W=2 (only 1 or 0 available).
13. Writes to the majority side (3 of 5 nodes) succeed with W=2.
14. When partition heals, hinted handoff + Merkle tree anti-entropy reconcile differences.

## 9. API & Data Model Design

**REST API Endpoints**:

\`\`\`
GET    /v1/objects/{key}
  Query: consistency_level=ONE|QUORUM|ALL
  Response: { "value": {...}, "version": 2, "timestamp": 1710000000 }

PUT    /v1/objects/{key}
  Request:  { "value": {...}, "condition": { "version": 1 } }
  Query: consistency_level=QUORUM
  Response: { "version": 2, "status": "stored" }

DELETE /v1/objects/{key}
  Response: { "status": "deleted" }

POST   /v1/batch/get
  Request:  { "keys": ["key1", "key2", "key3"] }
  Response: { "results": { "key1": {...}, "key2": {...} }, "unprocessed": ["key3"] }
\`\`\`

**Database Schema** (conceptual):

\`\`\`
-- Each node stores data in local SSTables
-- Key: hashed_key (64-bit)
-- ColumnFamily: data
--   { value: bytes, version: int, timestamp: long, vector_clock: string, deleted: boolean }
-- ColumnFamily: metadata
--   { merkle_tree: string, partition_range: string }

-- Hinted handoff storage (each node)
-- Key: hint_for_node
-- ColumnFamily: hints
--   { key: string, value: bytes, timestamp: long }
\`\`\`

## 10. Real Company Use Cases

- **Amazon DynamoDB**: Fully managed Dynamo-style service. **Single-digit ms latency** at any scale. **DAX** (DynamoDB Accelerator) for microsecond reads. **Global Tables** for multi-region replication. **Auto-scaling** based on traffic. Powers Amazon.com shopping cart, session store, and 200K+ AWS customers.
- **Apache Cassandra**: Open-source Dynamo-style DB. Used by **Netflix** (user activity, viewing history), **Apple** (iCloud), **Instagram** (feed storage), **Uber** (trip data). **Tunable consistency** per query.
- **Redis Cluster**: In-memory KV store with persistence options. **Hashed slot-based partitioning** (16,384 slots). **Master-replica** replication per shard. **Sentinel** for high availability.
- **ScyllaDB**: C++ reimplementation of Cassandra (10x faster). Used by **Discord** (message store), **Comcast**, **Zillow**.
- **Google Cloud Bigtable**: Wide-column KV store. Used for **Google Search** index, **Google Maps**, **YouTube**, **Gmail**.
- **Azure Cosmos DB**: Multi-model globally distributed DB. **Turnkey global distribution** with multiple consistency levels.

## 11. Common Interview Questions

1. *Design a distributed key-value store like DynamoDB (Dynamo paper).*
2. *How does consistent hashing with virtual nodes improve load distribution?*
3. *Explain how Dynamo handles node failures (hinted handoff, read repair, Merkle trees).*
4. *What is the gossip protocol and how does it detect node failures?*
5. *How does a distributed KV store handle concurrent writes? (vector clocks)*
6. *Explain the tradeoffs of W + R > N in quorum-based systems.*
7. *How would you design a global KV store with multi-region replication?*
8. *Compare DynamoDB vs Cassandra vs Redis Cluster architecture.*
9. *How does anti-entropy work using Merkle trees?*
10. *Design a strongly consistent version of Dynamo (e.g., using Paxos/Raft per partition).*
11. *How do you handle hot keys in a distributed KV store?*
12. *Design the membership management and failure detection for a 1000-node cluster.*

## 12. Related Topics & Next Steps

- **Dynamo Paper**: Amazon'"'"''"'"'s 2007 Dynamo paper — foundation for many modern KV stores.
- **Consistent Hashing**: Data partitioning with minimal movement on node changes.
- **Gossip Protocol**: Decentralized failure detection and membership.
- **Vector Clocks**: Conflict detection for concurrent updates.
- **Merkle Trees**: Efficient anti-entropy synchronization.
- **Hinted Handoff**: Temporary failure tolerance.
- **Quorum Systems**: W + R > N for configurable consistency.
- **Next Lesson**: Design Real-Time Leaderboard.`,
    estimatedMin: 50,
    difficulty: 'ADVANCED',
    companies: ['Amazon DynamoDB', 'Cassandra', 'Redis', 'ScyllaDB', 'Google Bigtable', 'Azure Cosmos DB'],
    tags: ['key-value-store', 'dynamodb', 'consistent-hashing', 'vector-clocks', 'gossip', 'merkle-tree']
  },
  {
    id: 'lesson-08-13',
    slug: 'system-design-interviews-13-design-real-time-leaderboard',
    title: 'Design Real-Time Leaderboard',
    content: `## 1. Quick Summary

Designing a **real-time leaderboard** system (like for gaming, sports, or gamification) requires tracking and ranking scores for millions of players with **low-latency updates** and **instant rank queries**. Core challenges: **efficient sorted data structure** (Redis Sorted Sets — O(log N) for add/update/rank queries), **handling tie-breaking** (same score → earlier timestamp wins), **real-time updates** (WebSocket push on rank changes), **range queries** (top 100, user's rank, friends leaderboard), and **sharding** for global vs regional leaderboards. Redis Sorted Sets (ZSET) provide the ideal data structure with \`ZADD\` to update score, \`ZRANK\` to get position, \`ZREVRANGE\` to get top N, and \`ZREVRANK\` for rank from top. For 100M+ players, use **sharding by score range** or **tree-based approaches** (Skip Lists, Segment Trees). The leaderboard must handle **score updates at 1M+ QPS** and **read-after-write consistency** (player should see their updated rank immediately).

## 2. Definition

A **real-time leaderboard** is a continuously updating ranking of players/entities by score. Key concepts:
- **Score**: Numeric value to rank by (points, time, distance, votes).
- **Rank**: Position in the sorted list (1 = highest score).
- **Tie-breaking**: Deterministic order for equal scores (usually earliest achievement wins, or lexicographic by ID).
- **Scope**: Global leaderboard, regional leaderboard, friends leaderboard, daily/weekly/all-time.
- **Update frequency**: Real-time, near real-time (seconds), or batch (minutes/hours).

**Data structures for leaderboards**:
- **Redis Sorted Sets**: O(log N) for updates and rank queries. O(log N + M) for range queries (top N).
- **Skip Lists**: Probabilistic balanced tree. O(log N) operations.
- **Segment Trees**: O(log N) range queries. Best for score-range queries.
- **MySQL indexed table**: \`SELECT * FROM scores ORDER BY score DESC LIMIT 100\` — O(N) scan.

**Redis Sorted Set commands**:
- \`ZADD leaderboard:global {score} {playerId}\` — update score.
- \`ZINCRBY leaderboard:global {increment} {playerId}\` — increment score.
- \`ZREVRANGE leaderboard:global 0 99 WITHSCORES\` — top 100.
- \`ZREVRANK leaderboard:global {playerId}\` — player rank (0-indexed).
- \`ZRANK leaderboard:global {playerId}\` — rank from bottom.
- \`ZSCORE leaderboard:global {playerId}\` — get player score.
- \`ZREVRANGEBYSCORE leaderboard:global +inf -inf LIMIT 0 100\` — top 100 with scores.

## 3. Why It Exists / Problem It Solves

Without a dedicated leaderboard system:
- **SQL ORDER BY score DESC LIMIT N** scans all rows (O(N)) + sorts (O(N log N)). Slow at 10M+ rows.
- **In-memory arrays** require expensive re-sorting after each score update.
- **No tie-breaking** — equal scores produce non-deterministic ordering.
- **No real-time updates** — players expect instant feedback on their rank change.

A real-time leaderboard system solves: **instant rank queries** (sub-millisecond), **efficient updates** (no full re-sort), **deterministic ordering** (tie-breaking rules), **range queries** (top N, around me), **scope management** (daily/weekly/all-time with TTL), and **high throughput** (1M+ updates/second on a single Redis instance with pipelining).

## 4. When to Use It

- **Gaming leaderboards**: High scores, ELO ratings, fastest times.
- **Sports**: Live tournament standings, fantasy sports points.
- **Gamification**: Employee performance dashboards, learning platform XP.
- **Competitive platforms**: Coding challenge scores (LeetCode, Codeforces), quiz rankings.
- **Voting/Polls**: Real-time vote counts (American Idol, Eurovision).
- **Auctions**: Highest bid leaderboard (eBay, stock exchanges).
- **Social media trends**: Trending topics, trending creators (real-time velocity scoring).

## 5. When NOT to Use It / Tradeoffs

- **Tie-breaking accuracy**: Redis Sorted Sets tie-break by lexicographic order of member string. For "earliest first" tie-breaking, encode timestamp in score: \`score = points * 10^12 + (MAX_TIMESTAMP - timestamp)\`.
- **Score precision**: Redis Sorted Set scores are 64-bit doubles (53-bit integer precision). At ~9 quadrillion, overflow risk for very large values.
- **Cold start**: Empty leaderboard on new day/week. Pre-populate? Graceful degradation.
- **Write amplification**: Every score update modifies the sorted set. For 10M+ active players, that's 10M+ ZADD operations/day.
- **Single point of failure**: Redis if not clustered. Use Redis Cluster or Redis Enterprise for high availability.
- **Staleness tolerance**: Some leaderboards update every few minutes (acceptable). Real-time requires always-hot Redis.

## 6. System Design Deep Dive

**Score Update Flow**:
1. Player performs action (wins game, completes level).
2. Game service emits score event to Kafka: \`{playerId, points: 150, gameId, timestamp}\`.
3. Leaderboard consumer reads from Kafka, computes delta.
4. Executes Redis commands:
   - \`ZINCRBY leaderboard:daily:{date} 150 player_123\`
   - \`ZINCRBY leaderboard:weekly:{week} 150 player_123\`
   - \`ZINCRBY leaderboard:alltime 150 player_123\`
5. Redis returns new score. Compute new rank: \`ZREVRANK leaderboard:global player_123\`.
6. If rank changed significantly (e.g., entered top 100, moved 10+ positions), push notification via WebSocket.

**Tie-Breaking Implementation**:

For "earliest to reach score wins": Encode timestamp in score.
- Score = \`points * 10^12 + (2^42 - elapsed_seconds_since_epoch)\`
- This gives ~9 trillion integer range for points (enough for most games).
- Alternative: \`ZADD leaderboard {score} {playerId}\` where playerId is padded timestamp + original ID.

**Leaderboard Types**:

| Type | Key Pattern | TTL | Update Pattern |
|------|-------------|-----|---------------|
| Daily | \`leaderboard:daily:2024-03-15\` | 48h EXPIRE | Increment on action |
| Weekly | \`leaderboard:weekly:2024-W11\` | 14d EXPIRE | Increment on action |
| Monthly | \`leaderboard:monthly:2024-03\` | 60d EXPIRE | Increment on action |
| All-time | \`leaderboard:alltime\` | Never | Increment on action |
| Friends | \`leaderboard:friends:{userId}\` | 1h (regenerated) | Batch compute periodically |

**Sharding for Global Scale (100M+ Players)**:

1. **Score-range sharding**: Divide the score space into ranges (e.g., 0-999, 1000-4999, 5000+). Each shard maps to a Redis node.
   - Pro: Each ZSET has fewer members.
   - Con: Range queries need to scan multiple shards.
   
2. **Active vs. inactive sharding**: Active players (scored in last 24h) in one ZSET. Inactive in archival storage.
   - Pro: Hot ZSET stays small (10% of players = 90% of operations).
   - Con: Rank queries must account for inactive players (approximate).

3. **Approximate leaderboards**: Use **Count-Min Sketch** + **HyperLogLog** for approximate ranking. Trade accuracy for memory.

**Caching**:
- **Top 100 cache**: Refresh every 10 seconds. Serve from cache for 99% of read requests.
- **User rank cache**: Cache \`ZREVRANK\` result for 1 second (players update score at most once/second).
- **Friends leaderboard cache**: Compute and cache for 30 seconds (expensive to compute on every request).

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [Game Client] --WebSocket--> [Game Server] --Kafka--> [Leaderboard Worker]
                                                            |
                                                    [Redis Cluster]
                                                            |
                                                    [Leaderboard API]
                                                            |
                                              [WebSocket Push Service]
                                                            |
                                              [Client receives rank update]

Redis Data Model:
  Key: leaderboard:global                        -> ZSET<member, score>
  Key: leaderboard:daily:2024-03-15              -> ZSET<member, score>
  Key: leaderboard:weekly:2024-W11               -> ZSET<member, score>
  Key: leaderboard:alltime                       -> ZSET<member, score>
  Key: leaderboard:friends:{userId}              -> ZSET<member, score>
  Key: leaderboard:cache:top100                  -> String (JSON, TTL=10s)
  Key: leaderboard:cache:rank:{userId}           -> String (JSON, TTL=1s)

Read Flow:
  Client requests leaderboard
     |
  Leaderboard API receives request
     |
  Check cache hit (top 100)? Return cached.
     |
  If miss:
     |
  ZREVRANGE leaderboard:global 0 99 WITHSCORES
     |
  Cache result (TTL=10s)
     |
  Return JSON to client

Write Flow:
  Player wins game
     |
  Game Server: ZINCRBY leaderboard:global 150 player_123
     |
  Game Server: ZREVRANK leaderboard:global player_123
     |
  Game Server: INCR key:player_123:score_count
     |
  If rank < 100: push to leaderboard update queue
     |
  WebSocket server: notify client of new rank
\`\`\`

## 8. Real-World Flow Example

1. **Player Alice** wins a match in a mobile battle royale game. She gains 150 points.
2. **Game server** sends score event to Kafka: \`{playerId: "alice_123", points: 150, gameId: "match_456", timestamp: 1710000000}\`.
3. **Leaderboard worker** consumes event. Executes Redis:
   - \`ZINCRBY leaderboard:daily:2024-03-15 150 "alice_123"\` → new score: 5,750.
4. Worker queries new rank: \`ZREVRANK leaderboard:daily:2024-03-15 "alice_123"\` → rank #47 (0-indexed: 46).
5. Since Alice is now in the top 100 (rank 47), worker pushes notification: \`{playerId: "alice_123", rank: 47, score: 5750}\` to WebSocket server.
6. Alice'"'"'s game client receives WebSocket message: "You are now #47 on today'"'"'s leaderboard!"
7. **Other player Bob** opens leaderboard tab. Client sends: \`GET /api/v1/leaderboard/daily?scope=top100\`.
8. **Leaderboard API** checks cache: \`leaderboard:cache:top100:daily:2024-03-15\`. Cache miss (expired).
9. API queries Redis: \`ZREVRANGE leaderboard:daily:2024-03-15 0 99 WITHSCORES\`. Returns 100 entries.
10. API caches result: \`SET leaderboard:cache:top100:daily "json..." EX 10\`.
11. Client renders top 100 leaderboard. Alice is ranked #47 with 5,750 points.
12. Bob also requests his rank: \`GET /api/v1/leaderboard/daily?scope=myrank&playerId=bob_456\`.
13. API queries: \`ZREVRANK leaderboard:daily:2024-03-15 "bob_456"\` → rank #12,042.
14. API also queries: \`ZREVRANGE leaderboard:daily:2024-03-15 12037 12047 WITHSCORES\` → 10 players around Bob.
15. Bob sees: "You are #12,042." With neighbors above and below.

## 9. API & Data Model Design

**REST API Endpoints**:

\`\`\`
GET    /api/v1/leaderboard/{scope}
  Query: period=daily|weekly|monthly|alltime, date=2024-03-15, limit=100, offset=0
  Response: { "leaderboard": [{"rank": 1, "playerId": "pro_999", "score": 99999}, ...], "totalPlayers": 50000000 }

GET    /api/v1/leaderboard/{scope}/rank
  Query: period=daily, playerId=alice_123
  Response: { "playerId": "alice_123", "rank": 47, "score": 5750, "neighbors": [{"rank": 46, ...}, {"rank": 48, ...}] }

GET    /api/v1/leaderboard/{scope}/friends
  Query: period=daily, userId=alice_123
  Response: { "leaderboard": [{"rank": 1, "friendId": "bob_456", "score": 8000}, ...] }

POST   /api/v1/score/update
  Request:  { "playerId": "alice_123", "points": 150, "source": "match_456" }
  Response: { "newScore": 5750, "newRank": 47 }
\`\`\`

**Database Schema**:

\`\`\`sql
-- Player scores (archival/analytics, not used for real-time ranking)
CREATE TABLE player_scores (
    player_id TEXT,
    period_type TEXT,               -- '"'"'daily'"'"', '"'"'weekly'"'"', '"'"'monthly'"'"', '"'"'alltime'"'"'
    period_start DATE,
    score BIGINT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id, period_type, period_start)
);

-- Score events (audit trail)
CREATE TABLE score_events (
    event_id TIMEUUID PRIMARY KEY,
    player_id TEXT,
    points INT NOT NULL,
    source TEXT,                     -- '"'"'match'"'"', '"'"'achievement'"'"', '"'"'bonus'"'"'
    source_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_player_id (player_id)
);

-- Leaderboard snapshots (for historical analysis)
CREATE TABLE leaderboard_snapshots (
    snapshot_id TEXT PRIMARY KEY,
    period_type TEXT,
    period_start DATE,
    snapshot_time TIMESTAMP NOT NULL DEFAULT NOW(),
    top_100 JSON,                    -- snapshot of top 100
    total_players INT
);
\`\`\`

**Redis Key Structure**:

\`\`\`
// Real-time leaderboards (Sorted Sets)
leaderboard:daily:2024-03-15           ZSET
leaderboard:weekly:2024-W11            ZSET
leaderboard:monthly:2024-03            ZSET
leaderboard:alltime                    ZSET

// Friends leaderboard (computed per user)
leaderboard:friends:alice_123          ZSET (TTL: 30s)

// Cached responses
leaderboard:cache:top100:daily:2024-03-15          String (TTL: 10s)
leaderboard:cache:rank:alice_123:daily:2024-03-15  String (TTL: 1s)
\`\`\`

## 10. Real Company Use Cases

- **Redis**: Most companies use Redis Sorted Sets for real-time leaderboards. **Twitch** uses Redis for channel points leaderboard. **Discord** uses Redis for server boost levels. **Stack Overflow** uses Redis for reputation leaderboards.
- **Game leaderboards**: **Electronic Arts** (FIFA Ultimate Team), **Supercell** (Clash of Clans, Brawl Stars), **Riot Games** (League of Legends LP/rank system). All use real-time leaderboards with Redis or custom Skip List implementations.
- **Strava**: Segment leaderboards (athlete times on specific routes). Uses Redis Sorted Sets for real-time all-time and this-year rankings. **KOM/QOM** (King/Queen of Mountain) titles drive engagement.
- **LeetCode**: Weekly contest leaderboard. Sorts by score (problems solved), then by time penalty. Uses Redis ZSET for real-time standings during contests.
- **Twitter Trends**: Trending topics use a **velocity-based** scoring function: \`score = tweet_count / time_decay\`. Not a pure leaderboard but similar data structure (Redis ZSET with time-decaying scores).
- **ESPN/Fantasy Sports**: Live fantasy football leaderboards update in real-time as NFL games progress. Stats feed → score calculation → Redis ZSET update → WebSocket push.

## 11. Common Interview Questions

1. *Design a real-time leaderboard for a mobile game with 50M+ players.*
2. *How would you implement tie-breaking (earliest to reach a score wins)?*
3. *Design the data structures for daily, weekly, all-time and friends leaderboards.*
4. *How do you handle 1M+ score updates per second without overwhelming Redis?*
5. *Design the caching strategy for top-N and user rank queries.*
6. *How would you shard a leaderboard across multiple Redis instances for 1B players?*
7. *Design the leaderboard for a fantasy sports platform with live scoring.*
8. *How would you implement a "players around me" feature (show neighbors on the leaderboard)?*

## 12. Related Topics & Next Steps

- **Redis Sorted Sets**: O(log N) operations for leaderboard data structure.
- **Skip Lists**: Probabilistic balanced tree — how Redis implements ZSET internally.
- **Score-Time Encoding**: Bit packing for tie-breaking.
- **Approximate Ranking**: Count-Min Sketch for high-cardinality leaderboards.
- **WebSocket Push**: Real-time rank change notifications.
- **Gamification Design**: Engagement-driving mechanics beyond leaderboards.
- **Next Lesson**: Design Parking Lot System (OO Design + Scale).`,
    estimatedMin: 35,
    difficulty: 'INTERMEDIATE',
    companies: ['Redis', 'Twitch', 'Discord', 'EA Sports', 'Supercell', 'Strava'],
    tags: ['leaderboard', 'redis', 'sorted-set', 'gaming', 'ranking', 'real-time']
  },
  {
    id: 'lesson-08-14',
    slug: 'system-design-interviews-14-design-parking-lot-system',
    title: 'Design Parking Lot System (OO Design + Scale)',
    content: `## 1. Quick Summary

The **Parking Lot System** is a classic **object-oriented design** problem that tests both OO modeling and system design thinking. At its core, you need to design a system that tracks **parking spots** (handicap, compact, large, EV charging), **vehicle entry/exit**, **ticketing**, **fee calculation**, **payment processing**, and **real-time availability display**. The OO design covers classes for \`ParkingLot\`, \`Floor\`, \`Spot\`, \`Vehicle\` (Car, Truck, Motorcycle, EV), \`Ticket\`, \`PaymentProcessor\`, and \`RateStrategy\`. The scaled system handles **multi-floor lots with 10K+ spots**, **entry/exit gates with sensors**, **license plate recognition (LPR)** cameras, **reservation system**, **dynamic pricing** (event-day surge, loyalty discounts), and **analytics** (occupancy trends, peak hours). Real-world implementations (e.g., ParkMobile, SpotHero) use **IoT sensors** (ultrasonic or magnetic) per spot, **edge computing** at gates for low-latency processing, and **cloud backend** for reservations and payments.

## 2. Definition

A **parking lot management system** handles the lifecycle of a vehicle entering and exiting a parking facility. Key entities:
- **ParkingLot**: Contains multiple floors/levels. Each floor has a layout of spots.
- **Spot**: Smallest unit — has type (compact, large, handicap, EV), status (occupied/vacant/reserved), and optional sensor.
- **Vehicle**: Has type (motorcycle, car, truck, EV), license plate, and entry attributes.
- **Ticket**: Issued at entry (start time). Used at exit to calculate fee.
- **Rate Strategy**: How fees are calculated (hourly, daily, flat, tiered, surge).
- **Entry/Exit Gate**: Physical barrier with LPR camera, display screen, ticket dispenser (entry) or payment terminal (exit).
- **Payment**: Credit card, mobile app, prepaid monthly pass, cash.

## 3. Why It Exists / Problem It Solves

Before modern parking management:
- Manual ticketing → human error, long queues, revenue leakage.
- No availability information → drivers circle blocks looking for spots (30% of city traffic).
- Fixed pricing → no demand-based optimization (empty lots during events, overflow during peak).
- No analytics → can'"'"'t predict occupancy, plan expansions, or optimize pricing.

Modern parking systems solve: **reduced congestion** (real-time availability directs drivers), **optimized revenue** (dynamic pricing based on occupancy and events), **improved user experience** (mobile reservation, contactless entry/exit), **revenue assurance** (automated ticketing reduces leakage), and **operational intelligence** (occupancy trends, peak hour analysis, maintenance alerts).

## 4. When to Use It

- **Commercial parking garages**: Shopping malls, office buildings, airports.
- **Street parking**: City-managed curb-side parking with sensors.
- **Event parking**: Stadiums, concert venues, convention centers (surge pricing).
- **Residential complexes**: Apartment building parking with assigned spots.
- **Airport parking**: Long-term, short-term, valet, economy lots.
- **Valet parking**: Ticket-less valet management with key tracking.
- **EV charging stations**: Integrated parking + charging management.

## 5. When NOT to Use It / Tradeoffs

- **Sensor costs**: Per-spot sensors cost $100-500 each. 10,000 spots = $1M-$5M hardware investment.
- **Maintenance**: Sensors fail (battery death, vandalism). False occupancy readings cause user frustration.
- **LPR accuracy**: License plate recognition fails in snow, fog, darkness, or dirty plates. <95% accuracy in ideal conditions.
- **Payment processing fees**: 2-3% per transaction. In-house vs third-party tradeoff.
- **Reservation complexity**: No-shows (30%+ rate), late arrivals, early departures complicate capacity planning.
- **Disaster recovery**: If gate servers go down, cars can'"'"'t enter/exit. Need offline fallback (paper tickets, rate cards).

## 6. System Design Deep Dive

**OO Design (Core Classes)**:

\`\`\`typescript
enum SpotType { COMPACT = '"'"'compact'"'"', LARGE = '"'"'large'"'"', HANDICAP = '"'"'handicap'"'"', EV = '"'"'ev'"'"' }
enum VehicleType { MOTORCYCLE = '"'"'motorcycle'"'"', CAR = '"'"'car'"'"', TRUCK = '"'"'truck'"'"', EV = '"'"'ev'"'"' }
enum TicketStatus { ACTIVE = '"'"'active'"'"', PAID = '"'"'paid'"'"', LOST = '"'"'lost'"'"' }

class ParkingSpot {
  id: string; floorId: string; type: SpotType;
  isOccupied: boolean; isReserved: boolean;
  sensorId?: string; vehicleId?: string;
}

class Vehicle { licensePlate: string; type: VehicleType; }

class Ticket {
  id: string; vehicle: Vehicle; spot: ParkingSpot;
  entryTime: Date; exitTime?: Date; status: TicketStatus;
  fee?: number; paymentMethod?: string;
}

class RateStrategy {
  calculateFee(entryTime: Date, exitTime: Date, spotType: SpotType): number;
}

class HourlyRateStrategy implements RateStrategy {
  rates = { compact: 2, large: 3, handicap: 1, ev: 2.5 };
  maxDaily = 20;
}

class ParkingLot {
  floors: Floor[]; entryGates: Gate[]; exitGates: Gate[];
  findAvailableSpot(vehicleType: VehicleType): ParkingSpot | null;
  park(vehicle: Vehicle, spot: ParkingSpot): Ticket;
  exit(ticketId: string, paymentMethod: string): Receipt;
}
\`\`\`

**Entry Flow**:
1. Vehicle approaches entry gate. LPR camera captures license plate.
2. LPR system processes image → OCR → plate text. Query database for registered/prepaid users.
3. Display shows: "Welcome, Alice! Spot A12 reserved. Please proceed."
4. If not recognized: Driver presses button for ticket. Ticket dispensed with barcode, entry time, spot assignment.
5. Gate opens (boom barrier). Vehicle enters. Sensor detects passage.
6. Parking system assigns spot (or driver selects). Spot sensor detects occupancy → status = occupied.
7. Spot availability counter decremented. Real-time display updated.

**Exit Flow**:
1. Vehicle approaches exit gate. LPR captures plate.
2. System looks up active ticket for plate.
3. If prepaid (mobile app): Gate opens. "Thank you, Alice! See you again."
4. If not prepaid: Display amount due. Driver inserts ticket/pays by card/mobile.
5. Payment processor authorizes. Receipt printed (or emailed).
6. Gate opens. Vehicle exits. Sensor confirms departure.
7. Spot marked vacant. Counters updated.

**Fee Calculation**:
- **Hourly**: $2.00 first hour, $1.00 each additional half-hour. Max $20/day.
- **Daily flat**: $15 for 24 hours.
- **Weekend special**: $10 flat.
- **Event surge**: +$10 during concerts/stadium events.
- **Loyalty discount**: 10% off for monthly members.
- **Validation**: Store-validated parking: 2 hours free with $20 purchase.

**Scalability (10K+ spots, multi-lot)**:

- **IoT sensors**: Per-spot ultrasonic/magnetic sensors → edge gateway → MQTT → cloud.
- **Edge computing**: Gate controllers run locally (Raspberry Pi / Jetson Nano) for low-latency LPR and gate control. Sync to cloud when online.
- **Database**: PostgreSQL for transactional data (tickets, payments, reservations). Sharded by lot_id.
- **Cache**: Redis for real-time availability counts, active ticket lookup.
- **Real-time updates**: WebSocket push for availability display, mobile app updates.
- **Analytics**: Kafka + Spark for occupancy trends, revenue reports, demand forecasting.

## 7. Architecture Diagram (C4)

\`\`\`
Container Diagram:
  [LPR Camera] --RTSP--> [Edge Gateway (Gate Controller)]
  [Spot Sensor] --ZigBee--> [Edge Gateway (Floor Hub)]
                                 |
  +--------+--------+--------+---+--------+--------+
  |        |        |        |        |        |        |
 [Entry    [Exit    [Payment [Reservation        [Analytics
  Gate]     Gate]    Terminal]  Service]    Admin]  Pipeline]
                           |           |           |
                     [PostgreSQL]  [Redis]   [Kafka + Spark]
                                      |
                                [Mobile App API]

OO Design Class Diagram:
  
  ParkingLot
    ├── Floor[]
    │     └── ParkingSpot[]
    │           ├── type: SpotType
    │           └── sensorId
    ├── EntryGate[]
    │     └── LPRCamera
    ├── ExitGate[]
    │     └── PaymentTerminal
    └── RateStrategy

  Vehicle
    └── Ticket
          ├── Spot (assigned)
          ├── EntryTime
          └── Payment

Entry Sequence:
  Vehicle -> LPR -> Edge Gateway
     -> Lookup reservation
     -> Assign spot (if available)
     -> Open gate
     -> Create Ticket
     -> Mark spot occupied
     -> Update availability display
\`\`\`

## 8. Real-World Flow Example

1. **Driver Alice** approaches mall parking garage entrance. LPR camera captures her plate: "ABC1234".
2. **Edge gateway** processes image via local OCR model. Detects plate: \`ABC1234\`.
3. Gateway queries local cache → not found. Queries cloud → Alice has a reservation? No.
4. Display shows: "Welcome! Available: 245 spots. Please take a ticket."
5. Alice presses ticket button. Ticket dispensed: \`Ticket #T-20240315-00142, Entered: 2:30 PM, Spot: C7\`.
6. Gate opens. Alice drives to spot C7 on floor 3.
7. **Spot sensor** (ultrasonic) detects vehicle. Edge hub reports occupancy to cloud.
8. **Ticketing system** updates ticket T-00142: spot confirmed occupied at 2:32 PM.
9. **Availability display** decrements: 244 spots left.
10. Alice shops for 3 hours.
11. Alice returns to car at 5:30 PM. Drives to exit gate.
12. **LPR camera** captures plate: "ABC1234". Gateway queries active ticket.
13. Display: "ABC1234 — Ticket T-00142. Entered: 2:30 PM (3h 0m). Amount due: $5.00."
14. Alice inserts credit card into payment terminal. Terminal authorizes $5.00 via Stripe.
15. Receipt printed: "Thank you, Alice! Parking fee: $5.00."
16. Gate opens. Alice exits. Spot sensor marks C7 as vacant.
17. Availability display updates: 245 spots available.
18. **Analytics pipeline** records: occupancy 44% (245 occupied / 550 total) at 5:32 PM.

## 9. API & Data Model Design

**REST API Endpoints**:

\`\`\`
GET    /api/v1/lots/{lotId}/availability
  Response: { "totalSpots": 550, "availableSpots": 245, "byType": {"compact": 100, "large": 80, "handicap": 15, "ev": 50} }

GET    /api/v1/lots/{lotId}/spots/{spotId}
  Response: { "spotId": "C7", "floor": 3, "type": "compact", "status": "vacant", "isReserved": false }

POST   /api/v1/lots/{lotId}/entry
  Request:  { "licensePlate": "ABC1234", "vehicleType": "car" }
  Response: { "ticketId": "T-00142", "spot": "C7", "entryTime": "2024-03-15T14:30:00Z", "gateId": "G-1" }

POST   /api/v1/lots/{lotId}/exit
  Request:  { "ticketId": "T-00142", "paymentMethod": "credit_card" }
  Response: { "ticketId": "T-00142", "fee": 5.00, "exitTime": "2024-03-15T17:30:00Z", "paymentStatus": "paid" }

POST   /api/v1/reservations
  Request:  { "lotId": "lot_001", "licensePlate": "ABC1234", "startTime": "2024-03-16T10:00:00Z", "endTime": "2024-03-16T14:00:00Z", "spotType": "compact" }
  Response: { "reservationId": "R-00234", "spotId": "A12", "status": "confirmed", "fee": 8.00 }

POST   /api/v1/payments/pay
  Request:  { "ticketId": "T-00142", "amount": 5.00, "method": "credit_card", "cardToken": "tok_visa_4242" }
  Response: { "status": "captured", "transactionId": "pi_ABC123", "receiptUrl": "..." }
\`\`\`

**Database Schema**:

\`\`\`sql
-- Parking lots
CREATE TABLE parking_lots (
    lot_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    total_spots INT NOT NULL,
    timezone TEXT NOT NULL DEFAULT '"'"'America/New_York'"'"'
);

-- Floors and spots
CREATE TABLE parking_spots (
    spot_id TEXT,
    lot_id TEXT,
    floor INT,
    type TEXT NOT NULL,              -- '"'"'compact'"'"', '"'"'large'"'"', '"'"'handicap'"'"', '"'"'ev'"'"'
    status TEXT NOT NULL DEFAULT '"'"'vacant'"'"',  -- '"'"'vacant'"'"', '"'"'occupied'"'"', '"'"'reserved'"'"', '"'"'maintenance'"'"'
    sensor_id TEXT,
    PRIMARY KEY (lot_id, spot_id),
    INDEX idx_status (lot_id, status)
);

-- Tickets
CREATE TABLE tickets (
    ticket_id TEXT PRIMARY KEY,
    lot_id TEXT NOT NULL,
    spot_id TEXT,
    vehicle_license_plate TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    entry_time TIMESTAMP NOT NULL DEFAULT NOW(),
    exit_time TIMESTAMP,
    fee DECIMAL(10,2),
    payment_method TEXT,
    payment_status TEXT DEFAULT '"'"'unpaid'"'"',
    status TEXT NOT NULL DEFAULT '"'"'active'"'"'
);

-- Reservations
CREATE TABLE reservations (
    reservation_id TEXT PRIMARY KEY,
    lot_id TEXT NOT NULL,
    spot_id TEXT,
    license_plate TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    fee DECIMAL(10,2),
    status TEXT NOT NULL DEFAULT '"'"'active'"'"',  -- '"'"'active'"'"', '"'"'completed'"'"', '"'"'cancelled'"'"', '"'"'no_show'"'"'
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Rate configuration
CREATE TABLE rate_config (
    rate_id TEXT PRIMARY KEY,
    lot_id TEXT NOT NULL,
    name TEXT NOT NULL,               -- '"'"'standard'"'"', '"'"'event'"'"', '"'"'weekend'"'"', '"'"'monthly'"'"'
    spot_type TEXT,                    -- NULL = all types
    hourly_rate DECIMAL(10,2),
    daily_max DECIMAL(10,2),
    grace_minutes INT DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE
);
\`\`\`

## 10. Real Company Use Cases

- **ParkMobile**: 30M+ users, 2,000+ cities. **App-based parking** with LPR validation. Uses **AWS** infrastructure. **Real-time availability** via IoT sensors in partner garages. **Dynamic pricing** based on demand.
- **SpotHero**: 5M+ users, 8,000+ parking facilities. **Reservation marketplace**. Pre-books parking at discounted rates. **Yield management** — optimize lot revenue by adjusting prices based on forecast demand.
- **ParkWhiz**: 10M+ users. **Event parking** focus. Pre-books parking for concerts, sports events. **Integration with Ticketmaster** for seamless event + parking purchase.
- **EasyPark (ParkMobile Europe)**: 50M+ users in 2,000+ European cities. **Digital parking permits**. **Pay-by-plate** (no ticket needed). **Grace period enforcement**.
- **Standard Parking / SP+**: Largest parking operator in US (2.2M+ spaces). **VALET** system for valet parking management. **License plate recognition** at scale across 3,500+ facilities.
- **Tesla**: **Smart Summon** — car navigates parking lot autonomously. Vehicle occupancy detection via ultrasonic sensors and cameras. Integrates with parking spot mapping.

## 11. Common Interview Questions

1. *Design the object-oriented class hierarchy for a parking lot system.*
2. *How would you design the ticketing and fee calculation strategy? (Strategy pattern)*
3. *Design the entry and exit gate flow with LPR integration.*
4. *How do you handle the case where a driver loses their ticket?*
5. *Design the reservation system with no-show handling.*
6. *How would you implement dynamic pricing based on occupancy and events?*
7. *Design the IoT sensor architecture for 10,000+ spots across 5 floors.*
8. *How does the system handle network partition between edge gateways and cloud?*
9. *Design the data model for multi-lot, multi-city parking management.*
10. *How would you handle payment failures at exit gates (insufficient funds, card declined)?*
11. *Design the monthly pass / subscription model for frequent parkers.*
12. *How would you implement valet parking management (key tracking, ticket-less)?*

## 12. Related Topics & Next Steps

- **Object-Oriented Design**: SOLID principles, Design Patterns (Strategy, Factory, Observer).
- **IoT Architecture**: Edge computing, sensor protocols (ZigBee, LoRaWAN), MQTT.
- **Computer Vision**: License plate recognition (LPR/ALPR), YOLO for vehicle detection.
- **Pricing Strategy**: Dynamic pricing, demand forecasting, yield management.
- **Reservation Systems**: Capacity allocation, no-show prediction, overbooking.
- **Real-Time Systems**: Low-latency gate control, fail-safe modes.
- **Next Lesson**: Module 09: Frontend Engineering & Performance (see module-09.ts).`,
    estimatedMin: 40,
    difficulty: 'INTERMEDIATE',
    companies: ['ParkMobile', 'SpotHero', 'ParkWhiz', 'EasyPark', 'Tesla', 'SP+'],
    tags: ['parking-lot', 'oo-design', 'iot', 'lpr', 'ticketing', 'reservation']
  },
];
