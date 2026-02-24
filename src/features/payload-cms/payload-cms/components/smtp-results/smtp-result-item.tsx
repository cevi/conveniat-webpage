'use client';

import {
  DSN_TIMEOUT_MS,
  LOCALIZED_SMTP_LABELS,
  WARNING_MESSAGES,
} from '@/features/payload-cms/payload-cms/components/smtp-results/constants';
import type {
  SmtpLanguage,
  SmtpResult,
} from '@/features/payload-cms/payload-cms/components/smtp-results/types';
import {
  extractEmailAddress,
  formatTimeDifference,
} from '@/features/payload-cms/payload-cms/components/smtp-results/utils';
import React from 'react';

export interface SmtpResultItemProperties {
  result: SmtpResult & { _isPendingPlaceholder?: boolean; _dsnHistory?: SmtpResult[] };
  lang: SmtpLanguage;
  smtpDomain: string;
  toAddress?: string | undefined;
  createdAtDate?: Date | undefined;
  dsnReceivedAtDate?: Date | undefined;
  currentTimeMs: number;
}

export const SmtpResultItem: React.FC<SmtpResultItemProperties> = ({
  result,
  lang,
  smtpDomain,
  toAddress,
  createdAtDate,
  dsnReceivedAtDate,
  currentTimeMs,
}) => {
  const labels = LOCALIZED_SMTP_LABELS[lang];

  let hasError = false;
  if (result.success === false) hasError = true;
  if (typeof result.error === 'string' && result.error.length > 0) hasError = true;
  let statusLabel: string = '';
  let statusType: 'empty' | 'pending' | 'success' | 'error' = 'empty';
  let badgePrefix: 'SMTP' | 'DSN' = 'SMTP';

  const isBounce = result.bounceReport === true;
  const historyItems = result._dsnHistory;
  const isPendingPlaceholder = result._isPendingPlaceholder === true;
  let dsnBadgeCount = '';

  let isDsnTimeout = false;
  let timeElapsedMs = 0;
  if (createdAtDate && !Number.isNaN(createdAtDate.getTime())) {
    timeElapsedMs = currentTimeMs - createdAtDate.getTime();
    if (timeElapsedMs > DSN_TIMEOUT_MS) {
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
      let dsnActionDate: Date | undefined;
      const actionDateString = result.parsedDsn?.actionDate ?? result.parsedDsn?.arrivalDate;
      if (typeof actionDateString === 'string') {
        const parsed = new Date(actionDateString);
        if (!Number.isNaN(parsed.getTime())) {
          dsnActionDate = parsed;
        }
      }
      let itemReceivedAt: Date | undefined;
      if (typeof result.receivedAt === 'string') {
        const parsed = new Date(result.receivedAt);
        if (!Number.isNaN(parsed.getTime())) {
          itemReceivedAt = parsed;
        }
      }
      const finalArrivalDate = itemReceivedAt ?? dsnActionDate ?? dsnReceivedAtDate;
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
    let raw = '';
    if (typeof result.response?.response === 'string') raw = result.response.response;
    else if (typeof result.error === 'string') raw = result.error;

    const { action, finalRecipient, originalRecipient, forwardedTo } = result.parsedDsn;

    if (
      (typeof finalRecipient === 'string' && finalRecipient.length > 0) ||
      action !== 'Unknown' ||
      (typeof originalRecipient === 'string' && originalRecipient.length > 0)
    ) {
      const rawChain: string[] = [];
      if (typeof toAddress === 'string' && toAddress.length > 0) {
        rawChain.push(toAddress);
      }
      if (typeof result.to === 'string' && result.to.length > 0 && result.to !== 'unknown') {
        rawChain.push(result.to);
      }
      if (typeof originalRecipient === 'string' && originalRecipient.length > 0) {
        rawChain.push(originalRecipient);
      }
      if (typeof finalRecipient === 'string' && finalRecipient.length > 0) {
        rawChain.push(finalRecipient);
      }
      if (typeof forwardedTo === 'string' && forwardedTo.length > 0) {
        rawChain.push(forwardedTo);
      }

      // First clean emails and remove empty ones
      let cleanedChain = rawChain
        .map((email) => extractEmailAddress(email))
        .filter((email) => email.length > 0);

      // Remove noreply addresses from the chain if they are not the only participant
      // This hides noisy internal forwards back to the system return-path
      if (cleanedChain.length > 1) {
        const withoutNoreply = cleanedChain.filter(
          (emailAddress) => !emailAddress.toLowerCase().includes('noreply'),
        );
        // If filtering wiped everything (shouldn't happen, but fallback)
        if (withoutNoreply.length > 0) {
          cleanedChain = withoutNoreply;
        }
      }

      // Deduplicate sequential entries
      const chain: string[] = [];
      for (const email of cleanedChain) {
        const lower = email.toLowerCase();
        if ((chain.at(-1)?.toLowerCase() ?? '') !== lower) {
          chain.push(email);
        }
      }

      const recipientChainString = chain.length > 0 ? chain.join(' -> ') : 'Unknown';

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
        <div className="mt-1 text-xs text-orange-600 dark:text-orange-400">{warningText}</div>
      )}
    </div>
  );
};
