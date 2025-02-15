import PublishingButtonClientWrapper from '@/payload-cms/components/multi-lang-publishing/publish-localized-client';
import React from 'react';

/**
 * A server wrapper for the PublishButtonClient component.
 * This wrapper injects a CSS rule to hide the defaults publishing status of the
 * document. This needs to be done server-side, as the client-side CSS injection
 * would be too late leading to a flickering effect.
 *
 */
const PublishingButtonServerWrapper: React.FC = () => {
  return (
    <>
      <style>
        {`.doc-controls__status
        {
          display: none;
        }`}
      </style>
      <PublishingButtonClientWrapper />
    </>
  );
};

export default PublishingButtonServerWrapper;
