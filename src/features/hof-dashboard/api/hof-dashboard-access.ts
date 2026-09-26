import { environmentVariables } from '@/config/environment-variables';
import {
  type AccessibleHof,
  isHofDashboardReviewer,
  listAccessibleHoefe,
} from '@/features/hof-dashboard/api/accessible-hoefe';
import { middleware, trpcBaseProcedure } from '@/trpc/init';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { getPayload } from 'payload';

const hofDashboardEnabled = middleware(({ next }) => {
  if (!environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  return next();
});

/**
 * Every signed-in user. `ctx.accessibleHoefe()` lists the Höfe they may open, read on first use
 * and then kept; `ctx.assertHofAccess(hofId)` throws unless the Hof is one of them.
 */
export const hofDashboardProcedure = trpcBaseProcedure
  .use(hofDashboardEnabled)
  .use(({ ctx, next }) => {
    let accessible: Promise<AccessibleHof[]> | undefined;
    const accessibleHoefe = (): Promise<AccessibleHof[]> =>
      (accessible ??= getPayload({ config }).then((payload) =>
        listAccessibleHoefe(payload, ctx.user),
      ));
    const assertHofAccess = async (hofId: string): Promise<AccessibleHof> => {
      const hoefe = await accessibleHoefe();
      const hof = hoefe.find((candidate) => candidate.id === hofId);
      if (hof === undefined) throw new TRPCError({ code: 'FORBIDDEN' });
      return hof;
    };
    return next({
      ctx: {
        accessibleHoefe,
        assertHofAccess,
        isReviewer: isHofDashboardReviewer(ctx.user),
      },
    });
  });
