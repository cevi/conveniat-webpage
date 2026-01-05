'use client';
import { ClientOnly } from '@/components/client-only';
import type React from 'react';
import { PlaceholderEmbed, YouTubeEmbed as ReactYouTubeEmbed } from 'react-social-media-embed';

export interface YoutubeEmbedType {
  links: {
    link: string;
  }[];
}

const renderYoutubeEmbed = (link: string, index: number): React.JSX.Element | undefined => {
  if (!link) {
    console.error('YoutubeEmbed: Empty link provided.');
    return undefined;
  }

  const isShort = link.includes('shorts/');

  return (
    <div key={index} className={isShort ? 'shrink-0' : 'w-full overflow-hidden rounded-xl'}>
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

  const validEmbeds = links
    .map((item, index) => renderYoutubeEmbed(item.link, index))
    .filter((component) => component !== undefined);

  if (validEmbeds.length === 0) {
    console.error('YoutubeEmbed: No valid links provided.');
    return;
  }

  const allShorts = links.every((item) => item.link.includes('shorts/'));

  return (
    <div className={allShorts ? 'flex gap-4 overflow-x-auto' : 'flex flex-col gap-4'}>
      {validEmbeds}
    </div>
  );
};
