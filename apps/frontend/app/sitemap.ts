import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/seo';
import { curriculumData } from '../data/curriculum/index';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/learn`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  const trackPages: MetadataRoute.Sitemap = curriculumData.tracks.map((track) => ({
    url: `${SITE_URL}/learn/${track.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const lessonSlugs = new Set<string>();
  const lessonPages: MetadataRoute.Sitemap = [];

  for (const [trackSlug, td] of Object.entries(curriculumData.trackDetails)) {
    for (const mod of (td as any).modules ?? []) {
      for (const l of mod.lessons ?? []) {
        if (!l?.slug || lessonSlugs.has(l.slug)) continue;
        lessonSlugs.add(l.slug);
        lessonPages.push({
          url: `${SITE_URL}/learn/${trackSlug}/${l.slug}`,
          lastModified: new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.7,
        });
      }
    }
  }

  return [...staticPages, ...trackPages, ...lessonPages];
}
