'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { CreateChatSkeleton } from '@/features/chat/components/chat-overview-view/create-chat-skeleton';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { MessageSquareOff } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import dynamic from 'next/dynamic';
import type React from 'react';

const CreateNewChatPage = dynamic(
  () =>
    import('@/features/chat/components/chat-overview-view/create-chat-component').then(
      (module_) => module_.CreateNewChatPage,
    ),
  {
    ssr: false,
    loading: () => <CreateChatSkeleton />,
  },
);

const chatCreationPausedText: StaticTranslationString = {
  de: 'Die Chat-Erstellung ist derzeit von Administratoren pausiert.',
  en: 'Chat creation is currently paused by administrators.',
  fr: 'La création de chat est actuellement suspendue par les administrateurs.',
};

const NewChatPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: createChatsEnabled, isLoading: isLoadingCapability } =
    trpc.chat.checkCapability.useQuery(
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

  if (!isLoadingCapability && !createChatsEnabled) {
    return (
      <div className="bg-page flex min-h-[60dvh] items-center justify-center p-4">
        <EmptyState icon={MessageSquareOff} title={chatCreationPausedText[locale]} />
      </div>
    );
  }

  return <CreateNewChatPage />;
};

export default NewChatPage;
