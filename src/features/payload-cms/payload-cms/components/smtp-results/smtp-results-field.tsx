'use client';

import { useField, useTranslation } from '@payloadcms/ui';
import React from 'react';

// Type definitions for the smtpResult
interface SmtpResult {
  success: boolean;
  to: string;
  response?: {
    accepted?: string[];
    rejected?: string[];
    envelopeTime?: number;
    messageTime?: number;
    messageSize?: number;
    response?: string;
    messageId?: string;
    envelope?: {
      from: string;
      to: string[];
    };
  };
  error?: string;
}

const LOCALIZED_LABELS = {
  en: {
    sent: 'Sent',
    unknown: 'Unknown',
    error: 'Error',
    noResults: 'No SMTP results available.',
    details: 'Hover for details',
  },
  de: {
    sent: 'Gesendet',
    unknown: 'Unbekannt',
    error: 'Fehler',
    noResults: 'Keine SMTP-Ergebnisse verfügbar.',
    details: 'Hover für Details',
  },
  fr: {
    sent: 'Envoyé',
    unknown: 'Inconnu',
    error: 'Erreur',
    noResults: 'Aucun résultat SMTP disponible.',
    details: 'Survoler pour les détails',
  },
};

const WARNING_MESSAGES = {
  en: "Warning: Sender is '{fromAddress}' instead of @cevi.tools.",
  de: "Warnung: Absender ist '{fromAddress}' anstelle von @cevi.tools.",
  fr: "Attention: L'expéditeur est '{fromAddress}' au lieu de @cevi.tools.",
};

export const SmtpResultsField: React.FC<{ path: string }> = ({ path }) => {
  const { value } = useField<SmtpResult[]>({ path });
  const { i18n } = useTranslation();

  const langRaw = i18n.language;
  const currentLang = typeof langRaw === 'string' && langRaw.length > 0 ? langRaw : 'de';
  const isValidLang = currentLang === 'en' || currentLang === 'de' || currentLang === 'fr';
  const lang: 'en' | 'de' | 'fr' = isValidLang ? currentLang : 'de';

  const labels = LOCALIZED_LABELS[lang];

  if (!Array.isArray(value) || value.length === 0) {
    return (
      <div className="field-type textarea">
        <label className="field-label">SMTP Results</label>
        <div className="text-gray-500">{labels.noResults}</div>
      </div>
    );
  }

  return (
    <div className="field-type custom-field mb-4">
      <label className="field-label">SMTP Results</label>
      <div className="flex flex-col gap-2">
        {value.map((result, index) => {
          // Determine status
          const isSuccess = result.success === true;
          const fromAddress = result.response?.envelope?.from ?? '';

          let status: 'sent' | 'unknown' | 'error' = 'error';
          let bgColor = 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200';

          if (isSuccess) {
            if (fromAddress.endsWith('@cevi.tools')) {
              status = 'sent';
              bgColor = 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200';
            } else {
              status = 'unknown';
              bgColor = 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200';
            }
          }

          let timeString = '0ms';
          const envelopeTime = result.response?.envelopeTime;
          const messageTime = result.response?.messageTime;

          if (envelopeTime !== undefined && messageTime !== undefined) {
            timeString = `${envelopeTime + messageTime}ms`;
          } else if (envelopeTime !== undefined) {
            timeString = `${envelopeTime}ms`;
          } else if (messageTime !== undefined) {
            timeString = `${messageTime}ms`;
          }

          let titleContent = 'No additional details';
          const messageId = result.response?.messageId;
          if (typeof messageId === 'string' && messageId.length > 0) {
            titleContent = `Message ID: ${messageId}\nFrom: ${fromAddress}`;
          } else if (typeof result.error === 'string' && result.error.length > 0) {
            titleContent = result.error;
          }

          const responseText = result.response?.response ?? result.error ?? 'No response details';
          const warningText = WARNING_MESSAGES[lang].replace('{fromAddress}', fromAddress);

          return (
            <div
              key={index}
              className="flex flex-col rounded border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-800"
              title={titleContent}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 font-medium ${bgColor}`}>
                  {labels[status]}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  {timeString}
                </span>
              </div>
              <div className="font-mono text-xs break-all text-gray-700 dark:text-gray-300">
                {responseText}
              </div>
              {status === 'unknown' && (
                <div className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                  {warningText}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmtpResultsField;
