'use client';

import { Button } from '@/components/ui/buttons/button';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2, MessageSquare } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

const chatFailedText: StaticTranslationString = {
  de: 'Chat konnte nicht gestartet werden',
  fr: 'Impossible de démarrer la discussion',
  en: 'Could not start the chat',
};

interface ChatLinkButtonProperties {
  userId: string;
  label?: string;
  className?: string;
}

/**
 * A button that opens the private chat with a user, creating it if there is none yet,
 * with loading feedback.
 */
export const ChatLinkButton: React.FC<ChatLinkButtonProperties> = ({
  userId,
  label = 'Chat',
  className,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const createChat = trpc.chat.createChat.useMutation({
    onSuccess: (chatId) => {
      setIsNavigating(true);
      router.push(`/app/chat/${chatId}`);
    },
  });

  const isBusy = createChat.isPending || isNavigating;

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'h-9 gap-2 transition-all duration-200 active:scale-95',
        isBusy && 'opacity-80',
        className,
      )}
      onClick={() => createChat.mutate({ members: [{ userId }] })}
      disabled={isBusy}
    >
      {isBusy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
      {createChat.isError ? chatFailedText[locale] : label}
    </Button>
  );
};
