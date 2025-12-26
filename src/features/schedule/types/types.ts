import type { CampCategory, CampMapAnnotation } from '@/features/payload-cms/payload-types';
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
  participants_min?: number | null | undefined;
  participants_max?: number | null | undefined;
  enable_enrolment?: boolean | null | undefined;
  category?: string | CampCategory | null;
  organiser?:
    | (
        | string
        | {
            fullName: string;
            email: string;
          }
      )[]
    | null
    | undefined;
}
