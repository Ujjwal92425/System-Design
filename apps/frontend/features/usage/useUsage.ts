import { useEffect } from 'react';
import { useUsageStore } from './usageStore';
import { api } from '../../lib/api';

export interface UsageInfo {
  canvasCount: number;
  canvasLimit: number;
  canvasRemaining: number;
  canvasExceeded: boolean;
  interviewCount: number;
  interviewLimit: number;
  interviewRemaining: number;
  interviewExceeded: boolean;
}

export function useUsage(): UsageInfo {
  const store = useUsageStore();

  useEffect(() => {
    api.get('/usage')
      .then((res) => {
        const data = res.data?.data;
        if (data) store.setUsage(data);
      })
      .catch(() => {
        // Silently fail — the persisted store has the last known values
      });
  }, []);

  return {
    canvasCount: store.canvasCount,
    canvasLimit: store.canvasLimit,
    canvasRemaining: Math.max(0, store.canvasLimit - store.canvasCount),
    canvasExceeded: store.canvasCount >= store.canvasLimit,
    interviewCount: store.interviewCount,
    interviewLimit: store.interviewLimit,
    interviewRemaining: Math.max(0, store.interviewLimit - store.interviewCount),
    interviewExceeded: store.interviewCount >= store.interviewLimit,
  };
}

export const incrementCanvas = () => useUsageStore.getState().incrementCanvas();
export const incrementInterview = () => useUsageStore.getState().incrementInterview();
