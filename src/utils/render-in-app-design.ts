import { Cookie, Header } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { cookies, headers } from 'next/headers';
import 'server-only';

export const renderInAppDesign = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const headersList = await headers();

  const renderAppDesign =
    headersList.get(Header.DESIGN_MODE) ?? cookieStore.get(Cookie.DESIGN_MODE)?.value;

  return renderAppDesign === DesignCodes.APP_DESIGN;
};
