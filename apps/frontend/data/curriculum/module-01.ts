export const module01Lessons = [
  {
    id: "lesson-networking-01",
    slug: "networking-os-security-01-osi-model-tcp-ip",
    title: "OSI Model & TCP/IP Stack",
    content: `## 1. Quick Summary

The **OSI Model** (7 layers) and **TCP/IP Stack** (4 layers) are conceptual frameworks that standardize how network communication happens. Every networking interview and system design discussion builds on these layers. The TCP/IP stack is what the internet actually uses; the OSI model is the pedagogical reference.

## 2. Definition

The **OSI (Open Systems Interconnection) Model** defines seven abstraction layers: Physical, Data Link, Network, Transport, Session, Presentation, Application. Each layer handles a specific aspect of communication. The **TCP/IP Stack** collapses these into four layers: Network Interface, Internet, Transport, Application. Together, they describe how data moves from one application to another across networks.

## 3. Why It Exists / Problem It Solves

Without layered abstractions, every network engineer would need to understand every detail of hardware, routing, encryption, and application protocols simultaneously. Layering creates separation of concerns: a developer writing HTTP code does not need to know about Ethernet frames or 802.11 signal modulation. Each layer encapsulates the complexity below it.

## 4. When to Use It

- **Troubleshooting**: Isolate issues by layer (e.g., physical cable issue vs DNS misconfiguration)
- **Designing protocols**: Decide where a new protocol lives (e.g., QUIC operates at Transport + Application)
- **Security analysis**: Map threats to layers (e.g., ARP spoofing is Layer 2, BGP hijacking is Layer 3)
- **Performance tuning**: Identify bottlenecks per layer

## 5. When NOT to Use It / Tradeoffs

- **Over-abstraction**: Strict layering can hide performance problems (e.g., TCP retransmissions caused by Wi-Fi signal issues)
- **Layer violations**: Real-world protocols often blur layers (e.g., TLS sits between Transport and Application, firewalls inspect up to Layer 7)
- **OSI is theoretical**: Many protocols do not map cleanly to OSI layers; the TCP/IP model is more practical

## 6. How It Works (Deep Mechanics)

Data flows **down** the stack on the sender and **up** on the receiver. Each layer adds its own header (encapsulation).

**OSI Layers (7 to 1):**

1. **Physical** - Bits on wire. Voltage levels, radio frequencies, pin layouts. Examples: Ethernet (802.3), Wi-Fi (802.11), fiber optics.
2. **Data Link** - Frames between directly connected nodes. MAC addresses, CSMA/CD, ARP. Switches operate here. Ethernet frames have source/dest MAC, EtherType, CRC.
3. **Network** - Packets across multiple networks. IP addressing, routing (OSPF, BGP), fragmentation. Routers operate here. IPv4 header has src/dest IP, TTL, protocol field.
4. **Transport** - End-to-end segments. TCP (reliable, ordered, connection-oriented) and UDP (unreliable, unordered, connectionless). Port numbers, sequencing, ACKs, flow control.
5. **Session** - Manages dialogs: establish, maintain, synchronize, terminate. Examples: NetBIOS, RPC. Often combined with Presentation in practice.
6. **Presentation** - Translation, encryption, compression. SSL/TLS conceptually live here. ASCII vs EBCDIC, JPEG encoding, JSON serialization.
7. **Application** - User-facing protocols. HTTP, FTP, DNS, SMTP, SSH, WebSocket.

**TCP/IP Layers (4 to 1):**

1. **Network Interface** - Combines OSI 1 + 2. Ethernet, Wi-Fi, PPP.
2. **Internet** - OSI Layer 3. IP, ICMP, ARP, routing protocols.
3. **Transport** - OSI Layer 4. TCP, UDP, SCTP.
4. **Application** - OSI 5 + 6 + 7. HTTP, DNS, TLS, SSH.

**Encapsulation example (HTTP request):**

\`\`\`
Application:  GET /index.html HTTP/1.1\r\nHost: example.com
Transport:    TCP segment (src port 54321, dst port 80, seq=100, ack=0)
Internet:     IP packet (src 192.168.1.5, dst 93.184.216.34, TTL=64)
Network Int:  Ethernet frame (src AA:BB:CC:DD:EE:FF, dst 00:11:22:33:44:55, type 0x0800)
\`\`\`

## 7. Architecture Diagram

\`\`\`
SENDER                                     RECEIVER
+---------------------------+              +---------------------------+
|  Application (Layer 7)    | HTTP req     |  Application (Layer 7)    |
+---------------------------+  --------->  +---------------------------+
|  Presentation (Layer 6)   | Encrypted    |  Presentation (Layer 6)   |
+---------------------------+  --------->  +---------------------------+
|  Session (Layer 5)        | Session ID   |  Session (Layer 5)        |
+---------------------------+  --------->  +---------------------------+
|  Transport (Layer 4)      | TCP segment  |  Transport (Layer 4)      |
+---------------------------+  --------->  +---------------------------+
|  Network (Layer 3)        | IP packet    |  Network (Layer 3)        |
+---------------------------+  --------->  +---------------------------+
|  Data Link (Layer 2)      | Eth frame    |  Data Link (Layer 2)      |
+---------------------------+  --------->  +---------------------------+
|  Physical (Layer 1)       | 1010 0110    |  Physical (Layer 1)       |
+---------------------------+  ========>   +---------------------------+
\`\`\`

## 8. Real-World Flow Example

**User types "google.com" in browser:**

1. **Application**: Browser constructs HTTP GET request
2. **Presentation**: TLS handshake encrypts the session (if HTTPS)
3. **Session**: Existing TCP session reused or new session via cookies
4. **Transport**: TCP segment created with src port 54321, dst port 443
5. **Network**: DNS resolves google.com to 142.250.80.46; IP packet built
6. **Data Link**: ARP resolves next-hop IP to MAC; Ethernet frame assembled
7. **Physical**: Bits sent over Wi-Fi radio waves

## 9. Reference Implementation Example

\`\`\`typescript
interface Header {
  name: string;
  data: Record<string, string>;
}

function encapsulate(data: string, layers: string[]): Header[] {
  const headers: Header[] = [];
  for (const layer of layers) {
    const header: Header = { name: layer, data: {} };
    switch (layer) {
      case 'Application':
        header.data = { method: 'GET', path: '/', host: 'example.com' };
        break;
      case 'Transport':
        header.data = { srcPort: '54321', dstPort: '80', seq: '100' };
        break;
      case 'Internet':
        header.data = { srcIP: '192.168.1.5', dstIP: '93.184.216.34', ttl: '64' };
        break;
      case 'NetworkInterface':
        header.data = { srcMAC: 'AA:BB:CC:DD:EE:FF', dstMAC: '00:11:22:33:44:55' };
        break;
    }
    headers.push(header);
  }
  return headers;
}

const layers = ['NetworkInterface', 'Internet', 'Transport', 'Application'];
const headers = encapsulate('HTTP/1.1 200 OK', layers);
console.log('Encapsulation chain:', headers.map(h => h.name).join(' to '));
\`\`\`

## 10. Real Company Use Cases

- **Cisco**: Routers and switches implement Layers 2-3 in hardware (ASICs for forwarding)
- **Cloudflare**: Operates reverse proxies at Layer 7, DDoS mitigation at Layer 3/4
- **Netflix**: Open Connect CDN appliances use OSI model for cache hierarchy - Layer 3 BGP peering, Layer 4 TCP optimization, Layer 7 TLS termination
- **AWS**: Security Groups are Layer 4 stateful firewalls; Network ACLs are stateless Layer 3/4; ALB is Layer 7
- **Stripe**: TLS termination at Layer 6/4, network segmentation at Layer 3 for PCI compliance

## 11. Common Interview Questions

1. "What happens when you type google.com into a browser?" - Trace the full OSI stack
2. "Where does encryption fit in the OSI model?" - Presentation layer (or between Transport and Application for TLS)
3. "Why does TCP/IP have fewer layers than OSI?" - Pragmatism: OSI was designed by committee, TCP/IP evolved through implementation
4. "How would you design a new reliable protocol over UDP?" - You are essentially implementing Transport-layer features
5. "What is encapsulation and why does it matter?" - Each layer adds headers; enables modularity and interoperability

## 12. Related Topics & Next Steps

- HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC) - Application layer optimization
- TCP vs UDP - Transport layer in depth
- TLS/SSL & HTTPS Handshake - Presentation/Session layer security
- DNS & DNS Resolution - Application layer distributed database
- WebSockets - Session layer persistent connection`,
    estimatedMin: 20,
    difficulty: "BEGINNER",
    companies: ["Cisco", "Cloudflare", "Netflix", "AWS", "Stripe"],
    tags: ["networking", "osi-model", "tcp-ip", "fundamentals", "protocols"],
  },

  {
    id: "lesson-networking-02",
    slug: "networking-os-security-02-http-1-1-vs-http-2-vs-http-3",
    title: "HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC)",
    content: `## 1. Quick Summary

**HTTP/1.1** (1997) is the baseline - text-based, one request per TCP connection. **HTTP/2** (2015) brought multiplexing, header compression, and server push over a single TCP connection. **HTTP/3** (2022) replaces TCP with **QUIC** over UDP for 0-RTT handshakes, head-of-line blocking elimination, and better mobile performance. Each version is a superset of the previous.

## 2. Definition

HTTP (Hypertext Transfer Protocol) is the application-layer protocol that powers the web. **HTTP/1.1** uses plaintext, sequential requests per connection. **HTTP/2** is binary-framed, multiplexed, and compressed. **HTTP/3** runs on QUIC (RFC 9000), a transport protocol built on UDP with integrated TLS 1.3, connection migration, and stream-level multiplexing.

## 3. Why It Exists / Problem It Solves

**HTTP/1.1 pain points:**
- **Head-of-line blocking**: One slow response blocks all subsequent requests on the same connection
- **Verbose headers**: Repeated headers (cookies, user-agent) bloat every request
- **Connection overhead**: Opening multiple TCP connections per origin (usually 6) wastes resources

**HTTP/2 solutions:**
- **Multiplexing**: Multiple streams over one TCP connection
- **HPACK**: Header compression (static/dynamic tables, Huffman encoding)
- **Server push**: Proactively send resources the client has not requested yet

**HTTP/2 pain points (solved by HTTP/3):**
- **TCP HOL blocking**: A lost TCP packet blocks ALL streams (because TCP guarantees in-order delivery)
- **Connection setup latency**: TCP + TLS handshakes take 1-3 round trips
- **No connection migration**: Changing networks (Wi-Fi to cellular) drops the connection

**HTTP/3/QUIC solutions:**
- **Stream-level multiplexing**: Loss on one stream does not affect others
- **0-RTT handshake**: Send data immediately if you have connected before
- **Connection migration**: Connection ID persists across IP address changes

## 4. When to Use It

- **HTTP/1.1**: Legacy systems, small internal APIs, embedded devices with limited resources
- **HTTP/2**: Modern websites, mobile apps, any service needing multiplexing (gRPC requires HTTP/2)
- **HTTP/3**: Latency-sensitive apps (real-time video, gaming), mobile-first services, high-loss networks
- **Progressive adoption**: Use ALPN (Application-Layer Protocol Negotiation) to fall back gracefully

## 5. When NOT to Use It / Tradeoffs

- **HTTP/2 downsides**: TCP HOL blocking in lossy networks; server push often wasted; complex server tuning (stream priorities, flow control)
- **HTTP/3 downsides**: UDP can be blocked by corporate firewalls; higher CPU usage for QUIC crypto; less mature library support; debugging difficulty (packets encrypted end-to-end)
- **HTTP/1.1 is still fine**: For request-response APIs with low latency and no multiplexing needs, the complexity of HTTP/2/3 is not justified

## 6. How It Works (Deep Mechanics)

**HTTP/1.1** - Text-based, request-response over TCP. Each request is a plaintext message.

**HTTP/2** - Binary framing layer. Frames are the smallest unit; streams are sequences of frames. Multiple streams interleave over one TCP connection.

Frame types: HEADERS, DATA, SETTINGS, PRIORITY, GOAWAY, PUSH_PROMISE.

**HPACK Compression**: Static table (common headers), dynamic table (previously seen headers), Huffman encoding. Reduces header overhead by 85-90%.

**Stream Prioritization**: Dependency tree with weights. Browser can signal which resources are critical.

**Flow Control**: Per-stream and per-connection window updates (WINDOW_UPDATE frames).

**HTTP/3 (QUIC)** - QUIC is a transport protocol over UDP. Key innovations:

1. **0-RTT**: Client sends cryptographic handshake + HTTP request in first packet (if previously connected)
2. **Connection ID**: 64-bit identifier independent of IP - survives network transitions
3. **Stream multiplexing**: Each stream is independent; packet loss on stream 1 does not block stream 3
4. **Integrated TLS 1.3**: Handshake is encrypted from the start; no cleartext headers
5. **Monotonic ECN**: Explicit Congestion Notification with reliable feedback

## 7. Architecture Diagram

\`\`\`
HTTP/1.1              HTTP/2                HTTP/3

+----------+         +----------+         +----------+
| HTTP/1.1 |         |  HTTP/2  |         |  HTTP/3  |
| (text)   |         | (binary) |         | (binary) |
+----------+         +----------+         +----------+
| TLS (opt)|         |   TLS    |         |  QUIC    |
+----------+         +----------+         | (TLS 1.3 |
|   TCP    |         |   TCP    |         |  baked)  |
+----------+         +----------+         +----------+
|   IP     |         |   IP     |         |   UDP    |
+----------+         +----------+         +----------+
                                           |   IP     |
                                           +----------+

Connection model:
HTTP/1.1: 6 TCP connections per origin
HTTP/2:   1 TCP connection, many streams
HTTP/3:   1 QUIC connection (over UDP), many streams
\`\`\`

## 8. Real-World Flow Example

**Loading twitter.com with HTTP/2:**

1. Browser connects to twitter.com:443, negotiates HTTP/2 via ALPN
2. Client sends PRIORITY frame tree: HTML (highest), CSS, JS, images (lowest)
3. Server receives GET / and responds with HTML containing link for styles.css
4. Server PUSH_PROMISE for styles.css (avoids client re-request)
5. Browser parses HTML, finds /app.js and sends HEADERS frame on new stream
6. Multiple responses interleave over one TCP connection:
   - Stream 1: HTML chunks
   - Stream 3: CSS chunks (from push)
   - Stream 5: JS chunks
   - Stream 7: profile.jpg chunks
7. No connection wasted; all resources arrive concurrently

## 9. Reference Implementation Example

\`\`\`typescript
// HTTP/2 multiplexing simulation
interface Http2Stream {
  id: number;
  priority: number;
}

class Http2Connection {
  private streams: Map<number, Http2Stream> = new Map();
  private nextStreamId = 1;

  createStream(priority: number): Http2Stream {
    const stream: Http2Stream = {
      id: this.nextStreamId,
      priority,
    };
    this.nextStreamId += 2;
    this.streams.set(stream.id, stream);
    return stream;
  }

  writeData(streamId: number, chunk: string): void {
    console.log('Writing ' + chunk.length + ' bytes to stream ' + streamId);
  }
}

const conn = new Http2Connection();
const htmlStream = conn.createStream(10);
const cssStream = conn.createStream(8);
conn.writeData(htmlStream.id, '<html>...');
conn.writeData(cssStream.id, 'body {...');
\`\`\`

## 10. Real Company Use Cases

- **Google**: Created SPDY to HTTP/2, and QUIC to HTTP/3. YouTube uses QUIC for video streaming, reducing rebuffers by 30%
- **Cloudflare**: Edge network supports HTTP/3 on all plans; reported 8% faster page loads globally
- **Facebook**: Messenger migrated to QUIC in 2020; reduced reconnections by 20% on mobile
- **Apple**: iOS apps use QUIC (Network.framework) for push notifications and iCloud
- **Fastly**: CDN uses HTTP/2 prioritization to optimize Largest Contentful Paint (LCP) by 12%

## 11. Common Interview Questions

1. "What is head-of-line blocking and how does each HTTP version handle it?"
   - HTTP/1.1: request-level HOL on each connection; HTTP/2: TCP-level HOL across streams; HTTP/3: QUIC eliminates transport HOL
2. "How does HTTP/2 multiplexing work?"
   - Binary framing: streams, frames, TCP; frames interleave; receiver reassembles by stream ID
3. "Why does HTTP/3 use UDP instead of TCP?"
   - UDP allows user-space transport (QUIC) without kernel dependency; enables 0-RTT, connection migration, and stream-level loss recovery
4. "What are the security implications of 0-RTT?"
   - Replay attacks: attacker can replay the 0-RTT data; solution: only allow idempotent requests (GET) in 0-RTT
5. "How would you migrate a legacy HTTP/1.1 service to HTTP/2?"
   - Ensure TLS is enabled, remove chunked transfer encoding dependency, audit for connection: close patterns

## 12. Related Topics & Next Steps

- TLS/SSL & HTTPS Handshake - The security layer beneath HTTP
- WebSockets - Upgrading HTTP for bidirectional communication
- gRPC - RPC framework built on HTTP/2
- QUIC Deep Dive - Transport protocol used by HTTP/3
- CDN Architecture - How edge servers optimize HTTP delivery`,
    estimatedMin: 22,
    difficulty: "INTERMEDIATE",
    companies: ["Google", "Cloudflare", "Facebook", "Apple", "Fastly", "Amazon"],
    tags: ["http", "http2", "http3", "quic", "protocols", "networking"],
  },

  {
    id: "lesson-networking-03",
    slug: "networking-os-security-03-dns-resolution",
    title: "DNS & DNS Resolution",
    content: `## 1. Quick Summary

**DNS (Domain Name System)** is the internet's phonebook - it maps human-readable domain names (google.com) to machine-readable IP addresses (142.250.80.46). Resolution involves recursive and iterative queries across a hierarchical system of nameservers: Root to TLD to Authoritative. DNS is fundamental to every internet request and a frequent source of latency and outages.

## 2. Definition

DNS is a hierarchical, distributed, decentralized naming system. It translates domain names to IP addresses (A/AAAA records), mail servers (MX records), service locations (SRV records), and more. DNS runs over UDP port 53 (default) and TCP port 53 (for large responses like DNSSEC). It is one of the oldest and most critical components of the internet infrastructure.

## 3. Why It Exists / Problem It Solves

Humans remember names, not numbers. IP addresses change (server migrations, load balancing, CDN anycast). DNS provides:
- **Abstraction**: Users refer to example.com regardless of underlying IP changes
- **Distribution**: No single point of failure; hierarchy spreads load
- **Caching**: Reduces latency and upstream query volume
- **Load balancing**: Multiple A records return different IPs (round-robin); weighted routing; latency-based routing

## 4. When to Use It

- **Every internet request**: Every HTTP, SMTP, SSH connection starts with DNS resolution
- **Service discovery**: SRV records for locating database servers, message queues
- **Failover**: DNS-based health checking (Route53 latency records)
- **Global load balancing**: GeoDNS returns region-specific IPs
- **Internal service mesh**: Kubernetes CoreDNS or Consul DNS for svc.cluster.local

## 5. When NOT to Use It / Tradeoffs

- **Slow propagation**: DNS changes can take minutes to hours (TTL-dependent)
- **Security risks**: DNS spoofing, cache poisoning, DDoS amplification attacks
- **Not for real-time service discovery**: 30-300s TTL means stale data; use service mesh (Consul, etcd) with health checks instead
- **Dependency**: If DNS is down, everything appears down (hence, redundant resolvers are critical)
- **Privacy**: Traditional DNS is cleartext; use DNS-over-HTTPS (DoH) or DNS-over-TLS (DoT)

## 6. How It Works (Deep Mechanics)

**DNS Hierarchy:**

Root (.)
├── .com (TLD)
│   ├── example.com (Authoritative)
│   │   ├── www.example.com to A record
│   │   ├── mail.example.com to MX record
│   │   └── *.example.com to wildcard
│   └── google.com (Authoritative)
├── .org (TLD)
├── .net (TLD)
└── root servers (13 logical roots like a.root-servers.net)

**Resolution Flow (Recursive + Iterative):**

1. User enters www.example.com in browser
2. Browser checks local cache to miss
3. Browser asks OS resolver (stub resolver) to checks hosts file to miss
4. OS resolver queries **recursive resolver** (ISP: 8.8.8.8, Cloudflare: 1.1.1.1)
5. Recursive resolver checks its cache to miss
6. Recursive resolver queries **root server** (.) to "Ask .com TLD at a.gtld-servers.net"
7. Recursive resolver queries **.com TLD server** to "Ask example.com at ns1.example.com"
8. Recursive resolver queries **authoritative nameserver** (ns1.example.com) to "www.example.com A 93.184.216.34"
9. Recursive resolver caches response (for TTL, e.g., 300s) and returns to OS resolver
10. OS resolver returns to browser to browser opens TCP connection to 93.184.216.34:80

## 7. Architecture Diagram

\`\`\`
+---------+  query  +--------------+  query   +----------+
|  Client  |------->|  Recursive   |--------->|   Root   |
| (Browser)|        |  Resolver    |          |  Server  |
+---------+        | (8.8.8.8)   |          +----------+
     ^              +--------------+               |
     | cache             |  |                      |
     |                   |  |                      v "ask .com"
     |                   |  |  +-------------------+
     |                   |  +->|  .com TLD Server  |
     |                   |     +-------------------+
     |                   |              |
     |                   |              v "ask ns1.example.com"
     |                   |  +---------------------------+
     |                   +->|  Authoritative (NS)        |
     |                       |  ns1.example.com          |
     |                       |  to 93.184.216.34         |
     +-----------------------+---------------------------+
\`\`\`

## 8. Real-World Flow Example

**Netflix startup sequence:**

1. Netflix app on smart TV starts up
2. Resolves www.netflix.com to DNS returns CNAME to d1qyr6o4y1kdp0.cloudfront.net (CloudFront distribution)
3. Resolves CloudFront hostname to AWS Route 53 latency-based routing to returns nearest edge IP
4. Resolves movie1234.s3.us-east-1.amazonaws.com to S3 endpoint for video manifest
5. Each CDN request re-resolves or uses cached DNS (TTL = 60s for failover speed)

## 9. Reference Implementation Example

\`\`\`typescript
import * as dns from 'dns/promises';

async function resolveWithTrace(hostname: string): Promise<void> {
  console.log('Resolving ' + hostname + '...');

  const addresses = await dns.resolve4(hostname, { ttl: true });
  console.log('A Records:', addresses);

  try {
    const cname = await dns.resolveCname(hostname);
    console.log('CNAME:', cname);
  } catch {}

  const ns = await dns.resolveNs(hostname);
  console.log('Nameservers:', ns);
}

resolveWithTrace('google.com');

class DNSCache {
  private cache = new Map<string, { ips: string[]; expiry: number }>();

  async resolve(hostname: string): Promise<string[]> {
    const cached = this.cache.get(hostname);
    if (cached && cached.expiry > Date.now()) {
      return cached.ips;
    }
    const ips = await dns.resolve4(hostname);
    this.cache.set(hostname, { ips, expiry: Date.now() + 60000 });
    return ips;
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Cloudflare**: Operates 1.1.1.1 (privacy-focused resolver) with anycast network; serves 20M+ DNS queries per second
- **Amazon Route 53**: Authoritative DNS with health checks, latency-based routing, weighted records; used by Netflix, Zillow, Pinterest
- **Google Public DNS**: 8.8.8.8 handles hundreds of billions of queries daily; uses pre-fetching and anycast
- **Kubernetes CoreDNS**: Internal cluster DNS; service discovery via service.namespace.svc.cluster.local
- **Verisign**: Operates .com and .net TLD root servers; processes 100B+ DNS queries daily

## 11. Common Interview Questions

1. "What happens when you type a URL in a browser?" - DNS resolution is the first step; trace recursive to iterative flow
2. "What is the difference between authoritative and recursive DNS?" - Authoritative hosts the actual record; Recursive performs lookups on behalf of clients
3. "How does DNS load balancing work?" - Multiple A records with round-robin; latency-based routing; weighted records; geoDNS
4. "What is DNS poisoning and how do you prevent it?" - Attacker injects fake records into resolver cache; prevent with DNSSEC (digital signatures), short TTLs, random src ports
5. "How does CDN use DNS for edge routing?" - CNAME to CDN domain to CDN authoritative DNS returns nearest edge IP using EDNS client subnet

## 12. Related Topics & Next Steps

- HTTP/1.1 vs HTTP/2 vs HTTP/3 - DNS is the prerequisite for any HTTP connection
- CDN Architecture - DNS-based routing to edge servers
- Load Balancing Strategies - DNS-level vs application-level load distribution
- DNSSEC - Securing DNS with cryptographic signatures
- Anycast Routing - How DNS resolvers use BGP for global availability`,
    estimatedMin: 18,
    difficulty: "INTERMEDIATE",
    companies: ["Cloudflare", "Amazon", "Google", "Verisign", "Netflix"],
    tags: ["dns", "networking", "resolution", "domain-name-system", "infrastructure"],
  },

  {
    id: "lesson-networking-04",
    slug: "networking-os-security-04-tcp-vs-udp",
    title: "TCP vs UDP",
    content: `## 1. Quick Summary

**TCP (Transmission Control Protocol)** is reliable, ordered, connection-oriented - used when every byte matters (HTTP, email, file transfer). **UDP (User Datagram Protocol)** is unreliable, unordered, connectionless - used when speed matters more than perfect delivery (video streaming, gaming, DNS). The choice between them drives all transport-layer design decisions.

## 2. Definition

**TCP** (RFC 9293) provides a reliable, connection-oriented byte stream between two endpoints. Features: sequencing, acknowledgments, retransmission, flow control (sliding window), congestion control (AIMD, CUBIC, BBR). **UDP** (RFC 768) is a minimal transport: send datagrams, no guarantees about delivery, order, or duplicate protection. Header: 8 bytes (vs TCP's 20-60 bytes).

## 3. Why It Exists / Problem It Solves

**TCP exists because**: IP alone is unreliable. Packets can be lost, duplicated, reordered, or delayed. TCP adds reliability (every segment must be acknowledged), ordering (sequence numbers), flow control (receiver's window), and congestion control (sender adapts rate).

**UDP exists because**: TCP's guarantees come with latency - head-of-line blocking, slow start, three-way handshake. Applications that can tolerate some loss (video codecs interpolate missing frames) prefer UDP's minimal overhead and low latency.

## 4. When to Use It

**Use TCP when:** Data integrity is critical, order must be preserved, you need built-in congestion control, or for protocol compatibility (HTTP/1.1, HTTP/2, SMTP, SSH, FTP).

**Use UDP when:** Low latency is prioritized, loss is acceptable or recoverable (video codecs, WebRTC), you want to build custom reliability atop it (QUIC, WebRTC SCTP), or for simple query-response patterns (DNS, DHCP, NTP, SNMP).

## 5. When NOT to Use It / Tradeoffs

**TCP tradeoffs:** Latency (1 RTT for connection setup), head-of-line blocking (lost packet blocks all subsequent data until retransmitted), 20-byte header minimum, stateful connection tracking.

**UDP tradeoffs:** No guarantees (data may never arrive), no congestion control (UDP flows can congest networks), limited to 64KB datagrams, often rate-limited or blocked in enterprise networks.

## 6. How It Works (Deep Mechanics)

**TCP Connection Lifecycle:**
1. Three-way handshake: SYN to SYN-ACK to ACK
2. Data transfer: Segments with sequence numbers; receiver sends cumulative ACKs
3. Flow control: Window Size header field tells sender how much data receiver can buffer
4. Congestion control: Slow start (exponential) to congestion avoidance (AIMD). Modern algorithms: CUBIC (Linux default), BBR (Google)
5. Connection termination: FIN to FIN-ACK to ACK (or RST for abrupt close)

**Key differences:**
- TCP: stateful (kernel maintains connection state), stream-oriented
- UDP: stateless (each datagram is independent), message-oriented

## 7. Architecture Diagram

\`\`\`
TCP Connection Establishment                UDP Datagram Fire-and-Forget

Client              Server                 Client              Server
  |                   |                      |                   |
  |----SYN----------->|                      |----data---------->|
  |<---SYN-ACK--------|                      |                   |
  |----ACK----------->|                      |                   |
  |                   |                     (No connection      |
  |<---data-----------|                      |  state, no ACK)   |
  |----ACK----------->|                      |                   |
  |                   |                      |<---data-----------|
  | ... Slow start ...|                     (No guarantee of    |
  |                   |                      |  delivery order)  |
  |<---data (seq 1)---|                      |                   |
  |<---data (seq 2)---|                      |                   |
  |(seq 1 lost!)      |                      |  (Lost, no        |
  |----ACK 1 (dup)--->|                      |   recovery)       |
  |<---RETRANSMIT     |                      |                   |
  |       seq 1       |                      |                   |
  |----ACK 3--------->|                      |                   |
\`\`\`

## 8. Real-World Flow Example

**Zoom video call (WebRTC):**

1. Media stream uses **UDP** via SRTP (Secure Real-time Transport Protocol)
2. Each RTP packet contains a sequence number and timestamp
3. Lost packets: codec interpolates using previous/next frames (no retransmission)
4. If packet loss > 20%, Zoom switches to FEC (Forward Error Correction) - redundant parity packets
5. Control signaling (chat, screen sharing metadata) uses **TCP** for reliability
6. If UDP is blocked (corporate firewall), Zoom falls back to TCP tunnel over port 443

## 9. Reference Implementation Example

\`\`\`typescript
import * as net from 'net';
import * as dgram from 'dgram';

// TCP Echo Server
const tcpServer = net.createServer((socket) => {
  socket.on('data', (data) => {
    socket.write(data); // reliable echo
  });
});
tcpServer.listen(3000);

// UDP Echo Server
const udpServer = dgram.createSocket('udp4');
udpServer.on('message', (msg, rinfo) => {
  udpServer.send(msg, rinfo.port, rinfo.address); // fire-and-forget
});
udpServer.bind(3001);

// Custom reliable UDP (simplified ACK protocol)
class ReliableUDP {
  private seq = 0;
  private awaiting = new Map<number, { data: string; timer: NodeJS.Timeout }>();

  send(socket: dgram.Socket, data: string, addr: string, port: number): void {
    const seq = this.seq++;
    const packet = JSON.stringify({ seq, data });
    socket.send(packet, port, addr);
    const timer = setTimeout(() => {
      socket.send(packet, port, addr); // retransmit
    }, 1000);
    this.awaiting.set(seq, { data, timer });
  }

  ack(seq: number): void {
    const pending = this.awaiting.get(seq);
    if (pending) {
      clearTimeout(pending.timer);
      this.awaiting.delete(seq);
    }
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Google YouTube**: QUIC (over UDP) handles 50%+ of YouTube traffic; reduces video rebuffer by 30%
- **Zoom/WebRTC**: Real-time audio/video over UDP with adaptive bitrate and FEC
- **Cloudflare Spectrum**: Supports both TCP/UDP proxying; uses UDP for DNS (1.1.1.1), TCP for HTTP
- **Netflix Open Connect**: Uses TCP for video delivery (reliability matters for quality), but UDP-based SRT for live streaming ingest
- **Discord**: Voice chat over UDP (loss-tolerant); text and file uploads over TCP (reliable)

## 11. Common Interview Questions

1. "Why does video streaming use UDP but web browsing uses TCP?" - Video tolerates loss; web pages require complete, ordered data
2. "How does TCP congestion control work?" - Slow start to congestion avoidance to multiplicative decrease on loss
3. "What is the TCP three-way handshake? Why not two-way?" - Ensures both sides agree on initial sequence numbers; prevents old duplicate connections
4. "How would you design a reliable protocol over UDP?" - Implement sequence numbers, ACKs, retransmission, congestion control (QUIC)
5. "What are SYN cookies?" - Defense against SYN flood attacks; server encodes connection state in SYN-ACK sequence number

## 12. Related Topics & Next Steps

- TLS/SSL & HTTPS Handshake - Runs over TCP (or QUIC)
- WebRTC - Real-time communication over UDP
- QUIC - Modern transport over UDP (HTTP/3)
- Load Balancing - TCP vs UDP load balancer differences
- Network Performance - Latency, throughput, jitter, packet loss`,
    estimatedMin: 20,
    difficulty: "BEGINNER",
    companies: ["Google", "Zoom", "Cloudflare", "Netflix", "Discord", "Amazon"],
    tags: ["tcp", "udp", "transport-layer", "reliability", "networking"],
  },

  {
    id: "lesson-networking-05",
    slug: "networking-os-security-05-tls-ssl-handshake",
    title: "TLS/SSL & HTTPS Handshake",
    content: `## 1. Quick Summary

**TLS (Transport Layer Security)** is the cryptographic protocol that secures HTTPS. It provides encryption, authentication, and integrity for data in transit. The TLS handshake negotiates cipher suites, exchanges keys (via asymmetric crypto), establishes symmetric session keys, and verifies the server's identity via X.509 certificates. TLS 1.3 (2018) reduced handshake latency from 2 RTTs to 1 RTT (or 0-RTT with session resumption).

## 2. Definition

TLS is a cryptographic protocol that sits between the transport layer (TCP/QUIC) and the application layer (HTTP). It ensures encryption (symmetric cipher, key derived via key exchange), authentication (server identity verified via certificate chain), integrity (data tampering detected via AEAD), and forward secrecy (compromising the long-term key does not expose past sessions via ephemeral Diffie-Hellman).

## 3. Why It Exists / Problem It Solves

Before HTTPS, HTTP traffic was plaintext. Anyone on the network path (Wi-Fi hotspot, ISP, router) could eavesdrop (passwords, cookies, credit card numbers), tamper (inject malware, modify responses), or spoof (impersonate the server via DNS poisoning). TLS solves all three: encryption, authentication, and integrity.

## 4. When to Use It

- Always for production web services (HTTPS is mandatory; browsers mark HTTP as "Not Secure")
- API communication between microservices (mTLS for mutual authentication)
- Database connections (PostgreSQL, MySQL over TLS)
- Message queues (Kafka TLS encryption between brokers and clients)
- Email (SMTP STARTTLS, IMAPS, POP3S)
- DNS privacy (DNS-over-TLS, DNS-over-HTTPS)
- IoT (MQTT over TLS for device-to-cloud communication)

## 5. When NOT to Use It / Tradeoffs

- **Latency overhead**: Even with TLS 1.3, crypto operations add CPU cost and some latency
- **Certificate management**: Renewal, revocation (CRL/OCSP), CAs are points of failure
- **TLS termination complexity**: Load balancers must handle certificates; end-to-end encryption is harder
- **Legacy compatibility**: TLS 1.0 and 1.1 are deprecated; some old clients cannot connect to TLS 1.3 servers
- **mTLS scaling**: Managing client certificates at scale requires a PKI infrastructure

## 6. How It Works (Deep Mechanics)

**TLS 1.2 Handshake (2 RTT):**
ClientHello (TLS version, cipher suites, random, session ID, extensions) to ServerHello (chosen cipher suite, random) to Certificate (X.509 chain) to ServerKeyExchange (ECDHE parameters) to ServerHelloDone to ClientKeyExchange (Client DH public key) to ChangeCipherSpec to Finished (encrypted) to ChangeCipherSpec to Finished (encrypted) to Application Data.

**TLS 1.3 Improvements:**
- 1-RTT handshake: ServerHello includes key exchange; only one round trip
- 0-RTT: Client sends HTTP request with the first flight (requires pre-shared key from previous session)
- Removed insecure features: RSA key transport, static DH, compression, renegotiation
- Simplified cipher suites: Only AEAD ciphers (AES-GCM, ChaCha20-Poly1305) with HKDF key derivation

## 7. Architecture Diagram

\`\`\`
TLS 1.3 1-RTT Handshake

+--------------+                     +--------------+
|   Client     |                     |    Server    |
+------+-------+                     +------+-------+
       |                                    |
       | ClientHello                        |
       | + key_share (client's DH pub)      |
       | + signature_algorithms             |
       | + supported_versions [1.3, 1.2]    |
       |----------------------------------->|
       |                                    |
       |<-----------------------------------|
       | ServerHello                        |
       | + key_share (server's DH pub)      |
       | + EncryptedExtensions              |
       | + Certificate (cert chain)         |
       | + CertificateVerify (signature)    |
       | + Finished (HMAC of handshake)     |
       |                                    |
       | (Both compute shared secret via    |
       |  ECDHE; derive session keys)       |
       |                                    |
       |----Finished----------------------->|
       |----Application Data--------------->|
       |<---Application Data----------------|
       |                                    |
       | 1 RTT (vs 2 RTT for TLS 1.2)      |
\`\`\`

## 8. Real-World Flow Example

**User buys coffee using Starbucks app (HTTPS):**

1. App connects to api.starbucks.com:443
2. TCP handshake completes (SYN, SYN-ACK, ACK)
3. TLS 1.3 handshake: App sends ClientHello with key_share (X25519 public key). Server responds with ServerHello, key_share, certificate (*.starbucks.com chain), CertificateVerify, Finished
4. Both derive AES-256-GCM session key via HKDF
5. App encrypts: POST /orders with bearer token, drink details
6. Server decrypts, processes order, encrypts response with confirmation code
7. Each record has sequence number + AEAD tag to prevent replay/tampering
8. If attacker intercepts, they see only encrypted gibberish

## 9. Reference Implementation Example

\`\`\`typescript
import * as tls from 'tls';
import * as fs from 'fs';
import * as crypto from 'crypto';

const server = tls.createServer({
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),
  minVersion: 'TLSv1.3',
  ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256',
}, (socket) => {
  console.log('Cipher:', socket.getCipher());
  socket.on('data', (data) => {
    console.log('Received:', data.toString());
    socket.write('Hello, encrypted client!');
  });
});

server.listen(4433);

// ECDHE key exchange simulation
function simulateKeyExchange() {
  const clientKeyPair = crypto.generateKeyPairSync('x25519');
  const serverKeyPair = crypto.generateKeyPairSync('x25519');
  const sharedSecret = crypto.diffieHellman({
    privateKey: clientKeyPair.privateKey,
    publicKey: serverKeyPair.publicKey,
  });
  return { sharedSecret };
}
\`\`\`

## 10. Real Company Use Cases

- **Cloudflare**: TLS termination at edge for 20M+ domains; uses TLS 1.3 exclusively; pioneered 0-RTT resumption
- **Stripe**: Mutual TLS (mTLS) between internal services; API endpoints verify client certificates for partner integrations
- **Google**: All internal RPCs use mTLS (Application Layer Transport Security - ALTS); Gmail/Drive always HTTPS
- **Let's Encrypt**: Free automated CA using ACME protocol; issues 200M+ active certificates
- **Apple iCloud**: Uses TLS 1.3 for all connections; certificate transparency logs enforced

## 11. Common Interview Questions

1. "Explain the TLS handshake in detail." - ClientHello to ServerHello + Certificate + KeyExchange to ClientKeyExchange to ChangeCipherSpec to Finished
2. "What is forward secrecy and why does it matter?" - Ephemeral Diffie-Hellman ensures session keys are not derived from static server private key
3. "TLS 1.2 vs 1.3 - what changed?" - 2 RTT to 1 RTT (or 0-RTT), removed RSA key exchange, simplified cipher suites
4. "How does certificate chain validation work?" - Build chain to trusted root; verify each signature; check validity dates; check revocation; verify hostname
5. "What is a TLS termination proxy?" - Load balancer that decrypts TLS at edge and forwards plaintext to backend

## 12. Related Topics & Next Steps

- HTTP/1.1 vs HTTP/2 vs HTTP/3 - TLS is part of all modern HTTP versions
- Encryption (Symmetric vs Asymmetric) - The crypto primitives TLS uses
- Firewalls & Network Security - How firewalls inspect TLS traffic (MITM)
- Certificate Authorities & PKI - Infrastructure behind certificate trust
- WebRTC - Uses DTLS (TLS over UDP) for peer-to-peer security`,
    estimatedMin: 22,
    difficulty: "INTERMEDIATE",
    companies: ["Cloudflare", "Stripe", "Google", "Let's Encrypt", "Apple", "Amazon"],
    tags: ["tls", "ssl", "https", "encryption", "handshake", "security"],
  },

  {
    id: "lesson-networking-06",
    slug: "networking-os-security-06-websockets",
    title: "WebSockets",
    content: `## 1. Quick Summary

**WebSockets** provide full-duplex, persistent communication channels over a single TCP connection between a client and server. Unlike HTTP (request-response), WebSockets allow the server to push data to the client at any time. They are essential for real-time applications: chat, live feeds, collaborative editing, and gaming.

## 2. Definition

WebSocket (RFC 6455) is a protocol that starts as an HTTP upgrade request (Upgrade: websocket) and then switches to a bidirectional, message-oriented protocol. The connection remains open until explicitly closed. Messages can be text (UTF-8) or binary (Blob/ArrayBuffer). The protocol uses a lightweight framing: 2-14 bytes overhead per message (vs HTTP headers which are 200-800 bytes).

## 3. Why It Exists / Problem It Solves

HTTP is fundamentally request-response: the client asks, the server answers. For real-time features, this forced polling (client repeatedly sends GET /updates every N seconds - wasteful), long polling (server holds the response open until data is available - complex), or Server-Sent Events (SSE - server-to-client only, unidirectional). WebSockets solve all three with low latency, low overhead, full duplex, and binary support.

## 4. When to Use It

- Real-time chat: Slack, Discord, WhatsApp Web
- Live feeds: Stock tickers, sports scores, cryptocurrency prices
- Collaborative editing: Google Docs, Notion, Figma
- Multiplayer games: MMO position updates, turn-based moves
- Live dashboards: Grafana real-time metrics, Datadog live streams
- IoT device control: Push commands to devices, receive sensor data

## 5. When NOT to Use It / Tradeoffs

- Not for request-response APIs: HTTP/2 (or even HTTP/1.1) is simpler and more compatible
- Firewall issues: Corporate proxies often block WebSocket connections
- No built-in reconnection: Client must implement reconnect logic with exponential backoff
- Stateful complexity: Server must track open connections; scaling horizontally requires sticky sessions or a pub/sub layer (Redis)
- Memory pressure: Each open connection consumes socket buffer memory

## 6. How It Works (Deep Mechanics)

**WebSocket Handshake (HTTP Upgrade):**
Client sends GET with Upgrade: websocket, Sec-WebSocket-Key, Sec-WebSocket-Version: 13. Server computes Sec-WebSocket-Accept by concatenating the client's key with the GUID 258EAFA5-E914-47DA-95CA-5AB5BEA5261B, SHA-1 hashing it, and base64-encoding. Server responds 101 Switching Protocols.

**Frame Types (opcode):**
- 0x1: Text frame (UTF-8 payload)
- 0x2: Binary frame
- 0x8: Connection close
- 0x9: Ping (keepalive)
- 0xA: Pong (response to ping)

**Masking**: Client-to-server frames must be masked (XOR with 4-byte masking key). Server-to-client frames are unmasked. This prevents cache poisoning attacks on intermediaries.

## 7. Architecture Diagram

\`\`\`
+--------------+                      +--------------+
|   Browser    |    HTTP Handshake     |   Server     |
|   Client     |------GET /ws------>  |   (Node.js)  |
|              |<---101 Switching---  |              |
|  +---------+ |                      |  +---------+ |
|  | WS Lib  | |    Bidirectional     |  | WS Lib  | |
|  | (native)|<|====== frames =======>|  | (ws)    | |
|  +---------+ |                      |  +---------+ |
+------+-------+                      +------+-------+
       |                                     |
       |  +-------------------------------+ |
       +--| Pub/Sub Backend (Redis, Kafka) |-+
          +-------------------------------+
\`\`\`

## 8. Real-World Flow Example

**Slack sends a new message:**

1. User types message and presses Enter
2. Client sends masked binary frame: {"type":"message","channel":"C1234","text":"hello"}
3. Server validates: checks token, channel membership, rate limit
4. Server broadcasts to all other clients in channel via Redis pub/sub
5. User B's browser decodes frame, appends message to DOM (50-150ms total round trip)
6. Server handles ping/pong every 30s to detect disconnection

## 9. Reference Implementation Example

\`\`\`typescript
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocketServer({ server });
const connections = new Map<string, WebSocket>();

wss.on('connection', (ws) => {
  const sessionId = crypto.randomUUID();
  connections.set(sessionId, ws);

  ws.send(JSON.stringify({ type: 'welcome', sessionId }));

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    connections.forEach((client, id) => {
      if (id !== sessionId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'message', from: sessionId, text: msg.text }));
      }
    });
  });

  ws.on('close', () => connections.delete(sessionId));
});

server.listen(8080);

// Client with reconnection
class ChatClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;

  connect(url: string): void {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => { this.reconnectAttempts = 0; };
    this.ws.onclose = () => {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(url), delay);
      this.reconnectAttempts++;
    };
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Slack**: Real-time messaging entirely over WebSocket; handles 5M+ concurrent connections
- **Discord**: Voice and chat use WebSocket for real-time signaling; 10M+ concurrent gateway connections
- **Figma**: Collaborative design tool; uses WebSocket for operational transform and cursor presence
- **Binance**: Cryptocurrency exchange streams trade data via WebSocket; 100,000+ messages per second
- **Trello**: Real-time card updates over WebSocket; board changes pushed instantly to all viewers

## 11. Common Interview Questions

1. "How does a WebSocket connection start?" - HTTP Upgrade handshake, server responds 101 Switching Protocols
2. "How is WebSocket different from HTTP/2 Server Push?" - WebSocket is bidirectional; HTTP/2 push is server-initiated one-directional
3. "How do you scale WebSocket servers horizontally?" - Use a pub/sub backend (Redis, NATS) to broadcast across servers
4. "What is the WebSocket ping/pong mechanism?" - Keepalive frames to detect dead connections
5. "How would you implement a reliable messaging layer over WebSocket?" - Message IDs + ACKs for guaranteed delivery

## 12. Related Topics & Next Steps

- WebRTC - Peer-to-peer real-time communication (uses WebSocket for signaling)
- HTTP/2 Server Push - Alternative server-initiated delivery
- SSE (Server-Sent Events) - Simpler unidirectional alternative
- gRPC Web - Bidirectional streaming over HTTP/2
- Real-Time Architecture - Designing for high-concurrency connections`,
    estimatedMin: 18,
    difficulty: "INTERMEDIATE",
    companies: ["Slack", "Discord", "Figma", "Binance", "Trello"],
    tags: ["websockets", "real-time", "full-duplex", "networking", "protocols"],
  },

  {
    id: "lesson-networking-07",
    slug: "networking-os-security-07-webrtc",
    title: "WebRTC",
    content: `## 1. Quick Summary

**WebRTC (Web Real-Time Communication)** is an open framework for peer-to-peer audio, video, and data streaming between browsers and mobile apps. It uses UDP for media (with DTLS encryption), ICE for NAT traversal (STUN/TURN), and requires no plugins or intermediaries for the media path. It powers Zoom, Google Meet, Discord, and Clubhouse.

## 2. Definition

WebRTC (W3C standard, IETF protocols) enables real-time, peer-to-peer communication directly between browsers without requiring plugins or servers for the media data path. Key components: MediaStream (getUserMedia for camera/microphone access), RTCPeerConnection (manages the peer-to-peer connection via ICE, DTLS, SRTP), RTCDataChannel (bidirectional data transfer over SCTP over DTLS), and Signaling (exchange session descriptions via WebSocket or HTTP).

## 3. Why It Exists / Problem It Solves

Before WebRTC, real-time video required plugins (Flash, Silverlight - security risks), media servers (centralized transcoding - expensive), and proprietary protocols (RTMP, HLS). WebRTC solves NAT traversal (ICE framework for direct peer-to-peer), encryption (mandatory DTLS and SRTP), adaptive bitrate (codecs adjust quality to network conditions), and cross-platform support (Chrome, Firefox, Safari, Edge without installation).

## 4. When to Use It

- Video/audio calling: Zoom, Google Meet, WhatsApp calls
- Screen sharing: Remote desktop, presentations, pair programming
- Real-time gaming: Low-latency data channels for game state
- Live streaming: Sub-second latency (vs HLS's 6-30s)
- Peer-to-peer file sharing: Direct browser-to-browser transfer
- IoT camera feeds: Direct browser-to-camera streaming

## 5. When NOT to Use It / Tradeoffs

- Group calls: WebRTC is peer-to-peer; N participants = O(N^2) connections. Use SFU or MCU for groups
- Complex signaling: You must build or integrate a signaling server (WebSocket + SDP exchange)
- NAT/firewall failure: Sometimes TURN relay is needed (costly bandwidth on relay servers)
- Mobile battery drain: Continuous media encoding/decoding is power-intensive
- Debugging difficulty: Network traces are encrypted end-to-end

## 6. How It Works (Deep Mechanics)

**WebRTC Connection Lifecycle:**
1. Media Acquisition: getUserMedia() captures audio/video tracks
2. Signaling: Peers exchange SDP offers/answers via your signaling channel (WebSocket)
3. ICE (Interactive Connectivity Establishment): Finds the best network path
   - STUN: "What is my public IP?" - returns (IP, port) pair
   - TURN: Relay server for when direct P2P fails (e.g., symmetric NAT)
   - Candidate pairs: Host to Srflx (STUN) to Relay (TURN), pick best with lowest latency
4. DTLS Handshake: Over UDP - establishes encryption keys (same as TLS but over UDP)
5. SRTP/SRTCP: Secure RTP (audio/video) and Secure RTCP (control)
6. SCTP (DataChannels): Reliable/unreliable data over DTLS

## 7. Architecture Diagram

\`\`\`
+--------------+   Signaling (WebSocket)   +--------------+
|              |<== SDP Offer/Answer =====>|              |
|   Peer A     |   ICE Candidates          |   Peer B     |
|  (Browser)   |                           |  (Browser)   |
|              |   Media Path (UDP)        |              |
|              |<=========================>|              |
+------+-------+                           +------+-------+
       |                                         |
       |   +-----------+     +-----------+       |
       +-->|   STUN    |     |   TURN    |<------+
           | (NAT addr)|     | (Relay)   |
           +-----------+     +-----------+
\`\`\`

## 8. Real-World Flow Example

**Google Meet call (3 participants):**

1. User A creates meeting to Google's signaling server allocates SFU instance
2. User B and C join. Each browser calls getUserMedia, creates RTCPeerConnection pointing to SFU, sends SDP offer with VP9 codec preferences
3. Each browser sends its video up to SFU (uplink)
4. SFU selectively forwards streams to each participant (downlink)
5. If packet loss > 5%, codec switches to lower resolution or FEC kicks in

## 9. Reference Implementation Example

\`\`\`typescript
class WebRTCClient {
  private pc: RTCPeerConnection;

  constructor(private signaling: WebSocket) {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' }
      ]
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
      }
    };

    this.pc.ontrack = (event) => {
      const video = document.createElement('video');
      video.srcObject = event.streams[0];
      video.autoplay = true;
      document.body.appendChild(video);
    };

    this.signaling.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'offer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.signaling.send(JSON.stringify({ type: 'answer', answer }));
      } else if (msg.type === 'ice-candidate') {
        await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      }
    };
  }

  async startCall(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.signaling.send(JSON.stringify({ type: 'offer', offer }));
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Google Meet**: Full WebRTC stack with VP9/SVC codec; uses proprietary SFU for scalable group calls (up to 500 participants)
- **Zoom**: Uses WebRTC for browser-based clients (no download); handles 300M+ daily meeting participants
- **Discord**: WebRTC for voice channels; RTCDataChannel for game activity status; 100M+ active users
- **Twitch**: WebRTC-based streaming for sub-second interactive streaming
- **WhatsApp**: Web and desktop apps use WebRTC for calling (peer-to-peer when possible, TURN relay otherwise)

## 11. Common Interview Questions

1. "How does WebRTC handle NAT traversal?" - ICE framework: STUN to discover public IP, TURN relay when P2P fails
2. "What is the difference between an SFU and an MCU?" - SFU forwards streams without mixing; MCU mixes all streams into one
3. "How does WebRTC ensure security?" - Mandatory DTLS for key exchange, SRTP for media encryption
4. "What is simulcast and why is it important?" - Sending multiple quality layers; SFU forwards appropriate layer per receiver
5. "How would you debug a WebRTC connection failure?" - Check pc.getStats() for iceConnectionState, STUN reachability

## 12. Related Topics & Next Steps

- WebSockets - Used for WebRTC signaling
- TLS/SSL & HTTPS - DTLS is TLS over UDP
- TCP vs UDP - WebRTC uses UDP for media, DTLS for encryption
- Real-Time Architecture - SFU/MCU scaling, adaptive bitrate, FEC
- Audio/Video Codecs - VP8, VP9, H.264, AV1, Opus`,
    estimatedMin: 22,
    difficulty: "ADVANCED",
    companies: ["Google", "Zoom", "Discord", "Twitch", "WhatsApp"],
    tags: ["webrtc", "real-time", "p2p", "video", "audio", "networking"],
  },

  {
    id: "lesson-os-01",
    slug: "networking-os-security-08-processes-vs-threads",
    title: "Processes vs Threads",
    content: `## 1. Quick Summary

A **process** is an independent program execution with its own memory space, file descriptors, and system resources. A **thread** is the smallest unit of execution within a process - threads share the process's memory and resources but have their own stack and registers. Processes isolate failures; threads enable efficient concurrency within the same address space.

## 2. Definition

**Process**: An instance of a running program. The OS allocates a separate virtual address space, open file handles, environment variables, and security context. Context switching between processes is expensive (TLB flush, page table swap). **Thread**: A lightweight execution unit scheduled by the OS or runtime. A process contains at least one thread (main thread). All threads in a process share the same heap, code section, and file descriptors; each thread has its own stack, program counter, and register state.

## 3. Why It Exists / Problem It Solves

Early computers ran one program at a time. Multitasking required process isolation (crash one program, others survive), resource fairness (OS scheduler divides CPU time), and protection (one process cannot read another's memory via virtual memory). Threads solve efficient sharing (multiple tasks within the same program communicating via shared memory, no IPC overhead), parallelism (utilize multiple CPU cores), and responsiveness (UI remains responsive while background thread processes data).

## 4. When to Use It

**Use multiple processes when:** Strong isolation is needed (security boundaries, different tenants), fault tolerance (Chrome uses one process per tab), CPU-bound work without shared state, or languages without thread safety guarantees (Python GIL).

**Use multiple threads when:** Shared memory access is frequent (in-memory cache), I/O-bound work with shared context (web server with shared connection pool), fine-grained parallelism, or low-latency communication.

## 5. When NOT to Use It / Tradeoffs

**Process tradeoffs:** High context switch cost (TLB flush, page table switch), IPC complexity (pipes, sockets, shared memory vs thread shared memory), higher memory overhead, slow startup.

**Thread tradeoffs:** Shared state complexity (race conditions, deadlocks, data corruption), one crash kills all (segfault in thread = entire process dies), limited scalability (too many threads to scheduler overhead), platform limits (1MB+ stack per thread).

## 6. How It Works (Deep Mechanics)

**Process Lifecycle (Linux):**
fork() creates child as copy of parent (copy-on-write pages). exec() replaces process memory with new program. exit() terminates. wait() collects exit status.

**Linux Threads**: Linux implements threads as "lightweight processes" - clone() with CLONE_VM, CLONE_FILES, CLONE_SIGHAND flags. Kernel sees them as tasks sharing memory space.

**Memory layout comparison:**
Each process has its own address space (stack, heap, data, text segments) with isolated page tables and file descriptor tables. Threads within a process share heap, code, and file descriptors but have their own stack, registers, program counter, and thread-local storage.

## 7. Architecture Diagram

\`\`\`
Process A               Process B
+----------+            +----------+
| Stack    |            | Stack    |
| Heap     |            | Heap     |
| Data     |            | Data     |
| Text     |            | Text     |
+----------+            +----------+
| Page Tbl |            | Page Tbl |
| FD Table |            | FD Table |
+----------+            +----------+
  (isolated)              (isolated)

Process X (one process, four threads):
+------------------------------------+
| Thread 1 | Thread 2 | Thread 3 | T4|
| (stack)  | (stack)  | (stack)  |   |
+------------------------------------+
| Shared: Heap, Code, FDs, Signals   |
| Each thread: regs, PC, SP, TLS     |
+------------------------------------+
\`\`\`

## 8. Real-World Flow Example

**Chrome browser (multi-process architecture):**

1. Browser process: manages UI, tabs, network, storage, GPU
2. Each tab = separate Renderer process (sandboxed, no disk access)
3. Each renderer has: main thread (HTML parsing, layout, paint), worker threads (Service Workers, Web Workers), compositor thread
4. If Tab A crashes, other tabs survive; if Tab A is malicious, sandbox prevents system access

## 9. Reference Implementation Example

\`\`\`typescript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';

// Process simulation: fork worker for CPU-intensive work
function runInWorker(data: number[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { data } });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

async function parallelSum(arr: number[]): Promise<number> {
  const numWorkers = cpus().length;
  const chunkSize = Math.ceil(arr.length / numWorkers);
  const promises = [];
  for (let i = 0; i < numWorkers; i++) {
    promises.push(runInWorker(arr.slice(i * chunkSize, (i + 1) * chunkSize)));
  }
  const results = await Promise.all(promises);
  return results.reduce((a, b) => a + b, 0);
}

if (!isMainThread) {
  const { data } = workerData;
  parentPort!.postMessage(data.reduce((a: number, b: number) => a + b, 0));
}

// Mutex synchronization primitive
class Mutex {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire(): Promise<void> {
    if (!this.locked) { this.locked = true; return; }
    return new Promise(resolve => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) next(); else this.locked = false;
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Chrome (Google)**: Multi-process architecture - 1 browser + N renderer + GPU process; crash in any tab only kills that tab
- **NGINX**: Master process forks worker processes (each handles thousands of connections via epoll); no threads
- **Redis**: Single-threaded event loop; uses processes (fork) for persistence (BGSAVE creates child)
- **PostgreSQL**: One process per connection; shared memory for buffer pool
- **Node.js**: Single process, event loop + libuv thread pool for I/O; Worker Threads for CPU-bound tasks

## 11. Common Interview Questions

1. "What is the difference between a process and a thread?" - Process: independent memory, slower context switch, IPC needed. Thread: shared memory, lighter context switch, synchronization needed
2. "How does a context switch work?" - OS saves current state to PCB/TCB, loads new state; process switch also flushes TLB
3. "What is a race condition and how do you prevent it?" - Two threads access shared state without synchronization; prevent with mutex or atomic operations
4. "Explain the threading model of Node.js vs Apache" - Node.js: single-threaded event loop; Apache: thread-per-connection
5. "How would you design a highly concurrent web server?" - Event-driven (epoll) + thread pool; multiple worker processes for CPU scaling

## 12. Related Topics & Next Steps

- Concurrency vs Parallelism - Theoretical foundation
- Memory Management & Virtual Memory - How processes get isolated address space
- Operating System Scheduling - How processes/threads share CPU
- Node.js Event Loop - Single-threaded concurrency model
- IPC (Inter-Process Communication) - Pipes, sockets, shared memory`,
    estimatedMin: 20,
    difficulty: "BEGINNER",
    companies: ["Google", "NGINX", "Redis", "PostgreSQL", "Node.js"],
    tags: ["processes", "threads", "concurrency", "os", "scheduling"],
  },

  {
    id: "lesson-os-02",
    slug: "networking-os-security-09-concurrency-vs-parallelism",
    title: "Concurrency vs Parallelism",
    content: `## 1. Quick Summary

**Concurrency** is about dealing with many things at once (structuring programs for multiple tasks). **Parallelism** is about doing many things at once (execution on multiple cores). Concurrency enables responsiveness and non-blocking I/O; parallelism enables throughput for CPU-bound work. They are related but distinct: you can have concurrency without parallelism (single-core multitasking) and parallelism without concurrency (SIMD vector instructions).

## 2. Definition

**Concurrency** (Rob Pike): "Composition of independently executing computations." It is a **design concept** - breaking a program into multiple tasks that can make progress in overlapping time periods. Tasks may run interleaved (time-slicing) or in parallel.

**Parallelism** is a **runtime concept** - executing multiple computations simultaneously on different processing units (CPU cores, GPUs, machines). Requires hardware support.

**Rob Pike's law**: "Concurrency is about structure; parallelism is about execution."

## 3. Why It Exists / Problem It Solves

**Concurrency solves:** Responsiveness (UI stays interactive while network requests complete), I/O efficiency (one thread can handle thousands of I/O operations concurrently via event loops), and cleaner code (producer-consumer, pipelines).

**Parallelism solves:** Throughput (use all CPU cores for compute-intensive work), real-time constraints (video processing, game physics), and data processing (MapReduce, SIMD, GPU).

## 4. When to Use It

**Use concurrency when:** I/O-bound workloads (HTTP requests, database queries, file reads), interactive applications (UI + background data fetching), service architectures (request to multiple downstream API calls to aggregate), or producer-consumer patterns.

**Use parallelism when:** CPU-bound computations (image processing, video encoding, matrix math), large data processing (batch ETL), real-time processing (audio DSP, game physics), or parallel algorithms (sorting on partitioned data).

## 5. When NOT to Use It / Tradeoffs

**Concurrency tradeoffs:** Complexity (race conditions, deadlocks, livelocks), debugging difficulty (non-deterministic Heisenbugs), overhead (context switching, synchronization primitives).

**Parallelism tradeoffs:** Amdahl's Law (speedup limited by serial portion, even with infinite cores), diminishing returns (communication/synchronization overhead), hardware complexity (cache coherency, NUMA, false sharing).

## 6. How It Works (Deep Mechanics)

**Concurrency Models:**
1. Thread-based: Java threads, pthreads. Heavy, kernel-scheduled.
2. Event-driven: Node.js event loop, epoll/kqueue. Single-threaded, non-blocking.
3. Coroutines/Fibers: Lua, Python greenlets. User-space cooperative multitasking.
4. Async/Await: C#, JavaScript, Python, Rust. Compiler transforms into state machines.
5. CSP (Communicating Sequential Processes): Go goroutines + channels.
6. Actor model: Erlang, Akka. Isolated actors, message passing.

**Amdahl's Law:**
Speedup = 1 / ((1 - P) + P/N) where P = parallelizable fraction, N = processors.
Example: 80% parallel, 4 cores = 2.5x speedup.

**Goroutine vs OS Thread:**
Goroutines: ~4KB stack (grows), ~1us creation, user-space context switch.
OS Threads: ~1MB stack (fixed), ~1ms creation, kernel context switch.

## 7. Architecture Diagram

\`\`\`
Concurrency (single core, time-sliced):

Thread A | ==    ==    ==    |
Thread B |   ==    ==    ==  |
Thread C |     ==      ==    |
Tasks make progress in overlapping intervals,
but only one runs at any instant.

Parallelism (multi-core):

Core 0   | ================ |
Core 1   | ================ |
Core 2   | ================ |
Core 3   | ================ |
Multiple tasks execute simultaneously.
\`\`\`

## 8. Real-World Flow Example

**Web search engine (Google Search):**

1. User types "system design interview"
2. Frontend service concurrently fans out to spell check, autocomplete, personalization
3. Query is sent to a parallel sharded index across 1000 machines
4. Each shard searches its portion in parallel; results aggregated and ranked in parallel
5. Snippet generation: fetch page content for top 10 results concurrently
6. Total: ~200ms (IO concurrent + CPU parallel)

## 9. Reference Implementation Example

\`\`\`typescript
// Concurrency: async/await for I/O-bound work
async function fetchUserData(userId: string) {
  const [profile, posts, friends] = await Promise.all([
    fetch('/api/users/' + userId + '/profile'),
    fetch('/api/users/' + userId + '/posts'),
    fetch('/api/users/' + userId + '/friends'),
  ]);
  return { profile, posts, friends };
}

// Channel (CSP style)
class Channel<T> {
  private queue: T[] = [];
  private resolvers: ((value: T) => void)[] = [];

  async send(value: T): Promise<void> {
    if (this.resolvers.length > 0) this.resolvers.shift()!(value);
    else this.queue.push(value);
  }

  async receive(): Promise<T> {
    if (this.queue.length > 0) return this.queue.shift()!;
    return new Promise(resolve => this.resolvers.push(resolve));
  }
}

// Producer-consumer with channel
async function producer(ch: Channel<number>) {
  for (let i = 0; i < 10; i++) await ch.send(i);
}

async function consumer(ch: Channel<number>) {
  for (let i = 0; i < 10; i++) console.log('Consumed:', await ch.receive());
}

async function run() {
  const ch = new Channel<number>();
  await Promise.all([producer(ch), consumer(ch)]);
}
\`\`\`

## 10. Real Company Use Cases

- **Google**: MapReduce (parallel processing); Borg/Omega scheduler (concurrent resource management)
- **Cloudflare**: Workers (isolated V8 isolates - concurrent by default); Durable Objects (actor model)
- **Netflix**: Concurrency for microservice fan-out; Parallelism for video encoding
- **Microsoft**: C# async/await at language level; TPL (Task Parallel Library) for data parallelism
- **Go Team**: Goroutines and channels; used by Docker, Kubernetes, CockroachDB

## 11. Common Interview Questions

1. "Explain the difference between concurrency and parallelism." - Concurrency is about structure; parallelism is about execution
2. "What is Amdahl's Law and why does it matter?" - Shows diminishing returns; even infinite cores cannot accelerate past serial bottleneck
3. "What are the different concurrency models?" - Thread-based, event-driven, async/await, CSP, actor model, coroutines
4. "How does the Go scheduler work?" - M:N scheduling: G (goroutine) onto M (thread) via P (processor); work-stealing
5. "Compare async/await in JavaScript vs goroutines in Go" - JS: single-threaded, cooperative. Go: M:N threading, preemptive

## 12. Related Topics & Next Steps

- Processes vs Threads - The execution units that enable concurrency
- Node.js Event Loop - JavaScript's concurrency model
- Operating System Scheduling - How OS manages concurrency at kernel level
- Distributed Systems - Concurrency and parallelism across machines
- Race Conditions & Synchronization - The challenges of concurrent programming`,
    estimatedMin: 18,
    difficulty: "INTERMEDIATE",
    companies: ["Google", "Cloudflare", "Netflix", "Microsoft", "Docker"],
    tags: ["concurrency", "parallelism", "goroutines", "async", "scheduling"],
  },

  {
    id: "lesson-os-03",
    slug: "networking-os-security-10-memory-management-virtual-memory",
    title: "Memory Management & Virtual Memory",
    content: `## 1. Quick Summary

**Virtual memory** gives each process its own isolated address space, abstracting physical RAM through page tables. The OS maps virtual pages to physical frames, handles page faults, and manages swapping. **Memory management** includes allocation (malloc/free, garbage collection), paging, segmentation, and protection. This abstraction enables security (process isolation), efficiency (shared libraries mapped once), and the illusion of near-infinite memory.

## 2. Definition

**Virtual memory** is an OS abstraction that separates the memory addresses used by a process (virtual addresses) from the actual physical memory locations (physical addresses). The mapping is maintained via page tables. The **Memory Management Unit (MMU)** in the CPU hardware translates virtual to physical on every memory access.

**Memory management** encompasses: physical memory allocation (buddy allocator, slab allocator), virtual memory management (page tables, TLB, swap), heap management (malloc arenas, garbage collection), and protection (read/write/execute permissions, ASLR).

## 3. Why It Exists / Problem It Solves

Without virtual memory, programs would conflict (two programs cannot both use address 0x1000 simultaneously), fragment physical memory, overcommit (cannot run programs exceeding physical RAM), and lack isolation. Virtual memory solves isolation (Process A cannot access Process B's pages), security (ASLR randomizes base addresses), overcommit (allocate more virtual than physical; demand-page only what is accessed), and shared memory (map same physical page into multiple processes).

## 4. When to Use It

- Every modern OS: Linux, Windows, macOS all use virtual memory by default
- Large datasets: Memory-mapped files (mmap) allow accessing files larger than physical RAM
- Shared libraries: .so/.dll files loaded once in physical memory, mapped into millions of processes
- Copy-on-write (fork): Child process shares parent's pages until one writes (efficient fork)
- Memory debugging: AddressSanitizer, Valgrind use virtual memory tricks

## 5. When NOT to Use It / Tradeoffs

- **Performance overhead**: TLB misses (10-100 cycles); page walks for multi-level page tables
- **Real-time systems**: Page faults cause unpredictable delays (use mlockall to pin pages)
- **Embedded**: Page tables add overhead; some RTOS skip virtual memory entirely
- **Swap thrashing**: Overcommitted memory leads to constant page-in/page-out

## 6. How It Works (Deep Mechanics)

**Page Table Walk (x86-64 4-level paging):**
Virtual address (48-bit): PML4 (9) | PDPT (9) | PD (9) | PT (9) | Offset (12). Each level has 512 entries at 8 bytes = 16KB per process.

**Page Fault Handling:**
1. CPU accesses virtual address; MMU checks TLB to miss
2. MMU walks page table to entry has Present=0
3. MMU raises page fault, OS fault handler runs
4. OS checks: valid mapping but paged out? read from swap. Valid mapping but lazy allocation? allocate zero-filled page. Invalid address? deliver SIGSEGV
5. OS updates page table entry, loads TLB
6. CPU retries the instruction

**Buddy Allocator**: Free memory split into power-of-2-size blocks. Free lists per order. Allocation finds smallest block, splits recursively. Deallocation merges buddy blocks.

## 7. Architecture Diagram

\`\`\`
CPU Core
+---------+  +---------+  +-------------------+
|  MMU    |  |   TLB   |  |  Page Table Base  |
| Virtual |->|  Cache  |->|  (CR3 register)   |
| to Phys |  | (fast)  |  +--------+----------+
+---------+  +---------+           |
                                   v
+----------------------------------+----------+
|              Main Memory (RAM)              |
|  +---------+ +---------+ +---------+       |
|  | Process | | Process | |  Page   |       |
|  |  A PFN  | |  B PFN  | |  Cache  |       |
|  +---------+ +---------+ +---------+       |
|  +--------------------------------------+  |
|  |          Swap (Disk)                 |  |
|  |  Pages evicted from RAM to swap file |  |
|  +--------------------------------------+  |
+--------------------------------------------+

Kswapd (Linux): background thread that evicts pages when free memory is low.
\`\`\`

## 8. Real-World Flow Example

**Node.js starts up:**

1. Kernel creates process: allocates task_struct, 4KB for kernel stack, next PID
2. Execve loads Node binary: maps text segment (code) from file to page cache, maps data segment (globals) to zero-fill on demand, allocates stack to grows on page faults
3. Node's V8 engine creates heap: uses mmap to allocate large virtual regions (e.g., 1GB reserved). Only physical pages for actually used portion (demand paging)
4. require('express') to dynamic linking: kernel maps libexpress.so into address space (shared if already loaded)
5. Working set = pages frequently accessed; during idle, some pages swapped out
6. If RAM is full, OOM killer selects and terminates process

## 9. Reference Implementation Example

\`\`\`typescript
// Virtual memory simulation
interface Page {
  number: number;
  physicalFrame: number | null;
  present: boolean;
}

class VirtualMemorySimulator {
  private pageTable: Page[] = [];
  private physicalMemory = new Map<number, string>();
  private tlb = new Map<number, number>();
  private ttlHit = 0;
  private ttTotal = 0;

  constructor(
    private pageSize: number = 4096,
    private physicalFrames: number = 256,
    private addressSpace: number = 0x100000000
  ) {
    for (let i = 0; i < this.addressSpace / this.pageSize; i++) {
      this.pageTable.push({ number: i, physicalFrame: null, present: false });
    }
  }

  translate(virtualAddress: number): number | null {
    this.ttTotal++;
    const vpn = Math.floor(virtualAddress / this.pageSize);
    const offset = virtualAddress % this.pageSize;

    const pfn = this.tlb.get(vpn);
    if (pfn !== undefined) {
      this.ttlHit++;
      return pfn * this.pageSize + offset;
    }

    const pte = this.pageTable[vpn];
    if (!pte) return null;

    if (!pte.present) this.handlePageFault(vpn);

    if (this.tlb.size >= 64) {
      const firstKey = this.tlb.keys().next().value!;
      this.tlb.delete(firstKey);
    }
    this.tlb.set(vpn, pte.physicalFrame!);

    return pte.physicalFrame! * this.pageSize + offset;
  }

  private handlePageFault(vpn: number): void {
    const pte = this.pageTable[vpn];
    const frame = this.findFreeFrame();
    this.physicalMemory.set(frame, '');
    pte.physicalFrame = frame;
    pte.present = true;
  }

  private findFreeFrame(): number {
    for (let i = 0; i < this.physicalFrames; i++) {
      if (!this.physicalMemory.has(i)) return i;
    }
    throw new Error('OOM');
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Google Chrome**: Multi-process with memory isolation; each tab is separate process; Out-of-Process Iframes (OOPIF)
- **Redis**: In-memory data store; explicit memory management with jemalloc
- **PostgreSQL**: Shared buffer pool (shared memory), process-per-connection model, uses mmap for WAL files
- **V8 (Node.js/Chrome)**: Garbage-collected heap; uses pointer compression (32-bit offsets in 64-bit address space)
- **Android**: Low-memory killer (LMK) evicts app processes based on LRU + oom_adj scores

## 11. Common Interview Questions

1. "How does virtual memory work?" - MMU translates virtual to physical via page tables; page faults trigger OS handler
2. "What is demand paging?" - Pages brought into physical memory only when accessed; never-accessed pages never consume physical RAM
3. "What is the difference between a TLB miss and a page fault?" - TLB miss: translation not cached but page in memory. Page fault: page not in memory
4. "Explain copy-on-write (COW)" - fork() creates child sharing parent's pages; when either writes, a private copy is made
5. "What is thrashing and how do you diagnose it?" - System spends more time paging than executing; high page fault rate

## 12. Related Topics & Next Steps

- Processes vs Threads - Each process has its own virtual address space
- File Systems - VFS layer interacts with page cache for file I/O
- Operating System Scheduling - Context switches flush TLB
- Memory Allocation - malloc/free, slab allocator, buddy allocator
- Garbage Collection - Automatic memory reclamation`,
    estimatedMin: 22,
    difficulty: "ADVANCED",
    companies: ["Google", "Redis", "PostgreSQL", "Android", "Microsoft"],
    tags: ["memory-management", "virtual-memory", "paging", "mmu", "os"],
  },

  {
    id: "lesson-os-04",
    slug: "networking-os-security-11-file-systems-basics",
    title: "File Systems Basics",
    content: `## 1. Quick Summary

A **file system** organizes how data is stored and retrieved on storage devices. It provides a hierarchical namespace (directories/files), manages physical block allocation, tracks metadata (permissions, timestamps), and ensures data integrity. From ext4 and NTFS to distributed file systems like HDFS and S3, the file system is the backbone of persistent storage.

## 2. Definition

A file system is the OS component that controls how data is named, stored, organized, and retrieved on a block storage device. It provides: abstraction (files and directories hide raw block operations), organization (hierarchical naming), persistence (data survives across reboots via journaling), access control (POSIX permissions, ACLs), and performance (buffering, caching, read-ahead).

## 3. Why It Exists / Problem It Solves

Without file systems, storage would be raw block addresses - no names, no directories, no permissions. File systems solve naming (human-readable paths instead of block numbers), fragmentation (tracks free blocks efficiently), reliability (journaling prevents corruption from crashes), sharing (concurrent access with locking), and performance (buffer cache, read-ahead, write coalescing).

## 4. When to Use It

- Every OS boot: Root file system mounted from boot device
- Database storage: PostgreSQL uses its own WAL + data files
- Log management: Append to logs, rotate, archive
- Distributed storage: NAS/SAN, NFS, S3, HDFS
- Container images: OverlayFS for Docker layers
- Temporary files: /tmp, swap files, caching

## 5. When NOT to Use It / Tradeoffs

- Raw block devices: Databases sometimes bypass FS for performance (Oracle ASM)
- High-throughput sequential writes: O_DIRECT avoids double caching
- Distributed systems: Traditional POSIX FS does not scale across machines; use HDFS, Ceph
- SSD optimization: FTL inside SSD makes some FS optimizations redundant
- Embedded: Simple flash may use raw MTD partitions without a full FS

## 6. How It Works (Deep Mechanics)

**ext4 Inode:**
struct ext4_inode contains: i_mode (file type + permissions), i_uid (owner), i_size (file size), i_atime, i_ctime, i_mtime, i_blocks (blocks allocated), i_block[15] (12 direct + 1 indirect + 1 double indirect + 1 triple indirect block pointers).

**Reading /etc/nginx/nginx.conf (ext4 flow):**
1. Path walk: find root inode (2) to read root directory to find "etc" (inode 38495)
2. Read "etc" directory to find "nginx" (inode 50102) to read "nginx" dir to find "nginx.conf" (inode 72354)
3. Read inode 72354: file size 2847 bytes, permissions 644, owner root
4. i_block[0] to direct block pointer to block 8472 to read 4KB
5. Return data

**Journaling (ext4 with journal):**
1. Write transaction to journal: "Create file /var/log/nginx/access.log"
2. Apply transaction to main filesystem
3. After successful application, remove from journal
4. If crash occurs during step 2, replay journal on mount

## 7. Architecture Diagram

\`\`\`
Virtual File System (VFS) Layer
+--------------------------------------------------+
|  System Calls: open(), read(), write(), close()  |
+--------------------------------------------------+
|  VFS (generic operations, dentry cache, inode    |
|       cache, mount table)                         |
+--------------------------------------------------+
|  ext4   |  NTFS  |  XFS   |  Btrfs  |  FUSE     |
+--------------------------------------------------+
|  Block Layer (I/O scheduler, request queue)       |
+--------------------------------------------------+
|  Storage Driver (SATA, NVMe, virtio)              |
+--------------------------------------------------+
|  Physical Disk (HDD, SSD, NVMe)                   |
+--------------------------------------------------+
\`\`\`

## 8. Real-World Flow Example

**Docker container uses OverlayFS:**

1. Base image layer: ubuntu:22.04 (read-only, shared across containers)
2. Container layer: writable overlay on top
3. When container reads /etc/passwd, OverlayFS checks upper layer first (miss) to lower layer (hit)
4. When container modifies /etc/hosts, OverlayFS copies file from lower to upper (copy-up), then modifies
5. When container is deleted, only the writable layer is removed; base image stays for the next container

## 9. Reference Implementation Example

\`\`\`typescript
import * as fs from 'fs';
import * as path from 'path';

// Simple in-memory file system simulation
class InMemoryFileSystem {
  private root: FSDirectory;

  constructor() {
    this.root = { type: 'directory', children: new Map(), permissions: '755' };
  }

  writeFile(filePath: string, content: string): void {
    const parts = filePath.split('/').filter(Boolean);
    let current = this.root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current.children.has(parts[i])) {
        current.children.set(parts[i], { type: 'directory', children: new Map(), permissions: '755' });
      }
      current = current.children.get(parts[i]) as FSDirectory;
    }
    current.children.set(parts[parts.length - 1], { type: 'file', content, permissions: '644' });
  }

  readFile(filePath: string): string | null {
    const parts = filePath.split('/').filter(Boolean);
    let current: FSNode = this.root;
    for (const part of parts) {
      if (current.type !== 'directory') return null;
      const child = (current as FSDirectory).children.get(part);
      if (!child) return null;
      current = child;
    }
    return current.type === 'file' ? (current as FSFile).content : null;
  }
}

interface FSNode { type: 'file' | 'directory'; permissions: string; }
interface FSFile extends FSNode { type: 'file'; content: string; }
interface FSDirectory extends FSNode { type: 'directory'; children: Map<string, FSNode>; }
\`\`\`

## 10. Real Company Use Cases

- **Netflix**: Uses S3 (object store, not traditional POSIX FS) for video assets; Apache Iceberg for metadata
- **Google File System (GFS)**: Distributed FS for Google's search index; precursor to HDFS
- **Amazon EBS**: Block storage with ext4/XFS as the file system on top
- **Docker**: OverlayFS for container image layering; copy-on-write for efficient storage
- **Cloudflare**: Workers KV is a key-value store (not a traditional FS) built on top of distributed storage

## 11. Common Interview Questions

1. "How does a file system work?" - Organizes blocks into files using inodes; directories map names to inodes
2. "What is the difference between a hard link and a symbolic link?" - Hard link: same inode, cannot cross filesystems. Symlink: separate inode pointing to path
3. "What is journaling and why is it important?" - Writes transaction to journal before applying to main FS; prevents corruption on crash
4. "How does a VFS work?" - Abstraction layer that provides common interface for different FS implementations
5. "What is copy-on-write in file systems?" - Btrfs, ZFS: modified blocks written to new location instead of overwriting; enables snapshots

## 12. Related Topics & Next Steps

- Memory Management & Virtual Memory - Page cache interacts with file systems
- Storage Architecture - RAID, SSD, HDD, NVMe
- Distributed File Systems - HDFS, Ceph, GlusterFS
- Object Storage - S3, GCS, Azure Blob
- Containers & OverlayFS - Layered file systems for container images`,
    estimatedMin: 18,
    difficulty: "INTERMEDIATE",
    companies: ["Netflix", "Google", "Amazon", "Docker", "Cloudflare"],
    tags: ["file-systems", "ext4", "storage", "vfs", "os"],
  },

  {
    id: "lesson-security-01",
    slug: "networking-os-security-12-encryption-symmetric-asymmetric",
    title: "Encryption (Symmetric vs Asymmetric)",
    content: `## 1. Quick Summary

**Symmetric encryption** uses the same key for encryption and decryption (AES, ChaCha20). It is fast and suitable for bulk data. **Asymmetric encryption** uses a public/private key pair (RSA, ECC). It is slower but solves key distribution. In practice, they are combined: asymmetric key exchange establishes a symmetric session key, which then encrypts the data. This hybrid approach is used in TLS, SSH, and Signal.

## 2. Definition

**Symmetric encryption**: A single shared key encrypts and decrypts data. Algorithms include AES (Advanced Encryption Standard) in various modes (GCM, CBC, CTR) and ChaCha20-Poly1305. The challenge is securely sharing the key between parties.

**Asymmetric encryption**: Each party has a key pair: a public key (shared freely) and a private key (kept secret). Data encrypted with the public key can only be decrypted with the private key (and vice versa). Algorithms include RSA, ECDSA, Ed25519, and X25519 for key exchange.

## 3. Why It Exists / Problem It Solves

**The key distribution problem**: Before asymmetric crypto, two parties needed a pre-shared secret, which required a secure channel to agree upon. Asymmetric crypto enables secure communication without prior arrangement.

**Symmetric exists because**: Asymmetric crypto is 100-1000x slower. Encrypting a 4KB file with RSA would take milliseconds per block. Symmetric ciphers are hardware-accelerated (AES-NI) and can encrypt at gigabytes per second.

**The hybrid solution**: Use asymmetric crypto for key exchange (slow but solves distribution), then symmetric crypto for bulk data (fast).

## 4. When to Use It

**Symmetric**: Encrypting data at rest (database encryption, file encryption), bulk data transfer, VPN tunnels (IPsec uses AES), disk encryption (LUKS, BitLocker).

**Asymmetric**: Key exchange (TLS handshake, SSH key exchange, IKE in IPsec), digital signatures (code signing, document signing, blockchain transactions), certificate verification (X.509 certificates), PGP/GPG email encryption.

## 5. When NOT to Use It / Tradeoffs

**Symmetric tradeoffs:** Key distribution is hard (must securely share the key), no non-repudiation (both parties can encrypt/decrypt), key management at scale (N parties = N(N-1)/2 keys).

**Asymmetric tradeoffs:** 100-1000x slower than symmetric, larger ciphertext expansion (RSA adds ~256 bytes per block), vulnerable to quantum attacks (Shor's algorithm breaks RSA/ECC, but not AES), keys must be longer (RSA 2048-bit vs AES 128-bit for equivalent security).

## 6. How It Works (Deep Mechanics)

**AES-GCM (symmetric, authenticated encryption):**

1. Key expansion: AES key schedule expands 128/192/256-bit key into round keys
2. Encryption: SubBytes (S-box substitution), ShiftRows (permutation), MixColumns (matrix multiplication), AddRoundKey (XOR)
3. GCM mode: Counter mode encryption + GHASH authentication tag
4. Output: ciphertext + authentication tag (ensures both confidentiality and integrity)

**Elliptic Curve Diffie-Hellman (ECDHE, asymmetric key exchange):**

1. Both parties agree on a curve (e.g., Curve25519) and generator point G
2. Alice generates private key a, computes public key A = a * G
3. Bob generates private key b, computes public key B = b * G
4. Alice computes shared secret S = a * B = a * b * G
5. Bob computes shared secret S = b * A = b * a * G
6. An eavesdropper sees A and B but cannot compute a or b (elliptic curve discrete log problem)

## 7. Architecture Diagram

\`\`\`
Symmetric Encryption (AES-GCM):
+-------+                +-------+
| Plain |                |Cipher |
| Text  |                | Text  |
+---+---+                +---+---+
    |                        ^
    v                        |
+---+---+  +-------+  +---+---+
| AES   |--|  Key  |--| AES   |
| Enc   |  +-------+  | Dec   |
+-------+              +-------+
    |                        ^
    v                        |
+-------+              +-------+
|Cipher |              | Plain |
| Text  |              | Text  |
+-------+              +-------+

Asymmetric + Symmetric Hybrid (TLS):
1. Client to Server: ECDHE key exchange
2. Both derive shared symmetric key
3. Client encrypts HTTP with AES-GCM using symmetric key
4. Server decrypts with same symmetric key
\`\`\`

## 8. Real-World Flow Example

**HTTPS connection (TLS 1.3):**

1. Client sends ClientHello with key_share (X25519 public key)
2. Server responds with its key_share + certificate (signed with its private key, verified with its public key)
3. Both derive shared secret via ECDHE (asymmetric key exchange)
4. Both derive AES-256-GCM session key via HKDF (symmetric)
5. All subsequent data encrypted with AES-256-GCM (symmetric) using the session key
6. Typical throughput: millions of TLS handshakes per second on modern hardware with AES-NI

## 9. Reference Implementation Example

\`\`\`typescript
import * as crypto from 'crypto';

// Symmetric encryption with AES-256-GCM
function encryptSymmetric(plaintext: string, key: Buffer): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

function decryptSymmetric(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
}

// Asymmetric key pair generation and signing
function generateKeyPair(): { publicKey: Buffer; privateKey: Buffer } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });
  return { publicKey, privateKey };
}

function sign(data: Buffer, privateKey: Buffer): Buffer {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  return sign.sign({ key: privateKey, format: 'der', type: 'pkcs8' });
}

function verify(data: Buffer, signature: Buffer, publicKey: Buffer): boolean {
  const verify = crypto.createVerify('SHA256');
  verify.update(data);
  return verify.verify({ key: publicKey, format: 'der', type: 'spki' }, signature);
}

// Hybrid: encrypt with symmetric key, wrap key with asymmetric
function hybridEncrypt(plaintext: string, recipientPublicKey: Buffer): Buffer {
  const symmetricKey = crypto.randomBytes(32); // AES-256 key
  const encrypted = encryptSymmetric(plaintext, symmetricKey);
  const wrappedKey = crypto.publicEncrypt(recipientPublicKey, symmetricKey);
  return Buffer.concat([wrappedKey, encrypted.iv, encrypted.tag, encrypted.ciphertext]);
}
\`\`\`

## 10. Real Company Use Cases

- **Signal Protocol**: Uses X3DH (asymmetric key agreement) + AES-GCM (symmetric) for end-to-end encrypted messaging
- **Google**: Uses ECDHE + AES-GCM in TLS for all HTTPS traffic; internal ALTS (Application Layer Transport Security)
- **AWS KMS**: Key Management Service; generates and protects symmetric keys (AES-256) and asymmetric keys (RSA, ECC)
- **Visa/Mastercard**: EMV chip cards use RSA or ECC for authentication and AES for transaction encryption
- **Apple FileVault**: Disk encryption using AES-XTS (symmetric); recovery key uses asymmetric crypto

## 11. Common Interview Questions

1. "What is the difference between symmetric and asymmetric encryption?" - Same key vs key pair; fast vs slow; key distribution problem solved
2. "Why do we use both together in TLS?" - Asymmetric for secure key exchange (ECDHE), symmetric for bulk encryption (AES-GCM)
3. "What is forward secrecy?" - Ephemeral key exchange ensures compromising long-term key does not expose past sessions
4. "What are the different modes of AES?" - ECB (bad), CBC (needs IV), GCM (authenticated, recommended), CTR (counter), XTS (disk encryption)
5. "How does RSA work at a high level?" - Based on factoring large primes; encryption: m^e mod n, decryption: c^d mod n
6. "Why do we need to move to post-quantum cryptography?" - Shor's algorithm breaks RSA and ECC; NIST is standardizing CRYSTALS-Kyber, Dilithium

## 12. Related Topics & Next Steps

- TLS/SSL & HTTPS Handshake - The real-world application of hybrid encryption
- Firewalls & Network Security - How encryption interacts with network security
- VPNs & Proxies - Encryption in tunnel protocols
- Cryptography Fundamentals - Hash functions, digital signatures, HMAC
- Post-Quantum Cryptography - Preparing for the quantum threat`,
    estimatedMin: 20,
    difficulty: "INTERMEDIATE",
    companies: ["Signal", "Google", "AWS", "Visa", "Apple"],
    tags: ["encryption", "symmetric", "asymmetric", "aes", "rsa", "ecc"],
  },

  {
    id: "lesson-security-02",
    slug: "networking-os-security-13-firewalls-network-security",
    title: "Firewalls & Network Security Basics",
    content: `## 1. Quick Summary

**Firewalls** are network security devices that monitor and control incoming and outgoing traffic based on predetermined rules. They range from simple packet filters (Layer 3/4) to stateful inspection, application-layer firewalls (Layer 7/WAF), and next-generation firewalls (NGFW). Network security encompasses firewalls, IDS/IPS, network segmentation, access control lists (ACLs), and zero-trust architectures.

## 2. Definition

A **firewall** is a network security system that enforces an access control policy between networks. Types include:

- **Packet-filtering firewall**: Inspects packet headers (IP, port, protocol). Stateless, fast, simple.
- **Stateful firewall**: Tracks connection state (SYN, SYN-ACK, ACK, established). Allows return traffic automatically.
- **Application-layer firewall (WAF)**: Inspects HTTP/HTTPS payload. Blocks SQL injection, XSS, CSRF.
- **Next-Generation Firewall (NGFW)**: Combines stateful inspection, IPS, application awareness, and threat intelligence.

## 3. Why It Exists / Problem It Solves

Without firewalls, any computer connected to the internet is reachable from anywhere. Firewalls provide:
- **Access control**: Only allow traffic that matches policy (default deny vs default allow)
- **Network segmentation**: Isolate production, staging, development networks
- **Threat prevention**: Block known malicious IPs, ports, and patterns
- **Audit and logging**: Record all network connections for forensic analysis
- **Compliance**: PCI DSS, HIPAA, SOC 2 require firewall controls

## 4. When to Use It

- **Perimeter security**: Firewall between internet and internal network (edge firewall)
- **Internal segmentation**: Firewall between application tiers (web to app to DB)
- **Cloud environments**: Security Groups (stateful) and Network ACLs (stateless) in AWS VPC
- **Web applications**: WAF to protect against OWASP Top 10 vulnerabilities
- **Zero-trust**: Micro-segmentation with per-service firewalls (e.g., Calico in Kubernetes)

## 5. When NOT to Use It / Tradeoffs

- **False sense of security**: Firewalls cannot protect against insider threats, phishing, or encrypted attacks (bypass via HTTPS)
- **Performance impact**: Deep packet inspection adds latency; NGFWs can introduce 50-100us per packet
- **Rule complexity**: Outdated or overly complex rule sets cause misconfigurations and security gaps
- **Encrypted traffic blind spot**: Most firewalls cannot inspect TLS-encrypted traffic without MITM decryption
- **Operational overhead**: Managing firewall rules at scale requires automation (Infrastructure as Code)

## 6. How It Works (Deep Mechanics)

**Packet-filtering (stateless):**
Checks: source IP, dest IP, source port, dest port, protocol (TCP/UDP/ICMP), TCP flags (SYN, ACK, RST). Each packet evaluated independently. Cannot track connection state.

**Stateful firewall state table:**

\`\`\`
Source IP     | Source Port | Dest IP    | Dest Port | Protocol | State
192.168.1.100 | 54321       | 10.0.0.1   | 80        | TCP      | ESTABLISHED
10.0.0.1      | 80          | 192.168.1.100| 54321    | TCP      | ESTABLISHED
192.168.1.100 | 54322       | 10.0.0.2   | 443       | TCP      | TIME_WAIT
\`\`\`

**WAF inspection of HTTP request:**
1. Decode URL, query params, POST body
2. Apply regex rules (OWASP CRS - Core Rule Set)
3. Check for: SQL injection (\\' OR 1=1 --), XSS (<script>alert(1)</script>), path traversal (../../../etc/passwd)
4. Block, log, or pass based on score

## 7. Architecture Diagram

\`\`\`
Internet
    |
    v
+-------------------+
|  Edge Firewall     |  (Stateful, blocks all inbound except 80/443)
+-------------------+
    |
    v
+-------------------+
|  WAF (Layer 7)     |  (Inspects HTTP, blocks SQLi/XSS)
+-------------------+
    |
    v
+-------------------+
|  Load Balancer     |  (TLS termination, routing)
+-------------------+
    |
    v
+-------------------+    +-------------------+    +-------------------+
|  Web Tier         |    |  App Tier         |    |  DB Tier          |
|  10.0.1.0/24     |    |  10.0.2.0/24      |    |  10.0.3.0/24      |
+-------------------+    +-------------------+    +-------------------+
    |                       |                       |
    |    App FW (L7)        |    App FW (L4)        |    No direct
    |    HTTP to App        |    App:5432 to DB     |    internet access
    +-----------------------+-----------------------+
\`\`\`

## 8. Real-World Flow Example

**E-commerce checkout (AWS with WAF + Security Groups):**

1. User submits checkout form with credit card
2. Request hits AWS WAF (inspects for SQL injection in card_number field - blocked)
3. WAF allows traffic to ALB (Application Load Balancer)
4. ALB terminates TLS, forwards to Web tier via Security Group rule (only ALB can access web tier on port 80)
5. Web tier forwards to App tier via Security Group rule (only web tier on port 3000)
6. App tier queries RDS database via Security Group rule (only app tier on port 5432)
7. RDS Security Group: inbound only from app tier, no public access

## 9. Reference Implementation Example

\`\`\`typescript
// Firewall rule engine simulation
interface FirewallRule {
  id: string;
  action: 'ALLOW' | 'DENY';
  priority: number;
  srcIP?: string;
  dstIP?: string;
  srcPort?: number;
  dstPort?: number;
  protocol?: 'TCP' | 'UDP' | 'ICMP';
  state?: 'NEW' | 'ESTABLISHED';
}

interface Packet {
  srcIP: string;
  dstIP: string;
  srcPort: number;
  dstPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  flags?: string[]; // TCP flags
}

class StatefulFirewall {
  private rules: FirewallRule[] = [];
  private connectionTable = new Map<string, string>(); // connection key to state

  addRule(rule: FirewallRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  evaluate(packet: Packet): boolean {
    // Check state table for established connections
    const connKey = packet.srcIP + ':' + packet.srcPort + '-' + packet.dstIP + ':' + packet.dstPort;
    const reverseKey = packet.dstIP + ':' + packet.dstPort + '-' + packet.srcIP + ':' + packet.srcPort;

    if (this.connectionTable.has(connKey) || this.connectionTable.has(reverseKey)) {
      if (packet.flags?.includes('ACK') || packet.flags?.includes('RST')) {
        return true; // Established connections allowed
      }
    }

    // Evaluate rules
    for (const rule of this.rules) {
      if (this.matchesRule(packet, rule)) {
        if (rule.action === 'ALLOW' && packet.flags?.includes('SYN') && !packet.flags?.includes('ACK')) {
          this.connectionTable.set(connKey, 'ESTABLISHED');
        }
        return rule.action === 'ALLOW';
      }
    }

    return false; // Default deny
  }

  private matchesRule(packet: Packet, rule: FirewallRule): boolean {
    if (rule.protocol && rule.protocol !== packet.protocol) return false;
    if (rule.dstPort && rule.dstPort !== packet.dstPort) return false;
    if (rule.srcIP && !this.ipMatches(packet.srcIP, rule.srcIP)) return false;
    if (rule.dstIP && !this.ipMatches(packet.dstIP, rule.dstIP)) return false;
    return true;
  }

  private ipMatches(ip: string, pattern: string): boolean {
    if (pattern.includes('/')) {
      // CIDR matching (simplified)
      return ip.startsWith(pattern.split('/')[0]);
    }
    return ip === pattern;
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Cloudflare WAF**: Protects 20M+ websites; uses machine learning to detect SQL injection with 99.99% accuracy; processes 30M+ HTTP requests per second
- **AWS Network Firewall**: Managed firewall service for VPCs; supports stateful inspection, domain filtering, and IPS
- **Palo Alto Networks**: NGFW market leader; used by 70% of Fortune 100; provides Panorama for centralized management
- **Netflix**: Uses Security Groups + Network ACLs for VPC segmentation; implements zero-trust with SPIFFE for service identity
- **Kubernetes NetworkPolicies**: Calico, Cilium implement firewall rules at the pod level (Layer 3/4 + Layer 7 with Cilium)

## 11. Common Interview Questions

1. "What is the difference between a stateful and stateless firewall?" - Stateful tracks connection state; stateless evaluates each packet independently
2. "How does a WAF protect against SQL injection?" - Inspects HTTP payload for SQL keywords and patterns; uses regex rules and parameterized query enforcement
3. "What is defense in depth?" - Multiple layers of security: edge firewall to WAF to host firewall to application-level security
4. "How does a firewall handle fragmented packets?" - Must reassemble fragments before inspection (IP fragment reassembly); otherwise fragments can bypass rules
5. "What is the default-deny security posture?" - Everything is blocked unless explicitly allowed; harder to maintain but more secure
6. "How do firewalls fit into a zero-trust architecture?" - No implicit trust; every request is authenticated and authorized regardless of source network

## 12. Related Topics & Next Steps

- VPNs & Proxies - How firewalls interact with encrypted tunnels
- Encryption (Symmetric vs Asymmetric) - Firewalls and encrypted traffic inspection
- DNS & DNS Resolution - DNS filtering as a security control
- Load Balancing - How firewalls integrate with load balancers
- Network Segmentation - VLANs, VPCs, and subnet design`,
    estimatedMin: 18,
    difficulty: "BEGINNER",
    companies: ["Cloudflare", "AWS", "Palo Alto Networks", "Netflix", "Kubernetes"],
    tags: ["firewalls", "network-security", "waf", "security-groups", "zero-trust"],
  },

  {
    id: "lesson-security-03",
    slug: "networking-os-security-14-vpns-proxies",
    title: "VPNs & Proxies (Forward vs Reverse Proxy)",
    content: `## 1. Quick Summary

**VPNs** create encrypted tunnels between a client and a server or between networks, extending a private network across a public one. **Forward proxies** act on behalf of clients (hiding their IPs, filtering content). **Reverse proxies** act on behalf of servers (load balancing, caching, TLS termination, hiding backend architecture). All three are fundamental to modern network architecture, security, and privacy.

## 2. Definition

**VPN (Virtual Private Network)**: Encrypted tunnel between two endpoints. Types: Site-to-Site (IPsec between offices), Remote Access (client connects to corporate network), and Cloud VPN (AWS VPN Gateway, Google Cloud VPN).

**Forward Proxy** (client-side): Sits between client and internet. Client configures proxy, which forwards requests. Hides client IP, caches content, enforces policies (content filtering).

**Reverse Proxy** (server-side): Sits in front of backend servers. Clients connect to the reverse proxy, which forwards to appropriate backend. Provides load balancing, caching, TLS termination, rate limiting, and security.

## 3. Why It Exists / Problem It Solves

**VPN solves:** Access internal resources from untrusted networks (coffee shop Wi-Fi to corporate intranet), data privacy from ISP surveillance, bypass geographic restrictions (access region-locked content).

**Forward proxy solves:** Client anonymity (hide real IP from servers), content filtering and access control (corporate proxy blocks social media), caching (reduce bandwidth), circumventing censorship.

**Reverse proxy solves:** Load distribution (distribute traffic across backend servers), TLS termination (offload certificate management from backends), caching (serve static content from cache), DDoS protection (shield backend), microservice routing (single entry point for many services).

## 4. When to Use It

**VPN:** Remote employees accessing corporate network, connecting cloud VPCs to on-premises data centers, securing IoT device communication, bypassing geo-restrictions.

**Forward Proxy:** Corporate network (web filtering, caching), ISP caching proxies, anonymous browsing (Tor, SOCKS5 proxy), web scraping (rotate IPs).

**Reverse Proxy:** Any production web service (NGINX, HAProxy), API gateway (Kong, AWS API Gateway), CDN (Cloudflare, Fastly), microservices ingress (Kubernetes Ingress Controller).

## 5. When NOT to Use It / Tradeoffs

**VPN tradeoffs:** Latency (encryption overhead), throughput reduction (10-30% on slow CPUs), complexity (IPsec configuration is notoriously difficult), split tunneling vs full tunnel (security vs performance tradeoff).

**Forward proxy tradeoffs:** Single point of failure, can introduce latency, privacy concern (proxy operator sees all traffic), not all applications support proxies.

**Reverse proxy tradeoffs:** Additional hop (adds latency), becomes single point of failure (need HA setup), TLS termination means backends see plaintext (unless using mTLS between services).

## 6. How It Works (Deep Mechanics)

**VPN (WireGuard - modern VPN protocol):**

1. Each peer has a private key and a public key (Curve25519)
2. Peers exchange public keys out-of-band
3. WireGuard creates a network interface (e.g., wg0)
4. UDP packets sent to peer's public endpoint, encrypted with the peer's public key
5. Packets decrypted and injected into peer's network stack
6. Kernel handles routing - no userspace daemon needed

**IPsec (Site-to-Site VPN):**

1. IKE Phase 1: Internet Key Exchange - authenticate peers, establish ISAKMP SA (Main/Aggressive mode)
2. IKE Phase 2: Establish IPsec SA - negotiate ESP/AH parameters, generate session keys
3. ESP (Encapsulating Security Payload): Encrypts + authenticates packets
4. Tunnel mode: Entire IP packet encapsulated (new IP header + ESP header)
5. Transport mode: Only payload encrypted (original IP header preserved)

**Reverse Proxy (NGINX request flow):**

1. Client connects to NGINX on port 443
2. NGINX terminates TLS (decrypts)
3. NGINX evaluates: virtual host (ServerName), path, rate limits
4. NGINX selects upstream: http://backend1:3000 or http://backend2:3000
5. NGINX creates new connection to backend (or reuses from connection pool)
6. NGINX sends request (possibly modified - add headers like X-Forwarded-For)
7. NGINX receives response, caches if applicable, compresses, sends to client

## 7. Architecture Diagram

\`\`\`
VPN (Remote Access):
+--------+  encrypted  +-----------+  private  +------------+
| Client |<== tunnel ==>| VPN Server |<== net ==>| Corporate  |
| Laptop |  (WireGuard) | (AWS)     |           | Resources  |
+--------+              +-----------+           +------------+

Forward Proxy:
+--------+  request   +--------+  request   +------------+
| Client |----------->| Forward|----------->| Internet   |
|        |<-----------| Proxy  |<-----------| Servers    |
+--------+  response  +--------+  response  +------------+

Reverse Proxy:
+--------+  request   +--------+  request   +------------+
| Client |----------->| Reverse|----------->| Backend 1  |
|        |           | Proxy  |---------->| Backend 2  |
|        |<-----------| (NGINX)|<-----------| Backend 3  |
+--------+  response  +--------+  response  +------------+

Combined (Typical production setup):
Internet -> Cloudflare (Reverse Proxy, DDoS, WAF) -> ALB (Reverse Proxy, TLS) -> NGINX (Reverse Proxy, caching) -> App Servers -> DB
\`\`\`

## 8. Real-World Flow Example

**Employee working from home accessing internal dashboard:**

1. User opens corporate VPN client, connects to vpn.company.com:443 (WireGuard/OpenVPN)
2. Client authenticates (certificate + password + MFA)
3. WireGuard establishes encrypted tunnel - client gets internal IP 10.0.0.42
4. User opens browser to http://dashboard.internal.company.com
5. DNS resolves to internal IP 10.0.1.50 via internal DNS
6. Packet goes through WireGuard interface, encrypted, sent to VPN gateway
7. VPN gateway decrypts, forwards to internal network, reaches dashboard server
8. Dashboard server responds, packet goes back through tunnel
9. If user disconnects, tunnel is torn down; internal resources unreachable

**E-commerce site behind CDN + Reverse Proxy:**

1. User requests https://shop.example.com
2. DNS resolves to Cloudflare edge IP (anycast, nearest PoP)
3. Cloudflare inspects: WAF rules, bot detection, rate limiting
4. If request passes, Cloudflare forwards to origin via "Argo Tunnel" (encrypted tunnel)
5. Origin's NGINX reverse proxy receives request:
   - Checks cache (Redis) for cached response -> hit: return cached
   - Miss: select backend server via least_connections algorithm
   - Forward request with X-Forwarded-For, X-Real-IP headers
6. Application server processes request, returns response
7. NGINX caches response (if cacheable), compresses (gzip), returns to Cloudflare
8. Cloudflare caches at edge, returns to client

## 9. Reference Implementation Example

\`\`\`typescript
// Reverse proxy simulation
import * as http from 'http';
import * as httpProxy from 'http-proxy';

class ReverseProxy {
  private backends: string[] = [];
  private current = 0;

  constructor(backends: string[]) {
    this.backends = backends;
  }

  // Round-robin load balancing
  private getNextBackend(): string {
    const backend = this.backends[this.current];
    this.current = (this.current + 1) % this.backends.length;
    return backend;
  }

  start(port: number): void {
    const proxy = httpProxy.createProxyServer({
      // Additional options: timeout, ssl, ws (WebSocket)
    });

    const server = http.createServer((req, res) => {
      const backend = this.getNextBackend();

      // Add headers
      req.headers['x-forwarded-for'] = req.socket.remoteAddress || '';
      req.headers['x-forwarded-proto'] = 'https';

      console.log('Proxying request to ' + backend);

      proxy.web(req, res, { target: backend }, (err) => {
        console.error('Proxy error:', err.message);
        res.writeHead(502);
        res.end('Bad Gateway');
      });
    });

    server.listen(port, () => {
      console.log('Reverse proxy listening on :' + port);
    });
  }
}

// Forward proxy simulation (SOCKS5-like)
class ForwardProxy {
  private blockedDomains: Set<string>;

  constructor(blocked?: string[]) {
    this.blockedDomains = new Set(blocked || []);
  }

  handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url || '');

    if (this.blockedDomains.has(url.hostname)) {
      res.writeHead(403);
      res.end('Blocked by proxy policy');
      return;
    }

    // Forward the request
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    });

    req.pipe(proxyReq);
  }
}

// VPN tunnel simulation (conceptual)
class WireGuardTunnel {
  private privateKey: string;
  private peerPublicKey: string;
  private sessionKey: Buffer | null = null;

  constructor(privateKey: string, peerPublicKey: string) {
    this.privateKey = privateKey;
    this.peerPublicKey = peerPublicKey;
  }

  establish(): void {
    // In real WireGuard: Curve25519 DH key exchange
    // Shared secret = DH(privateKey, peerPublicKey)
    console.log('Tunnel established');
  }

  encrypt(packet: Buffer): Buffer {
    // In real WireGuard: ChaCha20-Poly1305
    return packet; // simplified
  }

  decrypt(packet: Buffer): Buffer {
    return packet; // simplified
  }
}
\`\`\`

## 10. Real Company Use Cases

- **Cloudflare**: Operates the largest reverse proxy network (edge); used by 20% of all websites. Also offers Cloudflare WARP (VPN for consumers)
- **Tailscale**: Modern WireGuard-based VPN; uses a mesh VPN model (every node connects directly); replaces corporate VPNs with zero-config networking
- **NGINX**: Most popular reverse proxy/web server; used by 30%+ of all websites; powers Netflix CDN, WordPress.com, Hulu
- **AWS CloudFront**: CDN + reverse proxy; used by thousands of companies; integrated with AWS WAF and Lambda@Edge
- **Tor Project**: Forward proxy network for anonymous browsing; 3-hop circuit (entry, middle, exit nodes); 2M+ daily users

## 11. Common Interview Questions

1. "What is the difference between a forward proxy and a reverse proxy?" - Forward: acts for clients (hides client). Reverse: acts for servers (hides backend)
2. "How does a VPN work?" - Creates encrypted tunnel between client and server; all traffic routed through tunnel; server decrypts and forwards to destination
3. "What is split tunneling in VPNs?" - Only corporate traffic goes through VPN; internet traffic goes directly. Reduces bandwidth but security risk
4. "How does a reverse proxy improve security?" - Hides backend architecture, terminates TLS, filters malicious traffic, rate limits, WAF rules
5. "What is the difference between Layer 4 and Layer 7 load balancing?" - L4: forwards TCP/UDP connections (faster). L7: inspects HTTP content (routing, caching, header modification)
6. "How would you design a geo-distributed reverse proxy?" - Use DNS-based routing (GeoDNS) to direct users to nearest edge; each edge runs reverse proxy; origin servers behind all edges

## 12. Related Topics & Next Steps

- Firewalls & Network Security - How proxies/firewalls overlap and differ
- Load Balancing - Reverse proxies are the most common load balancers
- CDN Architecture - Reverse proxies at the edge for content delivery
- TLS/SSL & HTTPS Handshake - TLS termination at reverse proxy
- Zero-Trust Networking - VPNs are being replaced by zero-trust architectures`,
    estimatedMin: 20,
    difficulty: "INTERMEDIATE",
    companies: ["Cloudflare", "Tailscale", "NGINX", "AWS", "Tor Project"],
    tags: ["vpn", "proxy", "reverse-proxy", "forward-proxy", "wireguard", "networking"],
  },

];
