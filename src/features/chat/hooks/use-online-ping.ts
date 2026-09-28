import { ONLINE_WINDOW_MS } from '@/features/chat/constants';
import { trpc } from '@/trpc/client';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

/**
 * Leaves each ping 5 s to reach the server before the last one drops out of the online
 * window, and is no shorter than that: every ping is a row update on `User`.
 */
const ONLINE_PING_INTERVAL_MS = ONLINE_WINDOW_MS - 5000;

/**
 * Keeps the current user shown as online while the chat is on screen.
 *
 * Pings only while the page is visible: a phone with the chat open in the background is
 * not someone who can answer, and at camp scale those pings kept Postgres busy all night.
 * Coming back to the page pings at once instead of waiting for the next tick.
 */
export const useOnlinePing = (): void => {
  const { status } = useSession();

  const { mutate: ping } = trpc.chat.onlinePing.useMutation({
    networkMode: 'always',
    retry: false,
  });

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;

    const stop = (): void => {
      clearInterval(interval);
      interval = undefined;
    };

    const handleVisibilityChange = (): void => {
      stop();
      if (document.visibilityState !== 'visible') return;
      ping({});
      interval = setInterval(() => ping({}), ONLINE_PING_INTERVAL_MS);
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return (): void => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [ping, status]);
};
