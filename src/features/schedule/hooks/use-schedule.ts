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

  const [currentDate, setCurrentDate] = useState(validatedInitialDate);

  const [expandedEntries, setExpandedEntries] = useState(new Set<string>());
  const [starredEntries, setStarredEntries] = useState(new Set<string>());
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  useEffect(() => {
    const currentUrlDate = searchParameters.get('date');
    const formattedCurrentDate = formatDate(currentDate);

    if (currentUrlDate !== formattedCurrentDate) {
      const currentPathname = globalThis.location.pathname;
      const parameters = new URLSearchParams(searchParameters.toString());
      parameters.set('date', formattedCurrentDate);
      router.replace(`${currentPathname}?${parameters.toString()}`);
    }
  }, [currentDate, router, searchParameters]);

  const dailyPrograms = useMemo(() => {
    const programs: { [id: string]: CampScheduleEntryFrontendType[] } = {};
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
