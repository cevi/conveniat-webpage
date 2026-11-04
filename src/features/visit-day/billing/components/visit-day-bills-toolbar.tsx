'use client';

import { formatChf } from '@/features/billing-core/money';
import { ReportDownloadCard } from '@/features/payload-cms/payload-cms/components/shared/report-download-card';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import { useVisitDayBillSummary } from '@/features/visit-day/billing/components/use-visit-day-bill-summary';
import type { StaticTranslationString } from '@/types/types';
import { Button, toast, useLocale } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';
import type React from 'react';

const t = {
  registrations: { de: 'Anmeldungen', en: 'Registrations', fr: 'Inscriptions' },
  open: { de: 'offen', en: 'open', fr: 'ouvertes' },
  paid: { de: 'bezahlt', en: 'paid', fr: 'payées' },
  mailFailed: { de: 'E-Mail fehlgeschlagen', en: 'email failed', fr: 'e-mail échoué' },
  refundDue: { de: 'Rückerstattung offen', en: 'refund due', fr: 'remboursement dû' },
  resendFailed: {
    de: 'Fehlgeschlagene erneut senden',
    en: 'Send failed ones again',
    fr: 'Renvoyer les échecs',
  },
  resent: {
    de: '{{count}} Rechnungen werden erneut verschickt.',
    en: '{{count}} bills are sent again.',
    fr: '{{count}} factures sont renvoyées.',
  },
} satisfies Record<string, StaticTranslationString>;

/**
 * Above the Besuchstag bills: where they stand, the mails to send again and the two exports.
 * The bank import, shared with the camp bills, sits above «Zahlungen». Bills are issued when
 * someone registers, so there is no run to start here.
 */
export const VisitDayBillsToolbar: React.FC = () => {
  const locale = resolveAdminLocale(useLocale().code);
  const router = useRouter();
  const { summary, reload } = useVisitDayBillSummary();

  const resendFailed = async (): Promise<void> => {
    const response = await fetch('/api/visit-day-bills/resend-failed', { method: 'POST' });
    const body = (await response.json()) as { count?: number; error?: string };
    if (response.ok) toast.success(t.resent[locale].replace('{{count}}', String(body.count ?? 0)));
    else toast.error(body.error ?? `HTTP ${String(response.status)}`);
    await reload();
    router.refresh();
  };

  const stats: [string, string][] =
    summary === undefined
      ? []
      : [
          [String(summary.total), t.registrations[locale]],
          [String(summary.open), `${t.open[locale]} · ${formatChf(summary.openAmount)}`],
          [String(summary.paid), `${t.paid[locale]} · ${formatChf(summary.paidAmount)}`],
          [String(summary.mailFailed), t.mailFailed[locale]],
          [String(summary.refundDue), t.refundDue[locale]],
        ];

  return (
    <div className="mb-6 flex flex-col gap-4">
      {stats.length > 0 && (
        <dl className="m-0 grid grid-cols-2 gap-2 md:grid-cols-5">
          {stats.map(([value, label]) => (
            <div key={label} className="rounded border border-(--theme-elevation-150) p-3">
              <dt className="text-xs text-(--theme-elevation-500)">{label}</dt>
              <dd className="m-0 text-xl font-semibold text-(--theme-elevation-900)">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          buttonStyle="secondary"
          margin={false}
          disabled={summary === undefined || summary.mailFailed === 0}
          onClick={() => {
            void resendFailed();
          }}
        >
          {t.resendFailed[locale]}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ReportDownloadCard
          url="/api/visit-day-bills/export-xlsx"
          fallbackFilename="besuchstag-rechnungen.xlsx"
          title={{ de: 'Rechnungen', en: 'Bills', fr: 'Factures' }}
          description={{
            de: 'Alle Besuchstag-Rechnungen mit Betrag, MWST, Status und Zahlung, eine Zeile pro Anmeldung.',
            en: 'Every Besuchstag bill with amount, VAT, status and payment, one row per registration.',
            fr: 'Toutes les factures avec montant, TVA, statut et paiement, une ligne par inscription.',
          }}
          downloadLabel={{
            de: 'Als Excel herunterladen',
            en: 'Download as Excel',
            fr: 'Télécharger en Excel',
          }}
          generatingLabel={{ de: 'Wird erstellt...', en: 'Generating...', fr: 'Génération...' }}
          errorMessage={{
            de: 'Die Liste konnte nicht erstellt werden.',
            en: 'The list could not be generated.',
            fr: "La liste n'a pas pu être générée.",
          }}
        />
        <ReportDownloadCard
          url="/api/visit-day-bills/export-addresses"
          fallbackFilename="besuchstag-sbb-billette.xlsx"
          title={{
            de: 'SBB-Billette pro Adresse',
            en: 'Rail tickets per address',
            fr: 'Billets CFF par adresse',
          }}
          description={{
            de: 'Eine Zeile pro Postadresse: wie viele Billette dorthin gehen, nach ÖV-Abo, und aus welchen Anmeldungen. Stornierte Anmeldungen fehlen.',
            en: 'One row per postal address: how many tickets go there, by travel pass, and from which registrations. Cancelled registrations are left out.',
            fr: 'Une ligne par adresse : combien de billets y vont, par abonnement, et de quelles inscriptions. Les inscriptions annulées sont omises.',
          }}
          downloadLabel={{
            de: 'Als Excel herunterladen',
            en: 'Download as Excel',
            fr: 'Télécharger en Excel',
          }}
          generatingLabel={{ de: 'Wird erstellt...', en: 'Generating...', fr: 'Génération...' }}
          errorMessage={{
            de: 'Die Liste konnte nicht erstellt werden.',
            en: 'The list could not be generated.',
            fr: "La liste n'a pas pu être générée.",
          }}
        />
      </div>
    </div>
  );
};

export default VisitDayBillsToolbar;
