import type { HofDashboardEntry } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { renderSubmissionPdf } from '@/features/hof-dashboard/api/render-submission-pdf';

const ENTRY: HofDashboardEntry = {
  id: 'plan-2',
  submittedAt: '2026-09-20T10:00:00.000Z',
  title: undefined,
  status: 'revisionRequired',
  submittedBy: 'Anna Beispiel v/o Fuchs',
  answers: [
    { field: 'bemerkungen', label: 'Bemerkungen', kind: 'text', text: 'Zelt «Jurte» – 12 m²' },
    {
      field: 'plan',
      label: 'Plan',
      kind: 'files',
      files: [
        { id: 'file-a', name: 'plan.pdf', url: '/', size: 2_400_000, mimeType: 'application/pdf' },
      ],
    },
    {
      field: 'material',
      label: 'Material',
      kind: 'materials',
      materials: Array.from({ length: 80 }, (_, index) => ({
        id: `line-${index}`,
        name: `Blache ${index}`,
        section: index < 40 ? 'Zelte' : 'Holz',
        quantity: index * 10,
      })),
    },
  ],
  withdrawable: false,
  reviewStatus: 'revisionRequired',
  final: false,
  reviewLog: [
    {
      at: '2026-09-21T10:00:00.000Z',
      by: 'Sara Keller v/o Biber',
      status: 'revisionRequired',
      final: undefined,
      // long, and with a character the PDF's fonts do not have
      comment: 'Bitte den Fallbalken 👍 noch einzeichnen.\n'.repeat(30),
    },
  ],
};

describe('renderSubmissionPdf', () => {
  it('renders a long submission onto as many pages as it needs', async () => {
    const pdf = await renderSubmissionPdf({
      hofName: 'Cevi Uster',
      form: { title: 'Hofbauten', area: 'infrastructure' },
      entry: ENTRY,
      heading: 'Version 2',
      fileNames: new Map([['file-a', 'plan_v2.pdf']]),
      locale: 'de',
      generatedAt: new Date('2026-09-28T10:00:00.000Z'),
    });

    const source = pdf.toString('latin1');
    expect(source.startsWith('%PDF-')).toBe(true);
    expect(source.match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(1);
  });
});
