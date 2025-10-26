import type { ChatMessage } from '@/features/chat/api/types';
import Image from 'next/image';
import React from 'react';

interface MessagePayload {
  url: string;
  altText?: string;
}

export const ImageMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const messageData = message.messagePayload as unknown as MessagePayload;
  return (
    <>
      <Image src={messageData.url} alt={messageData.altText ?? 'Image message'}></Image>
    </>
  );
};
