import { AppAdvertisement } from '@/components/app-advertisement';
import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview-view/chats-overview-client-component';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Locale } from '@/types/types';
import { auth } from '@/utils/auth';
import { DesignCodes } from '@/utils/design-codes';
import { redirect } from 'next/navigation';
import type React from 'react';

const ChatPage: React.FC<{
  params: Promise<{ locale: Locale; design: DesignCodes }>;
}> = async ({ params }) => {
  const { locale, design } = await params;
  const session = await auth();
  const user = session?.user as HitobitoNextAuthUser | undefined;

  if (user?.uuid === undefined) {
    redirect('/entrypoint?clearSkip=true');
  }

  return (
    <>
      <div className="fixed top-0 z-0 flex h-[calc(100dvh-80px)] w-screen flex-col overflow-y-hidden bg-gray-50 xl:top-[62px] xl:left-[480px] xl:h-[calc(100dvh-62px-80px)] xl:w-[calc(100dvw-480px)]">
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ChatsOverviewClientComponent user={user} />
        </div>
      </div>
      {design !== DesignCodes.APP_DESIGN && <AppAdvertisement locale={locale} type="chat" />}
    </>
  );
};

export default ChatPage;
