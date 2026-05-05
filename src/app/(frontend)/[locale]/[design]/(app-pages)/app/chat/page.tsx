import { AppAdvertisement } from '@/components/app-advertisement';
import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview-view/chats-overview-client-component';
import type { Locale } from '@/types/types';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { DesignCodes } from '@/utils/design-codes';
import { redirect } from 'next/navigation';
import type React from 'react';

const ChatPage: React.FC<{
  params: Promise<{ locale: Locale; design: DesignCodes }>;
}> = async ({ params }) => {
  const { locale, design } = await params;
  const session = await auth();
  const user = isValidNextAuthUser(session?.user) ? session.user : undefined;

  if (user?.uuid === undefined) {
    redirect('/entrypoint?clearSkip=true');
  }

  return (
    <>
      <div className="fixed top-[62px] z-0 flex h-[calc(100dvh-62px-80px)] w-screen flex-col overflow-y-hidden bg-gray-50 xl:left-[480px] xl:w-[calc(100dvw-480px)]">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto mt-8 max-w-2xl px-8 py-6">
            <ChatsOverviewClientComponent user={user} />
          </div>
        </div>
      </div>
      {design !== DesignCodes.APP_DESIGN && <AppAdvertisement locale={locale} type="chat" />}
    </>
  );
};

export default ChatPage;
