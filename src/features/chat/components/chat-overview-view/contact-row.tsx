'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { PersonAvatar } from '@/components/ui/person-avatar';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { PersonName } from '@/features/chat/components/ui/person-name';
import { describeContact } from '@/features/chat/utils/contact-search';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getContactDisplayName, getContactShortName } from '@/utils/format-user-name';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

/** The name a contact is listed and sorted by: the Ceviname, or the real name without one. */
export const contactListName = (contact: Contact): string =>
  splitDisplayName(getContactDisplayName(contact)).primary;

/**
 * What a contact row shows: the avatar, the Ceviname in bold with the real name beside it,
 * and one line of functions, Höfe and description under it.
 */
export const ContactRowContent: React.FC<{ contact: Contact }> = ({ contact }) => {
  const description = describeContact(contact);
  return (
    <>
      <PersonAvatar
        seed={contact.userId}
        name={contact.name}
        pictureUrl={contact.pictureUrl}
        className="h-11 w-11 text-sm"
      />
      <span className="min-w-0 flex-1">
        <PersonName name={getContactDisplayName(contact)} className="text-[15px] leading-5" />
        {description !== '' && (
          <span className="mt-0.5 block truncate text-[13px] text-green-700">{description}</span>
        )}
      </span>
    </>
  );
};

/** The round mark at the end of a row one can pick: an empty ring, or brand green with a check. */
export const SelectionMark: React.FC<{ isSelected: boolean }> = ({ isSelected }) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
      isSelected ? 'bg-conveniat-green text-white' : 'border-rail-node border-2',
    )}
  >
    {isSelected && <Check className="h-4 w-4" strokeWidth={3} />}
  </span>
);

const removeText: StaticTranslationString = {
  de: '{name} entfernen',
  en: 'Remove {name}',
  fr: 'Retirer {name}',
};

const chosenPeopleText: StaticTranslationString = {
  de: 'Ausgewählte Personen',
  en: 'Selected people',
  fr: 'Personnes choisies',
};

/**
 * The people picked so far, one line at the foot of a picker, each removed by a tap, with a hint
 * on the same line. They sit down there, not above the list: a strip appearing over the list
 * would push every row down under the finger that is about to tap the next one, and sharing the
 * line with the hint keeps the footer at its height.
 */
export const ChosenPeople: React.FC<{
  people: Contact[];
  onRemove: (contact: Contact) => void;
  hint?: { id: string; text: string } | undefined;
  locale: Locale;
  /** pulls the strip out to the edges of what it sits in, `-mx-4 px-4` by default */
  className?: string;
}> = ({ people, onRemove, hint, locale, className }) => (
  <div
    className={cn(
      '-mx-4 flex h-11 [scrollbar-width:none] items-center gap-x-2 overflow-x-auto px-4',
      className,
    )}
  >
    {people.length > 0 && (
      <ul aria-label={chosenPeopleText[locale]} className="flex shrink-0 gap-x-2">
        {people.map((contact) => (
          <li key={contact.userId}>
            <button
              type="button"
              onClick={() => onRemove(contact)}
              aria-label={removeText[locale].replace('{name}', getContactDisplayName(contact))}
              className="group flex h-11 cursor-pointer items-center focus-visible:outline-none"
            >
              <span className="bg-quiet group-hover:bg-chip group-focus-visible:focus-ring flex h-9 items-center gap-2 rounded-full pr-3 pl-1">
                <PersonAvatar
                  seed={contact.userId}
                  name={contact.name}
                  pictureUrl={contact.pictureUrl}
                  className="h-7 w-7 text-[11px]"
                />
                <span className="text-sm font-semibold whitespace-nowrap text-green-900">
                  {getContactShortName(contact)}
                </span>
                <X className="h-4 w-4 text-green-700" aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
    {hint !== undefined && (
      <p
        id={hint.id}
        className={cn(
          'shrink-0 text-[13px] whitespace-nowrap text-green-700',
          people.length === 0 && 'mx-auto',
        )}
      >
        {hint.text}
      </p>
    )}
  </div>
);

/** The row of a contact list; the line between rows starts at the text, as on the chat list. */
export const contactRowItemClassName =
  'after:bg-line relative after:absolute after:right-0 after:bottom-0 after:left-[72px] after:h-px last:after:hidden';

const backButtonClassName =
  'hover:bg-quiet flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-green-900';

/**
 * The full-screen frame of starting a chat: a back arrow, the title with an optional line
 * under it, a fixed part under the header such as the search, the scrolling content and an
 * optional footer. The app's tab bar is hidden meanwhile.
 */
export const NewChatFrame: React.FC<{
  title: string;
  subtitle?: string | undefined;
  /** where the arrow leads, or what it does instead, e.g. a step back within the screen */
  backHref?: string;
  onBack?: () => void;
  backLabel: string;
  head?: React.ReactNode;
  footer?: React.ReactNode;
  /** the content sits on white instead of the grey page, e.g. a form with its grey search */
  onWhite?: boolean;
  children: React.ReactNode;
}> = ({
  title,
  subtitle,
  backHref,
  onBack,
  backLabel,
  head,
  footer,
  onWhite = false,
  children,
}) => (
  <div className="bg-page fixed top-(--preview-banner-height) z-[110] flex h-[calc(100dvh-var(--preview-banner-height))] w-screen flex-col overflow-y-hidden xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0 xl:h-[calc(100dvh-var(--app-content-top))] xl:w-[calc(100dvw-var(--app-content-left))]">
    <AppFooterController hideAppFooter />

    <div className="border-line shrink-0 border-b bg-white">
      <div className="flex h-[60px] items-center gap-1 pr-3 pl-1">
        {onBack === undefined ? (
          <Link
            href={backHref ?? '/app/chat'}
            aria-label={backLabel}
            className={backButtonClassName}
          >
            <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className={cn(backButtonClassName, 'cursor-pointer')}
          >
            <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-heading truncate text-[17px] leading-tight font-bold">
            {title}
          </h1>
          {subtitle !== undefined && (
            <p aria-live="polite" className="mt-0.5 truncate text-[13px] text-green-700">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {head !== undefined && <div className="mx-auto w-full max-w-xl px-4 pb-3">{head}</div>}
    </div>

    <div className={cn('min-h-0 flex-1 overflow-y-auto', onWhite && 'bg-white')}>
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </div>

    {footer !== undefined && (
      <div className="border-line shrink-0 border-t bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-xl">{footer}</div>
      </div>
    )}
  </div>
);

/** Contact rows while the contacts load, the same height as the loaded ones. */
export const ContactRowsSkeleton: React.FC<{ count?: number; withMark?: boolean }> = ({
  count = 6,
  withMark = false,
}) => (
  <ul aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <li key={index} className={contactRowItemClassName}>
        <div className="flex min-h-16 items-center gap-3 px-4 py-2.5">
          <div className="bg-quiet h-11 w-11 shrink-0 animate-pulse rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="bg-quiet h-4 w-44 animate-pulse rounded" />
            <div className="bg-quiet h-3 w-56 max-w-full animate-pulse rounded" />
          </div>
          {withMark && <SelectionMark isSelected={false} />}
        </div>
      </li>
    ))}
  </ul>
);
