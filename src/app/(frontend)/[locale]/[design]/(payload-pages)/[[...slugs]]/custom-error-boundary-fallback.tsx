'use client';

import { PermissionError } from '@/app/(frontend)/[locale]/[design]/(payload-pages)/[[...slugs]]/permission-error';
import { PreviewError } from '@/app/(frontend)/[locale]/[design]/(payload-pages)/[[...slugs]]/preview-error';
import { useSearchParams } from 'next/navigation';
import type React from 'react';

export const CustomErrorBoundaryFallback: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const searchParameters = useSearchParams();
  const error = searchParameters.get('error') ?? '';

  if (error === 'permission') {
    return <PermissionError />;
  }

  const requestedAsPreview = searchParameters.get('preview') === 'true';
  if (requestedAsPreview) {
    return <PreviewError />;
  }
  return <>{children}</>;
};
