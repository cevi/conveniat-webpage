'use client';

import { BillingErrorsDialog } from '@/features/billing-core/components/billing-errors-dialog';
import { usePaymentImport } from '@/features/billing-core/components/use-payment-import';
import { formatChf, OVERPAYMENT_TOLERANCE } from '@/features/billing-core/money';
import { decodeCsvBytes, parsePaymentCsv } from '@/features/billing-core/payment-csv';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import type { Locale, StaticTranslationString } from '@/types/types';
import { campInstantOf } from '@/utils/camp-clock';
import { Banner, Button, DatePicker } from '@payloadcms/ui';
import type React from 'react';
import { useState } from 'react';

const titleLabel: StaticTranslationString = {
  de: 'Zahlungen aus der Bank importieren',
  en: 'Import payments from the bank',
  fr: 'Importer les paiements de la banque',
};

const tolerance = formatChf(OVERPAYMENT_TOLERANCE);

const messageLabel: StaticTranslationString = {
  de: `Lade den CSV-Export der camt.054-Gutschriften hoch, ohne ihn vorher in Excel zu speichern.\n\nJede Zahlung, deren QR-Referenz zu einer offenen Rechnung passt und die den Rechnungsbetrag oder höchstens ${tolerance} mehr bezahlt, wird als bezahlt verbucht und in der Cevi.DB als bezahlt mit Anmeldestatus «definitiv» eingetragen. Eine zweite Zahlung für eine bereits bezahlte Rechnung wird ihr als Doppelzahlung zugeordnet. Alle anderen Zahlungen werden aufgelistet und nicht verbucht. Jede Zahlung bleibt unter «Zahlungen» gespeichert und lässt sich dort von Hand zuordnen.\n\nZahlungen mit einer Referenz, die mit 091 beginnt, gehören zu den Besuchstag-Rechnungen und werden dort verbucht, ohne die Cevi.DB.`,
  en: `Upload the CSV export of the camt.054 credit notifications, without saving it in Excel first.\n\nEvery payment whose QR reference matches an open bill and that pays the bill's amount or at most ${tolerance} more is booked as paid and marked as paid with registration status «definitiv» in Cevi.DB. A second payment for a bill already paid is linked to it as a double payment. All other payments are listed and not booked. Every payment stays under «Payments», where it can be assigned by hand.\n\nPayments whose reference starts with 091 belong to the Besuchstag bills and are booked there, without Cevi.DB.`,
  fr: `Téléversez l'export CSV des avis de crédit camt.054, sans l'enregistrer auparavant dans Excel.\n\nChaque paiement dont la référence QR correspond à une facture ouverte et qui paie le montant de la facture ou au plus ${tolerance} de plus est comptabilisé comme payé et inscrit comme payé avec le statut d'inscription «definitiv» dans Cevi.DB. Un second paiement pour une facture déjà payée lui est attribué comme double paiement. Tous les autres paiements sont listés et ne sont pas comptabilisés. Chaque paiement reste enregistré sous «Paiements», où il peut être attribué à la main.\n\nLes paiements dont la référence commence par 091 appartiennent aux factures de la journée des visites et y sont comptabilisés, sans Cevi.DB.`,
};

const confirmLabel: StaticTranslationString = {
  de: 'Importieren',
  en: 'Import',
  fr: 'Importer',
};

const importingLabel: StaticTranslationString = {
  de: 'Wird importiert...',
  en: 'Importing...',
  fr: 'Importation...',
};

const fileLabel: StaticTranslationString = {
  de: 'Zahlungsdatei (CSV)',
  en: 'Payment file (CSV)',
  fr: 'Fichier des paiements (CSV)',
};

const exportedAtLabel: StaticTranslationString = {
  de: 'Stand der Bankdaten (Export aus dem E-Banking)',
  en: 'Bank data as of (export from the e-banking)',
  fr: 'Données bancaires au (export de l’e-banking)',
};

const exportedAtHint: StaticTranslationString = {
  de: 'Vorausgefüllt mit dem Tag der letzten Buchung in der Datei. Bitte auf den Zeitpunkt des Exports aus dem E-Banking setzen: Zahlungserinnerungen gehen davon aus, dass alle Zahlungen bis zu diesem Zeitpunkt importiert sind.',
  en: 'Filled in with the day of the last booking in the file. Please set it to when the file was exported from the e-banking: payment reminders assume that every payment up to this time has been imported.',
  fr: 'Prérempli avec le jour de la dernière écriture du fichier. Réglez-le sur le moment de l’export de l’e-banking : les rappels de paiement partent du principe que tous les paiements jusqu’à ce moment sont importés.',
};

/**
 * Where to start the bank data's time: 00:00 of the last booking day in the file. The CSV does
 * not say when it was exported, and the file's own time moves whenever it is saved again, so
 * this can only be too early, which holds back a reminder rather than sending one to someone
 * who paid.
 */
const latestBookingOf = async (file: File): Promise<Date | undefined> => {
  const { payments } = parsePaymentCsv(decodeCsvBytes(new Uint8Array(await file.arrayBuffer())));
  const day = payments
    .map((payment) => payment.bookingDate)
    .filter((date): date is string => date !== undefined)
    .toSorted()
    .at(-1);
  return day === undefined ? undefined : campInstantOf(day, 0);
};

/** `{{booked}}` and `{{total}}` are filled in. */
const bookedSummary: StaticTranslationString = {
  de: '{{booked}} von {{total}} Zahlungen verbucht.',
  en: '{{booked}} of {{total}} payments booked.',
  fr: '{{booked}} paiements sur {{total}} comptabilisés.',
};

const alreadyBookedSummary: StaticTranslationString = {
  de: '{{count}} waren bereits verbucht.',
  en: '{{count}} were already booked.',
  fr: '{{count}} étaient déjà comptabilisés.',
};

const openSummary: StaticTranslationString = {
  de: '{{count}} müssen von Hand zugeordnet werden.',
  en: '{{count}} have to be matched by hand.',
  fr: '{{count}} doivent être attribués manuellement.',
};

const writeBackNote: StaticTranslationString = {
  de: 'Die Cevi.DB wird im Hintergrund nachgeführt. Was dabei nicht klappt, steht im Verlauf der Anmeldung und wird beim nächsten nächtlichen Abgleich wiederholt.',
  en: 'Cevi.DB is updated in the background. Anything that fails there is shown in the registration history and retried by the next nightly sync.',
  fr: "Cevi.DB est mise à jour en arrière-plan. Ce qui échoue figure dans l'historique de l'inscription et est réessayé lors de la prochaine synchronisation nocturne.",
};

const showOpenLabel: StaticTranslationString = {
  de: 'Nicht verbuchte Zahlungen ansehen',
  en: 'View payments not booked',
  fr: 'Voir les paiements non comptabilisés',
};

const dismissLabel: StaticTranslationString = {
  de: 'Ausblenden',
  en: 'Dismiss',
  fr: 'Masquer',
};

const openDialogTitle: StaticTranslationString = {
  de: 'Nicht verbuchte Zahlungen',
  en: 'Payments not booked',
  fr: 'Paiements non comptabilisés',
};

/**
 * The payment import: a dialog to pick the bank file, and the report of what it booked.
 *
 * The report stays above the list until it is dismissed, because the payments it could not
 * book are the finance team's work list.
 */
export const PaymentImportDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
}> = ({ isOpen, onClose, locale }) => {
  const { isImporting, error, result, importFile, clearError, clearResult } = usePaymentImport();
  const [file, setFile] = useState<File | undefined>();
  const [bankExportedAt, setBankExportedAt] = useState<Date | undefined>();
  const [isOpenListShown, setIsOpenListShown] = useState(false);
  // one work list, each payment named with the kind of bill it was for
  const errors = (result?.sides ?? []).flatMap(({ label, summary }) =>
    summary.errors.map((message) => `${label[locale]}: ${message}`),
  );

  const close = (): void => {
    setFile(undefined);
    setBankExportedAt(undefined);
    clearError();
    onClose();
  };

  return (
    <>
      <ConfirmationModal
        isOpen={isOpen}
        onClose={close}
        onConfirm={async () => {
          if (file === undefined || bankExportedAt === undefined) return;
          if (await importFile(file, bankExportedAt)) close();
        }}
        message={messageLabel[locale]}
        title={titleLabel[locale]}
        confirmLabel={confirmLabel[locale]}
        submittingText={importingLabel[locale]}
        isSubmitting={isImporting}
        confirmDisabled={file === undefined || bankExportedAt === undefined}
        locale={locale}
      >
        <label className="flex flex-col gap-2 text-sm text-(--theme-elevation-800)">
          <span className="font-medium">{fileLabel[locale]}</span>
          <input
            accept=".csv,.txt,text/csv,text/plain"
            className="text-sm text-(--theme-elevation-600)"
            onChange={(event) => {
              clearError();
              const chosen = event.target.files?.[0];
              setFile(chosen);
              setBankExportedAt(undefined);
              if (chosen !== undefined) {
                void latestBookingOf(chosen).then(setBankExportedAt);
              }
            }}
            type="file"
          />
        </label>
        <div className="mt-4 flex flex-col gap-2 text-sm text-(--theme-elevation-800)">
          <span className="font-medium">{exportedAtLabel[locale]}</span>
          <DatePicker
            pickerAppearance="dayAndTime"
            displayFormat="dd.MM.yyyy HH:mm"
            timeFormat="HH:mm"
            timeIntervals={5}
            maxDate={new Date()}
            readOnly={file === undefined}
            {...(bankExportedAt === undefined ? {} : { value: bankExportedAt })}
            onChange={(value) => {
              clearError();
              setBankExportedAt(value);
            }}
          />
          <span className="text-xs text-(--theme-elevation-500)">{exportedAtHint[locale]}</span>
        </div>
        {error !== undefined && (
          <Banner className="mt-3 mb-0" type="error">
            {error}
          </Banner>
        )}
      </ConfirmationModal>

      {result !== undefined && (
        <Banner className="mt-3 mb-0" type={errors.length > 0 ? 'info' : 'success'}>
          <div className="flex flex-col gap-2">
            {result.sides.map(({ key, label, summary }) => (
              <span key={key}>
                <strong>{label[locale]}:</strong>{' '}
                {[
                  bookedSummary[locale]
                    .replace('{{booked}}', String(summary.bookedCount))
                    .replace('{{total}}', String(summary.totalCount)),
                  summary.alreadyBookedCount > 0
                    ? alreadyBookedSummary[locale].replace(
                        '{{count}}',
                        String(summary.alreadyBookedCount),
                      )
                    : undefined,
                  summary.errors.length > 0
                    ? openSummary[locale].replace('{{count}}', String(summary.errors.length))
                    : undefined,
                ]
                  .filter((part) => part !== undefined)
                  .join(' ')}
              </span>
            ))}
            {result.sides.some((side) => side.key === 'camp' && side.summary.bookedCount > 0) && (
              <span className="text-xs text-(--theme-elevation-600)">{writeBackNote[locale]}</span>
            )}
            <div className="flex gap-2">
              {errors.length > 0 && (
                <Button
                  buttonStyle="secondary"
                  margin={false}
                  onClick={() => setIsOpenListShown(true)}
                  size="small"
                >
                  {showOpenLabel[locale]}
                </Button>
              )}
              <Button buttonStyle="subtle" margin={false} onClick={clearResult} size="small">
                {dismissLabel[locale]}
              </Button>
            </div>
          </div>
        </Banner>
      )}

      <BillingErrorsDialog
        errors={errors}
        isOpen={isOpenListShown}
        locale={locale}
        onClose={() => setIsOpenListShown(false)}
        relatedDocuments={[]}
        title={openDialogTitle[locale]}
      />
    </>
  );
};
