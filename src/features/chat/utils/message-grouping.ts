import type { ChatMessage } from '@/features/chat/api/types';
import { MessageType } from '@/lib/prisma/client';
import type { Locale, StaticTranslationString } from '@/types/types';

/** Consecutive messages from one sender closer together than this read as one block. */
export const MESSAGE_GROUP_WINDOW_MS = 2 * 60 * 1000;

const todayText: StaticTranslationString = {
  de: 'Heute',
  en: 'Today',
  fr: "Aujourd'hui",
};

const yesterdayText: StaticTranslationString = {
  de: 'Gestern',
  en: 'Yesterday',
  fr: 'Hier',
};

// system, location and alert messages render as their own cards, so they break a block
const GROUPABLE_TYPES = new Set<string>([MessageType.TEXT_MSG, MessageType.IMAGE_MSG]);

export interface GroupedMessage {
  message: ChatMessage;
  /** First bubble of a sender block: carries the sender name. */
  isFirstInGroup: boolean;
  /** Last bubble of a sender block: carries the bubble tail. */
  isLastInGroup: boolean;
}

export interface MessageDay {
  /** Local calendar day, `yyyy-mm-dd`. */
  dayKey: string;
  date: Date;
  messages: GroupedMessage[];
}

const toDayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const continuesGroup = (previous: ChatMessage | undefined, current: ChatMessage): boolean => {
  if (previous === undefined) return false;
  if (!GROUPABLE_TYPES.has(previous.type) || !GROUPABLE_TYPES.has(current.type)) return false;
  if (previous.senderId !== current.senderId) return false;
  const gap = new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime();
  return gap >= 0 && gap < MESSAGE_GROUP_WINDOW_MS;
};

/**
 * Splits a chronologically sorted message list into local calendar days and marks where each
 * sender block starts and ends, so the list can drop repeated names and tails inside a block.
 */
export const groupMessagesByDay = (messages: ChatMessage[]): MessageDay[] => {
  const days: MessageDay[] = [];

  for (const message of messages) {
    const date = new Date(message.createdAt);
    const dayKey = toDayKey(date);
    let day = days.at(-1);
    if (day?.dayKey !== dayKey) {
      day = { dayKey, date, messages: [] };
      days.push(day);
    }

    const previous = day.messages.at(-1);
    const isContinuation = continuesGroup(previous?.message, message);
    if (previous !== undefined && isContinuation) previous.isLastInGroup = false;
    day.messages.push({ message, isFirstInGroup: !isContinuation, isLastInGroup: true });
  }

  return days;
};

/**
 * Label for a day divider: "Today", "Yesterday", the weekday within the last week, and a full
 * date beyond that, with the year only when it is not the current one.
 */
export const formatDayLabel = (date: Date, locale: Locale, now: Date = new Date()): string => {
  const startOfDay = (value: Date): number =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000));

  if (daysAgo === 0) return todayText[locale];
  if (daysAgo === 1) return yesterdayText[locale];
  if (daysAgo > 1 && daysAgo < 7) {
    return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  }
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  }).format(date);
};
