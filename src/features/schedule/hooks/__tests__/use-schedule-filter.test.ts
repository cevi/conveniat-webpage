/**
 * @jest-environment jsdom
 */

import { useScheduleFilters } from '@/features/schedule/hooks/use-schedule-filter';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import {
  activeFilterCount,
  noFilters,
  showEntriesLabel,
} from '@/features/schedule/utils/schedule-filters';
import { act, renderHook } from '@testing-library/react';

// the lexical plaintext export is ESM only; these entries have no description to search
jest.mock('@payloadcms/richtext-lexical/plaintext', () => ({
  convertLexicalToPlaintext: (): string => '',
}));

const entry = (
  title: string,
  time: string,
  kind?: CampScheduleEntryFrontendType['kind'],
): CampScheduleEntryFrontendType =>
  ({
    id: title,
    title,
    timeslot: { date: '2027-07-24T12:00:00.000Z', time },
    kind,
    // eslint-disable-next-line unicorn/no-null
    location: null,
  }) as CampScheduleEntryFrontendType;

const day = [
  entry('Anreise', '08:30 - 12:30', 'fixpoint'),
  entry('Essen unterwegs', '12:30 - 13:30', 'meal'),
  entry('Ballspiele', '17:00 - 17:30'),
  entry('Verschiebung', '17:30 - 17:45', 'transfer'),
  entry('Freies Spiel', '18:15 - 19:30'),
];

const titlesOf = (entries: CampScheduleEntryFrontendType[]): string[] =>
  entries.map(({ title }) => title);

describe('useScheduleFilters', () => {
  beforeEach(() => globalThis.localStorage.clear());

  it('shows Anreise and the meals by default, and hides every logistics entry when asked', () => {
    const { result } = renderHook(() => useScheduleFilters(day, new Set()));
    expect(result.current.filteredEntries).toHaveLength(5);
    expect(result.current.hasActiveFilters).toBe(false);

    act(() => result.current.handleFiltersChange({ ...noFilters, showLogistics: false }));

    expect(titlesOf(result.current.filteredEntries)).toEqual(['Ballspiele', 'Freies Spiel']);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('remembers hidden logistics the next time the programme opens, until reset', () => {
    const first = renderHook(() => useScheduleFilters(day, new Set()));
    act(() => first.result.current.handleFiltersChange({ ...noFilters, showLogistics: false }));
    first.unmount();

    const { result } = renderHook(() => useScheduleFilters(day, new Set()));
    expect(result.current.filters.showLogistics).toBe(false);

    act(() => result.current.clearFilters());
    expect(result.current.filters.showLogistics).toBe(true);
    expect(result.current.filteredEntries).toHaveLength(5);
  });

  it('keeps only the blocks with a part for Leitende, and counts it as a filter', () => {
    const withNotes = [
      { ...entry('Ballspiele', '17:00 - 17:30'), hasLeaderSection: true },
      { ...entry('Freies Spiel', '18:15 - 19:30'), hasLeaderSection: false },
      // a copy from before the flag existed
      entry('Rollenspiel', '20:00 - 20:15'),
    ];
    const { result } = renderHook(() => useScheduleFilters(withNotes, new Set()));

    act(() => result.current.handleFiltersChange({ ...noFilters, leadersOnly: true }));

    expect(titlesOf(result.current.filteredEntries)).toEqual(['Ballspiele']);
    expect(result.current.hasActiveFilters).toBe(true);
    expect(activeFilterCount(result.current.filters)).toBe(1);
  });

  it('keeps the entries that start in the chosen parts of the day', () => {
    const { result } = renderHook(() => useScheduleFilters(day, new Set()));

    act(() => result.current.handleFiltersChange({ ...noFilters, timesOfDay: ['evening'] }));
    expect(titlesOf(result.current.filteredEntries)).toEqual(['Freies Spiel']);

    act(() =>
      result.current.handleFiltersChange({ ...noFilters, timesOfDay: ['morning', 'evening'] }),
    );
    expect(titlesOf(result.current.filteredEntries)).toEqual(['Anreise', 'Freies Spiel']);
  });
});

describe('showEntriesLabel', () => {
  it('counts what the filters leave, in the singular for one', () => {
    expect(showEntriesLabel(2, 'de')).toBe('2 Einträge anzeigen');
    expect(showEntriesLabel(1, 'de')).toBe('1 Eintrag anzeigen');
    expect(showEntriesLabel(0, 'de')).toBe('0 Einträge anzeigen');
    expect(showEntriesLabel(1, 'fr')).toBe('Afficher 1 entrée');
    expect(showEntriesLabel(3, 'en')).toBe('Show 3 entries');
  });
});
