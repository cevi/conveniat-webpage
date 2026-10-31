import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import React, { Suspense } from 'react';

interface LayoutProperties {
  children: ReactNode;
  params: Promise<{
    locale: Locale;
    design: DesignCodes;
  }>;
}

const AppLayout: React.FC<LayoutProperties> = ({ children }) => {
  return (
    // ClientProviders are mounted once by the AppShell in the parent layout.
    <Suspense fallback={undefined}>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" />
      {/* An app page opened from a link renders in the website design, whose round logo
          hangs out of the header below xl. Its pages are laid out for the app's flat header,
          so on the website they start below a white band as tall as the overhang, the fixed
          ones too. A full-bleed page like the Karte covers the band and moves only its
          controls down by --app-logo-overhang. */}
      <div className="max-xl:site:[--app-content-top:calc(90px+var(--preview-banner-height))] max-xl:site:[--app-logo-overhang:28px] mb-(--app-tab-bar-height) [--app-logo-overhang:0px]">
        <div aria-hidden="true" className="h-(--app-logo-overhang) bg-white" />
        {children}
      </div>
    </Suspense>
  );
};

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.APP_DESIGN];
  const locales = i18nConfig.locales as Locale[];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};

export default AppLayout;
