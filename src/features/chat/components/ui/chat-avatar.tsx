'use client';
import { PersonAvatar } from '@/components/ui/person-avatar';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { ChatType } from '@/lib/prisma/client';
import { cn } from '@/utils/tailwindcss-override';
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, LifeBuoy, Megaphone, Siren, Users } from 'lucide-react';
import type React from 'react';

/** What the avatar needs of a chat: the chat list has it, so a chat's header shows it at once. */
export type ChatAvatarChat = Pick<ChatWithMessagePreview, 'id' | 'name' | 'chatType' | 'partner'>;

/**
 * The round picture of a chat, the same in its row and, smaller beside its name, in its header:
 * the partner, or what kind of chat it is.
 */
export const ChatAvatar: React.FC<{ chat: ChatAvatarChat; size?: 'row' | 'header' }> = ({
  chat,
  size = 'row',
}) => {
  const sizeClassName = size === 'row' ? 'h-11 w-11' : 'h-9 w-9';
  if (chat.chatType === ChatType.ONE_TO_ONE) {
    return (
      <PersonAvatar
        seed={chat.partner?.userId ?? chat.id}
        name={chat.name}
        pictureUrl={chat.partner?.pictureUrl}
        className={cn(sizeClassName, 'text-sm')}
      />
    );
  }
  if (chat.chatType === ChatType.GROUP) {
    // a group gets its initials like a person, marked as a group by a small badge
    return (
      <span className="relative shrink-0">
        <PersonAvatar seed={chat.id} name={chat.name} className={cn(sizeClassName, 'text-sm')} />
        <span className="ring-line absolute -right-0.5 -bottom-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white ring-1">
          <Users className="h-3 w-3 text-green-700" aria-hidden="true" />
        </span>
      </span>
    );
  }
  if (chat.chatType === ChatType.EMERGENCY) {
    return (
      <span
        className={cn(
          sizeClassName,
          'flex shrink-0 items-center justify-center rounded-full bg-red-50 ring-2 ring-red-500',
        )}
      >
        <Siren className="h-5 w-5 text-red-600" aria-hidden="true" />
      </span>
    );
  }
  const icons: Partial<Record<ChatType, LucideIcon>> = {
    [ChatType.SUPPORT_GROUP]: LifeBuoy,
    [ChatType.ANNOUNCEMENT]: Megaphone,
    [ChatType.COURSE_GROUP]: CalendarDays,
  };
  const Icon = icons[chat.chatType] ?? Users;
  return (
    <span
      className={cn(
        sizeClassName,
        'text-conveniat-green bg-tint flex shrink-0 items-center justify-center rounded-full',
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
};
