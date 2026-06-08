export function buildUserPrompt(design: any) {
  return `Analyze this architecture layout: ${JSON.stringify(design)}`;
}
