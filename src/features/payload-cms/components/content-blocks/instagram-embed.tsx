'use client';
import { ClientOnly } from '@/components/client-only';
import type React from 'react';
import { PlaceholderEmbed, InstagramEmbed as ReactInstagramEmbed } from 'react-social-media-embed';

export interface InstagramEmbedType {
  link: string;
}

export const InstagramEmbed: React.FC<InstagramEmbedType> = ({ link }) => {
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
  );
};
