'use client';
import { GenericChatManagementView } from '@/features/payload-cms/payload-cms/views/generic-chat-management-view';
import { ChatType } from '@/lib/prisma/client';
import { useLocale } from '@payloadcms/ui';
import React from 'react';

import type { StaticTranslationString } from '@/types/types';

const supportChatsTitle: StaticTranslationString = {
  de: 'Support Chats',
  en: 'Support Chats',
  fr: 'Chats de support',
};

export const ChatManagementView: React.FC = () => {
  const { code: locale } = useLocale();
  const title = supportChatsTitle[locale as keyof StaticTranslationString];

  return <GenericChatManagementView chatType={ChatType.SUPPORT_GROUP} title={title} />;
};

export default ChatManagementView;
