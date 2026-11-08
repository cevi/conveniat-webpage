import { chatError } from '@/features/chat/api/chat-errors';
import {
  recordCallAccepted,
  recordCallEnded,
  recordCallStarted,
} from '@/features/chat/api/utils/call-log';
import { clearPendingCall, setPendingCall } from '@/features/chat/api/utils/pending-call';
import { enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import {
  callSignalInputSchema,
  type CallSignal,
  type CallSignalInput,
} from '@/lib/chat-call-signal';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { getFeatureFlag } from '@/lib/db/redis';
import { FEATURE_FLAG_VOICE_CALLS_ENABLED } from '@/lib/feature-flags';
import { ChatCapability, ChatType, PushNotificationKind } from '@/lib/prisma/enums';
import { sendNotification } from '@/lib/push/send-notification';
import { invariantError } from '@/trpc/error-formatter';
import { trpcBaseProcedure } from '@/trpc/init';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import type { Locale, PrismaClientOrTransaction, StaticTranslationString } from '@/types/types';
import { createLogger } from '@/utils/server-logger';

const logger = createLogger('chat:call');

const callingYouText: StaticTranslationString = {
  de: 'ruft dich an',
  en: 'is calling you',
  fr: 't’appelle',
};

const localeOf = (stored: string | null | undefined): Locale =>
  enabledLocales.find((locale) => locale === stored) ?? 'de';

/** Follows the call from its signals, and writes its line into the chat once it ended. */
const updateCallLog = async (
  input: CallSignalInput,
  userId: string,
  userName: string,
  prisma: PrismaClientOrTransaction,
): Promise<void> => {
  switch (input.kind) {
    case 'invite': {
      return recordCallStarted(input.callId, input.chatId, userName);
    }
    case 'accept': {
      return recordCallAccepted(input.callId);
    }
    case 'decline': {
      return recordCallEnded(prisma, input.callId, input.chatId, 'declined', userId);
    }
    case 'hangup': {
      return recordCallEnded(prisma, input.callId, input.chatId, 'ended', userId);
    }
    default: {
      return;
    }
  }
};

/**
 * Pushes the invite to the partner's devices that are not listening: the app closed or in the
 * background. The push opens the chat, which picks the call up from `getPendingCall`. In the
 * partner's language, as far as it is known, like the reminders.
 */
const pushInvite = async (
  prisma: PrismaClientOrTransaction,
  calleeId: string,
  chatId: string,
  callerName: string,
): Promise<void> => {
  const callee = await prisma.user.findUnique({
    where: { uuid: calleeId },
    select: { reminderLocale: true },
  });
  await sendNotification(
    callingYouText[localeOf(callee?.reminderLocale)],
    [calleeId],
    chatId,
    undefined,
    {
      kind: PushNotificationKind.CHAT,
      title: callerName,
      path: `/app/chat/${chatId}`,
    },
  );
};

/**
 * Forwards one step of a call's handshake to the other member of a one-to-one chat. Nothing
 * is stored: the signal lives only on the partner's personal realtime stream, which every
 * device of the partner listens to, so an `invite` rings all of them.
 *
 * `accept` and `decline` also go to the sender's own channel, so their other devices stop
 * ringing once one of them answered.
 */
export const sendCallSignal = trpcBaseProcedure
  .input(callSignalInputSchema)
  .use(
    // A call takes a few dozen signals, most of them candidates; this leaves room for several
    // calls and reconnects in a row, but not for ringing someone without pause.
    rateLimit({
      name: 'chat.sendCallSignal',
      limit: 600,
      windowMs: 10 * 60 * 1000,
      refuse: () => chatError('TOO_MANY_REQUESTS', 'tooManyCalls'),
    }),
  )
  .mutation(async ({ input, ctx }): Promise<void> => {
    const { user, prisma } = ctx;

    // a `hangup` must still get through when calls were just switched off, or the partner rings on
    if (input.kind !== 'hangup' && !(await getFeatureFlag(FEATURE_FLAG_VOICE_CALLS_ENABLED))) {
      throw chatError('PRECONDITION_FAILED', 'callsDisabled');
    }

    const chat = await prisma.chat.findUnique({
      where: { uuid: input.chatId },
      select: {
        type: true,
        archivedAt: true,
        capabilities: true,
        chatMemberships: { select: { userId: true } },
      },
    });

    // the client offers a call only in a one-to-one chat it is a member of
    const isMember = chat?.chatMemberships.some((m) => m.userId === user.uuid) === true;
    if (chat?.type !== ChatType.ONE_TO_ONE || !isMember) {
      throw invariantError('FORBIDDEN', 'Calls are only possible in your own one-to-one chats.');
    }
    if (chat.archivedAt !== null && input.kind === 'invite') {
      throw invariantError('FORBIDDEN', 'Archived chats cannot be called.');
    }
    // only a new call needs the capability: one already running may finish when it is switched
    // off, and a phone with a stale chat still offers the button, so the refusal has a reason
    if (input.kind === 'invite' && !chat.capabilities.includes(ChatCapability.VOICE_CALLS)) {
      throw chatError('FORBIDDEN', 'callsNotInThisChat');
    }

    const partner = chat.chatMemberships.find((m) => m.userId !== user.uuid);
    if (partner === undefined) {
      throw invariantError('PRECONDITION_FAILED', 'The chat has no one to call.');
    }

    const call: CallSignal = { ...input, fromUser: user.uuid, fromName: user.name };
    // debug: the handshake sends a dozen of these per call, the candidates above all
    logger.debug('Forwarding call signal', {
      'chat.id': input.chatId,
      'chat.call.id': input.callId,
      'chat.call.kind': input.kind,
      'chat.call.from_device': input.fromDevice,
      'chat.call.to_device': input.toDevice,
      'chat.user.id': user.uuid,
    });

    const event = {
      type: 'call_signal' as const,
      chatId: input.chatId,
      senderId: user.uuid,
      call,
    };
    await chatPubSub.publish(partner.userId, event);
    if (input.kind === 'accept' || input.kind === 'decline') {
      await chatPubSub.publish(user.uuid, event);
    }

    // the call's line in the chat; a lost entry must not fail the call itself
    await updateCallLog(input, user.uuid, user.name, prisma).catch((error: unknown) => {
      logger.warn('Could not write the call into the chat', {
        error,
        'chat.call.id': input.callId,
      });
    });

    if (input.kind === 'invite') {
      await setPendingCall(partner.userId, call);
      // the call rings on the open devices already; the push must not hold up the caller
      pushInvite(prisma, partner.userId, input.chatId, user.name).catch((error: unknown) => {
        logger.warn('Could not push the call', { error, 'chat.call.id': input.callId });
      });
    } else if (input.kind === 'accept' || input.kind === 'decline' || input.kind === 'hangup') {
      // whoever ends the ringing, the pending call belongs to the callee
      await Promise.all([
        clearPendingCall(partner.userId, input.callId),
        clearPendingCall(user.uuid, input.callId),
      ]);
    }
  });
