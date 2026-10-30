import { NotFound } from '@/app/(frontend)/(not-found)/not-found';
import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import type React from 'react';
import type { ReactNode } from 'react';

/**
 * Renders the 404 text. It sits here rather than in `not-found.tsx`, which gets no params: the
 * locale and the design come from the path, so the page is prerendered as a whole and needs no
 * cookie to pick its language.
 */
const NotFoundLayout: React.FC<{
  children: ReactNode;
  params: Promise<{ locale: Locale; design: DesignCodes }>;
}> = async ({ children, params }) => {
  const { locale, design } = await params;

  return (
    <>
      <NotFound locale={Promise.resolve(locale)} inAppDesign={design === DesignCodes.APP_DESIGN} />
      {children}
    </>
  );
};

export default NotFoundLayout;
