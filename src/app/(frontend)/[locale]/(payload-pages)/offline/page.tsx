import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Offline',
};

/**
 * This page gets displayed when the user is offline.
 *
 */
const OfflinePage: React.FC = () => {
  return (
    <>
      <h1>This is offline fallback page</h1>
      <h2>When offline, any page route will fallback to this page</h2>
    </>
  );
};

export const dynamic = 'force-dynamic';
export default OfflinePage;
