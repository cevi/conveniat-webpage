'use client';
import { ClientOnly } from '@/components/client-only';
import type React from 'react';
import { PlaceholderEmbed, YouTubeEmbed as ReactYouTubeEmbed } from 'react-social-media-embed';

export interface YoutubeEmbedType {
  links: {
    link: string;
  }[];
}

const YoutubeEmbedItem: React.FC<{ link: string }> = ({ link }) => {
  if (link === '') {
    console.error('YoutubeEmbed: Empty link provided.');
    return;
  }

  const isShort = link.includes('shorts/');

  return (
    <div className={isShort ? 'shrink-0' : 'w-full overflow-hidden rounded-xl'}>
      <ClientOnly
        fallback={
          <PlaceholderEmbed
            url={link}
            style={isShort ? { width: 315, height: 560 } : { width: '100%', aspectRatio: '16/9' }}
          />
        }
      >
        <ReactYouTubeEmbed url={link} width={isShort ? 315 : '100%'} />
      </ClientOnly>
    </div>
  );
};

export const YoutubeEmbed: React.FC<YoutubeEmbedType> = ({ links }) => {
  if (links.length === 0) {
    console.error('YoutubeEmbed: No links provided.');
    return;
  }

  const validLinks = links.filter((item) => item.link !== '');

  if (validLinks.length === 0) {
    console.error('YoutubeEmbed: No valid links provided.');
    return;
  }

  const allShorts = validLinks.every((item) => item.link.includes('shorts/'));

  return (
    <div className={allShorts ? 'flex gap-4 overflow-x-auto' : 'flex flex-col gap-4'}>
      {validLinks.map((item, index) => (
        <YoutubeEmbedItem key={index} link={item.link} />
      ))}
    </div>
  );
};
