'use server';

import { environmentVariables } from '@/config/environment-variables';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';

/**
 * Helper function to escape a value for CSV format.
 * It wraps the value in double quotes if it contains a comma, newline, or double quote.
 * Existing double quotes within the value are also escaped by doubling them.
 */
const escapeCsvValue = (value: string | undefined): string => {
  const stringValue = String(value ?? '');

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
};

/**
 * Fetches all form submissions for a form ID, paginating through results to prevent silent truncation.
 */
const fetchAllSubmissions = async (payload: Payload, formId: string): Promise<FormSubmission[]> => {
  const allSubmissions: FormSubmission[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await payload.find({
      collection: 'form-submissions',
      where: {
        form: {
          equals: formId,
        },
      },
      limit: 250,
      page,
      depth: 0,
    });

    allSubmissions.push(...result.docs);

    if (result.hasNextPage && typeof result.nextPage === 'number') {
      page = result.nextPage;
    } else {
      hasMore = false;
    }
  }

  return allSubmissions;
};

/**
 * Resolves raw document IDs in submission values to human readable filenames with downloadable URLs.
 */
const resolveFileValues = async (
  submissions: Array<{ submissionData?: Array<{ field: string; value: unknown }> | null }>,
  payload: Payload,
): Promise<Map<string, string>> => {
  const allPotentialIds = new Set<string>();

  for (const sub of submissions) {
    for (const item of sub.submissionData ?? []) {
      const rawValue = item.value;
      let valString = '';
      if (typeof rawValue === 'string') {
        valString = rawValue;
      } else if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
        valString = String(rawValue);
      }

      if (valString.length > 0) {
        const parts = valString.split(',').map((p) => p.trim());
        for (const part of parts) {
          if (part.length > 0) {
            allPotentialIds.add(part);
          }
        }
      }
    }
  }

  if (allPotentialIds.size === 0) return new Map();

  const fileMap = new Map<string, string>();
  try {
    const fileResult = await payload.find({
      collection: 'form_collection',
      where: {
        id: { in: [...allPotentialIds] },
      },
      limit: allPotentialIds.size,
      depth: 0,
    });

    for (const fileDocument of fileResult.docs) {
      const filename =
        typeof fileDocument.originalFilename === 'string' &&
        fileDocument.originalFilename.length > 0
          ? fileDocument.originalFilename
          : fileDocument.filename;
      const downloadUrl = `${environmentVariables.APP_HOST_URL}/api/form-file/${fileDocument.id}`;
      fileMap.set(fileDocument.id, `${filename} (${downloadUrl})`);
    }
  } catch {
    // ignore lookup errors
  }

  return fileMap;
};

const formatFieldValue = (val: unknown, fileMap: Map<string, string>): string => {
  if (val === null || val === undefined) return '';
  let valString = '';
  if (typeof val === 'string') {
    valString = val;
  } else if (typeof val === 'number' || typeof val === 'boolean') {
    valString = String(val);
  }

  if (valString.length === 0) return '';

  const parts = valString.split(',').map((p) => p.trim());

  const resolvedParts = parts.map((part) => fileMap.get(part) ?? part);
  return resolvedParts.join(', ');
};

/**
 * Downloads all submissions for a given form ID and converts them into a CSV formatted string.
 */
export const downloadFormSubmissionsAsCSV = async (formId: string): Promise<string> => {
  return await withSpan('downloadFormSubmissionsAsCSV', async () => {
    const payload = await getPayload({ config });

    console.log('Downloading form submissions for form ID:', formId);
    const submissions = await fetchAllSubmissions(payload, formId);

    if (submissions.length === 0) {
      console.log('No submissions found for this form.');
      return '';
    }

    const fileMap = await resolveFileValues(submissions, payload);

    // 1. Create headers dynamically from all unique field names across all submissions.
    const headerSet = new Set<string>();
    for (const sub of submissions) {
      for (const field of sub.submissionData ?? []) {
        headerSet.add(field.field);
      }
    }
    const headers = ['submissionId', 'createdAt', ...headerSet];

    // 2. Map each submission to a CSV row.
    const rows = submissions.map((sub) => {
      const dataMap = new Map(sub.submissionData?.map((field) => [field.field, field.value]) ?? []);
      const rowData = headers.map((header) => {
        if (header === 'submissionId') return sub.id;
        if (header === 'createdAt') return sub.createdAt;
        const rawValue = dataMap.get(header);
        return formatFieldValue(rawValue, fileMap);
      });

      return rowData.map((element) => escapeCsvValue(element)).join(',');
    });

    // 3. Combine the header and all data rows into a single string.
    const csvHeader = headers.map((element) => escapeCsvValue(element)).join(',');
    return [csvHeader, ...rows].join('\n');
  });
};

/**
 * Downloads all submissions for a given form ID and converts them into an Excel (xlsx) formatted base64 string.
 */
export const downloadFormSubmissionsAsExcel = async (formId: string): Promise<string> => {
  return await withSpan('downloadFormSubmissionsAsExcel', async () => {
    const payload = await getPayload({ config });

    console.log('Downloading form submissions as Excel for form ID:', formId);
    const submissions = await fetchAllSubmissions(payload, formId);

    if (submissions.length === 0) {
      console.log('No submissions found for this form.');
      return '';
    }

    const fileMap = await resolveFileValues(submissions, payload);

    // 1. Create headers dynamically from all unique field names across all submissions.
    const headerSet = new Set<string>();
    for (const sub of submissions) {
      for (const field of sub.submissionData ?? []) {
        headerSet.add(field.field);
      }
    }
    const headers = ['submissionId', 'createdAt', ...headerSet];

    // 2. Map each submission to a row object.
    const rows = submissions.map((sub) => {
      const dataMap = new Map(
        (sub.submissionData ?? []).map((field) => [field.field, field.value]),
      );

      const rowObject: Record<string, unknown> = {};
      for (const header of headers) {
        if (header === 'submissionId') {
          rowObject[header] = sub.id;
        } else if (header === 'createdAt') {
          rowObject[header] = sub.createdAt;
        } else {
          const rawValue = dataMap.get(header);
          rowObject[header] = formatFieldValue(rawValue, fileMap);
        }
      }
      return rowObject;
    });

    // 3. Import exceljs and generate the workbook
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Submissions');

    worksheet.columns = headers.map((header) => ({ header, key: header }));

    for (const row of rows) {
      worksheet.addRow(row);
    }

    // 4. Write to base64 string
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Excel = Buffer.from(buffer).toString('base64');
    return base64Excel;
  });
};
