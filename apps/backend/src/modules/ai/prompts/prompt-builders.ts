import { InterviewPrompt, RubricCriteria } from '@sd-os/shared';

export function buildUserPrompt(
  design: any,
  interviewContext?: {
    prompt?: InterviewPrompt;
    rubric?: RubricCriteria[];
  }
): string {
  const nodes = design?.nodes || [];
  const edges = design?.edges || [];

  let contextSection = '';
  if (interviewContext?.prompt) {
    const p = interviewContext.prompt;
    contextSection = `
INTERVIEW QUESTION: ${p.title}
DESCRIPTION: ${p.description}
DIFFICULTY: ${p.difficulty}
TIME LIMIT: ${p.timeLimitMin} minutes

REQUIREMENTS:
${(p.requirements || []).map((r: string) => `- ${r}`).join('\n')}`;
  }

  if (interviewContext?.rubric && interviewContext.rubric.length > 0) {
    contextSection += `

SCORING RUBRIC:
${interviewContext.rubric.map((r: RubricCriteria) => `- ${r.name} (weight: ${r.weight})`).join('\n')}`;
  }

  return `You are a senior system design interviewer evaluating a candidate's architecture diagram.${contextSection}

ARCHITECTURE SUBMITTED:
${JSON.stringify({ nodes, edges }, null, 2)}

Analyze this architecture against the requirements and rubric above. Return JSON only:
{
  "scores": { "scalability": 0-100, "reliability": 0-100, "security": 0-100, "performance": 0-100, "costEfficiency": 0-100 },
  "issues": [{ "nodeId": "", "nodeLabel": "", "category": "Scalability|Reliability|Security|Performance", "description": "", "severity": "high|medium|low", "suggestion": "" }],
  "overallScore": 0-100,
  "overallAssessment": "One-paragraph summary of the evaluation, highlighting key strengths and critical gaps in the context of the interview question."
}`;
}
