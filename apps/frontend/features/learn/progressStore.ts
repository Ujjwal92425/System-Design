import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type LessonStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';

interface LessonProgress {
  status: LessonStatus;
  completedAt?: number;
}

interface ProgressStoreState {
  lessonStatuses: Record<string, LessonProgress>;
}

interface ProgressStoreActions {
  updateLessonStatus: (lessonId: string, status: LessonStatus) => void;
}

type ProgressStore = ProgressStoreState & ProgressStoreActions;

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      lessonStatuses: {},
      updateLessonStatus: (lessonId, status) =>
        set((state) => ({
          lessonStatuses: {
            ...state.lessonStatuses,
            [lessonId]: {
              status,
              ...(status === 'COMPLETE' ? { completedAt: Date.now() } : {}),
            },
          },
        })),
    }),
    {
      name: 'progress-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
