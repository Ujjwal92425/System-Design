export const module05Lessons = [
  {
    id: "lesson-05-01",
    slug: "distributed-infrastructure-01-load-balancing-algorithms",
    title: "Load Balancing Algorithms",
    content: `## 0. Mental Model

> Load balancing algorithms are like **different checkout lane strategies** at a supermarket. Round Robin: every customer goes to the next lane in order. Least Connections: join the shortest line. Weighted: express lane handles 20 items, regular lane handles 50. IP Hash: you always go to lane 3 because your loyalty card number ends in 3.

## 1. Quick Summary

- **Load balancing** distributes traffic across servers. Algorithms fall into static (Round Robin, IP Hash) and dynamic (Least Connections, Least Response Time).
- **Round Robin** is simplest — cycles through servers in order. Works well when requests are uniform and servers are identical.
- **Least Connections** sends to the server with fewest active connections. Best for requests with variable processing time (database queries, API calls).
- **Weighted algorithms** let you assign capacity ratios (e.g., 3:1 for different server sizes).
- **Consistent Hashing** ensures the same client/server mapping even when servers are added/removed — critical for cache affinity.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Round Robin** | Cycles through servers sequentially |
| **Least Connections** | Routes to server with fewest active connections |
| **Weighted Round Robin** | Servers get proportionally more requests based on weight |
| **IP Hash** | Client IP hashed to determine server — ensures session affinity |
| **Least Response Time** | Routes to server with lowest latency + fewest connections |
| **Random** | Randomly selects a server (with optional weighting) |
| **Consistent Hashing** | Hash ring that minimizes remapping when servers change |
| **Session Affinity (Sticky Sessions)** | Same client always goes to same server |
| **Health Check** | Periodic check to remove dead servers from rotation |
| **Connection Draining** | Stop sending new connections, let existing ones finish before removal |

## 3. The Problem Without It

- **Uneven distribution**: With 5 servers, DNS round robin + random client behavior can send 40% of traffic to one server → that server melts down while others are idle.
- **No failure tolerance**: Server crashes mid-request. Without health checks, traffic keeps going to the dead server → 20% of users get errors.
- **Session affinity broken**: Without consistent routing, a user's session data stored on server A is lost when the next request goes to server B → re-login, lost cart.
- **Capacity waste**: Mix of server sizes (4-core + 16-core) treated equally → smaller server overloaded, larger server underutilized. Weighted algorithms fix this.

## 4. How It Works — Core Mechanics

### Round Robin
\`\`\`
Servers: [A, B, C]
Request 1 → A, Request 2 → B, Request 3 → C, Request 4 → A, ...
State: just a counter (current_server = (current + 1) % N)
O(1) per request, no memory overhead
\`\`\`

### Least Connections
\`\`\`typescript
function selectServer(servers: Server[]): Server {
  return servers.reduce((best, s) =>
    s.activeConnections < best.activeConnections ? s : best
  );
}
// Each server tracks active_connections (+1 on assign, -1 on close)
// O(N) per request (N = number of servers)
// Memory: N integers
\`\`\`

### Consistent Hashing (for cache affinity)
\`\`\`
Servers placed on ring (0 to 2^32-1):
Key → hash(key) → position on ring → first server clockwise

When server D is added: only keys between C and D move
When server B is removed: only keys between A and B move

Without consistent hashing (modulo N): adding one server moves 100% of keys
With consistent hashing: only K/N keys move
\`\`\`

## 5. Variants & Flavors

| Algorithm | Type | Complexity | Memory | Session Affinity | Health-Aware | Best For |
|-----------|------|-----------|--------|-----------------|-------------|----------|
| Round Robin | Static | O(1) | 1 int | No | No | Uniform workloads |
| Weighted RR | Static | O(1) | 1 int + weights | No | No | Mixed server sizes |
| Least Connections | Dynamic | O(N) | N ints | No | Implicit (0 = dead) | Variable-length requests |
| IP Hash | Static | O(1) hash | 0 | Yes | No | Stateful apps |
| Consistent Hashing | Static | O(log N) | Ring (N × 150 virtual) | Yes | Limited | Cache clusters |
| Least Response Time | Dynamic | O(N) | N × (conns + latency) | No | Yes | Latency-sensitive apps |

## 6. Performance Characteristics

| Metric | Round Robin | Least Connections | IP Hash | Consistent Hashing |
|--------|------------|-------------------|---------|-------------------|
| Decision time | <1µs | 10-50µs (scan) | 5-10µs (hash) | 1-5µs (ring lookup) |
| Memory per server | 1 byte | 4-8 bytes | 0 | 150-500 virtual node entries |
| Distribution fairness | Perfect (uniform) | Good (variable load) | Poor (small pools) | Good (with virtual nodes) |
| Remap on add/remove | 100% | 100% | 100% | K/N |
| Health integration | External only | Natural (0=dead) | External only | External only |

## 7. Failure Modes

- **Hot server in IP Hash**: 50 users behind a NAT with the same IP → all sent to the same server. *Mitigation*: Use consistent hashing with virtual nodes, or Least Connections with session cookie fallback.
- **Least Connections starvation**: A long-lived WebSocket connection makes a server look "busy" even though CPU is idle. *Mitigation*: Use resource-based metrics (CPU, memory) not just connection count.
- **Round Robin with slow servers**: One degraded server (high GC pauses) gets equal traffic → 20% of requests timeout. *Mitigation*: Use adaptive weighting — reduce weight of slow servers based on response time.
- **DNS caching breaking failover**: Load balancer IP changes but DNS clients cache old IP for 300s → traffic to dead IP. *Mitigation*: Use short DNS TTLs (30-60s) or Anycast IPs.

## 8. Decision Framework

\`\`\`
┌─ Servers identical capacity?
│   ├─ Yes → Round Robin (simplest)
│   └─ No → Weighted Round Robin
├─ Requests uniform processing time?
│   ├─ Yes → Round Robin
│   └─ No → Least Connections
├─ Need session affinity?
│   ├─ Yes → IP Hash or Consistent Hashing
│   └─ No → Round Robin or Least Connections
├─ Cache layer behind load balancer?
│   ├─ Yes → Consistent Hashing (key → same cache node)
│   └─ No → Any algorithm works
└─ Latency-sensitive?
    └─ Yes → Least Response Time
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'clients', label: 'Clients', type: 'client', x: 80, y: 160 },
    { id: 'lb', label: 'Load Balancer\n(Round Robin / LC / Hash)', type: 'lb', x: 280, y: 160 },
    { id: 'hc', label: 'Health Checker', type: 'metrics', x: 280, y: 40 },
    { id: 's1', label: 'Server A\n(weight: 2)', type: 'web', x: 500, y: 40 },
    { id: 's2', label: 'Server B\n(weight: 2)', type: 'web', x: 500, y: 160 },
    { id: 's3', label: 'Server C\n(weight: 1)', type: 'web', x: 500, y: 280 },
  ]}
  edges={[
    { from: 'clients', to: 'lb', label: 'HTTP/TCP' },
    { from: 'hc', to: 's1', label: 'health check' },
    { from: 'hc', to: 's2', label: 'health check' },
    { from: 'hc', to: 's3', label: 'health check' },
    { from: 'lb', to: 's1', label: '60% traffic' },
    { from: 'lb', to: 's2', label: '30% traffic' },
    { from: 'lb', to: 's3', label: '10% traffic (draining)' },
  ]}
  height={360}
/>

## 10. Real Production Incident

<Callout type="incident">
**GitHub — HAProxy Least Connections Fail, October 2018**

GitHub's HAProxy load balancers used Least Connections to distribute traffic. A deploy caused one application server to handle requests ~3x slower than others (memory leak). The slow server accumulated many active connections (clients waiting). Least Connections sent NEW requests to faster servers — but the slow server never drained because the algorithm didn't measure response time, just connection count.

**Impact**: 8% of users experienced 30+ second page loads. The slow server had 2000+ hung connections that never completed.

**Root cause**: Least Connections assumes equal response time across servers. A degraded server with 2000 slow connections looked "busy" and received zero new requests, but the existing connections never completed.

**Fix**: Switched to **Least Response Time** (combines connections + p50 latency). A server with high latency gets weighted down. Added connection timeouts — any connection active >120s is terminated.

**Lesson**: Least Connections alone doesn't handle degraded servers. Combine with response time weighting and connection timeouts.
</Callout>

## 11. Production Implementation

### ❌ Naive — Pure Round Robin
\`\`\`nginx
upstream backend {
  server app1:8080;
  server app2:8080;
  server app3:8080;
}
# Problem: no weights, no health checks, no draining
\`\`\`

### ✅ Better — Weighted + Health Checks
\`\`\`nginx
upstream backend {
  least_conn;
  server app1:8080 weight=3 max_fails=3 fail_timeout=30s;
  server app2:8080 weight=2 max_fails=3 fail_timeout=30s;
  server app3:8080 weight=1 max_fails=3 fail_timeout=30s slow_start=60s;
}
\`\`\`

### 🚀 Production — Envoy with adaptive weighting
\`\`\`yaml
# Envoy proxy configuration with outlier detection
static_resources:
  clusters:
  - name: backend
    connect_timeout: 0.25s
    lb_policy: LEAST_REQUEST
    health_checks:
      timeout: 1s
      interval: 5s
      unhealthy_threshold: 3
      healthy_threshold: 2
    outlier_detection:
      consecutive_5xx: 3
      interval: 10s
      base_ejection_time: 30s
      max_ejection_percent: 50
      success_rate_minimum_hosts: 5
    circuit_breakers:
      thresholds:
        - priority: DEFAULT
          max_connections: 10000
          max_pending_requests: 1000
\`\`\`

## 12. Real Company Deep Dives

- **Google**: Uses **Maglev** — a consistent hashing load balancer that handles 1B+ requests/sec with very low memory and fast failover (BGP-based).
- **Netflix**: Uses **Eureka** for service discovery + **Ribbon** (client-side LB) + **Hystrix** (circuit breaker). Client chooses server based on weighted response time.
- **Cloudflare**: Uses **Anycast** + **consistent hashing** for global load balancing. Traffic enters nearest PoP, then consistent hash to backend.
- **Amazon**: **ALB** (Application Load Balancer) uses **least outstanding requests** — similar to Least Connections but counts in-flight HTTP requests not TCP connections.

## 13. Interview Playbook

**Q: "How does Round Robin compare to Least Connections?"**
→ Open with: Round Robin distributes equally regardless of load; Least Connections sends to the least busy server.
→ Cover: Round Robin is simple (O(1)) but creates imbalance when request times vary. Least Connections adapts but adds O(N) scan cost.
→ Depth signal: Least Connections can't detect a degraded server that processes slowly — it still gets few connections because they pile up. Use Least Response Time instead.

**Q: "How does consistent hashing work in load balancing?"**
→ Open with: Servers are placed on a hash ring. Client/request keys are hashed to find the nearest clockwise server.
→ Cover: Adding a server only remaps K/N keys (vs 100% with modulo). Virtual nodes (150 per physical server) ensure balanced distribution.
→ Depth signal: Google's Maglev uses a differently-sized lookup table (65537 entries) instead of a ring, giving O(1) lookup and minimal remapping.

## 14. Concept Check Quiz

**Q1:** Which algorithm ensures the same client always goes to the same server?**Answer:** IP Hash or Consistent Hashing — they deterministically map the client to a server based on a hash of the client IP.

**Q2:** What happens when a server is removed from a Round Robin pool?**Answer:** The counter continues to the next alive server. No remapping needed (unlike hashing).

**Q3:** Least Connections fails when?**Answer:** When a degraded server processes requests slowly — it accumulates connections and becomes "busy" but never drains.

**Q4:** How many keys move when adding a node to a consistent hash ring with 10 nodes?**Answer:** ~10% (K/N) — only keys between the new node and its predecessor on the ring.

## 15. Next Steps

- **Layer 4 vs Layer 7 Load Balancing** — TCP vs HTTP-level balancing and the tradeoffs.
- **Reverse Proxy vs Load Balancer** — Nginx, HAProxy, Envoy comparison.
- **Service Discovery** — How load balancers find backends dynamically.`,
    estimatedMin: 14,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Google", "Netflix", "Cloudflare", "Amazon", "HAProxy"],
    tags: ["load-balancing", "Round-Robin", "Least-Connections", "consistent-hashing", "IP-hash"],
  },

  {
    id: "lesson-05-02",
    slug: "distributed-infrastructure-02-layer4-vs-layer7",
    title: "Layer 4 vs Layer 7 Load Balancing",
    content: `## 0. Mental Model

> L4 load balancing is like a **mail sorter** that reads only the envelope address and forwards the package to the right building. L7 load balancing is like a **personal assistant** who opens the mail, reads the contents, and decides which department should handle it based on what the letter says.

## 1. Quick Summary

- **Layer 4 (L4)** balances at the transport layer (TCP/UDP). Routes based on IP + port. Fast, simple, processes millions of packets/sec.
- **Layer 7 (L7)** balances at the application layer (HTTP/HTTPS/gRPC). Routes based on URL, headers, cookies, body content. More features but 2-5x slower.
- **L4 pros**: Low latency (100µs vs 500µs+), no TLS termination needed, works with any TCP/UDP protocol, lower resource usage.
- **L7 pros**: Smart routing (URL-based, header-based, cookie-based), TLS termination, content caching, rate limiting, gRPC support.
- **Decision**: Use L4 for performance-critical TCP traffic (database, Kafka, Memcached). Use L7 for HTTP APIs, microservices, and when you need content-aware routing.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Layer 4** | Transport layer — TCP/UDP. Balances by IP + port |
| **Layer 7** | Application layer — HTTP/HTTPS/gRPC. Balances by content |
| **TCP Proxy** | L4 load balancer that forwards raw TCP streams |
| **HTTP Reverse Proxy** | L7 load balancer that understands HTTP semantics |
| **TLS Termination** | Decrypting TLS at the LB, sending plain HTTP to backends |
| **DSR (Direct Server Return)** | LB processes incoming request, server responds directly to client |
| **SNI (Server Name Indication)** | TLS extension to route by hostname without decrypting |
| **Connection Pool** | Reusing backend connections to reduce overhead |

## 3. The Problem Without It

- **No TLS termination without L7**: Every backend server must handle TLS → 2x CPU cost on each server, complex certificate management. With L7 TLS termination, backends handle plain HTTP.
- **Can't route by URL with L4**: Need /api/v2 on new servers and /api/v1 on old during migration? L4 can't do that — it routes all traffic to the same pool.
- **No cookie-based sessions with L4**: Can't read \`SESSION=abc123\` cookie to route user to their session-hosting server.
- **No circuit breaking at L4**: L4 doesn't see HTTP 503 responses — can't detect application-level failures.
- **No gRPC support at L4**: gRPC uses HTTP/2 multiplexing over a single TCP connection. L4 can't split individual gRPC calls across backends (they all stay on one server).

## 4. How It Works — Core Mechanics

### L4 Load Balancing (TCP Proxy Mode)
\`\`\`
Client:80 → LB:80 → Backend A:8080
                    Backend B:8080

LB acts as TCP proxy:
1. Accept TCP connection from client
2. Pick backend (Round Robin, Least Connections)
3. Open TCP connection to backend
4. Bidirectional copy: client ↔ backend

All packets within one TCP connection go to the same backend.
LB sees: source IP, dest IP, source port, dest port, protocol.
No visibility into HTTP headers, URLs, or body.
\`\`\`

### L7 Load Balancing (HTTP Reverse Proxy)
\`\`\`
Client GET /api/v2/users → LB:443 → TLS termination
  → Parse HTTP request: method, path, headers, cookies
  → Route based on rules:
    /api/v1/* → Backend Pool A (old)
    /api/v2/* → Backend Pool B (new)
    /static/* → Backend Pool C (CDN origin)
  → Forward HTTP request to chosen backend
  → Wait for response
  → Optionally: cache, rate limit, modify headers
  → Forward response to client
\`\`\`

### Performance Math
\`\`\`
L4 (HAProxy in TCP mode):
  ~5M packets/sec per core
  Latency added: 20-100µs
  Memory: minimal (connection tracking only)

L7 (HAProxy in HTTP mode):
  ~500K requests/sec per core (with TLS termination)
  Latency added: 100-500µs
  Memory: 10-50KB per request (headers, buffers)
\`\`\`

## 5. Variants & Flavors

| Feature | L4 (HAProxy TCP) | L7 (HAProxy HTTP) | L7 (Envoy) | L7 (Nginx) |
|---------|-----------------|-------------------|------------|------------|
| Throughput per core | 5M pkt/s | 500K req/s | 300K req/s | 400K req/s |
| Latency added | 20-100µs | 200-500µs | 300-800µs | 200-500µs |
| URL routing | No | Yes | Yes | Yes |
| Header modification | No | Yes | Yes | Yes |
| TLS termination | External (Nginx/HAProxy) | Yes | Yes | Yes |
| gRPC | No (sticky on 1 conn) | Yes (via HTTP/2) | Yes (native) | Limited |
| Circuit breaking | No | Manual (config) | Yes (auto) | Manual |
| Dynamic configuration | No (reload required) | No (reload) | Yes (xDS API) | No (reload) |

## 6. Performance Characteristics

| Metric | L4 (HAProxy) | L7 (HAProxy) | L7 (Envoy) | L7 (Nginx) |
|--------|-------------|-------------|------------|------------|
| Max throughput | 5M req/s | 500K req/s | 300K req/s | 400K req/s |
| P50 latency added | 20µs | 200µs | 300µs | 200µs |
| P99 latency added | 100µs | 500µs | 800µs | 500µs |
| Memory per conn | 16 bytes | 50KB | 100KB | 50KB |
| TLS/cert management | None | Full | Full | Full |
| Configuration reload | Zero-downtime (SO_REUSEPORT) | Zero-downtime | Dynamic (no reload) | Reload by signal |

## 7. Failure Modes

- **L4 + long-lived connections (WebSockets)**: Connection established → LB can't rebalance. If backend degrades, that connection stays on the bad server. *Mitigation*: Connection timeouts, or use L7 with WebSocket proxy.
- **L7 + TLS certificate expiry**: LB terminates TLS. If cert expires, ALL traffic fails (500s). *Mitigation*: Monitor cert expiry (30-day alerts), auto-renew with ACME.
- **L4 + DSR (Direct Server Return)**: LB needs backends to respond directly to client. If backends aren't configured correctly, response bypasses LB → no logging, no filtering.
- **L7 + request buffering**: LB buffers request body before forwarding. A 1GB upload exhausts LB memory. *Mitigation*: Disable buffering for large payloads, stream directly.

## 8. Decision Framework

\`\`\`
┌─ Protocol?
│   ├─ TCP/UDP (database, Kafka, Redis) → L4
│   ├─ HTTP/gRPC → L7
│   └─ WebSockets → L7 (or L4 with long timeout)
├─ Need content-based routing?
│   ├─ Yes (/api/v1 vs /api/v2, cookie-based) → L7
│   └─ No → L4 (simpler, faster)
├─ TLS termination needed?
│   ├─ Yes → L7
│   └─ No → L4 (backends handle TLS)
├─ Throughput requirements?
│   ├─ <100K req/s → L7 (any)
│   ├─ 100K-1M req/s → L7 (HAProxy) or L4
│   └─ >1M req/s → L4 (HAProxy TCP mode)
└─ Microservices?
    └─ Yes → Envoy (sidecar) or L7 (HAProxy)
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 80, y: 60 },
    { id: 'dns', label: 'DNS (geo-routing)', type: 'dns', x: 80, y: 200 },
    { id: 'lb_l4', label: 'L4 LB (HAProxy TCP)\nport 443', type: 'lb', x: 280, y: 60 },
    { id: 'lb_l7', label: 'L7 LB (HAProxy HTTP)\nport 443', type: 'lb', x: 280, y: 200 },
    { id: 'tls', label: 'TLS Termination', type: 'gateway', x: 280, y: 340 },
    { id: 'api', label: 'API Backend Pool', type: 'web', x: 500, y: 60 },
    { id: 'cdn', label: 'CDN Origin\n(static)', type: 'storage', x: 500, y: 200 },
    { id: 'ws', label: 'WebSocket Pool', type: 'web', x: 500, y: 340 },
  ]}
  edges={[
    { from: 'client', to: 'dns', label: 'DNS query' },
    { from: 'client', to: 'lb_l4', label: 'TCP passthrough' },
    { from: 'client', to: 'lb_l7', label: 'HTTPS with SNI' },
    { from: 'lb_l7', to: 'tls', label: 'decrypt' },
    { from: 'lb_l7', to: 'api', label: '/api/*' },
    { from: 'lb_l7', to: 'cdn', label: '/static/*' },
    { from: 'lb_l4', to: 'ws', label: 'raw TCP' },
  ]}
  height={420}
/>

## 10. Real Production Incident

<Callout type="incident">
**Discord — L4 LB WebSocket Timeout, January 2022**

Discord uses L4 load balancing (HAProxy TCP mode) for WebSocket connections. During a server rollout, one backend's WebSocket handler had a 30-second hang on certain message types. Since L4 doesn't see application-level errors, it continued sending new connections to the degraded server.

**Impact**: 5% of users experienced 30+ second message delivery latency. The degraded server had 50K stuck connections.

**Fix**: Added **L7 health check** for the WebSocket endpoint — HAProxy sent periodic WebSocket ping frames and detected unresponsive servers. Also added **connection draining** — servers report "draining" status to the LB before rolling restart.

**Lesson**: L4 balancing for application protocols requires application-level health checks. Pure TCP health checks can't detect a server that accepts connections but processes them slowly.
</Callout>

## 11. Production Implementation

### L4: HAProxy TCP mode
\`\`\`haproxy
frontend mysql_lb
  bind :3306
  mode tcp
  default_backend mysql_servers

backend mysql_servers
  mode tcp
  balance leastconn
  server db1 10.0.1.1:3306 check fall 3 rise 2
  server db2 10.0.1.2:3306 check fall 3 rise 2
\`\`\`

### L7: HAProxy HTTP mode with routing
\`\`\`haproxy
frontend https_lb
  bind :443 ssl crt /etc/ssl/cert.pem alpn h2,http/1.1
  mode http
  option httplog
  
  # URL-based routing
  use_backend api_v2 if { path_beg /api/v2/ }
  use_backend api_v1 if { path_beg /api/v1/ }
  use_backend static if { path_beg /static/ }
  default_backend web_app

backend api_v2
  mode http
  balance leastconn
  option httpchk GET /health
  server app1 10.0.2.1:8080 check
  server app2 10.0.2.2:8080 check
\`\`\`

### 🚀 L7: Envoy with circuit breaking
\`\`\`yaml
static_resources:
  listeners:
  - name: ingress
    address: { socket_address: { address: 0.0.0.0, port_value: 443 } }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress
          route_config:
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match: { prefix: "/api/v1/" }
                route: { cluster: api_v1, retry_policy: { num_retries: 3 } }
              - match: { prefix: "/api/v2/" }
                route: { cluster: api_v2 }
  clusters:
  - name: api_v1
    connect_timeout: 0.25s
    lb_policy: LEAST_REQUEST
    circuit_breakers:
      thresholds:
      - priority: DEFAULT
        max_connections: 1000
        max_pending_requests: 500
        max_retries: 3
\`\`\`

## 12. Real Company Deep Dives

- **Cloudflare**: Operates global L4 (Spectrum) and L7 (CDN proxy). Spectrum provides L4 TCP/UDP proxying for non-HTTP protocols with DDoS protection. All PoPs run both L4 and L7 on the same infrastructure.
- **HAProxy**: Used by GitHub, Reddit, Slack, Twitter. Preferred for its single-process event-driven model, ultra-low memory footprint, and sub-millisecond latency.
- **Envoy**: Service mesh data plane. Used by Lyft, Netflix, Apple, Pinterest. Dynamic configuration via xDS API makes it ideal for Kubernetes and microservices.
- **Amazon NLB**: L4-only (TCP/UDP, ~25M pkt/s). ALB is L7 (HTTP/gRPC, ~100K req/s). Use NLB for performance-critical TCP, ALB for HTTP apps.

## 13. Interview Playbook

**Q: "When would you choose L4 over L7 load balancing?"**
→ Open with: L4 for speed and protocol agnosticism, L7 for content-aware routing.
→ Cover: L4 processes millions of packets/sec with microsecond latency. L7 understands HTTP — can route by URL/header/cookie, terminate TLS, and implement circuit breakers.
→ Depth signal: For gRPC, L4 sends all multiplexed streams on one TCP connection to the same backend. L7 can split individual gRPC calls across backends. Envoy has native gRPC support.

**Q: "How does TLS termination affect load balancer choice?"**
→ Open with: L7 load balancers can terminate TLS, L4 typically cannot.
→ Cover: L7 termination offloads TLS CPU cost from backends, centralizes certificate management, and enables content inspection. L4 passthrough preserves end-to-end encryption but backends handle TLS cost.
→ Depth signal: For PCI/HIPAA compliance, end-to-end TLS may be required — use L4 passthrough. For most web apps, L7 termination is fine and simplifies operations.

## 14. Concept Check Quiz

**Q1:** What's the main limitation of L4 load balancing?**Answer:** Can't route based on HTTP content (URL, headers, cookies). Only sees IP + port.

**Q2:** Why does L7 have higher latency than L4?**Answer:** L7 must buffer and parse HTTP requests (headers, body), terminate TLS, and execute routing rules — adding 200-500µs vs L4's 20-100µs.

**Q3:** What is TLS termination and why use it?**Answer:** Decrypting TLS at the load balancer so backends receive plain HTTP. Reduces backend CPU usage, centralizes cert management.

**Q4:** What happens when a gRPC request goes through L4?**Answer:** It's treated as a single TCP connection. All gRPC streams multiplexed on that connection go to the same backend (no per-call balancing).

## 15. Next Steps

- **Reverse Proxy vs Load Balancer** — Understanding the differences and overlaps.
- **Service Discovery** — How load balancers dynamically find backends.
- **Message Queues** — Queue-based load leveling for async processing.`,
    estimatedMin: 13,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Cloudflare", "HAProxy", "Envoy", "Discord", "Amazon"],
    tags: ["L4", "L7", "load-balancing", "TLS-termination", "TCP-proxy", "Envoy"],
  },

  {
    id: "lesson-05-03",
    slug: "distributed-infrastructure-03-reverse-proxy-vs-load-balancer",
    title: "Reverse Proxy vs Load Balancer",
    content: `## 0. Mental Model

> A reverse proxy is like a **receptionist** who answers all calls, handles screening, logs messages, and forwards to the right person. A load balancer is like a **dispatch manager** who distributes incoming calls across multiple operators. The receptionist (reverse proxy) can also be the dispatch manager (load balancer) — Nginx, HAProxy, and Envoy do both.

## 1. Quick Summary

- **Reverse Proxy**: Accepts requests on behalf of servers. Provides TLS termination, caching, compression, header modification, authentication, and logging. One reverse proxy sits in front of many backends.
- **Load Balancer**: Distributes traffic across multiple backends for availability and scale. Provides health checks, connection draining, and session affinity.
- **Overlap**: Modern tools (Nginx, HAProxy, Envoy) do BOTH. Nginx is primarily a reverse proxy with load balancing. HAProxy is primarily a load balancer with reverse proxy features. Envoy does both natively.
- **Key difference**: Reverse proxy FOCUSES on request/response manipulation. Load balancer FOCUSES on traffic distribution and health management.
- **Forward proxy**: Sits in front of clients (not servers) — used for outbound traffic filtering, caching, anonymity.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Reverse Proxy** | Server-facing proxy — accepts external requests, forwards to internal servers |
| **Forward Proxy** | Client-facing proxy — forwards client requests to external servers |
| **Load Balancer** | Distributes incoming traffic across multiple backend servers |
| **TLS Termination** | Decrypting HTTPS at the proxy, forwarding plain HTTP to backends |
| **Content Caching** | Storing response content at the proxy to serve future requests |
| **Connection Pooling** | Reusing backend connections across multiple client requests |
| **Gateway** | Entry point that may also handle auth, rate limiting, protocol translation |
| **Sidecar Proxy** | Per-service proxy in a service mesh (Envoy, Linkerd) |

## 3. The Problem Without It

- **Without reverse proxy**: Every server must handle TLS, compression, caching, logging, and authentication independently → code duplication, inconsistent behavior, high CPU usage on app servers.
- **Without load balancer**: Single server handles all traffic → SPOF (single point of failure). Add more servers but clients must manually pick which one → no auto-scaling, no failover.
- **Without forward proxy**: Employees' outbound traffic goes directly to the internet → no content filtering, no malware protection, no caching of external resources.
- **Without sidecar proxy**: Microservices must implement service discovery, retry, circuit breaking, and observability in every language/framework → inconsistent behavior, high development cost.

## 4. How It Works — Core Mechanics

### Reverse Proxy Flow (Nginx)
\`\`\`
Client → Nginx (port 443, TLS terminated)
  → Check cache? HIT → return cached response
  → MISS → modify headers (add X-Forwarded-For)
    → Apply rate limiting
      → Compress response (gzip)
        → Forward to backend
          → Wait for response
            → Cache response (Cache-Control)
              → Return to client

Nginx handles: TLS, caching, compression, rate limiting, logging
Backend handles: application logic only
\`\`\`

### Load Balancer Flow (HAProxy)
\`\`\`
Client → HAProxy (port 80)
  → Health check loop (every 5s): 
      Backend A: healthy (200 OK in 10ms)
      Backend B: healthy
      Backend C: unhealthy (timeout)
  → New request arrives:
      Pick Backend A (Least Connections)
      Forward TCP/HTTP to Backend A
  → Backend A fails:
      Mark unhealthy, stop sending traffic
      Recheck every 5s
      When healthy again: add back pool (slow_start)
\`\`\`

### Combined (Envoy)
\`\`\`
Client → Envoy (ingress gateway)
  → TLS termination
  → JWT authentication
  → Rate limiting (token bucket)
  → Route: /api/v1/* → cluster_api_v1
  → Forward request
  → cluster_api_v1 has:
      - 3 endpoints (discovered via xDS)
      - Least request LB
      - Circuit breaker (max 1000 connections)
      - Outlier detection (eject on 5 consecutive 5xx)
      - Retry (3 times, only on GET)
\`\`\`

## 5. Variants & Flavors

| Tool | Primary Role | L4/L7 | TLS | Caching | Dynamic Config | Service Mesh |
|------|-------------|-------|-----|---------|---------------|-------------|
| **Nginx** | Reverse Proxy | L7 | Yes | Yes (static) | No (reload) | No |
| **HAProxy** | Load Balancer | L4+L7 | Yes (2.0+) | No | No (reload) | No |
| **Envoy** | Both | L4+L7 | Yes | Limited | Yes (xDS API) | Yes (sidecar) |
| **Traefik** | Reverse Proxy + LB | L7 | Yes | No | Yes (auto-detect) | Yes (K8s) |
| **Caddy** | Reverse Proxy | L7 | Yes (auto) | No | No | No |

## 6. Performance Characteristics

| Metric | Nginx | HAProxy (L4) | HAProxy (L7) | Envoy |
|--------|-------|-------------|-------------|-------|
| Throughput (1 core) | 400K req/s | 5M pkt/s | 500K req/s | 300K req/s |
| P50 latency added | 200µs | 20µs | 200µs | 300µs |
| Memory per connection | 50KB | 16 bytes | 10KB | 100KB |
| Configuration | Static (reload) | Static (reload) | Static (reload) | Dynamic (xDS API) |
| TLS performance | Good (SSL session cache) | Excellent (passthrough) | Good | Good |
| Hot reload | Yes (USR2 signal) | Yes (reload via stats socket) | Same | Not needed (dynamic) |

## 7. Failure Modes

- **Nginx configuration error**: Invalid config on reload → Nginx fails to start → no traffic served. *Mitigation*: Test config with \`nginx -t\` before reload, use canary config rollouts.
- **HAProxy maxconn exhaustion**: All 100K connection slots used → new connections rejected even though backends have capacity. *Mitigation*: Set \`maxconn\` higher than expected peak, monitor connection usage, use SO_REUSEPORT for multi-process.
- **Envoy memory leak from xDS updates**: Dynamic service mesh config changes create new connection pools that aren't cleaned up. *Mitigation*: Monitor Envoy's RSS memory, set \`admin\` endpoint for memory dump analysis.
- **Reverse proxy buffering large responses**: Nginx buffers backend responses by default. 100MB response uses 100MB proxy buffer. *Mitigation*: Disable buffering for large responses: \`proxy_buffering off\`.

## 8. Decision Framework

\`\`\`
├─ Primary need:
│   ├─ Request/response manipulation (headers, cache, compression) → Reverse Proxy (Nginx)
│   ├─ Traffic distribution + health management → Load Balancer (HAProxy)
│   └─ Both + dynamic config → Envoy
├─ Static or dynamic infrastructure?
│   ├─ Static servers, simple routing → Nginx or HAProxy
│   ├─ Kubernetes / microservices → Envoy (sidecar) or Traefik
│   └─ Auto-scaling backends → HAProxy with service discovery
├─ Need TLS termination?
│   ├─ Yes → Nginx, HAProxy (L7), Envoy
│   └─ No → HAProxy L4 (fastest)
├─ Throughput requirements?
│   ├─ <100K req/s → Any
│   ├─ 100K-1M → HAProxy L7 or Nginx
│   └─ >1M → HAProxy L4 (TCP mode)
└─ Need automatic HTTPS certs?
    └─ Yes → Caddy (auto cert via ACME)
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Clients', type: 'client', x: 80, y: 160 },
    { id: 'cdn', label: 'CDN', type: 'cdn', x: 240, y: 60 },
    { id: 'rev_proxy', label: 'Reverse Proxy\n(Nginx)', type: 'gateway', x: 240, y: 280 },
    { id: 'lb', label: 'Load Balancer\n(HAProxy)', type: 'lb', x: 420, y: 160 },
    { id: 'app1', label: 'App Server 1', type: 'web', x: 600, y: 60 },
    { id: 'app2', label: 'App Server 2', type: 'web', x: 600, y: 160 },
    { id: 'app3', label: 'App Server 3', type: 'web', x: 600, y: 280 },
    { id: 'cache', label: 'Redis Cache', type: 'cache', x: 420, y: 60 },
  ]}
  edges={[
    { from: 'client', to: 'cdn', label: 'static assets' },
    { from: 'client', to: 'rev_proxy', label: 'HTTPS' },
    { from: 'rev_proxy', to: 'cache', label: 'cache check' },
    { from: 'rev_proxy', to: 'lb', label: 'proxy to LB' },
    { from: 'lb', to: 'app1', label: 'LC / RR' },
    { from: 'lb', to: 'app2', label: 'LC / RR' },
    { from: 'lb', to: 'app3', label: 'LC / RR' },
  ]}
  height={360}
/>

## 10. Real Production Incident

<Callout type="incident">
**Cloudflare — Nginx Configuration Error, July 2019**

Cloudflare's reverse proxy fleet (NGINX-based) experienced a global configuration error during a routine deploy. A configuration change that was valid in staging caused Nginx to allocate 100% CPU on ALL edge servers due to an infinite worker_process loop in a Lua script.

**Impact**: 27-minute outage for all Cloudflare customers (12M+ websites). Traffic could not be proxied, returning 521 errors.

**Root cause**: A Lua script in the config had an unhandled edge case that caused an infinite loop. The config was tested on one canary server which passed (low traffic hid the bug), but failed when rolled to 100% of production.

**Fix**: Implemented canary stages (1% → 5% → 25% → 100%) with automatic rollback if error rate exceeds 1%. Added CPU usage as a rollout metric. Config changes now require validation from two independent test frameworks.

**Lesson**: Even simple reverse proxy config changes can cause global outages. Always canary reverse proxy configs with automatic rollback. Monitor proxy CPU and error rate during rollout.
</Callout>

## 11. Production Implementation

### Nginx Reverse Proxy
\`\`\`nginx
http {
  # TLS termination
  server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;

    location /api/ {
      proxy_pass http://backend;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_buffering off;
    }

    location /static/ {
      root /var/www/static;
      expires 365d;
      add_header Cache-Control "public, immutable";
    }
  }

  upstream backend {
    least_conn;
    server app1:8080 max_fails=3 fail_timeout=30s;
    server app2:8080 max_fails=3 fail_timeout=30s;
  }
}
\`\`\`

### HAProxy Load Balancer
\`\`\`haproxy
global
  maxconn 100000
  nbproc 4

frontend http_in
  bind :80
  mode http
  default_backend app_servers

backend app_servers
  mode http
  balance leastconn
  option httpchk GET /health
  http-check expect status 200
  default-server inter 5s fall 3 rise 2
  server app1 10.0.1.1:8080 check weight 2
  server app2 10.0.1.2:8080 check weight 2
  server app-backup 10.0.1.3:8080 check backup
\`\`\`

### Envoy Combined Gateway
\`\`\`yaml
static_resources:
  listeners:
  - name: ingress
    address: { socket_address: { address: 0.0.0.0, port_value: 443 } }
    filter_chains:
    - transport_socket:
        name: envoy.transport_sockets.tls
        typed_config: { ... }
      filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          http_filters:
          - name: envoy.filters.http.router
          route_config:
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match: { prefix: "/api" }
                route: { cluster: api_cluster }
  clusters:
  - name: api_cluster
    connect_timeout: 0.25s
    lb_policy: MAGLEV
    health_checks: { ... }
    circuit_breakers: { ... }
\`\`\`

## 12. Real Company Deep Dives

- **Cloudflare**: Uses a modified Nginx as a reverse proxy + their own L4 (Spectrum). Global Anycast network distributes traffic to nearest PoP.
- **GitHub**: HAProxy for L4+L7 load balancing (MySQL, HTTP, SSH). Updated from Nginx to HAProxy for better observability and hot reload.
- **Lyft**: Created Envoy as a sidecar proxy for their service mesh. Envoy provides reverse proxy + load balancing + circuit breaking for every microservice instance.
- **Shopify**: Nginx reverse proxy + HAProxy load balancing. Nginx handles TLS termination, caching, and request rewriting. HAProxy distributes to app servers with Least Connections.

## 13. Interview Playbook

**Q: "What's the difference between a reverse proxy and a load balancer?"**
→ Open with: Both sit between clients and servers, but focus on different concerns.
→ Cover: Reverse proxy focuses on request/response manipulation (TLS, caching, compression, auth). Load balancer focuses on traffic distribution (health checks, connection draining, session affinity). Modern tools do both.
→ Depth signal: In a service mesh, the sidecar proxy (Envoy) acts as BOTH — it receives all traffic to the service (reverse proxy) and distributes to upstream clusters (load balancer).

**Q: "When would you use Nginx vs HAProxy vs Envoy?"**
→ Open with: Nginx for caching + TLS + static content. HAProxy for raw performance + L4. Envoy for dynamic microservices.
→ Cover: Nginx is best at caching and serving static files. HAProxy has the lowest overhead (20µs added latency) and best raw throughput. Envoy supports dynamic configuration (DSD API) essential for Kubernetes.
→ Depth signal: Nginx's caching system can serve 10K req/s from memory. HAProxy's single-process architecture avoids context switching. Envoy's L7 filter chain enables custom transformations.

## 14. Concept Check Quiz

**Q1:** What is the primary function of a reverse proxy?**Answer:** To accept requests on behalf of backend servers and handle cross-cutting concerns (TLS, caching, compression, auth).

**Q2:** What is the main difference between a forward proxy and a reverse proxy?**Answer:** Forward proxy sits in front of clients (outbound traffic filtering). Reverse proxy sits in front of servers (inbound traffic management).

**Q3:** Which tool is best for TLS termination + caching?**Answer:** Nginx — it has the best caching implementation (fastcgi_cache, proxy_cache) and mature TLS support.

**Q4:** What is a sidecar proxy?**Answer:** A proxy (Envoy) deployed alongside each service instance in a service mesh, handling all network communication for that service.

## 15. Next Steps

- **Service Mesh** — Advanced proxy patterns with sidecar proxies, mTLS, and observability.
- **Message Queues** — Queue-based load leveling for async processing.
- **Service Discovery** — How load balancers dynamically find backends.`,
    estimatedMin: 13,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Cloudflare", "GitHub", "Lyft", "Shopify", "Nginx"],
    tags: ["reverse-proxy", "load-balancer", "Nginx", "HAProxy", "Envoy", "sidecar"],
  },

  {
    id: "lesson-05-04",
    slug: "distributed-infrastructure-04-message-queues",
    title: "Message Queues",
    content: `## 0. Mental Model

> Message queues are like **restaurant order tickets** between the waiter and the kitchen. The waiter (producer) writes the order and places it on the rack (queue). The kitchen (consumer) picks up orders when ready. If the kitchen is busy, orders pile up. If the kitchen crashes, orders stay on the rack. The waiter doesn't wait for the food — they take the next order immediately (async).

## 1. Quick Summary

- **Message queues** enable asynchronous communication between services: producer sends message, consumer processes when ready. Decouples sender and receiver.
- **Key benefits**: Load leveling (smooth traffic spikes), fault isolation (consumer crash doesn't affect producer), async processing, work distribution.
- **Key patterns**: Work queues (one message → one consumer), Pub/Sub (one message → many consumers), Request/Reply (with response channel).
- **Delivery guarantees**: At-most-once (fast, may lose), At-least-once (reliable, may duplicate), Exactly-once (idempotent consumers needed).
- **Broker comparison**: RabbitMQ (smart broker, flexible routing), Kafka (durable log, high throughput), SQS (fully managed, simple).

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Producer** | Service that sends messages to the queue |
| **Consumer** | Service that receives and processes messages |
| **Broker** | The message queue server (RabbitMQ, Kafka, SQS) |
| **Queue** | FIFO buffer that holds messages until consumed |
| **Exchange** | RabbitMQ routing component that directs messages to queues |
| **Binding** | Rule connecting an exchange to a queue |
| **Delivery Guarantee** | How reliably messages are delivered (at-most-once, at-least-once, exactly-once) |
| **ACK (Acknowledgment)** | Consumer confirms message processed, broker deletes it |
| **NACK (Negative ACK)** | Consumer rejects message, broker requeues or dead-letters |
| **Dead Letter Queue** | Queue for messages that failed processing |
| **Backlog** | Accumulated unprocessed messages in the queue |

## 3. The Problem Without It

- **Synchronous dependency**: Service A calls Service B directly. If B is slow, A is slow. If B fails, A fails. Every service must handle every other service's availability → fragile distributed monolith.
- **Traffic spikes without buffer**: 100K requests/second for 5 minutes at peak. Without a queue, every service must be provisioned for peak traffic → 5x idle capacity during non-peak.
- **No fault isolation**: Order service crashes during payment processing → payments timeout, orders lost. With queue: messages persist, order service restarts and continues processing.
- **Scaling mismatch**: Order service produces 1000 orders/sec. Email service can only send 100 emails/sec. Without buffer, email service is overwhelmed. Queue absorbs the difference.

## 4. How It Works — Core Mechanics

### Basic Queue Flow
\`\`\`
Producer → Queue → Consumer
  ↑            ↑       ↑
  write        buffer  read + ACK

1. Producer sends message to queue (persists to disk)
2. Consumer polls broker (or broker pushes)
3. Consumer processes message
4. Consumer sends ACK → broker deletes message
5. If consumer fails before ACK → message becomes visible again (redelivery)
\`\`\`

### RabbitMQ Exchange Types
\`\`\`
Direct Exchange:   routing_key = binding_key → 1 queue
  ──[order.created]──> Queue A (binding: order.created)
  
Topic Exchange:    routing_key matches pattern → multiple queues
  ──[order.created.us]──> Queue A (binding: order.#)
                     ──> Queue B (binding: *.created.us)
  
Fanout Exchange:   ALL bound queues → broadcast
  ──[any message]──> Queue A, Queue B, Queue C
\`\`\`

### Kafka Partition Mechanics
\`\`\`
Topic "orders" with 3 partitions:
  Partition 0: [msg1, msg4, msg7] → Consumer group member 1
  Partition 1: [msg2, msg5, msg8] → Consumer group member 2  
  Partition 2: [msg3, msg6, msg9] → Consumer group member 3

Key-based partitioning: order_id=123 → hash → partition 1
  → All messages for same order are sequential in same partition
  → Consumer can process messages for an order in order

Offset management:
  Consumer reads at offset 42
  After processing: commits offset 42
  On restart: resumes from offset 42 (or 43)
  Messages are NOT deleted — they expire after retention period (7 days)
\`\`\`

## 5. Variants & Flavors

| Feature | RabbitMQ | Kafka | Amazon SQS |
|---------|---------|-------|------------|
| Architecture | Smart broker, dumb consumer | Dumb broker, smart consumer | Fully managed |
| Message model | Queue (push/pull) | Log (pull, offset-based) | Queue (pull) |
| Throughput | ~50K msgs/s | ~1M msgs/s | Unlimited (horizontal) |
| Latency | ~50µs | ~2ms | ~20ms |
| Persistence | Optional (RAM/disk) | Always (disk log) | Always (S3-backed) |
| Ordering | Per-queue (single consumer) | Per-partition | FIFO queue (limited throughput) |
| Routing | Exchange types (direct, topic, fanout) | Topic (pattern subscribe) | Simple queue/topic |
| Message retention | Until consumed + ACKed | Configurable (7 days default) | Up to 14 days |
| Exactly-once | No (at-least-once) | Yes (idempotent + transactional) | Yes (FIFO) |

## 6. Performance Characteristics

| Metric | RabbitMQ (RAM) | RabbitMQ (Disk) | Kafka | SQS Standard |
|--------|---------------|-----------------|-------|-------------|
| Max throughput (single) | 50K msg/s | 10K msg/s | 1M msg/s | Unlimited |
| P50 latency | 50µs | 200µs | 2ms | 20ms |
| P99 latency | 200µs | 1ms | 10ms | 100ms |
| Message size limit | 2GB | 2GB | 1MB (default, up to 10MB) | 256KB |
| Durability | Configurable | Always fsynced | Always replicated | Always (multi-AZ) |
| Consumer scaling | Competing consumers | Consumer groups (+ partitions) | Horizontal (unlimited) |

## 7. Failure Modes

- **Poison pill message**: Message that always causes consumer to fail → infinite retry loop. *Mitigation*: Dead letter queue after N retries, skip invalid messages.
- **Consumer lag avalanche**: Consumer falls behind → backlog grows → messages age past retention → data loss. *Mitigation*: Monitor consumer lag, auto-scale consumers, set max retention.
- **RabbitMQ memory alarm**: All queues store messages in RAM → memory threshold hit → publishers blocked. *Mitigation*: Set \`vm_memory_high_watermark\`, use lazy queues (always disk).
- **Kafka partition imbalance**: Key-based partitioning sends 80% of messages to one partition → one consumer handles 80% of load. *Mitigation*: Use meaningful partition keys, add random salt for hot keys.
- **SQS at-least-once duplicates**: SQS guarantees at-least-once delivery → producer retry + consumer processing both cause duplicates. *Mitigation*: Idempotent consumers (dedup by message ID).

## 8. Decision Framework

\`\`\`
├─ Throughput requirement?
│   ├─ <50K msg/s → RabbitMQ (feature-rich)
│   ├─ 50K-1M → Kafka (log-based)
│   └─ >1M → Kafka with many partitions
├─ Need complex routing?
│   ├─ Yes (topic/headers/fanout) → RabbitMQ
│   └─ No → Any
├─ Message ordering required?
│   ├─ Yes, across all messages → RabbitMQ (single queue) or SQS FIFO
│   └─ Per-key ordering → Kafka (per-partition)
├─ Fully managed?
│   ├─ Yes → SQS / SNS
│   └─ No → RabbitMQ or Kafka
├─ Long-term message storage?
│   ├─ Yes (replay, audit) → Kafka (log retention)
│   └─ No → RabbitMQ or SQS
└─ Microservices in Kubernetes?
    └─ Kafka or RabbitMQ with K8s operator
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'producer', label: 'Producer\n(Order Service)', type: 'app', x: 80, y: 60 },
    { id: 'queue', label: 'Message Queue\n(RabbitMQ / Kafka)', type: 'queue', x: 280, y: 60 },
    { id: 'exchange', label: 'Exchange\n(Routing)', type: 'gateway', x: 280, y: 200 },
    { id: 'email', label: 'Email Consumer', type: 'worker', x: 500, y: 60 },
    { id: 'sms', label: 'SMS Consumer', type: 'worker', x: 500, y: 200 },
    { id: 'dlq', label: 'Dead Letter Queue', type: 'queue', x: 500, y: 340 },
    { id: 'storage', label: 'Persistent Log\n(Kafka only)', type: 'storage', x: 280, y: 340 },
  ]}
  edges={[
    { from: 'producer', to: 'queue', label: 'publish order.created' },
    { from: 'queue', to: 'exchange', label: 'route message' },
    { from: 'exchange', to: 'email', label: 'order.created → email' },
    { from: 'exchange', to: 'sms', label: '*.created → sms' },
    { from: 'email', to: 'dlq', label: 'failed → DLQ' },
  ]}
  height={420}
/>

## 10. Real Production Incident

<Callout type="incident">
**Slack — RabbitMQ Cluster Failure Due to Memory, March 2021**

Slack's message delivery queue (RabbitMQ) experienced a cascading failure. A publishing spike caused queues to grow, consuming more RAM. RabbitMQ's memory alarm triggered, blocking all publishers. Blocked publishers caused connection timeouts in the web app. Users couldn't send messages for 22 minutes.

**Impact**: All 10M+ daily active users couldn't send messages. 22 minutes of downtime.

**Root cause**: RabbitMQ was configured with \`vm_memory_high_watermark\` at default 40%. During peak traffic, backpressure from slow consumers caused queue depths to grow. Each message in RAM consumed memory → hit watermark → blocked all producers.

**Fix**: Switched to **lazy queues** (always persist to disk, minimal RAM per message). Added consumer auto-scaling based on queue depth. Split the message delivery queue by priority (high: direct messages, low: channel messages).

**Lesson**: RabbitMQ's default RAM-based mode is dangerous for production traffic spikes. Use lazy queues or set conservative \`vm_memory_high_watermark\` with monitoring. Always implement consumer backpressure monitoring.
</Callout>

## 11. Production Implementation

### RabbitMQ Producer/Consumer
\`\`\`typescript
// Producer
import amqp from 'amqplib';
const conn = await amqp.connect('amqp://localhost');
const channel = await conn.createChannel();
const queue = 'order.created';
await channel.assertQueue(queue, { durable: true });

// Send message (persistent)
channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)), {
  persistent: true, // Survive broker restart
  contentType: 'application/json',
});

// Consumer
channel.consume(queue, async (msg) => {
  if (!msg) return;
  try {
    const order = JSON.parse(msg.content.toString());
    await emailService.sendConfirmation(order.email);
    channel.ack(msg); // Acknowledge — remove from queue
  } catch (err) {
    // Retry with backoff
    if (msg.fields.redelivered) {
      channel.nack(msg, false, false); // Dead letter
    } else {
      channel.nack(msg, false, true); // Requeue
    }
  }
});
\`\`\`

### Kafka Producer/Consumer
\`\`\`typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({ brokers: ['kafka:9092'] });

// Producer
const producer = kafka.producer({ idempotent: true });
await producer.send({
  topic: 'orders',
  messages: [{ key: order.userId, value: JSON.stringify(order) }],
});

// Consumer
const consumer = kafka.consumer({ groupId: 'email-service' });
await consumer.subscribe({ topic: 'orders', fromBeginning: false });
await consumer.run({
  eachMessage: async ({ message }) => {
    const order = JSON.parse(message.value!.toString());
    await emailService.sendConfirmation(order.email);
  },
});
\`\`\`

### SQS Consumer (Idempotent)
\`\`\`typescript
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

async function pollQueue() {
  const { Messages } = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: 'https://sqs.us-east-1.amazonaws.com/.../orders',
    MaxNumberOfMessages: 10,
    VisibilityTimeout: 30,
  }));

  for (const msg of Messages ?? []) {
    try {
      // Idempotency check — skip if already processed
      const alreadyProcessed = await checkIdempotency(msg.MessageId!);
      if (!alreadyProcessed) {
        await processOrder(msg.Body!);
        await markIdempotent(msg.MessageId!);
      }
      await sqs.send(new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: msg.ReceiptHandle!,
      }));
    } catch (err) {
      // Message becomes visible again after VisibilityTimeout
      console.error('Processing failed', err);
    }
  }
}
\`\`\`

## 12. Real Company Deep Dives

- **Slack**: RabbitMQ for real-time message delivery, Kafka for analytics. RabbitMQ handles 5B+ messages/day with sub-second delivery.
- **Uber**: Kafka for nearly all async communication — trip events, payments, notifications, analytics. 100+ Kafka clusters, 1M+ messages/sec.
- **Amazon**: SQS and SNS for internal async communication. SQS handles 10M+ requests/sec across all AWS services. SQS FIFO guarantees exactly-once for payment processing.
- **Netflix**: Kafka for event streaming (user activity, system metrics). Apache Flink for stream processing. 1M+ events/sec per cluster.

## 13. Interview Playbook

**Q: "Design a message queue system for an e-commerce order processing pipeline."**
→ Open with: Order service publishes order.created → multiple consumers handle different concerns (payment, inventory, email, shipping).
→ Cover: RabbitMQ for flexible routing (topic exchange: order.#, payment.#), Kafka for audit log (retention 30 days). Dead letter queue for failed payments. Idempotent consumers to handle at-least-once delivery.
→ Depth signal: For payment critical path (charge card before ship inventory), use a transactional outbox: write order to DB + outbox table in one transaction, a separate process publishes to the queue. This ensures exactly-once publish.
→ Avoid: Using a single queue for everything — separate queues by message type and priority.

**Q: "Compare Kafka and RabbitMQ for a real-time analytics pipeline."**
→ Open with: Kafka is better for high-throughput, replayable, ordered streams. RabbitMQ for complex routing, low latency, flexible delivery.
→ Cover: Kafka's log-based storage enables replay (reprocess from any point), has higher throughput (1M vs 50K msg/s), and supports multiple consumer groups reading the same stream. RabbitMQ has lower latency (50µs vs 2ms), richer routing (topic/direct/fanout exchanges).
→ Depth signal: Kafka's offset management means consumers control their own position — can rewind or fast-forward. RabbitMQ consumes by ACKing — once ACKed, message is gone (unless using quorum queues with streams plugin).
→ Avoid: saying one is strictly better — they solve different problems.

**Q: "How do you handle exactly-once processing in a message queue?"**
→ Open with: Exactly-once requires idempotent consumers + deduplication. The broker can't guarantee it alone.
→ Cover: Kafka provides exactly-once semantics via idempotent producers + transactional reads, but consumer must still be idempotent (process the same message twice = same result). RabbitMQ and SQS provide at-least-once — consumer must deduplicate using message ID.
→ Depth signal: Implement idempotency via a dedup table: \`INSERT INTO processed_messages (msg_id) VALUES (?) ON CONFLICT DO NOTHING\`. If insert succeeds, process. If duplicate (conflict), skip. This gives exactly-once for stateful processing.
→ Avoid: claiming exactly-once is "solved" by the broker — it always requires consumer cooperation.

## 14. Concept Check Quiz

**Q1:** What is the main advantage of async message queues over synchronous HTTP calls?
**Answer:** Decoupling — producer and consumer can operate independently. Producer doesn't wait, consumer can fail and retry, traffic spikes are buffered.

**Q2:** What can cause duplicate messages in a queue with at-least-once delivery?
**Answer:** Producer retries (sending the same message twice) or consumer crash after processing but before ACKing. Solution: idempotent consumers.

**Q3:** Why does Kafka have higher throughput than RabbitMQ?
**Answer:** Kafka uses sequential disk I/O (append-only log) and batch processing. RabbitMQ uses random disk I/O and per-message ACKs. Kafka also avoids per-message routing overhead.

**Q4:** What happens when a consumer fails to process a RabbitMQ message (crashes without ACK)?
**Answer:** After consumer disconnection, the un-ACKed message becomes visible again (redelivered). The broker reassigns it to another consumer in the same queue.

**Q5:** When would you use SQS FIFO over a standard SQS queue?
**Answer:** When strict message ordering and exactly-once delivery are required (payment processing, inventory updates). Standard SQS delivers at-least-once with best-effort ordering.

## 15. Next Steps

- **Pub/Sub Pattern** — One-to-many message delivery, fanout, and event broadcasting.
- **Kafka Architecture Deep Dive** — Partitions, consumer groups, replication, performance tuning.
- **RabbitMQ vs Kafka vs SQS** — Detailed comparison for production decisions.`,
    estimatedMin: 15,
    difficulty: "ADVANCED" as const,
    companies: ["Slack", "Uber", "Amazon", "Netflix", "RabbitMQ", "Kafka"],
    tags: ["message-queues", "RabbitMQ", "Kafka", "SQS", "async", "backpressure"],
  },

    {
    id: "lesson-05-05",
    slug: "distributed-infrastructure-05-distributed-system-antipatterns",
    title: "Distributed System Anti-patterns",
    content: `## 0. Mental Model

> Distributed system anti-patterns are like **bad habits in a team kitchen**. "Just share everything" (no boundaries) leads to chaos. "I'll fix it when it breaks" (no health checks) leads to 3 AM calls. "Everyone talks to everyone" (point-to-point communication) creates a tangled mess. Each anti-pattern is a recognizable failure mode that smart engineers learn to avoid.

## 1. Quick Summary

- **Tight Coupling**: Services depend on internal details of other services → change in one breaks many. Fix: API contracts, versioning, and service boundaries.
- **Shared Database**: Multiple services share a single database → schema changes require coordinated deploys, contention on shared tables. Fix: database-per-service.
- **Chatty Communication**: Many small round-trips between services → high latency, increased failure surface. Fix: batch requests, coarse-grained APIs.
- **No Circuit Breaker**: Cascading failure — one slow service causes all dependent services to slow down → whole system degrades. Fix: circuit breaker, bulkhead, timeouts.
- **No Observability**: Services produce no structured logs, metrics, or traces → debugging requires guessing. Fix: structured logging, metrics, distributed tracing.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Tight Coupling** | Service depends on internals of another service |
| **Shared Database** | Multiple services read/write the same database schema |
| **Chatty API** | Many fine-grained calls between services instead of batching |
| **Cascading Failure** | Failure in one service propagates to others |
| **Thundering Herd** | Many clients request the same resource simultaneously |
| **Starvation** | A service never gets resources because others consume them |
| **Deadlock** | Two services each hold a lock the other needs |
| **Sinkhole** | A "microservice" that just passes through to another service |
| **Distributed Monolith** | Services that are deployed separately but tightly coupled in code |

## 3. The Problem Without It

- **Shared database coupling**: Service A changes the \`users\` table schema. Service B (also using \`users\`) breaks in production. Coordinated deploy needed → 30-minute deploy window every schema change.
- **Chatty API**: User profile page requires 8 API calls: getUser, getOrders, getPaymentMethod, getAddress, getPreferences, etc. 8 round trips × 100ms = 800ms page load. With batching: 1 call × 150ms = 150ms.
- **Cascading failure**: Payment service slows down → Order service keeps waiting → Order service's HTTP connections exhausted → all Order API endpoints slow → API Gateway backs up → all services affected.
- **No timeouts**: Service A calls Service B with no timeout. B has a deadlock. A waits forever. A's threads/connections are permanently consumed. Restart required to recover.
- **Sinkhole service**: "UserService" that just calls UserDB microservice that just calls the users table in the shared database. Added latency: 20ms per hop. No value added.

## 4. How It Works — Core Mechanics

### Cascading Failure Propagation
\`\`\`
Normal: Client → API GW (5ms) → Order Svc (50ms) → Payment Svc (100ms)
                                                    → Inventory Svc (30ms)
              Total: ~185ms

Degraded: Payment Svc slows to 5000ms (GC pause)
  Client → API GW (5ms) → Order Svc (5000ms + 50ms) = blocked
    → API GW connections filling up (5000ms × 1000 requests)
      → All services behind API GW affected

Timeline:
  0s: Payment Svc GC pause starts
  1s: Order Svc has 200 in-flight requests (normally 10)
  3s: Order Svc connection pool exhausted → rejects new requests
  5s: API GW has 1000 queued requests → memory OOM
  6s: Full system outage
\`\`\`

### Shared Database Pitfall
\`\`\`
Service A: ALTER TABLE users ADD COLUMN phone VARCHAR;
  ──🚫 breaks Service B's query: SELECT * FROM users (column order changed)
  ──🚫 breaks Service C's migration that doesn't expect the column

Before microservices: shared DB was fine (single app team).
After microservices: shared DB creates deployment coupling.
Fix: Each service owns its data, exposes via API.
\`\`\`

## 5. Variants & Flavors

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| **Tight Coupling** | "Deploying Service A requires deploying B, C, D" | Shared internal types | API contracts, data duplication |
| **Shared Database** | "Schema changes require 4 team approvals" | Single DB for all services | Database-per-service |
| **Chatty APIs** | "Product page needs 12 API calls" | Anemic domain model | Aggregate endpoints (BFF, GraphQL) |
| **No Circuit Breaker** | "One slow service takes down everything" | No failure isolation | Circuit breaker, bulkhead, timeouts |
| **No Observability** | "Took 3 hours to find which service failed" | No structured logs/metrics/traces | Distributed tracing, structured logging |
| **Distributed Monolith** | "Microservices but can't deploy independently" | Hidden shared dependencies | Service boundaries, CI/CD isolation |

## 6. Performance Characteristics

| Pattern | Latency Impact | Reliability Impact | Debug Time | Fix Effort |
|---------|---------------|-------------------|------------|------------|
| Chatty APIs | 2-10x increase (RTT overhead) | Moderate (each hop can fail) | Low (visible) | Medium (aggregation) |
| Shared DB | None (direct) | High (schema coupling) | Medium | High (split DB) |
| Cascading failure | 10-100x (timeouts) | Critical (total outage) | High (root cause hiding) | Medium (circuit breakers) |
| No observability | None | High (can't diagnose) | Very high (guesswork) | High (add monitoring) |

## 7. Failure Modes

- **Fallacies of distributed computing**: Network is reliable, latency is zero, bandwidth is infinite, network is secure, topology doesn't change, there is one administrator, transport cost is zero, the network is homogeneous. All are FALSE.
- **Sinkhole anti-pattern**: A service added for "purity" that adds latency without value. 50 microservices but each just proxies to the database → 50× the network calls for no benefit.
- **Premature optimization**: Adding caching, sharding, queues before there's evidence of need → complexity tax without ROI.

## 8. Decision Framework

\`\`\`
├─ Service needs data from another service?
│   ├─ Via API call → OK (loose coupling)
│   └─ Via shared database → ANTI-PATTERN (split DBs)
├─ Service dependency chain > 3 deep?
│   ├─ Yes → Add async queue to decouple
│   └─ No → Monitor for cascade risk
├─ Can deploy service independently?
│   ├─ Yes → Healthy architecture
│   └─ No → Look for hidden coupling
├─ Can debug a failure without logs/traces?
│   ├─ No → Add observability (critical)
│   └─ Yes (from memory) → Add observability (you won't remember at 3 AM)
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client Request', type: 'client', x: 80, y: 60 },
    { id: 'gw', label: 'API Gateway', type: 'gateway', x: 240, y: 60 },
    { id: 'order', label: 'Order Service', type: 'app', x: 240, y: 200 },
    { id: 'payment', label: 'Payment Service\n(no CB → cascade)', type: 'app', x: 420, y: 200 },
    { id: 'inv', label: 'Inventory Service', type: 'web', x: 420, y: 340 },
    { id: 'db', label: 'Shared Database\n(anti-pattern)', type: 'db', x: 600, y: 60 },
    { id: 'db2', label: 'Order DB', type: 'db', x: 420, y: 60 },
    { id: 'db3', label: 'Payment DB', type: 'db', x: 600, y: 200 },
  ]}
  edges={[
    { from: 'client', to: 'gw', label: 'HTTP' },
    { from: 'gw', to: 'order', label: '/orders' },
    { from: 'order', to: 'payment', label: 'sync (tight coupling)' },
    { from: 'order', to: 'inv', label: 'sync (chatty)' },
    { from: 'order', to: 'db', label: 'shared DB (bad)' },
    { from: 'payment', to: 'db3', label: 'own DB (good)' },
  ]}
  height={420}
/>

## 10. Real Production Incident

<Callout type="incident">
**Knight Capital — No Circuit Breaker + No Canary, August 2012**

Knight Capital deployed a new trading algorithm to 8 servers. The deployment was to server 7 of 8 — but server 8 was running an old version. The new code had a hidden flag that was reused by the old code. Old code on server 8 sent millions of erroneous trades.

**Impact**: $460M loss in 45 minutes. Company went bankrupt.

**Root cause**: No canary deployment, no circuit breaker, no observability (alert was buried). The deployment script failed for server 8 but the operator didn't verify.

**Lesson**: Always canary deployments. Add circuit breakers for financial systems. Every deploy should have automatic rollback if error rate exceeds threshold.
</Callout>

## 11. Production Implementation

### Anti-pattern: Shared Database
\`\`\`typescript
// BAD: Order Service queries Payment Service's tables
const paymentStatus = await db.query(\`SELECT status FROM payments WHERE order_id = ?\`);
\`\`\`

### Fix: Database-per-Service
\`\`\`typescript
// GOOD: Order Service calls Payment Service's API
const paymentStatus = await paymentService.getStatus(orderId);
// Payment Service owns its data, exposes via API
\`\`\`

### Anti-pattern: No Timeouts
\`\`\`typescript
// BAD: no timeout — waits forever
const result = await fetch('http://payment-service/charge');
\`\`\`

### Fix: Timeouts + Circuit Breaker
\`\`\`typescript
// GOOD: timeout + circuit breaker
const result = await fetch('http://payment-service/charge', {
  signal: AbortSignal.timeout(500), // 500ms timeout
});
// Circuit breaker — after 5 failures, stop trying for 30s
\`\`\`

## 12. Real Company Deep Dives

- **Amazon**: Mandated API-first design and database-per-service in 2002 (Bezos' API mandate). All teams communicate only via APIs. Internal APIs are treated as external — no shared databases between teams.
- **Netflix**: Hystrix circuit breaker library (now in maintenance mode) was developed after cascading failures from degraded services. Every Netflix service has circuit breakers, bulkheads, and timeouts.
- **Google (Borg/S2)**: All services must expose health check endpoints and implement structured logging. Jobs have resource limits (CPU, memory) to prevent starvation of other services.

## 13. Interview Playbook

**Q: "You designed a microservice system. How do you know if you built a distributed monolith?"**
→ Open with: If you can't deploy services independently, you have a distributed monolith.
→ Cover: Signs — deploying Service A requires deploying B, C, D. Shared databases or caches. Synchronous dependency chains >3 deep. Chatty communication between services.
→ Depth signal: The test: take Service A offline. If multiple other services break, you have tight coupling. A true microservice should have minimal impact when it goes down.

## 14. Concept Check Quiz

**Q1:** What defines a distributed monolith?**Answer:** Services deployed separately but tightly coupled — can't deploy independently, share databases, or have deep synchronous dependency chains.

**Q2:** What is the primary risk of no circuit breaker pattern?**Answer:** Cascading failure — one slow service causes all upstream services to exhaust resources, toppling the whole system.

**Q3:** When is a shared database acceptable?**Answer:** Never in a microservice architecture. Every service must own its data.

**Q4:** What should every HTTP call between services have?**Answer:** A timeout (no infinite wait), retry policy (with backoff), and circuit breaker for repeated failures.

## 15. Next Steps

- **Pub/Sub Pattern** — Decoupling services with async event broadcasting.
- **Circuit Breaker Pattern** — Deep dive into failure isolation.
- **Bulkhead Pattern** — Resource isolation per service or tenant.`,
    estimatedMin: 12,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Amazon", "Netflix", "Google", "Knight Capital"],
    tags: ["distributed-systems", "anti-patterns", "tight-coupling", "cascading-failure", "circuit-breaker"],
  },

  {
    id: "lesson-05-06",
    slug: "distributed-infrastructure-06-pub-sub-pattern",
    title: "Pub/Sub Pattern",
    content: `## 0. Mental Model

> Pub/Sub is like a **radio station**. The DJ (publisher) broadcasts music on a frequency (topic). Anyone with a radio tuned to that frequency (subscriber) hears it. The DJ doesn't know who's listening. Listeners don't know who the DJ is. New listeners can join anytime and hear new broadcasts (but don't hear past songs unless recorded).

## 1. Quick Summary

- **Pub/Sub (Publish/Subscribe)** is a messaging pattern where publishers send messages to topics, and subscribers receive messages from topics they subscribe to.
- **Decoupling**: Publishers and subscribers don't know about each other. New subscribers can be added without changing publishers.
- **Fan-out**: One message → ALL subscribers (vs work queues: one message → one consumer).
- **Broker**: Cloud Pub/Sub services (AWS SNS, GCP Pub/Sub) or message brokers (RabbitMQ topic exchange, Kafka, Redis Pub/Sub).
- **Delivery**: Push (broker sends to subscriber webhook) or Pull (subscriber polls). Push has lower latency, pull supports backpressure.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Topic** | Named channel where messages are published |
| **Subscription** | Named binding between a topic and a subscriber |
| **Publisher** | Service that sends messages to a topic |
| **Subscriber** | Service that receives messages from a topic |
| **Fan-out** | Delivering each message to ALL subscribers |
| **Filter** | Subscribing to only certain messages (by attributes) |
| **Dead Letter Queue** | Failed messages stored for retry/inspection |
| **Push Delivery** | Broker sends messages to subscriber's HTTP endpoint |
| **Pull Delivery** | Subscriber polls broker for new messages |
| **Message Retention** | How long unacknowledged messages are kept |

## 3. The Problem Without It

- **Point-to-point integration**: Every service needs to know every other service that cares about its events. Order service must maintain a list of 10 downstream services and call each one directly → tight coupling, brittle.
- **Scaling subscribers**: Without Pub/Sub, adding a new service that needs order events requires modifying the Order Service code, redeploying, and adding the new service to the list.
- **No replay capability**: If a subscriber was down during an event, it missed it permanently. With Pub/Sub, messages persist (configurable retention) and can be replayed.
- **No fan-out**: A single event (user.created) needs to trigger email, SMS, analytics, billing, etc. Without Pub/Sub, the User Service must call each one → performance bottleneck.

## 4. How It Works — Core Mechanics

### Pub/Sub Flow
\`\`\`
Publisher → Topic → Subscription A → Subscriber A (push)
                  → Subscription B → Subscriber B (pull)
                  → Subscription C → Subscriber C (pull)

1. Publisher sends message to Topic "order.created"
2. Topic fans out to ALL subscriptions
3. Each subscription tracks its own cursor/offset
4a. Push: Broker HTTP POST to subscriber's endpoint
4b. Pull: Subscriber calls ReceiveMessage API
5. Subscriber ACKs → broker removes from subscription
6. Un-ACKed messages retry (configurable: 3 times → DLQ)
\`\`\`

### Kafka as Pub/Sub (Log-based)
\`\`\`
Topic "order.created" — Partition 0, 1, 2

Consumer Group A (email service):
  Member 1: Partition 0 (order 1, 4, 7)
  Member 2: Partition 1 (order 2, 5, 8)
  Member 3: Partition 2 (order 3, 6, 9)

Consumer Group B (analytics service):
  Member 1: All partitions
  Each consumer group gets ALL messages (fan-out)
  Within a group, messages are divided (work queue)
\`\`\`

## 5. Variants & Flavors

| System | Model | Delivery | Ordering | Retention | Best For |
|--------|-------|----------|----------|-----------|----------|
| **AWS SNS** | Pub/Sub only | Push (HTTP, SQS, Lambda, email) | Best-effort | Up to 14 days | Simple fan-out, AWS ecosystem |
| **GCP Pub/Sub** | Pub/Sub | Push + Pull | Per-subscription | Up to 7 days | Google Cloud, big data pipelines |
| **RabbitMQ Topics** | Exchange → Queues | Pull (via queue) | Per-queue | Until consumed | Flexible routing |
| **Kafka** | Log-based | Pull (offset) | Per-partition | Configurable (days-weeks) | High throughput, replay |
| **Redis Pub/Sub** | Fire-and-forget | Push | None | None (lost if not connected) | Real-time, ephemeral |

## 6. Performance Characteristics

| Metric | SNS | GCP Pub/Sub | RabbitMQ Topic | Kafka |
|--------|-----|-------------|---------------|-------|
| Throughput | Unlimited (horizontal) | Unlimited | ~50K msg/s | ~1M msg/s |
| P50 latency | ~20ms (push) | ~10ms (push) | ~50µs | ~2ms |
| Delivery guarantees | At-least-once | At-least-once | At-least-once | At-least-once (or exactly-once) |
| Subscriber scaling | Unlimited | Unlimited | Competing consumers | Consumer groups + partitions |
| Message size | 256KB | 10MB | 2GB | 1MB |
| Filtering | Message attributes | Labels | Binding keys | Topic regex |

## 7. Failure Modes

- **Push subscriber down**: Broker keeps retrying → exponential backoff → messages pile up → retention exceeded → data loss. *Mitigation*: DLQ after N retries, monitor subscription backlog.
- **No ordering**: SNS/GCP Pub/Sub don't guarantee order. Messages published as A, B, C may be received as C, A, B. *Mitigation*: Include sequence number in message, buffer and reorder on consumer side.
- **Duplicates on push timeout**: Subscriber processed the message but ACK timed out → broker retries → duplicate. *Mitigation*: Idempotent message handling.
- **Pull subscriber backlog**: Consumer too slow → backlog grows → messages expire → data loss. *Mitigation*: Auto-scale consumers based on subscription backlog size.
- **Redis Pub/Sub message loss**: Subscriber disconnects → all messages during disconnect are lost (no persistence). *Mitigation*: Use Redis Streams instead (persistent, consumer groups).

## 8. Decision Framework

\`\`\`
├─ Need persistent replay (subscribers can catch up after downtime)?
│   ├─ Yes → Kafka or GCP Pub/Sub (retention-based)
│   └─ No → SNS or RabbitMQ (ephemeral)
├─ Need filtering (subscribe to only certain message types)?
│   ├─ Yes → RabbitMQ (binding keys) or SNS (filter policy)
│   └─ No → Any
├─ Fully managed?
│   ├─ Yes → SNS (AWS) or Pub/Sub (GCP)
│   └─ No → Kafka or RabbitMQ
├─ High throughput (>100K msg/s)?
│   └─ Yes → Kafka
└─ Real-time, ephemeral (chat, notifications)?
    └─ Redis Pub/Sub (simplest, lowest latency)
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'pub', label: 'Publisher\n(Order Service)', type: 'app', x: 80, y: 160 },
    { id: 'topic', label: 'Topic\n"order.created"', type: 'queue', x: 280, y: 160 },
    { id: 'sub1', label: 'Subscription A', type: 'gateway', x: 280, y: 40 },
    { id: 'sub2', label: 'Subscription B', type: 'gateway', x: 280, y: 280 },
    { id: 'email', label: 'Email Service', type: 'worker', x: 500, y: 40 },
    { id: 'analytics', label: 'Analytics Service', type: 'worker', x: 500, y: 160 },
    { id: 'sms', label: 'SMS Service', type: 'worker', x: 500, y: 280 },
    { id: 'dlq', label: 'DLQ', type: 'queue', x: 280, y: 420 },
  ]}
  edges={[
    { from: 'pub', to: 'topic', label: 'publish' },
    { from: 'topic', to: 'sub1', label: 'fan-out' },
    { from: 'topic', to: 'sub2', label: 'fan-out' },
    { from: 'sub1', to: 'email', label: 'push' },
    { from: 'sub2', to: 'analytics', label: 'push' },
    { from: 'sub2', to: 'sms', label: 'push' },
    { from: 'email', to: 'dlq', label: 'failed' },
  ]}
  height={500}
/>

## 10. Real Production Incident

<Callout type="incident">
**AWS SNS — Throttling During re:Invent Keynote, November 2019**

During the AWS re:Invent keynote, a new service launch triggered massive adoption. SNS topics for CloudFormation stack events were overwhelmed as thousands of attendees deployed stacks simultaneously. SNS throttled certain API calls, causing 15-minute delays in event delivery.

**Impact**: CloudFormation stack deployments appeared stuck for 15 minutes. Users received "stack creation complete" notifications 15+ minutes after completion.

**Root cause**: SNS topic creation throttle (1500/second per account) was exceeded by automated deployment tools. Existing topics for event notifications hit a publish throttle (30K publishes/second per topic).

**Fix**: AWS increased default SNS limits (publish: 100K/s per topic, create: 3000/s). Added better error messaging so customers could distinguish throttling from actual failures.

**Lesson**: Pub/Sub systems have rate limits at both the topic and account level. Always design for throttling responses and implement exponential backoff.
</Callout>

## 11. Production Implementation

### AWS SNS Pub/Sub
\`\`\`typescript
// Publish to SNS topic
import { SNS } from '@aws-sdk/client-sns';
const sns = new SNS({ region: 'us-east-1' });

await sns.publish({
  TopicArn: 'arn:aws:sns:...:order-created',
  Message: JSON.stringify(order),
  MessageAttributes: {
    eventType: { DataType: 'String', StringValue: 'order.created' },
    priority: { DataType: 'String', StringValue: 'high' },
  },
});

// SQS subscription — workers pull from SQS
// SNS → SQS subscription → Worker polls SQS → process
\`\`\`

### GCP Pub/Sub Pull Subscriber
\`\`\`typescript
import { PubSub } from '@google-cloud/pubsub';
const pubsub = new PubSub();
const subscription = pubsub.subscription('order-created-sub');

subscription.on('message', (msg) => {
  const order = JSON.parse(msg.data.toString());
  console.log(\`Processing order \${order.id}\`);
  msg.ack(); // Acknowledge — remove from subscription
});

subscription.on('error', (err) => {
  console.error('Subscription error:', err);
});
\`\`\`

### Kafka Pub/Sub Consumer
\`\`\`typescript
const consumer = kafka.consumer({ groupId: 'order-email-group' });
await consumer.subscribe({ topic: 'order.created' });

await consumer.run({
  eachMessage: async ({ message }) => {
    const order = JSON.parse(message.value!.toString());
    await emailService.send(order.email, 'Order Confirmed');
  },
});
\`\`\`

## 12. Real Company Deep Dives

- **Amazon**: SNS is the backbone of async communication between AWS services. CloudWatch alarms → SNS → Lambda/Email/SQS. SNS handles 100B+ messages/month.
- **GitHub**: Uses a custom Pub/Sub system for webhook delivery. When an event occurs (push, PR, issue), it's published to a topic. Webhooks are subscriptions — each repo's webhooks are a fan-out from the same event.
- **Uber**: Ringpop (consistent hash ring) + Kafka for pub/sub in their trip lifecycle. Trip events (requested, accepted, started, completed, cancelled) are published to Kafka topics. Multiple subscribers (pricing, dispatch, payments, analytics).

## 13. Interview Playbook

**Q: "Design a notification system using Pub/Sub."**
→ Open with: User generates an event (order, message) → publish to a topic → multiple subscribers handle different notification channels.
→ Cover: SNS topic → SQS for email (batch, retry), SQS for SMS (low latency direct), Lambda for push notifications. Each subscriber has its own subscription — can fail independently.
→ Depth signal: Filtering — Notification Priority header determines channel (critical → SMS + email + push, normal → email + push, digest → email only). Dead letter queue for failed deliveries.

**Q: "Pub/Sub vs message queues — when to use each?"**
→ Open with: Pub/Sub = one message to many consumers (fan-out). Queue = one message to one consumer (work distribution).
→ Cover: Use Pub/Sub when multiple services need the same event (order.created → email, analytics, inventory). Use queues when you need to distribute work across workers (image processing, email sending).
→ Depth signal: Kafka blurs the line — a topic with multiple consumer groups acts as Pub/Sub (fan-out to groups), and within a group acts as a work queue.

## 14. Concept Check Quiz

**Q1:** What's the difference between Pub/Sub and a work queue?**Answer:** Pub/Sub delivers each message to ALL subscribers. Work queue delivers each message to ONE consumer (competing consumers pattern).

**Q2:** What happens if a push subscriber is down when a message is published?**Answer:** It depends on the broker. SNS retries with backoff (up to configurable retries) then sends to DLQ. Redis Pub/Sub drops the message.

**Q3:** How does Kafka implement Pub/Sub?**Answer:** Multiple consumer groups reading the same topic. Each group gets ALL messages (fan-out). Within a group, partitions are divided among members (work queue).

**Q4:** What is message filtering in Pub/Sub?**Answer:** Subscribers receive only messages matching conditions. SNS filter policy by message attributes. RabbitMQ binding patterns. Kafka consumer regex on topic name.

## 15. Next Steps

- **Kafka Architecture Deep Dive** — Partitions, consumer groups, replication, performance.
- **RabbitMQ vs Kafka vs SQS** — Detailed comparison.
- **Event-Driven Architecture** — Broader patterns around Pub/Sub in microservices.`,
    estimatedMin: 13,
    difficulty: "ADVANCED" as const,
    companies: ["Amazon", "GitHub", "Uber", "Google"],
    tags: ["pub-sub", "SNS", "fan-out", "event-driven", "notification"],
  },

  {
    id: "lesson-05-07",
    slug: "distributed-infrastructure-07-kafka-architecture",
    title: "Kafka Architecture",
    content: `## 0. Mental Model

> Kafka is like a **newspaper printing press** with an archive. Every event (news story) is printed (appended) to a never-ending scroll (log). Each reader (consumer) has a bookmark (offset) tracking where they stopped reading. Multiple sections (partitions) allow parallel printing. The scroll doesn't disappear after reading — you can go back and re-read past stories anytime within the retention period.

## 1. Quick Summary

- **Kafka** is a distributed event streaming platform. It's a **commit log** — an immutable, ordered, append-only sequence of records.
- **Topic** = event category. **Partition** = unit of parallelism (each partition is an ordered log). Messages within a partition are ordered; across partitions, no global order.
- **Producer** writes to a topic partition (key → hash → partition). **Consumer** reads from one or more partitions at its own pace (offset-based).
- **Consumer Group** = multiple consumers sharing work. Each partition is assigned to exactly one consumer in the group. Adding consumers increases throughput (up to the number of partitions).
- **Replication** = each partition has N replicas (configurable). Leader handles reads/writes. Followers replicate asynchronously. On leader failure, a follower is elected.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Broker** | Kafka server that stores data and serves clients |
| **Topic** | Named category of messages |
| **Partition** | Ordered, immutable sequence of records (unit of parallelism) |
| **Offset** | Unique sequential ID within a partition |
| **Consumer Group** | Set of consumers that share the workload for a topic |
| **Leader** | Partition replica that handles all reads/writes |
| **ISR (In-Sync Replica)** | Replica that is caught up with the leader |
| **Log Compaction** | Retaining only the latest message per key (not time-based) |
| **Record** | Key + Value + Timestamp + Headers |
| **Producer ACK** | Acknowledgement level: 0 (fire-and-forget), 1 (leader), all (ISR) |
| **Rebalance** | Partition reassignment when consumers join/leave a group |

## 3. The Problem Without It

- **No event log**: Without Kafka, services talk directly or via queues. Lost events can't be replayed. There's no "source of truth" for what happened.
- **Scaling consumption**: RabbitMQ queues can't scale read throughput — adding more consumers to the same queue increases throughput (competing consumers) but loses ordering. Kafka's partitions give linear scalability + ordering.
- **Buffering traffic spikes**: 100K writes/second for 30 seconds. Without Kafka's persistent log, you'd need to provision for peak (or buffer in memory, risking loss). Kafka absorbs the spike and consumers process at their own pace.
- **Multiple consumers**: Without Kafka, adding a new consumer (new analytics pipeline) requires either: modifying the publisher to also send to the new consumer (coupling), or the new consumer doesn't get historical data (cold start).

## 4. How It Works — Core Mechanics

### Write Path
\`\`\`
Producer → Partition Leader (specific broker)
  → Append to partition log on disk (sequential write, ~1ms)
  → Replicate to ISR followers (async, ~2-10ms)
  → Return ACK to producer (when min.insync.replicas have ACKed)

Sequential disk I/O: ~200MB/s per disk (vs random I/O: ~1MB/s)
Kafka relies on OS page cache for hot data, disk for cold data.
\`\`\`

### Read Path
\`\`\`
Consumer → Broker (partition leader)
  → Broker reads from log file at consumer's offset
  → Returns batch of messages to consumer (default: 1MB or 500ms)
  → Consumer commits offset periodically

Zero-copy transfer: sendfile() system call sends data from disk
  to network socket without copying through application memory.
\`\`\`

### Partition Assignment
\`\`\`
Topic "orders" — 6 partitions
Consumer Group "email-group" — 2 consumers
  Consumer A: partitions [0, 1, 2] (3 partitions)
  Consumer B: partitions [3, 4, 5] (3 partitions)

Consumer C joins → rebalance:
  Consumer A: [0, 1]
  Consumer B: [2, 3]
  Consumer C: [4, 5]

Adding more consumers than partitions → some consumers idle.
Max parallelism = number of partitions.
\`\`\`

## 5. Variants & Flavors

| Feature | Kafka | Redpanda | Pulsar | AWS MSK |
|---------|--------|----------|--------|---------|
| Architecture | ZooKeeper-based (or KRaft) | Single binary (no ZK) | Separate compute/storage | Managed Kafka |
| Throughput | ~1M msg/s/broker | ~2M msg/s/broker | ~1M msg/s/broker | Auto-scaling |
| Latency | ~2ms | ~1ms | ~5ms | ~5ms |
| Tiered storage | No (direct-attached disks) | No | Yes (to S3/GCS) | Yes (to S3) |
| Management | High (ZK + brokers) | Low (single binary) | Medium | Low (fully managed) |
| Kafka API compat | 100% | 100% | 100% | 99% |

## 6. Performance Characteristics

| Metric | Single Broker | 3 Brokers | 10 Brokers |
|--------|-------------|-----------|------------|
| Write throughput (acks=1) | 500K msg/s | 1.5M msg/s | 5M msg/s |
| Write throughput (acks=all) | 200K msg/s | 600K msg/s | 2M msg/s |
| Read throughput | 1M msg/s | 3M msg/s | 10M msg/s |
| P50 latency (acks=1) | 2ms | 3ms | 4ms |
| P50 latency (acks=all) | 5ms | 8ms | 12ms |
| Disk (compressed/day) | 500GB/day @ 200MB/s | 1.5TB/day | 5TB/day |

## 7. Failure Modes

- **Consumer lag explosion**: Consumer slows down (GC pause, DB slow), lag grows to millions. Messages expire before consumption → data loss. *Mitigation*: Monitor consumer lag (Lagom, Burrow), auto-scale consumers, increase retention.
- **Rebalance storm**: Multiple consumers restart simultaneously (deploy) → repeated rebalances → service unavailable during each rebalance (>1 min). *Mitigation*: Use static group membership, rolling restarts, increase \`session.timeout.ms\`.
- **Disk full**: Partition logs fill up disk → broker crashes. *Mitigation*: Set \`log.retention.bytes\` and \`log.retention.hours\`, monitor disk usage, alert at 80%.
- **Unclean leader election**: Leader fails, ISR count is 0 (all replicas behind). Broker elects a non-ISR replica → data loss. *Mitigation*: Set \`unclean.leader.election.enable=false\` (prefer availability over consistency — choose wisely).
- **Throttled producer**: Broker overloaded → producer throttled → backpressure to upstream services. *Mitigation*: Monitor broker request handler utilization, add partitions, increase throughput.

## 8. Decision Framework

\`\`\`
├─ Need event sourcing / audit log?
│   └─ Yes → Kafka (immutable log, replay capability)
├─ Need >50K msg/s throughput?
│   └─ Yes → Kafka (vs RabbitMQ)
├─ Need replay / reprocess from arbitrary point?
│   └─ Yes → Kafka (offset-based, retention-based)
├─ Need strict ordering (per-partition)?
│   └─ Yes → Kafka (use meaningful partition key)
├─ Need exactly-once semantics?
│   └─ Yes → Kafka (transactional producer + idempotent)
└─ Running in Kubernetes?
    └─ Consider Redpanda (simpler) or Strimzi operator
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'prod', label: 'Producer', type: 'app', x: 80, y: 60 },
    { id: 'broker1', label: 'Broker 1\nLeader P0', type: 'storage', x: 300, y: 40 },
    { id: 'broker2', label: 'Broker 2\nLeader P1', type: 'storage', x: 300, y: 180 },
    { id: 'broker3', label: 'Broker 3\nLeader P2', type: 'storage', x: 300, y: 320 },
    { id: 'zk', label: 'ZooKeeper\n(Controller)', type: 'gateway', x: 100, y: 180 },
    { id: 'cg1', label: 'Consumer Group A\n(Email)', type: 'worker', x: 500, y: 60 },
    { id: 'cg2', label: 'Consumer Group B\n(Analytics)', type: 'worker', x: 500, y: 320 },
    { id: 'topic', label: 'Topic "orders"\n3 partitions', type: 'queue', x: 200, y: 200 },
  ]}
  edges={[
    { from: 'prod', to: 'topic', label: 'write (key → partition)' },
    { from: 'zk', to: 'broker1', label: 'leader election' },
    { from: 'zk', to: 'broker2', label: 'leader election' },
    { from: 'zk', to: 'broker3', label: 'leader election' },
    { from: 'broker1', to: 'cg1', label: 'partition 0 → consumer A1' },
    { from: 'broker2', to: 'cg1', label: 'partition 1 → consumer A1' },
    { from: 'broker2', to: 'cg2', label: 'partition 1 → consumer B1' },
    { from: 'broker3', to: 'cg2', label: 'partition 2 → consumer B1' },
  ]}
  height={420}
/>

## 10. Real Production Incident

<Callout type="incident">
**Uber — Kafka Broker Rebalance Storm, April 2019**

Uber ran 100+ Kafka clusters across data centers. During a routine deployment, a rolling restart of brokers caused a cascading rebalance storm. Each broker restart triggered leader election for its partition leaders. Under high load, leader election timeouts cascaded as newly elected leaders couldn't keep up with replication.

**Impact**: 30-minute degradation of 20+ critical topics. Trip dispatch and pricing events delayed by 5-15 minutes. 100K+ trips affected.

**Root cause**: Default rebalance timeout (5s) was too aggressive for the cluster size. With 2000+ partitions per broker, each broker restart triggered 2000 leader elections. Replication traffic saturated the network.

**Fix**: Increased \`zookeeper.session.timeout.ms\` to 30s. Implemented **controlled shutdown** — broker deregisters as partition leader before stopping, allowing graceful leader transfer. Increased \`num.replica.fetchers\` to parallelize replication.

**Lesson**: At scale, Kafka defaults are wrong. Tune timeouts, fetchers, and session timeouts for your cluster size. Always use controlled shutdown (SIGTERM, not SIGKILL).
</Callout>

## 11. Production Implementation

### Producer with Exactly-Once
\`\`\`typescript
const producer = kafka.producer({
  idempotent: true,
  transactionalId: 'order-producer-1',
  maxInFlightRequests: 1,
});

await producer.connect();
await producer.send({
  topic: 'orders',
  messages: [
    { key: order.userId, value: JSON.stringify(order) },
  ],
  acks: 'all', // Wait for all ISR replicas
});
\`\`\`

### Consumer with Idempotent Processing
\`\`\`typescript
const consumer = kafka.consumer({
  groupId: 'order-email-group',
  sessionTimeout: 30000, // 30s (prevent rebalance storms)
  maxBytesPerPartition: 10485760, // 10MB per fetch
});

await consumer.run({
  autoCommit: false, // Manual offset commit
  eachMessage: async ({ topic, partition, message }) => {
    try {
      // Idempotent: check if already processed
      const deduped = await checkIdempotency(message.headers['id']);
      if (!deduped) {
        await processOrder(message.value!.toString());
        await markProcessed(message.headers['id']);
      }
      await consumer.commitOffsets([
        { topic, partition, offset: (parseInt(message.offset) + 1).toString() },
      ]);
    } catch (err) {
      // Don't commit — will retry on restart
    }
  },
});
\`\`\`

### Production Tuning
\`\`\`properties
# broker config
num.partitions=24
default.replication.factor=3
min.insync.replicas=2
log.retention.hours=168  # 7 days
log.retention.bytes=1073741824  # 1GB per partition
log.segment.bytes=536870912  # 512MB segments
unclean.leader.election.enable=false
\`\`\`

## 12. Real Company Deep Dives

- **Uber**: 100+ Kafka clusters, 1M+ topics, handling trip lifecycle events. Schema Registry enforces Avro schemas. Flink processes streams for real-time pricing and dispatch.
- **Netflix**: Kafka for event streaming — user activity, system metrics, CDN logs. 1M+ events/sec. Multi-region Kafka with MirrorMaker 2.0 for cross-datacenter replication.
- **LinkedIn**: Created Kafka (originally for user activity tracking). Now handles 7 trillion messages/day. Replaced their legacy SIEM with Kafka-based streaming.
- **Confluent**: Kafka's parent company. Provides Kafka as a managed service (Confluent Cloud). Tiered storage (Kafka → S3) enables near-infinite retention.

## 13. Interview Playbook

**Q: "Design a Kafka-based event pipeline for an e-commerce platform."**
→ Open with: Orders, payments, inventory, and shipping events published to Kafka topics. Each microservice subscribes to relevant topics.
→ Cover: Topics: \`orders\`, \`payments\`, \`inventory\`, \`shipments\`. Partition by orderId for ordering. Consumer groups: order-service group, notification group, analytics group. Schema Registry with Avro/Protobuf for schema evolution.
→ Depth signal: Exactly-once semantics for payment processing — producer idempotent + transactional, consumer idempotent with dedup table. For monitoring: Burrow for consumer lag, Cruise Control for partition rebalancing.
→ Avoid: single topic for all events — separate topics by event type.

**Q: "How does Kafka achieve high throughput?"**
→ Open with: Sequential I/O (append-only log), zero-copy transfer, batching, partitioning.
→ Cover: Sequential writes (200MB/s) vs random writes (1MB/s). OS page cache (not JVM heap) for caching. sendfile() for zero-copy reads. Batching: producers batch sends (up to 16KB or linger.ms), consumers fetch in batches.
→ Depth signal: Kafka's efficiency comes from treating storage as a log, not a database. No random reads, no in-place updates, no index lookups on read. Just sequential append + sequential batch read.

**Q: "What is a consumer group rebalance and how do you handle it?"**
→ Open with: Rebalance = reassigning partitions when consumers join/leave a group. All consumers stop during rebalance.
→ Cover: Triggred by new consumer, consumer crash, or topic change. Old rebalance protocol (Eager) stops ALL consumers. New Cooperative Sticky protocol rebalances incrementally.
→ Depth signal: Static group membership (you assign member IDs) prevents rebalance on restart. Increase session.timeout.ms and heartbeat.interval.ms to reduce unnecessary rebalances. Use at least 2× more consumers than brokers for fault tolerance.

## 14. Concept Check Quiz

**Q1:** What is the unit of parallelism in Kafka?**Answer:** Partition. Adding more partitions allows more consumers to process in parallel. Max consumer throughput = max partitions.

**Q2:** How does Kafka guarantee ordering within a topic?**Answer:** Ordering is per-partition, not per-topic. Messages with the same key go to the same partition and maintain their order.

**Q3:** What happens when a consumer crashes without committing its offset?**Answer:** After session timeout (default 10s), the consumer group rebalances. The partition is assigned to another consumer, which reads from the last committed offset → some messages are reprocessed.

**Q4:** What is the purpose of \`min.insync.replicas\`?**Answer:** Minimum number of replicas that must ACK a write before the producer receives a success response. Combined with \`acks=all\`, this ensures durability.

**Q5:** What is log compaction?**Answer:** Instead of time-based retention, Kafka keeps only the latest message per key. Useful for restoring state from a topic (e.g., database changelog — keep only current value per row).

## 15. Next Steps

- **RabbitMQ vs Kafka vs SQS** — Deep comparison for choosing the right tool.
- **Event-Driven Architecture** — Building microservices around events.
- **Pub/Sub Pattern** — Broader pub/sub concepts beyond Kafka.`,
    estimatedMin: 16,
    difficulty: "ADVANCED" as const,
    companies: ["Uber", "Netflix", "LinkedIn", "Confluent"],
    tags: ["Kafka", "event-streaming", "consumer-groups", "partitions", "replication"],
  },

  {
    id: "lesson-05-08",
    slug: "distributed-infrastructure-08-rabbitmq-vs-kafka-vs-sqs",
    title: "RabbitMQ vs Kafka vs SQS",
    content: `## 0. Mental Model

> Choosing between RabbitMQ, Kafka, and SQS is like choosing between a **taxi**, a **bus**, and a **delivery truck**. Taxi (RabbitMQ): fast, flexible routing, takes you directly where you need. Bus (Kafka): carries many people (high throughput), follows a fixed route (log), you can get on/off at stops (offsets). Delivery truck (SQS): fully managed, you just hand over the package and it arrives, eventually, at the right place.

## 1. Quick Summary

- **RabbitMQ**: Smart broker, flexible routing (direct, topic, fanout, headers exchanges). Best for complex routing, low latency (<100µs), and traditional message queuing.
- **Kafka**: Distributed commit log. Best for high throughput (1M+ msg/s), event streaming, replay, and audit logs. Consumers pull at their own pace.
- **SQS**: Fully managed, infinite scaling. Best for simple queueing with minimal ops overhead. At-least-once delivery (FIFO: exactly-once, limited throughput).
- **SNS**: Pub/only (no queues). Best for fan-out to multiple subscribers (email, SMS, SQS, Lambda).
- **Rule of thumb**: Simple queue → SQS. Complex routing → RabbitMQ. High throughput / event log → Kafka.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Smart Broker** | Broker handles routing, acknowledgments, dead lettering (RabbitMQ) |
| **Dumb Broker** | Broker stores bytes, consumer handles everything (Kafka) |
| **Exchange** | RabbitMQ routing component (direct, topic, fanout, headers) |
| **Binding** | Rule connecting exchange to queue with routing key |
| **Consumer Group** | Kafka: shared workload across consumers for a topic |
| **Offset** | Kafka: sequential position of a message in a partition |
| **Visibility Timeout** | SQS: time during which a consumed message is hidden from other consumers |
| **Dead Letter Queue** | Failed messages sent here for later inspection/retry |
| **FIFO Queue** | SQS: first-in-first-out with exactly-once delivery (300 msg/s) |
| **Standard Queue** | SQS: at-least-once, best-effort ordering, unlimited throughput |

## 3. The Problem Without It

- **Wrong tool for the job**: Using RabbitMQ for event streaming (need replay, high throughput) → message loss, can't reprocess, throughput capped. Using Kafka for simple task queue → overkill, complex ops, high latency for simple ACK-based consumption.
- **Ops complexity**: Running Kafka requires ZooKeeper (or KRaft), multiple brokers, monitoring consumer lag, partition management, rebalance handling. SQS: zero ops.
- **Throughput ceilings**: RabbitMQ peaks at ~50K msgs/s per queue. If you need 500K msgs/s, you need 10 parallel queues or switch to Kafka.
- **No replay in SQS**: Once consumed and deleted, the message is gone. If you need to reprocess, you need to store the event elsewhere. Kafka keeps the log — reprocess anytime.
- **Cost at scale**: SQS costs $0.40 per million requests. At 100M msgs/day: $40/day ($1200/month). Kafka on EC2: ~$500/month for 3 brokers. RabbitMQ on EC2: ~$300/month.

## 4. How It Works — Core Mechanics

### RabbitMQ Flow
\`\`\`
Producer → Exchange → (binding matches) → Queue → Consumer
  Exchange types determine HOW messages are routed:
  
  Direct: routing_key = binding_key → 1 queue
  Topic: routing_key pattern matches binding → 0-N queues
  Fanout: ALL bound queues → N queues
  Headers: match on header values (not routing key)

Message is DELETED from queue after consumer ACKs.
If no consumer: message stays in queue until consumed.
If queue full: publisher gets blocked (memory alarm) or message dropped.
\`\`\`

### Kafka Flow
\`\`\`
Producer → Topic Partition (append to log) → Consumer (read at offset)
  Message PERSISTS in log for retention period (default 7 days)
  Multiple consumer groups can read the same log independently
  Each consumer group has its own offset per partition
  Adding a new consumer group → can replay from beginning

Message remains in log after consumption.
Consumer controls its own offset.
Reprocessing = reset offset.
\`\`\`

### SQS Flow
\`\`\`
Producer → SQS Queue → Consumer (ReceiveMessage)
  Message becomes invisible for VisibilityTimeout (default 30s)
  Consumer processes and calls DeleteMessage
  If consumer doesn't delete within VisibilityTimeout → message reappears
  Maximum retention: 14 days

Standard queue: at-least-once, best-effort ordering
FIFO queue: exactly-once, strict ordering, 300 msg/s (or 3000 with batching)
\`\`\`

## 5. Variants & Flavors

| Feature | RabbitMQ | Kafka | SQS Standard | SQS FIFO |
|---------|---------|-------|-------------|----------|
| Model | Queue/Exchange | Log | Queue | Queue |
| Throughput | 50K msg/s | 1M+ msg/s | Unlimited | 300 msg/s |
| Latency | 50µs | 2ms | 20ms | 20ms |
| Ordering | Per-queue (1 consumer) | Per-partition | Best-effort | Strict |
| Delivery | At-least-once | At-least-once (exactly-once with config) | At-least-once | Exactly-once |
| Retention | Until consumed | Configurable (7d default) | Up to 14 days | Up to 14 days |
| Replay | No (messages deleted) | Yes (offset reset) | No | No |
| Routing | Rich (exchanges) | Topic subscription | Queue only | Queue only |
| Ops complexity | Medium | High | Zero | Zero |

## 6. Performance Characteristics

| Scenario | RabbitMQ | Kafka | SQS |
|----------|---------|-------|-----|
| 100 msg/s, simple routing | 100µs | 3ms | 20ms |
| 10K msg/s, topic routing | 5ms | 3ms | 30ms |
| 100K msg/s, replay not needed | Fails (cap) | 5ms | 50ms |
| 1M msg/s, replay needed | Fails | 10ms | Fails (cap) |
| Reprocess 1B messages | Not possible | 15 min (offset reset) | Not possible |
| Multi-region replication | Federation plugin | MirrorMaker 2.0 | Cross-region replication |

## 7. Failure Modes

- **RabbitMQ memory alarm**: Queues keep messages in RAM → memory exceeds watermark → all publishers blocked. *Mitigation*: Lazy queues (always disk), set lower watermark.
- **Kafka partition leader failure**: Leader fails → ZK/KRaft elects new leader → few seconds of unavailability for that partition. *Mitigation*: \`min.insync.replicas=2\`, 3 brokers, monitor leader election rate.
- **SQS at-least-once duplicates**: Network error causes producer to retry → duplicate message. Consumer crashes after processing but before DeleteMessage → another consumer gets it. *Mitigation*: Idempotent consumers.
- **Kafka consumer group rebalance**: All consumers stop for 5-30s during rebalance. *Mitigation*: Static group membership, cooperative rebalancing.
- **SQS FIFO throughput throttling**: FIFO queues limited to 300 msg/s (or 3000 with batching). *Mitigation*: Increase number of message group IDs, use standard queue where ordering not critical.

## 8. Decision Framework

\`\`\`
├─ Use SQS Standard:
│   • Simple task queue (email, notifications)
│   • Need zero ops overhead
│   • At-least-once is acceptable
│   • Unlimited throughput needed
│   • >10M messages/day, can't manage infrastructure
├─ Use SQS FIFO:
│   • Strict ordering required
│   • Exactly-once required (payment processing)
│   • Throughput <300 msg/s
├─ Use RabbitMQ:
│   • Complex routing needs (topic/fanout/headers)
│   • Sub-ms latency required
│   • Traditional request-reply patterns
│   • You want to run your own broker
│   • Throughput <50K msg/s
├─ Use Kafka:
│   • Throughput >50K msg/s
│   • Event log / audit log (must replay)
│   • Multiple consumers independently
│   • Event sourcing / CQRS
│   • Long-term retention (weeks)
│   • Stream processing (Kafka Streams, Flink)
└─ Use SNS + SQS:
    • Fan-out: one event → multiple services
    • Fully managed pub/sub + queue
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'pub', label: 'Event Producer', type: 'app', x: 80, y: 60 },
    { id: 'sns', label: 'SNS Topic', type: 'gateway', x: 260, y: 60 },
    { id: 'sqs', label: 'SQS Queue\n(email)', type: 'queue', x: 260, y: 200 },
    { id: 'rabbit', label: 'RabbitMQ Exchange\n(routing)', type: 'queue', x: 260, y: 340 },
    { id: 'kafka', label: 'Kafka Topic\n"orders" (log)', type: 'storage', x: 260, y: 460 },
    { id: 'email_worker', label: 'Email Worker', type: 'worker', x: 480, y: 200 },
    { id: 'sms_worker', label: 'SMS Worker', type: 'worker', x: 480, y: 340 },
    { id: 'analytics', label: 'Analytics Consumer\n(Group A)', type: 'worker', x: 480, y: 460 },
    { id: 'audit', label: 'Audit Consumer\n(Group B)', type: 'worker', x: 480, y: 60 },
  ]}
  edges={[
    { from: 'pub', to: 'sns', label: 'publish event' },
    { from: 'sns', to: 'sqs', label: 'fan-out to queue' },
    { from: 'sns', to: 'rabbit', label: 'fan-out to exchange' },
    { from: 'sns', to: 'kafka', label: 'fan-out to topic' },
    { from: 'sqs', to: 'email_worker', label: 'pull (visibility)' },
    { from: 'rabbit', to: 'sms_worker', label: 'push' },
    { from: 'kafka', to: 'analytics', label: 'pull (offset)' },
    { from: 'kafka', to: 'audit', label: 'pull (offset, replay)' },
  ]}
  height={540}
/>

## 10. Real Production Incident

<Callout type="incident">
**Capital One — SQS Poison Pill Cascade, 2020**

A payment processing service used SQS standard queues. A malformed payment message caused the consumer to fail with a deserialization error. The consumer did NOT delete the message (it threw an exception before reaching the DeleteMessage call). After VisibilityTimeout (30s), the message reappeared → consumed again → failed again → loop.

**Impact**: One malformed message consumed 100% of consumer processing for 3 hours. 10K+ legitimate payment messages were delayed, causing 10K failed payments.

**Root cause**: Consumer didn't have a poison pill handler. Malformed message caused an infinite retry loop. No dead letter queue configured (SQS requires explicit DLQ setup).

**Fix**: Added a **dead letter queue** with max receive count = 5. After 5 retries, message moves to DLQ. Consumer was updated to wrap entire processing in try/catch — any error sends to DLQ. Added CloudWatch alarm on DLQ message count.

**Lesson**: Every SQS queue needs a dead letter queue. Every consumer must handle poison pill messages gracefully. Don't let a single bad message block the entire pipeline.
</Callout>

## 11. Production Implementation

### RabbitMQ — topic exchange routing
\`\`\`typescript
// Producer
channel.publish('events', 'order.created.us', Buffer.from(orderJson));
// routing_key: order.created.us

// Consumer (binds to specific patterns)
channel.bindQueue(queue, 'events', 'order.created.#'); // all created orders
channel.bindQueue(queue, 'events', '*.created.us'); // US created orders
\`\`\`

### Kafka — high throughput producer
\`\`\`typescript
const producer = kafka.producer({
  compression: 'snappy',    // compress messages (reduce storage 50%)
  acks: 'all',              // wait for all replicas
  lingerMs: 10,             // batch up to 10ms
  batchSize: 65536,         // 64KB batches
});

// Key-based partitioning keeps related messages ordered
await producer.send({
  topic: 'orders',
  messages: [{ key: order.userId, value: orderJson }],
});
\`\`\`

### SQS — with DLQ and idempotent consumer
\`\`\`typescript
// Create queue with DLQ
const queue = await sqs.createQueue({
  QueueName: 'payment-queue',
  Attributes: {
    VisibilityTimeout: '60',
    MessageRetentionPeriod: '86400',
    RedrivePolicy: JSON.stringify({
      deadLetterTargetArn: dlqArn,
      maxReceiveCount: '5',        // After 5 retries → DLQ
    }),
  },
});

// Idempotent consumer
async function processMessage(msg: Message) {
  const dedupKey = msg.MessageAttributes?.MessageDeduplicationId?.StringValue;
  if (await isProcessed(dedupKey)) { return; } // Already processed

  await processPayment(msg.Body);
  await markProcessed(dedupKey);
  await sqs.deleteMessage({ QueueUrl, ReceiptHandle: msg.ReceiptHandle });
}
\`\`\`

## 12. Real Company Deep Dives

- **Slack**: RabbitMQ for real-time message delivery. Extensive use of direct and topic exchanges for routing messages to correct channel subscribers. ~5B messages/day.
- **Uber**: Kafka as the central nervous system for all trip events. 100+ clusters, 1M+ topics. Also uses RabbitMQ for specific command/response patterns.
- **Amazon**: SQS/SNS as the backbone for internal async communication. 10M+ requests/sec. SQS FIFO for payment processing (exactly-once). SNS for fan-out to multiple subscribers.
- **Netflix**: Kafka for event streaming (Zuul gateway events, CDN metrics). Switched from SQS to Kafka for better replay capability and retention.

## 13. Interview Playbook

**Q: "Compare RabbitMQ, Kafka, and SQS. When would you choose each?"**
→ Open with: They solve different problems at different scales with different operational overhead.
→ Cover: RabbitMQ = flexible routing, sub-ms latency, 50K msg/s. Kafka = 1M+ msg/s, persistent log, replay. SQS = fully managed, infinite scale, simple.
→ Depth signal: Many systems use ALL THREE — SNS fans out to SQS for email (simple queue), RabbitMQ for complex routing (internal services), Kafka for audit log and analytics replay.

**Q: "Design a payment processing system — which messaging tool?"**
→ Open with: Payment processing requires at-least-once delivery, ordering per payment, and exactly-once processing.
→ Cover: SQS FIFO for the payment queue (exactly-once, ordered per PaymentId). SNS for fan-out to downstream services (email, analytics). Kafka for the payment event log (audit trail, replay for reconciliation).
→ Depth signal: Use SQS FIFO with message group ID = PaymentId (ordering per payment). Dead letter queue for failed payments. Kafka topic for the immutable payment event log with 1-year retention.

**Q: "How do you handle backpressure in these systems?"**
→ Open with: Backpressure = consumer can't keep up with producer.
→ Cover: RabbitMQ: publisher blocks when queue hits memory limit (flow control). Kafka: producer can keep publishing (log absorbs), consumer lag grows. SQS: unlimited queue depth, no backpressure to producer.
→ Depth signal: Kafka's lag-based backpressure is the most graceful — the log absorbs the spike, consumers catch up. Monitor consumer lag. Auto-scale consumers. RabbitMQ's flow control can cascade (blocked publisher → blocked upstream services).

## 14. Concept Check Quiz

**Q1:** Which system is best for a simple task queue with zero ops overhead?**Answer:** SQS Standard — fully managed, unlimited throughput, pay per request.

**Q2:** When would you choose RabbitMQ over Kafka?**Answer:** When you need complex routing (topic/fanout/headers exchanges) or sub-millisecond latency. RabbitMQ adds 50µs vs Kafka's 2ms.

**Q3:** What's the main difference between SQS Standard and FIFO?**Answer:** Standard: at-least-once, best-effort ordering, unlimited throughput. FIFO: exactly-once, strict ordering, 300 msg/s.

**Q4:** Why is Kafka's log-based architecture better for event sourcing?**Answer:** The log is immutable and persistent. You can replay events from any point by resetting consumer offsets. RabbitMQ and SQS delete messages after consumption.

**Q5:** What is the throughput ceiling of a single RabbitMQ queue?**Answer:** ~50K msg/s per queue. Beyond that, you need multiple queues or Kafka.

## 15. Next Steps

- **Kafka Architecture** — Deep dive into partitions, consumer groups, replication.
- **Pub/Sub Pattern** — Fan-out event broadcasting.
- **Service Discovery** — How services find each other in dynamic environments.`,
    estimatedMin: 15,
    difficulty: "ADVANCED" as const,
    companies: ["Amazon", "Slack", "Uber", "Netflix", "Capital One"],
    tags: ["RabbitMQ", "Kafka", "SQS", "message-queues", "comparison"],
  },

  {
    id: "lesson-05-09",
    slug: "distributed-infrastructure-09-service-discovery",
    title: "Service Discovery",
    content: `## 0. Mental Model

> Service discovery is like a **restaurant host** who knows which tables are free. When a guest (client) arrives, the host checks the seating chart and directs them to an available table. When tables become full or free, the host updates the chart. The guest doesn't need to know table numbers in advance — just ask the host.

## 1. Quick Summary

- **Service discovery** = finding where a service instance is running (IP:port) so clients can connect.
- **Client-side discovery**: Client queries a registry (Consul, etcd, Eureka), gets list of instances, picks one. Simpler, fewer network hops.
- **Server-side discovery**: Client goes through a load balancer (AWS ALB, NLB). LB queries registry and routes. Client doesn't need to know about discovery.
- **DNS-based discovery**: SRV records return available instances (used by Kubernetes). Round-robin DNS for load distribution.
- **Health checks**: Registry marks instances as healthy/unhealthy. Unhealthy instances are removed from the pool.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Service Registry** | Database of available service instances and their network locations |
| **Client-Side Discovery** | Client queries registry and selects an instance |
| **Server-Side Discovery** | Client sends to LB, LB queries registry |
| **Health Check** | Periodic check to verify an instance is healthy |
| **Heartbeat** | Instance periodically sends "I'm alive" signal to registry |
| **DNS SRV Record** | DNS record type that returns host:port for a service |
| **Sidecar** | Proxy (Envoy) deployed with each instance for service mesh |
| **Consul** | HashiCorp's service mesh and service discovery tool |

## 3. The Problem Without It

- **Hardcoded IPs**: Service A connects to Service B at \`10.0.1.5:8080\`. When B is redeployed (new IP), A breaks. Every deploy requires updating configs across all consumers.
- **No auto-scaling**: With hardcoded IPs, you can't add instances dynamically. Auto-scaling group adds 3 more Service B instances, but Service A doesn't know about them.
- **No failure detection**: Service B instance crashes. Service A keeps sending requests to the dead IP → errors. Without health checks, you can't detect failures.
- **No load-aware routing**: All instances treated equally. A degraded instance gets the same traffic as healthy ones.

## 4. How It Works — Core Mechanics

### Client-Side Discovery
\`\`\`
Service A (client)          Service Registry (Consul)       Service B instances
       │                              │                           │
       │── GET /health/service-b ────→│                           │
       │←── {"instances": [           │                           │
       │     "10.0.1.1:8080",         │                           │
       │     "10.0.1.2:8080",         │                           │
       │     "10.0.1.3:8080"]}        │                           │
       │                              │                           │
       │── (pick one: 10.0.1.2:8080) ──────────────────────────────────→ │
       │←────────────────────────────────────────────────── response── │
\`\`\`

### Server-Side Discovery (AWS ALB)
\`\`\`
Service A (client)          ALB (DNS: service-b.alb.amazonaws.com)     Service B instances
       │                              │                                      │
       │── service-b.alb... ───────→  │                                      │
       │                              │── (registry says instances [1,2,3])  │
       │                              │── forward to instance 2 ──────────→ │
       │←───────────────────────────────────────────────────────── response │
\`\`\`

### DNS-Based Discovery (Kubernetes)
\`\`\`
Service A resolves "service-b.default.svc.cluster.local"
  → DNS returns A records for all Service B pod IPs
  → kube-proxy distributes traffic via iptables/IPVS

If pod restarts → new IP → DNS updated (with TTL delay).

Example:
  service-b.default.svc.cluster.local → 10.1.0.1, 10.1.0.2, 10.1.0.3
  (round-robin A records)
\`\`\`

## 5. Variants & Flavors

| System | Model | Health Checks | Multi-DC | Service Mesh | K8s Native |
|--------|-------|--------------|----------|-------------|------------|
| **Consul** | Client-side + DNS | TCP/HTTP/gRPC | Yes | Yes (Connect) | Via consul-k8s |
| **etcd** | Key-value (for registry) | TTL-based | Yes | No | Via CoreDNS |
| **Eureka** (Netflix) | Client-side | Heartbeat | Limited | No | Via Spring Cloud |
| **K8s DNS** | DNS-based | Probes (liveness/readiness) | Yes | Via Istio | Yes |
| **ZooKeeper** | Key-value (ephemeral nodes) | Ephemeral node timeout | Yes | No | Via K8s |

## 6. Performance Characteristics

| Metric | Consul | Eureka | K8s DNS | etcd + custom |
|--------|--------|--------|---------|---------------|
| Registry read latency | ~5ms | ~10ms | ~1ms (cached) | ~3ms |
| Registry write latency (register) | ~10ms | ~5ms | N/A (kubelet) | ~10ms |
| Health check interval | 10s | 30s (heartbeat) | 10s (kubelet) | TTL-based |
| Failover detection | 10s | 60s (3 missed heartbeats) | 30s | TTL |
| Max instances | 100K | Limited | Unlimited | 100K |

## 7. Failure Modes

- **Stale registry data**: Instance crashed but registry still shows healthy → clients get dead IP. *Mitigation*: Short TTL/heartbeat interval, client-side retry on connection failure.
- **Registry split-brain**: Consul servers partitioned → different instances think different things are healthy. *Mitigation*: Consul requires majority consensus (RAFT).
- **DNS cache poisoning**: DNS TTL is 30s → after instance dies, clients still use old IP for up to 30s → errors. *Mitigation*: Keep DNS TTL short (5-10s), use client-side retry.
- **Registration storm**: 1000 instances start simultaneously → all register at once → registry write throughput exceeded. *Mitigation*: Batch registrations, use async registration.

## 8. Decision Framework

\`\`\`
├─ Kubernetes?
│   └─ Yes → K8s DNS + readiness probes (native)
├─ Cloud-native (AWS)?
│   ├─ ALB/NLB + target groups (server-side)
│   └─ Eureka (client-side, Spring Cloud apps)
├─ Multi-DC, multi-cloud?
│   └─ Consul (best for complex topologies)
├─ Service mesh?
│   └─ Consul Connect or Istio (sidecar-based discovery)
└─ Simple, self-hosted?
    └─ etcd + custom registry
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client Service', type: 'app', x: 80, y: 60 },
    { id: 'registry', label: 'Service Registry\n(Consul / etcd)', type: 'gateway', x: 80, y: 240 },
    { id: 'lb', label: 'Server-Side LB\n(ALB / NLB)', type: 'lb', x: 300, y: 60 },
    { id: 'inst1', label: 'Instance 1\n(healthy)', type: 'web', x: 300, y: 240 },
    { id: 'inst2', label: 'Instance 2\n(healthy)', type: 'web', x: 300, y: 360 },
    { id: 'inst3', label: 'Instance 3\n(unhealthy)', type: 'web', x: 300, y: 480 },
    { id: 'hc', label: 'Health Checker', type: 'metrics', x: 80, y: 420 },
  ]}
  edges={[
    { from: 'client', to: 'registry', label: 'discover instances' },
    { from: 'client', to: 'lb', label: 'or use LB (server-side)' },
    { from: 'lb', to: 'inst1', label: 'route traffic' },
    { from: 'lb', to: 'inst2', label: 'route traffic' },
    { from: 'lb', to: 'inst3', label: '× unhealthy' },
    { from: 'hc', to: 'inst1', label: 'healthy' },
    { from: 'hc', to: 'inst2', label: 'healthy' },
    { from: 'hc', to: 'inst3', label: '× fail' },
    { from: 'hc', to: 'registry', label: 'update status' },
  ]}
  height={560}
/>

## 10. Real Production Incident

<Callout type="incident">
**Netflix — Eureka Registry Outage, March 2013**

Netflix's Eureka service registry experienced a cascading failure. A bad deploy caused all service instances to re-register simultaneously (registration storm). Eureka servers couldn't handle the write throughput. Instances were deregistered as unhealthy because their heartbeat registration timed out.

**Impact**: All services lost service discovery. New deployments failed (couldn't register). Some traffic was misrouted to unhealthy instances.

**Root cause**: Registration storm + Eureka's eventual consistency model. Under load, Eureka preferred availability over consistency — it accepted registrations but couldn't replicate fast enough, leading to split-brain.

**Fix**: Implemented **self-preservation mode** — when Eureka detects a high rate of missed heartbeats, it stops expiring instances (assumes network issue, not instance failure). Added instance registration throttling.

**Lesson**: Service registries need self-preservation mechanisms to handle network partitions and registration storms. Eventual consistency for health status is acceptable; losing all registrations is catastrophic.
</Callout>

## 11. Production Implementation

### Consul Service Registration
\`\`\`hcl
# Nomad job or Consul config
service {
  name = "payment-service"
  port = 8080
  tags = ["v2", "production"]
  
  check {
    type = "http"
    path = "/health"
    interval = "10s"
    timeout = "2s"
    deregister_critical_service_after = "30s"
  }
  
  connect {
    sidecar_service {}
  }
}
\`\`\`

### Client-Side Discovery (Consul)
\`\`\`typescript
import Consul from 'consul';
const consul = new Consul({ host: 'consul.service.consul' });

async function callPaymentAPI(request: PaymentRequest): Promise<PaymentResponse> {
  // Discover instances
  const instances = await consul.agent.service.list('payment-service');
  const healthy = Object.values(instances).filter(s => 
    s.Checks?.every(c => c.Status === 'passing')
  );
  
  // Pick random healthy instance
  const instance = healthy[Math.floor(Math.random() * healthy.length)];
  const url = \`http://\${instance.Address}:\${instance.Port}/charge\`;
  
  // Call with retry on failure
  return retry(3, () => fetch(url, { method: 'POST', body: JSON.stringify(request) }));
}
\`\`\`

### Kubernetes DNS Discovery
\`\`\`yaml
# Service definition — automatically creates DNS entries
apiVersion: v1
kind: Service
metadata:
  name: payment-service
spec:
  selector:
    app: payment-service
  ports:
    - port: 8080
      targetPort: 8080
---
# Client uses DNS name
# payment-service.default.svc.cluster.local
# kube-proxy routes to a healthy pod
\`\`\`

## 12. Real Company Deep Dives

- **Netflix**: Eureka for service discovery (now in maintenance mode, replaced by Spring Cloud + service mesh). Self-preservation mode prevents cascading failures. Each region has its own Eureka cluster.
- **HashiCorp (Consul)**: Consul Connect provides service discovery + mTLS + intentions (authorization). Used by thousands of enterprises for multi-DC service mesh.
- **Kubernetes (CoreDNS)**: All services get DNS names. Liveness/readiness probes determine pod health. kube-proxy maintains iptables rules for TCP/UDP/SCTP traffic distribution.
- **Amazon**: AWS Cloud Map for service discovery across EC2, ECS, Lambda, and on-prem. ALB/NLB target groups for server-side discovery.

## 13. Interview Playbook

**Q: "Design a service discovery system for a microservice architecture."**
→ Open with: Need a registry (etcd/Consul) + health checks + client or server-side discovery.
→ Cover: Consul for multi-DC, health checks, and DNS interface. Client-side discovery for lower latency (no LB hop). Server-side via ALB for AWS-native apps. TTL-based health checks with self-preservation mode.
→ Depth signal: For Kubernetes, use native DNS + readiness probes. For service mesh, use Envoy sidecar with Consul Connect or Istio — sidecar handles discovery transparently.

## 14. Concept Check Quiz

**Q1:** What is the main difference between client-side and server-side discovery?**Answer:** Client-side: client queries registry directly. Server-side: client goes through a load balancer that handles discovery.

**Q2:** How does Kubernetes service discovery work?**Answer:** DNS-based. Each service gets a DNS name (\`service.namespace.svc.cluster.local\`). kube-proxy maintains iptables rules to route to healthy pods.

**Q3:** What is a registration storm?**Answer:** Many instances registering simultaneously, overwhelming the registry. Mitigation: throttle registrations, async processing.

**Q4:** What does Consul's self-preservation mode do?**Answer:** Stops expiring instances during network issues, assuming the problem is with the registry's ability to check health rather than actual instance failures.

## 15. Next Steps

- **Service Mesh** — Advanced service discovery with sidecar proxies.
- **Load Balancing** — Algorithms for distributing traffic across discovered instances.
- **Consul / Istio** — Deep dive into service mesh implementations.`,
    estimatedMin: 13,
    difficulty: "ADVANCED" as const,
    companies: ["Netflix", "HashiCorp", "Kubernetes", "Amazon"],
    tags: ["service-discovery", "Consul", "Eureka", "DNS", "health-checks"],
  },

  {
    id: "lesson-05-10",
    slug: "distributed-infrastructure-10-service-mesh",
    title: "Service Mesh",
    content: `## 0. Mental Model

> A service mesh is like an **air traffic control system** for microservices. Each plane (service) has a radio (sidecar proxy) that talks to air traffic control (control plane). The control plane knows where all planes are, which routes are available, and can enforce flight rules (traffic policies). Pilots don't communicate directly — all communication goes through their radios.

## 1. Quick Summary

- **Service mesh** = dedicated infrastructure layer for service-to-service communication. A sidecar proxy (Envoy) runs alongside each service instance, handling all network traffic.
- **Data plane**: The network of sidecar proxies (Envoy, Linkerd-proxy) that intercept and route traffic between services.
- **Control plane**: Management layer (Istiod, Consul Server) that configures the proxies with routing rules, security policies, and telemetry.
- **Key capabilities**: mTLS (encrypted service-to-service), circuit breaking, retries, timeouts, traffic splitting (canary), observability (metrics, traces, logs).
- **Benefits**: Developers don't need to implement retry, circuit breaking, or observability in their code. The mesh handles it transparently.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Sidecar Proxy** | Proxy (Envoy) deployed alongside each service instance |
| **Data Plane** | All sidecar proxies collectively handling data traffic |
| **Control Plane** | Central management that configures the data plane |
| **mTLS** | Mutual TLS — both sides verify each other's certificates |
| **Service Identity** | SPIFFE ID — identifies a service (spiffe://cluster/ns/sa/svc) |
| **Traffic Splitting** | Routing % of traffic to different versions (canary) |
| **Circuit Breaker** | Stop sending traffic to failing instances |
| **Envoy** | High-performance L7 proxy — the most common sidecar |
| **Istio** | Most popular service mesh (Envoy + Istiod control plane) |
| **Linkerd** | Lightweight service mesh (Rust proxy + control plane) |

## 3. The Problem Without It

- **Boilerplate code**: Every service must implement retry logic, circuit breakers, timeouts, and distributed tracing. Different languages → different implementations → inconsistent behavior.
- **No consistent security**: Service A → Service B is unencrypted HTTP (no TLS between services). mTLS requires certificate management in every service.
- **No traffic control**: Can't do canary deployments (2% traffic to v2). Can't mirror traffic for testing. Would need a load balancer with these features — but you'd need one per service pair.
- **Observability gaps**: Each service logs differently. Distributed tracing requires manual instrumentation. Error budgets require consistent metrics across all services.

## 4. How It Works — Core Mechanics

### Service Mesh Traffic Flow
\`\`\`
Without Service Mesh:
  Service A ──(HTTP)──→ Service B

With Service Mesh (Istio):
  Service A ──→ Sidecar Proxy A (Envoy)
                    │
                    │ (mTLS encrypted)
                    │
              Sidecar Proxy B (Envoy) ──→ Service B

  Control Plane (Istiod):
    ── Configures proxy A with routing rules for service B
    ── Distributes certificates for mTLS
    ── Collects telemetry from both proxies
\`\`\`

### Envoy Configuration (simplified)
\`\`\`yaml
# Generated by Istiod for sidecar proxy A
static_resources:
  listeners:
  - name: inbound_8080
    address: 0.0.0.0:8080  # Listen for incoming traffic
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        config:
          stat_prefix: service_b
          route_config:
            virtual_hosts:
            - name: service_b
              domains: ["*"]
              routes:
              - match: { prefix: "/" }
                route:
                  cluster: service_b_cluster
                  retry_policy: { num_retries: 3 }
                  timeout: 5s
  clusters:
  - name: service_b_cluster
    type: STRICT_DNS
    connect_timeout: 0.5s
    lb_policy: LEAST_REQUEST
    circuit_breakers:
      thresholds:
      - max_connections: 100
\`\`\`

## 5. Variants & Flavors

| Feature | Istio | Linkerd | Consul Connect | AWS App Mesh |
|---------|-------|---------|---------------|--------------|
| Proxy | Envoy | Linkerd-proxy (Rust) | Envoy | Envoy |
| Control plane | Istiod | Controller | Consul Server | App Mesh control plane |
| mTLS | Yes (auto, cert-manager) | Yes (auto) | Yes (auto) | Yes (ACM) |
| Traffic splitting | Yes (VirtualService) | Yes | Yes | Yes |
| Circuit breaking | Yes | Yes (per-service) | Yes | Yes |
| Observability | Prometheus, Grafana, Jaeger | Built-in metrics | Prometheus | CloudWatch, X-Ray |
| K8s only | No (VMs too) | K8s only | K8s + VMs | K8s + ECS |
| Performance overhead | ~5% CPU | ~2% CPU | ~5% CPU | ~5% CPU |

## 6. Performance Characteristics

| Metric | No Mesh | Istio (mTLS) | Linkerd | Consul Connect |
|--------|---------|-------------|---------|---------------|
| P50 latency overhead | 0 | ~5ms | ~2ms | ~5ms |
| P99 latency overhead | 0 | ~10ms | ~5ms | ~10ms |
| CPU overhead | 0 | 5-10% | 2-5% | 5-10% |
| Memory per proxy | 0 | 50-100MB | 10-20MB | 50-100MB |
| Connection latency (first request) | 0 | ~20ms (cold start) | ~5ms | ~20ms |

## 7. Failure Modes

- **Sidecar startup race**: Sidecar starts after the application → app tries to make outbound calls before the sidecar is ready → connection refused. *Mitigation*: Hold application startup until sidecar is ready (Istio: \`holdApplicationUntilProxyStarts\`).
- **Envoy OOM**: High traffic generates too many connections → Envoy uses too much memory → OOM killed → service unreachable. *Mitigation*: Set connection limits in envoy config, monitor Envoy RSS.
- **Control plane overload**: 10K sidecars all connecting to Istiod simultaneously after restart → Istiod CPU spikes → config distribution delayed. *Mitigation*: Istio 1.12+ uses Delta xDS for incremental updates, reducing load.
- **mTLS certificate expiry**: Certificate auto-rotation fails → mTLS handshake fails → services can't communicate. *Mitigation*: Monitor cert expiry, set up alerts, short-lived certs with auto-renewal via cert-manager.

## 8. Decision Framework

\`\`\`
├─ Do you need:
│   ├─ mTLS between services → Service mesh
│   ├─ Canary deployments / traffic splitting → Service mesh
│   ├─ Observability (traces, metrics) without code changes → Service mesh
│   ├─ Circuit breaking / retry without code → Service mesh
│   └─ None of the above → Skip mesh (add complexity for no benefit)
├─ Kubernetes?
│   ├─ Yes → Istio (full-featured) or Linkerd (lightweight)
│   └─ No → Consul Connect (VMs + K8s)
├─ Performance sensitivity?
│   ├─ Very → Linkerd (Rust proxy, 2-5% overhead)
│   └─ Moderate → Istio (Envoy, 5-10% overhead)
└─ Team maturity?
    ├─ High → Istio (most features, most complexity)
    └─ Low → Linkerd (simpler, opinionated)
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'svc_a', label: 'Service A\n(Python)', type: 'app', x: 80, y: 60 },
    { id: 'proxy_a', label: 'Envoy A\n(sidecar)', type: 'gateway', x: 80, y: 200 },
    { id: 'svc_b', label: 'Service B\n(Go)', type: 'app', x: 300, y: 60 },
    { id: 'proxy_b', label: 'Envoy B\n(sidecar)', type: 'gateway', x: 300, y: 200 },
    { id: 'svc_c', label: 'Service C\n(Java)', type: 'app', x: 500, y: 60 },
    { id: 'proxy_c', label: 'Envoy C\n(sidecar)', type: 'gateway', x: 500, y: 200 },
    { id: 'istiod', label: 'Control Plane\n(Istiod)', type: 'gateway', x: 300, y: 360 },
    { id: 'prom', label: 'Prometheus\n(Telemetry)', type: 'metrics', x: 300, y: 480 },
  ]}
  edges={[
    { from: 'svc_a', to: 'proxy_a', label: 'localhost:8080' },
    { from: 'proxy_a', to: 'proxy_b', label: 'mTLS encrypted' },
    { from: 'proxy_b', to: 'svc_b', label: 'localhost:8080' },
    { from: 'proxy_b', to: 'proxy_c', label: 'mTLS encrypted' },
    { from: 'proxy_c', to: 'svc_c', label: 'localhost:8080' },
    { from: 'istiod', to: 'proxy_a', label: 'xDS config' },
    { from: 'istiod', to: 'proxy_b', label: 'xDS config' },
    { from: 'istiod', to: 'proxy_c', label: 'xDS config' },
    { from: 'proxy_a', to: 'prom', label: 'metrics' },
    { from: 'proxy_b', to: 'prom', label: 'metrics' },
    { from: 'proxy_c', to: 'prom', label: 'metrics' },
  ]}
  height={560}
/>

## 10. Real Production Incident

<Callout type="incident">
**eBay — Istio Sidecar Memory Leak, January 2021**

eBay deployed Istio on a large Kubernetes cluster (5000+ pods). After 48 hours, Envoy sidecars were using 500MB+ RSS each (normal: 50MB). The control plane was overwhelmed by 10K sidecar connections.

**Impact**: 3-hour incident where canary deployments failed (new pods couldn't get Envoy config). Existing services continued working but with degraded performance.

**Root cause**: Envoy's connection pool was not being GC'd properly for services with many upstream clusters. Each unique upstream cluster created a connection pool entry that wasn't released when the service scaled down.

**Fix**: Istio 1.9+ added \`ENVOY_DRAINING\` support and Envoy's memory limits. Set \`global.proxy.resources.limits.memory: 512Mi\`. eBay also reduced the number of monitored clusters per sidecar using \`Sidecar.import\` to limit scope.

**Lesson**: Envoy memory usage grows with the number of upstream clusters. Limit each sidecar's scope to only the services it communicates with. Always set resource limits on sidecars.
</Callout>

## 11. Production Implementation

### Istio Installation
\`\`\`bash
# Install Istio with default profile
istioctl install --set profile=default -y

# Enable sidecar injection on namespace
kubectl label namespace default istio-injection=enabled

# Deploy service — sidecar injected automatically
kubectl apply -f deployment.yaml
# Pod now has 2 containers: app + istio-proxy (Envoy)
\`\`\`

### Traffic Splitting (Canary)
\`\`\`yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
  - payment-service
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: payment-service
        subset: v2
      weight: 100
  - route:
    - destination:
        host: payment-service
        subset: v1
      weight: 95
    - destination:
        host: payment-service
        subset: v2
      weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    circuitBreaker:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
\`\`\`

### mTLS Enforcement
\`\`\`yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT  # All traffic must use mTLS
\`\`\`

## 12. Real Company Deep Dives

- **eBay**: Istio on 5000+ pods. Migrated from self-managed Envoy to Istio for centralized control. Traffic splitting for canary deployments. mTLS for all service-to-service communication.
- **Lyft**: Created Envoy (now CNCF graduated). Uses Envoy as the universal proxy — for service mesh (Lyft's own mesh), API gateway, and edge proxy.
- **HashiCorp**: Consul Connect for service mesh with Consul as the control plane and Envoy as the sidecar. Used by enterprises for multi-cloud service mesh.
- **Google**: Istio (created by Google, IBM, Lyft). Used internally for Google Cloud services. GKE now has managed Istio (Anthos Service Mesh).

## 13. Interview Playbook

**Q: "What problem does a service mesh solve?"**
→ Open with: It takes cross-cutting networking concerns (retry, circuit breaking, mTLS, observability) out of application code and handles them transparently in the sidecar proxy.
→ Cover: Without mesh, every service must implement retry logic, TLS, distributed tracing. With mesh, the sidecar intercepts all traffic and handles these automatically. Control plane distributes policies.
→ Depth signal: The real value isn't just features — it's CONSISTENCY. Every service (regardless of language) gets the same retry behavior, same TLS, same observability. The mesh provides a uniform networking layer.

**Q: "Istio vs Linkerd — which would you choose?"**
→ Open with: Depends on complexity tolerance and performance requirements.
→ Cover: Istio has more features (traffic splitting, fault injection, rich telemetry) but is more complex (Envoy, many CRDs). Linkerd is simpler (fewer CRDs, Rust-based proxy, 2% overhead vs 5-10%) but has fewer features.
→ Depth signal: Linkerd's proxy is written in Rust (not C++) and uses a threaded model vs Envoy's multi-process. This gives lower resource usage and faster cold start. But Envoy's filter chain is more extensible.

## 14. Concept Check Quiz

**Q1:** What is the difference between the data plane and control plane in a service mesh?**Answer:** Data plane = sidecar proxies handling service-to-service traffic. Control plane = management layer that configures the proxies with policies.

**Q2:** What is mTLS and why is it important in a service mesh?**Answer:** Mutual TLS — both client and server verify each other's certificates. Ensures all service-to-service traffic is encrypted and authenticated.

**Q3:** How does the sidecar intercept traffic without code changes?**Answer:** Using iptables rules (Istio) or eBPF — all inbound and outbound traffic is transparently redirected to the sidecar proxy's port.

**Q4:** What is a VirtualService in Istio?**Answer:** A CRD that defines routing rules — how traffic is directed to different service versions, with weight-based splitting, header-based routing, and timeout/retry policies.

## 15. Next Steps

- **Containers & Docker** — The runtime that service mesh orchestrates.
- **Kubernetes** — The orchestration platform for service mesh.
- **Envoy** — Deep dive into the sidecar proxy powering most meshes.`,
    estimatedMin: 15,
    difficulty: "ADVANCED" as const,
    companies: ["eBay", "Lyft", "Google", "HashiCorp"],
    tags: ["service-mesh", "Istio", "Linkerd", "Envoy", "sidecar", "mTLS"],
  },

  {
    id: "lesson-05-11",
    slug: "distributed-infrastructure-11-containers-and-docker",
    title: "Containers & Docker",
    content: `## 0. Mental Model

> Containers are like **lunchboxes**. Each lunchbox (container) has everything needed for one meal: food (application), utensils (dependencies), and a napkin (config). Lunchboxes are isolated from each other — what's in your box doesn't spill into mine. They're portable — your lunchbox works at home, office, or picnic. They're lightweight — you can stack many lunchboxes in one fridge.

## 1. Quick Summary

- **Containers** package an application with all its dependencies (libraries, config, runtime) into a single, portable unit.
- **Docker** is the most popular container platform. Docker images are built from Dockerfiles and stored in registries (Docker Hub, ECR, GCR).
- **Containers vs VMs**: Containers share the host OS kernel (lighter, faster start). VMs have separate OS per VM (heavier, stronger isolation).
- **Key benefits**: Consistency across environments, fast startup (100ms vs 30s for VM), resource efficiency (many containers per host), immutable infrastructure.
- **Docker components**: Docker Engine (runs containers), Dockerfile (build instructions), Images (read-only templates), Volumes (persistent data), Networks (container communication).

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Container** | Lightweight, isolated environment for running an application |
| **Image** | Read-only template with instructions for creating a container |
| **Dockerfile** | Text file with instructions to build an image |
| **Registry** | Storage for images (Docker Hub, ECR, GCR) |
| **Volume** | Persistent storage mounted into a container |
| **Bind Mount** | Host directory mounted into container (for dev) |
| **Container Runtime** | Software that runs containers (Docker Engine, containerd) |
| **CNI (Container Network Interface)** | Standard for container networking |
| **OCI (Open Container Initiative)** | Standard for container images and runtimes |
| **Namespace** | Linux kernel feature for isolating containers (PID, net, mount, etc.) |
| **Cgroups** | Linux kernel feature for limiting container resources (CPU, memory) |

## 3. The Problem Without It

- **"It works on my machine"**: Developer's laptop has Python 3.9, but production server has Python 3.6 → app crashes. Without containers, environment differences cause bugs.
- **Dependency hell**: App A needs Python 3.7 + libSSL 1.0, App B needs Python 3.9 + libSSL 1.1 → installing both on the same host causes conflicts.
- **Slow provisioning**: Setting up a new server takes 30+ minutes (install OS, dependencies, app config). With containers: pull image + run = 5 seconds.
- **No resource isolation**: One app's memory leak crashes all other apps on the same host. Cgroups prevent this — each container gets a memory limit.

## 4. How It Works — Core Mechanics

### Container vs VM
\`\`\`
Virtual Machine:
┌─────────────────────────────┐
│ VM: App A + Libs + Guest OS │ ← Each VM has full OS (GBs)
│ Hypervisor: Virtualization   │
│ Host OS                      │
│ Hardware                     │
└─────────────────────────────┘
Start time: 30-60s
Size: 1-10GB per VM
Isolation: Strong (separate kernel)

Container:
┌─────────────────────────────┐
│ Container: App A + Libs      │ ← Shares host kernel (MBs)
│ Container Runtime            │
│ Host OS                      │
│ Hardware                     │
└─────────────────────────────┘
Start time: 100-500ms
Size: 10-500MB per container
Isolation: Moderate (shared kernel)
\`\`\`

### Docker Image Layers
\`\`\`
FROM node:18-alpine          → Layer 1: Alpine + Node (120MB)
WORKDIR /app                 → Layer 2: metadata (0B)
COPY package*.json ./        → Layer 3: package.json (1KB)
RUN npm install              → Layer 4: node_modules (50MB)
COPY . .                     → Layer 5: app code (100KB)
EXPOSE 3000                  → Layer 6: metadata (0B)
CMD ["node", "app.js"]       → Layer 7: metadata (0B)

Each layer is cached. Rebuilding after code change:
  Steps 1-4: cached (FROM, WORKDIR, COPY package.json, npm install)
  Step 5: new (COPY . .)
  Steps 6-7: cached (EXPOSE, CMD)
Time: 100ms (vs 2+ minutes for full rebuild)
\`\`\`

### Dockerfile Best Practices
\`\`\`dockerfile
# Multi-stage build: separate build and runtime stages
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production  # Deterministic install

FROM node:18-alpine           # Smaller runtime image
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER node                    # Don't run as root
EXPOSE 3000
CMD ["node", "app.js"]

# Result: 150MB vs 1.2GB (single stage with dev dependencies)
\`\`\`

## 5. Variants & Flavors

| Runtime | Standard | Popularity | OCI Compliant | Used By |
|---------|----------|-----------|---------------|---------|
| **Docker Engine** | containerd | Highest | Yes | Docker Desktop, Docker CE/EE |
| **containerd** | CNCF | High | Yes | K8s default (via CRI) |
| **CRI-O** | Kubernetes CRI | Medium | Yes | K8s (Red Hat, OpenShift) |
| **Podman** | OCI | Growing | Yes | Red Hat (daemonless alternative) |
| **runc** | OCI | Underlying | Yes | Default OCI runtime (used by Docker) |
| **gVisor** | Google | Experimental | Yes | K8s sandbox (security isolation) |

## 6. Performance Characteristics

| Metric | Bare Metal | VM | Container |
|--------|-----------|-----|-----------|
| Boot time | N/A | 30-60s | 100-500ms |
| Image size | N/A | 1-10GB | 10-500MB |
| Memory overhead | 0 | 1-5GB (guest OS) | 10-50MB |
| CPU overhead | 0 | 5-10% | 1-3% |
| Max density (16GB host) | 1 app | 10 apps | 100+ apps |
| Disk throughput | Native | 80-90% | 95-100% |
| Isolation | N/A | Strong (separate kernel) | Moderate (shared kernel) |

## 7. Failure Modes

- **Image explosion**: Dockerfile doesn't use multi-stage build → image is 2GB (includes compiler, dev tools). *Mitigation*: Multi-stage builds, slim images (alpine, distroless), \`.dockerignore\`.
- **Container as pet**: Manually fixing a running container (exec into it, install packages) → container becomes a "snowflake" that can't be recreated. *Mitigation*: Immutable infrastructure — never modify running containers, rebuild image instead.
- **Resource starvation**: One container consuming all CPU → other containers starve. *Mitigation*: Set \`--cpus\`, \`--memory\` limits on every container.
- **Secret leakage**: Hardcoded passwords in Dockerfile → committed to registry → visible to anyone with image access. *Mitigation*: Use build args, secrets mount, or env vars at runtime.
- **Permission escalation**: Container running as root → if compromised, attacker has full host access. *Mitigation*: Run as non-root user (\`USER appuser\` in Dockerfile).

## 8. Decision Framework

\`\`\`
├─ Need strong isolation (multi-tenant, untrusted code)?
│   └─ VM (or container + gVisor/Kata Containers)
├─ Need fast startup, high density, portability?
│   └─ Containers
├─ Running on developer laptop?
│   └─ Docker Desktop (easiest)
├─ Running in production?
│   └─ Containers via Kubernetes (orchestration)
├─ Security-sensitive?
│   └─ Distroless images + non-root user + no shell
└─ Microservices?
    └─ One container per service
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'host', label: 'Host OS (Linux)', type: 'storage', x: 300, y: 380 },
    { id: 'docker', label: 'Docker Engine\n(containerd)', type: 'app', x: 300, y: 280 },
    { id: 'c1', label: 'Container A\n(Node.js App)', type: 'web', x: 100, y: 100 },
    { id: 'c2', label: 'Container B\n(Python API)', type: 'web', x: 300, y: 100 },
    { id: 'c3', label: 'Container C\n(Redis)', type: 'cache', x: 500, y: 100 },
    { id: 'reg', label: 'Image Registry\n(Docker Hub / ECR)', type: 'storage', x: 500, y: 280 },
  ]}
  edges={[
    { from: 'c1', to: 'docker', label: 'run' },
    { from: 'c2', to: 'docker', label: 'run' },
    { from: 'c3', to: 'docker', label: 'run' },
    { from: 'docker', to: 'host', label: 'namespace isolation' },
    { from: 'docker', to: 'reg', label: 'pull/push images' },
  ]}
  height={460}
/>

## 10. Real Production Incident

<Callout type="incident">
**Tesla — Kubernetes Crypto Mining via Unsecured Dashboard, 2018**

Tesla's Kubernetes cluster was compromised when a container dashboard (Kubernetes Dashboard) was exposed to the internet without authentication. Attackers deployed a crypto mining container that consumed all available GPU resources.

**Impact**: Thousands of dollars in cloud GPU costs. 24-hour degradation of ML training jobs.

**Root cause**: No authentication on Kubernetes Dashboard. No network policies restricting which containers could communicate externally. No resource limits on containers → miner used all GPUs.

**Fix**: Disabled public access to Kubernetes Dashboard. Implemented network policies (default deny ingress). Set resource limits on all namespaces. Added Pod Security Policies to restrict privileged containers.

**Lesson**: Containers provide isolation but rely on correct configuration. Always secure the container runtime, restrict network access, and set resource limits.
</Callout>

## 11. Production Implementation

### Dockerfile
\`\`\`dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
\`\`\`

### Docker Compose (local dev)
\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app  # Hot reload
      - /app/node_modules
    depends_on:
      - redis
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
\`\`\`

### Production Docker Run
\`\`\`bash
# Resource limits
docker run -d \
  --name app \
  --restart unless-stopped \
  --cpus="0.5" \
  --memory="256m" \
  --memory-reservation="128m" \
  --read-only \
  --security-opt=no-new-privileges:true \
  --cap-drop=ALL \
  -p 3000:3000 \
  myapp:latest
\`\`\`

## 12. Real Company Deep Dives

- **Docker Inc.**: Created Docker (2013), which popularized containers. Docker Hub hosts 10M+ images. Docker Compose for local development.
- **Google**: Borg (predecessor to Kubernetes) used Linux cgroups and namespaces for 15+ years. Google's containers start 10B+ per week. gVisor adds a security sandbox layer for multi-tenant containers.
- **Netflix**: Containerizes all microservices (thousands). Uses Docker + Titus (Netflix's container orchestration). Developer workflow: build Docker image → test → deploy via Spinnaker.
- **Spotify**: 6000+ microservices, all in Docker containers. Uses a custom CI/CD pipeline that builds Docker images on every pull request, runs integration tests, then deploys.

## 13. Interview Playbook

**Q: "What's the difference between a container and a VM?"**
→ Open with: Containers share the host OS kernel (light, fast). VMs have their own kernel per instance (heavy, strong isolation).
→ Cover: Container = process isolation via namespaces + resource limits via cgroups. VM = full hardware virtualization via hypervisor. Container start: 100ms. VM start: 30s.
→ Depth signal: Security: VMs provide a stronger security boundary (separate kernel). Containers share the kernel — a kernel exploit breaks all containers. For multi-tenant workloads, use VMs or gVisor/Kata Containers.

**Q: "How do you make a Docker image production-ready?"**
→ Open with: Multi-stage builds, minimal base image, non-root user, HEALTHCHECK, resource limits.
→ Cover: Use \`node:20-alpine\` (not full \`node:20\`). Multi-stage build separates build deps from runtime. Run as \`USER appuser\`. Set \`--memory\` and \`--cpus\` limits. Add HEALTHCHECK for orchestration. Read-only filesystem (\`--read-only\`).
→ Depth signal: Distroless images (Google's \`distroless/nodejs\`) have no shell, no package manager — just the app. This reduces attack surface but makes debugging harder (can't \`docker exec\` into it).

## 14. Concept Check Quiz

**Q1:** What is the main difference between a Docker container and a Docker image?**Answer:** Image = read-only template (like a class). Container = running instance of an image (like an object).

**Q2:** How do Docker image layers work?**Answer:** Each Dockerfile instruction creates a layer. Layers are cached. Only changed layers are rebuilt. This speeds up builds and reduces image transfer.

**Q3:** What Linux kernel features enable container isolation?**Answer:** Namespaces (isolate processes, network, mount, PID, etc.) and cgroups (limit CPU, memory, disk I/O).

**Q4:** Why should you use a multi-stage Docker build?**Answer:** Separates build dependencies (compilers, dev tools) from the runtime image. Final image is smaller (no build tools) and more secure.

**Q5:** What happens when a container runs out of memory?**Answer:** If a memory limit is set, the kernel OOM-kills the container (or a process inside it). Without a limit, it could consume all host memory.

## 15. Next Steps

- **Kubernetes** — Orchestrating containers at scale.
- **Docker Compose** — Multi-container local development.
- **Service Mesh** — Managing container-to-container communication.`,
    estimatedMin: 13,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Docker", "Google", "Netflix", "Spotify", "Tesla"],
    tags: ["containers", "Docker", "images", "Dockerfile", "isolation"],
  },

  {
    id: "lesson-05-12",
    slug: "distributed-infrastructure-12-kubernetes",
    title: "Kubernetes",
    content: `## 0. Mental Model

> Kubernetes is like a **hotel manager** for containers. You tell the manager: "I need 3 rooms (pods) with these amenities (containers). They need to be accessible via room service (services). If a guest checks out (pod dies), clean and re-rent the room. If more guests arrive (traffic spike), prepare more rooms (auto-scale)." The manager (Kubernetes) handles the logistics — you just describe what you want.

## 1. Quick Summary

- **Kubernetes (K8s)** is a container orchestration platform — automates deployment, scaling, and management of containerized applications.
- **Pod**: Smallest deployable unit. One or more containers sharing network and storage.
- **Deployment**: Desired state for pods (replicas, update strategy, rollback). K8s reconciles actual vs desired state.
- **Service**: Stable network endpoint to access a set of pods. Types: ClusterIP (internal), NodePort (host port), LoadBalancer (cloud LB), Ingress (HTTP routing).
- **Auto-scaling**: Horizontal Pod Autoscaler (HPA) scales pods based on CPU/memory/custom metrics. Cluster Autoscaler adds/removes nodes.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Pod** | One or more containers scheduled together on a node |
| **Node** | Worker machine (VM or physical) running pods |
| **Cluster** | Set of nodes managed by the control plane |
| **Control Plane** | API Server, Scheduler, Controller Manager, etcd |
| **etcd** | Distributed key-value store for cluster state |
| **ReplicaSet** | Ensures N pod replicas are running |
| **Deployment** | Manages ReplicaSets with rolling updates and rollbacks |
| **Service** | Stable IP/DNS for a set of pods |
| **Ingress** | HTTP/HTTPS routing rules (host-based, path-based) |
| **ConfigMap** | Non-sensitive configuration injected into pods |
| **Secret** | Sensitive data (passwords, tokens) stored safely |
| **PersistentVolume** | Storage provisioned independently of pods |
| **Namespace** | Virtual cluster for resource isolation |
| **kubectl** | CLI tool to interact with the K8s API |

## 3. The Problem Without It

- **Manual container management**: Without K8s, deploying containers means SSH-ing into servers, running \`docker run\`, monitoring manually, restarting on crash. At 100+ containers, this is impossible.
- **No self-healing**: Container crashes → nobody restarts it. Server fails → containers on that server are lost.
- **No scaled**: Traffic increases 5x → someone must manually add more containers and configure the load balancer.
- **No rolling updates**: Deploying a new version means: stop all containers, start new ones → downtime. K8s does rolling updates with zero downtime.
- **No resource optimization**: Containers randomly assigned to servers → one server at 90% memory, another at 10%. K8s scheduler optimizes placement.

## 4. How It Works — Core Mechanics

### Pod Lifecycle
\`\`\`
User applies Deployment descriptor (YAML)
    ↓
API Server validates and stores in etcd
    ↓
Scheduler finds a node with available resources
    ↓
kubelet on node pulls image and runs container
    ↓
Container status: Pending → Running → Ready (probe)
    ↓
If container crashes: kubelet restarts (backoff: 10s, 20s, 40s...)
If node fails: pods are rescheduled on another node (after timeout)
If deployment updated: rolling update replaces pods gradually
\`\`\`

### Service Types
\`\`\`
ClusterIP (default):
  my-service → 10.96.0.1:80 → random healthy pod (cluster-internal)
  
NodePort:
  my-service → NodeIP:30080 → ClusterIP → pod (external traffic)
  
LoadBalancer:
  my-service → cloud LB (ELB) → NodePort → ClusterIP → pod
  
Ingress:
  my.domain.com/api → Ingress Controller → Service → pod
  HTTP routing (host + path based)
\`\`\`

### Horizontal Pod Autoscaler
\`\`\`
HPA monitors pod CPU (or custom metric)
If avg CPU > 80% for 5 minutes → add pods (up to max)
If avg CPU < 50% for 5 minutes → remove pods (minimum 3)

K8s API → Metrics Server → HPA → Scale Deployment replicas
┌─────┐    ┌─────────┐    ┌───┐    ┌─────────────┐
│Pod 1│───→│Metrics  │───→│HPA│───→│Deployment   │
│Pod 2│───→│Server   │    │   │    │replicas: 3→5│
│Pod N│───→│(CPU/mem)│    └───┘    └─────────────┘
└─────┘    └─────────┘
\`\`\`

## 5. Variants & Flavors

| K8s Distribution | Managed | Key Feature | Best For |
|----------------|---------|-------------|----------|
| **Amazon EKS** | Yes | AWS integration (IRSA, ALB Ingress, EBS) | AWS users |
| **Google GKE** | Yes | Auto-pilot, integrated monitoring | GCP users |
| **Azure AKS** | Yes | Azure AD integration, Windows containers | Azure users |
| **OpenShift** (Red Hat) | Self/managed | Built-in CI/CD, security policies | Enterprises |
| **Rancher** | Self-managed | Multi-cluster management | Multi-cloud |
| **K3s** | Lightweight | Single binary, <100MB | Edge/IoT, dev |
| **Minikube** | Local dev | Single-node cluster | Developer laptops |

## 6. Performance Characteristics

| Metric | Small Cluster (5 nodes) | Medium (20 nodes) | Large (100 nodes) |
|--------|----------------------|-------------------|-------------------|
| Pods per cluster (recommended) | 500 | 5K | 15K+ (requires tuning) |
| API Server latency (p50) | 10ms | 50ms | 200ms |
| Pod startup time | 5-10s | 10-20s | 30-60s |
| Rolling update time (100 pods) | 2 min | 5 min | 15 min |
| etcd write latency | 5ms | 10ms | 20ms |
| Control plane overhead | 2% | 5% | 10% |

## 7. Failure Modes

- **etcd quorum loss**: 3-node etcd cluster loses 2 nodes → no writes possible → cluster inoperative. *Mitigation*: Deploy with odd number (3, 5), backup etcd regularly.
- **Node pressure**: Disk pressure, memory pressure, PID pressure on a node → pods evicted. *Mitigation*: Set pod resource requests/limits, add monitoring.
- **Ingress controller bottleneck**: All external traffic goes through a single Ingress controller → becomes bottleneck. *Mitigation*: Deploy multiple replicas of Ingress controller, use L4 LB in front of it.
- **OOMKilled pod**: Pod exceeds memory limit → kernel kills it. *Mitigation*: Set resource limits, monitor pod OOMKill events, use Vertical Pod Autoscaler.
- **ConfigMap/Secret update propagation delay**: Updating a ConfigMap → existing pods don't see the change until restarted (no live reload by default). *Mitigation*: Use tools like Reloader for automatic pod restart on config change.

## 8. Decision Framework

\`\`\`
├─ Running <5 services on 1-3 servers?
│   └─ Docker Compose (simpler, no need for K8s)
├─ Running 5-20 services in production?
│   └─ Managed K8s (EKS, GKE, AKS)
├─ Running 20+ services?
│   └─ K8s with service mesh (Istio/Linkerd)
├─ Edge/IoT/Resource-constrained?
│   └─ K3s or MicroK8s
├─ Need security compliance (HIPAA, PCI)?
│   └─ OpenShift or managed K8s with security policies
└─ Developer laptop?
    └─ Minikube, kind (Docker-in-Docker), or K3s
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'dev', label: 'Developer\n(kubectl)', type: 'client', x: 80, y: 60 },
    { id: 'api', label: 'API Server', type: 'gateway', x: 260, y: 60 },
    { id: 'etcd', label: 'etcd\n(Cluster State)', type: 'storage', x: 260, y: 200 },
    { id: 'sched', label: 'Scheduler', type: 'app', x: 260, y: 340 },
    { id: 'ctrl', label: 'Controller\nManager', type: 'app', x: 260, y: 460 },
    { id: 'node1', label: 'Node 1\nkubelet', type: 'web', x: 460, y: 60 },
    { id: 'node2', label: 'Node 2\nkubelet', type: 'web', x: 460, y: 280 },
    { id: 'pod1', label: 'Pod A\n(app)', type: 'web', x: 610, y: 60 },
    { id: 'pod2', label: 'Pod B\n(api)', type: 'web', x: 610, y: 160 },
    { id: 'pod3', label: 'Pod C\n(worker)', type: 'worker', x: 610, y: 280 },
    { id: 'svc', label: 'Service\n(LB)', type: 'lb', x: 80, y: 280 },
  ]}
  edges={[
    { from: 'dev', to: 'api', label: 'kubectl apply' },
    { from: 'api', to: 'etcd', label: 'store state' },
    { from: 'api', to: 'sched', label: 'watch unscheduled' },
    { from: 'api', to: 'ctrl', label: 'watch desired state' },
    { from: 'sched', to: 'node1', label: 'bind pod' },
    { from: 'ctrl', to: 'node1', label: 'ensure running' },
    { from: 'node1', to: 'pod1', label: 'kubelet runs' },
    { from: 'node1', to: 'pod2', label: 'kubelet runs' },
    { from: 'node2', to: 'pod3', label: 'kubelet runs' },
    { from: 'svc', to: 'pod1', label: 'routes traffic' },
    { from: 'svc', to: 'pod2', label: 'routes traffic' },
  ]}
  height={540}
/>

## 10. Real Production Incident

<Callout type="incident">
**Slack — Kubernetes etcd Quorum Loss, April 2021**

Slack's internal Kubernetes cluster for CI/CD experienced an etcd quorum loss. A routine etcd upgrade was attempted but two of three etcd members failed simultaneously due to a version incompatibility bug.

**Impact**: 45-minute outage of CI/CD pipelines. All deploys blocked. Developers couldn't push changes to production.

**Root cause**: etcd v3.4 to v3.5 upgrade script attempted to replace two members too quickly. The new members couldn't join the remaining node due to a TLS certification issue. Quorum lost (2 of 3 nodes down).

**Fix**: Restored etcd from backup (took 30 minutes). Added pre-upgrade health checks to the upgrade script. Implemented etcd operator that handles upgrades safely (one node at a time).

**Lesson**: etcd is the brain of Kubernetes. Always backup etcd before upgrades. Upgrade one node at a time. Use an etcd operator for safe upgrades.
</Callout>

## 11. Production Implementation

### Deployment
\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1       # Can have 1 extra pod during update
      maxUnavailable: 0  # Must have all pods available
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: app
        image: myrepo/payment-service:v2.1
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 500m       # Guaranteed 0.5 CPU
            memory: 256Mi
          limits:
            cpu: 1000m      # Burstable up to 1 CPU
            memory: 512Mi
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 30
\`\`\`

### Service + HPA
\`\`\`yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: payment-service
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
\`\`\`

## 12. Real Company Deep Dives

- **Google**: Created Borg (K8s predecessor), then Kubernetes (2014). Runs all Google services on containers (Borg internally, K8s for GCP customers). 10B+ containers started per week.
- **Spotify**: 6000+ microservices on K8s (via a custom platform called "Zion"). Migrated from VMs to K8s for faster deploys and better resource utilization.
- **GitHub**: Migrated to K8s for production services. Runs on Azure AKS. Handles 50M+ developer workflows. Uses K8s for Actions runners, webhook processing, and CI/CD.
- **Uber**: Migrated from self-managed container infra to K8s. Runs 4000+ microservices. Uses Peloton (Uber's K8s-based platform) for batch and real-time workloads.

## 13. Interview Playbook

**Q: "Design a Kubernetes deployment for a web application."**
→ Open with: Deployment (replicas, rolling update) + Service (ClusterIP) + Ingress (HTTP routing) + HPA (auto-scaling) + ConfigMap (config).
→ Cover: Deployment with 3 replicas, rolling update (maxSurge=1, maxUnavailable=0). Service of type ClusterIP. Ingress for host-based routing. HPA based on CPU at 70%. ConfigMap for env-specific config. Readiness + liveness probes.
→ Depth signal: PodDisruptionBudget for voluntary disruptions (node maintenance). Resource requests vs limits (QoS class). Readiness probe for graceful shutdown (preStop hook drains connections).

## 14. Concept Check Quiz

**Q1:** What is a Kubernetes Pod?**Answer:** Smallest deployable unit. One or more containers sharing network namespace, storage volumes, and lifecycle.

**Q2:** What does the Kubernetes scheduler do?**Answer:** Assigns unassigned pods to nodes based on resource requirements, constraints, and policies.

**Q3:** What is the difference between a readiness probe and a liveness probe?**Answer:** Readiness probe determines if the pod can receive traffic (fails → removed from Service). Liveness probe determines if the pod is healthy (fails → restarted).

**Q4:** How does a Horizontal Pod Autoscaler work?**Answer:** Monitors a metrics target (CPU/memory/custom). If metric exceeds target for a period, it increases the \`replicas\` field on the Deployment/ReplicaSet.

**Q5:** What happens when you update a Deployment's container image?**Answer:** A rolling update begins: new ReplicaSet created with new image, pods are gradually replaced (respecting maxSurge and maxUnavailable).

## 15. Next Steps

- **Service Mesh (Istio/Linkerd)** — Advanced service-to-service networking on K8s.
- **Containers & Docker** — The foundation of K8s.
- **Helm** — Package manager for K8s applications.`,
    estimatedMin: 16,
    difficulty: "ADVANCED" as const,
    companies: ["Google", "Spotify", "GitHub", "Uber", "Slack"],
    tags: ["Kubernetes", "pods", "deployments", "HPA", "orchestration", "containers"],
  },

  {
    id: "lesson-05-13",
    slug: "distributed-infrastructure-13-distributed-file-systems",
    title: "Distributed File Systems",
    content: `## 0. Mental Model

> A distributed file system is like a **global library network**. Books (files) are stored across many library branches (servers). When you want a book, the catalog (metadata service) tells you which branch has it. If the book is popular, copies exist at multiple branches (replication). If a branch burns down, copies remain at other branches (fault tolerance). The library grows by adding more branches (scale-out).

## 1. Quick Summary

- **Distributed file system** (DFS) stores data across multiple servers, presenting a unified file system interface to clients.
- **Key goals**: Scalability (TB → PB), fault tolerance (disk/server failures), high throughput (parallel reads/writes), POSIX-like interface.
- **HDFS** (Hadoop Distributed File System): NameNode (metadata) + DataNodes (data). Large blocks (128MB). Designed for batch processing.
- **Ceph**: Fully distributed (no single point of failure). CRUSH algorithm for data placement. Object, block, and file storage in one system.
- **Lustre**: High-performance parallel file system for HPC (supercomputers). Sub-ms latency, 1TB/s+ throughput.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **NameNode** | HDFS metadata server (file paths, blocks, locations) |
| **DataNode** | HDFS server storing file blocks |
| **Block** | Minimum unit of storage (HDFS: 128MB, Ceph: 4MB) |
| **Replication** | Storing copies of data across nodes (HDFS: 3x) |
| **Erasure Coding** | Storage-efficient redundancy (1.3x overhead vs 3x replication) |
| **CRUSH** | Ceph's algorithm for data placement without a central lookup |
| **Rack Awareness** | Placing replicas across racks for fault tolerance |
| **Quorum** | Minimum nodes that must agree for a write to succeed |
| **POSIX** | Portable Operating System Interface — standard file system API |

## 3. The Problem Without It

- **Single-server limit**: One NFS server stores 10TB. To reach 1PB, you need 100 NFS servers, but each is independent (no unified namespace). Users must know which server has which files.
- **No fault tolerance**: One disk fails on the NFS server → all files on that disk are lost. RAID helps but doesn't scale across servers.
- **Not parallel**: Reading a 1TB file from one server = sequential read at 200MB/s = 5000 seconds. Distributed: 10 servers each read 100GB in parallel = 500 seconds.
- **Cost at scale**: RAID 10 = 2x storage overhead. Erasure coding (1.3x) is cheaper at PB scale.

## 4. How It Works — Core Mechanics

### HDFS Architecture
\`\`\`
NameNode (metadata: file → block → DataNode)
  │
  ├── DataNode 1: blocks [A, C, E]
  ├── DataNode 2: blocks [B, D, F]
  ├── DataNode 3: blocks [A, B, C] (replicas)
  └── DataNode 4: blocks [D, E, F] (replicas)

Read file /user/data/large.csv:
  1. Client asks NameNode for block locations
  2. NameNode returns: block1 → [DN1, DN3], block2 → [DN2, DN4]
  3. Client reads block1 from nearest DN (rack-aware)
  4. Client reads block2 from nearest DN
  5. Client assembles blocks into file
\`\`\`

### Ceph Architecture
\`\`\`
RADOS (Reliable Autonomic Distributed Object Store):
  OSDs (Object Storage Daemons) store data as objects
  MONs (Monitors) maintain cluster state
  MGRs (Managers) provide metrics and orchestration

CRUSH algorithm:
  hash(file_path) + hash(placement_group) → determines OSDs
  No central index — every client computes locations independently
  Adding/removing OSDs only affects CRUSH map, not data index
\`\`\`

## 5. Variants & Flavors

| FS | Model | Access | Replication | Scale | Best For |
|----|-------|--------|-------------|-------|----------|
| **HDFS** | Master-slave (NameNode + Datanodes) | Java API, CLI | 3x default | 100 PB | Hadoop/Spark batch |
| **Ceph** | Fully distributed (CRUSH) | POSIX, S3, block | 3x or erasure | Exabyte | Cloud, OpenStack |
| **Lustre** | MDS + OSS | POSIX | 2x or RAID | 500 PB | HPC, ML training |
| **GlusterFS** | Distributed (no metadata) | POSIX, NFS | 2x-3x | 100 PB | Media streaming |
| **Amazon EFS** | Managed NFS | NFSv4 | Built-in | Unlimited | AWS Linux workloads |
| **Google Filestore** | Managed NFS | NFSv3 | Built-in | 100 TB | GCP workloads |

## 6. Performance Characteristics

| Metric | HDFS | Ceph | Lustre | EFS |
|--------|------|------|--------|-----|
| Read throughput (sequential) | 2 GB/s (10 nodes) | 5 GB/s (10 nodes) | 100 GB/s | 10 GB/s |
| Write throughput | 1 GB/s | 3 GB/s | 50 GB/s | 5 GB/s |
| Metadata operations | 5K ops/s (NameNode limit) | 50K ops/s | 100K ops/s | 1K ops/s |
| Latency | 10-50ms | 5-20ms | <1ms | 5-20ms |
| Block size | 128MB | 4MB | 1MB | N/A |
| Fault tolerance | Rack-aware 3x | CRUSH + 3x | RAID + 2x | Multi-AZ |

## 7. Failure Modes

- **NameNode SPOF**: HDFS NameNode is a single point of failure. If it crashes, the entire filesystem is unavailable. *Mitigation*: HDFS HA (Active/Standby NameNodes with shared edit log).
- **Slow node (straggler)**: One slow DataNode holds up the entire MapReduce job reading from it. *Mitigation*: Speculative execution (start redundant tasks on other nodes).
- **Rebalancing storm**: Adding a new node triggers massive data movement (10TB of blocks reassigned). *Mitigation*: Throttle rebalancing, use Rack awareness, CRUSH minimizes remapping.
- **Small files problem**: HDFS stores millions of small files (each uses a NameNode entry). 100M files → NameNode runs out of memory. *Mitigation*: Combine small files into sequence files, use HAR (Hadoop Archive).

## 8. Decision Framework

\`\`\`
├─ Need POSIX (standard file API)?
│   ├─ Yes → CephFS or Lustre
│   └─ No → HDFS (custom API) or S3 object storage
├─ Workload type?
│   ├─ Batch/analytics (Hadoop/Spark) → HDFS
│   ├─ HPC/ML training (high throughput) → Lustre
│   ├─ Cloud-native (S3 API) → Ceph (RADOS Gateway)
│   └─ General-purpose NFS → EFS or CephFS
├─ Self-managed or cloud?
│   ├─ Self → Ceph (most flexible)
│   └─ Cloud → EFS, EBS, S3
├─ Scale?
│   ├─ <10TB → Single NFS server
│   ├─ 10TB-1PB → Distributed (HDFS or Ceph)
│   └─ >1PB → Ceph or Lustre
└─ Fault tolerance requirement?
    ├─ Standard → 3x replication
    └─ Cost-effective → Erasure coding (1.3x overhead)
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Client', type: 'client', x: 80, y: 160 },
    { id: 'namenode', label: 'HDFS: NameNode\n(Metadata)', type: 'gateway', x: 280, y: 60 },
    { id: 'secondary', label: 'Secondary NN\n(Checkpoint)', type: 'storage', x: 280, y: 200 },
    { id: 'dn1', label: 'DataNode 1\n(blocks A,B)', type: 'storage', x: 500, y: 60 },
    { id: 'dn2', label: 'DataNode 2\n(blocks A,C)', type: 'storage', x: 500, y: 200 },
    { id: 'dn3', label: 'DataNode 3\n(blocks B,C)', type: 'storage', x: 500, y: 340 },
    { id: 'rack1', label: 'Rack 1', type: 'metrics', x: 440, y: 16 },
    { id: 'rack2', label: 'Rack 2', type: 'metrics', x: 440, y: 156 },
    { id: 'rack3', label: 'Rack 3', type: 'metrics', x: 440, y: 296 },
  ]}
  edges={[
    { from: 'client', to: 'namenode', label: 'get block locations' },
    { from: 'namenode', to: 'client', label: 'block → DN map' },
    { from: 'client', to: 'dn1', label: 'read block A' },
    { from: 'client', to: 'dn2', label: 'read block B' },
    { from: 'client', to: 'dn3', label: 'read block C' },
    { from: 'namenode', to: 'secondary', label: 'checkpoint merge' },
    { from: 'dn1', to: 'dn2', label: 'replication', dashed: true },
    { from: 'dn2', to: 'dn3', label: 'replication', dashed: true },
  ]}
  height={420}
/>

## 10. Real Production Incident

<Callout type="incident">
**Ceph Cluster Failure — Disk Failure Cascade, 2019**

A 500-node Ceph cluster experienced a cascading failure when 3 disks failed simultaneously across 2 racks. The CRUSH algorithm's replication required 3 copies on different racks. With only 2 racks available for placement (a misconfiguration), all 3 copies of some data went to the same 2 racks.

**Impact**: 12-hour data recovery. 5TB of data was at risk of permanent loss. Cluster was in DEGRADED state for 7 days while rebalancing.

**Root cause**: Misconfigured CRUSH map — only 2 failure domains (racks) configured for 3x replication. When 2 servers in the same rack failed simultaneously, data that had both remaining copies on that rack became unavailable.

**Fix**: Reconfigured CRUSH topology to have at least 4 failure domains (racks). Changed replication from 3x to erasure coding (8+3) for cost savings. Added automatic scrub scheduling to detect silent data corruption.

**Lesson**: Distributed file systems require correct failure domain configuration. Always have more failure domains than the replication factor. Test failure scenarios before production.
</Callout>

## 11. Production Implementation

### HDFS Commands
\`\`\`bash
# List files
hdfs dfs -ls /user/data

# Put file (automatically split into 128MB blocks)
hdfs dfs -put large_file.csv /user/data/

# Get file
hdfs dfs -get /user/data/large_file.csv

# Check block locations
hdfs fsck /user/data/large_file.csv -files -blocks -locations

# Set replication factor
hdfs dfs -setrep -w 3 /user/data/important_file
\`\`\`

### Ceph CRUSH Map
\`\`\`bash
# Create CRUSH bucket topology
ceph osd crush add-bucket rack1 rack
ceph osd crush add-bucket rack2 rack
ceph osd crush add-bucket rack3 rack
ceph osd crush add-bucket rack4 rack
ceph osd crush add-bucket datacenter root

# Add OSDs to racks
ceph osd crush add osd.0 1.0 host=server1 rack=rack1
ceph osd crush add osd.1 1.0 host=server2 rack=rack1

# Set failure domain to rack
ceph osd pool set data size 3
ceph osd pool set data crush-failure-domain rack
\`\`\`

### Spark on HDFS
\`\`\`scala
// Spark reads from HDFS in parallel
val df = spark.read.parquet("hdfs://namenode:8020/user/data/events/")
// Spark will:
// 1. Query NameNode for file partitions/blocks
// 2. Schedule tasks on nodes that have the data (data locality)
// 3. Run N tasks in parallel (N = number of blocks)
\`\`\`

## 12. Real Company Deep Dives

- **Facebook/Meta**: One of the largest HDFS deployments — 100+ PB, 100K+ disks. 3x replication. Uses HDFS for Hadoop/Spark analytics. Switched to erasure coding for cold data (saved 50% storage).
- **CERN**: Ceph for physics data storage. 200+ PB. Stores LHC experiment data. CephFS for shared file access across 10K+ computing nodes.
- **Netflix**: Uses HDFS for batch analytics (Hive, Spark). Migrated from HDFS to S3 for more scalable storage. Now uses S3 as the primary data lake with Spark reading from S3 directly.
- **Uber**: Uses HDFS for big data analytics. 100+ PB. HDFS data replicated in 3 data centers. Uses Apache Hudi for incremental data processing on top of HDFS.

## 13. Interview Playbook

**Q: "Design a distributed file system like HDFS."**
→ Open with: Master-slave architecture. Metadata server (NameNode) stores file → block → DataNode mapping. DataNodes store blocks and replicate them.
→ Cover: Files split into blocks (128MB). Each block replicated 3x across different racks. Client reads from nearest replica (rack-aware). NameNode is SPOF → HA with Active/Standby. DataNodes send heartbeats + block reports to NameNode.
→ Depth signal: Rack awareness reduces cross-rack bandwidth. NameNode keeps all metadata in RAM (limits files to ~100M). HDFS is "write-once, read-many" (append-only) — no random writes. For updates, rewrite the file.

**Q: "3x replication vs erasure coding — which is better?"**
→ Open with: 3x replication uses 3x storage overhead. Erasure coding uses 1.3-1.5x overhead with equivalent fault tolerance.
→ Cover: Replication: simple, fast recovery (any replica can serve), compute-efficient. Erasure coding: storage-efficient, CPU-intensive for recovery (must reconstruct), slower reads (need K of N chunks).
→ Depth signal: Facebook uses BOTH — replication for hot data (fast access), erasure coding for warm/cold data (storage savings). HDFS-EC supports Reed-Solomon (RS-6-3: 6 data + 3 parity = 1.5x overhead). Recovery reads 9 chunks to reconstruct 1 lost chunk.

## 14. Concept Check Quiz

**Q1:** What is the NameNode in HDFS?**Answer:** Metadata server that stores the file system directory tree and maps file blocks to DataNodes.

**Q2:** Why does HDFS use 128MB blocks (vs 4KB in local FS)?**Answer:** Large blocks reduce metadata overhead (fewer blocks per file), enable sequential streaming reads (HDFS is optimized for throughput, not random access).

**Q3:** What is the CRUSH algorithm in Ceph?**Answer:** A pseudo-random data placement algorithm that determines which OSDs store which data without requiring a central index. Clients compute locations locally.

**Q4:** What happens if a DataNode fails in HDFS?**Answer:** NameNode detects missing heartbeats → marks blocks on that node as under-replicated → creates new replicas on other healthy DataNodes.

**Q5:** What is rack awareness?**Answer:** Placing block replicas on different racks to tolerate entire rack failures. HDFS reads from the nearest rack to minimize cross-rack bandwidth.

## 15. Next Steps

- **Distributed System Anti-Patterns** — Lessons learned from operating distributed infrastructure.
- **Kubernetes** — Orchestration layer for containerized distributed systems.
- **Erasure Coding** — Deep dive into storage-efficient redundancy.`,
    estimatedMin: 14,
    difficulty: "ADVANCED" as const,
    companies: ["Meta", "CERN", "Netflix", "Uber", "Ceph"],
    tags: ["distributed-file-system", "HDFS", "Ceph", "NameNode", "CRUSH", "erasure-coding"],
  },


];