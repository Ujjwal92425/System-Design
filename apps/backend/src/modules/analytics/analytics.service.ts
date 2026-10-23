import { PostHog } from 'posthog-node';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (client) return client;
  if (!env.POSTHOG_API_KEY) return null;
  try {
    client = new PostHog(env.POSTHOG_API_KEY, {
      host: env.POSTHOG_HOST || 'https://app.posthog.com',
    });
  } catch (err) {
    logger.error({ err }, 'Failed to initialize PostHog client');
  }
  return client;
}

export const analyticsService = {
  track(distinctId: string, event: string, properties?: Record<string, unknown>) {
    const c = getClient();
    if (!c) return;
    try {
      c.capture({
        distinctId,
        event,
        properties: { ...properties, source: 'backend' },
      });
    } catch (err) {
      logger.error({ err, event }, 'Failed to track PostHog event');
    }
  },

  identify(distinctId: string, traits: Record<string, unknown>) {
    const c = getClient();
    if (!c) return;
    try {
      c.identify({
        distinctId,
        properties: traits,
      });
    } catch (err) {
      logger.error({ err }, 'Failed to identify user in PostHog');
    }
  },

  async shutdown() {
    if (client) {
      await client.shutdown();
      client = null;
    }
  },
};
