import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import { PayloadParticipantRepositoryAdapter } from '@/features/billing/adapters/payload-participant-repository.adapter';
import { PayloadSettingsAdapter } from '@/features/billing/adapters/payload-settings.adapter';
import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { ParticipantRepositoryPort } from '@/features/billing/ports/participant-repository.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import type { GenerationSummary } from '@/features/billing/types';
import { generateQrReference } from '@/features/billing/utils';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import type { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import fs from 'node:fs';
import path from 'node:path';
import type { Payload } from 'payload';
import type { PDFRow } from 'swissqrbill/pdf';

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
  rolePricing: Array<{
    roleTypePattern: string;
    label: string;
    amount: number;
    vatCode?: string | null;
  }>,
): { amount: number; label: string; vatCode?: string | undefined } {
  for (const pricing of rolePricing) {
    if (roleType.toLowerCase().includes(pricing.roleTypePattern.toLowerCase())) {
      const amt = Number(pricing.amount);
      return {
        amount: Number.isNaN(amt) ? 0 : amt,
        label: pricing.label,
        vatCode: pricing.vatCode ?? undefined,
      };
    }
  }
  // Default to the first pricing entry if no match
  const defaultPricing = rolePricing[0];
  const defaultAmt = Number(defaultPricing?.amount);
  return {
    amount: Number.isNaN(defaultAmt) ? 0 : defaultAmt,
    label: defaultPricing?.label ?? 'Teilnehmer:in',
    vatCode: defaultPricing?.vatCode ?? undefined,
  };
}

/**
 * Calculates the VAT rate, VAT amount, and total gross amount based on net amount, vat code, and birthday.
 */
export function calculateVat(
  netAmount: number,
  vatCode: string | null | undefined,
  birthday: string | null | undefined,
  invoiceYear: number = new Date().getFullYear(),
): {
  isSub18: boolean;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  formattedVatCode: string;
} {
  let isSub18 = false;
  if (typeof birthday === 'string' && birthday !== '') {
    const birthYearMatch = birthday.match(/\d{4}/);
    if (birthYearMatch !== null) {
      const birthYear = Number.parseInt(birthYearMatch[0], 10);
      isSub18 = invoiceYear < 2027 ? birthYear >= invoiceYear - 17 : birthYear >= invoiceYear - 18;
    }
  }

  const vatCodeString =
    vatCode !== null && vatCode !== undefined && vatCode !== '' ? vatCode : '0.0%';
  const formattedVatCode = vatCodeString.endsWith('%') ? vatCodeString : `${vatCodeString}%`;

  let vatRate = 0;
  if (isSub18 === false) {
    vatRate = Number.parseFloat(formattedVatCode.replace('%', '').replace(',', '.'));
  }

  const vatAmount = isSub18 === false ? (netAmount * vatRate) / 100 : 0;
  const totalAmount = netAmount + vatAmount;

  return {
    isSub18,
    vatRate,
    vatAmount,
    totalAmount,
    formattedVatCode,
  };
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
/**
 * Generates bills for participants by orchestrating port operations.
 */
/**
 * Generates bills for participants by orchestrating port operations.
 */
export async function generateBillsUseCase(
  participantRepo: ParticipantRepositoryPort,
  settingsRepo: SettingsPort,
  hitobitoService: HitobitoServicePort,
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  },
  participantId?: string,
): Promise<GenerationSummary> {
  const summary: GenerationSummary = {
    generatedCount: 0,
    skippedCount: 0,
    skippedAlreadyExistingCount: 0,
    errors: [],
  };

  // 1. Load bill settings
  const settings = await settingsRepo.getBillSettings();

  if (
    typeof settings.creditorIban !== 'string' ||
    settings.creditorIban === '' ||
    typeof settings.creditorName !== 'string' ||
    settings.creditorName === ''
  ) {
    summary.errors.push('Creditor IBAN or name not configured in Bill Settings.');
    return summary;
  }

  const rolePricing = settings.rolePricing;
  if (rolePricing === undefined || rolePricing === null || rolePricing.length === 0) {
    summary.errors.push('No role pricing configured in Bill Settings.');
    return summary;
  }

  // 2. Query participants needing bills
  const participants = await participantRepo.findPendingBilling(participantId);

  if (participants.length === 0) {
    logger.info('No participants need bill generation.');
    return summary;
  }

  // 3. Track current reference number
  let currentReferenceNumber = settings.nextReferenceNumber ?? 1;

  for (const document_ of participants) {
    try {
      if (document_.status !== 'new') {
        if (document_.status === 'bill_created' || document_.status === 'bill_sent') {
          summary.skippedAlreadyExistingCount++;
          continue;
        }
        summary.errors.push(
          `Teilnehmer ${String(document_.id)} (${String(document_.fullName)}) kann nicht verrechnet werden: Status ist nicht "Vollständig erfasst".`,
        );
        summary.skippedCount++;
        continue;
      }

      const userId = document_.userId;
      const roleType = document_.roleType as string;
      const pricing = resolvePricing(roleType, rolePricing);
      const amount = pricing.amount;
      const roleLabel = pricing.label;
      const vatCode = pricing.vatCode ?? undefined;

      if (amount <= 0) {
        summary.skippedCount++;
        continue;
      }

      // Fetch person address from Cevi.DB
      const personAttributes = await hitobitoService.fetchPersonDetails(userId);

      logger.info(
        `[Billing] Hitobito person attributes for userId=${userId}: ` +
          JSON.stringify({
            success: personAttributes !== null,
            firstName: personAttributes?.firstName,
            lastName: personAttributes?.lastName,
            street: personAttributes?.street,
            houseNumber: personAttributes?.houseNumber,
            zip: personAttributes?.zip,
            town: personAttributes?.town,
          }),
      );

      const firstName = personAttributes?.firstName ?? document_.fullName.split(' ')[0] ?? '';
      const lastName =
        personAttributes?.lastName ?? document_.fullName.split(' ').slice(1).join(' ');

      // Parse Address to Structured format (SIX requirement)
      let street = '';
      let buildingNumber: string | undefined = undefined;

      const hitobitoStreet = personAttributes?.street;
      const hitobitoHouseNumber = personAttributes?.houseNumber;

      if (typeof hitobitoStreet === 'string' && hitobitoStreet !== '') {
        // Use native structured fields if available
        street = hitobitoStreet;
        buildingNumber = hitobitoHouseNumber ?? undefined;
      } else {
        // Fallback to participant document fields or parse
        const documentStreet = document_.street ?? '';
        const match = documentStreet.match(/^(.*?)\s*(\d+[a-zA-Z]?.*)?$/);
        street =
          typeof match?.[1] === 'string' && match[1] !== '' ? match[1].trim() : documentStreet;
        buildingNumber =
          typeof match?.[2] === 'string' && match[2] !== '' ? match[2].trim() : undefined;
      }

      const zip = personAttributes?.zip ?? document_.zipCode ?? document_.zip;
      const city = personAttributes?.town ?? document_.town;

      const referenceNumber = generateQrReference(
        document_.userId,
        document_.eventId,
        document_.participationUuid,
        currentReferenceNumber,
      );
      const currentYear = new Date().getFullYear().toString();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const invoiceNumberPrefix = settings.invoiceNumberPrefix ?? '';
      const prefix = invoiceNumberPrefix
        .replaceAll('{{year}}', currentYear)
        .replaceAll('{{month}}', currentMonth)
        .replaceAll('{{event-id}}', document_.eventId)
        .replaceAll('{{group-id}}', document_.groupId ?? '')
        .replaceAll('{{participation-id}}', document_.participationUuid)
        .replaceAll('{{people-id}}', document_.userId);
      const invoiceNumber = `${prefix}-${String(currentReferenceNumber).padStart(4, '0')}`;

      const customReferenceTemplate = settings.customReferenceTemplate;
      const customReference =
        typeof customReferenceTemplate === 'string' && customReferenceTemplate !== ''
          ? customReferenceTemplate
              .replaceAll('{{year}}', currentYear)
              .replaceAll('{{month}}', currentMonth)
              .replaceAll('{{event-id}}', document_.eventId)
              .replaceAll('{{group-id}}', document_.groupId ?? '')
              .replaceAll('{{participation-id}}', document_.participationUuid)
              .replaceAll('{{people-id}}', document_.userId)
          : undefined;

      const eventNumberTemplate = settings.eventNumberTemplate;
      const eventNumber =
        typeof eventNumberTemplate === 'string' && eventNumberTemplate !== ''
          ? eventNumberTemplate
              .replaceAll('{{year}}', currentYear)
              .replaceAll('{{month}}', currentMonth)
              .replaceAll('{{event-id}}', document_.eventId)
              .replaceAll('{{group-id}}', document_.groupId ?? '')
              .replaceAll('{{participation-id}}', document_.participationUuid)
              .replaceAll('{{people-id}}', document_.userId)
          : undefined;

      // Generate PDF
      const documentTitle_ = settings.documentTitle;
      const documentTitle =
        typeof documentTitle_ === 'string' && documentTitle_ !== ''
          ? documentTitle_
          : 'ANMELDEBESTÄTIGUNG UND RECHNUNG';

      const creditorBuildingNumber = settings.creditorBuildingNumber;

      const { totalAmount } = calculateVat(amount, vatCode, document_.birthday ?? undefined);

      const pdfBuffer = await generateQrBillPdf({
        documentTitle,
        creditor: {
          name: settings.creditorName,
          street: settings.creditorStreet,
          ...(typeof creditorBuildingNumber === 'string' && creditorBuildingNumber !== ''
            ? { buildingNumber: creditorBuildingNumber }
            : {}),
          zip: settings.creditorZip ?? '',
          city: settings.creditorCity ?? '',
          account: settings.creditorIban,
          country: 'CH',
        },
        debtor: {
          name: `${firstName} ${lastName}`.trim(),
          street,
          ...(buildingNumber !== undefined && buildingNumber !== '' ? { buildingNumber } : {}),
          zip: zip ?? '',
          city: city ?? '',
          country: 'CH',
        },
        amount,
        currency: settings.currency ?? 'CHF',
        reference: referenceNumber,
        invoiceNumber,
        ...(customReference !== undefined && customReference !== '' ? { customReference } : {}),
        ...(eventNumber !== undefined && eventNumber !== '' ? { eventNumber } : {}),
        invoiceLetterText: settings.invoiceLetterText ?? '',
        roleLabel,
        vatCode,
        paymentDeadlineDays: settings.paymentDeadlineDays ?? 30,
        firstName,
        birthday: document_.birthday ?? undefined,
      });

      // Upload PDF buffer using the port
      const pdfFileName = `Rechnung-${invoiceNumber}-${Date.now()}.pdf`;
      const uploadedPdf = await participantRepo.uploadPdf(pdfFileName, pdfBuffer);

      const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];
      const currentPdfs = (document_.billPdfs as (string | { id: string })[] | undefined) ?? [];
      const updatedPdfs = [
        ...currentPdfs.map((p) => (typeof p === 'object' ? p.id : p)),
        String(uploadedPdf.id),
      ];

      await participantRepo.update(document_.id, {
        status: 'bill_created',
        billCreatedDate: new Date().toISOString(),
        referenceNumber,
        invoiceNumber,
        invoiceAmount: totalAmount,
        billPdfs: updatedPdfs,
        syncHistory: [...history, { date: new Date().toISOString(), action: 'bill_generated' }],
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

  // Update the next reference number in settings via the port
  await settingsRepo.updateNextReferenceNumber(currentReferenceNumber);

  logger.info(
    `Bill generation complete: ${String(summary.generatedCount)} generated, ${String(summary.skippedCount)} skipped, ${String(summary.skippedAlreadyExistingCount)} skipped (already existing)`,
  );

  return summary;
}

/**
 * Generates QR Bill PDFs for all participants with status 'new' or 're_added'.
 * Backwards-compatible wrapper.
 */
export async function generateBills(
  payload: Payload,
  participantId?: string,
  dependencies?: { hitobitoClient?: HitobitoClient },
): Promise<GenerationSummary> {
  const settingsRepo = new PayloadSettingsAdapter(payload);
  const participantRepo = new PayloadParticipantRepositoryAdapter(payload);

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

  const regManagement = await settingsRepo.getRegistrationManagement();
  const cookieValue = regManagement.browserCookie;
  const browserCookie =
    typeof cookieValue === 'string' && cookieValue.length > 0 ? cookieValue : '';

  const hitobitoService = new HitobitoServiceAdapter(
    dependencies?.hitobitoClient ?? {
      baseUrl: HITOBITO_CONFIG.baseUrl,
      apiToken: HITOBITO_CONFIG.apiToken,
      browserCookie,
    },
    logger,
  );

  return generateBillsUseCase(
    participantRepo,
    settingsRepo,
    hitobitoService,
    logger,
    participantId,
  );
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
  birthday?: string | undefined;
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

    const { isSub18, vatAmount, totalAmount, formattedVatCode } = calculateVat(
      amountNumber,
      parameters.vatCode,
      parameters.birthday,
    );
    const subtotal = amountNumber;

    const vatLabel = isSub18
      ? 'MWST 0.0% (steuerbefreite Leistung an Jugendliche)'
      : `MWST ${formattedVatCode}`;

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
            text: vatLabel,
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
      {
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
            text: `CHF ${totalAmount.toFixed(2)}`,
            fontName: 'Helvetica-Bold',
            width: mm2pt(30),
            fontSize: 9,
            align: 'right',
          },
        ],
      },
    ];

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
    if (parameters.creditor.zip !== '' && parameters.creditor.city !== '')
      footerLines.push(`${parameters.creditor.zip} ${parameters.creditor.city}`);
    if (parameters.creditor.account !== '')
      footerLines.push(`IBAN: ${parameters.creditor.account}`);
    if (parameters.creditor.uid !== undefined && parameters.creditor.uid !== '')
      footerLines.push(`MWST-Nr.: ${parameters.creditor.uid}`);
    if (parameters.creditor.email !== undefined && parameters.creditor.email !== '')
      footerLines.push(`E-Mail: ${parameters.creditor.email}`);
    if (parameters.creditor.website !== undefined && parameters.creditor.website !== '')
      footerLines.push(`Web: ${parameters.creditor.website}`);

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
      amount: totalAmount,
      reference: parameters.reference,
      creditor: {
        name: parameters.creditor.name,
        address: parameters.creditor.street,
        ...(parameters.creditor.buildingNumber !== undefined &&
        parameters.creditor.buildingNumber !== ''
          ? { buildingNumber: parameters.creditor.buildingNumber }
          : {}),
        zip: parameters.creditor.zip,
        city: parameters.creditor.city,
        account: parameters.creditor.account,
        country: parameters.creditor.country,
      },
      debtor: {
        name: parameters.debtor.name,
        address: parameters.debtor.street,
        ...(parameters.debtor.buildingNumber !== undefined &&
        parameters.debtor.buildingNumber !== ''
          ? { buildingNumber: parameters.debtor.buildingNumber }
          : {}),
        zip: parameters.debtor.zip,
        city: parameters.debtor.city,
        country: parameters.debtor.country,
      },
      ...(parameters.customReference !== undefined && parameters.customReference !== ''
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
