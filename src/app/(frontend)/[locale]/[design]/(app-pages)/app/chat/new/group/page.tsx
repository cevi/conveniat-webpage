'use client';

import { ChatCreationGate } from '@/features/chat/components/chat-overview-view/chat-creation-gate';
import { CreateChatSkeleton } from '@/features/chat/components/chat-overview-view/create-chat-skeleton';
import dynamic from 'next/dynamic';
import type React from 'react';

const CreateNewGroupPage = dynamic(
  () =>
    import('@/features/chat/components/chat-overview-view/create-group-component').then(
      (module_) => module_.CreateNewGroupPage,
    ),
  {
    ssr: false,
    loading: () => <CreateChatSkeleton />,
  },
);

const NewGroupPage: React.FC = () => (
  <ChatCreationGate>
    <CreateNewGroupPage />
  </ChatCreationGate>
);

export default NewGroupPage;
