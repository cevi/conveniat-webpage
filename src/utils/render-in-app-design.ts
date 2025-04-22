import { Cookie } from '@/types/types';
import { cookies } from 'next/headers';
import 'server-only';

export const renderInAppDesign = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const renderAppDesign = cookieStore.get(Cookie.APP_DESIGN);
  return renderAppDesign?.value === 'true';
};
