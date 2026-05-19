import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { ChatStatus } from '@/lib/chat-shared';
import { ChatType } from '@/lib/prisma/client';
import React from 'react';

interface ChatManagementHeaderProperties {
  selectedChat: ChatWithMessagePreview;
  chatType: ChatType;
  locale: string;
  onCloseChat: () => void;
  onReopenChat: () => void;
  onAddMember?: () => void;
}

const getCloseButtonText = (type: ChatType, locale: string): string => {
  if (type === ChatType.EMERGENCY) {
    return locale === 'de' ? 'Notfallmeldung abschliessen' : 'Complete Emergency Alert';
  }
  return locale === 'de' ? 'Problem abschliessen' : 'Mark as Resolved';
};

const getReopenButtonText = (type: ChatType, locale: string): string => {
  if (type === ChatType.EMERGENCY) {
    return locale === 'de' ? 'Notfallmeldung wiederöffnen' : 'Reopen Emergency Alert';
  }
  return locale === 'de' ? 'Ticket wiederöffnen' : 'Reopen Ticket';
};

export const ChatManagementHeader: React.FC<ChatManagementHeaderProperties> = ({
  selectedChat,
  chatType,
  locale,
  onCloseChat,
  onReopenChat,
  onAddMember,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-(--theme-border-color) bg-(--theme-elevation-50) px-6 py-4">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold text-(--theme-elevation-900)">
          {selectedChat.name}
        </h2>
        {selectedChat.description != undefined && (
          <div className="mt-0.5 truncate text-sm text-(--theme-elevation-500)">
            {selectedChat.description}
          </div>
        )}
      </div>
      <div className="ml-4 flex shrink-0 gap-2">
        {selectedChat.status === ChatStatus.OPEN && onAddMember && (
          <button
            onClick={onAddMember}
            className="cursor-pointer rounded border border-(--theme-border-color) bg-(--theme-elevation-100) px-4 py-2 text-sm font-medium text-(--theme-elevation-800) shadow-sm transition-colors hover:bg-(--theme-elevation-200)"
          >
            {locale === 'de' ? 'Mitglied hinzufügen' : 'Add Member'}
          </button>
        )}
        {selectedChat.status === ChatStatus.OPEN ? (
          <button
            onClick={onCloseChat}
            className="cursor-pointer rounded border border-(--theme-error-500) bg-(--theme-error-500) px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-(--theme-error-600)"
          >
            {getCloseButtonText(chatType, locale)}
          </button>
        ) : (
          <button
            onClick={onReopenChat}
            className="cursor-pointer rounded border border-(--theme-success-500) bg-transparent px-4 py-2 text-sm font-medium text-[var(--theme-success-500)] shadow-sm transition-colors hover:bg-[var(--theme-success-500)] hover:text-white"
          >
            {getReopenButtonText(chatType, locale)}
          </button>
        )}
      </div>
    </div>
  );
};
