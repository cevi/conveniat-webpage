'use client';

import { Button } from '@/components/ui/buttons/button';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { dailyPrograms } from '@/features/schedule/data/daily-programs';
import type { ProgramEntry } from '@/features/schedule/types/program';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useMemo, useState } from 'react';

export const ScheduleComponent: React.FC = () => {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date('2025-02-23'));
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0] ?? '';
  };

  const formattedDate = formatDate(currentDate);

  // Get all available dates and sort them
  const allDates = useMemo(() => {
    return Object.keys(dailyPrograms)
      .map((dateString) => new Date(dateString))
      .sort((a, b) => a.getTime() - b.getTime());
  }, []);

  const maxVisibleDays = 5;
  const currentDateIndex = allDates.findIndex((date) => formatDate(date) === formattedDate);

  // Calculate visible dates for carousel
  const visibleDates = useMemo(() => {
    const startIndex = Math.max(0, Math.min(carouselStartIndex, allDates.length - maxVisibleDays));
    return allDates.slice(startIndex, startIndex + maxVisibleDays);
  }, [allDates, carouselStartIndex]);

  const handlePreviousDay = (): void => {
    const currentIndex = allDates.findIndex((date) => formatDate(date) === formattedDate);
    if (currentIndex > 0) {
      const newDate = allDates[currentIndex - 1];
      if (!newDate) return;

      setCurrentDate(newDate);
      setExpandedEntries(new Set());

      // Adjust carousel if needed
      if (currentIndex - 1 < carouselStartIndex) {
        setCarouselStartIndex(Math.max(0, carouselStartIndex - 1));
      }
    }
  };

  const handleNextDay = (): void => {
    const currentIndex = allDates.findIndex((date) => formatDate(date) === formattedDate);
    if (currentIndex < allDates.length - 1) {
      const newDate = allDates[currentIndex + 1];
      if (!newDate) return;

      setCurrentDate(newDate);
      setExpandedEntries(new Set());

      // Adjust carousel if needed
      if (currentIndex + 1 >= carouselStartIndex + maxVisibleDays) {
        setCarouselStartIndex(Math.min(allDates.length - maxVisibleDays, carouselStartIndex + 1));
      }
    }
  };

  const handleCarouselPrevious = (): void => {
    if (carouselStartIndex > 0) {
      setCarouselStartIndex(carouselStartIndex - 1);
    }
  };

  const handleCarouselNext = (): void => {
    if (carouselStartIndex < allDates.length - maxVisibleDays) {
      setCarouselStartIndex(carouselStartIndex + 1);
    }
  };

  const handleDateSelect = (date: Date): void => {
    setCurrentDate(date);
    setExpandedEntries(new Set());
  };

  const toggleExpanded = (entryId: number): void => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const handleReadMore = (entryId: number): void => {
    router.push(`/app/schedule/${entryId}`);
  };

  const handleMapClick = (entry: ProgramEntry): void => {
    if (entry.locationId) {
      router.push(`/app/map?locationId=${entry.locationId}`);
    }
  };

  const currentProgram = dailyPrograms[formattedDate] || [];
  const hasProgram = currentProgram.length > 0;

  return (
    <article className="mx-auto my-8 w-full max-w-2xl overflow-hidden px-4">
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1 text-center">
            <HeadlineH1 className="mb-2">
              Program for{' '}
              {currentDate.toLocaleDateString('de-CH', {
                weekday: 'long',
                month: 'numeric',
                day: 'numeric',
              })}
            </HeadlineH1>
          </div>
        </div>

        {/* Date carousel selector */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            {/* Carousel left arrow */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCarouselPrevious}
              disabled={carouselStartIndex <= 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>

            {/* Date buttons */}
            <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
              {visibleDates.map((date) => {
                const dateString = formatDate(date);
                const isSelected = formattedDate === dateString;
                return (
                  <button
                    key={dateString}
                    onClick={() => handleDateSelect(date)}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {date.toLocaleDateString('de-CH', {
                      weekday: 'short',
                      day: 'numeric',
                    })}
                  </button>
                );
              })}
            </div>

            {/* Carousel right arrow */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCarouselNext}
              disabled={carouselStartIndex >= allDates.length - maxVisibleDays}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Program content or placeholder */}
      {hasProgram ? (
        <div className="space-y-4">
          {currentProgram.map((entry) => {
            const isExpanded = expandedEntries.has(entry.id);
            return (
              <div
                key={entry.id}
                className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="mb-2 text-lg font-semibold">{entry.title}</h3>
                      <div className="mb-3 flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>{entry.time}</span>
                        <div className="flex items-center">
                          <MapPin className="mr-1 h-3 w-3" />
                          <button
                            onClick={() => handleMapClick(entry)}
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {entry.location}
                          </button>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(entry.id)}
                      className="ml-2"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="mb-4 text-gray-700">{entry.details}</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReadMore(entry.id)}
                          size="sm"
                          className="flex items-center"
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Read More
                        </Button>
                        {entry.locationId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMapClick(entry)}
                            className="flex items-center"
                          >
                            <MapPin className="mr-1 h-3 w-3" />
                            View on Map
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
          <Calendar className="mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Program Available</h3>
          <p className="text-center text-gray-600">
            There are no scheduled events for{' '}
            {currentDate.toLocaleDateString('de-CH', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
            .
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Check other dates or come back later for updates.
          </p>
        </div>
      )}
    </article>
  );
};
