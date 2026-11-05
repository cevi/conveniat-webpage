import { forumText } from '@/features/chat/components/forum/forum-texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * Marks what the topic's Kernteam wrote, a post or a comment, so its word stands out: with the
 * function that makes the author Kernteam, e.g. "Ressortleitung Infrastruktur", or with
 * "Kernteam" for one without, the topic's owner.
 */
export const KernteamBadge: React.FC<{
  locale: Locale;
  label?: string | undefined;
  className?: string;
}> = ({ locale, label, className }) => (
  <span
    className={cn(
      'bg-conveniat-green min-w-0 truncate rounded-[5px] px-1.5 py-px text-[11px] font-bold text-white',
      className,
    )}
  >
    {label ?? forumText.kernteam[locale]}
  </span>
);
