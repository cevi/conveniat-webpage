import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';

export interface DisplayFieldConfiguration {
  fieldName?: string | null;
  label?: string | null;
}

export interface ApprovedSubmissionsDisplayConfiguration {
  titleFieldName?: string | null | undefined;
  categoryFieldName?: string | null | undefined;
  fileFieldName?: string | null | undefined;
  displayFields?: DisplayFieldConfiguration[] | null | undefined;
}

/** One row of the expandable details. A link row carries the resolved download URL as value. */
export interface PublicSubmissionDetailRow {
  key: string;
  label: string;
  value: string;
  isLink: boolean;
}

/**
 * The part of an approved form submission the approved-submissions block renders. This is
 * everything that reaches the browser, so it must never carry a whole submission.
 */
export interface PublicApprovedSubmission {
  id: string;
  title: string;
  category: string;
  fileUrl: string;
  details: PublicSubmissionDetailRow[];
}

type SubmissionData = NonNullable<FormSubmission['submissionData']>;

const FALLBACK_TITLE: StaticTranslationString = {
  de: 'Eintrag',
  en: 'Entry',
  fr: 'Entrée',
};

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

const resolveDownloadUrl = (value: string): string => {
  const trimmed = value.trim();
  if (OBJECT_ID_PATTERN.test(trimmed)) return `/api/form-file/${trimmed}`;
  if (trimmed.includes(',')) {
    const firstId = trimmed
      .split(',')
      .map((part) => part.trim())
      .find((part) => OBJECT_ID_PATTERN.test(part));
    if (firstId !== undefined) return `/api/form-file/${firstId}`;
  }
  return trimmed;
};

const isFileUrl = (value: string): boolean => {
  if (value === '') return false;
  const lower = value.trim().toLowerCase();
  return (
    OBJECT_ID_PATTERN.test(lower) ||
    (lower.includes(',') && lower.split(',').some((part) => OBJECT_ID_PATTERN.test(part.trim()))) ||
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('/api/') ||
    lower.startsWith('/media/') ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx')
  );
};

const getFieldValue = (data: SubmissionData, fieldName: string | null | undefined): string => {
  if (!isNonEmptyString(fieldName)) return '';
  const wanted = fieldName.trim().toLowerCase();
  const item = data.find(
    (dataItem) =>
      typeof dataItem.field === 'string' && dataItem.field.trim().toLowerCase() === wanted,
  );
  return typeof item?.value === 'string' ? item.value : '';
};

const firstNonEmpty = (data: SubmissionData, fieldNames: string[]): string => {
  for (const fieldName of fieldNames) {
    const value = getFieldValue(data, fieldName);
    if (value.length > 0) return value;
  }
  return '';
};

const toDetailRows = (
  data: SubmissionData,
  displayFields: DisplayFieldConfiguration[] | null | undefined,
): PublicSubmissionDetailRow[] => {
  // Without configured display fields the block has always listed every answer.
  const configured =
    displayFields !== null && displayFields !== undefined && displayFields.length > 0
      ? displayFields
      : data.map((dataItem) => ({ fieldName: dataItem.field, label: dataItem.field }));

  const rows: PublicSubmissionDetailRow[] = [];
  for (const { fieldName, label } of configured) {
    // Drafts skip validation, so a display field can arrive without its required name.
    if (!isNonEmptyString(fieldName)) continue;
    const value = getFieldValue(data, fieldName);
    if (value.length === 0) continue;
    const isLink = isFileUrl(value);
    rows.push({
      key: fieldName,
      label: isNonEmptyString(label) ? label : fieldName,
      value: isLink ? resolveDownloadUrl(value) : value,
      isLink,
    });
  }
  return rows;
};

/**
 * Reduces approved form submissions to what the approved-submissions block shows: a title, a
 * category, a download link and the configured detail rows. Runs on the server, so answers the
 * block does not show, tokens, delivery results and the populated form never reach the client.
 */
export const toPublicApprovedSubmissions = (
  submissions: Pick<FormSubmission, 'id' | 'submissionData'>[],
  configuration: ApprovedSubmissionsDisplayConfiguration,
  locale: Locale,
): PublicApprovedSubmission[] => {
  const {
    titleFieldName = 'title',
    categoryFieldName = 'category',
    fileFieldName = 'file',
    displayFields,
  } = configuration;

  return submissions.map((submission) => {
    const data = Array.isArray(submission.submissionData) ? submission.submissionData : [];

    let title = getFieldValue(data, titleFieldName);
    if (title.length === 0) {
      title = firstNonEmpty(data, ['title', 'name_des_standes', 'name_vom_hof', 'name']);
    }
    if (title.length === 0) {
      const firstValue = data[0]?.value;
      title = isNonEmptyString(firstValue) ? firstValue : FALLBACK_TITLE[locale];
    }

    let category = getFieldValue(data, categoryFieldName);
    if (category.length === 0) category = firstNonEmpty(data, ['kategorie', 'category']);

    let rawFileUrl = getFieldValue(data, fileFieldName);
    if (rawFileUrl.length === 0) rawFileUrl = getFieldValue(data, 'konzept');
    if (rawFileUrl.length === 0) {
      const fileField = data.find(
        (dataItem) => typeof dataItem.value === 'string' && isFileUrl(dataItem.value),
      );
      rawFileUrl = fileField?.value ?? '';
    }

    return {
      id: submission.id,
      title,
      category: category.trim(),
      fileUrl: rawFileUrl === '' ? '' : resolveDownloadUrl(rawFileUrl),
      details: toDetailRows(data, displayFields),
    };
  });
};
