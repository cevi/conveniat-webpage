import {
  HOF_DASHBOARD_AREA_LABELS,
  HOF_DASHBOARD_AREAS,
  HOF_ENTRY_MODE_LABELS,
  HOF_ENTRY_MODES,
  HOF_ENTRY_STATUS_LABELS,
  HOF_REVIEW_STATUSES,
} from '@/features/hof-dashboard/constants';
import type { StaticTranslationString } from '@/types/types';
import type { OptionObject } from 'payload';

const toOptions = <T extends string>(
  values: readonly T[],
  labels: Record<T, StaticTranslationString>,
): OptionObject[] => values.map((value) => ({ value, label: labels[value] }));

/** The choices of the dashboard's select fields, labelled in the admin's three languages. */
export const areaOptions = toOptions(HOF_DASHBOARD_AREAS, HOF_DASHBOARD_AREA_LABELS);
export const entryModeOptions = toOptions(HOF_ENTRY_MODES, HOF_ENTRY_MODE_LABELS);
export const reviewStatusOptions = toOptions(HOF_REVIEW_STATUSES, HOF_ENTRY_STATUS_LABELS);
