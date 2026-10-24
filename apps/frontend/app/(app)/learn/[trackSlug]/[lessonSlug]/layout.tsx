import type { Metadata } from 'next';
import { getTrackBySlug } from '../../../../../content/curriculum/index';
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
// Lesson metadata is fetched from the API (content lives in PostgreSQL).
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4007';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ trackSlug: string; lessonSlug: string }>;
}): Promise<Metadata> {
  const { trackSlug, lessonSlug } = await params;
  let lesson: any = null;

  try {
    const res = await fetch(`${API_BASE}/learn/lessons/${lessonSlug}`, {
      headers: { Authorization: `Bearer ${process.env.API_SERVICE_KEY || ''}` },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      lesson = json.data ?? json;
    }
  } catch { /* fall through to default metadata */ }

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
    ...(lesson.companies?.length > 0 ? { authors: lesson.companies } : {}),
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

  // Fetch lesson metadata for JSON-LD schemas
  let lesson: any = null;
  try {
    const res = await fetch(`${API_BASE}/learn/lessons/${lessonSlug}`, {
      headers: { Authorization: `Bearer ${process.env.API_SERVICE_KEY || ''}` },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      lesson = json.data ?? json;
    }
  } catch { /* schemas will be empty */ }

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
        // CHANGE: Fallback estimatedMin to 15 if missing
        estimatedMin: lesson.estimatedMin || 15,
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
        // CHANGE: Fallback estimatedMin to 15 if missing
        estimatedMin: lesson.estimatedMin || 15,
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
          // CHANGE: Fallback estimatedMin to 15 if missing
          estimatedMin: lesson.estimatedMin || 15,
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
