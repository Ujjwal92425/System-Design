'use client';

import { useState } from 'react';
import { useQuiz } from '../../features/learn/useQuiz';
import { Check, X, AlertCircle, RefreshCw } from 'lucide-react';

export interface Question {
  id: string;
  type: string;
  content: string;
  options: any; // string[]
  correctAnswer: string;
  explanation: string;
  order: number;
}

export interface Quiz {
  id: string;
  title: string;
  passingScore: number;
  isRequired: boolean;
  questions: Question[];
}

interface QuizBlockProps {
  quiz: Quiz;
  onSuccess?: () => void;
}

export function QuizBlock({ quiz, onSuccess }: QuizBlockProps) {
  const { submitting, result, error, submitAttempt, resetQuiz } = useQuiz(quiz.id);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleOptionSelect = (questionId: string, option: string) => {
    if (result) return; // Prevent selection after submission
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
    setValidationError(null);
  };

  const handleSubmit = async () => {
    if (result) return;

    // Verify all questions are answered
    const unanswered = quiz.questions.filter(q => !selectedAnswers[q.id]);
    if (unanswered.length > 0) {
      setValidationError(`Please answer all ${quiz.questions.length} questions before submitting.`);
      return;
    }

    const res = await submitAttempt(selectedAnswers);
    if (res?.passed && onSuccess) {
      onSuccess();
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setValidationError(null);
    resetQuiz();
  };

  const parsedOptions = (options: any): string[] => {
    if (Array.isArray(options)) return options;
    try {
      if (typeof options === 'string') {
        return JSON.parse(options);
      }
    } catch (e) {}
    return [];
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '28px',
      marginTop: '40px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-amber)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            LESSON CHECKPOINT
          </span>
          <h3 className="bricolage" style={{ fontSize: '20px', color: 'var(--text-primary)', marginTop: '4px', margin: 0 }}>
            {quiz.title}
          </h3>
        </div>
        <div className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Min. Score: {quiz.passingScore}%
        </div>
      </div>

      {/* Questions list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {quiz.questions.map((q, idx) => {
          const optionsList = parsedOptions(q.options);
          const userAnswer = selectedAnswers[q.id];
          const questionResult = result?.questions.find(qr => qr.questionId === q.id);

          return (
            <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="mono" style={{ fontSize: '14px', color: 'var(--accent-amber)', fontWeight: 600 }}>
                  Q{idx + 1}.
                </span>
                <p style={{ fontSize: '15px', color: 'var(--text-primary)', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                  {q.content}
                </p>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '28px' }}>
                {optionsList.map((option) => {
                  const isSelected = userAnswer === option;
                  const isCorrect = q.correctAnswer === option;
                  const showFeedback = !!result;

                  let optionStyle: React.CSSProperties = {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    cursor: showFeedback ? 'default' : 'pointer',
                    transition: 'all 200ms ease'
                  };

                  if (!showFeedback && isSelected) {
                    optionStyle.border = '1px solid var(--accent-amber)';
                    optionStyle.background = 'rgba(232,160,69,0.04)';
                    optionStyle.color = 'var(--text-primary)';
                  } else if (showFeedback) {
                    if (isCorrect) {
                      // Correct option always highlighted green
                      optionStyle.border = '1px solid var(--accent-green)';
                      optionStyle.background = 'rgba(54,201,142,0.06)';
                      optionStyle.color = 'var(--text-primary)';
                    } else if (isSelected && !isCorrect) {
                      // User selected incorrect option highlighted red
                      optionStyle.border = '1px solid #FF4D4D';
                      optionStyle.background = 'rgba(255,77,77,0.06)';
                      optionStyle.color = 'var(--text-primary)';
                    }
                  }

                  return (
                    <div
                      key={option}
                      style={optionStyle}
                      onClick={() => handleOptionSelect(q.id, option)}
                      onMouseOver={(e) => {
                        if (!showFeedback && !isSelected) {
                          e.currentTarget.style.border = '1px solid var(--border-bright)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!showFeedback && !isSelected) {
                          e.currentTarget.style.border = '1px solid var(--border)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      <span>{option}</span>
                      {showFeedback && (
                        <div>
                          {isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                          {isSelected && !isCorrect && <X className="w-4 h-4 text-red-500" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation (shown after submission) */}
              {result && q.explanation && (
                <div style={{
                  marginLeft: '28px',
                  marginTop: '8px',
                  background: 'var(--bg-elevated)',
                  borderLeft: `3px solid ${questionResult?.isCorrect ? 'var(--accent-green)' : 'var(--accent-amber)'}`,
                  padding: '12px 16px',
                  borderRadius: '0 8px 8px 0',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5
                }}>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                    Explanation:
                  </strong>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation/API error message */}
      {(validationError || error) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#FF4D4D',
          background: 'rgba(255,77,77,0.05)',
          border: '1px solid rgba(255,77,77,0.15)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px'
        }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{validationError || error}</span>
        </div>
      )}

      {/* Footer / Results */}
      <div style={{
        borderTop: '1px solid var(--border)',
        paddingTop: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        {result ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: result.passed ? 'rgba(54,201,142,0.1)' : 'rgba(255,77,77,0.1)',
                border: `1px solid ${result.passed ? 'var(--accent-green)' : '#FF4D4D'}`
              }}>
                <span className="bricolage" style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: result.passed ? 'var(--accent-green)' : '#FF4D4D'
                }}>
                  {Math.round(result.score)}%
                </span>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>
                  {result.passed ? 'Passed Checkpoint!' : 'Checkpoint Failed'}
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  {result.passed ? 'Lesson complete and progress updated.' : `Passing score is ${result.passingScore}%. Try again.`}
                </p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Quiz</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                background: 'var(--accent-amber)',
                color: 'var(--text-inverse)',
                border: 'none',
                borderRadius: '8px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                opacity: submitting ? 0.7 : 1,
                transition: 'opacity 200ms ease'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Answers'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
