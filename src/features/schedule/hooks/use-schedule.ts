'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

const formatDate = (date: Date): string => date.toISOString().split('T')[0] ?? '';

export const useSchedule = <T extends { timeslot: { date: string } }>(
  scheduleEntries: T[],
): {
  currentDate: Date;
  formattedDate: string;
  allDates: Date[];
  currentProgram: T[];
  hasProgram: boolean;
  expandedEntries: Set<string>;
  starredEntries: Set<string>;
  actions: {
    handleDateSelect: (date: Date) => void;
    toggleExpanded: (entryId: string) => void;
    toggleStarred: (entryId: string) => void;
  };
} => {
  const searchParameters = useSearchParams();

  const pathname = usePathname();

  const allDates = useMemo(() => {
    const uniqueDates = new Map<string, Date>();
    for (const entry of scheduleEntries) {
      const date = new Date(entry.timeslot.date);
      uniqueDates.set(date.toDateString(), date);
    }
    return [...uniqueDates.values()].sort((a, b) => a.getTime() - b.getTime());
  }, [scheduleEntries]);

  const validatedInitialDate = useMemo(() => {
    const dateParameter = searchParameters.get('date');
    let dateToValidate: Date = new Date(); // Default to today

    if (dateParameter != undefined) {
      const parsedDate = new Date(dateParameter);
      if (!Number.isNaN(parsedDate.getTime())) {
        dateToValidate = parsedDate;
      }
    }

    if (allDates.length > 0) {
      const formattedDateToValidate = formatDate(dateToValidate);
      const isDateValid = allDates.some((d) => formatDate(d) === formattedDateToValidate);

      if (isDateValid) {
        return dateToValidate;
      }

      const todayString = new Date().toDateString();
      const todayMatch = allDates.find((d) => d.toDateString() === todayString);

      return todayMatch ?? allDates[0] ?? dateToValidate;
    }

    return dateToValidate;
  }, [allDates, searchParameters]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const currentDate = useMemo(() => {
    if (selectedDate !== undefined && allDates.length > 0) {
      const formattedSelected = formatDate(selectedDate);
      const isSelectedValid = allDates.some((d) => formatDate(d) === formattedSelected);
      if (isSelectedValid) {
        return selectedDate;
      }
    }
    return validatedInitialDate;
  }, [selectedDate, allDates, validatedInitialDate]);

  const [expandedEntries, setExpandedEntries] = useState(new Set<string>());
  const [starredEntries, setStarredEntries] = useState(new Set<string>());

  const dailyPrograms = useMemo(() => {
    const programs: Record<string, T[]> = {};
    for (const date of allDates) {
      programs[formatDate(date)] = [];
    }
    for (const entry of scheduleEntries) {
      const dateString = formatDate(new Date(entry.timeslot.date));
      if (programs[dateString]) {
        // Ensure the date exists in allDates
        programs[dateString].push(entry);
      }
    }
    return programs;
  }, [allDates, scheduleEntries]);

  const formattedDate = formatDate(currentDate);
  const currentProgram = dailyPrograms[formattedDate] ?? [];

  const handleDateSelect = (date: Date): void => {
    setSelectedDate(date);
    // The chosen day goes into the address, so back from a block and a reload return to it. Only
    // here, on the tap: written from an effect once the programme had loaded, it cancelled a tab
    // the user had tapped meanwhile. Only the address changes, so it is no navigation.
    const parameters = new URLSearchParams(globalThis.location.search);
    parameters.set('date', formatDate(date));
    globalThis.history.replaceState(undefined, '', `${pathname}?${parameters.toString()}`);
    setExpandedEntries(new Set()); // Reset expanded state on date change
  };

  const toggleExpanded = (entryId: string): void => {
    setExpandedEntries((previous) => {
      const newSet = new Set(previous);
      if (newSet.has(entryId)) newSet.delete(entryId);
      else newSet.add(entryId);
      return newSet;
    });
  };

  const toggleStarred = (entryId: string): void => {
    setStarredEntries((previous) => {
      const newSet = new Set(previous);
      if (newSet.has(entryId)) newSet.delete(entryId);
      else newSet.add(entryId);
      return newSet;
    });
  };

  return {
    currentDate,
    formattedDate,
    allDates,
    currentProgram,
    hasProgram: currentProgram.length > 0,
    expandedEntries,
    starredEntries,
    actions: {
      handleDateSelect,
      toggleExpanded,
      toggleStarred,
    },
  };
};
