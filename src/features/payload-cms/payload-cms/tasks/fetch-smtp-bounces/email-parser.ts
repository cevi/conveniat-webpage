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

export const determineDeliveryStatus = (
  parsed: ParsedMail,
): { isSuccess: boolean; dsnString: string } => {
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

  const isSuccess =
    !isFailure &&
    (subject.includes('successful') ||
      subject.includes('delivered') ||
      text.includes('successfully delivered') ||
      text.includes('status: 2.0.0') ||
      text.includes('action: relayed') ||
      text.includes('action: delivered'));

  return {
    isSuccess,
    dsnString: `Delivery Status Notification. Subject: ${parsed.subject ?? ''}.\n\nReason:\n${rawText.trim()}`,
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
