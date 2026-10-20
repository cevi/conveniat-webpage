'use client';

import { BillingErrorsDialog } from '@/features/billing/components/billing-errors-dialog';
import { usePaymentImport } from '@/features/billing/hooks/use-payment-import';
import { formatChf, OVERPAYMENT_TOLERANCE } from '@/features/billing/services/payment-matching';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Banner, Button } from '@payloadcms/ui';
import type React from 'react';
import { useState } from 'react';

const titleLabel: StaticTranslationString = {
  de: 'Zahlungen aus der Bank importieren',
  en: 'Import payments from the bank',
  fr: 'Importer les paiements de la banque',
};

const tolerance = formatChf(OVERPAYMENT_TOLERANCE);

const messageLabel: StaticTranslationString = {
  de: `Lade den CSV-Export der camt.054-Gutschriften hoch, ohne ihn vorher in Excel zu speichern.\n\nJede Zahlung, deren QR-Referenz zu einer offenen Rechnung passt und die den Rechnungsbetrag oder höchstens ${tolerance} mehr bezahlt, wird als bezahlt verbucht und in der Cevi.DB als bezahlt mit Anmeldestatus «definitiv» eingetragen. Alle anderen Zahlungen werden aufgelistet und nicht verbucht.`,
  en: `Upload the CSV export of the camt.054 credit notifications, without saving it in Excel first.\n\nEvery payment whose QR reference matches an open bill and that pays the bill's amount or at most ${tolerance} more is booked as paid and marked as paid with registration status «definitiv» in Cevi.DB. All other payments are listed and not booked.`,
  fr: `Téléversez l'export CSV des avis de crédit camt.054, sans l'enregistrer auparavant dans Excel.\n\nChaque paiement dont la référence QR correspond à une facture ouverte et qui paie le montant de la facture ou au plus ${tolerance} de plus est comptabilisé comme payé et inscrit comme payé avec le statut d'inscription «definitiv» dans Cevi.DB. Tous les autres paiements sont listés et ne sont pas comptabilisés.`,
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
  const [isOpenListShown, setIsOpenListShown] = useState(false);

  const close = (): void => {
    setFile(undefined);
    clearError();
    onClose();
  };

  return (
    <>
      <ConfirmationModal
        isOpen={isOpen}
        onClose={close}
        onConfirm={async () => {
          if (file === undefined) return;
          if (await importFile(file)) close();
        }}
        message={messageLabel[locale]}
        title={titleLabel[locale]}
        confirmLabel={confirmLabel[locale]}
        submittingText={importingLabel[locale]}
        isSubmitting={isImporting}
        confirmDisabled={file === undefined}
        locale={locale}
      >
        <label className="flex flex-col gap-2 text-sm text-(--theme-elevation-800)">
          <span className="font-medium">{fileLabel[locale]}</span>
          <input
            accept=".csv,.txt,text/csv,text/plain"
            className="text-sm text-(--theme-elevation-600)"
            onChange={(event) => {
              clearError();
              setFile(event.target.files?.[0]);
            }}
            type="file"
          />
        </label>
        {error !== undefined && (
          <Banner className="mt-3 mb-0" type="error">
            {error}
          </Banner>
        )}
      </ConfirmationModal>

      {result !== undefined && (
        <Banner className="mt-3 mb-0" type={result.errors.length > 0 ? 'info' : 'success'}>
          <div className="flex flex-col gap-2">
            <span>
              {[
                bookedSummary[locale]
                  .replace('{{booked}}', String(result.bookedCount))
                  .replace('{{total}}', String(result.totalCount)),
                result.alreadyBookedCount > 0
                  ? alreadyBookedSummary[locale].replace(
                      '{{count}}',
                      String(result.alreadyBookedCount),
                    )
                  : undefined,
                result.errors.length > 0
                  ? openSummary[locale].replace('{{count}}', String(result.errors.length))
                  : undefined,
              ]
                .filter((part) => part !== undefined)
                .join(' ')}
            </span>
            {result.bookedCount > 0 && (
              <span className="text-xs text-(--theme-elevation-600)">{writeBackNote[locale]}</span>
            )}
            <div className="flex gap-2">
              {result.errors.length > 0 && (
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
        errors={result?.errors ?? []}
        isOpen={isOpenListShown}
        locale={locale}
        onClose={() => setIsOpenListShown(false)}
        relatedDocuments={[]}
        title={openDialogTitle[locale]}
      />
    </>
  );
};
