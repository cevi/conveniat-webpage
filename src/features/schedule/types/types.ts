import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';

export interface CampScheduleEntryFrontendType {
  id: string;
  title: string;
  description: SerializedEditorState;
  timeslots: {
    date: string;
    time: string;
    id: string;
  }[];
  location: string | CampMapAnnotation;
  participants_min?: number | null;
  participants_max?: number | null;
  category?: string;
  organiser?:
    | string
    | null
    | {
        fullName: string;
        email: string;
      };
}

// Define the shape of the context value
export interface StarContextType {
  isStarred: (id: string) => boolean;
  toggleStar: (id: string) => void;
}
