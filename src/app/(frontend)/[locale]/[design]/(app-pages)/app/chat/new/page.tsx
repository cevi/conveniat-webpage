'use client';

import { CreateChatSkeleton } from '@/features/chat/components/chat-overview-view/create-chat-skeleton';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { trpc } from '@/trpc/client';
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

const NewChatPage: React.FC = () => {
  const { data: createChatsEnabled, isLoading: isLoadingCapability } =
    trpc.chat.checkCapability.useQuery({
      action: CapabilityAction.Create,
      subject: CapabilitySubject.Chat,
    });

  if (!isLoadingCapability && !createChatsEnabled) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <p className="font-body text-center font-semibold text-gray-600">
          Chat creation is currently paused by administrators.
        </p>
      </div>
    );
  }

  return <CreateNewChatPage />;
};

export default NewChatPage;
