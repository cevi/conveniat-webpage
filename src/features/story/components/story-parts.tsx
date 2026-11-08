'use client';

import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { storyTexts } from '@/features/story/story-texts';
import type { StoryAccess, StoryFigureSummary } from '@/features/story/types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Lock, LogIn } from 'lucide-react';
import { signIn } from 'next-auth/react';
import type React from 'react';

const initialsOf = (name: string): string => {
  const initials = name
    .split(/\s+/)
    .filter((word) => /^\p{Lu}/u.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
  return initials === '' ? (name[0] ?? '?') : initials;
};

/**
 * A figure's picture, or its initials on soft brand green while it has none. The picture is a
 * file only Leitende may fetch, which the image optimiser cannot, so it is a plain `img`.
 */
export const FigurePortrait: React.FC<{
  figure: Pick<StoryFigureSummary, 'name' | 'photoUrl'>;
  className?: string;
  /** a square card image instead of a round avatar */
  square?: boolean;
}> = ({ figure, className, square = false }) => {
  const shape = square ? 'rounded-none' : 'rounded-full';
  if (figure.photoUrl !== undefined && figure.photoUrl !== '') {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- private to Leitende, see above
      <img
        src={figure.photoUrl}
        alt=""
        loading="lazy"
        className={cn('shrink-0 object-cover', shape, className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-tint text-conveniat-green font-heading flex shrink-0 items-center justify-center font-extrabold',
        shape,
        className,
      )}
    >
      {initialsOf(figure.name)}
    </span>
  );
};

/** A story text: a blank line starts a new paragraph. */
export const StoryParagraphs: React.FC<{ text: string; className?: string }> = ({
  text,
  className,
}) => (
  <div className={cn('space-y-3 text-[15px] leading-normal text-green-900', className)}>
    {text
      .trim()
      .split(/\n\s*\n/)
      .filter((paragraph) => paragraph.trim() !== '')
      .map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph.trim()}
        </p>
      ))}
  </div>
);

/** The small outlined "Neu" pill next to something that appeared within the last day. */
export const NewPill: React.FC<{ locale: Locale }> = ({ locale }) => (
  <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-green-300 px-2 text-[11px] font-bold text-green-700">
    {storyTexts.isNew[locale]}
  </span>
);

/** What a guest and a participant who does not lead see instead of the story. */
export const StoryAccessGate: React.FC<{ access: StoryAccess; locale: Locale }> = ({
  access,
  locale,
}) => {
  if (access === 'signedOut') {
    return (
      <EmptyState
        icon={LogIn}
        title={storyTexts.signInTitle[locale]}
        description={storyTexts.leadersOnlyText[locale]}
        action={
          <Button
            variant="primary"
            size="touch"
            onClick={() => void signIn('cevi-db', { callbackUrl: globalThis.location.href })}
          >
            <LogIn aria-hidden />
            {storyTexts.signIn[locale]}
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={Lock}
      title={storyTexts.leadersOnly[locale]}
      description={storyTexts.leadersOnlyText[locale]}
    />
  );
};
