import { UnauthorizedPage } from '@/app/(frontend)/[locale]/[design]/(payload-pages)/[[...slugs]]/unauthorized';
import { DEFAULT_APP_TITLE } from '@/components/header/dynamic-app-title-name';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import type React from 'react';
import type { ReactNode } from 'react';

/**
 * Renders the login prompt of a CMS page that needs a login. It sits here rather than in
 * `unauthorized.ts`, like the text of `~not-found`. The frame and the title match
 * `(payload-pages)/layout.tsx`, where the page used to render it.
 */
const UnauthorizedLayout: React.FC<{ children: ReactNode }> = ({ children }) => (
  <>
    <SetDynamicPageTitle newTitle={DEFAULT_APP_TITLE} />
    <div className="min-w-full overflow-x-hidden pt-8 pb-24 xl:px-12">
      <UnauthorizedPage />
      {children}
    </div>
  </>
);

export default UnauthorizedLayout;
