import {
  describeRemoval,
  recordNewBill,
  recordRemoval,
  resolveIssuedBills,
} from '@/features/billing/services/issued-bills';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload';

/** The filenames of a row's PDFs, which name the bills raised before `issuedBills` existed. */
const findPdfFilenames = async (
  request: PayloadRequest,
  billPdfs: BillParticipant['billPdfs'],
): Promise<string[]> => {
  const ids = (billPdfs ?? []).map((pdf) => (typeof pdf === 'object' ? pdf.id : pdf));
  if (ids.length === 0) return [];
  const result = await request.payload.find({
    collection: 'bill-pdfs',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    req: request,
    context: { internal: true },
  });
  return result.docs.flatMap((pdf) => (typeof pdf.filename === 'string' ? [pdf.filename] : []));
};

/**
 * Records every bill a row is given and every cancellation of one in `issuedBills`.
 *
 * Done here rather than in the generator and the three places that remove a registration,
 * because every one of those writes passes through this hook, and a writer that forgot to
 * record would drop a bill from the finance export without anybody noticing.
 */
export const recordIssuedBills: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (operation !== 'update' || originalDoc === undefined) return data as unknown;

  const next = data as Partial<BillParticipant>;
  const previous = originalDoc as BillParticipant;

  const newInvoice = next.invoiceNumber;
  const raisesBill =
    typeof newInvoice === 'string' && newInvoice !== '' && newInvoice !== previous.invoiceNumber;
  const removes = next.status === 'removed' && previous.status !== 'removed';
  if (!raisesBill && !removes) return data as unknown;

  // A row written before `issuedBills` existed is seeded from its invoice fields and PDFs
  // first, so the bill it carries today is not lost the first time it changes.
  const pdfFilenames =
    (previous.issuedBills ?? []).length === 0 ? await findPdfFilenames(req, previous.billPdfs) : [];
  let bills = resolveIssuedBills(previous, pdfFilenames);

  const now = new Date().toISOString();
  if (removes) {
    bills = recordRemoval(bills, describeRemoval(next.syncHistory ?? previous.syncHistory), now);
  }
  if (raisesBill) {
    bills = recordNewBill(
      bills,
      {
        invoiceNumber: newInvoice,
        // eslint-disable-next-line unicorn/no-null -- Payload types an unset field as null
        referenceNumber: next.referenceNumber ?? null,
        // eslint-disable-next-line unicorn/no-null -- Payload types an unset field as null
        invoiceAmount: next.invoiceAmount ?? null,
        billCreatedDate: next.billCreatedDate ?? now,
      },
      now,
    );
  }

  return { ...next, issuedBills: bills };
};
