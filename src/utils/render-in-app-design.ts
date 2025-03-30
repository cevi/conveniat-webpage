import 'server-only';
import { cookies } from 'next/headers';

export const renderInAppDesign = async () => {
  const cookieStore = await cookies();
  const renderAppDesign = cookieStore.get('app-design');
  return renderAppDesign?.value === 'true';
};
