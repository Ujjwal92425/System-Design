import type { Metadata } from 'next';
import { generatePageMetadata } from '../../../lib/seo';

export const metadata: Metadata = generatePageMetadata({
  title: 'About',
  description: 'Learn about System Design OS — the interactive platform for mastering system design through hands-on simulation and AI-powered feedback.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24 space-y-8">
      <h1 className="text-4xl font-black">About System Design OS</h1>
      <p className="text-gray-700 leading-relaxed text-lg">
        System Design Learning OS was built out of frustration. Traditional resources rely on static PDFs, books, and pre-recorded videos. Practice is done on plain whiteboard tools that offer no feedback. 
      </p>
      <p className="text-gray-700 leading-relaxed text-lg">
        Our platform bridges this gap: We allow you to drag and drop real components, run traffic through them to discover bottlenecks, fail nodes to test resilience, and receive structural grading scores.
      </p>
    </div>
  );
}
