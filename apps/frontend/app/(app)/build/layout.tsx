import type { Metadata } from 'next';
import { generatePageMetadata } from '../../../lib/seo';

export const metadata: Metadata = generatePageMetadata({
  title: 'Architecture Canvas',
  description: 'Design, simulate, and collaborate on system architecture diagrams with our interactive canvas. Build real-time system designs with drag-and-drop nodes.',
  path: '/build',
  keywords: ['architecture canvas', 'system design tool', 'architecture diagram', 'design editor'],
});

export default function BuildLayout({ children }: { children: React.ReactNode }) {
  return children;
}
