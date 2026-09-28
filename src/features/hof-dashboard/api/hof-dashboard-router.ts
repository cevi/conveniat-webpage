import { hofDashboardProcedure } from '@/features/hof-dashboard/api/hof-dashboard-access';
import { getHofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  acceptHofArea,
  reviewHofSubmission,
  withdrawHofSubmission,
} from '@/features/hof-dashboard/api/hof-dashboard-mutations';
import { getHofOverview } from '@/features/hof-dashboard/api/hof-overview';
import { HOF_DASHBOARD_AREAS, HOF_REVIEW_CHOICES } from '@/features/hof-dashboard/constants';
import { findHoefe } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { enabledLocales, LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { createTRPCRouter, publicProcedure } from '@/trpc/init';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { getPayload } from 'payload';
import { z } from 'zod';

const hofIdInput = z.object({ hofId: z.string().min(1).max(64) });

/**
 * The Hof dashboard: every procedure but the two Hof lists checks that the user may open the Hof
 * it names before it reads or writes anything of it. What a Hof hands in goes through the forms
 * linked to the dashboard, which check the Hof themselves.
 */
export const hofDashboardRouter = createTRPCRouter({
  /**
   * Every Hof by name, for the Hof selection of a form. Names are public; nothing else of a
   * Hof leaves here. Not behind the dashboard's feature flag, since forms use it without it.
   */
  getHofList: publicProcedure.query(async () => await findHoefe(await getPayload({ config }))),

  /** The Höfe whose dashboard the user may open. */
  getMyHofList: hofDashboardProcedure.query(async ({ ctx }) => await ctx.accessibleHoefe()),

  /**
   * Where every Hof stands, for the reviewers. Asked by everyone who opens the dashboard, so
   * a Hof's own people get an empty list rather than an error, and nothing is read for them.
   */
  getHofOverview: hofDashboardProcedure.query(async ({ ctx }) =>
    ctx.isReviewer
      ? { isReviewer: true, hoefe: await getHofOverview(await ctx.accessibleHoefe(), ctx.locale) }
      : { isReviewer: false, hoefe: [] },
  ),

  /** Everything one Hof's dashboard shows. */
  getHofDashboard: hofDashboardProcedure
    // the page's language, so it is part of the cached query and a switch loads the texts anew
    .input(hofIdInput.extend({ locale: z.enum([LOCALE.DE, LOCALE.FR, LOCALE.EN]).optional() }))
    .query(async ({ ctx, input }) => {
      await ctx.assertHofAccess(input.hofId);
      // a language this deployment does not serve falls back to the reader's
      const locale =
        input.locale !== undefined && enabledLocales.includes(input.locale)
          ? input.locale
          : ctx.locale;
      return await getHofDashboardData(input.hofId, locale, ctx.isReviewer);
    }),

  /** Takes back a submission the Ressort has not taken up yet; the Hof's, not a reviewer's. */
  deleteSubmission: hofDashboardProcedure
    .input(hofIdInput.extend({ submissionId: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const hof = await ctx.assertHofAccess(input.hofId);
      if (ctx.isReviewer) throw new TRPCError({ code: 'FORBIDDEN' });
      await withdrawHofSubmission(hof, input.submissionId);
    }),

  /** The Ressort's status and feedback on a submission, for the reviewers only. */
  updateSubmissionReview: hofDashboardProcedure
    .input(
      hofIdInput.extend({
        submissionId: z.string().min(1).max(64),
        status: z.enum(HOF_REVIEW_CHOICES).optional(),
        feedback: z.string().max(5000),
        final: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.isReviewer) throw new TRPCError({ code: 'FORBIDDEN' });
      const hof = await ctx.assertHofAccess(input.hofId);
      await reviewHofSubmission({
        hof,
        submissionId: input.submissionId,
        status: input.status,
        feedback: input.feedback,
        final: input.final,
        // the session's name already reads "First Last v/o Cevi name"
        reviewer: { id: ctx.user.uuid, name: ctx.user.name },
      });
    }),

  /** Accepts everything that counts of one Hof in one area at once, for the reviewers only. */
  acceptHofArea: hofDashboardProcedure
    .input(hofIdInput.extend({ area: z.enum(HOF_DASHBOARD_AREAS) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.isReviewer) throw new TRPCError({ code: 'FORBIDDEN' });
      const hof = await ctx.assertHofAccess(input.hofId);
      return await acceptHofArea({
        hof,
        area: input.area,
        locale: ctx.locale,
        reviewer: { id: ctx.user.uuid, name: ctx.user.name },
      });
    }),
});
