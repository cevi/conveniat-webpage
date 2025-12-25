'use client';
import { SetHideFooter } from '@/components/footer/hide-footer-context';
import { ChatHeader, ChatHeaderSkeleton } from '@/features/chat/components/chat-view/chat-header';
import { ChatSkeleton } from '@/features/chat/components/chat-view/chat-skeleton';
import { ChatTextAreaInput } from '@/features/chat/components/chat-view/chat-text-area-input';
import { MessageList } from '@/features/chat/components/chat-view/message-list';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const yourOffline: StaticTranslationString = {
  en: "You're offline.",
  de: 'Du bist offline.',
  fr: 'Vous êtes hors ligne.',
};

const youMustBeOnline: StaticTranslationString = {
  en: 'You need to be online to view this chat.',
  de: 'Du musst online sein, um diesen Chat zu sehen.',
  fr: 'Vous devez être en ligne pour voir ce chat.',
};

const cannotSendOffline: StaticTranslationString = {
  en: 'You are currently offline. Messages will be sent when you are back online.',
  de: 'Du bist derzeit offline. Nachrichten werden gesendet, wenn du wieder online bist.',
  fr: 'Vous êtes actuellement hors ligne. Les messages seront envoyés lorsque vous serez de nouveau en ligne.',
};

const errorLoadingChat: StaticTranslationString = {
  en: 'Error loading chat.',
  de: 'Fehler beim Laden des Chats.',
  fr: 'Erreur de chargement du chat.',
};

const tryAgainLater: StaticTranslationString = {
  en: 'Please try again later.',
  de: 'Bitte versuche es später noch einmal.',
  fr: 'Veuillez réessayer plus tard.',
};

/**
 * Message displayed if the user is offline and tries to access a chat.
 * And the chat is not cached.
 *
 * @constructor
 */
const ChatOfflineMessage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  return (
    <div className="fixed top-0 z-[100] flex h-dvh w-screen flex-col overflow-y-hidden bg-gray-50 xl:top-[62px] xl:left-[480px] xl:z-0 xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
      <ChatHeaderSkeleton />
      <div className="flex flex-1 items-center justify-center p-4 text-center text-gray-500">
        <span>
          <b>{yourOffline[locale]}</b>
          <br />
          {youMustBeOnline[locale]}
        </span>
      </div>
    </div>
  );
};

export const ChatErrorMessage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="fixed top-0 z-[100] flex h-dvh w-screen flex-col overflow-y-hidden bg-gray-50 xl:top-[62px] xl:left-[480px] xl:z-0 xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
      <ChatHeaderSkeleton />
      <div className="flex flex-1 items-center justify-center p-4 text-center text-red-500">
        <span>
          <b>{errorLoadingChat[locale]}</b>
          <br />
          {tryAgainLater[locale]}
        </span>
      </div>
    </div>
  );
};

const OfflineBanner: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="bg-red-100 p-4 text-center text-red-800">
      <span className="font-semibold">{cannotSendOffline[locale]}</span>
    </div>
  );
};

export const ChatClientComponent: React.FC = () => {
  const chatId = useChatId();
  const { isLoading, isPaused, isPending, isError, errorUpdateCount } = useChatDetail(chatId);

  if (isLoading && errorUpdateCount === 0) return <ChatSkeleton />;
  if (isPaused && isPending) return <ChatOfflineMessage />;
  if (isError || (isLoading && errorUpdateCount !== 0)) return <ChatErrorMessage />;

  return (
    <div className="fixed top-0 z-[100] flex h-dvh w-screen flex-col overflow-y-hidden bg-gray-50 xl:top-[62px] xl:left-[480px] xl:z-0 xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
      <SetHideFooter value />
      <ChatHeader />
      {isPaused && <OfflineBanner />}
      <div className="flex-1 overflow-y-auto">
        <MessageList />
      </div>
      <div className="border-t border-gray-200 bg-white p-2">
        <ChatTextAreaInput />
      </div>
    </div>
  );
};
