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
  // relationships can be unpopulated (ID string) or dangling (null) at runtime
  location: string | CampMapAnnotation | null;
  participants_min?: number | null | undefined;
  participants_max?: number | null | undefined;
  enable_enrolment?: boolean | null | undefined;
  category?: string | CampCategory | null;
  target_group?: SerializedEditorState | null | undefined;
  organiser?:
    | (
        | string
        | {
            id: string;
            fullName: string;
            /** The Ceviname, absent for the many users who never set one. */
            nickname?: string | null | undefined;
            email: string;
          }
      )[]
    | null
    | undefined;
}
