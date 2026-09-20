import type { ParsedMail } from 'mailparser';

import { getOriginalEnvelopeId } from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces/email-parser';

/**
 * Subject line RFC 7489 §7.2.1.1 prescribes for an aggregate report, e.g.
 * `Report Domain: cevi.tools Submitter: google.com Report-ID: 18262...`.
 */
const DMARC_SUBJECT_PATTERN = /report[ -]domain:\s*\S+\s+submitter:\s*\S+\s+report-id:\s*\S/i;

/**
 * Report filename RFC 7489 §7.2.1.1 prescribes:
 * `<submitter>!<policy-domain>!<begin>!<end>[!<unique-id>].xml[.gz]`, or the same as `.zip`.
 */
const DMARC_FILENAME_PATTERN = /^[^!]+![^!]+!\d+!\d+(?:![^!]+)?\.(?:xml(?:\.gz)?|zip)$/i;

/**
 * Whether the message carries the machine-readable half of a delivery status notification.
 * Used only to refuse to classify such a message as anything else.
 */
const hasDeliveryStatusPart = (parsed: ParsedMail): boolean => {
  if (parsed.attachments.some((attachment) => attachment.contentType === 'message/delivery-status'))
    return true;

  const contentType: unknown = parsed.headers.get('content-type');
  if (typeof contentType === 'object' && contentType !== null && 'params' in contentType) {
    const { params } = contentType as { params?: Record<string, string> };
    return params?.['report-type']?.toLowerCase() === 'delivery-status';
  }

  return false;
};

/**
 * Whether a message is a DMARC aggregate report.
 *
 * The `rua=` for `cevi.tools` points at the same mailbox the bounce check polls, so roughly
 * three quarters of what it reads are these. They report on a domain rather than on a message,
 * carry no identifier of anything we sent, and are therefore the one kind of mail in the shared
 * mailbox we can recognise without knowing which deployment it belongs to — which is what makes
 * them safe to delete when an unmatched notification is not.
 *
 * Deliberately conservative: it wants both the subject and the attachment filename the RFC
 * prescribes, and refuses anything carrying delivery status. A report we fail to recognise is
 * left in the mailbox; a notification we delete by mistake is gone.
 *
 * @param parsed - The parsed message to classify.
 * @returns Whether the message is safe to delete as a DMARC aggregate report.
 */
export const isDmarcAggregateReport = (parsed: ParsedMail): boolean => {
  if (!DMARC_SUBJECT_PATTERN.test(parsed.subject ?? '')) return false;

  const hasReportAttachment = parsed.attachments.some(
    ({ filename }) => typeof filename === 'string' && DMARC_FILENAME_PATTERN.test(filename),
  );
  if (!hasReportAttachment) return false;

  if (hasDeliveryStatusPart(parsed)) return false;

  return getOriginalEnvelopeId(parsed) === undefined;
};
