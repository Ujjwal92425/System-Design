import PostHog from 'posthog-js';

const enabled = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

function getDistinctId(): string | undefined {
  try {
    return PostHog.get_distinct_id();
  } catch {
    return undefined;
  }
}

export const analytics = {
  identify(userId: string, traits?: Record<string, unknown>) {
    if (!enabled) return;
    PostHog.identify(userId, traits);
  },

  reset() {
    if (!enabled) return;
    PostHog.reset();
  },

  track(event: string, properties?: Record<string, unknown>) {
    if (!enabled) return;
    PostHog.capture(event, properties);
  },

  trackClick(label: string, properties?: Record<string, unknown>) {
    if (!enabled) return;
    PostHog.capture('$click', { label, ...properties });
  },

  trackNavigation(from: string, to: string) {
    if (!enabled) return;
    PostHog.capture('$navigation', { from, to });
  },

  trackError(code: string, message: string, properties?: Record<string, unknown>) {
    if (!enabled) return;
    PostHog.capture('$error', { code, message, ...properties });
  },

  getDistinctId,
};
