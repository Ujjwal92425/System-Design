import type {
  TrackSummary,
  TrackDetail,
  ModuleWithLessons,
  LessonListItem,
  LessonDetail,
} from '@/features/learn/useLearn';

export type {
  TrackSummary,
  TrackDetail,
  ModuleWithLessons,
  LessonListItem,
  LessonDetail,
};

export interface CurriculumData {
  tracks: TrackSummary[];
  trackDetails: Record<string, TrackDetail>;
  lessonDetails: Record<string, LessonDetail>;
}
