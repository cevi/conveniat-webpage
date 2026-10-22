'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ArchiveChatConfirmDialog } from '@/features/chat/components/archive-chat-confirm-dialog';
import { LeaveChatDialog } from '@/features/chat/components/chat-details-view/leave-chat';
import { ChatAvatar } from '@/features/chat/components/chat-overview-view/chat-preview';
import { SheetActionRow } from '@/features/chat/components/ui/sheet-action-row';
import { ChatIdProvider } from '@/features/chat/context/chat-id-context';
import { useArchiveChatMutation } from '@/features/chat/hooks/use-archive-chat-mutation';
import type { ChatListActions } from '@/features/chat/hooks/use-chat-list-actions';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { canDeleteChat } from '@/features/chat/utils/can-delete-chat';
import { ChatType } from '@/lib/prisma/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import {
  Bell,
  BellOff,
  Info,
  LogOut,
  MessageSquareDot,
  MessageSquareText,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const text = {
  pin: { de: 'Oben anheften', en: 'Pin to top', fr: 'Épingler en haut' },
  unpin: { de: 'Lösen', en: 'Unpin', fr: 'Désépingler' },
  mute: { de: 'Stummschalten', en: 'Mute', fr: 'Mettre en sourdine' },
  unmute: { de: 'Stummschaltung aufheben', en: 'Unmute', fr: 'Réactiver les notifications' },
  markUnread: { de: 'Als ungelesen markieren', en: 'Mark as unread', fr: 'Marquer comme non lu' },
  markRead: { de: 'Als gelesen markieren', en: 'Mark as read', fr: 'Marquer comme lu' },
  groupInfo: { de: 'Gruppen-Infos', en: 'Group info', fr: 'Infos du groupe' },
  chatInfo: { de: 'Chat-Infos', en: 'Chat info', fr: 'Infos du chat' },
  leave: { de: 'Gruppe verlassen', en: 'Leave group', fr: 'Quitter le groupe' },
  delete: { de: 'Chat löschen', en: 'Delete chat', fr: 'Supprimer le chat' },
  muted: { de: 'stummgeschaltet', en: 'muted', fr: 'en sourdine' },
  pinned: { de: 'angeheftet', en: 'pinned', fr: 'épinglé' },
} satisfies Record<string, StaticTranslationString>;

const typeText: Record<ChatType, StaticTranslationString> = {
  [ChatType.ONE_TO_ONE]: { de: 'Privater Chat', en: 'Private chat', fr: 'Chat privé' },
  [ChatType.GROUP]: { de: 'Gruppe', en: 'Group', fr: 'Groupe' },
  [ChatType.COURSE_GROUP]: { de: 'Gruppe', en: 'Group', fr: 'Groupe' },
  [ChatType.ANNOUNCEMENT]: { de: 'Ankündigungen', en: 'Announcements', fr: 'Annonces' },
  [ChatType.SUPPORT_GROUP]: { de: 'Support', en: 'Support', fr: 'Support' },
  [ChatType.EMERGENCY]: { de: 'Notfall', en: 'Emergency', fr: 'Urgence' },
};

/**
 * What a long press on a chat of the list offers: pin, mute, mark (un)read, its details, and
 * leaving or deleting it with the same question the details ask. Leaving and deleting are red,
 * as every destructive action is.
 */
export const ChatActionsSheet: React.FC<{
  chat: ChatWithMessagePreview | undefined;
  onClose: () => void;
  actions: ChatListActions;
  locale: Locale;
}> = ({ chat, onClose, actions, locale }) => {
  const [confirm, setConfirm] = useState<{
    kind: 'leave' | 'delete';
    chat: ChatWithMessagePreview;
  }>();
  const archiveMutation = useArchiveChatMutation();

  const act = (action: () => void): void => {
    action();
    onClose();
  };

  let sheet: React.ReactNode;
  if (chat !== undefined) {
    const isGroup = chat.chatType === ChatType.GROUP || chat.chatType === ChatType.COURSE_GROUP;
    const isMuted = chat.isMuted === true;
    const isPinnedByMe = chat.isPinnedByMe === true;
    const isUnread = chat.unreadCount > 0 || chat.isMarkedUnread === true;
    // mirrors `leaveChat`: only a group chat that is not archived can be left
    const canLeave = chat.chatType === ChatType.GROUP && chat.isArchived !== true;
    const canDelete = !canLeave && canDeleteChat(chat);
    const description = [
      typeText[chat.chatType][locale],
      ...(isMuted ? [text.muted[locale]] : []),
      ...(chat.isPinned === true ? [text.pinned[locale]] : []),
    ].join(' · ');

    sheet = (
      <BottomSheet
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title={chat.name}
        description={description}
        leading={<ChatAvatar chat={chat} />}
        showClose={false}
      >
        <ul className="border-line -mx-5 border-t px-2 pt-2">
          {/* a pin set for everyone from the CMS is not the user's to take away */}
          {chat.isPinnedForEveryone !== true && (
            <SheetActionRow
              icon={isPinnedByMe ? PinOff : Pin}
              label={isPinnedByMe ? text.unpin[locale] : text.pin[locale]}
              onClick={() => act(() => actions.pin(chat, !isPinnedByMe))}
            />
          )}
          {/* an emergency chat has to reach people */}
          {chat.chatType !== ChatType.EMERGENCY && (
            <SheetActionRow
              icon={isMuted ? Bell : BellOff}
              label={isMuted ? text.unmute[locale] : text.mute[locale]}
              onClick={() => act(() => actions.mute(chat, !isMuted))}
            />
          )}
          <SheetActionRow
            icon={isUnread ? MessageSquareText : MessageSquareDot}
            label={isUnread ? text.markRead[locale] : text.markUnread[locale]}
            onClick={() => act(() => actions.markUnread(chat, !isUnread))}
          />
          <SheetActionRow
            icon={Info}
            label={isGroup ? text.groupInfo[locale] : text.chatInfo[locale]}
            href={`/app/chat/${chat.id}/details`}
            onClick={onClose}
          />
        </ul>
        {(canLeave || canDelete) && (
          <ul className="border-line -mx-5 mt-2 border-t px-2 pt-2">
            <SheetActionRow
              icon={canLeave ? LogOut : Trash2}
              label={canLeave ? text.leave[locale] : text.delete[locale]}
              destructive
              onClick={() => {
                setConfirm({ kind: canLeave ? 'leave' : 'delete', chat });
                onClose();
              }}
            />
          </ul>
        )}
      </BottomSheet>
    );
  }

  return (
    <>
      {sheet}
      {confirm?.kind === 'leave' && (
        <ChatIdProvider chatId={confirm.chat.id}>
          <LeaveChatDialog
            open
            onOpenChange={(open) => {
              if (!open) setConfirm(undefined);
            }}
          />
        </ChatIdProvider>
      )}
      {confirm?.kind === 'delete' && (
        <ArchiveChatConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirm(undefined);
          }}
          onConfirm={() => {
            archiveMutation.mutate({ chatUuid: confirm.chat.id });
            setConfirm(undefined);
          }}
          isPending={archiveMutation.isPending}
          archivesForEveryone={confirm.chat.isArchived !== true}
        />
      )}
    </>
  );
};
