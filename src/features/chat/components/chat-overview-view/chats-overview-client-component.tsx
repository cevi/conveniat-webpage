'use client';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Button } from '@/components/ui/buttons/button';
import { ChatPreview } from '@/features/chat/components/chat-overview-view/chat-preview';
import { QRCodeClientComponent } from '@/features/chat/components/qr-component';
import { useChats } from '@/features/chat/hooks/use-chats';
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

export const ChatsOverviewClientComponent: React.FC<{ user: HitobitoNextAuthUser }> = ({
  user,
}) => {
  const { data: chats, isLoading } = useChats();

  const [searchQuery, setSearchQuery] = useState('');
  const locale = useCurrentLocale(i18nConfig) as Locale;

  // Filter chats based on a search query
  const filteredChats =
    chats?.filter(
      (chat): boolean =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage.messagePreview.toLowerCase().includes(searchQuery.toLowerCase()),
    ) ?? [];

  return (
    <div className="flex flex-col space-y-6">
      {/* Search Bar */}

      <AppSearchBar
        placeholder={searchPlaceholderText[locale]}
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      {/* New Chat Button */}
      <div className="flex justify-end gap-2">
        <Link className="flex justify-end" href="/app/chat/new">
          <MessageSquarePlus />
        </Link>

        <QRCodeClientComponent url={user.uuid} />
      </div>
      {/* Loading State */}
      {isLoading && <ChatsOverviewLoadingPlaceholder />}
      {/* Empty State */}
      {!isLoading && filteredChats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
            <MessageSquare className="h-8 w-8 text-gray-500" />
          </div>
          <p className="font-heading text-lg font-semibold text-gray-700">
            {searchQuery === '' ? noChatsYetText[locale] : noChatsFoundText[locale]}
          </p>
          <p className="font-body mt-2 text-sm text-gray-500">
            {searchQuery === '' ? newConversationText[locale] : adjustingSearchTermsText[locale]}
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
      {/* Chat List */}
      {!isLoading && filteredChats.length > 0 && (
        <div className="space-y-2">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                'rounded-md border-2 border-gray-200 bg-white transition-shadow',
                'hover:bg-gray-100 hover:shadow-md',
                {
                  'bg-white': !(chat.unreadCount > 0),
                  'border-l-conveniat-green border-l-4 bg-green-50': chat.unreadCount > 0,
                  'border-red-700 bg-red-600 hover:bg-red-700':
                    chat.chatType === ChatType.EMERGENCY,
                  'border-l-4 border-l-red-800':
                    chat.chatType === ChatType.EMERGENCY && chat.unreadCount > 0,
                },
              )}
            >
              <ChatPreview chat={chat} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
