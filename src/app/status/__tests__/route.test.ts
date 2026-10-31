import { setPayloadInitCompleted } from '@/features/payload-cms/payload-cms/initialization/init-state';

const queryRaw = jest.fn();
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: { $queryRaw: (...arguments_: unknown[]): unknown => queryRaw(...arguments_) },
}));
jest.mock('next/server', () => ({ connection: jest.fn().mockResolvedValue(void 0) }));

// a fresh module per test, so the latch of one test does not carry into the next
const probe = async (): Promise<Response> => {
  const { GET } = await import('@/app/status/route');
  return GET();
};

describe('GET /status', () => {
  beforeEach(() => {
    jest.resetModules();
    queryRaw.mockReset();
    setPayloadInitCompleted(false);
  });

  it('answers 503 while Payload is still initializing', async () => {
    queryRaw.mockResolvedValue([1]);

    const response = await probe();

    expect(response.status).toBe(503);
  });

  it('answers 503 while Postgres cannot be reached', async () => {
    setPayloadInitCompleted(true);
    queryRaw.mockRejectedValue(new Error('connection refused'));

    const response = await probe();

    expect(response.status).toBe(503);
  });

  it('answers ok once both databases were reached, and keeps answering ok after a blip', async () => {
    setPayloadInitCompleted(true);
    queryRaw.mockResolvedValue([1]);
    const { GET } = await import('@/app/status/route');

    const first = await GET();
    queryRaw.mockRejectedValue(new Error('connection refused'));
    const second = await GET();

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ status: 'ok' });
    expect(second.status).toBe(200);
  });
});
