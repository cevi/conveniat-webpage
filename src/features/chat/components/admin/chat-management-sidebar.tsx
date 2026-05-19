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
    <div className="flex w-1/3 flex-col border-r border-[var(--theme-elevation-150)]">
      <div className="space-y-4 border-b border-[var(--theme-elevation-150)] p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{title}</h1>
          <button
            onClick={onRefresh}
            disabled={loadingChats || loadingMessages}
            className="cursor-pointer rounded p-2 opacity-70 transition-colors hover:bg-[var(--theme-elevation-100)] hover:opacity-100 disabled:opacity-30"
            title="Refresh"
          >
            <RefreshCw
              size={18}
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
            className="w-full rounded border border-[var(--theme-elevation-300)] bg-[var(--theme-elevation-50)] px-3 py-2 text-sm focus:ring-1 focus:ring-[var(--theme-success-500)] focus:outline-none"
          />
          <label className="group flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(event) => onShowClosedChange(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--theme-elevation-300)] text-[var(--theme-success-500)] focus:ring-[var(--theme-success-500)]"
            />
            <span className="text-xs font-medium opacity-70 transition-opacity group-hover:opacity-100">
              Show Closed Chats
            </span>
          </label>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {loadingChats
          ? Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))
          : chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`w-full cursor-pointer rounded-lg border p-4 text-left transition-all ${
                  selectedChatId === chat.id
                    ? 'translate-x-1 border-[var(--theme-elevation-400)] bg-[var(--theme-elevation-100)] shadow-md'
                    : 'border-[var(--theme-elevation-150)] bg-[var(--theme-bg)] hover:border-[var(--theme-elevation-300)] hover:bg-[var(--theme-elevation-50)]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="truncate font-semibold">{chat.name}</span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      chat.status === ChatStatus.OPEN
                        ? 'border-[var(--theme-success-150)] bg-[var(--theme-success-50)] text-[var(--theme-success-700)]'
                        : 'border-[var(--theme-elevation-300)] bg-[var(--theme-elevation-200)] text-[var(--theme-elevation-500)]'
                    }`}
                  >
                    {chat.status}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs opacity-70">
                  {chat.description ?? 'No description'}
                </div>
                <div className="mt-1 text-[10px] opacity-50">{chat.messageCount} messages</div>
              </button>
            ))}
        {!loadingChats && chats.length === 0 && (
          <div className="p-4 text-center opacity-50">No chats found.</div>
        )}
      </div>
    </div>
  );
};
