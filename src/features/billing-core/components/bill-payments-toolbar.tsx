'use client';

import { PaymentImportDialog } from '@/features/billing-core/components/payment-import-dialog';
import type { BankImportState } from '@/features/billing-core/components/use-last-bank-import';
import { useLastBankImport } from '@/features/billing-core/components/use-last-bank-import';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Button, useTranslation } from '@payloadcms/ui';
import type React from 'react';
import { useState } from 'react';

const importPaymentsLabel: StaticTranslationString = {
  de: 'Zahlungen importieren (CSV)',
  en: 'Import payments (CSV)',
  fr: 'Importer les paiements (CSV)',
};

const lastImportLabel: StaticTranslationString = {
  de: 'Letzter Import: {{importedAt}} von {{by}} · Bankdaten bis {{exportedAt}}',
  en: 'Last import: {{importedAt}} by {{by}} · bank data as of {{exportedAt}}',
  fr: 'Dernier import : {{importedAt}} par {{by}} · données bancaires au {{exportedAt}}',
};

const noImportLabel: StaticTranslationString = {
  de: 'Noch keine Bankdatei importiert.',
  en: 'No bank file imported yet.',
  fr: 'Aucun fichier bancaire importé.',
};

const loadFailedLabel: StaticTranslationString = {
  de: 'Der Stand der Bankimporte konnte nicht geladen werden.',
  en: 'The state of the bank imports could not be loaded.',
  fr: 'L’état des imports bancaires n’a pas pu être chargé.',
};

/** `dd.MM.yyyy HH:mm` in the camp's timezone, the way the admin panel shows times. */
const formatTime = (iso: string): string =>
  new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

/** The line about the imports, or nothing while it loads. */
const describeImports = (state: BankImportState, locale: Locale): string | undefined => {
  switch (state.status) {
    case 'loading': {
      return undefined;
    }
    case 'failed': {
      return loadFailedLabel[locale];
    }
    case 'none': {
      return noImportLabel[locale];
    }
    case 'loaded': {
      return lastImportLabel[locale]
        .replace('{{importedAt}}', formatTime(state.last.createdAt))
        .replace('{{by}}', state.last.importedBy)
        .replace('{{exportedAt}}', formatTime(state.newestData.bankExportedAt));
    }
  }
};

/**
 * Above the payments: the bank import. One bank file holds the payments of the camp bills and of
 * the Besuchstag bills, so it is imported here, where both kinds land, and the list shows the new
 * payments as soon as they are booked. Next to it, how current the imported bank data are.
 */
export const BillPaymentsToolbar: React.FC = () => {
  const locale = resolveAdminLocale(useTranslation().i18n.language);
  const [isOpen, setIsOpen] = useState(false);
  const { state, reload } = useLastBankImport();
  const imports = describeImports(state, locale);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <Button buttonStyle="primary" margin={false} onClick={() => setIsOpen(true)}>
        {importPaymentsLabel[locale]}
      </Button>
      {imports !== undefined && (
        <span className="text-sm text-(--theme-elevation-600)">{imports}</span>
      )}
      <PaymentImportDialog
        isOpen={isOpen}
        locale={locale}
        onClose={() => {
          setIsOpen(false);
          reload();
        }}
      />
    </div>
  );
};

export default BillPaymentsToolbar;
