'use client';

import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { useLocale } from '@payloadcms/ui';
import { AlertTriangle, FileDown, RefreshCw } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const REPORT_URL = '/api/confidential/billing/weekly-report-pdf';

const cardTitle: StaticTranslationString = {
  de: 'Bericht jetzt erstellen',
  en: 'Generate the report now',
  fr: 'Générer le rapport maintenant',
};

const cardDescription: StaticTranslationString = {
  de: 'Erstellt denselben Anmeldestand-Bericht (PDF), den der Wochenbericht per E-Mail verschickt — mit den Anmeldungen von jetzt. Der Bericht wird nur heruntergeladen: es wird keine E-Mail versendet und der Zeitplan für den nächsten Versand bleibt unverändert.',
  en: 'Builds the same registration report (PDF) the weekly mail attaches, from the registrations as they stand right now. It is only downloaded: no email is sent and the schedule for the next send is untouched.',
  fr: "Génère le même rapport d'inscriptions (PDF) que celui joint à l'e-mail hebdomadaire, à partir des inscriptions actuelles. Il est uniquement téléchargé : aucun e-mail n'est envoyé et la planification du prochain envoi reste inchangée.",
};

const downloadLabel: StaticTranslationString = {
  de: 'Bericht als PDF herunterladen',
  en: 'Download the report as PDF',
  fr: 'Télécharger le rapport en PDF',
};

const generatingLabel: StaticTranslationString = {
  de: 'Bericht wird erstellt...',
  en: 'Generating the report...',
  fr: 'Génération du rapport...',
};

const genericError: StaticTranslationString = {
  de: 'Der Bericht konnte nicht erstellt werden.',
  en: 'The report could not be generated.',
  fr: "Le rapport n'a pas pu être généré.",
};

/** The filename the server chose, so the download matches the mail attachment. */
const parseFilename = (contentDisposition: string | null): string | undefined => {
  const match = /filename="([^"]+)"/.exec(contentDisposition ?? '');
  return match?.[1];
};

/** Reads the handler's error message, which is JSON on every failing response. */
const readErrorMessage = async (response: Response): Promise<string | undefined> => {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === 'string' && body.error !== '' ? body.error : undefined;
  } catch {
    return undefined;
  }
};

/** Hands the rendered PDF to the browser without leaving the settings page. */
const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoked a tick later rather than inline: revoking while the browser is still
  // picking the blob up cancels the download in some of them.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/**
 * Custom Payload CMS field component that renders the weekly report on demand and
 * downloads it.
 *
 * The report is fetched rather than opened in a tab: building it walks every
 * registration, which takes long enough that an operator needs to see it is running.
 */
export const WeeklyReportDownloadButton: React.FC = () => {
  const { code } = useLocale();
  const locale = resolveAdminLocale(code);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleDownload = async (): Promise<void> => {
    setIsGenerating(true);
    setError(undefined);

    try {
      const response = await fetch(REPORT_URL, { credentials: 'include' });

      if (!response.ok) {
        setError((await readErrorMessage(response)) ?? genericError[locale]);
        return;
      }

      saveBlob(
        await response.blob(),
        parseFilename(response.headers.get('Content-Disposition')) ?? 'anmeldestand.pdf',
      );
    } catch {
      setError(genericError[locale]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mb-5 rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-50) p-4">
      <h4 className="m-0 mb-2 text-[15px] font-semibold text-(--theme-elevation-900)">
        {cardTitle[locale]}
      </h4>
      <p className="m-0 mb-4 text-[13px] leading-relaxed text-(--theme-elevation-600)">
        {cardDescription[locale]}
      </p>

      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={isGenerating}
        aria-busy={isGenerating}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-(--theme-success-500) px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--theme-success-600) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        {isGenerating ? generatingLabel[locale] : downloadLabel[locale]}
      </button>

      {/* The button's label carries the running state visually, but a changed label on a
          disabled button is not announced. A run takes seconds, so it has to be. */}
      <p role="status" className="sr-only">
        {isGenerating ? generatingLabel[locale] : ''}
      </p>

      {error !== undefined && (
        <p
          role="alert"
          className="mt-3 mb-0 flex items-center gap-2 text-[13px] text-(--theme-error-600)"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

export default WeeklyReportDownloadButton;
