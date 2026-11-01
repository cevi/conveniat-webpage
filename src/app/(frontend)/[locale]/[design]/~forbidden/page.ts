import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { forbidden } from 'next/navigation';

/**
 * Where the proxy rewrites a CMS page that is not meant for the signed-in visitor, see
 * `page-status-proxy.ts`.
 *
 * It calls `forbidden()` without waiting for anything, so the prerendered shell is stored
 * with 403, and that is the status every rewritten request is answered with.
 */
const ForbiddenRoute = (): never => forbidden();

export default ForbiddenRoute;

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.APP_DESIGN, DesignCodes.WEB_DESIGN];
  const locales = i18nConfig.locales as Locale[];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};
