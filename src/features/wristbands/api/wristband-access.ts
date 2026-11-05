import { environmentVariables } from '@/config/environment-variables';
import type { WristbandHof } from '@/features/payload-cms/payload-cms/access-rules/accessible-hoefe';
import { listWristbandHoefe } from '@/features/payload-cms/payload-cms/access-rules/accessible-hoefe';
import {
  hasAccessToThisUser,
  WRISTBAND_READER_ROLES,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { wristbandErrorTexts } from '@/features/wristbands/error-texts';
import { createErrorThrower } from '@/trpc/error-formatter';
import { middleware, trpcBaseProcedure } from '@/trpc/init';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import type { Payload } from 'payload';
import { getPayload } from 'payload';

const wristbandError = createErrorThrower(wristbandErrorTexts);

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
 * The people who program and hand out the bands of a Hof: its AVP, the helpers the AVP named
 * and the full admins, see `listWristbandHoefe`. `ctx.assertHofAccess(hofId)` throws unless the
 * user may; `ctx.assertHofAvp(hofId)` also refuses a helper, for naming and removing helpers.
 */
export const hofWristbandProcedure = wristbandProcedure.use(({ ctx, next }) => {
  const accessibleHoefe = async (): Promise<WristbandHof[]> =>
    await listWristbandHoefe(ctx.payload, ctx.user);
  // a reason: a helper the AVP removed still has the station in the list the phone kept
  const assertHofAccess = async (hofId: string): Promise<void> => {
    const hoefe = await accessibleHoefe();
    if (!hoefe.some((hof) => hof.id === hofId)) throw wristbandError('FORBIDDEN', 'notYourHof');
  };
  const assertHofAvp = async (hofId: string): Promise<void> => {
    const hoefe = await accessibleHoefe();
    const hof = hoefe.find((entry) => entry.id === hofId);
    if (hof === undefined) throw wristbandError('FORBIDDEN', 'notYourHof');
    // a helper whose page still offers it from a cached list of before
    if (hof.role !== 'avp') throw wristbandError('FORBIDDEN', 'notHofAvp');
  };
  return next({ ctx: { accessibleHoefe, assertHofAccess, assertHofAvp } });
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
