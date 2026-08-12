import { RealtimeStatusBadge } from '@/features/chat/components/admin/realtime-status-badge';
import type { RealtimeConnectionStatus } from '@/features/chat/hooks/use-admin-realtime-connection';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { ChatStatus } from '@/lib/chat-shared';
import type { Locale, StaticTranslationString } from '@/types/types';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import React from 'react';

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded bg-(--theme-elevation-100) ${className}`} />
);

const searchPlaceholder: StaticTranslationString = {
  de: 'Titel, Nachrichten, Benutzer durchsuchen...',
  en: 'Search title, messages, users...',
  fr: 'Rechercher titre, messages, utilisateurs...',
};

const showClosedLabel: StaticTranslationString = {
  de: 'Geschlossene Chats anzeigen',
  en: 'Show closed chats',
  fr: 'Afficher les chats fermés',
};

const refreshLabel: StaticTranslationString = {
  de: 'Aktualisieren',
  en: 'Refresh',
  fr: 'Actualiser',
};

const noChatsFoundLabel: StaticTranslationString = {
  de: 'Keine Chats gefunden.',
  en: 'No chats found.',
  fr: 'Aucun chat trouvé.',
};

const noDescriptionLabel: StaticTranslationString = {
  de: 'Keine Beschreibung',
  en: 'No description',
  fr: 'Aucune description',
};

const messageCountLabel = (count: number, locale: Locale): string => {
  if (locale === 'de') {
    return count === 1 ? '1 Nachricht' : `${count} Nachrichten`;
  }
  if (locale === 'fr') {
    return count === 1 ? '1 message' : `${count} messages`;
  }
  return count === 1 ? '1 message' : `${count} messages`;
};

const statusLabels: Record<ChatStatus, StaticTranslationString> = {
  [ChatStatus.OPEN]: { de: 'Offen', en: 'Open', fr: 'Ouvert' },
  [ChatStatus.CLOSED]: { de: 'Geschlossen', en: 'Closed', fr: 'Fermé' },
};

/** Short timestamp: time of day for today, date otherwise. */
const formatLastUpdate = (lastUpdate: Date, locale: Locale): string => {
  const date = new Date(lastUpdate);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
};

interface ChatManagementSidebarProperties {
  title: string;
  chats: ChatWithMessagePreview[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  loadingChats: boolean;
  loadingMessages: boolean;
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showClosed: boolean;
  onShowClosedChange: (show: boolean) => void;
  locale: Locale;
  realtimeStatus: RealtimeConnectionStatus;
  lastSignalAt: number | undefined;
  onReconnect: () => void;
}

export const ChatManagementSidebar: React.FC<ChatManagementSidebarProperties> = ({
  title,
  chats,
  selectedChatId,
  onSelectChat,
  loadingChats,
  loadingMessages,
  onRefresh,
  searchQuery,
  onSearchChange,
  showClosed,
  onShowClosedChange,
  locale,
  realtimeStatus,
  lastSignalAt,
  onReconnect,
}) => {
  const scrollContainerReference = React.useRef<HTMLDivElement>(null);

  const handleScroll = (): void => {
    if (scrollContainerReference.current) {
      sessionStorage.setItem(
        `chat-sidebar-scroll-${title}`,
        String(scrollContainerReference.current.scrollTop),
      );
    }
  };

  const hasRestoredScrollReference = React.useRef(false);

  React.useEffect(() => {
    hasRestoredScrollReference.current = false;
  }, [title]);

  React.useEffect(() => {
    if (!loadingChats && scrollContainerReference.current && !hasRestoredScrollReference.current) {
      hasRestoredScrollReference.current = true;
      const saved = sessionStorage.getItem(`chat-sidebar-scroll-${title}`);
      if (saved !== null && saved !== '') {
        const container = scrollContainerReference.current;
        const targetScroll = Number(saved);
        requestAnimationFrame(() => {
          container.scrollTop = targetScroll;
        });
      }
    }
  }, [loadingChats, title]);

  return (
    <div className="flex w-[340px] shrink-0 flex-col border-r border-(--theme-border-color)">
      <div className="space-y-4 border-b border-(--theme-border-color) p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-(--theme-elevation-900)">{title}</h2>
          <div className="flex items-center gap-1">
            <RealtimeStatusBadge
              status={realtimeStatus}
              lastSignalAt={lastSignalAt}
              onReconnect={onReconnect}
              locale={locale}
            />
            <button
              onClick={onRefresh}
              disabled={loadingChats || loadingMessages}
              className="cursor-pointer rounded p-2 text-(--theme-elevation-500) transition-colors hover:bg-(--theme-elevation-100) hover:text-[var(--theme-elevation-800)] disabled:text-[var(--theme-elevation-300)]"
              title={refreshLabel[locale]}
            >
              <RefreshCw
                size={16}
                className={`${loadingChats || loadingMessages ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder[locale]}
            className="w-full rounded border border-(--theme-elevation-150) bg-(--theme-input-bg) px-3 py-2 text-sm text-(--theme-elevation-800) shadow-[0_2px_2px_-1px_rgba(0,0,0,0.1)] transition-[border,box-shadow] placeholder:text-[var(--theme-elevation-400)] hover:border-[var(--theme-elevation-250)] focus:border-[var(--theme-elevation-400)] focus:shadow-none focus:outline-none"
          />
          <label className="group flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(event) => onShowClosedChange(event.target.checked)}
              className="h-4 w-4 rounded border-(--theme-elevation-300) accent-(--theme-success-500)"
            />
            <span className="text-xs font-medium text-(--theme-elevation-500) transition-colors group-hover:text-(--theme-elevation-800)">
              {showClosedLabel[locale]}
            </span>
          </label>
        </div>
      </div>
      <div
        ref={scrollContainerReference}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2"
      >
        {loadingChats ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {chats.map((chat) => {
              const hasUnread = chat.unreadCount > 0;
              const isEmergency = chat.chatType === 'EMERGENCY';
              const showUnread = hasUnread && selectedChatId !== chat.id;

              // Determine classes cleanly without nested ternaries
              let cardBgClass = 'border-transparent hover:bg-[var(--theme-elevation-50)]';
              if (selectedChatId === chat.id) {
                cardBgClass =
                  'border-[var(--theme-elevation-250)] bg-[var(--theme-elevation-100)] shadow-sm';
              } else if (showUnread) {
                cardBgClass =
                  'border-[var(--theme-elevation-100)] bg-[var(--theme-elevation-50)] hover:bg-[var(--theme-elevation-100)]';
              }

              let titleTextClass = 'text-[var(--theme-elevation-800)]';
              if (selectedChatId === chat.id) {
                titleTextClass = 'text-[var(--theme-elevation-900)]';
              } else if (showUnread) {
                titleTextClass = 'text-[var(--theme-elevation-900)] font-bold';
              }

              const descriptionTextClass = showUnread
                ? 'text-[var(--theme-elevation-700)] font-medium'
                : 'text-[var(--theme-elevation-500)]';

              const messageCountTextClass = showUnread
                ? 'text-[var(--theme-elevation-500)] font-semibold'
                : 'text-[var(--theme-elevation-400)]';

              return (
                <motion.div
                  key={chat.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    className={`relative mb-1 w-full cursor-pointer rounded border p-3 pl-4 text-left transition-all ${cardBgClass}`}
                  >
                    {/* Glowing left accent indicator strip for unread chats */}
                    {showUnread && (
                      <div
                        className={`absolute top-2 bottom-2 left-0 w-1 rounded-r transition-all ${
                          isEmergency
                            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                            : 'bg-(--theme-success-500) shadow-[0_0_8px_var(--theme-success-500)]'
                        }`}
                      />
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`truncate text-sm font-semibold transition-colors ${titleTextClass}`}
                        >
                          {chat.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {showUnread && (
                          <span
                            className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold text-white shadow-sm ${
                              isEmergency ? 'bg-red-500' : 'bg-(--theme-success-500)'
                            }`}
                          >
                            {chat.unreadCount}
                          </span>
                        )}
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            chat.status === ChatStatus.OPEN
                              ? 'bg-(--theme-success-100) text-(--theme-success-600)'
                              : 'bg-(--theme-elevation-100) text-(--theme-elevation-500)'
                          }`}
                        >
                          {statusLabels[chat.status][locale]}
                        </span>
                      </div>
                    </div>
                    {chat.caseNumber != undefined && chat.caseNumber !== '' && (
                      <div className="mt-1">
                        <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-700">
                          {chat.caseNumber}
                        </span>
                      </div>
                    )}
                    <div
                      className={`mt-1 truncate text-xs transition-colors ${descriptionTextClass}`}
                    >
                      {chat.description ?? noDescriptionLabel[locale]}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className={`text-[10px] transition-colors ${messageCountTextClass}`}>
                        {messageCountLabel(chat.messageCount, locale)}
                      </span>
                      <span className="text-[10px] text-[var(--theme-elevation-400)]">
                        {formatLastUpdate(chat.lastUpdate, locale)}
                      </span>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        {!loadingChats && chats.length === 0 && (
          <div className="p-4 text-center text-sm text-(--theme-elevation-400)">
            {noChatsFoundLabel[locale]}
          </div>
        )}
      </div>
    </div>
  );
};
