import { InterviewPrompt, RubricCriteria } from '@sd-os/shared';

export function buildSystemPrompt(interviewContext?: {
  prompt?: InterviewPrompt;
  rubric?: RubricCriteria[];
}): string {
  const basePrompt = `You are a senior system design interviewer at a top-tier technology company (FAANG). You evaluate architecture diagrams submitted by engineering candidates during system design interviews.

Your evaluation must be:
- CRITICAL but CONSTRUCTIVE — identify real gaps without being discouraging
- PRECISE — reference specific architectural patterns and components
- ACTIONABLE — every issue must include a concrete suggestion for improvement

Evaluate across these dimensions:
1. SCALABILITY — Can the system handle growth? Are there load balancers, caches, CDNs, horizontal scaling?
2. RELIABILITY — Is there fault tolerance? Read replicas, multi-AZ, async decoupling, retries?
3. SECURITY — Auth, WAF, rate limiting, secrets management, encryption?
4. PERFORMANCE — Latency optimization, caching strategy, connection pooling, CDN?
5. COST EFFICIENCY — Appropriate component choices, not over-engineered, right-sizing?`;

  if (!interviewContext?.prompt && !interviewContext?.rubric) {
    return basePrompt;
  }

  const prompt = interviewContext.prompt;
  const rubric = interviewContext.rubric;

  let promptSection = '';
  if (prompt) {
    promptSection = `
INTERVIEW PROMPT CONTEXT:
Title: ${prompt.title}
Description: ${prompt.description}
Difficulty: ${prompt.difficulty}
Time Limit: ${prompt.timeLimitMin} minutes

Requirements:
${(prompt.requirements || []).map((r: string) => `- ${r}`).join('\n')}`;
  }

  let rubricSection = '';
  if (rubric && rubric.length > 0) {
    rubricSection = `
RUBRIC CRITERIA (used for scoring):
${rubric.map((r: RubricCriteria) => `- ${r.name} (weight: ${r.weight}) — ${r.hint}`).join('\n')}`;
  }

  return `${basePrompt}${promptSection}${rubricSection}

Return your analysis as valid JSON only with this exact structure:
{
  "scores": { "scalability": <0-100>, "reliability": <0-100>, "security": <0-100>, "performance": <0-100>, "costEfficiency": <0-100> },
  "issues": [{ "nodeId": "<node-id-or-empty>", "nodeLabel": "<node-label-or-Architecture>", "category": "Scalability|Reliability|Security|Performance", "description": "<clear description>", "severity": "high|medium|low", "suggestion": "<actionable fix>" }],
  "overallScore": <0-100>,
  "overallAssessment": "<one-paragraph summary with key strengths and weaknesses>"
}`;
}