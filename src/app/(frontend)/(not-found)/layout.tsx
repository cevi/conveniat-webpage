import { DynamicAppTitleProvider } from '@/components/header/dynamic-app-title-name';
import { HeaderComponent } from '@/components/header/header-component';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { PostHogProvider } from '@/providers/post-hog-provider';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import { cn } from '@/utils/tailwindcss-override';
import { Inter, Montserrat } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import type { ReactNode } from 'react';
import React from 'react';

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'block',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'block',
});

const RootLayout: React.FC<{ children: ReactNode }> = async ({ children }) => {
  const isInAppDesign = await renderInAppDesign();
  const locale = await getLocaleFromCookies();

  return (
    <html
      className={cn(`${montserrat.className} ${inter.className}`, {
        'overscroll-y-none': isInAppDesign,
      })}
      lang={locale}
    >
      <body
        className={cn('flex h-dvh w-dvw flex-col overflow-x-hidden bg-[#f8fafc]', {
          'overscroll-y-none': isInAppDesign,
        })}
      >
        <NextTopLoader showSpinner={false} color="#47564c" zIndex={999} />

        <PostHogProvider>
          <DynamicAppTitleProvider>
            <HeaderComponent locale={locale} inAppDesign={isInAppDesign} />
            <div className="absolute top-0 z-[-999] h-screen w-full p-[56px] xl:pl-[480px]">
              <CeviLogo className="mx-auto h-full max-h-[60vh] w-full max-w-[384px] opacity-10 blur-md" />
            </div>

            <div className="mt-[62px] h-[calc(100dvh-62px)] xl:ml-[480px]">
              <main className="flex min-h-full flex-col justify-between">{children}</main>
            </div>
          </DynamicAppTitleProvider>
        </PostHogProvider>
      </body>
    </html>
  );
};

export default RootLayout;
