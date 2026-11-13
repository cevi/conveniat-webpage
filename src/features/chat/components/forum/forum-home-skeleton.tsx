'use client';

import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';
import { useEffect, useState } from 'react';

/** pulses, unless the system asks for less motion */
const pulse = 'bg-quiet animate-pulse motion-reduce:animate-none';

/** A wait shorter than this shows nothing: a skeleton that flashes reads as broken. */
const SKELETON_DELAY_MS = 300;

/**
 * Whether the forum has been waiting long enough to show its skeleton. Most opens answer from
 * the persisted cache well within the delay, and then never show one.
 */
export const useSkeletonDelayPassed = (): boolean => {
  const [passed, setPassed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPassed(true), SKELETON_DELAY_MS);
    return (): void => clearTimeout(timer);
  }, []);
  return passed;
};

/**
 * The forum's start page while its topics load, in the shape of the loaded page: the search,
 * the section label, the topics as rows of an icon tile and two lines in one card, and where
 * "Neuer Beitrag" floats. Every size is the loaded one, so the content takes the skeleton's
 * place without anything moving; only a person in no topic gets the empty state instead.
 */
export const ForumHomeSkeleton: React.FC = () => (
  <div aria-hidden="true">
    <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pt-3">
      <div className={cn(pulse, 'h-11 w-full rounded-xl')} />
      <section className="flex flex-col gap-2">
        <div className="flex h-4 items-center">
          <div className={cn(pulse, 'h-3 w-16 rounded')} />
        </div>
        <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
          {['w-40', 'w-32', 'w-36', 'w-28'].map((width) => (
            <li key={width} className="flex h-[62px] items-center gap-3 px-3">
              <div className={cn(pulse, 'h-[38px] w-[38px] shrink-0 rounded-[10px]')} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className={cn(pulse, 'h-3.5 rounded', width)} />
                <div className={cn(pulse, 'h-3 w-48 max-w-full rounded')} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
    <div
      className={cn(
        pulse,
        'fixed right-4 bottom-[calc(var(--app-tab-bar-height)+16px)] z-30 h-12 w-[172px] rounded-2xl',
      )}
    />
  </div>
);
