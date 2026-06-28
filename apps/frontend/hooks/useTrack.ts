'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '../lib/analytics';

export function useTrack() {
  const pathname = usePathname();

  const track = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      analytics.track(event, { page: pathname, ...properties });
    },
    [pathname],
  );

  const trackClick = useCallback(
    (label: string, properties?: Record<string, unknown>) => {
      analytics.trackClick(label, { page: pathname, ...properties });
    },
    [pathname],
  );

  return { track, trackClick };
}
