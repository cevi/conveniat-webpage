// the bill history's access rules read the group settings; no group matters to sending
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/features/payload-cms/payload-cms/utils/email-outbox', () => ({
  queueBackgroundEmail: jest.fn(() => Promise.resolve({ outgoingEmailId: 'mail-1' })),
}));
jest.mock('@/features/visit-day/billing/render-visit-day-bill-pdf', () => ({
  renderVisitDayBillPdf: jest.fn(() => Promise.resolve(Buffer.from('%PDF rendered now'))),
}));
jest.mock('@/lib/s3', () => ({
  BILL_PDF_BUCKET_NAME: 'bills',
  s3Client: {
    send: jest.fn(() =>
      Promise.resolve({
        Body: { transformToByteArray: () => Promise.resolve(Buffer.from('%PDF as first sent')) },
      }),
    ),
  },
}));

import { queueBackgroundEmail } from '@/features/payload-cms/payload-cms/utils/email-outbox';
import type { VisitDayBill } from '@/features/payload-cms/payload-types';
import { sendVisitDayBill, storedPdfName } from '@/features/visit-day/billing/visit-day-bill-mail';
import type { Payload } from 'payload';

const queued = queueBackgroundEmail as jest.MockedFunction<typeof queueBackgroundEmail>;

const bill: VisitDayBill = {
  id: 'anna',
  status: 'open',
  email: 'anna@example.ch',
  fullName: 'Anna Muster',
  locale: 'de',
  invoiceNumber: 'BT2027-0004',
  registrationNumber: '991001-B004',
  referenceNumber: '091000000000000000004000013',
  invoiceAmount: 50,
  visitDate: '2027-07-28T10:00:00.000Z',
  issuedAt: '2027-03-01T10:00:00.000Z',
  dueDate: '2027-03-31T10:00:00.000Z',
  issuedBills: [],
} as unknown as VisitDayBill;

/** A Payload that holds the given bill PDFs, by filename. */
const fakePayload = (
  storedPdfs: string[],
): {
  payload: Payload;
  create: jest.Mock<Promise<{ id: string }>, [{ collection: string; file?: { name: string } }]>;
  linkPdf: jest.Mock;
} => {
  const create = jest.fn((args: { collection: string; file?: { name: string } }) =>
    Promise.resolve({ id: args.collection === 'bill-pdfs' ? 'pdf-new' : 'event' }),
  );
  const linkPdf = jest.fn(() => Promise.resolve({ matchedCount: 1 }));
  const payload = {
    findByID: jest.fn(() => Promise.resolve(bill)),
    find: jest.fn((args: { where: { filename: { equals: string } } }) =>
      Promise.resolve({
        docs: storedPdfs.includes(args.where.filename.equals) ? [{ id: 'pdf-first' }] : [],
      }),
    ),
    findGlobal: jest.fn(() =>
      Promise.resolve({ documentTitle: 'Rechnung', emailSubject: 'Rechnung', emailBody: 'Hallo' }),
    ),
    create,
    update: jest.fn(() => Promise.resolve({})),
    db: { collections: { 'visit-day-bills': { updateOne: linkPdf } } },
    logger: { info: jest.fn() },
  } as unknown as Payload;
  return { payload, create, linkPdf };
};

const attachment = (): string => {
  const content = queued.mock.lastCall?.[1].attachments?.[0]?.content;
  return Buffer.isBuffer(content) ? content.toString() : String(content);
};

describe('sendVisitDayBill', () => {
  beforeEach(() => queued.mockClear());

  it('stores the PDF on the first send and links it to its issue in place', async () => {
    const { payload, create, linkPdf } = fakePayload([]);
    await sendVisitDayBill(payload, { billId: 'anna', actor: 'Kim Finanzen' });

    const [stored] = create.mock.calls.find(([args]) => args.collection === 'bill-pdfs') ?? [];
    expect(stored?.file?.name).toBe('besuchstag-BT2027-0004-rechnung.pdf');
    expect(linkPdf).toHaveBeenCalledWith(
      { _id: 'anna', invoiceNumber: 'BT2027-0004' },
      { $set: { pdf: 'pdf-new', updatedAt: expect.any(Date) as unknown } },
    );
    expect(linkPdf).toHaveBeenCalledWith(
      { _id: 'anna', invoiceNumber: 'BT2027-0004', 'issuedBills.invoiceNumber': 'BT2027-0004' },
      { $set: { 'issuedBills.$.pdf': 'pdf-new' } },
    );
    expect(attachment()).toBe('%PDF rendered now');
  });

  it('mails the stored PDF on a resend or a retry, not a new rendering, and links it', async () => {
    const { payload, create, linkPdf } = fakePayload([storedPdfName('BT2027-0004')]);
    await sendVisitDayBill(payload, { billId: 'anna', actor: 'Kim Finanzen' });

    expect(create).not.toHaveBeenCalledWith(expect.objectContaining({ collection: 'bill-pdfs' }));
    expect(attachment()).toBe('%PDF as first sent');
    // a send that stored the PDF and failed before linking it leaves the bill without one
    expect(linkPdf).toHaveBeenCalledWith(
      { _id: 'anna', invoiceNumber: 'BT2027-0004' },
      { $set: { pdf: 'pdf-first', updatedAt: expect.any(Date) as unknown } },
    );
  });
});
