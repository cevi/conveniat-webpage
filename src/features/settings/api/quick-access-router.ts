import type { QuickAccessTileId } from '@/features/settings/quick-access';
import {
  isDefaultQuickAccess,
  knownQuickAccessTiles,
  QUICK_ACCESS_TILE_IDS,
} from '@/features/settings/quick-access';
import { Prisma } from '@/lib/prisma/client';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { ensureUserExistsMiddleware } from '@/trpc/middleware/ensure-user-exists';
import { z } from 'zod';

/** null is the default tiles, which the client fills in itself */
interface QuickAccess {
  tiles: QuickAccessTileId[] | null;
}

export const quickAccessRouter = createTRPCRouter({
  /** The Schnellzugriff the user chose for Home, on every device they log in on. */
  getQuickAccess: trpcBaseProcedure.query(async ({ ctx }): Promise<QuickAccess> => {
    const stored = await ctx.prisma.user.findUnique({
      where: { uuid: ctx.user.uuid },
      select: { quickAccessTiles: true },
    });
    return { tiles: knownQuickAccessTiles(stored?.quickAccessTiles) ?? null };
  }),

  /**
   * Stores the user's Schnellzugriff. Ids this release does not know are dropped rather than
   * refused, so an app still running an older bundle can save; a choice equal to the default is
   * stored as none, so it follows the default when a release changes it.
   */
  updateQuickAccess: trpcBaseProcedure
    .input(z.object({ tiles: z.array(z.string().max(32)).max(QUICK_ACCESS_TILE_IDS.length * 2) }))
    .use(ensureUserExistsMiddleware)
    .mutation(async ({ ctx, input }): Promise<QuickAccess> => {
      const tiles = knownQuickAccessTiles(input.tiles) ?? [];
      const isDefault = isDefaultQuickAccess(tiles);
      await ctx.prisma.user.update({
        where: { uuid: ctx.user.uuid },
        data: { quickAccessTiles: isDefault ? Prisma.DbNull : tiles },
      });
      return { tiles: isDefault ? null : tiles };
    }),
});
