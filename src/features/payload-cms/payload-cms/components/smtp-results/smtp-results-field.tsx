'use client';

import {
  LOCALIZED_SMTP_LABELS,
  extractEmailAddress,
  formatTimeDifference,
  type SmtpResult,
} from '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-shared';
import type { StaticTranslationString } from '@/types/types';
import { useField, useFormFields, useTranslation } from '@payloadcms/ui';
import React from 'react';

const WARNING_MESSAGES: StaticTranslationString = {
  en: "Warning: Sender is '{fromAddress}' instead of @{smtpDomain}.",
  de: "Warnung: Absender ist '{fromAddress}' anstelle von @{smtpDomain}.",
  fr: "Attention: L'expéditeur est '{fromAddress}' au lieu de @{smtpDomain}.",
};

export const SmtpResultsField: React.FC<{ path: string; smtpDomain?: string }> = ({
  path,
  smtpDomain = 'cevi.tools',
}) => {
  const { value } = useField<SmtpResult[]>({ path });

  const toField = useFormFields(([fields]) => fields['to']);
  const toAddress =
    typeof toField?.value === 'string' ? extractEmailAddress(toField.value) : undefined;

  const createdAtField = useFormFields(([fields]) => fields['createdAt']);
  const createdAtString =
    typeof createdAtField?.value === 'string' ? createdAtField.value : undefined;
  const createdAtDate = createdAtString === undefined ? undefined : new Date(createdAtString);

  const dsnReceivedAtField = useFormFields(([fields]) => fields['dsnReceivedAt']);
  const dsnReceivedAtString =
    typeof dsnReceivedAtField?.value === 'string' ? dsnReceivedAtField.value : undefined;
  const dsnReceivedAtDate =
    dsnReceivedAtString === undefined ? undefined : new Date(dsnReceivedAtString);

  const { i18n } = useTranslation();

  const langRaw = i18n.language;
  const currentLang = typeof langRaw === 'string' && langRaw.length > 0 ? langRaw : 'de';
  const isValidLang = currentLang === 'en' || currentLang === 'de' || currentLang === 'fr';
  const lang: 'en' | 'de' | 'fr' = isValidLang ? currentLang : 'de';

  const labels = LOCALIZED_SMTP_LABELS[lang];

  // Use a stable 'now' value for date comparisons during render to avoid impurity lints
  const [currentTimeMs] = React.useState(() => Date.now());

  if (!Array.isArray(value) || value.length === 0) {
    return (
      <div className="field-type textarea">
        <label className="field-label">{labels.sectionTitle}</label>
        <div className="text-gray-500">{labels.noResults}</div>
      </div>
    );
  }

  // Pre-process items to group DSNs by recipient
  const finalItems: (SmtpResult & { _isPendingPlaceholder?: boolean })[] = [];
  const dsnMap = new Map<string, SmtpResult[]>();
  const expectedRecipients = new Set<string>();

  for (const item of value) {
    if (item.bounceReport === true) {
      // try to extract recipient
      let recipient = 'unknown';
      if (item.parsedDsn) {
        recipient = item.parsedDsn.finalRecipient ?? item.parsedDsn.originalRecipient ?? 'unknown';
      }

      recipient = recipient.toLowerCase();

      const existing = dsnMap.get(recipient) ?? [];
      existing.push(item);
      dsnMap.set(recipient, existing);
    } else {
      finalItems.push(item);
      // Collect all expected recipients from SMTP responses
      if (Array.isArray(item.response?.accepted)) {
        for (const rec of item.response.accepted) {
          if (typeof rec === 'string' && rec.length > 0) expectedRecipients.add(rec.toLowerCase());
        }
      } else if (Array.isArray(item.response?.envelope?.to)) {
        for (const rec of item.response.envelope.to) {
          if (typeof rec === 'string' && rec.length > 0) expectedRecipients.add(rec.toLowerCase());
        }
      }
    }
  }

  // Add the grouped DSNs
  for (const [recipient, items] of dsnMap.entries()) {
    expectedRecipients.delete(recipient);
    // Sort items chronologically by receivedAt (if we assume array order is roughly chronological, we can just use the last one)
    // Actually, payload usually returns them in the order they were inserted, with newer ones later.
    // For now, let's just pick the last item as the "final" state for this recipient.
    const finalState = items.at(-1);

    if (finalState) {
      // Create a modified item that stores the history for the tooltip
      const extendedItem: SmtpResult & { _dsnHistory?: SmtpResult[] } = {
        ...finalState,
        success: finalState.success === true,
      };
      extendedItem._dsnHistory = items;
      finalItems.push(extendedItem);
    }
  }

  // Add placeholder items for missing DSNs
  for (const missingRecipient of expectedRecipients) {
    if (missingRecipient === 'unknown' || missingRecipient.length === 0) continue;

    finalItems.push({
      success: true, // true to map hasError to false
      to: missingRecipient,
      bounceReport: true,
      _isPendingPlaceholder: true,
    } as SmtpResult & { _isPendingPlaceholder?: boolean });
  }

  return (
    <div className="field-type custom-field mb-4">
      <label className="field-label">{labels.sectionTitle}</label>
      <div className="flex flex-col gap-2">
        {finalItems.map((result, index) => {
          let hasError = false;
          if (result.success === false) hasError = true;
          if (typeof result.error === 'string' && result.error.length > 0) hasError = true;
          let statusLabel: string = '';
          let statusType: 'empty' | 'pending' | 'success' | 'error' = 'empty';
          let badgePrefix: 'SMTP' | 'DSN' = 'SMTP';

          const isBounce = result.bounceReport === true;
          const historyItems = (result as SmtpResult & { _dsnHistory?: SmtpResult[] })._dsnHistory;
          const isPendingPlaceholder =
            (result as SmtpResult & { _isPendingPlaceholder?: boolean })._isPendingPlaceholder ===
            true;
          let dsnBadgeCount = '';

          let isDsnTimeout = false;
          let timeElapsedMs = 0;
          if (createdAtDate && !Number.isNaN(createdAtDate.getTime())) {
            timeElapsedMs = currentTimeMs - createdAtDate.getTime();
            if (timeElapsedMs > 48 * 60 * 60 * 1000) {
              isDsnTimeout = true;
            }
          }

          if (isBounce) {
            badgePrefix = 'DSN';
            if (historyItems && historyItems.length > 1) {
              dsnBadgeCount = `(${historyItems.length})`; // indicate there are multiple nested items
            }
            if (isPendingPlaceholder) {
              if (isDsnTimeout) {
                statusType = 'error';
                statusLabel = labels.dsnError;
              } else {
                statusType = 'pending';
                statusLabel = labels.dsnPending;
              }
            } else if (hasError) {
              statusType = 'error';
              statusLabel = labels.dsnError;
            } else {
              statusType = 'success';
              statusLabel = labels.dsnSuccess;
            }
          } else {
            badgePrefix = 'SMTP';
            const rawFromAddress = result.response?.envelope?.from ?? '';
            const fromAddress = extractEmailAddress(rawFromAddress);
            if (hasError) {
              statusType = 'error';
              statusLabel = labels.smtpError;
            } else if (fromAddress.endsWith(`@${smtpDomain}`) || fromAddress.length === 0) {
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

          if (isBounce) {
            if (isPendingPlaceholder) {
              timeString = '-';
            } else {
              let dsnArrivalDate: Date | undefined;
              if (typeof result.parsedDsn?.arrivalDate === 'string') {
                const parsed = new Date(result.parsedDsn.arrivalDate);
                if (!Number.isNaN(parsed.getTime())) {
                  dsnArrivalDate = parsed;
                }
              }
              const finalArrivalDate = dsnArrivalDate ?? dsnReceivedAtDate;
              if (
                finalArrivalDate &&
                createdAtDate &&
                !Number.isNaN(createdAtDate.getTime()) &&
                !Number.isNaN(finalArrivalDate.getTime())
              ) {
                timeString = formatTimeDifference(createdAtDate, finalArrivalDate);
              }
            }
          } else if (envelopeTime !== undefined && messageTime !== undefined) {
            timeString = `${envelopeTime + messageTime}ms`;
          } else if (envelopeTime !== undefined) {
            timeString = `${String(envelopeTime)}ms`;
          } else if (messageTime !== undefined) {
            timeString = `${String(messageTime)}ms`;
          }

          let titleContent = 'No additional details';
          const messageId = result.response?.messageId;
          const rawFromAddress = result.response?.envelope?.from ?? '';
          const fromAddress = extractEmailAddress(rawFromAddress);
          if (isPendingPlaceholder) {
            titleContent = labels.dsnPending;
          } else if (typeof messageId === 'string' && messageId.length > 0) {
            titleContent = `Message ID: ${messageId}\nFrom: ${fromAddress}`;
          } else if (typeof result.error === 'string' && result.error.length > 0) {
            titleContent = result.error;
          }

          let responseText = result.response?.response ?? result.error ?? 'No response details';

          if (isPendingPlaceholder) {
            if (lang === 'de') {
              responseText = `Aktion: - | Empfänger: ${result.to}`;
            } else if (lang === 'fr') {
              responseText = `Action: - | Destinataire: ${result.to}`;
            } else {
              responseText = `Action: - | Recipient: ${result.to}`;
            }
          } else if (isBounce && result.parsedDsn) {
            const raw = result.response?.response ?? '';
            const { action, finalRecipient, originalRecipient, forwardedTo } = result.parsedDsn;

            if (
              (typeof finalRecipient === 'string' && finalRecipient.length > 0) ||
              action !== 'Unknown' ||
              (typeof originalRecipient === 'string' && originalRecipient.length > 0)
            ) {
              const recipient = finalRecipient ?? originalRecipient ?? 'Unknown';

              const chain: string[] = [];
              if (
                typeof toAddress === 'string' &&
                toAddress.length > 0 &&
                toAddress.toLowerCase() !== recipient.toLowerCase()
              ) {
                chain.push(toAddress);
              }
              chain.push(recipient);

              if (
                typeof forwardedTo === 'string' &&
                forwardedTo.length > 0 &&
                forwardedTo.toLowerCase() !== recipient.toLowerCase()
              ) {
                chain.push(forwardedTo);
              }

              const recipientChainString = chain.join(' -> ');

              if (lang === 'de') {
                responseText = `Aktion: ${action} | Empfänger: ${recipientChainString}`;
              } else if (lang === 'fr') {
                responseText = `Action: ${action} | Destinataire: ${recipientChainString}`;
              } else {
                responseText = `Action: ${action} | Recipient: ${recipientChainString}`;
              }

              let explanation = '';
              const act = action.toLowerCase();
              switch (act) {
                case 'relayed': {
                  explanation = labels.dsnActionRelayed;
                  break;
                }
                case 'delivered': {
                  explanation = labels.dsnActionDelivered;
                  break;
                }
                case 'failed': {
                  explanation = labels.dsnActionFailed;
                  break;
                }
                case 'delayed': {
                  explanation = labels.dsnActionDelayed;
                  break;
                }
                case 'expanded': {
                  explanation = labels.dsnActionExpanded;
                  break;
                }
                default: {
                  break;
                }
              }

              const explanationBlock = explanation.length > 0 ? `\n\nInfo: ${explanation}` : '';

              titleContent =
                titleContent === 'No additional details'
                  ? raw
                  : `${titleContent}${explanationBlock}\n\nRaw DSN:\n${raw}`;

              if (historyItems && historyItems.length > 1) {
                const itemsWithoutCurrent = historyItems.filter((h) => h !== result);
                if (itemsWithoutCurrent.length > 0) {
                  const eventStrings: string[] = [];
                  for (const hItem of [...itemsWithoutCurrent].reverse()) {
                    const hAction = hItem.parsedDsn?.action ?? 'Unknown';
                    let extraInfo = '';
                    const hAct = hAction.toLowerCase();
                    if (hAct === 'relayed') {
                      if (
                        typeof hItem.parsedDsn?.remoteMta === 'string' &&
                        hItem.parsedDsn.remoteMta.length > 0
                      )
                        extraInfo = ` | Server: ${hItem.parsedDsn.remoteMta}`;
                    } else if (hAct === 'delivered' || hAct === 'failed') {
                      const emailMatch =
                        hItem.parsedDsn?.finalRecipient ?? hItem.parsedDsn?.originalRecipient;
                      if (typeof emailMatch === 'string' && emailMatch.length > 0)
                        extraInfo = ` | Email: ${emailMatch}`;
                    }
                    const eventString = `>> Action: ${hAction}${extraInfo}`;
                    if (!eventStrings.includes(eventString)) {
                      eventStrings.push(eventString);
                    }
                  }
                  if (eventStrings.length > 0) {
                    titleContent += `\n\n--- Previous Events (${String(eventStrings.length)}) ---\n`;
                    titleContent += eventStrings.join('\n');
                  }
                }
              }
            }
          }
          const warningText = WARNING_MESSAGES[lang]
            .replace('{fromAddress}', fromAddress)
            .replace('{smtpDomain}', smtpDomain);

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
                  {badgePrefix} {badgeSymbol} {dsnBadgeCount}
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
