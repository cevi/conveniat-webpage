'use client';

import { SetHeaderActions } from '@/components/header/header-actions';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { ListRow, listRowClassName } from '@/components/ui/list-row';
import { SectionLabel } from '@/components/ui/section-label';
import { AssignBandSheet } from '@/features/wristbands/components/assign-band-sheet';
import { matchesSearch, personName, shortUid } from '@/features/wristbands/components/band-labels';
import { PersonRow } from '@/features/wristbands/components/person-row';
import { ProgramBandCard } from '@/features/wristbands/components/program-band-card';
import { useNativeNfcAvailable } from '@/features/wristbands/hooks/use-native-nfc-available';
import { useProgramWristband } from '@/features/wristbands/hooks/use-program-wristband';
import { translate } from '@/features/wristbands/texts';
import type { HofWristbandList } from '@/features/wristbands/types';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, ChevronsUpDown, Loader2, Nfc, Tent, Users } from 'lucide-react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

/** The band whose new wearer is being chosen. */
interface Assigning {
  uid: string;
  /** nobody's yet, so it can stay a spare */
  spare: boolean;
  /** just programmed: kept as a spare, it is worth saying where it went */
  programmed: boolean;
}

const Loading: React.FC<{ locale: Locale }> = ({ locale }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-green-500">
    <Loader2 className="size-4 animate-spin" aria-hidden />
    {translate('loading', locale)}
  </div>
);

const LoadFailed: React.FC<{ locale: Locale; onRetry: () => void }> = ({ locale, onRetry }) => (
  <EmptyState
    icon={Nfc}
    title={translate('loadFailed', locale)}
    action={
      <Button variant="outlined" size="touch" onClick={onRetry}>
        {translate('reload', locale)}
      </Button>
    }
  />
);

/** The Hof and how many of its people wear a band; with several Höfe, the way to the others. */
const HofSummary: React.FC<{
  hofName: string;
  list: HofWristbandList | undefined;
  locale: Locale;
  onChoose: (() => void) | undefined;
}> = ({ hofName, list, locale, onChoose }) => {
  const withBand = list?.people.filter((person) => person.band !== null).length ?? 0;
  const counts =
    list === undefined
      ? translate('loading', locale)
      : [
          translate('withBand', locale, { n: withBand, total: list.people.length }),
          ...(list.spareBands.length > 0
            ? [translate('spareCount', locale, { n: list.spareBands.length })]
            : []),
        ].join(' · ');
  const body = (
    <>
      <IconTile icon={Tent} />
      <span className="min-w-0 flex-1">
        <span className="font-heading text-heading block truncate text-[17px] font-bold">
          {hofName}
        </span>
        <span className="block text-[13px] text-green-700 tabular-nums">{counts}</span>
      </span>
    </>
  );
  return (
    <Card>
      {onChoose === undefined ? (
        <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">{body}</div>
      ) : (
        <ListRow aria-label={`${translate('chooseHof', locale)}: ${hofName}`} onClick={onChoose}>
          {body}
          <ChevronsUpDown className="size-5 shrink-0 text-green-500" aria-hidden />
        </ListRow>
      )}
    </Card>
  );
};

/** The programmed bands nobody wears yet, each ready to be handed out. */
const SpareBands: React.FC<{
  list: HofWristbandList;
  locale: Locale;
  onHandOut: (uid: string) => void;
}> = ({ list, locale, onHandOut }) => {
  if (list.spareBands.length === 0) return <></>;
  return (
    <section className="space-y-2">
      <div className="px-1">
        <SectionLabel>
          {translate('spareBands', locale)}
          <span className="tabular-nums"> · {list.spareBands.length}</span>
        </SectionLabel>
        <p className="text-[13px] text-green-700">{translate('spareHint', locale)}</p>
      </div>
      <Card as="ul" divided>
        {list.spareBands.map((band) => (
          <li key={band.uid} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <IconTile icon={Nfc} />
            <span className="min-w-0 flex-1 text-[15px] font-semibold text-green-900 tabular-nums">
              {translate('band', locale, { uid: shortUid(band.uid) })}
            </span>
            <Button
              variant="outlined"
              size="touch"
              aria-label={translate('handOutBand', locale, { uid: shortUid(band.uid) })}
              onClick={() => onHandOut(band.uid)}
            >
              {translate('handOut', locale)}
            </Button>
          </li>
        ))}
      </Card>
    </section>
  );
};

/** The people of the Hof with their bands, searchable by name and Ceviname. */
const PeopleList: React.FC<{
  hofId: string;
  list: HofWristbandList;
  locale: Locale;
  onReassign: (uid: string) => void;
}> = ({ hofId, list, locale, onReassign }) => {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | undefined>();
  const people = list.people.filter((person) => matchesSearch(person, search));

  return (
    <section className="space-y-2">
      <SectionLabel className="px-1">
        {translate('people', locale)}
        <span className="tabular-nums"> · {list.people.length}</span>
      </SectionLabel>
      {list.people.length === 0 ? (
        <EmptyState icon={Users} title={translate('noPeople', locale)} />
      ) : (
        <>
          <AppSearchBar
            onPage
            placeholder={translate('searchPerson', locale)}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
          />
          {people.length === 0 ? (
            <p className="px-1 py-6 text-center text-[15px] text-green-700">
              {translate('noMatch', locale)}
            </p>
          ) : (
            <Card as="ul" divided>
              {people.map((person) => (
                <PersonRow
                  key={person.registrationId}
                  hofId={hofId}
                  person={person}
                  locale={locale}
                  expanded={expandedId === person.registrationId}
                  onToggle={() =>
                    setExpandedId((current) =>
                      current === person.registrationId ? undefined : person.registrationId,
                    )
                  }
                  onReassign={onReassign}
                />
              ))}
            </Card>
          )}
        </>
      )}
    </section>
  );
};

/** The page of one Hof: programming bands, the spare ones, and its people. */
const HofWristbands: React.FC<{
  hoefe: { id: string; name: string }[];
  locale: Locale;
}> = ({ hoefe, locale }) => {
  const utils = trpc.useUtils();
  const nfcAvailable = useNativeNfcAvailable();
  const [chosenHofId, setChosenHofId] = useState<string | undefined>();
  const [choosingHof, setChoosingHof] = useState(false);
  const [assigning, setAssigning] = useState<Assigning | undefined>();
  const hofChooserReference = useRef<HTMLDivElement>(null);
  const hof = hoefe.find((entry) => entry.id === chosenHofId) ?? hoefe[0];
  const hofId = hof?.id;

  const listQuery = trpc.wristband.getHofWristbandList.useQuery(
    { hofId: hofId ?? '' },
    { enabled: hofId !== undefined },
  );

  // a band programmed before keeps its wearer; a new one goes to somebody right away
  const onProgrammed = useCallback(
    (uid: string): void => {
      if (hofId === undefined) return;
      const list = utils.wristband.getHofWristbandList.getData({ hofId });
      const wearer = list?.people.find((person) => person.band?.uid === uid);
      if (wearer === undefined) setAssigning({ uid, spare: true, programmed: true });
      else toast.success(translate('alreadyWorn', locale, { name: personName(wearer) }));
    },
    [hofId, locale, utils],
  );
  const program = useProgramWristband(hofId, onProgrammed);

  if (hof === undefined || hofId === undefined) return <></>;
  const list = listQuery.data;

  const closeAssigning = (handedOut: boolean): void => {
    if (!handedOut && assigning?.programmed === true) {
      toast(translate('keptSpare', locale, { uid: shortUid(assigning.uid) }));
    }
    setAssigning(undefined);
  };

  return (
    <div className="space-y-6">
      <div ref={hofChooserReference}>
        <HofSummary
          hofName={hof.name}
          list={list}
          locale={locale}
          onChoose={hoefe.length > 1 ? (): void => setChoosingHof(true) : undefined}
        />
      </div>

      {nfcAvailable === true && (
        <ProgramBandCard
          state={program.state}
          locale={locale}
          onStart={program.start}
          onCancel={program.cancel}
          onClose={program.reset}
        />
      )}
      {nfcAvailable === false && (
        <div className="bg-quiet flex items-start gap-3 rounded-[14px] p-4">
          <IconTile icon={Nfc} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-green-900">
              {translate('notInAppTitle', locale)}
            </h2>
            <p className="mt-0.5 text-[13px] leading-normal text-green-700">
              {translate('notInAppDescription', locale)}
            </p>
          </div>
        </div>
      )}

      {listQuery.isError && list === undefined && (
        <LoadFailed locale={locale} onRetry={() => void listQuery.refetch()} />
      )}
      {list === undefined && !listQuery.isError && <Loading locale={locale} />}
      {list !== undefined && (
        <>
          <SpareBands
            list={list}
            locale={locale}
            onHandOut={(uid) => setAssigning({ uid, spare: true, programmed: false })}
          />
          <PeopleList
            key={hofId}
            hofId={hofId}
            list={list}
            locale={locale}
            onReassign={(uid) => setAssigning({ uid, spare: false, programmed: false })}
          />
        </>
      )}

      {assigning !== undefined && list !== undefined && (
        <AssignBandSheet
          key={assigning.uid}
          hofId={hofId}
          uid={assigning.uid}
          people={list.people}
          spare={assigning.spare}
          onClose={closeAssigning}
        />
      )}

      <BottomSheet
        open={choosingHof}
        onOpenChange={setChoosingHof}
        title={translate('chooseHof', locale)}
        anchor={hofChooserReference}
      >
        <ul className="divide-line divide-y">
          {hoefe.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={cn(listRowClassName(), 'px-2')}
                aria-current={entry.id === hofId ? 'true' : undefined}
                onClick={() => {
                  program.cancel();
                  setChosenHofId(entry.id);
                  setChoosingHof(false);
                }}
              >
                <span className="min-w-0 flex-1 text-[15px] font-semibold text-green-900">
                  {entry.name}
                </span>
                {entry.id === hofId && (
                  <Check className="text-conveniat-green size-5 shrink-0" aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
};

/**
 * The AVP's page for the NFC wristbands of their Hof: program a band on the phone, hand it to
 * someone of the Hof, take it back, or block it as lost. Programming needs the native app; the
 * rest works in any browser.
 */
export const WristbandsView: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const hoefeQuery = trpc.wristband.getMyHofList.useQuery();
  const hoefe = hoefeQuery.data;

  let content: React.ReactNode;
  if (hoefe !== undefined && hoefe.length > 0) {
    content = <HofWristbands hoefe={hoefe} locale={locale} />;
  } else if (hoefe !== undefined) {
    content = (
      <EmptyState
        icon={Tent}
        title={translate('noHofTitle', locale)}
        description={translate('noHofDescription', locale)}
      />
    );
  } else if (hoefeQuery.isError) {
    content = <LoadFailed locale={locale} onRetry={() => void hoefeQuery.refetch()} />;
  } else {
    content = <Loading locale={locale} />;
  }

  return (
    <>
      {/* the title on the left, the way Programm has it */}
      <SetHeaderActions />
      {content}
    </>
  );
};
