import { Suspense } from 'react';

import { AppShell } from '@/app/app-shell';
import { ChunkErrorHandler } from '@/components/chunk-error-handler';
import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { GlobalAppFooterClientWrapper } from '@/components/footer/global-app-footer-client-wrapper';
import { HideFooterProvider } from '@/components/footer/hide-footer-context';
import { HeaderComponent } from '@/components/header/header-component';
import { ServiceWorkerManager } from '@/components/service-worker/service-worker-manager';
import { environmentVariables } from '@/config/environment-variables';
import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { sharedFontClassName } from '@/utils/fonts';
import { cn } from '@/utils/tailwindcss-override';
import type { ReactNode } from 'react';

// These styles apply to every route in the application
import '@/app/globals.scss';

interface LayoutProperties {
  children: ReactNode;
  params: Promise<{
    locale: Locale;
    design: DesignCodes;
  }>;
}

const GlobalAppFooterWrapper: React.FC<{
  locale: Locale;
  design: DesignCodes;
}> = ({ locale, design }) => {
  const isInAppDesign = design === DesignCodes.APP_DESIGN;

  return (
    <GlobalAppFooterClientWrapper locale={locale} isAppMode={isInAppDesign}>
      <FooterAppNavBar locale={locale} />
    </GlobalAppFooterClientWrapper>
  );
};

const RootLayout: React.FC<LayoutProperties> = async ({ children, params }) => {
  const { locale, design } = await params;
  const isInAppDesign = design === DesignCodes.APP_DESIGN;

  return (
    <html
      className={cn(sharedFontClassName, {
        'overscroll-y-none': isInAppDesign,
      })}
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        {!environmentVariables.NEXT_PUBLIC_DISABLE_SERWIST && (
          <link rel="manifest" href="/manifest.webmanifest" />
        )}
      </head>
      <body
        className={cn('flex h-dvh w-dvw flex-col overflow-x-hidden bg-[#f8fafc]', {
          'overscroll-y-none': isInAppDesign,
        })}
        suppressHydrationWarning
      >
        <HideFooterProvider>
          <ChunkErrorHandler />
          <ServiceWorkerManager>
            <AppShell
              header={<HeaderComponent locale={locale} inAppDesign={isInAppDesign} />}
              footer={
                <Suspense fallback={undefined}>
                  <GlobalAppFooterWrapper locale={locale} design={design} />
                </Suspense>
              }
              inAppDesign={isInAppDesign}
            >
              {children}
            </AppShell>
          </ServiceWorkerManager>
        </HideFooterProvider>
      </body>
    </html>
  );
};

export default RootLayout;

// configure the viewport and metadata
export { generateMetadata } from '@/utils/generate-metadata';
export { generateViewport } from '@/utils/generate-viewport';
