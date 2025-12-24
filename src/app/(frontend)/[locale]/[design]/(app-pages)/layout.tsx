import type { ReactNode } from 'react';
import React from 'react';

import { SetHideCopyrightFooter } from '@/components/footer/hide-footer-context';
import { StarProvider } from '@/context/star-context';
import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { SessionProvider } from 'next-auth/react';

interface LayoutProperties {
  children: ReactNode;
  params: Promise<{
    locale: Locale;
    design: DesignCodes;
  }>;
}

const AppLayout: React.FC<LayoutProperties> = ({ children }) => {
  return (
    <StarProvider>
      <SetHideCopyrightFooter value />
      <SessionProvider>
        <div className="mb-20">{children}</div>
      </SessionProvider>
      <div></div>
    </StarProvider>
  );
};

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.APP_DESIGN];
  const locales: Locale[] = ['de', 'fr', 'en'];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};

export default AppLayout;
