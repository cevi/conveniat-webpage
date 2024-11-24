import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const GET = async () => {
  const cookieStore = await cookies();
  cookieStore.delete('authjs.csrf-token');
  cookieStore.delete('authjs.session-token');

  return redirect('/');
};
