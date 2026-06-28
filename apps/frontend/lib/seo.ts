import type { Metadata } from 'next';

export const SITE_NAME = 'System Design OS';
export const SITE_DESCRIPTION = 'Master system design through interactive learning, architecture simulation, and AI-powered interview practice.';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://systemdesignos.com';
export const DEFAULT_OG_IMAGE = '/og-image.png';
export const TWITTER_HANDLE = '@systemdesignos';

export const SITE_KEYWORDS = [
  'system design',
  'system design interview',
  'distributed systems',
  'architecture design',
  'software architecture',
  'backend engineering',
  'scalability',
  'microservices',
  'API design',
  'database design',
  'caching',
  'load balancing',
  'interview preparation',
  'tech interview',
  'senior engineer',
];

export function generatePageMetadata(overrides: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  ogImage?: string;
  publishedTime?: string;
  authors?: string[];
  type?: 'website' | 'article';
}): Metadata {
  const url = `${SITE_URL}${overrides.path}`;
  const image = overrides.ogImage || DEFAULT_OG_IMAGE;

  return {
    title: `${overrides.title} | ${SITE_NAME}`,
    description: overrides.description,
    keywords: [...SITE_KEYWORDS, ...(overrides.keywords || [])].join(', '),
    alternates: { canonical: url },
    openGraph: {
      title: overrides.title,
      description: overrides.description,
      url,
      siteName: SITE_NAME,
      type: overrides.type || 'website',
      ...(overrides.publishedTime ? { publishedTime: overrides.publishedTime } : {}),
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: overrides.title,
      description: overrides.description,
      images: [image],
      site: TWITTER_HANDLE,
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  };
}

export function breadcrumbItems(pathname: string, trackName?: string, lessonTitle?: string) {
  const items: { name: string; path: string }[] = [
    { name: 'Home', path: '/' },
    { name: 'Curriculum', path: '/learn' },
  ];

  if (trackName) {
    const slug = pathname.split('/')[2];
    items.push({ name: trackName, path: `/learn/${slug}` });
  }

  if (lessonTitle) {
    items.push({ name: lessonTitle, path: pathname });
  }

  return items;
}

export function courseSchemaJsonLd(track: {
  name: string;
  description: string;
  slug: string;
  level: number;
  estimatedHours: number;
  learningGoals: string[];
  lessonCount: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: track.name,
    description: track.description,
    url: `${SITE_URL}/learn/${track.slug}`,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      sameAs: SITE_URL,
    },
    educationalLevel: track.level === 1 ? 'Beginner' : track.level === 2 ? 'Intermediate' : 'Advanced',
    timeRequired: `P${track.estimatedHours}H`,
    numberOfLessons: track.lessonCount,
    teaches: track.learningGoals,
  };
}

export function lessonSchemaJsonLd(lesson: {
  title: string;
  description: string;
  slug: string;
  trackSlug: string;
  difficulty: string;
  estimatedMin: number;
  tags: string[];
  companies: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: lesson.title,
    description: lesson.description,
    url: `${SITE_URL}/learn/${lesson.trackSlug}/${lesson.slug}`,
    timeRequired: `PT${lesson.estimatedMin}M`,
    keywords: lesson.tags.join(', '),
    about: {
      '@type': 'Thing',
      name: lesson.tags[0] || 'System Design',
    },
    ...(lesson.companies.length > 0 ? {
      mentions: lesson.companies.map(c => ({ '@type': 'Organization', name: c })),
    } : {}),
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  };
}

export function faqSchemaJsonLd(questions: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(q => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };
}

export function breadcrumbSchemaJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function webSiteSchemaJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/learn?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function collectionSchemaJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'System Design Curriculum',
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/learn`,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  };
}

export function collectionPageSchemaJsonLd(track?: { name: string; description: string; slug: string }) {
  if (track) {
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: track.name,
      description: track.description,
      url: `${SITE_URL}/learn/${track.slug}`,
      provider: { '@type': 'Organization', name: SITE_NAME },
    };
  }
  return collectionSchemaJsonLd();
}

export function howToSchemaJsonLd(lesson: {
  title: string;
  description: string;
  slug: string;
  trackSlug: string;
  estimatedMin: number;
  steps: { name: string; text: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: lesson.title,
    description: lesson.description,
    url: `${SITE_URL}/learn/${lesson.trackSlug}/${lesson.slug}`,
    totalTime: `PT${lesson.estimatedMin}M`,
    step: lesson.steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function techArticleSchemaJsonLd(lesson: {
  title: string;
  description: string;
  slug: string;
  trackSlug: string;
  difficulty: string;
  estimatedMin: number;
  tags: string[];
  companies: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: lesson.title,
    description: lesson.description,
    url: `${SITE_URL}/learn/${lesson.trackSlug}/${lesson.slug}`,
    timeRequired: `PT${lesson.estimatedMin}M`,
    keywords: lesson.tags.join(', '),
    proficiencyLevel: lesson.difficulty === 'beginner' ? 'Beginner' : lesson.difficulty === 'intermediate' ? 'Expert' : 'Advanced',
    ...(lesson.companies.length > 0
      ? { mentions: lesson.companies.map(c => ({ '@type': 'Organization', name: c })) }
      : {}),
    author: { '@type': 'Organization', name: SITE_NAME },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.lesson-content', '.lesson-header'],
    },
  };
}

export function productSchemaJsonLd(product: {
  name: string;
  description: string;
  price: string;
  currency?: string;
  features: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency || 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList: product.features.join(', '),
  };
}

export function extractHeadings(mdx: string, maxSteps = 8): { name: string; text: string }[] {
  const headingRegex = /^##\s+(.+)$/gm;
  const steps: { name: string; text: string }[] = [];
  const lines = mdx.split('\n');
  let currentHeading: string | null = null;
  let currentText: string[] = [];

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      if (currentHeading && steps.length < maxSteps) {
        steps.push({
          name: currentHeading,
          text: currentText.join(' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_~`]/g, '').trim().slice(0, 200),
        });
      }
      currentHeading = match[1];
      currentText = [];
    } else if (currentHeading) {
      currentText.push(line);
    }
  }

  // Push last heading
  if (currentHeading && steps.length < maxSteps) {
    steps.push({
      name: currentHeading,
      text: currentText.join(' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_~`]/g, '').trim().slice(0, 200),
    });
  }

  return steps;
}

export function extractPlainText(mdx: string, maxLength = 200): string {
  const text = mdx
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .replace(/>\s+/g, '')
    .replace(/[-*+]\s+/g, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}
