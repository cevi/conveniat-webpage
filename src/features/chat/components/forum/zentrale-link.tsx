import { forumText } from '@/features/chat/components/forum/forum-texts';
import type { Locale } from '@/types/types';
import { ListTodo } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

/**
 * The way into "Zu tun", for whoever handles posts or has one forwarded to them, with how many
 * things wait for them. Nobody else sees it.
 */
export const ZentraleLink: React.FC<{
  counts: { waiting: number; mine: number } | null;
  locale: Locale;
}> = ({ counts, locale }) => {
  if (counts === null) return <></>;
  const count = counts.waiting + counts.mine;
  return (
    <Link
      href="/app/forum/zentrale"
      aria-label={count > 0 ? `${forumText.todo[locale]} (${count})` : forumText.todo[locale]}
      className="focus-visible:focus-surface hover:bg-quiet relative flex h-11 w-11 items-center justify-center rounded-full text-green-700"
    >
      <ListTodo className="h-5 w-5" aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="bg-conveniat-green absolute top-1 right-0.5 min-w-[18px] rounded-full px-1 text-center text-[10px] leading-[18px] font-bold text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
};
