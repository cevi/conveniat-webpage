'use client';

import { usePreviewMode } from '@/hooks/use-preview-mode';
import React from 'react';

export const PreviewMenuSwitcher: React.FC<{
  publishedMenu: React.ReactNode;
  draftMenu: React.ReactNode;
}> = ({ publishedMenu, draftMenu }) => {
  const { isInPreviewMode } = usePreviewMode();

  if (isInPreviewMode === 'enabled') {
    return <>{draftMenu}</>;
  }

  return <>{publishedMenu}</>;
};
