import type { ReactNode } from 'react';
import Link from 'next/link';

// These styles apply to every route in the application
import './globals.css';
import { RadarIcon } from 'lucide-react';
import type { Metadata, Viewport } from 'next';
import Head from 'next/head';

export const viewport: Viewport = {
  // TODO: fix themeColor
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'cyan' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  // TODO: do we have a dark mode? --> don't think so...
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

type LayoutProps = {
  children: ReactNode;
};

export const generateMetadata = (): Metadata => {
  return {
    /*
          TODO: make the title dynamic and configurable via payload
          - the title should be 50-60 characters long
          - every page should have a unique title
          - the fallback title should be configurable as a global variable in payload
    */
    title: {
      default: 'Conveniat 2027 - MIR SIND CEVI',
      template: '%s | Conveniat 2027',
    },

    /*
        TODO: make the title dynamic and configurable via payload

        - the description should be under 155 characters for mobile prefer 105
     */
    description: 'The React Framework for the Web',

    /*
        TODO: make keywords dynamic and configurable via payload
     */
    keywords: ['Conveniat 2027', 'Cevi Schweiz', 'Lager'],

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

const Header = () => {
  return (
    <header className="absolute left-0 top-0 mb-6 w-full">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center space-x-2 font-semibold">
          <RadarIcon className="mr-2 h-8 w-8" />
          Conveniat 2027
        </Link>

        {/* TODO: generate NAV dynamic based on payload main nav */}
        <nav className="flex items-center space-x-6">
          <Link href="/ueber-uns" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Über uns
          </Link>
          <Link href="/mitmachen" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Mitmachen
          </Link>
          <Link href="/sponsoren" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Sponsoren
          </Link>
        </nav>
      </div>
      <hr />
    </header>
  );
};

const Footer = () => {
  return (
    <footer className={`flex h-24 w-full items-center justify-center`}>
      <div>Some Footer</div>
    </footer>
  );
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <html lang="en">
      <Head>
        <meta charSet="utf-8" />
      </Head>
      <body className="bg-background">
        <Header />
        <main className="mt-40">{children}</main>
        <Footer />
      </body>
    </html>
  );
};

export default Layout;
