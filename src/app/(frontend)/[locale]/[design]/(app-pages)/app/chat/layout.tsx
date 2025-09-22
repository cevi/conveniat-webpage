import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { SetOnlineStatus } from '@/features/chat/components/set-online-status';
import { TRPCProvider } from '@/trpc/client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  return (
    <TRPCProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" />
      <SetOnlineStatus />
      <SetDynamicPageTitle newTitle="Chats" />
      {children}
    </TRPCProvider>
  );
};

export default Layout;
