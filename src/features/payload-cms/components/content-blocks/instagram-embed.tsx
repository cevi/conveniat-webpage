export interface InstagramEmbedType {
  link: string;
}

export const InstagramEmbed: React.FC<InstagramEmbedType> = ({ link }) => {
  if (!link) {
    return <p>No link provided.</p>;
  }

  const postId = link.split('/p/')[1]?.split('/')[0];

  if (!postId) {
    return <p>Invalid Instagram URL.</p>;
  }

  return (
    <blockquote className="instagram-media" data-instgrm-permalink={link} data-instgrm-version="14">
      <div className="instagram-embed" data-insgrm-captioned>
        <div className="instagram-embed">
          <iframe
            style={{ borderWidth: 0, width: 612, height: 924 }}
            src={`https://www.instagram.com/p/${postId}/embed/captioned`}
            width="612"
            height="924"
            frameBorder="0"
            scrolling="no"
            allowFullScreen
            className="instagram-media-iframe"
          ></iframe>
        </div>
      </div>
      <script async src="//www.instagram.com/embed.js"></script>
    </blockquote>
  );
};
