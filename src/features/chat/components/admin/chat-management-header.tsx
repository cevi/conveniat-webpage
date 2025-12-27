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
}) => {
  return (
    <div className="flex items-center justify-between border-b border-[var(--theme-elevation-150)] bg-[var(--theme-elevation-50)] p-4">
      <div>
        <h2 className="text-lg font-bold">{selectedChat.name}</h2>
        <div className="text-sm italic opacity-70">{selectedChat.description}</div>
      </div>
      <div className="flex gap-2">
        {selectedChat.status === ChatStatus.OPEN ? (
          <button
            onClick={onCloseChat}
            className="rounded bg-[var(--theme-error-600)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--theme-error-700)]"
          >
            {getCloseButtonText(chatType, locale)}
          </button>
        ) : (
          <button
            onClick={onReopenChat}
            className="rounded bg-[var(--theme-success-600)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--theme-success-700)]"
          >
            {getReopenButtonText(chatType, locale)}
          </button>
        )}
      </div>
    </div>
  );
};
