import { ChatSkeleton } from '@/features/chat/components/chat-view/chat-skeleton';
import type React from 'react';

const Loading: React.FC = () => {
  return <ChatSkeleton />;
};

export default Loading;
