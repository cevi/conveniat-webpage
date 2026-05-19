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
          : chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`w-full cursor-pointer rounded border p-3 text-left transition-all ${
                  selectedChatId === chat.id
                    ? 'border-[var(--theme-elevation-250)] bg-[var(--theme-elevation-100)]'
                    : 'border-transparent hover:bg-[var(--theme-elevation-50)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[var(--theme-elevation-900)]">
                    {chat.name}
                  </span>
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
                <div className="mt-1 truncate text-xs text-[var(--theme-elevation-500)]">
                  {chat.description ?? 'No description'}
                </div>
                <div className="mt-1 text-[10px] text-[var(--theme-elevation-400)]">
                  {chat.messageCount} messages
                </div>
              </button>
            ))}
        {!loadingChats && chats.length === 0 && (
          <div className="p-4 text-center text-sm text-[var(--theme-elevation-400)]">
            No chats found.
          </div>
        )}
      </div>
    </div>
  );
};
