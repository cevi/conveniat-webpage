import { listWristbandHoefe } from '@/features/payload-cms/payload-cms/access-rules/accessible-hoefe';
import {
  hofWristbandProcedure,
  isWristbandReader,
  wristbandProcedure,
  wristbandReaderProcedure,
} from '@/features/wristbands/api/wristband-access';
import {
  assignWristband,
  getHofWristbandList,
  getWristbandCard,
  getWristbandRoster,
  identifyWristband,
  programWristband,
  registerWristband,
  revokeWristband,
  unassignWristband,
} from '@/features/wristbands/api/wristband-service';
import { wristbandErrorTexts } from '@/features/wristbands/error-texts';
import type { WristbandAccess } from '@/features/wristbands/types';
import { createErrorThrower } from '@/trpc/error-formatter';
import { createTRPCRouter } from '@/trpc/init';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import { z } from 'zod';

/** The UID as the native bridge reports it, 7 bytes in uppercase hex. */
const uid = z
  .string()
  .regex(/^[0-9A-Fa-f]{14}$/)
  .transform((value) => value.toUpperCase());

const wristbandError = createErrorThrower(wristbandErrorTexts);

/** NXP's 32-byte signature, or null for a chip that has none or a cold tap that read none. */
const signature = z
  .string()
  .regex(/^[0-9A-Fa-f]{64}$/)
  .transform((value) => value.toUpperCase())
  .nullable();

const hofId = z.string().min(1).max(64);
const hofBand = z.object({ hofId, uid });

/**
 * The NFC wristbands. The AVP of a Hof programs its bands and hands them to the people of the
 * Hof; security and first aid read them. The password of a band is never stored nor logged:
 * it is derived anew on every call.
 */
export const wristbandRouter = createTRPCRouter({
  /**
   * What the user does with the bands, so the app shows the AVP's page and the reader's only to
   * whom the server lets in. Persisted with the query cache, so the reader's page opens offline.
   */
  getWristbandAccess: wristbandProcedure.query(async ({ ctx }): Promise<WristbandAccess> => {
    const hoefe = await listWristbandHoefe(ctx.payload, ctx.user);
    return { hoefe: hoefe.length, reader: isWristbandReader(ctx.user) };
  }),

  /** The Höfe whose bands the user hands out. */
  getMyHofList: hofWristbandProcedure.query(async ({ ctx }) => await ctx.accessibleHoefe()),

  /** The people of a Hof with their bands, and the bands not handed out yet. */
  getHofWristbandList: hofWristbandProcedure
    .input(z.object({ hofId }))
    .query(async ({ ctx, input }) => {
      await ctx.assertHofAccess(input.hofId);
      return await getHofWristbandList(ctx.payload, input.hofId);
    }),

  /**
   * Answers the native `credentials-needed` event while the band lies on the phone: the write
   * password, or the reason to pass to `abort`.
   */
  programWristband: hofWristbandProcedure
    .input(hofBand.extend({ signature }))
    .mutation(async ({ ctx, input }) => {
      await ctx.assertHofAccess(input.hofId);
      return await programWristband(ctx.payload, input);
    }),

  /** Records the band for the Hof after the native `provisioned` event. */
  registerWristband: hofWristbandProcedure
    .input(hofBand.extend({ signature }))
    .mutation(async ({ ctx, input }) => {
      await ctx.assertHofAccess(input.hofId);
      return await registerWristband(ctx.payload, { ...input, userId: ctx.user.uuid });
    }),

  assignWristband: hofWristbandProcedure
    .input(hofBand.extend({ registrationId: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.assertHofAccess(input.hofId);
      await assignWristband(ctx.payload, { ...input, userId: ctx.user.uuid });
    }),

  unassignWristband: hofWristbandProcedure.input(hofBand).mutation(async ({ ctx, input }) => {
    await ctx.assertHofAccess(input.hofId);
    await unassignWristband(ctx.payload, { ...input, userId: ctx.user.uuid });
  }),

  revokeWristband: hofWristbandProcedure.input(hofBand).mutation(async ({ ctx, input }) => {
    await ctx.assertHofAccess(input.hofId);
    await revokeWristband(ctx.payload, { ...input, userId: ctx.user.uuid });
  }),

  /** Whose a band is. A mutation, so a read is never answered from a cache. */
  identifyWristband: wristbandReaderProcedure
    .input(z.object({ uid, signature }))
    .mutation(
      async ({ ctx, input }) =>
        await identifyWristband(ctx.payload, { ...input, readerId: ctx.user.uuid }),
    ),

  /**
   * The page a tapped band opens, for everybody signed in; what it holds depends on who asks
   * and on the band's signature, from the tap or a scan on the page, see `getWristbandCard`.
   * UIDs are not secret and bands of one bag differ in a byte or two, so this is rate limited
   * against walking through them.
   */
  getWristbandCard: wristbandProcedure
    .input(z.object({ uid, signature: signature.optional() }))
    .use(
      rateLimit({
        name: 'wristband.getWristbandCard',
        limit: 60,
        windowMs: 10 * 60 * 1000,
        refuse: () => wristbandError('TOO_MANY_REQUESTS', 'tooManyReads'),
      }),
    )
    .query(
      async ({ ctx, input }) =>
        await getWristbandCard(ctx.payload, {
          uid: input.uid,
          signature: input.signature,
          userId: ctx.user.uuid,
          reader: isWristbandReader(ctx.user),
        }),
    ),

  /** Every worn band, for reading them offline on the campsite. */
  getWristbandRoster: wristbandReaderProcedure.query(
    async ({ ctx }) => await getWristbandRoster(ctx.payload, ctx.user.uuid),
  ),
});
