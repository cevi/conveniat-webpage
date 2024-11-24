import type { ReactNode } from 'react';
import Link from 'next/link';

// These styles apply to every route in the application
import './globals.css';
import { Menu } from 'lucide-react';
import type { Metadata, Viewport } from 'next';
import Head from 'next/head';
import Image from 'next/image';

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
    <header className="absolute sticky left-0 top-0 mb-6 h-[56px] w-full bg-conveniat-green-300 text-conveniat-green-500">
      <div className="flex items-center justify-between px-6">
        <Link href="/">
          <Image
            src="/logo-round.png"
            alt="Conveniat 2027 Logo"
            width={75}
            height={75}
            className="absolute left-[20px] top-[10px]"
          />
        </Link>
        <span className="flex items-center space-x-2 font-heading text-[26px] font-bold leading-[56px]">
          Conveniat 2027
        </span>
        <Menu />
      </div>
    </header>
  );
};

const Footer = () => {
  return (
    <footer className="h-24 w-full">
      <div className="flex h-[260px] w-full flex-col items-center justify-center space-y-8 bg-conveniat-green-100">
        <div className="flex flex-col items-center justify-center">
          <span className="font-heading text-[14px] font-extrabold text-conveniat-green-500">
            Spenden
          </span>
          <span className="font-inter text-[14px] font-normal text-conveniat-green-500">
            CH23 8080 8002 2706 7598 8
          </span>
        </div>

        <div className="flex flex-col items-center justify-center">
          <span className="font-heading text-[14px] font-extrabold text-conveniat-green-500">
            Conveniat 2027
          </span>
          <span className="font-inter text-[14px] font-normal text-conveniat-green-500">
            Kontakt aufnehmen
          </span>
          <span className="font-inter text-[14px] font-normal text-conveniat-green-500">
            Über das Projekt
          </span>
        </div>
      </div>
      <div className="flex h-[120px] w-full flex-col items-center justify-center bg-conveniat-green-500 text-white">
        <span className="mb-4 font-semibold">MIR SIND CEVI</span>
        <span className="mb-4 font-semibold">© 2024 · Conveniat · Cevi Schweiz</span>
        <span className="text-[8px] font-light">Version 0.1.0 </span>
        <span className="text-[8px] font-light">(Build af10879 vom 05.10.2024 11:32:28)</span>
      </div>
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
        <main className="mt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
};

export default Layout;
