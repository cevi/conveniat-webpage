'use client';

import { useHideFooter } from '@/components/footer/hide-footer-context';
import React, { type ReactNode } from 'react';

/**
 * Client wrapper for the footer that conditionally hides it based on context.
 *
 * A screen that covers the phone, like a chat, hides the app's tabs; on a desktop it sits beside
 * them, so they stay.
 */
export const FooterClientWrapper: React.FC<{ children: ReactNode; keepOnDesktop?: boolean }> = ({
  children,
  keepOnDesktop = false,
}) => {
  const { hideFooter } = useHideFooter();

  if (hideFooter) {
    return keepOnDesktop ? <div className="hidden xl:contents">{children}</div> : <></>;
  }

  return <>{children}</>;
};
