import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { notFound } from 'next/navigation';

/**
 * Where the proxy rewrites a path that resolves to no CMS page, see `not-found-proxy.ts`.
 *
 * It calls `notFound()` without waiting for anything, so the prerendered shell is stored with
 * 404, and that is the status every rewritten request is answered with.
 */
const NotFoundRoute = (): never => notFound();

export default NotFoundRoute;

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.APP_DESIGN, DesignCodes.WEB_DESIGN];
  const locales = i18nConfig.locales as Locale[];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};
