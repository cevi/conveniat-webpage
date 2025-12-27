/* eslint-disable @next/next/no-img-element */
'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { trpc } from '@/trpc/client';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface MessagePayload {
  url: string;
  altText?: string;
}

export const ImageMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const chatId = useChatId();
  const messageData = message.messagePayload as unknown as MessagePayload;
  const isS3Key = messageData.url.startsWith('chat-images/');

  const { data: downloadData, isLoading } = trpc.chat.getDownloadUrl.useQuery(
    { chatId, key: messageData.url },
    { enabled: !!messageData.url && isS3Key },
  );

  if (!messageData.url) return <></>;

  const displayUrl = isS3Key ? downloadData?.url : messageData.url;

  if (isS3Key && isLoading) {
    return (
      <div className="flex h-48 w-64 items-center justify-center rounded-lg bg-gray-100">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative max-w-sm overflow-hidden rounded-lg">
      <img
        src={displayUrl}
        alt={messageData.altText ?? 'Image message'}
        className="h-auto w-full object-cover"
        loading="lazy"
      />
    </div>
  );
};
