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
  /** Set when other addresses reported in its place, as the members of a list do. */
  listed?: boolean;
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

interface WorkingAttempt {
  startedAt: string | undefined;
  fromAddress?: string;
  recipients: Map<string, RecipientDelivery>;
  /** When each recipient's mail went out. One attempt can hold several mails. */
  sentAt: Map<string, string | undefined>;
  unassigned: DeliveryEvent[];
}

/** One answer of our own mail server: a mail handed in, or the failure to do so. */
interface Send {
  index: number;
  addresses: string[];
  queueId: string | undefined;
  startedAt: string | undefined;
  isResend: boolean;
  superseded: boolean;
  row: SmtpResult;
  attempt: WorkingAttempt;
}

const newAttempt = (startedAt: string | undefined): WorkingAttempt => ({
  startedAt,
  recipients: new Map(),
  sentAt: new Map(),
  unassigned: [],
});

const addressesIn = (value: unknown): string[] =>
  typeof value === 'string'
    ? (value.match(new RegExp(ADDRESS_PATTERN, 'g')) ?? []).map((address) => address.toLowerCase())
    : [];

const recipientFor = (
  attempt: WorkingAttempt,
  address: string,
  expected: boolean,
): RecipientDelivery => {
  const key = address.toLowerCase();
  let recipient = attempt.recipients.get(key);
  if (recipient === undefined) {
    recipient = { address: key, expected, events: [], state: 'noReport' };
    attempt.recipients.set(key, recipient);
  }
  return recipient;
};

const addEvent = (recipient: RecipientDelivery, event: DeliveryEvent): void => {
  const last = recipient.events.at(-1);
  // The override writes one row for the SMTP state and one for the DSN state.
  if (event.manual === true && last?.manual === true && last.action === event.action) return;
  recipient.events.push(event);
};

/**
 * Reads the answers of our own mail server. A resend replaces the earlier send to the same
 * people and nothing else: the log of a form submission holds every mail the submission
 * triggered, and resending one of them leaves the others standing.
 */
const readSends = (
  results: SmtpResult[],
  options: { toAddress: string | undefined; createdAt: string | undefined },
): { sends: Send[]; current: WorkingAttempt } => {
  const current = newAttempt(options.createdAt);
  const sends: Send[] = [];

  for (const [index, row] of results.entries()) {
    if (row.bounceReport === true) continue;
    if (isManualOverrideItem(row as unknown as Record<string, unknown>)) continue;

    const isFailure = isSubmissionFailure(row);
    const storedTo = typeof row.to === 'string' ? row.to : '';
    const named = addressesIn(storedTo);
    // A mail without a usable address still has to show its error somewhere.
    const failedFor = named.length > 0 ? named : [options.toAddress ?? storedTo];
    const accepted = row.response?.accepted ?? row.response?.envelope?.to ?? [];
    const rejected = row.response?.rejected ?? [];
    const addresses = (isFailure ? failedFor : [...accepted, ...rejected]).map((address) =>
      address.toLowerCase(),
    );

    const send: Send = {
      index,
      addresses,
      queueId: queueIdOf(row),
      startedAt: row.retriggeredAt ?? options.createdAt,
      isResend: row.retriggeredBy !== undefined,
      superseded: false,
      row,
      attempt: current,
    };
    if (send.isResend) {
      for (const earlier of sends) {
        if (earlier.addresses.some((address) => addresses.includes(address))) {
          earlier.superseded = true;
        }
      }
    }
    sends.push(send);
  }

  for (const send of sends) {
    if (send.superseded) send.attempt = newAttempt(send.startedAt);
    const { attempt, row } = send;
    if (send.startedAt !== undefined && send.startedAt > (attempt.startedAt ?? '')) {
      attempt.startedAt = send.startedAt;
    }

    const envelopeFrom = row.response?.envelope?.from;
    if (typeof envelopeFrom === 'string' && envelopeFrom.length > 0) {
      attempt.fromAddress = extractEmailAddress(envelopeFrom);
    }

    const isFailure = isSubmissionFailure(row);
    let detail = row.response?.response ?? '';
    if (isFailure) detail = typeof row.error === 'string' ? row.error : '';
    const durationMs = (row.response?.envelopeTime ?? 0) + (row.response?.messageTime ?? 0);
    const rejected = new Set(
      (row.response?.rejected ?? []).map((address) => address.toLowerCase()),
    );

    for (const address of send.addresses) {
      const isAccepted = !isFailure && !rejected.has(address);
      recipientFor(attempt, address, true).submission = {
        accepted: isAccepted,
        detail,
        ...(isAccepted && durationMs > 0 && { durationMs }),
      };
      attempt.sentAt.set(address, send.startedAt);
    }
  }

  return { sends, current };
};

/** The reports of one stored row, or none when it repeats a report or is not one. */
const readReport = (
  row: SmtpResult,
  seen: Set<string>,
  counters: { unreadable: number },
): ReportBlock[] => {
  const text = reportTextOf(row);
  let blocks = parseDeliveryReport(text);

  if (blocks.length === 0) {
    // Stored rows do not always carry an action, whatever the type says.
    const storedAction: unknown = row.parsedDsn?.action;
    const action = typeof storedAction === 'string' ? storedAction.toLowerCase() : '';
    const finalRecipient = addressOf(row.parsedDsn?.finalRecipient ?? row.to);
    const key = `${finalRecipient ?? ''}|${action}|${text}`;
    if (seen.has(key)) return [];
    seen.add(key);

    if (!DELIVERY_ACTIONS.has(action)) {
      counters.unreadable++;
      return [];
    }
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
  } else {
    // The bounce job stores a report once per recipient it covers, each time in full.
    if (seen.has(text)) return [];
    seen.add(text);
  }

  return blocks.map((block) => ({
    ...block,
    event: {
      ...block.event,
      ...(block.event.at === undefined && row.receivedAt !== undefined && { at: row.receivedAt }),
    },
  }));
};

const finishAttempt = (attempt: WorkingAttempt, now: number | undefined): DeliveryAttempt => {
  const recipients = [...attempt.recipients.values()];
  const expected = recipients.filter((recipient) => recipient.expected);
  const { unassigned } = attempt;

  // A server that is handed our sender address as the original recipient reports under that
  // address, so its report names nobody. With a single recipient it can only be about them.
  // With several, as many such reports as recipients nobody reported on leaves one each.
  const silent = expected.filter((recipient) => recipient.events.length === 0);
  if (expected.length === 1) {
    for (const event of unassigned) addEvent(expected[0] as RecipientDelivery, event);
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

  // A list address never reports for itself. Its members do. A member's report that names
  // the list explains that list's silence; one that names no origin could explain anyone's.
  const origins = new Set(recipients.map((recipient) => recipient.via));
  const hasUnattributed =
    unassigned.length > 0 ||
    recipients.some((recipient) => !recipient.expected && recipient.via === undefined);

  for (const recipient of recipients) {
    // Mailbox order is not the order things happened in. Within the same second the
    // hand-off came first.
    recipient.events = recipient.events.toSorted((a, b) => {
      if (a.at === undefined || b.at === undefined) return 0;
      const byTime = a.at.localeCompare(b.at);
      return byTime === 0 ? Number(!isHandOff(a)) - Number(!isHandOff(b)) : byTime;
    });

    const isListed =
      recipient.expected &&
      recipient.events.length === 0 &&
      (origins.has(recipient.address) || hasUnattributed);
    if (isListed) recipient.listed = true;

    const sentAtMs = Date.parse(attempt.sentAt.get(recipient.address) ?? '');
    const isOverdue = !isListed && now !== undefined && now > 0 && now - sentAtMs > DSN_TIMEOUT_MS;
    recipient.state = stateOf(recipient, isOverdue);
  }

  return {
    ...(attempt.startedAt !== undefined && { startedAt: attempt.startedAt }),
    ...(attempt.fromAddress !== undefined && { fromAddress: attempt.fromAddress }),
    recipients,
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
 * @returns The state per recipient, and the sends a resend replaced.
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
  const systemEmails = options.systemEmails ?? [];
  const { sends, current } = readSends(results, {
    toAddress: options.toAddress,
    createdAt: options.createdAt,
  });

  /** The send a row stored at `index` is about: the latest one before it to that address. */
  const sendFor = (index: number, addresses: string[]): Send | undefined =>
    sends.findLast(
      (send) =>
        send.index < index &&
        (addresses.length === 0 || send.addresses.some((address) => addresses.includes(address))),
    );

  const seen = new Set<string>();
  const counters = { unreadable: 0 };

  for (const [index, row] of results.entries()) {
    if (isManualOverrideItem(row as unknown as Record<string, unknown>)) {
      // The override names the mail it was set on. Only that mail's recipients change.
      const named = addressesIn(row.to);
      const send = sendFor(index, named) ?? sendFor(index, []);
      const attempt = send?.attempt ?? current;
      const marked = [...attempt.recipients.values()].filter(
        (recipient) => recipient.expected && named.includes(recipient.address),
      );
      const diagnostic = reportTextOf(row);
      for (const recipient of marked.length > 0 ? marked : attempt.recipients.values()) {
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

    // A report for a replaced send can arrive after the resend. The queue id it quotes
    // says which send it belongs to.
    const text = reportTextOf(row);
    const quoted = sends.find((send) => send.queueId !== undefined && text.includes(send.queueId));

    for (const block of readReport(row, seen, counters)) {
      const candidates = [block.finalRecipient, block.originalRecipient].filter(
        (address): address is string => address !== undefined,
      );
      const attempt =
        (
          quoted ??
          sendFor(index, candidates) ??
          sends.findLast((send) =>
            send.addresses.some((address) => candidates.includes(address)),
          ) ??
          sendFor(index, [])
        )?.attempt ?? current;

      const known = candidates.find((address) => attempt.recipients.has(address));
      const foreign = candidates.find((address) => !isSystemEmail(address, systemEmails));

      if (known !== undefined && (known === block.finalRecipient || foreign === undefined)) {
        addEvent(recipientFor(attempt, known, true), block.event);
      } else if (foreign === undefined) {
        // The report names only our own sender address. The queue id it quotes can still
        // single out a mail with one recipient. Otherwise it could be about anyone.
        const only = quoted?.addresses.length === 1 ? quoted.addresses[0] : undefined;
        const recipient = only === undefined ? undefined : attempt.recipients.get(only);
        if (recipient === undefined) attempt.unassigned.push(block.event);
        else addEvent(recipient, block.event);
      } else {
        const recipient = recipientFor(attempt, foreign, false);
        if (known !== undefined && known !== foreign) recipient.via = known;
        addEvent(recipient, block.event);
      }
    }
  }

  const lastFetchedAt = results
    .map((row) => row.receivedAt)
    .filter((value): value is string => typeof value === 'string')
    .toSorted()
    .at(-1);

  return {
    current: finishAttempt(current, options.now),
    earlier: sends
      .filter((send) => send.superseded)
      .map((send) => finishAttempt(send.attempt, options.now)),
    reportCount: seen.size - counters.unreadable,
    unreadableCount: counters.unreadable,
    ...(lastFetchedAt !== undefined && { lastFetchedAt }),
  };
};
