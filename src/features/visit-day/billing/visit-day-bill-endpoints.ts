import { readBillPdf } from '@/features/billing-core/bill-pdf-storage';
import { describeActor } from '@/features/billing-core/describe-actor';
import { canAccessBilling } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { VisitDayBill } from '@/features/payload-cms/payload-types';
import {
  cancelVisitDayBill,
  markVisitDayBillPaid,
  reduceVisitDayPersons,
  reissueVisitDayBill,
  resendFailedVisitDayBills,
  resendVisitDayBill,
  VisitDayBillActionError,
} from '@/features/visit-day/billing/visit-day-bill-actions';
import { VISIT_DAY_BILL_COLLECTION } from '@/features/visit-day/billing/visit-day-bill-booking';
import {
  buildAddressWorkbook,
  buildBillsWorkbook,
} from '@/features/visit-day/billing/visit-day-bill-exports';
import { renderVisitDayBillPreview } from '@/features/visit-day/billing/visit-day-bill-preview';
import prisma from '@/lib/db/prisma';
import type { Endpoint, PayloadHandler, PayloadRequest } from 'payload';
import { z } from 'zod';

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('resend') }),
  z.object({ action: z.literal('reissue'), reason: z.string().optional() }),
  z.object({
    action: z.literal('reduce'),
    keepPersonNumbers: z.array(z.number().int()).min(1),
    reason: z.string(),
  }),
  z.object({ action: z.literal('cancel'), reason: z.string() }),
  z.object({ action: z.literal('mark-paid'), note: z.string() }),
]);

export type VisitDayBillAction = z.infer<typeof ActionSchema>;

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Wraps a handler in the billing access check and turns a refused action into a 400. */
const guarded =
  (handler: (request: PayloadRequest) => Promise<Response>): PayloadHandler =>
  async (request) => {
    if ((await canAccessBilling({ req: request })) !== true) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof VisitDayBillActionError) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      request.payload.logger.error({
        err: error,
        msg: `Besuchstag bill action failed: ${message}`,
      });
      return Response.json({ error: message }, { status: 500 });
    }
  };

/** POST /api/visit-day-bills/:id/action – one of the actions in a bill's sidebar. */
const actionHandler = guarded(async (request) => {
  const id = request.routeParams?.['id'];
  if (typeof id !== 'string') return Response.json({ error: 'Missing id' }, { status: 400 });
  const parsed = ActionSchema.safeParse(await (request as unknown as Request).json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  const actor = describeActor(request.user);
  const { payload } = request;
  const body = parsed.data;
  switch (body.action) {
    case 'resend': {
      await resendVisitDayBill(payload, id, actor);
      break;
    }
    case 'reissue': {
      await reissueVisitDayBill(payload, id, actor, {
        ...(body.reason === undefined || body.reason.trim() === '' ? {} : { reason: body.reason }),
      });
      break;
    }
    case 'reduce': {
      await reduceVisitDayPersons(payload, prisma, id, actor, {
        keepPersonNumbers: body.keepPersonNumbers,
        reason: body.reason,
      });
      break;
    }
    case 'cancel': {
      await cancelVisitDayBill(payload, prisma, id, actor, body.reason);
      break;
    }
    case 'mark-paid': {
      await markVisitDayBillPaid(payload, id, actor, body.note);
      break;
    }
  }
  payload.logger.info(`Besuchstag bill ${id}: ${body.action} by ${actor}.`);
  return Response.json({ success: true });
});

/** POST /api/visit-day-bills/resend-failed – mails every bill whose mail failed. */
const resendFailedHandler = guarded(async (request) => {
  const count = await resendFailedVisitDayBills(request.payload, describeActor(request.user));
  return Response.json({ success: true, count });
});

/** Every Besuchstag bill, a few hundred at most. */
const allBills = (request: PayloadRequest): Promise<{ docs: VisitDayBill[] }> =>
  request.payload.find({
    collection: VISIT_DAY_BILL_COLLECTION,
    pagination: false,
    depth: 0,
    joins: false,
    sort: 'registrationNumber',
    overrideAccess: true,
  });

/** GET /api/visit-day-bills/summary – the counts above the list. */
const summaryHandler = guarded(async (request) => {
  const { docs } = await allBills(request);
  const open = docs.filter((bill) => bill.status === 'open');
  const paid = docs.filter((bill) => bill.status === 'paid');
  return Response.json({
    total: docs.filter((bill) => bill.status !== 'cancelled').length,
    open: open.length,
    openAmount: open.reduce((sum, bill) => sum + bill.invoiceAmount, 0),
    paid: paid.length,
    paidAmount: paid.reduce((sum, bill) => sum + (bill.paidAmount ?? bill.invoiceAmount), 0),
    cancelled: docs.length - open.length - paid.length,
    mailFailed: docs.filter((bill) => bill.mailStatus === 'failed').length,
    refundDue: docs.filter((bill) => (bill.refundDue ?? 0) > 0).length,
  });
});

const download = (buffer: Buffer, filename: string): Response =>
  new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': XLSX,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });

/** GET /api/visit-day-bills/export-xlsx – every bill, one row each. */
const exportBillsHandler = guarded(async (request) => {
  const { docs } = await allBills(request);
  return download(await buildBillsWorkbook(docs), 'besuchstag-rechnungen.xlsx');
});

/** GET /api/visit-day-bills/export-addresses – the rail tickets per postal address. */
const exportAddressesHandler = guarded(async (request) => {
  const { docs } = await allBills(request);
  request.payload.logger.info(
    `Besuchstag address export by ${describeActor(request.user)}: ${String(docs.length)} bills.`,
  );
  return download(await buildAddressWorkbook(docs), 'besuchstag-sbb-billette.xlsx');
});

/**
 * GET /api/visit-day-bills/preview-pdf?locale=fr – a sample bill from the saved settings, in the
 * language whose texts the settings page is editing.
 */
const previewHandler = guarded(async (request) => {
  const requested = request.searchParams.get('locale');
  const locale = requested === 'fr' || requested === 'en' ? requested : 'de';
  const pdf = await renderVisitDayBillPreview(request.payload, locale);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="besuchstag-vorschau-${locale}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
});

/**
 * GET /api/visit-day-bills/:id/pdf – the PDF of the bill as it stands, to read in the browser. A
 * bill issued again has none until its new one is stored.
 */
const storedPdfHandler = guarded(async (request) => {
  const id = request.routeParams?.['id'];
  if (typeof id !== 'string') return Response.json({ error: 'Missing id' }, { status: 400 });
  const bill = await request.payload.findByID({
    collection: VISIT_DAY_BILL_COLLECTION,
    id,
    depth: 1,
    joins: false,
    disableErrors: true,
    overrideAccess: true,
  });
  const filename = typeof bill?.pdf === 'object' ? bill.pdf?.filename : undefined;
  if (bill === null || typeof filename !== 'string') {
    return Response.json({ error: 'No PDF for this bill yet' }, { status: 404 });
  }
  return new Response(new Uint8Array(await readBillPdf(filename)), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="besuchstag-${bill.invoiceNumber}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
});

export const visitDayBillEndpoints: Endpoint[] = [
  { path: '/summary', method: 'get', handler: summaryHandler },
  { path: '/export-xlsx', method: 'get', handler: exportBillsHandler },
  { path: '/export-addresses', method: 'get', handler: exportAddressesHandler },
  { path: '/resend-failed', method: 'post', handler: resendFailedHandler },
  { path: '/preview-pdf', method: 'get', handler: previewHandler },
  { path: '/:id/action', method: 'post', handler: actionHandler },
  { path: '/:id/pdf', method: 'get', handler: storedPdfHandler },
];
