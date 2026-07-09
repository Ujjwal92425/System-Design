## 1. Hook

There are two ways to send notes across a classroom. One way is to hand
the note to a monitor who confirms delivery, keeps notes in order, and
asks for a resend if one is missing. It is reliable, but slower. The
other way is to toss notes toward the desk. Most arrive quickly, some
may be lost, and nobody promises order.

TCP is the monitor. UDP is the toss.

Neither is "better" in isolation. TCP is great when every byte must
arrive in order. UDP is great when speed, custom behavior, or real-time
delivery matters more than built-in reliability.

## 2. What Is It

(a) Plain-English one-liner: TCP is a reliable ordered byte-stream
transport, while UDP is a lightweight datagram transport with no built-
in delivery, ordering, or retransmission guarantees.

(b) Formal definition: TCP (Transmission Control Protocol) is a
connection-oriented transport protocol that provides reliable,
ordered, congestion-controlled byte streams between processes. UDP
(User Datagram Protocol) is a connectionless transport protocol that
sends independent datagrams with minimal header overhead and no
delivery, ordering, duplicate suppression, or congestion-control
guarantees by itself (see: MOD-01/01-osi-model-tcp-ip-stack).

## 3. The Problem It Solves

Before choosing a transport, teams confuse application needs. A file
download cannot silently skip bytes, so it needs reliability. A video
call would rather skip a late frame than pause the entire conversation
to recover it.

TCP solves reliable ordered delivery so applications do not implement
retransmission, sequencing, and congestion control themselves. UDP
solves low-overhead message delivery where the application or protocol
chooses its own reliability model.

The choice solves a contract problem: do you want the transport to
guarantee ordered bytes, or do you want control over datagrams?

## 4. Core Concept Breakdown

- **Connection:** TCP creates a stateful connection; UDP sends
  datagrams without a connection handshake.
- **Reliability:** TCP retransmits lost bytes; UDP does not.
- **Ordering:** TCP delivers bytes in order; UDP datagrams can arrive
  out of order.
- **Byte stream:** TCP has no message boundary; the app frames messages.
- **Datagram:** UDP preserves message boundaries per packet.
- **Congestion control:** TCP includes it; UDP applications must avoid
  harming the network.
- **Head-of-line blocking:** TCP waits for missing bytes before
  delivering later bytes.
- **Handshake:** TCP uses a three-way handshake; UDP can send
  immediately.
- **Use cases:** TCP for web, databases, files; UDP for DNS, VoIP,
  gaming, QUIC.

## 5. How It Works

Step by step, sending data with TCP:

1. **Client opens connection.** SYN, SYN-ACK, ACK establish state.
2. **Data is split into segments.** TCP numbers bytes with sequence
   numbers.
3. **Receiver acknowledges bytes.** ACKs tell sender what arrived.
4. **Lost bytes are retransmitted.** Reliability is automatic.
5. **Receiver delivers ordered stream.** Later bytes wait behind
   missing earlier bytes.
6. **Congestion control adjusts rate.** Sender reacts to loss and delay
   (see: MOD-01/06-tcp-congestion-control).
7. **Connection closes.** FIN or RST tears down state.

Step by step, sending data with UDP:

8. **Sender emits datagram.** No connection setup is required.
9. **Network may deliver, drop, duplicate, or reorder.** UDP does not
   correct this.
10. **Application handles semantics.** DNS retries, games interpolate,
    QUIC implements streams and reliability above UDP.

Design review checks:

- **Can late data be discarded?** If yes, UDP may fit.
- **Can lost data be reconstructed?** If no, TCP or reliable protocol
  over UDP is safer.
- **Do you need message boundaries?** UDP keeps datagrams; TCP needs
  framing.
- **Can you implement congestion behavior?** UDP without control can be
  dangerous.

## 6. Diagram

```mermaid
flowchart TD
    NEED[Application need] --> REL{Need reliable ordered bytes?}
    REL -->|yes| TCP[TCP]
    REL -->|no| LATE{Is late data useless?}
    LATE -->|yes| UDP[UDP]
    LATE -->|no| QUIC[Reliable protocol over UDP, such as QUIC]
    TCP --> WEB[HTTP/1.1, HTTP/2, databases]
    UDP --> REALTIME[DNS, VoIP, gaming]
    QUIC --> HTTP3[HTTP/3]
```

<!-- IMAGE: side-by-side packet timeline showing TCP retransmitting a
lost segment and UDP continuing while one datagram is lost -->

## 7. When to Use It

Use TCP when:

- **Every byte matters.** Files, database queries, and most APIs need
  correctness.
- **Ordering matters.** Application messages depend on prior bytes.
- **You want built-in congestion control.** TCP handles network
  fairness.
- **Middlebox compatibility matters.** TCP is widely supported.

Use UDP when:

- **Latency matters more than complete delivery.** Voice, video, and
  games can skip stale data.
- **The protocol implements its own reliability.** QUIC is the major
  modern example.
- **Messages are small and independent.** DNS queries fit well.
- **Connection setup overhead matters.** UDP can send immediately.

## 8. When NOT to Use It

- **Do not use UDP to avoid thinking about reliability.** The problem
  moves into your application.
- **Do not use TCP for real-time media when late frames are worthless.**
  Head-of-line blocking hurts interactive quality.
- **Do not assume UDP is always faster.** Loss, retries, NAT, and
  firewalls can erase benefits.
- **Do not treat TCP as message-based.** You need explicit framing.

## 9. Real-World Example

**HTTP/1.1 and HTTP/2** use TCP because web resources need reliable
delivery.

**DNS** often uses UDP for small queries, falling back to TCP for large
responses or zone transfers.

**HTTP/3** uses QUIC over UDP because it wants reliable streams without
TCP's connection-level head-of-line blocking.

Realistic number: a TCP handshake costs 1 RTT before data unless using
features like TCP Fast Open. UDP can send without that handshake, but
any reliability or security handshake must be handled by the protocol
above it.

## 10. Production-Grade Code

```typescript
import dgram from "node:dgram";
import net from "node:net";

export function startTcpEcho(port: number): net.Server {
  return net.createServer((socket) => {
    socket.on("data", (chunk) => {
      // TCP is a byte stream. This chunk may contain a partial message
      // or several messages, so production protocols need framing.
      socket.write(chunk);
    });
  }).listen(port);
}

export function startUdpEcho(port: number): dgram.Socket {
  const server = dgram.createSocket("udp4");
  server.on("message", (msg, rinfo) => {
    // UDP preserves this datagram boundary, but delivery and ordering
    // are not guaranteed.
    server.send(msg, rinfo.port, rinfo.address);
  });
  server.bind(port);
  return server;
}
```

Why-not-what notes:

- TCP code warns about framing because many production bugs come from
  assuming one `data` event equals one message.
- UDP code treats each message independently because that is the
  datagram contract.
- Neither echo server implements authentication, rate limiting, or
  backpressure; real services need all three.

## 11. Trade-offs Table

| Pros | Cons | What it costs you |
|---|---|---|
| TCP provides reliable ordered bytes | Head-of-line blocking | Latency during loss |
| TCP includes congestion control | Handshake and connection state | Connection management |
| UDP has low overhead | No delivery guarantee | Application reliability logic |
| UDP preserves message boundaries | Datagrams can be dropped or reordered | Retry and sequencing design |
| UDP enables QUIC and real-time protocols | Middleboxes may block or degrade it | Fallback strategy |

## 12. Comparison Table

| Dimension | TCP | UDP | QUIC over UDP |
|---|---|---|---|
| Setup | connection handshake | none | QUIC handshake |
| Reliability | built in | none | built in by QUIC |
| Ordering | byte-stream order | none | per-stream order |
| Message boundary | no | yes | streams and datagrams |
| Common use | web, DB, files | DNS, media, games | HTTP/3 |

## 13. Numbers & Benchmarks

- **TCP header:** minimum 20 bytes.
- **UDP header:** 8 bytes.
- **TCP handshake:** 1 RTT before data in normal setup.
- **UDP datagram:** max safe payload often kept below path MTU to avoid
  fragmentation.
- **Packet loss effect:** TCP loss stalls ordered byte delivery; UDP
  leaves loss handling to the application.

## 14. Common Pitfalls

- **Incident: TCP message framing bug.** Two JSON messages arrived in
  one TCP chunk and the parser crashed.
- **Incident: UDP blocked by corporate network.** Real-time feature
  worked at home but failed for enterprise users.
- **Incident: UDP retry storm.** Clients retried aggressively without
  backoff and amplified packet loss.

## 15. Interview Q&A

**Q1. TCP vs UDP in one sentence?** Model answer: TCP is reliable
ordered bytes; UDP is lightweight best-effort datagrams.

**Q2. Why does TCP have head-of-line blocking?** Model answer: it must
deliver bytes in order, so later bytes wait for missing earlier bytes.

**Q3. Why use UDP for video calls?** Model answer: late frames are less
valuable than current frames, so skipping can be better than waiting.

**Q4. Does UDP mean unreliable application?** Model answer: no. The
application or protocol can add reliability selectively, like QUIC.

**Q5. Why does DNS use UDP?** Model answer: many queries are small and
independent, so low overhead matters. TCP is used when needed.

## 16. Follow-up / Curveball Questions

**Curveball 1. Need reliable messages but no TCP HOL blocking.** Answer
direction: consider QUIC streams or application-level sequencing over
UDP.

**Curveball 2. UDP packets are fragmented.** Answer direction: keep
payload below path MTU or implement fragmentation carefully; IP
fragment loss is painful.

**Curveball 3. TCP connection is established but app gets partial data.**
Answer direction: expected. TCP is stream-based, so implement message
framing.

## 17. Cheat-Sheet Summary

- TCP gives reliable ordered byte streams.
- UDP gives lightweight best-effort datagrams.
- TCP handles retransmission, ordering, and congestion control.
- UDP is useful when lateness is worse than loss or protocol customizes reliability.
- QUIC builds modern secure streams over UDP.

## 18. Further Reading

- RFC 9293, "Transmission Control Protocol":
  https://www.rfc-editor.org/rfc/rfc9293
- RFC 768, "User Datagram Protocol":
  https://www.rfc-editor.org/rfc/rfc768
- Cloudflare Learning Center, "TCP vs UDP":
  https://www.cloudflare.com/learning/ddos/glossary/user-datagram-protocol-udp/

---

## COMPLETENESS CHECK

Section checklist (18):

1. Hook - Covered (classroom note analogy)
2. What Is It - Covered (plain-English and formal definitions)
3. The Problem It Solves - Covered (transport contract choice)
4. Core Concept Breakdown - Covered (9 concepts)
5. How It Works - Covered (TCP and UDP steps plus design checks)
6. Diagram - Covered (flowchart)
7. When to Use It - Covered (TCP and UDP triggers)
8. When NOT to Use It - Covered (4 warnings)
9. Real-World Example - Covered (HTTP, DNS, HTTP/3)
10. Production-Grade Code - Covered (TypeScript TCP and UDP echo)
11. Trade-offs Table - Covered (5 rows)
12. Comparison Table - Covered (3 transports)
13. Numbers & Benchmarks - Covered (5 figures)
14. Common Pitfalls - Covered (3 incident notes)
15. Interview Q&A - Covered (5 Q&As)
16. Follow-up / Curveball Questions - Covered (3 curveballs)
17. Cheat-Sheet Summary - Covered (5 lines)
18. Further Reading - Covered (3 URL-backed sources)

No em-dashes. No emojis. Cross-links included.
