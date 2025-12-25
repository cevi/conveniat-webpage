'use client';

import { CreateChatSkeleton } from '@/features/chat/components/chat-overview-view/create-chat-skeleton';
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
  return <CreateNewChatPage />;
};

export default NewChatPage;
