import { SetHideCopyrightFooter } from '@/components/footer/hide-footer-context';
import { ClientProviders } from '@/context/client-providers';
import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionProvider } from 'next-auth/react';
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
      <SessionProvider>
        <ClientProviders>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" />
          <SetHideCopyrightFooter value />
          <div className="mb-20">{children}</div>
          <div></div>
        </ClientProviders>
      </SessionProvider>
    </Suspense>
  );
};

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.APP_DESIGN];
  const locales: Locale[] = ['de', 'fr', 'en'];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};

export default AppLayout;
