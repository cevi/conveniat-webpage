import React from 'react';

export type YoutubeEmbedType = {
  link: string;
};

export const YoutubeEmbed: React.FC<YoutubeEmbedType> = async ({ ...block }) => {
  const videoId = block.link.split('v=')[1]?.split('&')[0] || undefined;
  if (!videoId) {
    return <p>Invalid YouTube URL.</p>;
  }
  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube Video"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};
