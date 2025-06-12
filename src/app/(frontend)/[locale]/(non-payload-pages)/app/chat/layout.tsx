import { QueryClientProvider } from '@/providers/query-client-provider';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  return <QueryClientProvider>{children}</QueryClientProvider>;
};

export default Layout;
