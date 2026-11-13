import type { ChatMessage } from '@/features/chat/api/types';
import { bubbleCornerClassName } from '@/features/chat/components/chat-view/message/message-bubble';
import { formatMessageTimeOnlyRaw } from '@/features/chat/hooks/use-format-date';
import type { ForumRemovalInfo } from '@/lib/forum-shared';
import { forumFlagReasonLabel } from '@/lib/forum-shared';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Ban, EyeOff } from 'lucide-react';
import type React from 'react';

const deletedMessageText: StaticTranslationString = {
  de: 'Diese Nachricht wurde gelöscht',
  en: 'This message was deleted',
  fr: 'Ce message a été supprimé',
};

const removedByModeratorsText: StaticTranslationString = {
  de: 'Von der Moderation entfernt',
  en: 'Removed by the moderators',
  fr: 'Retiré par la modération',
};

const hiddenByModeratorsText: StaticTranslationString = {
  de: 'Von der Moderation ausgeblendet',
  en: 'Hidden by the moderators',
  fr: 'Masqué par la modération',
};

const reasonText: StaticTranslationString = {
  de: 'Grund: {reason}',
  en: 'Reason: {reason}',
  fr: 'Motif : {reason}',
};

const hiddenNoticeText: StaticTranslationString = {
  de: 'Ausgeblendet: {reason}. Andere sehen nur einen Hinweis.',
  en: 'Hidden: {reason}. Others only see a notice.',
  fr: 'Masqué : {reason}. Les autres ne voient qu’une mention.',
};

/**
 * The removal of a message, read defensively: a persisted cache lacks it, and one from a newer
 * build may carry a kind this one does not know.
 */
export const forumRemovalOf = (message: ChatMessage): ForumRemovalInfo | undefined => {
  const removal: unknown = message.forumRemoval;
  if (typeof removal !== 'object' || removal === null) return undefined;
  const kind = (removal as { kind?: unknown }).kind;
  return kind === 'HIDDEN' || kind === 'DELETED' ? (removal as ForumRemovalInfo) : undefined;
};

/** The label of a removal's reason, or undefined for one this build does not know. */
const reasonLabelOf = (removal: ForumRemovalInfo, locale: Locale): string | undefined => {
  const labels: Partial<Record<string, StaticTranslationString>> = forumFlagReasonLabel;
  return labels[removal.reason]?.[locale];
};

const noteOf = (removal: ForumRemovalInfo): string | undefined =>
  typeof removal.note === 'string' && removal.note.trim() !== '' ? removal.note : undefined;

interface RemovedMessageBubbleProperties {
  message: ChatMessage;
  isCurrentUser: boolean;
  locale: Locale;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showMeta: boolean;
}

/**
 * Where a message without content stands: deleted by its sender, or removed or hidden by the
 * forum's moderators. Its author and the moderators also read why a moderator removed it.
 */
export const RemovedMessageBubble: React.FC<RemovedMessageBubbleProperties> = ({
  message,
  isCurrentUser,
  locale,
  isFirstInGroup = true,
  isLastInGroup = true,
  showMeta,
}) => {
  const removal = forumRemovalOf(message);
  let label = deletedMessageText[locale];
  if (removal?.kind === 'DELETED') label = removedByModeratorsText[locale];
  if (removal?.kind === 'HIDDEN') label = hiddenByModeratorsText[locale];
  const reasonLabel = removal?.kind === 'DELETED' ? reasonLabelOf(removal, locale) : undefined;
  const note = removal?.kind === 'DELETED' ? noteOf(removal) : undefined;
  const Icon = removal?.kind === 'HIDDEN' ? EyeOff : Ban;

  return (
    <div
      className={cn(
        'border-line flex flex-col rounded-[16px] border bg-white px-3.5 py-2 text-[15px] leading-[21px] text-green-700',
        bubbleCornerClassName(isCurrentUser, isFirstInGroup, isLastInGroup),
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="italic">{label}</span>
        {showMeta && (
          <span className="ml-2 self-end text-[11px] leading-[19px] tabular-nums">
            {formatMessageTimeOnlyRaw(message.createdAt, locale)}
          </span>
        )}
      </div>
      {reasonLabel !== undefined && (
        <span className="mt-1 text-[13px] text-green-700">
          {reasonText[locale].replace('{reason}', reasonLabel)}
        </span>
      )}
      {note !== undefined && (
        <span className="text-[13px] whitespace-pre-line text-green-700">{note}</span>
      )}
    </div>
  );
};

/**
 * Under a message the moderators hid, for those who still see it, its author and the
 * moderators: why, and that everyone else reads only a notice. Neutral, it is no error.
 */
export const ForumHiddenNotice: React.FC<{ message: ChatMessage; locale: Locale }> = ({
  message,
  locale,
}) => {
  const removal = forumRemovalOf(message);
  if (removal?.kind !== 'HIDDEN') return <></>;
  const reasonLabel = reasonLabelOf(removal, locale) ?? forumFlagReasonLabel.OTHER[locale];
  const note = noteOf(removal);
  return (
    <div className="bg-quiet mt-1 flex max-w-full items-start gap-2 rounded-[12px] px-3 py-2 text-[13px] text-green-700">
      <EyeOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex min-w-0 flex-col">
        <span>{hiddenNoticeText[locale].replace('{reason}', reasonLabel)}</span>
        {note !== undefined && <span className="whitespace-pre-line text-green-900">{note}</span>}
      </span>
    </div>
  );
};
