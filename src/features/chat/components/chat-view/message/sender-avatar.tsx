import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

// only shades that exist in the project palette; a missing one renders no background at all
const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-teal-600',
  'bg-amber-600',
  'bg-conveniat-green',
  'bg-slate-600',
];

/** Up to two initials: first and last word of the name. */
const initialsOf = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '?';
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
};

/** Stable colour per sender, so a person keeps theirs across chats and sessions. */
const colorOf = (senderId: string): string => {
  let hash = 0;
  for (const char of senderId) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 1_000_003;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? 'bg-slate-600';
};

/**
 * Initials avatar next to the last bubble of a sender block in a group chat. Other bubbles
 * of the block pass `hidden` and keep the space, so the block stays aligned.
 */
export const SenderAvatar: React.FC<{
  senderId: string;
  name: string;
  hidden?: boolean;
}> = ({ senderId, name, hidden = false }) => (
  <div
    aria-hidden="true"
    className={cn(
      'font-body mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white select-none',
      hidden ? 'invisible' : colorOf(senderId),
    )}
  >
    {hidden ? '' : initialsOf(name)}
  </div>
);
