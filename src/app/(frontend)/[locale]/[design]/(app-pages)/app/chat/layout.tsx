import { SetHideHeader } from '@/components/header/hide-header-context';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { SetOnlineStatus } from '@/features/chat/components/set-online-status';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { ReactNode } from 'react';
import React from 'react';

import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth';
import { redirect } from 'next/navigation';

interface LayoutProperties {
  children: ReactNode;
  params: Promise<{
    locale: Locale;
  }>;
}

const chatsTitle: StaticTranslationString = {
  de: 'Chats',
  en: 'Chats',
  fr: 'Conversations',
};

const Layout: React.FC<LayoutProperties> = async ({ children, params }) => {
  const { locale } = await params;
  const session = await auth();
  const user = session?.user as HitobitoNextAuthUser | undefined;

  if (user?.uuid === undefined) {
    redirect('/entrypoint');
  }

  return (
    <>
      <SetOnlineStatus />
      <SetHideHeader value />
      <SetDynamicPageTitle newTitle={chatsTitle[locale]} />
      {children}
    </>
  );
};

export default Layout;
