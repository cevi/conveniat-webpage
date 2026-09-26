import {
  HOF_DASHBOARD_AREA_LABELS,
  HOF_DASHBOARD_AREAS,
  HOF_FILE_KIND_LABELS,
  HOF_FILE_KINDS,
  HOF_ORDER_TYPE_LABELS,
  HOF_ORDER_TYPES,
  HOF_SUBMISSION_STATUS_LABELS,
  HOF_SUBMISSION_STATUSES,
  HOF_SUBMISSION_TYPE_LABELS,
  HOF_SUBMISSION_TYPES,
} from '@/features/hof-dashboard/constants';
import type { StaticTranslationString } from '@/types/types';
import type { OptionObject } from 'payload';

const toOptions = <T extends string>(
  values: readonly T[],
  labels: Record<T, StaticTranslationString>,
): OptionObject[] => values.map((value) => ({ value, label: labels[value] }));

/** The choices of the dashboard's select fields, labelled in the admin's three languages. */
export const submissionTypeOptions = toOptions(HOF_SUBMISSION_TYPES, HOF_SUBMISSION_TYPE_LABELS);
export const submissionStatusOptions = toOptions(
  HOF_SUBMISSION_STATUSES,
  HOF_SUBMISSION_STATUS_LABELS,
);
export const fileKindOptions = toOptions(HOF_FILE_KINDS, HOF_FILE_KIND_LABELS);
export const orderTypeOptions = toOptions(HOF_ORDER_TYPES, HOF_ORDER_TYPE_LABELS);
export const areaOptions = toOptions(HOF_DASHBOARD_AREAS, HOF_DASHBOARD_AREA_LABELS);

export const safetyRiskOptions: OptionObject[] = [
  { value: 'yes', label: { de: 'Ja', en: 'Yes', fr: 'Oui' } },
  { value: 'no', label: { de: 'Nein', en: 'No', fr: 'Non' } },
];
