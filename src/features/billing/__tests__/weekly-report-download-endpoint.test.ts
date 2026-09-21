jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {},
}));

// The handler module pulls in the Redis-backed adapters of the billing toolbar. Nothing
// this endpoint does touches them, and a real client would keep reconnecting for as long
// as the suite runs.
jest.mock('@/lib/db/redis', () => ({ redis: {} }));

const mockCanAccessBilling = jest.fn();
jest.mock('@/features/payload-cms/payload-cms/access-rules/can-access-billing', () => ({
  canAccessBilling: (...args: unknown[]): unknown => mockCanAccessBilling(...args),
}));

jest.mock('@/features/billing/services/render-weekly-report', () => ({
  renderWeeklyReportPdf: jest.fn().mockResolvedValue(Buffer.from('pdf-bytes')),
}));

import { billingWeeklyReportPdfHandler } from '@/features/billing/api/bill-admin-api';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import type { PayloadRequest } from 'payload';

const NOW = new Date('2026-08-31T09:00:00Z');

const participant = {
  id: 'p1',
  status: 'new',
  eventName: 'Hauptlager conveniat27 - Züri 11',
  fullName: 'Max Mustermann',
  email: 'max@example.ch',
  lastSyncDate: NOW.toISOString(),
} as unknown as BillParticipant;

function createRequest(): {
  request: PayloadRequest;
  find: jest.Mock;
  sendEmail: jest.Mock;
  updateGlobal: jest.Mock;
} {
  const find = jest.fn().mockResolvedValue({ docs: [participant] });
  const sendEmail = jest.fn();
  const updateGlobal = jest.fn();

  return {
    find,
    sendEmail,
    updateGlobal,
    request: {
      url: 'http://localhost:3000/api/confidential/billing/weekly-report-pdf',
      user: { email: 'admin@example.ch' },
      payload: {
        find,
        sendEmail,
        updateGlobal,
        logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      },
    } as unknown as PayloadRequest,
  };
}

describe('billingWeeklyReportPdfHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refuses a caller without billing access', async () => {
    mockCanAccessBilling.mockReturnValue(false);
    const { request, find } = createRequest();

    const response = await billingWeeklyReportPdfHandler(request);

    expect(response.status).toBe(401);
    expect(find).not.toHaveBeenCalled();
  });

  it('serves the report as a PDF download named after today', async () => {
    mockCanAccessBilling.mockReturnValue(true);
    const { request } = createRequest();

    const response = await billingWeeklyReportPdfHandler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="anmeldestand-2026-08-31.pdf"',
    );
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from('pdf-bytes'));
  });

  it('leaves the weekly send untouched', async () => {
    mockCanAccessBilling.mockReturnValue(true);
    const { request, sendEmail, updateGlobal } = createRequest();

    await billingWeeklyReportPdfHandler(request);

    // Downloading a report must not mail it, and must not write `lastSentAt` — that
    // would talk the scheduler out of this week's send.
    expect(sendEmail).not.toHaveBeenCalled();
    expect(updateGlobal).not.toHaveBeenCalled();
  });

  it('reports a failed render as a 500 rather than a broken download', async () => {
    mockCanAccessBilling.mockReturnValue(true);
    const { request } = createRequest();
    (request.payload.find as jest.Mock).mockRejectedValue(new Error('database unreachable'));

    const response = await billingWeeklyReportPdfHandler(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'database unreachable' });
  });
});
