import type React from 'react';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

const GoSuspenseWrapper: React.FC<{ children: ReactNode }> = async ({ children }) => {
  return <Suspense fallback={<span>Resolve Link Target...</span>}>{children}</Suspense>;
};

export default GoSuspenseWrapper;
