'use client';

import { useState, useCallback, memo } from 'react';
import { CanvasNode, CanvasEdge } from '@/features/canvas/useCanvasStore';
import { api } from '@/lib/api';
import { cn } from '@sd-os/ui';
import { Sparkles, Loader2, AlertTriangle, CheckCircle, X, Shuffle } from 'lucide-react';

interface AIReviewPanelProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

interface Issue {
  nodeId: string;
  nodeLabel: string;
  category: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

interface ReviewResult {
  scores: Record<string, number>;
  issues: Issue[];
  overallScore: number;
  overallAssessment: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-blue-50 border-blue-200 text-blue-700',
};

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-blue-400',
};

function AIReviewPanel({ nodes, edges }: AIReviewPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/ai/analyze-design', {
        design: { nodes, edges },
      });
      setResult(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to analyze architecture');
    } finally {
      setLoading(false);
    }
  }, [nodes, edges]);

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const scoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-yc-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yc-accent" />
            <h3 className="text-xs font-bold text-yc-text uppercase tracking-wider">AI Review</h3>
          </div>
          <button
            onClick={handleReview}
            disabled={loading || nodes.length === 0}
            className="px-3 py-1.5 bg-yc-accent text-white rounded-lg text-[10px] font-semibold flex items-center gap-1.5 hover:bg-yc-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Shuffle className="w-3 h-3" />
            )}
            {loading ? 'Analyzing...' : result ? 'Re-Review' : 'Run Review'}
          </button>
        </div>
        {nodes.length === 0 && (
          <p className="text-[9px] text-yc-text-muted">Add nodes to your canvas before running a review.</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <Loader2 className="w-8 h-8 text-yc-accent animate-spin" />
            <p className="text-[10px] text-yc-text-muted">Analyzing architecture...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <p className="text-[10px] text-red-600">{error}</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* Overall Score */}
            <div className={cn('border rounded-xl p-4 text-center', scoreBg(result.overallScore))}>
              <div className={cn('text-3xl font-bold font-mono', scoreColor(result.overallScore))}>
                {result.overallScore}
              </div>
              <p className="text-[9px] font-semibold text-yc-text-muted uppercase tracking-wider mt-1">Overall Score</p>
              <p className="text-[10px] text-yc-text mt-2">{result.overallAssessment}</p>
            </div>

            {/* Dimension Scores */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(result.scores).map(([key, value]) => (
                <div key={key} className={cn('border rounded-lg p-2.5', scoreBg(value))}>
                  <div className={cn('text-sm font-bold font-mono', scoreColor(value))}>{value}</div>
                  <p className="text-[8px] font-semibold text-yc-text-muted uppercase tracking-wider mt-0.5">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                </div>
              ))}
            </div>

            {/* Issues */}
            {result.issues.length > 0 && (
              <div>
                <h4 className="text-[9px] font-bold text-yc-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Issues ({result.issues.length})
                </h4>
                <div className="space-y-1.5">
                  {result.issues.map((issue, i) => (
                    <div key={i} className={cn('border rounded-lg p-2.5', SEVERITY_COLORS[issue.severity])}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', SEVERITY_BADGE[issue.severity])} />
                        <span className="text-[8px] font-bold uppercase tracking-wider">{issue.category}</span>
                        {issue.nodeLabel && issue.nodeLabel !== 'Architecture' && (
                          <span className="text-[8px] font-mono text-yc-text-muted ml-auto">{issue.nodeLabel}</span>
                        )}
                      </div>
                      <p className="text-[9px] text-yc-text mb-1">{issue.description}</p>
                      <p className="text-[8px] text-yc-text-muted flex items-start gap-1">
                        <span className="font-semibold">Fix:</span> {issue.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No issues */}
            {result.issues.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-[10px] font-semibold text-emerald-600">No issues found</p>
                <p className="text-[9px] text-yc-text-muted mt-1">Your architecture looks solid!</p>
              </div>
            )}
          </div>
        )}

        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-8 h-8 text-yc-text-muted/30 mb-2" />
            <p className="text-[10px] text-yc-text-muted">Click "Run Review" to get an AI-powered analysis of your architecture.</p>
            <p className="text-[8px] text-yc-text-muted mt-2">Checks scalability, reliability, security, and cost efficiency.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(AIReviewPanel);
