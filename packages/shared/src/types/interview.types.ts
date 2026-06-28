export interface RubricCriteria {
  id: string;
  name: string;
  weight: number;
  hint: string;
}

export interface EvaluatedRubricCriteria extends RubricCriteria {
  passed: boolean;
  score: number;
}

export interface AnalyzedIssue {
  nodeId: string;
  nodeLabel: string;
  category: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface InterviewScoreResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  results: EvaluatedRubricCriteria[];
  missed: EvaluatedRubricCriteria[];
  issues: AnalyzedIssue[];
  aiFeedback: string;
  aiScores: Record<string, number>;
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
