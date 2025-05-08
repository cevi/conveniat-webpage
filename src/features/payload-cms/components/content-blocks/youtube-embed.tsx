import React from 'react';

export interface YoutubeEmbedType {
  links: {
    link: string;
  }[];
}

const renderYoutubeEmbed = (link: string): React.JSX.Element => {
  const videoId = link.includes('shorts/')
    ? link.split('shorts/')[1]?.split('?')[0]
    : link.split('v=')[1]?.split('&')[0];

  if (!videoId) {
    return <p>Invalid YouTube URL.</p>;
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
    return <p>No links provided.</p>;
  }

  const allShorts = links.every((link) => link.link.includes('shorts/'));

  return (
    <div className={allShorts ? 'flex overflow-x-auto gap-4' : 'flex flex-col gap-4'}>
      {links.map((link, index) => (
        <div key={index} className={allShorts ? 'shrink-0' : 'w-full'}>
          {renderYoutubeEmbed(link.link)}
        </div>
      ))}
    </div>
  );
};
