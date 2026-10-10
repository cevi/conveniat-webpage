import { DSN_TIMEOUT_MS } from '@/features/payload-cms/payload-cms/components/smtp-results/constants';
import type { SmtpResult } from '@/features/payload-cms/payload-cms/components/smtp-results/types';
import {
  extractEmailAddress,
  isManualOverrideItem,
  isSystemEmail,
} from '@/features/payload-cms/payload-cms/components/smtp-results/utils';

export type DeliveryAction = 'delivered' | 'relayed' | 'expanded' | 'failed' | 'delayed';

const DELIVERY_ACTIONS = new Set<string>(['delivered', 'relayed', 'expanded', 'failed', 'delayed']);

/** What one mail server reported about one recipient. */
export interface DeliveryEvent {
  action: DeliveryAction;
  /** The server that gave the answer, or the reporting one when it names no other. */
  server?: string;
  status?: string;
  diagnostic?: string;
  /** ISO time the message reached the reporting server, else the time the report was fetched. */
  at?: string;
  /** Set by an admin through the override, not reported by a mail server. */
  manual?: boolean;
}

export type RecipientState =
  'failed' | 'notSent' | 'delayed' | 'overdue' | 'noReport' | 'relayed' | 'delivered';

export interface RecipientDelivery {
  address: string;
  /** False for an address we never sent to: a member of a list, or a forwarding target. */
  expected: boolean;
  /** The expected recipient a report names as the origin of this address. */
  via?: string;
  /** How our own mail server answered. Missing for an address we never sent to. */
  submission?: { accepted: boolean; detail: string; durationMs?: number };
  events: DeliveryEvent[];
  state: RecipientState;
}

export interface DeliveryAttempt {
  startedAt?: string;
  fromAddress?: string;
  recipients: RecipientDelivery[];
  /** Reports that name no recipient we can tell apart from our own sender address. */
  unassigned: DeliveryEvent[];
}

export interface DeliveryOverview {
  current: DeliveryAttempt;
  /** Attempts before the latest resend, oldest first. */
  earlier: DeliveryAttempt[];
  /** Distinct report messages, however often the bounce job stored each. */
  reportCount: number;
  /** Stored reports without a delivery status, such as an unrelated mail in the mailbox. */
  unreadableCount: number;
  lastFetchedAt?: string;
}

interface ReportBlock {
  finalRecipient?: string;
  originalRecipient?: string;
  event: DeliveryEvent;
}

const ADDRESS_PATTERN = /[^\s<>;:,"]+@[^\s<>;:,"]+/;

const addressOf = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : ADDRESS_PATTERN.exec(value)?.[0]?.toLowerCase();

/** `dns; mx01.example.ch (192.0.2.1)` names the host `mx01.example.ch`. */
const hostOf = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : /^(?:[\w-]+;\s*)?([^\s(]+)/.exec(value)?.[1]?.toLowerCase();

const toIsoDate = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
};

/**
 * Splits a report into its header groups. RFC 3464 separates the per-message fields and each
 * recipient's fields with a blank line, and folds a long value onto indented lines.
 *
 * @param text - The report as stored by the bounce job.
 * @returns One map of lower-cased field names per group.
 */
const parseHeaderGroups = (text: string): Map<string, string>[] => {
  const groups: Map<string, string>[] = [];
  let current = new Map<string, string>();
  let lastKey: string | undefined;

  const flush = (): void => {
    if (current.size > 0) groups.push(current);
    current = new Map();
    lastKey = undefined;
  };

  for (const line of text.split(/\r?\n/)) {
    if (line.trim().length === 0) {
      flush();
      continue;
    }
    if (/^[ \t]/.test(line)) {
      if (lastKey !== undefined) {
        current.set(lastKey, `${current.get(lastKey) ?? ''} ${line.trim()}`);
      }
      continue;
    }
    const field = /^([A-Za-z][A-Za-z-]*):\s*(.*)$/.exec(line);
    if (!field) {
      lastKey = undefined;
      continue;
    }
    const key = (field[1] as string).toLowerCase();
    // Some servers leave out the blank line between two recipients.
    if (key === 'final-recipient' && current.has(key)) flush();
    current.set(key, (field[2] as string).trim());
    lastKey = key;
  }
  flush();

  return groups;
};

/**
 * Reads every recipient a delivery report covers. One report can cover all recipients of a
 * mail, and servers order the fields of a recipient differently, so nothing here depends on
 * which field comes first.
 *
 * @param text - The report as stored by the bounce job.
 * @returns One block per recipient with a known action. Empty when the text is no report.
 */
export const parseDeliveryReport = (text: string): ReportBlock[] => {
  const groups = parseHeaderGroups(text);
  const messageFields = groups.find((group) => group.has('reporting-mta'));
  const reportingServer = hostOf(messageFields?.get('reporting-mta'));
  const arrivedAt = toIsoDate(messageFields?.get('arrival-date'));

  const blocks: ReportBlock[] = [];
  for (const group of groups) {
    const action = group.get('action')?.split(/\s/)[0]?.toLowerCase();
    if (action === undefined || !DELIVERY_ACTIONS.has(action)) continue;

    const server = hostOf(group.get('remote-mta')) ?? reportingServer;
    const status = group.get('status')?.split(/\s/)[0];
    const diagnostic = group.get('diagnostic-code')?.replace(/^[\w-]+;\s*/, '');
    const finalRecipient = addressOf(group.get('final-recipient'));
    const originalRecipient = addressOf(group.get('original-recipient'));

    blocks.push({
      ...(finalRecipient !== undefined && { finalRecipient }),
      ...(originalRecipient !== undefined && { originalRecipient }),
      event: {
        action: action as DeliveryAction,
        ...(server !== undefined && { server }),
        ...(status !== undefined && { status }),
        ...(diagnostic !== undefined && { diagnostic }),
        ...(arrivedAt !== undefined && { at: arrivedAt }),
      },
    });
  }
  return blocks;
};

const reportTextOf = (row: SmtpResult): string => {
  if (typeof row.error === 'string' && row.error.length > 0) return row.error;
  return typeof row.response?.response === 'string' ? row.response.response : '';
};

const isSubmissionFailure = (row: SmtpResult): boolean =>
  row.success === false || (typeof row.error === 'string' && row.error.length > 0);

const queueIdOf = (row: SmtpResult): string | undefined =>
  /queued as\s+([\w-]+)/i.exec(row.response?.response ?? '')?.[1];

/** A resend starts a new attempt. An override carries the same marker and does not. */
const isResend = (row: SmtpResult): boolean =>
  row.bounceReport !== true &&
  row.retriggeredBy !== undefined &&
  !isManualOverrideItem(row as unknown as Record<string, unknown>);

const isHandOff = (event: DeliveryEvent): boolean =>
  event.action === 'relayed' || event.action === 'expanded';

/**
 * The report that states the outcome. `relayed` and `expanded` only say the message left one
 * hop, and the verdict of the next hop is a separate report that can carry an earlier time.
 * The last report that is neither is the outcome.
 *
 * @param events - All reports for one recipient.
 * @returns The report that decides the recipient's state.
 */
export const outcomeOf = (events: DeliveryEvent[]): DeliveryEvent | undefined =>
  events.findLast((event) => !isHandOff(event)) ?? events.at(-1);

const stateOf = (recipient: RecipientDelivery, isOverdue: boolean): RecipientState => {
  const outcome = outcomeOf(recipient.events);
  if (outcome !== undefined) {
    if (outcome.action === 'expanded') return 'relayed';
    return outcome.action;
  }
  if (recipient.submission?.accepted === false) return 'notSent';
  return isOverdue ? 'overdue' : 'noReport';
};

const isSameEvent = (a: DeliveryEvent | undefined, b: DeliveryEvent): boolean =>
  a?.action === b.action && a.server === b.server && a.status === b.status && a.manual === b.manual;

const deriveAttempt = (
  rows: SmtpResult[],
  startedAt: string | undefined,
  options: { systemEmails: string[]; toAddress: string | undefined; now: number | undefined },
  counters: { reports: Set<string>; unreadable: number },
): DeliveryAttempt => {
  const recipients = new Map<string, RecipientDelivery>();
  const unassigned: DeliveryEvent[] = [];
  let fromAddress: string | undefined;

  const recipientFor = (address: string, expected: boolean): RecipientDelivery => {
    const key = address.toLowerCase();
    let recipient = recipients.get(key);
    if (recipient === undefined) {
      recipient = { address: key, expected, events: [], state: 'noReport' };
      recipients.set(key, recipient);
    }
    return recipient;
  };

  const addEvent = (recipient: RecipientDelivery, event: DeliveryEvent): void => {
    if (!isSameEvent(recipient.events.at(-1), event)) recipient.events.push(event);
  };

  // Our own server's answers come first, so that a report stored ahead of a later
  // submission still finds its recipient.
  for (const row of rows) {
    if (row.bounceReport === true) continue;
    if (isManualOverrideItem(row as unknown as Record<string, unknown>)) continue;

    const envelopeFrom = row.response?.envelope?.from;
    if (typeof envelopeFrom === 'string' && envelopeFrom.length > 0) {
      fromAddress = extractEmailAddress(envelopeFrom);
    }

    if (isSubmissionFailure(row)) {
      const storedTo = typeof row.to === 'string' ? row.to : '';
      const named = storedTo
        .split(',')
        .map((part) => extractEmailAddress(part))
        .filter((part) => part.includes('@'));
      // A mail without a usable address still has to show its error somewhere.
      const addresses = named.length > 0 ? named : [options.toAddress ?? storedTo];
      for (const address of addresses) {
        recipientFor(address, true).submission = {
          accepted: false,
          detail: typeof row.error === 'string' ? row.error : '',
        };
      }
      continue;
    }

    const detail = row.response?.response ?? '';
    const durationMs = (row.response?.envelopeTime ?? 0) + (row.response?.messageTime ?? 0);
    const accepted = row.response?.accepted ?? row.response?.envelope?.to ?? [];
    for (const address of accepted) {
      recipientFor(address, true).submission = {
        accepted: true,
        detail,
        ...(durationMs > 0 && { durationMs }),
      };
    }
    for (const address of row.response?.rejected ?? []) {
      recipientFor(address, true).submission = { accepted: false, detail };
    }
  }

  const expectedCount = recipients.size;
  const seenInAttempt = new Set<string>();

  for (const row of rows) {
    if (isManualOverrideItem(row as unknown as Record<string, unknown>)) {
      const diagnostic = reportTextOf(row);
      for (const recipient of recipients.values()) {
        addEvent(recipient, {
          action: isSubmissionFailure(row) ? 'failed' : 'delivered',
          manual: true,
          ...(diagnostic.length > 0 && { diagnostic }),
          ...(row.retriggeredAt !== undefined && { at: row.retriggeredAt }),
        });
      }
      continue;
    }
    if (row.bounceReport !== true) continue;

    const text = reportTextOf(row);
    let blocks = parseDeliveryReport(text);

    // The bounce job stores a report once per recipient it covers, each time in full.
    const key = blocks.length > 0 ? text : `${row.to}|${row.parsedDsn?.action ?? ''}|${text}`;
    if (seenInAttempt.has(key)) continue;
    seenInAttempt.add(key);

    if (blocks.length === 0) {
      // Stored rows do not always carry an action, whatever the type says.
      const storedAction: unknown = row.parsedDsn?.action;
      const action = typeof storedAction === 'string' ? storedAction.toLowerCase() : '';
      if (!DELIVERY_ACTIONS.has(action)) {
        counters.unreadable++;
        continue;
      }
      const finalRecipient = addressOf(row.parsedDsn?.finalRecipient ?? row.to);
      blocks = [
        {
          ...(finalRecipient !== undefined && { finalRecipient }),
          event: {
            action: action as DeliveryAction,
            ...(row.parsedDsn?.remoteMta !== undefined && { server: row.parsedDsn.remoteMta }),
            ...(row.parsedDsn?.status !== undefined && { status: row.parsedDsn.status }),
            ...(row.parsedDsn?.diagnosticCode !== undefined && {
              diagnostic: row.parsedDsn.diagnosticCode,
            }),
          },
        },
      ];
    }
    counters.reports.add(key);

    for (const block of blocks) {
      const event: DeliveryEvent = {
        ...block.event,
        ...(block.event.at === undefined && row.receivedAt !== undefined && { at: row.receivedAt }),
      };
      const candidates = [block.finalRecipient, block.originalRecipient].filter(
        (address): address is string => address !== undefined,
      );
      const known = candidates.find((address) => recipients.has(address));
      const foreign = candidates.find((address) => !isSystemEmail(address, options.systemEmails));

      if (known !== undefined && (known === block.finalRecipient || foreign === undefined)) {
        addEvent(recipientFor(known, true), event);
      } else if (foreign === undefined) {
        // The report names only our own sender address, so it could be about anyone.
        unassigned.push(event);
      } else {
        const recipient = recipientFor(foreign, false);
        if (known !== undefined && known !== foreign) recipient.via = known;
        addEvent(recipient, event);
      }
    }
  }

  // A server that is handed our sender address as the original recipient reports under that
  // address, so its report names nobody. With a single recipient it can only be about them.
  // With several, as many such reports as recipients nobody reported on leaves one each.
  const silent = [...recipients.values()].filter((recipient) => recipient.events.length === 0);
  const onlyRecipient = expectedCount === 1 ? recipients.values().next().value : undefined;
  if (onlyRecipient !== undefined) {
    for (const event of unassigned) addEvent(onlyRecipient, event);
    unassigned.length = 0;
  } else if (
    unassigned.length === silent.length &&
    unassigned.every((event) => event.action === unassigned[0]?.action)
  ) {
    for (const [index, recipient] of silent.entries()) {
      addEvent(recipient, unassigned[index] as DeliveryEvent);
    }
    unassigned.length = 0;
  }

  // A list address never reports for itself. Its members do, and they explain the silence.
  const isExplained = unassigned.length > 0 || recipients.size > expectedCount;
  const startedAtMs = startedAt === undefined ? Number.NaN : Date.parse(startedAt);
  const isOverdue =
    !isExplained &&
    options.now !== undefined &&
    options.now > 0 &&
    options.now - startedAtMs > DSN_TIMEOUT_MS;

  for (const recipient of recipients.values()) {
    // Mailbox order is not the order things happened in. Within the same second the
    // hand-off came first.
    recipient.events = recipient.events.toSorted((a, b) => {
      if (a.at === undefined || b.at === undefined) return 0;
      const byTime = a.at.localeCompare(b.at);
      return byTime === 0 ? Number(!isHandOff(a)) - Number(!isHandOff(b)) : byTime;
    });
    recipient.state = stateOf(recipient, isOverdue);
  }

  return {
    ...(startedAt !== undefined && { startedAt }),
    ...(fromAddress !== undefined && { fromAddress }),
    recipients: [...recipients.values()],
    unassigned,
  };
};

/**
 * Turns the stored delivery log of a mail into one line per recipient.
 *
 * The log is a flat list: the answers of our own mail server, then every delivery report the
 * bounce job fetched, the same report repeated once per recipient it covers. The address a
 * row is stored under is not reliable, so recipients are read from the report text itself.
 *
 * @param results - The stored `smtpResults` of an outgoing mail or a form submission.
 * @param options - `toAddress` and `createdAt` of the mail, the sender addresses that are
 *   never a recipient, and the current time. Without `now` nothing counts as overdue.
 * @returns The latest attempt per recipient, and the attempts a resend replaced.
 */
export const deriveDeliveryOverview = (
  results: SmtpResult[],
  options: {
    systemEmails?: string[];
    toAddress?: string | undefined;
    createdAt?: string | undefined;
    now?: number | undefined;
  } = {},
): DeliveryOverview => {
  const attempts: { rows: SmtpResult[]; startedAt: string | undefined; queueIds: string[] }[] = [
    { rows: [], startedAt: options.createdAt, queueIds: [] },
  ];

  const positions: number[] = [];
  for (const row of results) {
    if (isResend(row) && (attempts.at(-1)?.rows.length ?? 0) > 0) {
      attempts.push({ rows: [], startedAt: row.retriggeredAt, queueIds: [] });
    }
    const attempt = attempts.at(-1);
    attempt?.rows.push(row);
    positions.push(attempts.length - 1);
    const queueId = row.bounceReport === true ? undefined : queueIdOf(row);
    if (queueId !== undefined) attempt?.queueIds.push(queueId);
  }

  // A report for the first attempt can arrive after the resend. The queue id it quotes says
  // which attempt it belongs to.
  for (const [index, row] of results.entries()) {
    if (row.bounceReport !== true) continue;
    const position = positions[index] as number;
    const text = reportTextOf(row);
    const quoted = attempts.findIndex((attempt) =>
      attempt.queueIds.some((queueId) => text.includes(queueId)),
    );
    if (quoted === -1 || quoted === position) continue;
    const from = attempts[position]?.rows;
    from?.splice(from.indexOf(row), 1);
    attempts[quoted]?.rows.push(row);
  }

  const counters = { reports: new Set<string>(), unreadable: 0 };
  const derived = attempts.map((attempt) =>
    deriveAttempt(
      attempt.rows,
      attempt.startedAt,
      {
        systemEmails: options.systemEmails ?? [],
        toAddress: options.toAddress,
        now: options.now,
      },
      counters,
    ),
  );

  const lastFetchedAt = results
    .map((row) => row.receivedAt)
    .filter((value): value is string => typeof value === 'string')
    .toSorted()
    .at(-1);

  return {
    current: derived.at(-1) as DeliveryAttempt,
    earlier: derived.slice(0, -1),
    reportCount: counters.reports.size,
    unreadableCount: counters.unreadable,
    ...(lastFetchedAt !== undefined && { lastFetchedAt }),
  };
};
