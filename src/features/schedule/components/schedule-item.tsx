import { Button } from '@/components/ui/buttons/button';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { useStar } from '@/features/schedule/hooks/use-star';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { ChevronDown, ChevronUp, ExternalLink, MapPin, Star } from 'lucide-react';
import type React from 'react';

// A simple helper to format the date part of a timeslot.
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0] ?? '';
};

// The component's props are now simpler.
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
  // Use the hook to get star-related state and actions.
  const { isStarred, toggleStar } = useStar();

  // We cast the location type here based on the expected data structure.
  const location = entry.location as CampMapAnnotation;
  const currentlyStarred = isStarred(entry.id);

  return (
    <div
      key={entry.id}
      onClick={() => onToggleExpand(entry.id)}
      className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          {/* Main content on the left */}
          <div className="flex-1">
            <h3 className="mb-2 text-lg font-semibold">{entry.title}</h3>
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
              {/* Timeslots */}
              {entry.timeslots.map((slot) => (
                <span key={slot.id} className="whitespace-nowrap">
                  {formatDate(new Date(slot.date))} {slot.time}
                </span>
              ))}

              {/* Location Link */}
              {location.title !== '' && (
                <div className="flex items-center">
                  <MapPin className="mr-1.5 h-3 w-3 flex-shrink-0" />
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onMapClick(location);
                    }}
                    className="text-left text-blue-600 underline hover:text-blue-800"
                  >
                    {location.title}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons on the right */}
          <div className="ml-2 flex flex-shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation();
                toggleStar(entry.id);
              }}
              aria-label={currentlyStarred ? 'Remove from favorites' : 'Add to favorites'}
              className="h-8 w-8"
            >
              <Star
                className={`h-4 w-4 transition-colors ${
                  currentlyStarred
                    ? 'fill-red-400 text-red-500'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
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
              className="h-8 w-8"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expandable Section */}
        {isExpanded && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="prose prose-sm max-w-none text-gray-700">
              <LexicalRichTextSection richTextSection={entry.description} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  onReadMore(entry.id);
                }}
                size="sm"
                className="flex items-center"
              >
                <ExternalLink className="mr-1.5 h-3 w-3" />
                Read More
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onMapClick(location);
                }}
                className="flex items-center"
              >
                <MapPin className="mr-1.5 h-3 w-3" />
                View on Map
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
