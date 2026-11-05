'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { personDetails, personName } from '@/features/wristbands/components/band-labels';
import { wristbandErrorTexts } from '@/features/wristbands/error-texts';
import {
  comparePeople,
  matchesSearch,
  readWristbandList,
  withHelper,
} from '@/features/wristbands/hof-list';
import { translate } from '@/features/wristbands/texts';
import type { HofPerson, HofWristbandList } from '@/features/wristbands/types';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { userErrorMessage } from '@/utils/user-error-message';
import { Loader2, UserPlus } from 'lucide-react';
import type React from 'react';
import type { RefObject } from 'react';
import { useState } from 'react';

/** Without a search the sheet offers the Leitende, the people an AVP asks to help. */
const leadersFirst = (a: HofPerson, b: HofPerson): number => {
  if (a.role === b.role) return comparePeople(a, b);
  return a.role === 'leader' ? -1 : 1;
};

/** How many people the sheet offers before a search narrows them down. */
const OFFERED = 30;

const PersonLine: React.FC<{ person: HofPerson; locale: Locale; children: React.ReactNode }> = ({
  person,
  locale,
  children,
}) => (
  <li className="flex min-h-14 items-center gap-3 px-4 py-2">
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-semibold text-green-900">
        {person.fullName}
      </span>
      <span className="block truncate text-[13px] text-green-700">
        {personDetails(person, locale)}
      </span>
    </span>
    {children}
  </li>
);

/**
 * The AVP's helpers: people of the Hof who give and replace its bands at a station of their
 * own, until the AVP removes them. Only the AVP opens this sheet; a helper names no one.
 */
export const HelpersSheet: React.FC<{
  hofId: string;
  list: HofWristbandList;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLElement | null>;
  locale: Locale;
}> = ({ hofId, list, open, onOpenChange, anchor, locale }) => {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [failed, setFailed] = useState<string | undefined>();
  const [pendingId, setPendingId] = useState<string | undefined>();

  const change = async (person: HofPerson, helper: boolean): Promise<void> => {
    setPendingId(person.registrationId);
    setFailed(undefined);
    try {
      const input = { hofId, registrationId: person.registrationId };
      await (helper
        ? utils.client.wristband.addWristbandHelper.mutate(input)
        : utils.client.wristband.removeWristbandHelper.mutate(input));
      utils.wristband.getHofWristbandList.setData({ hofId }, (current) =>
        withHelper(readWristbandList(current ?? list), person.registrationId, helper),
      );
    } catch (error) {
      setFailed(userErrorMessage(error, locale, wristbandErrorTexts));
    } finally {
      setPendingId(undefined);
      void utils.wristband.getHofWristbandList.invalidate({ hofId });
    }
  };

  const helpers = list.people.filter((person) => person.helper).toSorted(comparePeople);
  const offered = list.people
    .filter((person) => !person.helper && matchesSearch(person, search))
    .toSorted(search.trim() === '' ? leadersFirst : comparePeople)
    .slice(0, OFFERED);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={translate('manageHelpers', locale)}
      showClose
      anchor={anchor}
      fullHeight
    >
      <div className="space-y-6 pb-4">
        <p className="text-[15px] leading-normal text-green-700">
          {translate('helpersHint', locale)}
        </p>
        {failed !== undefined && (
          <p className="text-danger-text text-[13px] font-semibold" role="alert">
            {failed}
          </p>
        )}

        <section className="space-y-2">
          <SectionLabel className="px-1">
            {translate('helpers', locale)}
            <span className="tabular-nums"> · {helpers.length}</span>
          </SectionLabel>
          {helpers.length === 0 ? (
            <p className="bg-quiet rounded-[14px] px-4 py-3 text-[15px] text-green-700">
              {translate('noHelpers', locale)}
            </p>
          ) : (
            <Card as="ul" divided>
              {helpers.map((person) => (
                <PersonLine key={person.registrationId} person={person} locale={locale}>
                  <Button
                    variant="danger"
                    size="touch"
                    disabled={pendingId !== undefined}
                    aria-label={translate('removeHelperLabel', locale, {
                      name: personName(person),
                    })}
                    onClick={() => void change(person, false)}
                  >
                    {pendingId === person.registrationId && (
                      <Loader2 className="animate-spin" aria-hidden />
                    )}
                    {translate('removeHelper', locale)}
                  </Button>
                </PersonLine>
              ))}
            </Card>
          )}
        </section>

        <section className="space-y-2">
          <SectionLabel className="px-1">{translate('addHelpers', locale)}</SectionLabel>
          <AppSearchBar
            onPage
            placeholder={translate('searchStation', locale)}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
          />
          {offered.length === 0 ? (
            <p className="px-1 py-4 text-center text-[15px] text-green-700">
              {translate('nobodyFound', locale)}
            </p>
          ) : (
            <Card as="ul" divided>
              {offered.map((person) => (
                <PersonLine key={person.registrationId} person={person} locale={locale}>
                  <Button
                    variant="outlined"
                    size="touch"
                    disabled={pendingId !== undefined}
                    aria-label={translate('addHelperLabel', locale, { name: personName(person) })}
                    onClick={() => void change(person, true)}
                  >
                    {pendingId === person.registrationId ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <UserPlus aria-hidden />
                    )}
                    {translate('addHelper', locale)}
                  </Button>
                </PersonLine>
              ))}
            </Card>
          )}
        </section>
      </div>
    </BottomSheet>
  );
};
