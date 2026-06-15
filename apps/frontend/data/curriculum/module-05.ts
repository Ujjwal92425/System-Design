export const module05Lessons = [
  {
    id: 'lesson-05-01',
    slug: 'distributed-infrastructure-01-load-balancing-algorithms',
    title: 'Load Balancing Algorithms',
    content: `## 1. Quick Summary

**Load balancing** distributes incoming network traffic across multiple backend servers to ensure **high availability**, **scalability**, and **reliability**. Different algorithms make different tradeoffs between **distribution uniformity**, **server affinity**, **overhead**, and **awareness of backend state**. Common algorithms include **Round Robin**, **Least Connections**, **IP Hash**, **Weighted Round Robin**, **Least Response Time**, and **Random**. Modern load balancers also support **consistent hashing** for cache affinity and **geographic routing** for latency minimization. The right choice depends on workload characteristics — whether requests are uniform, long-lived, or stateful.

## 2. Definition

**Load Balancer**: A system (hardware or software) that sits between clients and servers, distributing requests according to a scheduling algorithm.

**Algorithm categories**:
- **Static**: Decisions based solely on request attributes (Round Robin, IP Hash, Random).
- **Dynamic**: Decisions based on real-time backend metrics (Least Connections, Least Response Time).
- **Adaptive**: Algorithms that learn and adjust over time (often ML-driven).

## 3. Why It Exists / Problem It Solves

Without load balancing:
- **Single server overload**: One server handles all traffic, creating a single point of failure.
- **Uneven distribution**: Even with multiple servers, DNS round robin or naive routing can send 80% of traffic to one server.
- **No graceful failure handling**: When a server fails, traffic continues hitting it.
- **No capacity scaling**: Adding servers requires manual DNS changes with slow propagation.

Load balancing solves:
- **Horizontal scaling**: Add/remove servers without client impact.
- **Health-aware routing**: Dead servers are automatically removed from rotation.
- **SSL termination**: Offload TLS processing from backend servers.
- **Session persistence**: Sticky sessions via cookies or IP hashing.

## 4. When to Use It

| Scenario | Recommended Algorithm |
|----------|---------------------|
| **Stateless, uniform requests** (REST APIs) | Round Robin or Least Connections |
| **Long-lived connections** (WebSockets) | Least Connections |
| **Stateful sessions** (shopping carts) | IP Hash or Cookie-based sticky sessions |
| **Heterogeneous servers** (different capacities) | Weighted Round Robin |
| **Latency-sensitive apps** (real-time) | Least Response Time |
| **Cache affinity** (CDN, Redis) | Consistent Hashing |
| **Global traffic** | Geographic routing + Anycast |

## 5. When NOT to Use It / Tradeoffs

- **Round Robin with long requests**: If one request takes 10s and another takes 100ms, Round Robin creates imbalance because it doesn't consider current load.
- **IP Hash with NAT**: Clients behind a NAT (corporate network) all hash to the same server.
- **Sticky sessions** reduce fault tolerance — losing a server loses all its sessions.
- **Consistent hashing** has overhead in hash computation and ring management.
- **Least Connections** may not reflect actual load — 10 idle connections vs 10 busy connections look the same.
- **Health checks add latency**: Active health checks consume resources.
- **Load balancer becomes a bottleneck**: Must be deployed in HA pair (active/standby or active/active).

## 6. How It Works (Deep Mechanics)

**Round Robin**: Maintains a circular queue of backend servers. Each new request goes to the next server in the queue. When reaching the end, wraps around to the beginning.

**Weighted Round Robin**: Each server gets a weight (e.g., 3 for a 64GB server, 1 for a 16GB server). Server is selected proportionally to its weight.

**Least Connections**: Tracks active connection count per server. New request goes to server with fewest active connections. Requires connection tracking state.

**IP Hash**: Computes hash(client IP) % N (where N = number of servers). Same IP always maps to same server. Adding/removing servers reshuffles all mappings (solved by consistent hashing).

**Consistent Hashing**: Servers and requests are hashed onto a ring (0 to 2^32 - 1). Each request goes to the next server clockwise on the ring. Adding/removing a server only affects its immediate neighbors.

## 7. Architecture Diagram (ASCII)

\`\`\`
Internet
    |
+---+---+
|  DNS   |
+---+---+
    |
+-----------+-----------+
|  Load Balancer (HA)   |
|  Algorithm: Least Conn |
+-----------+-----------+
    |       |       |
+---+---+ +---+---+ +---+---+
| App   | | App   | | App   |
| Svr 1 | | Svr 2 | | Svr 3 |
+---+---+ +---+---+ +---+---+
    |       |       |
+---+---+ +---+---+ +---+---+
| Cache  | | Cache  | | Cache  |
+---+---+ +---+---+ +---+---+

Consistent Hashing Ring:
    0
    |
  Servers: S1, S2, S3, S4
  Keys: K1..K8 hashed to ring
  Each key assigned to next clockwise server

      0
  S4  |  S1
K7 K8 | K1 K2
-------+-------
K6 K5 | K3 K4
  S3  |  S2
     2^32
\`\`\`

## 8. Real-World Flow Example

**E-commerce checkout flow**:
1. User POSTs /checkout {cartId, paymentInfo}.
2. Request arrives at AWS ALB (Application Load Balancer).
3. ALB uses **Least Connections** algorithm — picks server with fewest active connections.
4. Server processes checkout: validates cart, charges payment, updates inventory, creates order.
5. Response returns through ALB to user.
6. If server becomes unhealthy (health check /health returns 503), ALB removes it from rotation.
7. New requests go to remaining healthy servers.
8. Server recovers, health check passes, ALB adds it back.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
interface BackendServer {
  id: string;
  host: string;
  port: number;
  weight: number;
  activeConnections: number;
  healthy: boolean;
}

class RoundRobinLoadBalancer {
  private servers: BackendServer[];
  private currentIndex = 0;
  private lock = false;

  constructor(servers: BackendServer[]) {
    this.servers = servers.filter(s => s.healthy);
  }

  async getNextServer(): Promise<BackendServer | null> {
    while (this.lock) {
      await new Promise(r => setTimeout(r, 1));
    }
    this.lock = true;
    try {
      const healthy = this.servers.filter(s => s.healthy);
      if (healthy.length === 0) return null;
      const server = healthy[this.currentIndex % healthy.length];
      this.currentIndex = (this.currentIndex + 1) % healthy.length;
      return server;
    } finally {
      this.lock = false;
    }
  }
}

class ConsistentHashLoadBalancer {
  private ring: Map<number, BackendServer> = new Map();
  private virtualNodesPerServer = 100;

  constructor(servers: BackendServer[]) {
    for (const server of servers) {
      for (let i = 0; i < this.virtualNodesPerServer; i++) {
        const hash = this.hash(\`\${server.id}:\${i}\`);
        this.ring.set(hash, server);
      }
    }
  }

  private hash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  getServer(key: string): BackendServer | undefined {
    if (this.ring.size === 0) return undefined;
    const hash = this.hash(key);
    const sortedKeys = [...this.ring.keys()].sort((a, b) => a - b);
    const targetKey = sortedKeys.find(k => k >= hash) ?? sortedKeys[0];
    return this.ring.get(targetKey);
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Amazon Web Services (AWS) ALB/NLB**: AWS Application Load Balancer uses Least Outstanding Requests (similar to Least Connections) by default. Network Load Balancer handles 25M+ requests per second.
- **Google Cloud Load Balancing**: Uses Maglev — a fast, consistent hashing-based software load balancer that handles 100Gbps+ per frontend.
- **NGINX**: Default algorithm is Round Robin. Also supports Least Connections (least_conn), IP Hash (ip_hash), and Generic Hash.
- **HAProxy**: Default is Round Robin. Recommends Least Connections for long sessions. Used by GitHub, Reddit, Stack Overflow.
- **Cloudflare**: Uses Anycast routing + consistent hashing for their edge load balancer, handling 10M+ requests per second per PoP.

## 11. Common Interview Questions

1. *Compare Round Robin vs Least Connections. When would you pick each?*
2. *How does consistent hashing improve cache hit rates?*
3. *What is the difference between layer 4 and layer 7 load balancing?*
4. *How does a load balancer handle server failures during active connections?*
5. *Design a weighted load balancing strategy for heterogeneous servers.*
6. *How does session persistence (sticky sessions) work in a load balancer?*
7. *What happens when a load balancer itself fails? How do you make it HA?*
8. *Compare software (HAProxy, NGINX) vs hardware (F5, Citrix) load balancers.*

## 12. Related Topics & Next Steps

- **Layer 4 vs Layer 7 Load Balancing**: Different OSI layers for different use cases.
- **Reverse Proxy vs Load Balancer**: Overlapping but distinct responsibilities.
- **Health Checks**: Active vs passive, TCP vs HTTP.
- **DNS Load Balancing**: Round robin DNS, weighted DNS, geo-DNS.
- **Anycast Routing**: Global load balancing with BGP.
- **Next Lesson**: Layer 4 vs Layer 7 Load Balancing.`,
    estimatedMin: 25,
    difficulty: 'INTERMEDIATE',
    companies: ['AWS', 'Google Cloud', 'NGINX', 'HAProxy', 'Cloudflare', 'F5'],
    tags: ['load-balancing', 'round-robin', 'consistent-hashing', 'least-connections', 'algorithms', 'high-availability']
  },
  {
    id: 'lesson-05-02',
    slug: 'distributed-infrastructure-02-layer4-vs-layer7',
    title: 'Layer 4 vs Layer 7 Load Balancing',
    content: `## 1. Quick Summary

**Layer 4 (L4) load balancing** operates at the **transport layer** (TCP/UDP), forwarding packets based on IP address and port without inspecting the payload. **Layer 7 (L7) load balancing** operates at the **application layer** (HTTP/HTTPS/gRPC), inspecting request content to make routing decisions. L4 offers **higher throughput** and **lower latency** but **less intelligence**. L7 provides **content-aware routing**, **SSL termination**, **header manipulation**, and **advanced health checks** at the cost of higher CPU overhead. Modern load balancers like **AWS NLB** (L4) and **ALB** (L7) serve different purposes — NLB for extreme performance, ALB for application-level routing.

## 2. Definition

**Layer 4 Load Balancer**: Forwards TCP/UDP packets based on destination IP and port. Operates at the OSI transport layer. Does not read packet contents.

**Layer 7 Load Balancer**: Terminates the TCP connection, reads the full request (HTTP headers, body, cookies), then creates a new connection to a backend server. Operates at the OSI application layer.

**Key differences**:
- **Connection handling**: L4 forwards packets (one TCP connection client to server). L7 terminates and re-establishes (two TCP connections).
- **Routing criteria**: L4 uses IP + port. L7 uses URL path, headers, cookies, request body.
- **Performance**: L4 processes packets in kernel space (fast). L7 processes in user space (slower).
- **Features**: L7 supports SSL termination, content caching, rate limiting, WAF integration.

## 3. Why It Exists / Problem It Solves

**Layer 4** solves the basic need: distribute network traffic across servers. It is the simplest, fastest approach.

**Layer 7** solves more sophisticated needs:
- **Path-based routing**: /api/* goes to API servers, /static/* goes to CDN or static servers.
- **Host-based routing**: app1.example.com and app2.example.com on the same load balancer.
- **Content inspection**: Reject requests with malicious payloads (WAF integration).
- **Header manipulation**: Add/remove/modify HTTP headers for authentication, rate limiting.
- **SSL termination**: Offload expensive TLS decryption from backend servers.
- **gRPC awareness**: Understand HTTP/2 streams for smarter gRPC routing.

## 4. When to Use It

| Use Case | LB Type | Why |
|----------|---------|-----|
| **TCP/UDP traffic** (databases, memcached) | L4 | No application-level routing needed |
| **High-throughput, latency-sensitive** (real-time) | L4 | Lower overhead, kernel-level forwarding |
| **HTTP/HTTPS APIs** | L7 | Path/host-based routing, SSL termination |
| **Microservices** | L7 | Route to different services by path |
| **WebSockets** | L4 (or L7) | L4 is simpler; some L7 support WebSocket upgrade |
| **gRPC** | L7 (L4 can work) | L7 enables gRPC-aware load balancing |
| **Mixed protocols** | Both | L4 for TCP, L7 for HTTP, or use a multi-protocol LB |

## 5. When NOT to Use It / Tradeoffs

- **L7 adds latency**: Each request is fully buffered before forwarding. For sub-millisecond services, L4 is better.
- **L7 is CPU-intensive**: TLS termination and HTTP parsing are expensive. Need more powerful LB instances.
- **L4 has no content awareness**: Cannot route based on URL path or headers. Only IP+port.
- **L4 cannot do SSL termination**: Backend servers must handle TLS (or use a separate TLS terminator).
- **L4 health checks are limited**: Usually only TCP port checks (SYN/ACK). Cannot do deep HTTP health checks.
- **L7 can buffer too much**: Large request bodies consume memory. Need to configure request size limits.

## 6. How It Works (Deep Mechanics)

**L4 — Direct Server Return (DSR)**:
1. Client sends SYN to LB VIP (Virtual IP).
2. LB receives SYN, selects backend server.
3. LB rewrites destination MAC to backend server's MAC (but preserves source IP).
4. Backend server processes request, sends response directly to client (bypassing LB).
5. Client sees response from LB VIP (thanks to backend sending with VIP as source).

**L4 — NAT mode**:
1. Client connects to LB VIP.
2. LB translates destination IP to backend server IP (DNAT).
3. Backend sends response back through LB.
4. LB translates source IP to VIP (SNAT).
5. Client sees response from VIP.

**L7 — Full Proxy mode**:
1. Client connects to LB. TLS handshake terminates at LB.
2. LB reads HTTP request (method, path, headers, body).
3. LB selects backend server based on routing rules.
4. LB establishes new TCP connection to backend (optionally with TLS).
5. LB forwards the request (possibly with modified headers).
6. Backend responds to LB. LB responds to client.

## 7. Architecture Diagram (ASCII)

\`\`\`
Layer 4 (NAT Mode):
  Client                LB                    Backend
  10.0.0.1           10.0.0.10             192.168.1.2
    |                   |                       |
    |--SYN->           |                       |
    |           dst:10.0.0.10:443              |
    |                   |--SYN->               |
    |              dst:192.168.1.2:443         |
    |                   |<--SYN/ACK---         |
    |<--SYN/ACK-       |                       |
    |----ACK->         |                       |
    |              src:10.0.0.1                |
    |              dst:192.168.1.2             |
    |                   |----ACK->             |
    |              src:10.0.0.1                |
    |                   |<---HTTP Response---  |
    |<---HTTP Response- |                      |
    |              src:10.0.0.10               |

Layer 7 (Full Proxy):
  Client                LB                    Backend
    |                   |                       |
    |---TCP SYN------->|                       |
    |<--TCP SYN/ACK----|                       |
    |---ACK----------->|                       |
    |---TLS ClientHello|                       |
    |<--ServerHello----|                       |
    |---GET /api/users->|                       |
    |                   |---TCP SYN------------>|
    |                   |<--TCP SYN/ACK---------|
    |                   |---ACK---------------->|
    |                   |---GET /api/users------>|
    |                   |<---HTTP 200 + JSON----|
    |<---HTTP 200 + JSON|                       |
\`\`\`

## 8. Real-World Flow Example

**E-commerce platform with L7 ALB**:
1. Client hits https://shop.example.com/products.
2. AWS ALB terminates TLS at the load balancer (SSL certificate on ALB).
3. ALB inspects request path: matches /products/* routing rule.
4. ALB adds X-Forwarded-For header with client IP.
5. ALB forwards request to a product service instance (Least Outstanding Requests).
6. Product service responds with product data.
7. ALB compresses response (gzip), adds security headers, sends to client.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// Layer 4 forwarding table (simplified NAT LB)
interface L4ForwardingEntry {
  vip: string;       // virtual IP:port
  protocol: 'tcp' | 'udp';
  backends: string[]; // backend IP:port
}

class Layer4LoadBalancer {
  private connections: Map<string, string> = new Map(); // client->backend mapping

  forwardPacket(packet: Packet, table: L4ForwardingEntry[]): void {
    const entry = table.find(e => e.vip === \`\${packet.dstIp}:\${packet.dstPort}\`);
    if (!entry) throw new Error('No VIP match');

    const clientKey = \`\${packet.srcIp}:\${packet.srcPort}\`;
    if (!this.connections.has(clientKey)) {
      // First packet of connection: choose backend
      const backend = entry.backends[Math.floor(Math.random() * entry.backends.length)];
      this.connections.set(clientKey, backend);
    }
    const backend = this.connections.get(clientKey)!;
    // Rewrite destination to backend server
    packet.dstIp = backend.split(':')[0];
    packet.dstPort = parseInt(backend.split(':')[1]);
  }
}

// Layer 7 reverse proxy
class Layer7Proxy {
  private routes: Map<string, string> = new Map(); // path prefix -> backend pool

  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = req.url!;
    for (const [prefix, backendPool] of this.routes) {
      if (path.startsWith(prefix)) {
        const backend = await this.selectBackend(backendPool);
        const backendReq = http.request({
          hostname: backend.host,
          port: backend.port,
          path,
          method: req.method,
          headers: {
            ...req.headers,
            'x-forwarded-for': req.socket.remoteAddress,
            'x-forwarded-proto': 'https'
          }
        });
        req.pipe(backendReq);
        backendReq.pipe(res);
        return;
      }
    }
    res.statusCode = 404;
    res.end('No route found');
  }

  private async selectBackend(pool: string[]): Promise<{host: string; port: number}> {
    // Least connections logic
    const [host, portStr] = pool[Math.floor(Math.random() * pool.length)].split(':');
    return { host, port: parseInt(portStr) };
  }
}
\`\`\`

## 10. Real Company Use Cases

- **AWS NLB vs ALB**: NLB handles 25M+ requests/second at L4. ALB provides content-based routing, WAF integration, and is used by major AWS customers for HTTP traffic.
- **Google Cloud**: Internal TCP/UDP LB (L4, 100Gbps+) vs HTTP(S) LB (L7, global anycast, Cloud CDN integration).
- **HAProxy**: Can run in both L4 (tcp mode) and L7 (http mode). Used by GitHub, Reddit, Imgur.
- **NGINX**: Primarily L7 (HTTP/HTTPS). Can do L4 TCP/UDP load balancing with the stream module.
- **Envoy**: L7 proxy with advanced HTTP/2 and gRPC support. Used as the data plane in service meshes (Istio).

## 11. Common Interview Questions

1. *What is the difference between L4 and L7 load balancing?*
2. *When would you use a TCP load balancer (NLB) vs an HTTP load balancer (ALB)?*
3. *How does Direct Server Return (DSR) work in L4 load balancing?*
4. *What are the tradeoffs of SSL termination at the load balancer vs the backend?*
5. *How does a load balancer handle WebSocket connections?*
6. *Can you run L7 routing rules on TCP traffic?*
7. *What is a reverse proxy and how does it relate to L7 load balancing?*
8. *Design a hybrid approach using both L4 and L7 load balancers.*

## 12. Related Topics & Next Steps

- **Reverse Proxy vs Load Balancer**: Similar but not identical concepts.
- **SSL Termination / TLS Passthrough**: Where to terminate encryption.
- **gRPC Load Balancing**: L7 awareness of HTTP/2 streams.
- **Service Mesh**: Ingress/egress traffic management in mesh architectures.
- **Gateway API**: Kubernetes Ingress evolution.
- **Next Lesson**: Reverse Proxy vs Load Balancer.`,
    estimatedMin: 22,
    difficulty: 'INTERMEDIATE',
    companies: ['AWS', 'Google Cloud', 'HAProxy', 'NGINX', 'Envoy', 'F5'],
    tags: ['layer4', 'layer7', 'osimodel', 'tcp', 'http', 'load-balancing']
  },
  {
    id: 'lesson-05-03',
    slug: 'distributed-infrastructure-03-reverse-proxy-vs-load-balancer',
    title: 'Reverse Proxy vs Load Balancer',
    content: `## 1. Quick Summary

A **reverse proxy** sits in front of web servers, forwarding client requests to those servers and returning responses to clients. It provides **caching**, **SSL termination**, **compression**, and **security** features. A **load balancer** distributes traffic across multiple servers for **scalability** and **reliability**. While they overlap significantly (many tools do both), the key distinction is intent: reverse proxies focus on **request handling and optimization**, while load balancers focus on **traffic distribution and fault tolerance**. NGINX, HAProxy, and Envoy are popular tools that can serve as either or both.

## 2. Definition

**Reverse Proxy**: A server that acts as an intermediary for backend servers, accepting requests from clients, forwarding them to backend servers, and returning responses to clients.

**Forward Proxy** (for contrast): Acts on behalf of clients, hiding client identity (e.g., corporate proxy, VPN).

**Load Balancer**: A specialized reverse proxy focused on distributing traffic across multiple servers.

**Overlap**: Most modern reverse proxies include load balancing features. Most load balancers include reverse proxy features.

## 3. Why It Exists / Problem It Solves

**Reverse proxy solves**:
- **Direct exposure**: Without it, backend servers are directly accessible (security risk).
- **TLS termination overhead**: Offload TLS from backend servers.
- **Slow clients**: Buffering requests from slow clients prevents backend thread starvation.
- **Caching**: Cache frequently requested resources to reduce backend load.
- **Compression**: Centralize gzip/brotli compression.
- **Cross-origin requests**: Handle CORS centrally.

**Load balancer solves**:
- **Single point of failure**: Distribute across multiple backends.
- **Scaling**: Add/remove backends seamlessly.
- **Session persistence**: Stick clients to the same backend.
- **Health checking**: Remove unhealthy backends automatically.

## 4. When to Use It

| Feature | Reverse Proxy | Load Balancer |
|---------|---------------|---------------|
| **Single server backend** | Yes (caching, SSL offload) | Overkill (no need to distribute) |
| **Multiple servers, anycast** | Maybe (if routing features needed) | Yes |
| **Microservices** | Both (API gateway pattern) | Both |
| **Static content** | Yes (cache + serve) | Only if multiple static servers |
| **WebSockets** | Yes (proxy upgrade) | Yes (distribute connections) |
| **API management** | Yes (rate limiting, auth) | Partially (auth offload) |

## 5. When NOT to Use It / Tradeoffs

- **Reverse proxy adds latency**: Each request passes through an extra hop.
- **Configuration complexity**: Wrong config can break applications (wrong headers, timeouts).
- **Single point of failure**: Unless deployed in HA (active/passive or active/active).
- **Buffer sizing**: Incorrect buffer sizes cause performance issues (too small = many system calls, too large = memory waste).
- **TLS termination at proxy**: Backend-to-proxy traffic must be secured in untrusted networks.
- **Too many proxies**: Chaining proxies (LB -> Reverse Proxy -> App) adds latency.

## 6. How It Works (Deep Mechanics)

**Reverse proxy flow**:
1. Client connects to reverse proxy (e.g., NGINX on port 443).
2. NGINX terminates TLS, reads request.
3. NGINX checks cache — if cached and fresh, returns cached response.
4. If not cached, NGINX creates connection to backend (e.g., 127.0.0.1:3000).
5. NGINX forwards request, optionally adding X-Forwarded-For, X-Real-IP headers.
6. NGINX buffers the response from backend.
7. NGINX optionally compresses the response (gzip, brotli).
8. NGINX sends response to client. If cacheable, stores in cache.

**Load balancing flow**:
1. Client connects to load balancer.
2. LB executes health check against all registered backends.
3. Client request arrives — LB selects a backend using algorithm.
4. LB forwards request to selected backend.
5. LB monitors backend health (active/passive checks).
6. If backend fails health check, LB removes it from rotation.
7. When backend recovers, LB adds it back.

## 7. Architecture Diagram (ASCII)

\`\`\`
Without Reverse Proxy:
  Client -----> Backend Server (port 3000)
  (TLS, slow client directly connects)

With Reverse Proxy (single backend):
  Client -----> Reverse Proxy (port 443, TLS)
                      |
                      |----> Backend Server (port 3000, HTTP)
  (TLS terminated at proxy, HTTP to backend)

With Load Balancer + Reverse Proxy:
  Client -----> Load Balancer (port 443)
                      |
            +---------+--------+
            |         |        |
      Reverse      Reverse   Reverse
      Proxy 1      Proxy 2   Proxy 3
            |         |        |
      Backend 1  Backend 2  Backend 3

Full Proxy Chain:
  Client -> CDN (Cloudflare) -> LB (HAProxy) -> Reverse Proxy (NGINX) -> App Server
\`\`\`

## 8. Real-World Flow Example

**NGINX as reverse proxy for a Node.js app**:
1. Client request hits NGINX on port 443.
2. NGINX terminates TLS using certificate at /etc/nginx/certs.
3. If request is /static/*, NGINX serves from disk or cache (no backend involved).
4. If request is /api/*, NGINX proxies to http://node_backend:3000.
5. NGINX adds headers: X-Forwarded-For, X-Real-IP, X-Forwarded-Proto.
6. NGINX buffers response body (proxy_buffer_size 4k).
7. NGINX compresses with gzip (if Accept-Encoding: gzip).
8. NGINX returns response to client.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
import * as http from 'http';
import * as httpProxy from 'http-proxy';

interface ProxyConfig {
  routes: Map<string, string>;   // path -> target
  upstreams: Set<string>;         // backend servers
  cacheEnabled: boolean;
  compressionEnabled: boolean;
}

class SimpleReverseProxy {
  private proxy: httpProxy;
  private cache: Map<string, {body: Buffer; headers: http.OutgoingHttpHeaders; expires: number}> = new Map();

  constructor(private config: ProxyConfig) {
    this.proxy = httpProxy.createProxyServer({});
  }

  handleRequest(clientReq: http.IncomingMessage, clientRes: http.ServerResponse): void {
    const url = new URL(clientReq.url!, \`http://\${clientReq.headers.host}\`);
    const path = url.pathname;

    // 1. Check cache
    if (this.config.cacheEnabled && clientReq.method === 'GET') {
      const cached = this.cache.get(path);
      if (cached && cached.expires > Date.now()) {
        clientRes.writeHead(200, cached.headers);
        clientRes.end(cached.body);
        return;
      }
    }

    // 2. Determine target
    const route = this.findRoute(path);
    if (!route) {
      clientRes.writeHead(502);
      clientRes.end('Bad Gateway: No route');
      return;
    }

    // 3. Proxy with modifications
    delete clientReq.headers['host'];
    clientReq.headers['x-forwarded-for'] = clientReq.socket.remoteAddress || '';
    clientReq.headers['x-forwarded-proto'] = 'https';

    this.proxy.web(clientReq, clientRes, {
      target: route,
      changeOrigin: true,
      buffer: httpProxy.buffer({
        size: 16 * 1024 // 16KB buffer
      })
    });
  }

  private findRoute(path: string): string | undefined {
    for (const [prefix, target] of this.config.routes) {
      if (path.startsWith(prefix)) return target;
    }
    return this.config.upstreams.values().next().value;
  }
}
\`\`\`

## 10. Real Company Use Cases

- **NGINX**: Used as reverse proxy by ~40% of the top 10K websites. Netflix uses NGINX as their CDN origin proxy. Cloudflare uses a modified NGINX.
- **HAProxy**: Used as both reverse proxy and load balancer. GitHub uses HAProxy in front of their Git and web traffic.
- **Envoy**: Cilium, Istio use Envoy as the sidecar proxy. Lyft built Envoy as a modern, high-performance proxy.
- **Traefik**: Cloud-native reverse proxy with automatic service discovery. Used by Docker and Kubernetes environments.
- **Caddy**: Reverse proxy with automatic HTTPS (Let's Encrypt). Known for ease of use.

## 11. Common Interview Questions

1. *What is the difference between a reverse proxy and a load balancer?*
2. *Can you use a reverse proxy without load balancing? When?*
3. *How does a reverse proxy handle SSL termination?*
4. *What is the difference between a forward proxy and a reverse proxy?*
5. *How does a reverse proxy improve security?*
6. *What is the impact of reverse proxy buffering on performance?*
7. *How does X-Forwarded-For header work and what are its security concerns?*
8. *Design a multi-layer proxy architecture for a global application.*

## 12. Related Topics & Next Steps

- **API Gateway**: Reverse proxy for microservices with auth and rate limiting.
- **Service Mesh**: Reverse proxy per service instance (sidecar pattern).
- **CDN**: Reverse proxy at the edge for content delivery.
- **TLS Termination**: Where and how to terminate TLS.
- **Cache Invalidation**: Strategies for reverse proxy caches.
- **Next Lesson**: Message Queues.`,
    estimatedMin: 23,
    difficulty: 'BEGINNER',
    companies: ['NGINX', 'HAProxy', 'Envoy', 'Cloudflare', 'Netflix', 'GitHub'],
    tags: ['reverse-proxy', 'load-balancer', 'nginx', 'haproxy', 'proxy', 'tls-termination']
  },
  {
    id: 'lesson-05-04',
    slug: 'distributed-infrastructure-04-message-queues',
    title: 'Message Queues',
    content: `## 1. Quick Summary

A **message queue** (MQ) is a communication mechanism where **producers** send messages to a queue and **consumers** receive them asynchronously. This decouples the sender from the receiver, allowing independent scaling, fault tolerance, and load leveling. Messages are stored durably until consumed. Key concepts include **queues**, **exchanges**, **bindings**, **routing keys**, **acknowledgments**, and **dead letter queues**. Message queues enable **event-driven architectures**, **task distribution**, **guaranteed delivery**, and **workload buffering**. Popular implementations include **RabbitMQ**, **Apache Kafka**, **Amazon SQS**, **Redis Streams**, and **NATS**.

## 2. Definition

**Message Queue**: A buffer that stores messages sent by producers until consumers retrieve and process them.

**Core components**:
- **Producer**: Creates and sends messages.
- **Consumer**: Receives and processes messages.
- **Queue**: First-in-first-out (FIFO) buffer that stores messages.
- **Broker**: The server that manages queues and routes messages.
- **Exchange** (AMQP): Receives messages from producers, routes to queues based on rules.
- **Binding**: Links an exchange to a queue with a routing pattern.

**Message delivery guarantees**:
- **At-most-once**: Message may be lost but never duplicated.
- **At-least-once**: Message never lost but may be duplicated.
- **Exactly-once**: Each message delivered exactly once (hard to achieve in distributed systems).

## 3. Why It Exists / Problem It Solves

Without message queues:
- **Synchronous coupling**: If a service is down, all dependent services fail.
- **Traffic spikes**: Sudden load bursts overwhelm services.
- **Tight orchestration**: Services must know about each other's existence, location, and availability.
- **No backlog**: Failed messages are lost.

Message queues solve:
- **Decoupling**: Producers don't need to know about consumers (and vice versa).
- **Load leveling**: Buffer traffic spikes — messages pile up in queue, consumers process at their own pace.
- **Reliability**: Messages survive crashes (durable storage, acknowledgments).
- **Asynchronous processing**: Send and forget — improve user-facing latency.
- **Fan-out**: One message reaches multiple consumers.
- **Scalability**: Add more consumers to increase throughput (competing consumers pattern).

## 4. When to Use It

| Scenario | Use MQ? | Why |
|----------|---------|-----|
| **Send email notifications** | Yes | Async, retry on failure, don't block user |
| **Process image uploads** | Yes | Heavy computation, queue and process in background |
| **Handle payment webhooks** | Yes | Durable storage, ordering, retry on failure |
| **Real-time chat** | Maybe | Low latency needed — consider pub/sub |
| **Caching layer** | No | Synchronous, need immediate response |
| **User signup flow** | Partially | Core flow synchronous, side effects via MQ |

## 5. When NOT to Use It / Tradeoffs

- **Low-latency requirements**: Adding a queue adds latency (serialization, network, broker overhead).
- **Simple request-response**: If you just need an API call, don't insert a queue.
- **Complex routing**: Chains of message transformations are hard to debug.
- **Operational overhead**: Running a message broker requires expertise.
- **At-least-once semantics**: Requires idempotent consumers (duplicate messages).
- **Message ordering**: Preserving order across multiple consumers is difficult.
- **Backpressure**: If consumers fall too far behind, the queue grows unbounded.

## 6. How It Works (Deep Mechanics)

**AMQP (Advanced Message Queuing Protocol) — RabbitMQ**:
1. Producer connects to broker, creates a channel.
2. Producer publishes a message to an **exchange** with a **routing key**.
3. Exchange matches the routing key against **bindings** to determine which queues receive the message.
4. Exchange types:
   - **Direct**: Routes to queues whose binding key exactly matches routing key.
   - **Topic**: Routes based on pattern matching (wildcards: *, #).
   - **Fanout**: Routes to all bound queues (broadcast).
   - **Headers**: Routes based on header attributes.
5. Queue stores message durably (disk) or in memory.
6. Consumer subscribes to a queue, pulls messages (push or pull).
7. Consumer sends **acknowledgment** (ack) when processing is done.
8. If consumer fails without ack, message is requeued.
9. After max retries, message goes to **dead letter queue** (DLQ).

**JMS (Java Message Service)** is the Java API standard; **AMQP** is the wire-level protocol standard.

## 7. Architecture Diagram (ASCII)

\`\`\`
Basic Message Queue:
  Producer ----> [Queue] ----> Consumer 1
                           ----> Consumer 2
                           ----> Consumer 3

AMQP Exchange Routing:
  Producer1 --(order.created)--> [Topic Exchange]
                                     |
                  +------------------+------------------+
                  | routing: order.*       | routing: order.#
                  v                         v
              [Queue A]                [Queue B]
                  |                         |
              [Consumer A]             [Consumer B]

Competing Consumers (Load Leveling):
  Spike: 1000 req/s ----> [Queue]
                               |
                    +---------+---------+
                    |         |         |
                  Worker1   Worker2   Worker3
                  (10/s)    (10/s)    (10/s)
\`\`\`

## 8. Real-World Flow Example

**E-commerce order processing**:
1. User places order. API handler validates, inserts order record, publishes to \`order.created\` queue.
2. API responds to user immediately (200 OK).
3. Five consumers process from the queue in parallel:
   - **Inventory service**: Reserves items, publishes \`inventory.reserved\`.
   - **Payment service**: Charges card, publishes \`payment.processed\`.
   - **Email service**: Sends confirmation email.
   - **Analytics service**: Logs order event.
   - **Notification service**: Sends push notification.
4. If payment fails, message goes to DLQ. Retry mechanism runs DLQ messages after 5 minutes.
5. Orders queue builds up during Black Friday (50K messages), but consumers catch up over the next hour.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
interface Message {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

interface QueueConfig {
  name: string;
  durable: boolean;
  maxRetries: number;
  dlqName: string;
}

class InMemoryMessageQueue {
  private queues: Map<string, Message[]> = new Map();
  private dlqs: Map<string, Message[]> = new Map();
  private subscribers: Map<string, Array<(msg: Message) => Promise<void>>> = new Map();
  private configs: Map<string, QueueConfig> = new Map();

  createQueue(config: QueueConfig): void {
    this.queues.set(config.name, []);
    this.dlqs.set(config.dlqName, []);
    this.configs.set(config.name, config);
    this.subscribers.set(config.name, []);
  }

  async publish(queueName: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(\`Queue \${queueName} not found\`);
    const msg: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    queue.push(msg);
    this.notifySubscribers(queueName);
  }

  async consume(queueName: string, handler: (msg: Message) => Promise<void>): Promise<void> {
    const config = this.configs.get(queueName);
    if (!config) throw new Error(\`Queue \${queueName} not found\`);
    this.subscribers.get(queueName)!.push(async (msg: Message) => {
      try {
        await handler(msg);
        this.removeMessage(queueName, msg.id);
      } catch (error) {
        msg.retryCount++;
        if (msg.retryCount >= config.maxRetries) {
          this.moveToDLQ(queueName, msg);
        } else {
          setTimeout(() => {
            this.queues.get(queueName)!.push(msg);
          }, Math.pow(2, msg.retryCount) * 1000);
        }
      }
    });
  }

  private async notifySubscribers(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName)!;
    const handlers = this.subscribers.get(queueName)!;
    while (queue.length > 0) {
      const msg = queue.shift()!;
      for (const handler of handlers) {
        handler(msg).catch(console.error);
      }
    }
  }

  private removeMessage(queueName: string, msgId: string): void {
    const queue = this.queues.get(queueName)!;
    const idx = queue.findIndex(m => m.id === msgId);
    if (idx >= 0) queue.splice(idx, 1);
  }

  private moveToDLQ(queueName: string, msg: Message): void {
    const config = this.configs.get(queueName)!;
    const dlq = this.dlqs.get(config.dlqName)!;
    dlq.push(msg);
    this.removeMessage(queueName, msg.id);
    console.error(\`Message \${msg.id} moved to DLQ \${config.dlqName}\`);
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Amazon**: SQS (Simple Queue Service) handles trillions of messages per day. SQS is used internally for order processing, fulfillment, and async workflows.
- **RabbitMQ**: Used by Bloomberg (financial data), Reddit (notification delivery), and NASA (satellite data processing).
- **NATS**: Used by Hulu, Baidu, and Siemens for lightweight, high-throughput messaging (cloud-native).
- **Redis Streams**: Used by Twitter for timeline fan-out and by GitHub for background job processing (Sidekiq).

## 11. Common Interview Questions

1. *What is the difference between a message queue and a pub/sub system?*
2. *How does at-least-once delivery work and what is the problem it introduces?*
3. *What is a dead letter queue and when should you use it?*
4. *How do you handle message ordering in a distributed queue?*
5. *What is the competing consumers pattern?*
6. *How does message acknowledgment work (ack vs no-ack)?*
7. *Compare AMQP, MQTT, and HTTP-based messaging.*
8. *Design a message queue for an order processing system.*

## 12. Related Topics & Next Steps

- **Pub/Sub Pattern**: One-to-many messaging (publishers to subscribers).
- **Kafka Architecture**: Distributed streaming platform (log-based, not a traditional queue).
- **RabbitMQ vs Kafka vs SQS**: Choosing the right broker.
- **Idempotent Consumers**: Handling duplicate messages.
- **Backpressure**: Protecting consumers from overload.
- **Next Lesson**: Antipatterns.`,
    estimatedMin: 25,
    difficulty: 'INTERMEDIATE',
    companies: ['Amazon SQS', 'RabbitMQ', 'Redis', 'NATS', 'Bloomberg', 'Reddit'],
    tags: ['message-queue', 'amqp', 'async', 'decoupling', 'load-leveling', 'queue']
  },
  {
    id: 'lesson-05-05',
    slug: 'distributed-infrastructure-05-distributed-system-antipatterns',
    title: 'Distributed System Anti-patterns',
    content: `## 1. Quick Summary

**Distributed system anti-patterns** are common but flawed approaches that lead to system fragility, poor performance, or operational nightmares. Recognizing these patterns is essential for senior engineers. Key anti-patterns include the **Distributed Monolith** (services tightly coupled but deployed separately), **Thundering Herd** (massive simultaneous requests overwhelm a system), **Callback Hell** (deeply nested asynchronous callbacks), **Synchronous Chain** (deep call chains that all must succeed), **Trampoline** (excessive context switching between services), **Split-Brain** (two nodes believe they are the leader), **Leaky Abstraction** (internal implementation details exposed across service boundaries), **Orchestration Overuse** (over-centralizing workflow logic), and **No Retry with Backoff** (aggressive retries causing cascading failures).

## 2. Definition

Anti-patterns are repeated solutions to common problems that appear correct initially but have negative consequences that outweigh their benefits.

**Distributed Monolith**: A set of services that are tightly coupled despite being independently deployed. Changes to one service cascade to others. Requires synchronized deployments.

**Thundering Herd**: When a system recovers after a failure, all clients retry simultaneously, causing another failure (and a cycle of recovery + failure).

**Synchronous Chain**: Service A calls B, B calls C, C calls D. If any one service is slow or down, the entire chain fails.

**Split-Brain**: A cluster splits into two groups due to network partition, with both groups electing a leader and making conflicting state changes.

**Cascading Failure**: One component's failure triggers failures in other components, leading to a system-wide outage.

## 3. Why It Exists / Problem It Solves

These anti-patterns emerge because:
- **Distributed Monolith**: Teams decompose by technical layer (not domain), creating implicit dependencies.
- **Thundering Herd**: Developers implement naive retry logic without considering aggregate impact.
- **Synchronous Chain**: Developers model workflows as sequential calls because it's the simplest approach.
- **Split-Brain**: Consensus algorithms are hard to implement correctly. Many teams skip them.
- **Cascading Failure**: Services don't have circuit breakers, bulkheads, or graceful degradation.

## 4. When to Watch for Them

| Anti-pattern | Warning Signs |
|--------------|---------------|
| **Distributed Monolith** | Services share a database, synchronized deploy windows, chatty service-to-service calls |
| **Thundering Herd** | All clients retry on the same interval, no jitter, first request after recovery spikes CPU |
| **Synchronous Chain** | Deep call graph, no timeout, no fallback, high P99 latency |
| **Split-Brain** | Manual failover, no quorum, dual writes detected after partition |
| **Cascading Failure** | One service slowdown causes global timeout, thread pools exhaust |

## 5. When NOT to Use It / Mitigation

**Distributed Monolith**:
- Mitigation: Apply Domain-Driven Design. Each service owns its data. Strict API contracts.

**Thundering Herd**:
- Mitigation: Exponential backoff + jitter. Randomized retry timers. Circuit breaker.

**Synchronous Chain**:
- Mitigation: Timeouts with fast failure. Async communication with event-driven orchestration. Saga pattern.

**Split-Brain**:
- Mitigation: Use consensus protocol (Raft, Paxos). Fencing (epoch-based locks). Quorum-based decisions.

**Cascading Failure**:
- Mitigation: Circuit breakers, bulkheads, graceful degradation, load shedding.

## 6. How It Works (Deep Mechanics)

**Thundering Herd Mechanics**:
1. System A (e.g., cache) fails.
2. All clients (100 instances) cache missed simultaneously.
3. Backend database sees a 100x spike in requests.
4. Database slows down under load.
5. More requests pile up, causing the database to fail.
6. Database restarts. All 100 clients retry immediately.
7. Cycle repeats.

**Cascading Failure Mechanics**:
1. Service B experiences a latency spike (garbage collection, slow query).
2. Service A, calling B with a 500ms timeout, holds connections open.
3. Service A's connection pool exhausts.
4. Clients calling A experience timeouts.
5. Clients retry — making things worse.
6. Service A becomes unavailable, even though only B is slow.

**Split-Brain Mechanics**:
1. Network switch fails. Cluster of 3 nodes splits into {Node1} and {Node2, Node3}.
2. Both groups think the other is down.
3. Node1 elects itself as leader. Node2 and Node3 elect Node2 as leader.
4. Both leaders accept writes to their local storage.
5. When the network heals, writes are conflicting.
6. Reconciliation is impossible (lost writes, conflicting data).

## 7. Architecture Diagram (ASCII)

\`\`\`
Thundering Herd:
  Time:    t1                    t2                    t3
  Cache:   [Hit]                [Miss * 100]          [Hit again]
  DB:      [Normal load]        [Spike: 100x req]      [Under load]
          ^                     ^                     ^
          | Cache evicts       | All clients miss    | Same pattern repeats

Synchronous Chain:
  Client -> Service A -> Service B -> Service C -> Service D
             1s             2s           5s           3s
             |              |            |            |
             +---- TOTAL: 11s if all succeed --->---+
             If Service C fails at 5s, all 11s are wasted.

Cascading Failure:
  Normal:   Client -> A (thread: 10) -> B (thread: 10) -> C (thread: 10)
  Failure:  Client -> A (thread: exhausted) -> B (slow, GC pause)
              |                            |
              | All threads blocked on B   | No threads left
              v                            v
          A = dead                      B = slow
\`\`\`

## 8. Real-World Flow Example

**Knight Capital (2012)**: A software anti-pattern caused $440M loss in 45 minutes:
1. Deploy script reused a flag from a previous deployment (trampoline anti-pattern).
2. The old flag reactivated legacy code that was not intended to run.
3. The legacy code sent millions of erroneous stock orders to the market.
4. No circuit breaker existed to stop the runaway orders.
5. No canary deployment — the deploy went to all servers simultaneously.
6. Result: Company went bankrupt and was acquired.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// Thundering Herd: Naive retry (BAD)
class BadRetryClient {
  async fetchData(key: string): Promise<Data> {
    try {
      return await this.cache.get(key);
    } catch {
      // ALL clients retry at exactly the same time!
      return await this.database.query(key);
    }
  }
}

// Thundering Herd: Exponential backoff + jitter (GOOD)
class GoodRetryClient {
  async fetchWithRetry(key: string, attempt = 0): Promise<Data> {
    try {
      return await this.cache.get(key);
    } catch (error) {
      if (attempt >= 3) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      const jitter = Math.random() * delay;
      await new Promise(r => setTimeout(r, delay + jitter));
      return this.fetchWithRetry(key, attempt + 1);
    }
  }
}

// Circuit Breaker Pattern
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly threshold = 5;
  private readonly timeout = 30000; // 30 seconds

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Knight Capital (2012)**: $440M loss from a deploy anti-pattern.
- **Amazon 2017 S3 Outage**: Thundering herd from retries caused the outage to spread. Typo in a command took down more servers than intended, and the retry logic made it worse.
- **Cloudflare 2020 Outage**: Cascading failure from a router announcement. BGP leak caused elevated CPU usage on edge servers, which overloaded the control plane.
- **GitHub 2018 Outage**: A network partition caused a split-brain scenario in their MySQL cluster. Manual failover was attempted but misconfigured.
- **Google 2013 Outage**: Thundering herd from a single BGP route change amplified load across multiple data centers.

## 11. Common Interview Questions

1. *What is the thundering herd problem and how do you solve it?*
2. *Explain how a cascading failure spreads and how to prevent it.*
3. *What is a distributed monolith and how does it form?*
4. *How does split-brain happen and how do you guard against it?*
5. *What is the leaky abstraction anti-pattern in distributed systems?*
6. *How do circuit breakers and bulkheads prevent cascading failures?*
7. *What is exponential backoff with jitter and why is jitter important?*
8. *Describe a real-world distributed system failure you would try to prevent.*

## 12. Related Topics & Next Steps

- **Circuit Breaker Pattern**: Protect against cascading failures.
- **Bulkhead Pattern**: Isolate failures in resource pools.
- **Retry with Backoff**: Exponential backoff + jitter.
- **Idempotency**: Making retries safe.
- **Graceful Degradation**: Continue serving partial results during failure.
- **Next Lesson**: Pub/Sub Pattern.`,
    estimatedMin: 22,
    difficulty: 'INTERMEDIATE',
    companies: ['Knight Capital', 'Amazon', 'Cloudflare', 'GitHub', 'Google'],
    tags: ['antipatterns', 'cascading-failure', 'thundering-herd', 'split-brain', 'distributed-monolith', 'circuit-breaker']
  },
  {
    id: 'lesson-05-06',
    slug: 'distributed-infrastructure-06-pub-sub-pattern',
    title: 'Pub/Sub Pattern',
    content: `## 1. Quick Summary

**Publish-Subscribe (Pub/Sub)** is a messaging pattern where **publishers** send messages to **topics** without knowing which **subscribers** will receive them. Subscribers express interest in topics and receive messages asynchronously. This provides **loose coupling**, **scalability**, and **one-to-many fan-out**. Pub/Sub is the foundation of **event-driven architectures**, **real-time notifications**, **log aggregation**, and **stream processing**. Key implementations include **Apache Kafka**, **Google Pub/Sub**, **Amazon SNS**, **Redis Pub/Sub**, **NATS**, and **MQTT**. Unlike message queues (competing consumers), pub/sub delivers each message to all subscribers.

## 2. Definition

**Topic**: A named channel to which publishers send messages and subscribers listen.

**Publisher**: A component that sends messages to a topic. Publishers are unaware of subscribers.

**Subscriber**: A component that receives messages from one or more topics.

**Filtering mechanisms**:
- **Topic-based**: Subscribers receive all messages on a topic.
- **Content-based**: Subscribers specify filter criteria on message attributes.

**Delivery semantics**:
- **At-most-once**: Best effort, may lose messages.
- **At-least-once**: Reliable, but may duplicate.
- **Exactly-once**: Hard to achieve; requires deduplication and transactional boundaries.

## 3. Why It Exists / Problem It Solves

Without pub/sub:
- **Point-to-point integration**: Each publisher must know all subscribers and call them individually.
- **Tight coupling**: Adding a new subscriber requires modifying publisher code.
- **No fan-out**: Can't efficiently broadcast one event to many receivers.
- **Scaling issues**: Publishers must handle subscriber slow-downs.

Pub/Sub solves:
- **Loose coupling**: Publishers and subscribers are completely independent.
- **Dynamic subscribers**: Add/remove subscribers without changing publishers.
- **Fan-out**: One message delivered to all interested subscribers.
- **Buffering**: Brokers handle delivery when subscribers are offline.
- **Load isolation**: Publishers unaffected by subscriber performance.

## 4. When to Use It

| Scenario | Use Pub/Sub? | Alternative |
|----------|-------------|-------------|
| **User notifications** (email, push, SMS) | Yes | Fan-out to notification services |
| **Event sourcing** (log of all events) | Yes | Kafka for append-only log |
| **Real-time dashboards** | Yes | Subscribe to metrics topic |
| **Cache invalidation** | Yes | Broadcast to all cache nodes |
| **Log aggregation** | Yes | Central log topic, multiple consumers |
| **Point-to-point task dispatch** | No | Use message queue (competing consumers) |
| **RPU microservices** | Partial | Pub/Sub for events, request/response for queries |

## 5. When NOT to Use It / Tradeoffs

- **Message ordering**: In distributed pub/sub, preserving global order is hard (Kafka solves this with partitions).
- **Backpressure**: Fast publishers can overwhelm slow subscribers. May need subscriber-side buffering.
- **Delivery guarantees**: At-least-once requires idempotent subscribers. Exactly-once is expensive.
- **Latency**: Brokers add network hops. For sub-millisecond pub/sub, consider in-process or shared memory.
- **Operational complexity**: Running a pub/sub cluster requires expertise (ZooKeeper, partitioning, replication).
- **Cold subscribers**: New subscribers joining late miss historical messages (unless broker stores them — Kafka).
- **Security**: Topics need access control, especially in multi-tenant systems.

## 6. How It Works (Deep Mechanics)

**Topic-based filterings**:
1. Publisher creates a topic (e.g., \`order.created\`).
2. Subscriber 1 subscribes to \`order.created\`.
3. Subscriber 2 subscribes to \`order.*\` (wildcard).
4. Publisher sends message to \`order.created\`.
5. Broker delivers to both subscribers.

**Content-based filtering**:
1. Publisher sends message with attributes: {region: 'us-east', priority: 'high'}.
2. Subscriber A filters: region = 'us-east'.
3. Subscriber B filters: priority = 'high'.
4. Broker evaluates filters and delivers to matching subscribers.

**Push vs Pull**:
- **Push**: Broker pushes messages to subscribers. Low latency but can overwhelm slow subscribers.
- **Pull**: Subscribers poll for messages. Better backpressure but higher latency.

## 7. Architecture Diagram (ASCII)

\`\`\`
Basic Pub/Sub:
  Publisher 1 -----> [Topic A] -----> Subscriber 1
  Publisher 2 -----> [Topic B] -----> Subscriber 2
                                       Subscriber 3 (wildcard: A.*)

Fan-out Pattern:
  Order Service ----(order.created)---> [Order Events]
                                              |
                    +-------------------------+-------------------------+
                    |                         |                         |
               [Email Svc]            [Analytics Svc]           [Inventory Svc]

Push vs Pull:
  Push: Broker --(send)--> Subscriber (subscriber must be reachable)
  Pull: Broker <-(poll)-- Subscriber (subscriber polls at its own pace)
              [messages stored until consumed]

Kafka-style Log:
  Topic: "orders" (partitioned)
  Partition 0: [msg1, msg2, msg3, msg4, msg5...]
  Partition 1: [msg6, msg7, msg8, msg9...]
  Partition 2: [msg10, msg11, msg12...]
     |            |
  Consumer A  Consumer B (each reads from a partition)
\`\`\`

## 8. Real-World Flow Example

**E-commerce notification flow**:
1. User places order. Order service publishes \`order.placed\` to SNS topic.
2. SNS fans out to three SQS queues:
   - **Email queue**: Email service sends order confirmation (HTML email).
   - **SMS queue**: SMS service sends text alert for high-value orders.
   - **Analytics queue**: Analytics service logs order event.
3. If email service is down for maintenance, messages stay in SQS queue.
4. When email service comes back online, it processes the backlog.
5. A new "push notification" service is added — just subscribes to SNS topic. No change to order service.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
type MessageHandler = (message: any) => Promise<void>;

interface Subscription {
  topic: string;
  handler: MessageHandler;
  filter?: (message: any) => boolean;
}

class PubSubBroker {
  private topics: Map<string, Set<Subscription>> = new Map();
  private deadLetterQueue: Map<string, any[]> = new Map();

  createTopic(topic: string): void {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
      this.deadLetterQueue.set(topic, []);
    }
  }

  subscribe(topic: string, handler: MessageHandler, filter?: (msg: any) => boolean): void {
    if (!this.topics.has(topic)) this.createTopic(topic);
    this.topics.get(topic)!.add({ topic, handler, filter });
  }

  async publish(topic: string, message: any): Promise<void> {
    const matchedTopics = this.getMatchingTopics(topic);
    const deliveryPromises: Promise<void>[] = [];

    for (const subTopic of matchedTopics) {
      const subscriptions = this.topics.get(subTopic);
      if (!subscriptions) continue;

      for (const sub of subscriptions) {
        if (sub.filter && !sub.filter(message)) continue;

        deliveryPromises.push(
          sub.handler(message).catch(async (error) => {
            console.error(\`Delivery failed for topic \${topic}:\`, error);
            const dlq = this.deadLetterQueue.get(topic)!;
            dlq.push({ message, error: error.message, timestamp: Date.now() });
          })
        );
      }
    }

    await Promise.all(deliveryPromises);
  }

  private getMatchingTopics(topic: string): string[] {
    const matches: string[] = [];
    for (const t of this.topics.keys()) {
      if (t === topic) {
        matches.push(t);
      } else if (t.includes('*')) {
        const pattern = new RegExp('^' + t.replace(/\*/g, '.*').replace(/#/g, '.*') + '$');
        if (pattern.test(topic)) matches.push(t);
      }
    }
    return matches;
  }

  replayDeadLetters(topic: string): void {
    const dlq = this.deadLetterQueue.get(topic);
    if (!dlq || dlq.length === 0) return;

    const messages = [...dlq];
    this.deadLetterQueue.set(topic, []);
    for (const { message } of messages) {
      this.publish(topic, message);
    }
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Amazon SNS + SQS**: SNS for pub/sub fan-out, SQS for durable message queues. Used by Netflix, Airbnb, and Lyft for async event processing.
- **Apache Kafka**: Used by LinkedIn (activity feeds), Uber (real-time data pipeline), and Netflix (event streaming).
- **Google Pub/Sub**: Used by Twitter (data pipeline), Spotify (event-driven architecture), and Snapchat.
- **Redis Pub/Sub**: Lightweight, in-memory pub/sub. Used for real-time chat and presence by Stack Overflow.
- **NATS**: Cloud-native pub/sub used by Hulu, Baidu, and Pivotal for microservices communication.

## 11. Common Interview Questions

1. *What is the difference between pub/sub and message queues?*
2. *How does fan-out work in pub/sub?*
3. *Explain the push vs pull model in pub/sub systems.*
4. *How do you handle message ordering in a pub/sub system?*
5. *What is the problem with slow subscribers in pub/sub?*
6. *How does Kafka's topic partitioning enable parallelism?*
7. *Compare SNS, Kafka, and Redis Pub/Sub.*
8. *Design a pub/sub system for real-time notifications.*

## 12. Related Topics & Next Steps

- **Message Queues**: Competing consumers vs pub/sub fan-out.
- **Kafka Architecture**: Partitioned, durable pub/sub for stream processing.
- **Event-Driven Architecture**: Designing systems around events.
- **WebSockets**: Real-time pub/sub for browser clients.
- **Server-Sent Events**: Alternative to WebSockets for one-way pub/sub.
- **Next Lesson**: Kafka Architecture.`,
    estimatedMin: 23,
    difficulty: 'INTERMEDIATE',
    companies: ['Amazon SNS', 'Apache Kafka', 'Google Pub/Sub', 'Redis', 'NATS', 'LinkedIn'],
    tags: ['pubsub', 'publish-subscribe', 'event-driven', 'topics', 'fanout', 'messaging']
  },
  {
    id: 'lesson-05-07',
    slug: 'distributed-infrastructure-07-kafka-architecture',
    title: 'Kafka Architecture',
    content: `## 1. Quick Summary

**Apache Kafka** is a **distributed event streaming platform** designed for high-throughput, fault-tolerant, and durable message processing. Unlike traditional message brokers, Kafka uses an **append-only commit log** model — messages are stored on disk and can be replayed. Key concepts include **topics**, **partitions**, **producers**, **consumers**, **consumer groups**, and **brokers**. Kafka provides **ordered messages per partition**, **horizontal scalability** (add partitions/brokers), **durability** (replication across brokers), and **high throughput** (millions of messages/second). Kafka is used for **event sourcing**, **log aggregation**, **stream processing**, **metrics**, and **CDC (Change Data Capture)**. It was built at LinkedIn and open-sourced in 2011.

## 2. Definition

**Kafka Cluster**: A set of **brokers** (servers) that store and serve topic data.

**Topic**: A logical channel for messages. Topics are split into **partitions** for parallelism.

**Partition**: An ordered, immutable sequence of messages. Each message has a **offset** (unique ID within the partition).

**Producer**: Publishes messages to a topic partition (round-robin or by key).

**Consumer**: Reads messages from a topic partition starting from a specific offset.

**Consumer Group**: A set of consumers that split partition assignments. Each partition is assigned to exactly one consumer in a group (competing consumers).

**Broker**: A Kafka server that stores partitions and serves producer/consumer requests.

**ZooKeeper / KRaft**: Manages cluster metadata, leader election, and configuration. KRaft (Kafka Raft) removes ZooKeeper dependency (Kafka 2.8+).

## 3. Why It Exists / Problem It Solves

Traditional message brokers (RabbitMQ, ActiveMQ) have limitations:
- **Message removal after consumption**: Can't replay history.
- **Throughput limits**: Designed for moderate throughput (tens of K msg/s).
- **Tight coupling**: Message ordering is not guaranteed at high concurrency.

Kafka solves:
- **High throughput**: Millions of messages/second using sequential disk I/O and zero-copy.
- **Durability**: Messages persisted to disk, replicated across brokers.
- **Replayability**: Consumer can reset offset and reprocess messages.
- **Scalability**: Add partitions to scale horizontally.
- **Ordering**: Guaranteed order within a partition.
- **Stream processing**: Kafka Streams, ksqlDB for stateful processing.
- **Decoupling**: Producers and consumers operate independently.

## 4. When to Use It

| Scenario | Use Kafka? | Why |
|----------|-----------|------|
| **Event sourcing** | Yes | Append-only log is perfect for event storage |
| **Log aggregation** | Yes | Collect logs from many services into one stream |
| **Metrics / monitoring** | Yes | High throughput time-series data |
| **Stream processing** | Yes | Transform data in real-time (Kafka Streams) |
| **CDC (database change tracking)** | Yes | Debezium + Kafka captures DB changes |
| **Simple task queue** | No | Overkill; use RabbitMQ or SQS |
| **Low-latency messaging** (<10ms) | Maybe | Kafka latency is ~10ms; use NATS or Pulsar for sub-ms |
| **Small scale (<100 msg/s)** | No | Unnecessary complexity; use simpler broker |

## 5. When NOT to Use It / Tradeoffs

- **Operational complexity**: Requires ZooKeeper (or KRaft), careful configuration, monitoring.
- **Latency**: ~10ms for end-to-end delivery. Not suitable for real-time sub-ms use cases.
- **No per-message routing**: Kafka doesn't support flexible routing like AMQP exchanges.
- **Large message sizes**: Default max message size is 1MB. Larger messages require tuning.
- **Exactly-once semantics**: Complex to achieve across consumer/producer interactions.
- **ZooKeeper dependency** (pre-KRaft): Another distributed system to manage.
- **Consumer lag monitoring**: Consumers falling behind can go unnoticed.
- **Cost**: Scaling Kafka clusters requires significant hardware resources.

## 6. How It Works (Deep Mechanics)

**Write path**:
1. Producer sends a message to a topic with an optional key.
2. Partition assignment: key is hashed (consistent hashing) to determine partition. Without key, round-robin.
3. Broker receives message, appends to the partition log file on disk.
4. Broker replicates the message to follower replicas (in-Sync Replicas, ISR).
5. Producer receives acknowledgment: acks=0 (fire-and-forget), acks=1 (leader ack), acks=all (all ISRs ack).
6. Message is now available for consumers.

**Read path**:
1. Consumer subscribes to a topic, joins a consumer group.
2. Group coordinator assigns partitions to consumers (rebalancing).
3. Consumer fetches messages from assigned partitions starting from the committed offset.
4. Consumer processes messages, commits offset.
5. If consumer crashes, it resumes from the last committed offset.

**Log compaction**:
- Retain the latest value for each key (not all messages).
- Useful for restoring state: when a consumer restarts, it reads the compacted log to rebuild state.

## 7. Architecture Diagram (ASCII)

\`\`\`
Kafka Cluster:
  +----------+  +----------+  +----------+
  | Broker 1 |  | Broker 2 |  | Broker 3 |
  | Part 0:  |  | Part 0:  |  | Part 0:  |
  |  Leader  |  |  Follower|  |  Follower|
  | Part 1:  |  | Part 1:  |  | Part 1:  |
  |  Follower|  |  Leader  |  |  Follower|
  | Part 2:  |  | Part 2:  |  | Part 2:  |
  |  Follower|  |  Follower|  |  Leader  |
  +----------+  +----------+  +----------+
        |             |             |
  +--------------------------------------+
  |          ZooKeeper / KRaft           |
  | (controller, metadata, ISR)         |
  +--------------------------------------+

Topic with 4 Partitions, 2 Consumer Groups:
  Topic "orders": [P0]  [P1]  [P2]  [P3]
                    |     |     |     |
  Group "email":   [C1] [C1]  [C2]  [C2]  (2 consumers, 2 partitions each)
  Group "analytics":[C3] [C4]  [C3]  [C4]  (2 consumers, staggered)

Write Path:
  Producer -> Partition hashing -> Broker leader -> Log append -> ISR replication -> Ack
\`\`\`

## 8. Real-World Flow Example

**Real-time fraud detection pipeline**:
1. User makes a payment. Payment service publishes \`payment.events\` to Kafka.
2. Topic \`payment.events\` has 12 partitions (one per payment processor shard).
3. Fraud detection service runs as a consumer group with 6 consumers.
4. Each consumer reads from 2 partitions, runs ML model on each payment event.
5. Suspicious payments are published to \`fraud.alerts\` topic.
6. Alerting service consumes \`fraud.alerts\` and sends notifications.
7. All events are stored for 30 days. Fraud team can replay events to retrain models.
8. Throughput: 500K events/second with 3 brokers.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
import { Kafka, Producer, Consumer, EachMessageHandler } from 'kafkajs';

interface KafkaConfig {
  clientId: string;
  brokers: string[];
  groupId: string;
}

class KafkaEventBus {
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, Consumer> = new Map();

  constructor(config: KafkaConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
    });
    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async publish(topic: string, messages: Array<{ key?: string; value: any }>): Promise<void> {
    await this.producer.send({
      topic,
      messages: messages.map(m => ({
        key: m.key,
        value: JSON.stringify(m.value),
      })),
    });
  }

  async subscribe(topic: string, handler: (message: any) => Promise<void>): Promise<void> {
    const consumer = this.kafka.consumer({ groupId: \`\${topic}-group\` });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    const messageHandler: EachMessageHandler = async ({ message }) => {
      try {
        const value = JSON.parse(message.value!.toString());
        await handler(value);
        // Offset is automatically committed (autoCommit: true by default)
      } catch (error) {
        console.error(\`Failed to process message from \${topic}:\`, error);
        // Optionally publish to DLQ
        await this.publish(\`\${topic}.dlq\`, [{
          key: message.key?.toString(),
          value: { originalMessage: value, error: String(error) }
        }]);
      }
    };

    await consumer.run({ eachMessage: messageHandler });
    this.consumers.set(topic, consumer);
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    for (const consumer of this.consumers.values()) {
      await consumer.disconnect();
    }
  }
}
\`\`\`

## 10. Real Company Use Cases

- **LinkedIn**: Kafka was built at LinkedIn for activity feed, metrics, and log aggregation. Processes 7 trillion messages per day.
- **Uber**: Uses Kafka for real-time data pipeline. Processes 100B+ messages per day across 200+ Kafka clusters.
- **Netflix**: Uses Kafka for event streaming (4M events/second, 1.5PB/day). Powers their recommendation engine and monitoring pipeline.
- **Airbnb**: Uses Kafka for async workflows, event pipelines, and stream processing. 2M messages/second at peak.
- **Cloudflare**: Uses Kafka for analytics pipeline. Processes 5M+ events/second in their data plane.

## 11. Common Interview Questions

1. *How does Kafka achieve high throughput?*
2. *Explain Kafka's partition mechanism. How are partitions assigned to consumers?*
3. *What is a consumer group and how does it enable parallel consumption?*
4. *How does Kafka guarantee message ordering?*
5. *What is the difference between Kafka and RabbitMQ?*
6. *What does acks=all mean and how does it affect durability?*
7. *How does log compaction work in Kafka?*
8. *Design a Kafka-based event pipeline for a real-time analytics system.*

## 12. Related Topics & Next Steps

- **Kafka vs RabbitMQ vs SQS**: Choosing the right broker for your use case.
- **Kafka Streams**: Stream processing within Kafka.
- **ksqlDB**: SQL-based stream processing on Kafka.
- **Debezium**: Change Data Capture (CDC) with Kafka Connect.
- **Schema Registry**: Enforce Avro/Protobuf schemas for Kafka messages.
- **Next Lesson**: RabbitMQ vs Kafka vs SQS.`,
    estimatedMin: 28,
    difficulty: 'ADVANCED',
    companies: ['LinkedIn', 'Uber', 'Netflix', 'Airbnb', 'Cloudflare', 'Confluent'],
    tags: ['kafka', 'streaming', 'commit-log', 'partition', 'high-throughput', 'event-sourcing']
  },
  {
    id: 'lesson-05-08',
    slug: 'distributed-infrastructure-08-rabbitmq-vs-kafka-vs-sqs',
    title: 'RabbitMQ vs Kafka vs SQS',
    content: `## 1. Quick Summary

**RabbitMQ**, **Apache Kafka**, and **Amazon SQS** are the three most popular messaging systems, each with different design philosophies. **RabbitMQ** is a general-purpose message broker with flexible routing (AMQP), ideal for complex routing patterns and transactional workloads. **Kafka** is a distributed streaming platform built for high-throughput, durable, replayable event logs — perfect for stream processing and event sourcing. **SQS** is a fully-managed, highly-available queue service from AWS — simplest to operate, with infinite durability but limited features. The choice depends on your need for **throughput**, **routing flexibility**, **operational overhead**, **message ordering**, and **replayability**.

## 2. Definition

| Feature | RabbitMQ | Kafka | SQS |
|---------|----------|-------|-----|
| **Type** | Message broker | Streaming platform | Message queue |
| **Model** | Queue + Exchange | Append-only log | Queue |
| **Delivery** | Push | Pull | Pull (long poll) |
| **Persistence** | Disk + Memory | Disk (log) | Disk (AWS) |
| **Ordering** | Per queue | Per partition | Best-effort (FIFO queue available) |
| **Throughput** | 50K msg/s | Millions msg/s | Unlimited (autoscale) |
| **Latency** | Microseconds | ~10ms | ~10-100ms |
| **Routing** | Flexible (AMQP) | Topic-based | Topic-based (SNS + SQS) |

## 3. Why It Exists / Problem It Solves

**RabbitMQ** solves the need for a reliable, feature-rich message broker with flexible routing patterns (topic, direct, fanout, headers exchanges). Ideal for applications requiring sophisticated routing logic.

**Kafka** solves the need for a high-throughput, durable, and replayable event log. Designed for real-time data pipelines and stream processing where message loss is unacceptable and history matters.

**SQS** solves the need for a simple, fully-managed, infinitely scalable queue with zero operational overhead. The easiest way to decouple AWS services without managing infrastructure.

## 4. When to Use It

| Use Case | Best Choice | Why |
|----------|-------------|-----|
| **Complex routing** (order processing with multiple paths) | RabbitMQ | AMQP exchanges, bindings, routing keys |
| **High-throughput streaming** (100K+ msg/s) | Kafka | Partitioned log, sequential I/O |
| **Simple task queue** (background jobs) | SQS | Easiest to set up, autoscaling |
| **Event sourcing / audit log** | Kafka | Append-only, replayable log |
| **Real-time analytics** | Kafka | Stream processing with Kafka Streams |
| **Microservices RPC** | RabbitMQ | Flexible routing, request/reply pattern |
| **Serverless integration** | SQS | Lambda triggers, SNS integration |
| **Financial transactions** | RabbitMQ | Durable queues, confirmations, transactions |

## 5. When NOT to Use It / Tradeoffs

**RabbitMQ**:
- Lower throughput than Kafka (50K vs millions msg/s).
- Messages removed after consumption — no replay.
- Clustering and HA setup is complex (mirrored queues, quorum queues).
- Memory management — can crash under load if queues grow unbounded.

**Kafka**:
- Higher latency (~10ms) compared to RabbitMQ (μs).
- Complex operations — needs ZooKeeper/KRaft, careful disk sizing, partition tuning.
- No per-message selective routing — only topic-based.
- Larger infrastructure footprint (JVM-based brokers need significant memory).

**SQS**:
- Higher latency (~10-100ms) and less predictable.
- No routing — single queue, no exchanges.
- Poll-based only — higher latency than push (RabbitMQ).
- Locked to AWS ecosystem (no on-prem, no other cloud).
- Less control — can't tune performance or durability.
- 256KB max message size (extended client goes to 2GB with S3).

## 6. How It Works (Deep Mechanics)

**RabbitMQ Flow**:
1. Producer publishes to exchange with routing key.
2. Exchange matches routing key to queue bindings.
3. Message is stored in the queue (memory or disk).
4. RabbitMQ pushes message to subscribed consumer(s).
5. Consumer processes and sends acknowledgment.
6. If consumer crashes, message goes to another consumer or dead letter queue.

**Kafka Flow**:
1. Producer sends message to topic partition.
2. Broker appends message to partition log (sequential disk write).
3. Message is replicated to in-sync replicas (ISR).
4. Consumer fetches messages from partition (pull model).
5. Consumer commits offset (auto or manual).
6. Messages remain in the log for the configured retention period (days/weeks).

**SQS Flow**:
1. Producer sends message to SQS queue URL (HTTP/S).
2. AWS stores message durably across multiple AZs.
3. Consumer polls for messages (ReceiveMessage).
4. Consumer processes and deletes message (DeleteMessage).
5. If consumer doesn't delete within visibility timeout, message reappears.
6. After max retries, message goes to DLQ.

## 7. Architecture Diagram (ASCII)

\`\`\`
RabbitMQ Flow:
  Producer -> [Exchange] -> Bindings -> [Queue] -> Consumer (push)
                                      -> [Queue] -> Consumer
                   |--- routing key match ---|

Kafka Flow:
  Producer -> [Topic/Partition] <- Consumer (pull, offset)
              |--- append-only log ---|

SQS Flow:
  Producer -> [SQS Queue] <- Consumer (pull, delete)
              |--- HTTP API ---|
\`\`\`

## 8. Real-World Flow Example

**E-commerce multi-channel processing**:
1. User places order. System needs to: send email, update analytics, process payment, update inventory.
2. With **RabbitMQ**: Order service publishes to \`order.created\` topic exchange. Email queue, analytics queue, and payment queue each bind with appropriate routing keys. Each queue scales independently.
3. With **Kafka**: Order service publishes to \`orders\` topic. Email consumer, analytics consumer, and payment consumer each read from the topic (different consumer groups). Each consumer stores its own offset — can replay if needed.
4. With **SQS**: Order service publishes to SNS topic. SNS fans out to email SQS queue, analytics SQS queue, payment SQS queue. Each queue triggers a Lambda function. Simplest to operate but highest latency.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// Message broker abstraction (strategy pattern)
interface MessageBroker {
  publish(topic: string, message: any): Promise<void>;
  subscribe(topic: string, handler: (msg: any) => Promise<void>, options?: any): Promise<void>;
}

// RabbitMQ adapter (simplified with amqplib)
class RabbitMQBroker implements MessageBroker {
  private connection: any;
  private channel: any;

  constructor(private url: string) {}

  async connect(): Promise<void> {
    const amqp = require('amqplib');
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();
  }

  async publish(topic: string, message: any): Promise<void> {
    await this.channel.assertExchange(topic, 'topic', { durable: true });
    this.channel.publish(topic, topic, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      deliveryMode: 2,
    });
  }

  async subscribe(topic: string, handler: (msg: any) => Promise<void>): Promise<void> {
    await this.channel.assertExchange(topic, 'topic', { durable: true });
    const { queue } = await this.channel.assertQueue('', { exclusive: true });
    await this.channel.bindQueue(queue, topic, topic);
    await this.channel.consume(queue, async (msg: any) => {
      if (msg) {
        try {
          await handler(JSON.parse(msg.content.toString()));
          this.channel.ack(msg);
        } catch {
          this.channel.nack(msg, false, true);
        }
      }
    });
  }
}

// Kafka adapter (simplified with kafkajs)
class KafkaBroker implements MessageBroker {
  private kafka: any;
  private producer: any;
  private consumers: Map<string, any> = new Map();

  constructor(private config: { clientId: string; brokers: string[] }) {
    const { Kafka } = require('kafkajs');
    this.kafka = new Kafka(config);
    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async publish(topic: string, message: any): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }

  async subscribe(topic: string, handler: (msg: any) => Promise<void>): Promise<void> {
    const consumer = this.kafka.consumer({ groupId: \`\${topic}-group\` });
    await consumer.connect();
    await consumer.subscribe({ topic });
    await consumer.run({
      eachMessage: async ({ message }: any) => {
        await handler(JSON.parse(message.value.toString()));
      },
    });
    this.consumers.set(topic, consumer);
  }
}

// SQS adapter (simplified with aws-sdk)
class SQSBroker implements MessageBroker {
  private sqs: any;

  constructor(private queueUrl: string) {
    const { SQS } = require('@aws-sdk/client-sqs');
    this.sqs = new SQS({ region: 'us-east-1' });
  }

  async publish(topic: string, message: any): Promise<void> {
    await this.sqs.sendMessage({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
    });
  }

  async subscribe(topic: string, handler: (msg: any) => Promise<void>): Promise<void> {
    const pollLoop = async () => {
      const result = await this.sqs.receiveMessage({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // long-poll
      });

      if (result.Messages) {
        for (const msg of result.Messages) {
          try {
            await handler(JSON.parse(msg.Body));
            await this.sqs.deleteMessage({
              QueueUrl: this.queueUrl,
              ReceiptHandle: msg.ReceiptHandle,
            });
          } catch (error) {
            console.error('SQS processing error:', error);
          }
        }
      }
      pollLoop(); // continue polling
    };
    pollLoop();
  }
}
\`\`\`

## 10. Real Company Use Cases

- **RabbitMQ**: Bloomberg (real-time financial data), Reddit (notification delivery), MIT (academic research), NASA (satellite data), VMware.
- **Kafka**: LinkedIn (built it), Uber (data pipeline), Netflix (event streaming), Airbnb (async workflows), Pinterest (analytics).
- **SQS**: Netflix (decoupling video transcoding pipeline), Airbnb (async task processing), Expedia (booking workflows), Capital One (serverless event processing).

## 11. Common Interview Questions

1. *Compare RabbitMQ vs Kafka vs SQS. When would you choose each?*
2. *How does Kafka's pull model differ from RabbitMQ's push model?*
3. *What are the tradeoffs of managed (SQS) vs self-hosted (RabbitMQ/Kafka) message brokers?*
4. *How does message ordering work in each system?*
5. *How does SQS's visibility timeout work?*
6. *What is a dead letter queue and how do you configure it in each broker?*
7. *Can you use Kafka for task queues? What are the tradeoffs?*
8. *Design a hybrid messaging system using both RabbitMQ and Kafka.*

## 12. Related Topics & Next Steps

- **Service Discovery**: Finding services without hardcoded addresses.
- **Event-Driven Architecture**: Designing systems around events.
- **Stream Processing**: Kafka Streams, Flink, Spark Streaming.
- **Serverless Messaging**: SQS + Lambda for event-driven compute.
- **Hybrid Approaches**: Using RabbitMQ for routing, Kafka for streaming.
- **Next Lesson**: Service Discovery.`,
    estimatedMin: 25,
    difficulty: 'INTERMEDIATE',
    companies: ['RabbitMQ', 'Apache Kafka', 'AWS SQS', 'LinkedIn', 'Netflix', 'Bloomberg'],
    tags: ['comparison', 'kafka', 'rabbitmq', 'sqs', 'messaging', 'broker-selection']
  },
  {
    id: 'lesson-05-09',
    slug: 'distributed-infrastructure-09-service-discovery',
    title: 'Service Discovery',
    content: `## 1. Quick Summary

**Service discovery** enables services in a distributed system to find each other without hardcoded addresses. In a dynamic environment where services scale up/down, fail, and move across hosts, service discovery provides a **registry** where services **register** their network locations and **clients** look them up. There are two main patterns: **client-side discovery** (client queries registry, picks an instance) and **server-side discovery** (router/load balancer queries registry). Key implementations include **etcd**, **Consul**, **Apache ZooKeeper**, **Eureka**, and **DNS-based discovery** (SRV records). Modern container environments often use **Kubernetes DNS** (kube-dns/CoreDNS) as the service discovery mechanism.

## 2. Definition

**Service Registry**: A database of available service instances and their network addresses (IP:port).

**Registration**: The process of a service instance adding its address to the registry (and sending heartbeats to stay registered).

**Discovery**: The process of a client finding available service instances for a given service name.

**Patterns**:
- **Client-side discovery**: Client queries registry, gets list of instances, selects one (Round Robin, Least Connections, etc.). Use libraries like Netflix Eureka Client.
- **Server-side discovery**: Client sends request to a load balancer (or API gateway), which queries the registry and forwards to an instance.

**Self-registration**: Service instance registers itself on startup and sends heartbeats.

**Third-party registration**: A registrar process (e.g., Kubernetes Pod watcher) handles registration on behalf of services.

## 3. Why It Exists / Problem It Solves

Without service discovery:
- **Hardcoded addresses**: Configuration files with IP:port pairs must be updated whenever services change.
- **Brittle deployments**: Scaling up requires updating all clients.
- **Failed instances**: Dead instances continue to receive traffic until clients are manually updated.
- **Environment-specific configs**: Different addresses for dev, staging, prod — error-prone.

Service discovery solves:
- **Dynamic registration**: Services announce themselves when they start.
- **Health-based routing**: Only healthy instances receive traffic.
- **Zero-downtime deployments**: Rolling updates work because new instances register, old ones deregister.
- **Self-healing**: Failed instances are automatically removed from the registry.
- **Multi-DC support**: Service registry spans multiple data centers.

## 4. When to Use It

| Scenario | Discovery Pattern | Tool |
|----------|------------------|------|
| **Microservices (self-managed VMs)** | Client-side | Eureka / Consul |
| **Microservices (Kubernetes)** | Server-side (DNS) | CoreDNS |
| **Cloud-native (AWS/GCP)** | Server-side (LB) | AWS ALB + target groups |
| **Service mesh** | Sidecar-based | Istio + Envoy + Registry |
| **High-scale discovery (>100K services)** | Client-side with caching | ZooKeeper / etcd |
| **Small number of services (<10)** | Manual / config file | Environment variables |

## 5. When NOT to Use It / Tradeoffs

- **External service registry adds latency**: Each discovery lookup adds a network round trip. Mitigate with client-side caching.
- **Stale cache**: Cached registry entries may point to failed instances. Need passive health checking.
- **Registry becomes a SPOF**: If the registry is down, new services can't register, and clients can't discover. Run as a cluster (Raft/Paxos).
- **Consistency vs availability tradeoff**: Strongly consistent registries (etcd, ZooKeeper) may be unavailable during partition. Eventually consistent (Eureka) may serve stale data.
- **Client library churn**: Client-side discovery requires all services to use compatible libraries.
- **Complexity**: Adding service discovery increases system complexity. Don't use it if you don't need dynamic scaling.

## 6. How It Works (Deep Mechanics)

**Client-side discovery flow** (using Eureka):
1. Service A starts, registers with Eureka server (heartbeat every 30s).
2. Service B (client of A) queries Eureka for instances of A.
3. Eureka returns list of A instances (IP:port).
4. Service B caches the list locally (up to 30s).
5. Service B uses load balancing (e.g., Round Robin) to select an instance.
6. If selected instance fails, B tries the next cached instance.
7. Eureka removes instances that miss 3 heartbeats (90s default).

**Server-side discovery flow** (using AWS ALB):
1. Service A starts, registers with an EC2 Auto Scaling Group.
2. ASG attaches the instance to an ALB target group.
3. ALB automatically discovers new instances via target group health checks.
4. Client sends request to ALB DNS name.
5. ALB picks a healthy target and forwards the request.
6. When instance terminates, ASG removes it from target group.

**Service Mesh discovery flow** (using Istio):
1. Service A deploys with a sidecar Envoy proxy.
2. Envoy connects to Istio's control plane (Pilot).
3. Pilot watches Kubernetes services and endpoints.
4. Pilot pushes an updated service model to Envoy.
5. When Service A wants to call Service B, traffic goes through Envoy.
6. Envoy has up-to-date routing information for Service B (no external lookup).
7. This is the most powerful but most complex approach.

## 7. Architecture Diagram (ASCII)

\`\`\`
Client-side Discovery:
  Service A             Eureka
    |                     |
    |-- Register ------->|
    |<-- Heartbeat ----->|
    |                     |
  Service B               |
    |                     |
    |-- Query instances ->|
    |<-- [A1, A2, A3] ---|
    |                     |
    |-- HTTP -> A1        |
    |-- HTTP -> A2 (fail) |
    |-- HTTP -> A3 (retry)|

Server-side Discovery (ALB):
  Client -> ALB (DNS: myapp.alb.aws.com)
                |
         Target Group
           |    |    |
          A1   A2   A3
         (auto-registered via ASG)

Service Mesh Discovery (Istio):
  Service A [Envoy] ---> [Envoy] Service B
              |              |
              +- Pilot -----+
                 (service model pushed to Envoys)
\`\`\`

## 8. Real-World Flow Example

**Microservice checkout flow with Eureka**:
1. Order Service starts on 10.0.1.5:8080, registers with Eureka.
2. Payment Service starts on 10.0.2.10:8080, registers with Eureka.
3. Checkout Service (client) queries Eureka for \`payment-service\`.
4. Eureka returns 3 instances: 10.0.2.10:8080, 10.0.2.11:8080, 10.0.2.12:8080.
5. Checkout Service caches this list and uses Round Robin for each request.
6. Payment Service instance 10.0.2.11 crashes. Eureka misses 3 heartbeats, removes it.
7. Checkout Service's next request skips the dead instance (cache refresh picks up change).
8. New Payment Service instance 10.0.2.13 starts, registers with Eureka.
9. Checkout Service discovers it on the next cache refresh.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
interface ServiceInstance {
  serviceId: string;
  host: string;
  port: number;
  metadata: Record<string, string>;
  healthy: boolean;
}

class ServiceRegistry {
  private services: Map<string, Set<ServiceInstance>> = new Map();
  private heartbeats: Map<string, number> = new Map(); // instanceId -> last heartbeat
  private readonly heartbeatTimeout = 90000; // 90 seconds

  register(instance: ServiceInstance): void {
    const key = \`\${instance.serviceId}:\${instance.host}:\${instance.port}\`;
    if (!this.services.has(instance.serviceId)) {
      this.services.set(instance.serviceId, new Set());
    }
    this.services.get(instance.serviceId)!.add(instance);
    this.heartbeats.set(key, Date.now());
    console.log(\`Registered \${key}\`);
  }

  heartbeat(instanceId: string): void {
    this.heartbeats.set(instanceId, Date.now());
  }

  getInstances(serviceId: string): ServiceInstance[] {
    const instances = this.services.get(serviceId);
    if (!instances) return [];
    const now = Date.now();
    return [...instances].filter(inst => {
      const key = \`\${inst.serviceId}:\${inst.host}:\${inst.port}\`;
      const lastBeat = this.heartbeats.get(key) || 0;
      const isHealthy = (now - lastBeat) < this.heartbeatTimeout;
      inst.healthy = isHealthy;
      return isHealthy;
    });
  }

  deregister(instance: ServiceInstance): void {
    const instances = this.services.get(instance.serviceId);
    if (instances) {
      instances.delete(instance);
      const key = \`\${instance.serviceId}:\${instance.host}:\${instance.port}\`;
      this.heartbeats.delete(key);
      console.log(\`Deregistered \${key}\`);
    }
  }

  // Run cleanup periodically
  startCleanup(intervalMs = 30000): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, lastBeat] of this.heartbeats) {
        if ((now - lastBeat) > this.heartbeatTimeout) {
          const [serviceId, host, port] = key.split(':');
          const instances = this.services.get(serviceId);
          if (instances) {
            for (const inst of instances) {
              if (inst.host === host && inst.port === parseInt(port)) {
                instances.delete(inst);
                console.log(\`Evicted unhealthy instance: \${key}\`);
                break;
              }
            }
          }
          this.heartbeats.delete(key);
        }
      }
    }, intervalMs);
  }
}

class ServiceDiscoveryClient {
  private cache: Map<string, { instances: ServiceInstance[]; timestamp: number }> = new Map();
  private readonly cacheTtl = 30000; // 30 seconds

  constructor(private registry: ServiceRegistry) {}

  getInstances(serviceId: string): ServiceInstance[] {
    const cached = this.cache.get(serviceId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTtl) {
      return cached.instances;
    }
    const instances = this.registry.getInstances(serviceId);
    this.cache.set(serviceId, { instances, timestamp: Date.now() });
    return instances;
  }

  async callService<T>(serviceId: string, request: () => Promise<T>): Promise<T> {
    const instances = this.getInstances(serviceId);
    if (instances.length === 0) throw new Error(\`No instances found for \${serviceId}\`);

    // Try each instance with simple retry
    for (const instance of instances) {
      try {
        return await request();
      } catch (error) {
        console.error(\`Failed to call \${instance.host}:\${instance.port}:\`, error);
        continue;
      }
    }
    throw new Error(\`All instances of \${serviceId} failed\`);
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Netflix Eureka**: Built for elastic cloud environments. Handles thousands of service instances. Each instance has a cached registry locally for low-latency discovery.
- **Consul**: Used by Lyft, Segment, and Citadel for service discovery + KV store + health checking. Consul's gossip protocol enables decentralized health checking.
- **etcd + Kubernetes**: CoreDNS queries etcd for service endpoints. Kubernetes Services map to etcd-backed endpoints.
- **ZooKeeper**: Used by Apache Kafka (cluster metadata), Apache Storm, and Solr. ZooKeeper provides strongly consistent service discovery with watches.
- **CockroachDB**: Uses gossip protocol for service discovery (no external registry needed). Each node knows about all other nodes.

## 11. Common Interview Questions

1. *Explain client-side vs server-side service discovery. Tradeoffs?*
2. *How does Netflix's Eureka handle service registration and health checks?*
3. *How does Kubernetes service discovery work (DNS and endpoints)?*
4. *What is the difference between Consul, etcd, and ZooKeeper?*
5. *How do you handle stale cache entries in client-side discovery?*
6. *What happens to in-flight requests when a service instance is deregistered?*
7. *How does service mesh discovery differ from traditional discovery?*
8. *Design a service discovery system for a multi-region deployment.*

## 12. Related Topics & Next Steps

- **Service Mesh**: Service discovery + traffic management + security.
- **Consul vs etcd vs ZooKeeper**: Comparing strongly consistent registries.
- **DNS SRV Records**: DNS-based service discovery.
- **API Gateway**: Centralized entry point with discovery integration.
- **Kubernetes Services**: ClusterIP, NodePort, LoadBalancer service types.
- **Next Lesson**: Service Mesh.`,
    estimatedMin: 25,
    difficulty: 'INTERMEDIATE',
    companies: ['Netflix', 'Consul', 'Kubernetes', 'Apache ZooKeeper', 'CockroachDB', 'Lyft'],
    tags: ['service-discovery', 'eureka', 'consul', 'etcd', 'registry', 'dns']
  },
  {
    id: 'lesson-05-10',
    slug: 'distributed-infrastructure-10-service-mesh',
    title: 'Service Mesh',
    content: `## 1. Quick Summary

A **service mesh** is a dedicated infrastructure layer that handles **service-to-service communication** in a microservices architecture. It moves traffic management, security, and observability concerns out of application code and into a **sidecar proxy** running alongside each service instance. The mesh provides **load balancing**, **service discovery**, **traffic routing**, **circuit breaking**, **mTLS encryption**, **telemetry**, and **access control** — all without modifying service code. **Istio** (most popular), **Linkerd**, **Consul Connect**, and **AWS App Mesh** are leading implementations. The service mesh is typically composed of a **data plane** (sidecar proxies) and a **control plane** (configuration and management).

## 2. Definition

**Data Plane**: The network of sidecar proxies (Envoy, Linkerd-proxy) that intercept all traffic in and out of each service instance.

**Control Plane**: The management layer that configures the data plane. Distributes routing rules, security policies, and telemetry configuration (Istiod, Linkerd control plane).

**Sidecar Proxy**: A lightweight proxy deployed alongside each service instance that handles all network traffic.

**mTLS (Mutual TLS)**: Both client and server present certificates. All service mesh traffic is encrypted by default.

**Service Mesh Interface (SMI)**: An abstraction layer for using different service mesh implementations with Kubernetes.

**Key features**:
- **Traffic splitting**: Canary deployments, blue-green, A/B testing.
- **Circuit breaking**: Automatically stop traffic to failing instances.
- **Retry and timeout**: Automatic retries with exponential backoff.
- **Observability**: Metrics (latency, traffic volume, errors), distributed tracing, access logs.
- **Security**: mTLS, authorization policies, fine-grained access control.

## 3. Why It Exists / Problem It Solves

Without a service mesh:
- **Tight coupling**: Each service must implement (or use a library for) circuit breakers, retries, tracing, and metrics.
- **Library lock-in**: Polyglot environments need multiple libraries for the same functionality (Java, Go, Python, Node.js).
- **Config drift**: Different services have different versions of libraries with different configuration.
- **No universal observability**: Each service emits metrics and traces differently.

Service mesh solves:
- **Centralized control**: All traffic policies defined centrally, applied consistently.
- **Polyglot transparency**: The mesh handles all cross-cutting concerns — services can be in any language.
- **Granular traffic management**: Route percentage of traffic to different versions (canary), inject faults for testing.
- **Zero-trust security**: mTLS between all services, with fine-grained authorization policies.
- **Deep observability**: Automatic metrics (RED metrics: Rate, Errors, Duration), distributed tracing, and access logs.

## 4. When to Use It

| Scenario | Use Mesh? | Why |
|----------|-----------|-----|
| **Microservices with multiple languages** | Yes | Mesh handles cross-cutting concerns uniformly |
| **Kubernetes environment** | Yes | Native K8s integration (Istio, Linkerd) |
| **Compliance/security requirements** | Yes | Automatic mTLS, audit logging, access policies |
| **Canary deployments needed** | Yes | Traffic splitting at the mesh level |
| **Small number of services (<10)** | Maybe | Overhead of mesh may not be justified |
| **Monolithic application** | No | No service-to-service communication to manage |
| **Serverless (Lambda)** | No | No sidecar model in Lambda |

## 5. When NOT to Use It / Tradeoffs

- **Added latency**: Each request passes through a sidecar proxy (l7 processing). 1-5ms added latency per hop.
- **Resource overhead**: Each sidecar uses CPU and memory (Envoy: ~50MB RAM, 1 vCPU core). Multiply by number of service instances.
- **Operational complexity**: Istio has a steep learning curve. Debugging mesh issues requires understanding Envoy, CRDs, and control plane components.
- **Debugging complexity**: Observing traffic through multiple proxies makes debugging harder.
- **Not all features are stable**: Some Istio features are alpha/beta. Canary upgrades add complexity.
- **mTLS overhead**: TLS handshake per connection adds CPU overhead.
- **Simpler alternatives exist**: For basic needs, a service mesh is overkill. Use a library (e.g., Hystrix) or a lightweight proxy.

## 6. How It Works (Deep Mechanics)

**Sidecar injection**:
1. When a pod is created in a mesh-enabled namespace, the mesh's mutating webhook injects a sidecar container.
2. The sidecar (Envoy) runs in the same pod, sharing the network namespace.
3. Using iptables rules (Istio) or transparent proxy, all inbound and outbound traffic is redirected to the sidecar.
4. The sidecar has a listener for inbound traffic and a cluster for outbound traffic.

**Istio architecture**:
- **Istiod** (control plane): Combines Pilot (service discovery + traffic management), Citadel (certificate management), and Galley (configuration validation).
- **Envoy proxies** (data plane): All traffic goes through Envoy, which receives configuration from Istiod via the xDS API.
- **VirtualService**: Defines routing rules (versions, weights, headers).
- **DestinationRule**: Defines traffic policies (load balancing, circuit breaking, mTLS).
- **PeerAuthentication**: Defines mTLS mode (STRICT, PERMISSIVE, DISABLE).

**Traffic flow**:
1. Service A (with Envoy) wants to call Service B.
2. Envoy intercepts the outbound request (via iptables).
3. Envoy looks up the destination in its service mesh configuration.
4. Envoy applies traffic policies (circuit breakers, retries, timeouts).
5. Envoy establishes mTLS connection to Service B's Envoy.
6. Service B's Envoy receives the request, applies inbound policies, and forwards to the Service B application.
7. Both Envoys emit metrics and trace spans.

## 7. Architecture Diagram (ASCII)

\`\`\`
Service Mesh Architecture:
  +--------+   +---------+   +--------+   +---------+
  | Istiod |   | Control |   | Mixer  |   | Galley  |
  | (Pilot)|-->|  Plane   |<--| (Obs)  |   | (Config)|
  +--------+   +---------+   +--------+   +---------+
       |                           |
  +----+---------+-----------------+
  |              |
  v              v
+----------+  +----------+
| Envoy A  |  | Envoy B  |  Data Plane
| sidecar  |  | sidecar  |
+----------+  +----------+
  ^    |        ^    |
  |    |        |    |
Service A     Service B
  (pod)         (pod)

Without Mesh:
  Service A --(TCP)--> Service B

With Mesh:
  Service A --(iptables)--> Envoy A --(mTLS)--> Envoy B --(iptables)--> Service B
\`\`\`

## 8. Real-World Flow Example

**Canary deployment with Istio**:
1. Service B has two versions: v1 (stable) and v2 (canary).
2. VirtualService defines: 90% traffic to v1, 10% to v2.
3. Service A calls Service B. Envoy A intercepts request, sees destination is Service B.
4. Envoy A applies the VirtualService rule: 90% probability routes to v1 subset, 10% to v2.
5. Envoy A establishes mTLS to the chosen subset's Envoy.
6. Metrics for both versions are captured (requests, latency, errors).
7. After verifying v2 is stable, the weight is gradually shifted to 100% v2.
8. mTLS ensures all traffic is encrypted, even within the cluster.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// Note: This is a conceptual simulation of service mesh sidecar behavior
interface MeshConfig {
  destinationService: string;
  subsets: Array<{ name: string; version: string; weight: number }>;
  circuitBreaker: {
    maxConnections: number;
    maxPendingRequests: number;
    maxRetries: number;
  };
  retryConfig: {
    attempts: number;
    perTryTimeout: number;
  };
}

class SidecarProxy {
  private config: MeshConfig;

  constructor(private serviceName: string) {
    // config would be received from control plane (xDS)
    this.config = this.fetchConfig();
  }

  async interceptOutbound(destination: string, request: any): Promise<any> {
    const destinationConfig = this.getConfigForDestination(destination);
    if (!destinationConfig) {
      // Direct routing (no mesh)
      return this.forward(request, destination);
    }

    // 1. Apply circuit breaker
    if (this.isCircuitOpen(destination)) {
      throw new Error(\`Circuit open for \${destination}\`);
    }

    // 2. Apply retry with timeout
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < destinationConfig.retryConfig.attempts; attempt++) {
      try {
        // 3. Select subset based on traffic weights
        const target = this.selectTarget(destinationConfig.subsets);

        // 4. Establish mTLS connection (simulated)
        const mtlsContext = await this.establishMTLS(destination, target.version);

        // 5. Forward with headers
        request.headers['x-request-id'] = crypto.randomUUID();
        request.headers['x-envoy-attempt-count'] = String(attempt + 1);

        const response = await this.forwardWithTimeout(
          request,
          target,
          destinationConfig.retryConfig.perTryTimeout
        );

        // 6. Collect telemetry
        this.recordMetrics(destination, target, response);

        return response;

      } catch (error) {
        lastError = error as Error;
        this.recordError(destination, error);
        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 100);
      }
    }
    throw lastError;
  }

  async interceptInbound(request: any, handler: (req: any) => Promise<any>): Promise<any> {
    // 1. Verify mTLS
    if (!this.verifyClientCertificate(request)) {
      throw new Error('mTLS verification failed');
    }

    // 2. Apply authorization policy
    if (!this.authorize(request)) {
      throw new Error('Authorization denied');
    }

    // 3. Call service handler
    const response = await handler(request);

    // 4. Add telemetry headers
    response.headers['x-envoy-upstream-service-time'] = String(performance.now());

    return response;
  }

  private fetchConfig(): MeshConfig {
    // In real implementation, this receives config via xDS
    return {
      destinationService: 'service-b',
      subsets: [
        { name: 'stable', version: 'v1', weight: 90 },
        { name: 'canary', version: 'v2', weight: 10 },
      ],
      circuitBreaker: { maxConnections: 100, maxPendingRequests: 50, maxRetries: 3 },
      retryConfig: { attempts: 3, perTryTimeout: 5000 },
    };
  }

  private selectTarget(subsets: Array<{ name: string; version: string; weight: number }>): any {
    const random = Math.random() * 100;
    let cumulativeWeight = 0;
    for (const subset of subsets) {
      cumulativeWeight += subset.weight;
      if (random <= cumulativeWeight) return subset;
    }
    return subsets[subsets.length - 1];
  }

  private isCircuitOpen(destination: string): boolean {
    return false; // simplified
  }

  private async establishMTLS(destination: string, version: string): Promise<any> {
    return {}; // simplified
  }

  private async forwardWithTimeout(request: any, target: any, timeout: number): Promise<any> {
    return {}; // simplified
  }

  private recordMetrics(destination: string, target: any, response: any): void {
    // simplified
  }

  private recordError(destination: string, error: any): void {
    // simplified
  }

  private verifyClientCertificate(request: any): boolean {
    return true; // simplified
  }

  private authorize(request: any): boolean {
    return true; // simplified
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
\`\`\`

## 10. Real Company Use Cases

- **eBay**: Uses Istio for multi-cluster service mesh. Reduces latency by 40% through intelligent routing.
- **Airbnb**: Built SmartStack (pre-mesh), now evaluating Istio for service mesh. Handles millions of requests/day.
- **Lyft**: Built Envoy proxy, uses it as the data plane for their service mesh. Manages 10K+ services.
- **Bloomberg**: Uses Consul Connect for service mesh in financial applications. Strong security requirements (mTLS, fine-grained ACLs).
- **HP**: Uses Istio for their public cloud platform. Manages multi-tenant, multi-region service mesh.

## 11. Common Interview Questions

1. *What is a service mesh and what problem does it solve?*
2. *Explain the difference between the data plane and control plane.*
3. *How does Istio's sidecar injection work?*
4. *What is mTLS and how does it secure service-to-service communication?*
5. *How does a service mesh handle canary deployments?*
6. *What are the performance tradeoffs of using a service mesh?*
7. *Compare Istio vs Linkerd vs Consul Connect.*
8. *Design a service mesh rollout strategy for a 500-service microservice architecture.*

## 12. Related Topics & Next Steps

- **Sidecar Proxy Pattern**: Envoy, Linkerd-proxy, NGINX.
- **Istio Architecture**: Pilot, Citadel, Galley components.
- **Envoy Proxy**: xDS API, L4/L7 features, HTTP/2, gRPC support.
- **Kubernetes Gateway API**: Evolution of Ingress, integrates with service mesh.
- **Zero-Trust Architecture**: mTLS, SPIFFE, SPIRE identity.
- **Next Lesson**: Containers & Docker.`,
    estimatedMin: 28,
    difficulty: 'ADVANCED',
    companies: ['Istio', 'Envoy', 'Linkerd', 'Consul', 'eBay', 'Lyft'],
    tags: ['service-mesh', 'istio', 'envoy', 'sidecar', 'mtls', 'traffic-management']
  },
  {
    id: 'lesson-05-11',
    slug: 'distributed-infrastructure-11-containers-and-docker',
    title: 'Containers & Docker',
    content: `## 1. Quick Summary

**Containers** are lightweight, portable, isolated environments that package an application with all its dependencies (code, runtime, libraries, config). **Docker** popularized containerization by providing a simple API and tooling for building, shipping, and running containers. Containers share the host OS kernel (unlike VMs), making them **smaller**, **faster to start**, and **more efficient** than virtual machines. Docker uses **namespaces** (process isolation) and **cgroups** (resource limits) to provide isolation. Key concepts include **Docker images** (read-only templates), **containers** (running instances), **Dockerfiles** (build instructions), **layers** (cached filesystem changes), **registries** (image storage), and **orchestration** (running containers at scale).

## 2. Definition

**Container**: A standard unit of software that packages code and dependencies. Containers run as isolated processes on a shared OS kernel.

**Docker Image**: A lightweight, standalone, executable package that includes everything needed to run an application. Built from a Dockerfile.

**Dockerfile**: A text file with instructions to build a Docker image (FROM, RUN, COPY, CMD, etc.).

**Container vs VM**:
- **VM**: Each VM runs its own OS (Guest OS) on top of a hypervisor. Heavy (GBs), boots in minutes.
- **Container**: Shares the host OS kernel. Lightweight (MBs), boots in milliseconds.

**Registry**: A repository for Docker images. Docker Hub, Amazon ECR, Google Container Registry, GitHub Container Registry.

**Layer**: Each instruction in a Dockerfile creates a layer. Layers are cached — if a layer hasn't changed, it's reused from cache. This makes builds faster and images smaller.

## 3. Why It Exists / Problem It Solves

Before containers:
- **It works on my machine**: Different OS versions, library conflicts, dependency hell.
- **Slow deployment**: Setting up a production server required manual configuration.
- **Environment drift**: Dev, staging, and production environments diverge over time.
- **Low density**: VMs are heavy, limiting the number of services per host.

Containers solve:
- **Reproducibility**: Same image runs identically on dev, CI, staging, production.
- **Portability**: Run on any Linux host, cloud, or on-prem.
- **Fast startup**: Containers start in milliseconds (vs minutes for VMs).
- **Resource efficiency**: Higher density than VMs (10x or more).
- **Immutable infrastructure**: Build new images, never patch running containers.
- **Isolation**: Each container has its own filesystem, network, process space.
- **Version control**: Images are versioned, can roll back.

## 4. When to Use It

| Scenario | Use Containers? | Alternative |
|----------|----------------|-------------|
| **Microservices** | Yes | Each service in its own container |
| **CI/CD pipelines** | Yes | Consistent build environments |
| **Development environments** | Yes | Docker Compose for local dev |
| **Monolithic application** | Maybe | Docker simplifies deployment |
| **High-security workloads** | If secure | Use VMs for stronger isolation |
| **Desktop applications** | No | Containers are server-focused |
| **Real-time systems** | Maybe | Container overhead may be unacceptable |

## 5. When NOT to Use It / Tradeoffs

- **Security**: Containers share the host kernel. A kernel exploit can escape a container. Use VMs for stronger isolation with untrusted workloads.
- **Performance**: Bare-metal or VM can be faster for CPU-intensive workloads (no virtualization overhead, though minimal).
- **Storage**: Containers are ephemeral — data must be stored in volumes.
- **Networking**: Container networking adds complexity (CNI, port mapping, overlay networks).
- **Monitoring**: More entities to monitor (containers, images, registries, orchestration).
- **Learning curve**: Dockerfiles, compose, orchestration, registries, security scanning.
- **Stateful workloads**: Databases in containers are possible but complex (persistent volumes, backups).

## 6. How It Works (Deep Mechanics)

**Namespaces** (Linux kernel feature for isolation):
- **PID namespace**: Processes in a container only see their own processes.
- **Network namespace**: Each container has its own network stack (interfaces, IP, routing).
- **Mount namespace**: Each container has its own filesystem hierarchy.
- **UTS namespace**: Each container has its own hostname and domain.
- **IPC namespace**: Inter-process communication isolation.
- **User namespace**: Container can run as root inside but is unprivileged outside.

**Cgroups** (control groups, resource limiting):
- CPU limits (shares, quotas, cpusets).
- Memory limits (soft limit, hard limit, swap).
- I/O limits (read/write bandwidth, IOPS).
- PID limits (max processes per container).

**Union filesystem** (OverlayFS, AUFS):
- Docker images consist of layers stacked using union mount.
- Each Dockerfile instruction creates a read-only layer.
- When you run a container, a thin writable layer is added on top.
- Multiple containers can share the same underlying image layers.
- Writes use copy-on-write — modifying a file copies it to the writable layer.

**Docker networking**:
- **bridge** (default): Containers on the same host can communicate via a virtual bridge (docker0).
- **host**: Container uses the host's network stack (no isolation, best performance).
- **overlay**: Multi-host networking (used by Docker Swarm and Kubernetes).
- **macvlan**: Assign MAC addresses to containers for direct network attachment.

## 7. Architecture Diagram (ASCII)

\`\`\`
Container vs VM:
  +-----------------------------+  +-----------------------------+
  | App A | App B | App C      |  | App A | App B | App C      |
  | Libs  | Libs  | Libs       |  | Libs  | Libs  | Libs       |
  +-------+-------+-------+    |  | GuestOS|GuestOS|GuestOS    |
  |     Container Engine   |    |  +-------+-------+-------+    |
  |        Host OS          |    |  |    Hypervisor          |    |
  |        Hardware         |    |  |        Host OS         |    |
  +-------------------------+    |  |        Hardware        |    |
  Containers (share kernel)      +-----------------------------+
                                   Virtual Machines (separate kernels)

Docker Image Layers:
  FROM ubuntu:22.04        <- Layer 1: Ubuntu base (~78MB)
  RUN apt-get install -y   <- Layer 2: Packages (~150MB)
  COPY package.json        <- Layer 3: App config (~5KB)
  RUN npm install          <- Layer 4: Dependencies (~200MB)
  COPY src/                <- Layer 5: Source code (~2MB)
  CMD ["node", "app.js"]   <- Metadata (not a layer)
                               Total: ~430MB

Docker Network:
  Container A ---> vethA ---> docker0 bridge ---> vethB ---> Container B
                                  |
                               eth0 (host)
                                  |
                               Internet
\`\`\`

## 8. Real-World Flow Example

**Microservice deployment with Docker**:
1. Developer writes code, builds Docker image: \`docker build -t order-service:1.2.3 .\`
2. Image is tagged and pushed to registry: \`docker push registry.example.com/order-service:1.2.3\`
3. CI pipeline runs tests against the same image.
4. Production orchestrator (Kubernetes) pulls the image from registry.
5. Container starts: \`docker run -p 8080:3000 order-service:1.2.3\`
6. Docker creates namespaces, allocates cgroups, mounts the union filesystem.
7. Application starts within milliseconds.
8. Health check passes, load balancer routes traffic to the new container.
9. Old container is gracefully stopped (SIGTERM, wait, then SIGKILL).

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
// Dockerfile builder (conceptual simulation of container layer behavior)
interface Layer {
  instruction: string;
  content?: Record<string, Buffer>;
}

class DockerImageBuilder {
  private layers: Layer[] = [];
  private cache: Map<string, Layer> = new Map();

  from(baseImage: string): void {
    const layer: Layer = { instruction: \`FROM \${baseImage}\` };
    this.layers.push(layer);
    // In real Docker, from uses the base image layers
  }

  run(command: string): void {
    const cacheKey = \`RUN \${command}\`;
    if (this.cache.has(cacheKey)) {
      console.log(\`Using cached layer for: \${cacheKey}\`);
      this.layers.push(this.cache.get(cacheKey)!);
      return;
    }
    const layer: Layer = { instruction: cacheKey };
    this.layers.push(layer);
    this.cache.set(cacheKey, layer);
  }

  copy(source: string, destination: string, content?: string): void {
    const cacheKey = \`COPY \${source} \${destination}\`;
    if (this.cache.has(cacheKey)) {
      console.log(\`Using cached layer for: \${cacheKey}\`);
      this.layers.push(this.cache.get(cacheKey)!);
      return;
    }
    const layer: Layer = {
      instruction: cacheKey,
      content: { [destination]: Buffer.from(content || '', 'utf-8') },
    };
    this.layers.push(layer);
    this.cache.set(cacheKey, layer);
  }

  build(): Image {
    return new Image([...this.layers]);
  }
}

class Image {
  private writableLayer: Layer = { instruction: 'CONTAINER', content: {} };

  constructor(private layers: Layer[]) {}

  createContainer(): Container {
    // Union mount: layers stacked with copy-on-write
    const mergedFs = this.mergeFilesystems();
    const container = new Container(mergedFs, this.writableLayer);
    return container;
  }

  private mergeFilesystems(): Map<string, Buffer> {
    const fs = new Map<string, Buffer>();
    // Simulate union filesystem (lower layers shadowed by upper)
    for (const layer of this.layers) {
      if (layer.content) {
        for (const [path, content] of Object.entries(layer.content)) {
          fs.set(path, content);
        }
      }
    }
    return fs;
  }
}

class Container {
  private pid: number;
  private cgroups: { cpu: number; memory: number };

  constructor(
    private filesystem: Map<string, Buffer>,
    private writableLayer: Layer,
    config?: { cpuLimit?: number; memoryLimit?: number }
  ) {
    this.pid = process.pid; // Simulated PID namespace
    this.cgroups = {
      cpu: config?.cpuLimit || 100, // CPU shares
      memory: config?.memoryLimit || 512, // MB
    };
  }

  async run(entrypoint: string): Promise<void> {
    console.log(\`Container started (PID: \${this.pid}, CPU: \${this.cgroups.cpu}, RAM: \${this.cgroups.memory}MB)\`);
    console.log(\`Filesystem: \${this.filesystem.size} files\`);
    console.log(\`Executing: \${entrypoint}\`);
    // In reality, Docker uses Linux namespaces to isolate this process
  }

  writeFile(path: string, content: string): void {
    // Copy-on-write: modifies the writable layer
    this.writableLayer.content = this.writableLayer.content || {};
    this.writableLayer.content[path] = Buffer.from(content);
    console.log(\`COW: \${path} written to container layer\`);
  }

  readFile(path: string): Buffer | undefined {
    // Read from writable layer first (union mount)
    if (this.writableLayer.content?.[path]) {
      return this.writableLayer.content[path];
    }
    return this.filesystem.get(path);
  }

  stop(): void {
    console.log(\`Container \${this.pid} stopped. Writtable layer discarded.\`);
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Google**: Runs all services (Search, Gmail, Maps, YouTube) in containers. Google started the container revolution with Borg (predecessor to Kubernetes).
- **Netflix**: Uses Docker for their content delivery pipeline and microservices. Each service runs in a container with defined resource limits.
- **Spotify**: Runs 1000+ microservices in Docker containers on Kubernetes. Uses Docker for consistent development environments.
- **Uber**: Uses Docker for both microservices and data processing pipelines. Their container platform (Peloton) manages 100K+ containers.
- **Shopify**: Uses Docker for development environments (dev pods). Each developer gets an isolated containerized environment.

## 11. Common Interview Questions

1. *What is the difference between a container and a VM?*
2. *How does Docker use Linux namespaces and cgroups?*
3. *What is a Docker image layer and how does caching work?*
4. *Explain Docker's copy-on-write filesystem.*
5. *What are best practices for writing Dockerfiles?*
6. *How does Docker networking work (bridge, host, overlay)?*
7. *What is the difference between Docker and Kubernetes?*
8. *Design a multi-stage Docker build for a TypeScript application.*

## 12. Related Topics & Next Steps

- **Kubernetes**: Container orchestration at scale.
- **Docker Compose**: Multi-container local development.
- **Multi-stage Builds**: Reducing Docker image size.
- **Container Security**: Image scanning, runtime security, least privilege.
- **CNCF Landscape**: Container ecosystem (CRI-O, containerd, Podman).
- **Next Lesson**: Kubernetes.`,
    estimatedMin: 25,
    difficulty: 'INTERMEDIATE',
    companies: ['Google', 'Netflix', 'Spotify', 'Uber', 'Shopify', 'Docker'],
    tags: ['docker', 'containers', 'namespaces', 'cgroups', 'images', 'virtualization']
  },
  {
    id: 'lesson-05-12',
    slug: 'distributed-infrastructure-12-kubernetes',
    title: 'Kubernetes',
    content: `## 1. Quick Summary

**Kubernetes (K8s)** is an **open-source container orchestration platform** that automates deployment, scaling, and management of containerized applications. Originally developed by Google (based on their internal Borg system), Kubernetes provides **service discovery**, **load balancing**, **storage orchestration**, **automated rollouts/rollbacks**, **self-healing**, **secret management**, and **batch execution**. Key concepts include **Pods** (smallest deployable units), **Services** (stable network endpoints), **Deployments** (declarative updates), **ConfigMaps/Secrets** (configuration), and **PersistentVolumes** (storage). Kubernetes runs on any infrastructure — cloud, on-prem, or hybrid — and is the de facto standard for container orchestration.

## 2. Definition

**Cluster**: A set of machines (nodes) that run containerized applications managed by Kubernetes.

**Node**: A worker machine (physical or virtual) that runs pods. Each node runs the **kubelet** (agent) and **kube-proxy** (networking).

**Control Plane**: The brain of the cluster. Components:
- **kube-apiserver**: Exposes the Kubernetes API. All components communicate through it.
- **etcd**: Distributed key-value store. Stores all cluster data (state).
- **kube-scheduler**: Assigns pods to nodes based on resource requirements and constraints.
- **kube-controller-manager**: Runs controller processes (Node Controller, Replication Controller, etc.).

**Pod**: The smallest deployable unit. One or more containers sharing a network namespace, IPC, and storage.

**Service**: An abstraction that exposes a set of pods as a network service. Stable IP and DNS name.

**Deployment**: Declares the desired state (replicas, image version). Kubernetes reconciles actual state to desired state (self-healing).

**Namespace**: Virtual cluster within a physical cluster. Used for multi-tenancy (dev/staging/prod environments within one cluster).

## 3. Why It Exists / Problem It Solves

Without orchestration:
- **Manual deployment**: SSH into servers, pull images, run containers. Error-prone.
- **No self-healing**: Crashed containers stay crashed. No automatic restart.
- **No scaling**: Manual process to add/remove container instances.
- **No rolling updates**: All containers updated simultaneously — downtime.
- **No resource management**: Containers compete for CPU/memory without limits.

Kubernetes solves:
- **Declarative management**: Define desired state, Kubernetes handles the rest.
- **Self-healing**: Restarts failed containers, replaces nodes, reschedules pods.
- **Horizontal scaling**: \`kubectl scale deployment myapp --replicas=5\` or HPA (Horizontal Pod Autoscaler).
- **Rolling updates**: Zero-downtime deployments with health checks.
- **Service discovery**: Pods come and go — Services provide stable endpoints.
- **Resource optimization**: Bin-packing of containers onto nodes.
- **Multi-cloud**: Abstraction layer over infrastructure.

## 4. When to Use It

| Scenario | Use K8s? | Alternative |
|----------|----------|-------------|
| **Microservices at scale** | Yes | K8s is the standard |
| **Containerized applications** | Yes | If running more than a few containers |
| **CI/CD pipelines** | Yes | K8s as deployment target |
| **Batch jobs / cron jobs** | Yes | Native Job and CronJob resources |
| **Single container** | No | Docker Compose or plain Docker |
| **Serverless functions** | No | AWS Lambda, Cloud Functions |
| **Stateful workloads** | Maybe | StatefulSets exist but complex |
| **Simple 3-tier app** | Overkill | Docker Compose, PaaS |

## 5. When NOT to Use It / Tradeoffs

- **Complexity**: K8s has a steep learning curve. Networking, storage, security, and RBAC require deep knowledge.
- **Resource overhead**: Control plane components consume resources. For small clusters, the overhead ratio is poor.
- **Operational cost**: Running a K8s cluster requires dedicated cluster operations team.
- **Version upgrades**: Upgrading Kubernetes versions is complex and risky.
- **Networking complexity**: CNI plugins (Calico, Flannel, Weave) add another layer to debug.
- **Stateful applications**: Databases on K8s are possible but complex (StatefulSets, persistent volumes, backups).
- **Overkill for small apps**: If you have 2-3 microservices, a simple VM + Docker Compose is sufficient.

## 6. How It Works (Deep Mechanics)

**Pod lifecycle**:
1. User creates a Deployment with \`replicas: 3\`, \`image: myapp:1.0\`.
2. Controller Manager's Deployment Controller detects the desired state (3 replicas).
3. Creates a ReplicaSet with \`replicas: 3\`.
4. ReplicaSet Controller creates 3 Pod objects.
5. Scheduler watches for unscheduled pods, assigns each to a node based on resource requests/limits and affinities.
6. kubelet on each node sees the assigned pod, pulls the image, and starts the container.
7. kubelet monitors pod health (liveness probe). If the pod crashes, kubelet restarts it.

**Service networking**:
1. Service is created with selector \`app: myapp\`.
2. Service Controller watches pods matching the selector, creates endpoint objects.
3. Each node's kube-proxy watches endpoints and updates iptables/IPVS rules.
4. When a client connects to the Service's Cluster IP, traffic is load-balanced to a healthy pod.

**API flow**:
1. \`kubectl apply -f deployment.yaml\` sends request to kube-apiserver.
2. API server validates the request, stores the resource definition in etcd.
3. API server returns success to client.
4. Controllers watch etcd changes via API server, reconcile state.

## 7. Architecture Diagram (ASCII)

\`\`\`
Kubernetes Cluster:
  +-------------------------+
  |     Control Plane       |
  |  +----+ +----+ +----+  |
  |  |API | |Sched| |CM  |  |
  |  |Srvr| |uler| |    |  |
  |  +----+ +----+ +----+  |
  |  +--------------------+ |
  |  |        etcd        | |
  |  +--------------------+ |
  +-------------------------+
         |         |
  +------+    +----+-----------+
  | Node 1    | Node 2         |
  | +-------+ | +-------+      |
  | | kube  | | | kube  |      |
  | |-let   | | |-let   |      |
  | +-------+ | +-------+      |
  | +-------+ | +-------+      |
  | | Pod A | | | Pod B |      |
  | | +---+ | | | +---+ |      |
  | | |Env| | | | |Env| |      |
  | | +---+ | | | +---+ |      |
  | +-------+ | +-------+      |
  +-----------+ +--------------+

Pod Spec:
  apiVersion: v1
  kind: Pod
  metadata:
    name: myapp-pod
    labels:
      app: myapp
  spec:
    containers:
    - name: myapp
      image: myapp:1.0
      ports:
      - containerPort: 3000
\`\`\`

## 8. Real-World Flow Example

**Zero-downtime deployment with Kubernetes**:
1. Developer updates code, pushes image as \`myapp:2.0\`.
2. Updates Deployment YAML: \`image: myapp:2.0\`.
3. \`kubectl apply -f deployment.yaml\`.
4. Deployment controller creates a new ReplicaSet for v2.0.
5. New ReplicaSet creates a new pod. kubelet pulls v2.0 image.
6. New pod becomes ready (readiness probe returns 200).
7. Service endpoints include the new pod.
8. Old ReplicaSet scales down: terminates one v1.0 pod.
9. Process repeats: 2 new v2 pods -> 2 old v1 pods terminate.
10. Rollout completes: 3 v2 pods running. Old ReplicaSet scaled to 0.
11. If v2.0 fails readiness checks, rollout automatically rolls back.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
import * as k8s from '@kubernetes/client-node';

interface K8sDeploymentConfig {
  name: string;
  image: string;
  replicas: number;
  port: number;
  cpuRequest: string;
  memoryRequest: string;
  environment: Record<string, string>;
}

class KubernetesClient {
  private kubeConfig: k8s.KubeConfig;
  private apps: k8s.AppsV1Api;
  private core: k8s.CoreV1Api;

  constructor() {
    this.kubeConfig = new k8s.KubeConfig();
    this.kubeConfig.loadFromDefault();
    this.apps = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
    this.core = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
  }

  async createDeployment(config: K8sDeploymentConfig): Promise<void> {
    const deployment: k8s.V1Deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: config.name,
        labels: { app: config.name },
      },
      spec: {
        replicas: config.replicas,
        selector: {
          matchLabels: { app: config.name },
        },
        template: {
          metadata: {
            labels: { app: config.name },
          },
          spec: {
            containers: [{
              name: config.name,
              image: config.image,
              ports: [{ containerPort: config.port }],
              resources: {
                requests: {
                  cpu: config.cpuRequest,
                  memory: config.memoryRequest,
                },
                limits: {
                  cpu: '1',
                  memory: '1Gi',
                },
              },
              env: Object.entries(config.environment).map(([name, value]) => ({
                name,
                value,
              })),
              readinessProbe: {
                httpGet: {
                  path: '/health',
                  port: config.port,
                },
                initialDelaySeconds: 5,
                periodSeconds: 10,
              },
              livenessProbe: {
                httpGet: {
                  path: '/health',
                  port: config.port,
                },
                initialDelaySeconds: 15,
                periodSeconds: 20,
              },
            }],
          },
        },
      },
    };

    try {
      await this.apps.createNamespacedDeployment('default', deployment);
      console.log(\`Deployment \${config.name} created\`);
    } catch (error) {
      // If deployment exists, update it
      await this.apps.replaceNamespacedDeployment(config.name, 'default', deployment);
      console.log(\`Deployment \${config.name} updated\`);
    }
  }

  async createService(name: string, port: number): Promise<void> {
    const service: k8s.V1Service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: \`\${name}-svc\`,
        labels: { app: name },
      },
      spec: {
        type: 'ClusterIP',
        selector: { app: name },
        ports: [{
          port: 80,
          targetPort: port,
          protocol: 'TCP',
        }],
      },
    };

    await this.core.createNamespacedService('default', service);
    console.log(\`Service \${name}-svc created\`);
  }

  async scaleDeployment(name: string, replicas: number): Promise<void> {
    const patch = [
      { op: 'replace', path: '/spec/replicas', value: replicas }
    ];
    await this.apps.patchNamespacedDeploymentScale(
      name,
      'default',
      patch,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/json-patch+json' } }
    );
    console.log(\`Deployment \${name} scaled to \${replicas} replicas\`);
  }

  async rollbackDeployment(name: string, revision: number): Promise<void> {
    const rolloutUndo: k8s.V1DeploymentRollback = {
      apiVersion: 'apps/v1beta1',
      kind: 'DeploymentRollback',
      name,
      rollbackTo: { revision },
    };
    // Rollback via API
    await this.apps.createNamespacedDeploymentRollback(name, 'default', rolloutUndo as any);
    console.log(\`Deployment \${name} rolled back to revision \${revision}\`);
  }

  async getDeploymentStatus(name: string): Promise<k8s.V1DeploymentStatus> {
    const response = await this.apps.readNamespacedDeploymentStatus(name, 'default');
    return response.body.status!;
  }

  async watchDeployment(name: string): Promise<void> {
    const watcher = new k8s.Watch(this.kubeConfig);
    const response = await watcher.watch(
      \`/apis/apps/v1/namespaces/default/deployments\`,
      {},
      (type: string, obj: any) => {
        if (obj.metadata.name === name) {
          console.log(\`Deployment \${name}: \${type} - replicas: \${obj.status?.readyReplicas || 0} ready\`);
        }
      },
      (error: any) => console.error('Watch error:', error)
    );
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Google**: Google uses Borg (K8s predecessor) to manage billions of containers per week. Kubernetes itself is used for Google Cloud, GKE, and internal tools.
- **Spotify**: Runs 1000+ microservices on Kubernetes. Uses K8s for canary deployments and A/B testing.
- **Airbnb**: Migrated from a monolith to Kubernetes. Runs 1000+ services with 10K+ pods across multiple clusters.
- **Uber**: Uses Kubernetes for stateless workloads. Runs thousands of pods for API services, batch jobs, and ML training.
- **Pokemon GO (Niantic)**: Spikes from 50 to 500+ pods within minutes of a major event. Autoscaling handled by K8s.
- **Bloomberg**: Runs Kubernetes for financial applications. Requires high security and compliance.

## 11. Common Interview Questions

1. *What is the difference between a Pod and a Deployment?*
2. *How does Kubernetes service discovery work?*
3. *Explain the Kubernetes scheduler. How does it assign pods to nodes?*
4. *What are the different types of Kubernetes Services?*
5. *How does a rolling update work in Kubernetes?*
6. *What is a Horizontal Pod Autoscaler and how does it work?*
7. *How do you handle secrets in Kubernetes?*
8. *Design a Kubernetes architecture for a multi-tenant SaaS application.*

## 12. Related Topics & Next Steps

- **Helm**: Kubernetes package manager (charts).
- **Kustomize**: Native Kubernetes configuration customization.
- **Kubernetes Operators**: Custom controllers for stateful applications.
- **Service Mesh (Istio)**: Traffic management, security, and observability on Kubernetes.
- **CNCF Landscape**: Prometheus, Grafana, Fluentd, and other ecosystem tools.
- **Next Lesson**: Distributed File Systems.`,
    estimatedMin: 30,
    difficulty: 'ADVANCED',
    companies: ['Google', 'Spotify', 'Airbnb', 'Uber', 'Niantic', 'Bloomberg'],
    tags: ['kubernetes', 'k8s', 'orchestration', 'pods', 'deployments', 'containers']
  },
  {
    id: 'lesson-05-13',
    slug: 'distributed-infrastructure-13-distributed-file-systems',
    title: 'Distributed File Systems',
    content: `## 1. Quick Summary

A **distributed file system (DFS)** manages files across multiple storage nodes, presenting a unified namespace to users and applications. It provides **replication** (data durability), **fault tolerance** (survive node failures), **scalability** (add capacity by adding nodes), and **high throughput** (parallel reads/writes). Key architectures include **Google File System (GFS)** / **HDFS** (master-slave, large block sizes), **Ceph** (CRUSH algorithm, no single master), **GlusterFS** (hash-based placement), **Lustre** (high-performance computing), and **Alluxio** (memory-centric virtual file system). Distributed file systems are the foundation of **data lakes**, **big data analytics** (Hadoop/Spark), and **object storage** (S3, Azure Blob). The key design challenge is balancing **consistency**, **availability**, and **performance** across failure-prone distributed environments.

## 2. Definition

**Distributed File System**: A file system that stores data across multiple servers, providing a single, cohesive file hierarchy.

**Namespace**: The global file hierarchy visible to clients. Files are addressed by path (e.g., \`/data/analytics/2024/logs.txt\`).

**Metadata**: File attributes (name, size, permissions, timestamps, location of data blocks). Managed by one or more metadata servers.

**Chunk/Block**: Data is split into fixed-size blocks (e.g., 64MB in HDFS, 4KB in local FS). Blocks are stored on data nodes.

**Replication**: Copies of blocks on multiple nodes for fault tolerance (typically 3x replication).

**POSIX compliance**: Does the DFS support the full POSIX file system API? Most modern DFS sacrifice strict POSIX for performance and scalability.

**Key architectures**:
- **Master-slave**: Single metadata server (GFS, HDFS). Simple but SPOF.
- **Decentralized**: No single master (Ceph, GlusterFS). More complex but highly available.

## 3. Why It Exists / Problem It Solves

Without distributed file systems:
- **Storage capacity limited to a single machine**: Can't store petabytes of data.
- **No fault tolerance**: Disk failure = data loss.
- **Single point of bottleneck**: All I/O goes through one machine.
- **No geographic distribution**: Data is local to one data center.

Distributed file systems solve:
- **Petabyte-scale storage**: Aggregate storage across thousands of machines.
- **High throughput**: Parallel reads from multiple nodes.
- **Fault tolerance**: Automatic replication and recovery from failures.
- **Unified namespace**: Applications see a single file hierarchy.
- **Elasticity**: Add/remove storage nodes without downtime.
- **Data locality**: Move computation to where data is stored (Hadoop MapReduce).

## 4. When to Use It

| Scenario | DFS Type | Example |
|----------|----------|---------|
| **Big data analytics (Hadoop/Spark)** | HDFS | Large batch processing, write-once read-many |
| **Object storage (cloud-native)** | S3-compatible | MinIO, Ceph RGW |
| **High-performance computing** | Lustre | Scientific computing, ML training |
| **Virtual machine images** | NFS/Ceph | Shared storage for VMs |
| **Container persistent volumes** | CSI-backed | Ceph RBD, GlusterFS, Portworx |
| **Media workflows (video editing)** | GlusterFS/Lustre | Large file concurrent access |

## 5. When NOT to Use It / Tradeoffs

- **Latency**: Distributed operations have higher latency than local FS (network hops, replication).
- **Complexity**: Setting up and managing a DFS requires significant expertise.
- **POSIX limitations**: Many DFS don't support full POSIX (no hard links, limited random writes).
- **Consistency tradeoffs**: Eventual consistency (S3) vs strong consistency (HDFS). Two-phase commits are expensive.
- **Small files problem**: DFPS optimized for large files. Storing billions of small files is inefficient.
- **Metadata bottlenecks**: Single metadata server can be a bottleneck (HDFS NameNode — mitigated with HDFS Federation).

## 6. How It Works (Deep Mechanics)

**HDFS Architecture**:
1. **NameNode** (metadata server): Maintains the file system namespace tree and mapping of files to blocks.
2. **DataNodes**: Store blocks on local disk. Each block is typically 64MB or 128MB.
3. **Write path**:
   - Client asks NameNode which DataNodes to write to.
   - NameNode returns a pipeline of DataNodes (e.g., DN1, DN2, DN3 for 3x replication).
   - Client writes to DN1. DN1 forwards to DN2, DN2 to DN3.
   - Each DN acknowledges back to the client.
4. **Read path**:
   - Client asks NameNode which DataNodes hold the blocks.
   - Client reads from the closest DataNode (rack awareness).
5. **Replication**: When a DataNode fails, NameNode replicates its blocks to other DataNodes.

**Ceph Architecture**:
1. **Ceph Monitor (MON)**: Maintains cluster map (membership, state).
2. **Ceph OSD**: Stores data (one per disk). Data is placed using CRUSH algorithm.
3. **Ceph Manager (MGR)**: Cluster monitoring, balancer, REST API.
4. **CRUSH**: Controlled Replication Under Scalable Hashing. No central directory — clients compute data location using a hash function and cluster map.
5. **RADOS**: Reliable Autonomic Distributed Object Store — the core of Ceph.
6. **Data placement**: Client computes OSD for an object: \`CRUSH(pool, object_name) -> OSD\`. No lookup needed.

## 7. Architecture Diagram (ASCII)

\`\`\`
HDFS Architecture:
  +----------+
  |NameNode  |  Metadata: /data/logs -> blocks [1,2,3]
  |(metadata)|  Block 1 -> [DN1, DN2, DN3]
  +----------+  Block 2 -> [DN2, DN3, DN4]
       |
  +----+---------+----------+
  |    |         |          |
  DN1  DN2      DN3        DN4
  [B1] [B1,B2]  [B1,B2,B3] [B2,B3]
  +----+---------+----------+

  Read: Client -> NameNode (get block locations) -> Closest DN (read data)
  Write: Client -> DN1 -> DN2 -> DN3 (pipeline replication)

Ceph Architecture:
  +------+  +------+  +------+
  | MON  |  | MGR  |  | MON  |  Control Plane
  +------+  +------+  +------+
       |         |
  +----+---------+------------------------+
  |    |         |         |              |
  OSD1 OSD2     OSD3     OSD4     ... OSDn
  (disk) (disk)  (disk)  (disk)        (disk)
  +----+---------+------------------------+

  Client: CRUSH(pool, object) -> OSD5  (no metadata lookup!)
\`\`\`

## 8. Real-World Flow Example

**Log analytics with HDFS**:
1. Application servers generate 10TB/day of log files.
2. Logs are written directly to HDFS in hourly batches.
3. HDFS splits each file into 128MB blocks, stored across 20 DataNodes with 3x replication.
4. A DataNode fails (disk crash). NameNode detects missing block replicas.
5. NameNode instructs surviving replicas to replicate blocks to an available DataNode.
6. Data is not lost — 2 remaining replicas ensure availability.
7. Spark job reads logs for analytics. Job scheduler prefers DataNodes with local data (data locality).
8. Result: 50GB/hour read throughput across the cluster.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
interface BlockInfo {
  id: string;
  size: number;
  replicas: string[]; // DataNode IDs
}

interface FileMetadata {
  path: string;
  size: number;
  blockSize: number;
  blocks: BlockInfo[];
  permissions: string;
  createdAt: Date;
  modifiedAt: Date;
}

class NameNode {
  private namespace: Map<string, FileMetadata> = new Map();
  private dataNodes: Map<string, DataNodeInfo> = new Map();
  private blockSize = 128 * 1024 * 1024; // 128MB

  registerDataNode(nodeId: string, capacity: number): void {
    this.dataNodes.set(nodeId, {
      id: nodeId,
      capacity,
      used: 0,
      blocks: new Set(),
      healthy: true,
    });
  }

  createFile(path: string): FileMetadata {
    const metadata: FileMetadata = {
      path,
      size: 0,
      blockSize: this.blockSize,
      blocks: [],
      permissions: '644',
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    this.namespace.set(path, metadata);
    return metadata;
  }

  getBlockLocations(path: string, offset: number, length: number): { block: BlockInfo; dataNodes: DataNodeInfo[] }[] {
    const metadata = this.namespace.get(path);
    if (!metadata) throw new Error(\`File not found: \${path}\`);

    // Find which blocks contain the requested range
    const startBlock = Math.floor(offset / this.blockSize);
    const endBlock = Math.floor((offset + length - 1) / this.blockSize);
    const result: Array<{ block: BlockInfo; dataNodes: DataNodeInfo[] }> = [];

    for (let i = startBlock; i <= endBlock && i < metadata.blocks.length; i++) {
      const block = metadata.blocks[i];
      const nodes = block.replicas
        .map(id => this.dataNodes.get(id))
        .filter((n): n is DataNodeInfo => n?.healthy === true);

      result.push({ block, dataNodes: nodes });
    }

    return result;
  }

  allocateBlocks(path: string, size: number): { blockId: string; targetNodes: string[] }[] {
    const numBlocks = Math.ceil(size / this.blockSize);
    const allocations: Array<{ blockId: string; targetNodes: string[] }> = [];

    for (let i = 0; i < numBlocks; i++) {
      const blockId = \`block-\${Date.now()}-\${i}\`;
      // Pick 3 DataNodes for replication (simplified: round-robin)
      const healthyNodes = [...this.dataNodes.values()]
        .filter(n => n.healthy)
        .sort((a, b) => a.used - b.used); // prefer nodes with more free space
      const replicas = healthyNodes.slice(0, 3).map(n => n.id);

      allocations.push({ blockId, targetNodes: replicas });
    }

    return allocations;
  }
}

interface DataNodeInfo {
  id: string;
  capacity: number;
  used: number;
  blocks: Set<string>;
  healthy: boolean;
}

class DataNode {
  private blocks: Map<string, Buffer> = new Map();

  constructor(private nameNodeClient: NameNode) {}

  async writeBlock(blockId: string, data: Buffer): Promise<void> {
    this.blocks.set(blockId, data);
    console.log(\`Stored block \${blockId} (\${data.length} bytes)\`);
  }

  async readBlock(blockId: string): Promise<Buffer | null> {
    return this.blocks.get(blockId) || null;
  }

  async replicateBlock(blockId: string, targetNode: DataNode): Promise<void> {
    const data = await this.readBlock(blockId);
    if (data) {
      await targetNode.writeBlock(blockId, data);
      console.log(\`Replicated block \${blockId} to \${targetNode.constructor.name}\`);
    }
  }
}

class DFSClient {
  constructor(private nameNode: NameNode, private dataNodes: Map<string, DataNode>) {}

  async write(path: string, data: Buffer): Promise<void> {
    const blocks = this.nameNode.allocateBlocks(path, data.length);
    let offset = 0;

    for (const { blockId, targetNodes } of blocks) {
      const chunkSize = Math.min(128 * 1024 * 1024, data.length - offset);
      const chunk = data.subarray(offset, offset + chunkSize);

      // Pipeline write to first DataNode
      const firstNode = this.dataNodes.get(targetNodes[0]);
      if (firstNode) {
        await firstNode.writeBlock(blockId, chunk);

        // Replicate to other nodes (simplified)
        for (let i = 1; i < targetNodes.length; i++) {
          const replicaNode = this.dataNodes.get(targetNodes[i]);
          if (replicaNode) {
            await firstNode.replicateBlock(blockId, replicaNode);
          }
        }
      }
      offset += chunkSize;
    }

    console.log(\`File \${path} written (\${data.length} bytes)\`);
  }

  async read(path: string): Promise<Buffer> {
    // Get file metadata and locate blocks
    const metadata = this.nameNode.createFile(path); // simplified; should have a getFile method
    const parts: Buffer[] = [];

    for (const blockInfo of metadata.blocks) {
      const firstReplicaNode = this.dataNodes.get(blockInfo.replicas[0]);
      if (firstReplicaNode) {
        const block = await firstReplicaNode.readBlock(blockInfo.id);
        if (block) parts.push(block);
      }
    }

    return Buffer.concat(parts);
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Google File System (GFS)**: The original. Google used GFS for Search, Gmail, YouTube, and BigTable. Designed for 1000-node clusters, 100MB average file size.
- **HDFS**: Used by Facebook (300PB data lake), Twitter (real-time analytics), eBay (search indexing), Yahoo (largest Hadoop cluster ever — 4.5K nodes).
- **Ceph**: Used by CERN (LHC data storage), DigitalOcean (block storage), Bloomberg, and OVHcloud.
- **Amazon S3**: Object storage used by virtually every cloud-native application. Stores 100+ trillion objects.
- **MinIO**: Kubernetes-native S3-compatible storage. Used by 50% of Fortune 500 companies.
- **Lustre**: Used in 60% of the top 100 supercomputers. Top500 HPC clusters.

## 11. Common Interview Questions

1. *How does HDFS achieve fault tolerance?*
2. *Explain the read and write path in HDFS.*
3. *What is the NameNode and what happens if it fails?*
4. *Compare HDFS vs Ceph vs S3. When would you choose each?*
5. *What is data locality and why is it important for big data processing?*
6. *How does Ceph's CRUSH algorithm eliminate the metadata bottleneck?*
7. *How do distributed file systems handle small files?*
8. *Design a distributed file system for a video streaming platform.*

## 12. Related Topics & Next Steps

- **HDFS vs Object Storage**: File system vs object store (S3, GCS, Azure Blob).
- **The Hadoop Ecosystem**: MapReduce, YARN, Hive, HBase.
- **Ceph RBD**: Block storage for containers and VMs.
- **MinIO**: Self-hosted S3-compatible object storage.
- **Lustre / GlusterFS**: High-performance computing use cases.
- **Next Module**: Module 6 — Architecture Patterns.`,
    estimatedMin: 25,
    difficulty: 'ADVANCED',
    companies: ['Google', 'Facebook', 'CERN', 'Amazon S3', 'MinIO', 'DigitalOcean'],
    tags: ['distributed-file-system', 'hdfs', 'ceph', 'gfs', 'object-storage', 'data-lake']
  },
];