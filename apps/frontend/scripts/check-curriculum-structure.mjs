import fs from 'fs';
import path from 'path';

const dir = path.join('data', 'curriculum');
const requiredSections = [
  '## 0. Mental Model',
  '## 1. Quick Summary',
  '## 2. Definition',
  '## 3.',
  '## 4. How It Works',
  '## 5. Variants',
  '## 6. Performance',
  '## 7. Failure',
  '## 8. Decision',
  '## 10. Real Production',
  '## 11. Production',
  '## 12. Real Company',
  '## 13. Interview',
  '## 14. Concept Check',
  '## 15. Next Steps',
];

const files = fs.readdirSync(dir).filter((f) => f.startsWith('module-') && f.endsWith('.ts'));
const issues = [];

for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const parts = text.split(/id: "lesson-/);
  for (let i = 1; i < parts.length; i++) {
    const id = 'lesson-' + (parts[i].match(/^[^"]+/)?.[0] ?? '?');
    const contentMatch = parts[i].match(/content: `([\s\S]*?)`,\s*\n\s*estimatedMin/);
    const content = contentMatch ? contentMatch[1] : '';
    const missing = requiredSections.filter((s) => !content.includes(s));
    if (missing.length > 0) {
      issues.push({ file, id, missingCount: missing.length, missing });
    }
  }
}

console.log(JSON.stringify({ totalIssues: issues.length, issues: issues.slice(0, 30) }, null, 2));
