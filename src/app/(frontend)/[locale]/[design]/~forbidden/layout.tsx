import { Forbidden } from '@/app/(frontend)/[locale]/[design]/(payload-pages)/[[...slugs]]/forbidden';
import type { Locale } from '@/types/types';
import type React from 'react';
import type { ReactNode } from 'react';

/**
 * Renders the 403 text. It sits here rather than in `forbidden.ts`, which gets no params, like
 * the text of `~not-found`: the locale comes from the path, so the page is prerendered as a whole
 * and needs no cookie to pick its language. The frame and the title match
 * `(payload-pages)/layout.tsx`, where the page used to render it.
 */
const ForbiddenLayout: React.FC<{
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
}> = async ({ children, params }) => {
  const { locale } = await params;

  return (
    <>
      <div className="min-w-full overflow-x-hidden pt-8 pb-24 xl:px-12">
        <Forbidden locale={Promise.resolve(locale)} />
        {children}
      </div>
    </>
  );
};

export default ForbiddenLayout;
