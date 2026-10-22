'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { MessageSquareOff } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

const chatCreationPausedText: StaticTranslationString = {
  de: 'Die Chat-Erstellung ist derzeit von Administratoren pausiert.',
  en: 'Chat creation is currently paused by administrators.',
  fr: 'La création de chat est actuellement suspendue par les administrateurs.',
};

/** Shows the screens that start a chat only while admins have not paused chat creation. */
export const ChatCreationGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: createChatsEnabled, isLoading } = trpc.chat.checkCapability.useQuery(
    {
      action: CapabilityAction.Create,
      subject: CapabilitySubject.Chat,
    },
    {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
  );

  if (!isLoading && createChatsEnabled !== true) {
    return (
      <div className="bg-page flex min-h-[60dvh] items-center justify-center p-4">
        <EmptyState icon={MessageSquareOff} title={chatCreationPausedText[locale]} />
      </div>
    );
  }

  return <>{children}</>;
};
