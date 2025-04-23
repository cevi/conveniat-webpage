'use client';

import React from 'react';

/**
 * ClientOnly component (the form is only shown on the client side).
 * See https://stackoverflow.com/questions/72499480/using-react-select-with-nextjs-causes-hydration-error-when-select-element
 *
 * @param children
 * @param delegated
 * @constructor
 */
export const ClientOnly: React.FC<{
  children: React.ReactNode;
  [key: string]: unknown;
}> = ({ children, ...delegated }) => {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);
  if (!hasMounted) {
    return <></>;
  }
  return <div {...delegated}>{children}</div>;
};
