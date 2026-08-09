'use client';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Button } from '@/components/ui/buttons/button';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { ChatPreview } from '@/features/chat/components/chat-overview-view/chat-preview';
import { ChatsOverviewSkeleton } from '@/features/chat/components/chat-overview-view/chats-overview-skeleton';
import { SwipeToDeleteChat } from '@/features/chat/components/chat-overview-view/swipe-to-delete-chat';
import { useChatSSE } from '@/features/chat/hooks/use-chat-sse';
import { useChats } from '@/features/chat/hooks/use-chats';
import { useMobileMenuNavigation } from '@/hooks/use-mobile-menu-navigation';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChatType } from '@prisma/client';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

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

const startConversationCTAText: StaticTranslationString = {
  de: 'Unterhaltung starten',
  en: 'Start Conversation',
  fr: 'Démarrer une conversation',
};

const EmptyChatsState: React.FC<{
  searchQuery: string;
  onClearSearch: () => void;
  locale: Locale;
}> = ({ searchQuery, onClearSearch, locale }) => {
  const isSearchActive = searchQuery !== '';

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {/* Visual Badge with Glow */}
      <div className="relative mb-6 flex items-center justify-center">
        <div className="absolute -inset-2 rounded-full bg-linear-to-tr from-green-500/20 via-emerald-400/15 to-blue-500/20 blur-xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="from-conveniat-green flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr to-emerald-500 text-white shadow-md">
            {isSearchActive ? (
              <MessageSquare className="h-7 w-7" />
            ) : (
              <MessageSquarePlus className="h-7 w-7" />
            )}
          </div>
        </div>
      </div>

      <h3 className="font-heading text-xl font-bold tracking-tight text-gray-900">
        {isSearchActive ? noChatsFoundText[locale] : noChatsYetText[locale]}
      </h3>

      <p className="font-body mt-2 max-w-xs text-sm leading-relaxed text-balance text-gray-500">
        {isSearchActive ? adjustingSearchTermsText[locale] : newConversationText[locale]}
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        {isSearchActive ? (
          <Button
            variant="outline"
            className="font-body border-gray-300 hover:bg-gray-100"
            onClick={onClearSearch}
          >
            {clearSearchText[locale]}
          </Button>
        ) : (
          <Link href="/app/chat/new">
            <Button className="bg-conveniat-green font-heading shadow-conveniat-green/20 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-600">
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              {startConversationCTAText[locale]}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

/**
 * Chat overview list.
 *
 * The chats come from the persisted react-query cache, so the last known list
 * is rendered immediately on navigation (and while offline) and is silently
 * replaced once the background revalidation finishes. The skeleton is only
 * shown while there is no cached list at all, i.e. on the very first visit or
 * while the cache is still being restored from IndexedDB.
 */
export const ChatsOverviewClientComponent: React.FC<{
  qrCodeButton?: React.ReactNode;
}> = ({ qrCodeButton }) => {
  const { data: chats, isError } = useChats();
  const trpcUtils = trpc.useUtils();
  const { mobileMenuOpen } = useMobileMenuNavigation();

  const chatIds = useMemo(() => {
    if (!chats) return [];
    return [...chats].map((chat) => chat.id).sort();
  }, [chats]);
  useChatSSE(chatIds);

  // Check capability instead of raw feature flag
  const { data: createChatsEnabled } = trpc.chat.checkCapability.useQuery(
    {
      action: CapabilityAction.Create,
      subject: CapabilitySubject.Chat,
    },
    {
      staleTime: 1000 * 60 * 5,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  const handleRefresh = async (): Promise<void> => {
    await trpcUtils.chat.chats.invalidate();
  };

  const [searchQuery, setSearchQuery] = useState('');
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Filter chats based on a search query
  const filteredChats =
    chats?.filter((chat): boolean => {
      const rawPreview = chat.lastMessage?.messagePreview;
      let previewText = '';
      if (typeof rawPreview === 'string') {
        previewText = rawPreview;
      } else if (rawPreview) {
        previewText = rawPreview[locale];
      }

      const chatName = chat.name;
      return (
        chatName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        previewText.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }) ?? [];

  // nothing cached yet (first ever visit / cache still being restored). A
  // failed fetch without any cached chats falls through to the empty state
  // instead of leaving the skeleton on screen forever.
  const isInitialLoad = chats === undefined && !isError;

  const hasChats = (chats?.length ?? 0) > 0 || searchQuery !== '';

  return (
    <div className="flex flex-col space-y-6">
      {/* Search Bar - only shown if non-empty or search active */}
      {hasChats && (
        <AppSearchBar
          placeholder={searchPlaceholderText[locale]}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onClear={() => setSearchQuery('')}
        />
      )}

      {createChatsEnabled === true && (
        <>
          {mounted && typeof document !== 'undefined' && !mobileMenuOpen
            ? createPortal(
                qrCodeButton !== null && qrCodeButton !== undefined && (
                  <div className="fixed top-[18px] right-6 z-[105]">{qrCodeButton}</div>
                ),
                document.body,
              )
            : undefined}

          {hasChats && !mobileMenuOpen && (
            <div className="fixed right-6 bottom-18 z-30">
              <Link href="/app/chat/new">
                <div className="bg-conveniat-green flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-600">
                  <MessageSquarePlus className="h-7 w-7" />
                </div>
              </Link>
            </div>
          )}
        </>
      )}

      {/* Loading State - only when there is nothing cached to render */}
      {isInitialLoad && <ChatsOverviewSkeleton />}

      {/* Chat List */}
      {!isInitialLoad && (
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
            <EmptyChatsState
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
              locale={locale}
            />
          )}
        </PullToRefresh>
      )}
    </div>
  );
};
