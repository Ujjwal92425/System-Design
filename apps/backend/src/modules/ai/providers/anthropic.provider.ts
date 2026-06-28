import { logger } from '../../../utils/logger';
import type { InterviewPrompt, RubricCriteria } from '@sd-os/shared';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

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

export class AnthropicProvider {
  async analyze(design: any, interviewContext?: {
    prompt?: InterviewPrompt;
    rubric?: RubricCriteria[];
  }): Promise<AnalysisResult> {
    if (!ANTHROPIC_API_KEY) {
      logger.warn('ANTHROPIC_API_KEY not set, using fallback analysis');
      return this.fallbackAnalyze(design);
    }

    try {
      const prompt = this.buildPrompt(design, interviewContext);
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, error: errorText }, 'Anthropic API error');
        return this.fallbackAnalyze(design);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (err: any) {
      logger.error({ err: err.message }, 'Anthropic API call failed');
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

    return `You are a senior system design interviewer. Analyze the following architecture and provide:
1. A rubric with scores (0-100) for: scalability, reliability, security, performance, costEfficiency
2. A list of specific issues, each with: category (Scalability/Reliability/Security/Performance), severity (high/medium/low), description, and actionable suggestion
3. An overall score (0-100) and one-paragraph assessment${contextSection}

Architecture:
${JSON.stringify({ nodes, edges }, null, 2)}

Return your analysis as valid JSON with this structure:
{
  "scores": { "scalability": number, "reliability": number, "security": number, "performance": number, "costEfficiency": number },
  "issues": [{ "nodeId": string, "nodeLabel": string, "category": string, "description": string, "severity": "high"|"medium"|"low", "suggestion": string }],
  "overallScore": number,
  "overallAssessment": string
}`;
  }

  private parseResponse(data: any): AnalysisResult {
    try {
      const content = data.content?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      logger.warn('Failed to parse Anthropic response');
    }
    return this.fallbackAnalyze(null);
  }

  private fallbackAnalyze(design: any): AnalysisResult {
    const nodes: any[] = design?.nodes || [];
    const hasLB = nodes.some((n: any) => n.type === 'LOAD_BALANCER');
    const hasCache = nodes.some((n: any) => n.type === 'CACHE');
    const hasDB = nodes.some((n: any) => n.type?.startsWith('DATABASE'));
    const hasWAF = nodes.some((n: any) => n.type === 'WAF');
    const hasAuth = nodes.some((n: any) => n.type === 'AUTH_SERVICE');
    const hasQueue = nodes.some((n: any) => n.type === 'QUEUE');

    const scores = {
      scalability: 40 + (hasLB ? 20 : 0) + (hasCache ? 15 : 0) + (hasQueue ? 10 : 0),
      reliability: 30 + (hasLB ? 15 : 0) + (hasDB ? 15 : 0) + (hasQueue ? 10 : 0),
      security: 20 + (hasWAF ? 25 : 0) + (hasAuth ? 20 : 0),
      performance: 35 + (hasCache ? 20 : 0) + (hasLB ? 10 : 0),
      costEfficiency: 60 - (nodes.length > 10 ? 15 : 0) + (hasCache ? 5 : 0),
    };
    const overallScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 5);

    return { scores, issues: [], overallScore, overallAssessment: 'AI analysis unavailable — using heuristic fallback.' };
  }
}
