import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import { PayloadParticipantRepositoryAdapter } from '@/features/billing/adapters/payload-participant-repository.adapter';
import { PayloadSettingsAdapter } from '@/features/billing/adapters/payload-settings.adapter';
import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { ParticipantRepositoryPort } from '@/features/billing/ports/participant-repository.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import {
  BILLED_STATUSES,
  formatBillingStatus,
  hasRaisedBill,
  isBillable,
  NEEDS_MANUAL_REVIEW,
} from '@/features/billing/services/billing-status';
import type { JobProgressReporter } from '@/features/billing/services/job-progress-reporter';
import type { VatCalculation, VatSplitConfig } from '@/features/billing/services/vat-calculation';
import {
  calculateVat,
  describeVatExemptionRule,
  formatVatLineLabel,
} from '@/features/billing/services/vat-calculation';
import type { GenerationSummary } from '@/features/billing/types';
import { BillingTaskSlug } from '@/features/billing/types';
import type { RoleOption } from '@/features/billing/utils';
import {
  formatBirthday,
  formatRoleName,
  generateQrReference,
  resolveRoleOptions,
} from '@/features/billing/utils';
import type { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Payload } from 'payload';
import type { PDFRow } from 'swissqrbill/pdf';

/**
 * How long a run may hold its lock before it is assumed dead. Generous: a full run over a
 * few thousand participants fetches a Cevi.DB person and renders a PDF for each.
 */
const RUN_LOCK_TTL_SECONDS = 2 * 60 * 60;

interface SyncHistoryEntry {
  date: string;
  action: string;
  /** Why an already-billed row was parked for manual inspection. */
  reviewReason?: string;
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

/**
 * Finds the pricing row that governs a role, or undefined when none does.
 *
 * It used to fall back to the first row, which meant an unpriced role was quietly billed at
 * somebody else's rate — and, once the confirmation started printing a role checklist, told
 * the participant they were somebody else. An unpriced role is a configuration gap, and the
 * only safe answer is to refuse and say so.
 */
export function resolvePricing(
  roleType: string,
  rolePricing: Array<{
    roleTypePattern: string;
    label: string;
    amount: number;
    vatCode?: string | null;
    vatSplits?: VatSplitConfig[] | null;
  }>,
): ResolvedPricing | undefined {
  for (const pricing of rolePricing) {
    if (
      pricing.roleTypePattern !== '' &&
      roleType.toLowerCase().includes(pricing.roleTypePattern.toLowerCase())
    ) {
      const amount = Number(pricing.amount);
      return {
        amount: Number.isNaN(amount) ? 0 : amount,
        label: pricing.label,
        vatCode: pricing.vatCode ?? undefined,
        vatSplits: pricing.vatSplits ?? [],
      };
    }
  }
  return undefined;
}

/** Separator between the footer's items, and the only place the footer may wrap. */
const FOOTER_SEPARATOR = '  |  ';

/** The identity block printed at the bottom of page 1, as its individual items. */
export function buildCreditorFooterItems(creditor: {
  name: string;
  street: string;
  buildingNumber?: string | undefined;
  zip: string;
  city: string;
  account: string;
  uid?: string | undefined;
  email?: string | undefined;
  website?: string | undefined;
}): string[] {
  const items: string[] = [];
  items.push(
    `${creditor.name} | ${creditor.street} ${creditor.buildingNumber ?? ''}`
      .trim()
      .replace(/ \|$/, ''),
  );
  if (creditor.zip !== '' && creditor.city !== '') items.push(`${creditor.zip} ${creditor.city}`);
  if (creditor.account !== '') items.push(`IBAN: ${creditor.account}`);
  if (creditor.uid !== undefined && creditor.uid !== '') items.push(`MWST-Nr.: ${creditor.uid}`);
  if (creditor.email !== undefined && creditor.email !== '')
    items.push(`E-Mail: ${creditor.email}`);
  if (creditor.website !== undefined && creditor.website !== '')
    items.push(`Web: ${creditor.website}`);
  return items;
}

/**
 * Packs footer items into lines that fit, never splitting an item across two of them.
 *
 * The footer used to be one long string handed to PDFKit with a width, which wrapped it
 * wherever it liked — and what it liked was the space in `E-Mail: admin@…`, leaving the
 * label stranded at the end of a line and its address orphaned at the start of the next.
 * A non-breaking space does not help: PDFKit then breaks the hyphen in `E-Mail` instead,
 * which is worse. The only reliable answer is to decide the lines here and render each one
 * with wrapping switched off.
 *
 * `measure` is the caller's text measurement, so packing is decided with the same font and
 * size the line is later drawn in.
 */
export function layoutFooterLines(
  items: string[],
  measure: (text: string) => number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current: string | undefined;

  for (const item of items) {
    if (current === undefined) {
      current = item;
      continue;
    }
    const candidate = `${current}${FOOTER_SEPARATOR}${item}`;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = item;
    }
  }

  if (current !== undefined) lines.push(current);
  return lines;
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

  // 3. Reserve the reference numbers this run may use, before any of them reaches a bill.
  //
  // The counter used to be written back once, after the loop. A run that died halfway —
  // a deploy, an OOM kill — left every bill it had already written holding a number the
  // counter had never advanced past. The next run then reissued those numbers, and since
  // `invoiceNumber` is unique the write threw for the first participant, which meant
  // `currentReferenceNumber` never advanced, which meant every following participant
  // collided on that same number. Generation was wedged for everyone until somebody
  // edited a `readOnly` field straight in the database.
  //
  // Reserving the block up front trades that for gaps in the numbering whenever a run is
  // cancelled or skips people, which is the harmless half of the trade.
  const firstReferenceNumber = settings.nextReferenceNumber ?? 1;
  await settingsRepo.updateNextReferenceNumber(firstReferenceNumber + participants.length);
  let currentReferenceNumber = firstReferenceNumber;

  const isExplicitRebill = typeof participantId === 'string' && participantId !== '';

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
      if (!isBillable(document_.status)) {
        if ((BILLED_STATUSES as readonly string[]).includes(document_.status)) {
          summary.skippedAlreadyExistingCount++;
          continue;
        }
        summary.errors.push(
          `${String(document_.fullName)}: keine Rechnung erstellt – die Anmeldung steht auf ` +
            `„${formatBillingStatus(document_.status)}“ und muss zuerst bereinigt werden.`,
        );
        summary.skippedCount++;
        continue;
      }

      // Defence in depth behind the sync rule. A row that already carries an invoice can
      // only be reached here if something put it back into a billable status behind the
      // sync's back — a hand-edited record, or a row left over from before that rule
      // existed. Billing it again would mint a second invoice number and a second QR
      // reference against a bill the participant may already have paid, so it is parked
      // for an operator instead. The per-row "Neu generieren" action still gets through:
      // it names the participant explicitly, which is the operator saying they mean it.
      if (!isExplicitRebill && hasRaisedBill(document_)) {
        await participantRepo.update(document_.id, {
          status: NEEDS_MANUAL_REVIEW,
          syncHistory: [
            ...((document_.syncHistory as SyncHistoryEntry[] | undefined) ?? []),
            {
              date: new Date().toISOString(),
              action: 'manual_review_required',
              reviewReason:
                `Für diese Anmeldung besteht bereits die Rechnung ${String(document_.invoiceNumber)}, ` +
                `sie stand aber wieder auf „${formatBillingStatus(document_.status)}“ und wäre erneut ` +
                `verrechnet worden. Der Rechnungslauf hat das verhindert: eine zweite Rechnung hätte eine ` +
                `neue Nummer und eine neue QR-Referenz erhalten, gegen die eine bereits geleistete Zahlung ` +
                `nicht mehr zugeordnet werden kann. Bestehende Rechnung prüfen und nur bei Bedarf über ` +
                `„Neu generieren“ bewusst ersetzen.`,
            },
          ],
        });
        summary.errors.push(
          `${String(document_.fullName)}: Rechnung ${String(document_.invoiceNumber)} besteht bereits. ` +
            `Es wurde keine zweite erstellt; die Anmeldung ist neu auf „Manuelle Prüfung nötig“ gesetzt.`,
        );
        summary.skippedCount++;
        continue;
      }

      const userId = document_.userId;
      const roleType = document_.roleType as string;
      const pricing = resolvePricing(roleType, rolePricing);

      if (pricing === undefined) {
        // Nothing prices this role. Flagged rather than billed at a neighbouring rate, and
        // handled like any other unusable registration: no bill, visible in the admin, and
        // named precisely enough that an operator knows the fix is in the settings.
        const reason = `Rollentyp "${roleType}" ist in den Rechnungs-Einstellungen nicht konfiguriert.`;
        // The field is stored as JSON, so it has to be narrowed before it can be appended to.
        const existingReasons = Array.isArray(document_.missingAnmeldeangaben)
          ? document_.missingAnmeldeangaben.filter(
              (entry): entry is string => typeof entry === 'string',
            )
          : [];
        await participantRepo.update(document_.id, {
          status: 'invalid_anmeldeangaben',
          missingAnmeldeangaben: existingReasons.includes(reason)
            ? existingReasons
            : [...existingReasons, reason],
        });
        summary.errors.push(`${String(document_.fullName)}: ${reason}`);
        summary.relatedDocuments = ['billSettings'];
        summary.skippedCount++;
        continue;
      }

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
        // Whether the lookup worked, and which address fields came back — never the
        // values. This used to log the participant's full name and home address on every
        // bill, minors included, straight into the log aggregator.
        `[Billing] Hitobito person lookup for userId=${userId}: ` +
          JSON.stringify({
            success: personAttributes !== null,
            hasName: Boolean(personAttributes?.firstName ?? personAttributes?.lastName),
            hasStreet: Boolean(personAttributes?.street),
            hasZip: Boolean(personAttributes?.zip),
            hasTown: Boolean(personAttributes?.town),
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
        invoiceLetterTextAfter: settings.invoiceLetterTextAfter ?? undefined,
        roleLabel,
        registration: {
          fullName: document_.fullName,
          nickname: document_.nickname ?? undefined,
          birthday: document_.birthday ?? undefined,
          eventName: document_.eventName ?? undefined,
          roleType,
          roleOptions: resolveRoleOptions(roleType, rolePricing),
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
  /** Identifies the run. Queued tasks pass their job id; see `RunLockPort`. */
  runOwner?: string,
): Promise<GenerationSummary> {
  // Every route into generation goes through here — the queued task, "Alle neu
  // generieren", and the per-row "Neu generieren" — so this is where two of them are kept
  // from running at once and handing the same reserved reference numbers to different
  // participants.
  // Imported lazily: the adapter reaches Redis, which reads the validated environment at
  // module load, and that would make this whole module unimportable from a unit test of
  // the pure use case below.
  const { RedisRunLockAdapter } =
    await import('@/features/billing/adapters/redis-run-lock.adapter');
  const { classifyLockConflict } = await import('@/features/billing/ports/run-lock.port');

  const owner = runOwner ?? `request:${randomUUID()}`;
  const result = await new RedisRunLockAdapter().acquire(
    BillingTaskSlug.GenerateBills,
    RUN_LOCK_TTL_SECONDS,
    owner,
  );

  if (!result.acquired) {
    const empty = { generatedCount: 0, skippedCount: 0, skippedAlreadyExistingCount: 0 };

    if (classifyLockConflict(result.heldBy, owner) === 'duplicate-worker') {
      // Both replicas poll the job queue, so both can pick up the same queued job. The
      // worker holding the lock is doing exactly the work that was asked for; this one
      // has nothing to add and nothing to report. Telling the operator "a run is already
      // in progress" here is how a healthy run came to look like a failure.
      payload.logger.info(
        `Bill generation for job ${owner} is already running on another worker; skipping this duplicate execution.`,
      );
      return { ...empty, duplicate: true, errors: [] };
    }

    // A genuinely different run. Logged, because the refusal used to leave no trace at
    // all — the operator saw a message that nothing in the logs could account for.
    payload.logger.warn(
      `Refused to start bill generation for ${owner}: run ${result.heldBy ?? 'unknown'} holds the lock.`,
    );
    return {
      ...empty,
      errors: ['Es läuft bereits ein Rechnungslauf. Bitte warte, bis dieser abgeschlossen ist.'],
    };
  }

  try {
    return await generateBillsLocked(payload, participantId, dependencies, reporter);
  } finally {
    await result.lock.release();
  }
}

async function generateBillsLocked(
  payload: Payload,
  participantId: string | undefined,
  dependencies: { hitobitoClient?: HitobitoClient } | undefined,
  reporter: JobProgressReporter | undefined,
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

  // Lazily imported for the same reason as the run lock: the Hitobito config reads the
  // validated environment at module load, which used to make this module impossible to
  // import from a unit test of the pure use case below — `bill-generator-unpriced-role`
  // had been failing to load, and running zero tests, since it was written.
  const { HITOBITO_CONFIG } = await import('@/features/registration_process/hitobito-api');

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
  /** Optional second block, printed below the registration details. */
  invoiceLetterTextAfter?: string | undefined;
  roleLabel: string;
  /** Registration details confirmed on page 1. */
  registration: {
    fullName: string;
    nickname?: string | undefined;
    birthday?: string | undefined;
    eventName?: string | undefined;
    roleType?: string | undefined;
    /** Every configured role, with the one that set this fee ticked. */
    roleOptions: RoleOption[];
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

    // Letter body. Shared with the block below the registration details so both understand
    // the same placeholders.
    const applyLetterPlaceholders = (text: string): string =>
      text
        .replaceAll('{{firstName}}', parameters.firstName)
        .replaceAll('{{amount}}', String(parameters.amount))
        .replaceAll('{{reference}}', parameters.reference);

    const letterText = applyLetterPlaceholders(parameters.invoiceLetterText);

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
    //
    // Drawn by hand rather than through the Table class because the role row needs real
    // checkboxes, and the standard PDF fonts have no ballot-box glyph to fake them with.
    const blockLeft = mm2pt(22);
    const blockRight = mm2pt(187);
    const valueLeft = mm2pt(62);
    const labelWidth = valueLeft - blockLeft - 6;
    const valueWidth = blockRight - valueLeft;

    const rowFontSize = 9;
    // `text(s, x, y)` puts the top of the capital letters at y, so the cap band is what has
    // to be centred between the rules — centring the line box instead leaves every row
    // sitting high by the depth of a descender the values do not have.
    const capHeight = rowFontSize * 0.718;
    const rowPadding = 6;
    const wrappedLineStep = 12;

    let rowY = document_.y;

    const drawRowRule = (y: number): void => {
      document_.moveTo(blockLeft, y).lineTo(blockRight, y).lineWidth(0.5);
      document_.strokeColor('#E5E7E9').stroke();
    };

    const drawRowLabel = (label: string, y: number): void => {
      document_.font('Helvetica').fontSize(rowFontSize).fillColor('#5D6D7E');
      document_.text(label, blockLeft, y, { width: labelWidth, lineBreak: false });
    };

    /** Closes a row: advances past its content band and rules it off. */
    const endRow = (contentHeight: number): void => {
      rowY += contentHeight + rowPadding * 2;
      drawRowRule(rowY);
    };

    const drawTextRow = (label: string, value: string): void => {
      document_.font('Helvetica-Bold').fontSize(rowFontSize);
      const lineCount = Math.max(
        1,
        Math.round(
          document_.heightOfString(value, { width: valueWidth }) / document_.currentLineHeight(),
        ),
      );
      const top = rowY + rowPadding;

      drawRowLabel(label, top);
      document_.font('Helvetica-Bold').fontSize(rowFontSize).fillColor('#000000');
      document_.text(value, valueLeft, top, { width: valueWidth });

      endRow(capHeight + (lineCount - 1) * wrappedLineStep);
    };

    /**
     * Lists every configured role and ticks the one that set this participant's fee, so a
     * wrong role reads as a wrong tick rather than as a line of text to skim past.
     */
    const drawRoleRow = (label: string, options: RoleOption[]): void => {
      const boxSize = 8;
      const boxTextGap = 5;
      const itemGap = 16;
      const lineStep = 14;

      // The box is taller than the cap band, so the band is the box and the text is nudged
      // down into the middle of it. Aligning their tops instead is what looked broken.
      const bandHeight = Math.max(capHeight, boxSize);
      const bandTop = rowY + rowPadding;
      const boxOffset = (bandHeight - boxSize) / 2;
      const textOffset = (bandHeight - capHeight) / 2;

      drawRowLabel(label, bandTop + textOffset);

      let x = valueLeft;
      let lineTop = bandTop;

      for (const option of options) {
        document_.font(option.checked ? 'Helvetica-Bold' : 'Helvetica').fontSize(rowFontSize);
        const textWidth = document_.widthOfString(option.name);
        const itemWidth = boxSize + boxTextGap + textWidth;

        if (x > valueLeft && x + itemWidth > blockRight) {
          x = valueLeft;
          lineTop += lineStep;
        }

        const boxTop = lineTop + boxOffset;
        document_.rect(x, boxTop, boxSize, boxSize).lineWidth(0.8);
        if (option.checked) {
          document_.fillColor('#47564C').strokeColor('#47564C').fillAndStroke();
          // The tick is described as fractions of the box so it keeps its shape if the box
          // is ever resized.
          document_
            .moveTo(x + boxSize * 0.24, boxTop + boxSize * 0.52)
            .lineTo(x + boxSize * 0.41, boxTop + boxSize * 0.72)
            .lineTo(x + boxSize * 0.78, boxTop + boxSize * 0.27)
            .lineWidth(1.3)
            .strokeColor('#FFFFFF')
            .stroke();
        } else {
          document_.strokeColor('#B3B6B7').stroke();
        }

        document_.fillColor(option.checked ? '#000000' : '#8A8F94');
        document_.text(option.name, x + boxSize + boxTextGap, lineTop + textOffset, {
          width: textWidth + 2,
          lineBreak: false,
        });

        x += itemWidth + itemGap;
      }

      endRow(bandHeight + (lineTop - bandTop));
    };

    drawTextRow('Name', parameters.registration.fullName);
    if (
      parameters.registration.nickname !== undefined &&
      parameters.registration.nickname.trim() !== ''
    ) {
      drawTextRow('Ceviname', parameters.registration.nickname);
    }
    drawTextRow('Geburtsdatum', formatBirthday(parameters.registration.birthday));
    drawTextRow('Anlass', parameters.registration.eventName ?? '–');

    const roleOptions = parameters.registration.roleOptions;
    if (roleOptions.length > 0) {
      drawRoleRow('Rolle im Lager', roleOptions);
    } else {
      // No role pricing configured — fall back to naming the role rather than printing
      // an empty checklist.
      drawTextRow('Rolle im Lager', formatRoleName(parameters.registration.roleType));
    }

    document_.font('Helvetica-Oblique');
    document_.fontSize(8);
    document_.fillColor('#5D6D7E');
    document_.text(
      'Stimmen diese Angaben nicht? Melde dich bei der abteilungsverantwortlichen Person ' +
        'deiner Abteilung, sie kann die Angaben in der Cevi.DB korrigieren. ' +
        (parameters.vatExemptionNote === undefined
          ? 'Deine Rolle bestimmt den Lagerbeitrag.'
          : `Deine Rolle bestimmt den Lagerbeitrag, ${parameters.vatExemptionNote}.`),
      blockLeft,
      rowY + 8,
      { width: mm2pt(165), lineGap: 1.5 },
    );
    document_.font('Helvetica');

    // A second free-text block, for whatever has to be said after the participant has been
    // shown what was registered rather than before it.
    const letterTextAfter = parameters.invoiceLetterTextAfter;
    if (letterTextAfter !== undefined && letterTextAfter.trim() !== '') {
      document_.fontSize(10);
      document_.fillColor('#000000');
      renderMarkdownText(
        document_,
        applyLetterPlaceholders(letterTextAfter),
        blockLeft,
        document_.y + 12,
        { width: mm2pt(165), lineGap: 2 },
      );
    }

    // Legal Footer
    const footerItems = buildCreditorFooterItems(parameters.creditor);

    if (footerItems.length > 0) {
      document_.fontSize(8);
      document_.fillColor('gray');
      document_.font('Helvetica');

      const footerWidth = mm2pt(165);
      const footerLines = layoutFooterLines(
        footerItems,
        (text) => document_.widthOfString(text),
        footerWidth,
      );

      // Anchored at its bottom and grown upwards, so a footer that needs an extra line
      // takes it from the whitespace above rather than pushing past the bottom margin,
      // which would cost the bill a third page.
      const lineHeight = document_.currentLineHeight();
      let footerY = mm2pt(286) - footerLines.length * lineHeight;

      for (const line of footerLines) {
        // Wrapping is off: the packing above already guarantees the line fits, and
        // leaving it on is what let PDFKit split an item in the first place.
        document_.text(line, mm2pt(22), footerY, {
          width: footerWidth,
          align: 'center',
          lineBreak: false,
        });
        footerY += lineHeight;
      }
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
