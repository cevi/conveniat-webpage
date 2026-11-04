import { chatError } from '@/features/chat/api/chat-errors';
import { CHAT_INVITE_LIFETIME_MS } from '@/features/chat/constants';
import { trpcBaseProcedure } from '@/trpc/init';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

/**
 * Mints the single-use code behind the QR code a user shows to start a chat with them.
 *
 * Expired codes nobody redeemed are dropped on the way, so the table only keeps the ones
 * still showing on a screen and the redeemed ones.
 */
export const createChatInvite = trpcBaseProcedure
  .input(z.object({}))
  .use(
    // An open dialog mints one code every ten minutes; this leaves room to open and close it
    // often, but not to fill the table.
    rateLimit({
      name: 'chat.createChatInvite',
      limit: 30,
      windowMs: 10 * 60 * 1000,
      refuse: () => chatError('TOO_MANY_REQUESTS', 'tooManyInvites'),
    }),
  )
  .mutation(async ({ ctx }): Promise<{ token: string; expiresAt: Date }> => {
    const { user, prisma } = ctx;
    const now = new Date();

    await prisma.chatInvite.deleteMany({
      where: { issuerId: user.uuid, redeemedById: null, expiresAt: { lt: now } },
    });

    const invite = await prisma.chatInvite.create({
      data: {
        // 128 random bits, base64url keeps the link and therefore the QR code short
        token: randomBytes(16).toString('base64url'),
        issuerId: user.uuid,
        expiresAt: new Date(now.getTime() + CHAT_INVITE_LIFETIME_MS),
      },
      select: { token: true, expiresAt: true },
    });
    return invite;
  });
