import { SetHideCopyrightFooter } from '@/components/footer/hide-footer-context';
import { ClientProviders } from '@/context/client-providers';
import { BlockedUserGate } from '@/features/user-blocking/components/blocked-user-gate';
import type { Locale } from '@/types/types';
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

const AppLayout: React.FC<LayoutProperties> = async ({ children, params }) => {
  const { locale } = await params;

  return (
    <Suspense fallback={undefined}>
      <ClientProviders>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" />
        <SetHideCopyrightFooter value />
        <div className="mb-20">
          <BlockedUserGate locale={locale}>{children}</BlockedUserGate>
        </div>
        <div></div>
      </ClientProviders>
    </Suspense>
  );
};

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.APP_DESIGN];
  const locales: Locale[] = ['de', 'fr', 'en'];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};

export default AppLayout;
