'use client';
import { ClientOnly } from '@/components/client-only';
import { SectionErrorBoundary } from '@/features/payload-cms/converters/page-sections/section-error-boundary';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';
import { PlaceholderEmbed, InstagramEmbed as ReactInstagramEmbed } from 'react-social-media-embed';

export interface InstagramEmbedType {
  link: string;
}

const errorFallbackMessage: StaticTranslationString = {
  de: 'Instagram-Beitrag nicht verfügbar (evtl. durch Ad-Blocker blockiert)',
  en: 'Instagram post unavailable (likely blocked by ad blocker)',
  fr: 'Post Instagram indisponible (probablement bloqué par un bloqueur de publicité)',
};

export const InstagramEmbed: React.FC<InstagramEmbedType & { locale: Locale }> = ({
  link,
  locale,
}) => {
  if (link === '') {
    console.error('InstagramEmbed: No link provided.');
    return;
  }

  // split by /p/ or /reel/
  const postId = link.split(/\/(p|reel)\//)[2]?.split('/')[0];

  if (postId == undefined) {
    console.error(`InstagramEmbed: Invalid URL ${link}`);
    return;
  }

  return (
    <SectionErrorBoundary
      locale={locale}
      errorFallbackMessage={errorFallbackMessage[locale]}
      isDraftMode={false}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <ClientOnly
          fallback={
            <PlaceholderEmbed
              className="h-[625px] w-[328px]"
              url={`https://www.instagram.com/p/${postId}/`}
            />
          }
        >
          <ReactInstagramEmbed
            url={`https://www.instagram.com/p/${postId}/`}
            width={328}
            height={625}
          />
        </ClientOnly>
      </div>
    </SectionErrorBoundary>
  );
};
