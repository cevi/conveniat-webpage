import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { ChatStatus } from '@/lib/chat-shared';
import { RefreshCw } from 'lucide-react';
import React from 'react';

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded bg-[var(--theme-elevation-100)] ${className}`} />
);

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
}) => {
  return (
    <div className="flex w-[340px] shrink-0 flex-col border-r border-[var(--theme-border-color)]">
      <div className="space-y-4 border-b border-[var(--theme-border-color)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--theme-elevation-900)]">{title}</h2>
          <button
            onClick={onRefresh}
            disabled={loadingChats || loadingMessages}
            className="cursor-pointer rounded p-2 text-[var(--theme-elevation-500)] transition-colors hover:bg-[var(--theme-elevation-100)] hover:text-[var(--theme-elevation-800)] disabled:text-[var(--theme-elevation-300)]"
            title="Refresh"
          >
            <RefreshCw
              size={16}
              className={`${loadingChats || loadingMessages ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search title, messages, users..."
            className="w-full rounded border border-[var(--theme-elevation-150)] bg-[var(--theme-input-bg)] px-3 py-2 text-sm text-[var(--theme-elevation-800)] shadow-[0_2px_2px_-1px_rgba(0,0,0,0.1)] transition-[border,box-shadow] placeholder:text-[var(--theme-elevation-400)] hover:border-[var(--theme-elevation-250)] focus:border-[var(--theme-elevation-400)] focus:shadow-none focus:outline-none"
          />
          <label className="group flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(event) => onShowClosedChange(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--theme-elevation-300)] accent-[var(--theme-success-500)]"
            />
            <span className="text-xs font-medium text-[var(--theme-elevation-500)] transition-colors group-hover:text-[var(--theme-elevation-800)]">
              Show Closed Chats
            </span>
          </label>
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {loadingChats
          ? Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))
          : chats.map((chat) => {
              const hasUnread = chat.unreadCount > 0;
              const isEmergency = chat.chatType === 'EMERGENCY';

              // Determine classes cleanly without nested ternaries
              let cardBgClass = 'border-transparent hover:bg-[var(--theme-elevation-50)]';
              if (selectedChatId === chat.id) {
                cardBgClass =
                  'border-[var(--theme-elevation-250)] bg-[var(--theme-elevation-100)] shadow-sm';
              } else if (hasUnread) {
                cardBgClass =
                  'border-[var(--theme-elevation-100)] bg-[var(--theme-elevation-50)] hover:bg-[var(--theme-elevation-100)]';
              }

              const titleTextClass =
                selectedChatId === chat.id || hasUnread
                  ? 'text-[var(--theme-elevation-900)]'
                  : 'text-[var(--theme-elevation-800)]';

              const descriptionTextClass = hasUnread
                ? 'text-[var(--theme-elevation-700)] font-medium'
                : 'text-[var(--theme-elevation-500)]';

              const messageCountTextClass = hasUnread
                ? 'text-[var(--theme-elevation-500)] font-semibold'
                : 'text-[var(--theme-elevation-400)]';

              return (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`relative w-full cursor-pointer rounded border p-3 pl-4 text-left transition-all ${cardBgClass}`}
                >
                  {/* Glowing left accent indicator strip for unread chats */}
                  {hasUnread && (
                    <div
                      className={`absolute top-2 bottom-2 left-0 w-1 rounded-r transition-all ${
                        isEmergency
                          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                          : 'bg-[var(--theme-success-500)] shadow-[0_0_8px_var(--theme-success-500)]'
                      }`}
                    />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`truncate text-sm font-semibold transition-colors ${titleTextClass}`}
                    >
                      {chat.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {hasUnread && (
                        <span
                          className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold text-white shadow-sm ${
                            isEmergency ? 'bg-red-500' : 'bg-[var(--theme-success-500)]'
                          }`}
                        >
                          {chat.unreadCount}
                        </span>
                      )}
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          chat.status === ChatStatus.OPEN
                            ? 'bg-[var(--theme-success-100)] text-[var(--theme-success-600)]'
                            : 'bg-[var(--theme-elevation-100)] text-[var(--theme-elevation-500)]'
                        }`}
                      >
                        {chat.status}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`mt-1 truncate text-xs transition-colors ${descriptionTextClass}`}
                  >
                    {chat.description ?? 'No description'}
                  </div>
                  <div className={`mt-1 text-[10px] transition-colors ${messageCountTextClass}`}>
                    {chat.messageCount} messages
                  </div>
                </button>
              );
            })}
        {!loadingChats && chats.length === 0 && (
          <div className="p-4 text-center text-sm text-[var(--theme-elevation-400)]">
            No chats found.
          </div>
        )}
      </div>
    </div>
  );
};
