import { Button } from '@/components/ui/buttons/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type React from 'react';

// Helper to ensure consistent date formatting for keys and comparisons
const formatDate = (date: Date): string => date.toISOString().split('T')[0] ?? '';

interface DateCarouselProperties {
  allDates: Date[];
  currentDate: Date;
  startIndex: number;
  maxVisible: number;
  onDateSelect: (date: Date) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const DateCarousel: React.FC<DateCarouselProperties> = ({
  allDates,
  currentDate,
  startIndex,
  maxVisible,
  onDateSelect,
  onPrevious,
  onNext,
}) => {
  const visibleDates = allDates.slice(startIndex, startIndex + maxVisible);
  const formattedCurrentDate = formatDate(currentDate);

  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={startIndex <= 0}
          aria-label="Previous day"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
          {visibleDates.map((date) => {
            const dateString = formatDate(date);
            const isSelected = formattedCurrentDate === dateString;
            return (
              <button
                key={dateString}
                onClick={() => onDateSelect(date)}
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

        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={startIndex >= allDates.length - maxVisible}
          aria-label="Next day"
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
