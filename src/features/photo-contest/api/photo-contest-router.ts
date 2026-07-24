/* eslint-disable unicorn/no-null */
import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import {
  createTRPCRouter,
  publicProcedure,
  trpcAdminProcedure,
  trpcBaseProcedure,
} from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const photoContestRouter = createTRPCRouter({
  /**
   * Get all active/public photo contests with optional current user's vote allocations.
   */
  getContests: publicProcedure.query(async ({ ctx }) => {
    const contests = await ctx.prisma.photoContest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });

    const userId = ctx.user?.uuid;

    let userVotesMap: Record<string, { imageId: string; points: number }[]> = {};
    if (userId !== undefined && userId !== '') {
      const votes = await ctx.prisma.photoContestVote.findMany({
        where: { userId },
      });

      userVotesMap = votes.reduce(
        (accumulator, vote) => {
          const list = accumulator[vote.contestId] ?? [];
          list.push({
            imageId: vote.imageId,
            points: vote.points,
          });
          accumulator[vote.contestId] = list;
          return accumulator;
        },
        {} as Record<string, { imageId: string; points: number }[]>,
      );
    }

    return contests.map((contest) => {
      const myVotes = userVotesMap[contest.id] ?? [];
      const totalPointsUsed = myVotes.reduce((sum, v) => sum + v.points, 0);

      return {
        ...contest,
        myVotes,
        pointsRemaining: Math.max(0, contest.maxPointsPerUser - totalPointsUsed),
      };
    });
  }),

  /**
   * Get a specific contest by slug with details, images, and user's vote allocations.
   */
  getContestBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const contest = await ctx.prisma.photoContest.findUnique({
        where: { slug: input.slug },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!contest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Fotowettbewerb nicht gefunden.',
        });
      }

      const userId = ctx.user?.uuid;
      let myVotes: { imageId: string; points: number }[] = [];

      if (userId !== undefined && userId !== '') {
        myVotes = await ctx.prisma.photoContestVote.findMany({
          where: { contestId: contest.id, userId },
          select: { imageId: true, points: true },
        });
      }

      const totalPointsUsed = myVotes.reduce((sum, v) => sum + v.points, 0);

      // Count votes per image if voting is closed or user is admin
      const isAdmin = ctx.user
        ? hasAccessToThisUser({
            user: ctx.user,
            requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
          })
        : false;

      let voteCounts: Record<string, number> = {};
      if (contest.status === 'CLOSED' || isAdmin) {
        const aggregated = await ctx.prisma.photoContestVote.groupBy({
          by: ['imageId'],
          where: { contestId: contest.id },
          _sum: { points: true },
        });

        voteCounts = aggregated.reduce(
          (accumulator, item) => {
            accumulator[item.imageId] = item._sum.points ?? 0;
            return accumulator;
          },
          {} as Record<string, number>,
        );
      }

      return {
        ...contest,
        myVotes,
        pointsRemaining: Math.max(0, contest.maxPointsPerUser - totalPointsUsed),
        voteCounts,
      };
    }),

  /**
   * Cast/update votes for a contest.
   * Enforces rules:
   * 1) Total points assigned by user across images <= maxPointsPerUser (default 2 points).
   * 2) Maximum points assigned to a single image <= maxPointsPerImage (default 2 points).
   * 3) User can assign 2 points to 1 image, OR 1 point each to 2 different images.
   * 4) Atomic update inside a database transaction prevents duplicate voting.
   */
  castVotes: trpcBaseProcedure
    .input(
      z.object({
        contestId: z.string(),
        allocations: z.array(
          z.object({
            imageId: z.string(),
            points: z.number().int().min(0).max(2),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.uuid;

      const contest = await ctx.prisma.photoContest.findUnique({
        where: { id: input.contestId },
      });

      if (!contest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Fotowettbewerb nicht gefunden.',
        });
      }

      if (contest.status !== 'VOTING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Abstimmung für diesen Wettbewerb ist aktuell nicht aktiv.',
        });
      }

      const now = new Date();
      if (contest.votingStart && now < contest.votingStart) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Die Abstimmung hat noch nicht begonnen.',
        });
      }

      if (contest.votingEnd && now > contest.votingEnd) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Die Abstimmung ist bereits beendet.',
        });
      }

      // Filter out zero-point allocations
      const validAllocations = input.allocations.filter((a) => a.points > 0);

      // Validate max points per user
      const totalPoints = validAllocations.reduce((sum, a) => sum + a.points, 0);
      if (totalPoints > contest.maxPointsPerUser) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Du darfst insgesamt maximal ${contest.maxPointsPerUser} Punkte vergeben.`,
        });
      }

      // Validate max points per image
      for (const alloc of validAllocations) {
        if (alloc.points > contest.maxPointsPerImage) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Pro Bild dürfen maximal ${contest.maxPointsPerImage} Punkte vergeben werden.`,
          });
        }
      }

      // Execute inside transaction for strict anti-abuse guarantee
      await ctx.prisma.$transaction(async (tx) => {
        // Delete all previous votes for this user in this contest
        await tx.photoContestVote.deleteMany({
          where: {
            contestId: contest.id,
            userId,
          },
        });

        // Insert new allocations
        if (validAllocations.length > 0) {
          await tx.photoContestVote.createMany({
            data: validAllocations.map((alloc) => ({
              contestId: contest.id,
              imageId: alloc.imageId,
              userId,
              points: alloc.points,
            })),
          });
        }
      });

      return {
        success: true,
        message: 'Deine Stimmen wurden erfolgreich gespeichert.',
      };
    }),

  /**
   * Admin: Create a new Photo Contest
   */
  adminCreateContest: trpcAdminProcedure
    .input(
      z.object({
        slug: z.string().min(2),
        title: z.string().min(2),
        description: z.string().optional(),
        contestType: z.enum(['PRESELECTED', 'LIVE_EVENT']),
        status: z.enum(['DRAFT', 'UPLOADING', 'VOTING', 'CLOSED']).default('DRAFT'),
        votingStart: z.date().optional(),
        votingEnd: z.date().optional(),
        maxPointsPerUser: z.number().int().min(1).default(2),
        maxPointsPerImage: z.number().int().min(1).default(2),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.photoContest.findUnique({
        where: { slug: input.slug },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ein Wettbewerb mit diesem Slug existiert bereits.',
        });
      }

      const contest = await ctx.prisma.photoContest.create({
        data: {
          slug: input.slug,
          title: input.title,
          description: input.description ?? null,
          contestType: input.contestType,
          status: input.status,
          votingStart: input.votingStart ?? null,
          votingEnd: input.votingEnd ?? null,
          maxPointsPerUser: input.maxPointsPerUser,
          maxPointsPerImage: input.maxPointsPerImage,
        },
      });

      return contest;
    }),

  /**
   * Admin / On-site Uploader: Add image to contest (e.g. for Cevi Mil live event uploads on-site)
   */
  adminAddImage: trpcBaseProcedure
    .input(
      z.object({
        contestId: z.string(),
        imageUrl: z.string().url(),
        thumbnailUrl: z.string().url().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin = hasAccessToThisUser({
        user: ctx.user,
        requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
      });

      const contest = await ctx.prisma.photoContest.findUnique({
        where: { id: input.contestId },
      });

      if (!contest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wettbewerb nicht gefunden.',
        });
      }

      // Allow image uploads if status is UPLOADING, DRAFT, or user is admin
      if (!isAdmin && contest.status !== 'UPLOADING' && contest.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bilder-Upload ist für diesen Wettbewerb aktuell nicht geöffnet.',
        });
      }

      const maxOrder = await ctx.prisma.photoContestImage.findFirst({
        where: { contestId: input.contestId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      const nextOrder = (maxOrder?.order ?? 0) + 1;

      const newImage = await ctx.prisma.photoContestImage.create({
        data: {
          contestId: input.contestId,
          imageUrl: input.imageUrl,
          thumbnailUrl: input.thumbnailUrl ?? input.imageUrl,
          title: input.title ?? null,
          description: input.description ?? null,
          uploadedById: ctx.user.uuid,
          order: nextOrder,
        },
      });

      return newImage;
    }),

  /**
   * Admin: Update contest details or status
   */
  adminUpdateContest: trpcAdminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['DRAFT', 'UPLOADING', 'VOTING', 'CLOSED']).optional(),
        votingStart: z.date().nullable().optional(),
        votingEnd: z.date().nullable().optional(),
        maxPointsPerUser: z.number().int().min(1).optional(),
        maxPointsPerImage: z.number().int().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.prisma.photoContest.update({
        where: { id: input.id },
        data: {
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(input.description === undefined ? {} : { description: input.description ?? null }),
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.votingStart === undefined ? {} : { votingStart: input.votingStart }),
          ...(input.votingEnd === undefined ? {} : { votingEnd: input.votingEnd }),
          ...(input.maxPointsPerUser === undefined
            ? {}
            : { maxPointsPerUser: input.maxPointsPerUser }),
          ...(input.maxPointsPerImage === undefined
            ? {}
            : { maxPointsPerImage: input.maxPointsPerImage }),
        },
      });

      return updated;
    }),

  /**
   * Admin: Delete an image from a contest
   */
  adminDeleteImage: trpcAdminProcedure
    .input(z.object({ imageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.photoContestImage.delete({
        where: { id: input.imageId },
      });

      return { success: true };
    }),

  /**
   * Admin: Seed default contests (Cevi Schweiz & Cevi Mil) if they don't exist
   */
  adminSeedDefaultContests: trpcAdminProcedure.mutation(async ({ ctx }) => {
    const ceviSchweiz = await ctx.prisma.photoContest.upsert({
      where: { slug: 'cevi-schweiz' },
      update: {},
      create: {
        slug: 'cevi-schweiz',
        title: 'Cevi Schweiz Foto-Wettbewerb',
        description:
          'Stimme für deine Lieblingsfotos des Cevi Schweiz Fotowettbewerbs ab! Du hast insgesamt 2 Punkte: Vergebe 2 Punkte für 1 Bild oder je 1 Punkt für 2 verschiedene Bilder.',
        contestType: 'PRESELECTED',
        status: 'VOTING',
        maxPointsPerUser: 2,
        maxPointsPerImage: 2,
      },
    });

    const ceviMil = await ctx.prisma.photoContest.upsert({
      where: { slug: 'cevi-mil' },
      update: {},
      create: {
        slug: 'cevi-mil',
        title: 'Cevi Mil Live Foto-Wettbewerb (Dani)',
        description:
          'Live-Fotos vom Konekta! Bilder werden während dem Konekta hochgeladen. Voting läuft von Samstag 23:00 bis Sonntag 09:00 Uhr. Du hast 2 Punkte zum Vergeben.',
        contestType: 'LIVE_EVENT',
        status: 'UPLOADING',
        maxPointsPerUser: 2,
        maxPointsPerImage: 2,
      },
    });

    return { ceviSchweiz, ceviMil };
  }),
});
