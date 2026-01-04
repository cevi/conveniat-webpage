'use client';

import { useHideHeader } from '@/components/header/hide-header-context';
import React, { type ReactNode } from 'react';

/**
 * Client wrapper for the header that conditionally hides it based on context.
 * On desktop (xl+), the header is always visible even if hideHeader is true.
 */
export const HeaderClientWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { hideHeader } = useHideHeader();

  if (hideHeader) {
    // Hide on mobile, but always show on desktop (xl+)
    return <div className="hidden xl:block">{children}</div>;
  }

  return <>{children}</>;
};
