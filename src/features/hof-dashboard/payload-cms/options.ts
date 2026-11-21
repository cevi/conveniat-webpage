import {
  HOF_AREA_ICON_LABELS,
  HOF_AREA_ICONS,
  HOF_ENTRY_MODE_LABELS,
  HOF_ENTRY_MODES,
  HOF_ENTRY_STATUS_LABELS,
  HOF_REVIEW_CHOICES,
  HOF_REVIEW_STATUSES,
} from '@/features/hof-dashboard/constants';
import type { StaticTranslationString } from '@/types/types';
import type { OptionObject } from 'payload';

const toOptions = <T extends string>(
  values: readonly T[],
  labels: Record<T, StaticTranslationString>,
): OptionObject[] => values.map((value) => ({ value, label: labels[value] }));

/** The choices of the dashboard's select fields, labelled in the admin's three languages. */
export const areaIconOptions = toOptions(HOF_AREA_ICONS, HOF_AREA_ICON_LABELS);
export const entryModeOptions = toOptions(HOF_ENTRY_MODES, HOF_ENTRY_MODE_LABELS);
export const reviewStatusOptions = toOptions(HOF_REVIEW_STATUSES, HOF_ENTRY_STATUS_LABELS);
export const reviewChoiceOptions = toOptions(HOF_REVIEW_CHOICES, HOF_ENTRY_STATUS_LABELS);
