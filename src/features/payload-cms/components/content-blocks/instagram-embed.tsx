'use client';
import { ClientOnly } from '@/features/payload-cms/components/form/client-only';
import type React from 'react';
import { PlaceholderEmbed, InstagramEmbed as ReactInstagramEmbed } from 'react-social-media-embed';

export interface InstagramEmbedType {
  link: string;
}

export const InstagramEmbed: React.FC<InstagramEmbedType> = ({ link }) => {
  if (link === '') {
    return <p>No link provided.</p>;
  }

  const postId = link.split('/p/')[1]?.split('/')[0];

  if (postId == undefined) {
    return <p>Invalid Instagram URL.</p>;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <ClientOnly
        fallback={
          <PlaceholderEmbed
            className="w-[328px] h-[625px]"
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
