'use client';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Button } from '@/components/ui/buttons/button';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { ChatPreview } from '@/features/chat/components/chat-overview-view/chat-preview';
import { SwipeToDeleteChat } from '@/features/chat/components/chat-overview-view/swipe-to-delete-chat';
import { QRCodeClientComponent } from '@/features/chat/components/qr-component';
import { useChats } from '@/features/chat/hooks/use-chats';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { trpc } from '@/trpc/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChatType } from '@prisma/client';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';

const searchPlaceholderText: StaticTranslationString = {
  en: 'Search conversations...',
  de: 'Unterhaltungen durchsuchen...',
  fr: 'Rechercher des conversations...',
};

const noChatsFoundText: StaticTranslationString = {
  en: 'No chats found',
  de: 'Keine Chats gefunden',
  fr: 'Aucun chat trouvé',
};

const noChatsYetText: StaticTranslationString = {
  en: 'No conversations yet',
  de: 'Noch keine Unterhaltungen',
  fr: 'Aucune conversation pour le moment',
};

const newConversationText: StaticTranslationString = {
  en: 'Start a new conversation by showing the QR code to someone',
  de: 'Starte eine neue Unterhaltung, indem du den QR Code jemandem zeigst.',
  fr: "Commencez une nouvelle conversation en montrant le code QR à quelqu'un",
};

const adjustingSearchTermsText: StaticTranslationString = {
  en: 'Try adjusting your search terms',
  de: 'Versuche, deine Suchbegriffe anzupassen',
  fr: "Essayez d'ajuster vos termes de recherche",
};

const clearSearchText: StaticTranslationString = {
  de: 'Suche löschen',
  en: 'Clear search',
  fr: 'Effacer la recherche',
};

const loadingPlaceholderText: StaticTranslationString = {
  en: 'Loading your conversations...',
  de: 'Lade deine Unterhaltungen...',
  fr: 'Chargement de vos conversations...',
};

const ChatsOverviewLoadingPlaceholder: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="border-t-conveniat-green h-8 w-8 animate-spin rounded-full border-2 border-gray-300"></div>
        <p className="font-body text-sm text-gray-600">{loadingPlaceholderText[locale]}</p>
      </div>
    </div>
  );
};

export const ChatsOverviewClientComponent: React.FC<{ user: HitobitoNextAuthUser | undefined }> = ({
  user,
}) => {
  const { data: chats, isLoading } = useChats();
  const trpcUtils = trpc.useUtils();

  // Check capability instead of raw feature flag
  const { data: createChatsEnabled } = trpc.chat.checkCapability.useQuery({
    action: CapabilityAction.Create,
    subject: CapabilitySubject.Chat,
  });

  const handleRefresh = async (): Promise<void> => {
    await trpcUtils.chat.chats.invalidate();
  };

  const [searchQuery, setSearchQuery] = useState('');
  const locale = useCurrentLocale(i18nConfig) as Locale;

  // Filter chats based on a search query
  const filteredChats =
    chats?.filter((chat): boolean => {
      const previewText =
        typeof chat.lastMessage.messagePreview === 'string'
          ? chat.lastMessage.messagePreview
          : chat.lastMessage.messagePreview[locale];

      return (
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        previewText.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }) ?? [];

  return (
    <div className="flex flex-col space-y-6">
      {/* Search Bar */}

      <AppSearchBar
        placeholder={searchPlaceholderText[locale]}
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      {createChatsEnabled && (
        <>
          {/* New Chat Button */}
          <div className="flex justify-end gap-2">
            {user?.uuid && <QRCodeClientComponent url={user.uuid} />}
          </div>

          <div className="fixed right-6 bottom-18 z-50">
            <Link href="/app/chat/new">
              <div className="bg-conveniat-green flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-600">
                <MessageSquarePlus className="h-7 w-7" />
              </div>
            </Link>
          </div>
        </>
      )}

      {/* Loading State */}
      {isLoading && <ChatsOverviewLoadingPlaceholder />}

      {/* Chat List */}
      {!isLoading && (
        <PullToRefresh onRefresh={handleRefresh}>
          {filteredChats.length > 0 ? (
            <div className="space-y-2">
              {filteredChats.map((chat) => (
                <SwipeToDeleteChat key={chat.id} chat={chat}>
                  <div
                    className={cn(
                      'rounded-md border-2 border-gray-200 bg-white transition-shadow',
                      'hover:bg-gray-100 hover:shadow-md',
                      {
                        'bg-white': !(chat.unreadCount > 0),
                        'border-l-conveniat-green border-l-4 bg-green-50':
                          chat.unreadCount > 0 && chat.chatType !== ChatType.EMERGENCY,
                        'bg-linear-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100':
                          chat.chatType === ChatType.EMERGENCY,
                        'border-l-4 border-l-red-500':
                          chat.chatType === ChatType.EMERGENCY && chat.unreadCount > 0,
                      },
                    )}
                  >
                    <ChatPreview chat={chat} />
                  </div>
                </SwipeToDeleteChat>
              ))}
            </div>
          ) : (
            /* Empty State (inside PullToRefresh to allow refreshing when empty) */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
                <MessageSquare className="h-8 w-8 text-gray-500" />
              </div>
              <p className="font-heading text-lg font-semibold text-gray-700">
                {searchQuery === '' ? noChatsYetText[locale] : noChatsFoundText[locale]}
              </p>
              <p className="font-body mt-2 text-sm text-balance text-gray-500">
                {searchQuery === ''
                  ? newConversationText[locale]
                  : adjustingSearchTermsText[locale]}
              </p>
              {searchQuery !== '' && (
                <Button
                  variant="outline"
                  className="font-body mt-4 border-gray-300 hover:bg-gray-100"
                  onClick={() => setSearchQuery('')}
                >
                  {clearSearchText[locale]}
                </Button>
              )}
            </div>
          )}
        </PullToRefresh>
      )}
    </div>
  );
};
