import { logger } from '../../../utils/logger';
import type { InterviewPrompt, RubricCriteria } from '@sd-os/shared';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface AnalysisResult {
  scores: Record<string, number>;
  issues: Array<{
    nodeId: string;
    nodeLabel: string;
    category: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    suggestion: string;
  }>;
  overallScore: number;
  overallAssessment: string;
}

export class OpenAIProvider {
  async analyze(design: any, interviewContext?: {
    prompt?: InterviewPrompt;
    rubric?: RubricCriteria[];
  }): Promise<AnalysisResult> {
    if (!OPENAI_API_KEY) {
      logger.warn('OPENAI_API_KEY not set, using fallback analysis');
      return this.fallbackAnalyze(design);
    }

    try {
      const prompt = this.buildPrompt(design, interviewContext);
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a senior system design interviewer. Respond with valid JSON only.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, error: errorText }, 'OpenAI API error');
        return this.fallbackAnalyze(design);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (err: any) {
      logger.error({ err: err.message }, 'OpenAI API call failed');
      return this.fallbackAnalyze(design);
    }
  }

  private buildPrompt(design: any, interviewContext?: {
    prompt?: InterviewPrompt;
    rubric?: RubricCriteria[];
  }): string {
    const nodes = design?.nodes || [];
    const edges = design?.edges || [];

    let contextSection = '';
    if (interviewContext?.prompt) {
      const p = interviewContext.prompt;
      contextSection = `
INTERVIEW CONTEXT:
Question: ${p.title}
Description: ${p.description}
Difficulty: ${p.difficulty}

Requirements:
${(p.requirements || []).map((r: string) => `- ${r}`).join('\n')}`;
    }
    if (interviewContext?.rubric && interviewContext.rubric.length > 0) {
      contextSection += `
Scoring Criteria:
${interviewContext.rubric.map((r: RubricCriteria) => `- ${r.name} (weight: ${r.weight})`).join('\n')}`;
    }

    return `You are a senior system design interviewer evaluating a candidate's architecture.${contextSection}

Architecture:
${JSON.stringify({ nodes, edges }, null, 2)}

Return JSON only:
{
  "scores": { "scalability": 0-100, "reliability": 0-100, "security": 0-100, "performance": 0-100, "costEfficiency": 0-100 },
  "issues": [{ "nodeId": "", "nodeLabel": "", "category": "Scalability|Reliability|Security|Performance", "description": "", "severity": "high|medium|low", "suggestion": "" }],
  "overallScore": 0-100,
  "overallAssessment": "One-paragraph evaluation summary in the context of the interview question."
}`;
  }

  private parseResponse(data: any): AnalysisResult {
    try {
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      logger.warn('Failed to parse OpenAI response');
    }
    return this.fallbackAnalyze(null);
  }

  private fallbackAnalyze(design: any): AnalysisResult {
    const nodes: any[] = design?.nodes || [];
    const hasLB = nodes.some((n: any) => n.type === 'LOAD_BALANCER');
    const hasCache = nodes.some((n: any) => n.type === 'CACHE');
    const hasWAF = nodes.some((n: any) => n.type === 'WAF');
    const hasAuth = nodes.some((n: any) => n.type === 'AUTH_SERVICE');

    const scores = {
      scalability: 40 + (hasLB ? 20 : 0) + (hasCache ? 15 : 0),
      reliability: 35 + (hasLB ? 15 : 0),
      security: 25 + (hasWAF ? 25 : 0) + (hasAuth ? 20 : 0),
      performance: 30 + (hasCache ? 20 : 0),
      costEfficiency: 65,
    };
    const overallScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 5);

    return { scores, issues: [], overallScore, overallAssessment: 'Live AI analysis unavailable — heuristic fallback used.' };
  }
}
