'use client';

import { forumText } from '@/features/chat/components/forum/forum-texts';
import type { ForumOpenFlags } from '@/lib/forum-shared';
import { forumFlagReasonLabel } from '@/lib/forum-shared';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Flag } from 'lucide-react';
import type React from 'react';
import { useId, useState } from 'react';

/**
 * The open flags of a message, read defensively: a persisted cache lacks them, and one from a
 * newer build may carry a reason this one does not know.
 */
export const openFlagsOf = (flags: unknown): ForumOpenFlags | undefined => {
  if (typeof flags !== 'object' || flags === null) return undefined;
  const { count, reasons } = flags as Partial<ForumOpenFlags>;
  if (typeof count !== 'number' || count === 0 || !Array.isArray(reasons)) return undefined;
  return { count, reasons };
};

const reasonLabel = (reason: string, locale: Locale): string => {
  const labels: Partial<Record<string, StaticTranslationString>> = forumFlagReasonLabel;
  return (labels[reason] ?? forumFlagReasonLabel.OTHER)[locale];
};

/**
 * What the moderators decide on: a red chip with the most common reason and how many flagged,
 * and on request every flag with what its sender wrote.
 */
export const ForumFlagReasons: React.FC<{ flags: ForumOpenFlags; locale: Locale }> = ({
  flags,
  locale,
}) => {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const top = flags.reasons[0]?.reason ?? 'OTHER';
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="border-danger-line bg-danger-soft text-danger-text inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-semibold">
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        {forumText.flaggedChip[locale]
          .replace('{reason}', reasonLabel(top, locale))
          .replace('{n}', String(flags.count))}
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((previous) => !previous)}
        className="focus-visible:focus-surface min-h-11 cursor-pointer rounded-lg text-[13px] font-semibold text-green-800 underline underline-offset-4"
      >
        {open ? forumText.hideFlagReasons[locale] : forumText.showFlagReasons[locale]}
      </button>
      {open && (
        <ul id={listId} className="flex flex-col gap-1 text-[13px] text-green-800">
          {flags.reasons.map((flag, index) => (
            <li key={index}>
              {reasonLabel(flag.reason, locale)}
              {flag.note !== null && flag.note !== '' && (
                <span className="text-green-900"> · «{flag.note}»</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
