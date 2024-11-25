import type { ReactNode } from 'react';
import React from 'react';

// These styles apply to every route in the application
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { FooterComponent } from '@/components/footer/footer-component';
import { HeaderComponent } from '@/components/header-component';
import { getPayload } from 'payload';
import config from '@payload-config';
import { SEO } from '@/payload-types';

export const generateViewport = (): Viewport => ({
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#47564c' }],
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
});

type LayoutProperties = {
  children: ReactNode;
};

export const generateMetadata = async (): Promise<Metadata> => {
  const payload = await getPayload({ config });

  const { defaultTitle, defaultDescription, keywords }: SEO = await payload.findGlobal({
    slug: 'SEO',
  });

  return {
    title: {
      default: defaultTitle,
      template: '%s | Conveniat 2027',
    },
    description: defaultDescription,
    keywords: keywords.map((keyword) => keyword.keyword),

    publisher: 'Conveniat · Cevi Schweiz',

    formatDetection: {
      email: true,
      address: true,
      telephone: true,
    },

    alternates: {
      canonical: '/',
      languages: {
        'en-US': '/en',
        'de-CH': '/',
        'fr-CH': '/fr',
      },
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },

    // TODO: replace the icon urls with the actual urls / generate the corresponding files
    icons: {
      icon: [
        { url: '/icon.png' },
        new URL('/icon.png', 'https://example.com'),
        { url: '/icon-dark.png', media: '(prefers-color-scheme: dark)' },
      ],
      shortcut: ['/shortcut-icon.png'],
      apple: [
        { url: '/apple-icon.png' },
        { url: '/apple-icon-x3.png', sizes: '180x180', type: 'image/png' },
      ],
      other: {
        rel: 'apple-touch-icon-precomposed',
        url: '/apple-touch-icon-precomposed.png',
      },
    },

    // TODO: replace the manifest url with the actual url / generate the corresponding file
    manifest: 'https://nextjs.org/manifest.json',

    // TODO: include twitter card data
    twitter: {},

    // TODO: fix links to resources
    appleWebApp: {
      title: 'Conveniat 2027',
      statusBarStyle: 'black-translucent',
      startupImage: [
        '/assets/startup/apple-touch-startup-image-768x1004.png',
        {
          url: '/assets/startup/apple-touch-startup-image-1536x2008.png',
          media: '(device-width: 768px) and (device-height: 1024px)',
        },
      ],
    },
  };
};

const Layout: React.FC<LayoutProperties> = ({ children }) => {
  return (
    <html lang="de-CH">
      <body className="bg-background">
        <HeaderComponent />
        <main className="mt-16">{children}</main>
        <FooterComponent />
      </body>
    </html>
  );
};

export default Layout;
