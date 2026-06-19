import './globals.css';
import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import { PostHogProvider } from '../components/providers/PostHogProvider';
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL, SITE_KEYWORDS } from '../lib/seo';
import { WebSiteJsonLd, OrganizationJsonLd } from '../components/seo/JsonLd';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS.join(', '),
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
    site: '@systemdesignos',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  alternates: { canonical: SITE_URL },
  other: {
    'google-site-verification': process.env.GOOGLE_SITE_VERIFICATION || '',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        <WebSiteJsonLd />
        <OrganizationJsonLd />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-yc-bg text-yc-text font-sans">
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
