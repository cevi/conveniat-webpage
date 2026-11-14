'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { ChatLinkButton } from '@/components/ui/buttons/chat-link-button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SectionLabel } from '@/components/ui/section-label';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { toast } from '@/components/ui/toast';
import type { ShiftRoster as Roster, RosterEntry } from '@/features/schedule/api/shift-roster';
import { scheduleErrorTexts } from '@/features/schedule/error-texts';
import { useNow } from '@/features/schedule/hooks/use-now';
import { useShiftStatus } from '@/features/schedule/hooks/use-shift-status';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, MessagesSquare, UserPlus, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

type Mark = 'PRESENT' | 'ABSENT';
type Filter = 'all' | Mark | 'open';

const texts = {
  title: { de: 'Helfende', en: 'Helpers', fr: 'Helpers' },
  all: { de: 'Alle', en: 'All', fr: 'Tous' },
  present: { de: 'Da', en: 'There', fr: 'Présents' },
  absent: { de: 'Fehlt', en: 'Missing', fr: 'Absents' },
  open: { de: 'Offen', en: 'Open', fr: 'Ouverts' },
  markPresent: { de: '{name} ist da', en: '{name} is there', fr: '{name} est là' },
  markAbsent: { de: '{name} fehlt', en: '{name} is missing', fr: '{name} est absent' },
  addedOnSite: { de: 'vor Ort hinzugefügt', en: 'added on site', fr: 'ajouté sur place' },
  noHof: { de: 'ohne Hof', en: 'no Hof', fr: 'sans Hof' },
  notYet: {
    de: 'Ab 30 Minuten vor Beginn trägst du hier ein, wer da ist.',
    en: 'From 30 minutes before the start you mark here who is there.',
    fr: 'Dès 30 minutes avant le début, tu notes ici qui est là.',
  },
  closed: {
    de: 'Eintragen ist geschlossen. Korrekturen macht der Helferpool.',
    en: 'Marking is closed. The Helferpool makes corrections.',
    fr: 'La saisie est fermée. Le Helferpool fait les corrections.',
  },
  pending: { de: 'wird gesendet', en: 'sending', fr: 'envoi en cours' },
  empty: {
    de: 'Noch niemand angemeldet.',
    en: 'Nobody enrolled yet.',
    fr: 'Personne n’est encore inscrit.',
  },
  addPerson: { de: 'Person hinzufügen', en: 'Add a person', fr: 'Ajouter une personne' },
  addTitle: {
    de: 'Wer ist ohne Anmeldung gekommen?',
    en: 'Who came without enrolling?',
    fr: 'Qui est venu sans inscription ?',
  },
  search: { de: 'Name suchen', en: 'Search a name', fr: 'Chercher un nom' },
  add: { de: 'Hinzufügen', en: 'Add', fr: 'Ajouter' },
  nobodyFound: { de: 'Niemand gefunden.', en: 'Nobody found.', fr: 'Personne trouvée.' },
  groupChat: { de: 'Gruppenchat', en: 'Group chat', fr: 'Chat de groupe' },
  chat: { de: 'Chat', en: 'Chat', fr: 'Chat' },
} satisfies Record<string, StaticTranslationString>;

const fill = (text: string, name: string): string => text.replace('{name}', name);

const filterOf = (entry: RosterEntry): Mark | 'open' => entry.attendance ?? 'open';

/**
 * The roster of a Schichteinsatz for its Schichtleitung: who comes, from which Hof, and from 30
 * minutes before the start until a day after the end, who came. A ✓ or ✗ per row sets the mark,
 * a second tap on the same one clears it. Marks queue while offline and show as being sent.
 */
export const ShiftRoster: React.FC<{
  shift: { id: string; title: string };
  locale: Locale;
}> = ({ shift, locale }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const now = useNow();
  const { status } = useShiftStatus(shift.id);
  const isLead = status?.isOrganiser === true && status.hideList !== true;
  const [filter, setFilter] = useState<Filter>('all');
  const [person, setPerson] = useState<RosterEntry | undefined>();
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState('');

  const rosterOptions = trpc.shifts.getShiftRoster.queryOptions(
    { shiftId: shift.id },
    { enabled: isLead },
  );
  const { data } = useQuery(rosterOptions);
  // a persisted cache from an older build may hold another shape
  const roster: Roster | undefined = data;
  const entries = Array.isArray(roster?.entries) ? roster.entries : [];

  const window = roster?.window;
  const isOpen =
    window !== undefined && now >= new Date(window.opensAt) && now <= new Date(window.closesAt);
  const canMark = roster?.canMarkAnyTime === true || isOpen;

  const refresh = (): void => {
    void queryClient.invalidateQueries(trpc.shifts.getShiftRoster.pathFilter());
    // a walk-in takes a place, which the capacity above shows
    void queryClient.invalidateQueries(trpc.shifts.getShiftStatus.pathFilter());
  };
  const failed = (error: unknown): void => {
    toast.error(userErrorMessage(error, locale, scheduleErrorTexts));
    refresh();
  };

  const mark = useMutation(
    trpc.shifts.setShiftAttendance.mutationOptions({
      // the mark shows at once, and stays while it waits for a connection
      onMutate: async ({ userId, attendance }) => {
        await queryClient.cancelQueries(rosterOptions);
        queryClient.setQueryData(rosterOptions.queryKey, (current) =>
          current === undefined
            ? current
            : {
                ...current,
                entries: current.entries.map((entry) =>
                  entry.userId === userId ? { ...entry, attendance } : entry,
                ),
              },
        );
      },
      onError: failed,
      onSettled: refresh,
    }),
  );
  const pendingFor = mark.isPaused ? mark.variables?.userId : undefined;

  const addWalkIn = useMutation(
    trpc.shifts.addShiftWalkIn.mutationOptions({
      onSuccess: () => {
        setIsAdding(false);
        setQuery('');
      },
      onError: failed,
      onSettled: refresh,
    }),
  );
  const { data: candidates } = useQuery(
    trpc.shifts.searchWalkInCandidates.queryOptions(
      { shiftId: shift.id, query },
      { enabled: isAdding && query.trim().length >= 2 },
    ),
  );
  const onRoster = new Set(entries.map((entry) => entry.userId));
  const found = (Array.isArray(candidates) ? candidates : []).filter(
    (candidate) => !onRoster.has(candidate.userId),
  );

  const openChat = useMutation(
    trpc.schedule.openShiftChat.mutationOptions({
      onSuccess: ({ chatId }) => globalThis.location.assign(`/app/chat/${chatId}`),
      onError: failed,
    }),
  );

  if (!isLead) return <></>;

  const counts: Record<Filter, number> = {
    all: entries.length,
    PRESENT: entries.filter((entry) => entry.attendance === 'PRESENT').length,
    ABSENT: entries.filter((entry) => entry.attendance === 'ABSENT').length,
    open: entries.filter((entry) => entry.attendance === null).length,
  };
  const shown = filter === 'all' ? entries : entries.filter((entry) => filterOf(entry) === filter);
  const segments: { key: Filter; label: string }[] = [
    { key: 'all', label: texts.all[locale] },
    { key: 'PRESENT', label: texts.present[locale] },
    { key: 'ABSENT', label: texts.absent[locale] },
    { key: 'open', label: texts.open[locale] },
  ];

  const markButton = (entry: RosterEntry, value: Mark): React.ReactElement => {
    const isSet = entry.attendance === value;
    return (
      <button
        type="button"
        aria-pressed={isSet}
        aria-label={fill(
          (value === 'PRESENT' ? texts.markPresent : texts.markAbsent)[locale],
          entry.name,
        )}
        onClick={() =>
          mark.mutate({ shiftId: shift.id, userId: entry.userId, attendance: isSet ? null : value })
        }
        className={cn(
          'focus-visible:focus-surface flex size-11 shrink-0 items-center justify-center rounded-xl border',
          !isSet && 'border-line bg-white text-green-700',
          isSet && value === 'PRESENT' && 'bg-conveniat-green border-conveniat-green text-white',
          isSet && value === 'ABSENT' && 'border-danger-line bg-danger-soft text-danger-text',
        )}
      >
        {value === 'PRESENT' ? (
          <Check className="h-5 w-5" aria-hidden="true" />
        ) : (
          <X className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    );
  };

  let windowHint: string | undefined;
  if (!canMark) {
    windowHint =
      window !== undefined && now > new Date(window.closesAt)
        ? texts.closed[locale]
        : texts.notYet[locale];
  }

  return (
    <section>
      <SectionLabel>{`${texts.title[locale]} (${String(entries.length)})`}</SectionLabel>

      {entries.length > 0 && (
        <div className={cn(segmentedTrackClassName, 'mt-2')} role="group">
          {segments.map((segment) => (
            <button
              key={segment.key}
              type="button"
              aria-pressed={filter === segment.key}
              onClick={() => setFilter(segment.key)}
              className={cn(
                segmentClassName(filter === segment.key),
                'flex-1 text-[14px] font-semibold',
              )}
            >
              {segment.label} {counts[segment.key]}
            </button>
          ))}
        </div>
      )}

      {windowHint !== undefined && (
        <p className="bg-quiet mt-2 rounded-[14px] px-3.5 py-2.5 text-[13.5px] text-green-700">
          {windowHint}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="mt-2 text-[15px] text-green-700">{texts.empty[locale]}</p>
      ) : (
        <ul className="border-line divide-line mt-2 divide-y overflow-hidden rounded-[14px] border bg-white">
          {shown.map((entry) => (
            <li key={entry.userId} className="flex items-center gap-3 px-3.5 py-2.5">
              <button
                type="button"
                onClick={() => setPerson(entry)}
                className="focus-visible:focus-row flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
              >
                <PersonAvatar
                  seed={entry.userId}
                  name={entry.name}
                  className="size-9 text-[13px]"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-heading text-[15px] leading-5 font-semibold break-words">
                    {entry.name}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-green-700">
                    <span className="bg-chip rounded-[5px] px-1.5 text-[12px] font-semibold text-green-800">
                      {entry.hofName ?? texts.noHof[locale]}
                    </span>
                    {entry.addedOnSite && <span>{texts.addedOnSite[locale]}</span>}
                    {pendingFor === entry.userId && (
                      <span className="text-green-500">{texts.pending[locale]}</span>
                    )}
                  </span>
                </span>
              </button>
              {canMark && (
                <span className="flex gap-1.5">
                  {markButton(entry, 'PRESENT')}
                  {markButton(entry, 'ABSENT')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {canMark && (
          <Button
            variant="outlined"
            size="touch"
            className="min-w-fit flex-1"
            onClick={() => setIsAdding(true)}
          >
            <UserPlus aria-hidden="true" />
            {texts.addPerson[locale]}
          </Button>
        )}
        <Button
          variant="outlined"
          size="touch"
          className="min-w-fit flex-1"
          disabled={openChat.isPending}
          onClick={() => openChat.mutate({ shiftId: shift.id, chatName: shift.title })}
        >
          {openChat.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <MessagesSquare aria-hidden="true" />
          )}
          {texts.groupChat[locale]}
        </Button>
      </div>

      <BottomSheet
        open={person !== undefined}
        onOpenChange={(open) => {
          if (!open) setPerson(undefined);
        }}
        title={person?.name ?? ''}
        {...(person?.hofName ? { description: person.hofName } : {})}
      >
        {person !== undefined && (
          <ChatLinkButton
            userId={person.userId}
            label={texts.chat[locale]}
            className="h-11 w-full"
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={isAdding}
        onOpenChange={setIsAdding}
        title={texts.addTitle[locale]}
        fullHeight
      >
        <AppSearchBar
          placeholder={texts.search[locale]}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery('')}
          autoFocus
        />
        {query.trim().length >= 2 && found.length === 0 && (
          <p className="mt-3 text-[15px] text-green-700">{texts.nobodyFound[locale]}</p>
        )}
        <ul className="divide-line mt-2 divide-y">
          {found.map((candidate) => (
            <li key={candidate.userId} className="flex items-center gap-3 py-2">
              <PersonAvatar
                seed={candidate.userId}
                name={candidate.name}
                className="size-9 text-[13px]"
              />
              <span className="text-heading min-w-0 flex-1 truncate text-[15px] font-semibold">
                {candidate.name}
              </span>
              <Button
                variant="outlined"
                size="touch"
                disabled={addWalkIn.isPending}
                onClick={() => addWalkIn.mutate({ shiftId: shift.id, userId: candidate.userId })}
              >
                {texts.add[locale]}
              </Button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </section>
  );
};
