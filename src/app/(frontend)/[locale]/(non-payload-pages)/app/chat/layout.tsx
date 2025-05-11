import { QueryClientProviderClientComponent } from '@/features/chat/components/query-client-provider-client-component';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  return <QueryClientProviderClientComponent>{children}</QueryClientProviderClientComponent>;
};

export default Layout;
