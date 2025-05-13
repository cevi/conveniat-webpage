import { ChatQueryClientProvider } from '@/features/chat/components/chat-query-client-provider';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  return <ChatQueryClientProvider>{children}</ChatQueryClientProvider>;
};

export default Layout;
