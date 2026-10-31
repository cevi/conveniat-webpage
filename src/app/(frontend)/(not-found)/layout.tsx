import { BackgroundLogo } from '@/components/background-logo';
import { DynamicAppTitleProvider } from '@/components/header/dynamic-app-title-name';
import { HeaderComponent } from '@/components/header/header-component';
import { HideHeaderProvider } from '@/components/header/hide-header-context';
import { PostHogProvider } from '@/providers/post-hog-provider';
import { i18nConfig } from '@/types/types';
import { sharedFontClassName } from '@/utils/fonts';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import type React from 'react';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

const LocalizedHeader: React.FC = async () => {
  const locale = await getLocaleFromCookies();
  const isInAppDesign = await renderInAppDesign();
  return <HeaderComponent locale={locale} inAppDesign={isInAppDesign} />;
};

/**
 * The root layout of every URL no other route matches, a missing file at the root for example.
 *
 * Next.js answers with the status of the prerendered shell and cannot change it once that shell
 * is sent. So the page has to reach `notFound()` while prerendering, which only happens if
 * nothing above it waits for the request. The cookie reads sit below Suspense boundaries for that
 * reason, and the document carries the default locale; the 404 text is still localized.
 */
const RootLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <html className={sharedFontClassName} lang={i18nConfig.defaultLocale}>
      <body className="bg-page flex h-dvh w-dvw flex-col overflow-x-hidden">
        <PostHogProvider>
          <DynamicAppTitleProvider>
            <HideHeaderProvider>
              <Suspense>
                <LocalizedHeader />
              </Suspense>
            </HideHeaderProvider>
            <div className="absolute top-0 z-[-999] h-screen w-full p-[56px] xl:pl-[480px]">
              <BackgroundLogo className="max-h-[60vh]" />
            </div>

            <div className="mt-[calc(62px+var(--preview-banner-height))] h-[calc(100dvh-62px-var(--preview-banner-height))] xl:ml-[480px]">
              <main className="flex min-h-full flex-col justify-between">{children}</main>
            </div>
          </DynamicAppTitleProvider>
        </PostHogProvider>
      </body>
    </html>
  );
};

export default RootLayout;
