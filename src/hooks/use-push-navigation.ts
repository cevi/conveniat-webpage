'use client';

import { assignLocation } from '@/utils/assign-location';
import { chatIdOfTarget, isOtherOriginTarget, resolvePushTarget } from '@/utils/push-target';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useTransition } from 'react';

const PENDING_PUSH_REDIRECT_KEY = 'pending_push_redirect';

/** The target is kept in both storages: a cold start of the app may have only one of them. */
const rememberPendingTarget = (target: string): void => {
  try {
    sessionStorage.setItem(PENDING_PUSH_REDIRECT_KEY, target);
    localStorage.setItem(PENDING_PUSH_REDIRECT_KEY, target);
  } catch {
    // storage unavailable
  }
};

const forgetPendingTarget = (): void => {
  try {
    sessionStorage.removeItem(PENDING_PUSH_REDIRECT_KEY);
    localStorage.removeItem(PENDING_PUSH_REDIRECT_KEY);
  } catch {
    // storage unavailable
  }
};

const readPendingTarget = (): string | undefined => {
  try {
    const target =
      sessionStorage.getItem(PENDING_PUSH_REDIRECT_KEY) ??
      localStorage.getItem(PENDING_PUSH_REDIRECT_KEY);
    return target === null || target.trim() === '' ? undefined : target.trim();
  } catch {
    return undefined;
  }
};

const currentHref = (): string => {
  const { pathname, search, hash } = globalThis.location;
  return pathname + search + hash;
};

/**
 * Whether the page shows a same-origin target. Query and fragment count, because they select
 * what the page shows; for a chat, any view of that chat counts.
 */
const isAtTarget = (target: string): boolean => {
  if (currentHref() === target) return true;
  const chatId = chatIdOfTarget(target);
  return chatId !== undefined && chatIdOfTarget(globalThis.location.pathname) === chatId;
};

/**
 * Opens the target of a tapped push. Within this origin it is a soft navigation: the router
 * fetches the next page while the current one stays, which on camp wifi takes seconds. The page
 * is loaded anew only when the router gave up, that is when its transition ended without the
 * page reaching the target and without anything else having moved it.
 *
 * The target is remembered until it is reached, so that `resumePendingPushNavigation` can open
 * it after a cold start or when the app returns from the background.
 */
export function usePushNavigation(): {
  navigateToPushTarget: (rawTarget: string) => void;
  resumePendingPushNavigation: () => void;
} {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  /** The navigation started here and not settled yet, with the page it started from. */
  const inFlight = useRef<{ target: string; from: string } | undefined>(undefined);

  const softNavigate = useCallback(
    (target: string): void => {
      inFlight.current = { target, from: currentHref() };
      // Caught inside: a transition hands what its callback throws to the error boundary.
      startTransition(() => {
        try {
          router.push(target);
        } catch (error: unknown) {
          // The router throws before it is initialised; the transition then ends without the
          // page having moved, and the effect below loads the target.
          console.warn('[PushNavigation] Router push failed:', error);
        }
      });
    },
    [router],
  );

  useEffect(() => {
    if (isPending) return;
    const navigation = inFlight.current;
    if (navigation === undefined) return;
    inFlight.current = undefined;

    // A redirect or a navigation of the user's own moved the page: that one wins.
    if (isAtTarget(navigation.target) || currentHref() !== navigation.from) {
      forgetPendingTarget();
      return;
    }
    console.warn(
      '[PushNavigation] Router did not reach the target, loading it:',
      navigation.target,
    );
    // The page load is the last attempt: a target the server sends elsewhere would otherwise be
    // resumed and loaded again after every load.
    forgetPendingTarget();
    assignLocation(navigation.target);
  }, [isPending]);

  const navigateToPushTarget = useCallback(
    (rawTarget: string): void => {
      if (rawTarget.trim() === '') return;
      // Resolved here, in front of the navigation itself, so that no caller can hand it a
      // `javascript:` URL: `location.assign()` would run it in this origin.
      const target = resolvePushTarget(rawTarget.trim());

      // The router only moves within this origin, and a remembered target would be replayed on
      // every resume, so another origin gets a single full navigation.
      if (isOtherOriginTarget(target)) {
        assignLocation(target);
        return;
      }

      rememberPendingTarget(target);
      softNavigate(target);
    },
    [softNavigate],
  );

  const resumePendingPushNavigation = useCallback((): void => {
    const pending = readPendingTarget();
    if (pending === undefined) return;
    const target = resolvePushTarget(pending);
    if (isOtherOriginTarget(target) || isAtTarget(target)) {
      forgetPendingTarget();
      return;
    }
    softNavigate(target);
  }, [softNavigate]);

  return { navigateToPushTarget, resumePendingPushNavigation };
}
