import { ChatIdProvider } from '@/features/chat/context/chat-id-context';
import type React from 'react';
import type { ReactNode } from 'react';

interface ChatPageProperties {
  children: ReactNode;
}

/**
 * Every chat is the same client-rendered screen; which one it shows comes from the URL in the
 * browser. Awaiting `params` here would keep the screen out of the route's App Shell, so a tap on
 * a chat showed the list's skeleton until the server answered, even for a chat the phone holds.
 */
const ChatPageLayout: React.FC<ChatPageProperties> = ({ children }) => {
  return <ChatIdProvider>{children}</ChatIdProvider>;
};

export default ChatPageLayout;
