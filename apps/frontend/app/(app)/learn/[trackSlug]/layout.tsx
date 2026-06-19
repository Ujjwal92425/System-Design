import type { Metadata } from 'next';
import { getTrackBySlug } from '../../../../data/curriculum/index';
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
    const totalLessons = track.modules.reduce((s, m) => s + m.lessons.length, 0);
    schemas.push(
      courseSchemaJsonLd({
        name: track.name,
        description: track.description || '',
        slug: trackSlug,
        level: track.level,
        estimatedHours: track.estimatedHours || 0,
        learningGoals: track.learningGoals || [],
        lessonCount: totalLessons,
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
