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

/**
 * Two initials for a name: the first letters of the first and the last word, e.g. "Anna Muster"
 * gives "AM". The Ceviname after "v/o" is left out, so "Anna Muster v/o Fuchs" is still "AM". A
 * single word gives its first two letters, "Fuchs" gives "FU".
 */
export const initialsOf = (name: string): string => {
  const realName = name.replace(/(?:^|\s+)v\/o\s.*$/i, '').trim();
  const source = realName === '' ? name.replace(/^\s*v\/o\s+/i, '') : realName;
  const words = source.trim().split(/\s+/).filter(Boolean);
  const first = [...(words[0] ?? '')];
  if (first.length === 0) return '?';
  if (words.length === 1) return first.slice(0, 2).join('').toUpperCase();
  const last = [...(words.at(-1) ?? '')];
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
};

/** A stable colour per person, so they keep theirs across chats, lists and sessions. */
export const avatarColorOf = (seed: string): string => {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 1_000_003;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? 'bg-slate-600';
};

/**
 * A person's avatar: their initials on a colour of their own. The size and the text size come
 * from `className`, e.g. `h-10 w-10 text-sm`.
 */
export const PersonAvatar: React.FC<{
  /** the person's id; decides the colour */
  seed: string;
  name: string;
  className?: string;
}> = ({ seed, name, className }) => (
  <div
    aria-hidden="true"
    className={cn(
      'font-heading flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none',
      avatarColorOf(seed),
      className,
    )}
  >
    {initialsOf(name)}
  </div>
);
