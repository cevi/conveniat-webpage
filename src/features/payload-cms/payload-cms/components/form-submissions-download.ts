'use server';

import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';

/**
 * Helper function to escape a value for CSV format.
 * It wraps the value in double quotes if it contains a comma, newline, or double quote.
 * Existing double quotes within the value are also escaped by doubling them.
 */
const escapeCsvValue = (value: string | undefined): string => {
  // Handle null/undefined by converting to an empty string
  const stringValue = String(value ?? '');

  if (/[",\n\r]/.test(stringValue)) {
    // If the string contains special characters, wrap it in quotes
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
};

/**
 * Downloads all submissions for a given form ID and converts them into a CSV formatted string.
 * This function does not use any external libraries for CSV generation.
 *
 * @param formId The ID of the form to download submissions for.
 * @returns A promise that resolves to a string containing the CSV data.
 */
export const downloadFormSubmissionsAsCSV = async (formId: string): Promise<string> => {
  return await withSpan('downloadFormSubmissionsAsCSV', async () => {
    const payload = await getPayload({ config });

    console.log('Downloading form submissions for form ID:', formId);
    const formSubmissions = await payload.find({
      collection: 'form-submissions',
      where: {
        form: {
          equals: formId,
        },
      },
      limit: 1000,
    });

    const { docs: submissions } = formSubmissions;

    if (submissions.length === 0) {
      console.log('No submissions found for this form.');
      return '';
    }

    // 1. Create headers dynamically from all unique field names across all submissions.
    // This ensures all columns are included even if forms evolve over time.
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
        return dataMap.get(header) ?? '';
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
 *
 * @param formId The ID of the form to download submissions for.
 * @returns A promise that resolves to a base64 encoded string containing the Excel file.
 */
// Import xlsx specifically as any, or explicitly cast to proper return types.
export const downloadFormSubmissionsAsExcel = async (formId: string): Promise<string> => {
  return await withSpan('downloadFormSubmissionsAsExcel', async () => {
    const payload = await getPayload({ config });

    console.log('Downloading form submissions as Excel for form ID:', formId);
    const formSubmissions = await payload.find({
      collection: 'form-submissions',
      where: {
        form: {
          equals: formId,
        },
      },
      limit: 1000,
    });

    const { docs: submissions } = formSubmissions;

    if (submissions.length === 0) {
      console.log('No submissions found for this form.');
      return '';
    }

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rowObject: Record<string, any> = {};
      for (const header of headers) {
        if (header === 'submissionId') {
          rowObject[header] = sub.id;
        } else if (header === 'createdAt') {
          rowObject[header] = sub.createdAt;
        } else {
          rowObject[header] = dataMap.get(header) ?? '';
        }
      }
      return rowObject;
    });

    // 3. Import xlsx and generate the workbook
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');

    // 4. Write to base64 string
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const base64Excel = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    return String(base64Excel);
  });
};
