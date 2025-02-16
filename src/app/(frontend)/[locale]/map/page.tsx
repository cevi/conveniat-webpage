import React from 'react';

import InlineSwisstopoMapEmbed from '@/components/map-viewer/inline-swisstopo-map-embed';

const WebMap = (): React.JSX.Element => {
  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <InlineSwisstopoMapEmbed />
    </article>
  );
};

export default WebMap;
