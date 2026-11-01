import type {
  CampCategory,
  CampMapAnnotation,
  CampScheduleEntry,
} from '@/features/payload-cms/payload-types';
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
  /**
   * Everything below arrived after the first release of the programme: an entry restored from
   * a phone's local copy of an older version has none of it, so read each one defensively.
   */
  kind?: CampScheduleEntry['kind'] | null | undefined;
  form?: CampScheduleEntry['form'] | undefined;
  /**
   * empty for the whole camp; an unpopulated or dangling Quartier arrives as an id or `null`, and
   * `number` and `rufname` are newer than `name`
   */
  quartiere?:
    | (
        | string
        | { id: string; name: string; number?: number | null; rufname?: string | null }
        | null
      )[]
    | null
    | undefined;
  bring?: CampScheduleEntry['bring'] | undefined;
  /** whether the block has a part for Leitende; the part itself stays on the server */
  hasLeaderSection?: boolean | undefined;
  steps?: CampScheduleEntry['steps'] | undefined;
  organiser?:
    | (
        | string
        | {
            id: string;
            fullName: string;
            /** The Ceviname, absent for the many users who never set one. */
            nickname?: string | null | undefined;
          }
      )[]
    | null
    | undefined;
}
