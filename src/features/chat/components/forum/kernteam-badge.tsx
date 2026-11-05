import { forumText } from '@/features/chat/components/forum/forum-texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/** Marks what the topic's Kernteam wrote, a post or a comment, so its word stands out. */
export const KernteamBadge: React.FC<{ locale: Locale; className?: string }> = ({
  locale,
  className,
}) => (
  <span
    className={cn(
      'bg-conveniat-green shrink-0 rounded-[5px] px-1.5 py-px text-[11px] font-bold text-white',
      className,
    )}
  >
    {forumText.kernteam[locale]}
  </span>
);
