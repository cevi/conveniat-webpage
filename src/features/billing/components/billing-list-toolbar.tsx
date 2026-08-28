'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BillingPipelineStep } from '@/features/billing/components/billing-pipeline-step';
import type { BillingTaskKey } from '@/features/billing/hooks/use-billing-jobs';
import { useBillingJobs } from '@/features/billing/hooks/use-billing-jobs';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import { documentControlButtonClasses } from '@/features/payload-cms/payload-cms/components/shared/document-control-button-styles';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { Banner, useLocale } from '@payloadcms/ui';
import { AlertTriangle, Download, FilePlus, MoreHorizontal, RefreshCcw, Send } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const pipelineHeading: StaticTranslationString = {
  de: 'Rechnungslauf',
  en: 'Billing run',
  fr: 'Cycle de facturation',
};

const pipelineDescription: StaticTranslationString = {
  de: 'Die drei Schritte laufen in dieser Reihenfolge: erst abgleichen, dann generieren, dann versenden.',
  en: 'The three steps run in this order: sync first, then generate, then send.',
  fr: "Les trois étapes s'exécutent dans cet ordre : synchroniser, générer, puis envoyer.",
};

const syncTitle: StaticTranslationString = {
  de: 'Teilnehmer abgleichen',
  en: 'Sync participants',
  fr: 'Synchroniser les participants',
};

const syncAction: StaticTranslationString = {
  de: 'Abgleichen mit Cevi.DB',
  en: 'Sync with Cevi.DB',
  fr: 'Synchroniser avec Cevi.DB',
};

const syncHint: StaticTranslationString = {
  de: 'Liest alle konfigurierten Anlässe aus Cevi.DB und legt neue Teilnehmende an.',
  en: 'Reads every configured event from Cevi.DB and creates new participants.',
  fr: 'Lit tous les événements configurés depuis Cevi.DB et crée les nouveaux participants.',
};

const generateTitle: StaticTranslationString = {
  de: 'Rechnungen generieren',
  en: 'Generate bills',
  fr: 'Générer les factures',
};

const generateAction: StaticTranslationString = {
  de: 'Generieren',
  en: 'Generate',
  fr: 'Générer',
};

const generateHint: StaticTranslationString = {
  de: 'Erstellt QR-Rechnungs-PDFs für alle vollständig erfassten Teilnehmenden.',
  en: 'Creates QR bill PDFs for every fully captured participant.',
  fr: 'Crée les PDF de facture QR pour chaque participant complet.',
};

const sendTitle: StaticTranslationString = {
  de: 'Rechnungen versenden',
  en: 'Send bills',
  fr: 'Envoyer les factures',
};

const sendAction: StaticTranslationString = {
  de: 'Mails versenden',
  en: 'Send mails',
  fr: 'Envoyer les e-mails',
};

const sendHint: StaticTranslationString = {
  de: 'Verschickt die generierten Rechnungen per E-Mail an die Teilnehmenden.',
  en: 'Emails the generated bills to the participants.',
  fr: 'Envoie les factures générées aux participants par e-mail.',
};

const moreActionsLabel: StaticTranslationString = {
  de: 'Weitere Aktionen',
  en: 'More actions',
  fr: 'Autres actions',
};

const csvExportLabel: StaticTranslationString = {
  de: 'CSV herunterladen',
  en: 'Download CSV',
  fr: 'Télécharger le CSV',
};

const regenerateAllLabel: StaticTranslationString = {
  de: 'Alle neu generieren',
  en: 'Regenerate all',
  fr: 'Tout régénérer',
};

const regenerateAllTitle: StaticTranslationString = {
  de: 'Alle Rechnungen neu generieren?',
  en: 'Regenerate all bills?',
  fr: 'Régénérer toutes les factures ?',
};

const regenerateAllMessage: StaticTranslationString = {
  de: 'Möchten Sie wirklich ALLE Rechnungen neu generieren?\n\nDies überschreibt bestehende PDFs und Rechnungsnummern unwiderruflich.',
  en: 'Do you really want to regenerate ALL bills?\n\nThis irreversibly overwrites existing PDFs and invoice numbers.',
  fr: 'Voulez-vous vraiment régénérer TOUTES les factures ?\n\nCela écrase définitivement les PDF et les numéros de facture existants.',
};

const regenerateAllConfirm: StaticTranslationString = {
  de: 'Neu generieren',
  en: 'Regenerate',
  fr: 'Régénérer',
};

const regeneratingLabel: StaticTranslationString = {
  de: 'Wird generiert...',
  en: 'Regenerating...',
  fr: 'Régénération...',
};

const newCountLabel: StaticTranslationString = { de: 'Neu', en: 'New', fr: 'Nouveaux' };
const changedCountLabel: StaticTranslationString = {
  de: 'Aktualisiert',
  en: 'Updated',
  fr: 'Mis à jour',
};
const removedCountLabel: StaticTranslationString = {
  de: 'Entfernt',
  en: 'Removed',
  fr: 'Supprimés',
};
const reAddedCountLabel: StaticTranslationString = {
  de: 'Erneut',
  en: 'Re-added',
  fr: 'Réajoutés',
};
const unchangedCountLabel: StaticTranslationString = {
  de: 'Unverändert',
  en: 'Unchanged',
  fr: 'Inchangés',
};
const generatedCountLabel: StaticTranslationString = {
  de: 'Generiert',
  en: 'Generated',
  fr: 'Générées',
};
const alreadyExistingCountLabel: StaticTranslationString = {
  de: 'Bereits vorhanden',
  en: 'Already present',
  fr: 'Déjà présentes',
};
const skippedCountLabel: StaticTranslationString = {
  de: 'Übersprungen',
  en: 'Skipped',
  fr: 'Ignorées',
};
const sentCountLabel: StaticTranslationString = { de: 'Gesendet', en: 'Sent', fr: 'Envoyées' };
const failedCountLabel: StaticTranslationString = {
  de: 'Fehlgeschlagen',
  en: 'Failed',
  fr: 'Échouées',
};

const handleCsvExport = (): void => {
  globalThis.open('/api/confidential/billing/export-csv', '_blank');
};

/**
 * Toolbar rendered above the bill-participants list.
 *
 * The three background jobs are one ordered pipeline — sync, generate, send — so they are
 * drawn as one: each step carries its own action button, its live progress while it runs,
 * and the counters its last run produced.
 */
export const BillingListToolbar: React.FC = () => {
  const { code } = useLocale();
  const locale = resolveAdminLocale(code);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);

  const {
    jobs,
    isPending,
    isCancelling,
    isBusy,
    actionError,
    startJob,
    cancelJob,
    regenerateAll,
    isRegenerating,
  } = useBillingJobs();

  const steps: Array<{
    key: BillingTaskKey;
    title: string;
    action: string;
    hint: string;
    icon: React.ReactNode;
    counterLabels: Array<{ key: string; label: string }>;
    actionVariant?: 'neutral' | 'publish';
  }> = [
    {
      key: 'sync',
      title: syncTitle[locale],
      action: syncAction[locale],
      hint: syncHint[locale],
      icon: <RefreshCcw className="h-3.5 w-3.5" />,
      counterLabels: [
        { key: 'newCount', label: newCountLabel[locale] },
        { key: 'changedCount', label: changedCountLabel[locale] },
        { key: 'removedCount', label: removedCountLabel[locale] },
        { key: 'reAddedCount', label: reAddedCountLabel[locale] },
        { key: 'unchangedCount', label: unchangedCountLabel[locale] },
      ],
    },
    {
      key: 'generate',
      title: generateTitle[locale],
      action: generateAction[locale],
      hint: generateHint[locale],
      icon: <FilePlus className="h-3.5 w-3.5" />,
      counterLabels: [
        { key: 'generatedCount', label: generatedCountLabel[locale] },
        { key: 'skippedAlreadyExistingCount', label: alreadyExistingCountLabel[locale] },
        { key: 'skippedCount', label: skippedCountLabel[locale] },
      ],
    },
    {
      key: 'send',
      title: sendTitle[locale],
      action: sendAction[locale],
      hint: sendHint[locale],
      icon: <Send className="h-3.5 w-3.5" />,
      actionVariant: 'publish',
      counterLabels: [
        { key: 'sentCount', label: sentCountLabel[locale] },
        { key: 'failedCount', label: failedCountLabel[locale] },
      ],
    },
  ];

  return (
    // Constrained the way Payload constrains its own document fields: at full list width
    // each step's action button would sit most of a screen away from the step it runs.
    <div className="mb-6 max-w-3xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold text-(--theme-elevation-800)">
            {pipelineHeading[locale]}
          </h3>
          <p className="m-0 mt-0.5 text-xs text-(--theme-elevation-500)">
            {pipelineDescription[locale]}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={moreActionsLabel[locale]}
              className={documentControlButtonClasses.iconOnly()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 border-(--theme-elevation-150) bg-(--theme-elevation-0) text-(--theme-elevation-800) shadow-lg"
          >
            <DropdownMenuItem
              onClick={(event): void => {
                event.preventDefault();
                handleCsvExport();
              }}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-(--theme-elevation-100)"
            >
              <Download className="h-4 w-4" />
              <span>{csvExportLabel[locale]}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(event): void => {
                event.preventDefault();
                setIsRegenerateModalOpen(true);
              }}
              disabled={isBusy}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-(--theme-error-500) hover:bg-(--theme-elevation-100)"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{regenerateAllLabel[locale]}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ol className="m-0 list-none border-t border-(--theme-elevation-100) p-0 pt-3">
        {steps.map((step, index) => (
          <BillingPipelineStep
            key={step.key}
            stepNumber={index + 1}
            title={step.title}
            icon={step.icon}
            actionLabel={step.action}
            hint={step.hint}
            counterLabels={step.counterLabels}
            job={jobs[step.key]}
            isPending={isPending[step.key]}
            isStarting={isPending[step.key] && jobs[step.key]?.progress === undefined}
            isCancelling={isCancelling[step.key]}
            isBlocked={isBusy}
            actionVariant={step.actionVariant ?? 'neutral'}
            isLast={index === steps.length - 1}
            locale={locale}
            onStart={() => void startJob(step.key)}
            onCancel={() => void cancelJob(step.key)}
          />
        ))}
      </ol>

      {actionError !== undefined && (
        <Banner className="mt-3 mb-0" type="error">
          {actionError}
        </Banner>
      )}

      <ConfirmationModal
        isOpen={isRegenerateModalOpen}
        onClose={() => setIsRegenerateModalOpen(false)}
        onConfirm={async () => {
          setIsRegenerateModalOpen(false);
          await regenerateAll();
        }}
        message={regenerateAllMessage[locale]}
        title={regenerateAllTitle[locale]}
        confirmLabel={regenerateAllConfirm[locale]}
        submittingText={regeneratingLabel[locale]}
        isSubmitting={isRegenerating}
        locale={locale}
        confirmVariant="danger"
      />
    </div>
  );
};

export default BillingListToolbar;
