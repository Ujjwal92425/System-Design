import type { Metadata } from 'next';
import { getTrackBySlug } from '../../../../content/curriculum/index';
import {
  generatePageMetadata,
  courseSchemaJsonLd,
  breadcrumbSchemaJsonLd,
} from '../../../../lib/seo';

// ── Track layout: public metadata + JSON-LD for SEO ────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ trackSlug: string }> }): Promise<Metadata> {
  const { trackSlug } = await params;
  const track = getTrackBySlug(trackSlug);
  if (!track) {
    return generatePageMetadata({
      title: 'Track Not Found',
      description: 'The requested track could not be found.',
      path: `/learn/${trackSlug}`,
    });
  }

  return generatePageMetadata({
    title: track.name,
    description: track.description || `System Design - ${track.name}`,
    path: `/learn/${trackSlug}`,
    keywords: [track.name, 'system design', 'architecture', ...(track.learningGoals || [])],
    type: 'article',
  });
}

export default async function TrackLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ trackSlug: string }>;
}) {
  const { trackSlug } = await params;
  const track = getTrackBySlug(trackSlug);

  const schemas: Record<string, unknown>[] = [];

  if (track) {
    schemas.push(
      courseSchemaJsonLd({
        name: track.name,
        description: track.description || '',
        slug: trackSlug,
        level: track.level,
        estimatedHours: track.estimatedHours || 0,
        learningGoals: track.learningGoals || [],
        lessonCount: 0, // will be replaced once track detail is fetched client-side
      })
    );
    schemas.push(
      breadcrumbSchemaJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Curriculum', path: '/learn' },
        { name: track.name, path: `/learn/${trackSlug}` },
      ])
    );
  }

  return (
    <>
      {schemas.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      {children}
    </>
  );
}
