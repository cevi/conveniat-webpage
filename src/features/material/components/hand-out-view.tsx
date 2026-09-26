'use client';

import { BasketEditor, type BasketStart } from '@/features/material/components/basket-editor';
import {
  HolderAvatar,
  holderName,
  loanSummary,
  positionCount,
  SearchField,
  SectionTitle,
  Segmented,
} from '@/features/material/components/counter-ui';
import { format, formatDay, labels } from '@/features/material/components/material-labels';
import { MaterialQueryError } from '@/features/material/components/material-query-error';
import {
  EmptyState,
  focusRing,
  LoadingState,
  MaterialButton,
  Panel,
} from '@/features/material/components/material-ui';
import { useDebouncedValue } from '@/features/material/hooks/use-debounced-value';
import {
  MATERIAL_POLL_INTERVAL_MS,
  materialQueryOptions,
  useDayEnd,
  useInvalidateMaterial,
  useMaterialLocale,
  type MaterialHolderGroup,
} from '@/features/material/hooks/use-material';
import { useSearchHistory } from '@/features/material/hooks/use-search-history';
import { summariseBulk } from '@/features/material/utils/list-view';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Building2, ChevronRight, PackageOpen, SlidersHorizontal, User } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

const text = {
  preparedToday: {
    de: 'Heute vorbereitet',
    en: 'Prepared for today',
    fr: 'Préparé pour aujourd’hui',
  },
  nothingPrepared: {
    de: 'Heute nichts vorbereitet.',
    en: 'Nothing prepared for today.',
    fr: 'Rien de préparé pour aujourd’hui.',
  },
  later: {
    de: 'Später vorbereitet ({n})',
    en: 'Prepared for later ({n})',
    fr: 'Préparé pour plus tard ({n})',
  },
  issueAll: { de: 'Alles ausgeben', en: 'Hand out all', fr: 'Tout remettre' },
  issueAllAsk: {
    de: '{lines} mit der vollen Menge ausgeben?',
    en: 'Hand out {lines} in full?',
    fr: 'Remettre {lines} en entier ?',
  },
  yesIssue: { de: 'Ja, ausgeben', en: 'Yes, hand out', fr: 'Oui, remettre' },
  adjust: { de: 'Anpassen', en: 'Adjust', fr: 'Adapter' },
  newHandOut: { de: 'Neue Ausgabe', en: 'New hand-out', fr: 'Nouvelle remise' },
  whom: {
    de: 'An wen geht das Material?',
    en: 'Who gets the material?',
    fr: 'Qui reçoit le matériel ?',
  },
  searchHof: { de: 'Hof suchen …', en: 'Search Hof …', fr: 'Chercher un Hof …' },
  searchPerson: { de: 'Name suchen …', en: 'Search name …', fr: 'Chercher un nom …' },
  typeName: {
    de: 'Tippe einen Namen, um die Person zu finden.',
    en: 'Type a name to find the person.',
    fr: 'Tape un nom pour trouver la personne.',
  },
  out: { de: '{n} draussen', en: '{n} out', fr: '{n} dehors' },
  pickupFrom: { de: 'Abholung ab {day}', en: 'Pickup from {day}', fr: 'Retrait dès {day}' },
  consumption: { de: 'teilweise Verbrauch', en: 'partly used up', fr: 'en partie consommé' },
} satisfies Record<string, StaticTranslationString>;

const SEARCH_DEBOUNCE_MS = 250;

/** A group's holder as the basket takes it, with the Hof a person's loans were booked with. */
const basketStart = (group: MaterialHolderGroup, locale: Locale): BasketStart => {
  const name = holderName(group, locale);
  const hofId = group.loans.find((loan) => loan.hofId !== null)?.hofId ?? undefined;
  return {
    holder:
      group.holder.kind === 'HOF'
        ? { kind: 'HOF', id: group.holder.id, name }
        : { kind: 'PERSON', id: group.holder.id, name, ...(hofId === undefined ? {} : { hofId }) },
    prepared: group.loans,
  };
};

/** One prepared pickup: what it holds, and the two ways out of it at the counter. */
const PickupCard: React.FC<{
  group: MaterialHolderGroup;
  onAdjust: (group: MaterialHolderGroup) => void;
}> = ({ group, onAdjust }) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const issue = trpc.material.issueLoanList.useMutation();
  const [asking, setAsking] = useState(false);
  const name = holderName(group, locale);
  const first = group.loans[0];
  const lines = positionCount(group.loans.length, locale);

  const issueAll = (): void => {
    issue.mutate(
      { ids: group.loans.map((loan) => loan.id) },
      {
        onSuccess: (results) => {
          const { done, failed, errors } = summariseBulk(results);
          if (failed === 0) toast.success(format(labels.bulkDone, locale, { n: done }));
          else {
            toast.error(format(labels.bulkPartly, locale, { n: done, failed }), {
              description: errors.join(' '),
            });
          }
          setAsking(false);
          void invalidate();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Panel className="space-y-3 p-3">
      <div className="flex items-start gap-3">
        <HolderAvatar name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-bold text-gray-900">
            {group.holder.kind === 'PERSON' && (
              <User className="size-4 shrink-0 text-gray-500" aria-hidden />
            )}
            <span className="truncate">{name}</span>
          </div>
          <p className="line-clamp-2 text-sm text-gray-600">{loanSummary(group.loans)}</p>
          <p className="text-xs text-gray-500">
            {lines}
            {first !== undefined &&
              ` · ${format(text.pickupFrom, locale, { day: formatDay(first.startDate, locale) })}`}
            {group.loans.some((loan) => loan.isConsumption) && ` · ${text.consumption[locale]}`}
          </p>
        </div>
      </div>
      {asking ? (
        <div className="space-y-2 rounded-xl bg-gray-50 p-2">
          <p className="px-1 text-sm font-semibold text-gray-800">
            {format(text.issueAllAsk, locale, { lines })}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <MaterialButton variant="ghost" onClick={() => setAsking(false)}>
              {labels.cancel[locale]}
            </MaterialButton>
            <MaterialButton loading={issue.isPending} onClick={issueAll}>
              {text.yesIssue[locale]}
            </MaterialButton>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_auto]">
          <MaterialButton onClick={() => setAsking(true)}>
            <PackageOpen aria-hidden />
            {text.issueAll[locale]}
          </MaterialButton>
          <MaterialButton variant="secondary" onClick={() => onAdjust(group)}>
            <SlidersHorizontal aria-hidden />
            {text.adjust[locale]}
          </MaterialButton>
        </div>
      )}
    </Panel>
  );
};

const PreparedPickups: React.FC<{ onAdjust: (group: MaterialHolderGroup) => void }> = ({
  onAdjust,
}) => {
  const locale = useMaterialLocale();
  const dayEnd = useDayEnd();
  const queue = trpc.material.getCounterQueue.useQuery(
    { dayEnd },
    { ...materialQueryOptions, refetchInterval: MATERIAL_POLL_INTERVAL_MS },
  );
  if (queue.isLoading) return <LoadingState text={labels.loading[locale]} />;
  if (!queue.data) return <MaterialQueryError error={queue.error} />;
  const { pickups, later } = queue.data;

  return (
    <section className="space-y-3">
      <SectionTitle count={pickups.length}>{text.preparedToday[locale]}</SectionTitle>
      {pickups.length === 0 ? (
        <Panel>
          <EmptyState text={text.nothingPrepared[locale]} />
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {pickups.map((group) => (
            <PickupCard key={group.key} group={group} onAdjust={onAdjust} />
          ))}
        </div>
      )}
      {later.length > 0 && (
        <details className="group">
          <summary
            className={cn(
              'flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg px-1 text-sm font-semibold text-gray-700 [&::-webkit-details-marker]:hidden',
              focusRing,
            )}
          >
            <ChevronRight
              className="size-4 transition-transform group-open:rotate-90"
              aria-hidden
            />
            {format(text.later, locale, { n: later.length })}
          </summary>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            {later.map((group) => (
              <PickupCard key={group.key} group={group} onAdjust={onAdjust} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
};

const pickButton = cn(
  'flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-gray-50',
  focusRing,
  'focus-visible:ring-inset',
);

/** Any Hof, found by name; the list is short enough to show whole. */
const HofChoice: React.FC<{ onPick: (start: BasketStart) => void }> = ({ onPick }) => {
  const locale = useMaterialLocale();
  const [query, setQuery] = useState('');
  const holders = trpc.material.getHolderList.useQuery(undefined, materialQueryOptions);
  const needle = query.trim().toLowerCase();
  const hoefe = (holders.data?.hoefe ?? []).filter((hof) =>
    hof.name.toLowerCase().includes(needle),
  );
  return (
    <div className="space-y-2">
      <SearchField value={query} onChange={setQuery} placeholder={text.searchHof[locale]} />
      <Panel>
        {holders.isLoading && <LoadingState text={labels.loading[locale]} />}
        {!holders.isLoading && hoefe.length === 0 && <EmptyState text={labels.empty[locale]} />}
        <ul className="divide-y divide-gray-100">
          {hoefe.map((hof) => (
            <li key={hof.id}>
              <button
                type="button"
                className={pickButton}
                onClick={() => onPick({ holder: { kind: 'HOF', id: hof.id, name: hof.name } })}
              >
                <HolderAvatar name={hof.name} />
                <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">
                  {hof.name}
                </span>
                {hof.out > 0 && (
                  <span className="shrink-0 text-xs text-gray-500">
                    {format(text.out, locale, { n: hof.out })}
                  </span>
                )}
                <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
};

/** Anybody who has logged in once, found by name as the server searches. */
const PersonChoice: React.FC<{ onPick: (start: BasketStart) => void }> = ({ onPick }) => {
  const locale = useMaterialLocale();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const people = trpc.material.searchPersonList.useQuery(
    { query: debounced },
    { ...materialQueryOptions, enabled: debounced !== '' },
  );
  return (
    <div className="space-y-2">
      <SearchField value={query} onChange={setQuery} placeholder={text.searchPerson[locale]} />
      <Panel>
        {debounced === '' && <EmptyState text={text.typeName[locale]} />}
        {debounced !== '' && people.isLoading && <LoadingState text={labels.loading[locale]} />}
        {debounced !== '' && people.data?.length === 0 && (
          <EmptyState text={labels.empty[locale]} />
        )}
        <ul className="divide-y divide-gray-100">
          {debounced !== '' &&
            people.data?.map((person) => (
              <li key={person.uuid}>
                <button
                  type="button"
                  className={pickButton}
                  onClick={() =>
                    onPick({ holder: { kind: 'PERSON', id: person.uuid, name: person.name } })
                  }
                >
                  <HolderAvatar name={person.name} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">
                    {person.name}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
                </button>
              </li>
            ))}
        </ul>
      </Panel>
    </div>
  );
};

/**
 * The hand-out screen. On top, the pickups the material team prepared for today, each out in
 * one tap or adjusted in the basket; below, a new hand-out starts by choosing whom it goes to.
 * The basket opens as its own history entry, so the back gesture closes it.
 */
export const HandOutView: React.FC = () => {
  const locale = useMaterialLocale();
  const history = useSearchHistory();
  const basketOpen = useSearchParams().get('korb') !== null;
  const [start, setStart] = useState<BasketStart | undefined>();
  const [kind, setKind] = useState<'HOF' | 'PERSON'>('HOF');

  const open = (next: BasketStart): void => {
    setStart(next);
    history.open('korb=1');
  };

  if (basketOpen && start !== undefined) {
    return (
      <BasketEditor key={JSON.stringify(start.holder)} start={start} onClose={history.close} />
    );
  }

  return (
    <div className="space-y-6">
      <PreparedPickups onAdjust={(group) => open(basketStart(group, locale))} />
      <section className="space-y-3">
        <SectionTitle>{text.newHandOut[locale]}</SectionTitle>
        <Segmented
          label={text.whom[locale]}
          value={kind}
          onChange={setKind}
          options={[
            { value: 'HOF', label: labels.hof[locale], icon: <Building2 aria-hidden /> },
            { value: 'PERSON', label: labels.person[locale], icon: <User aria-hidden /> },
          ]}
        />
        {kind === 'HOF' ? <HofChoice onPick={open} /> : <PersonChoice onPick={open} />}
      </section>
    </div>
  );
};
