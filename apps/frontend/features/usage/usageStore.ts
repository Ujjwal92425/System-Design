import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const DEFAULT_CANVAS_LIMIT = 2;
export const DEFAULT_INTERVIEW_LIMIT = 2;

interface UsageStoreState {
  canvasCount: number;
  canvasLimit: number;
  interviewCount: number;
  interviewLimit: number;
}

interface UsageStoreActions {
  setUsage: (data: { canvasCount: number; canvasLimit: number; interviewCount: number; interviewLimit: number }) => void;
  incrementCanvas: () => void;
  incrementInterview: () => void;
}

type UsageStore = UsageStoreState & UsageStoreActions;

export const useUsageStore = create<UsageStore>()(
  persist(
    (set) => ({
      canvasCount: 0,
      canvasLimit: DEFAULT_CANVAS_LIMIT,
      interviewCount: 0,
      interviewLimit: DEFAULT_INTERVIEW_LIMIT,
      setUsage: (data) => set({ ...data }),
      incrementCanvas: () => set((s) => ({ canvasCount: s.canvasCount + 1 })),
      incrementInterview: () => set((s) => ({ interviewCount: s.interviewCount + 1 })),
    }),
    {
      name: 'usage-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
