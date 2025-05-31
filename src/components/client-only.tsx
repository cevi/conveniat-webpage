'use client';

import React from 'react';

/**
 * ClientOnly component
 * See https://stackoverflow.com/questions/72499480/using-react-select-with-nextjs-causes-hydration-error-when-select-element
 *
 * @param children
 * @param fallback
 * @param delegated
 * @constructor
 */
export const ClientOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  [key: string]: unknown;
}> = ({ children, fallback, ...delegated }) => {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);
  if (!hasMounted) {
    return <>{fallback}</>;
  }
  return <div {...delegated}>{children}</div>;
};
