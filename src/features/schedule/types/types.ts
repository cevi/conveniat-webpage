import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';

export interface CampScheduleEntryFrontendType {
  id: string;
  title: string;
  description: SerializedEditorState;
  timeslot: {
    date: string;
    time: string;
  };
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
