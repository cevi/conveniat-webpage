'use client';

import {
  LOCALIZED_SMTP_LABELS,
  type SmtpResult,
} from '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-shared';
import type { StaticTranslationString } from '@/types/types';
import { useField, useTranslation } from '@payloadcms/ui';
import React from 'react';

const WARNING_MESSAGES: StaticTranslationString = {
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

  const labels = LOCALIZED_SMTP_LABELS[lang];

  if (!Array.isArray(value) || value.length === 0) {
    return (
      <div className="field-type textarea">
        <label className="field-label">{labels.sectionTitle}</label>
        <div className="text-gray-500">{labels.noResults}</div>
      </div>
    );
  }

  return (
    <div className="field-type custom-field mb-4">
      <label className="field-label">{labels.sectionTitle}</label>
      <div className="flex flex-col gap-2">
        {value.map((result, index) => {
          let hasError = false;
          if (result.success === false) hasError = true;
          if (typeof result.error === 'string' && result.error.length > 0) hasError = true;

          let statusLabel = labels.smtpEmpty;
          let statusType: 'empty' | 'pending' | 'success' | 'error' = 'empty';
          let badgePrefix = 'SMTP';

          const isBounce = result.bounceReport === true;
          if (isBounce) {
            badgePrefix = 'DSN';
            if (hasError) {
              statusType = 'error';
              statusLabel = labels.dsnError;
            } else {
              statusType = 'success';
              statusLabel = labels.dsnSuccess;
            }
          } else {
            badgePrefix = 'SMTP';
            const fromAddress = result.response?.envelope?.from ?? '';
            if (hasError) {
              statusType = 'error';
              statusLabel = labels.smtpError;
            } else if (fromAddress.endsWith('@cevi.tools') || fromAddress.length === 0) {
              statusType = 'success';
              statusLabel = labels.smtpSuccess;
            } else {
              statusType = 'pending';
              statusLabel = labels.smtpPending;
            }
          }

          let badgeColorClasses =
            'border-gray-200 bg-transparent text-gray-400 dark:border-gray-700 dark:text-gray-500';
          let badgeSymbol = '-';

          switch (statusType) {
            case 'pending': {
              badgeColorClasses =
                'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
              badgeSymbol = '?';
              break;
            }
            case 'success': {
              badgeColorClasses =
                'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200';
              badgeSymbol = '✓';
              break;
            }
            case 'error': {
              badgeColorClasses =
                'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200';
              badgeSymbol = '✗';
              break;
            }
            default: {
              break;
            }
          }

          let timeString = '0ms';
          const envelopeTime = result.response?.envelopeTime;
          const messageTime = result.response?.messageTime;

          if (envelopeTime !== undefined && messageTime !== undefined) {
            timeString = `${envelopeTime + messageTime}ms`;
          } else if (envelopeTime !== undefined) {
            timeString = `${String(envelopeTime)}ms`;
          } else if (messageTime !== undefined) {
            timeString = `${String(messageTime)}ms`;
          }

          let titleContent = 'No additional details';
          const messageId = result.response?.messageId;
          const fromAddress = result.response?.envelope?.from ?? '';
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
                <span
                  className={`rounded border px-2 py-0.5 font-medium ${badgeColorClasses}`}
                  title={statusLabel}
                >
                  {badgePrefix} {badgeSymbol}
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
              {statusType === 'pending' && !isBounce && fromAddress.length > 0 && (
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
