'use client';

import { Button } from '@/components/ui/buttons/button';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { dailyPrograms } from '@/features/schedule/data/daily-programs';
import type { ProgramEntry } from '@/features/schedule/types/program';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

export const ScheduleComponent: React.FC = () => {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date('2025-02-23'));
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0] ?? '';
  };

  const formattedDate = formatDate(currentDate);
  const minDate = new Date('2025-02-22');
  const maxDate = new Date('2025-02-24');

  const handlePreviousDay = (): void => {
    const previousDay = new Date(currentDate);
    previousDay.setDate(currentDate.getDate() - 1);
    if (previousDay >= minDate) {
      setCurrentDate(previousDay);
      setExpandedEntries(new Set());
    }
  };

  const handleNextDay = (): void => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(currentDate.getDate() + 1);
    if (nextDay <= maxDate) {
      setCurrentDate(nextDay);
      setExpandedEntries(new Set());
    }
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

  return (
    <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
      <div className="mb-6 flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousDay}
          disabled={currentDate.getTime() <= minDate.getTime()}
          className="mr-4"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <HeadlineH1 className="mx-4 text-center">
          Program for{' '}
          {currentDate.toLocaleDateString('de-CH', {
            weekday: 'long',
            month: 'numeric',
            day: 'numeric',
          })}
        </HeadlineH1>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextDay}
          disabled={currentDate.getTime() >= maxDate.getTime()}
          className="ml-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {dailyPrograms[formattedDate]?.map((entry) => {
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
                        More Info
                      </Button>

                      {entry.locationId !== undefined && (
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
    </article>
  );
};
