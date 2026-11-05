import { environmentVariables } from '@/config/environment-variables';
import { chatError } from '@/features/chat/api/chat-errors';
import { addToAddressBooks } from '@/features/chat/api/database-interactions/add-to-address-books';
import { findOrCreatePrivateChat } from '@/features/chat/api/database-interactions/find-or-create-private-chat';
import {
  hasAccessToThisUser,
  WRISTBAND_READER_ROLES,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import {
  findAppUserOfPerson,
  findBandWearer,
  findHofAdministrators,
} from '@/features/payload-cms/payload-cms/utils/wristband-people';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { getPayload } from 'payload';
import { z } from 'zod';

const logger = createLogger('chat:mutations');

export type StartChatFromWristbandResult =
  | { status: 'started'; chatId: string }
  /** The user tapped their own band. */
  | { status: 'ownBand' }
  /** The person never logged into the app, so there is nobody to chat with. */
  | { status: 'noAccount' }
  /** Unknown, blocked or not handed out, or the person is not the AVP of the band's Hof. */
  | { status: 'unknownBand' };

/**
 * Opens the private chat with the wearer of a tapped band, or for the safety team with an AVP
 * of the band's Hof, and puts the two into each other's address book, the way a scanned chat
 * QR code does. Holding out the band is the consent, like showing the code.
 *
 * Which person a band leads to is decided here again from the band, never taken from the
 * client: `avpUserId` only picks one of the Hof's AVPs.
 */
export const startChatFromWristband = trpcBaseProcedure
  .input(
    z.object({
      uid: z
        .string()
        .regex(/^[0-9A-Fa-f]{14}$/)
        .transform((value) => value.toUpperCase()),
      avpUserId: z.string().min(1).max(64).optional(),
    }),
  )
  .use(
    // UIDs are not secret, and bands of one bag differ in a byte or two: this keeps anybody
    // from walking through them to collect contacts
    rateLimit({
      name: 'chat.startChatFromWristband',
      limit: 20,
      windowMs: 10 * 60 * 1000,
      refuse: () => chatError('TOO_MANY_REQUESTS', 'tooManyChats'),
    }),
  )
  .use(databaseTransactionWrapper)
  .mutation(async ({ input, ctx }): Promise<StartChatFromWristbandResult> => {
    if (!environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    const { user, prisma, locale } = ctx;
    const payload = await getPayload({ config });
    const wearer = await findBandWearer(payload, input.uid);

    let otherUserId: string | undefined;
    if (input.avpUserId === undefined) {
      if (wearer.registration === null) return { status: 'unknownBand' };
      otherUserId = await findAppUserOfPerson(payload, wearer.registration.ceviPersonId);
      if (otherUserId === user.uuid) return { status: 'ownBand' };
    } else {
      if (!hasAccessToThisUser({ user, requiredRoles: WRISTBAND_READER_ROLES })) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      if (wearer.hofId === null || input.avpUserId === user.uuid) return { status: 'unknownBand' };
      const administrators = await findHofAdministrators(payload, wearer.hofId);
      if (!administrators.some((administrator) => administrator.userId === input.avpUserId)) {
        return { status: 'unknownBand' };
      }
      otherUserId = input.avpUserId;
    }

    // the chat keeps its own copy of every user who ever opened the app
    const chatUser =
      otherUserId === undefined
        ? null
        : await prisma.user.findUnique({ where: { uuid: otherUserId }, select: { uuid: true } });
    if (otherUserId === undefined || chatUser === null) return { status: 'noAccount' };

    const chatId = await findOrCreatePrivateChat({
      user,
      otherUserId,
      locale,
      prisma,
      afterCommit: ctx.afterTransactionCommit,
    });
    await addToAddressBooks(prisma, user.uuid, otherUserId);

    logger.debug('Started a chat from a wristband', {
      'chat.id': chatId,
      'wristband.contact': input.avpUserId === undefined ? 'wearer' : 'avp',
    });
    return { status: 'started', chatId };
  });
