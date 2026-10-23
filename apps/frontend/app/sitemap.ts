import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/seo';
import { getAllTracks } from '../content/curriculum/index';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/learn`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  const allTracks = getAllTracks();

  const trackPages: MetadataRoute.Sitemap = allTracks.map((track: any) => ({
    url: `${SITE_URL}/learn/${track.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Lesson sitemap entries require fetching from API — omitted here.
  // They can be added via the dynamic API-based sitemap route.

  return [...staticPages, ...trackPages];
}
