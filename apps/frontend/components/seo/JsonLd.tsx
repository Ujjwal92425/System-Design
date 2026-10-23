import { SITE_URL } from '../../lib/seo';

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'System Design OS',
        url: SITE_URL,
        description:
          'Master system design through interactive learning, architecture simulation, and AI-powered interview practice.',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/learn?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'System Design OS',
        url: SITE_URL,
        logo: `${SITE_URL}/og-image.png`,
        sameAs: [
          'https://twitter.com/systemdesignos',
          'https://github.com/systemdesignos',
        ],
      }}
    />
  );
}
