import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { unauthorized } from 'next/navigation';

/**
 * Where the proxy rewrites a CMS page that needs a login for a visitor without one, see
 * `page-status-proxy.ts`.
 *
 * It calls `unauthorized()` without waiting for anything, so the prerendered shell is stored
 * with 401, and that is the status every rewritten request is answered with.
 */
const UnauthorizedRoute = (): never => unauthorized();

export default UnauthorizedRoute;

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.APP_DESIGN, DesignCodes.WEB_DESIGN];
  const locales = i18nConfig.locales as Locale[];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};
