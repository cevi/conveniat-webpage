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
      <article className="container mx-auto mt-8 mb-20 py-6">
        <div className="mx-auto w-full max-w-2xl px-8">
          <ChatsOverviewClientComponent user={user} />
        </div>
      </article>
      {design !== DesignCodes.APP_DESIGN && <AppAdvertisement locale={locale} type="chat" />}
    </>
  );
};

export default ChatPage;
