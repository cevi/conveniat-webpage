import { findOrCreatePrivateChat } from '@/features/chat/api/database-interactions/find-or-create-private-chat';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { createLogger } from '@/utils/server-logger';
import { z } from 'zod';

const logger = createLogger('chat:mutations');

export type RedeemChatInviteResult =
  | { status: 'redeemed'; chatId: string }
  /** The user scanned their own QR code. */
  | { status: 'ownInvite' }
  /** Unknown, expired, or already redeemed by someone else. */
  | { status: 'invalid' };

/**
 * Opens the private chat with the user whose QR code was scanned.
 *
 * A code opens a chat for exactly one person. Phones tend to open a scanned link more than
 * once (the camera app checks it, the browser prefetches it), so the same user redeeming
 * the same code again is answered with the chat the first redemption opened.
 */
export const redeemChatInvite = trpcBaseProcedure
  .input(z.object({ token: z.string().min(1).max(64) }))
  .use(databaseTransactionWrapper)
  .mutation(async ({ input, ctx }): Promise<RedeemChatInviteResult> => {
    const { user, prisma, locale } = ctx;
    const { token } = input;

    const invite = await prisma.chatInvite.findUnique({
      where: { token },
      select: { issuerId: true },
    });
    if (invite === null) return { status: 'invalid' };
    if (invite.issuerId === user.uuid) return { status: 'ownInvite' };

    // Claiming is a conditional update, so of two concurrent redemptions exactly one wins:
    // the other waits on the row lock and then no longer matches `redeemedById: null`.
    const claimed = await prisma.chatInvite.updateMany({
      // eslint-disable-next-line unicorn/no-null
      where: { token, redeemedById: null, expiresAt: { gt: new Date() } },
      data: { redeemedById: user.uuid, redeemedAt: new Date() },
    });

    if (claimed.count === 0) {
      const earlier = await prisma.chatInvite.findUnique({
        where: { token },
        select: { redeemedById: true, chatId: true },
      });
      if (earlier?.redeemedById === user.uuid && earlier.chatId !== null) {
        logger.debug('Chat invite replayed by its redeemer', { 'chat.id': earlier.chatId });
        return { status: 'redeemed', chatId: earlier.chatId };
      }
      logger.debug('Chat invite is expired or redeemed by someone else');
      return { status: 'invalid' };
    }

    const chatId = await findOrCreatePrivateChat({
      user,
      otherUserId: invite.issuerId,
      locale,
      prisma,
      afterCommit: ctx.afterTransactionCommit,
    });
    await prisma.chatInvite.update({ where: { token }, data: { chatId } });

    logger.debug('Chat invite redeemed', { 'chat.id': chatId });
    return { status: 'redeemed', chatId };
  });
