'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { PersonAvatar } from '@/components/ui/person-avatar';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { describeContact } from '@/features/chat/utils/contact-search';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { getContactDisplayName } from '@/utils/format-user-name';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft } from 'lucide-react';
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
  const { primary, secondary } = splitDisplayName(getContactDisplayName(contact));
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
        <span className="block truncate text-[15px] leading-5 text-green-900">
          <span className="font-semibold">{primary}</span>
          {secondary !== undefined && <span className="text-green-700"> {secondary}</span>}
        </span>
        {description !== '' && (
          <span className="mt-0.5 block truncate text-[13px] text-green-700">{description}</span>
        )}
      </span>
    </>
  );
};

/** The row of a contact list; the line between rows starts at the text, as on the chat list. */
export const contactRowItemClassName =
  'after:bg-line relative after:absolute after:right-0 after:bottom-0 after:left-[72px] after:h-px last:after:hidden';

/**
 * The full-screen frame of starting a chat: a back arrow, the title with an optional line
 * under it, a fixed part under the header such as the search, the scrolling content and an
 * optional footer. The app's tab bar is hidden meanwhile.
 */
export const NewChatFrame: React.FC<{
  title: string;
  subtitle?: string | undefined;
  backHref: string;
  backLabel: string;
  head?: React.ReactNode;
  footer?: React.ReactNode;
  /** the content sits on white instead of the grey page, e.g. a form with its grey search */
  onWhite?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, backHref, backLabel, head, footer, onWhite = false, children }) => (
  <div className="bg-page fixed top-(--preview-banner-height) z-[110] flex h-[calc(100dvh-var(--preview-banner-height))] w-screen flex-col overflow-y-hidden xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0 xl:h-[calc(100dvh-var(--app-content-top))] xl:w-[calc(100dvw-var(--app-content-left))]">
    <AppFooterController hideAppFooter />

    <div className="border-line shrink-0 border-b bg-white">
      <div className="flex h-[60px] items-center gap-1 pr-3 pl-1">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-green-900"
        >
          <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-heading truncate text-xl leading-6 font-extrabold">
            {title}
          </h1>
          {subtitle !== undefined && (
            <p aria-live="polite" className="text-[13px] leading-4 text-green-700">
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
          {withMark && <div className="border-rail h-6 w-6 shrink-0 rounded-full border-2" />}
        </div>
      </li>
    ))}
  </ul>
);
