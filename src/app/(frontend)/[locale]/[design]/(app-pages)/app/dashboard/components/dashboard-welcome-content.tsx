import { getAppLandingPageCached } from '@/features/payload-cms/api/cached-globals';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type { Locale } from '@/types/types';
import { connection } from 'next/server';
import type React from 'react';

/**
 * Optional CMS welcome content blocks shown below the dashboard title.
 *
 * Content blocks can only be rendered on the server (they may access
 * server-only data and the admin session), so this stays a dynamic section.
 * It is rendered with an empty Suspense fallback: nothing is shown while it
 * streams in, which keeps the dashboard free of loading skeletons.
 */
export const DashboardWelcomeContent: React.FC<{ locale: Locale }> = async ({ locale }) => {
  await connection();
  const landingPage = await getAppLandingPageCached(locale);

  const pageContent = landingPage.pageContent;
  if (!pageContent || pageContent.length === 0) return <></>;

  return <PageSectionsConverter locale={locale} blocks={pageContent as ContentBlock[]} />;
};
