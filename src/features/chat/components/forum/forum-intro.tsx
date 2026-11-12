'use client';

import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import type { ForumIntroTexts } from '@/features/chat/api/forum/forum-intro';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import { contentIconOf } from '@/features/payload-cms/content-icons';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { MessageCircle } from 'lucide-react';
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
 * forum opens the first time, and again from "So funktioniert's".
 */
export const ForumIntro: React.FC<{
  intro: ForumIntroTexts;
  onContinue: () => void;
  locale: Locale;
}> = ({ intro, onContinue, locale }) => (
  <div className="bg-page min-h-dvh pb-10">
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-5">
      <IconTile icon={MessageCircle} size="lg" />
      <h1 className="font-heading text-heading text-[28px] leading-tight font-extrabold text-balance">
        {intro.title}
      </h1>
      {intro.text !== '' && (
        <p className="text-[15px] leading-normal text-green-700">{intro.text}</p>
      )}
      {intro.points.length > 0 && (
        <Card as="ul" divided>
          {intro.points.map((point, index) => (
            <li key={index} className={cn('flex items-start gap-3 px-4 py-3')}>
              <PointTile icon={point.icon} />
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-green-900">
                  {point.title}
                </span>
                {point.text !== '' && (
                  <span className="block text-[13px] leading-normal text-green-700">
                    {point.text}
                  </span>
                )}
              </span>
            </li>
          ))}
        </Card>
      )}
      <Button variant="primary" size="touch" className="w-full" onClick={onContinue}>
        {forumText.introContinue[locale]}
      </Button>
    </div>
  </div>
);
