import { BackgroundLogo } from '@/components/background-logo';
import { DynamicAppTitleProvider } from '@/components/header/dynamic-app-title-name';
import { HeaderComponent } from '@/components/header/header-component';
import { PostHogProvider } from '@/providers/post-hog-provider';
import { sharedFontClassName } from '@/utils/fonts';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

const Layout: React.FC<{ children: ReactNode }> = async ({ children }) => {
  const isInAppDesign = await renderInAppDesign();
  const locale = await getLocaleFromCookies();

  return (
    <html
      className={cn(sharedFontClassName, {
        'overscroll-y-none': isInAppDesign,
      })}
      lang={locale}
    >
      <body
        className={cn('flex h-dvh w-dvw flex-col overflow-x-hidden bg-[#f8fafc]', {
          'overscroll-y-none': isInAppDesign,
        })}
      >
        <PostHogProvider>
          <DynamicAppTitleProvider>
            <HeaderComponent locale={locale} inAppDesign={isInAppDesign} />
            <div className="absolute top-0 z-[-999] h-screen w-full p-[56px] xl:pl-[480px]">
              <BackgroundLogo className="max-h-[60vh]" />
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

const RootLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <Suspense>
      <Layout>{children}</Layout>
    </Suspense>
  );
};

export default RootLayout;
