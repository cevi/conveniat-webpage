import { environmentVariables } from '@/config/environment-variables';
import { isLeader } from '@/features/payload-cms/payload-cms/utils/is-leader';
import { StoryReader } from '@/features/story/api/story-reader';
import type { StoryAccess } from '@/features/story/types';
import { createTRPCRouter, publicProcedure } from '@/trpc/init';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import config from '@payload-config';
import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { z } from 'zod';

const idInput = z.object({ id: z.string().min(1).max(64) });

/**
 * Who may read the story. Nobody on a deployment without it; a guest is asked to sign in; a
 * participant who does not lead gets nothing. Answered, never thrown: a 401 would sign the
 * client out, and Home and every block of the programme ask.
 */
const accessOf = async (
  payload: Payload,
  user: HitobitoNextAuthUser | null | undefined,
): Promise<StoryAccess> => {
  if (!environmentVariables.FEATURE_ENABLE_STORY) return 'notLeader';
  if (user === null || user === undefined) return 'signedOut';
  return (await isLeader(payload, user)) ? 'ok' : 'notLeader';
};

/**
 * Reads the story for a Leitende/r, as it stands right now. Nothing here is cached: what may be
 * shown changes by the minute, and only `StoryReader` decides it.
 */
const readStory = async (
  user: HitobitoNextAuthUser | null | undefined,
  locale: Parameters<typeof StoryReader.load>[1],
): Promise<{ access: StoryAccess; reader?: StoryReader }> => {
  const payload = await getPayload({ config });
  const access = await accessOf(payload, user);
  if (access !== 'ok') return { access };
  return { access, reader: await StoryReader.load(payload, locale, new Date()) };
};

export const storyRouter = createTRPCRouter({
  /** The Vorgeschichte, the events by day and the figures. */
  getStoryOverview: publicProcedure.query(async ({ ctx }) => {
    const { access, reader } = await readStory(ctx.user, ctx.locale);
    return { access, overview: reader?.overview() ?? null };
  }),

  /** One event; `null` while it has not appeared. */
  getStoryEvent: publicProcedure.input(idInput).query(async ({ ctx, input }) => {
    const { access, reader } = await readStory(ctx.user, ctx.locale);
    return { access, event: reader?.event(input.id) ?? null };
  }),

  /** One figure with what is known so far; `null` while it has not appeared. */
  getStoryFigure: publicProcedure.input(idInput).query(async ({ ctx, input }) => {
    const { access, reader } = await readStory(ctx.user, ctx.locale);
    return { access, figure: reader?.figureView(input.id) ?? null };
  }),

  /** The challenges that have appeared, by day. */
  getChallengeList: publicProcedure.query(async ({ ctx }) => {
    const { access, reader } = await readStory(ctx.user, ctx.locale);
    return { access, days: reader?.challengesByDay() ?? [] };
  }),

  /** One challenge; `null` while it has not appeared. */
  getChallenge: publicProcedure.input(idInput).query(async ({ ctx, input }) => {
    const { access, reader } = await readStory(ctx.user, ctx.locale);
    return { access, challenge: reader?.challenge(input.id) ?? null };
  }),

  /**
   * The story of one block of the programme, in any of its slots; `null` for anybody who may not
   * read it, so the block shows them nothing.
   */
  getStoryOfScheduleEntries: publicProcedure
    .input(z.object({ entryIds: z.array(z.string().min(1).max(64)).min(1).max(30) }))
    .query(async ({ ctx, input }) => {
      const { reader } = await readStory(ctx.user, ctx.locale);
      return reader?.ofScheduleEntries(input.entryIds) ?? null;
    }),

  /** What Home shows a Leitende/r; `null` for everybody else. */
  getStoryHighlights: publicProcedure.query(async ({ ctx }) => {
    const { reader } = await readStory(ctx.user, ctx.locale);
    return reader?.highlights() ?? null;
  }),
});
