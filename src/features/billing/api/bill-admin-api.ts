import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import type { PayloadHandler } from 'payload';

/**
 * POST /api/confidential/billing/sync – Sync participants from Cevi.DB
 */
export const billingSyncHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { syncParticipants } = await import('@/features/billing/services/sync-service');
    const result = await syncParticipants(request.payload);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Billing sync failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/generate – Generate QR Bill PDFs
 */
export const billingGenerateHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { generateBills } = await import('@/features/billing/services/bill-generator-service');
    const result = await generateBills(request.payload);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Bill generation failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/regenerate-all – Regenerate all existing bills
 */
export const billingRegenerateAllHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find all participants with a bill
    const existing = await request.payload.find({
      collection: 'bill-participants',
      where: {
        or: [{ status: { equals: 'bill_created' } }, { status: { equals: 'bill_sent' } }],
      },
      limit: 10_000,
      context: { internal: true },
    });

    // Reset status to re_added
    for (const document_ of existing.docs) {
      await request.payload.update({
        collection: 'bill-participants',
        id: document_.id,
        data: { status: 're_added' },
        context: { internal: true },
      });
    }

    const { generateBills } = await import('@/features/billing/services/bill-generator-service');
    const result = await generateBills(request.payload);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Bulk regenerate failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/regenerate-single – Regenerate a single bill
 */
export const billingRegenerateSingleHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await (request as unknown as Request).json()) as { participantId?: string };
    if (!body.participantId) {
      return Response.json({ error: 'Missing participantId' }, { status: 400 });
    }

    // Set status to re_added
    await request.payload.update({
      collection: 'bill-participants',
      id: body.participantId,
      data: { status: 're_added' },
      context: { internal: true },
    });

    const { generateBills } = await import('@/features/billing/services/bill-generator-service');
    const result = await generateBills(request.payload);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Single regenerate failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/send – Send bills via email
 */
export const billingSendHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sendBills } = await import('@/features/billing/services/email-service');
    const result = await sendBills(request.payload);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Bill sending failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/confidential/billing/send-single – Send bill via email for a single participant
 */
export const billingSendSingleHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await (request as unknown as Request).json()) as { participantId?: string };
    if (!body.participantId) {
      return Response.json({ error: 'Missing participantId' }, { status: 400 });
    }

    const { sendBills } = await import('@/features/billing/services/email-service');
    const result = await sendBills(request.payload, body.participantId);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `Single bill sending failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * GET /api/confidential/billing/export-csv – Download finance CSV
 */
export const billingExportCsvHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { generateFinanceCsv } = await import('@/features/billing/services/csv-export-service');
    const csv = await generateFinanceCsv(request.payload);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="conveniat27-billing-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `CSV export failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

/**
 * GET /api/confidential/billing/preview-pdf – Serve a bill PDF
 *
 * If `?participantId=...` is provided, fetches the stored base64 PDF for that participant.
 * If `?download=true` is also set, serves as attachment instead of inline.
 * Otherwise, generates a preview PDF for a fictive participant using current bill-settings.
 */
export const billingPreviewPdfHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url ?? 'http://localhost');
    const participantId = url.searchParams.get('participantId');
    const isDownload = url.searchParams.get('download') === 'true';

    // ── Serve a stored participant PDF ──────────────────────────────────
    if (participantId) {
      const document_ = await request.payload.findByID({
        collection: 'bill-participants',
        id: participantId,
        context: { internal: true },
      });

      const base64Pdf = document_.billPdfPath as string | undefined;
      if (!base64Pdf) {
        return Response.json({ error: 'No PDF available for this participant' }, { status: 404 });
      }

      const pdfBuffer = Buffer.from(base64Pdf, 'base64');
      const invoiceNumber = (document_.invoiceNumber as string | undefined) ?? 'Rechnung';
      const disposition = isDownload
        ? `attachment; filename="Rechnung-${invoiceNumber}.pdf"`
        : `inline; filename="Rechnung-${invoiceNumber}.pdf"`;

      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': disposition,
          'Cache-Control': 'no-cache',
        },
      });
    }

    // ── Generate a fictive preview PDF ──────────────────────────────────
    const { generateQrBillPdf } =
      await import('@/features/billing/services/bill-generator-service');

    const settings = await request.payload.findGlobal({
      slug: 'bill-settings',
      context: { internal: true },
    });

    const creditorName = (settings.creditorName as string | undefined) ?? 'conveniat27';
    const creditorIban = (settings.creditorIban as string | undefined) ?? 'CH8500700114904034095';
    const creditorStreet = (settings.creditorStreet as string | undefined) ?? 'Musterstrasse';
    const creditorBuildingNumber =
      (settings.creditorBuildingNumber as string | undefined) ?? undefined;
    const creditorZip = (settings.creditorZip as string | undefined) ?? '8001';
    const creditorCity = (settings.creditorCity as string | undefined) ?? 'Zürich';
    const currency = (settings.currency as string | undefined) ?? 'CHF';
    const invoiceLetterText =
      (settings.invoiceLetterText as string | undefined) ??
      'Vielen Dank für deine Anmeldung zum conveniat27.';
    const paymentDeadlineDays = (settings.paymentDeadlineDays as number | undefined) ?? 30;

    // Resolve preview amount from role pricing (use "Participant" default)
    const rolePricing =
      (settings.rolePricing as
        | Array<{ roleTypePattern: string; label: string; amount: number; vatCode?: string }>
        | undefined) ?? [];
    const participantPricing =
      rolePricing.find((rp) => rp.roleTypePattern.toLowerCase().includes('participant')) ??
      rolePricing[0];
    const amount = Number(participantPricing?.amount) || 150;
    const roleLabel = participantPricing?.label || 'Teilnehmer:in';
    const vatCode = participantPricing?.vatCode;

    const customReferenceTemplate = settings.customReferenceTemplate as string | undefined;
    let customReference: string | undefined;
    if (customReferenceTemplate) {
      customReference = customReferenceTemplate
        .replaceAll('{{year}}', new Date().getFullYear().toString())
        .replaceAll('{{event-id}}', '1234')
        .replaceAll('{{group-id}}', '5678')
        .replaceAll('{{participation-id}}', '9012');
    }

    const documentTitle =
      (settings.documentTitle as string | undefined) ?? 'ANMELDEBESTÄTIGUNG UND RECHNUNG';

    const pdfBuffer = await generateQrBillPdf({
      documentTitle,
      creditor: {
        name: creditorName,
        street: creditorStreet,
        ...(creditorBuildingNumber ? { buildingNumber: creditorBuildingNumber } : {}),
        zip: creditorZip,
        city: creditorCity,
        account: creditorIban,
        country: 'CH',
      },
      debtor: {
        name: 'Maximilian Muster',
        street: 'Musterstrasse',
        buildingNumber: '42',
        zip: '8000',
        city: 'Zürich',
        country: 'CH',
      },
      amount,
      currency,
      reference: '000000000000000000000000000',
      ...(customReference ? { customReference } : {}),
      invoiceNumber: `${((settings.invoiceNumberPrefix as string) || '{{year}}')
        .replaceAll('{{year}}', new Date().getFullYear().toString())
        .replaceAll('{{event-id}}', '1234')
        .replaceAll('{{group-id}}', '5678')
        .replaceAll('{{participation-id}}', '9012')}-0001`,
      invoiceLetterText,
      roleLabel,
      vatCode,
      paymentDeadlineDays,
      firstName: 'Maximilian',
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="preview-rechnung.pdf"',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    request.payload.logger.error({ err: error }, `PDF preview failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};
