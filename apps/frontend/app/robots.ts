import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/build/'],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/admin/', '/api/', '/_next/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
