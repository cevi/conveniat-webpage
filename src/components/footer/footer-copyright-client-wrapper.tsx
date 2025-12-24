'use client';

import { useHideFooter } from '@/components/footer/hide-footer-context';
import React, { type ReactNode } from 'react';

/**
 * Client wrapper for the footer copyright area that conditionally hides it based on context.
 */
export const FooterCopyrightClientWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { hideCopyrightFooter } = useHideFooter();

  if (hideCopyrightFooter) {
    return <></>;
  }

  return <>{children}</>;
};
