import type { ReactNode } from 'react';
import Link from 'next/link';

// These styles apply to every route in the application
import './globals.css';
import { RadarIcon } from 'lucide-react';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>My App</title>
      </head>
      <body style={{ backgroundColor: '#faf5e8' }}>
        <header className="absolute left-0 top-0 mb-6 w-full">
          <div className="flex items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center space-x-2 font-semibold text-amber-600">
              <RadarIcon className="mr-2 h-8 w-8" />
              Conveniat 2027
            </Link>

            <nav className="flex items-center space-x-6">
              <Link
                href="/ueber-uns"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Über uns
              </Link>
              <Link
                href="/mitmachen"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Mitmachen
              </Link>
              <Link
                href="/sponsoren"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Sponsoren
              </Link>
            </nav>
          </div>
          <hr />
        </header>

        <main className="mt-40">{children}</main>

        <footer className={`flex h-24 w-full items-center justify-center`}>
          <div>Some Footer</div>
        </footer>
      </body>
    </html>
  );
};

export default Layout;
