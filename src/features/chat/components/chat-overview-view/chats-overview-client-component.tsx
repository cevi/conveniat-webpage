'use client';
import { SetHeaderActions } from '@/components/header/header-actions';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { ChatFilterChips } from '@/features/chat/components/chat-overview-view/chat-filter-chips';
import { ChatPreview } from '@/features/chat/components/chat-overview-view/chat-preview';
import {
  ChatsOverviewSkeleton,
  NewChatButtonSkeleton,
} from '@/features/chat/components/chat-overview-view/chats-overview-skeleton';
import { SwipeToDeleteChat } from '@/features/chat/components/chat-overview-view/swipe-to-delete-chat';
import { RealtimeSyncBanner } from '@/features/chat/components/realtime-sync-banner';
import { ChatSearchField } from '@/features/chat/components/ui/chat-search-field';
import { useChatSSE } from '@/features/chat/hooks/use-chat-sse';
import { useChats } from '@/features/chat/hooks/use-chats';
import type { ChatListFilter } from '@/features/chat/utils/chat-list-filter';
import { matchesChatListFilter } from '@/features/chat/utils/chat-list-filter';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { CheckCheck, MessageSquare, MessageSquarePlus, Users } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import type React from 'react';
import { useMemo, useState } from 'react';

const searchPlaceholderText: StaticTranslationString = {
  en: 'Search chats',
  de: 'Chats durchsuchen',
  fr: 'Rechercher dans les chats',
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

const noUnreadText: StaticTranslationString = {
  de: 'Alles gelesen',
  en: 'All caught up',
  fr: 'Tout est lu',
};

const noGroupsText: StaticTranslationString = {
  de: 'Du bist in keiner Gruppe',
  en: 'You are in no group',
  fr: 'Tu n’es dans aucun groupe',
};

const showAllText: StaticTranslationString = {
  de: 'Alle Chats zeigen',
  en: 'Show all chats',
  fr: 'Afficher tous les chats',
};

const newChatLabel: StaticTranslationString = {
  de: 'Neuer Chat',
  en: 'New chat',
  fr: 'Nouveau chat',
};

const EmptyChatsState: React.FC<{
  searchQuery: string;
  listFilter: ChatListFilter;
  onShowAll: () => void;
  onClearSearch: () => void;
  /** Without it there is no way to start a chat, so the empty state offers none. */
  canCreateChats: boolean;
  locale: Locale;
}> = ({ searchQuery, listFilter, onShowAll, onClearSearch, canCreateChats, locale }) => {
  if (listFilter !== 'all' && searchQuery === '') {
    return (
      <EmptyState
        icon={listFilter === 'unread' ? CheckCheck : Users}
        title={(listFilter === 'unread' ? noUnreadText : noGroupsText)[locale]}
        action={
          <Button variant="quiet" size="touch" onClick={onShowAll}>
            {showAllText[locale]}
          </Button>
        }
      />
    );
  }
  if (searchQuery !== '') {
    return (
      <EmptyState
        icon={MessageSquare}
        title={noChatsFoundText[locale]}
        description={adjustingSearchTermsText[locale]}
        action={
          <Button variant="quiet" size="touch" onClick={onClearSearch}>
            {clearSearchText[locale]}
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={MessageSquarePlus}
      title={noChatsYetText[locale]}
      description={canCreateChats ? newConversationText[locale] : undefined}
      action={
        canCreateChats ? (
          <Button variant="primary" size="touch" asChild>
            <Link href="/app/chat/new">
              <MessageSquarePlus aria-hidden="true" />
              {startConversationCTAText[locale]}
            </Link>
          </Button>
        ) : undefined
      }
    />
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

  const chatIds = useMemo(() => {
    if (!chats) return [];
    return [...chats].map((chat) => chat.id).sort();
  }, [chats]);
  const { status: realtimeStatus, reconnect: reconnectRealtime } = useChatSSE(chatIds);

  // Check capability instead of raw feature flag
  const { data: createChatsEnabled } = trpc.chat.checkCapability.useQuery(
    {
      action: CapabilityAction.Create,
      subject: CapabilitySubject.Chat,
    },
    {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  );

  const handleRefresh = async (): Promise<void> => {
    await trpcUtils.chat.chats.invalidate();
  };

  const [searchQuery, setSearchQuery] = useState('');
  // kept while the route stays mounted, so coming back from a chat keeps the chosen chip
  const [listFilter, setListFilter] = useState<ChatListFilter>('all');
  const locale = useCurrentLocale(i18nConfig) as Locale;

  // Filter chats based on a search query. Pinned chats go first; the sort is stable, so both
  // groups keep the server's most-recent-first order, and chats added optimistically at the
  // head of the cached list still land below the pinned ones.
  const filteredChats =
    chats
      ?.filter((chat): boolean => {
        const rawPreview = chat.lastMessage?.messagePreview;
        let previewText = '';
        if (typeof rawPreview === 'string') {
          previewText = rawPreview;
        } else if (rawPreview) {
          previewText = rawPreview[locale];
        }

        if (!matchesChatListFilter(chat, listFilter)) return false;
        const chatName = chat.name;
        return (
          chatName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          previewText.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => Number(b.isPinned === true) - Number(a.isPinned === true)) ?? [];

  // nothing cached yet (first ever visit / cache still being restored). A
  // failed fetch without any cached chats falls through to the empty state
  // instead of leaving the skeleton on screen forever.
  const isInitialLoad = chats === undefined && !isError;

  const hasChats = (chats?.length ?? 0) > 0 || searchQuery !== '';
  const unreadChats = chats?.filter((chat) => chat.unreadCount > 0).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* the own code needs no right to create chats: a scanned code opens a private chat */}
      <SetHeaderActions>{qrCodeButton}</SetHeaderActions>

      <RealtimeSyncBanner
        status={realtimeStatus}
        onReconnect={reconnectRealtime}
        className="border-live-line rounded-[14px] border"
      />

      {/* only once there is something to search */}
      {hasChats && (
        <div className="flex flex-col gap-3">
          <ChatSearchField
            placeholder={searchPlaceholderText[locale]}
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <ChatFilterChips
            value={listFilter}
            onChange={setListFilter}
            unreadChats={unreadChats}
            locale={locale}
          />
        </div>
      )}

      {/* Loading State - only when there is nothing cached to render */}
      {isInitialLoad && <ChatsOverviewSkeleton />}

      {/* Chat List */}
      {!isInitialLoad && (
        <PullToRefresh onRefresh={handleRefresh}>
          {filteredChats.length > 0 ? (
            <ul className="border-line -mx-4 border-t bg-white sm:mx-0">
              {filteredChats.map((chat) => (
                <li
                  key={chat.id}
                  // the line between rows starts at the text, as the avatar marks each row; above the swipe layer
                  className="after:bg-line relative after:absolute after:right-0 after:bottom-0 after:left-[72px] after:z-20 after:h-px last:after:hidden"
                >
                  <SwipeToDeleteChat chat={chat}>
                    <ChatPreview chat={chat} />
                  </SwipeToDeleteChat>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyChatsState
              searchQuery={searchQuery}
              listFilter={listFilter}
              onShowAll={() => setListFilter('all')}
              onClearSearch={() => setSearchQuery('')}
              canCreateChats={createChatsEnabled === true}
              locale={locale}
            />
          )}
        </PullToRefresh>
      )}

      {/* the screen's main action floats over the list, above the tab bar */}
      {createChatsEnabled === undefined && <NewChatButtonSkeleton />}
      {createChatsEnabled === true && (
        <Link
          href="/app/chat/new"
          className="bg-conveniat-green fixed right-4 bottom-[96px] z-30 flex h-12 items-center gap-2 rounded-2xl px-5 text-[15px] font-semibold text-white shadow-lg hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
          {newChatLabel[locale]}
        </Link>
      )}
    </div>
  );
};
