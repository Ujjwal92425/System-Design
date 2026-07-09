# System Design OS - Master Plan and File Structure

> Single source of truth for the curriculum. 18 modules, ~200 lessons,
> grouped into 3 difficulty levels. Companion to the per-lesson notes
> template saved separately as a generation skill.
>
> Status: planning. No lesson files generated yet. After approval of this
> document, lessons are produced one module at a time, in the priority
> order listed in Part 4.

---

## Table of Contents

1. Conventions and Rules
2. Full File Tree
3. Lesson Metadata Table (all ~200 lessons)
4. Generation Priority and Roadmap
5. Lesson Template Recap (18 sections)
6. Diagram Type Mapping per Module
7. Media and Placeholder Rules
8. Validation Checklist per Lesson

---

## 1. Conventions and Rules

### File and folder naming
- Folder pattern: `mod-{NN}-{module-slug-in-kebab-case}`.
- Lesson file pattern: `{NN}-{lesson-slug-in-kebab-case}.md`.
- Zero-padded two-digit numbers (`01`, `12`) for stable sort in file explorers.
- Module numbers match the original MOD-XX id, even though folders are grouped
  by level. This keeps cross-references with the curriculum doc consistent.
- All lowercase, kebab-case, ASCII only.

### Level grouping
- `level-1-foundations/` - beginner-accessible mental models.
- `level-2-intermediate/` - building blocks of distributed systems.
- `level-3-advanced/` - architecture, consensus, interview case studies, ops.

### Content rules
- No emojis anywhere in notes or this plan.
- No em-dash. Use a regular hyphen `-` for compound words and ranges.
- Every lesson is standalone-readable but links to its prerequisites.
- Mermaid diagrams are written by the generator. Use proper code fences
  and keep node labels short and meaningful.
- Images and GIFs are NOT generated. Instead leave a placeholder line in
  the exact form `<!-- IMAGE: short description of needed image -->` or
  `<!-- GIF: short description of needed gif -->`. Owner adds the asset
  later.
- Tables must be well-formed markdown with correct header separators.
- Comments in code blocks explain WHY, not WHAT.

### Stack defaults
- Default code stack: Node.js / TypeScript.
- For consensus, storage internals, and low-level infra topics: Go reads
  more natural and may be used. The per-lesson metadata table (Part 3)
  records the chosen stack for each lesson.

---

## 2. Full File Tree

```
system-design-os/
├── PLAN.md                      <- this file
└── content/
    ├── level-1-foundations/
    │   ├── mod-15-system-design-foundations/
    │   │   ├── 01-welcome-senior-engineer-mindset.md
    │   │   ├── 02-core-concepts-latency-throughput-availability.md
    │   │   ├── 03-cap-theorem.md
    │   │   ├── 04-latency-vs-throughput-tradeoffs.md
    │   │   ├── 05-read-vs-write-optimized-storage.md
    │   │   └── 06-strong-vs-eventual-consistency.md
    │   ├── mod-01-networking-os-security/
    │   │   ├── 01-osi-model-tcp-ip-stack.md
    │   │   ├── 02-http1-vs-http2-vs-http3-quic.md
    │   │   ├── 03-dns-and-dns-resolution.md
    │   │   ├── 04-tcp-vs-udp.md
    │   │   ├── 05-tls-ssl-https-handshake.md
    │   │   ├── 06-tcp-congestion-control.md
    │   │   ├── 07-processes-and-threads.md
    │   │   ├── 08-concurrency-vs-parallelism.md
    │   │   ├── 09-firewalls-vpns-proxies.md
    │   │   └── 10-load-balancing-fundamentals.md
    │   └── mod-02-apis-protocols-auth/
    │       ├── 01-rest-api-design-principles.md
    │       ├── 02-graphql.md
    │       ├── 03-grpc-and-protocol-buffers.md
    │       ├── 04-webhooks-vs-polling-vs-websockets.md
    │       ├── 05-api-gateway.md
    │       ├── 06-authentication-vs-authorization.md
    │       ├── 07-oauth2-and-openid-connect.md
    │       ├── 08-jwt-json-web-tokens.md
    │       ├── 09-session-based-vs-token-based-auth.md
    │       ├── 10-api-rate-limiting-and-throttling.md
    │       ├── 11-api-versioning-strategies.md
    │       └── 12-idempotency-in-apis.md
    │
    ├── level-2-intermediate/
    │   ├── mod-03-databases/
    │   │   ├── 01-sql-vs-nosql-when-to-use-it.md
    │   │   ├── 02-relational-db-internals-btrees-indexing.md
    │   │   ├── 03-acid-properties.md
    │   │   ├── 04-normalization-vs-denormalization.md
    │   │   ├── 05-database-indexing-deep-dive.md
    │   │   ├── 06-database-replication-leader-follower-multi-leader.md
    │   │   ├── 07-database-sharding-and-partitioning.md
    │   │   ├── 08-consistent-hashing.md
    │   │   ├── 09-nosql-database-types-document-kv-column-graph.md
    │   │   ├── 10-nosql-internals-lsm-trees-sstables-compaction.md
    │   │   ├── 11-cap-theorem.md
    │   │   ├── 12-pacelc-theorem.md
    │   │   ├── 13-database-transactions-and-isolation-levels.md
    │   │   ├── 14-time-series-databases.md
    │   │   └── 15-vector-databases.md
    │   ├── mod-04-caching-cdns/
    │   │   ├── 01-caching-fundamentals-and-cache-hierarchy.md
    │   │   ├── 02-cache-eviction-policies-lru-lfu-fifo.md
    │   │   ├── 03-cache-aside-read-through-write-through-write-back.md
    │   │   ├── 04-distributed-caching-redis-memcached.md
    │   │   ├── 05-cache-invalidation-strategies.md
    │   │   ├── 06-content-delivery-network-cdn.md
    │   │   ├── 07-edge-computing.md
    │   │   └── 08-cdn-cache-invalidation-and-purging.md
    │   ├── mod-05-distributed-infra/
    │   │   ├── 01-load-balancing-algorithms.md
    │   │   ├── 02-layer4-vs-layer7-load-balancing.md
    │   │   ├── 03-reverse-proxy-vs-load-balancer.md
    │   │   ├── 04-message-queues.md
    │   │   ├── 05-distributed-system-anti-patterns.md
    │   │   ├── 06-pub-sub-pattern.md
    │   │   ├── 07-kafka-architecture.md
    │   │   ├── 08-rabbitmq-vs-kafka-vs-sqs.md
    │   │   ├── 09-service-discovery.md
    │   │   ├── 10-service-mesh.md
    │   │   ├── 11-containers-and-docker.md
    │   │   ├── 12-kubernetes.md
    │   │   └── 13-distributed-file-systems.md
    │   ├── mod-09-frontend-system-design/
    │   │   ├── 01-frontend-vs-backend-system-design.md
    │   │   ├── 02-rendering-patterns-csr-ssr-ssg-isr.md
    │   │   ├── 03-core-web-vitals-and-performance-metrics.md
    │   │   ├── 04-caching-strategies-for-frontend.md
    │   │   ├── 05-state-management-at-scale.md
    │   │   ├── 06-micro-frontends-architecture.md
    │   │   ├── 07-web-performance-optimization.md
    │   │   ├── 08-image-and-asset-optimization.md
    │   │   └── 09-real-time-frontend-architecture.md
    │   ├── mod-11-simulation-driven-design/
    │   │   ├── 01-capacity-estimation-and-traffic-modeling.md
    │   │   ├── 02-load-balancing-patterns-in-the-simulator.md
    │   │   ├── 03-cache-hit-ratio-and-performance-impact.md
    │   │   ├── 04-database-scaling-read-replicas-and-sharding.md
    │   │   ├── 05-async-processing-with-message-queues.md
    │   │   ├── 06-microservice-resilience-circuit-breaker-service-mesh.md
    │   │   ├── 07-cdn-strategy-and-edge-caching.md
    │   │   ├── 08-rate-limiting-token-bucket-sliding-window.md
    │   │   ├── 09-serverless-cold-starts-and-concurrency.md
    │   │   ├── 10-observability-monitoring-logging-tracing.md
    │   │   ├── 11-chaos-engineering-kill-throttle-partition-evict.md
    │   │   └── 12-enterprise-architecture-review-with-ai-scoring.md
    │   ├── mod-12-clean-code-patterns/
    │   │   ├── 01-solid-principles.md
    │   │   ├── 02-creational-design-patterns-factory-singleton-builder-prototype.md
    │   │   ├── 03-structural-design-patterns-adapter-decorator-facade-proxy-composite.md
    │   │   ├── 04-behavioral-design-patterns-observer-strategy-command-template-state.md
    │   │   ├── 05-clean-code-and-refactoring-techniques.md
    │   │   ├── 06-api-design-best-practices.md
    │   │   ├── 07-error-handling-patterns.md
    │   │   ├── 08-testing-patterns-unit-mocking-tdd.md
    │   │   ├── 09-concurrency-and-async-patterns.md
    │   │   ├── 10-functional-programming-concepts.md
    │   │   └── 11-dependency-injection-and-inversion-of-control.md
    │   ├── mod-16-scalable-data-structures/
    │   │   ├── 01-bloom-filter-probabilistic-set-membership.md
    │   │   ├── 02-geohash-spatial-indexing-for-location-data.md
    │   │   ├── 03-merkle-tree-verifiable-data-integrity.md
    │   │   ├── 04-consistent-hashing-distributed-data-placement.md
    │   │   ├── 05-hyperloglog-cardinality-estimation.md
    │   │   ├── 06-count-min-sketch-frequency-estimation.md
    │   │   ├── 07-trie-and-prefix-tree-autocomplete.md
    │   │   └── 08-skip-list-and-r-tree-advanced-indexing.md
    │   └── mod-17-advanced-storage-patterns/
    │       ├── 01-cache-warming-pre-populating-caches.md
    │       ├── 02-materialized-views-pre-computed-query-results.md
    │       ├── 03-connection-pooling-managing-db-connections.md
    │       ├── 04-erasure-coding-storage-efficient-fault-tolerance.md
    │       ├── 05-sse-server-sent-events-for-real-time-streaming.md
    │       ├── 06-webhooks-server-to-server-event-notifications.md
    │       ├── 07-delivery-semantics-at-most-least-exactly-once.md
    │       ├── 08-dead-letter-queue-dlq-handling-failed-messages.md
    │       └── 09-3pc-three-phase-commit-protocol.md
    │
    ├── level-3-advanced/
    │   ├── mod-06-architecture-patterns/
    │   │   ├── 01-monolithic-vs-microservices-architecture.md
    │   │   ├── 02-domain-driven-design-ddd.md
    │   │   ├── 03-hexagonal-architecture-ports-and-adapters.md
    │   │   ├── 04-event-driven-architecture.md
    │   │   ├── 05-cqrs-command-query-responsibility-segregation.md
    │   │   ├── 06-event-sourcing.md
    │   │   ├── 07-saga-pattern-distributed-transactions.md
    │   │   ├── 08-transactional-outbox-pattern.md
    │   │   ├── 09-api-composition-vs-aggregator-pattern.md
    │   │   ├── 10-strangler-fig-pattern.md
    │   │   └── 11-backend-for-frontend-bff-pattern.md
    │   ├── mod-07-advanced-distributed-systems/
    │   │   ├── 01-distributed-consensus-paxos-raft.md
    │   │   ├── 02-leader-election-algorithms.md
    │   │   ├── 03-quorum-based-systems.md
    │   │   ├── 04-distributed-locking.md
    │   │   ├── 05-vector-clocks-and-logical-clocks.md
    │   │   ├── 06-gossip-protocols.md
    │   │   ├── 07-failure-detection-and-timeouts.md
    │   │   └── 08-circuit-breaker-and-bulkhead-patterns.md
    │   ├── mod-08-interview-case-studies/
    │   │   ├── 01-url-shortener-tinyurl.md
    │   │   ├── 02-chat-system-whatsapp.md
    │   │   ├── 03-video-streaming-youtube-netflix.md
    │   │   ├── 04-ride-hailing-uber-lyft.md
    │   │   ├── 05-newsfeed-twitter-facebook.md
    │   │   ├── 06-photo-sharing-instagram-pinterest.md
    │   │   ├── 07-file-storage-dropbox-google-drive.md
    │   │   ├── 08-e-commerce-platform-amazon.md
    │   │   ├── 09-web-crawler-search-engine-google.md
    │   │   ├── 10-rate-limiter.md
    │   │   ├── 11-notification-system.md
    │   │   ├── 12-distributed-key-value-store-dynamodb.md
    │   │   ├── 13-real-time-leaderboard.md
    │   │   └── 14-parking-lot-system-oo-design-and-scale.md
    │   ├── mod-10-production-operations/
    │   │   ├── 01-ci-cd-pipeline-design.md
    │   │   ├── 02-monitoring-and-observability.md
    │   │   ├── 03-incident-response.md
    │   │   ├── 04-database-backups-and-disaster-recovery.md
    │   │   ├── 05-blue-green-and-canary-deployments.md
    │   │   ├── 06-sla-slo-sli-and-error-budgets.md
    │   │   └── 07-chaos-engineering.md
    │   ├── mod-13-deep-dives-1/
    │   │   ├── 01-real-time-chat-system-whatsapp-discord.md
    │   │   ├── 02-payment-system-stripe-paypal.md
    │   │   ├── 03-video-conferencing-system-zoom-google-meet.md
    │   │   ├── 04-search-autocomplete-typeahead.md
    │   │   ├── 05-food-delivery-system-doordash-zomato.md
    │   │   └── 06-collaborative-document-editing-google-docs.md
    │   ├── mod-14-deep-dives-2/
    │   │   ├── 01-key-management-service-kms.md
    │   │   ├── 02-cdn-from-scratch.md
    │   │   ├── 03-ab-testing-and-experimentation-platform.md
    │   │   ├── 04-metrics-and-monitoring-system-prometheus-like.md
    │   │   ├── 05-data-pipeline-etl-system.md
    │   │   ├── 06-distributed-job-queue-sidekiq-celery-bull.md
    │   │   ├── 07-distributed-rate-limiter.md
    │   │   └── 08-geospatial-index-and-proximity-service.md
    │   └── mod-18-advanced-security-identity/
    │       ├── 01-ssl-tls-deep-dive.md
    │       ├── 02-encryption-at-rest.md
    │       ├── 03-secrets-management-api-keys-passwords-credentials.md
    │       ├── 04-rbac-role-based-access-control.md
    │       └── 05-saml-and-sso-federated-identity-management.md
    │
    ├── _assets/
    │   ├── diagrams/            <- exported Mermaid to svg/png, if needed for PDF
    │   └── code-snippets/       <- reusable production code blocks per topic
    └── _meta/
        ├── module-index.json    <- module to lesson to tags to difficulty to prereqs
        └── glossary.md          <- single source of truth for cross-lesson terms
```

---

## 3. Lesson Metadata Table (all ~200 lessons)

Columns:
- `ID` - module.lesson (e.g., 15.01)
- `Title` - lesson title
- `Level` - Foundations / Intermediate / Advanced
- `Diagram` - mermaid type to use (sequenceDiagram / flowchart / stateDiagram-v2 /
  erDiagram / graph / none)
- `Prereqs` - lesson IDs that should be read first
- `Stack` - default code stack for the code section

Legend for Diagram column type meaning:
- `none` = no diagram needed; if a small visual still helps, use a simple
  two-box flowchart or a code before/after comparison instead.

| ID | Title | Level | Diagram | Prereqs | Stack |
|---|---|---|---|---|---|
| 15.01 | Welcome and senior engineer mindset | Foundations | none | - | Node.js/TS |
| 15.02 | Core concepts - latency, throughput, availability | Foundations | flowchart | 15.01 | Node.js/TS |
| 15.03 | CAP theorem | Foundations | flowchart | 15.02 | Node.js/TS |
| 15.04 | Latency vs throughput tradeoffs | Foundations | flowchart | 15.02 | Node.js/TS |
| 15.05 | Read vs write optimized storage | Foundations | flowchart | 15.04 | Node.js/TS |
| 15.06 | Strong vs eventual consistency | Foundations | flowchart | 15.05 | Node.js/TS |
| 01.01 | OSI model and TCP/IP stack | Foundations | flowchart | - | Node.js/TS |
| 01.02 | HTTP/1 vs HTTP/2 vs HTTP/3 (QUIC) | Foundations | sequenceDiagram | 01.01 | Node.js/TS |
| 01.03 | DNS and DNS resolution | Foundations | sequenceDiagram | 01.01 | Node.js/TS |
| 01.04 | TCP vs UDP | Foundations | flowchart | 01.01 | Node.js/TS |
| 01.05 | TLS/SSL HTTPS handshake | Foundations | sequenceDiagram | 01.02, 01.03 | Node.js/TS |
| 01.06 | TCP congestion control | Foundations | graph | 01.04 | Go |
| 01.07 | Processes and threads | Foundations | flowchart | - | Node.js/TS |
| 01.08 | Concurrency vs parallelism | Foundations | flowchart | 01.07 | Go |
| 01.09 | Firewalls, VPNs, proxies | Foundations | flowchart | 01.01 | Node.js/TS |
| 01.10 | Load balancing fundamentals | Foundations | flowchart | 01.09 | Node.js/TS |
| 02.01 | REST API design principles | Foundations | none | 01.02 | Node.js/TS |
| 02.02 | GraphQL | Foundations | flowchart | 02.01 | Node.js/TS |
| 02.03 | gRPC and protocol buffers | Foundations | sequenceDiagram | 02.01 | Go |
| 02.04 | Webhooks vs polling vs websockets | Foundations | sequenceDiagram | 02.01 | Node.js/TS |
| 02.05 | API gateway | Foundations | flowchart | 01.10, 02.01 | Node.js/TS |
| 02.06 | Authentication vs authorization | Foundations | none | - | Node.js/TS |
| 02.07 | OAuth2 and OpenID Connect | Foundations | sequenceDiagram | 02.06 | Node.js/TS |
| 02.08 | JWT JSON Web Tokens | Foundations | flowchart | 02.06 | Node.js/TS |
| 02.09 | Session-based vs token-based auth | Foundations | sequenceDiagram | 02.07, 02.08 | Node.js/TS |
| 02.10 | API rate limiting and throttling | Foundations | flowchart | 02.01 | Node.js/TS |
| 02.11 | API versioning strategies | Foundations | none | 02.01 | Node.js/TS |
| 02.12 | Idempotency in APIs | Foundations | sequenceDiagram | 02.01 | Node.js/TS |
| 03.01 | SQL vs NoSQL - when to use it | Intermediate | flowchart | 15.05 | Node.js/TS |
| 03.02 | Relational DB internals - B-trees, indexing | Intermediate | erDiagram | 03.01 | Node.js/TS |
| 03.03 | ACID properties | Intermediate | flowchart | 03.02 | Node.js/TS |
| 03.04 | Normalization vs denormalization | Intermediate | erDiagram | 03.02 | Node.js/TS |
| 03.05 | Database indexing deep dive | Intermediate | flowchart | 03.02 | Node.js/TS |
| 03.06 | Replication - leader/follower, multi-leader | Intermediate | flowchart | 03.03 | Node.js/TS |
| 03.07 | Sharding and partitioning | Intermediate | flowchart | 03.06 | Node.js/TS |
| 03.08 | Consistent hashing | Intermediate | graph | 03.07 | Node.js/TS |
| 03.09 | NoSQL types - document, KV, column, graph | Intermediate | flowchart | 03.01 | Node.js/TS |
| 03.10 | NoSQL internals - LSM trees, SSTables, compaction | Intermediate | flowchart | 03.09 | Go |
| 03.11 | CAP theorem (DB lens) | Intermediate | flowchart | 15.03, 03.01 | Node.js/TS |
| 03.12 | PACELC theorem | Intermediate | flowchart | 03.11 | Node.js/TS |
| 03.13 | Transactions and isolation levels | Intermediate | flowchart | 03.03 | Node.js/TS |
| 03.14 | Time-series databases | Intermediate | flowchart | 03.01 | Node.js/TS |
| 03.15 | Vector databases | Intermediate | flowchart | 03.09, 02.02 | Python |
| 04.01 | Caching fundamentals and cache hierarchy | Intermediate | flowchart | 15.04 | Node.js/TS |
| 04.02 | Cache eviction - LRU, LFU, FIFO | Intermediate | none | 04.01 | Node.js/TS |
| 04.03 | Cache-aside, read-through, write-through, write-back | Intermediate | flowchart | 04.01 | Node.js/TS |
| 04.04 | Distributed caching - Redis, Memcached | Intermediate | flowchart | 04.03 | Node.js/TS |
| 04.05 | Cache invalidation strategies | Intermediate | flowchart | 04.04 | Node.js/TS |
| 04.06 | Content Delivery Network (CDN) | Intermediate | flowchart | 04.01, 01.03 | Node.js/TS |
| 04.07 | Edge computing | Intermediate | flowchart | 04.06 | Node.js/TS |
| 04.08 | CDN cache invalidation and purging | Intermediate | flowchart | 04.06 | Node.js/TS |
| 05.01 | Load balancing algorithms | Intermediate | flowchart | 01.10 | Node.js/TS |
| 05.02 | Layer 4 vs Layer 7 load balancing | Intermediate | flowchart | 05.01 | Node.js/TS |
| 05.03 | Reverse proxy vs load balancer | Intermediate | flowchart | 05.02 | Node.js/TS |
| 05.04 | Message queues | Intermediate | flowchart | 02.04 | Node.js/TS |
| 05.05 | Distributed system anti-patterns | Intermediate | none | 05.01, 03.11 | Node.js/TS |
| 05.06 | Pub-sub pattern | Intermediate | flowchart | 05.04 | Node.js/TS |
| 05.07 | Kafka architecture | Intermediate | flowchart | 05.06 | Node.js/TS |
| 05.08 | RabbitMQ vs Kafka vs SQS | Intermediate | none | 05.07 | Node.js/TS |
| 05.09 | Service discovery | Intermediate | flowchart | 05.03 | Node.js/TS |
| 05.10 | Service mesh | Intermediate | flowchart | 05.09 | Node.js/TS |
| 05.11 | Containers and Docker | Intermediate | flowchart | 01.07 | Go |
| 05.12 | Kubernetes | Intermediate | flowchart | 05.11 | Go |
| 05.13 | Distributed file systems | Intermediate | flowchart | 03.07 | Go |
| 09.01 | Frontend vs backend system design | Intermediate | none | - | Node.js/TSX |
| 09.02 | Rendering patterns - CSR, SSR, SSG, ISR | Intermediate | flowchart | 09.01 | Node.js/TSX |
| 09.03 | Core Web Vitals and performance metrics | Intermediate | none | 09.02 | Node.js/TSX |
| 09.04 | Caching strategies for frontend | Intermediate | flowchart | 04.01, 09.02 | Node.js/TSX |
| 09.05 | State management at scale | Intermediate | flowchart | 09.01 | Node.js/TSX |
| 09.06 | Micro-frontends architecture | Intermediate | flowchart | 05.02, 09.01 | Node.js/TSX |
| 09.07 | Web performance optimization | Intermediate | none | 09.03 | Node.js/TSX |
| 09.08 | Image and asset optimization | Intermediate | none | 09.07 | Node.js/TSX |
| 09.09 | Real-time frontend architecture | Intermediate | sequenceDiagram | 02.04, 09.01 | Node.js/TSX |
| 11.01 | Capacity estimation and traffic modeling | Intermediate | none | 15.02 | Node.js/TS |
| 11.02 | Load balancing patterns in the simulator | Intermediate | flowchart | 05.01, 11.01 | Node.js/TS |
| 11.03 | Cache hit ratio and performance impact | Intermediate | flowchart | 04.01, 11.01 | Node.js/TS |
| 11.04 | DB scaling - read replicas and sharding | Intermediate | flowchart | 03.06, 03.07 | Node.js/TS |
| 11.05 | Async processing with message queues | Intermediate | flowchart | 05.04 | Node.js/TS |
| 11.06 | Microservice resilience - circuit breaker, service mesh | Intermediate | flowchart | 05.10 | Node.js/TS |
| 11.07 | CDN strategy and edge caching | Intermediate | flowchart | 04.06 | Node.js/TS |
| 11.08 | Rate limiting - token bucket, sliding window | Intermediate | flowchart | 02.10 | Node.js/TS |
| 11.09 | Serverless cold starts and concurrency | Intermediate | flowchart | 05.11 | Node.js/TS |
| 11.10 | Observability - monitoring, logging, tracing | Intermediate | flowchart | - | Node.js/TS |
| 11.11 | Chaos engineering - kill, throttle, partition, evict | Intermediate | flowchart | 11.10 | Node.js/TS |
| 11.12 | Enterprise architecture review with AI scoring | Intermediate | none | 11.01, 11.10 | Node.js/TS |
| 12.01 | SOLID principles | Intermediate | none | - | Node.js/TS |
| 12.02 | Creational patterns - factory, singleton, builder, prototype | Intermediate | none | 12.01 | Node.js/TS |
| 12.03 | Structural patterns - adapter, decorator, facade, proxy, composite | Intermediate | none | 12.01 | Node.js/TS |
| 12.04 | Behavioral patterns - observer, strategy, command, template, state | Intermediate | none | 12.01 | Node.js/TS |
| 12.05 | Clean code and refactoring techniques | Intermediate | none | 12.01 | Node.js/TS |
| 12.06 | API design best practices | Intermediate | none | 02.01 | Node.js/TS |
| 12.07 | Error handling patterns | Intermediate | none | 12.05 | Node.js/TS |
| 12.08 | Testing patterns - unit, mocking, TDD | Intermediate | none | 12.05 | Node.js/TS |
| 12.09 | Concurrency and async patterns | Intermediate | none | 01.08, 12.01 | Node.js/TS |
| 12.10 | Functional programming concepts | Intermediate | none | 12.05 | Node.js/TS |
| 12.11 | Dependency injection and IoC | Intermediate | none | 12.01 | Node.js/TS |
| 16.01 | Bloom filter - probabilistic set membership | Intermediate | graph | 04.02 | Go |
| 16.02 | Geohash - spatial indexing for location data | Intermediate | graph | 03.05 | Node.js/TS |
| 16.03 | Merkle tree - verifiable data integrity | Intermediate | graph | 03.02 | Node.js/TS |
| 16.04 | Consistent hashing (data placement lens) | Intermediate | graph | 03.08, 16.01 | Node.js/TS |
| 16.05 | HyperLogLog - cardinality estimation | Intermediate | graph | 16.01 | Node.js/TS |
| 16.06 | Count-Min Sketch - frequency estimation | Intermediate | graph | 16.05 | Node.js/TS |
| 16.07 | Trie and prefix tree - autocomplete | Intermediate | graph | 03.05 | Node.js/TS |
| 16.08 | Skip list and R-tree - advanced indexing | Intermediate | graph | 03.05, 16.07 | Node.js/TS |
| 17.01 | Cache warming - pre-populating caches | Intermediate | flowchart | 04.04 | Node.js/TS |
| 17.02 | Materialized views - pre-computed query results | Intermediate | erDiagram | 04.04 | Node.js/TS |
| 17.03 | Connection pooling - managing DB connections | Intermediate | flowchart | 03.13 | Node.js/TS |
| 17.04 | Erasure coding - storage-efficient fault tolerance | Intermediate | flowchart | 05.13 | Go |
| 17.05 | SSE - server-sent events for real-time streaming | Intermediate | sequenceDiagram | 02.04 | Node.js/TS |
| 17.06 | Webhooks - server-to-server event notifications | Intermediate | sequenceDiagram | 02.04 | Node.js/TS |
| 17.07 | Delivery semantics - at-most, at-least, exactly-once | Intermediate | stateDiagram-v2 | 05.04 | Node.js/TS |
| 17.08 | Dead-letter queue (DLQ) - handling failed messages | Intermediate | flowchart | 05.04, 17.07 | Node.js/TS |
| 17.09 | 3PC (three-phase commit) protocol | Intermediate | sequenceDiagram | 03.03 | Go |
| 06.01 | Monolithic vs microservices | Advanced | flowchart | 05.02 | Node.js/TS |
| 06.02 | Domain-Driven Design (DDD) | Advanced | none | 12.01 | Node.js/TS |
| 06.03 | Hexagonal architecture - ports and adapters | Advanced | flowchart | 06.02 | Node.js/TS |
| 06.04 | Event-driven architecture | Advanced | flowchart | 05.06 | Node.js/TS |
| 06.05 | CQRS - command query responsibility segregation | Advanced | flowchart | 06.04 | Node.js/TS |
| 06.06 | Event sourcing | Advanced | flowchart | 06.05 | Node.js/TS |
| 06.07 | Saga pattern - distributed transactions | Advanced | sequenceDiagram | 05.04, 03.03 | Node.js/TS |
| 06.08 | Transactional outbox pattern | Advanced | sequenceDiagram | 06.04, 17.07 | Node.js/TS |
| 06.09 | API composition vs aggregator | Advanced | flowchart | 06.01 | Node.js/TS |
| 06.10 | Strangler fig pattern | Advanced | flowchart | 06.01 | Node.js/TS |
| 06.11 | Backend for Frontend (BFF) | Advanced | flowchart | 09.01, 06.01 | Node.js/TS |
| 07.01 | Distributed consensus - Paxos, Raft | Advanced | stateDiagram-v2 | 03.06, 05.01 | Go |
| 07.02 | Leader election algorithms | Advanced | stateDiagram-v2 | 07.01 | Go |
| 07.03 | Quorum-based systems | Advanced | flowchart | 07.01 | Go |
| 07.04 | Distributed locking | Advanced | sequenceDiagram | 07.03 | Node.js/TS |
| 07.05 | Vector clocks and logical clocks | Advanced | graph | 15.06 | Node.js/TS |
| 07.06 | Gossip protocols | Advanced | graph | 07.05 | Node.js/TS |
| 07.07 | Failure detection and timeouts | Advanced | flowchart | 07.06 | Go |
| 07.08 | Circuit breaker and bulkhead patterns | Advanced | stateDiagram-v2 | 11.06 | Node.js/TS |
| 08.01 | URL shortener (TinyURL) | Advanced | flowchart | 03.08, 04.01 | Node.js/TS |
| 08.02 | Chat system (WhatsApp) | Advanced | flowchart | 02.04, 04.04 | Node.js/TS |
| 08.03 | Video streaming (YouTube/Netflix) | Advanced | flowchart | 04.06, 05.13 | Node.js/TS |
| 08.04 | Ride-hailing (Uber/Lyft) | Advanced | flowchart | 16.02, 05.04 | Node.js/TS |
| 08.05 | Newsfeed (Twitter/Facebook) | Advanced | flowchart | 06.04, 04.04 | Node.js/TS |
| 08.06 | Photo-sharing (Instagram/Pinterest) | Advanced | flowchart | 04.06, 03.07 | Node.js/TS |
| 08.07 | File storage (Dropbox/Google Drive) | Advanced | flowchart | 05.13, 17.04 | Node.js/TS |
| 08.08 | E-commerce platform (Amazon) | Advanced | flowchart | 03.07, 06.01 | Node.js/TS |
| 08.09 | Web crawler and search engine (Google) | Advanced | flowchart | 05.04, 04.06 | Go |
| 08.10 | Rate limiter | Advanced | flowchart | 11.08 | Node.js/TS |
| 08.11 | Notification system | Advanced | flowchart | 05.06, 02.04 | Node.js/TS |
| 08.12 | Distributed key-value store (DynamoDB) | Advanced | flowchart | 03.08, 07.01 | Go |
| 08.13 | Real-time leaderboard | Advanced | flowchart | 16.06, 04.04 | Node.js/TS |
| 08.14 | Parking lot system - OO design and scale | Advanced | flowchart | 12.01 | Node.js/TS |
| 10.01 | CI/CD pipeline design | Advanced | flowchart | 05.11 | Node.js/TS |
| 10.02 | Monitoring and observability | Advanced | flowchart | 11.10 | Node.js/TS |
| 10.03 | Incident response | Advanced | none | 10.02 | Node.js/TS |
| 10.04 | Database backups and disaster recovery | Advanced | flowchart | 03.06 | Node.js/TS |
| 10.05 | Blue-green and canary deployments | Advanced | stateDiagram-v2 | 10.01 | Node.js/TS |
| 10.06 | SLA, SLO, SLI, and error budgets | Advanced | none | 15.02 | Node.js/TS |
| 10.07 | Chaos engineering (ops lens) | Advanced | flowchart | 11.11 | Node.js/TS |
| 13.01 | Real-time chat system (WhatsApp/Discord) | Advanced | flowchart | 08.02 | Node.js/TS |
| 13.02 | Payment system (Stripe/PayPal) | Advanced | sequenceDiagram | 02.12, 17.07 | Node.js/TS |
| 13.03 | Video conferencing (Zoom/Google Meet) | Advanced | sequenceDiagram | 08.02 | Node.js/TS |
| 13.04 | Search autocomplete (typeahead) | Advanced | flowchart | 16.07, 04.04 | Node.js/TS |
| 13.05 | Food delivery (DoorDash/Zomato) | Advanced | flowchart | 08.04, 16.02 | Node.js/TS |
| 13.06 | Collaborative document editing (Google Docs) | Advanced | sequenceDiagram | 07.05, 06.06 | Node.js/TS |
| 14.01 | Key management service (KMS) | Advanced | flowchart | 02.07 | Node.js/TS |
| 14.02 | CDN from scratch | Advanced | flowchart | 04.06 | Go |
| 14.03 | A/B testing and experimentation platform | Advanced | flowchart | 04.04, 10.05 | Node.js/TS |
| 14.04 | Metrics and monitoring system (Prometheus-like) | Advanced | flowchart | 11.10 | Go |
| 14.05 | Data pipeline / ETL system | Advanced | flowchart | 05.07 | Python |
| 14.06 | Distributed job queue (Sidekiq/Celery/Bull) | Advanced | flowchart | 05.04 | Node.js/TS |
| 14.07 | Distributed rate limiter | Advanced | flowchart | 08.10 | Node.js/TS |
| 14.08 | Geospatial index and proximity service | Advanced | flowchart | 16.02 | Go |
| 18.01 | SSL/TLS deep dive | Advanced | sequenceDiagram | 01.05 | Go |
| 18.02 | Encryption at rest | Advanced | flowchart | 18.01 | Node.js/TS |
| 18.03 | Secrets management - API keys, passwords, credentials | Advanced | flowchart | 18.02 | Node.js/TS |
| 18.04 | RBAC - role-based access control | Advanced | flowchart | 02.06, 02.08 | Node.js/TS |
| 18.05 | SAML and SSO - federated identity management | Advanced | sequenceDiagram | 02.07, 18.04 | Node.js/TS |

Total: 196 lessons.

---

## 4. Generation Priority and Roadmap

Lessons are generated module by module in the order below. Inside each
module, lessons are generated in their listed numeric order.

| Priority | Module | Why this order | Lessons |
|---|---|---|---|
| 1 | MOD-08 Interview Case Studies | Highest interview ROI, biggest diagram payoff | 14 |
| 2 | MOD-15 Foundations | Sets mental models for everything after | 6 |
| 3 | MOD-03 Databases | High frequency, dense, needs strong diagrams | 15 |
| 4 | MOD-06 Architecture Patterns | Biggest beginner comprehension gap | 11 |
| 5 | MOD-07 Advanced Distributed Systems | Hardest conceptually, highest value with state diagrams | 8 |
| 6 | MOD-01 Networking/OS/Security | Backbone for everything else | 10 |
| 7 | MOD-02 APIs/Protocols/Auth | Builds on MOD-01 | 12 |
| 8 | MOD-04 Caching/CDNs | High frequency, complements MOD-03 | 8 |
| 9 | MOD-05 Distributed Infra | Completes the intermediate layer | 13 |
| 10 | MOD-17 Advanced Storage Patterns | Bridges intermediate and advanced | 9 |
| 11 | MOD-16 Scalable Data Structures | Math-heavy, optional worked examples | 8 |
| 12 | MOD-11 Simulation Driven Design | Ties to the simulator canvas | 12 |
| 13 | MOD-09 Frontend System Design | Self-contained track | 9 |
| 14 | MOD-12 Clean Code Patterns | Self-contained track | 11 |
| 15 | MOD-10 Production Operations | Builds on everything | 7 |
| 16 | MOD-13 Deep Dives 1 | Case-study extensions | 6 |
| 17 | MOD-14 Deep Dives 2 | Case-study extensions | 8 |
| 18 | MOD-18 Security and Identity | Final capstone | 5 |

After each module is done, a checkbox will be added to the roadmap
section in this file to track progress.

Module completion order to track here:

- [x] MOD-08 - Interview Case Studies
- [x] MOD-15 - Foundations
- [x] MOD-03 - Databases
- [x] MOD-06 - Architecture Patterns
- [x] MOD-07 - Advanced Distributed Systems
- [x] MOD-01 - Networking/OS/Security
- [ ] MOD-02 - APIs/Protocols/Auth
- [ ] MOD-04 - Caching/CDNs
- [ ] MOD-05 - Distributed Infra
- [ ] MOD-17 - Advanced Storage Patterns
- [ ] MOD-16 - Scalable Data Structures
- [ ] MOD-11 - Simulation Driven Design
- [ ] MOD-09 - Frontend System Design
- [ ] MOD-12 - Clean Code Patterns
- [ ] MOD-10 - Production Operations
- [ ] MOD-13 - Deep Dives 1
- [ ] MOD-14 - Deep Dives 2
- [ ] MOD-18 - Security and Identity

---

## 5. Lesson Template Recap (18 sections)

Each lesson must contain all 18 sections in this exact order. Skipping
or merging sections is not allowed. Section 6 is optional only when the
lesson's diagram type is `none`, in which case Section 6 must explicitly
note why a diagram would not add value.

1. Hook - real-life non-technical analogy (zero jargon)
2. What Is It - (a) plain-English one-liner and (b) formal textbook definition
3. The Problem It Solves - concrete before/after framing
4. Core Concept Breakdown - bulleted moving parts, each in at most 2 lines
5. How It Works - numbered, story-style step-by-step walkthrough
6. Diagram - one mermaid block of the type listed in the metadata table, or a short note if type is `none`
7. When to Use It - concrete trigger conditions
8. When NOT to Use It - at least 2 anti-pattern warnings
9. Real-World Example - named company plus a real or realistic number
10. Production-Grade Code - runnable, commented, in the lesson's stack
11. Trade-offs Table - markdown table: Pros | Cons | What it costs you
12. Comparison Table - vs 2 to 3 alternatives across 4 to 6 dimensions
13. Numbers and Benchmarks - at least one real or well-estimated figure
14. Common Pitfalls - 2 to 3 mistakes, written like incident notes
15. Interview Q&A - 3 to 6 questions with reasoning-based model answers
16. Follow-up / Curveball Questions - 2 to 3 senior-level follow-ups
17. Cheat-sheet Summary - 5-line standalone recap
18. Further Reading - 2 to 3 high-signal links only

Optional Section 19 (Worked Numerical Example) is added for math-heavy
lessons: 03.08, 16.01, 16.04, 16.05, 16.06, 11.01, 17.04, 14.05.

---

## 6. Diagram Type Mapping per Module

A summary of which diagram type dominates each module, so the
generator does not re-decide per lesson and instead looks it up.

| Module | Dominant Diagram Type | Notes |
|---|---|---|
| MOD-15 Foundations | flowchart | Mostly economic / decision tradeoffs |
| MOD-01 Networking | sequenceDiagram + flowchart | Handshakes as sequences, stack layering as flowcharts |
| MOD-02 APIs/Auth | sequenceDiagram | Most lessons use sequences for flows |
| MOD-03 Databases | flowchart + erDiagram | Schema lessons use ER; everything else uses flowchart |
| MOD-04 Caching/CDNs | flowchart | Component flows |
| MOD-05 Distributed Infra | flowchart | Component topology |
| MOD-06 Architecture Patterns | flowchart | Component relationships |
| MOD-07 Advanced Distributed Systems | stateDiagram-v2 | Consensus and circuit breaker state machines dominate |
| MOD-08 Interview Case Studies | flowchart | Every case study needs a full architecture diagram |
| MOD-09 Frontend | flowchart | Rendering flows and component boundaries |
| MOD-10 Production Ops | flowchart + stateDiagram-v2 | Deployments use state machines |
| MOD-11 Simulation | flowchart | Mirrors the actual canvas |
| MOD-12 Clean Code Patterns | none | Code before/after instead of mermaid |
| MOD-13 Deep Dives 1 | sequenceDiagram + flowchart | Payment and video conferencing need sequences |
| MOD-14 Deep Dives 2 | flowchart | System internals |
| MOD-16 Scalable Data Structures | graph | Tree-shape and directed graphs |
| MOD-17 Advanced Storage Patterns | mixed | Delivery semantics as state diagrams, handshakes as sequences |
| MOD-18 Security and Identity | sequenceDiagram | SAML, TLS flows |

---

## 7. Media and Placeholder Rules

### Mermaid
- Always rendered by the generator inside a ` ```mermaid ` code fence.
- Keep node labels short. Use real-world component names that already
  appear in the lesson text.
- Use directional arrows that tell a story (`-->` for causal flow, `->`
  for reference).
- One diagram per lesson. If a second diagram is essential, it must be
  added inside Section 6 only, not scattered across other sections.

### Images and GIFs
- The generator never produces image or GIF files and never invents
  asset URLs.
- Inside any lesson that benefits from a visual, the generator inserts
  exactly one of the following placeholder lines at the relevant spot:
  - `<!-- IMAGE: detailed description of the image needed -->`
  - `<!-- GIF: detailed description of the gif needed -->`
- The description must be specific enough that the owner can produce or
  source the asset from the description alone, e.g.
  `<!-- GIF: comparison animation of HTTP/1.1 head-of-line blocking vs HTTP/2 multiplexing with 4 parallel streams -->`.
- Placeholders are inserted in Section 6 (Diagram) only, after the
  Mermaid block, or in Section 5 (How It Works) if a moving visual is
  more pedagogically aligned than a static diagram.
- No placeholder is required. A lesson can have Mermaid only, image
  only, gif only, both, or none. Add a placeholder only when it clearly
  improves comprehension.

### Tables
- All markdown tables must have a header row, a separator row
  (`|---|---|`), and at least one body row.
- Trade-offs table uses three columns: `Pros | Cons | What it costs you`.
- Comparison table uses 4 to 6 dimension columns plus one row per
  alternative.

### Code blocks
- Must use the correct language fence (```typescript, ```go, ```python,
  ```bash, ```cypher, etc.).
- Must be runnable in principle - no import of fictional packages, no
  `// ... rest of code` ellipsis that hides essential logic.
- Comments explain WHY decisions were made, not WHAT the code does.
- No magic numbers; expose them as named constants at the top of the
  snippet when feasible.

### Formatting bans
- No emojis anywhere, including in tables or code comments.
- No em-dash. Use a regular hyphen (`-`) for compound words and ranges.
- No triple-backticks nested inside other triple-backticks.

---

## 8. Validation Checklist per Lesson

Before a lesson is marked done, all of the following must be true.

- [ ] Starts with a non-technical analogy (Section 1), not a definition.
- [ ] Has both a beginner one-liner and a formal definition (Section 2).
- [ ] Has exactly one Mermaid block, OR a written justification for its
      absence if the metadata diagram type is `none` (Section 6).
- [ ] Has at least one named real-world company example with a real
      or realistically estimated number (Section 9).
- [ ] Has a trade-offs table with three columns (Section 11).
- [ ] Has a comparison table comparing 2 to 3 alternatives across 4
      to 6 dimensions (Section 12).
- [ ] Has at least one concrete number or benchmark (Section 13).
- [ ] Has at least 3 interview Q&A entries with reasoning-based
      answers (Section 15).
- [ ] Has a 5-line standalone cheat-sheet (Section 17).
- [ ] Cross-links to prerequisite lessons using the form
      `(see: MOD-XX/NN-slug)` instead of re-explaining (Section 4 or 5).
- [ ] No emojis anywhere.
- [ ] No em-dash characters anywhere.
- [ ] All tables valid markdown.
- [ ] All code blocks runnable in principle and commented for WHY.
- [ ] Any image/gif need is captured as a placeholder line, not an
      invented URL.
- [ ] Section headers use the same numbering and wording as Section 5
      of this plan.

---

End of plan. Review the file tree, the metadata table, the priority
order, and the media rules. If any of these need to change, say so
before any lesson generation begins.
