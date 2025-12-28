import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview-view/chats-overview-client-component';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth, signOut } from '@/utils/auth';
import type React from 'react';

const ChatPage: React.FC = async () => {
  const session = await auth();
  const user = session?.user as HitobitoNextAuthUser | undefined;

  if (user?.uuid === undefined) {
    await signOut({
      redirectTo: '/entrypoint',
    });
  }

  return (
    <div className="fixed top-0 z-0 flex h-[calc(100dvh-80px)] w-screen flex-col overflow-y-hidden bg-gray-50 xl:top-[62px] xl:left-[480px] xl:h-[calc(100dvh-62px-80px)] xl:w-[calc(100dvw-480px)]">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ChatsOverviewClientComponent user={user} />
      </div>
    </div>
  );
};

export default ChatPage;
