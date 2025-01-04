'use client';

import { RefreshRouteOnSave as PayloadLivePreview } from '@payloadcms/live-preview-react';
import { useRouter } from 'next/navigation';
import React from 'react';

export const RefreshRouteOnSave: React.FC = () => {
  const router = useRouter();
  const APP_HOST_URL = process.env['NEXT_PUBLIC_APP_HOST_URL'] ?? '';

  return <PayloadLivePreview refresh={() => router.refresh()} serverURL={APP_HOST_URL} />;
};
