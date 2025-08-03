import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
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
  const [currentDate, setCurrentDate] = useState(new Date('2025-02-23'));
  const [expandedEntries, setExpandedEntries] = useState(new Set<string>());
  const [starredEntries, setStarredEntries] = useState(new Set<string>());
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  // Memoize the extraction and sorting of all unique dates
  const allDates = useMemo(() => {
    const uniqueDates = new Map<string, Date>();
    for (const date of scheduleEntries
      .flatMap((entry) => entry.timeslots)
      .map((timeslot) => new Date(timeslot.date))
      .sort((a, b) => a.getTime() - b.getTime())) {
      uniqueDates.set(date.toDateString(), date);
    }
    return [...uniqueDates.values()];
  }, [scheduleEntries]);

  // Effect to set the initial date to today or the first available date
  useEffect(() => {
    if (allDates.length === 0) return;
    const todayString = new Date().toDateString();
    const todayMatch = allDates.find((d) => d.toDateString() === todayString);
    setCurrentDate(todayMatch ?? allDates[0] ?? new Date());
  }, [allDates]);

  // Memoize the program data grouped by date string
  const dailyPrograms = useMemo(() => {
    const programs: { [id: string]: CampScheduleEntryFrontendType[] } = {};
    for (const date of allDates) {
      const dateString = formatDate(date);
      programs[dateString] = scheduleEntries.filter((entry) =>
        entry.timeslots.some((timeslot) => formatDate(new Date(timeslot.date)) === dateString),
      );
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
