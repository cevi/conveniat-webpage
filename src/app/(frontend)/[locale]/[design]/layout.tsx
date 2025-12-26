import { AppShell } from '@/app/app-shell';
import { FooterComponent } from '@/components/footer/footer-component';
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

const RootLayout: React.FC<LayoutProperties> = async ({ children, params }) => {
  const { locale, design } = await params;
  const isInAppDesign = design === DesignCodes.APP_DESIGN;

  const localePromise = Promise.resolve(locale);
  const inAppDesignPromise = Promise.resolve(isInAppDesign);

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
      >
        <HideFooterProvider>
          <ServiceWorkerManager>
            <AppShell
              header={<HeaderComponent locale={locale} inAppDesign={isInAppDesign} />}
              footer={<FooterComponent locale={localePromise} inAppDesign={inAppDesignPromise} />}
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
