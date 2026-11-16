import type { DeliveryAction } from '@/features/payload-cms/payload-cms/components/smtp-results/delivery-overview';
import { parseDeliveryReport } from '@/features/payload-cms/payload-cms/components/smtp-results/delivery-overview';
import type { SmtpResult } from '@/features/payload-cms/payload-cms/components/smtp-results/types';
import { isRateLimitRejection } from '@/features/payload-cms/payload-cms/utils/rate-limit-rejection';

/**
 * What became of one handover to our mail server.
 *
 * `rateLimited` is the server refusing because its hourly limit for the whole domain was
 * reached: nothing is wrong with the mail and the queue tries again. `withheld` is a recipient
 * on the list of suppressed addresses, `discarded` a queued mail that was no longer wanted.
 */
export type AttemptOutcome = 'accepted' | 'rateLimited' | 'refused' | 'withheld' | 'discarded';

export type HistoryEntry =
  | { kind: 'created'; at: string }
  | {
      kind: 'attempt';
      at?: string;
      /** Counts the times the mail was handed to our mail server, resends included. */
      number: number;
      outcome: AttemptOutcome;
      /** Set on a resend somebody started from the admin panel. */
      isResend: boolean;
      /** How long the mail waited between its creation and its first attempt. */
      waitedMs?: number;
      detail?: string;
    }
  | { kind: 'report'; at?: string; action: DeliveryAction; server?: string; recipient?: string }
  | { kind: 'override'; at?: string; success: boolean }
  /** Recipients on the list of suppressed addresses, left out of the attempt that follows. */
  | { kind: 'withheld'; recipients: string };

export interface MailHistory {
  entries: HistoryEntry[];
  attempts: number;
  rateLimitedAttempts: number;
  /** Creation to first attempt; absent while the mail has not been tried. */
  waitedMs?: number;
}

/** Below a minute the mail did not wait, it just took the queue's next run. */
const NOTICEABLE_WAIT_MS = 60 * 1000;

/** `discardQueuedEmail` and the suppression list both write "Not sent: …". */
const NOT_SENT = /^Not sent:/;
const SUPPRESSED = /list of suppressed addresses/;

const outcomeOf = (row: SmtpResult): AttemptOutcome => {
  if (row.success) return 'accepted';
  const error = typeof row.error === 'string' ? row.error : '';
  if (SUPPRESSED.test(error)) return 'withheld';
  if (NOT_SENT.test(error)) return 'discarded';
  return isRateLimitRejection(error) ? 'rateLimited' : 'refused';
};

const detailOf = (row: SmtpResult): string | undefined => {
  const text = row.success ? row.response?.response : row.error;
  return typeof text === 'string' && text.length > 0 ? text : undefined;
};

const timeOf = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
};

/**
 * Reads what happened to a mail, in the order it happened, from the log the mail code keeps on
 * the row: every handover to our mail server, every delivery report fetched later, every status
 * an admin set by hand.
 *
 * The log is only ever appended to, so its order is the order of events. Rows written before
 * v1.30 carry no `sentAt`; they keep their place without a time.
 *
 * @param results the stored `smtpResults` of the mail
 * @param createdAt when the row was written, which for a queued mail is when it was queued
 */
export const deriveMailHistory = (
  results: readonly SmtpResult[] | null | undefined,
  createdAt: string | null | undefined,
): MailHistory => {
  const entries: HistoryEntry[] = [];
  if (typeof createdAt === 'string') entries.push({ kind: 'created', at: createdAt });

  let attempts = 0;
  let rateLimitedAttempts = 0;
  let waitedMs: number | undefined;

  const rows: readonly unknown[] = results ?? [];
  for (const stored of rows) {
    // A `json` column holds whatever was written.
    if (typeof stored !== 'object' || stored === null) continue;
    const row = stored as SmtpResult;

    if (row.manualOverride === true) {
      // The override writes one row for the handover and one for the report; one says it.
      if (row.bounceReport !== true) {
        entries.push({
          kind: 'override',
          success: row.success,
          ...(row.retriggeredAt !== undefined && { at: row.retriggeredAt }),
        });
      }
      continue;
    }

    if (row.bounceReport === true) {
      const text = typeof row.error === 'string' ? row.error : (row.response?.response ?? '');
      for (const block of parseDeliveryReport(text)) {
        entries.push({
          kind: 'report',
          action: block.event.action,
          ...(row.receivedAt !== undefined && { at: row.receivedAt }),
          ...(block.event.server !== undefined && { server: block.event.server }),
          ...(block.finalRecipient !== undefined && { recipient: block.finalRecipient }),
        });
      }
      continue;
    }

    const outcome = outcomeOf(row);
    // A send that left some recipients out writes them a row of their own, without a time,
    // right before its own row. It is part of that send, not an attempt of its own.
    if (outcome === 'withheld' && row.sentAt === undefined && row.retriggeredAt === undefined) {
      entries.push({ kind: 'withheld', recipients: row.to });
      continue;
    }

    attempts += 1;
    if (outcome === 'rateLimited') rateLimitedAttempts += 1;
    const at = row.sentAt ?? row.retriggeredAt;

    let wait: number | undefined;
    if (attempts === 1) {
      const sent = timeOf(at);
      const created = timeOf(createdAt);
      if (sent !== undefined && created !== undefined) {
        waitedMs = Math.max(0, sent - created);
        if (waitedMs >= NOTICEABLE_WAIT_MS) wait = waitedMs;
      }
    }

    const detail = detailOf(row);
    entries.push({
      kind: 'attempt',
      number: attempts,
      outcome,
      isResend: row.retriggeredBy !== undefined,
      ...(at !== undefined && { at }),
      ...(wait !== undefined && { waitedMs: wait }),
      ...(detail !== undefined && { detail }),
    });
  }

  return {
    entries,
    attempts,
    rateLimitedAttempts,
    ...(waitedMs !== undefined && { waitedMs }),
  };
};
