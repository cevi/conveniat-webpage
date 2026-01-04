'use client';

import { ChatDetailsPageSkeleton } from '@/features/chat/components/chat-view/chat-details-skeleton';
import dynamic from 'next/dynamic';
import type React from 'react';

const ChatDetails = dynamic(
  () =>
    import('@/features/chat/components/chat-view/chat-details').then(
      (module_) => module_.ChatDetails,
    ),
  {
    ssr: false,
    loading: () => <ChatDetailsPageSkeleton />,
  },
);

const ChatDetailsPage: React.FC = () => {
  return <ChatDetails />;
};

export default ChatDetailsPage;
