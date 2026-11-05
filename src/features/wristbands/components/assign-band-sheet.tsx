'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { listRowClassName } from '@/components/ui/list-row';
import { SectionLabel } from '@/components/ui/section-label';
import { matchesSearch, personName, shortUid } from '@/features/wristbands/components/band-labels';
import { wristbandErrorTexts } from '@/features/wristbands/error-texts';
import { translate } from '@/features/wristbands/texts';
import type { HofPerson } from '@/features/wristbands/types';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { errorReasonOf, userErrorMessage } from '@/utils/user-error-message';
import { Loader2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

/** One person to choose; a person who wears a band says which. */
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
        {person.nickname !== null && person.nickname !== '' && (
          <span className="block truncate text-[13px] text-green-700">{person.nickname}</span>
        )}
      </span>
      {person.band !== null && (
        <span className="shrink-0 text-[13px] text-green-700 tabular-nums">
          {translate('band', locale, { uid: shortUid(person.band.uid) })}
        </span>
      )}
    </button>
  </li>
);

/**
 * "Wem gibst du das Band?": the people of the Hof without a band first, those who wear one
 * after them. Choosing one of those asks to block their old band first, since nobody wears two;
 * the server says the same when the list was out of date.
 */
export const AssignBandSheet: React.FC<{
  hofId: string;
  uid: string;
  people: HofPerson[];
  /** a band that is nobody's yet: the sheet offers to keep it as a spare */
  spare: boolean;
  /** with whether the band went to somebody */
  onClose: (handedOut: boolean) => void;
}> = ({ hofId, uid, people, spare, onClose }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const utils = trpc.useUtils();
  const assign = trpc.wristband.assignWristband.useMutation();
  const revoke = trpc.wristband.revokeWristband.useMutation();
  const [search, setSearch] = useState('');
  // by id, so a list refetched after a conflict shows the band the person really wears
  const [replacingId, setReplacingId] = useState<string | undefined>();
  const replacing = people.find((person) => person.registrationId === replacingId);
  const busy = assign.isPending || revoke.isPending;

  const others = people.filter((person) => person.band?.uid !== uid);
  const matching = others.filter((person) => matchesSearch(person, search));
  const withoutBand = matching.filter((person) => person.band === null);
  const wearing = matching.filter((person) => person.band !== null);

  const refresh = async (): Promise<void> => {
    await utils.wristband.getHofWristbandList.invalidate({ hofId });
  };

  const handOut = async (person: HofPerson): Promise<void> => {
    try {
      await assign.mutateAsync({ hofId, uid, registrationId: person.registrationId });
      toast.success(translate('assigned', locale, { uid: shortUid(uid), name: person.fullName }));
      onClose(true);
    } catch (error) {
      if (errorReasonOf(error)?.reason === 'personHasBand') setReplacingId(person.registrationId);
      else toast.error(userErrorMessage(error, locale, wristbandErrorTexts));
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
    try {
      if (oldUid !== undefined) await revoke.mutateAsync({ hofId, uid: oldUid });
    } catch (error) {
      toast.error(userErrorMessage(error, locale, wristbandErrorTexts));
      await refresh();
      return;
    }
    setReplacingId(undefined);
    await handOut({ ...person, band: null });
  };

  const footer = spare ? (
    <Button
      variant="quiet"
      size="touch"
      className="w-full"
      disabled={busy}
      onClick={() => onClose(false)}
    >
      {translate('later', locale)}
    </Button>
  ) : undefined;

  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose(false);
      }}
      title={translate('whom', locale)}
      description={translate('band', locale, { uid: shortUid(uid) })}
      fullHeight
      {...(footer === undefined ? {} : { footer })}
    >
      {replacing === undefined ? (
        <div className="space-y-4 pt-1">
          <AppSearchBar
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
          <section className="space-y-1">
            <SectionLabel as="h3">{translate('withoutBand', locale)}</SectionLabel>
            {withoutBand.length === 0 ? (
              <p className="py-3 text-[15px] text-green-700">
                {search.trim() === ''
                  ? translate('everyoneHasBand', locale)
                  : translate('noMatch', locale)}
              </p>
            ) : (
              <ul className="divide-line divide-y">
                {withoutBand.map((person) => (
                  <PersonChoice
                    key={person.registrationId}
                    person={person}
                    locale={locale}
                    disabled={busy}
                    onChoose={() => choose(person)}
                  />
                ))}
              </ul>
            )}
          </section>
          {wearing.length > 0 && (
            <section className="space-y-1">
              <SectionLabel as="h3">{translate('wearingBand', locale)}</SectionLabel>
              <ul className="divide-line divide-y">
                {wearing.map((person) => (
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
          )}
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          <p className="text-[15px] leading-normal text-green-900">
            {translate('replaceAsk', locale, {
              name: personName(replacing),
              old: replacing.band === null ? '' : shortUid(replacing.band.uid),
            })}
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
