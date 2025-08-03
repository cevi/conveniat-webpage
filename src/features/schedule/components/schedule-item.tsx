import { Button } from '@/components/ui/buttons/button';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { useStar } from '@/features/schedule/hooks/use-star';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Calendar, ChevronDown, ChevronUp, Clock, ExternalLink, MapPin, Star } from 'lucide-react';
import type React from 'react';

// Enhanced helper to format date and time more elegantly
const formatDateTime = (
  date: Date,
  time: string,
): {
  formattedDate: string;
  time: string;
} => {
  const dateObject = new Date(date);
  const formattedDate = dateObject.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return { formattedDate, time };
};

// Group timeslots by date and sort times for better presentation
const groupTimeslotsByDate = (
  timeslots: Array<{ id: string; date: string; time: string }>,
): Array<{ id: string; date: Date; time: string }>[] => {
  const groups: Record<string, Array<{ id: string; date: Date; time: string }>> = {};

  for (const slot of timeslots) {
    const date = new Date(slot.date);
    // Ensure we're using the correct date by normalizing to start of day
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dateKey = normalizedDate.toISOString().split('T')[0] ?? '';

    groups[dateKey] ??= [];
    groups[dateKey].push({ ...slot, date: normalizedDate });
  }

  // Sort each group by time and return
  return Object.values(groups).map((group) => group.sort((a, b) => a.time.localeCompare(b.time)));
};

interface ScheduleItemProperties {
  entry: CampScheduleEntryFrontendType;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onReadMore: (id: string) => void;
  onMapClick: (location: CampMapAnnotation) => void;
}

export const ScheduleItem: React.FC<ScheduleItemProperties> = ({
  entry,
  isExpanded,
  onToggleExpand,
  onReadMore,
  onMapClick,
}) => {
  const { isStarred, toggleStar } = useStar();
  const location = entry.location as CampMapAnnotation;
  const currentlyStarred = isStarred(entry.id);
  const groupedTimeslots = groupTimeslotsByDate(entry.timeslots);

  const timeslotsToShow = groupedTimeslots;
  const showDates = isExpanded && groupedTimeslots.length > 1;

  return (
    <div
      key={entry.id}
      onClick={() => onToggleExpand(entry.id)}
      className="rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 select-none hover:border-gray-300 hover:shadow-md"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Main content on the left */}
          <div className="min-w-0 flex-1">
            <h3 className="mb-2 text-lg leading-tight font-semibold text-gray-900">
              {entry.title}
            </h3>

            {/* Location and Time Display - single line in collapsed view */}
            <div
              className={`mb-3 ${isExpanded ? 'space-y-2' : 'flex flex-wrap items-center gap-4'}`}
            >
              {/* Location - inline in collapsed view */}
              {!isExpanded && location.title !== '' && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onMapClick(location);
                    }}
                    className="font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                  >
                    {location.title}
                  </button>
                </div>
              )}

              {/* Time slots */}
              {timeslotsToShow.map((dateGroup, index) => {
                const firstSlot = dateGroup[0];
                if (!firstSlot) return <></>;

                const { formattedDate } = formatDateTime(firstSlot.date, firstSlot.time);

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 text-sm ${isExpanded ? '' : 'flex-shrink-0'}`}
                  >
                    {/* Date Badge - only show if expanded and multiple dates */}
                    {showDates && (
                      <div className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="font-medium whitespace-nowrap">{formattedDate}</span>
                      </div>
                    )}

                    {/* Time Slots */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                      <div className="flex flex-wrap gap-1.5">
                        {dateGroup.map((slot) => (
                          <span
                            key={slot.id}
                            className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-gray-700"
                          >
                            {slot.time}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Location in expanded view */}
            {isExpanded && location.title !== '' && (
              <div className="mb-3 flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onMapClick(location);
                  }}
                  className="font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                >
                  {location.title}
                </button>
              </div>
            )}
          </div>

          {/* Action buttons on the right */}
          <div className="flex flex-shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation();
                toggleStar(entry.id);
              }}
              aria-label={currentlyStarred ? 'Remove from favorites' : 'Add to favorites'}
              className="h-8 w-8 hover:bg-gray-100"
            >
              <Star
                className={cn(
                  'h-4 w-4 transition-all duration-200',
                  currentlyStarred
                    ? 'scale-110 fill-red-400 text-red-700'
                    : 'text-gray-400 hover:scale-105',
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpand(entry.id);
              }}
              aria-expanded={isExpanded}
              className="h-8 w-8 hover:bg-gray-100"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </Button>
          </div>
        </div>

        {/* Expandable Section */}
        {isExpanded && (
          <div className="animate-in slide-in-from-top-2 mt-4 border-t-2 border-gray-100 pt-4 duration-200">
            <div className="prose prose-sm mb-4 max-w-none text-gray-700">
              <LexicalRichTextSection richTextSection={entry.description} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  onReadMore(entry.id);
                }}
                size="sm"
                className="inline-flex items-center rounded-md border border-transparent bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Read More
              </Button>
              {location.title !== '' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMapClick(location);
                  }}
                  className="inline-flex items-center rounded-md border border-transparent bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  View on Map
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
