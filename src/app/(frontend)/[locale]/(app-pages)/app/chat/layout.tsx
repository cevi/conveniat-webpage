import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { SetOnlineStatus } from '@/features/chat/components/set-online-status';
import { QueryClientProvider } from '@/providers/query-client-provider';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  return (
    <QueryClientProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" />
      <SetOnlineStatus />
      <SetDynamicPageTitle newTitle="Chats" />
      {children}
    </QueryClientProvider>
  );
};

export default Layout;
