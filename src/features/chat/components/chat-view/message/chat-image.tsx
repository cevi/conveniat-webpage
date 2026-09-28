/* eslint-disable @next/next/no-img-element */
'use client';

import { ImageViewer } from '@/features/chat/components/chat-view/message/image-viewer';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Loader2 } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useState } from 'react';

const imageText: StaticTranslationString = {
  de: 'Bild',
  en: 'Image',
  fr: 'Image',
};

const openImageText: StaticTranslationString = {
  de: 'Bild gross anzeigen',
  en: 'Show image full screen',
  fr: "Afficher l'image en plein écran",
};

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
 * and are already served under a public URL. A tap opens the image full screen, unless a
 * message is selected, where a tap selects this message instead.
 */
export const ChatImage: React.FC<ChatImageProperties> = ({ url, alt, caption }) => {
  const chatId = useChatId();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { selectedMessage } = useChatActions();
  const [isViewerOpen, setIsViewerOpen] = useState(false);
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

  const altText = alt === undefined || alt === '' ? imageText[locale] : alt;

  return (
    <figure className="overflow-hidden rounded-lg">
      <button
        type="button"
        aria-label={openImageText[locale]}
        className="block w-full cursor-zoom-in"
        onClick={(event) => {
          if (selectedMessage !== undefined) return;
          // the bubble would otherwise toggle its time
          event.stopPropagation();
          setIsViewerOpen(true);
        }}
      >
        <img src={displayUrl} alt={altText} className="h-auto w-full object-cover" loading="lazy" />
      </button>
      {caption !== undefined && caption !== '' && (
        <figcaption className="mt-1 text-[0.7rem] leading-snug opacity-80">{caption}</figcaption>
      )}
      {isViewerOpen && (
        <ImageViewer
          src={displayUrl}
          alt={altText}
          caption={caption}
          locale={locale}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </figure>
  );
};
