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

import { billingExportXlsxHandler } from '@/features/billing/api/bill-admin-api';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import ExcelJS from 'exceljs';
import type { PayloadRequest } from 'payload';

const billed = {
  id: 'p1',
  status: 'bill_sent',
  fullName: 'Max Mustermann',
  invoiceNumber: '2027-0001',
  invoiceAmount: 250,
  eventName: 'Hauptlager conveniat27 - Züri 11',
  roleType: 'Event::Role::Participant',
  billCreatedDate: '2026-08-22T00:00:00.000Z',
} as unknown as BillParticipant;

function createRequest(): {
  request: PayloadRequest;
  find: jest.Mock;
  sendEmail: jest.Mock;
  updateGlobal: jest.Mock;
} {
  const find = jest.fn().mockResolvedValue({ docs: [billed] });
  const sendEmail = jest.fn();
  const updateGlobal = jest.fn();

  return {
    find,
    sendEmail,
    updateGlobal,
    request: {
      url: 'http://localhost:3000/api/confidential/billing/export-xlsx',
      user: { email: 'admin@example.ch' },
      payload: {
        find,
        findGlobal: jest.fn().mockResolvedValue({ currency: 'CHF', paymentDeadlineDays: 30 }),
        sendEmail,
        updateGlobal,
        logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      },
    } as unknown as PayloadRequest,
  };
}

describe('billingExportXlsxHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses a caller without billing access', async () => {
    mockCanAccessBilling.mockReturnValue(false);
    const { request, find } = createRequest();

    const response = await billingExportXlsxHandler(request);

    expect(response.status).toBe(401);
    expect(find).not.toHaveBeenCalled();
  });

  it('serves the bill overview as a workbook named like the finance mail attachment', async () => {
    mockCanAccessBilling.mockReturnValue(true);
    const { request } = createRequest();

    const response = await billingExportXlsxHandler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    // No fake clock to pin the date to: ExcelJS zips the workbook on timers, and it
    // never finishes under Jest's fake ones.
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="rechnungsuebersicht-\d{4}-\d{2}-\d{2}\.xlsx"$/,
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await response.arrayBuffer());
    const sheet = workbook.worksheets[0];
    const values = sheet?.getRow(2).values as unknown[];
    expect(values).toContain('2027-0001');
    expect(values).toContain('Max Mustermann');
  });

  it('leaves the weekly send untouched', async () => {
    mockCanAccessBilling.mockReturnValue(true);
    const { request, sendEmail, updateGlobal } = createRequest();

    await billingExportXlsxHandler(request);

    // Downloading the overview must not mail it, and must not write `lastSentAt` — that
    // would talk the scheduler out of this week's send.
    expect(sendEmail).not.toHaveBeenCalled();
    expect(updateGlobal).not.toHaveBeenCalled();
  });
});
