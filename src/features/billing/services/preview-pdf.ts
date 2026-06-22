import type { ParticipantRepositoryPort } from '@/features/billing/ports/participant-repository.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import type { StoragePort } from '@/features/billing/ports/storage.port';
import { generateQrBillPdf } from '@/features/billing/services/bill-generator-service';
import { generateQrReference } from '@/features/billing/utils';

export interface PreviewPdfResult {
  pdfBuffer: Buffer;
  disposition: string;
}

export async function previewPdfUseCase(
  participantId: string | null | undefined,
  isDownload: boolean,
  participantRepo: ParticipantRepositoryPort,
  storagePort: StoragePort,
  settingsRepo: SettingsPort,
): Promise<PreviewPdfResult> {
  // ── Serve a stored participant PDF ──────────────────────────────────
  if (typeof participantId === 'string' && participantId !== '') {
    const document_ = await participantRepo.findById(participantId);
    if (!document_) {
      throw new Error('Participant not found');
    }

    const pdfDocuments = (document_.billPdfs as (string | { id: string })[] | undefined) ?? [];
    const latestPdfId = pdfDocuments.at(-1);

    if (latestPdfId === undefined) {
      throw new Error('No PDF available for this participant');
    }

    const pdfDocumentId = typeof latestPdfId === 'object' ? latestPdfId.id : latestPdfId;
    const filename = await participantRepo.findPdfFilenameById(pdfDocumentId);

    if (typeof filename !== 'string' || filename === '') {
      throw new Error('PDF file missing');
    }

    const invoiceNumber = (document_.invoiceNumber as string | undefined) ?? 'Rechnung';
    const disposition =
      isDownload === true
        ? `attachment; filename="Rechnung-${invoiceNumber}.pdf"`
        : `inline; filename="Rechnung-${invoiceNumber}.pdf"`;

    const pdfBuffer = await storagePort.fetchPdf(filename);
    return { pdfBuffer, disposition };
  }

  // ── Generate a fictive preview PDF ──────────────────────────────────
  const settings = await settingsRepo.getBillSettings();

  const creditorName = (settings.creditorName as string | undefined) ?? 'Verein conveniat27';
  const creditorIban = (settings.creditorIban as string | undefined) ?? 'CH1030700114904034095';
  const creditorUid = (settings.creditorUid as string | undefined) ?? 'CHE-470.917.124';
  const creditorStreet = (settings.creditorStreet as string | undefined) ?? 'Sihlstrasse';
  const creditorBuildingNumber = (settings.creditorBuildingNumber as string | undefined) ?? '33';
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
  const rawAmount = participantPricing?.amount;
  const amount = typeof rawAmount === 'number' && !Number.isNaN(rawAmount) ? rawAmount : 150;
  const roleLabel = participantPricing?.label ?? 'Teilnehmer:in';
  const vatCode = participantPricing?.vatCode;

  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const customReference =
    typeof settings.customReferenceTemplate === 'string' && settings.customReferenceTemplate !== ''
      ? settings.customReferenceTemplate
          .replaceAll('{{year}}', new Date().getFullYear().toString())
          .replaceAll('{{month}}', currentMonth)
          .replaceAll('{{event-id}}', '1234')
          .replaceAll('{{group-id}}', '5678')
          .replaceAll('{{participation-id}}', '9012')
          .replaceAll('{{people-id}}', '123456')
      : undefined;

  const eventNumber =
    typeof settings.eventNumberTemplate === 'string' && settings.eventNumberTemplate !== ''
      ? settings.eventNumberTemplate
          .replaceAll('{{year}}', new Date().getFullYear().toString())
          .replaceAll('{{month}}', currentMonth)
          .replaceAll('{{event-id}}', '1234')
          .replaceAll('{{group-id}}', '5678')
          .replaceAll('{{participation-id}}', '9012')
          .replaceAll('{{people-id}}', '123456')
      : undefined;

  const documentTitle =
    (settings.documentTitle as string | undefined) ?? 'ANMELDEBESTÄTIGUNG UND RECHNUNG';

  const pdfBuffer = await generateQrBillPdf({
    documentTitle,
    creditor: {
      name: creditorName,
      street: creditorStreet,
      ...(creditorBuildingNumber === '' ? {} : { buildingNumber: creditorBuildingNumber }),
      zip: creditorZip,
      city: creditorCity,
      account: creditorIban,
      uid: creditorUid,
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
    reference: generateQrReference('123456', '1234', '9012', 1),
    ...(typeof customReference === 'string' && customReference !== '' ? { customReference } : {}),
    ...(typeof eventNumber === 'string' && eventNumber !== '' ? { eventNumber } : {}),
    invoiceNumber: `${((settings.invoiceNumberPrefix as string | undefined) ?? '{{year}}')
      .replaceAll('{{year}}', new Date().getFullYear().toString())
      .replaceAll('{{month}}', currentMonth)
      .replaceAll('{{event-id}}', '1234')
      .replaceAll('{{group-id}}', '5678')
      .replaceAll('{{participation-id}}', '9012')
      .replaceAll('{{people-id}}', '123456')}-0001`,
    invoiceLetterText,
    roleLabel,
    vatCode,
    paymentDeadlineDays,
    firstName: 'Maximilian',
  });

  return { pdfBuffer, disposition: 'inline; filename="preview-rechnung.pdf"' };
}
