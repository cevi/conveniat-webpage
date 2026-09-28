import type {
  HofDashboardEntry,
  HofDashboardForm,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import type { SubmissionPdfInput } from '@/features/hof-dashboard/api/render-submission-pdf';
import { strFromU8, unzipSync } from 'fflate';

const entry = (id: string, submittedAt: string, title?: string): HofDashboardEntry => ({
  id,
  submittedAt,
  title,
  status: 'submitted',
  feedback: undefined,
  answers: [],
  withdrawable: false,
  reviewStatus: undefined,
  final: false,
  feedbackBy: undefined,
  reviewLog: [],
});

/** Newest first, as the dashboard lists them. */
const FORMS = [
  {
    id: 'form-plan',
    title: 'Hofbauten',
    area: 'infrastructure',
    mode: 'versions',
    entries: [
      entry('plan-2', '2026-09-20T10:00:00.000Z'),
      entry('plan-1', '2026-09-01T23:30:00.000Z'),
    ],
  },
  {
    id: 'form-stand',
    title: 'Stadtleben',
    area: 'program',
    mode: 'entries',
    entries: [
      entry('stand-b', '2026-09-12T08:00:00.000Z'),
      entry('stand-a', '2026-09-10T08:00:00.000Z', 'Crêpes'),
    ],
  },
] as HofDashboardForm[];

const FILES = [
  { id: 'file-a', filename: 'a.pdf', originalFilename: 'plan.pdf', formSubmission: 'plan-2' },
  // the same name handed in twice with one version
  { id: 'file-b', filename: 'b.pdf', originalFilename: 'plan.pdf', formSubmission: 'plan-2' },
  // a name that would leave its folder
  {
    id: 'file-c',
    filename: 'c.png',
    originalFilename: '../dach/skizze.png',
    formSubmission: 'plan-1',
  },
  { id: 'file-d', filename: 'gone.pdf', originalFilename: 'weg.pdf', formSubmission: 'plan-1' },
  // a file named like the PDF of its submission
  {
    id: 'file-e',
    filename: 'e.pdf',
    originalFilename: 'Stadtleben.pdf',
    formSubmission: 'stand-a',
  },
];

const BUCKET: Record<string, string> = { 'a.pdf': 'A', 'b.pdf': 'B', 'c.png': 'C', 'e.pdf': 'E' };

const mockGetHofDashboardData = jest.fn(() => Promise.resolve({ forms: FORMS }));
const mockRender = jest.fn((input: SubmissionPdfInput) =>
  Promise.resolve(Buffer.from(`PDF ${input.heading}`)),
);

jest.mock('@/features/hof-dashboard/api/hof-dashboard-data', () => ({
  getHofDashboardData: (): unknown => mockGetHofDashboardData(),
  idOf: (reference: string | { id: string }): string =>
    typeof reference === 'string' ? reference : reference.id,
}));
jest.mock('@/features/hof-dashboard/api/render-submission-pdf', () => ({
  renderSubmissionPdf: (input: SubmissionPdfInput): unknown => mockRender(input),
}));
jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('payload', () => ({
  getPayload: (): Promise<unknown> =>
    Promise.resolve({ find: (): Promise<unknown> => Promise.resolve({ docs: FILES }) }),
}));

const mockSend = jest.fn(({ input }: { input: { Key: string } }) => {
  const content = BUCKET[input.Key];
  if (content === undefined) return Promise.reject(new Error('NoSuchKey'));
  return Promise.resolve({
    Body: { transformToWebStream: (): ReadableStream => new Blob([content]).stream() },
  });
});
jest.mock('@/lib/s3', () => ({
  S3_BUCKET_NAME: 'bucket',
  s3Client: {
    send: (command: unknown): unknown => mockSend(command as { input: { Key: string } }),
  },
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({ error: jest.fn(), warn: jest.fn() }),
}));

import { listHofZipEntries, zipHofFiles } from '@/features/hof-dashboard/api/hof-files-zip';

const HOF = { id: 'hof-uster', name: 'Cevi Uster' };

const readAll = async (stream: ReadableStream<Uint8Array>): Promise<Uint8Array> =>
  new Uint8Array(await new Response(stream).arrayBuffer());

const unzip = async (stream: ReadableStream<Uint8Array>): Promise<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(unzipSync(await readAll(stream))).map(([path, data]) => [path, strFromU8(data)]),
  );

beforeEach(() => jest.clearAllMocks());

describe('Hof files as a ZIP', () => {
  it('names every file with its version, and adds a PDF of each submission', async () => {
    const entries = await listHofZipEntries(HOF, 'de', false);

    expect(await unzip(zipHofFiles(entries))).toEqual({
      'Hofbauten/.._dach_skizze_v1.png': 'C',
      'Hofbauten/Hofbauten_v1.pdf': 'PDF Version 1',
      'Hofbauten/Hofbauten_v2.pdf': 'PDF Version 2',
      'Hofbauten/plan_v2.pdf': 'A',
      'Hofbauten/plan_v2 (2).pdf': 'B',
      // entries are numbered, not versions of one another, and named by their title
      'Stadtleben/Stadtleben_1.pdf': 'E',
      'Stadtleben/Stadtleben_1 (2).pdf': 'PDF Crêpes',
      'Stadtleben/Stadtleben_2.pdf': 'PDF Eintrag 2',
      // weg.pdf is missing in the bucket and left out rather than breaking the download
    });
  });

  it('lists each file in the PDF of its submission by its name in the ZIP', async () => {
    await readAll(zipHofFiles(await listHofZipEntries(HOF, 'de', false)));

    const newestPlan = mockRender.mock.calls.find(([input]) => input.entry.id === 'plan-2')?.[0];
    expect(newestPlan?.fileNames.get('file-a')).toBe('plan_v2.pdf');
    expect(newestPlan?.fileNames.get('file-b')).toBe('plan_v2 (2).pdf');
    expect(newestPlan?.hofName).toBe('Cevi Uster');
  });

  it('leaves out a PDF that fails to render and keeps the rest', async () => {
    mockRender.mockImplementationOnce(() => Promise.reject(new Error('broken')));
    const zip = await unzip(zipHofFiles(await listHofZipEntries(HOF, 'de', false)));
    expect(Object.keys(zip)).toHaveLength(7);
  });

  it('is an empty ZIP for a Hof without submissions', async () => {
    expect(await unzip(zipHofFiles([]))).toEqual({});
  });
});
