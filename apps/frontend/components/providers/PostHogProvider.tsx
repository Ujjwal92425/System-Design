'use client';

import { Suspense, useEffect } from 'react';
import PostHog from 'posthog-js';
import { usePathname, useSearchParams } from 'next/navigation';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

let initialized = false;

function initPostHog() {
  if (initialized || !POSTHOG_KEY) return;
  try {
    PostHog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      autocapture: true,
      loaded: () => {
        initialized = true;
      },
    });
  } catch {
    // Silently fail — PostHog is optional
  }
}

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!initialized || !POSTHOG_KEY) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    PostHog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

function AnalyticsTracker() {
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    const handleClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target !== document.body) {
        const eventName = target.getAttribute('data-track');
        if (eventName) {
          const props: Record<string, string> = {};
          for (const attr of target.attributes) {
            if (attr.name.startsWith('data-track-')) {
              props[attr.name.slice(12)] = attr.value;
            }
          }
          PostHog.capture(eventName, props);
          return;
        }
        target = target.parentElement;
      }
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, []);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <AnalyticsTracker />
      {children}
    </>
  );
}

export function usePostHog() {
  return PostHog;
}
