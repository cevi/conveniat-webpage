import 'server-only';
import { cookies } from 'next/headers';
import { Cookie } from '@/types';

export const renderInAppDesign = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const renderAppDesign = cookieStore.get(Cookie.APP_DESIGN);
  return renderAppDesign?.value === 'true';
};
