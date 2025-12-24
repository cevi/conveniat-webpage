import type React from 'react';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

// These styles apply to every route in the application
import '@/app/globals.scss';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { PostHogProvider } from '@/providers/post-hog-provider';
import { ServiceWorkerManager } from '@/components/service-worker/service-worker-manager';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { SessionProvider } from 'next-auth/react';
import { Inter, Montserrat } from 'next/font/google';

interface LayoutProperties {
  children: ReactNode;
}

const montserrat = Montserrat({ subsets: ['latin'] });
const inter = Inter({ subsets: ['latin'] });

/**
 * This is the root layout for the app entrypoint.
 * This root layout is not localized and not in the app design as those cookies
 * are not set on the first rendering of the app.
 *
 * @constructor
 */
const AppEntrypointLayout: React.FC<LayoutProperties> = async ({ children }) => {
  const locale = await getLocaleFromCookies();

  return (
    <html className={`${montserrat.className} ${inter.className} overscroll-y-none`} lang={locale}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="flex h-screen w-screen flex-col overflow-x-hidden overscroll-y-none bg-[#f8fafc]">
        <PostHogProvider>
          <div className="absolute top-0 z-[-999] h-screen w-full p-[56px]">
            <CeviLogo className="mx-auto h-full w-full max-w-[384px] opacity-10 blur-md" />
          </div>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
};

const AppEntrypointRootLayout: React.FC<LayoutProperties> = ({ children }) => {
  return (
    <Suspense>
      <AppEntrypointLayout>
        <ServiceWorkerManager>
          <SessionProvider>{children}</SessionProvider>
        </ServiceWorkerManager>
      </AppEntrypointLayout>
    </Suspense>
  );
};

export default AppEntrypointRootLayout;

// configure the viewport and metadata
export { generateMetadata } from '@/utils/generate-metadata';
export { generateViewport } from '@/utils/generate-viewport';
