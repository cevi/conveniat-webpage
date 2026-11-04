'use client';
import { SetHeaderActions } from '@/components/header/header-actions';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { SectionLabel } from '@/components/ui/section-label';
import { ChatActionsSheet } from '@/features/chat/components/chat-overview-view/chat-actions-sheet';
import { ChatDeletedBanner } from '@/features/chat/components/chat-overview-view/chat-deleted-banner';
import { ChatFilterChips } from '@/features/chat/components/chat-overview-view/chat-filter-chips';
import { ChatPreview } from '@/features/chat/components/chat-overview-view/chat-preview';
import { ChatSearchContacts } from '@/features/chat/components/chat-overview-view/chat-search-contacts';
import {
  ChatsOverviewSkeleton,
  NewChatButtonSkeleton,
} from '@/features/chat/components/chat-overview-view/chats-overview-skeleton';
import { chatListBleedClassName } from '@/features/chat/components/chat-overview-view/contact-row';
import { SwipeToDeleteChat } from '@/features/chat/components/chat-overview-view/swipe-to-delete-chat';
import { RealtimeSyncBanner } from '@/features/chat/components/realtime-sync-banner';
import { ChatSearchField } from '@/features/chat/components/ui/chat-search-field';
import { QueryUnavailable } from '@/features/chat/components/ui/query-unavailable';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { usePendingChatDeletionContext } from '@/features/chat/context/pending-chat-deletion-context';
import { useChatListActions } from '@/features/chat/hooks/use-chat-list-actions';
import { useChatSSE } from '@/features/chat/hooks/use-chat-sse';
import { useChats } from '@/features/chat/hooks/use-chats';
import { useSearchClearedOnLeave } from '@/features/chat/hooks/use-search-cleared-on-leave';
import type { ChatListFilter } from '@/features/chat/utils/chat-list-filter';
import { matchesChatListFilter } from '@/features/chat/utils/chat-list-filter';
import { queryAvailability } from '@/features/chat/utils/query-availability';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCheck, MessageSquare, MessageSquarePlus, Users, X } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useId, useMemo, useState } from 'react';

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

const nobodyInAddressBookText: StaticTranslationString = {
  de: 'Auch im Adressbuch passt niemand zu deiner Suche.',
  en: 'Nobody in the address book matches your search either.',
  fr: 'Personne dans le carnet d’adresses ne correspond non plus à ta recherche.',
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

const chatsFoundText: StaticTranslationString = {
  de: 'Chats',
  en: 'Chats',
  fr: 'Conversations',
};

const actionsHintText: StaticTranslationString = {
  de: 'Lange drücken oder Kontextmenü-Taste für Aktionen',
  en: 'Long-press or use the context menu key for actions',
  fr: 'Appui long ou touche de menu contextuel pour les actions',
};

const actionFailedText: StaticTranslationString = {
  de: 'Das hat nicht geklappt. Versuche es nochmals.',
  en: 'That did not work. Please try again.',
  fr: 'Cela n’a pas fonctionné. Réessaie.',
};

const dismissText: StaticTranslationString = {
  de: 'Hinweis schliessen',
  en: 'Dismiss',
  fr: 'Fermer le message',
};

const chatsOfflineDescriptionText: StaticTranslationString = {
  de: 'Deine Chats laden, sobald du wieder Empfang hast.',
  en: 'Your chats load as soon as you have signal again.',
  fr: 'Tes chats se chargent dès que tu as de nouveau du réseau.',
};

const chatsErrorTitleText: StaticTranslationString = {
  de: 'Die Chats konnten nicht geladen werden',
  en: 'The chats could not be loaded',
  fr: 'Les chats n’ont pas pu être chargés',
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
  /** whether the search also went through the address book, see `ChatSearchContacts` */
  hasSearchedContacts: boolean;
  locale: Locale;
}> = ({
  searchQuery,
  listFilter,
  onShowAll,
  onClearSearch,
  canCreateChats,
  hasSearchedContacts,
  locale,
}) => {
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
        description={
          (hasSearchedContacts ? nobodyInAddressBookText : adjustingSearchTermsText)[locale]
        }
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
  const chatsQuery = useChats();
  const { data: chats } = chatsQuery;
  const availability = queryAvailability(chatsQuery);
  const trpcUtils = trpc.useUtils();

  const chatIds = useMemo(() => {
    if (!chats) return [];
    return [...chats].map((chat) => chat.id).sort();
  }, [chats]);
  const { status: realtimeStatus, reconnect: reconnectRealtime } = useChatSSE(chatIds);

  // Check capability instead of raw feature flag
  const {
    data: createChatsEnabled,
    isLoading: isLoadingCreateChats,
    refetch: refetchCreateChats,
  } = trpc.chat.checkCapability.useQuery(
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

  const [searchQuery, setSearchQuery] = useSearchClearedOnLeave();
  // unlike the search, kept while the route stays mounted: coming back from a chat keeps the chip
  const [listFilter, setListFilter] = useState<ChatListFilter>('all');
  const locale = useCurrentLocale(i18nConfig) as Locale;
  // the chat open beside the list on a desktop
  const openChatId = useChatId();
  const isDesktop = useIsDesktop();
  const pendingDeletion = usePendingChatDeletionContext();

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

        // deleted, though the server only hears of it once the moment to undo has passed
        if (chat.id === pendingDeletion.pending?.chatId) return false;
        if (!matchesChatListFilter(chat, listFilter)) return false;
        const chatName = chat.name;
        return (
          chatName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          previewText.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => Number(b.isPinned === true) - Number(a.isPinned === true)) ?? [];

  const hasChats = (chats?.length ?? 0) > 0 || searchQuery !== '';
  // a chip narrows the chats, not the people one could start a chat with
  const searchesContacts =
    createChatsEnabled === true && listFilter === 'all' && searchQuery.trim() !== '';
  const unreadChats = chats?.filter((chat) => matchesChatListFilter(chat, 'unread')).length ?? 0;
  const listActions = useChatListActions();
  const [actionsChatId, setActionsChatId] = useState<string | undefined>();
  // read from the list, so the sheet follows an optimistic change and closes if the chat goes
  const actionsChat = chats?.find((chat) => chat.id === actionsChatId);
  const actionsHintId = useId();

  const emptyState =
    filteredChats.length === 0 ? (
      <EmptyChatsState
        searchQuery={searchQuery}
        listFilter={listFilter}
        onShowAll={() => setListFilter('all')}
        onClearSearch={() => setSearchQuery('')}
        canCreateChats={createChatsEnabled === true}
        hasSearchedContacts={searchesContacts}
        locale={locale}
      />
    ) : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* The own code needs no right to create chats: a scanned code opens a private chat. It
          sits in the app header on a phone and above the list on a desktop, never in both, as
          each copy would open its sheet from the `?qr=` parameter. */}
      <SetHeaderActions>{isDesktop ? undefined : qrCodeButton}</SetHeaderActions>

      {/* The search, once there is something to search, and on a desktop the list's actions
          beside it, at the top of the list the way WhatsApp Web has them, first so it can take
          over the room above it. */}
      {(hasChats || isDesktop) && (
        <div
          className={cn(
            // Kept under the header while the chats scroll beneath it, and in place while a pull
            // to refresh moves them. It takes over the room above and below it, so it stands
            // where it did and covers the rows scrolling under it edge to edge. In a browser
            // that room includes the band under the hanging logo, see the app pages' layout.
            'sticky top-[calc(var(--app-content-top)-var(--app-logo-overhang))] z-20 -mx-4 -mb-4 flex flex-col gap-3 bg-white px-4 pb-4',
            'mt-[calc(-1*(var(--app-logo-overhang)+1rem))] pt-[calc(var(--app-logo-overhang)+1rem)]',
            'sm:mx-0 sm:px-0 xl:top-0 xl:-mx-4 xl:-mt-4 xl:px-4 xl:pt-4',
          )}
        >
          <div className="flex items-center gap-1">
            {hasChats && (
              <div className="min-w-0 flex-1">
                <ChatSearchField
                  placeholder={searchPlaceholderText[locale]}
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>
            )}
            {isDesktop && (
              <div className="ml-auto flex shrink-0 items-center gap-1">
                {qrCodeButton}
                {createChatsEnabled === true && (
                  <Link
                    href="/app/chat/new"
                    aria-label={newChatLabel[locale]}
                    title={newChatLabel[locale]}
                    className="focus-visible:focus-surface-filled bg-conveniat-green flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-green-700"
                  >
                    <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
          </div>
          {hasChats && (
            <ChatFilterChips
              value={listFilter}
              onChange={setListFilter}
              unreadChats={unreadChats}
              locale={locale}
            />
          )}
        </div>
      )}

      <span id={actionsHintId} hidden>
        {actionsHintText[locale]}
      </span>
      {listActions.hasFailed && (
        <p
          role="alert"
          className="bg-danger-soft text-danger-text flex min-h-11 items-center justify-between gap-3 rounded-xl py-1 pr-1 pl-4 text-sm"
        >
          {actionFailedText[locale]}
          <button
            type="button"
            onClick={listActions.dismissFailure}
            aria-label={dismissText[locale]}
            className="hover:bg-danger-line/40 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </p>
      )}
      <ChatActionsSheet
        chat={actionsChat}
        onClose={() => setActionsChatId(undefined)}
        actions={listActions}
        locale={locale}
      />

      <RealtimeSyncBanner
        status={realtimeStatus}
        onReconnect={reconnectRealtime}
        className="border-danger-line rounded-[14px] border"
      />

      {/* only while there is nothing cached to render */}
      {availability === 'loading' && <ChatsOverviewSkeleton />}

      {/* nothing cached, and no answer to say the list is empty */}
      {(availability === 'offline' || availability === 'error') && (
        <QueryUnavailable
          availability={availability}
          offlineDescription={chatsOfflineDescriptionText[locale]}
          errorTitle={chatsErrorTitleText[locale]}
          onRetry={() => {
            void chatsQuery.refetch();
            // failed with the chats, as they share a request; without it the button stays away
            void refetchCreateChats();
          }}
          isRetrying={chatsQuery.isFetching}
          locale={locale}
        />
      )}

      {availability === 'ready' && (
        <PullToRefresh onRefresh={handleRefresh}>
          {filteredChats.length > 0 && (
            <div className={cn(chatListBleedClassName, 'border-line border-t bg-white')}>
              {/* under a search the people to start a chat with follow, each part under its label */}
              {searchesContacts && (
                <SectionLabel className="px-4 pt-4 pb-2">{chatsFoundText[locale]}</SectionLabel>
              )}
              <ul>
                {filteredChats.map((chat) => (
                  <li
                    key={chat.id}
                    // the line between rows starts at the text, as the avatar marks each row. It sits
                    // in a pixel of its own below the row, so a swipe's red ends at the same height
                    // left and right of where the line starts.
                    className="after:bg-line relative pb-px after:absolute after:right-0 after:bottom-0 after:left-[72px] after:h-px last:pb-0 last:after:hidden"
                  >
                    <SwipeToDeleteChat chat={chat}>
                      <ChatPreview
                        chat={chat}
                        onOpenActions={(pressed) => setActionsChatId(pressed.id)}
                        actionsHintId={actionsHintId}
                        isSelected={chat.id === openChatId}
                      />
                    </SwipeToDeleteChat>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* the people one could start a chat with come last, under every chat found */}
          {searchesContacts ? (
            <ChatSearchContacts
              searchQuery={searchQuery}
              foundChats={filteredChats}
              fallback={emptyState}
              locale={locale}
            />
          ) : (
            emptyState
          )}
        </PullToRefresh>
      )}

      {/* the screen's main action floats over the list, above the tab bar, and gives its place
          to the undo of a delete for the moment it lasts */}
      {pendingDeletion.pending !== undefined && (
        <ChatDeletedBanner
          key={pendingDeletion.pending.chatId}
          forEveryone={pendingDeletion.pending.forEveryone}
          onUndo={pendingDeletion.undo}
          onHold={pendingDeletion.hold}
          locale={locale}
        />
      )}
      {/* only while the answer is on its way: offline or after a failure it would pulse forever */}
      {!isDesktop && pendingDeletion.pending === undefined && isLoadingCreateChats && (
        <NewChatButtonSkeleton />
      )}
      {!isDesktop && pendingDeletion.pending === undefined && createChatsEnabled === true && (
        <Link
          href="/app/chat/new"
          className="focus-visible:focus-surface-filled bg-conveniat-green fixed right-4 bottom-[calc(var(--app-tab-bar-height)+16px)] z-30 flex h-12 items-center gap-2 rounded-2xl px-5 text-[15px] font-semibold text-white shadow-lg hover:bg-green-700"
        >
          <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
          {newChatLabel[locale]}
        </Link>
      )}
    </div>
  );
};
