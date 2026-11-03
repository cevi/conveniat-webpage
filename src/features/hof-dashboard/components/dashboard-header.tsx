'use client';

import { PAGE_BAR_ROW_CLASS, SetPageBar } from '@/components/header/page-bar';
import { PersonAvatar } from '@/components/ui/person-avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HofContact } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { translate } from '@/features/hof-dashboard/texts';
import { signOutNeedsConnectionText, useSignOut } from '@/hooks/use-sign-out';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { reloadPage } from '@/utils/reload-page';
import { ChevronRight, LogOut } from 'lucide-react';
import type React from 'react';
import { Fragment, useId, useState } from 'react';

/** One step of the path: a way back, or where the user is, which may be a choice of Höfe. */
export interface Crumb {
  label: string;
  onClick?: () => void;
  /** Replaces the label on the last step, such as the switch between a person's Höfe. */
  control?: React.ReactNode;
}

const CRUMB_LINK_CLASS =
  'inline-flex min-h-11 cursor-pointer items-center rounded-lg px-1 text-green-700 underline-offset-2 hover:text-green-900 hover:underline focus-visible:outline-2 focus-visible:outline-green-600';

/** Where the user is in the dashboard, each step before the last one a way back. */
const Breadcrumbs: React.FC<{ crumbs: Crumb[]; locale: Locale }> = ({ crumbs, locale }) => (
  <nav aria-label={translate('breadcrumbs', locale)} className="min-w-0">
    <ol className="flex flex-wrap items-center gap-x-1 text-sm">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <Fragment key={crumb.label}>
            {index > 0 && (
              <li aria-hidden className="text-green-500">
                <ChevronRight className="h-4 w-4" />
              </li>
            )}
            <li className="min-w-0">
              {isLast ? (
                (crumb.control ?? (
                  <span aria-current="page" className="text-heading px-1 font-semibold">
                    {crumb.label}
                  </span>
                ))
              ) : (
                <button type="button" className={CRUMB_LINK_CLASS} onClick={crumb.onClick}>
                  {crumb.label}
                </button>
              )}
            </li>
          </Fragment>
        );
      })}
    </ol>
  </nav>
);

/** The last step of the path as a choice between Höfe, for those who see more than one. */
export const HofSwitch: React.FC<{
  hoefe: { id: string; name: string }[];
  value: string;
  onChange: (hofId: string) => void;
  locale: Locale;
}> = ({ hoefe, value, onChange, locale }) => {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {translate('hof', locale)}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          aria-current="page"
          className="border-line text-heading h-11 w-auto max-w-full min-w-0 gap-2 rounded-lg bg-white font-semibold shadow-none focus-visible:ring-2 focus-visible:ring-green-600 sm:max-w-[24rem] [&>span]:block [&>span]:truncate"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-w-(--radix-select-content-available-width) bg-white">
          {hoefe.map((candidate) => (
            <SelectItem
              key={candidate.id}
              value={candidate.id}
              className="min-h-11 whitespace-normal"
            >
              {candidate.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
};

/**
 * Who is signed in, and the way out: the dashboard shows one person's Höfe, so on a shared
 * phone the next person needs to see whose they are and switch. They are shown as in the chat,
 * by their picture or their initials, which leaves the path the room; the name is the
 * avatar's tooltip and part of the button's label.
 */
export const AccountButton: React.FC<{ userId: string; name: string; locale: Locale }> = ({
  userId,
  name,
  locale,
}) => {
  const signOut = useSignOut();
  const picture = trpc.profilePicture.getProfilePicture.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
  const [failed, setFailed] = useState(false);
  const label = `${translate('signedInAs', locale, { name })} · ${translate('signOut', locale)}`;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <span title={name} className="flex">
          <PersonAvatar
            seed={userId}
            name={name}
            pictureUrl={picture.data?.pictureUrl}
            className="h-9 w-9 text-xs"
          />
        </span>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-green-700 transition hover:bg-gray-100 hover:text-green-900 focus-visible:outline-2 focus-visible:outline-green-600"
          onClick={() => {
            setFailed(false);
            void signOut()
              .then(reloadPage)
              .catch((error: unknown) => {
                console.warn('Signing out of the Hof dashboard failed', error);
                setFailed(true);
              });
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {failed && (
        <p role="alert" className="text-danger-text text-[13px] leading-[18px] font-medium">
          {signOutNeedsConnectionText[locale]}
        </p>
      )}
    </div>
  );
};

/** The Hof's responsible people (AVP) in one line under its name, each a link to write them. */
export const ResponsibleLine: React.FC<{ people: HofContact[]; locale: Locale }> = ({
  people,
  locale,
}) => (
  <p className="text-[15px] text-green-700">
    <span className="font-semibold">{translate('responsibleShort', locale)}: </span>
    {people.length === 0
      ? translate('responsibleMissing', locale)
      : people.map((person, index) => (
          <Fragment key={person.email}>
            {index > 0 && ', '}
            <a
              href={`mailto:${person.email}`}
              title={person.email}
              className="text-conveniat-green underline-offset-2 hover:underline"
            >
              {person.name ?? person.email}
            </a>
          </Fragment>
        ))}
  </p>
);

/**
 * The head of every screen. The path, with the account on the right, goes into the bar that
 * sticks below the site's header, above the page's title and whatever an editor placed before
 * the dashboard. The path names where the user is, so the screen repeats it in no heading of its
 * own; what is left here is a line about it, such as the Hof's AVP.
 */
export const DashboardHeader: React.FC<{
  crumbs: Crumb[];
  isReviewer: boolean;
  account: React.ReactNode;
  subline?: React.ReactNode;
  locale: Locale;
}> = ({ crumbs, isReviewer, account, subline, locale }) => (
  <>
    <SetPageBar>
      <div className={PAGE_BAR_ROW_CLASS}>
        <Breadcrumbs crumbs={crumbs} locale={locale} />
        <div className="flex shrink-0 items-center gap-2">
          {isReviewer && (
            <span className="border-line hidden rounded-full border bg-white px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-green-700 lg:inline">
              {translate('reviewerView', locale)}
            </span>
          )}
          {account}
        </div>
      </div>
    </SetPageBar>
    {subline}
  </>
);
