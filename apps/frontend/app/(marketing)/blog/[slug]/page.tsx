import type { Metadata } from 'next';
import { generatePageMetadata } from '../../../../lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  return generatePageMetadata({
    title,
    description: `Read about ${title} — a deep dive into system design concepts and architecture patterns.`,
    path: `/blog/${slug}`,
    type: 'article',
  });
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <article className="max-w-3xl mx-auto px-6 py-24 space-y-6">
      <h1 className="text-4xl font-extrabold">Scaling Cache Eviction</h1>
      <p className="text-gray-400">Published June 2026</p>
      <div className="prose prose-gray leading-relaxed text-gray-700">
        <p>This is where MDX content renders for: {slug}</p>
      </div>
    </article>
  );
}
