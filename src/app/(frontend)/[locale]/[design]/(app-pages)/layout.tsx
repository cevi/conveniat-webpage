import { SetHideCopyrightFooter } from '@/components/footer/hide-footer-context';
import { ClientProviders } from '@/context/client-providers';
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
    <Suspense fallback={undefined}>
      <ClientProviders>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" />
        <SetHideCopyrightFooter value />
        {/* An app page opened from a link renders in the website design, whose round logo
            hangs 25px out of the header below xl. Its pages are laid out for the app's flat
            header, so on the website they start lower, the fixed and sticky ones included. */}
        <div className="mb-20 max-xl:[html:not([data-app])_&]:pt-[28px] max-xl:[html:not([data-app])_&]:[--app-content-top:calc(90px+var(--preview-banner-height))] max-xl:[html:not([data-app])_&]:[--app-header-height:calc(88px+var(--preview-banner-height))]">
          {children}
        </div>
        <div></div>
      </ClientProviders>
    </Suspense>
  );
};

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.APP_DESIGN];
  const locales = i18nConfig.locales as Locale[];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};

export default AppLayout;
