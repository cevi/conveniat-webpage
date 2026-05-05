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
  nextReferenceNumber: number;
  invoiceNumberPrefix: string;
  customReferenceTemplate?: string;
  eventNumberTemplate?: string;
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

export function generateQrReference(
  personId: string | number,
  eventId: string | number,
  participationId: string | number,
  counter: number,
): string {
  // Format: 09 0UUUU UUEEE EEPPP PPPPC CCCCX (27 digits total)
  // 090       = fixer Präfix (Referenznummer-Bereich für Anmelde-Rechnungen)
  // UUUUUU    = Personen-ID (max. 6-stellig)
  // EEEEE     = Event-ID (max. 5-stellig)
  // PPPPPPP   = Teilnahme-ID (max. 7-stellig)
  // CCCCC     = Rechnungszähler (5-stellig)
  // X         = Mod-10 Prüfziffer (Swiss QR standard, always last digit)
  const personString = String(personId || '')
    .replaceAll(/\D/g, '')
    .slice(-6)
    .padStart(6, '0');
  const eventString = String(eventId || '')
    .replaceAll(/\D/g, '')
    .slice(-5)
    .padStart(5, '0');
  const partString = String(participationId || '')
    .replaceAll(/\D/g, '')
    .slice(-7)
    .padStart(7, '0');
  const counterString = String(counter || 0)
    .replaceAll(/\D/g, '')
    .slice(-5)
    .padStart(5, '0');

  // 090 (3) + u (6) + e (5) + p (7) + c (5) = 26 base digits
  const baseReference = `090${personString}${eventString}${partString}${counterString}`;

  const checkDigit = calculateModule10Recursive(baseReference);

  return `${baseReference}${String(checkDigit)}`;
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
 * Renders text with basic markdown support (**bold**, *italic*, ***bold italic***).
 * Splits the input into segments and switches PDFKit fonts inline.
 */
function renderMarkdownText(
  document_: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  options: { width: number; lineGap?: number },
): void {
  // Split text into paragraphs (double newline)
  const paragraphs = text.split(/\n\n/);

  document_.font('Helvetica');
  let isFirstSegment = true;

  for (const paragraph of paragraphs) {
    if (!isFirstSegment) {
      document_.moveDown(0.5);
    }

    // Parse markdown segments: ***bold italic***, **bold**, *italic*, plain
    const segments = parseMarkdownSegments(paragraph);

    for (const segment of segments) {
      switch (segment.style) {
        case 'boldItalic': {
          document_.font('Helvetica-BoldOblique');
          break;
        }
        case 'bold': {
          document_.font('Helvetica-Bold');
          break;
        }
        case 'italic': {
          document_.font('Helvetica-Oblique');
          break;
        }
        default: {
          document_.font('Helvetica');
        }
      }

      const isLastInParagraph = segment === segments.at(-1);

      if (isFirstSegment) {
        // Position the very first segment at x, y
        document_.text(segment.text, x, y, {
          width: options.width,
          lineGap: options.lineGap,
          continued: !isLastInParagraph,
        });
        isFirstSegment = false;
      } else {
        document_.text(segment.text, {
          width: options.width,
          lineGap: options.lineGap,
          continued: !isLastInParagraph,
        });
      }
    }
  }
}

/**
 * Parses a string into segments with style annotations for markdown bold/italic.
 */
function parseMarkdownSegments(
  text: string,
): Array<{ text: string; style: 'plain' | 'bold' | 'italic' | 'boldItalic' }> {
  const segments: Array<{ text: string; style: 'plain' | 'bold' | 'italic' | 'boldItalic' }> = [];
  // Match ***text***, **text**, or *text* (non-greedy)
  const regex = /(\*{3})(.*?)\1|(\*{2})(.*?)\3|(\*)(.*?)\5/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), style: 'plain' });
    }

    if (match[1] === '***') {
      segments.push({ text: match[2] ?? '', style: 'boldItalic' });
    } else if (match[3] === '**') {
      segments.push({ text: match[4] ?? '', style: 'bold' });
    } else if (match[5] === '*') {
      segments.push({ text: match[6] ?? '', style: 'italic' });
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), style: 'plain' });
  }

  // Ensure at least one segment
  if (segments.length === 0) {
    segments.push({ text, style: 'plain' });
  }

  return segments;
}

/**
 * Generates QR Bill PDFs for all participants with status 'new' or 're_added'.
 */
export async function generateBills(
  payload: Payload,
  participantId?: string,
): Promise<GenerationSummary> {
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
    where: participantId
      ? { id: { equals: participantId } }
      : {
          or: [
            { status: { equals: 'new' } },
            { status: { equals: 're_added' } },
            { status: { equals: 'updated' } },
          ],
        },
    limit: 10_000,
  });

  if (participants.docs.length === 0) {
    payload.logger.info('No participants need bill generation.');
    return summary;
  }

  // 3. Track current reference number
  let currentReferenceNumber = settings.nextReferenceNumber;

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

      payload.logger.info(
        {
          userId,
          success: personResult.success,
          address: personAttributes?.address,
          street: personAttributes?.street,
          housenumber: personAttributes?.housenumber,
          house_number: personAttributes?.house_number,
          zip: personAttributes?.zip,
          zip_code: personAttributes?.zip_code,
          town: personAttributes?.town,
        },
        `[Billing] Hitobito person attributes for userId=${userId}`,
      );

      const firstName = personAttributes?.first_name ?? document_.fullName.split(' ')[0] ?? '';
      const lastName =
        personAttributes?.last_name ?? document_.fullName.split(' ').slice(1).join(' ');

      // Parse Address to Structured format (SIX requirement)
      let street = '';
      let buildingNumber: string | undefined = undefined;

      const hitobitoAddress = personAttributes?.address ?? '';
      const hitobitoStreet = personAttributes?.street;
      const hitobitoHouseNumber = personAttributes?.house_number ?? personAttributes?.housenumber;

      if (hitobitoStreet) {
        // Use native structured fields if available
        street = hitobitoStreet;
        buildingNumber = hitobitoHouseNumber ?? undefined;
      } else if (hitobitoAddress) {
        // Fallback: parse combined address string
        const match = hitobitoAddress.match(/^(.*?)\s*(\d+[a-zA-Z]?.*)?$/);
        street = match?.[1]?.trim() ?? hitobitoAddress;
        buildingNumber = match?.[2]?.trim();
      }

      const zip = personAttributes?.zip ?? personAttributes?.zip_code ?? '';
      const city = personAttributes?.town ?? '';

      const referenceNumber = generateQrReference(
        document_.userId || '',
        document_.eventId,
        document_.participationUuid,
        currentReferenceNumber,
      );
      const currentYear = new Date().getFullYear().toString();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const prefix = settings.invoiceNumberPrefix
        .replaceAll('{{year}}', currentYear)
        .replaceAll('{{month}}', currentMonth)
        .replaceAll('{{event-id}}', document_.eventId)
        .replaceAll('{{group-id}}', document_.groupId || '')
        .replaceAll('{{participation-id}}', document_.participationUuid)
        .replaceAll('{{people-id}}', String(document_.userId || ''));
      const invoiceNumber = `${prefix}-${String(currentReferenceNumber).padStart(4, '0')}`;

      const customReference = settings.customReferenceTemplate
        ? settings.customReferenceTemplate
            .replaceAll('{{year}}', currentYear)
            .replaceAll('{{month}}', currentMonth)
            .replaceAll('{{event-id}}', document_.eventId)
            .replaceAll('{{group-id}}', document_.groupId || '')
            .replaceAll('{{participation-id}}', document_.participationUuid)
            .replaceAll('{{people-id}}', String(document_.userId || ''))
        : undefined;

      const eventNumber = settings.eventNumberTemplate
        ? settings.eventNumberTemplate
            .replaceAll('{{year}}', currentYear)
            .replaceAll('{{month}}', currentMonth)
            .replaceAll('{{event-id}}', document_.eventId)
            .replaceAll('{{group-id}}', document_.groupId || '')
            .replaceAll('{{participation-id}}', document_.participationUuid)
            .replaceAll('{{people-id}}', String(document_.userId || ''))
        : undefined;

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
        ...(customReference ? { customReference } : {}),
        ...(eventNumber ? { eventNumber } : {}),
        invoiceLetterText: settings.invoiceLetterText,
        roleLabel,
        vatCode,
        paymentDeadlineDays: settings.paymentDeadlineDays,
        firstName,
      });

      // Upload PDF buffer to MinIO
      const pdfFileName = `Rechnung-${invoiceNumber}-${Date.now()}.pdf`;
      const uploadedPdf = await payload.create({
        collection: 'bill-pdfs',
        data: {},
        file: {
          data: pdfBuffer,
          name: pdfFileName,
          mimetype: 'application/pdf',
          size: pdfBuffer.length,
        },
        context: { internal: true },
      });

      const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];
      const currentPdfs = (document_.billPdfs as (string | { id: string })[] | undefined) ?? [];
      const updatedPdfs = [
        ...currentPdfs.map((p) => (typeof p === 'object' ? p.id : p)),
        String(uploadedPdf.id),
      ];

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
          billPdfs: updatedPdfs,
          syncHistory: [...history, { date: new Date().toISOString(), action: 'bill_generated' }],
        },
      });

      currentReferenceNumber++;
      summary.generatedCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      summary.errors.push(
        `Participant ${String(document_.id)} (${String(document_.fullName)}): ${errorMessage}`,
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
  eventNumber?: string;
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
    let currentY = 85;
    document_.text('Rechnungsdatum:', mm2pt(22), mm2pt(currentY), {
      width: mm2pt(35),
      align: 'left',
    });
    currentY += 5;
    document_.text('Zahlbar bis:', mm2pt(22), mm2pt(currentY), { width: mm2pt(35), align: 'left' });
    currentY += 5;
    document_.text('Rechnung Nr.:', mm2pt(22), mm2pt(currentY), {
      width: mm2pt(35),
      align: 'left',
    });
    currentY += 5;
    if (parameters.customReference) {
      document_.text('Anmelde-Nummer:', mm2pt(22), mm2pt(currentY), {
        width: mm2pt(35),
        align: 'left',
      });
      currentY += 5;
    }
    if (parameters.eventNumber) {
      document_.text('Lager-Nummer:', mm2pt(22), mm2pt(currentY), {
        width: mm2pt(35),
        align: 'left',
      });
      currentY += 5;
    }

    // Values
    let valY = 85;
    document_.fillColor('black');
    document_.text(dateString, mm2pt(57), mm2pt(valY), { width: mm2pt(40), align: 'left' });
    valY += 5;
    document_.text(dueDateString, mm2pt(57), mm2pt(valY), { width: mm2pt(40), align: 'left' });
    valY += 5;
    document_.text(parameters.invoiceNumber, mm2pt(57), mm2pt(valY), {
      width: mm2pt(80),
      align: 'left',
    });
    valY += 5;
    if (parameters.customReference) {
      document_.text(parameters.customReference, mm2pt(57), mm2pt(valY), {
        width: mm2pt(80),
        align: 'left',
      });
      valY += 5;
    }
    if (parameters.eventNumber) {
      document_.text(parameters.eventNumber, mm2pt(57), mm2pt(valY), {
        width: mm2pt(80),
        align: 'left',
      });
      valY += 5;
    }

    // Title
    document_.fontSize(15);
    document_.fillColor('#47564C'); // Accent Green
    document_.font('Montserrat-ExtraBold');
    // Shift title down slightly based on currentY
    const titleY = currentY + 10;
    document_.text(parameters.documentTitle, mm2pt(22), mm2pt(titleY), {
      width: mm2pt(165),
      align: 'left',
    });

    // Letter body
    const letterText = parameters.invoiceLetterText
      .replaceAll('{{firstName}}', parameters.firstName)
      .replaceAll('{{amount}}', String(parameters.amount))
      .replaceAll('{{reference}}', parameters.reference);

    const letterY = titleY + 15;
    document_.fontSize(10);
    document_.fillColor('#000000');

    // Render markdown-style bold/italic text
    renderMarkdownText(document_, letterText, mm2pt(22), mm2pt(letterY), {
      width: mm2pt(165),
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
          { text: 'Menge', width: mm2pt(20), fontSize: 9, align: 'center' },
          { text: 'Einzelpreis', width: mm2pt(30), fontSize: 9, align: 'right' },
          { text: 'Total (CHF)', width: mm2pt(30), fontSize: 9, align: 'right' },
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
          { text: '1', width: mm2pt(20), fontSize: 9, align: 'center' },
          {
            text: `CHF ${amountNumber.toFixed(2)}`,
            width: mm2pt(30),
            fontSize: 9,
            align: 'right',
          },
          {
            text: `CHF ${amountNumber.toFixed(2)}`,
            width: mm2pt(30),
            fontSize: 9,
            align: 'right',
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
            {
              text: 'Zwischensumme',
              fontSize: 9,
              width: mm2pt(135),
              align: 'right',
            },
            {
              text: `CHF ${amountNumber.toFixed(2)}`,
              width: mm2pt(30),
              fontSize: 9,
              align: 'right',
            },
          ],
        },
        {
          borderColor: '#ECF0F1',
          borderWidth: [0, 0, 0, 0],
          columns: [
            {
              text: 'Betrag netto',
              fontSize: 9,
              width: mm2pt(135),
              align: 'right',
            },
            {
              text: `CHF ${subtotal.toFixed(2)}`,
              width: mm2pt(30),
              fontSize: 9,
              align: 'right',
            },
          ],
        },
        {
          borderColor: '#ECF0F1',
          borderWidth: [0, 0, 0, 0],
          columns: [
            {
              text: `MWST ${parameters.vatCode}%`,
              fontSize: 9,
              width: mm2pt(135),
              align: 'right',
            },
            {
              text: `CHF ${vatAmount.toFixed(2)}`,
              width: mm2pt(30),
              fontSize: 9,
              align: 'right',
            },
          ],
        },
      );
    }

    tableRows.push({
      borderColor: '#ECF0F1',
      borderWidth: [1, 0, 1, 0],
      columns: [
        {
          text: 'Gesamtbetrag',
          fontName: 'Helvetica-Bold',
          fontSize: 9,
          width: mm2pt(135),
          align: 'right',
        },
        {
          text: `CHF ${amountNumber.toFixed(2)}`,
          fontName: 'Helvetica-Bold',
          width: mm2pt(30),
          fontSize: 9,
          align: 'right',
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
      `${parameters.creditor.name} | ${parameters.creditor.street} ${parameters.creditor.buildingNumber ?? ''}`
        .trim()
        .replace(/ \|$/, ''),
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

    // Include the generated QR reference (required for QR-IBANs)
    const qrBillData = {
      currency: parameters.currency as 'CHF' | 'EUR',
      amount: parameters.amount,
      reference: parameters.reference,
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
      ...(parameters.customReference
        ? { additionalInformation: `REF: ${parameters.customReference}` }
        : {}),
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
