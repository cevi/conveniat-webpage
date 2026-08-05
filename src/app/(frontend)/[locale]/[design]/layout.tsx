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
import { getFeatureFlag } from '@/lib/db/redis';
import { FEATURE_FLAG_REDESIGNED_MAIN_MENU_ENABLED } from '@/lib/feature-flags';
import type { Locale, NavigationMode } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { sharedFontClassName } from '@/utils/fonts';
import { cn } from '@/utils/tailwindcss-override';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

// These styles apply to every route in the application
import '@/app/globals.scss';

import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';

interface LayoutProperties {
  children: ReactNode;
  params?: Promise<{
    locale?: Locale;
    design?: DesignCodes;
  }>;
}

const GlobalAppFooterWrapper: React.FC<{
  locale?: Locale;
  design?: DesignCodes;
}> = async ({ locale: localeProperty, design: designProperty }) => {
  const locale = localeProperty ?? (await getLocaleFromCookies());
  const isInAppDesign =
    designProperty === undefined
      ? await renderInAppDesign()
      : designProperty === DesignCodes.APP_DESIGN;

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

const RootLayout: React.FC<LayoutProperties> = async ({ children, params }) => {
  const resolvedParameters = params ? await params : undefined;
  const locale = resolvedParameters?.locale ?? (await getLocaleFromCookies());
  const isInAppDesign =
    resolvedParameters?.design === undefined
      ? await renderInAppDesign()
      : resolvedParameters.design === DesignCodes.APP_DESIGN;
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  function handleChunkError(msg, url) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    var errorMessage = String(msg || '');
    var scriptUrl = String(url || '');
    var isSyntaxError = errorMessage.indexOf("Unexpected token '<'") !== -1;
    var isChunkError =
      errorMessage.indexOf("ChunkLoadError") !== -1 ||
      errorMessage.indexOf("Failed to load chunk") !== -1 ||
      errorMessage.indexOf("Loading chunk") !== -1 ||
      errorMessage.indexOf("bad-precaching-response") !== -1 ||
      errorMessage.indexOf("Failed to fetch dynamically imported module") !== -1 ||
      (scriptUrl && scriptUrl.indexOf("/_next/static/") !== -1 && isSyntaxError);
    if (isSyntaxError || isChunkError) {
      console.warn('[EarlyChunkHandler] Chunk/Precaching error detected:', errorMessage, scriptUrl);
      var lastReload = sessionStorage.getItem('chunk_reload_time');
      var now = Date.now();
      if (!lastReload || (now - Number(lastReload) > 5000)) {
        sessionStorage.setItem('chunk_reload_time', String(now));
        if (errorMessage.indexOf("bad-precaching-response") !== -1 && 'serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(regs) {
            for (var i = 0; i < regs.length; i++) { regs[i].unregister(); }
            window.location.reload();
          }).catch(function() { window.location.reload(); });
        } else {
          window.location.reload();
        }
      }
    }
  }
  window.addEventListener('error', function(event) {
    handleChunkError(event.message, event.filename);
  }, true);
  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason || {};
    var msg = reason instanceof Error ? reason.message : String(reason);
    handleChunkError(msg, '');
  });
})();
            `,
          }}
        />
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
                    <HeaderComponent
                      locale={locale}
                      inAppDesign={isInAppDesign}
                      navigationMode={navigationMode}
                    />
                  }
                  footer={
                    <Suspense fallback={undefined}>
                      <GlobalAppFooterWrapper />
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
