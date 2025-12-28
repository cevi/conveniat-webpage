import { trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import z from 'zod';

const onlinePingSchema = z.object({});

export const onlinePing = trpcBaseProcedure
  .input(onlinePingSchema) // no input needed for this mutation
  .mutation(async ({ ctx }) => {
    const { user, prisma } = ctx;

    if (!user.uuid) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    try {
      await prisma.user.update({
        where: { uuid: user.uuid },
        data: { lastSeen: new Date() },
      });
    } catch {
      // If user doesn't exist in database, treat as unauthorized
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not found',
      });
    }
  });
