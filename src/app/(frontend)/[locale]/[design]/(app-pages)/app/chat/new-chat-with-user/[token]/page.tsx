import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { trpc } from '@/trpc/server';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import type { LucideIcon } from 'lucide-react';
import { LogIn, MessageSquareOff, QrCode } from 'lucide-react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type React from 'react';

const logger = createLogger('chat:new-chat-with-user');

const labels = {
  mustBeLoggedIn: {
    en: 'You must be logged in to start a chat.',
    de: 'Du musst angemeldet sein, um einen Chat zu starten.',
    fr: 'Vous devez être connecté pour démarrer une discussion.',
  },
  goBackToChats: {
    en: 'Go back to chats',
    de: 'Zurück zu Chats',
    fr: 'Retour aux discussions',
  },
  chatCreationPaused: {
    en: 'Chat creation is currently paused by administrators.',
    de: 'Die Chat-Erstellung ist derzeit von Administratoren pausiert.',
    fr: 'La création de chat est actuellement suspendue par les administrateurs.',
  },
  failedToCreateChat: {
    en: 'Failed to create chat.',
    de: 'Chat konnte nicht erstellt werden.',
    fr: 'Échec de la création du chat.',
  },
  pleaseTryAgain: {
    en: 'Please try again.',
    de: 'Bitte versuche es erneut.',
    fr: 'Veuillez réessayer.',
  },
  invalidInvite: {
    en: 'This QR code is no longer valid.',
    de: 'Dieser QR-Code ist nicht mehr gültig.',
    fr: "Ce code QR n'est plus valable.",
  },
  askForNewInvite: {
    en: 'Each QR code starts a single chat and expires after a few minutes. Ask for a new one.',
    de: 'Jeder QR-Code startet nur einen Chat und läuft nach wenigen Minuten ab. Lass dir einen neuen zeigen.',
    fr: "Chaque code QR ne démarre qu'une seule discussion et expire après quelques minutes. Demandez-en un nouveau.",
  },
  tryAgainLater: {
    en: 'Please try again later.',
    de: 'Bitte versuche es später noch einmal.',
    fr: 'Veuillez réessayer plus tard.',
  },
  unexpectedError: {
    en: 'An unexpected error occurred.',
    de: 'Ein unerwarteter Fehler ist aufgetreten.',
    fr: "Une erreur inattendue s'est produite.",
  },
} as const satisfies Record<string, StaticTranslationString>;

/**
 * Opens the chat with the user whose QR code was scanned. The last path segment is the
 * single-use code from that QR code, not a user id, see `redeemChatInvite`.
 */
const NewChatWithUserPage: React.FC<{
  params: Promise<{
    token: string;
  }>;
}> = async ({ params }) => {
  const locale = await getLocaleFromCookies();
  let result:
    | 'notLoggedIn'
    | 'cannotCreateChat'
    | 'invalidInvite'
    | 'failedToCreate'
    | { type: 'redirect'; url: string }
    | 'error';

  try {
    const { token } = await params;

    const session = await auth();
    const user = isValidNextAuthUser(session?.user) ? session.user : undefined;

    if (user?.uuid === undefined) {
      // Also what the link checks of a phone's camera app end up at: they run without
      // the session, so they never redeem the code.
      result = 'notLoggedIn';
    } else {
      const redemption = await trpc.chat.redeemChatInvite({ token }).catch((error: unknown) => {
        if (error instanceof TRPCError && error.code === 'FORBIDDEN') return 'forbidden' as const;
        logger.error('Failed to redeem the chat invite', { error });
        return 'failed' as const;
      });

      if (redemption === 'forbidden') {
        result = 'cannotCreateChat';
      } else if (redemption === 'failed') {
        result = 'failedToCreate';
      } else if (redemption.status === 'invalid') {
        result = 'invalidInvite';
      } else if (redemption.status === 'ownInvite') {
        result = { type: 'redirect', url: `/app/chat` };
      } else {
        result = { type: 'redirect', url: `/app/chat/${redemption.chatId}` };
      }
    }
  } catch (error: unknown) {
    // Re-throw redirect errors - they're not real errors
    if (isRedirectError(error)) {
      throw error;
    }

    logger.error('Fatal error in page', { error });
    result = 'error';
  }

  if (typeof result === 'object') {
    redirect(result.url);
  }

  const messages: Record<
    Exclude<typeof result, object>,
    { icon: LucideIcon; title: string; description?: string }
  > = {
    notLoggedIn: { icon: LogIn, title: labels.mustBeLoggedIn[locale] },
    cannotCreateChat: { icon: MessageSquareOff, title: labels.chatCreationPaused[locale] },
    invalidInvite: {
      icon: QrCode,
      title: labels.invalidInvite[locale],
      description: labels.askForNewInvite[locale],
    },
    failedToCreate: {
      icon: MessageSquareOff,
      title: labels.failedToCreateChat[locale],
      description: labels.pleaseTryAgain[locale],
    },
    error: {
      icon: MessageSquareOff,
      title: labels.unexpectedError[locale],
      description: labels.tryAgainLater[locale],
    },
  };
  const message = messages[result];

  return (
    <div className="bg-page flex min-h-[70dvh] items-center justify-center px-4 py-8">
      <EmptyState
        icon={message.icon}
        title={message.title}
        description={message.description}
        className="w-full max-w-md"
        action={
          <Button variant="quiet" size="touch" asChild>
            <Link href="/app/chat">{labels.goBackToChats[locale]}</Link>
          </Button>
        }
      />
    </div>
  );
};

export default NewChatWithUserPage;
