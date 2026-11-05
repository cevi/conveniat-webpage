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
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { filterChipClassName } from '@/features/payload-cms/components/search/search-filter-panel';
import { AssignBandSheet } from '@/features/wristbands/components/assign-band-sheet';
import { ChoosePersonSheet } from '@/features/wristbands/components/choose-person-sheet';
import { PersonRow } from '@/features/wristbands/components/person-row';
import { ProgramSeriesCard } from '@/features/wristbands/components/program-series-card';
import { QueueCard } from '@/features/wristbands/components/queue-card';
import { UNDO_BAR_ROOM, UndoBar } from '@/features/wristbands/components/undo-bar';
import { useWristbandHandOut } from '@/features/wristbands/hooks/use-wristband-hand-out';
import type { BandFilter, PeopleFilters } from '@/features/wristbands/queue';
import {
  abteilungenOf,
  bandProgress,
  filterPeople,
  NO_FILTERS,
  readWristbandList,
} from '@/features/wristbands/queue';
import { readerText } from '@/features/wristbands/reader-texts';
import { translate } from '@/features/wristbands/texts';
import type { HofPerson, HofWristbandList } from '@/features/wristbands/types';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  Loader2,
  Nfc,
  ScanLine,
  Tent,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';

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

/** "34 / 86 mit Band · 3 Ersatzbänder" */
const progressText = (list: HofWristbandList | undefined, locale: Locale): string => {
  if (list === undefined) return translate('loading', locale);
  const { withBand, total } = bandProgress(list.people);
  const spare = list.spareBands.length;
  return [
    translate('withBand', locale, { n: withBand, total }),
    ...(spare === 0
      ? []
      : [
          spare === 1
            ? translate('spareCountOne', locale)
            : translate('spareCount', locale, { n: spare }),
        ]),
  ].join(' · ');
};

/** The Hof and how many of its people wear a band; with several Höfe, the way to the others. */
const HofSummary: React.FC<{
  hofName: string;
  list: HofWristbandList | undefined;
  locale: Locale;
  onChoose: (() => void) | undefined;
}> = ({ hofName, list, locale, onChoose }) => {
  const body = (
    <>
      <IconTile icon={Tent} />
      <span className="min-w-0 flex-1">
        <span className="font-heading text-heading block truncate text-[17px] font-bold">
          {hofName}
        </span>
        <span className="block text-[13px] text-green-700 tabular-nums" aria-live="polite">
          {progressText(list, locale)}
        </span>
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

/** A row of chips, one of them chosen. */
function ChipRow<Value extends string | null>({
  label,
  options,
  chosen,
  onChoose,
}: {
  label: string;
  options: { value: Value; label: string }[];
  chosen: Value;
  onChoose: (value: Value) => void;
}): React.ReactNode {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1"
    >
      {options.map((option) => (
        <button
          key={option.value ?? ''}
          type="button"
          aria-pressed={option.value === chosen}
          className={cn(filterChipClassName(option.value === chosen), 'snap-start')}
          onClick={() => onChoose(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Which part of the Hof the queue and the list show: one Abteilung, where the Hof has several,
 * and participants or leaders, where it has both.
 */
const PeopleFilterBar: React.FC<{
  people: HofPerson[];
  filters: PeopleFilters;
  locale: Locale;
  onChange: (filters: PeopleFilters) => void;
}> = ({ people, filters, locale, onChange }) => {
  const abteilungen = abteilungenOf(people);
  const hasBothRoles =
    people.some((person) => person.role === 'leader') &&
    people.some((person) => person.role === 'participant');
  if (abteilungen.length < 2 && !hasBothRoles) return <></>;
  return (
    <div className="space-y-2" aria-label={translate('filters', locale)} role="group">
      {abteilungen.length > 1 && (
        <ChipRow<string | null>
          label={translate('abteilungFilter', locale)}
          options={[
            { value: null, label: translate('allAbteilungen', locale) },
            ...abteilungen.map((abteilung) => ({ value: abteilung, label: abteilung })),
          ]}
          chosen={filters.abteilung}
          onChoose={(abteilung) => onChange({ ...filters, abteilung })}
        />
      )}
      {hasBothRoles && (
        <ChipRow<PeopleFilters['role']>
          label={translate('roleFilter', locale)}
          options={[
            { value: 'all', label: translate('allRoles', locale) },
            { value: 'participant', label: translate('participants', locale) },
            { value: 'leader', label: translate('leaders', locale) },
          ]}
          chosen={filters.role}
          onChoose={(role) => onChange({ ...filters, role })}
        />
      )}
    </div>
  );
};

/** A segmented control of buttons, the chosen segment pressed. */
function Segments<Value extends string>({
  label,
  options,
  chosen,
  onChoose,
}: {
  label: string;
  options: { value: Value; label: string }[];
  chosen: Value;
  onChoose: (value: Value) => void;
}): React.ReactNode {
  return (
    <div role="group" aria-label={label} className={segmentedTrackClassName}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === chosen}
          className={cn(
            segmentClassName(option.value === chosen),
            'flex-1 text-[14px] font-semibold',
          )}
          onClick={() => onChoose(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The people of the Hof with their bands, searchable, and what to do with a band they wear. */
const PeopleList: React.FC<{
  hofId: string;
  people: HofPerson[];
  filters: PeopleFilters;
  locale: Locale;
  onReassign: (person: HofPerson) => void;
}> = ({ hofId, people, filters, locale, onReassign }) => {
  const [search, setSearch] = useState('');
  const [band, setBand] = useState<BandFilter>('all');
  const [expandedId, setExpandedId] = useState<string | undefined>();
  const shown = filterPeople(people, { ...filters, band, search });
  const showAbteilung = abteilungenOf(people).length > 1;

  return (
    <section className="space-y-2">
      <SectionLabel className="px-1">
        {translate('people', locale)}
        <span className="tabular-nums"> · {people.length}</span>
      </SectionLabel>
      {people.length === 0 ? (
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
          <Segments<BandFilter>
            label={translate('bandStatus', locale)}
            options={[
              { value: 'all', label: translate('allBands', locale) },
              { value: 'without', label: translate('withoutBand', locale) },
              { value: 'with', label: translate('withBandFilter', locale) },
            ]}
            chosen={band}
            onChoose={setBand}
          />
          {shown.length === 0 ? (
            <p className="px-1 py-6 text-center text-[15px] text-green-700">
              {translate('noMatch', locale)}
            </p>
          ) : (
            <Card as="ul" divided>
              {shown.map((person) => (
                <PersonRow
                  key={person.registrationId}
                  hofId={hofId}
                  person={person}
                  locale={locale}
                  showAbteilung={showAbteilung}
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

const NotInApp: React.FC<{ locale: Locale }> = ({ locale }) => (
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
);

/**
 * The bands of one Hof once its list is there: the queue or "Nur programmieren" on a phone
 * with NFC, the filters, and the people with their bands.
 */
const HofPanel: React.FC<{ hofId: string; list: HofWristbandList; locale: Locale }> = ({
  hofId,
  list,
  locale,
}) => {
  const [filters, setFilters] = useState<PeopleFilters>(NO_FILTERS);
  const [choosing, setChoosing] = useState(false);
  const [reassigning, setReassigning] = useState<HofPerson | undefined>();
  const handOut = useWristbandHandOut({ hofId, list, filters, locale });
  const { people } = list;
  const reassigningUid = reassigning?.band?.uid;

  return (
    // the list's last row stays above the undo bar
    <div className={cn('space-y-6', handOut.undo !== undefined && UNDO_BAR_ROOM)}>
      {handOut.nfcAvailable === true && (
        <Segments<'handOut' | 'program'>
          label={translate('modes', locale)}
          options={[
            { value: 'handOut', label: translate('modeHandOut', locale) },
            { value: 'program', label: translate('modeProgram', locale) },
          ]}
          chosen={handOut.mode}
          onChoose={handOut.setMode}
        />
      )}
      {handOut.nfcAvailable === false && <NotInApp locale={locale} />}

      {handOut.mode === 'handOut' && (
        <PeopleFilterBar people={people} filters={filters} locale={locale} onChange={setFilters} />
      )}

      {handOut.nfcAvailable === true && handOut.mode === 'handOut' && (
        <QueueCard
          queue={handOut.queue}
          locale={locale}
          emptyText={translate(
            bandProgress(people).withBand === people.length
              ? 'everyoneHasBand'
              : 'everyoneFilteredHasBand',
            locale,
          )}
          phase={handOut.scanner.phase}
          notice={handOut.scanner.notice}
          onResume={handOut.scanner.resume}
          onSkip={handOut.skip}
          onChoose={() => setChoosing(true)}
          onBringBack={handOut.putFirst}
        />
      )}
      {handOut.nfcAvailable === true && handOut.mode === 'program' && (
        <ProgramSeriesCard
          bands={handOut.series}
          locale={locale}
          phase={handOut.scanner.phase}
          notice={handOut.scanner.notice}
          onResume={handOut.scanner.resume}
        />
      )}

      {handOut.mode === 'handOut' && (
        <PeopleList
          hofId={hofId}
          people={people}
          filters={filters}
          locale={locale}
          onReassign={setReassigning}
        />
      )}

      <ChoosePersonSheet
        open={choosing}
        people={people}
        locale={locale}
        onChoose={(person) => {
          handOut.putFirst(person);
          setChoosing(false);
        }}
        onClose={() => setChoosing(false)}
      />
      {reassigning !== undefined && reassigningUid !== undefined && (
        <AssignBandSheet
          key={reassigning.registrationId}
          hofId={hofId}
          from={reassigning}
          uid={reassigningUid}
          people={people}
          onClose={() => setReassigning(undefined)}
        />
      )}
      {handOut.undo !== undefined && (
        <UndoBar state={handOut.undo.state} locale={locale} onUndo={handOut.undo.run} />
      )}
    </div>
  );
};

/** The page of one Hof, and the way to the others. */
const HofWristbands: React.FC<{
  hoefe: { id: string; name: string }[];
  locale: Locale;
}> = ({ hoefe, locale }) => {
  const [chosenHofId, setChosenHofId] = useState<string | undefined>();
  const [choosingHof, setChoosingHof] = useState(false);
  const hofChooserReference = useRef<HTMLDivElement>(null);
  const hof = hoefe.find((entry) => entry.id === chosenHofId) ?? hoefe[0];
  const hofId = hof?.id;

  const listQuery = trpc.wristband.getHofWristbandList.useQuery(
    { hofId: hofId ?? '' },
    { enabled: hofId !== undefined },
  );

  if (hof === undefined || hofId === undefined) return <></>;
  // read defensively: the persisted query cache may hold a list of an older shape
  const list = listQuery.data === undefined ? undefined : readWristbandList(listQuery.data);

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

      {listQuery.isError && list === undefined && (
        <LoadFailed locale={locale} onRetry={() => void listQuery.refetch()} />
      )}
      {list === undefined && !listQuery.isError && <Loading locale={locale} />}
      {/* keyed by the Hof: its scanner, queue and filters start anew for another Hof */}
      {list !== undefined && <HofPanel key={hofId} hofId={hofId} list={list} locale={locale} />}

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
 * The AVP's page for the NFC wristbands of their Hof. On a phone with the native app, the
 * scanner runs on its own: each band held to the phone is programmed and goes to the person
 * "Jetzt dran", then the next comes up. Before the camp, "Nur programmieren" prepares spare
 * bands. Taking a band back, passing it on and blocking it work in any browser.
 */
/** The way to reading bands, for security and first aid. */
const ReadBandLink: React.FC<{ locale: Locale }> = ({ locale }) => (
  <Card className="mb-6">
    <ListRow href="/app/wristbands/lesen">
      <IconTile icon={ScanLine} />
      <span className="min-w-0 flex-1 text-[15px] font-semibold text-green-900">
        {readerText('read', locale)}
      </span>
      <ChevronRight className="size-5 shrink-0 text-green-500" aria-hidden />
    </ListRow>
  </Card>
);

export const WristbandsView: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const hoefeQuery = trpc.wristband.getMyHofList.useQuery();
  const hoefe = hoefeQuery.data;
  const reader = trpc.wristband.getWristbandAccess.useQuery().data?.reader === true;

  let content: React.ReactNode;
  if (hoefe !== undefined && hoefe.length > 0) {
    content = <HofWristbands hoefe={hoefe} locale={locale} />;
  } else if (hoefe !== undefined && reader) {
    // security and first aid without a Hof of their own only read bands
    content = <></>;
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
      {reader && <ReadBandLink locale={locale} />}
      {content}
    </>
  );
};
