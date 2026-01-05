import React from 'react';

export interface YoutubeEmbedType {
  links: {
    link: string;
  }[];
}

const renderYoutubeEmbed = (link: string): React.JSX.Element | undefined => {
  const videoId = link.includes('shorts/')
    ? link.split('shorts/')[1]?.split('?')[0]
    : link.split('v=')[1]?.split('&')[0];

  if (!videoId) {
    console.error(`Invalid YouTube URL: ${link}`);
    return undefined;
  }

  const isShort = link.includes('shorts/');
  const iframeProperties = isShort
    ? { width: '315', height: '560' }
    : {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        } as React.CSSProperties,
      };

  return (
    <div {...(isShort ? {} : { className: 'relative aspect-video overflow-hidden rounded-xl' })}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&showinfo=1&modestbranding=1`}
        title="YouTube Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        {...iframeProperties}
      ></iframe>
    </div>
  );
};

export const YoutubeEmbed: React.FC<YoutubeEmbedType> = ({ links }) => {
  if (links.length === 0) {
    console.error('YoutubeEmbed: No links provided.');
    return;
  }

  // Filter out any invalid renders (nulls) from renderYoutubeEmbed
  const validEmbeds = links
    .map((link, index) => ({ component: renderYoutubeEmbed(link.link), index, link }))
    .filter((item) => item.component !== undefined);

  if (validEmbeds.length === 0) {
    console.error('YoutubeEmbed: No valid links provided.');
    return;
  }

  // naive check for all shorts, assuming if first is valid and short, all might be.
  // actually better to check the filtered list
  const allShorts = validEmbeds.every((item) => item.link.link.includes('shorts/'));

  return (
    <div className={allShorts ? 'flex gap-4 overflow-x-auto' : 'flex flex-col gap-4'}>
      {validEmbeds.map((item) => (
        <div key={item.index} className={allShorts ? 'shrink-0' : 'w-full'}>
          {item.component}
        </div>
      ))}
    </div>
  );
};
