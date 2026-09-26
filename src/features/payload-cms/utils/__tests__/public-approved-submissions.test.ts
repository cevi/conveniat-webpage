import type { FormSubmission } from '@/features/payload-cms/payload-types';
import { toPublicApprovedSubmissions } from '@/features/payload-cms/utils/public-approved-submissions';

const FILE_ID = '0123456789abcdef01234567';

const submission = (
  id: string,
  answers: Record<string, string>,
): Pick<FormSubmission, 'id' | 'submissionData'> => ({
  id,
  submissionData: Object.entries(answers).map(([field, value]) => ({ field, value })),
});

describe('toPublicApprovedSubmissions', () => {
  it('passes only the title, category, file and configured fields to the client', () => {
    // Shaped like what a default-depth read used to return, private fields and all.
    const fullSubmission = {
      ...submission('sub-1', {
        name_des_standes: 'Stand A',
        kategorie: 'Food',
        konzept: FILE_ID,
        stand_grosse: '3x3',
        email: 'private@example.com',
        telefon: '+41 00 000 00 00',
      }),
      approvalToken: 'secret-approval-token',
      smtpResults: { delivered: true },
      workflowResults: { step: 'done' },
      form: { id: 'form-1', emails: [{ emailTo: 'office@example.com' }] },
    } as unknown as FormSubmission;

    const result = toPublicApprovedSubmissions(
      [fullSubmission],
      {
        titleFieldName: 'name_des_standes',
        categoryFieldName: 'kategorie',
        fileFieldName: 'konzept',
        displayFields: [{ fieldName: 'stand_grosse', label: 'Standgrösse' }],
      },
      'de',
    );

    expect(result).toEqual([
      {
        id: 'sub-1',
        title: 'Stand A',
        category: 'Food',
        fileUrl: `/api/form-file/${FILE_ID}`,
        details: [{ key: 'stand_grosse', label: 'Standgrösse', value: '3x3', isLink: false }],
      },
    ]);

    const serialized = JSON.stringify(result);
    for (const leaked of [
      'private@example.com',
      '+41 00 000 00 00',
      'secret-approval-token',
      'office@example.com',
      'delivered',
    ]) {
      expect(serialized).not.toContain(leaked);
    }
  });

  it('links file answers among the detail fields instead of printing their id', () => {
    const [result] = toPublicApprovedSubmissions(
      [submission('sub-1', { title: 'Hof', plan: FILE_ID })],
      { displayFields: [{ fieldName: 'plan' }] },
      'fr',
    );

    expect(result?.details).toEqual([
      { key: 'plan', label: 'plan', value: `/api/form-file/${FILE_ID}`, isLink: true },
    ]);
  });

  it('survives draft block data and empty submissions', () => {
    const [result] = toPublicApprovedSubmissions(
      [{ id: 'sub-1' }],
      { titleFieldName: '', displayFields: [{ fieldName: '' }] },
      'en',
    );

    expect(result).toEqual({ id: 'sub-1', title: 'Entry', category: '', fileUrl: '', details: [] });
  });
});
