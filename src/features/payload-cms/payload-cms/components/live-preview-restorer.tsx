'use client';

import { useLivePreviewContext } from '@payloadcms/ui';
import React, { useEffect, useRef } from 'react';

export const LivePreviewRestorer: React.FC = () => {
  const { url, setURL } = useLivePreviewContext();
  const lastValidUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    // If the URL is valid, silently cache it.
    if (typeof url === 'string' && url !== '') {
      lastValidUrl.current = url;
    }
    // If the URL suddenly drops (due to the AbortController Server Action bug in Payload CMS),
    // instantly restore the last known good URL client-side.
    else if ((url === undefined || url === '') && typeof lastValidUrl.current === 'string') {
      console.warn(
        `[LivePreviewRestorer] Detected Payload Live Preview URL drop to falsy. Auto-restoring to: ${lastValidUrl.current}`,
      );
      setURL(lastValidUrl.current);
    }
  }, [url, setURL]);

  return <div style={{ display: 'none' }} data-url-restorer="active" />;
};

export default LivePreviewRestorer;
