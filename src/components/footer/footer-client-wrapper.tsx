'use client';

import { useHideFooter } from '@/components/footer/hide-footer-context';
import React, { type ReactNode } from 'react';

/**
 * Client wrapper for the footer that conditionally hides it based on context.
 */
export const FooterClientWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { hideFooter } = useHideFooter();

  if (hideFooter) {
    return <></>;
  }

  return <>{children}</>;
};
