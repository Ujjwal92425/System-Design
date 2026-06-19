import type { Metadata } from 'next';
import { getLessonBySlug, getTrackBySlug } from '../../../../../data/curriculum/index';
import {
  generatePageMetadata,
  lessonSchemaJsonLd,
  techArticleSchemaJsonLd,
  howToSchemaJsonLd,
  breadcrumbSchemaJsonLd,
  extractPlainText,
  extractHeadings,
} from '../../../../../lib/seo';

// ── Lesson layout: public metadata + full JSON-LD stack for SEO/AEO ────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ trackSlug: string; lessonSlug: string }>;
}): Promise<Metadata> {
  const { trackSlug, lessonSlug } = await params;
  const lesson = getLessonBySlug(lessonSlug);

  if (!lesson) {
    return generatePageMetadata({
      title: 'Lesson Not Found',
      description: 'The requested lesson could not be found.',
      path: `/learn/${trackSlug}/${lessonSlug}`,
    });
  }

  const description = extractPlainText(lesson.content, 160) || `Learn about ${lesson.title} in system design.`;

  return generatePageMetadata({
    title: lesson.title,
    description,
    path: `/learn/${trackSlug}/${lessonSlug}`,
    keywords: [...(lesson.tags || []), lesson.difficulty, 'system design'],
    type: 'article',
    ...(lesson.companies.length > 0 ? { authors: lesson.companies } : {}),
  });
}

export default async function LessonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ trackSlug: string; lessonSlug: string }>;
}) {
  const { lessonSlug, trackSlug } = await params;
  const lesson = getLessonBySlug(lessonSlug);
  const track = getTrackBySlug(trackSlug);

  const schemas: Record<string, unknown>[] = [];

  if (lesson) {
    const description = extractPlainText(lesson.content, 160);
    schemas.push(
      lessonSchemaJsonLd({
        title: lesson.title,
        description,
        slug: lessonSlug,
        trackSlug,
        difficulty: lesson.difficulty,
        estimatedMin: lesson.estimatedMin,
        tags: lesson.tags || [],
        companies: lesson.companies || [],
      })
    );
    schemas.push(
      techArticleSchemaJsonLd({
        title: lesson.title,
        description,
        slug: lessonSlug,
        trackSlug,
        difficulty: lesson.difficulty,
        estimatedMin: lesson.estimatedMin,
        tags: lesson.tags || [],
        companies: lesson.companies || [],
      })
    );
    const steps = extractHeadings(lesson.content);
    if (steps.length >= 2) {
      schemas.push(
        howToSchemaJsonLd({
          title: lesson.title,
          description,
          slug: lessonSlug,
          trackSlug,
          estimatedMin: lesson.estimatedMin,
          steps,
        })
      );
    }
  }

  if (track) {
    schemas.push(
      breadcrumbSchemaJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Curriculum', path: '/learn' },
        { name: track.name, path: `/learn/${trackSlug}` },
        { name: lesson?.title || lessonSlug, path: `/learn/${trackSlug}/${lessonSlug}` },
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
