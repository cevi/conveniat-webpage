import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import { PayloadParticipantRepositoryAdapter } from '@/features/billing/adapters/payload-participant-repository.adapter';
import { PayloadSettingsAdapter } from '@/features/billing/adapters/payload-settings.adapter';
import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { ParticipantRepositoryPort } from '@/features/billing/ports/participant-repository.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import type { JobProgressReporter } from '@/features/billing/services/job-progress-reporter';
import type { VatCalculation, VatSplitConfig } from '@/features/billing/services/vat-calculation';
import {
  calculateVat,
  describeVatExemptionRule,
  formatVatLineLabel,
} from '@/features/billing/services/vat-calculation';
import type { GenerationSummary } from '@/features/billing/types';
import { formatBirthday, formatRoleName, generateQrReference } from '@/features/billing/utils';
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
export interface ResolvedPricing {
  amount: number;
  label: string;
  vatCode?: string | undefined;
  vatSplits: VatSplitConfig[];
}

export function resolvePricing(
  roleType: string,
  rolePricing: Array<{
    roleTypePattern: string;
    label: string;
    amount: number;
    vatCode?: string | null;
    vatSplits?: VatSplitConfig[] | null;
  }>,
): ResolvedPricing {
  const toResolved = (pricing: (typeof rolePricing)[number] | undefined): ResolvedPricing => {
    const amount = Number(pricing?.amount);
    return {
      amount: Number.isNaN(amount) ? 0 : amount,
      label: pricing?.label ?? 'Teilnehmer:in',
      vatCode: pricing?.vatCode ?? undefined,
      vatSplits: pricing?.vatSplits ?? [],
    };
  };

  for (const pricing of rolePricing) {
    if (roleType.toLowerCase().includes(pricing.roleTypePattern.toLowerCase())) {
      return toResolved(pricing);
    }
  }
  // Default to the first pricing entry if no match
  return toResolved(rolePricing[0]);
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
  reporter?: JobProgressReporter,
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
    summary.relatedDocuments = ['billSettings'];
    return summary;
  }

  const rolePricing = settings.rolePricing;
  if (rolePricing === undefined || rolePricing === null || rolePricing.length === 0) {
    summary.errors.push('No role pricing configured in Bill Settings.');
    summary.relatedDocuments = ['billSettings'];
    return summary;
  }

  const vatExemption = settings.vatExemption;

  // 2. Query participants needing bills
  const participants = await participantRepo.findPendingBilling(participantId);

  if (participants.length === 0) {
    logger.info('No participants need bill generation.');
    return summary;
  }

  // 3. Track current reference number
  let currentReferenceNumber = settings.nextReferenceNumber ?? 1;

  const runningSummary = (): Record<string, number> => ({
    generatedCount: summary.generatedCount,
    skippedCount: summary.skippedCount,
    skippedAlreadyExistingCount: summary.skippedAlreadyExistingCount,
  });

  for (const [index, document_] of participants.entries()) {
    await reporter?.report({
      processedItems: index,
      totalItems: participants.length,
      currentItemName: String(document_.fullName),
      runningSummary: runningSummary(),
    });

    if (await reporter?.shouldCancel()) {
      summary.cancelled = true;
      logger.info(
        `Bill generation cancelled by operator after ${String(index)} of ${String(participants.length)} participants.`,
      );
      break;
    }

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

      if (amount <= 0) {
        summary.skippedCount++;
        continue;
      }

      // Computed once here and handed to the PDF, so the invoice, the stored breakdown and
      // the finance export can never drift apart for the same bill.
      const vat = calculateVat({
        netAmount: amount,
        vatSplits: pricing.vatSplits,
        vatCode: pricing.vatCode,
        birthday: document_.birthday,
        exemption: vatExemption,
      });

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
        registration: {
          fullName: document_.fullName,
          nickname: document_.nickname ?? undefined,
          birthday: document_.birthday ?? undefined,
          eventName: document_.eventName ?? undefined,
          roleType,
        },
        vatExemptionNote: describeVatExemptionRule(vatExemption),
        vat,
        paymentDeadlineDays: settings.paymentDeadlineDays ?? 30,
        firstName,
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
        invoiceAmount: vat.totalAmount,
        netAmount: vat.netAmount,
        vatExempt: vat.isExempt,
        vatBreakdown: vat.components.map((component) => ({
          label: component.label,
          share: component.share,
          netAmount: component.netAmount,
          vatCode: component.formattedVatCode,
          vatAmount: component.vatAmount,
        })),
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
  reporter?: JobProgressReporter,
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
    reporter,
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
  /** Registration details confirmed on page 1. */
  registration: {
    fullName: string;
    nickname?: string | undefined;
    birthday?: string | undefined;
    eventName?: string | undefined;
    roleType?: string | undefined;
  };
  /** How the youth exemption is configured, in prose. Omitted when it is switched off. */
  vatExemptionNote?: string | undefined;
  /** Precomputed by the caller so the invoice and the stored breakdown cannot diverge. */
  vat: VatCalculation;
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

    // ── Registration details ──
    // The bill is also the Anmeldebestätigung, so page 1 has to state what exactly was
    // registered. Role and birthday especially: the role decides the fee, the birthday
    // decides whether MWST is owed at all, and neither is something a participant can
    // correct in the Cevi.DB themselves.
    const registrationRows: Array<[string, string]> = [
      ['Name', parameters.registration.fullName],
      ...(parameters.registration.nickname !== undefined &&
      parameters.registration.nickname.trim() !== ''
        ? ([['Ceviname', parameters.registration.nickname]] satisfies Array<[string, string]>)
        : []),
      ['Geburtsdatum', formatBirthday(parameters.registration.birthday)],
      ['Anlass', parameters.registration.eventName ?? '–'],
      ['Rolle', formatRoleName(parameters.registration.roleType)],
    ];

    const registrationTable = new Table({
      width: mm2pt(165),
      padding: [5, 0, 5, 0],
      rows: registrationRows.map(([label, value], index) => ({
        fontSize: 9,
        borderColor: '#E5E7E9',
        // Rules between the rows only, so the block reads as one card rather than a grid.
        borderWidth: index === 0 ? [0, 0, 0, 0] : [1, 0, 0, 0],
        columns: [
          { text: label, width: mm2pt(40), textColor: '#5D6D7E' },
          { text: value, width: mm2pt(125), fontName: 'Helvetica-Bold' },
        ],
      })),
    });
    registrationTable.attachTo(document_, mm2pt(22));

    document_.moveDown(1);
    document_.font('Helvetica-Oblique');
    document_.fontSize(8);
    document_.fillColor('#5D6D7E');
    document_.text(
      'Stimmen diese Angaben nicht? Melde dich bei der abteilungsverantwortlichen Person ' +
        'deiner Abteilung, sie kann die Angaben in der Cevi.DB korrigieren. ' +
        (parameters.vatExemptionNote === undefined
          ? 'Deine Rolle bestimmt den Lagerbeitrag.'
          : `Deine Rolle bestimmt den Lagerbeitrag, ${parameters.vatExemptionNote}.`),
      mm2pt(22),
      document_.y,
      { width: mm2pt(165), lineGap: 1.5 },
    );
    document_.font('Helvetica');

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

    // ── Page 2: the bill itself, above the QR slip it is paid with ──
    document_.addPage();
    drawLogo();

    document_.fontSize(15);
    document_.fillColor('#47564C');
    document_.font('Montserrat-ExtraBold');
    document_.text('RECHNUNG', mm2pt(22), mm2pt(32), { width: mm2pt(165), align: 'left' });

    // Page 2 travels on its own once the bill is filed, so it repeats what identifies it.
    document_.fontSize(9);
    document_.fillColor('#5D6D7E');
    document_.font('Helvetica');
    document_.text(
      `Rechnung Nr. ${parameters.invoiceNumber}  ·  Zahlbar bis ${dueDateString}`,
      mm2pt(22),
      mm2pt(40),
      { width: mm2pt(165), align: 'left' },
    );
    document_.fillColor('#000000');

    // Invoice table
    const { isExempt, netAmount: subtotal, totalAmount } = parameters.vat;

    // An exempt bill has one zero-rated line whatever the split says — printing the split
    // there would suggest a tax that is not being charged.
    const vatComponents = isExempt
      ? parameters.vat.components.slice(0, 1)
      : parameters.vat.components;

    // One line per thing being billed. A camp bill carries a single fee today, which is why
    // the subtotal rows below are conditional: repeating the same figure three times over a
    // one-line table tells the reader nothing.
    const positions = [{ description: `${parameters.roleLabel} – conveniat27`, amount: subtotal }];

    // The table is ruled horizontally only: a full grid fights the QR bill on the next page,
    // and every column here is either text or money, so the alignment already separates them.
    const columnWidth = {
      description: mm2pt(85),
      quantity: mm2pt(20),
      unitPrice: mm2pt(30),
      total: mm2pt(30),
    };
    const headerRule = '#B3B6B7';
    const rowRule = '#E5E7E9';
    const mutedText = '#5D6D7E';

    // A split needs each rate's base spelled out. With a single rate the base is the net
    // amount already sitting on the position line, so the column stays empty rather than
    // printing the same figure a third time.
    const showsVatBase = vatComponents.length > 1;

    const tableRows: PDFRow[] = [
      {
        fontName: 'Helvetica-Bold',
        fontSize: 9,
        borderColor: headerRule,
        borderWidth: [0, 0, 1, 0],
        columns: [
          { text: 'Beschreibung', width: columnWidth.description },
          { text: 'Menge', width: columnWidth.quantity, align: 'center' },
          { text: 'Einzelpreis', width: columnWidth.unitPrice, align: 'right' },
          { text: 'Total (CHF)', width: columnWidth.total, align: 'right' },
        ],
      },
      ...positions.map((position): PDFRow => ({
        fontSize: 9,
        borderColor: rowRule,
        borderWidth: [0, 0, 1, 0],
        columns: [
          { text: position.description, width: columnWidth.description },
          { text: '1', width: columnWidth.quantity, align: 'center' },
          {
            text: `CHF ${position.amount.toFixed(2)}`,
            width: columnWidth.unitPrice,
            align: 'right',
          },
          {
            text: `CHF ${position.amount.toFixed(2)}`,
            width: columnWidth.total,
            align: 'right',
          },
        ],
      })),
      ...(positions.length > 1
        ? ([
            {
              fontSize: 9,
              borderColor: rowRule,
              borderWidth: [0, 0, 1, 0],
              columns: [
                { text: 'Betrag netto', width: mm2pt(135), align: 'right' },
                {
                  text: `CHF ${subtotal.toFixed(2)}`,
                  width: columnWidth.total,
                  align: 'right',
                },
              ],
            },
          ] satisfies PDFRow[])
        : []),
      ...vatComponents.map((component): PDFRow => ({
        fontSize: 9,
        textColor: mutedText,
        columns: [
          {
            text: formatVatLineLabel(component, isExempt),
            width: columnWidth.description + columnWidth.quantity,
          },
          {
            text: showsVatBase ? `CHF ${component.netAmount.toFixed(2)}` : '',
            width: columnWidth.unitPrice,
            align: 'right',
          },
          {
            text: `CHF ${component.vatAmount.toFixed(2)}`,
            width: columnWidth.total,
            align: 'right',
          },
        ],
      })),
      {
        fontName: 'Helvetica-Bold',
        fontSize: 9,
        borderColor: headerRule,
        borderWidth: [1, 0, 0, 0],
        columns: [
          { text: 'Gesamtbetrag', width: mm2pt(135), align: 'right' },
          {
            text: `CHF ${totalAmount.toFixed(2)}`,
            width: columnWidth.total,
            align: 'right',
          },
        ],
      },
    ];

    const tableData = {
      width: mm2pt(165),
      padding: [5, 0, 5, 0] as [number, number, number, number],
      rows: tableRows,
    };

    // (Manual line removed; the Table class handles borders now)

    const table = new Table(tableData);
    table.attachTo(document_, mm2pt(22), mm2pt(48));

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
      // The unstructured message is what a payer sees in their banking app and what the
      // finance team matches an incoming payment against, so it carries the bill number
      // rather than the registration number.
      additionalInformation: `Rechnung Nr. ${parameters.invoiceNumber}`,
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
