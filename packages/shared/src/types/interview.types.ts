export interface RubricCriteria {
  id: string;
  name: string;
  weight: number;
  hint: string;
}

export interface InterviewPrompt {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  difficulty: string;
  timeLimitMin: number;
  rubric: RubricCriteria[];
}
