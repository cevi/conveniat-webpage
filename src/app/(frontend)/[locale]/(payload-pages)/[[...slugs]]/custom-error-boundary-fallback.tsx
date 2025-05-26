'use client';

import { PermissionError } from '@/app/(frontend)/[locale]/(payload-pages)/[[...slugs]]/permission-error';
import { PreviewError } from '@/app/(frontend)/[locale]/(payload-pages)/[[...slugs]]/preview-error';
import { useSearchParams } from 'next/navigation';

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
