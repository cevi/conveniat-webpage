'use client';
import { ClientOnly } from '@/components/client-only';
import type React from 'react';
import { PlaceholderEmbed, InstagramEmbed as ReactInstagramEmbed } from 'react-social-media-embed';

export interface InstagramEmbedType {
  link: string;
}

export const InstagramEmbed: React.FC<InstagramEmbedType> = ({ link }) => {
  if (link === '') {
    return <p>No link provided.</p>;
  }

  // split by /p/ or /reel/
  const postId = link.split(/\/(p|reel)\//)[2]?.split('/')[0];

  if (postId == undefined) {
    return <p>Invalid Instagram URL.</p>;
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
