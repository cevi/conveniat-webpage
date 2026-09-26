import { hofDashboardProcedure } from '@/features/hof-dashboard/api/hof-dashboard-access';
import { getHofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  completeHofUpload,
  createHofUploadUrl,
  setHofSafetyRisk,
  updateHofMaterialOrder,
} from '@/features/hof-dashboard/api/hof-dashboard-mutations';
import {
  HOF_FILE_KINDS,
  HOF_ORDER_MAX_QUANTITY,
  HOF_ORDER_TYPES,
  HOF_SUBMISSION_TYPES,
} from '@/features/hof-dashboard/constants';
import { findHoefe } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { createTRPCRouter, publicProcedure } from '@/trpc/init';
import config from '@payload-config';
import { getPayload } from 'payload';
import { z } from 'zod';

const hofIdInput = z.object({ hofId: z.string().min(1).max(64) });
const submissionTypeSchema = z.enum(HOF_SUBMISSION_TYPES);

/**
 * The Hof dashboard: every procedure but the Hof list checks that the user may open the Hof
 * it names before it reads or writes anything of it.
 */
export const hofDashboardRouter = createTRPCRouter({
  /**
   * Every Hof by name, for the Hof selection of a form. Names are public; nothing else of a
   * Hof leaves here. Not behind the dashboard's feature flag, since forms use it without it.
   */
  getHofList: publicProcedure.query(async () => await findHoefe(await getPayload({ config }))),

  /** The Höfe whose dashboard the user may open. */
  getMyHofList: hofDashboardProcedure.query(async ({ ctx }) => await ctx.accessibleHoefe()),

  /** Everything one Hof's dashboard shows. */
  getHofDashboard: hofDashboardProcedure.input(hofIdInput).query(async ({ ctx, input }) => {
    await ctx.assertHofAccess(input.hofId);
    const data = await getHofDashboardData(input.hofId, ctx.locale);
    // reviewers may still change an order after its deadline
    return { ...data, isReviewer: ctx.isReviewer };
  }),

  /** Where the browser puts a file before `completeUpload` files it. */
  createUploadUrl: hofDashboardProcedure
    .input(hofIdInput.extend({ filename: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.assertHofAccess(input.hofId);
      return await createHofUploadUrl(input.hofId, input.filename);
    }),

  completeUpload: hofDashboardProcedure
    .input(
      hofIdInput.extend({
        submissionType: submissionTypeSchema,
        kind: z.enum(HOF_FILE_KINDS),
        key: z.string().min(1).max(400),
        filename: z.string().min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.assertHofAccess(input.hofId);
      await completeHofUpload({ ...input, userId: ctx.user.uuid });
    }),

  updateSafetyRisk: hofDashboardProcedure
    .input(
      hofIdInput.extend({
        submissionType: submissionTypeSchema,
        elevatedSafetyRisk: z.enum(['yes', 'no']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.assertHofAccess(input.hofId);
      await setHofSafetyRisk(input.hofId, input.submissionType, input.elevatedSafetyRisk);
    }),

  updateMaterialOrder: hofDashboardProcedure
    .input(
      hofIdInput.extend({
        orderType: z.enum(HOF_ORDER_TYPES),
        quantities: z
          .array(
            z.object({
              itemId: z.string().min(1).max(64),
              quantity: z.number().int().min(0).max(HOF_ORDER_MAX_QUANTITY),
            }),
          )
          .max(200),
        powerConnection: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.assertHofAccess(input.hofId);
      await updateHofMaterialOrder({
        ...input,
        userId: ctx.user.uuid,
        isReviewer: ctx.isReviewer,
      });
    }),
});
