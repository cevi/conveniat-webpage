import { strFromU8, unzipSync } from 'fflate';

const asksForHof = [{ formSection: { fields: [{ blockType: 'hofSelection', name: 'hof' }] } }];

const FORMS = [
  {
    id: 'form-plan',
    title: 'Hofbauten (Formular)',
    _localized_status: { published: true },
    hofDashboard: { area: 'infrastructure', title: 'Hofbauten' },
    sections: asksForHof,
  },
];

const SUBMISSIONS = [
  { id: 'plan-2', form: 'form-plan', createdAt: '2026-09-20T10:00:00.000Z' },
  { id: 'plan-1', form: 'form-plan', createdAt: '2026-09-01T23:30:00.000Z' },
];

const FILES = [
  { filename: 'a.pdf', originalFilename: 'plan.pdf', formSubmission: 'plan-2' },
  // the same name handed in twice on one day
  { filename: 'b.pdf', originalFilename: 'plan.pdf', formSubmission: 'plan-2' },
  // a name that would leave its folder
  { filename: 'c.png', originalFilename: '../dach/skizze.png', formSubmission: 'plan-1' },
  { filename: 'gone.pdf', originalFilename: 'weg.pdf', formSubmission: 'plan-1' },
];

const BUCKET: Record<string, string> = { 'a.pdf': 'A', 'b.pdf': 'B', 'c.png': 'C' };

const mockPayload = {
  find: jest.fn(({ collection }: { collection: string }) => {
    if (collection === 'forms') return Promise.resolve({ docs: FORMS });
    if (collection === 'form-submissions') return Promise.resolve({ docs: SUBMISSIONS });
    return Promise.resolve({ docs: FILES });
  }),
};

const mockSend = jest.fn(({ input }: { input: { Key: string } }) => {
  const content = BUCKET[input.Key];
  if (content === undefined) return Promise.reject(new Error('NoSuchKey'));
  return Promise.resolve({
    Body: { transformToWebStream: (): ReadableStream => new Blob([content]).stream() },
  });
});

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_HOF_DASHBOARD: true },
}));
jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('payload', () => ({ getPayload: (): Promise<unknown> => Promise.resolve(mockPayload) }));
jest.mock('@/lib/s3', () => ({
  S3_BUCKET_NAME: 'bucket',
  s3Client: {
    send: (command: unknown): unknown => mockSend(command as { input: { Key: string } }),
  },
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

import { listHofFiles, zipHofFiles } from '@/features/hof-dashboard/api/hof-files-zip';

const readAll = async (stream: ReadableStream<Uint8Array>): Promise<Uint8Array> =>
  new Uint8Array(await new Response(stream).arrayBuffer());

describe('Hof files as a ZIP', () => {
  it('puts every file of the Hof in a folder per form, named by the day it was handed in', async () => {
    const files = await listHofFiles('hof-nord', 'de');

    const zip = unzipSync(await readAll(zipHofFiles(files)));
    expect(
      Object.fromEntries(Object.entries(zip).map(([path, data]) => [path, strFromU8(data)])),
    ).toEqual({
      // in Zurich, 23:30 UTC is already the next day
      'Hofbauten/2026-09-02 .._dach_skizze.png': 'C',
      'Hofbauten/2026-09-20 plan.pdf': 'A',
      'Hofbauten/2026-09-20 plan (2).pdf': 'B',
      // weg.pdf is missing in the bucket and left out rather than breaking the download
    });
  });

  it('is an empty ZIP for a Hof without files', async () => {
    const zip = unzipSync(await readAll(zipHofFiles([])));
    expect(zip).toEqual({});
  });
});
