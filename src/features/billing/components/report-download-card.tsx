'use client';

import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { useLocale } from '@payloadcms/ui';
import { AlertTriangle, FileDown, RefreshCw } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export interface ReportDownloadCardProperties {
  /** The endpoint that renders the file, answering with JSON `{ error }` when it fails. */
  url: string;
  /** Used when the response names no file. */
  fallbackFilename: string;
  title: StaticTranslationString;
  description: StaticTranslationString;
  downloadLabel: StaticTranslationString;
  generatingLabel: StaticTranslationString;
  errorMessage: StaticTranslationString;
}

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

/** Hands the rendered file to the browser without leaving the settings page. */
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
 * A card in the bill settings that renders one of the weekly mail's attachments on demand
 * and downloads it, without sending anything.
 *
 * The file is fetched rather than opened in a tab: building it walks every registration,
 * which takes long enough that an operator needs to see it is running.
 */
export const ReportDownloadCard: React.FC<ReportDownloadCardProperties> = ({
  url,
  fallbackFilename,
  title,
  description,
  downloadLabel,
  generatingLabel,
  errorMessage,
}) => {
  const { code } = useLocale();
  const locale = resolveAdminLocale(code);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleDownload = async (): Promise<void> => {
    setIsGenerating(true);
    setError(undefined);

    try {
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        setError((await readErrorMessage(response)) ?? errorMessage[locale]);
        return;
      }

      saveBlob(
        await response.blob(),
        parseFilename(response.headers.get('Content-Disposition')) ?? fallbackFilename,
      );
    } catch {
      setError(errorMessage[locale]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mb-5 rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-50) p-4">
      <h4 className="m-0 mb-2 text-[15px] font-semibold text-(--theme-elevation-900)">
        {title[locale]}
      </h4>
      <p className="m-0 mb-4 text-[13px] leading-relaxed text-(--theme-elevation-600)">
        {description[locale]}
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
