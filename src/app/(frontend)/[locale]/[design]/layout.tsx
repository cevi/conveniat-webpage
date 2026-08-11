import { AppShell } from '@/app/app-shell';
import { ChunkErrorHandler } from '@/components/chunk-error-handler';
import { AppNavBarServer } from '@/components/footer/app-nav-bar-server';
import { FooterCopyrightArea } from '@/components/footer/footer-copyright-area';
import { FooterCopyrightClientWrapper } from '@/components/footer/footer-copyright-client-wrapper';
import { GlobalAppFooterClientWrapper } from '@/components/footer/global-app-footer-client-wrapper';
import { HideFooterProvider } from '@/components/footer/hide-footer-context';
import { HeaderComponent } from '@/components/header/header-component';
import { ServiceWorkerManager } from '@/components/service-worker/service-worker-manager';
import { HideBackgroundLogoProvider } from '@/components/ui/hide-background-logo-context';
import { environmentVariables } from '@/config/environment-variables';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { getFeatureFlag } from '@/lib/db/redis';
import { FEATURE_FLAG_REDESIGNED_MAIN_MENU_ENABLED } from '@/lib/feature-flags';
import type { Locale, NavigationMode } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { sharedFontClassName } from '@/utils/fonts';
import { cn } from '@/utils/tailwindcss-override';
import { SessionProvider } from 'next-auth/react';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

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
    <GlobalAppFooterClientWrapper
      locale={locale}
      isAppMode={isInAppDesign}
      appNavBar={<AppNavBarServer locale={locale} />}
      copyrightArea={
        <FooterCopyrightClientWrapper>
          <FooterCopyrightArea locale={locale} inAppDesign={isInAppDesign} />
        </FooterCopyrightClientWrapper>
      }
    />
  );
};

const validLocales = new Set<string>(Object.values(LOCALE));
const validDesigns = new Set<string>(Object.values(DesignCodes));

/**
 * `[locale]` and `[design]` match any two segments, so a request for a path this app
 * does not own — most importantly a `/_next/static/...` asset that is no longer part
 * of the current build — used to render this layout and return 200 with an HTML body.
 * The browser then parsed that HTML as JavaScript ("Unexpected token '<'"), and the
 * service worker cached it under the asset's URL, so the failure survived reloads.
 */
const RootLayout: React.FC<LayoutProperties> = async ({ children, params }) => {
  const { locale, design } = await params;

  if (!validLocales.has(locale) || !validDesigns.has(design)) {
    notFound();
  }

  const isInAppDesign = design === DesignCodes.APP_DESIGN;
  const isRedesignedMenuEnabled = await getFeatureFlag(FEATURE_FLAG_REDESIGNED_MAIN_MENU_ENABLED);
  const navigationMode: NavigationMode =
    isRedesignedMenuEnabled && !isInAppDesign ? 'top-nav' : 'side-nav';

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
        <SessionProvider>
          <Toaster position="top-center" richColors closeButton />
          <HideFooterProvider>
            <HideBackgroundLogoProvider>
              <ChunkErrorHandler />
              <ServiceWorkerManager>
                <AppShell
                  header={
                    <Suspense fallback={undefined}>
                      <HeaderComponent
                        locale={locale}
                        inAppDesign={isInAppDesign}
                        navigationMode={navigationMode}
                      />
                    </Suspense>
                  }
                  footer={
                    <Suspense fallback={undefined}>
                      <GlobalAppFooterWrapper locale={locale} design={design} />
                    </Suspense>
                  }
                  inAppDesign={isInAppDesign}
                  navigationMode={navigationMode}
                >
                  {children}
                </AppShell>
              </ServiceWorkerManager>
            </HideBackgroundLogoProvider>
          </HideFooterProvider>
        </SessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;

// configure the viewport and metadata
export { generateMetadata } from '@/utils/generate-metadata';
export { generateViewport } from '@/utils/generate-viewport';
