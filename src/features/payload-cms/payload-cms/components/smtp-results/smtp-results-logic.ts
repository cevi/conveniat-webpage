import type { SmtpResult } from '@/features/payload-cms/payload-cms/components/smtp-results/types';

export const deriveSmtpItems = (
  items: SmtpResult[],
  toAddress?: string,
): (SmtpResult & { _isPendingPlaceholder?: boolean })[] => {
  const finalItems: (SmtpResult & { _isPendingPlaceholder?: boolean })[] = [];
  const expectedRecipients = new Set<string>();
  const dsnItems: SmtpResult[] = [];

  const queueIdToRecipient = new Map<string, string>();
  const messageIdToRecipient = new Map<string, string>();

  for (const item of items) {
    if (item.bounceReport === true) {
      dsnItems.push(item);
    } else {
      finalItems.push(item);

      let smtpRecipient: string | undefined;
      // Collect all expected recipients from SMTP responses
      if (Array.isArray(item.response?.accepted)) {
        for (const rec of item.response.accepted) {
          if (typeof rec === 'string' && rec.length > 0) {
            const lowerRec = rec.toLowerCase();
            expectedRecipients.add(lowerRec);
            smtpRecipient = lowerRec;
          }
        }
      } else if (Array.isArray(item.response?.envelope?.to)) {
        for (const rec of item.response.envelope.to) {
          if (typeof rec === 'string' && rec.length > 0) {
            const lowerRec = rec.toLowerCase();
            expectedRecipients.add(lowerRec);
            smtpRecipient = lowerRec;
          }
        }
      }

      // If we found a recipient for this SMTP success item, track its IDs
      if (typeof smtpRecipient === 'string' && smtpRecipient.length > 0) {
        const messageId = item.response?.messageId;
        if (typeof messageId === 'string' && messageId.length > 0) {
          const cleanMessageId = messageId.replaceAll(/[<>]/g, '').trim();
          messageIdToRecipient.set(cleanMessageId, smtpRecipient);
        }
        const responseString = item.response?.response;
        if (typeof responseString === 'string') {
          const queuedAsMatch = /queued as\s*([a-zA-Z0-9_-]+)/i.exec(responseString);
          if (queuedAsMatch?.[1] !== undefined) {
            queueIdToRecipient.set(queuedAsMatch[1].trim(), smtpRecipient);
          }
        }
      }
    }
  }

  const dsnMap = new Map<string, SmtpResult[]>();
  const availableFallbackRecipients = new Set(expectedRecipients);

  for (const item of dsnItems) {
    let recipient = 'unknown';

    // 1. Trust explicitly stored `to` field (e.g. from newer outgoing-emails injections)
    if (typeof item.to === 'string' && item.to.includes('@') && !item.to.includes('noreply')) {
      recipient = item.to.toLowerCase();
    }
    // 2. Try to match historical DSNs via Queue ID or Message ID found in their raw text
    else {
      let rawText = '';
      if (typeof item.response?.response === 'string') rawText += item.response.response;
      if (typeof item.error === 'string') rawText += item.error;

      let matchedRecipient: string | undefined;

      // Check Queue IDs
      for (const [queueId, rec] of queueIdToRecipient.entries()) {
        if (rawText.includes(queueId)) {
          matchedRecipient = rec;
          break;
        }
      }

      // Check Message IDs
      if (matchedRecipient === undefined) {
        for (const [messageId, rec] of messageIdToRecipient.entries()) {
          if (rawText.includes(messageId)) {
            matchedRecipient = rec;
            break;
          }
        }
      }

      if (typeof matchedRecipient === 'string' && matchedRecipient.length > 0) {
        recipient = matchedRecipient;
      }
      // 3. Fallback to parsed headers
      else if (item.parsedDsn) {
        recipient = item.parsedDsn.originalRecipient ?? item.parsedDsn.finalRecipient ?? 'unknown';
      }
    }

    recipient = recipient.toLowerCase();

    // 4. SRS/Forwarding fallback for old historical data: If the DSN only addressed the system return-path
    // (e.g. noreply), but we have orphaned expected recipients, assign one to them.
    if (
      !expectedRecipients.has(recipient) &&
      recipient.includes('noreply') &&
      availableFallbackRecipients.size > 0
    ) {
      recipient = [...availableFallbackRecipients][0] as string;
      availableFallbackRecipients.delete(recipient);
    } else if (availableFallbackRecipients.has(recipient)) {
      availableFallbackRecipients.delete(recipient);
    }

    const existing = dsnMap.get(recipient) ?? [];
    existing.push(item);
    dsnMap.set(recipient, existing);
  }

  // Add the grouped DSNs
  let hasValidMemberDsn = false;
  for (const [recipient, historyItems] of dsnMap.entries()) {
    expectedRecipients.delete(recipient);
    // If a DSN was matched to an actual email address instead of the raw system address or 'unknown',
    // we can assume the email was processed downstream.
    if (recipient !== 'unknown' && !recipient.includes('noreply')) {
      hasValidMemberDsn = true;
    }

    // Sort items chronologically by receivedAt (if we assume array order is roughly chronological, we can just use the last one)
    // Actually, payload usually returns them in the order they were inserted, with newer ones later.
    // For now, let's just pick the last item as the "final" state for this recipient.
    const finalState = historyItems.at(-1);

    if (finalState) {
      // Create a modified item that stores the history for the tooltip
      const extendedItem: SmtpResult & { _dsnHistory?: SmtpResult[] } = {
        ...finalState,
        to: recipient, // Inject resolved grouping recipient to overwrite 'unknown'
        success: finalState.success === true,
      };
      extendedItem._dsnHistory = historyItems;
      finalItems.push(extendedItem);
    }
  }

  // Add placeholder items for missing DSNs
  const normalizedToAddress = toAddress?.toLowerCase();
  for (const missingRecipient of expectedRecipients) {
    if (missingRecipient === 'unknown' || missingRecipient.length === 0) continue;

    // Group forwarding fallback: If the system received a DSN from a downstream group member,
    // the top-level group address (e.g., conveniat@) will never receive a unified DSN.
    // Skip generating a pending placeholder for the group address itself.
    if (hasValidMemberDsn && missingRecipient === normalizedToAddress) {
      continue;
    }

    finalItems.push({
      success: true, // true to map hasError to false
      to: missingRecipient,
      bounceReport: true,
      _isPendingPlaceholder: true,
    } as SmtpResult & { _isPendingPlaceholder?: boolean });
  }

  return finalItems;
};
