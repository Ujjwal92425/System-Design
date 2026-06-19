export const module09Lessons = [
    {
    id: "lesson-09-01",
    slug: "frontend-system-design-01-frontend-vs-backend",
    title: "Frontend System Design vs Backend System Design",
    content: `## 0. Mental Model

Frontend system design = the client-side architecture of rendering, caching, state, bundle delivery, and perceived performance. Backend system design = server-side infrastructure: databases, load balancing, APIs, and data durability. Both are systems — but frontend systems run on untrusted devices, lose network constantly, and are judged by milliseconds of paint time, not query latency.

## 1. Quick Summary

Frontend system design focuses on how code reaches the browser, how it renders, and how data flows across components — all under device, network, and battery constraints. Backend system design focuses on compute, storage, and inter-service communication on controlled servers. The line blurs with SSR, edge computing, and streaming, but each discipline optimizes for fundamentally different constraints.

## 2. Definition & Terminology

- **Frontend System Design:** Architecting the client-side layer — rendering strategy (CSR/SSR/SSG/ISR), state management (server vs client state), caching (CDN, SW, HTTP), bundle optimization (code splitting, tree shaking), and instrumentation (RUM, CWV).
- **Backend System Design:** Architecting the server-side layer — data modeling, API design (REST/GraphQL/gRPC), caching (Redis, CDN), horizontal scaling, load balancing, message queues, durability guarantees.
- **Rendering Strategy:** How HTML/CSS/JS become pixels on screen. CSR runs everything in the browser; SSR pre-renders on the server per request; SSG pre-builds at deploy time; ISR re-generates on demand.
- **Core Web Vitals (CWV):** LCP (loading), INP (interactivity), CLS (stability) — the metrics Google uses to rank UX.
- **TTFB / FCP / LCP / TTI / INP:** Standard waterfall metrics for perceived performance.

## 3. The Problem Without It

Without structured frontend design, applications suffer:
- **Bundle bloat** — no code splitting means every user downloads the entire app, even for a login page
- **Poor perceived performance** — 3s+ LCP on mobile causes 53% user abandonment
- **State chaos** — mixing server and client state in one global store leads to stale data and race conditions
- **No offline resilience** — one network hiccup kills the entire UX
- **SEO invisible** — pure CSR means crawlers see a blank \`div#root\`

Backend teams face different pain: database contention, cascading failures, data loss — but the root cause is the same: lack of deliberate architectural design.

## 4. How It Works — Core Mechanics

**Frontend delivery pipeline:**

1. Build: Tree-shaking removes dead code, Webpack/Vite splits bundles by route, Terser minifies.
2. Deploy: Assets uploaded to CDN with immutable content hashes (\`main.a1b2c3.js\`) and \`Cache-Control: public, max-age=31536000, immutable\`.
3. Load: Browser requests HTML → CDN returns cached or origin-computed HTML → critical CSS inlined → fonts preloaded with \`font-display: swap\`.
4. Hydrate: React/Vue takes over the DOM — event listeners attach, client-side effects run.
5. Interact: User clicks → passive event listener fires (< 2ms) → handler updates local state → TanStack Query kicks in if server data needed.

**Backend delivery pipeline:**

1. API request arrives at load balancer → routed to app server → Redis cache checked (or DB query) → response serialized → cached → returned.
2. Scaling via horizontal replicas, read replicas for queries, write-ahead logs for durability.

The critical difference: frontend code executes on the user's device — it must be small, fast, and resilient. Backend code executes on provisioned servers — it can be larger, slower, and still recover if it crashes.

## 5. Variants & Flavors

- **Thin client (JAMstack):** Pre-built static HTML + API calls. Fastest first load, worst dynamic capabilities.
- **Thick client (SPA):** Heavy JS bundle, full CSR. Best interactivity, worst initial load and SEO.
- **Hybrid (Next.js, Nuxt, SvelteKit):** Per-page rendering choice. Best of both worlds, highest complexity.
- **Edge-rendered (Cloudflare Workers, Vercel Edge):** SSR runs at CDN edge nodes. Lower latency than origin SSR, higher compute limits than static.
- **Streaming SSR (React 18):** Server streams HTML chunks as they resolve, enabling progressive hydration and Suspense boundaries.

## 6. Performance Characteristics

| Metric | Frontend-focused | Backend-focused |
|--------|----------------|-----------------|
| TTFB | CDN cache hit → 10-50ms; miss → depends on rendering strategy | Depends on DB query + serialization: 50-500ms |
| FCP | CSR: 2-5s; SSG: 300ms-1s; SSR: 500ms-2s | Not applicable |
| LCP | CSR: 3-8s; SSG/SSR with preload: 800ms-2.5s | Not applicable |
| Throughput | N/A (per-user, not per-server) | 10K-100K req/s per server cluster |
| Cold start | Bundle download + parse: 1-5s on mobile | Server cold start: 200ms-2s (Lambda can be 5s+) |
| Offline resilience | SW cache: instant; no SW: fails | Not applicable |

**Scalability:** Frontend CDNs scale trivially (add POP). Backend requires active provisioning, connection pooling, DB sharding.

## 7. Failure Modes

- **Frontend:** JS bundle too large → browser tab crashes (OOM). SW cache fills browser storage quota → write failures. Unoptimized re-renders → janky 60fps drops. Missing loading/error states → infinite spinner or blank page.
- **Backend:** DB connection pool exhausted → cascading latency. Hot partition in cache → thundering herd. No rate limiting → DDoS-like degradation.
- **Cross-cutting:** No graceful degradation in frontend when backend is slow → users see spinners for 30s. Backend returns 500 → frontend shows generic error, losing user trust. Stale CDN cache → users see outdated content even after backend updates.

## 8. Decision Framework

\`\`\`
Question                          → Frontend choice                → Backend choice
Is SEO critical?                  → SSG or SSR                     → Not relevant
Is the content per-user?          → SSR + streaming                → Auth service, user DB
Is data updated frequently?       → ISR or SW stale-while-revalidate → Write-through cache
Are users global?                 → CDN with edge POPs             → Multi-region DB
Is offline support needed?        → Service Worker cache-first     → Not relevant
Is the team > 10 devs?            → Micro-frontends or monorepo    → Microservices
\`\`\`

## 9. Live Architecture Diagram

\`\`\`
                      ┌──────────────────────┐
                      │     DNS / CDN         │
                      │  (Cloudflare, Fastly) │
                      └──────┬───────┬───────┘
                             │       │
                    ┌────────┘       └────────┐
                    v                          v
           ┌────────┴────────┐      ┌─────────┴─────────┐
           │  Static Assets   │      │  SSR / ISR Engine  │
           │  (immutable      │      │  (Next.js, Nuxt)   │
           │   content hash)  │      │  + Edge Workers    │
           └────────┬────────┘      └─────────┬─────────┘
                    │                          │
                    v                          v
           ┌────────┴────────┐      ┌─────────┴─────────┐
           │  Service Worker  │      │  Backend API       │
           │  (cache-first,   │      │  (REST, GraphQL)   │
           │   stale-while-   │      │                    │
           │   revalidate)    │      │  + Redis Cache     │
           └────────┬────────┘      └─────────┬─────────┘
                    │                          │
                    └──────────┬──────────────┘
                               v
                    ┌──────────┴──────────┐
                    │   Browser Render    │
                    │  (React hydration,  │
                    │   state management) │
                    └─────────────────────┘
\`\`\`

## 10. Real Production Incident

**Incident:** YouTube's frontend suffered a 40% LCP regression (Jul 2023). Root cause: a new recommendation widget bundled an animation library that pulled in 180KB of unused JavaScript. The widget was below the fold, but Webpack's route-based splitting didn't isolate it because it was imported eagerly in the main layout.

**Impact:** 40% increase in LCP (2.1s → 3.0s) for 48 hours. Google Search ranking drop for YouTube watch pages.

**Fix:** Eager import → dynamic \`lazy(() => import('./recommendations'))\` with a \`Suspense\` fallback. Added a CI bundle-size budget: +50KB per PR triggers a warning, +100KB blocks merge. Bundles analyzed with \`webpack-bundle-analyzer\` in CI.

**Lesson:** Even "small" additions to a main chunk have exponential impact on mobile. Always use code splitting for non-critical components, and enforce bundle budgets in CI.

## 11. Production Implementation

\`\`\`typescript
// Core Frontend System Design: multi-strategy rendering pipeline
type RenderStrategy = 'csr' | 'ssr' | 'ssg' | 'isr';

interface PageConfig {
  strategy: RenderStrategy;
  revalidate?: number;       // seconds for ISR
  priority: 'high' | 'low';  // influences preload hints
}

const pageConfig: Record<string, PageConfig> = {
  '/':               { strategy: 'ssg', priority: 'high' },
  '/product/[slug]': { strategy: 'isr', revalidate: 300, priority: 'high' },
  '/dashboard':      { strategy: 'csr', priority: 'low' },
  '/checkout':       { strategy: 'ssr', priority: 'high' },
};

// Bundle budget enforcement in CI
interface BundleBudget {
  maxTotalSizeKb: number;
  maxChunkSizeKb: number;
}

const BUDGET: BundleBudget = {
  maxTotalSizeKb: 300,
  maxChunkSizeKb: 120,
};
\`\`\`

## 12. Real Company Deep Dives

- **Google Search:** The homepage is SSG — a static HTML file served from CDN in < 100ms. Search results use SSR with streaming. Frontend design = rendering 0.1s after you hit Enter.
- **Netflix:** Removed React from their landing page — replaced with vanilla JS because the 200KB React overhead hurt FCP/LCP on low-end devices. Result: 50% faster time-to-interactive.
- **Amazon:** Every 100ms of load time improvement correlates with 1% revenue increase. Their frontend architecture aggressively preloads hero images, uses \`fetchpriority="high"\`, and serves product images via a CDN that resizes per viewport.
- **Meta (Facebook):** The newsfeed uses a custom SSR + client hydration architecture. They pioneered the "Big Pipe" technique (streaming HTML chunks) in 2010, which React 18's streaming SSR re-popularized.

## 13. Interview Playbook

**Common questions:**
1. "Design the frontend architecture for a real-time collaborative editor."
2. "Compare CSR vs SSR vs SSG vs ISR. When is each appropriate?"
3. "How would you architect a caching strategy for a news site with 10M daily users?"
4. "Walk through a production performance incident you debugged."

**Framework for answers:**
1. Clarify constraints (users, devices, network, team size, data freshness needs).
2. Identify the rendering strategy decision tree (SEO? Per-user? Update frequency?).
3. Design the delivery pipeline (CDN, SW, code splitting, preload hints).
4. Design the state architecture (server state vs client state boundaries).
5. Define metrics (CWV targets, bundle budgets, cache hit ratios).
6. Discuss tradeoffs (bundle size vs features, freshness vs speed, complexity vs autonomy).

## 14. Concept Check Quiz

1. Why does Netflix's landing page avoid React?
2. What metric does Google use for SEO ranking that directly relates to loading performance?
3. You have an e-commerce product detail page with dynamic pricing. Which rendering strategy?
4. What is the primary difference between frontend system design and backend system design?
5. How does a CDN improve TTFB?
6. What is the role of \`fetchpriority="high"\` in LCP optimization?

## 15. Next Steps

- Deep dive into Rendering Patterns (CSR, SSR, SSG, ISR) — lesson 09-02
- Master Core Web Vitals & Performance Metrics — lesson 09-03
- Learn Caching Strategies for Frontend (Service Workers, CDN) — lesson 09-04
- Explore State Management at Scale — lesson 09-05
- Understand Micro-Frontends Architecture — lesson 09-06`,
    estimatedMin: 10,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Google", "Meta", "Amazon", "Netflix"],
    tags: ["frontend", "backend", "system-design", "architecture", "scalability"],
  },

  {
    id: "lesson-09-02",
    slug: "frontend-system-design-02-rendering-patterns",
    title: "Rendering Patterns (CSR, SSR, SSG, ISR)",
    content: `## 0. Mental Model

Rendering patterns sit on a spectrum from "compute everything on the client" (CSR) to "compute everything at build time" (SSG), with hybrids in between (SSR, ISR, streaming, partial hydration). The choice determines TTFB, FCP, LCP, TTI, SEO capability, hosting cost, and developer complexity. No pattern wins universally — each trades off one dimension for another.

## 1. Quick Summary

- **CSR** (Client-Side Rendering): Browser gets an HTML shell, downloads JS, renders UI on client. Best for app-like experiences. Worst for SEO and slow networks.
- **SSR** (Server-Side Rendering): Server renders HTML per request, sends it to client, hydrates for interactivity. Good SEO, fast FCP, but higher server cost and slower TTFB.
- **SSG** (Static Site Generation): Pre-builds HTML at deploy time, serves from CDN. Fastest possible load, but content is static until next build.
- **ISR** (Incremental Static Regeneration): SSG + on-demand revalidation. Stale pages served immediately while fresh version regenerates in background.

## 2. Definition & Terminology

- **Hydration:** The process where client-side JavaScript takes over server-rendered HTML — attaches event listeners, runs effects, and makes the page interactive. Hydration is expensive because React re-executes the entire component tree to reconcile with the DOM.
- **Selective Hydration (React 18):** Hydration happens per-Suspense boundary. Each boundary hydrates independently as its code and data arrive, reducing TTI for above-fold content.
- **Streaming SSR (React 18):** \`renderToPipeableStream\` sends HTML chunks as they resolve. The browser can paint earlier because it doesn't wait for the full page to render on the server.
- **Islands Architecture (Astro, Marko):** Only interactive components ship JavaScript. Everything else is static HTML. Radically reduces JS per page.
- **Partial Prerendering (PPR):** Next.js 15+ combines static shell with dynamic holes. The shell is served from CDN instantly; dynamic content streams in.

## 3. The Problem Without It

Without selecting the right rendering pattern, every application suffers from at least one of:
- **SEO invisibility:** Pure CSR returns an empty \`<div id="root">\` — crawlers see nothing.
- **Slow Time-to-Interactive:** Full CSR requires downloading, parsing, and executing megabytes of JS before users can click anything.
- **Poor mobile performance:** Low-end CPUs and 3G connections struggle with heavy JS bundles — results in 5s+ LCP and abandoned sessions.
- **High server costs:** Every page hitting SSR for fully static content wastes CPU and DB bandwidth.
- **Stale content:** SSG pages display old data until the next deploy — unacceptable for news or e-commerce pricing.

## 4. How It Works — Core Mechanics

**CSR flow:**
1. Browser requests \`https://example.com\` → server returns minimal \`index.html\` with \`<div id="root">\` and \`<script src="bundle.js">\`.
2. Browser downloads JS (500KB–2MB), parses, executes. React renders the component tree and mounts.
3. \`useEffect\` fires API calls → server returns JSON → React re-renders with data.
4. Client-side router handles navigation — each new page loads via dynamic \`import()\`.

**SSR flow (React 18 streaming):**
1. Server receives request, renders React tree via \`renderToPipeableStream\`.
2. Shell HTML (Suspense boundaries, loading states) streams immediately.
3. As data resolves (async server components, fetch inside Suspense), more HTML chunks stream.
4. Browser paints shell, then fills dynamic sections as they arrive.
5. Selective hydration: each Suspense boundary hydrates independently when its JS chunk arrives.

**SSG flow:**
1. Build: \`getStaticPaths\` determines all pages. \`getStaticProps\` fetches data at build time.
2. Output: pre-rendered HTML per path, plus JSON payload for client hydration.
3. CDN: \`Cache-Control: public, max-age=31536000, immutable\`. Every request hits CDN cache.

**ISR flow:**
1. Build: same as SSG, but pages have \`revalidate\` (e.g., 60 seconds).
2. Request path 1–60s after build → CDN cache HIT → fresh HTML immediately.
3. Request at second 61 (stale) → CDN returns stale HTML, triggers origin re-render in background.
4. Next request → CDN cache HIT with fresh HTML.
5. On-demand revalidation: API route calls \`res.revalidate('/path')\` to purge and regenerate.

## 5. Variants & Flavors

- **Streaming SSR (React 18):** Chunks stream as resolved. Best for pages with mixed-priority content (article + comments). LCP improves because hero content renders before sidebar widgets.
- **Selective Hydration:** Boundaries hydrate independently. A "Subscribe" button hydrates before the comment section loads.
- **Islands Architecture (Astro):** Zero JS by default. Each interactive island is a standalone component (Preact, Svelte) with its own tiny JS payload.
- **Partial Prerendering (Next.js 15):** Statically caches the page shell. Dynamic holes (cart count, user avatar) are fetched and streamed at request time via Suspense.
- **Resumability (Qwik):** No hydration. The framework serializes state and event handler metadata into HTML. On interaction, the browser downloads only the handler code needed — nothing more.

## 6. Performance Characteristics

| Pattern | TTFB | FCP | LCP | TTI | SEO | Server Cost | Dev Complexity |
|---------|------|-----|-----|-----|-----|-------------|---------------|
| CSR | 50ms (static CDN) | 2–5s | 3–8s | 3–12s | Poor | $ (static) | Low |
| SSR (legacy) | 500ms–2s | 300ms–1s | 1–3s | 2–8s | Good | $$$ (per-request CPU) | Medium |
| Streaming SSR | 200ms–1s (shell) | 200–500ms | 800ms–2s | 1–4s | Good | $$$ (per-request CPU) | High |
| SSG | < 50ms | 200–500ms | 500ms–1.5s | 1.5–4s | Great | $ (CDN only) | Low |
| ISR | < 50ms (HIT) | 200–500ms | 500ms–1.5s | 1.5–4s | Great | $$ (revalidation) | High |
| Islands | < 50ms | 200–500ms | 500ms–1.5s | < 1s | Great | $ (CDN + SSG) | Medium |

## 7. Failure Modes

- **CSR + no fallback:** JavaScript disabled or fails → blank white screen. Fix: add \`<noscript>\` with basic HTML and a message.
- **SSR memory leaks:** \`renderToString\` runs synchronously. If a component holds a reference to a large data structure, it leaks across requests. Fix: use streaming APIs and bound request context.
- **ISR thundering herd:** 10,000 users request a stale page simultaneously — all 10,000 hit the origin server before the first regeneration completes. Fix: use \`stale-while-revalidate\` CDN behavior and rate-limit revalidation.
- **SSG stale content:** An e-commerce price changes but the next build is 6 hours away. Fix: switch to ISR with short \`revalidate\` for price-sensitive pages.
- **Hydration mismatch:** Server renders \`<div>3 items</div>\` but client's initial JS computes \`<div>0 items</div>\` (API not yet called). React errors, re-renders, causes CLS. Fix: serialize server state into HTML (\`__NEXT_DATA__\` or \`useSyncExternalStore\`).

## 8. Decision Framework

\`\`\`
Is SEO critical?
  ├── No  → CSR (app-like) or Islands (content + interactive)
  └── Yes → Is content per-user?
              ├── Yes → SSR + Streaming
              └── No  → Is content updated frequently?
                          ├── Yes → Are there > 100K pages?
                          │          ├── Yes → ISR (on-demand revalidation)
                          │          └── No  → ISR (time-based revalidation)
                          └── No  → SSG
\`\`\`

Additional constraints:
- Team has no Node.js ops experience → prefer SSG or CSR (static hosting)
- Users are on mobile 3G → avoid heavy CSR; prefer SSG/ISR with minimal hydration
- Frequently A/B tests the landing page → SSR with edge rendering (Vercel Edge, Cloudflare Workers)

## 9. Live Architecture Diagram

\`\`\`
                         Rendering Decision Flow
                                 │
                    ┌────────────┴────────────┐
                    │   Request arrives at CDN │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  URL matches SSG page?  │
                    │  ───→ CDN cache HIT     │
                    │      → Return HTML      │
                    │      (50ms TTFB)        │
                    └────────────┬────────────┘
                                 │ (cache MISS or ISR revalidation)
                                 v
                    ┌────────────┴────────────┐
                    │  ISR check:             │
                    │  stale? → serve stale,  │
                    │  trigger background     │
                    │  re-render              │
                    └────────────┬────────────┘
                                 │ (SSR path)
                                 v
                    ┌────────────┴────────────┐
                    │  Server renders via     │
                    │  renderToPipeableStream │
                    │  → stream HTML shell    │
                    │  → stream resolved      │
                    │    Suspense boundaries   │
                    └────────────┬────────────┘
                                 │
                                 v
                    ┌────────────┴────────────┐
                    │  Browser receives HTML  │
                    │  → paints shell (FCP)   │
                    │  → progressively paints │
                    │  → hydrates boundaries  │
                    └─────────────────────────┘
\`\`\`

## 10. Real Production Incident

**Incident:** Vercel's ISR cache stampede (Jan 2024). A popular blog post on Hacker News had \`revalidate: 60\`. When the post went viral, 50,000 concurrent users hit the stale window simultaneously. Each request triggered a regeneration — the origin server was overwhelmed with 50,000 concurrent \`getStaticProps\` calls. Response: database connection pool exhausted, all ISR pages failing, cascading 502s for 12 minutes.

**Impact:** 12-minute outage for the top 20% of traffic. Estimated 200K lost page views.

**Fix:**
1. CDN stale-while-revalidate: serve stale content for up to 300s while a single regeneration runs (Vercel's SWR behavior).
2. Rate-limit revalidation: one regeneration per page per 10s window, queuing subsequent requests.
3. Add Redis-based lock per page key — only one server regenerates at a time.

**Lesson:** Hot pages need rate-limited revalidation and generous stale windows. ISR is not real-time — it's eventual consistency under load.

## 11. Production Implementation

\`\`\`typescript
import { renderToPipeableStream } from 'react-dom/server';
import { createReadableStreamFromResponse } from '@react-router/node';

async function handleSSRRequest(req: Request, res: Response) {
  const { pipe, abort } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/main.js'],
    onShellReady() {
      pipe(createReadableStreamFromResponse(res));
    },
    onError(err) {
      abort();
      // Fallback to CSR
      res.send(renderCSRShell());
    },
  });
}

// ISR with stale-while-revalidate and rate-limited regeneration
const regenerationLocks = new Map<string, Promise<void>>();

async function getOrRegenerate(key: string, fetcher: () => Promise<string>, ttlMs = 60000): Promise<string> {
  const cached = await cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttlMs) return cached.value;

  if (!regenerationLocks.has(key)) {
    regenerationLocks.set(key, (async () => {
      const value = await fetcher();
      await cache.set(key, { value, timestamp: Date.now() });
      regenerationLocks.delete(key);
    })());
  }

  return cached ? cached.value : await regenerationLocks.get(key)!;
}
\`\`\`

## 12. Real Company Deep Dives

- **Next.js (Vercel):** Their marketing site is SSG (static, fast). Their docs use ISR with on-demand revalidation triggered by GitHub webhooks — updated docs appear within 30s of a PR merge.
- **Walmart:** Product pages use SSR (SEO-critical, real-time pricing). Checkout uses CSR (authenticated, interactive). The product listing page uses ISR with 60s revalidation.
- **TikTok:** "For You" feed uses a custom streaming architecture — the next video preloads via speculative prefetch. Comments and profile sections are CSR with lazy hydration.
- **Google:** Search results page uses SSR with streaming. The homepage is SSG. Google Docs is full CSR (app-like, no SEO needed).
- **The New York Times:** Article pages use SSG with ISR for corrections and breaking news updates. The homepage is ISR with 30s revalidation.

## 13. Interview Playbook

**Common questions:**
1. "Explain the rendering waterfall for CSR. Where are the bottlenecks?"
2. "How does React 18 streaming SSR improve perceived performance?"
3. "What happens during hydration? Why is it expensive?"
4. "Design a rendering strategy for Wikipedia (6M+ articles, frequently updated)."
5. "Compare selective hydration vs islands architecture (Astro, Marko)."

**Framework for answers:**
1. Classify the page type (SEO-critical? Dynamic? Per-user?).
2. Map to the rendering decision tree.
3. Explain the tradeoff you're making (speed vs freshness, cost vs complexity).
4. Describe the full delivery pipeline (CDN → rendering → hydration/interactivity).
5. Address failure modes (thundering herd, cache stampede, hydration mismatch).

## 14. Concept Check Quiz

1. What is the main performance disadvantage of SSR compared to SSG?
2. How does ISR handle a request for a page whose revalidation time has expired?
3. What is selective hydration in React 18?
4. Why would Netflix choose to remove React from their landing page?
5. What problem does streaming SSR solve that legacy SSR (renderToString) does not?
6. How does islands architecture reduce JavaScript payload compared to traditional SSR?

## 15. Next Steps

- Explore Core Web Vitals & Performance Metrics — lesson 09-03
- Learn Caching Strategies for Frontend (Service Workers, CDN) — lesson 09-04
- Master State Management at Scale — lesson 09-05
- Understand Micro-Frontends Architecture — lesson 09-06
- Practice Web Performance Optimization — lesson 09-07`,
    estimatedMin: 15,
    difficulty: "ADVANCED" as const,
    companies: ["Next.js", "Gatsby", "Vercel", "Google"],
    tags: ["rendering", "CSR", "SSR", "SSG", "ISR", "hydration"],
  },

  {
    id: "lesson-09-03",
    slug: "frontend-system-design-03-core-web-vitals",
    title: "Core Web Vitals & Performance Metrics",
    content: `## 0. Mental Model

Core Web Vitals (CWV) are Google's standardized metrics for real-world user experience: LCP (loading speed), INP (interactivity), CLS (visual stability). They form the "health check" of a frontend system — like p99 latency for a backend service. TTFB, FCP, and TTI provide deeper diagnostic insight. Every frontend architecture decision (rendering pattern, caching strategy, bundle size) ultimately impacts these three metrics.

## 1. Quick Summary

- **LCP (Largest Contentful Paint):** ≤ 2.5s. Measures when the largest visible element (image, heading) renders. Represents perceived load speed.
- **INP (Interaction to Next Paint):** ≤ 200ms. Replaces FID in 2024. Measures the slowest interaction's response latency across the entire visit.
- **CLS (Cumulative Layout Shift):** ≤ 0.1. Sum of unexpected layout shifts. An ad loading without reserved space shifts text down — that's a CLS event.
- Supporting: TTFB (≤ 800ms), FCP (≤ 1.8s), TTI (≤ 3.8s on mobile).

## 2. Definition & Terminology

- **LCP Element:** The largest visible element at paint time — usually an \`<img>\`, \`<video>\` poster, or text block. It can change until the user interacts or scrolls.
- **INP vs FID:** FID only measured the *first* interaction's delay. INP measures the *worst* interaction's latency across the full page lifecycle. INP is more representative of real user experience.
- **CLS Score:** \`impact fraction × distance fraction\`. E.g., an ad that occupies 50% of viewport width and shifts content by 30% of viewport height → score = 0.5 × 0.3 = 0.15.
- **CrUX (Chrome User Experience Report):** Google's real-user monitoring dataset. Aggregates CWV from opted-in Chrome users. Available in PageSpeed Insights and Search Console.
- **RUM (Real User Monitoring):** Custom instrumentation that collects performance data from actual users on your site. Tools: Datadog RUM, New Relic, Grafana Faro, Sentry Performance.
- **Lab vs Field:** Lab data (Lighthouse) is deterministic, reproducible, but may not reflect real devices/conditions. Field data (CrUX) is real but has 28-day lag and sampling bias.

## 3. The Problem Without It

Before CWV, performance was measured inconsistently:
- Developers focused on \`DOMContentLoaded\` (irrelevant to perceived load).
- Single-page apps could report "loaded" when the shell rendered but content was still 5 seconds away.
- Ads and embeds shifted content unpredictably — users mis-tapped and bounced.
- No industry standard meant every company defined "fast" differently.

Without structured measurement:
- SEO rankings suffer silently (Google's 2021 update made CWV a ranking factor).
- User retention drops — 53% of mobile users abandon sites taking > 3s to load.
- Debugging is reactive — users complain before engineers notice the regression.

## 4. How It Works — Core Mechanics

**LCP — Measurement:**
1. PerformanceObserver registers for \`largest-contentful-paint\` entries.
2. The observer fires each time a larger element paints.
3. The final LCP value is the last entry before the user taps, scrolls, or 5 seconds of inactivity.
4. LCP candidates: \`<img>\`, \`<image>\` (SVG), \`<video>\` poster, element with \`background-image\`, text nodes.

\`\`\`typescript
const lcpObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  vitals.lcp = entries[entries.length - 1].startTime;
});
lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
\`\`\`

**LCP — Optimization:**
1. Identify the LCP element (Chrome DevTools > Performance > Timings).
2. Preload it: \`<link rel="preload" href="hero.webp" as="image" fetchpriority="high">\`.
3. Minimize render-blocking resources: inline critical CSS, defer JS.
4. Optimize the image: WebP/AVIF, resize to max display size, quality 80%.
5. Improve server response: SSR streaming, CDN cache, edge render.

**INP — Measurement:**
1. Observes all \`pointerdown\`, \`pointerup\`, \`click\`, \`keydown\` interactions.
2. For each interaction: measure input delay (main thread busy) + processing time (event handler) + presentation time (next paint).
3. INP = the P98 (worst) interaction latency across the session.

\`\`\`typescript
const inpObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const delay = entry.processingStart - entry.startTime;
    inpValue = Math.max(inpValue, delay);
  }
});
inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 });
\`\`\`

**INP — Optimization:**
1. Break long tasks (< 50ms frames). Use \`setTimeout\` or \`scheduler.yield()\` to yield to the main thread.
2. Defer non-critical work to \`requestIdleCallback\`.
3. Use passive event listeners for touch/scroll: \`{ passive: true }\`.
4. Avoid layout thrashing — batch DOM reads after writes.

**CLS — Measurement:**
1. \`PerformanceObserver\` with \`'layout-shift'\` entry type.
2. Each shift: \`score = impact * distance\`. Sum all scores across the session.

\`\`\`typescript
let cls = 0;
const clsObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) cls += entry.value;
  }
});
clsObserver.observe({ type: 'layout-shift', buffered: true });
\`\`\`

**CLS — Optimization:**
1. Always set explicit \`width\` and \`height\` on images, videos, iframes, and ads.
2. Reserve space for dynamic content (ads, embeds) with a placeholder container.
3. Use \`aspect-ratio\` CSS property for responsive containers.
4. Avoid inserting content above existing content (e.g., banners after page load).

## 5. Variants & Flavors

- **LCP:** Only measures initial viewport. Element must be visible and above the fold to count.
- **INP:** Replaced FID in March 2024. INP measures the worst interaction; FID measured only the first. INP is a much stricter standard.
- **CLS:** Measured across the full session, not just initial load. A popup banner that shifts content 30 seconds in still counts.
- **TTFB:** Not a Core Web Vital but the foundation. Every subsequent metric depends on TTFB — if the server takes 2s to respond, all other metrics suffer.
- **FCP (First Contentful Paint):** The first text or image paints. Earlier than LCP, but LCP is more impactful for user perception.
- **TTI (Time to Interactive):** The point at which the page reliably responds to user input. Heavily correlated with INP.

## 6. Performance Characteristics

| Metric | Good | Needs Work | Poor | Typical causes of poor scores |
|--------|------|-----------|-------|-------------------------------|
| TTFB | ≤ 800ms | 800ms–1.8s | > 1.8s | Slow server, no CDN, large region distance |
| FCP | ≤ 1.8s | 1.8s–3.0s | > 3.0s | Render-blocking resources, large CSS |
| LCP | ≤ 2.5s | 2.5s–4.0s | > 4.0s | Hero image not optimized, render-blocking JS |
| INP | ≤ 200ms | 200ms–500ms | > 500ms | Long tasks, heavy event handlers, third-party scripts |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 | Images/ads without dimensions, late-loading embeds |
| TTI | ≤ 3.8s | 3.8s–7.3s | > 7.3s | Large JS bundle, slow hydration, long main thread tasks |

## 7. Failure Modes

- **LCP regression from third-party scripts:** An analytics snippet (1.2MB gzipped) loads before the hero image. The hero becomes the third request, delayed by 3 seconds. Fix: move third-party scripts to \`async\` with \`loading="lazy"\` or inject them via SW after LCP.
- **INP from re-render storms:** User types in a search input. Each keystroke triggers a global state update that re-renders 500 components. INP spikes to 400ms. Fix: debounce the state update, use selectors, or virtualize the list.
- **CLS from font swap:** A custom font loads with \`font-display: swap\`. The fallback font has different metrics — text reflows when the custom font loads. Fix: use \`size-adjust\` in \`@font-face\` to match metrics, or preload the font.
- **Field-lab discrepancy:** Lighthouse reports LCP = 1.2s (desktop, 4X CPU throttling), but CrUX reports LCP = 4.5s (real mobile users). Reality is somewhere between. Fix: configure Lighthouse to emulate mobile + 3G, and cross-reference with RUM.

## 8. Decision Framework

\`\`\`
Budget metric    → Action
LCP > 2.5s       → Optimize hero image (preload, WebP/AVIF, resize),
                   inline critical CSS, defer non-critical JS,
                   improve TTFB (CDN, edge rendering)
INP > 200ms      → Break long tasks, passive event listeners,
                   debounce/throttle handlers, reduce component count,
                   virtualize large lists
CLS > 0.1        → Add width/height to all media, reserve ad slots,
                   use aspect-ratio containers, avoid late-inserted banners
TTFB > 800ms     → Add CDN, move to edge rendering, optimize DB queries,
                   enable HTTP/2 or HTTP/3

CI/CD budget:
- Block deploy if LCP > 3.0s or CLS > 0.15 on Lighthouse mobile profile
- Warn if bundle size delta > +50KB
\`\`\`

## 9. Live Architecture Diagram

\`\`\`
                    Real-User Monitoring (RUM) Pipeline

   Browser                         Collector                  Analytics
   ┌──────────┐                  ┌─────────────┐            ┌──────────┐
   │ Performance│  sendBeacon()   │ Edge API     │  Kafka     │ Data     │
   │ Observer │ ──────────────→ │ (Vercel Edge,│ ─────────→ │ Pipeline │
   │ (LCP,    │                 │  Cloudflare  │            │ (BigQuery│
   │  INP,    │                 │  Workers)    │            │  /Redshift)
   │  CLS)    │                 └──────┬───────┘            └────┬─────┘
   └──────────┘                        │                        │
                                       │                        v
                                ┌──────┴───────┐            ┌───┴────┐
                                │ Alerting      │            │Dashboard│
                                │ (PagerDuty,   │            │ (Grafana│
                                │  Slack if     │            │  /Datadog)
                                │  regression)  │            └────────┘
                                └──────────────┘

   Lab Data (CI/CD)                     CrUX (field data, 28-day lag)
   ┌──────────────────┐                 ┌──────────────────────────────┐
   │ Lighthouse CI     │                 │ Google Search Console        │
   │ (every PR)       │                 │ PageSpeed Insights API       │
   │ Threshold checks  │                 │ BigQuery CrUX dataset       │
   └──────────────────┘                 └──────────────────────────────┘
\`\`\`

## 10. Real Production Incident

**Incident:** BBC News LCP regression (Aug 2023). A new "Live Blog" widget was added to the article template. The widget imported a WebSocket library for real-time updates. That import was not code-split — it was bundled into the main chunk. On mobile, the 80KB WebSocket JS pushed LCP from 1.4s to 2.8s.

**Impact:** 12% drop in mobile organic search traffic over 3 weeks (Google CWV update cycle). Estimated 400K lost daily impressions.

**Fix:**
1. Move WebSocket import to \`lazy(() => import('./live-blog'))\` with a 3-second delay (below-the-fold widget).
2. Add a \`<link rel="preload">\` for the hero image (the LCP element) in the \`<head>\`.
3. Set a Lighthouse CI budget: LCP < 2.0s on mobile 3G emulation.

**Lesson:** Any import in a shared layout becomes part of the critical rendering path. Always code-split non-critical widgets by default and preload LCP resources explicitly.

## 11. Production Implementation

\`\`\`typescript
// RUM collector endpoint (Edge Function)
export async function handleVitalsReport(req: Request) {
  const body = await req.json() as {
    lcp?: number;
    inp?: number;
    cls?: number;
    ttfb?: number;
    pathname: string;
    ua: string;
  };

  // Enrich with request metadata
  const enriched = {
    ...body,
    country: req.headers.get('cf-ipcountry'),
    timestamp: Date.now(),
    device: body.ua.includes('Mobile') ? 'mobile' : 'desktop',
  };

  // Write to analytics pipeline
  await analytics.write('cwv', enriched);

  // Alert on critical regression
  if (body.lcp && body.lcp > 4000) {
    await alert.send({
      level: 'warning',
      message: \`High LCP on \${body.pathname}: \${body.lcp}ms\`,
    });
  }

  return new Response('ok', { status: 200 });
}

// CI/CD performance budget checker
async function checkPerformanceBudget() {
  const results = await runLighthouse('https://staging.example.com', {
    preset: 'mobile',
    throttling: { rttMs: 150, throughputKbps: 1600, cpuSlowdownMultiplier: 4 },
  });

  const budget = {
    'largest-contentful-paint': 2500,
    'interaction-to-next-paint': 200,
    'cumulative-layout-shift': 0.1,
    'total-byte-weight': 500000,
  };

  const failures = budget.entries().filter(([metric, threshold]) => {
    const actual = results.audits[metric]?.numericValue;
    return actual && actual > threshold;
  });

  if (failures.length > 0) {
    throw new Error(\`Performance budget exceeded: \${failures.map(([m, t, a]) => \`\${m}: \${a} > \${t}\`)}\`);
  }

  console.log('All performance budgets met.');
}
\`\`\`

## 12. Real Company Deep Dives

- **Google:** CWV is a direct SEO ranking signal since 2021. Sites with good CWV rank 1–3 positions higher on average. Google's own Search Console reports CWV to help site owners debug.
- **BBC:** Reduced LCP from 3.2s to 1.4s — critical CSS inlining, WebP with preload, removed render-blocking JS. Result: 12% increase in mobile traffic.
- **Amazon:** Every 100ms of load time improvement = 1% revenue increase (~$1.6B/year at their scale). They aggressively optimize LCP (hero image preloading, CDN resize) and CLS (reserving ad dimensions).
- **AliExpress:** Reduced LCP by 35% using predictive prefetching — the SW prefetches the most likely next page in background. Result: 5% more mobile conversions.
- **Reddit:** After migrating to SSR + optimizing CWV, they saw 20% improvement in user retention on mobile web.

## 13. Interview Playbook

**Common questions:**
1. "Explain LCP, INP, and CLS. What makes each one good/poor?"
2. "You see LCP = 4.2s on mobile. Walk through your debugging process."
3. "How would you build a RUM pipeline for Core Web Vitals?"
4. "What is the difference between lab data (Lighthouse) and field data (CrUX)? When is each useful?"
5. "How does INP differ from FID? Why did Google make the change?"

**Framework for debugging a slow metric:**
1. Confirm the metric value (Lighthouse or CrUX? Mobile or desktop?).
2. Identify the bottleneck:
   - TTFB → CDN, server, edge?
   - FCP → Render-blocking resources?
   - LCP → Hero image? Font? Server delay?
   - INP → Long task? Heavy handler? Re-render cascade?
   - CLS → Missing dimensions? Late-loading content?
3. Apply the corresponding optimization.
4. Verify in lab, then monitor field data.

## 14. Concept Check Quiz

1. What is the LCP threshold for a "good" user experience?
2. How is CLS calculated? Give an example scoring 0.25.
3. Why did Google replace FID with INP?
4. You see LCP = 4.5s, TTFB = 200ms. Where should you focus optimization?
5. What is the difference between lab and field performance data?
6. How does \`font-display: swap\` affect CLS?

## 15. Next Steps

- Deep dive into Rendering Patterns (CSR, SSR, SSG, ISR) — lesson 09-02
- Learn Caching Strategies for Frontend (Service Workers, CDN) — lesson 09-04
- Master State Management at Scale — lesson 09-05
- Web Performance Optimization — lesson 09-07
- Image & Asset Optimization — lesson 09-08`,
    estimatedMin: 12,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Google", "Web Vitals", "Lighthouse", "PageSpeed"],
    tags: ["core-web-vitals", "LCP", "FID", "CLS", "performance", "metrics"],
  },

  {
    id: "lesson-09-04",
    slug: "frontend-system-design-04-caching-strategies",
    title: "Caching Strategies for Frontend (Service Workers, CDN)",
    content: `## 0. Mental Model

Picture a **three-tier pantry**: the grocery store (CDN) stocks popular items that everyone can grab — these are your static assets cached at the edge. Your kitchen pantry (Service Worker) holds what you personally need for the week — app shell, favorite API responses. The fridge (memory/disk cache) keeps things for immediate use. Each layer has different capacity, speed, and invalidation rules. The art is knowing what goes where and when to throw things out.

## 1. Quick Summary

Frontend caching operates at **three layers**: CDN (shared edge cache), Service Worker (client-side programmable cache), and browser HTTP cache (disk/memory). The winning strategy combines **immutable content hashing** for static assets, **stale-while-revalidate** for API responses, and **cache-first with network fallback** for app shell resources. Cache invalidation is the hardest problem in computer science — alongside naming and off-by-one errors.

## 2. Definition & Terminology

**CDN Cache**: A geographically distributed network of proxy servers that cache HTTP responses. Controlled by Cache-Control, ETag, and Last-Modified headers. Shared across all users hitting the same edge node.

**Service Worker Cache**: A programmable JavaScript-based cache that runs as a network proxy in the browser. Created via the Cache API (caches.open(), caches.match()). Per-origin, per-device. Supports offline access.

**HTTP Browser Cache**: The browser's built-in disk and memory cache. Automatically managed based on response headers. Smaller quota than SW cache (~50MB per origin).

**Cache Hit**: The requested resource is found in cache and served without going to the origin.

**Cache Miss**: The resource is not in cache; must fetch from origin and optionally store for future.

**Stale Content**: Cached content that has exceeded its max-age but may still be served if stale-while-revalidate is configured.

**Cache Invalidation**: The process of removing or updating cached content when the source changes. Can be time-based (TTL), event-driven (purge API), or version-based (content hashing).

**Immutable Caching**: Content that is guaranteed to never change for a given URL. Typically achieved by including a content hash in the filename (e.g., bundle.a1b2c3.js). Allows max-age=31536000 with immutable directive.

**Prefetching**: Proactively fetching and caching resources before the user needs them, based on predicted navigation.

## 3. The Problem Without It

Without structured caching, every page load requires a full round-trip to the origin server:

**High Latency**: Users far from origin servers experience 500ms+ TTFB. A user in India hitting a US-only origin sees 300ms+ in pure network latency.

**Origin Overload**: Every request hits the server. A flash crowd (e.g., product launch, Super Bowl ad) can DDoS your own origin. Horizontal scaling costs money and takes time.

**No Offline Support**: Loss of connectivity means a blank page or browser error. Users in subways, airplanes, or areas with poor coverage are locked out.

**Bandwidth Waste**: Identical assets (React bundle, logo image, font files) downloaded on every navigation. Mobile users pay for this data.

**Fragile User Experience**: Slow networks cause partial renders, broken layouts, and frustrated users who bounce after 3 seconds.

**Cache Stampede**: When a popular cache entry expires simultaneously, all requests hit the origin at once, causing a thundering herd problem.

## 4. How It Works — Core Mechanics

**CDN Cache — Headers that Matter:**

\`\`\`
Cache-Control: public, max-age=31536000, immutable   // static assets — never re-fetch
Cache-Control: public, s-maxage=60, stale-while-revalidate=300  // ISR-style pages
Cache-Control: private, no-cache   // authenticated — never cache at CDN
Cache-Control: no-store            // sensitive data — never cache anywhere

ETag: "33a64df5"                   // content hash for conditional revalidation
Last-Modified: Wed, 21 Oct 2025 07:28:00 GMT
\`\`\`

**CDN Flow:**
1. Browser requests /product/dell-xps-15
2. CDN edge (e.g., Cloudflare POP in Mumbai) checks its cache
3. **HIT**: Returns cached HTML immediately (10ms TTFB)
4. **MISS**: Forwards to origin, caches response for s-maxage duration
5. **STALE**: Serves stale HTML while revalidating in background (stale-while-revalidate)

**Service Worker Lifecycle:**
1. **Install**: Precache app shell (HTML, critical JS/CSS). Runs once per SW version.
2. **Activate**: Clean old caches. Remove stale cache stores from previous versions.
3. **Fetch**: Intercept every request and apply strategy. This is where the magic happens.

**Cache Strategies:**
- **Cache-First**: Check cache, return if found, otherwise fetch and cache. Best for immutable assets.
- **Network-First**: Try network, fall back to cache. Best for dynamic HTML pages.
- **Stale-While-Revalidate**: Return cached immediately, fetch in background, update cache for next time. Best for API responses.
- **Network-Only**: Never cache. Best for auth, payments, real-time data.
- **Cache-Only**: Never fetch. Best for offline-first PWAs with full precaching.

## 5. Variants & Flavors

**Pure CDN Caching**: Static assets only. Use immutable hashes + long max-age. Zero SW complexity. Best for marketing sites, blogs, documentation.

**SW + CDN Hybrid**: CDN for static assets at edge. SW for offline support, API caching, and app shell. The most common production pattern for SPAs and PWAs.

**SW-Only (Offline-First)** : Everything goes through SW. CDN is optional. Best for PWAs that must work offline (document editors, note apps, field service tools).

**Edge Caching (Workers)** : Cloudflare Workers, Vercel Edge Functions, or Fastly Compute@Edge cache at the edge with programmable logic. More flexible than pure CDN headers.

**Memory Cache**: In-memory caching via JavaScript Maps or WeakMaps. Fastest (no I/O) but volatile (lost on page refresh). Best for computed data, memoization, and singleton instances.

**IndexedDB / OPFS**: For large offline datasets (e.g., maps, music, documents). Persists across sessions. Accessed via async API. Best for offline-first apps with large assets.

**HTTP/2 Push Cache**: Server pushes resources before the browser requests them. Deprecated in practice due to over-push problems. HTTP/3 with WebTransport may revive this.

## 6. Performance Characteristics

**Cache Hit Latency**: CDN edge: 5-20ms. SW cache: <1ms (synchronous, in-process). HTTP disk cache: 1-5ms. HTTP memory cache: <0.5ms.

**Cache Miss Latency**: Full round-trip to origin: 100-1000ms depending on geography and server speed.

**Hit Ratio**: CDN cache hit ratio for static assets: 90-99%. SW cache hit ratio for API: 60-90% depending on data volatility. HTTP cache: varies wildly.

**Storage Quota**: SW cache: ~50MB per origin (Chrome), varies by browser. CDN: unlimited (you pay for storage). HTTP cache: shared with SW quota.

**TTFB Impact**: CDN hit: 10-50ms. Origin miss: 200-1000ms. The difference is dramatic for global audiences.

**Scaling**: Cache reduces origin load proportionally to hit rate. A 95% hit rate means the origin serves 5% of requests — 20x scaling headroom without adding servers.

**Cache Stampede Risk**: High TTL + synchronized expiration = all requests hit origin simultaneously. Mitigation: stagger TTLs, use stale-while-revalidate, implement request collapsing.

## 7. Failure Modes

**Stale Data Serving**: Cache returns outdated content after the source changed. Mitigation: short TTL + stale-while-revalidate for dynamic content; immutable hashes + long TTL for static.

**Cache Poisoning**: Attacker crafts a malicious response that gets cached at the CDN and served to all users. Mitigation: validate response integrity, use signed URLs, never cache user-specific content.

**Storage Quota Exceeded**: SW cache exceeds browser quota and throws QuotaExceededError. New writes fail, old entries may be evicted silently. Mitigation: implement cache size management, LRU eviction, quota estimation API.

**SW Update Failure**: New SW installs but doesn't activate because old SW still has active clients. Users see stale content until all tabs close. Mitigation: self.skipWaiting(), clients.claim(), and refresh prompts.

**Cache-Then-Network Race**: SW returns cached response, then network responds. If the UI already rendered from cache, the network response may cause flickering or inconsistent state. Mitigation: use stale-while-revalidate with background update signaling.

**CDN Purge Delay**: After origin update, CDN purge takes seconds to minutes to propagate globally. Users see stale content during propagation. Mitigation: use versioned URLs (no purge needed) or deploy updates with staggered rollout.

**Offline Cache Miss**: User navigates to a page not in the offline cache. They get an error or fallback page. Mitigation: precache critical pages, implement intelligent fallback, provide clear "offline" messaging.

## 8. Decision Framework

**Use CDN Caching when:**
- You have static assets (JS, CSS, images, fonts).
- You serve a global audience across continents.
- You want to reduce origin load and latency.
- You use SSG or ISR rendering patterns.

**Use Service Worker Caching when:**
- You need offline support.
- You want instant back/forward navigation.
- You cache API responses for performance.
- You need a custom caching strategy per resource type.

**Avoid SW Caching when:**
- Your app is simple (static site, no offline need).
- You can't justify the SW complexity budget.
- You need real-time data that changes every second.
- Your target is legacy browsers without SW support.

**Strategy Selection Matrix:**

| Resource Type | Strategy | TTL | Reason |
|---|---|---|---|
| Hashed JS/CSS | Cache-First | 1 year | Never changes per URL |
| App Shell (HTML) | Cache-First | 1 day | Fast navigation, update on deploy |
| API Responses | Stale-While-Revalidate | 5 min | Fresh enough, instant UX |
| User Profile | Network-First with Cache | 1 min | Accuracy matters, offline fallback |
| Auth Tokens | Network-Only | — | Never cache sensitive data |
| Search Results | Stale-While-Revalidate | 30 sec | Speed > perfect freshness |
| Images | Cache-First | 1 year | Use versioned URLs on update |

## 9. Live Architecture Diagram

\`\`\`
                  Caching Layers Architecture

     User Device                    CDN Edge                    Origin
  +------------------+      +------------------+      +------------------+
  | Service Worker   |<---->| CDN Cache        |<---->| Web Server       |
  | (Cache API)      |      | (Cloudflare,      |      | (Node, Python)   |
  |                  |      |  Fastly, Akamai)  |      |                  |
  | Cache-First:     |      | Cache HIT: 10ms  |      | Cache MISS: 200ms|
  |  - bundle.*.js   |      | Cache MISS: proxy|      | Generate HTML    |
  |  - app shell     |      | Stale: revalidate|      | Set Cache-Control|
  |  - fonts/images  |      | Purge: API/webhook|     | Return response  |
  |                  |      |                  |      |                  |
  | Stale-While-Reval:|     | Edge Workers:   |      |                  |
  |  - API /products |      |  A/B testing    |      |                  |
  |  - /search       |      |  Personalization|      |                  |
  |                  |      |  Geo-routing    |      |                  |
  | Network-First:   |      |                  |      |                  |
  |  - HTML pages    |      |                  |      |                  |
  |  - user profile  |      |                  |      |                  |
  +------------------+      +------------------+      +------------------+
           |                         |
           +--- HTTP Cache ----------+
           (memory: <1ms, disk: 5ms)

  Request Lifecycle:
  1. Browser fetch -> SW intercepts (if active)
  2. SW checks Cache API -> HIT? Return immediately
  3. MISS? SW checks network -> CDN checks edge cache
  4. CDN MISS? Forward to origin -> cache response -> return
  5. SW caches response for future -> return to page

  Cache Invalidation Methods:
  - Time-based: max-age, s-maxage, expires
  - Content-hash: bundle.a1b2c3.js -> bundle.d4e5f6.js
  - Purge API: POST /cdn/purge {"urls": ["/products"]}
  - Surrogate keys: Purge by tag ("product-123", "category-electronics")
\`\`\`

## 10. Real Production Incident

**Incident**: "The 47-Minute Stale Checkout" at a major e-commerce platform.

**Scenario**: The platform deployed a pricing change for a flash sale. The CDN had cached product page HTML with old prices for 47 minutes because the Cache-Control header was set to max-age=3600 with no purge mechanism.

**Root Cause**: The engineering team used a CDN without a purge API. Cache invalidation required manual ticket submission to the CDN provider, which had a 30-60 minute SLA. During the sale, customers saw incorrect prices, added items to cart at wrong prices, and triggered a flood of customer service tickets.

**CDN + SW Solution**: The company implemented a three-layer fix:
1. Changed Cache-Control to s-maxage=60, stale-while-revalidate=300 for product pages. Stale content was served for at most 1 minute of freshness, 5 minutes of stale revalidation.
2. Implemented a SW that intercepted product API responses and used stale-while-revalidate with a short staleness threshold (30 seconds). The SW checked a "pricing version" header — if the version changed, the SW immediately evicted old cache entries.
3. Added a Surrogate-Key header (Fastly) that allowed tag-based invalidation. Deploying a price change triggered a single API call: PURGE /service/pricing-update which purged all product pages in under 2 seconds globally.

**Impact**: Zero stale pricing incidents after the fix. Cache hit ratio remained above 92%. SW cache eviction prevented any user from seeing old prices for more than 30 seconds after deployment.

**Lesson Learned**: CDN cache without a purge API is dangerous for dynamic content. Always use short TTLs with stale-while-revalidate for content that can change. SW cache provides an additional safety net for cache invalidation.

## 11. Production Implementation

### Step 1: Service Worker Registration and Lifecycle

\`\`\`typescript
const CACHE_VERSION = 'v3';
const STATIC_CACHE = \`static-\${CACHE_VERSION}\`;
const DYNAMIC_CACHE = \`dynamic-\${CACHE_VERSION}\`;
const API_CACHE = \`api-\${CACHE_VERSION}\`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/fonts/inter.woff2',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !key.includes(CACHE_VERSION))
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});
\`\`\`

### Step 2: Fetch Handler with Strategy Routing

\`\`\`typescript
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Route to appropriate strategy
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  event.respondWith(fetch(request));
});

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      void cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      void cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  return cached || await fetchPromise;
}

async function networkFirstWithFallback(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      void cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/offline.html').then((r) => r || new Response('Offline', { status: 503 }));
  }
}
\`\`\`

### Step 3: Cache Size Management

\`\`\`typescript
async function trimCache(cacheName: string, maxItems: number): Promise<void> {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Call after each cache write
const originalPut = Cache.prototype.put;
Cache.prototype.put = async function(request: Request, response: Response) {
  await originalPut.call(this, request, response);
  await trimCache(this.name, 100);
};
\`\`\`

## 12. Real Company Deep Dives

**Google**: Google Maps uses SW to cache tile data for offline navigation. Users download regions while online, navigate without connectivity. Cache-first for tiles (entire regions pre-downloaded), network-first for search queries. The SW handles background sync for user-reported traffic data.

**Cloudflare**: Cloudflare's CDN caches static assets at 330+ edge locations worldwide. Their Cache Reserve product extends caching to persistent storage (R2), providing unlimited cache capacity with 100% hit ratio for cacheable content. They pioneered the stale-while-revalidate extension to Cache-Control.

**Fastly**: Fastly's CDN uses VCL (Varnish Configuration Language) for programmable cache logic. They introduced Surrogate-Key based purging, allowing tag-based invalidation. Their Instant Purge API clears cached content globally in under 150ms.

**Spotify**: Spotify's web player SW caches recently played songs and album art. Stale-while-revalidate for recommendations. Users can browse and play cached tracks offline. The SW manages a sophisticated LRU cache with quota awareness.

**Walmart**: Walmart's mobile SW caches the product catalog. Users browsing in-store (poor connectivity) see cached product pages while the SW revalidates pricing/availability. Their SW cache hit ratio exceeds 85% for repeat visits.

## 13. Interview Playbook

**Q1: Design a caching strategy for a news website with breaking news.**
*Framework*: Layer 1 (CDN): Cache static assets immutably. Cache article HTML with short TTL (60s) + stale-while-revalidate (300s). Layer 2 (SW): Cache app shell with cache-first. Cache article API with stale-while-revalidate. Breaking news: use SW to immediately evict stale homepage cache when a push notification arrives. Implement purge-on-publish via webhook to CDN + SW message.

**Q2: How do you handle cache invalidation for 10,000+ static assets?**
*Framework*: Don't invalidate — use content hashing. Each build generates new filenames: bundle.a1b2c3.js → bundle.d4e5f6.js. Old URLs become unreferenced and expire naturally via max-age. For CDN, use immutable directive. For SW, activate event deletes old caches by comparing version prefix.

**Q3: What happens when a SW cache exceeds browser quota?**
*Framework*: QuotaExceededError is thrown on cache.put(). Use navigator.storage.estimate() to check available quota. Implement LRU eviction — when adding to cache, delete oldest entries if count exceeds threshold. Provide clear UI feedback ("Storage full — manage offline content"). Use IndexedDB for large data and Cache API for request/response pairs.

**Q4: Compare CDN caching vs SW caching vs HTTP browser cache.**
*Framework*: CDN: shared across users, edge-deployed, controlled by HTTP headers, best for static assets. SW: per-user, programmable, persistent, supports offline. HTTP browser: automatic, limited control, shared quota with SW. Use all three in layers: CDN for global latency, SW for offline/programmability, HTTP cache as first-line defense.

**Q5: How does stale-while-revalidate work at the CDN level vs SW level?**
*Framework*: CDN: After max-age expires, CDN serves stale content while fetching fresh version in background. Next request gets fresh. SW: Same concept but in-browser. SW returns cached response, fires network request, updates cache for next request. SW version gives more control (e.g., custom staleness threshold, background sync).

**Q6: Design a cache strategy for a real-time collaboration tool like Figma.**
*Framework*: Network-only for WebSocket messages (real-time edits). Cache-first for static assets (app shell, fonts, icons). Stale-while-revalidate for asset library (icons, components). SW caches document snapshots periodically (every 30s) for offline recovery. IndexedDB for full document history. Conflict resolution via CRDTs on top of cached snapshots.

## 14. Concept Check Quiz

1. What is the primary benefit of immutable content hashing for static assets?
   - a) Smaller file sizes
   - b) Allows infinite max-age without invalidation concerns ✓
   - c) Faster build times
   - d) Better compression

2. In the stale-while-revalidate strategy, what happens when a request arrives after max-age has expired?
   - a) The request blocks until fresh data arrives
   - b) Cached (stale) data is returned immediately while fresh data is fetched asynchronously ✓
   - c) An error is returned
   - d) The cache is skipped entirely

3. True or False: Service Worker caching and CDN caching serve the same purpose and you only need one.
   - False. CDN caches at the network edge (shared, reduces origin load). SW caches on the device (per-user, enables offline). They complement each other.

4. What is a cache stampede and how do you prevent it?
   - a) Multiple CDN purges happening simultaneously — stagger purge times
   - b) All cached entries expiring at once, causing origin overload — use stale-while-revalidate and request collapsing ✓
   - c) Cache memory filling up — implement LRU eviction
   - d) SW failing to install — use skipWaiting

5. Which Cache-Control directive prevents CDN caching for authenticated content?
   - a) public
   - b) private, no-cache ✓
   - c) max-age=0
   - d) immutable

6. What is the difference between cache.put() and cache.add() in the Cache API?
   - a) cache.add() fetches the URL first, cache.put() accepts a Response object ✓
   - b) They are identical
   - c) cache.put() is synchronous
   - d) cache.add() only works with HTTP

## 15. Next Steps

- **Web Performance Optimization**: How caching fits into the broader performance optimization pipeline — bundle splitting, critical CSS, resource hints.
- **Image & Asset Optimization**: CDN-based image transforms with caching — format conversion, responsive resizing, and blur-up placeholders.
- **Real-Time Frontend Architecture**: How caching interacts with WebSockets, SSE, and optimistic updates for real-time features.
- **Service Worker Advanced Patterns**: Background sync, periodic sync, push notifications, and cache invalidation strategies in production SW.
- **Edge Computing (Workers)**: How Cloudflare Workers, Vercel Edge Functions, and Fastly Compute@Edge extend caching with programmable logic at the edge.
- **Next Lesson**: State Management at Scale — how server state caching (TanStack Query) integrates with SW and HTTP caching layers.`,
    estimatedMin: 12,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Google", "Cloudflare", "Fastly", "Akamai"],
    tags: ["caching", "service-worker", "CDN", "cache-strategy", "offline", "stale-while-revalidate"],
  },
  {
    id: "lesson-09-05",
    slug: "frontend-system-design-05-state-management",
    title: "State Management at Scale",
    content: `## 0. Mental Model

Think of state like **water flowing through a plumbing system**. Server state is the municipal water supply — it comes from outside, you can't control its source, but you need to manage the pipes (fetching, caching, refetching). Client state is your kitchen faucet — local, immediate, under your control. URL state is the address on the pipe — it tells everyone where things are. If you mix them up (like putting municipal water in your faucet's control logic), you get leaks, bursts, and a messy kitchen. Keep the pipes separate.

## 1. Quick Summary

State management at scale requires **clear boundaries** between server state (remote data, cache), client state (UI, local storage), and URL state (routing, search params). The winning pattern: **TanStack Query for server state**, **Zustand for global client state**, **React hooks for local state**, and **Next.js searchParams for URL state**. Avoid global stores for server data. The primary cause of state bugs at scale is mixing concerns — treating API data like UI state leads to stale data, race conditions, and incomprehensible code.

## 2. Definition & Terminology

**Server State**: Data that lives on the server and is fetched by the client. Products, users, orders, messages. Asynchronous, stale-prone, requires cache invalidation and refetching.

**Client State**: UI-local data that exists only in the browser. Modal open/close, form input, active tab, sidebar collapsed. Synchronous, volatile, lost on page refresh.

**URL State**: Data encoded in the URL. /products?category=laptops&sort=price&page=2. Shareable, bookmarkable, survives refresh.

**Persisted State**: Data saved to localStorage, IndexedDB, or OPFS. Survives browser restarts. User preferences, draft content, offline queue.

**Global Store**: A state container accessible by any component in the app. Examples: Redux store, Zustand store, Jotai atoms.

**Selector**: A function that extracts a specific slice of state from a store. Used for performance (re-render only when selected value changes).

**Atom**: A unit of state in atomic state management (Jotai, Recoil). Each atom holds a small piece of state. Components subscribe to individual atoms.

**Cache Invalidation**: The process of marking server state as stale and triggering a refetch. The hardest problem in state management.

**Optimistic Update**: Updating the UI immediately after a user action, before the server confirms. Rolled back if the server rejects the change.

## 3. The Problem Without It

As applications grow, naive state management breaks down:

**Prop Drilling**: Passing data through 10+ component layers. Change the data shape in the root? Update 15 intermediate components that just pass-through.

**Stale Data**: Component A fetches /api/products. Component B fetches /api/products independently. Component A's data is 5 seconds old, B's is fresh. Users see inconsistent data on the same page.

**Race Conditions**: User types in a search box. API calls fire for "lap", "lapt", "lapto", "laptop". Responses arrive in unpredictable order — the UI shows results for "lap" while the input says "laptop".

**Re-render Explosions**: A single Redux store update triggers 500+ component re-renders. The profiler shows 2 seconds of layout thrashing. Every connected component re-evaluates, even if the changed state slice is irrelevant.

**Synchronization Bugs**: URL params say category=laptops, but the TanStack Query cache has data for category=phones. The user sees phones while the URL says laptops. The URL is the source of truth but the cache doesn't know.

**Testing Difficulty**: Stores with side effects (API calls mixed with UI state) require complex mocking. Tests become slow and brittle.

## 4. How It Works — Core Mechanics

**Server State (TanStack Query)** :

\`\`\`typescript
function useProducts(category: string) {
  return useQuery({
    queryKey: ['products', category],
    queryFn: () => fetch(\`/api/products?category=\${encodeURIComponent(category)}\`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}
\`\`\`

Key concepts: staleTime (how long data is considered fresh), gcTime (how long unused data stays in cache), queryKey (cache key), background refetch, retry logic.

**Client State (Zustand with persistence)** :

\`\`\`typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      removeItem: (productId) => set((state) => ({
        items: state.items.filter((i) => i.productId !== productId)
      })),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'cart-storage' }
  )
);
\`\`\`

**URL State (Next.js App Router)** :

\`\`\`typescript
function useFilterParam(key: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = searchParams.get(key) || '';

  const setValue = useCallback((newValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newValue) {
      params.set(key, newValue);
    } else {
      params.delete(key);
    }
    router.replace(\`\${pathname}?\${params.toString()}\`);
  }, [key, searchParams, router, pathname]);

  return [value, setValue] as const;
}
\`\`\`

**State Machine for Complex Flows (useReducer)** :

\`\`\`typescript
type CheckoutState = 'idle' | 'cart_review' | 'shipping' | 'payment' | 'confirming' | 'success' | 'error';

type CheckoutEvent =
  | { type: 'PROCEED_TO_SHIPPING' }
  | { type: 'PROCEED_TO_PAYMENT' }
  | { type: 'SUBMIT_ORDER' }
  | { type: 'ORDER_SUCCESS' }
  | { type: 'ORDER_FAILED'; error: string }
  | { type: 'RESET' };

function checkoutReducer(state: CheckoutState, event: CheckoutEvent): CheckoutState {
  switch (state) {
    case 'cart_review':
      return event.type === 'PROCEED_TO_SHIPPING' ? 'shipping' : state;
    case 'shipping':
      return event.type === 'PROCEED_TO_PAYMENT' ? 'payment' : state;
    case 'payment':
      return event.type === 'SUBMIT_ORDER' ? 'confirming' : state;
    case 'confirming':
      if (event.type === 'ORDER_SUCCESS') return 'success';
      if (event.type === 'ORDER_FAILED') return 'error';
      return state;
    case 'error':
    case 'success':
      return event.type === 'RESET' ? 'cart_review' : state;
    default:
      return state;
  }
}
\`\`\`

## 5. Variants & Flavors

**Redux Toolkit (RTK)** : The most mature global store. Opinionated with slices, thunks, and RTK Query for server state. Best for large teams that need strict patterns and devtools. Boilerplate is higher than Zustand but provides consistency.

**Zustand**: Minimal global store with hooks-based API. No providers, no reducers, no action types. Just a store object with set/get. Best for teams that want simplicity and flexibility. Subscriptions are selector-based (no unnecessary re-renders).

**Jotai**: Atomic state management. Each atom is a small piece of state. Components subscribe to individual atoms. Best for fine-grained reactivity — changing one atom doesn't re-render subscribers of other atoms.

**TanStack Query (React Query)** : The standard for server state. Handles caching, refetching, pagination, optimistic updates, and cache invalidation. Not a global store — data is keyed by queryKey and scoped to components.

**XState / State Machines**: Formal state machines for complex flows. Best for checkout flows, multi-step wizards, game UI, and any state with explicit transitions, guards, and side effects.

**Recoil**: Meta's experimental state management. Similar to Jotai (atoms + selectors) but with additional features like atom effects. Less actively maintained than Jotai.

**Context API**: Built-in React. Good for truly global state (theme, locale, auth). Bad for frequently-updating state — every context consumer re-renders on any change. Use only for low-frequency, truly global data.

## 6. Performance Characteristics

**TanStack Query**: Cache hits are O(1) (in-memory Map). Server state reads don't cause re-renders if data hasn't changed (referential stability). Background refetches are debounced and deduplicated (same queryKey, same window). Memory: ~1KB per cached query.

**Zustand**: Selector-based subscriptions. A component only re-renders when its selected value changes (reference equality by default). Store updates are O(1) — no reducer dispatch overhead. Memory: ~500 bytes per store.

**Jotai**: Atomic granularity. Changing one atom re-renders only components that subscribe to that specific atom. No parent re-renders, no siblings affected. Ideal for large lists where each item has its own state.

**Redux**: Dispatch cycles through all middleware before reaching reducers. Selectors can memoize (Reselect). Memory: ~2KB per slice. Devtools add overhead in development.

**Context API**: Any context value change triggers re-render of ALL consumers, regardless of which part of the value they use. Mitigation: split contexts, use useMemo for value.

**Re-render Cost**: 1000 components re-rendering on a store update: 50-200ms. With proper selectors/atoms: 2-5ms for only affected components.

## 7. Failure Modes

**Stale Server Data**: TanStack Query cache returns old data while the server has newer data. User sees outdated information (e.g., wrong inventory count). Mitigation: set appropriate staleTime, invalidate queries on mutations, use WebSocket for real-time updates.

**Optimistic Update Rollback Failure**: UI optimistically updates, server rejects, rollback fails because the local state has changed since the optimistic update. Mitigation: use TanStack Query's onMutate/onError/onSettled pattern with snapshot rollback.

**Store Serialization Errors**: persist middleware (Zustand, Redux) tries to serialize a function, Map, Set, or circular reference. JSON.stringify throws. Mitigation: implement custom serialize/deserialize, or exclude non-serializable state.

**Cross-Tab State Desync**: User opens two tabs. Tab A adds item to cart (persisted to localStorage). Tab B's Zustand store doesn't know. User checks out on Tab B — cart is empty. Mitigation: use storage event listener to sync across tabs, or use broadcast channels.

**URL State vs Cache Desync**: User navigates back/forward. URL changes but TanStack Query still has old cached data. The page shows stale content briefly. Mitigation: configure query keys to include URL params, use staleTime: 0 for URL-dependent queries.

**Memory Leaks from Subscriptions**: Components mount and subscribe to stores. On unmount, they forget to unsubscribe. Store retains references to old component instances. Mitigation: use hooks that auto-unsubscribe (Zustand useStore, Jotai useAtom), verify in component cleanup.

## 8. Decision Framework

**Choose TanStack Query for:**
- All server data fetching and caching
- Mutations with optimistic updates
- Pagination, infinite scroll, and prefetching
- Cache invalidation tied to mutations

**Choose Zustand for:**
- Global UI state (cart, sidebar, theme, notifications)
- State shared between unrelated components
- State that needs to persist across sessions
- Simple, low-boilerplate global stores

**Choose Jotai for:**
- Fine-grained state where each piece is independent
- Large lists with per-item state
- Cases where you want atomic updates without a central store

**Choose Redux for:**
- Large teams that need strict patterns and conventions
- Complex state logic with middleware (sagas, epics)
- Existing codebase already on Redux

**Choose URL state for:**
- Filters, sorting, pagination
- Selected item IDs for detail pages
- Any state that should be shareable/bookmarkable

**Avoid these pitfalls:**
- Don't put server state in a global store (use TanStack Query)
- Don't use Context for frequently-updating state (use Zustand/Jotai)
- Don't over-normalize state (prefer denormalized views for UI)
- Don't use a state machine for 2-3 boolean states (use useState)

## 9. Live Architecture Diagram

\`\`\`
                    State Management Layers

   +-----------------+   +-------------------+   +----------------+
   | Component Tree  |-->| TanStack Query    |-->| Backend API    |
   | (React, Vue)    |   | (Server State)    |   | (REST, GraphQL)|
   |                 |   | - cache (Map)     |   |                |
   | local: useState |   | - staleTime       |   |                |
   | shared: Zustand |   | - gcTime          |   |                |
   | flows: useReducer|  | - background refetch| |                |
   | atoms: Jotai    |   | - query invalidation| |                |
   +--------+--------+   +---------+---------+   +----------------+
            |                       |
            v                       v
   +--------+--------+   +---------+---------+
   | URL State        |   | Persisted State   |
   | (searchParams)   |   | (localStorage,    |
   | - filters        |   |  IndexedDB)       |
   | - pagination     |   | - preferences     |
   | - selected item  |   | - drafts          |
   +------------------+   +---------+---------+
                                      |
                                      v
                             +------------------+
                             | Broadcast Channel |
                             | (cross-tab sync)  |
                             +------------------+

Data Flow Rules:
  Server State: Fetch -> Cache -> Select -> Render
  Client State: User Action -> Store Update -> Re-render
  URL State:   Navigation -> URL Change -> Query Key Change -> Refetch
  Persisted:   Store Update -> Debounce -> Serialize -> Write to Storage
\`\`\`

## 10. Real Production Incident

**Incident**: "The Phantom Cart" at a major e-commerce retailer.

**Scenario**: Users reported items appearing and disappearing from their shopping cart randomly. The cart would show 3 items, the user would proceed to checkout, and the checkout page would show 2 items. Some users were charged for items they never added.

**Root Cause**: The cart state was split across three stores: Redux (server state cache), Context (component-local cart UI), and localStorage (persistence). On page load, all three initialized independently. Race conditions between Redux hydration, Context initialization, and localStorage reads caused the cart state to settle to different values depending on timing. If the user added an item before the server state hydrated, the item was added to a stale base state and lost on the next re-render.

**State Management Solution**: The team consolidated cart state into a single Zustand store with persist middleware:
1. Zustand became the single source of truth for cart state (items, quantities, metadata).
2. persist middleware handled localStorage synchronization.
3. TanStack Query handled the server-side order submission (mutation), invalidating the cart query on success.
4. A Zustand subscribe listener pushed cart changes to a Broadcast Channel for cross-tab synchronization.
5. On page load, Zustand initialized from localStorage (instant), then the SW revalidated server cart state in the background. If server state differed, the store updated and showed a toast: "Your cart was updated from another device."

**Impact**: Zero phantom cart incidents after deployment. Cart consistency improved from 94% to 99.97%. Customer service tickets related to cart issues dropped by 80%.

**Lesson Learned**: Multiple sources of truth for the same state category cause irreproducible bugs. One state category = one store. Server state and client state must never share a store.

## 11. Production Implementation

### Step 1: TanStack Query Setup with Cache Invalidation

\`\`\`typescript
import { QueryClient, useQuery, useMutation } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
  },
});

// Product list query
function useProductList(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', 'list', filters],
    queryFn: async () => {
      const params = new URLSearchParams(
        Object.entries(filters)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      );
      const res = await fetch(\`/api/products?\${params}\`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json() as Promise<PaginatedResponse<Product>>;
    },
    placeholderData: keepPreviousData,
  });
}

// Add to cart mutation with optimistic update
function useAddToCart() {
  return useMutation({
    mutationFn: (productId: string) =>
      fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      }).then((r) => r.json()),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData(['cart']);
      queryClient.setQueryData(['cart'], (old: Cart) => ({
        ...old,
        items: [...old.items, { productId, quantity: 1 }],
      }));
      return { previousCart };
    },
    onError: (_err, _productId, context) => {
      queryClient.setQueryData(['cart'], context?.previousCart);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
\`\`\`

### Step 2: Zustand Store with Cross-Tab Sync

\`\`\`typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  notifications: Notification[];
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  addNotification: (n: Notification) => void;
  dismissNotification: (id: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      theme: 'system',
      notifications: [],
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      addNotification: (n) => set((s) => ({ notifications: [...s.notifications, n] })),
      dismissNotification: (id) => set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
      })),
    }),
    {
      name: 'ui-preferences',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

// Cross-tab synchronization
const CART_CHANNEL = new BroadcastChannel('cart-sync');

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (item) => {
        set((s) => ({ items: [...s.items, item] }));
        CART_CHANNEL.postMessage({ type: 'CART_UPDATED', items: get().items });
      },
      removeItem: (id) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        CART_CHANNEL.postMessage({ type: 'CART_UPDATED', items: get().items });
      },
      setOpen: (open) => set({ isOpen: open }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'shopping-cart' }
  )
);

// Listen for cross-tab updates
CART_CHANNEL.onmessage = (event) => {
  if (event.data.type === 'CART_UPDATED') {
    useCartStore.setState({ items: event.data.items });
  }
};
\`\`\`

### Step 3: URL State Hook for Filters

\`\`\`typescript
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export function useSyncFilters<T extends Record<string, string | undefined>>() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = Object.fromEntries(searchParams.entries()) as T;

  const setFilters = useCallback((updates: Partial<T>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(\`\${pathname}?\${params.toString()}\`, { scroll: false });
  }, [searchParams, router, pathname]);

  return { filters, setFilters };
}
\`\`\`

## 12. Real Company Deep Dives

**Shopify**: The Shopify admin dashboard uses TanStack Query for all 400+ API endpoints. Query keys follow a strict convention: ['resource', 'action', params]. Cache invalidation is triggered automatically when related mutations succeed (e.g., creating a product invalidates ['products', 'list', '*']). Zustand handles UI state (sidebar, theme, notification preferences).

**Linear**: Linear's issue tracker uses Jotai for fine-grained reactivity. Each issue card has its own atom. Opening an issue modal only re-renders that single atom's subscribers — the 500-item list below doesn't blink. Their state architecture supports real-time collaboration via WebSocket events that patch individual atoms.

**Notion**: Notion uses a custom CRDT (Conflict-free Replicated Data Type) for real-time collaboration. Local state and server state are not separate — they merge via operational transforms. The CRDT handles conflict resolution, offline edits, and multi-device sync. This is the most sophisticated state management in production.

**Vercel**: Vercel's dashboard uses Zustand for global UI state (project selection, theme, navigation) and TanStack Query for all deployment, domain, and team data. They pioneered the pattern of using TanStack Query's queryClient as a "server state cache" that is entirely separate from client state.

**Airbnb**: Airbnb uses Redux Toolkit for global booking state (date picker, guest count, map filters). The booking flow is implemented as a state machine with explicit transitions. RTK Query handles server data for listings, reviews, and pricing. Migration from legacy Redux to RTK took 18 months across 50+ developers.

## 13. Interview Playbook

**Q1: Design the state management for a Trello-like kanban board with real-time updates.**
*Framework*: Server state (boards, lists, cards): TanStack Query with WebSocket subscription for real-time updates. Client state (dragging card, modal open, sidebar): Zustand. URL state (board ID, card ID, filter): searchParams. Optimistic updates for drag-and-drop — reorder cards instantly, rollback on server rejection. Broadcast channel for multi-tab sync.

**Q2: What is the difference between staleTime and gcTime in TanStack Query?**
*Framework*: staleTime: how long data is considered fresh. During this period, useQuery returns cached data without refetching. gcTime (formerly cacheTime): how long inactive/unused data remains in memory. After gcTime expires, data is garbage collected. If a component mounts again before gcTime expires, data is served from cache (even if stale) while a background refetch occurs.

**Q3: How do you handle optimistic updates with rollback?**
*Framework*: Use TanStack Query's useMutation with onMutate (apply optimistic update, snapshot previous state), onError (rollback to snapshot), and onSettled (invalidate queries to refetch actual server state). Ensure idempotency — the mutation should be safe to retry after rollback.

**Q4: What are the re-render implications of React Context vs Zustand vs Jotai?**
*Framework*: Context: all consumers re-render when ANY part of the context value changes. Zustand: only components whose selected value changes re-render (selector-based). Jotai: only components subscribing to the specific changed atom re-render. Context is fine for rarely-changing values (theme, locale). Zustand is best for medium-frequency updates. Jotai is best for fine-grained reactivity with many independent state pieces.

**Q5: How would you handle cross-tab state synchronization?**
*Framework*: Persist state to localStorage (Zustand persist, Redux persist). Listen for storage events in other tabs. For real-time sync, use BroadcastChannel API. For complex state, use a shared Web Worker. For server-backed sync, use WebSocket events that broadcast state changes to all connected clients.

**Q6: Design state management for a micro-frontend with 3 independent teams.**
*Framework*: Each MFE manages its own state independently (Zustand stores, TanStack Query). Cross-MFE communication via custom events (window.dispatchEvent) or a shared event bus. Cart state lives in the host container (shared across MFEs). Auth state is shared via a custom event + localStorage. Each MFE's store is lazy-loaded with its bundle.

## 14. Concept Check Quiz

1. What is the primary difference between server state and client state?
   - a) Server state is stored in Redux, client state in useState
   - b) Server state is owned by the server and cached on the client; client state exists only in the browser ✓
   - c) Server state is slower than client state
   - d) There is no difference

2. Why should server state NOT be stored in a global Redux/Zustand store?
   - a) It causes bundle size increase
   - b) It leads to stale data, manual cache invalidation, and race conditions ✓
   - c) Redux doesn't support async operations
   - d) Server state can't be serialized

3. True or False: React Context is a good choice for frequently-updating global state.
   - False. Context re-renders ALL consumers on any change. Use Zustand or Jotai for frequently-updating state.

4. In TanStack Query, what happens when staleTime expires?
   - a) The cached data is immediately deleted
   - b) Data is considered stale but still served; background refetch occurs when a component mounts ✓
   - c) An error is thrown
   - d) The query key is invalidated

5. What is the purpose of a selector in Zustand?
   - a) To select which store to use
   - b) To extract a specific slice of state and prevent unnecessary re-renders ✓
   - c) To select the React version
   - d) To select the API endpoint

6. What is the BroadcastChannel API used for in state management?
   - a) Broadcasting data to the server
   - b) Synchronizing state across browser tabs ✓
   - c) Broadcasting error messages
   - d) Connecting to WebSocket servers

## 15. Next Steps

- **Micro-Frontends Architecture**: How state is shared across independent frontend applications — custom events, shared stores, and postMessage patterns.
- **Real-Time Frontend Architecture**: State synchronization with WebSockets, SSE, and optimistic updates for collaborative features.
- **Rendering Patterns**: How state hydration works with SSR, streaming, and server components — avoiding the double-data problem.
- **Web Performance Optimization**: Avoiding unnecessary re-renders with selector-based subscriptions, memoization, and virtualization.
- **Caching Strategies for Frontend**: How TanStack Query's caching integrates with Service Worker and HTTP cache layers for a unified data flow.
- **Next Lesson**: Micro-Frontends Architecture — decomposing the frontend monolith into independent, deployable units with their own state management.`,
    estimatedMin: 14,
    difficulty: "ADVANCED" as const,
    companies: ["Meta", "Redux", "Zustand", "Recoil"],
    tags: ["state-management", "redux", "zustand", "recoil", "mobx", "context"],
  },
  {
    id: "lesson-09-06",
    slug: "frontend-system-design-06-micro-frontends",
    title: "Micro-Frontends Architecture",
    content: `## 0. Mental Model

Imagine a **shopping mall** instead of a single department store. Each micro-frontend is an independent storefront (Nike, Apple, Starbucks) with its own entrance, staff, inventory, and decor. The mall (host container) provides common infrastructure: parking (auth), hallways (routing), restrooms (shared utilities). Stores can renovate independently, open late, or close without affecting other stores. Customers walk between stores seamlessly. Now imagine trying to fit all those stores into one giant department store — that's a frontend monolith.

## 1. Quick Summary

**Micro-frontends** extend microservice principles to the frontend: multiple teams independently develop, test, deploy, and own distinct UI fragments that compose into a single application. The key techniques are **module federation** (Webpack 5), **iframe isolation**, **web components**, and **server-side composition**. The hardest challenges are shared dependencies, consistent UX, and cross-team coordination. When done well, micro-frontends enable **independent deployability**, **team autonomy**, and **incremental migration**. When done poorly, they increase bundle size, complexity, and latency.

## 2. Definition & Terminology

**Micro-Frontend (MFE)** : An independent frontend application that owns a specific business domain. Developed, tested, and deployed by a single team. Composes with other MFEs at runtime.

**Host Container**: The shell application that loads and orchestrates MFEs. Responsible for routing, authentication, shared dependencies, and cross-MFE communication.

**Module Federation**: A Webpack 5 plugin that allows loading remotely deployed JavaScript modules at runtime. Each MFE exposes its entry point; the host consumes it via remote imports.

**Remote Entry**: A JSON manifest file (remoteEntry.js) that tells the host which modules are available from a remote MFE and where to fetch them.

**Shared Dependencies**: Libraries (React, design system, routing) that are loaded once and shared across MFEs to avoid duplication. Configured in module federation's shared block.

**Server-Side Composition (ESI/SSI)** : HTML fragments from different MFEs are assembled on the server (or edge) using Edge Side Includes or server-side includes.

**Web Components**: Standard browser APIs (Custom Elements, Shadow DOM, HTML Templates) that allow creating framework-agnostic components. MFE boundaries can be web components.

**Iframe Isolation**: Each MFE runs in a sandboxed iframe. Full style and script isolation, but performance and SEO penalties.

**Decomposition Strategy**: The approach to splitting a frontend monolith into MFEs. Common patterns: by domain (product, cart, checkout), by team (team A owns search, team B owns recommendations), or by page section (header, sidebar, footer).

## 3. The Problem Without It

Large frontend monoliths suffer from several scaling problems:

**Scaling Friction**: 50+ developers committing to the same repository, same build pipeline. A single CI run takes 45 minutes. Pull requests queue for hours. Code review bottlenecks.

**Framework Lock-In**: The application was built with Angular 8 in 2020. The team wants to migrate to React 18. In a monolith, this requires a full rewrite or a multi-year incremental migration that touches every file.

**Deployment Coupling**: A bug in the product image carousel (owned by Team Product) blocks the deployment of the checkout page (owned by Team Checkout). Both teams are blocked because the entire app deploys as one unit.

**Code Ownership Ambiguity**: A file has 30+ contributors from 5 teams. No one is sure who owns the component. Refactoring requires coordination with multiple teams. Dependencies are unclear.

**Performance Cliffs**: Team Analytics adds a 200KB charting library. Every page in the app now loads this library, increasing LCP by 500ms. The analytics team didn't realize their dependency would affect the landing page.

**Testing Bottlenecks**: Full E2E test suite runs for 3 hours. Any change triggers the entire suite. Teams wait overnight for test results.

**Scaling to multiple teams requires organizational decoupling first, then technical decoupling. Micro-frontends are a technical solution to an organizational problem.**

## 4. How It Works — Core Mechanics

**Module Federation (Webpack 5) — Host Configuration:**

\`\`\`typescript
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        products: 'products@https://products.example.com/remoteEntry.js',
        cart: 'cart@https://cart.example.com/remoteEntry.js',
        checkout: 'checkout@https://checkout.example.com/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0', eager: true },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0', eager: true },
        '@shared/ui': { singleton: true },
      },
    }),
  ],
};
\`\`\`

**Module Federation — Remote (MFE) Configuration:**

\`\`\`typescript
new ModuleFederationPlugin({
  name: 'products',
  filename: 'remoteEntry.js',
  exposes: {
    './ProductList': './src/ProductList',
    './ProductDetail': './src/ProductDetail',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.2.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
  },
});
\`\`\`

**Iframe Isolation:**
Each MFE renders in a sandboxed iframe. Communication via postMessage. Pros: total isolation (CSS, JS, errors), independent technologies. Cons: performance (iframe creation = 5-20ms), SEO (content not indexed), accessibility (cross-frame navigation), shared context (no shared auth tokens without postMessage).

**Server-Side Composition (Edge Includes):**

\`\`\`html
<esi:include src="https://header.mfe.example.com/header" />
<esi:include src="https://products.mfe.example.com/product/123" />
<esi:include src="https://recommendations.mfe.example.com/sidebar" />
<esi:include src="https://footer.mfe.example.com/footer" />
\`\`\`

**Web Components Approach:**
Each MFE exports one or more custom elements. The host renders standard HTML:

\`\`\`html
<product-card product-id="123" host-api='{"navigate":"/"}'></product-card>
<mini-cart></mini-cart>
\`\`\`

Shadow DOM encapsulates styles. The host provides a global API via attributes or events.

## 5. Variants & Flavors

**Build-Time Integration**: All MFEs are composed at build time. Each MFE is an npm package. The host imports them like regular dependencies. Pros: simple, standard tooling. Cons: all MFEs must use the same framework version, deployments are coupled (any MFE update requires host rebuild).

**Run-Time Integration (Module Federation)** : MFEs are deployed independently. The host loads remoteEntry.js at runtime and fetches MFE code on demand. Pros: independent deployability, lazy loading, version independence. Cons: shared dependency management, network dependency on remote MFEs.

**Run-Time Integration (Iframes)** : MFEs are independent web apps loaded in iframes. Pros: total isolation, any technology, failure isolation (iframe crash doesn't affect host). Cons: performance, SEO, accessibility, no shared context.

**Server-Side Composition**: HTML fragments from each MFE are assembled on the server (Node.js, edge, or CDN). Pros: SEO-friendly, fast initial render, works without JavaScript. Cons: server orchestration complexity, shared caching challenges.

**Edge-Side Composition**: Fragments composed at the CDN edge (Cloudflare Workers, Vercel Edge, Fastly Compute@Edge). Pros: low latency (composed at edge near user), scalable. Cons: limited runtime (Workers), debugging difficulty.

**Hybrid (Most Common)** : Server-side composition for initial HTML (SEO, fast LCP), then module federation for client-side navigation (interactive updates). This gives the best of both worlds.

## 6. Performance Characteristics

**Bundle Size Impact**: Each MFE may include its own framework and library dependencies. Without shared dependencies, 3 MFEs could load React 3 times: 3 x 40KB = 120KB vs 40KB shared. Shared dependencies are essential for performance.

**Lazy Loading**: Module federation supports lazy loading — MFEs load on demand. Cart MFE only loads when user opens cart. Products MFE only loads on product pages. This can reduce initial bundle by 60-80%.

**Composition Overhead**: Loading 5 MFEs on the same page increases total requests and load time. Each MFE has its own JS bundle, CSS, and potentially its own API calls. Mitigation: prefetch + preload, inline critical CSS, batch API calls.

**SEO Impact**: Client-side composed MFEs (module federation, iframes) are invisible to crawlers unless SSR is implemented. Server-side composition (ESI) is SEO-friendly.

**Memory**: Each iframe MFE consumes 10-50MB of memory (separate rendering context). Module federation MFEs share the main rendering context — minimal overhead beyond bundle size.

**Time-to-Interactive**: Sequential loading of MFEs increases TTI. Critical MFEs (header, product) should load first. Non-critical MFEs (recommendations, footer) should be deferred.

## 7. Failure Modes

**MFE Crash**: One MFE throws an uncaught error. In module federation, this can crash the entire React tree. Mitigation: wrap each MFE in an error boundary with a fallback UI (e.g., "This section is temporarily unavailable").

**Version Mismatch**: Host specifies react@18.2.0, MFE ships with react@19.0.0. Module federation's shared singleton throws "Unsatisfied version" error. Mitigation: careful version management, test in staging with all MFE versions, use requiredVersion range instead of exact.

**Shared Dependency Conflict**: Two MFEs depend on different major versions of the same library. Module federation can only provide one singleton. Mitigation: keep shared dependencies to a minimum, version the design system API, use peer dependencies.

**CSS Leakage**: MFE A's styles affect MFE B's components. In module federation (no Shadow DOM), CSS is global. Mitigation: use CSS Modules, scoped class names (BEM), or CSS-in-JS with runtime scoping.

**Network Dependency**: Host loads remoteEntry.js from MFE's server. If MFE's server is down, the host can't load that section. Mitigation: implement MFE loading with retry logic, provide cached fallback, use stale-while-revalidate for remoteEntry.js.

**Cross-MFE Event Bus Failure**: Custom events between MFEs get lost or duplicated. Event ordering is non-deterministic. Mitigation: use a shared state bus with atomic updates, or use TanStack Query's query invalidation as the synchronization mechanism.

**Deployment Order Issues**: MFE B depends on an API contract change. MFE A deploys first, breaking MFE B. Mitigation: contract testing (Pact.io), feature flags, backward-compatible API changes.

## 8. Decision Framework

**Consider micro-frontends when:**
- Multiple independent teams need to contribute to the same product surface.
- Different teams have different deployment cadences (daily vs weekly).
- You need to incrementally migrate between frameworks (Angular → React).
- Each team has a clear domain boundary (search, recommendations, cart, checkout).
- The monolith has reached CI/CD friction (builds > 30 min, deploy risk is high).

**Do NOT use micro-frontends when:**
- Fewer than 10 frontend developers total.
- The application is simple (CRUD dashboard, marketing site, blog).
- The team cannot invest in shared design systems and integration testing.
- Performance is the absolute top priority (MFEs add overhead).
- The organizational structure doesn't support team autonomy.

**Integration Strategy Decision Matrix:**

| Factor | Module Federation | Iframes | Server-Side (ESI) | Web Components |
|---|---|---|---|---|
| SEO | Needs SSR | Poor | Excellent | Needs SSR |
| Performance Overhead | Low-Medium | High | Low | Low |
| Isolation | Low (shared JS) | Total | High | Medium (Shadow DOM) |
| Independent Deploy | Yes | Yes | Yes | Yes |
| Cross-MFE Communication | Easy | postMessage | Server-only | Custom Events |
| Framework Agnostic | No (JS bundle) | Yes | Yes | Yes |
| Complexity | High | Low | Medium | Medium |
| Browser Support | Modern browsers | Universal | Universal | Modern browsers |

## 9. Live Architecture Diagram

\`\`\`
                    Micro-Frontend Composition Architecture

     +-------------------------- HOST CONTAINER -------------------------+
     |                                                                   |
     |  +---- HEADER MFE --------+  +---- CART MFE (icon) -----------+  |
     |  | Team: Navigation       |  | Team: Cart                    |  |
     |  | React 18               |  | Vue 3                        |  |
     |  | Deploys: daily         |  | Deploys: hourly              |  |
     |  | SSR: yes               |  | SSR: no (CSR lazy)           |  |
     |  +------------------------+  +-------------------------------+  |
     |                                                                   |
     |  +------------------ PRODUCT MFE ------------------------------+  |
     |  | Team: Product Listing                                       |  |
     |  | Svelte 4, deploys: weekly                                   |  |
     |  | Contains: grid, filters, pagination, quick-view modal      |  |
     |  | SSR: streaming (renderToPipeableStream)                     |  |
     |  +------------------------------------------------------------+  |
     |                                                                   |
     |  +-- RECOMMENDATIONS MFE ---+  +-- FOOTER MFE ----------------+  |
     |  | Team: ML/Personalization  |  | Team: Platform              |  |
     |  | React 18, SSR w/ Redis   |  | Preact, static SSG           |  |
     |  | Deploys: 2x/week         |  | Deploys: monthly            |  |
     |  +---------------------------+  +-----------------------------+  |
     |                                                                   |
     +------------------------------------------------------------------+

     Communication Layer:
     +------------------------------------------------------------------+
     |  Custom Events (window.dispatchEvent)                           |
     |  Event: 'add-to-cart' (Product -> Cart MFE)                    |
     |  Event: 'user-login' (Header -> All MFEs)                      |
     |  Event: 'navigation' (Host -> All MFEs)                        |
     |  Event: 'search' (Header -> Search MFE)                        |
     +------------------------------------------------------------------+

     Deployment Pipeline:
     MFE A (daily)  --> Build --> Deploy to S3 --> CDN cache purged
     MFE B (weekly) --> Build --> Deploy to S3 --> CDN cache purged
     Host (monthly) --> Update remote URLs --> Deploy --> No rebuild needed
\`\`\`

## 10. Real Production Incident

**Incident**: "The Blank Checkout" at a large e-commerce platform using module federation.

**Scenario**: The checkout team deployed a new version of their MFE that included an updated shared dependency (@shared/ui v2.0.0). The host container was still loading @shared/ui v1.0.0. Module federation's singleton check threw a runtime error, causing the entire checkout MFE to fail to render. Users saw a blank page on the checkout step.

**Root Cause**: The shared dependency version was pinned to an exact version (^1.0.0) in the host's webpack config, but the checkout MFE required ^2.0.0. Module federation attempted to load v1.0.0 as the singleton, but the checkout MFE's components expected v2.0.0 APIs. The version mismatch error was caught by React's error boundary (which was also in the shared scope) — and the error boundary itself failed because it referenced v1.0.0 APIs.

**Micro-Frontend Solution**: The team implemented three safeguards:
1. **Semantic Versioning Policy**: Shared dependencies agreed to use caret ranges (^18.2.0) and never break backward compatibility within a major version.
2. **MFE Version Pinning with Staging**: Each MFE's remoteEntry URL included a version hash (checkout@https://.../v2.3.1/remoteEntry.js). The host stored the expected version per MFE. Deployment to production required a canary phase where the new MFE ran alongside the old version for 15 minutes.
3. **Defensive Error Boundaries**: Each MFE had its own error boundary that rendered a branded fallback ("Checkout temporarily unavailable. Your cart is saved.") with a "Retry" button. The error boundary used a CDN-loaded script that was outside the shared scope.

**Impact**: Zero blank-page incidents after the fix. The canary deployment process caught 3 additional version mismatches before they reached production. User impact was limited to a branded fallback message during the first incident.

**Lesson Learned**: Shared dependencies are the most brittle part of a micro-frontend architecture. Version policy, staging deployment, and defensive error boundaries are non-negotiable. Never let a single MFE crash bring down the entire page.

## 11. Production Implementation

### Step 1: Host Container with Module Federation

\`\`\`typescript
// webpack.config.js (Host)
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        header: 'header@https://mfe-header.example.com/v2.1.0/remoteEntry.js',
        products: 'products@https://mfe-products.example.com/v3.0.1/remoteEntry.js',
        cart: 'cart@https://mfe-cart.example.com/v1.4.2/remoteEntry.js',
        checkout: 'checkout@https://mfe-checkout.example.com/v2.3.1/remoteEntry.js',
        footer: 'footer@https://mfe-footer.example.com/v1.0.5/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0', eager: true },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0', eager: true },
        '@shared/ui': { singleton: true, requiredVersion: '^2.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.20.0' },
      },
    }),
  ],
};
\`\`\`

### Step 2: Dynamic MFE Loader with Error Boundary

\`\`\`typescript
import React, { lazy, Suspense, ComponentType, useState, useEffect } from 'react';

interface MFEModule {
  default: ComponentType<{ host?: HostAPI }>;
}

interface HostAPI {
  navigate: (path: string) => void;
  getAuthToken: () => string | null;
  getLocale: () => string;
  getBasePath: () => string;
}

const hostAPI: HostAPI = {
  navigate: (path) => { window.history.pushState({}, '', path); },
  getAuthToken: () => localStorage.getItem('auth_token'),
  getLocale: () => navigator.language,
  getBasePath: () => '/app',
};

const mfeRegistry = new Map<string, React.LazyExoticComponent<ComponentType<{ host?: HostAPI }>>>();

function getOrCreateLazyMFE(name: string, importFn: () => Promise<MFEModule>) {
  if (!mfeRegistry.has(name)) {
    mfeRegistry.set(name, lazy(importFn));
  }
  return mfeRegistry.get(name)!;
}

function MFELoader({
  name,
  importFn,
  fallback = <div className="mfe-skeleton" />,
  errorFallback = <div className="mfe-error">Section unavailable</div>,
}: {
  name: string;
  importFn: () => Promise<MFEModule>;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}) {
  const [hasError, setHasError] = useState(false);
  const MFE = getOrCreateLazyMFE(name, importFn);

  if (hasError) return <>{errorFallback}</>;

  return (
    <ErrorBoundary
      fallback={errorFallback}
      onError={() => setHasError(true)}
    >
      <Suspense fallback={fallback}>
        <MFE host={hostAPI} />
      </Suspense>
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: () => void;
}> {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(\`MFE Error:\`, error, info);
    this.props.onError?.();
  }
  render() {
    return this.props.children;
  }
}
\`\`\`

### Step 3: Cross-MFE Event Bus

\`\`\`typescript
type MFEEvent =
  | 'add-to-cart'
  | 'remove-from-cart'
  | 'user-login'
  | 'user-logout'
  | 'search'
  | 'navigation'
  | 'locale-change';

const mfeBus = {
  emit(event: MFEEvent, detail: unknown) {
    window.dispatchEvent(new CustomEvent(event, { detail }));
  },
  on(event: MFEEvent, handler: (detail: unknown) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    window.addEventListener(event, listener);
    return () => window.removeEventListener(event, listener);
  },
  once(event: MFEEvent, handler: (detail: unknown) => void) {
    const wrapper = (detail: unknown) => {
      handler(detail);
      window.removeEventListener(event, wrapper as EventListener);
    };
    window.addEventListener(event, wrapper as EventListener);
  },
};

// Usage in Product MFE:
// mfeBus.emit('add-to-cart', { productId: '123', quantity: 1 });

// Usage in Cart MFE:
// useEffect(() => mfeBus.on('add-to-cart', (detail) => addItem(detail)), []);
\`\`\`

### Step 4: MFE State Sharing via Custom Event + TanStack Query Invalidation

\`\`\`typescript
// Cart MFE listens for add-to-cart events and invalidates its query
function CartIcon() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return mfeBus.on('add-to-cart', () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    });
  }, [queryClient]);

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => fetch('/api/cart').then((r) => r.json()),
  });

  return <span className="cart-badge">{cart?.itemCount || 0}</span>;
}
\`\`\`

## 12. Real Company Deep Dives

**IKEA**: IKEA built a micro-frontend platform with 20+ MFEs, each representing a store section (kitchens, sofas, desks, beds, storage). Each MFE is an independent React application developed by a cross-functional team. Module federation handles runtime composition. SSR is implemented per-MFE using a shared Node.js rendering service. IKEA's design system (Inter IKEA) provides shared components that are versioned and loaded as a singleton.

**Zalando**: Zalando pioneered server-side micro-frontend composition at scale. They built their own library, Tailor (now open-sourced as Project Mosaic), which assembles HTML fragments from different services on the server. Each fragment is an independent web application with its own backend. The orchestrator handles fragment fallback, timeout, and caching. They run 100+ frontend services in production.

**Spotify**: Spotify's desktop application uses a custom micro-frontend framework called Cosmos. Each feature (browse, search, library, playlist, podcast) is an independent module with its own state management and lifecycle. Cosmos handles module loading, routing, and inter-module communication via a shared event bus. Spotify's approach is notable because it runs in Electron, not a browser.

**Upwork**: Upwork migrated from a Rails monolith (server-rendered jQuery) to micro-frontends using module federation. 60+ developers across 12 teams independently deploy their MFEs. The migration took 18 months and followed the strangler fig pattern — new features were built as MFEs, old features were converted one at a time. Module federation allowed them to run React 16 and React 18 MFEs side by side during migration.

**DAZN** (sports streaming): Each sport (NFL, Premier League, Champions League, MLB) is a micro-frontend owned by a dedicated team. Teams deploy independently during their respective seasons. The NFL team can deploy daily during football season without affecting the MLB team (off-season). Module federation + server-side composition ensures SEO for content pages and fast streaming for live events.

## 13. Interview Playbook

**Q1: Design a micro-frontend architecture for a large e-commerce platform with 5 teams.**
*Framework*: Decompose by domain: Product MFEs (listing, detail, search), Cart MFE, Checkout MFE, Recommendations MFE, Account MFE. Use module federation for runtime composition. Host container provides auth, routing, and shared dependencies (React, design system). Cross-MFE communication via custom events. Error boundaries per MFE. Server-side composition for SEO-critical product pages.

**Q2: Compare module federation, iframes, and web components for micro-frontend composition.**
*Framework*: Module federation: best performance, shared dependencies, React-centric, requires Webpack 5. Iframes: total isolation, any technology, poor SEO/performance/accessibility. Web components: framework-agnostic, Shadow DOM isolation, limited data passing, emerging standard. Recommend module federation for most cases, web components for framework-agnostic boundary, iframes only for third-party untrusted content.

**Q3: How do you ensure consistent UX across micro-frontends built by 10 different teams?**
*Framework*: Mandatory shared design system (web components or React components). Design tokens for colors, typography, spacing (CSS custom properties). Component library with versioned releases. Visual regression testing in CI (Chromatic, Percy). Cross-MFE integration tests in staging. UX review board for new MFE launches.

**Q4: What are the performance implications of loading 5+ micro-frontends on a single page?**
*Framework*: Bundle duplication if shared dependencies aren't configured. Sequential loading increases TTI. Multiple API calls from different MFEs. Mitigation: shared dependencies (singleton), lazy-load non-critical MFEs (recommendations, footer), batch API calls via BFF, critical MFE markup via SSR/streaming.

**Q5: How do you handle authentication and routing in a micro-frontend architecture?**
*Framework*: Auth: host manages auth state (token, user info), exposes via custom event ('user-login', 'user-logout') or HostAPI passed to each MFE. MFEs never manage auth directly. Routing: host owns top-level routes (/products, /cart, /checkout). Each MFE handles its own sub-routing (host: /products, MFE: /products/123, /products?category=laptops). Use a shared route config.

**Q6: Your checkout MFE crashes. How do you prevent it from affecting the rest of the application?**
*Framework*: Error boundary wrapping each MFE with fallback UI. Error boundary must be in the host, not the MFE (MFE error can't render its own error boundary). Fallback shows branded message with retry. Monitor MFE load failures and send alerts. Circuit breaker: if MFE fails 5 times in 1 minute, stop trying to load it and show permanent fallback.

## 14. Concept Check Quiz

1. What is the primary advantage of module federation over iframes for micro-frontends?
   - a) Better performance and shared dependencies ✓
   - b) Easier to implement for beginners
   - c) Works in older browsers
   - d) No server configuration needed

2. What is the purpose of the remoteEntry.js file in module federation?
   - a) It contains the MFE's entire source code
   - b) It's a manifest that tells the host which modules are available and where to fetch them ✓
   - c) It's a configuration file for Webpack
   - d) It's a placeholder for shared dependencies

3. True or False: Micro-frontends always reduce bundle size compared to a monolithic SPA.
   - False. Without shared dependencies, each MFE loads its own framework copy, increasing total bundle size.

4. What is the 'singleton' option in module federation's shared configuration?
   - a) Each MFE loads its own copy of the library
   - b) Only one instance of the library is loaded and shared across all MFEs ✓
   - c) The library is loaded from a CDN
   - d) The library is bundled inline

5. Which composition approach is best for SEO-critical pages?
   - a) Client-side module federation
   - b) Iframes
   - c) Server-side composition (ESI/SSI) ✓
   - d) Web components without SSR

6. What is the strangler fig pattern in the context of micro-frontends?
   - a) A pattern for testing micro-frontends
   - b) Incrementally replacing monolith features with MFEs one at a time ✓
   - c) A deployment strategy for multiple MFEs
   - d) A caching strategy for MFE bundles

## 15. Next Steps

- **Module Federation Deep Dive**: Advanced configuration — bidirectional sharing, dynamic remotes, version negotiation, and federation of non-JS assets.
- **Web Components & Custom Elements**: Building framework-agnostic micro-frontend boundaries with Shadow DOM, slots, and custom events.
- **Server-Side Composition**: Edge-side includes (ESI), fragment caching, and orchestrator patterns for server-assembled micro-frontends.
- **Cross-MFE State Management**: Patterns for sharing authentication, cart, and user preferences across independently deployed MFEs.
- **Micro-Frontend Testing**: Contract testing (Pact), E2E testing across MFEs, visual regression, and integration testing strategies.
- **Next Lesson**: Web Performance Optimization — how to optimize load time, interactivity, and visual stability across composed micro-frontends.`,
    estimatedMin: 15,
    difficulty: "ADVANCED" as const,
    companies: ["Amazon", "IKEA", "Spotify", "Zalando"],
    tags: ["micro-frontends", "module-federation", "web-components", "monorepo", "decomposition"],
  },  {
    id: "lesson-09-07",
    slug: "frontend-system-design-07-web-performance",
    title: "Web Performance Optimization",
    content: `## 0. Mental Model

> Web performance optimization is like a **restaurant kitchen during dinner rush**. The chef (browser) must prepare and serve dishes (render content) as quickly as possible. Prep work (build-time optimization) happens before service. Ingredients are pre-chopped (code splitting), sauces pre-made (critical CSS), and the menu is designed so dishes can be served in parallel (lazy loading). The goal: every table gets their food (LCP) within 2.5 minutes, and no table waits more than 200ms for a waiter's attention (INP).

## 1. Quick Summary

- **Web Performance Optimization** reduces load time and improves interactivity through bundle optimization, code splitting, lazy loading, resource hints, critical CSS, and efficient rendering.
- **Core techniques**: Route-based and component-level code splitting, tree shaking, critical CSS inlining, resource hints (preload/preconnect/prefetch), image optimization (WebP/AVIF), virtual scrolling, debouncing/throttling, and service worker caching.
- **Key metrics**: LCP < 2.5s, INP < 200ms, CLS < 0.1, TTFB < 800ms, FCP < 1.8s. Performance budgets enforce these in CI/CD.
- **Measurement tools**: Lighthouse (lab), PageSpeed Insights (lab + field), CrUX (field), Web Vitals library (RUM), performance profiler (Chrome DevTools).
- **ROI**: Amazon: 1% revenue per 100ms improvement. Walmart: 2% conversion per 1s improvement. BBC: 12% mobile traffic increase after optimizing CWV.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **Code Splitting** | Breaking the JavaScript bundle into smaller chunks loaded on demand |
| **Tree Shaking** | Dead-code elimination — removing unused exports during the build |
| **Critical CSS** | Above-fold styles inlined in \`<head>\` to render the visible content immediately |
| **Resource Hints** | \`<link rel="preload/preconnect/prefetch/prerender">\` — tell the browser about upcoming resources |
| **Lazy Loading** | Deferring load of non-critical resources until needed (IntersectionObserver, \`loading=lazy\`) |
| **Virtual Scrolling** | Only render visible rows in a long list (react-window, TanStack Virtual) |
| **INP (Interaction to Next Paint)** | Measures the slowest interaction's latency from user input to next paint |
| **LCP (Largest Contentful Paint)** | Render time of the largest visible element (image, text block) |
| **CLS (Cumulative Layout Shift)** | Sum of unexpected layout shifts during the page's lifetime |
| **Performance Budget** | Hard limits on bundle size, LCP, TTI, etc., enforced in CI/CD |
| **RUM (Real User Monitoring)** | Collecting performance data from actual users in production |
| **Brotli** | Compression algorithm (better than gzip) for static assets at the CDN level |

## 3. The Problem Without It

- **Bloated bundles**: Average React SPA ships 500KB-2MB of JavaScript. On a mid-range Android phone with 3G, parsing 500KB takes 2-3 seconds — the user sees a blank screen.
- **Render-blocking resources**: CSS and JS in \`<head>\` block the first paint. Every render-blocking resource adds ~300ms to FCP.
- **Layout thrashing**: Without explicit dimensions on images/embeds, content shifts as resources load. CLS > 0.25 causes user frustration and SEO penalties.
- **Unoptimized images**: A 4000x3000 JPEG from a camera is 8MB. Serving this to a mobile phone wastes bandwidth and destroys LCP.
- **Janky interactions**: Expensive event handlers (scroll, resize, input) without debouncing cause dropped frames and poor INP.
- **No performance visibility**: Without RUM and performance budgets, teams ship regressions unknowingly. Performance degrades incrementally with every feature addition.

## 4. How It Works — Core Mechanics

**Build-Time Optimization Pipeline:**
\`\`\`
Source Code
  → Tree shaking (remove unused exports, side-effect-free modules)
  → Code splitting (dynamic import() → separate chunks)
  → Minification (terser, esbuild: remove whitespace, rename locals)
  → Scope hoisting (concatenate modules into fewer closures)
  → Content hashing (bundle.a1b2c3.js for immutable caching)
  → Critical CSS extraction (critters, penthouse)
  → Image optimization (sharp: resize, format conversion, quality)
  → Font subsetting (glyphanger, harfbuzz)
  → Compression (Brotli level 11 for .js/.css/.html)
\`\`\`

**Runtime Performance Patterns:**

\`\`\`typescript
// Route-based code splitting with preload on hover
const ProductPage = lazy(() => import('./pages/ProductPage'));

function ProductLink({ slug }: { slug: string }) {
  const preload = useCallback(() => {
    const _ = import('./pages/ProductPage');
  }, []);

  return (
    <Link to={\`/product/\${slug}\`} onMouseEnter={preload} onTouchStart={preload}>
      View Product
    </Link>
  );
}

// IntersectionObserver-based lazy loading
function useLazyImage(src: string, threshold = 200) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src!;
          observer.disconnect();
        }
      },
      { rootMargin: \`\${threshold}px\` }
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { imgRef, loaded: loaded || undefined };
}

// Debounced search with AbortController
function useSearch(query: string, delay = 300) {
  const [results, setResults] = useState([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timeoutId = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(\`/api/search?q=\${query}\`, { signal: controller.signal });
        setResults(await res.json());
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return;
      }
    }, delay);
    return () => clearTimeout(timeoutId);
  }, [query, delay]);

  return results;
}
\`\`\`

## 5. Variants & Flavors

| Strategy | Technique | Impact on LCP | Impact on INP | Complexity |
|----------|-----------|---------------|---------------|------------|
| **Route-based splitting** | \`lazy(() => import('./pages/*'))\` | Neutral | Improves (less JS to parse) | Low |
| **Component-level splitting** | \`lazy(() => import('./HeavyChart'))\` | Neutral | Improves | Medium |
| **Critical CSS inlining** | Extract above-fold CSS into \`<style>\` | Improves (200-500ms) | Neutral | Medium |
| **Resource hints** | preload/preconnect/prefetch | Improves (100-300ms) | Neutral | Low |
| **Image optimization** | WebP/AVIF + srcset + lazy loading | Improves (500-2000ms) | Neutral | Medium |
| **Virtual scrolling** | react-window, TanStack Virtual | Neutral | Improves (scroll perf) | Medium |
| **Service worker caching** | Cache-first for static, SWR for API | Improves (instant repeat) | Improves | High |
| **Streaming SSR** | renderToPipeableStream | Improves (200-400ms) | Neutral | High |
| **Islands architecture** | Partial hydration (Astro, Marko) | Neutral | Improves (less JS) | High |
| **Predictive prefetching** | Quick, Speculation Rules API | Improves (instant nav) | Neutral | Medium |

## 6. Performance Characteristics

| Metric | Before Optimization | After Optimization | Improvement |
|--------|-------------------|-------------------|-------------|
| Bundle size (JS) | 800KB gzipped | 180KB gzipped | 77% reduction |
| LCP (mobile 4G) | 4.2s | 1.8s | 57% faster |
| INP (mobile) | 320ms | 85ms | 73% faster |
| CLS | 0.35 | 0.05 | 86% reduction |
| TTFB (global P95) | 1200ms | 300ms (CDN) | 75% faster |
| FCP (mobile 3G) | 3.5s | 1.2s | 66% faster |
| Time to Interactive | 6.8s | 2.1s | 69% faster |
| Lighthouse score | 45/100 | 95/100 | +50 points |
| Cache hit ratio | 60% (no SW) | 95% (SW + CDN) | +35pp |
| Conversion rate | Baseline | +8-15% | Revenue impact |

## 7. Failure Modes

- **Over-splitting**: Creating too many chunks (100+ tiny files) increases HTTP connection overhead and negates the benefit. *Mitigation*: Keep chunks 20-50KB min. Use webpack's \`maxSize\` option.
- **Preload waterfall**: Preloading too many resources causes bandwidth contention — the browser downloads preloaded resources instead of the critical ones. *Mitigation*: Only preload the single most critical resource (hero image, primary font).
- **Critical CSS bloat**: Inlining 100KB+ of critical CSS defeats the purpose — the HTML itself becomes slow to download. *Mitigation*: Keep inlined CSS < 15KB. Extract only truly above-fold styles.
- **Lazy loading above-fold**: Accidentally lazy-loading hero images (LCP elements) pushes LCP to 5s+. *Mitigation*: Always use \`fetchpriority="high"\` and \`loading="eager"\` for above-fold images.
- **Font flash (FOUT/FOIT)**: \`font-display: swap\` causes layout shift when the fallback font is replaced by the custom font. *Mitigation*: Use \`size-adjust\` for fallback font matching. Preload the font URL.
- **Third-party script performance**: Analytics, ads, and chat widgets add 100-500ms to INP and increase bundle size. *Mitigation*: Load third-party scripts with \`async\`/\`defer\`. Delay non-critical scripts until after \`onload\` (5s delay).

## 8. Decision Framework

\`\`\`
├─ What is the main bottleneck?
│   ├─ LCP too high → Optimize hero image (WebP/AVIF + preload + fetchpriority=high)
│   │                  + Critical CSS inlining + improve TTFB (CDN)
│   ├─ INP too high → Reduce JS execution (code splitting, tree shaking)
│   │                  + Debounce event handlers + passive listeners
│   │                  + Virtual scrolling for long lists
│   ├─ CLS too high → Set explicit width/height on all images/embeds
│   │                  + Reserve ad slots with dimensions
│   │                  + Use font-display: optional or size-adjust
│   └─ TTFB too high → CDN + edge computing + server caching + Brotli
├─ Bundle size?
│   ├─ >500KB gzipped → Route splitting + component splitting + tree shaking
│   ├─ 200-500KB → Route splitting + lazy load heavy deps (charts, editors)
│   └─ <200KB → Fine-tune (preload hints, font subsetting)
├─ Repeat visit optimization?
│   ├─ Yes → Service worker (cache-first for assets, SWR for API)
│   └─ No → Focus on first-visit metrics (SSR, preload, critical CSS)
└─ Mobile-first?
    ├─ Yes → Responsive images (srcset/sizes), touch event optimization, reduce JS
    └─ No → Desktop-focused, but still optimize CWV for SEO
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'source', label: 'Source Code\n(TS/JS/CSS)', type: 'app', x: 80, y: 60 },
    { id: 'build', label: 'Build Pipeline\n(Vite/Turbopack)', type: 'app', x: 250, y: 60 },
    { id: 'split', label: 'Code Splitting\nRoute + Component', type: 'gateway', x: 250, y: 200 },
    { id: 'crit', label: 'Critical CSS\nExtraction', type: 'gateway', x: 80, y: 200 },
    { id: 'img', label: 'Image Pipeline\n(sharp, Cloudinary)', type: 'app', x: 420, y: 60 },
    { id: 'cdn', label: 'CDN\n(immutable hashes)', type: 'cache', x: 250, y: 340 },
    { id: 'sw', label: 'Service Worker\n(Cache Strategies)', type: 'web', x: 80, y: 340 },
    { id: 'browser', label: 'Browser\n(render + paint)', type: 'client', x: 250, y: 460 },
    { id: 'rum', label: 'RUM Pipeline\n(CrUX + Web Vitals)', type: 'metrics', x: 420, y: 340 },
  ]}
  edges={[
    { from: 'source', to: 'build', label: 'raw files' },
    { from: 'build', to: 'split', label: 'bundled' },
    { from: 'build', to: 'crit', label: 'extract CSS' },
    { from: 'source', to: 'img', label: 'images' },
    { from: 'split', to: 'cdn', label: 'chunks' },
    { from: 'crit', to: 'cdn', label: 'inlined HTML' },
    { from: 'img', to: 'cdn', label: 'optimized' },
    { from: 'cdn', to: 'sw', label: 'cached' },
    { from: 'cdn', to: 'browser', label: 'serve' },
    { from: 'sw', to: 'browser', label: 'offline/stale' },
    { from: 'browser', to: 'rum', label: 'performance entries' },
  ]}
  height={540}
/>

## 10. Real Production Incident

<Callout type="incident">
**Pinterest Bundle Bloat — 2019**

Pinterest's web application bundle had grown to 1.5MB gzipped over 3 years of feature additions. The team had no performance budget. LCP on mobile was 7.2s. INP was 800ms. User engagement was declining, and Google's CWV ranking update was approaching.

**Impact**: 40% of mobile users abandoned the page before it became interactive. Sign-up conversion rate dropped 15% year-over-year. SEO rankings declined as Core Web Vitals became a ranking signal.

**Root cause**: No performance monitoring in CI/CD. Every team independently added dependencies (lodash, moment.js, chart libraries, animation frameworks) without bundle impact review. The main bundle included all routes (no code splitting). Images were served as 2MB+ JPEGs.

**Fix**: Implemented strict performance budget (bundle < 200KB, LCP < 2.5s). Migrated to route-based code splitting using React.lazy. Replaced moment.js with date-fns (90% size reduction). Switched to WebP with srcset. Added Lighthouse CI to block deploys that regress performance. Implemented virtual scrolling for Pin feed (react-virtualized → custom implementation, 60fps scrolling).

**Lesson**: Performance is a feature that must be designed and enforced, not an afterthought. Without a performance budget and CI enforcement, bundle size grows monotonically with every feature. Code splitting and image optimization are the highest-ROI performance investments.
</Callout>

## 11. Production Implementation

### Performance Budget (CI/CD)
\`\`\`typescript
interface PerformanceBudget {
  bundles: { name: string; maxSizeBytes: number }[];
  metrics: { lcp: number; inp: number; cls: number; ttfb: number };
}

const BUDGET: PerformanceBudget = {
  bundles: [
    { name: 'main-*.js', maxSizeBytes: 40 * 1024 },
    { name: 'vendor-*.js', maxSizeBytes: 50 * 1024 },
    { name: 'page-*.js', maxSizeBytes: 30 * 1024 },
  ],
  metrics: { lcp: 2500, inp: 200, cls: 0.1, ttfb: 800 },
};

// Lighthouse CI configuration (lighthouserc.js)
module.exports = {
  ci: {
    collect: { url: ['http://localhost:3000'], numberOfRuns: 3 },
    assert: {
      assertions: {
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-byte-weight': ['error', { maxNumericValue: 500 * 1024 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
\`\`\`

### Real User Monitoring (RUM)
\`\`\`typescript
import { onCLS, onFCP, onLCP, onINP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: { name: string; value: number; rating: string }) {
  const body = JSON.stringify({
    metric: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    url: window.location.pathname,
    userAgent: navigator.userAgent,
    connection: (navigator as any).connection?.effectiveType || 'unknown',
  });
  navigator.sendBeacon('/api/vitals', body);
}

onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onTTFB(sendToAnalytics);
\`\`\`

### Webpack/Vite Optimization
\`\`\`typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    target: 'es2020',
    cssCodeSplit: true,
    minify: 'esbuild',
  },
});
\`\`\`

## 12. Real Company Deep Dives

- **Amazon**: Every 100ms of load time improvement correlates with 1% revenue increase ($1.6B/year). Aggressively optimize images (WebP, AVIF), use predictive prefetching (Quick), and inline critical CSS. Their homepage loads in under 1s on 4G.
- **Pinterest**: Reduced bundle size from 1.5MB to 200KB via code splitting. Implemented virtual scrolling for infinite Pin feed. 40% reduction in wait time. 15% increase in sign-ups. Service worker for instant back-navigation.
- **BBC**: Optimized Core Web Vitals across their global news site. LCP dropped from 3.2s to 1.4s. Mobile traffic increased 12%. Key techniques: critical CSS inlining, removing render-blocking JS, WebP with \`<picture>\` elements.
- **TikTok**: Advanced streaming for video content. Prefetches the "next" video in the feed while watching the current one. WebTransport for ultra-low-latency video delivery. Bundle optimized to < 100KB for initial load.
- **Gov.uk**: Strict performance budget — pages must load in < 1s on 3G. Each page is < 50KB total. Progressive enhancement: the site works without JavaScript. Set the gold standard for government web performance.

## 13. Interview Playbook

**Q: "Your React app has a 2MB bundle. Walk through reducing it to 200KB."**
→ Open with: First, analyze with bundle analyzer (source-map-explorer, vite-bundle-analyzer) to identify the heaviest dependencies. Then: (1) Route-based code splitting with React.lazy, (2) Move vendor libs (React, ReactDOM) to a separate vendor chunk, (3) Replace heavy deps (moment.js → date-fns, lodash → lodash-es with tree shaking), (4) Lazy-load component-level heavy modules (chart library, code editor, rich text editor), (5) Tree-shake unused CSS and JS.
→ Cover: Set up CI performance budget to prevent regressions. Use content hashing for long-term caching. Enable Brotli compression. Measure with Lighthouse CI.
→ Depth signal: For routes shared across pages, use webpack's \`maxAsyncRequests\` and \`maxInitialRequests\` to prevent over-splitting. Use module federation for cross-app dependency sharing in micro-frontends.

**Q: "How does virtual scrolling work? When would you use it?"**
→ Open with: Virtual scrolling only renders the visible items in a scrollable list (typically 10-20 DOM nodes instead of 10,000). It calculates which items should be visible based on the scroll position and renders them with absolute positioning.
→ Cover: Libraries: react-window (FixedSizeList, VariableSizeList), TanStack Virtual (framework-agnostic). Dynamic row heights require measuring after render or estimating based on content.
→ Depth signal: For infinite scroll with virtual scrolling, use IntersectionObserver on a sentinel element at the bottom of the list. Implement scroll position restoration for back-navigation. Avoid layout thrashing by batching DOM reads/writes.

## 14. Concept Check Quiz

**Q1:** What is the difference between preload and prefetch?**Answer:** preload fetches a resource urgently for the current page (high priority). prefetch fetches a resource for a future navigation (low priority, idle time). preload is for resources needed now; prefetch is speculative.

**Q2:** How does code splitting improve performance?**Answer:** Reduces the initial JavaScript bundle size. Only the code needed for the current route/page is loaded. Other chunks load on demand (when the user navigates to that route), reducing parse/execute time for the initial load.

**Q3:** What causes layout shift (CLS) and how do you prevent it?**Answer:** Images, ads, embeds, and fonts loading after content without reserved space. Prevention: always set explicit width/height on images, reserve ad slots with min-height, use font-display: optional or size-adjust for fallback font matching.

**Q4:** What is the difference between \`loading="lazy"\` and \`loading="eager"\`?**Answer:** \`lazy\` defers loading until the image approaches the viewport (IntersectionObserver). \`eager\` loads immediately regardless of position. Always use \`eager\` + \`fetchpriority="high"\` for LCP images.

**Q5:** How do you set up a performance budget in CI/CD?**Answer:** Use Lighthouse CI with assertions (maxNumericValue for LCP/INP/CLS, maxNumericValue for total byte weight). Block deploys that exceed budgets. Use GitHub Actions or CircleCI to run Lighthouse on every PR.

## 15. Next Steps

- **Image & Asset Optimization** — The #1 lever for LCP improvement. Deep dive into formats, CDN transforms, and responsive images.
- **Core Web Vitals & Performance Metrics** — How to measure, monitor, and debug performance in production.
- **Caching Strategies for Frontend** — Service worker caching patterns to make repeat visits instant.
- **Rendering Patterns** — How CSR, SSR, SSG, and ISR affect performance and which to choose for different scenarios.`,
    estimatedMin: 14,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Google", "Meta", "Amazon", "Shopify"],
    tags: ["web-performance", "performance-optimization", "bundle-size", "code-splitting", "lazy-loading"],
  },

  {
    id: "lesson-09-08",
    slug: "frontend-system-design-08-image-asset-optimization",
    title: "Image & Asset Optimization",
    content: `## 0. Mental Model

> Image optimization is like a **professional photography studio**. The photographer never hands over the raw 50MB file from the camera. Instead, they export a specific size and format for each use: a small thumbnail for the contact sheet (480px WebP), a medium print for the website (1200px WebP), and a high-res version for the billboard (2000px AVIF). Each image is sharpened, color-corrected, and compressed to look perfect at its intended display size — no wasted pixels, no wasted bandwidth.

## 1. Quick Summary

- **Images account for 50-70%** of a typical webpage's bytes. Optimization is the highest-ROI performance investment for most sites.
- **Modern formats**: AVIF (best compression, ~50% smaller than JPEG), WebP (widely supported, ~30% smaller than JPEG), with JPEG/PNG as fallbacks via \`<picture>\`.
- **Responsive images**: \`srcset\` + \`sizes\` attributes let the browser choose the right image size for the viewport. Never serve a 2000px image to a 375px mobile screen.
- **CDN transforms**: Cloudinary, Imgix, and Akamai Image & Video Manager resize, convert, and optimize images on-the-fly at the edge.
- **Lazy loading**: \`loading="lazy"\` for below-fold images. \`fetchpriority="high"\` + \`loading="eager"\` for hero/LCP images. IntersectionObserver for custom lazy loading.
- **Font optimization**: Subsetting (Latin-only for English sites), \`font-display: swap\`, WOFF2 format, and preloading critical fonts.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **AVIF** | AV1 Image Format — royalty-free format with excellent compression (50% smaller than JPEG) |
| **WebP** | Google's image format — lossy and lossless compression, widely supported (97% browser share) |
| **srcset** | HTML attribute listing multiple image URLs with their pixel widths (480w, 800w, etc.) |
| **sizes** | HTML attribute telling the browser how much space the image will take at different viewport widths |
| **\`<picture>\`** | HTML element for art direction — different image sources per media query or format |
| **LQIP** | Low-Quality Image Placeholder — tiny blurry image shown while the full image loads |
| **CDN Transform** | Real-time image manipulation at the CDN edge (resize, crop, format conversion, quality) |
| **Font Subsetting** | Removing unused glyphs from a font file to reduce its size |
| **font-display** | CSS property controlling how a custom font is displayed while loading (block, swap, fallback, optional) |
| **Squoosh** | Google's image compression tool — client-side WebAssembly for format conversion |
| **Sharp** | Node.js library for high-performance image processing (resize, format, quality) |
| **Sprite Sheet** | Combining multiple small icons/images into one file to reduce HTTP requests |

## 3. The Problem Without It

- **Bandwidth waste**: A typical e-commerce page with 50 unoptimized product images uses 10-20MB. On a mobile data plan, that's $0.50-$1.00 per page load for the user. Pages take 30+ seconds to load on 3G.
- **Terrible LCP**: The hero image is often the LCP element. Without optimization, a 5MB hero JPEG takes 8+ seconds to load on 4G. LCP > 4s loses 53% of mobile users.
- **Layout shift (CLS)**: Images without explicit width/height push content down when they load. Each un-sized image causes a layout shift. Multiple images cascading cause CLS > 0.5.
- **Format waste**: Serving JPEGs to modern browsers that support WebP/AVIF wastes 30-50% bandwidth. Every byte wasted is milliseconds added to load time.
- **Scalability issues**: Serving the same 4000px image to mobile, tablet, and desktop wastes CPU (browser downsizes) and memory (decodes the full image in RAM).
- **Font flash**: Unoptimized fonts (full character set, no subsetting, no font-display) cause invisible text (FOIT) or layout shifts (FOUT) during page load.

## 4. How It Works — Core Mechanics

**Image Delivery Pipeline:**
\`\`\`
Upload (8MB JPEG)
  → Serverless function (sharp)
    → Generate 5 variants: 2000w, 1200w, 800w, 480w, 20px (blur placeholder)
    → Convert to WebP (80% quality) + AVIF (70% quality)
    → Content-hash filename: hero-a1b2c3-1200w.webp
    → Store in S3/R2 with Cache-Control: public, max-age=31536000, immutable
  → Page render generates <picture> with format fallbacks + srcset
  → CDN serves from edge (cache hit: 97%+)
\`\`\`

**Responsive Image Markup:**
\`\`\`html
<img
  src="hero-800.webp"
  srcset="
    hero-480.webp   480w,
    hero-800.webp   800w,
    hero-1200.webp 1200w,
    hero-2000.webp 2000w
  "
  sizes="
    (max-width: 480px) 100vw,
    (max-width: 1024px) 80vw,
    1200px
  "
  width="1200"
  height="800"
  loading="eager"
  fetchpriority="high"
  decoding="async"
  alt="Product hero"
/>
\`\`\`

**CDN-Based Image Transformation:**
\`\`\`typescript
interface ImageOptions {
  width: number;
  height?: number;
  quality?: number;
  format: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  blur?: number;
  sharpen?: number;
}

function buildCloudinaryUrl(publicId: string, opts: ImageOptions): string {
  const transformations = [
    \`w_\${opts.width}\`,
    opts.height ? \`h_\${opts.height}\` : '',
    \`q_\${opts.quality || 80}\`,
    \`f_\${opts.format}\`,
    \`c_\${opts.fit || 'cover'}\`,
    opts.blur ? \`e_blur:\${opts.blur}\` : '',
    opts.sharpen ? \`e_sharpen:\${opts.sharpen}\` : '',
  ].filter(Boolean).join(',');

  return \`https://res.cloudinary.com/mycloud/image/upload/\${transformations}/\${publicId}\`;
}
\`\`\`

**Font Optimization:**
\`\`\`css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 900;
  unicode-range: U+0000-00FF; /* Latin only */
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-cyrillic.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 900;
  unicode-range: U+0400-04FF; /* Cyrillic only */
}
\`\`\`

## 5. Variants & Flavors

| Approach | Description | Use Case | Pros | Cons |
|----------|-------------|----------|------|------|
| **Server-side pre-generation** | Generate all variants at upload time via sharp | Predictable content (product photos) | Fast delivery, no runtime cost | Storage cost (~50MB per original) |
| **CDN on-the-fly** | Transform at request time (Cloudinary, Imgix) | User-generated content, unpredictable | No pre-generation, URL-based API | CDN dependency, cold-start latency |
| **Client-side (Squoosh)** | Convert in the browser via WebAssembly | Demo tools, offline-first apps | No server needed | CPU intensive, slow on mobile |
| **Service Worker** | Rewrite image URLs in SW to request optimized versions | PWA, offline support | Works offline, dynamic | Complex to debug |
| **AVIF only** | Serve AVIF with JPEG fallback via \`<picture>\` | Cutting-edge, high-traffic sites | Best compression | AVIF decode slower than WebP |
| **Base64 placeholders** | Inline tiny placeholder in HTML (data URI) | Blogs, article images | No extra request, instant placeholder | 1-3KB per image in HTML |

## 6. Performance Characteristics

| Format | File Size (vs JPEG) | Browser Support | Encode Speed | Decode Speed | Best For |
|--------|---------------------|-----------------|-------------|-------------|----------|
| JPEG | Baseline (100%) | 100% | Fast | Fastest | Universal fallback |
| WebP lossy | 65-75% of JPEG | 97% | Medium | Fast | Primary modern format |
| WebP lossless | 80-90% of PNG | 97% | Slow | Fast | Transparency |
| AVIF | 45-55% of JPEG | 85% | Slowest | Slow | Bandwidth-critical |
| JPEG XL | 40-50% of JPEG | 15% (emerging) | Medium | Medium | Future format |
| SVG | Vector (tiny for icons) | 98% | N/A | Fast | Icons, logos, illustrations |

| Image Pipeline | Latency (p50) | Latency (p99) | Cache Hit Ratio | Cost per 1000 images |
|----------------|---------------|---------------|-----------------|---------------------|
| Static (pre-generated) | 50ms (CDN) | 150ms | 99% | $0.001 (storage) |
| CDN on-the-fly (Cloudinary) | 200ms (cold) / 50ms (hot) | 800ms | 95% | $0.01 |
| CDN on-the-fly (Imgix) | 150ms (cold) / 40ms (hot) | 600ms | 96% | $0.008 |
| Server-side (sharp) | 300ms | 1000ms | N/A | $0.05 (compute) |

## 7. Failure Modes

- **AVIF decode slowdown on low-end devices**: AVIF decoding is 3-5x slower than JPEG/WebP on mid-range Android phones. *Mitigation*: Use \`Client Hints\` or device detection to serve WebP to low-end devices, AVIF to high-end. Always provide WebP fallback in \`<picture>\`.
- **CDN origin overload during cache miss**: Thousands of uncached image requests hit the origin simultaneously after a cache purge. *Mitigation*: Pre-warm CDN cache on deploy. Use staggered cache TTLs. Implement origin shield.
- **Missing width/height on images**: Images without explicit dimensions cause CLS when they load. *Mitigation*: Always set width/height on \`<img>\` tags. Use CSS aspect-ratio as fallback. Extract dimensions from image metadata at build time.
- **Font FOIT (Flash of Invisible Text)**: Custom fonts block text rendering for up to 3s while the font downloads. *Mitigation*: Use \`font-display: swap\` or \`font-display: optional\`. Preload critical fonts via \`<link rel="preload">\`.
- **Over-subsetting fonts**: Removing glyphs that are actually used (e.g., subsetting only Latin for a site with French accents). *Mitigation*: Use Unicode-range subsetting with a tool like glyphhanger that analyzes actual page content.
- **Sprite sheet cache invalidation**: Changing one icon invalidates the entire sprite cache. *Mitigation*: Use individual SVGs with HTTP/2 multiplexing instead of sprites. Or use content-hashed sprite filenames.

## 8. Decision Framework

\`\`\`
├─ Image source?
│   ├─ Curated (product photos, hero images) → Pre-generate at upload time (sharp)
│   │                                            + CDN serve (immutable cache)
│   └─ User-generated (profile pics, social uploads) → CDN on-the-fly (Cloudinary/Imgix)
│                                                       + Transform at request time
├─ Format strategy?
│   ├─ Broad support → WebP with JPEG fallback in <picture>
│   ├─ Best compression → AVIF with WebP fallback with JPEG fallback (triple <picture>)
│   └─ Icons/vectors → Inline SVG or SVG sprite
├─ Viewport range?
│   ├─ Single size → Single src with width/height
│   ├─ Responsive (mobile + tablet + desktop) → srcset + sizes with 3-4 breakpoints
│   └─ Art-directed (crop differs by breakpoint) → <picture> with separate media queries
├─ Budget?
│   ├─ High traffic ($) → Pre-generate, self-host S3+CDN (cheapest per-image cost)
│   ├─ Medium traffic ($$) → Cloudinary/Imgix (pay per transformation)
│   └─ Low traffic ($$$) → Use any CDN, pre-generate is optional
└─ Font strategy?
    ├─ Performance-critical → font-display: optional (no FOIT, but may not load)
    ├─ Brand-critical → font-display: swap + preload + size-adjust for fallback
    └─ Icons → Use SVG icons, not icon fonts (no CLS, better accessibility)
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'upload', label: 'User/Admin\nUpload Original', type: 'client', x: 80, y: 60 },
    { id: 'process', label: 'Serverless\n(sharp pipeline)', type: 'app', x: 250, y: 60 },
    { id: 'storage', label: 'Object Store\n(S3 / R2)', type: 'storage', x: 250, y: 200 },
    { id: 'cdn', label: 'CDN / Image\nOptimizer', type: 'cache', x: 250, y: 340 },
    { id: 'web', label: 'Web Server\n(generates HTML)', type: 'web', x: 80, y: 200 },
    { id: 'browser', label: 'Browser\n(picks best variant)', type: 'client', x: 250, y: 480 },
    { id: 'rum', label: 'RUM\n(LCP tracking)', type: 'metrics', x: 420, y: 340 },
    { id: 'font', label: 'Font Service\n(GFonts, self-host)', type: 'web', x: 420, y: 60 },
  ]}
  edges={[
    { from: 'upload', to: 'process', label: 'raw image' },
    { from: 'process', to: 'storage', label: '5 variants\n(WebP + AVIF)' },
    { from: 'web', to: 'storage', label: 'read metadata' },
    { from: 'storage', to: 'cdn', label: 'serve from edge' },
    { from: 'web', to: 'browser', label: 'HTML with\nsrcset + picture' },
    { from: 'cdn', to: 'browser', label: 'optimized image' },
    { from: 'font', to: 'cdn', label: 'subsetted WOFF2' },
    { from: 'browser', to: 'rum', label: 'LCP/FCP metrics' },
  ]}
  height={560}
/>

## 10. Real Production Incident

<Callout type="incident">
**Etsy Image Pipeline Failure — 2022**

Etsy's image CDN (Fastly) experienced a cascading failure during the 2022 holiday shopping season. The image transformation service, which converts uploaded merchant photos to multiple formats and sizes on-the-fly, became overwhelmed by a 10x traffic spike from Black Friday sales.

**Impact**: Product images failed to load across the entire Etsy marketplace. 90M+ active buyers saw broken image placeholders. LCP spiked to 12s+ on mobile. Conversion rate dropped 35% during the 3-hour outage. Estimated revenue loss: $15M+.

**Root cause**: The image transformation service had a shared rate limit across all edge nodes. A coordinated cache-busting event (deploy of new image URL format) caused every edge node to simultaneously request transformations for uncached images. The transformation service had insufficient capacity for 100K+ concurrent transform requests. It began returning 503 errors, which were not cached, causing every subsequent request to also fail.

**Fix**: Implemented origin shielding — a dedicated cache layer between edge nodes and the transformation service. Increased transformation service capacity 5x. Added circuit breaker: if transformation error rate exceeds 10%, serve pre-generated fallback images from S3 directly. Implemented image URL versioning with gradual rollout (canary deploy).

**Lesson**: Image CDNs are critical infrastructure. Always have a fallback strategy (pre-generated images in object storage). Use origin shielding to protect transformation services. Rate-limit cache-busting events and roll out image URL changes gradually.
</Callout>

## 11. Production Implementation

### Image Upload Pipeline (Serverless)
\`\`\`typescript
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const SIZES = [
  { width: 2000, suffix: '2000w' },
  { width: 1200, suffix: '1200w' },
  { width: 800, suffix: '800w' },
  { width: 480, suffix: '480w' },
  { width: 20, suffix: 'blur', blur: true },
];

async function processImage(originalBuffer: Buffer, publicId: string) {
  const s3 = new S3Client({ region: 'us-east-1' });
  const metadata = await sharp(originalBuffer).metadata();
  const hash = crypto.createHash('md5').update(originalBuffer).digest('hex').slice(0, 8);

  const uploads = SIZES.map(async (size) => {
    let pipeline = sharp(originalBuffer)
      .resize(size.width, undefined, { fit: 'cover', withoutEnlargement: true });

    if (size.blur) {
      pipeline = pipeline.blur(20);
    }

    const webpBuffer = await pipeline.webp({ quality: 80 }).toBuffer();
    const key = \`\${publicId}-\${hash}-\${size.suffix}.webp\`;

    await s3.send(new PutObjectCommand({
      Bucket: 'images',
      Key: key,
      Body: webpBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    return { suffix: size.suffix, width: size.width, key };
  });

  return {
    variants: await Promise.all(uploads),
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    aspectRatio: metadata.width! / metadata.height!,
  };
}
\`\`\`

### Responsive Image Component
\`\`\`typescript
function OptimizedImage({
  src, alt, widths = [480, 800, 1200, 2000],
  priority = false, aspectRatio, className,
}: OptimizedImageProps) {
  const imageBase = 'https://images.example.com';
  const encodedSrc = encodeURIComponent(src);

  const srcSet = widths
    .map((w) => \`\${imageBase}/\${encodedSrc}?w=\${w}&q=80&fm=webp \${w}w\`)
    .join(', ');

  const defaultSrc = \`\${imageBase}/\${encodedSrc}?w=\${widths[1]}&q=80&fm=webp\`;
  const height = Math.round(widths[1] / (aspectRatio || 16 / 9));

  return (
    <img
      src={defaultSrc}
      srcSet={srcSet}
      sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 33vw"
      width={widths[1]}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      fetchpriority={priority ? 'high' : 'auto'}
      decoding="async"
      alt={alt}
      className={className}
    />
  );
}
\`\`\`

### Font Subsetting (Build Script)
\`\`\`bash
# Install glyphhanger
npm install -g glyphhanger

# Analyze page and subset fonts
glyphhanger https://example.com --subset=*Inter*
# → Generates inter-latin.woff2, inter-cyrillic.woff2 (90% size reduction)
\`\`\`

## 12. Real Company Deep Dives

- **Cloudinary**: Leading image and video CDN. Handles billions of image transformations per month. URL-based API for resizing, format conversion, AI-powered cropping, and content-aware compression. Used by 10K+ enterprises including Netflix, Shopify, and Etsy.
- **Imgix**: Real-time image processing CDN. Focus on developer experience — simple URL parameters for complex transformations. Automatic format selection based on browser Accept header. Used by Airbnb, Kickstarter, and GitHub.
- **Etsy**: Saved 30% bandwidth by switching to WebP with AVIF support via \`<picture>\`. Their CDN (Fastly) converts images on the fly based on the browser's Accept header. Pre-generates the most popular variants, uses on-the-fly for long-tail images.
- **Medium**: Pioneered the blur-up placeholder technique (LQIP). A 20px-wide JPEG (~200 bytes, base64 inlined in HTML) blurs in as the background, then transitions to the full-resolution image. This eliminates the blank-white-box problem while keeping the initial payload tiny.
- **The New York Times**: Uses responsive images with manual cropping for art-directed photos. Their custom image CDN serves 100M+ image requests per day. Pre-generates 10+ variants per photo (including 1x, 2x, 3x for Retina displays). Fonts aggressively subsetted per article section.

## 13. Interview Playbook

**Q: "How would you optimize the images on an e-commerce site with 1M+ products?"**
→ Open with: CDN-based approach with pre-generation for the most popular variants. Use sharp in a serverless function triggered on upload to generate 5 width variants (480w, 800w, 1200w, 2000w, 20px blur) in WebP and AVIF. Store in S3 with content-hashed filenames and immutable cache headers. Serve via CDN (CloudFront, Fastly).
→ Cover: Use \`<picture>\` with AVIF → WebP → JPEG fallback. Use \`srcset\` + \`sizes\` for responsive selection. Lazy load below-fold images with \`loading=lazy\`. For the hero image (LCP), use \`fetchpriority="high"\` and \`loading="eager"\` and preload via \`<link rel="preload">\`.
→ Depth signal: For long-tail products with few views, use CDN on-the-fly transformation instead of pre-generation to save storage costs. Implement a popularity-based caching layer: popular images get pre-generated variants, unpopular images get transformed on request. Monitor LCP in RUM and optimize the hero image transformation pipeline.

**Q: "Explain the difference between srcset and picture. When would you use each?"**
→ Open with: \`srcset\` is for resolution/width switching — the same image at different sizes. The browser picks the best size based on viewport width and device pixel ratio. \`<picture>\` is for art direction — different images (different crops, different aspect ratios) at different viewport sizes, or different formats (AVIF, WebP, JPEG).
→ Cover: Use \`srcset\` + \`sizes\` for responsive images on 95% of use cases. Use \`<picture>\` when you need format fallbacks (\`<source type="image/avif">\`) or art direction (mobile shows a close-up crop, desktop shows the full scene).
→ Depth signal: Combine both — \`<picture>\` wrapping an \`<img>\` with \`srcset\`. This gives you format negotiation via \`<picture>\` and responsive sizing via \`srcset\` on the \`<img>\`. Always include explicit \`width\` and \`height\` on the \`<img>\` tag to prevent CLS.

## 14. Concept Check Quiz

**Q1:** What is the difference between WebP and AVIF?**Answer:** WebP is Google's format with 97% browser support, ~30% smaller than JPEG. AVIF is based on the AV1 video codec, ~50% smaller than JPEG, but with ~85% browser support and slower decode. Use WebP as the primary format with AVIF as an enhancement for supporting browsers.

**Q2:** How does srcset work?**Answer:** srcset lists image URLs with their pixel widths (e.g., \`hero-480w.jpg 480w\`). The browser combines this with the \`sizes\` attribute (which tells how much CSS space the image occupies at each viewport width) and the device's pixel ratio to select the best image. No JavaScript needed.

**Q3:** Why set explicit width and height on images?**Answer:** Prevents Cumulative Layout Shift (CLS). Without dimensions, the browser allocates 0x0 space for the image. When the image loads, it pushes content down, causing a layout shift. With width/height, the browser reserves the correct space before the image loads.

**Q4:** How does font-display: swap differ from font-display: optional?**Answer:** \`swap\` shows fallback text immediately and swaps to the custom font when it loads (causes FOUT). \`optional\` also shows fallback text immediately but gives the font a very short (100ms) block period; if the font doesn't load in time, the browser may decide not to use it at all, avoiding any layout shift but potentially never showing the brand font.

**Q5:** What is the ideal image quality setting for WebP?**Answer:** 80-85% quality is visually indistinguishable from 100% JPEG for most photographs while being 30-50% smaller. For product photos on e-commerce sites, test at 75-80%. For hero/heroine images, 85-90% may be justified. Always use the \`-q 80\` as a starting point and adjust based on visual inspection.

## 15. Next Steps

- **Web Performance Optimization** — The broader context for image and asset optimization. Bundle analysis, code splitting, critical CSS.
- **Core Web Vitals & Performance Metrics** — How image optimization directly improves LCP, CLS, and FCP scores.
- **Caching Strategies for Frontend** — Service worker caching for images (cache-first for static images, stale-while-revalidate for user-generated content).
- **Rendering Patterns** — How SSR and SSG handle image optimization pipelines (lazy loading, preloading, responsive images in server-rendered HTML).`,
    estimatedMin: 10,
    difficulty: "INTERMEDIATE" as const,
    companies: ["Cloudinary", "Imgix", "Google", "Meta"],
    tags: ["image-optimization", "asset-optimization", "cloudinary", "webp", "lazy-loading"],
  },

  {
    id: "lesson-09-09",
    slug: "frontend-system-design-09-real-time-frontend",
    title: "Real-Time Frontend Architecture",
    content: `## 0. Mental Model

> Real-time frontend architecture is like a **group of people editing a shared whiteboard**. When one person draws a line, everyone else sees it instantly. If two people draw at the same time, the whiteboard doesn't break — the lines merge in a way that makes sense (CRDTs). If someone's internet cuts out, they keep drawing locally, and when they reconnect, their changes sync up. The whiteboard is the single source of truth, and everyone has a local copy that's kept in sync.

## 1. Quick Summary

- **Real-time frontend** enables live updates without user refresh via WebSockets (bidirectional), Server-Sent Events (server-to-client streaming), and fallback to HTTP long polling.
- **Key patterns**: Optimistic updates (apply changes locally before server confirms), state reconciliation on reconnect, conflict resolution (CRDTs or Operational Transformation), and connection management with exponential backoff.
- **WebSockets**: Full-duplex persistent TCP connection. Best for chat, collaboration, live cursors, and multiplayer. Libraries: Socket.IO, ws, Phoenix Channels, SockJS (fallback).
- **SSE**: Server-to-client streaming over HTTP. Simpler than WebSockets (standard HTTP), auto-reconnects natively. Best for notifications, price feeds, logs, and live dashboards.
- **Conflict resolution**: CRDTs (Conflict-free Replicated Data Types) allow each client to edit independently and merge deterministically without a central coordinator. OT (Operational Transformation) requires a server to transform operations against each other.
- **Scaling real-time**: 1M+ concurrent connections requires horizontal scaling with sticky sessions, Redis pub/sub for cross-node message broadcasting, and connection pooling.

## 2. Definition & Terminology

| Term | Definition |
|------|-----------|
| **WebSocket** | Full-duplex persistent connection over TCP (ws://, wss://) |
| **SSE (Server-Sent Events)** | Server-to-client streaming over HTTP (EventSource API) |
| **WebTransport** | HTTP/3 + QUIC-based bidirectional streaming (UDP-like, ultra-low latency) |
| **Long Polling** | Client sends HTTP request, server holds response until data available |
| **CRDT** | Conflict-free Replicated Data Type — merges concurrent edits deterministically |
| **OT (Operational Transformation)** | Server transforms concurrent operations against each other for consistency |
| **Optimistic Update** | Applying a change locally before receiving server confirmation, with rollback on failure |
| **Sticky Sessions** | Routing a client's requests to the same server node (required for WebSocket scaling) |
| **Reconnection Backoff** | Exponential delay between reconnection attempts (1s, 2s, 4s, 8s, ... max 30s) |
| **Heartbeat/Ping Pong** | Periodic messages to detect connection drops and keep the connection alive |
| **Message Queue** | Buffering outgoing messages when disconnected, sending on reconnect |
| **Synchronization** | Reconciliating local and server state after reconnection to ensure consistency |

## 3. The Problem Without It

- **Polling overhead**: Without real-time protocols, clients must poll the server every N seconds to check for updates. At N=5s, each client makes 720 requests/hour. For 1M clients, that's 720M requests/hour — 99.9% return no new data.
- **Delayed updates**: With 30s polling, users see updates up to 30s late. This is unacceptable for chat, collaboration, live sports scores, stock tickers, or real-time dashboards.
- **No offline support**: Traditional HTTP requires an active connection. When the network drops, all pending changes are lost. Users can't work offline and sync later.
- **Conflict disasters**: Without CRDTs or OT, two users editing the same document overwrite each other's changes. Last-write-wins causes data loss. Saving requires locking, which blocks collaboration.
- **Reconnection gaps**: Without message buffering and state reconciliation, reconnecting after a drop loses all changes made during the disconnection. Users see stale data until the next full page refresh.
- **Scalability ceiling**: Each HTTP polling request ties up server resources. At 100K+ concurrent users, polling overwhelms the server infrastructure.

## 4. How It Works — Core Mechanics

**WebSocket Connection Lifecycle:**
\`\`\`
Client                          Server
  |                               |
  |--- HTTP Upgrade Request ----->|
  |   GET /ws HTTP/1.1            |
  |   Upgrade: websocket          |
  |   Sec-WebSocket-Key: ...      |
  |                               |
  |<-- 101 Switching Protocols ---|
  |   Upgrade: websocket          |
  |   Sec-WebSocket-Accept: ...   |
  |                               |
  |=== WebSocket Connection (full-duplex) ===|
  |                               |
  |--- JSON message ------------->|
  |   { type: "chat", text: "hi" }|
  |                               |
  |<-- JSON message --------------|
  |   { type: "ack", id: "..." } |
  |                               |
  |--- Ping --------------------->|
  |<-- Pong ----------------------|
  |                               |
  |--- Close Frame -------------->|
  |<-- Close Frame ---------------|
\`\`\`

**Reconnecting WebSocket with Backoff:**
\`\`\`typescript
class ReliableWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private retries = 0;
  private maxRetries = 20;
  private baseDelay = 1000;
  private queue: string[] = [];
  private subscribers: Set<(msg: unknown) => void> = new Set();
  private lastSeqId = 0;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.retries = 0;
      this.send({ type: 'sync', lastSeqId: this.lastSeqId });
      while (this.queue.length) this.ws!.send(this.queue.shift()!);
    };
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.seqId) this.lastSeqId = msg.seqId;
      this.subscribers.forEach((fn) => fn(msg));
    };
    this.ws.onclose = (event) => {
      if (!event.wasClean && this.retries < this.maxRetries) {
        const delay = Math.min(this.baseDelay * Math.pow(2, this.retries), 30000);
        this.retries++;
        setTimeout(() => this.connect(), delay + Math.random() * 1000);
      }
    };
    this.ws.onerror = () => this.ws?.close();
  }

  send(data: unknown) {
    const msg = JSON.stringify(data);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.queue.push(msg);
    }
  }

  subscribe(fn: (msg: unknown) => void) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  close() { this.maxRetries = 0; this.ws?.close(); }
}
\`\`\`

**Conflict Resolution with CRDTs:**
\`\`\`typescript
// LWW-Register (Last-Writer-Wins) CRDT
class LWWRegister<T> {
  private state: { value: T; timestamp: number; peerId: string };

  constructor(peerId: string, initial: T) {
    this.state = { value: initial, timestamp: 0, peerId };
  }

  assign(value: T) {
    this.state = { value, timestamp: Date.now(), peerId: this.state.peerId };
  }

  merge(remote: { value: T; timestamp: number; peerId: string }) {
    if (remote.timestamp > this.state.timestamp ||
        (remote.timestamp === this.state.timestamp && remote.peerId > this.state.peerId)) {
      this.state = remote;
    }
  }

  get value(): T { return this.state.value; }
}

// Grow-Only Set (G-Set) CRDT — elements can be added but not removed
class GSet<T> {
  private elements: Set<T>;

  constructor() { this.elements = new Set(); }

  add(element: T) { this.elements.add(element); }

  merge(remote: T[]) { remote.forEach((e) => this.elements.add(e)); }

  has(element: T): boolean { return this.elements.has(element); }

  get values(): T[] { return Array.from(this.elements); }
}
\`\`\`

## 5. Variants & Flavors

| Protocol | Latency | Direction | Auto-Reconnect | Browser Support | Use Case |
|----------|---------|-----------|----------------|-----------------|----------|
| **WebSocket** | < 50ms | Bidirectional | No (implement yourself) | 97% | Chat, collaboration, gaming |
| **SSE (EventSource)** | < 200ms | Server→Client only | Yes (built-in) | 96% | Notifications, feeds, logs |
| **WebTransport** | < 10ms | Bidirectional (unreliable too) | Partial | 70% (Chrome) | Gaming, real-time audio/video |
| **Long Polling** | 1-5s | Bidirectional (simulated) | Yes (re-request) | 100% | Fallback for restrictive networks |
| **Socket.IO** | < 100ms | Bidirectional | Yes (built-in) | 97%+ (with fallback) | General real-time (auto fallback) |

| Architecture | Connections per Node | Message Latency | State Sync | Complexity |
|-------------|--------------------|-----------------|------------|------------|
| **Single Node (no HA)** | 50K-100K | < 10ms | In-memory | Low |
| **Redis Pub/Sub** | 100K-500K | < 50ms (cross-node) | Redis channel | Medium |
| **Kafka + WebSocket Gateway** | 500K-1M+ | < 100ms (cross-node) | Kafka topic | High |
| **Cloud Managed (Pusher, Ably)** | Unlimited (auto-scale) | < 50ms | Managed | None (SaaS) |

## 6. Performance Characteristics

| Metric | WebSocket | SSE | Long Polling | Socket.IO |
|--------|-----------|-----|-------------|-----------|
| Connection memory (per client) | 10-50KB | ~5KB | ~1KB (idle) | 20-60KB |
| Max connections (single node) | 50K-100K | 100K+ | 500K+ (but high req/s) | 30K-50K |
| Message latency (p50) | 5ms | 15ms | 2000ms (polling interval) | 10ms |
| Message latency (p99) | 50ms | 100ms | 5000ms | 80ms |
| Throughput (msg/s per node) | 100K+ | 200K+ | 1K-5K (polling limit) | 80K+ |
| Bandwidth overhead | ~200 bytes per connection | Minimal | Full HTTP headers each poll (500+ bytes) | ~300 bytes |
| Reconnection time | Depends on backoff (1-30s) | Built-in (1-3s) | Next poll (fixed interval) | Built-in (1-30s) |

## 7. Failure Modes

- **WebSocket connection limit**: Browsers limit concurrent WebSockets to ~6 per origin on HTTP/1.1. *Mitigation*: Use HTTP/2 (no per-origin connection limit). Multiplex multiple logical channels over a single WebSocket connection.
- **Sticky session failure**: If load balancer routes reconnected WebSocket to a different node, the new node lacks the client's state. *Mitigation*: Use Redis pub/sub to broadcast state across all nodes. Or use a stateless WebSocket gateway (Pusher, Ably).
- **Message queue overflow**: Client disconnects for 5+ minutes and accumulates a million messages in the queue. *Mitigation*: Cap queue size (1000 msgs). Use state-snapshot sync: instead of replaying each message, send the latest full state.
- **CRDT state explosion**: In a long-lived collaborative document with millions of edits, CRDT metadata (position identifiers) grows unbounded. *Mitigation*: Periodic garbage collection — merge adjacent position identifiers. Use tombstone deletion with compaction.
- **Heartbeat timeout false positive**: Mobile apps on flaky networks disconnect frequently even with good signal. *Mitigation*: Set heartbeat interval to 30s (not 10s). Use adaptive timeout based on observed network RTT. Implement gradual backoff before declaring disconnection.
- **SSE connection count limit**: HTTP/1.1 browsers limit SSE to 6 concurrent connections per origin. *Mitigation*: Use HTTP/2 (multiplexing, no limit). Close idle SSE connections. Multiplex multiple streams over one SSE connection.

## 8. Decision Framework

\`\`\`
├─ Update direction?
│   ├─ Bidirectional (client sends + receives) → WebSocket or Socket.IO
│   │   ├─ High-frequency (>100 msg/s) → Raw WebSocket (binary protocol)
│   │   └─ Low-frequency (<10 msg/s) → Socket.IO (auto-fallback, rooms)
│   └─ Server→Client only → SSE (simpler, auto-reconnect, HTTP-native)
├─ Scale (concurrent connections)?
│   ├─ <10K → Single Node WebSocket server
│   ├─ 10K-100K → Redis Pub/Sub + horizontal WebSocket nodes
│   ├─ 100K-1M → Kafka + WebSocket gateway + Redis caching
│   └─ >1M → Managed service (Pusher, Ably, AWS AppSync)
├─ Conflict resolution needed?
│   ├─ No (notifications, feeds, dashboards) → Last-writer-wins (simple)
│   ├─ Yes (collaboration, document editing) → CRDT (decentralized) or OT (server-coordinated)
│   └─ Yes (high-contention, shopping cart) → Pessimistic locking + CRDT hybrid
├─ Offline support?
│   ├─ No → Simple WebSocket/SSE (standard)
│   ├─ Yes (read offline) → Service Worker cache + last-synced state
│   └─ Yes (read + write offline) → CRDT + IndexedDB + background sync
└─ Network environment?
    ├─ Modern browsers, open networks → WebSocket (primary) + SSE (fallback)
    ├─ Enterprise proxies → Long polling fallback (Socket.IO handles this)
    └─ Mobile, flaky networks → WebSocket + aggressive reconnect + message queue + state sync
\`\`\`

## 9. Live Architecture Diagram

<Diagram
  nodes={[
    { id: 'client', label: 'Browser\n(WebSocket Client)', type: 'client', x: 80, y: 60 },
    { id: 'lb', label: 'Load Balancer\n(sticky sessions)', type: 'gateway', x: 250, y: 60 },
    { id: 'ws1', label: 'WebSocket Node 1\n(10K connections)', type: 'web', x: 80, y: 220 },
    { id: 'ws2', label: 'WebSocket Node 2\n(10K connections)', type: 'web', x: 250, y: 220 },
    { id: 'ws3', label: 'WebSocket Node 3\n(10K connections)', type: 'web', x: 420, y: 220 },
    { id: 'redis', label: 'Redis Pub/Sub\n(Cross-node broadcast)', type: 'cache', x: 250, y: 380 },
    { id: 'app', label: 'Application\nServices', type: 'app', x: 250, y: 500 },
    { id: 'fallback', label: 'SSE / Long Poll\nFallback', type: 'web', x: 420, y: 60 },
  ]}
  edges={[
    { from: 'client', to: 'lb', label: 'wss://' },
    { from: 'lb', to: 'ws1', label: 'sticky' },
    { from: 'lb', to: 'ws2', label: 'sticky' },
    { from: 'lb', to: 'ws3', label: 'sticky' },
    { from: 'ws1', to: 'redis', label: 'pub' },
    { from: 'ws2', to: 'redis', label: 'pub' },
    { from: 'ws3', to: 'redis', label: 'pub' },
    { from: 'redis', to: 'ws1', label: 'sub (broadcast)' },
    { from: 'redis', to: 'ws2', label: 'sub (broadcast)' },
    { from: 'redis', to: 'ws3', label: 'sub (broadcast)' },
    { from: 'redis', to: 'app', label: 'events' },
    { from: 'app', to: 'redis', label: 'outbound' },
    { from: 'client', to: 'fallback', label: 'SSE/HTTP (fallback)' },
  ]}
  height={580}
/>

## 10. Real Production Incident

<Callout type="incident">
**Slack WebSocket Outage — 2021**

Slack experienced a 3-hour real-time messaging outage affecting 10M+ daily active users. Messages sent by users were not appearing in channels, typing indicators were frozen, and connection status showed "Reconnecting..." indefinitely.

**Impact**: Teams could not communicate. Mission-critical operations in companies relying on Slack (including incident response teams) were paralyzed. Estimated productivity loss: $100M+ across all affected companies. Slack's stock dropped 3% during the outage.

**Root cause**: A deployment of a new WebSocket gateway version introduced a memory leak in the connection state management layer. Each WebSocket connection consumed ~50KB of memory that was not freed on disconnect. Over 6 hours, memory usage grew linearly until all gateway nodes hit the OOM killer threshold. Once nodes restarted, the Redis pub/sub channels lost subscriber state, and connections reconnecting landed on nodes that hadn't fully initialized. Cascading failure across all gateway nodes.

**Fix**: Rolled back the WebSocket gateway deployment. Added memory leak detection tests to CI. Implemented connection-level memory budgets (max 50MB per node). Added a health check endpoint that reports memory usage; load balancer stops routing to nodes above 80% memory. Implemented graceful degradation: when memory exceeds threshold, reject new connections with a 503 and direct clients to fallback (SSE/long polling).

**Lesson**: Real-time infrastructure is stateful and fragile. Memory leaks in connection management can cause cascading failures. Always implement per-node health checks with load balancer integration. Have a tested fallback protocol (SSE, long polling) for clients when WebSocket gateways are degraded.
</Callout>

## 11. Production Implementation

### WebSocket Server (Node.js + ws + Redis)
\`\`\`typescript
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from 'redis';
import http from 'http';

const server = http.createServer();
const wss = new WebSocketServer({ server, maxPayload: 100 * 1024 });

const pub = createClient({ url: 'redis://redis-cluster:6379' });
const sub = createClient({ url: 'redis://redis-cluster:6379' });

interface ClientState {
  ws: WebSocket;
  userId: string;
  channels: Set<string>;
  alive: boolean;
}

const clients = new Map<string, ClientState>();

wss.on('connection', (ws, req) => {
  const userId = extractUserId(req); // from token/session
  const state: ClientState = { ws, userId, channels: new Set(), alive: true };
  clients.set(userId, state);

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    handleMessage(state, msg);
  });

  ws.on('pong', () => { state.alive = true; });
  ws.on('close', () => {
    clients.delete(userId);
    state.channels.forEach((ch) => sub.unsubscribe(ch));
  });
});

// Heartbeat interval
setInterval(() => {
  clients.forEach((state) => {
    if (!state.alive) return state.ws.terminate();
    state.alive = false;
    state.ws.ping();
  });
}, 30000);

// Cross-node broadcast via Redis pub/sub
sub.subscribe('global', (message) => {
  const { channel, payload } = JSON.parse(message);
  clients.forEach((state) => {
    if (state.channels.has(channel) && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify(payload));
    }
  });
});

function handleMessage(state: ClientState, msg: { type: string; channel?: string; payload?: unknown }) {
  switch (msg.type) {
    case 'subscribe':
      state.channels.add(msg.channel!);
      sub.subscribe(msg.channel!, () => {});
      break;
    case 'message':
      pub.publish('global', JSON.stringify({
        channel: msg.channel,
        payload: { userId: state.userId, ...msg.payload },
      }));
      break;
    case 'typing':
      pub.publish('global', JSON.stringify({
        channel: msg.channel,
        payload: { type: 'typing', userId: state.userId },
      }));
      break;
  }
}
\`\`\`

### React Hook for Real-Time Channel
\`\`\`typescript
function useRealtimeChannel(channelId: string) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const wsRef = useRef<ReliableWebSocket | null>(null);

  useEffect(() => {
    const ws = new ReliableWebSocket(\`wss://api.example.com/ws?channel=\${channelId}\`);
    wsRef.current = ws;

    ws.subscribe((msg) => {
      switch ((msg as any).type) {
        case 'message':
          setMessages((prev) => [...prev, msg as Message]);
          break;
        case 'sync':
          setMessages((msg as any).payload.messages);
          break;
      }
    });

    return () => { ws.close(); wsRef.current = null; };
  }, [channelId]);

  const sendMessage = useCallback((text: string) => {
    wsRef.current?.send({ type: 'message', payload: { text, timestamp: Date.now() } });
    setMessages((prev) => [...prev, {
      id: \`optimistic-\${Date.now()}\`, text, status: 'sending', timestamp: Date.now(),
    }]);
  }, []);

  return { connected, messages, sendMessage };
}
\`\`\`

## 12. Real Company Deep Dives

- **Google Docs**: Uses Operational Transformation (OT) for real-time collaboration. Millions of concurrent users editing documents simultaneously. WebSocket-based with long-polling fallback. Google's OT transforms operations at the server to ensure consistency across all clients. Key innovation: the server maintains the canonical document state and transforms incoming operations against concurrent ones.
- **Figma**: Uses CRDTs for collaborative design. Every vector, layer, and property is a CRDT-based data structure. Changes synchronized via WebSocket with WebTransport for high-frequency cursor updates (60fps). Figma's CRDT implementation allows optimistic local edits with deterministic merge. 5M+ designers collaborate in real-time.
- **Slack**: WebSocket-based real-time messaging. Each workspace has a persistent connection. Messages, reactions, typing indicators, and presence pushed instantly. Fallback to SSE for restricted networks. Uses Redis pub/sub for cross-node message broadcasting. 10M+ DAU with 99.99% message delivery reliability.
- **Notion**: Custom CRDT-based real-time collaboration engine. Every block (text, image, database) is a CRDT. Local edits applied immediately, synced via WebSocket. Supports offline editing with queued sync on reconnect. 100M+ blocks synced daily across millions of users.
- **TradingView**: Real-time stock prices via WebSocket. 10,000+ symbols update every 100ms. Binary WebSocket protocol (ArrayBuffer, not JSON) for efficiency — 90% less bandwidth than JSON. WebTransport being evaluated for even lower latency. 30M+ monthly active traders.

## 13. Interview Playbook

**Q: "Design a real-time collaborative document editor like Google Docs."**
→ Open with: Use CRDTs or OT for conflict resolution. WebSocket for real-time communication. Each document is a list of characters (or blocks) with position identifiers that allow concurrent insertion without conflict.
→ Cover: Architecture: WebSocket gateway → Redis pub/sub → application services → persistence (PostgreSQL). Optimistic updates: apply changes locally and render immediately. On reconnect: sync from last acknowledged version. Fallback: long polling if WebSocket fails.
→ Depth signal: CRDTs are better for this use case than OT because they don't require a central server to transform operations — each client can merge independently. Use a sequence-based CRDT (like RGA or LSEQ) with tombstone deletion. For 100+ concurrent users on a single document, batch operations every 200ms and debounce cursor updates to every 50ms. Use binary protocol (MessagePack or Protocol Buffers) for efficiency.

**Q: "How do you handle reconnection in a WebSocket-based application?"**
→ Open with: Implement exponential backoff (1s, 2s, 4s, 8s, ... max 30s) with jitter. Queue outgoing messages during disconnection. On reconnect, send the last acknowledged sequence ID to the server; server replies with all missed messages since that sequence ID.
→ Cover: Message queue capped at 1000 messages to prevent memory explosion. State snapshot instead of replay for long disconnects (send the full document state instead of replaying each operation).
→ Depth signal: For collaborative apps, send a \`sync\` message on reconnect containing the client's current CRDT state. The server computes a diff between client state and server state, sends only the difference. This is faster than replaying all operations. Use vector clocks or version vectors to compare states efficiently.

## 14. Concept Check Quiz

**Q1:** What is the difference between WebSocket and SSE?**Answer:** WebSocket is bidirectional — both client and server can send messages at any time. SSE is unidirectional — only the server can push data to the client. SSE auto-reconnects natively via the EventSource API; WebSocket requires custom reconnection logic.

**Q2:** What is a CRDT and why is it useful?**Answer:** A Conflict-free Replicated Data Type is a data structure that allows multiple users to edit independently and merge their changes deterministically without a central coordinator. Useful for collaborative editing because there's no single point of failure, and edits can be applied optimistically offline.

**Q3:** How do optimistic updates work?**Answer:** Apply the change to the local UI immediately (before the server confirms), then send the change to the server. If the server rejects it, roll back the local change and show an error. If the server accepts it, optionally update the local state with the server's confirmed version.

**Q4:** What is the purpose of sticky sessions in WebSocket architecture?**Answer:** Ensures that all WebSocket messages from a client are routed to the same server node. Required because WebSocket state (connection, channel subscriptions) is stored in-memory per node. Without sticky sessions, reconnecting clients would land on random nodes that lack their state.

**Q5:** What is the difference between CRDT and Operational Transformation (OT)?**Answer:** CRDTs merge operations based on data structure properties — no central coordination needed. Clients can merge in any order and converge to the same state. OT requires a server to transform concurrent operations against each other. CRDTs are simpler for decentralized systems; OT gives the server more control over conflict resolution.

## 15. Next Steps

- **State Management at Scale** — How real-time state sync integrates with server state (TanStack Query), client state (Zustand), and persisted state (IndexedDB).
- **Caching Strategies for Frontend** — How service worker caching interacts with real-time data streams. Cache-first for static data, network-first for real-time updates.
- **Web Performance Optimization** — Optimizing real-time data delivery with binary protocols, message batching, and connection pooling.
- **Micro-Frontends Architecture** — Real-time communication across independent micro-frontends using custom events, shared WebSocket connections, and cross-application state sync.`,
    estimatedMin: 12,
    difficulty: "ADVANCED" as const,
    companies: ["Google", "Meta", "Slack", "Figma"],
    tags: ["real-time", "websocket", "collaboration", "ot", "crdt", "live-updates"],
  },


];
