import { parseDeliveryReport } from '@/features/payload-cms/payload-cms/components/smtp-results/delivery-overview';
import type { ParsedMail } from 'mailparser';

export const getOriginalEnvelopeId = (parsed: ParsedMail): string | undefined => {
  const headerValue = parsed.headers.get('original-envelope-id');

  if (headerValue !== undefined) {
    const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (typeof rawValue === 'object' && 'value' in rawValue) {
      const val = (rawValue as { value?: unknown }).value;
      if (typeof val === 'string' && val.length > 0) {
        return val.trim();
      }
    } else if (typeof rawValue === 'string' && rawValue.length > 0) {
      return rawValue.trim();
    }
  }

  // Fallback to body parsing
  const text = typeof parsed.text === 'string' ? parsed.text : '';
  if (text.length > 0) {
    const match = /Original-Envelope-Id:\s*([a-zA-Z0-9-]+)/i.exec(text);
    const id = match?.[1];
    if (typeof id === 'string' && id.length > 0) return id;
  }

  return undefined;
};

export interface RecipientBounce {
  email?: string;
  action?: string;
  status?: string;
  isSuccess: boolean;
}

export const determineDeliveryStatus = (
  parsed: ParsedMail,
): {
  isSuccess: boolean;
  dsnString: string;
  recipientBounces: RecipientBounce[];
  dsnText: string;
} => {
  const subject = (parsed.subject ?? '').toLowerCase();
  let rawText = typeof parsed.text === 'string' ? parsed.text : '';
  if (rawText.length === 0) rawText = typeof parsed.html === 'string' ? parsed.html : '';
  if (rawText.length === 0)
    rawText = typeof parsed.textAsHtml === 'string' ? parsed.textAsHtml : '';

  const text = rawText.toLowerCase();

  const isFailure =
    text.includes('action: failed') ||
    subject.includes('undelivered') ||
    subject.includes('failure') ||
    subject.includes('returned to sender');

  const isSuccessGlobal =
    !isFailure &&
    (subject.includes('successful') ||
      subject.includes('delivered') ||
      text.includes('successfully delivered') ||
      text.includes('status: 2.0.0') ||
      text.includes('action: relayed') ||
      text.includes('action: delivered'));

  let dsnString = `Delivery Status Notification. Subject: ${parsed.subject ?? ''}.\n\nReason:\n${rawText.trim()}`;

  let dsnText = rawText;
  const dsnAttachment = parsed.attachments.find((a) => a.contentType === 'message/delivery-status');
  if (dsnAttachment && Buffer.isBuffer(dsnAttachment.content)) {
    dsnText = dsnAttachment.content.toString('utf8');
  }

  const recipientBounces: RecipientBounce[] = [];
  const lines = dsnText.split(/\r?\n/);

  let currentBounce: Partial<RecipientBounce> | undefined = undefined;
  // One report names its recipient twice, in either order. `Final-Recipient` is the address
  // delivery was attempted to. `Original-Recipient` was our own return address on mails sent
  // before we stopped passing it as ORCPT, so it only stands in when the report has nothing
  // else.
  let seen = new Set<string>();

  for (const line of lines) {
    const recipientMatch = line.match(/^(Final|Original)-Recipient:\s*(?:rfc822;\s*)?([^\s;]+)/i);
    if (recipientMatch) {
      const kind = (recipientMatch[1] as string).toLowerCase();
      const startsNewReport =
        currentBounce === undefined || currentBounce.action !== undefined || seen.has(kind);
      if (startsNewReport) {
        if (currentBounce?.email !== undefined && currentBounce.email.length > 0) {
          currentBounce.isSuccess ??= isSuccessGlobal;
          recipientBounces.push(currentBounce as RecipientBounce);
        }
        currentBounce = {};
        seen = new Set();
      }
      seen.add(kind);
      if (currentBounce !== undefined && (kind === 'final' || currentBounce.email === undefined)) {
        currentBounce.email = recipientMatch[2] as string;
      }
      continue;
    }

    if (currentBounce !== undefined) {
      const actionMatch = line.match(/^Action:\s*([^\s]+)/i);
      if (actionMatch) {
        currentBounce.action = (actionMatch[1] as string).toLowerCase();
        // A list that took the mail over has handed it on, the same as a relay.
        currentBounce.isSuccess =
          currentBounce.action === 'delivered' ||
          currentBounce.action === 'relayed' ||
          currentBounce.action === 'expanded';
      }

      const statusMatch = line.match(/^Status:\s*([^\s]+)/i);
      if (statusMatch) {
        currentBounce.status = statusMatch[1] as string;
      }
    }
  }

  if (currentBounce?.email !== undefined && currentBounce.email.length > 0) {
    currentBounce.isSuccess ??= isSuccessGlobal;
    recipientBounces.push(currentBounce as RecipientBounce);
  }

  // The stored text is all the admin panel has to tell the recipients of a report apart. A
  // body that names fewer of them than the attached status part gets that part appended.
  const inBody = new Set(parseDeliveryReport(rawText).map((block) => block.finalRecipient));
  const isBodyComplete = recipientBounces.every((bounce) =>
    inBody.has(bounce.email?.toLowerCase()),
  );
  if (dsnText !== rawText && !isBodyComplete) dsnString += `\n\n${dsnText.trim()}`;

  return {
    isSuccess: isSuccessGlobal,
    dsnString,
    dsnText,
    recipientBounces,
  };
};

export const parsePop3Messages = (rawResponse: unknown): { id: number; uid: string }[] => {
  const messages: { id: number; uid: string }[] = [];

  if (typeof rawResponse === 'string') {
    const lines = rawResponse.split('\r\n').filter(Boolean);
    for (const line of lines) {
      const parts = line.split(' ');
      const rawId = parts[0];
      const uid = parts[1];
      if (typeof rawId === 'string' && typeof uid === 'string') {
        const id = Number.parseInt(rawId, 10);
        if (!Number.isNaN(id)) messages.push({ id, uid });
      }
    }
  } else if (Array.isArray(rawResponse)) {
    for (const item of rawResponse as unknown[]) {
      if (Array.isArray(item) && item.length >= 2) {
        const id = Number.parseInt(String(item[0]), 10);
        const uid = String(item[1]);
        if (!Number.isNaN(id)) messages.push({ id, uid });
      }
    }
  }

  return messages;
};
