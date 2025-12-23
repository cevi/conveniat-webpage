import { DynamicAppTitleProvider } from '@/components/header/dynamic-app-title-name';
import { HeaderClientWrapper } from '@/components/header/header-client-wrapper';
import { HideHeaderProvider } from '@/components/header/hide-header-context';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { PostHogProvider } from '@/providers/post-hog-provider';
import { TRPCProvider } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Inter, Montserrat } from 'next/font/google';
import type { ReactNode } from 'react';

// These styles apply to every route in the application
import '@/app/globals.scss';
import { HeaderComponent } from '@/components/header/header-component';
import { DesignCodes } from '@/utils/design-codes';

interface LayoutProperties {
  children: ReactNode;
  params: Promise<{
    locale: Locale;
    design: DesignCodes;
  }>;
}

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'block',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'block',
});

const RootLayout: React.FC<LayoutProperties> = async ({ children, params }) => {
  const { locale, design } = await params;
  const isInAppDesign = design === DesignCodes.APP_DESIGN;

  return (
    <html
      className={cn(`${montserrat.className} ${inter.className}`, {
        'overscroll-y-none': isInAppDesign,
      })}
      lang={locale}
      suppressHydrationWarning
    >
      <body
        className={cn('flex h-dvh w-dvw flex-col overflow-x-hidden bg-[#f8fafc]', {
          'overscroll-y-none': isInAppDesign,
        })}
      >
        {/* !isInAppDesign && <NextTopLoader showSpinner={false} color="#47564c" zIndex={999} /> */}

        <PostHogProvider>
          <TRPCProvider>
            <HideHeaderProvider>
              <DynamicAppTitleProvider>
                <HeaderClientWrapper>
                  <HeaderComponent locale={locale} inAppDesign={isInAppDesign} />
                </HeaderClientWrapper>
                <div className="absolute top-0 z-[-999] h-screen w-full p-[56px] xl:pl-[480px]">
                  <CeviLogo className="mx-auto h-full max-h-[60vh] w-full max-w-[384px] opacity-10 blur-md" />
                </div>

                <div className="mt-[62px] h-[calc(100dvh-62px)] xl:ml-[480px]">
                  <main className="flex min-h-full flex-col justify-between">{children}</main>
                </div>
              </DynamicAppTitleProvider>
            </HideHeaderProvider>
          </TRPCProvider>
        </PostHogProvider>
      </body>
    </html>
  );
};

export default RootLayout;

// configure the viewport and metadata
export { generateMetadata } from '@/utils/generate-metadata';
export { generateViewport } from '@/utils/generate-viewport';
