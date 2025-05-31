'use client';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import React, { useState } from 'react';

interface ProgramEntry {
  id: number;
  title: string;
  time: string;
  location: string;
  details: string;
}

const dailyPrograms: { [key: string]: ProgramEntry[] } = {
  '2025-02-22': [
    {
      id: 1,
      title: 'Arrival & Check-in',
      time: '14:00 - 16:00',
      location: 'Main Hall',
      details: 'Check-in and get settled.',
    },
    {
      id: 2,
      title: 'Welcome Dinner',
      time: '18:00 - 20:00',
      location: 'Dining Hall',
      details: 'Welcome dinner and introductions.',
    },
  ],
  '2025-02-23': [
    {
      id: 3,
      title: 'Morning Yoga',
      time: '08:00 - 09:00',
      location: 'Yoga Studio',
      details: 'Start the day with a relaxing yoga session.',
    },
    {
      id: 4,
      title: 'Workshop: Coding Basics',
      time: '10:00 - 12:00',
      location: 'Classroom 1',
      details: 'Introduction to coding fundamentals.',
    },
    {
      id: 5,
      title: 'Lunch Break',
      time: '12:00 - 13:00',
      location: 'Dining Hall',
      details: 'Lunch break.',
    },
    {
      id: 6,
      title: 'Workshop: Advanced React',
      time: '13:00 - 15:00',
      location: 'Classroom 2',
      details: 'Dive deeper into React concepts.',
    },
    {
      id: 7,
      title: 'Free Time / Networking',
      time: '15:00 - 17:00',
      location: 'Common Area',
      details: 'Relax, network, and socialize.',
    },
    {
      id: 8,
      title: 'Evening Presentation',
      time: '19:00 - 20:30',
      location: 'Main Hall',
      details: 'Guest speaker presentation.',
    },
  ],
  '2025-02-24': [
    {
      id: 9,
      title: 'Breakfast',
      time: '08:00 - 09:00',
      location: 'Dining Hall',
      details: 'Breakfast.',
    },
    {
      id: 10,
      title: 'Hiking Trip',
      time: '10:00 - 14:00',
      location: 'Local Trails',
      details: 'Enjoy a scenic hike.',
    },
    {
      id: 11,
      title: 'Departure',
      time: '14:00 - 16:00',
      location: 'Main Hall',
      details: 'Check-out and departure.',
    },
  ],
};

export const ScheduleComponent: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date('2025-02-23'));
  const [selectedEntry, setSelectedEntry] = useState<ProgramEntry | undefined>();

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
    }
  };

  const handleNextDay = (): void => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(currentDate.getDate() + 1);
    if (nextDay <= maxDate) {
      setCurrentDate(nextDay);
    }
  };

  const handleEntryClick = (entry: ProgramEntry): void => {
    setSelectedEntry(entry);
  };

  const handleCloseDetails = (): void => {
    setSelectedEntry(undefined);
  };

  return (
    <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
      <div className="mb-4 flex items-center justify-center">
        <button
          onClick={handlePreviousDay}
          className="rounded-md px-2 py-1 text-gray-600"
          disabled={currentDate.getTime() <= minDate.getTime()}
        >
          {'<'}
        </button>
        <HeadlineH1 className="mx-4">
          Program for{' '}
          {currentDate.toLocaleDateString('de-CH', {
            weekday: 'long',
            month: 'numeric',
            day: 'numeric',
          })}
        </HeadlineH1>
        <button
          onClick={handleNextDay}
          className="rounded-md px-2 py-1 text-gray-600"
          disabled={currentDate.getTime() >= maxDate.getTime()}
        >
          {'>'}
        </button>
      </div>

      <div className="space-y-4">
        {dailyPrograms[formattedDate]?.map((entry) => (
          <div
            key={entry.id}
            onClick={() => handleEntryClick(entry)}
            className="cursor-pointer rounded-lg p-4 shadow-md transition-shadow duration-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold">{entry.title}</h3>
            <p className="text-sm text-gray-600">
              {entry.time} | {entry.location}
            </p>
          </div>
        ))}
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border-2 border-gray-100 bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-2xl font-semibold">{selectedEntry.title}</h2>
            <p className="mb-2 text-sm text-gray-600">
              {selectedEntry.time} | {selectedEntry.location}
            </p>
            <p className="mb-4">{selectedEntry.details}</p>
            <button onClick={handleCloseDetails} className="rounded-md bg-gray-200 px-4 py-2">
              Close
            </button>
          </div>
        </div>
      )}
    </article>
  );
};
