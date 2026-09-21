/* eslint-disable @next/next/no-img-element */
'use client';

import { useChatId } from '@/features/chat/context/chat-id-context';
import { trpc } from '@/trpc/client';
import { Loader2 } from 'lucide-react';
import React from 'react';

/** Prefix of the keys the chat image upload writes into the S3 bucket. */
const S3_KEY_PREFIX = 'chat-images/';

interface ChatImageProperties {
  /** Either an S3 key of a chat upload or a URL that can be rendered as is. */
  url: string;
  alt?: string | undefined;
  caption?: string | undefined;
}

/**
 * Renders a single image inside a chat bubble.
 *
 * Images uploaded through the chat live in a private bucket and are addressed by their S3
 * key, so they need a pre-signed URL; images attached to an announcement come from the CMS
 * and are already served under a public URL.
 */
export const ChatImage: React.FC<ChatImageProperties> = ({ url, alt, caption }) => {
  const chatId = useChatId();
  const isS3Key = url.startsWith(S3_KEY_PREFIX);

  const { data: downloadData, isLoading } = trpc.chat.getDownloadUrl.useQuery(
    { chatId, key: url },
    { enabled: isS3Key, staleTime: 1000 * 60 * 5 },
  );

  if (isS3Key && isLoading) {
    return (
      <div className="flex h-48 w-64 items-center justify-center rounded-lg bg-gray-100">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const displayUrl = isS3Key ? downloadData?.url : url;
  if (displayUrl === undefined || displayUrl === '') return <></>;

  return (
    <figure className="overflow-hidden rounded-lg">
      <img
        src={displayUrl}
        alt={alt === undefined || alt === '' ? 'Image message' : alt}
        className="h-auto w-full object-cover"
        loading="lazy"
      />
      {caption !== undefined && caption !== '' && (
        <figcaption className="mt-1 text-[0.7rem] leading-snug opacity-80">{caption}</figcaption>
      )}
    </figure>
  );
};
