'use client';

import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const formatDate = (date: Date): string => date.toISOString().split('T')[0] ?? '';

export const useSchedule = (
  scheduleEntries: CampScheduleEntryFrontendType[],
): {
  currentDate: Date;
  formattedDate: string;
  allDates: Date[];
  currentProgram: CampScheduleEntryFrontendType[];
  hasProgram: boolean;
  expandedEntries: Set<string>;
  starredEntries: Set<string>;
  carouselStartIndex: number;
  maxVisibleDays: number;
  actions: {
    handleCarouselPrevious: () => void;
    handleCarouselNext: () => void;
    handleDateSelect: (date: Date) => void;
    toggleExpanded: (entryId: string) => void;
    toggleStarred: (entryId: string) => void;
  };
} => {
  const router = useRouter();
  const searchParameters = useSearchParams();

  const [currentDate, setCurrentDate] = useState(() => {
    const dateParameter = searchParameters.get('date');
    if (dateParameter != undefined) {
      const parsedDate = new Date(dateParameter);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    return new Date(); // Default to today if no valid URL param
  });

  const [expandedEntries, setExpandedEntries] = useState(new Set<string>());
  const [starredEntries, setStarredEntries] = useState(new Set<string>());
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  // Memoize the extraction and sorting of all unique dates
  const allDates = useMemo(() => {
    const uniqueDates = new Map<string, Date>();
    for (const entry of scheduleEntries) {
      const date = new Date(entry.timeslot.date);
      uniqueDates.set(date.toDateString(), date);
    }
    return [...uniqueDates.values()].sort((a, b) => a.getTime() - b.getTime());
  }, [scheduleEntries]);

  // Effect to update the URL when currentDate changes
  useEffect(() => {
    const currentUrlDate = searchParameters.get('date');
    const formattedCurrentDate = formatDate(currentDate);

    // Only update URL if currentDate is different from the one in searchParams
    // This prevents unnecessary router.replace calls and potential infinite loops
    if (currentUrlDate !== formattedCurrentDate) {
      const currentPathname = globalThis.location.pathname;
      const parameters = new URLSearchParams(searchParameters.toString());
      parameters.set('date', formattedCurrentDate);
      router.replace(`${currentPathname}?${parameters.toString()}`);
    }
  }, [currentDate, router, searchParameters]);

  // Memoize the program data grouped by date string
  const dailyPrograms = useMemo(() => {
    const programs: { [id: string]: CampScheduleEntryFrontendType[] } = {};
    // Initialize programs for all known dates to ensure empty arrays for dates without entries
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

  const maxVisibleDays = 5;
  const formattedDate = formatDate(currentDate);
  const currentProgram = dailyPrograms[formattedDate] ?? [];

  const handleCarouselPrevious = (): void =>
    setCarouselStartIndex((previous) => Math.max(0, previous - 1));

  const handleCarouselNext = (): void =>
    setCarouselStartIndex((previous) => Math.min(previous + 1, allDates.length - maxVisibleDays));

  const handleDateSelect = (date: Date): void => {
    setCurrentDate(date);
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

  useEffect(() => {
    if (allDates.length === 0) {
      // If there are no schedule entries, we can't validate the date against them.
      // The initial date from URL or today will remain as set by useState.
      return;
    }

    const formattedCurrentDate = formatDate(currentDate);
    const isCurrentDateInAllDates = allDates.some((d) => formatDate(d) === formattedCurrentDate);

    if (!isCurrentDateInAllDates) {
      // If the current date (from URL or initial new Date()) is not in allDates,
      // try to find today's date in allDates, or fall back to the first available date.
      const todayString = new Date().toDateString();
      const todayMatch = allDates.find((d) => d.toDateString() === todayString);
      setCurrentDate(todayMatch ?? allDates[0] ?? new Date());
    }
    // If isCurrentDateInAllDates is true, currentDate is already valid, no change needed.
  }, [allDates, currentDate]); // currentDate is a dependency here because we are checking its validity against allDates

  return {
    currentDate,
    formattedDate,
    allDates,
    currentProgram,
    hasProgram: currentProgram.length > 0,
    expandedEntries,
    starredEntries,
    carouselStartIndex,
    maxVisibleDays,
    actions: {
      handleCarouselPrevious,
      handleCarouselNext,
      handleDateSelect,
      toggleExpanded,
      toggleStarred,
    },
  };
};
