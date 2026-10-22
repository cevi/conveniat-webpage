import type { ChatMessage, ThreadSummary } from '@/features/chat/api/types';
import { campClockOf } from '@/utils/camp-clock';

/** As many people as `findThreadSummaries` names. */
const SHOWN_REPLIERS = 3;

/**
 * The summary of a thread after a reply arrived over the realtime stream: the reply is the
 * latest, its sender moves to the front of the people shown. How many people replied in all
 * is only counted up when the summary showed everyone before; otherwise the next read fixes it.
 *
 * @param summary - the cached summary, missing on a message without replies and in old caches
 * @param previousReplyCount - the replies before this one; a summary is only started from none
 * @param reply - the reply from the realtime event, its dates possibly still strings
 */
export const addReplyToThreadSummary = (
  summary: ThreadSummary | undefined,
  previousReplyCount: number,
  reply: Pick<ChatMessage, 'senderId' | 'senderName' | 'createdAt'>,
): ThreadSummary | undefined => {
  const lastReplyAt = new Date(reply.createdAt);
  if (Number.isNaN(lastReplyAt.getTime())) return summary;
  if (summary === undefined && previousReplyCount > 0) return undefined;

  const repliers = summary?.repliers ?? [];
  const replierCount = summary?.replierCount ?? 0;
  const senderId = reply.senderId;
  if (typeof senderId !== 'string' || senderId === '') {
    return { lastReplyAt, repliers, replierCount };
  }

  const known = repliers.find((replier) => replier.id === senderId);
  const everyoneShown = repliers.length >= replierCount;
  return {
    lastReplyAt,
    repliers: [
      {
        id: senderId,
        name: reply.senderName ?? known?.name ?? '',
        ...(known?.pictureUrl === undefined ? {} : { pictureUrl: known.pictureUrl }),
      },
      ...repliers.filter((replier) => replier.id !== senderId),
    ].slice(0, SHOWN_REPLIERS),
    replierCount: known === undefined && everyoneShown ? replierCount + 1 : replierCount,
  };
};

const timeFormats = {
  de: new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }),
  fr: new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'Europe/Zurich',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }),
  en: new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zurich',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }),
} as const;

const dayFormats = {
  de: new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    day: 'numeric',
    month: 'short',
  }),
  fr: new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'Europe/Zurich',
    day: 'numeric',
    month: 'short',
  }),
  en: new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Zurich',
    day: 'numeric',
    month: 'short',
  }),
} as const;

/**
 * When the last reply of a thread came, on the camp's clock: "14:05" on the same camp day as
 * `now`, otherwise the day, "21. Okt.". Empty for a date it cannot read.
 *
 * @param timestamp - the time of the last reply, a string when it came over the stream
 * @param locale - the language of the month name
 * @param now - the present, from the caller so the function stays pure
 */
export const formatLastReplyTime = (
  timestamp: Date | string,
  locale: string,
  now: Date,
): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const key = locale === 'de' || locale === 'fr' ? locale : 'en';
  if (campClockOf(date).dayKey === campClockOf(now).dayKey) return timeFormats[key].format(date);
  return dayFormats[key].format(date);
};
