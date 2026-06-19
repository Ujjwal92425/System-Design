import type { Metadata } from 'next';
import { generatePageMetadata } from '../../../lib/seo';

export const metadata: Metadata = generatePageMetadata({
  title: 'System Design Curriculum',
  description: 'Master system design with 18 comprehensive tracks covering networking, databases, caching, distributed systems, architecture patterns, and more. Interactive lessons with quizzes and simulations.',
  path: '/learn',
  keywords: ['system design curriculum', 'system design lessons', 'distributed systems course', 'architecture tutorial'],
});

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 min-h-screen">
      {children}
    </div>
  );
}
