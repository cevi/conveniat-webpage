import { ChatHeader } from '@/features/chat/components/chat-view/chat-header';
import { ChatSkeleton } from '@/features/chat/components/chat-view/chat-skeleton';
import type React from 'react';

const Loading: React.FC = () => {
  return <ChatSkeleton header={<ChatHeader />} />;
};

export default Loading;
