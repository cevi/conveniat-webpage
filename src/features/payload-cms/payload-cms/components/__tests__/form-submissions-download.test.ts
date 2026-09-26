jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://example.test' },
}));
jest.mock('@/utils/tracing-helpers', () => ({
  withSpan: (_name: string, callback: () => Promise<unknown>): Promise<unknown> => callback(),
}));
jest.mock('next/headers', () => ({ headers: jest.fn().mockResolvedValue(new Headers()) }));

const mockAuth = jest.fn();

/**
 * Stands in for the `form-submissions` read rule: without the access override, only a caller
 * the rule lets in gets documents, everyone else gets Payload's `Forbidden`.
 */
const mockFind = jest.fn(
  (options: { overrideAccess?: boolean; user?: { canReadSubmissions?: boolean } | null }) => {
    const bypassesAccess = options.overrideAccess !== false;
    if (!bypassesAccess && options.user?.canReadSubmissions !== true) {
      return Promise.reject(new Error('Forbidden'));
    }
    return Promise.resolve({
      docs: [
        {
          id: 'submission-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          submissionData: [{ field: 'name', value: 'Muster' }],
        },
      ],
      hasNextPage: false,
    });
  },
);

jest.mock('payload', () => ({
  getPayload: jest.fn().mockResolvedValue({
    auth: (...args: unknown[]): unknown => mockAuth(...args),
    find: (options: Parameters<typeof mockFind>[0]): unknown => mockFind(options),
    logger: { info: jest.fn(), debug: jest.fn() },
  }),
}));

import { downloadFormSubmissionsAsCSV } from '@/features/payload-cms/payload-cms/components/form-submissions-download';

describe('form submission export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses the submissions to a request without a session', async () => {
    // eslint-disable-next-line unicorn/no-null -- what `payload.auth` answers without a session
    mockAuth.mockResolvedValue({ user: null });

    await expect(downloadFormSubmissionsAsCSV('form-1')).rejects.toThrow('Forbidden');
  });

  it('refuses the submissions to a signed-in user the read rule turns away', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'participant', canReadSubmissions: false } });

    await expect(downloadFormSubmissionsAsCSV('form-1')).rejects.toThrow('Forbidden');
  });

  it('exports the submissions for a user allowed to read them', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'editor', canReadSubmissions: true } });

    await expect(downloadFormSubmissionsAsCSV('form-1')).resolves.toBe(
      'submissionId,createdAt,name\nsubmission-1,2026-01-01T00:00:00.000Z,Muster',
    );
  });
});
