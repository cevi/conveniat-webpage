import type { GenerationSummary } from '@/features/billing/types';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import { PersonService } from '@/features/registration_process/hitobito-api/services/person.service';
import fs from 'node:fs';
import path from 'node:path';
import type { Payload } from 'payload';
import type { PDFRow } from 'swissqrbill/pdf';

interface BillSettings {
  creditorName: string;
  creditorIban: string;
  creditorStreet: string;
  creditorBuildingNumber?: string;
  creditorZip: string;
  creditorCity: string;
  creditorUid?: string;
  creditorEmail?: string;
  creditorWebsite?: string;
  currency: string;
  referencePrefix: string;
  nextReferenceNumber: number;
  invoiceNumberPrefix: string;
  customReferenceTemplate?: string;
  documentTitle?: string;
  paymentDeadlineDays: number;
  invoiceLetterText: string;
  rolePricing: Array<{
    roleTypePattern: string;
    label: string;
    amount: number;
    vatCode?: string;
  }>;
}

interface SyncHistoryEntry {
  date: string;
  action: string;
}

/**
 * Resolves the invoice amount for a participant based on their role type
 * and the configured role pricing rules.
 */
function resolvePricing(
  roleType: string,
  rolePricing: BillSettings['rolePricing'],
): { amount: number; label: string; vatCode?: string | undefined } {
  for (const pricing of rolePricing) {
    if (roleType.toLowerCase().includes(pricing.roleTypePattern.toLowerCase())) {
      return {
        amount: Number(pricing.amount) || 0,
        label: pricing.label,
        vatCode: pricing.vatCode,
      };
    }
  }
  // Default to the first pricing entry if no match
  const defaultPricing = rolePricing[0];
  return {
    amount: Number(defaultPricing?.amount) || 0,
    label: defaultPricing?.label ?? 'Teilnehmer:in',
    vatCode: defaultPricing?.vatCode,
  };
}

/**
 * Generates a QR reference number from the prefix and sequential counter.
 */
function generateQrReference(prefix: string, counter: number): string {
  const baseReference = `${prefix}${String(counter).padStart(6, '0')}`;
  const padded = baseReference.padStart(26, '0').slice(0, 26);
  const checkDigit = calculateModule10Recursive(padded);
  return `${padded}${String(checkDigit)}`;
}

/**
 * Mod-10 recursive check digit calculation for QR reference numbers.
 */
function calculateModule10Recursive(reference: string): number {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;
  for (const char of reference) {
    carry = table[(carry + Number.parseInt(char, 10)) % 10] ?? 0;
  }
  return (10 - carry) % 10;
}

/**
 * Generates QR Bill PDFs for all participants with status 'new' or 're_added'.
 */
export async function generateBills(payload: Payload): Promise<GenerationSummary> {
  const summary: GenerationSummary = {
    generatedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  // 1. Load bill settings
  const rawSettings = await payload.findGlobal({
    slug: 'bill-settings',
    context: { internal: true },
  });
  const settings = rawSettings as unknown as BillSettings;

  if (!settings.creditorIban || !settings.creditorName) {
    summary.errors.push('Creditor IBAN or name not configured in Bill Settings.');
    return summary;
  }

  const rolePricing = settings.rolePricing;
  if (rolePricing.length === 0) {
    summary.errors.push('No role pricing configured in Bill Settings.');
    return summary;
  }

  const logger = {
    info: (message: string): void => {
      payload.logger.info(message);
    },
    warn: (message: string): void => {
      payload.logger.warn(message);
    },
    error: (message: string): void => {
      payload.logger.error(message);
    },
  };

  const client = new HitobitoClient(
    {
      baseUrl: HITOBITO_CONFIG.baseUrl,
      apiToken: HITOBITO_CONFIG.apiToken,
      browserCookie: '',
    },
    logger,
  );
  const personService = new PersonService(client, logger);

  // 2. Query participants needing bills
  const participants = await payload.find({
    collection: 'bill-participants',
    context: { internal: true },
    where: {
      or: [{ status: { equals: 'new' } }, { status: { equals: 're_added' } }],
    },
    limit: 10_000,
  });

  if (participants.docs.length === 0) {
    payload.logger.info('No participants need bill generation.');
    return summary;
  }

  // 3. Track current reference number
  let currentReferenceNumber = settings.nextReferenceNumber;
  let invoiceCounter = 1;

  for (const document_ of participants.docs) {
    try {
      const userId = document_.userId;
      const roleType = document_.roleType as string;
      const pricing = resolvePricing(roleType, rolePricing);
      const amount = pricing.amount;
      const roleLabel = pricing.label;
      const vatCode = pricing.vatCode;

      if (amount <= 0) {
        summary.skippedCount++;
        continue;
      }

      // Fetch person address from Cevi.DB
      const personResult = await personService.getDetails({ personId: userId });
      const personAttributes = personResult.success ? personResult.attributes : undefined;

      const firstName = personAttributes?.first_name ?? document_.fullName.split(' ')[0] ?? '';
      const lastName =
        personAttributes?.last_name ?? document_.fullName.split(' ').slice(1).join(' ');

      // Parse Address to Structured format (SIX requirement)
      let street = '';
      let buildingNumber: string | undefined = undefined;

      const hitobitoAddress = (personAttributes?.address as string | undefined) ?? '';
      const hitobitoStreet = (personAttributes as Record<string, unknown> | undefined)?.[
        'street'
      ] as string | undefined;
      const hitobitoHouseNumber = (personAttributes as Record<string, unknown> | undefined)?.[
        'house_number'
      ] as string | undefined;

      if (hitobitoStreet) {
        // Use native structured fields if available
        street = hitobitoStreet;
        buildingNumber = hitobitoHouseNumber;
      } else if (hitobitoAddress) {
        // Fallback: parse combined address string
        const match = hitobitoAddress.match(/^(.*?)\s*(\d+[a-zA-Z]?.*)?$/);
        street = match?.[1]?.trim() ?? hitobitoAddress;
        buildingNumber = match?.[2]?.trim();
      }

      const zip = personAttributes?.zip ?? '';
      const city = personAttributes?.town ?? '';

      // Generate reference number
      const referenceNumber = generateQrReference(settings.referencePrefix, currentReferenceNumber);
      const currentYear = new Date().getFullYear().toString();
      const prefix = settings.invoiceNumberPrefix
        .replaceAll('{{year}}', currentYear)
        .replaceAll('{{event-id}}', document_.eventId ?? '')
        .replaceAll('{{group-id}}', document_.groupId ?? '')
        .replaceAll('{{participation-id}}', document_.participationUuid ?? '');
      const invoiceNumber = `${prefix}-${String(invoiceCounter).padStart(4, '0')}`;

      const customReference = (settings.customReferenceTemplate || '')
        .replaceAll('{{year}}', currentYear)
        .replaceAll('{{event-id}}', document_.eventId ?? '')
        .replaceAll('{{group-id}}', document_.groupId ?? '')
        .replaceAll('{{participation-id}}', document_.participationUuid ?? '');

      // Generate PDF
      const documentTitle = settings.documentTitle || 'ANMELDEBESTÄTIGUNG UND RECHNUNG';

      const pdfBuffer = await generateQrBillPdf({
        documentTitle,
        creditor: {
          name: settings.creditorName,
          street: settings.creditorStreet,
          ...(settings.creditorBuildingNumber
            ? { buildingNumber: settings.creditorBuildingNumber }
            : {}),
          zip: settings.creditorZip,
          city: settings.creditorCity,
          account: settings.creditorIban,
          country: 'CH',
        },
        debtor: {
          name: `${firstName} ${lastName}`.trim(),
          street,
          ...(buildingNumber ? { buildingNumber } : {}),
          zip,
          city,
          country: 'CH',
        },
        amount,
        currency: settings.currency,
        reference: referenceNumber,
        invoiceNumber,
        customReference,
        invoiceLetterText: settings.invoiceLetterText,
        roleLabel,
        vatCode,
        paymentDeadlineDays: settings.paymentDeadlineDays,
        firstName,
      });

      // Store PDF buffer as base64
      const pdfBase64 = pdfBuffer.toString('base64');

      const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];
      await payload.update({
        collection: 'bill-participants',
        context: { internal: true },
        id: document_.id,
        data: {
          status: 'bill_created',
          billCreatedDate: new Date().toISOString(),
          referenceNumber,
          invoiceNumber,
          invoiceAmount: amount,
          billPdfPath: pdfBase64,
          syncHistory: [...history, { date: new Date().toISOString(), action: 'bill_generated' }],
        },
      });

      currentReferenceNumber++;
      invoiceCounter++;
      summary.generatedCount++;
    } catch (error) {
      summary.errors.push(
        `Participant ${String(document_.id)} (${String(document_.fullName)}): ${String(error)}`,
      );
    }
  }

  // Update the next reference number in settings
  await payload.updateGlobal({
    slug: 'bill-settings',
    data: {
      nextReferenceNumber: currentReferenceNumber,
    },
  });

  payload.logger.info(
    `Bill generation complete: ${String(summary.generatedCount)} generated, ${String(summary.skippedCount)} skipped`,
  );

  return summary;
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

interface PdfGenerationParameters {
  creditor: {
    name: string;
    street: string;
    buildingNumber?: string | undefined;
    zip: string;
    city: string;
    account: string;
    country: string;
    uid?: string | undefined;
    email?: string | undefined;
    website?: string | undefined;
  };
  debtor: {
    name: string;
    street: string;
    buildingNumber?: string | undefined;
    zip: string;
    city: string;
    country: string;
  };
  amount: number;
  currency: string;
  reference: string;
  invoiceNumber: string;
  customReference?: string;
  documentTitle: string;
  invoiceLetterText: string;
  roleLabel: string;
  vatCode?: string | undefined;
  paymentDeadlineDays: number;
  firstName: string;
}

/**
 * Generates a single QR Bill PDF with a letter page and the QR bill attachment.
 *
 * Uses SwissQRBill v4 API: create a PDFDocument, render the letter content,
 * then attach the QR bill via SwissQRBill.attachTo(doc).
 */
export async function generateQrBillPdf(parameters: PdfGenerationParameters): Promise<Buffer> {
  // Dynamic imports to keep these server-only
  const pdfkitModule = await import('pdfkit');
  const PDFDocument = pdfkitModule.default;
  const { SwissQRBill, Table } = await import('swissqrbill/pdf');
  const { mm2pt } = await import('swissqrbill/utils');

  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];

    // Initialize PDFKit document without QR code (QR part is attached later)
    const document_ = new PDFDocument({
      autoFirstPage: true,
      size: 'A4',
      margins: { top: 72, left: mm2pt(22), right: mm2pt(22), bottom: mm2pt(10) },
    });

    // Collect PDF buffer
    document_.on('data', (chunk: Buffer) => buffers.push(chunk));
    document_.on('end', () => resolve(Buffer.concat(buffers)));
    document_.on('error', reject);

    // ── Page 1: Invoice Letter ──

    // Register custom fonts
    try {
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Montserrat-ExtraBold.ttf');
      if (fs.existsSync(fontPath)) {
        document_.registerFont('Montserrat-ExtraBold', fontPath);
      }
    } catch {
      // Ignore font loading errors
    }

    const drawLogo = (): void => {
      try {
        const logoPath = path.join(process.cwd(), 'public', 'logo-conveniat27.png');
        if (fs.existsSync(logoPath)) {
          document_.image(logoPath, mm2pt(148), mm2pt(8), {
            width: mm2pt(40),
          });
        }
      } catch {
        // Ignore logo rendering errors
      }
    };

    // Draw logo on first page
    drawLogo();

    // Creditor info (top left)
    document_.fontSize(9);
    document_.fillColor('#000000');
    document_.font('Helvetica');
    document_.text(
      `${parameters.creditor.name}\n${parameters.creditor.street} ${parameters.creditor.buildingNumber ?? ''}\n${parameters.creditor.zip} ${parameters.creditor.city}`,
      mm2pt(22),
      mm2pt(45),
      {
        width: mm2pt(85),
        height: mm2pt(30),
        align: 'left',
      },
    );

    // Debtor address (top right - Swiss C5 window standard)
    // Window starts at y=50mm and goes down to 95mm. x=120mm is standard right-window.
    document_.fontSize(11);
    document_.fillColor('black');
    document_.font('Helvetica');
    document_.text(
      `${parameters.debtor.name}\n${parameters.debtor.street} ${parameters.debtor.buildingNumber ?? ''}\n${parameters.debtor.zip} ${parameters.debtor.city}`,
      mm2pt(120),
      mm2pt(50),
      {
        width: mm2pt(70),
        height: mm2pt(50),
        align: 'left',
      },
    );

    // Metadata Block (Invoice Date, Due Date, Reference)
    const date = new Date();
    const dateString = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getFullYear())}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parameters.paymentDeadlineDays);
    const dueDateString = `${String(dueDate.getDate()).padStart(2, '0')}.${String(dueDate.getMonth() + 1).padStart(2, '0')}.${String(dueDate.getFullYear())}`;

    document_.fontSize(9);
    document_.fillColor('gray');

    // Labels
    document_.text('Rechnungsdatum:', mm2pt(22), mm2pt(85), { width: mm2pt(35), align: 'left' });
    document_.text('Zahlbar bis:', mm2pt(22), mm2pt(90), { width: mm2pt(35), align: 'left' });
    document_.text('Rechnung Nr.:', mm2pt(22), mm2pt(95), { width: mm2pt(35), align: 'left' });
    if (parameters.customReference) {
      document_.text('Referenz:', mm2pt(22), mm2pt(100), { width: mm2pt(35), align: 'left' });
    }

    // Values
    document_.fillColor('black');
    document_.text(dateString, mm2pt(57), mm2pt(85), { width: mm2pt(40), align: 'left' });
    document_.text(dueDateString, mm2pt(57), mm2pt(90), { width: mm2pt(40), align: 'left' });
    document_.text(parameters.invoiceNumber, mm2pt(57), mm2pt(95), {
      width: mm2pt(80),
      align: 'left',
    });
    if (parameters.customReference) {
      document_.text(parameters.customReference, mm2pt(57), mm2pt(100), {
        width: mm2pt(80),
        align: 'left',
      });
    }

    // Title
    document_.fontSize(15);
    document_.fillColor('#47564C'); // Accent Green
    document_.font('Montserrat-ExtraBold');
    // Shift title down slightly if custom reference is present
    const titleY = parameters.customReference ? 115 : 110;
    document_.text(parameters.documentTitle, mm2pt(22), mm2pt(titleY), {
      width: mm2pt(165),
      align: 'left',
    });

    // Letter body
    const letterText = parameters.invoiceLetterText
      .replaceAll('{{firstName}}', parameters.firstName)
      .replaceAll('{{amount}}', String(parameters.amount))
      .replaceAll('{{reference}}', parameters.reference);

    const letterY = parameters.customReference ? 130 : 125;
    document_.fontSize(10);
    document_.fillColor('#000000');
    document_.font('Helvetica');
    document_.text(letterText, mm2pt(22), mm2pt(letterY), {
      width: mm2pt(165),
      align: 'left',
      lineGap: 2,
    });

    // Add margin between text and table
    document_.moveDown(2);

    // Invoice table
    const amountNumber = Number(parameters.amount) || 0;
    const vatRate = parameters.vatCode
      ? Number.parseFloat(parameters.vatCode.replace('%', '').replace(',', '.'))
      : 0;
    const isVatApplied = !Number.isNaN(vatRate) && vatRate > 0;

    const vatAmount = isVatApplied ? (amountNumber * vatRate) / (100 + vatRate) : 0;
    const subtotal = amountNumber - vatAmount;

    // Build the rows array dynamically
    const tableRows: PDFRow[] = [
      {
        borderColor: '#ECF0F1',
        borderWidth: [1, 0, 0, 0],
        columns: [
          { text: 'Pos', width: mm2pt(10), fontSize: 9 },
          { text: 'Beschreibung', width: mm2pt(75) },
          { text: 'Menge', width: mm2pt(20), fontSize: 9, textOptions: { align: 'center' } },
          { text: 'Einzelpreis', width: mm2pt(30), fontSize: 9, textOptions: { align: 'center' } },
          { text: 'Total (CHF)', width: mm2pt(30), fontSize: 9, textOptions: { align: 'center' } },
        ],
      },
      {
        borderColor: '#ECF0F1',
        borderWidth: [1, 0, 0, 0],
        columns: [
          { text: '1', fontSize: 9, width: mm2pt(10) },
          {
            text: `${parameters.roleLabel} – conveniat27`,
            fontSize: 9,
            width: mm2pt(75),
          },
          { text: '1', width: mm2pt(20), fontSize: 9, textOptions: { align: 'center' } },
          {
            text: `CHF ${isVatApplied ? subtotal.toFixed(2) : amountNumber.toFixed(2)}`,
            width: mm2pt(30),
            fontSize: 9,
            textOptions: { align: 'center' },
          },
          {
            text: `CHF ${isVatApplied ? subtotal.toFixed(2) : amountNumber.toFixed(2)}`,
            width: mm2pt(30),
            fontSize: 9,
            textOptions: { align: 'center' },
          },
        ],
      },
    ];

    if (isVatApplied) {
      tableRows.push(
        {
          borderColor: '#ECF0F1',
          borderWidth: [1, 0, 0, 0],
          columns: [
            { text: ' ', width: mm2pt(10) },
            { text: 'Zwischensumme', fontSize: 9, width: mm2pt(75) },
            { text: ' ', width: mm2pt(20) },
            { text: ' ', width: mm2pt(30) },
            {
              text: `CHF ${subtotal.toFixed(2)}`,
              width: mm2pt(30),
              fontSize: 9,
              textOptions: { align: 'center' },
            },
          ],
        },
        {
          borderColor: '#ECF0F1',
          borderWidth: [1, 0, 0, 0],
          columns: [
            { text: ' ', width: mm2pt(10) },
            { text: `zzgl. Mehrwertsteuer ${parameters.vatCode}`, fontSize: 9, width: mm2pt(75) },
            { text: ' ', width: mm2pt(20) },
            { text: ' ', width: mm2pt(30) },
            {
              text: `CHF ${vatAmount.toFixed(2)}`,
              width: mm2pt(30),
              fontSize: 9,
              textOptions: { align: 'center' },
            },
          ],
        },
      );
    }

    tableRows.push({
      borderColor: '#ECF0F1',
      borderWidth: [1, 0, 0, 0],
      columns: [
        { text: ' ', width: mm2pt(10) },
        {
          text: 'Total',
          fontName: 'Helvetica-Bold',
          fontSize: 9,
          width: mm2pt(75),
        },
        { text: ' ', width: mm2pt(20) },
        { text: ' ', width: mm2pt(30) },
        {
          text: `CHF ${amountNumber.toFixed(2)}`,
          fontName: 'Helvetica-Bold',
          width: mm2pt(30),
          fontSize: 9,
          textOptions: { align: 'center' },
        },
      ],
    });

    const tableData = {
      width: mm2pt(165),
      padding: [4, 0, 4, 0] as [number, number, number, number],
      rows: tableRows,
    };

    // (Manual line removed; the Table class handles borders now)

    const table = new Table(tableData);
    table.attachTo(document_, mm2pt(22));

    // Legal Footer
    const footerLines = [];
    footerLines.push(
      `${parameters.creditor.name}, ${parameters.creditor.street} ${parameters.creditor.buildingNumber ?? ''}`
        .trim()
        .replace(/,$/, ''),
    );
    if (parameters.creditor.zip && parameters.creditor.city)
      footerLines.push(`${parameters.creditor.zip} ${parameters.creditor.city}`);
    if (parameters.creditor.account) footerLines.push(`IBAN: ${parameters.creditor.account}`);
    if (parameters.creditor.uid) footerLines.push(`MWST-Nr.: ${parameters.creditor.uid}`);
    if (parameters.creditor.email) footerLines.push(`E-Mail: ${parameters.creditor.email}`);
    if (parameters.creditor.website) footerLines.push(`Web: ${parameters.creditor.website}`);

    if (footerLines.length > 0) {
      document_.fontSize(8);
      document_.fillColor('gray');
      document_.font('Helvetica');
      document_.text(footerLines.join('  |  '), mm2pt(22), mm2pt(280), {
        width: mm2pt(165),
        align: 'center',
      });
    }

    // Attach the QR Bill on a new page
    document_.addPage();
    drawLogo();

    // Note: QR-References require a QR-IBAN. Since we use a regular IBAN,
    // we omit the reference field (NON reference type).
    // When a QR-IBAN is configured, the reference field should be re-added.
    const qrBillData = {
      currency: parameters.currency as 'CHF' | 'EUR',
      amount: parameters.amount,
      creditor: {
        name: parameters.creditor.name,
        address: parameters.creditor.street,
        ...(parameters.creditor.buildingNumber
          ? { buildingNumber: parameters.creditor.buildingNumber }
          : {}),
        zip: parameters.creditor.zip || '',
        city: parameters.creditor.city,
        account: parameters.creditor.account,
        country: parameters.creditor.country,
      },
      debtor: {
        name: parameters.debtor.name,
        address: parameters.debtor.street,
        ...(parameters.debtor.buildingNumber
          ? { buildingNumber: parameters.debtor.buildingNumber }
          : {}),
        zip: parameters.debtor.zip || '',
        city: parameters.debtor.city,
        country: parameters.debtor.country,
      },
      message: parameters.customReference
        ? `Ref: ${parameters.invoiceNumber}/${parameters.customReference}`
        : `Ref: ${parameters.invoiceNumber}`,
    };

    const qrBill = new SwissQRBill(qrBillData, {
      language: 'DE',
      scissors: false, // Omitted as per user request (modern digital preference)
      separate: false,
    });
    qrBill.attachTo(document_);

    document_.end();
  });
}
