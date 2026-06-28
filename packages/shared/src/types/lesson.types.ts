export interface Track {
  id: string;
  slug: string;
  name: string;
  description: string;
  level: number;
  order: number;
}

export interface Module {
  id: string;
  trackId: string;
  name: string;
  description: string;
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  content: string; // MDX
  order: number;
  estimatedMin: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
