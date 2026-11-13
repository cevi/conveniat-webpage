'use client';

import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import type { ForumIntroTexts } from '@/features/chat/api/forum/forum-intro';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import { contentIconOf } from '@/features/payload-cms/content-icons';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronRight, MessageCircle, X } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

/** The storage key that remembers on this device that the forum's intro was seen. */
export const FORUM_INTRO_STORAGE_KEY = 'forum-intro-seen';

/** Whether editors wrote an intro; without a title there is none to show. */
export const hasForumIntro = (intro: ForumIntroTexts | undefined): intro is ForumIntroTexts =>
  intro !== undefined && intro.title !== '';

/** A point's tile: the emergency one in red, as the Notfall tab is, every other one green. */
const PointTile: React.FC<{ icon: string }> = ({ icon }) => (
  <IconTile
    icon={contentIconOf(icon) ?? MessageCircle}
    className={cn(icon === 'siren' && 'bg-danger-soft text-danger')}
  />
);

/**
 * What the forum is and how it works, in its editors' words: once on each device before the
 * forum opens the first time, and again from "So funktioniert's". A full-screen layer over the
 * app's header and tab bar, like the "Neu in …" screens of iOS: a small title, short rows, and
 * the button fixed at the bottom, so all of it fits one screen and nothing hides under the tab
 * bar. ✕ skips it the same way the button does.
 */
export const ForumIntro: React.FC<{
  intro: ForumIntroTexts;
  onContinue: () => void;
  locale: Locale;
}> = ({ intro, onContinue, locale }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="forum-intro-title"
    className="fixed inset-0 z-[200] flex flex-col bg-white pt-[env(safe-area-inset-top)]"
  >
    <div className="mx-auto flex w-full max-w-lg justify-end px-3 pt-3">
      <button
        type="button"
        onClick={onContinue}
        aria-label={forumText.close[locale]}
        className="bg-quiet hover:bg-chip focus-visible:focus-surface flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-green-900"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-5 pb-4">
      <h1
        id="forum-intro-title"
        className="font-heading text-heading text-[26px] leading-tight font-extrabold text-balance"
      >
        {intro.title}
      </h1>
      {intro.text !== '' && (
        <p className="mt-1.5 text-[15px] leading-normal text-green-700">{intro.text}</p>
      )}
      {intro.points.length > 0 && (
        <ul className="-mx-3 mt-4 flex flex-col">
          {intro.points.map((point, index) => {
            const content = (
              <>
                <PointTile icon={point.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-green-900">
                    {point.title}
                  </span>
                  {point.text !== '' && (
                    <span className="block text-[13px] leading-snug text-green-700">
                      {point.text}
                    </span>
                  )}
                </span>
              </>
            );
            // the emergency point leads straight to the Notfall tab, the one place for it
            return point.icon === 'siren' ? (
              <li key={index}>
                <Link
                  href="/app/emergency"
                  className="hover:bg-danger-soft focus-visible:focus-row-danger flex items-center gap-3 rounded-xl px-3 py-2.5"
                >
                  {content}
                  <ChevronRight className="text-danger h-5 w-5 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ) : (
              <li key={index} className="flex items-center gap-3 px-3 py-2.5">
                {content}
              </li>
            );
          })}
        </ul>
      )}
    </div>
    <div className="border-line border-t px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)]">
      <div className="mx-auto max-w-lg">
        <Button variant="primary" size="touch" className="w-full" onClick={onContinue}>
          {forumText.introContinue[locale]}
        </Button>
      </div>
    </div>
  </div>
);
