export const module09Lessons = [
  {
    id: 'lesson-09-01',
    slug: 'frontend-performance-01-frontend-vs-backend-system-design',
    title: 'Frontend System Design vs Backend System Design',
    content: `## 1. Quick Summary (AEO Snippet)

**Frontend system design** focuses on client-side architecture: rendering strategy, state management, caching, bundle size, and user experience metrics. **Backend system design** prioritizes server-side concerns: data storage, API design, scalability, availability, and distributed systems. The gap is closing with hybrid rendering (SSR, ISR) and edge computing, but each demands distinct tradeoffs.

## 2. Definition

Frontend system design is the practice of architecting the user-facing layer of an application to deliver fast, reliable, and engaging experiences. It covers the entire client-side stack: how code is bundled and delivered, how UI is rendered, how data flows between components, and how the application behaves under varying network and device conditions.

Backend system design, by contrast, governs the server-side infrastructure: databases, caching layers, load balancers, microservices, message queues, and API gateways. The frontend is the **consumer** of backend capabilities, but its own architecture determines perceived performance and user satisfaction.

A critical insight is that **modern frontend design increasingly adopts backend patterns** — CDN-based caching, service workers as local proxies, edge rendering, and even client-side databases like IndexedDB and OPFS.

## 3. Why It Exists / Problem It Solves

Traditional system design interviews and real-world architecture focused almost exclusively on backend systems. As web applications grew more complex (single-page apps, real-time collaboration, offline support), the frontend became a system in its own right — one with unique constraints:

- **No direct server control** — code runs on diverse, untrusted devices
- **Network uncertainty** — latency, bandwidth, and connectivity vary
- **Resource limits** — CPU, memory, battery, and cache storage are constrained
- **Perception is reality** — users judge performance by paint timing, not server response time
- **State complexity** — UI state, cache state, URL state, and server state must stay synchronized

Frontend system design addresses these by treating the browser as a **distributed system node** with its own caching, storage, computation, and networking layers.

## 4. When to Use It

Apply frontend system design thinking when:

- Building a single-page application with complex client-side routing and state
- Designing for global audiences with varying network quality (emerging markets, mobile-only users)
- Architecting a micro-frontend or module federation setup
- Optimizing Core Web Vitals for SEO-sensitive products (e-commerce, media, SaaS landing pages)
- Implementing real-time features (collaboration, live dashboards, chat)
- Planning an offline-first or progressive web application

Backend system design applies when the primary constraints are data durability, horizontal scaling, inter-service communication, and infrastructure reliability.

## 5. When NOT to Use It / Tradeoffs

Over-engineering frontend architecture has real costs:

- **Bundle bloat** — every abstraction (state library, router, caching layer) adds JavaScript bytes
- **Developer complexity** — micro-frontends, module federation, and complex caching increase build time and debugging difficulty
- **SEO penalties** — heavy client-side rendering without SSR hurts crawler visibility
- **Team overhead** — splitting a frontend into independent deployable units requires mature CI/CD and contract testing

**Tradeoff table:**

| Approach | Pros | Cons |
|----------|------|------|
| Full CSR | Simple, cheap hosting | Poor SEO, slow LCP |
| SSR | Good SEO, fast FCP | Higher server cost, TTFB |
| SSG | Fastest loads, CDN-friendly | Stale content, long builds |
| Micro-frontends | Team autonomy, independent deploys | Bundle duplication, coordination cost |

## 6. How It Works (Deep Mechanics)

Frontend system design breaks into four layers:

**Delivery Layer:** How code reaches the browser. This includes bundling (Webpack, Vite, Turbopack), code splitting (dynamic imports, route-based splitting), and CDN distribution with cache headers (immutable content hashing, stale-while-revalidate).

**Rendering Layer:** How HTML/CSS/JS become pixels. CSR mounts an empty shell then fetches data; SSR renders on the server and hydrates on the client; SSG pre-renders at build time; ISR re-generates pages on demand after a stale threshold.

**State Layer:** How data flows through the UI. Component-local state (React useState), server cache (TanStack Query, SWR), global state (Zustand, Jotai, Redux), URL state (Next.js searchParams), and persisted state (localStorage, IndexedDB).

**Performance Layer:** How perceived speed is optimized. Critical CSS inlining, font subsetting, image responsive sets (\`srcset\`), lazy loading (\`loading=lazy\`), predictive prefetching (Quick, Speculation Rules API), and animation throttling (rAF, passive event listeners).

## 7. Architecture Diagram (ASCII)

\`\`\`
+---------------------+     +---------------------+
|   DNS / CDN         |     |   Backend APIs      |
| (Cloudflare, Fastly)|<--->| (REST, GraphQL)     |
+----------+----------+     +----------+----------+
           |                           |
           v                           v
+----------+----------+     +----------+----------+
| Service Worker      |     |   Cache Layer       |
| (offline, prefetch) |     | (SWR, Cache API)    |
+----------+----------+     +----------+----------+
           |                           |
           v                           v
+----------+----------+     +----------+----------+
| Rendering Layer     |     |   State Layer       |
| CSR / SSR / SSG/ISR |     | (Zustand, TanStack) |
+----------+----------+     +----------+----------+
           |                           |
           +-----------+---------------+
                       |
                       v
            +----------+----------+
            |   UI Components     |
            | (React, Vue, Svelte)|
            +---------------------+
\`\`\`

## 8. Real-World Flow Example

**Scenario:** An e-commerce product page (e.g., Amazon product detail).

1. User navigates to \`/product/dell-xps-15\`
2. DNS resolves via Cloudflare, which serves cached HTML if ISR has generated it
3. If not cached, the edge server or origin server executes React SSR
4. The streamed HTML includes inline critical CSS, product JSON as \`<script id="__NEXT_DATA__">\`, and a service worker that intercepts subsequent navigation
5. The browser paints the hero image (WebP, \`fetchpriority="high"\`) and above-fold content immediately
6. TanStack Query hydrates from the serialized server cache, avoiding a re-fetch
7. Below-fold sections (reviews, recommendations) lazy-load via dynamic imports and intersection observer
8. User adds item to cart — Zustand updates local state, POST to backend, optimistic UI with rollback
9. Service worker caches the product API response for offline fallback
10. On return visit, the SW serves stale-while-revalidate, showing instant content while checking freshness

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
interface ProductPageProps {
  productId: string;
}

type RenderingStrategy = 'csr' | 'ssr' | 'ssg' | 'isr';

const getRenderingStrategy = (productType: string): RenderingStrategy => {
  switch (productType) {
    case 'catalog':    return 'ssg';
    case 'detail':     return 'isr';
    case 'dashboard':  return 'csr';
    case 'landing':    return 'ssr';
    default:           return 'csr';
  }
};

async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { staleTime?: number; cacheTime?: number } = {}
): Promise<{ data: T; fromCache: boolean }> {
  const cache = await caches.open('api-cache-v1');
  const cached = await cache.match(key);

  if (cached && options.staleTime) {
    const age = Date.now() - Number(cached.headers.get('sw-cache-timestamp') || 0);
    if (age < options.staleTime) {
      return { data: await cached.json(), fromCache: true };
    }
  }
  const fresh = await fetcher();
  const response = new Response(JSON.stringify(fresh), {
    headers: {
      'Content-Type': 'application/json',
      'sw-cache-timestamp': String(Date.now()),
    },
  });
  void cache.put(key, response);
  return { data: fresh, fromCache: false };
}

const registerSW = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (installing) {
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New version available. Refresh to update.');
          }
        });
      }
    });
    return registration;
  } catch {
    return null;
  }
};
\`\`\`

## 10. Real Company Use Cases

- **Airbnb** uses SSR with selective hydration (Islands architecture) for their search results page, reducing JavaScript sent to mobile devices by 50%
- **TikTok** treats the frontend as a streaming platform — video chunks arrive before JS is fully parsed, using Service Worker streaming and \`fetch()\` with partial content
- **Shopify** pioneered Hydrogen, a React framework built entirely around streaming SSR and server components for e-commerce
- **Netflix** optimized their landing page by moving from React CSR to a custom framework-free approach, cutting time-to-interactive by 50%
- **Google Search** uses SSG for their homepage (static HTML served from CDN) while search results use SSR with streaming

## 11. Common Interview Questions

- "Design the frontend architecture for a real-time collaborative document editor."
- "How would you architect the frontend for an e-commerce site serving 100M monthly users across emerging markets?"
- "Compare and contrast CSR, SSR, SSG, and ISR. When would you choose each?"
- "Design a caching strategy for a news website with breaking stories and evergreen content."
- "How would you reduce the JavaScript bundle size for a React application from 500KB to 100KB?"
- "What factors determine whether to use a micro-frontend architecture?"

## 12. Related Topics & Next Steps

- Rendering Patterns (CSR, SSR, SSG, ISR) — the foundation of modern frontend architecture
- Core Web Vitals — the metrics that define frontend success
- Caching Strategies for Frontend — SW, CDN, and memory cache patterns
- State Management at Scale — server state vs client state boundaries
- Micro-Frontends Architecture — splitting monoliths into independent deployable units`,
    estimatedMin: 14,
    difficulty: 'INTERMEDIATE',
    companies: ['Airbnb', 'TikTok', 'Shopify', 'Netflix', 'Google'],
    tags: ['frontend-system-design', 'architecture', 'csr', 'ssr', 'ssg', 'isr', 'rendering', 'performance'],
  },
  {
    id: 'lesson-09-02',
    slug: 'frontend-performance-02-rendering-patterns-csr-ssr-ssg-isr',
    title: 'Rendering Patterns (CSR, SSR, SSG, ISR)',
    content: `## 1. Quick Summary (AEO Snippet)

Web rendering patterns sit on a spectrum from fully client-side (CSR) to fully build-time (SSG), with server-side (SSR) and incremental (ISR) hybrids in between. The choice determines **TTFB, FCP, LCP, TTI**, SEO capability, hosting cost, and developer experience. No single pattern is best — each solves a specific set of tradeoffs.

## 2. Definition

**Client-Side Rendering (CSR):** The browser receives a minimal HTML shell, all JavaScript bundles load, and React/Vue/Svelte renders the UI entirely on the client. Network waterfall: HTML → JS → API data → paint.

**Server-Side Rendering (SSR):** The server renders the React tree to HTML on each request. The client receives pre-rendered HTML (fast First Contentful Paint) and hydrates it with JavaScript for interactivity. Network waterfall: Server computes HTML + data → streamed to client → hydrate.

**Static Site Generation (SSG):** HTML is generated at build time. The same pre-built HTML file is served for every request via CDN. Rebuilds are required for content changes.

**Incremental Static Regeneration (ISR):** Build-time static generation plus server-side revalidation on demand. Stale pages are served immediately while the server regenerates the updated version in the background.

## 3. Why It Exists / Problem It Solves

Early web was fully server-rendered (PHP, JSP, Rails). The rise of SPAs (React, Angular) shifted rendering to the client, enabling rich interactivity but creating new problems:

- **SEO black hole** — crawlers saw empty HTML shells
- **Slow LCP** — JavaScript had to download, parse, and execute before anything was visible
- **Poor mobile performance** — devices with 3G connections and low-end CPUs struggled to run heavy JS bundles
- **Developer complexity** — managing SEO, performance, and state across client and server required increasingly complex tooling

Each pattern solves a subset of these problems while introducing its own tradeoffs. The industry converged on frameworks (Next.js, Nuxt, SvelteKit, Remix) that let developers choose per-page or even per-component rendering strategies.

## 4. When to Use It

| Pattern | Best For | Examples |
|---------|----------|----------|
| **CSR** | App-like experiences, authenticated dashboards, internal tools | Gmail, Figma, Notion |
| **SSR** | SEO-critical dynamic pages, personalized content, real-time data | E-commerce PDP, news, social feeds |
| **SSG** | Marketing sites, documentation, blogs, landing pages | Next.js docs, Tailwind site, Stripe docs |
| **ISR** | Large content catalogs updated incrementally, hybrid static/dynamic | E-commerce catalog, wiki pages, course platforms |
| **Streaming SSR** | Pages with mixed above/below-fold importance | Article pages, search results |
| **Partial Hydration** | Content-heavy pages with minimal interactivity | Blog, documentation, news |

## 5. When NOT to Use It / Tradeoffs

**CSR tradeoffs:** Poor SEO (requires additional SSR/SSG for landing pages), slow time-to-interactive on slow devices, JS-dependent (blank screen on JS failure).

**SSR tradeoffs:** Higher server costs (CPU per request), slower TTFB (server must compute before sending anything), increased hosting complexity (Node.js server vs static CDN), potential memory leaks from long-running render processes.

**SSG tradeoffs:** Stale content between builds, long build times for large sites (10K+ pages), no per-request personalization, complex incremental builds.

**ISR tradeoffs:** Cache invalidation complexity, stale-while-revalidate means some users see old content, origin server must handle revalidation traffic, DB query spikes during regeneration.

## 6. How It Works (Deep Mechanics)

**CSR Flow:**
1. Browser requests URL, server returns \`<div id="root">\` + \`<script src="bundle.js">\`
2. Browser downloads, parses, and executes JS bundle
3. React renders the component tree and mounts it to \`#root\`
4. UseEffect fires API calls, responses trigger re-renders
5. Router intercepts navigation — subsequent pages load via dynamic imports (code splitting)

**SSR Flow (React 18 with streaming):**
1. Server receives request, creates a React tree
2. Server uses \`renderToPipeableStream\` (or \`renderToString\` for legacy)
3. Shell HTML (Suspense fallbacks, loading states) streams immediately
4. As data resolves, server streams the HTML chunks for each Suspense boundary
5. Client renders shell, hydrates boundaries progressively as they arrive
6. Interactivity becomes available per-boundary (selective hydration)

**SSG Flow:**
1. Build script iterates over all pages (e.g., \`getStaticPaths\` in Next.js)
2. Each page's \`getStaticProps\` runs at build time, fetching data
3. Output: \`/products/dell-xps-15.html\` (pre-rendered HTML with inline JSON)
4. CDN caches permanently (immutable cache headers)
5. On each request, CDN returns the pre-built HTML immediately
6. Next build re-generates all (or only changed) pages

**ISR Flow:**
1. Build generates HTML for all pages (same as SSG)
2. \`revalidate\` property set (e.g., \`revalidate: 60\`)
3. First request after 60s: CDN returns stale HTML, origin re-renders in background
4. Subsequent requests get fresh HTML
5. On-demand revalidation via API route (\`res.revalidate('/path')\`) for instant updates

**Key implementation detail:** ISR is NOT real-time. It is "eventual consistency" on the frontend. The stale page remains in CDN cache until the revalidation completes.

## 7. Architecture Diagram (ASCII)

\`\`\`
                      Rendering Pattern Decision Tree

      START: Is SEO critical?
         /                \\
        YES                NO
         |                  |
    Is data per-user?    Use CSR
      /        \\
     YES        NO
      |          |
    Use SSR    Is content updated
    +streaming  frequently?
                 /       \\
                YES       NO
                 |         |
              >100K     Use SSG
              pages?
              /    \\
             YES    NO
              |      |
            Use    Use ISR
            ISR    (simple)
           (on-demand
           revalidation)
\`\`\`

## 8. Real-World Flow Example

**Scenario:** A content management system (CMS) blog with 50,000+ articles.

The architecture uses **SSG for most articles** with **ISR for trending/updated content**:

1. Build pipeline runs every hour (\`cron\` triggers \`next build\`)
2. Only changed articles re-render (Turbopack + incremental build cache)
3. Fresh articles deploy to Vercel's Edge Network within 30 seconds
4. CDN serves HTML at the edge (50ms TTFB globally, regardless of origin location)
5. A breaking news article needs immediate update — editorial team hits "Publish"
6. CMS webhook calls \`res.revalidate('/news/2026/breaking-story')\`
7. Vercel instantly purges that single page from CDN and re-renders it
8. Readers see the updated article on the next request (no build needed)
9. Comment sections use CSR (lazy-loaded widget) to avoid re-rendering the article for every new comment
10. Analytics dashboards for editors use full CSR with client-side auth — no SEO needed

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const posts = await fetch('https://cms.example.com/api/posts?limit=10000').then(r => r.json());
  return posts.map((post: { slug: string }) => ({ slug: post.slug }));
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await fetch(\`https://cms.example.com/api/posts/\${slug}\`, {
    next: { revalidate: 3600 },
  }).then(r => r.json());

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.htmlContent }} />
    </article>
  );
}

// CSR for user dashboard
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton" />;
  return <div>{/* render dashboard */}</div>;
}
\`\`\`

## 10. Real Company Use Cases

- **Vercel (Next.js)** — their marketing site uses SSG, their docs use ISR with on-demand revalidation triggered by GitHub webhooks
- **Walmart** uses SSR for product pages (SEO-critical, frequently changing prices) and CSR for the checkout flow (auth-required, interactive)
- **TikTok** uses a custom streaming architecture — the "For You" feed streams SSR content while the comment section loads via CSR
- **Notion** uses full CSR — their app is essentially a terminal with Canvas-based rendering; SEO is handled via a separate prerender service
- **Netflix's landing page** (logged-out) uses SSG for the hero section with ISR for content rows that update daily

## 11. Common Interview Questions

- "Explain the rendering waterfall for CSR. Where are the bottlenecks?"
- "How does React 18 streaming SSR improve perceived performance over traditional SSR?"
- "What happens during hydration? Why is it expensive?"
- "Design a rendering strategy for a Wikipedia-like website with 6M+ articles."
- "How would you implement ISR without a framework like Next.js?"
- "What is the 'double data problem' in SSR + CSR hybrid apps?"
- "Compare selective hydration to islands architecture (Astro, Marko)."

## 12. Related Topics & Next Steps

- Core Web Vitals & Performance Metrics — how rendering choices affect LCP, FID, CLS
- Caching Strategies for Frontend — how SW and CDN caching interact with each rendering pattern
- Web Performance Optimization — bundle splitting, code splitting, lazy loading
- State Management at Scale — server state vs client state across rendering boundaries`,
    estimatedMin: 16,
    difficulty: 'INTERMEDIATE',
    companies: ['Vercel', 'Walmart', 'TikTok', 'Notion', 'Netflix'],
    tags: ['csr', 'ssr', 'ssg', 'isr', 'rendering', 'nextjs', 'hydration', 'streaming'],
  },
  {
    id: 'lesson-09-03',
    slug: 'frontend-performance-03-core-web-vitals-and-performance-metrics',
    title: 'Core Web Vitals & Performance Metrics',
    content: `## 1. Quick Summary (AEO Snippet)

**Core Web Vitals** are Google's standardized metrics for user experience: **LCP** (loading: ≤2.5s), **FID/INP** (interactivity: ≤200ms), and **CLS** (visual stability: ≤0.1). They directly impact SEO rankings and user retention. Beyond these, **TTFB**, **FCP**, and **TTI** provide deeper diagnostic insight.

## 2. Definition

**LCP (Largest Contentful Paint):** Measures the render time of the largest visible element (image, text block, video poster). It represents perceived load speed — when the user feels the page is "mostly loaded."

**FID (First Input Delay):** The time from a user's first interaction (click, tap, keypress) to the browser's ability to process the event. **INP (Interaction to Next Paint)** is the replacement metric, measuring the *slowest* interaction's latency.

**CLS (Cumulative Layout Shift):** Sum of unexpected layout shifts during the page's lifetime. Shift = (impact fraction) × (distance fraction). A shift occurs when a visible element changes position after being rendered.

**Supporting metrics:**

| Metric | Good | Poor | Measures |
|--------|------|------|----------|
| **TTFB** | ≤800ms | >1800ms | Server + network response time |
| **FCP** | ≤1.8s | >3.0s | First content painted |
| **LCP** | ≤2.5s | >4.0s | Largest element painted |
| **INP** | ≤200ms | >500ms | Slowest interaction response |
| **CLS** | ≤0.1 | >0.25 | Layout stability |
| **TTI** | ≤3.8s | >7.3s | Full interactivity ready |

## 3. Why It Exists / Problem It Solves

Before Core Web Vitals, performance was measured inconsistently. Google used page load time as a ranking signal, but developers could game it. Users experienced:

- **Blank screens** while JavaScript loaded (poor LCP)
- **Tap frustration** — clicking a button that doesn't respond for seconds (poor FID)
- **Content jumping** — ads, images, and embeds loading after text, pushing content down (poor CLS)
- **No standardized measurement** — each company defined "fast" differently

Core Web Vitals gave the industry a shared vocabulary, a clear target (green thresholds), and real SEO consequences. Google's 2021 ranking update made CWV a direct ranking factor.

## 4. When to Use It

Track Core Web Vitals:

- In production for all public-facing pages (SEO-sensitive)
- In CI/CD pipelines as performance budgets (block deploys that regress CWV)
- For mobile-first audiences (lower device specs amplify CWV issues)
- When running A/B tests — verify that UX changes don't hurt performance
- For e-commerce or media sites where every 100ms of load time reduces conversion by 1-2%

Use lab metrics (Lighthouse, PageSpeed Insights) for **debugging**, and field metrics (CrUX, RUM) for **monitoring real user experience**.

## 5. When NOT to Use It / Tradeoffs

- CWV only measures initial load and first interactions — not long-term smoothness (jank, memory leaks)
- Over-optimizing LCP can hurt INP (e.g., prioritizing hero image JS blocks event listeners)
- CLS is a cumulative score — a single bad shift can ruin the whole visit, even if the page is otherwise stable
- Field data (CrUX) has a 28-day lag — not useful for real-time debugging
- Lab data (Lighthouse) is deterministic but may not reflect real devices/networks
- CWV doesn't capture task completion, user satisfaction, or business impact directly

## 6. How It Works (Deep Mechanics)

**LCP Calculation:**
1. Browser starts performance observer for largest element
2. Each paint (text, image, SVG, video poster) is evaluated
3. The largest element's render time becomes LCP
4. LCP can change until user interaction or scroll (whichever comes first)
5. LCP element types: \`<img>\`, \`<image>\` (SVG), \`<video>\` poster, \`<div>\` with background image, text nodes

**FID/INP Calculation:**
1. INP observes all click, tap, and keyboard interactions
2. For each interaction, measures: input delay (event handler queued) + processing time (handler execution) + presentation delay (next paint)
3. The longest interaction's latency (not the sum) becomes INP
4. Interactions on page hide/unload are excluded
5. INP replaces FID in March 2024 — FID only measured first interaction, INP measures worst interaction

**CLS Calculation:**
1. CLS observer tracks all unexpected layout shifts
2. Shift score = (impact fraction) × (distance fraction)
   - Impact: proportion of viewport affected
   - Distance: how far the unstable element moved relative to viewport
3. Example: An ad loads below text, pushing it 0.3 viewport heights. Impact = 0.5, distance = 0.3. Score = 0.15.
4. CLS is the sum of all such scores during the page's session

**Measurement APIs:**
\`\`\`typescript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'largest-contentful-paint') {
      console.log('LCP:', entry.renderTime || entry.loadTime);
    }
    if (entry.entryType === 'layout-shift') {
      console.log('CLS shift:', entry.value);
    }
    if (entry.entryType === 'first-input') {
      console.log('FID:', entry.processingStart - entry.startTime);
    }
  }
});

observer.observe({ type: 'largest-contentful-paint', buffered: true });
observer.observe({ type: 'layout-shift', buffered: true });
observer.observe({ type: 'first-input', buffered: true });
\`\`\`

## 7. Architecture Diagram (ASCII)

\`\`\`
Time-based waterfall with CWV annotations:

TTFB                FCP                LCP                 Interactive
 |                  |                  |                    |
[---DNS+TCP+TLS---][---HTML parse---][---render---][---JS exec---]
                   |                  |              |
                   | First text/image | Largest     Event handlers
                   | appears          | element     registered
                   |                  | painted     (TTI)
                   |
                   v                  v              v
             Good: <1.8s        Good: <2.5s      INP <200ms
\`\`\`

## 8. Real-World Flow Example

**Scenario:** A news article page on a major publisher site.

1. User taps a Google Search result link (mobile Chrome)
2. **TTFB begins:** DNS lookup: 30ms, TCP: 15ms, TLS: 45ms. Origin server: 120ms. Total TTFB: ~210ms (Good)
3. **FCP:** Server streams SSR HTML. First text paragraph renders at 600ms. Background is white, text is black. No hero image yet. FCP = 600ms (Good)
4. **LCP:** The hero \`<img>\` starts loading at 700ms (speculative preload in \`<head>\`). Image: 120KB WebP, downloaded in 400ms on 4G. Paints at 1,100ms. LCP = 1,100ms (Good)
5. **CLS:** Publisher lazy-loads an ad 500px below fold. Ad container has fixed dimensions (\`width: 300, height: 250\`). No layout shift. A sidebar widget fetches "trending stories" but has \`min-height\` set — no shift. CLS = 0.02 (Good)
6. **INP:** User taps "Read Comments" button at the bottom. The button handler is wrapped in a passive event listener with a 2ms delay. The comments section lazy-loads via \`import('./comments')\`. Total interaction delay: 85ms (Good)
7. Result: All CWV metrics in green. Page ranks well in search. User bounces at 30% (industry average).

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
interface CWVReport {
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  ttfb: number | null;
}

const vitalsReport: CWVReport = {
  lcp: null,
  inp: null,
  cls: null,
  ttfb: null,
};

const lcpObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  vitalsReport.lcp = lastEntry.renderTime || lastEntry.loadTime || 0;
});
lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

let clsValue = 0;
const clsObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      clsValue += entry.value;
    }
  }
  vitalsReport.cls = clsValue;
});
clsObserver.observe({ type: 'layout-shift', buffered: true });

let inpValue = 0;
const inpObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const delay = entry.processingStart - entry.startTime;
    inpValue = Math.max(inpValue, delay);
  }
  vitalsReport.inp = inpValue;
});
inpObserver.observe({ type: 'first-input', buffered: true });

const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
if (navigationEntry) {
  vitalsReport.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
}

const sendReport = () => {
  if (vitalsReport.lcp || vitalsReport.inp || vitalsReport.cls) {
    navigator.sendBeacon('/api/vitals', JSON.stringify(vitalsReport));
  }
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    sendReport();
  }
});
\`\`\`

## 10. Real Company Use Cases

- **Google** — CWV is a direct ranking signal in search. Sites with good CWV rank higher on average.
- **BBC** — Reduced LCP from 3.2s to 1.4s by implementing critical CSS inlining, removing render-blocking JS, and using WebP with \`<picture>\` elements. Mobile traffic increased 12%.
- **Amazon** — Every 100ms of load time improvement correlates with 1% increase in revenue. They aggressively optimize CLS by reserving ad slots with exact dimensions.
- **Reddit** — After migrating to React + SSR and optimizing CWV, they saw a 20% improvement in user retention on mobile.
- **AliExpress** — Reduced LCP by 35% using predictive prefetching and Quick; converted 5% more mobile users.

## 11. Common Interview Questions

- "What is the difference between FCP and LCP? Why is LCP more important for SEO?"
- "How does CLS work? Give three causes of layout shift and how to fix each."
- "INP replaces FID in 2024. What does INP measure differently?"
- "How would you build a RUM (Real User Monitoring) pipeline for Core Web Vitals?"
- "You see LCP is 4.2s on mobile. Walk through your debugging process."
- "How would you set up a performance budget in CI/CD?"

## 12. Related Topics & Next Steps

- Rendering Patterns — how CSR vs SSR vs SSG affects each CWV metric
- Caching Strategies for Frontend — how SW and CDN impact TTFB and LCP
- Web Performance Optimization — specific techniques to improve each CWV
- Image & Asset Optimization — the #1 factor for LCP on content-heavy pages`,
    estimatedMin: 14,
    difficulty: 'BEGINNER',
    companies: ['Google', 'BBC', 'Amazon', 'Reddit', 'AliExpress'],
    tags: ['core-web-vitals', 'lcp', 'inp', 'cls', 'performance-metrics', 'seo', 'rum'],
  },
  {
    id: 'lesson-09-04',
    slug: 'frontend-performance-04-caching-strategies-for-frontend',
    title: 'Caching Strategies for Frontend (Service Workers, CDN)',
    content: `## 1. Quick Summary (AEO Snippet)

Frontend caching operates at **three layers**: CDN (shared edge cache), Service Worker (client-side programmable cache), and browser HTTP cache (disk/memory). The winning strategy combines **immutable content hashing** for static assets, **stale-while-revalidate** for API responses, and **cache-first with network fallback** for app shell resources.

## 2. Definition

**CDN Caching:** Content Delivery Networks (Cloudflare, Fastly, Akamai, Vercel Edge) cache HTTP responses at geographically distributed edge nodes. Cache behavior is controlled by response headers: \`Cache-Control\`, \`ETag\`, \`Last-Modified\`.

**Service Worker Caching:** A JavaScript file (\`sw.js\`) that runs as a network proxy in the browser. It intercepts \`fetch\` events and implements custom caching strategies: cache-first, network-first, stale-while-revalidate, or network-only.

**HTTP Browser Cache:** The browser's built-in disk and memory cache. Controlled by the same headers as CDN caching, but lives on the user's device. Usually smaller and less configurable than SW cache.

**Key distinction:** CDN caches are shared across many users; SW caches are per-origin, per-device. CDN reduces origin load and latency; SW enables offline support and instant back-navigation.

## 3. Why It Exists / Problem It Solves

Before structured caching, every page load required a full round-trip to the origin server:

- **High latency** — users far from origin servers experienced 500ms+ TTFB
- **Origin overload** — every request hit the server, requiring expensive horizontal scaling
- **No offline support** — loss of connectivity meant a blank page
- **Bandwidth waste** — identical assets downloaded on every navigation
- **Fragile user experience** — slow networks caused partial renders and broken pages

Caching solves these by storing responses closer to the user (CDN edge, browser cache, SW) and serving them without touching the origin. The art is knowing **what to cache, for how long, and how to invalidate it**.

## 4. When to Use It

| Strategy | Use Case | Example |
|----------|----------|---------|
| **Cache-First** | Immutable assets (hashed JS/CSS, fonts) | \`bundle.a1b2c3.js\` |
| **Network-First** | Dynamic content (API responses, HTML) | Product details, user profile |
| **Stale-While-Revalidate** | Frequently updated, non-critical content | News feed, recommendations |
| **Network-Only** | Sensitive/real-time data (auth, payments) | Checkout, login |
| **Cache-Only** | Offline-first apps (static app shell) | PWA, document editor |

CDN caching is essential for global audiences (multi-region, multi-continent). SW caching is critical for PWAs, offline support, and instant back/forward navigation.

## 5. When NOT to Use It / Tradeoffs

- **Cache-first for dynamic content** — users see stale data if invalidation fails
- **Aggressive CDN caching without purge API** — can't invalidate on demand
- **Over-caching in SW** — consumes user disk space (origin quota: ~50MB per origin, varies by browser)
- **SW complexity** — debugging cache logic is harder than server-side caching
- **Cache invalidation is the hardest problem** — versioning, migration, and atomic swaps require careful planning
- **CDN cache poisoning** — serving incorrect responses to all users until TTL expires

**Key tradeoff: cache hit ratio vs freshness.** Higher hit ratio = faster load = potentially stale data. Each application must define its tolerance for staleness.

## 6. How It Works (Deep Mechanics)

**CDN Cache — Headers that Matter:**

\`\`\`typescript
// Cache-Control directives
Cache-Control: public, max-age=31536000, immutable   // static assets
Cache-Control: public, s-maxage=60, stale-while-revalidate=300  // ISR pages
Cache-Control: private, no-cache   // authenticated content
Cache-Control: no-store            // sensitive data

// Validation headers
ETag: "33a64df5"   // content hash — conditional requests
Last-Modified: Wed, 21 Oct 2025 07:28:00 GMT
\`\`\`

**CDN Flow:**
1. Browser requests \`/product/dell-xps-15\`
2. CDN edge (e.g., Cloudflare POP in Mumbai) checks its cache
3. **Cache HIT:** Returns cached HTML immediately (10ms TTFB)
4. **Cache MISS:** Forwards to origin, caches response for \`s-maxage\` duration
5. **Cache STALE:** Serves stale HTML while revalidating in background

**Service Worker — Lifecycle:**
1. Install event: Precache app shell (HTML, critical JS/CSS)
2. Activate event: Clean old caches (versioning)
3. Fetch event: Intercept and apply strategy

**SW Cache Strategies:**

\`\`\`typescript
async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    void caches.open('static-v2').then(cache => cache.put(request, response.clone()));
  }
  return response;
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open('api-v2');
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || await fetchPromise;
}
\`\`\`

## 7. Architecture Diagram (ASCII)

\`\`\`
                          Caching Layers

     User Device                    CDN Edge                    Origin
  +------------------+      +------------------+      +------------------+
  | Service Worker   |<---->| CDN Cache        |<---->| Web Server       |
  | (Cache API)      |      | (e.g., Cloudflare)|      | (Node, Python)   |
  | Cache-First:     |      | Cache HIT: 10ms  |      | Cache MISS: 200ms|
  | - static assets  |      | Cache MISS: proxy|      | Generate HTML    |
  | - app shell      |      | Stale: revalidate|      | Set Cache-Control|
  | Stale-While-Reval:|     | Purge: API hook  |      | Return response  |
  | - API responses  |      |                  |      |                  |
  | Network-First:   |      |                  |      |                  |
  | - HTML pages     |      |                  |      |                  |
  +------------------+      +------------------+      +------------------+
           |                         |
           +--- HTTP Cache ----------+
           (memory, disk)
\`\`\`

## 8. Real-World Flow Example

**Scenario:** A user visits a news PWA on a train with intermittent connectivity.

1. **Initial visit (online):** Browser requests \`/index.html\`. SW intercepts: network-first. HTML is fetched (200ms), SW caches it (app shell), browser renders. All JS/CSS/images are cache-first (SW serves from precache).

2. **Navigate to article (online):** SW serves the app shell instantly from cache. Article JSON is fetched via stale-while-revalidate — cached version (5 min old) renders immediately, background fetch updates cache.

3. **Enter tunnel (offline):** User taps "Next Article." SW intercepts — network fails. SW falls back to cached article list (cache-first). User sees "You're offline. Showing cached articles." Full article HTML is cached from previous visit; rendered immediately.

4. **Exit tunnel (online):** SW's background sync fires. Queued analytics events send. SW revalidates stale caches. User gets a toast: "You're back online. Content updated."

5. **Return visit next day:** Browser has SW installed. SW activates "intent" — user taps the home screen icon. SW serves the app shell from cache (instant), checks network for stale content in background. User sees content in under 1 second regardless of network quality.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
const CACHE_VERSION = 'v2';
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

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  event.respondWith(fetch(request));
});

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      void cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(API_CACHE);
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

## 10. Real Company Use Cases

- **Google Maps** — SW caches tile data for offline navigation. Users download regions while online, navigate without connectivity. Cache-first for tiles, network-first for search.
- **Spotify** — SW caches recently played songs and album art. Stale-while-revalidate for recommendations. Users can browse and play cached tracks offline.
- **TikTok** — CDN cache hit ratio exceeds 90% for video content. Videos are cached at the edge with long TTL, while the "For You" feed is stale-while-revalidate (15 seconds).
- **Walmart** — SW on mobile caches the product catalog. Users browsing in-store (poor connectivity) see cached product pages while the SW revalidates pricing/availability.
- **The New York Times** — SW caches the full article HTML. CDN cache serves static assets with immutable hashes. Their SW handles background sync for crossword puzzle saves.

## 11. Common Interview Questions

- "Design a caching strategy for a news website. How do you handle breaking news?"
- "Explain the differences between CDN caching, SW caching, and the HTTP browser cache."
- "How does stale-while-revalidate work? What are the tradeoffs?"
- "You need to update your SW to cache a new API endpoint. How do you ensure backward compatibility?"
- "How would you handle cache invalidation for 10,000+ static assets?"
- "What happens if a user's browser fills its cache quota? How do you handle it gracefully?"

## 12. Related Topics & Next Steps

- Web Performance Optimization — how caching reduces LCP and TTFB
- Rendering Patterns — ISR combines CDN caching with SW revalidation patterns
- Core Web Vitals — caching directly improves TTFB, LCP, and FCP
- Real-Time Frontend Architecture — how caching interacts with WebSockets and Server-Sent Events`,
    estimatedMin: 15,
    difficulty: 'INTERMEDIATE',
    companies: ['Google', 'Spotify', 'TikTok', 'Walmart', 'New York Times'],
    tags: ['service-worker', 'cdn', 'caching', 'stale-while-revalidate', 'pwa', 'cache-strategy', 'offline'],
  },
  {
    id: 'lesson-09-05',
    slug: 'frontend-performance-05-state-management-at-scale',
    title: 'State Management at Scale',
    content: `## 1. Quick Summary (AEO Snippet)

State management at scale requires **clear boundaries** between server state (remote data, cache), client state (UI, local storage), and URL state (routing, search params). The winning pattern: **TanStack Query for server state**, **Zustand for global client state**, **React hooks for local state**, and **Next.js searchParams for URL state**. Avoid global stores for server data.

## 2. Definition

State management is the discipline of controlling data flow across a frontend application. At scale (100+ components, dozens of developers, multiple teams), it becomes the primary source of bugs and complexity.

The four state categories:

- **Server State:** Data from the backend — products, users, orders. Owned by the server, cached on the client. Must handle loading, error, stale, and refetch states.
- **Client State:** UI-specific data — active tab, modal open/close, form input, sidebar collapsed. Volatile and local to the application.
- **URL State:** Data in the URL — \`/products?category=laptops&sort=price\`. The source of truth for navigation, filters, and pagination.
- **Persisted State:** Data saved to localStorage, IndexedDB, or OPFS — user preferences, draft content, offline queue.

The fundamental insight: **don't put server state in a global store**. Redux stores that conflate API responses with UI state become untestable, cause stale data bugs, and require manual cache invalidation logic.

## 3. Why It Exists / Problem It Solves

As applications grow, naive state management breaks down:

- **Prop drilling** — passing data through 10+ component layers
- **Stale data** — component A has old data because component B didn't invalidate it
- **Race conditions** — multiple API calls update the same state in unpredictable order
- **Re-render explosions** — a single store change triggers 500+ component re-renders
- **Synchronization bugs** — URL params, server data, and local state diverge
- **Testing difficulty** — stores with side effects are hard to mock

Structured state management solves these by enforcing ownership boundaries, normalizing data, and providing predictable update patterns.

## 4. When to Use It

- **All applications** benefit from server state management (TanStack Query, SWR)
- Global client stores (Zustand, Jotai) are useful when: two unrelated components need to share mutable state, or state must persist beyond component unmount
- URL state is mandatory for: search results, pagination, filters, detail pages
- State machines (XState) are useful for: complex workflows (checkout, multi-step forms, game UI)
- Micro-frontends need cross-application state — custom events, shared stores, or postMessage

Avoid global stores when: state is purely local (\`useState\` suffices), state is URL-encodable (use searchParams), or state belongs to a single component tree (use context or props).

## 5. When NOT to Use It / Tradeoffs

- **Global store for everything** — leads to monolithic state, hidden dependencies, and complex debugging
- **Redux for server state** — boilerplate for cache invalidation, reducers, and selectors that TanStack Query handles natively
- **Over-normalization** — deeply normalized state (like a relational database) is overkill for most UIs; prefer denormalized views
- **Context for global state** — React Context re-renders all consumers on any change; use Zustand/Jotai which have subscription-based updates
- **State machines for simple state** — XState adds significant complexity; use \`useReducer\` for 2-3 state transitions

**Performance tip:** Every global store subscription adds overhead. At scale, use atomic stores (Jotai, Zustand slices) so components only re-render when their subscribed value changes.

## 6. How It Works (Deep Mechanics)

**Server State (TanStack Query):**

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

**State machine for complex flows (\`useReducer\`):**

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
      if (event.type === 'PROCEED_TO_SHIPPING') return 'shipping';
      return state;
    case 'shipping':
      if (event.type === 'PROCEED_TO_PAYMENT') return 'payment';
      return state;
    case 'payment':
      if (event.type === 'SUBMIT_ORDER') return 'confirming';
      return state;
    case 'confirming':
      if (event.type === 'ORDER_SUCCESS') return 'success';
      if (event.type === 'ORDER_FAILED') return 'error';
      return state;
    case 'error':
    case 'success':
      if (event.type === 'RESET') return 'cart_review';
      return state;
    default:
      return state;
  }
}
\`\`\`

**URL State (Next.js App Router):**

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

## 7. Architecture Diagram (ASCII)

\`\`\`
                   State Management Layers

   +-----------------+   +-------------------+   +----------------+
   | Component Tree  |-->| TanStack Query    |-->| Backend API    |
   | (React, Vue)    |   | (Server State)    |   | (REST, GraphQL)|
   |                 |   | - cache           |   |                |
   | local: useState |   | - stale detection |   |                |
   | shared: Zustand |   | - background refetch|  |                |
   +--------+--------+   +---------+---------+   +----------------+
            |                       |
            v                       v
   +--------+--------+   +---------+---------+
   | URL State        |   | Persisted State   |
   | (searchParams)   |   | (localStorage,    |
   | - filters        |   |  IndexedDB)       |
   | - pagination     |   | - preferences     |
   | - selected item  |   | - drafts          |
   +------------------+   +-------------------+
\`\`\`

## 8. Real-World Flow Example

**Scenario:** An e-commerce site with product listing, filtering, cart, and checkout.

1. User navigates to \`/products?category=laptops&sort=price-asc&page=1\`
2. URL state initializes the page — \`useSearchParams\` reads filter values
3. \`useQuery(['products', { category, sort, page }], fetchFn)\` triggers — data may be cached (staleTime: 2 min)
4. If cached and fresh, TanStack Query returns immediately — no network call
5. User changes sort to "rating". \`useFilterParam\` updates URL — Next.js router replaces without navigation
6. \`useEffect\` or the query key change triggers \`refetch\` — TanStack Query shows cached data while fetching fresh
7. User closes the browser, returns 10 minutes later. TanStack Query rehydrates from cache (\`gcTime: 30 min\`), shows data immediately, refetches in background
8. User adds item to cart — Zustand store updates (optimistic), sends POST to API
9. If POST fails, Zustand rolls back and shows error toast
10. User proceeds to checkout — \`useReducer\` manages the multi-step flow: cart review → shipping → payment → confirming → success/error

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ProductFilters {
  category?: string;
  sort?: 'price-asc' | 'price-desc' | 'rating';
  page?: number;
}

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      );
      const res = await fetch(\`/api/products?\${params}\`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json() as Promise<{ items: Product[]; total: number }>;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setOpen: (open: boolean) => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (item) => {
        const existing = get().items.find((i) => i.productId === item.productId);
        if (existing) {
          set({ items: get().items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          )});
        } else {
          set({ items: [...get().items, item] });
        }
      },
      removeItem: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),
      updateQuantity: (productId, quantity) => set({
        items: get().items.map((i) => i.productId === productId ? { ...i, quantity } : i),
      }),
      setOpen: (open) => set({ isOpen: open }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'cart-storage' }
  )
);
\`\`\`

## 10. Real Company Use Cases

- **Shopify** — Admin dashboard uses TanStack Query for all API data. Over 400 query keys, automatic cache invalidation when products/orders update. Zustand for UI state (sidebar, theme, notifications).
- **Linear** — Issues app uses Jotai atoms for fine-grained reactivity. Each issue has its own atom — opening a modal doesn't re-render the entire list.
- **Notion** — Local state is managed via a custom CRDT (Conflict-free Replicated Data Type) for real-time collaboration. Server state and local operations merge via operational transforms.
- **Vercel** — Vercel's dashboard uses Zustand for global UI state and TanStack Query for project/deployment data.
- **Airbnb** — Uses Redux Toolkit for global booking state (date picker, guests, maps). The booking flow is a state machine with explicit transitions.

## 11. Common Interview Questions

- "How would you design the state management for a Trello clone with 10,000+ boards and real-time updates?"
- "What is the difference between server state and client state? Why should they be managed differently?"
- "How does TanStack Query's staleTime differ from gcTime?"
- "Design a state management architecture for a micro-frontend with 3 independent teams."
- "How do you handle optimistic updates with rollback? Give a concrete example."
- "What are the re-render implications of React Context vs Zustand vs TanStack Query?"

## 12. Related Topics & Next Steps

- Micro-Frontends Architecture — state sharing across independent deployments
- Real-Time Frontend Architecture — state synchronization with WebSockets and SSE
- Rendering Patterns — how state hydration works with SSR and streaming
- Web Performance Optimization — avoiding unnecessary re-renders with selector-based subscriptions`,
    estimatedMin: 16,
    difficulty: 'ADVANCED',
    companies: ['Shopify', 'Linear', 'Notion', 'Vercel', 'Airbnb'],
    tags: ['state-management', 'tanstack-query', 'zustand', 'redux', 'jotai', 'server-state', 'client-state'],
  },
  {
    id: 'lesson-09-06',
    slug: 'frontend-performance-06-micro-frontends-architecture',
    title: 'Micro-Frontends Architecture',
    content: `## 1. Quick Summary (AEO Snippet)

**Micro-frontends** extend microservice principles to the frontend: multiple teams independently develop, test, deploy, and own distinct UI fragments that compose into a single application. The key techniques are **module federation** (Webpack 5), **iframe isolation**, **web components**, and **server-side composition**. The hardest challenges are shared dependencies, consistent UX, and cross-team coordination.

## 2. Definition

Micro-frontends are an architectural pattern where a frontend application is decomposed into smaller, independent applications that are owned by separate teams. Each micro-frontend is responsible for a specific business domain (e.g., Product Listing, Cart, Checkout, Recommendations) and can be developed with its own framework, build pipeline, and deployment cadence.

The composition happens at runtime — the host container stitches micro-frontends together on the client (via JavaScript) or on the server (via edge-side includes or iframes).

Contrast with a **monolithic SPA**: one codebase, one team (or many teams in one repo), one deployment that affects the entire application. A monolith breaks down through code ownership, micro-frontends break down through **runtime independence**.

## 3. Why It Exists / Problem It Solves

Large frontend monoliths suffer from:

- **Scaling friction** — 50+ developers committing to the same repo, same build pipeline
- **Framework lock-in** — migrating from Angular to React requires a full rewrite
- **Deployment coupling** — a bug in the footer blocks the entire product page deployment
- **Code ownership ambiguity** — "who owns this component?" with 30+ contributors to a single page
- **Performance cliffs** — one team's heavy dependency (e.g., a charting library) slows the entire application's load time
- **Testing bottlenecks** — full end-to-end test suites take hours

Micro-frontends solve these by treating each domain as a standalone application with its own lifecycle. A team owns "Checkout" end-to-end: they control the UI, API contracts, tests, deployments, and SLAs.

## 4. When to Use It

Consider micro-frontends when:

- **Multiple independent teams** need to contribute to the same product surface
- **Different deployment cadences** — one team ships hourly, another ships weekly
- **Framework migration** — incrementally moving from Angular to React without a rewrite
- **Ownership clarity** — each team has clear domain boundaries (search, recommendations, cart)
- **Independent scaling** — the cart team needs different infrastructure than the product team

Do NOT use micro-frontends for:

- A small team (fewer than 10 frontend developers)
- A simple application (CRUD dashboard, marketing site)
- A startup looking to minimize initial complexity
- Teams that cannot invest in shared design systems and contract testing

## 5. When NOT to Use It / Tradeoffs

Micro-frontends introduce significant complexity:

- **Bundle duplication** — each micro-frontend may include its own React instance, doubling or tripling the total JavaScript
- **Shared dependency management** — React, routing libraries, and design system components must be shared via \`shared\` in module federation or externals
- **Consistent UX** — without a shared design system and strict guidelines, users experience visual and behavioral inconsistencies
- **Cross-team coordination** — shared routes, auth, navigation, and error handling require agreements and integration testing
- **Performance cost** — loading 3+ micro-frontends sequentially on a page increases LCP and TTI
- **Testing complexity** — end-to-end tests must span micro-frontends; integration tests require all MFEs to be running simultaneously

**Key tradeoff: Deploy independence vs integration cost.** Each MFE deploys independently, but the integration (composition, routing, state sharing) requires ongoing investment.

## 6. How It Works (Deep Mechanics)

**Module Federation (Webpack 5):**

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

**Iframe Isolation:** Each MFE runs in its own iframe. Communication via \`postMessage\`. Pros: total framework isolation, style encapsulation, failure isolation. Cons: performance (iframes are heavy), SEO, accessibility.

**Server-Side Composition (Edge Includes):**

\`\`\`html
<esi:include src="https://header.mfe.example.com/header" />
<esi:include src="https://products.mfe.example.com/product/123" />
<esi:include src="https://recommendations.mfe.example.com/sidebar" />
<esi:include src="https://footer.mfe.example.com/footer" />
\`\`\`

**Web Components:** Each MFE exports a custom element (\`<product-card>\`, \`<mini-cart>\`). The host uses standard HTML — framework-agnostic by design. Shadow DOM provides style isolation.

## 7. Architecture Diagram (ASCII)

\`\`\`
                    Micro-Frontend Composition

    +--------------------- HOST CONTAINER ---------------------+
    |                                                          |
    |  +------ HEADER MFE ------+  +--- CART MFE (icon) ---+  |
    |  | Team: Navigation       |  | Team: Cart            |  |
    |  | React 18               |  | Vue 3                 |  |
    |  | Deploys: daily         |  | Deploys: hourly       |  |
    |  +------------------------+  +------------------------+  |
    |                                                          |
    |  +---------------- PRODUCT MFE -----------------------+  |
    |  | Team: Product Listing                              |  |
    |  | Svelte, deploys: weekly                            |  |
    |  | Contains: grid, filters, pagination                |  |
    |  +----------------------------------------------------+  |
    |                                                          |
    |  +--- RECOMMENDATIONS MFE ---+  +--- FOOTER MFE ------+  |
    |  | Team: ML/Personalization  |  | Team: Platform       |  |
    |  | React 18, SSR             |  | Preact, static       |  |
    |  +----------------------------+  +----------------------+  |
    |                                                          |
    +----------------------------------------------------------+
\`\`\`

## 8. Real-World Flow Example

**Scenario:** A large e-commerce platform (like IKEA or Zalando) with 5+ independent teams.

1. User navigates to \`/product/sofa-123\`. The host container loads.
2. Host loads \`remoteEntry.js\` from each MFE concurrently (or lazily — only header, product, and cart on this page)
3. **Header MFE** renders first (static, cached). Renders navigation, search bar, user menu.
4. **Product MFE** (SSR) streams product HTML: title, price, images, specs, add-to-cart button.
5. **Cart MFE** (CSR) loads its bundle — shows current cart count in the header icon.
6. **Recommendations MFE** lazy-loads below the fold — shows personalized suggestions.
7. User clicks "Add to Cart." The Product MFE dispatches a custom event: \`add-to-cart\`.
8. The Cart MFE listens for this event, updates its store, re-renders the cart icon.
9. User navigates to cart — the host loads the Cart MFE (full page version) and Checkout MFE.
10. Each MFE manages its own state, errors, and loading states independently.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
interface MFEModule {
  default: React.ComponentType<{ host?: HostAPI }>;
}

interface HostAPI {
  navigate: (path: string) => void;
  getAuthToken: () => string | null;
  getLocale: () => string;
}

const MFERegistry: Record<string, () => Promise<MFEModule>> = {
  header: () => import('header/HeaderApp'),
  product: () => import('product/ProductApp'),
  cart: () => import('cart/CartApp'),
  checkout: () => import('checkout/CheckoutApp'),
};

const hostAPI: HostAPI = {
  navigate: (path) => { window.history.pushState({}, '', path); },
  getAuthToken: () => localStorage.getItem('auth_token'),
  getLocale: () => navigator.language,
};

function MFELoader({ name, fallback }: { name: keyof typeof MFERegistry; fallback?: React.ReactNode }) {
  const [Module, setModule] = useState<React.ComponentType<{ host?: HostAPI }> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    MFERegistry[name]()
      .then((mod) => setModule(() => mod.default))
      .catch(setError);
  }, [name]);

  if (error) return <ErrorBoundaryFallback error={error} />;
  if (!Module) return fallback || <Skeleton />;
  return <Module host={hostAPI} />;
}

type MFEEvent = 'add-to-cart' | 'user-login' | 'navigation' | 'search';

const mfeBus = {
  emit(event: MFEEvent, detail: unknown) {
    window.dispatchEvent(new CustomEvent(event, { detail }));
  },
  on(event: MFEEvent, handler: EventListener) {
    window.addEventListener(event, handler);
    return () => window.removeEventListener(event, handler);
  },
};
\`\`\`

## 10. Real Company Use Cases

- **IKEA** — Built a micro-frontend platform with 20+ MFEs. Each store section (kitchens, sofas, desks) is an independent application. Module federation for runtime composition, SSR for SEO.
- **Zalando** — Uses server-side composition (Tailor, their own library). Each MFE returns HTML fragments; the orchestrator assembles them. They pioneered this approach at scale.
- **Spotify** — The desktop app uses a custom micro-frontend framework (Cosmos). Each feature (browse, search, library, playlist) is an independent module with its own state and lifecycle.
- **Upwork** — Migrated from a Rails monolith to micro-frontends using module federation. 60+ developers across 12 teams independently deploy their MFEs.
- **DAZN** (sports streaming) — Each sport (NFL, Premier League, Champions League) is a micro-frontend. Teams deploy independently during their respective seasons.

## 11. Common Interview Questions

- "Design a micro-frontend architecture for a large e-commerce platform. How do you handle shared dependencies?"
- "Compare module federation, iframes, and web components for micro-frontend composition."
- "How would you ensure consistent UX across micro-frontends built by 10 different teams?"
- "What are the performance implications of loading 5+ micro-frontends on a single page? How would you optimize?"
- "How do you handle authentication and routing in a micro-frontend architecture?"
- "Your checkout MFE crashes. How do you prevent it from affecting the rest of the application?"

## 12. Related Topics & Next Steps

- State Management at Scale — cross-MFE state sharing patterns
- Frontend System Design vs Backend System Design — how micro-frontends mirror microservices
- Web Performance Optimization — lazy loading, prefetching, and dependency sharing in MFEs
- Module Federation — deep dive into Webpack 5's container plugin`,
    estimatedMin: 16,
    difficulty: 'ADVANCED',
    companies: ['IKEA', 'Zalando', 'Spotify', 'Upwork', 'DAZN'],
    tags: ['micro-frontends', 'module-federation', 'webpack', 'web-components', 'iframes', 'composition'],
  },
  {
    id: 'lesson-09-07',
    slug: 'frontend-performance-07-web-performance-optimization',
    title: 'Web Performance Optimization',
    content: `## 1. Quick Summary (AEO Snippet)

Web performance optimization (WPO) is the practice of reducing load time, improving interactivity, and ensuring visual stability through **bundle optimization, code splitting, lazy loading, resource hints, critical CSS, and efficient rendering**. The goal: LCP < 2.5s, INP < 200ms, CLS < 0.1 on mobile 3G.

## 2. Definition

Web Performance Optimization is a systematic approach to making web applications faster. It spans the entire delivery pipeline:

- **Build time:** Tree shaking, code splitting, minification, compression, scope hoisting
- **Deploy time:** CDN distribution, Brotli/gzip compression, immutable caching
- **Load time:** Critical CSS inlining, preload/preconnect hints, font subsetting, responsive images
- **Runtime:** Lazy loading, virtualization (react-window), debouncing/throttling, passive events, animation optimization (GPU compositing)

Performance is not a feature — it's a constraint that must be designed into the architecture from the start. Retro-fitting performance is exponentially harder than building for it.

## 3. Why It Exists / Problem It Solves

Web applications have grown dramatically in complexity:

- Average web page is **2MB+** (up 300% from 2015)
- JavaScript bundles **500KB-2MB** for typical React apps
- Users expect **sub-2-second loads** — 53% of mobile users abandon sites that take > 3 seconds
- **SEO penalty** — Google uses Core Web Vitals as a ranking signal
- **Revenue impact** — Amazon: 1% revenue per 100ms, Walmart: 2% conversion per 1s improvement
- **Accessibility** — performance disproportionately affects users on low-end devices and slow networks

WPO solves each of these by methodically eliminating waste: unused code, unnecessary network requests, blocking resources, and expensive computations.

## 4. When to Use It

WPO applies to every web application, but the **priority and techniques** vary:

- **E-commerce:** LCP optimization for product images, CLS prevention for ads/embeds
- **Media/News:** Critical CSS for above-fold content, lazy loading for below-fold articles
- **SaaS Dashboard:** INP optimization for interactive charts, bundle splitting for rarely-used features
- **Social/Feed:** Virtual scrolling for infinite lists, incremental loading with IntersectionObserver
- **PWAs:** Service worker caching, background sync, offline fallback

Performance budgets should be defined per-application based on target audience devices, network conditions, and business metrics.

## 5. When NOT to Use It / Tradeoffs

- **Over-optimization** — spending weeks optimizing for 5ms gains that users won't perceive
- **Premature optimization** — complex code splitting before confirming bundle size is a problem
- **Performance theater** — optimizing Lighthouse score without improving real user experience
- **UX tradeoffs** — aggressive lazy loading can cause CLS (layout shifts as content loads)
- **Development cost** — each optimization (code splitting, critical CSS generation, image pipeline) adds build complexity
- **Debugging difficulty** — heavily optimized bundles are harder to debug in production

**Key insight:** Performance optimization follows diminishing returns. The first 80% of gains come from 20% of the effort (bundle analysis, image optimization, code splitting the heavy dependencies). The last 20% requires deep framework knowledge and custom solutions.

## 6. How It Works (Deep Mechanics)

**Bundle Analysis:**
\`\`\`bash
npx vite-bundle-analyzer
npx source-map-explorer dist/assets/*.js
\`\`\`

**Code Splitting Techniques:**
1. Route-based splitting: Each page gets its own chunk. \`lazy(() => import('./pages/ProductPage'))\`
2. Component-level splitting: Heavy components (editor, chart library) load on demand.
3. Library splitting: Move stable libraries (\`react\`, \`lodash\`) to a vendor chunk.
4. Dynamic import with preload: Preload the chunk when user hovers over a link.

\`\`\`typescript
import { lazy, Suspense, ComponentType } from 'react';

function preload(factory: () => Promise<{ default: ComponentType }>) {
  const module = factory();
  return () => module;
}

const ProductPage = lazy(() => import('./pages/ProductPage'));
const preloadProductPage = preload(() => import('./pages/ProductPage'));

function Link({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <a
      href={to}
      onMouseEnter={preloadProductPage}
      onTouchStart={preloadProductPage}
    >
      {children}
    </a>
  );
}
\`\`\`

**Critical CSS Inlining:**
\`\`\`typescript
import critters from 'critters';

const processor = new critters({
  path: 'dist',
  preload: 'media',
  pruneSource: true,
});
const html = await processor.process(originalHtml);
\`\`\`

**Resource Hints:**
\`\`\`html
<link rel="preconnect" href="https://api.example.com" />
<link rel="dns-prefetch" href="https://images.example.com" />
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin />
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />
<link rel="prefetch" href="/products" as="document" />
<link rel="prerender" href="/checkout" />
\`\`\`

**Virtual Scrolling (react-window):**
\`\`\`typescript
import { FixedSizeList } from 'react-window';

function ProductList({ items }: { items: Product[] }) {
  return (
    <FixedSizeList
      height={800}
      width="100%"
      itemCount={items.length}
      itemSize={120}
    >
      {({ index, style }) => (
        <div style={style}>
          <ProductCard product={items[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
\`\`\`

## 7. Architecture Diagram (ASCII)

\`\`\`
                Web Performance Optimization Pipeline

   BUILD                                DEPLOY                         RUNTIME
   +-------------+               +------------------+               +-----------------+
   | Tree shake  |               | CDN distribution |               | Service Worker   |
   | Code split  |               | Brotli compress  |               | Lazy load images |
   | Minify      | --build-->    | Immutable hashes | --serve-->    | Virtual scroll   |
   | Crit. CSS   |               | Cache-Control    |               | IntersectionObs. |
   | Optimize imgs|              | HTTP/3 + push    |               | RAF animations   |
   | Font subset |               | Edge computing   |               | Passive events   |
   +-------------+               +------------------+               +-----------------+
\`\`\`

## 8. Real-World Flow Example

**Scenario:** A user visits an e-commerce product page on a mid-range Android phone over 4G.

1. **DNS + TCP + TLS:** 150ms total. Preconnect to origin and image CDN reduces this to 50ms on repeat visits.
2. **HTML:** Server sends SSR HTML (12KB gzipped). Critical CSS inlined in \`<head>\` — browser starts rendering immediately.
3. **Hero image:** \`<img fetchpriority="high" src="hero.webp" width="1200" height="800">\`. Preloaded via \`<link rel="preload">\`. Loads at 800ms. LCP = 800ms.
4. **JavaScript:** Route-based code splitting. Vendor chunk (React, ReactDOM): 40KB gzipped. Product page chunk: 25KB. Hydration completes at 1.2s.
5. **Below-fold images:** Lazy-loaded via \`loading="lazy"\` with explicit width and height to prevent CLS.
6. **Fonts:** Inter font subsetted for Latin characters. \`font-display: swap\` prevents invisible text (FOIT).
7. **Third-party scripts:** Analytics and chat widgets load after \`onload\` (5s delay). They have \`async\` or \`defer\`.
8. **User scrolls:** Virtualized product list (\`FixedSizeList\`) only renders 10 items regardless of total list size.
9. **User taps "Add to Cart":** Button has a passive event listener (< 1ms). Optimistic UI updates immediately. INP = 35ms.
10. **Result:** LCP = 800ms, INP = 35ms, CLS = 0.02, TTI = 1.2s. Page ranks in top 5% for CWV.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
export function lazyWithPreload<T extends { default: ComponentType }>(factory: () => Promise<T>) {
  const Component = lazy(factory);
  let preloadPromise: Promise<T> | null = null;

  const preload = () => {
    if (!preloadPromise) {
      preloadPromise = factory();
    }
    return preloadPromise;
  };

  return { Component, preload };
}

export function useProgressiveImage({ src, mobileSrc, placeholder, threshold = 200 }: ImageOptions) {
  const [currentSrc, setCurrentSrc] = useState(placeholder || '');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    const isMobile = window.innerWidth < 768;
    const targetSrc = (isMobile && mobileSrc) ? mobileSrc : src;

    img.onload = () => {
      setCurrentSrc(targetSrc);
      setLoaded(true);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          img.src = targetSrc;
          observer.disconnect();
        }
      },
      { rootMargin: \`\${threshold}px\` }
    );

    if (threshold === 0) {
      img.src = targetSrc;
    }

    return () => {
      observer.disconnect();
      img.onload = null;
    };
  }, [src, mobileSrc, placeholder, threshold]);

  return { src: currentSrc, loaded };
}

export function useDebouncedSearch(query: string, delay = 300) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [query, delay]);

  return { results, loading };
}

export function rafThrottle<T extends (...args: unknown[]) => void>(fn: T): T {
  let ticking = false;
  return ((...args: unknown[]) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        fn(...args);
        ticking = false;
      });
      ticking = true;
    }
  }) as T;
}
\`\`\`

## 10. Real Company Use Cases

- **Amazon** — Reduced page load time by 1 second → 1% revenue increase ($1.6B/year). They aggressively optimize images (WebP, AVIF), use predictive prefetching, and inline critical CSS.
- **Pinterest** — Reduced bundle size by 50% via code splitting (react-window, route-based splitting), leading to 40% reduction in wait time and 15% increase in sign-ups.
- **BBC** — Optimized Core Web Vitals by implementing critical CSS inlining, removing render-blocking JS. LCP dropped from 3.2s to 1.4s. Mobile traffic increased 12%.
- **TikTok** — Uses advanced streaming for video content, prefetches the "next" video in the feed while watching the current one.
- **Gov.uk** — Strict performance budget: pages must load in < 1s on 3G. Each page is < 50KB total.

## 11. Common Interview Questions

- "Your React app has a 2MB bundle. Walk through the process of reducing it to 200KB."
- "How would you implement route-based code splitting in Next.js? What about component-level splitting?"
- "What is the difference between \`preload\`, \`prefetch\`, \`preconnect\`, and \`prerender\`?"
- "How does virtual scrolling work? When would you use react-window vs react-virtualized?"
- "Design a performance budget for an e-commerce site. What metrics would you track in CI/CD?"
- "How do you profile and debug a production performance issue?"

## 12. Related Topics & Next Steps

- Core Web Vitals & Performance Metrics — the measurement side of optimization
- Image & Asset Optimization — the #1 lever for LCP improvement
- Caching Strategies for Frontend — how SW, CDN, and memory caching reduce load times
- Rendering Patterns — how CSR, SSR, SSG, and ISR affect performance characteristics`,
    estimatedMin: 16,
    difficulty: 'INTERMEDIATE',
    companies: ['Amazon', 'Pinterest', 'BBC', 'TikTok', 'Gov.uk'],
    tags: ['performance', 'code-splitting', 'lazy-loading', 'bundle-optimization', 'critical-css', 'virtual-scrolling'],
  },
  {
    id: 'lesson-09-08',
    slug: 'frontend-performance-08-image-and-asset-optimization',
    title: 'Image & Asset Optimization',
    content: `## 1. Quick Summary (AEO Snippet)

Images account for **50-70%** of a typical webpage's bytes. Optimization focuses on **modern formats** (WebP, AVIF), **responsive sizing** (\`srcset\` + \`sizes\`), **lazy loading** (\`loading=lazy\` + IntersectionObserver), **CDN-based transforms** (Imgix, Cloudinary), and **caching** (immutable hashes, long max-age). The #1 LCP optimization is the hero image.

## 2. Definition

Image and asset optimization is the practice of delivering the smallest possible file that still looks visually acceptable to the user, by considering:

- **Format:** AVIF (best compression), WebP (widely supported), JPEG/PNG (fallbacks)
- **Dimensions:** Never serve a 2000px image to a 375px mobile viewport
- **Quality:** Reduce quality (80% is often indistinguishable from 100%)
- **Loading:** Critical images load immediately, below-fold images load lazily
- **Caching:** Immutable URLs (\`image-a1b2c3.jpg\`) with long max-age headers
- **CDN transforms:** On-the-fly resizing, format conversion, cropping at the edge

Beyond images, asset optimization covers fonts (subsetting, \`font-display\`), icons (SVG sprites, inline SVGs), video (poster images, lazy loading), and third-party scripts (delayed loading, sandboxed iframes).

## 3. Why It Exists / Problem It Solves

The web is increasingly visual, but images are expensive:

- Average page: **900KB+** in images (HTTP Archive, 2025)
- A single uncompressed hero image: **2-5MB**
- Images cause **Layout Shifts** (CLS) when they load without explicit dimensions
- Images block **LCP** — the largest contentful paint is almost always an image
- Mobile users pay for data — 5MB per page view is expensive in emerging markets

Image optimization solves all of these: smaller files load faster, use less data, and (with proper attributes) don't cause layout shifts. It's the single highest-impact performance optimization for most websites.

## 4. When to Use It

Apply image optimization to:

- **Every image** on every page — there is no case where an unoptimized image is better
- **Hero images** — the LCP element for most pages; aggressive optimization here directly improves Core Web Vitals
- **Product images** — e-commerce sites with hundreds of product photos benefit enormously from CDN-based transforms
- **User-generated content** — profile photos, social media uploads need server-side processing before serving
- **Background images** — CSS \`background-image\` should use responsive image techniques or \`image-set()\`

For fonts: subset to include only the characters your content uses (e.g., Latin-only for English sites). For icons: prefer SVGs (inline or sprite) over icon fonts, which have accessibility and CLS issues.

## 5. When NOT to Use It / Tradeoffs

- **AVIF everywhere** — AVIF decoding is slower than WebP on low-end devices. Use \`<picture>\` with format fallbacks.
- **Over-compression** — at very low quality (30% or below), artifacts become noticeable. Test visually.
- **Over-subsetting fonts** — if you serve East Asian text with a Latin-only subset, characters won't render.
- **CDN dependency** — relying on a real-time image transformation CDN creates a single point of failure.
- **Client-side resizing** — resizing large images in the browser wastes CPU and memory. Always resize server-side or via CDN.
- **Cache invalidation** — if you transform images at request time, CDN caching must handle the many URL variants.

**Key tradeoff: Quality vs file size.** For most products, 80% quality WebP is visually indistinguishable from 100% JPEG at half the size. Test with your specific images.

## 6. How It Works (Deep Mechanics)

**Responsive Images with \`srcset\` and \`sizes\`:**

\`\`\`html
<img
  src="hero-800.jpg"
  srcset="
    hero-480.jpg   480w,
    hero-800.jpg   800w,
    hero-1200.jpg 1200w,
    hero-2000.jpg 2000w
  "
  sizes="
    (max-width: 480px) 100vw,
    (max-width: 1024px) 80vw,
    1200px
  "
  width="1200"
  height="800"
  loading="lazy"
  fetchpriority="auto"
  decoding="async"
  alt="Product hero image"
/>
\`\`\`

**Modern Formats with Fallbacks (\`<picture>\`):**

\`\`\`html
<picture>
  <source srcset="hero.avif" type="image/avif" media="(min-width: 768px)" />
  <source srcset="hero.webp" type="image/webp" />
  <img src="hero.jpg" width="1200" height="800" loading="eager" fetchpriority="high" alt="Hero image" />
</picture>
\`\`\`

**Font Optimization:**
\`\`\`css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 900;
  unicode-range: U+0000-00FF;
}
\`\`\`

**CDN-Based Image Transformation:**
\`\`\`typescript
interface ImageTransform {
  width: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill';
  blur?: number;
}

function buildImageUrl(baseUrl: string, transforms: ImageTransform): string {
  const params = new URLSearchParams({
    w: String(transforms.width),
    q: String(transforms.quality || 80),
    fit: transforms.fit || 'cover',
    fm: transforms.format || 'webp',
  });
  if (transforms.height) params.set('h', String(transforms.height));
  if (transforms.blur) params.set('blur', String(transforms.blur));
  return \`https://images.example.com/\${encodeURIComponent(baseUrl)}?\${params}\`;
}

function ProductImage({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const imageUrl = buildImageUrl(src, {
    width: isMobile ? 480 : 1200,
    quality: 80,
    format: 'webp',
  });
  return (
    <img
      src={imageUrl}
      width={isMobile ? 480 : 1200}
      height={Math.round((isMobile ? 480 : 1200) * 0.75)}
      loading={priority ? 'eager' : 'lazy'}
      fetchpriority={priority ? 'high' : 'auto'}
      decoding="async"
      alt={alt}
    />
  );
}
\`\`\`

## 7. Architecture Diagram (ASCII)

\`\`\`
                  Image Delivery Pipeline

   UPLOAD                         STORAGE                     DELIVERY
   +-------------+               +-------------+             +--------------+
   | User uploads|               | Object Store|             | Image CDN    |
   | image.jpg   | --store-->    | (S3, R2)    | --fetch-->  | (Cloudinary, |
   | 5MB         |               | original    |             |  Imgix)      |
   +------+------+               +-------------+             +------+-------+
          |                                                         |
          v                                                         v
   +------+------+                                         +-------+--------+
   | Server-side |                                         | Transform at   |
   | Validate    |                                         | request time:  |
   | Sanitize    |                                         | Resize, Format |
   | Gen. hash   |                                         | Quality, Crop  |
   | Store       |                                         | Blur/effects   |
   +-------------+                                         +-------+--------+
                                                                    |
                                          CDN Cache (per URL)       |
                                          +-------------------------+
\`\`\`

## 8. Real-World Flow Example

**Scenario:** A user browses an e-commerce clothing store. Each page has 20-60 product images.

1. **Upload:** Merchants upload original photos (4000x3000px, ~8MB each) to the CMS.
2. **Server processing:** Upload triggers a serverless function that generates 5 variants per image (480w, 800w, 1200w, 2000w, blur placeholder ~20px), converts to WebP (80% quality), stores in S3 with content-hashed filename.
3. **Page render:** The product listing page renders 20 product cards. Each card uses \`<img loading="lazy" srcset="...480.webp 480w, ...800.webp 800w, ...1200.webp 1200w">\`. First 2 visible images have \`loading="eager"\`.
4. **CDN delivery:** All images served from CloudFront. Cache hit ratio: 97%.
5. **Mobile user (375px viewport):** Browser picks the 480w WebP variant (~25KB per image). Total: ~500KB (vs 10MB+ without optimization).
6. **Desktop user (1920px viewport):** Browser picks the 1200w WebP variant (~80KB per image).
7. **LCP:** The first visible product image is preloaded (\`<link rel="preload">\`), loads at 600ms. LCP = 600ms.
8. **Offline:** Service worker serves cached images on repeat visits.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
function OptimizedImage({
  src,
  alt,
  widths = [480, 800, 1200, 2000],
  aspectRatio = 16 / 9,
  priority = false,
  className,
}: OptimizedImageProps) {
  const imageBase = 'https://images.example.com';
  const encodedSrc = encodeURIComponent(src);

  const srcSet = widths
    .map((w) => \`\${imageBase}/\${encodedSrc}?w=\${w}&q=80&fm=webp \${w}w\`)
    .join(', ');

  const defaultSrc = \`\${imageBase}/\${encodedSrc}?w=\${widths[1]}&q=80&fm=webp\`;
  const height = Math.round(widths[1] / aspectRatio);

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

function ProgressiveImage({ lowQualitySrc, highQualitySrc, alt, width, height }: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const handleLoad = useCallback(() => setLoaded(true), []);

  return (
    <div style={{ position: 'relative', width, height }}>
      <img
        src={lowQualitySrc}
        alt=""
        width={width}
        height={height}
        style={{
          filter: 'blur(20px)',
          transform: 'scale(1.1)',
          transition: 'opacity 0.5s',
          opacity: loaded ? 0 : 1,
          position: 'absolute',
          inset: 0,
        }}
      />
      <img
        src={highQualitySrc}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        onLoad={handleLoad}
        style={{
          transition: 'opacity 0.5s',
          opacity: loaded ? 1 : 0,
          position: 'absolute',
          inset: 0,
        }}
      />
    </div>
  );
}
\`\`\`

## 10. Real Company Use Cases

- **Etsy** — Saved 30% bandwidth by switching to WebP with AVIF support via \`<picture>\`. Their CDN (Fastly) converts images on the fly based on the browser's Accept header.
- **Airbnb** — Uses a custom image pipeline (Spectrum) that generates 15+ variants per photo, from 20px blur placeholder to 4000px original. Image CDN (Imgix) handles real-time transforms for user-uploaded photos.
- **Medium** — Pioneered the blur-up placeholder technique. Tiny 20px-wide JPEG (base64 inlined in HTML) blurs in, then transitions to full resolution.
- **TikTok** — Video thumbnail images are aggressively optimized (AVIF at 60% quality for thumbnails, 80% for full-res).
- **The New York Times** — Uses responsive images with manual cropping for art-directed photos. Their custom image CDN serves 100M+ image requests per day.

## 11. Common Interview Questions

- "How would you optimize the images on an e-commerce site with 1M+ products?"
- "Explain the difference between \`srcset\` and \`picture\`. When would you use each?"
- "What image formats should you serve in 2025? How do you handle browser fallbacks?"
- "How do images affect LCP? Walk through the optimization steps for a hero image."
- "Design an image upload and processing pipeline that can handle 10,000 concurrent uploads."
- "How would you implement progressive image loading without a third-party library?"

## 12. Related Topics & Next Steps

- Web Performance Optimization — the broader context for image optimization
- Core Web Vitals & Performance Metrics — how images affect LCP, CLS, and FCP
- Caching Strategies for Frontend — CDN image caching with immutable URLs
- Rendering Patterns — how SSR/SSG handle image optimization pipelines`,
    estimatedMin: 14,
    difficulty: 'BEGINNER',
    companies: ['Etsy', 'Airbnb', 'Medium', 'TikTok', 'New York Times'],
    tags: ['image-optimization', 'webp', 'avif', 'srcset', 'lazy-loading', 'cdn', 'fonts', 'responsive-images'],
  },
  {
    id: 'lesson-09-09',
    slug: 'frontend-performance-09-real-time-frontend-architecture',
    title: 'Real-Time Frontend Architecture',
    content: `## 1. Quick Summary (AEO Snippet)

Real-time frontend architecture enables **live updates** without user refresh via **WebSockets** (bidirectional, persistent), **Server-Sent Events** (server-to-client streaming), and **WebTransport** (HTTP/3-based, low-latency). The critical patterns are: optimistic updates, conflict resolution (CRDTs/OT), reconnection with state reconciliation, and fallback to HTTP polling.

## 2. Definition

Real-time frontend architecture refers to systems where data updates propagate to the user interface within milliseconds (or seconds at most) of the server-side change, without requiring manual refresh or polling.

Core technologies:

- **WebSockets:** Full-duplex persistent connection over TCP. Best for bidirectional communication (chat, collaboration, live cursors). Native browser API with libraries like Socket.IO, ws, Phoenix Channels.
- **Server-Sent Events (SSE):** Server-to-client streaming over HTTP. Simpler than WebSockets (standard HTTP), auto-reconnects natively. Best for one-way updates (notifications, price feeds, logs).
- **WebTransport:** Built on HTTP/3 and QUIC. Lower latency than WebSockets, supports unreliable (UDP-like) and reliable streams. Still emerging (Chrome 97+, limited adoption).
- **Long Polling:** Client sends request, server holds the response until data is available or timeout. Fallback when WebSockets/SSE aren't available. Inefficient but universal.

## 3. Why It Exists / Problem It Solves

Traditional HTTP is request-response — the server can't push data to the client. This creates problems for:

- **Collaboration** — multiple users editing the same document (Google Docs, Figma)
- **Live dashboards** — monitoring systems, stock tickers, sports scores
- **Social feeds** — new posts, notifications, likes appearing instantly
- **Real-time gaming** — multiplayer state synchronization every 50ms
- **IoT dashboards** — sensor data streaming at high frequency

Before real-time protocols, developers used HTTP polling (client requests every N seconds), which wasted bandwidth, increased server load, and introduced latency proportional to the polling interval.

## 4. When to Use It

| Protocol | Latency | Use Case | Example |
|----------|---------|----------|---------|
| **WebSocket** | < 50ms | Bidirectional, high-frequency | Chat, collaboration, gaming |
| **SSE** | < 200ms | Server-to-client streaming | Notifications, price feeds, logs |
| **WebTransport** | < 10ms | Ultra-low latency, unreliable streams | Gaming, real-time audio/video |
| **Long Polling** | 1-5s | Fallback when WS/SSE blocked | Legacy enterprise proxies |

**Decision criteria:**
- If you need client-to-server streaming (chat messages, cursor positions) → WebSocket
- If server pushes updates but client only sends occasional requests → SSE (simpler, cheaper)
- If you need the lowest possible latency and can use HTTP/3 → WebTransport
- If you support users on restrictive networks (corporate proxies that block WS) → Long polling fallback

## 5. When NOT to Use It / Tradeoffs

- **WebSockets at scale** — every open connection consumes server memory (10KB-50KB per connection). 1M concurrent connections requires careful architecture (horizontal scaling, sticky sessions, Redis pub/sub).
- **SSE limitations** — no client-to-server streaming, limited to 6 concurrent connections per origin (HTTP/1.1), browser support gaps (no IE).
- **Reconnection complexity** — WebSockets don't auto-reconnect. You must implement reconnection with exponential backoff, message replay, and state reconciliation.
- **State synchronization** — with multiple clients, ensuring all see the same state requires consensus or CRDTs. Conflict resolution is hard.
- **Fallback code paths** — you must maintain both WebSocket and long-polling implementations.
- **Mobile battery drain** — persistent connections keep the radio active. On mobile, consider using Web Push notifications instead.

## 6. How It Works (Deep Mechanics)

**WebSocket Handshake:**
1. Client sends HTTP upgrade request: \`GET /ws HTTP/1.1\` with \`Upgrade: websocket\`
2. Server responds with \`101 Switching Protocols\`
3. Connection upgrades from HTTP to WebSocket — persistent, full-duplex
4. Framing: WebSocket protocol has its own framing (text, binary, ping/pong, close)
5. Ping/pong keeps the connection alive (idle timeout detection)

\`\`\`typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private maxRetries = 10;
  private retryCount = 0;
  private retryDelay = 1000;
  private messageQueue: string[] = [];
  private listeners: Set<(data: unknown) => void> = new Set();

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.retryCount = 0;
      this.retryDelay = 1000;
      while (this.messageQueue.length > 0) {
        this.ws!.send(this.messageQueue.shift()!);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach((fn) => fn(data));
      } catch { }
    };

    this.ws.onclose = (event) => {
      if (!event.wasClean && this.retryCount < this.maxRetries) {
        setTimeout(() => {
          this.retryCount++;
          this.retryDelay *= 2;
          this.connect();
        }, this.retryDelay);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.messageQueue.push(JSON.stringify(data));
    }
  }

  subscribe(fn: (data: unknown) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  close() {
    this.maxRetries = 0;
    this.ws?.close();
  }
}
\`\`\`

**Server-Sent Events:**

\`\`\`typescript
function useSSE<T>(url: string): { data: T | null; connected: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => setConnected(true);
    eventSource.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };
    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [url]);

  return { data, connected };
}
\`\`\`

**Conflict Resolution (CRDTs):**

\`\`\`typescript
interface Char {
  id: string;
  position: number[];
  value: string;
  deleted?: boolean;
}

class CRDTDocument {
  private chars: Char[] = [];
  private siteId: string;

  constructor(siteId: string) {
    this.siteId = siteId;
  }

  insert(index: number, value: string) {
    const before = this.chars[index - 1]?.position || [0];
    const after = this.chars[index]?.position || [Number.MAX_SAFE_INTEGER];
    const position = this.generatePosition(before, after);

    const char: Char = {
      id: \`\${this.siteId}-\${Date.now()}-\${Math.random()}\`,
      position,
      value,
    };
    this.chars.splice(index, 0, char);
    return char;
  }

  delete(index: number) {
    if (this.chars[index]) {
      this.chars[index].deleted = true;
    }
  }

  applyRemote(remoteChar: Char) {
    const insertAt = this.chars.findIndex(
      (c) => comparePositions(c.position, remoteChar.position) > 0
    );
    if (insertAt === -1) {
      this.chars.push(remoteChar);
    } else {
      this.chars.splice(insertAt, 0, remoteChar);
    }
  }

  private generatePosition(before: number[], after: number[]): number[] {
    const result: number[] = [];
    for (let i = 0; i < Math.max(before.length, after.length); i++) {
      const b = before[i] || 0;
      const a = after[i] || Number.MAX_SAFE_INTEGER;
      if (a - b > 1) {
        result.push(Math.floor((b + a) / 2));
        return result;
      }
      result.push(b);
    }
    result.push(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    return result;
  }

  getText(): string {
    return this.chars.filter((c) => !c.deleted).map((c) => c.value).join('');
  }
}

function comparePositions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
\`\`\`

## 7. Architecture Diagram (ASCII)

\`\`\`
                    Real-Time Frontend Architecture

    +---------+        WebSocket / SSE         +----------+
    | Client  |<===============================>| Edge/WSS |
    | Browser |                                 | Gateway  |
    |         |   +-----------+   +-----------+  | (WS      |
    | UI      |-->| Optimistic|-->| State     |--|  load    |
    | Components|  | Update    |   | Sync      |  |  balancer)|
    |         |   +-----------+   +-----------+  +-----+----+
    +---------+         |                              |
                        v                              v
                  +-----------+                +------+------+
                  | Reconnect |                | Redis Pub/Sub|
                  | + Retry   |                | (Message    |
                  | Queue     |                |  Broker)    |
                  +-----------+                +------+------+
                                                       |
                                                       v
                                                +------+------+
                                                | Application |
                                                | Services    |
                                                +-------------+

    Fallback: Long polling via HTTP
    Conflict resolution: CRDT or OT
\`\`\`

## 8. Real-World Flow Example

**Scenario:** A collaborative document editor (Google Docs-style) with two users editing simultaneously.

1. **Connection:** User A opens the document. Frontend opens a WebSocket to \`wss://collab.example.com/doc/abc123\`.
2. **Initial state:** Server sends full document state (CRDT character array) and current cursor positions.
3. **User A types 'H':** Frontend applies locally (optimistic), renders immediately. Character pushed via WebSocket with its CRDT position.
4. **Server receives 'H':** Validates, broadcasts to all other clients (User B), persists to DB.
5. **User B receives 'H':** CRDT insertion at correct position. React re-renders. User B sees User A's character appear.
6. **Conflicting edit:** User A types 'X' at position 5, User B types 'Y' at position 5 simultaneously. CRDTs are commutative — both clients converge to same state.
7. **Reconnection:** User B's network drops. \`ReconnectingWebSocket\` retries with exponential backoff. Edits queued locally. Connection restored after 3 seconds. Queued edits sent. Server sends state since last acknowledged sequence number.
8. **Latency optimization:** Cursor positions sent via WebSocket every 50ms (throttled). Character edits sent immediately with 200ms debounce for batch coalescing.
9. **Fallback:** User behind corporate proxy. App falls back to SSE for receiving updates, HTTP POST for sending changes.

## 9. Reference Implementation Example (TypeScript)

\`\`\`typescript
function useRealtimeChannel(url: string) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null);
  const wsRef = useRef<ReconnectingWebSocket | null>(null);
  const handlerRef = useRef<((msg: RealtimeMessage) => void) | null>(null);

  useEffect(() => {
    const ws = new ReconnectingWebSocket(url);
    wsRef.current = ws;

    ws.subscribe((data) => {
      const msg = data as RealtimeMessage;
      setLastMessage(msg);
      handlerRef.current?.(msg);
    });

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [url]);

  const send = useCallback((type: string, payload: unknown) => {
    wsRef.current?.send({ type, payload, timestamp: Date.now() });
  }, []);

  const onMessage = useCallback((handler: (msg: RealtimeMessage) => void) => {
    handlerRef.current = handler;
  }, []);

  return { status, lastMessage, send, onMessage };
}

// Collaborative document editor
function CollabEditor({ documentId }: { documentId: string }) {
  const [text, setText] = useState('');
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const docRef = useRef(new CRDTDocument(nanoid()));
  const { send, onMessage } = useRealtimeChannel(\`wss://collab.example.com/doc/\${documentId}\`);

  useEffect(() => {
    onMessage((msg) => {
      switch (msg.type) {
        case 'init': {
          const { chars, cursors: remoteCursors } = msg.payload as { chars: Char[]; cursors: RemoteCursor[] };
          chars.forEach((c) => docRef.current.applyRemote(c));
          setText(docRef.current.getText());
          setCursors(remoteCursors);
          break;
        }
        case 'insert': {
          const char = msg.payload as Char;
          docRef.current.applyRemote(char);
          setText(docRef.current.getText());
          break;
        }
        case 'delete': {
          const { index } = msg.payload as { index: number };
          docRef.current.delete(index);
          setText(docRef.current.getText());
          break;
        }
        case 'cursor': {
          const cursor = msg.payload as RemoteCursor;
          setCursors((prev) => [...prev.filter((c) => c.userId !== cursor.userId), cursor]);
          break;
        }
      }
    });
  }, [onMessage]);

  return (
    <div className="collab-editor">
      <textarea value={text} onChange={handleChange} className="w-full h-96 p-4 border rounded" />
    </div>
  );
}
\`\`\`

## 10. Real Company Use Cases

- **Google Docs** — Uses Operational Transformation (OT) for real-time collaboration. Millions of concurrent users editing documents simultaneously. WebSocket-based with long-polling fallback.
- **Figma** — Uses CRDTs for collaborative design. Every vector, layer, and property is a CRDT. Changes synchronized via WebSocket with WebTransport for high-frequency cursor updates.
- **Slack** — WebSocket-based real-time messaging. Each workspace has a persistent connection. Messages, reactions, and typing indicators pushed instantly. Fallback to SSE for restricted networks.
- **Twitter/X** — Real-time timeline updates use SSE (not WebSockets). New tweets appear without refresh. SSE connection auto-reconnects on network interruption.
- **TradingView** — Real-time stock prices via WebSocket. 10,000+ symbols update every 100ms. Binary WebSocket protocol (not JSON) for efficiency. WebTransport being evaluated for lower latency.

## 11. Common Interview Questions

- "Design a real-time collaborative document editor. How do you handle conflicts?"
- "Compare WebSockets, SSE, and WebTransport. When would you use each?"
- "How would you design a real-time notification system for 10M+ users?"
- "What is a CRDT? How does it differ from Operational Transformation?"
- "How do you handle reconnection in a WebSocket-based application? What state must be reconciled?"
- "Design a live cursor presence system for a collaborative editor with 100+ concurrent users."

## 12. Related Topics & Next Steps

- State Management at Scale — how real-time state sync differs from traditional client state
- Micro-Frontends Architecture — real-time communication across independent MFEs
- Caching Strategies for Frontend — how SW caching interacts with real-time data streams
- Web Performance Optimization — optimizing real-time data delivery with binary protocols`,
    estimatedMin: 16,
    difficulty: 'ADVANCED',
    companies: ['Google', 'Figma', 'Slack', 'Twitter', 'TradingView'],
    tags: ['websockets', 'sse', 'webtransport', 'crdt', 'real-time', 'collaboration', 'conflict-resolution'],
  },
];
