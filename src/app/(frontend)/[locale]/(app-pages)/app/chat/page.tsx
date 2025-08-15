import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview-view/chats-overview-client-component';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';
import type React from 'react';

const ChatPage: React.FC = async () => {
  const session = await auth();
  const user = session?.user as HitobitoNextAuthUser;

  return (
    <div className="mt-12 mb-auto flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ChatsOverviewClientComponent user={user} />
      </div>
    </div>
  );
};

export default ChatPage;
