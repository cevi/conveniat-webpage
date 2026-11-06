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
import type { WristbandHof } from '@/features/payload-cms/payload-cms/access-rules/accessible-hoefe';
import { personDetails } from '@/features/wristbands/components/band-labels';
import { GiveBandSheet } from '@/features/wristbands/components/give-band-sheet';
import { HelpersSheet } from '@/features/wristbands/components/helpers-sheet';
import type { StationGroup } from '@/features/wristbands/hof-list';
import { bandProgress, readWristbandList, stationList } from '@/features/wristbands/hof-list';
import { useNativeNfcAvailable } from '@/features/wristbands/hooks/use-native-nfc-available';
import { readerText } from '@/features/wristbands/reader-texts';
import { translate } from '@/features/wristbands/texts';
import type { HofPerson, HofWristbandList } from '@/features/wristbands/types';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  Loader2,
  Nfc,
  PartyPopper,
  ScanLine,
  Tent,
  UserPlus,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

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

/** A person of the list: a tap opens the band sheet. */
const StationRow: React.FC<{
  person: HofPerson;
  locale: Locale;
  withAbteilung: boolean;
  onChoose: () => void;
}> = ({ person, locale, withAbteilung, onChoose }) => (
  <li>
    <ListRow onClick={onChoose}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-green-900">
          {person.fullName}
        </span>
        <span className="block truncate text-[13px] text-green-700">
          {personDetails(person, locale, { withAbteilung })}
        </span>
      </span>
      {person.band === null ? (
        <ChevronRight className="size-5 shrink-0 text-green-500" aria-hidden />
      ) : (
        <span className="border-tint-line flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-semibold text-green-700">
          <Check className="text-conveniat-green size-3.5" aria-hidden />
          {translate('wearsBand', locale)}
        </span>
      )}
    </ListRow>
  </li>
);

/** "Cevi Uster · 12 ohne Band", or for a search how many it found. */
const groupLabel = (
  group: StationGroup,
  { searching, single }: { searching: boolean; single: boolean },
  locale: Locale,
): string => {
  const n = group.people.length;
  if (searching) return translate('found', locale, { n });
  if (group.abteilung === null || single) return translate('withoutBandCount', locale, { n });
  return translate('withoutBandIn', locale, { abteilung: group.abteilung, n });
};

/**
 * The station: a search for the person in front of the phone, and without a search who still
 * needs a band, by Abteilung, the list the AVP calls the people up by.
 */
const StationList: React.FC<{
  people: HofPerson[];
  locale: Locale;
  onChoose: (person: HofPerson) => void;
}> = ({ people, locale, onChoose }) => {
  const [search, setSearch] = useState('');
  const { searching, groups } = stationList(people, search);
  const withAbteilung = new Set(people.map((person) => person.abteilung)).size > 1;
  const shownCount = groups.reduce((sum, group) => sum + group.people.length, 0);
  const choose = (person: HofPerson): void => {
    setSearch('');
    onChoose(person);
  };

  let body: React.ReactNode;
  if (people.length === 0) {
    body = <EmptyState icon={Users} title={translate('noPeople', locale)} />;
  } else if (shownCount === 0 && searching) {
    body = (
      <p className="px-1 py-6 text-center text-[15px] text-green-700">
        {translate('nobodyFound', locale)}
      </p>
    );
  } else if (shownCount === 0) {
    body = (
      <Card>
        <EmptyState
          icon={PartyPopper}
          title={translate('everyoneDone', locale, { n: people.length })}
          description={translate('everyoneDoneHint', locale)}
        />
      </Card>
    );
  } else {
    body = groups.map((group) => (
      <section key={group.abteilung ?? ''} className="space-y-2">
        <SectionLabel className="px-1 tabular-nums">
          {groupLabel(group, { searching, single: groups.length === 1 }, locale)}
        </SectionLabel>
        <Card as="ul" divided>
          {group.people.map((person) => (
            <StationRow
              key={person.registrationId}
              person={person}
              locale={locale}
              withAbteilung={withAbteilung}
              onChoose={() => choose(person)}
            />
          ))}
        </Card>
      </section>
    ));
  }

  return (
    <div className="space-y-6">
      <AppSearchBar
        placeholder={translate('searchStation', locale)}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onClear={() => setSearch('')}
      />
      {body}
    </div>
  );
};

/** The Hof, how many of its people wear a band, and with several Höfe the way to the others. */
const HofLine: React.FC<{
  hof: WristbandHof;
  list: HofWristbandList | undefined;
  locale: Locale;
  onChoose: (() => void) | undefined;
}> = ({ hof, list, locale, onChoose }) => {
  const progress = list === undefined ? undefined : bandProgress(list.people);
  const name = (
    <span className="font-heading text-heading truncate text-[17px] font-bold">{hof.name}</span>
  );
  return (
    <div className="space-y-2 px-1">
      <div className="flex min-h-11 items-center gap-2">
        {onChoose === undefined ? (
          name
        ) : (
          <button
            type="button"
            className="focus-visible:focus-text -my-1 flex min-h-11 min-w-0 cursor-pointer items-center gap-1"
            aria-label={`${translate('chooseHof', locale)}: ${hof.name}`}
            onClick={onChoose}
          >
            {name}
            <ChevronsUpDown className="size-4 shrink-0 text-green-500" aria-hidden />
          </button>
        )}
        <span
          className="ml-auto shrink-0 text-[13px] text-green-700 tabular-nums"
          aria-live="polite"
        >
          {progress === undefined
            ? translate('loading', locale)
            : translate('withBand', locale, { n: progress.withBand, total: progress.total })}
        </span>
      </div>
      <div className="bg-chip h-1.5 overflow-hidden rounded-full" aria-hidden>
        <div
          className="bg-conveniat-green h-full rounded-full transition-[width]"
          style={{
            width:
              progress === undefined || progress.total === 0
                ? '0%'
                : `${(progress.withBand / progress.total) * 100}%`,
          }}
        />
      </div>
      {hof.role === 'helper' && (
        <p className="text-[13px] text-green-700">{translate('youHelp', locale)}</p>
      )}
    </div>
  );
};

/**
 * The station of one Hof once its list is there: the people to call up and to search, the
 * sheet that gives the chosen one a band, and for the AVP the helpers at the other stations.
 */
const HofPanel: React.FC<{ hof: WristbandHof; list: HofWristbandList; locale: Locale }> = ({
  hof,
  list,
  locale,
}) => {
  // fixed at the tap: the sheet keeps the person while their band changes the list under it
  const [chosen, setChosen] = useState<HofPerson | undefined>();
  const [managingHelpers, setManagingHelpers] = useState(false);
  const helpersButton = useRef<HTMLButtonElement>(null);
  const nfcAvailable = useNativeNfcAvailable();

  return (
    <>
      <SetHeaderActions>
        {hof.role === 'avp' && (
          <Button
            ref={helpersButton}
            variant="plain"
            size="touchIcon"
            aria-label={translate('manageHelpers', locale)}
            onClick={() => setManagingHelpers(true)}
          >
            <UserPlus aria-hidden />
          </Button>
        )}
      </SetHeaderActions>
      {nfcAvailable === false && <NotInApp locale={locale} />}
      <StationList people={list.people} locale={locale} onChoose={setChosen} />
      <GiveBandSheet
        hofId={hof.id}
        list={list}
        person={chosen}
        locale={locale}
        onClose={() => setChosen(undefined)}
      />
      {hof.role === 'avp' && (
        <HelpersSheet
          hofId={hof.id}
          list={list}
          open={managingHelpers}
          onOpenChange={setManagingHelpers}
          anchor={helpersButton}
          locale={locale}
        />
      )}
    </>
  );
};

/** The page of one Hof, and the way to the others. */
const HofWristbands: React.FC<{
  hoefe: WristbandHof[];
  locale: Locale;
}> = ({ hoefe, locale }) => {
  const trpc = useTRPC();
  const [chosenHofId, setChosenHofId] = useState<string | undefined>();
  const [choosingHof, setChoosingHof] = useState(false);
  const hofChooserReference = useRef<HTMLDivElement>(null);
  const hof = hoefe.find((entry) => entry.id === chosenHofId) ?? hoefe[0];
  const hofId = hof?.id;

  const listQuery = useQuery(
    trpc.wristband.getHofWristbandList.queryOptions(
      { hofId: hofId ?? '' },
      { enabled: hofId !== undefined },
    ),
  );

  if (hof === undefined || hofId === undefined) return <></>;
  // read defensively: the persisted query cache may hold a list of an older shape
  const list = listQuery.data === undefined ? undefined : readWristbandList(listQuery.data);

  return (
    <div className="space-y-6">
      <div ref={hofChooserReference}>
        <HofLine
          hof={hof}
          list={list}
          locale={locale}
          onChoose={hoefe.length > 1 ? (): void => setChoosingHof(true) : undefined}
        />
      </div>

      {listQuery.isError && list === undefined && (
        <LoadFailed locale={locale} onRetry={() => void listQuery.refetch()} />
      )}
      {list === undefined && !listQuery.isError && <Loading locale={locale} />}
      {/* keyed by the Hof: its search and its sheets start anew for another Hof */}
      {list !== undefined && <HofPanel key={hofId} hof={hof} list={list} locale={locale} />}
      {list === undefined && <SetHeaderActions />}

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

/** A Hof of the list, read defensively: a cached list of before the helpers has no role. */
const readHoefe = (value: unknown): WristbandHof[] | undefined =>
  Array.isArray(value)
    ? value.flatMap((entry: unknown): WristbandHof[] => {
        if (typeof entry !== 'object' || entry === null) return [];
        const { id, name, role } = entry as Record<string, unknown>;
        if (typeof id !== 'string' || typeof name !== 'string') return [];
        // until the fresh list says so, nobody manages helpers
        return [{ id, name, role: role === 'avp' ? 'avp' : 'helper' }];
      })
    : undefined;

/**
 * The page of the NFC wristbands, a station. The AVP of a Hof, or a helper the AVP named, finds
 * the person in front of the phone, by name or Ceviname or in the list of who still needs a
 * band, and holds a band to the phone, which becomes theirs. A person who lost a band gets a new
 * one the same way; the old one is blocked.
 */
export const WristbandsView: React.FC = () => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const hoefeQuery = useQuery(trpc.wristband.getMyHofList.queryOptions());
  const hoefe = readHoefe(hoefeQuery.data);
  const reader = useQuery(trpc.wristband.getWristbandAccess.queryOptions()).data?.reader === true;

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
      {/* the title on the left, the way Programm has it; a Hof's station sets its own buttons */}
      {(hoefe === undefined || hoefe.length === 0) && <SetHeaderActions />}
      {reader && <ReadBandLink locale={locale} />}
      {content}
    </>
  );
};
