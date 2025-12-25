import { Cookie } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { cookies } from 'next/headers';
import 'server-only';

export const renderInAppDesign = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const renderAppDesign = cookieStore.get(Cookie.DESIGN_MODE);
  return renderAppDesign?.value === DesignCodes.APP_DESIGN;
};
