/**
 * Curriculum content generator.
 * Reads lesson markdown files and generates TypeScript module files.
 * Run: npx ts-node data/curriculum/generate.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const MODULES = [
  { slug: 'networking-os-security', file: 'module-01', dir: 'module-01', count: 14 },
  { slug: 'apis-protocols-authentication', file: 'module-02', dir: 'module-02', count: 12 },
  { slug: 'databases', file: 'module-03', dir: 'module-03', count: 15 },
  { slug: 'caching-cdns', file: 'module-04', dir: 'module-04', count: 8 },
  { slug: 'distributed-infrastructure', file: 'module-05', dir: 'module-05', count: 13 },
  { slug: 'architecture-patterns', file: 'module-06', dir: 'module-06', count: 11 },
  { slug: 'advanced-distributed-systems', file: 'module-07', dir: 'module-07', count: 12 },
  { slug: 'system-design-interviews', file: 'module-08', dir: 'module-08', count: 14 },
  { slug: 'frontend-performance', file: 'module-09', dir: 'module-09', count: 9 },
  { slug: 'production-operations', file: 'module-10', dir: 'module-10', count: 12 },
];

const BASE = path.resolve(__dirname);

function lessonId(modIdx: number, lessonIdx: number): string {
  return `lesson-${String(modIdx + 1).padStart(2, '0')}-${String(lessonIdx + 1).padStart(2, '0')}`;
}

function lessonSlug(modSlug: string, lessonIdx: number, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${modSlug}-${String(lessonIdx + 1).padStart(2, '0')}-${slug}`;
}

// Read existing markdown files and generate lesson arrays
// This is a scaffold — actual content generation is done by build pipeline
console.log('Curriculum generator scaffold ready.');
console.log('Place lesson markdown files in data/curriculum/lessons/{module-dir}/');
console.log('Then run this script to generate module-*.ts files.');
