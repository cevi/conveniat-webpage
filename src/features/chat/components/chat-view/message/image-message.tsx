'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { ChatImage } from '@/features/chat/components/chat-view/message/chat-image';
import React from 'react';

interface MessagePayload {
  url: string;
  altText?: string;
}

export const ImageMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const messageData = message.messagePayload as unknown as MessagePayload | undefined;

  if (typeof messageData?.url !== 'string' || messageData.url === '') return <></>;

  return <ChatImage url={messageData.url} alt={messageData.altText} />;
};
