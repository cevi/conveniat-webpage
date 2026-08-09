import { QRCodeServerComponent } from '@/features/chat/components/qr-server-component';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { io } from 'next/cache';
import { redirect } from 'next/navigation';
import type React from 'react';

/**
 * QR invite button of the chat overview.
 *
 * Reading the session is what makes the chat overview dynamic, so it is
 * isolated here: rendered inside its own Suspense boundary it keeps the
 * surrounding page shell static, which lets the router serve the shell from
 * its cache instead of re-running the whole page on every navigation.
 *
 * `io()`, not `connection()`: both keep this out of the build-time prerender,
 * but `connection()` never resolves for a prefetch, which would leave the
 * segment permanently partial and drive an endless runtime-prefetch retry
 * loop (see #1470).
 */
export const ChatQrCodeButton: React.FC = async () => {
  await io();

  const session = await auth();
  const user = isValidNextAuthUser(session?.user) ? session.user : undefined;

  if (user?.uuid === undefined) {
    redirect('/entrypoint?clearSkip=true');
  }

  return <QRCodeServerComponent userId={user.uuid} />;
};
