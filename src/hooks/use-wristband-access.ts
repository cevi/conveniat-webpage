'use client';

import { useAuthStatus } from '@/hooks/use-auth-status';
import { trpc } from '@/trpc/client';

/** What the signed-in user does with the NFC wristbands, as the menu and Home offer it. */
export interface WristbandUse {
  /** programs and hands out the bands of a Hof, as its AVP */
  program: boolean;
  /** reads bands, for security and first aid */
  read: boolean;
}

/**
 * What the user does with the wristbands, or undefined while that is unknown or nothing. Asks
 * only once signed in: a guest's request would be answered with a 401, which signs the app
 * out. The answer is no secret and stays in the persisted cache, so the ways in show offline
 * too; a cache restored from an older app may hold another shape, so it is read defensively.
 *
 * @param enabled - whether the deployment turned the wristbands on
 */
export const useWristbandAccess = (enabled: boolean): WristbandUse | undefined => {
  const signedIn = useAuthStatus() === 'authenticated';
  const access: unknown = trpc.wristband.getWristbandAccess.useQuery(undefined, {
    enabled: enabled && signedIn,
  }).data;
  if (!enabled || !signedIn || typeof access !== 'object' || access === null) return undefined;

  const { hoefe, reader } = access as Record<string, unknown>;
  const use = { program: typeof hoefe === 'number' && hoefe > 0, read: reader === true };
  return use.program || use.read ? use : undefined;
};
