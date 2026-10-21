'use client';

import type { ChatListFilter } from '@/features/chat/utils/chat-list-filter';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

const labels: Record<ChatListFilter, StaticTranslationString> = {
  all: { de: 'Alle', en: 'All', fr: 'Tous' },
  unread: { de: 'Ungelesen', en: 'Unread', fr: 'Non lus' },
  groups: { de: 'Gruppen', en: 'Groups', fr: 'Groupes' },
};

const groupLabel: StaticTranslationString = {
  de: 'Chats filtern',
  en: 'Filter chats',
  fr: 'Filtrer les chats',
};

/**
 * The pills over the chat list: "Alle", "Ungelesen" with how many chats have news, and
 * "Gruppen". The chosen one is filled brand green; each pill sits in a 44px tap area.
 */
export const ChatFilterChips: React.FC<{
  value: ChatListFilter;
  onChange: (filter: ChatListFilter) => void;
  unreadChats: number;
  locale: Locale;
}> = ({ value, onChange, unreadChats, locale }) => (
  <div role="group" aria-label={groupLabel[locale]} className="-my-1.5 flex gap-2">
    {(['all', 'unread', 'groups'] as const).map((filter) => {
      const isChosen = value === filter;
      return (
        <button
          key={filter}
          type="button"
          aria-pressed={isChosen}
          onClick={() => onChange(filter)}
          className="group flex h-11 cursor-pointer items-center focus-visible:outline-none"
        >
          <span
            className={cn(
              'group-focus-visible:focus-ring flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold',
              isChosen
                ? 'bg-conveniat-green border-transparent text-white'
                : 'border-rail bg-white text-green-900',
            )}
          >
            {labels[filter][locale]}
            {filter === 'unread' && unreadChats > 0 && (
              <span
                className={cn(
                  'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums',
                  isChosen ? 'text-conveniat-green bg-white' : 'bg-chip text-green-900',
                )}
              >
                {unreadChats}
              </span>
            )}
          </span>
        </button>
      );
    })}
  </div>
);
