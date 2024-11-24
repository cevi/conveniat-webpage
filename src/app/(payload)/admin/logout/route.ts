import { redirect } from 'next/navigation';

export const GET = () => {
  return redirect('/api/auth/signout');
};
