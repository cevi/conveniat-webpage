import { getJobs } from '@/features/payload-cms/components/form/actions/get-jobs';
import { getPayload } from 'payload';

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });

jest.mock('payload', () => ({
  getPayload: jest.fn(),
}));

/** A job the way Payload stores it, including the joined signups nobody outside may see. */
const storedJob = {
  id: 'job-1',
  title: 'Aufbau',
  description: 'Du baust Zelte auf.',
  category: 'infrastruktur',
  dateRange: { startDate: '2027-07-12T12:00:00.000Z', endDate: '2027-07-23T12:00:00.000Z' },
  dateRangeCategory: 'setup',
  maxQuota: 3,
  prerequisites: 'Mindestalter: 13 Jahre',
  _localized_status: { published: true },
  submissions: {
    docs: [
      {
        id: 'submission-1',
        approvalToken: 'secret-token',
        submissionData: [{ field: 'email', value: 'helper@example.com' }],
        smtpResults: [{ to: 'helper@example.com' }],
      },
    ],
  },
};

const mockPayload = (
  totalSignups: number,
): { find: jest.Mock<Promise<unknown>, [Record<string, unknown>]>; count: jest.Mock } => {
  const find = jest.fn<Promise<unknown>, [Record<string, unknown>]>().mockResolvedValue({
    docs: [storedJob],
  });
  const count = jest.fn().mockResolvedValue({ totalDocs: totalSignups });
  (getPayload as jest.Mock).mockResolvedValue({ find, count });
  return { find, count };
};

describe('getJobs', () => {
  it('returns only what the helper form shows, never the signups behind a job', async () => {
    mockPayload(1);

    const [job] = await getJobs('setup', 'de');

    expect(job).toEqual({
      id: 'job-1',
      title: 'Aufbau',
      description: 'Du baust Zelte auf.',
      category: 'infrastruktur',
      dateRange: storedJob.dateRange,
      availableQuota: 2,
    });
    expect(JSON.stringify(job)).not.toMatch(/secret-token|helper@example\.com/);
  });

  it('does not populate relationships or joins', async () => {
    const { find } = mockPayload(0);

    await getJobs('setup', 'de');

    expect(find.mock.calls[0]?.[0]).toMatchObject({ depth: 0 });
    expect(find.mock.calls[0]?.[0]['select']).not.toHaveProperty('submissions');
  });

  it('never reports fewer than zero free spots', async () => {
    mockPayload(5);

    const [job] = await getJobs('setup', 'de');

    expect(job?.availableQuota).toBe(0);
  });
});
