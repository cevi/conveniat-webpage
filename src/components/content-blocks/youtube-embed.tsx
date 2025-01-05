import React from 'react';

export type YoutubeEmbedType = {
  link: string;
};

export const YoutubeEmbed: React.FC<YoutubeEmbedType> = async ({ ...block }) => {
  const videoId = block.link.split('v=')[1]?.split('&')[0] ?? undefined;
  if (videoId === undefined) {
    return <p>Invalid YouTube URL.</p>;
  }
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&showinfo=1&modestbranding=1`}
        title="YouTube Video"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};
