'use client';

import { useState } from 'react';
import { api } from '../../lib/api';

export interface QuestionResult {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface QuizAttemptResult {
  score: number;
  passed: boolean;
  passingScore: number;
  questions: QuestionResult[];
}

export function useQuiz(quizId: string) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitAttempt = async (answers: Record<string, string>) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post(`/learn/quizzes/${quizId}/attempt`, { answers });
      setResult(res.data.data);
      return res.data.data as QuizAttemptResult;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit quiz');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setResult(null);
    setError(null);
  };

  return { submitting, result, error, submitAttempt, resetQuiz };
}
