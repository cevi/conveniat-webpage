import { Cookie, Header } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { cookies, headers } from 'next/headers';
import { design as getRootDesign } from 'next/root-params';
import 'server-only';

/**
 * Determines if the request is rendering in App Design mode.
 * Uses Next.js 16.3 `next/root-params` (`design()`) when available,
 * falling back to checking headers and cookies.
 */
export const renderInAppDesign = async (): Promise<boolean> => {
  try {
    const getRootDesignFunction = getRootDesign as () => Promise<string | undefined>;
    const rootDesign = (await getRootDesignFunction()) as DesignCodes | undefined;
    if (rootDesign !== undefined && Object.values(DesignCodes).includes(rootDesign)) {
      return rootDesign === DesignCodes.APP_DESIGN;
    }
  } catch {
    // Outside root-params context
  }

  const cookieStore = await cookies();
  const headersList = await headers();

  const renderAppDesign =
    headersList.get(Header.DESIGN_MODE) ?? cookieStore.get(Cookie.DESIGN_MODE)?.value;

  return renderAppDesign === DesignCodes.APP_DESIGN;
};
