import { environmentVariables } from '@/config/environment-variables';
import { listWristbandHoefe } from '@/features/payload-cms/payload-cms/access-rules/accessible-hoefe';
import type { HofName } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import {
  hasAccessToThisUser,
  WRISTBAND_READER_ROLES,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { middleware, trpcBaseProcedure } from '@/trpc/init';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import type { Payload } from 'payload';
import { getPayload } from 'payload';

const wristbandsEnabled = middleware(({ next }) => {
  if (!environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  return next();
});

/**
 * Every signed-in user, while the wristbands are on. `ctx.payload` runs with the access
 * overridden, so each procedure checks who asks before it reads anything.
 */
export const wristbandProcedure = trpcBaseProcedure.use(wristbandsEnabled).use(async ({ next }) => {
  const payload: Payload = await getPayload({ config });
  return next({ ctx: { payload } });
});

/**
 * The people who program and hand out the bands of a Hof: its AVP, and the full admins, see
 * `listWristbandHoefe`. `ctx.assertHofAccess(hofId)` throws unless the user may.
 */
export const hofWristbandProcedure = wristbandProcedure.use(({ ctx, next }) => {
  const accessibleHoefe = async (): Promise<HofName[]> =>
    await listWristbandHoefe(ctx.payload, ctx.user);
  const assertHofAccess = async (hofId: string): Promise<void> => {
    const hoefe = await accessibleHoefe();
    if (!hoefe.some((hof) => hof.id === hofId)) throw new TRPCError({ code: 'FORBIDDEN' });
  };
  return next({ ctx: { accessibleHoefe, assertHofAccess } });
});

/** Whether the user reads bands for security and first aid, see `WRISTBAND_READER_ROLES`. */
export const isWristbandReader = (user: HitobitoNextAuthUser): boolean =>
  hasAccessToThisUser({ user, requiredRoles: WRISTBAND_READER_ROLES });

/** Security and first aid, see `WRISTBAND_READER_ROLES`. */
export const wristbandReaderProcedure = wristbandProcedure.use(({ ctx, next }) => {
  if (!isWristbandReader(ctx.user)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next();
});
