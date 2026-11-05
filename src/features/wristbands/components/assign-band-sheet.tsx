'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { listRowClassName } from '@/components/ui/list-row';
import { SectionLabel } from '@/components/ui/section-label';
import { personName } from '@/features/wristbands/components/band-labels';
import { wristbandErrorTexts } from '@/features/wristbands/error-texts';
import { comparePeople, matchesSearch } from '@/features/wristbands/queue';
import { translate } from '@/features/wristbands/texts';
import type { HofPerson } from '@/features/wristbands/types';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { errorReasonOf, userErrorMessage } from '@/utils/user-error-message';
import { Check, CircleAlert, Loader2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

/** One person to choose; a person who wears a band says so. */
const PersonChoice: React.FC<{
  person: HofPerson;
  locale: Locale;
  disabled: boolean;
  onChoose: () => void;
}> = ({ person, locale, disabled, onChoose }) => (
  <li>
    <button
      type="button"
      className={cn(listRowClassName(), 'px-2')}
      disabled={disabled}
      onClick={onChoose}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-green-900">
          {person.fullName}
        </span>
        {person.nickname !== null && (
          <span className="block truncate text-[13px] text-green-700">{person.nickname}</span>
        )}
      </span>
      {person.band !== null && (
        <span className="flex shrink-0 items-center gap-1 text-[13px] text-green-700">
          <Check className="size-4" aria-hidden />
          {translate('hasBand', locale)}
        </span>
      )}
    </button>
  </li>
);

/**
 * "Wem gibst du das Band?": passes the band someone wears to another person of the Hof, those
 * without a band first. Choosing one who wears a band asks to block their old band first, since
 * nobody wears two; the server says the same when the list was out of date.
 */
export const AssignBandSheet: React.FC<{
  hofId: string;
  /** who wears the band now */
  from: HofPerson;
  uid: string;
  people: HofPerson[];
  onClose: () => void;
}> = ({ hofId, from, uid, people, onClose }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const utils = trpc.useUtils();
  const assign = trpc.wristband.assignWristband.useMutation();
  const revoke = trpc.wristband.revokeWristband.useMutation();
  const [search, setSearch] = useState('');
  // by id, so a list refetched after a conflict shows whether the person still wears one
  const [replacingId, setReplacingId] = useState<string | undefined>();
  const [problem, setProblem] = useState<string | undefined>();
  const replacing = people.find((person) => person.registrationId === replacingId);
  const busy = assign.isPending || revoke.isPending;

  const matching = people
    .filter((person) => person.band?.uid !== uid && matchesSearch(person, search))
    .toSorted(comparePeople);
  const withoutBand = matching.filter((person) => person.band === null);
  const wearing = matching.filter((person) => person.band !== null);

  const refresh = async (): Promise<void> => {
    await utils.wristband.getHofWristbandList.invalidate({ hofId });
  };

  const handOut = async (person: HofPerson): Promise<void> => {
    setProblem(undefined);
    try {
      await assign.mutateAsync({ hofId, uid, registrationId: person.registrationId });
      // the sheet closes onto the list, where the person's row now says "Band"
      onClose();
    } catch (error) {
      if (errorReasonOf(error)?.reason === 'personHasBand') setReplacingId(person.registrationId);
      else setProblem(userErrorMessage(error, locale, wristbandErrorTexts));
    } finally {
      await refresh();
    }
  };

  const choose = (person: HofPerson): void => {
    if (person.band === null) void handOut(person);
    else setReplacingId(person.registrationId);
  };

  const replace = async (person: HofPerson): Promise<void> => {
    const oldUid = person.band?.uid;
    setProblem(undefined);
    try {
      if (oldUid !== undefined) await revoke.mutateAsync({ hofId, uid: oldUid });
    } catch (error) {
      setProblem(userErrorMessage(error, locale, wristbandErrorTexts));
      await refresh();
      return;
    }
    setReplacingId(undefined);
    await handOut({ ...person, band: null });
  };

  const list = (title: string, entries: HofPerson[]): React.ReactNode => (
    <section className="space-y-1">
      <SectionLabel as="h3">{title}</SectionLabel>
      <ul className="divide-line divide-y">
        {entries.map((person) => (
          <PersonChoice
            key={person.registrationId}
            person={person}
            locale={locale}
            disabled={busy}
            onChoose={() => choose(person)}
          />
        ))}
      </ul>
    </section>
  );

  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={translate('whom', locale)}
      description={translate('bandActions', locale, { name: personName(from) })}
      fullHeight
    >
      {problem !== undefined && (
        <p
          role="alert"
          className="border-danger-line bg-danger-soft text-danger-text mb-3 flex items-start gap-2 rounded-xl border p-3 text-[15px] leading-snug"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {problem}
        </p>
      )}
      {replacing === undefined ? (
        <div className="space-y-4 pt-1">
          <AppSearchBar
            autoFocus
            placeholder={translate('searchPerson', locale)}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
          />
          {busy && (
            <p className="flex items-center gap-2 text-[13px] text-green-700" aria-live="polite">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {translate('loading', locale)}
            </p>
          )}
          {matching.length === 0 && (
            <p className="py-3 text-[15px] text-green-700">{translate('noMatch', locale)}</p>
          )}
          {withoutBand.length > 0 && list(translate('withoutBand', locale), withoutBand)}
          {wearing.length > 0 && list(translate('wearingBand', locale), wearing)}
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          <p className="text-[15px] leading-normal text-green-900">
            {translate('replaceAsk', locale, { name: personName(replacing) })}
          </p>
          <div className="grid gap-2">
            <Button
              variant="danger"
              size="touch"
              disabled={busy}
              onClick={() => void replace(replacing)}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {translate('replaceYes', locale)}
            </Button>
            <Button
              variant="quiet"
              size="touch"
              disabled={busy}
              onClick={() => setReplacingId(undefined)}
            >
              {translate('cancel', locale)}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
