import { forumStatusLabel, type ForumPostStatusValue } from '@/lib/forum-shared';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle2 } from 'lucide-react';
import type React from 'react';

/**
 * Where a post stands, as a round outlined pill. Done is the one filled in brand green: it is
 * the state the post is meant to reach. Orange stays "now" only, so in progress is a soft tint.
 */
export const ForumStatusPill: React.FC<{ status: ForumPostStatusValue; locale: Locale }> = ({
  status,
  locale,
}) => (
  <span
    className={cn(
      'inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full border px-2 text-[12px] font-semibold',
      status === 'OPEN' && 'border-line bg-white text-green-700',
      status === 'IN_PROGRESS' && 'bg-tint border-tint-line text-green-800',
      status === 'DONE' && 'bg-conveniat-green border-conveniat-green text-white',
    )}
  >
    {status === 'DONE' && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
    {forumStatusLabel[status][locale]}
  </span>
);
