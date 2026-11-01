import type {
  HitobitoServicePort,
  ParticipationAnswerUpdate,
} from '@/features/billing/ports/hitobito-service.port';
import { CEVIDB_SESSION_EXPIRED_MESSAGE } from '@/features/billing/services/cevidb-session';
import { SessionExpiredError } from '@/lib/hitobito/errors';

/** The answer the Cevi.DB expects once the invoice has gone out. */
export const ANMELDESTATUS_INVOICED = 'Rechnung gestellt';

/**
 * The registration is settled: the Anmeldeverantwortliche closes it with this value, and a
 * booked payment sets it. The invoice write-back never replaces it, because doing so would
 * move a finished registration backwards.
 */
export const ANMELDESTATUS_FINAL = 'definitiv';

/** "Administrationsangaben » Anmeldestatus", matched loosely; editors reword the question. */
const ANMELDESTATUS_KEYWORDS = ['anmeldestatus'];

export const ANMELDESTATUS_WRITTEN_ACTION = 'anmeldestatus_written_to_cevidb';
export const ANMELDESTATUS_FAILED_ACTION = 'anmeldestatus_writeback_failed';
export const ANMELDESTATUS_REVERTED_ACTION = 'anmeldestatus_reverted_in_cevidb';
export const ANMELDESTATUS_REVERT_FAILED_ACTION = 'anmeldestatus_revert_failed';
export const PAYMENT_BOOKED_ACTION = 'payment_booked';
export const PAYMENT_WRITTEN_ACTION = 'payment_written_to_cevidb';
export const PAYMENT_FAILED_ACTION = 'payment_writeback_failed';

/** Both cookie failures read the same to an operator: go to the settings and paste a new one. */
const MISSING_COOKIE_REASON =
  'Es ist kein gültiger Browser-Cookie hinterlegt. Bitte trage ihn unter «Cevi.DB-Sitzung» ein.';

export interface AnmeldestatusHistoryEntry {
  date: string;
  action: string;
  /** The value written to the Cevi.DB. */
  value?: string;
  /** What the Cevi.DB held before, so a bill whose mail never arrived can put it back. */
  previous?: string;
  /** Why the write-back failed, for the operator reading the row. */
  reviewReason?: string;
}

export interface AnmeldestatusWriteBackResult {
  /** What to store on the row: the confirmed new value, or what the Cevi.DB still holds. */
  anmeldestatus: string | null | undefined;
  /** Entries to append to the row's `syncHistory`; empty when there was nothing to do. */
  historyEntries: AnmeldestatusHistoryEntry[];
  /** A German sentence for the run summary, set only when the write-back failed. */
  error?: string;
  /**
   * The browser cookie is missing or no longer signed in. Nothing but the registration
   * settings can fix that, so the caller links the operator there.
   */
  cookieInvalid?: boolean;
}

/** Whether the Cevi.DB still has to be told that this registration has been invoiced. */
export function needsAnmeldestatusWriteBack(current: string | null | undefined): boolean {
  const value = (current ?? '').trim().toLowerCase();
  return value !== ANMELDESTATUS_INVOICED.toLowerCase() && value !== ANMELDESTATUS_FINAL;
}

const PAYMENT_ACTIONS = new Set([
  PAYMENT_BOOKED_ACTION,
  PAYMENT_WRITTEN_ACTION,
  PAYMENT_FAILED_ACTION,
]);

/**
 * Whether the Cevi.DB still has to be told that this registration has been paid.
 *
 * The sync reads the Anmeldestatus but not the "bezahlt" box, so the Anmeldestatus alone
 * cannot say whether the write-back landed: an Anmeldeverantwortliche may have set
 * `definitiv` before the money arrived. The row's own history says it instead — the last
 * payment entry has to be a confirmed write.
 */
export function needsPaymentWriteBack(
  current: string | null | undefined,
  history: readonly { action: string }[] | null | undefined,
): boolean {
  if ((current ?? '').trim().toLowerCase() !== ANMELDESTATUS_FINAL) return true;
  const lastPaymentEntry = (history ?? []).findLast((entry) => PAYMENT_ACTIONS.has(entry.action));
  return lastPaymentEntry?.action !== PAYMENT_WRITTEN_ACTION;
}

export interface WriteBackParticipation {
  groupId: string;
  eventId: string;
  participationUuid: string;
  fullName: string;
  anmeldestatus: string | null | undefined;
}

interface WriteBackLogger {
  warn: (message: string) => void;
  debug?: (message: string) => void;
}

/** What one kind of write-back sets in the Cevi.DB, and how its history entries read. */
interface WriteBackTarget {
  /** The Anmeldestatus the Cevi.DB reads afterwards. */
  value: string;
  /** What was asked of the Cevi.DB, completing «… konnte in der Cevi.DB nicht …». */
  failedWhat: string;
  writtenAction: string;
  failedAction: string;
  write: (
    hitobitoService: HitobitoServicePort,
    participation: WriteBackParticipation,
  ) => Promise<ParticipationAnswerUpdate>;
}

const INVOICED_TARGET: WriteBackTarget = {
  value: ANMELDESTATUS_INVOICED,
  failedWhat: `Anmeldestatus konnte in der Cevi.DB nicht auf «${ANMELDESTATUS_INVOICED}» gesetzt werden`,
  writtenAction: ANMELDESTATUS_WRITTEN_ACTION,
  failedAction: ANMELDESTATUS_FAILED_ACTION,
  write: (hitobitoService, participation) =>
    hitobitoService.updateParticipationAnswer(
      participation.groupId,
      participation.eventId,
      participation.participationUuid,
      ANMELDESTATUS_KEYWORDS,
      ANMELDESTATUS_INVOICED,
      [ANMELDESTATUS_FINAL],
    ),
};

const PAID_TARGET: WriteBackTarget = {
  value: ANMELDESTATUS_FINAL,
  failedWhat: `Zahlung konnte in der Cevi.DB nicht als bezahlt mit Anmeldestatus «${ANMELDESTATUS_FINAL}» eingetragen werden`,
  writtenAction: PAYMENT_WRITTEN_ACTION,
  failedAction: PAYMENT_FAILED_ACTION,
  write: (hitobitoService, participation) =>
    hitobitoService.markParticipationPaid(
      participation.groupId,
      participation.eventId,
      participation.participationUuid,
      ANMELDESTATUS_KEYWORDS,
      ANMELDESTATUS_FINAL,
    ),
};

/**
 * Sets a participation's Anmeldestatus in the Cevi.DB to "Rechnung gestellt".
 *
 * Used both right after a bill has been mailed and by the nightly sync, which retries a
 * write-back that never landed. The caller owns the row, so the outcome is returned rather
 * than written: a failure must not cost the bill its `bill_sent` status.
 *
 * @param hitobitoService `undefined` when no browser cookie is configured, which is
 *   reported like any other failure so the operator sees the affected people.
 */
export async function writeBackAnmeldestatus(
  hitobitoService: HitobitoServicePort | undefined,
  participation: WriteBackParticipation,
  now: string,
  logger: WriteBackLogger,
): Promise<AnmeldestatusWriteBackResult> {
  if (!needsAnmeldestatusWriteBack(participation.anmeldestatus)) {
    return { anmeldestatus: participation.anmeldestatus, historyEntries: [] };
  }
  return writeBack(INVOICED_TARGET, hitobitoService, participation, now, logger);
}

/**
 * Marks a participation as paid in the Cevi.DB: ticks "bezahlt" and sets the Anmeldestatus
 * to "definitiv".
 *
 * Used right after the payment import booked a payment, and by the nightly sync, which
 * retries one that never landed. Like the invoice write-back it returns the outcome, so a
 * failure leaves the row paid.
 *
 * Always asks the Cevi.DB, even when the synced Anmeldestatus already reads "definitiv": an
 * Anmeldeverantwortliche may have closed the registration before the money arrived, and the
 * box still has to be ticked.
 */
export async function writeBackPayment(
  hitobitoService: HitobitoServicePort | undefined,
  participation: WriteBackParticipation,
  now: string,
  logger: WriteBackLogger,
): Promise<AnmeldestatusWriteBackResult> {
  return writeBack(PAID_TARGET, hitobitoService, participation, now, logger);
}

/**
 * Puts the Anmeldestatus back to what it was before "Rechnung gestellt" was written, once
 * the bill's mail turned out not to have arrived. The Cevi.DB would otherwise tell the
 * Abteilung that the participant has been invoiced.
 *
 * Only reverts while the Cevi.DB still reads "Rechnung gestellt": a value someone set since
 * is theirs, and is adopted instead. Returns no entries when the last write-back of this
 * row was already reverted, or never happened.
 */
export async function revertAnmeldestatus(
  hitobitoService: HitobitoServicePort | undefined,
  participation: WriteBackParticipation,
  history: readonly { action: string; previous?: unknown }[],
  now: string,
  logger: WriteBackLogger,
): Promise<AnmeldestatusWriteBackResult> {
  const last = history.findLast(
    (entry) =>
      entry.action === ANMELDESTATUS_WRITTEN_ACTION ||
      entry.action === ANMELDESTATUS_REVERTED_ACTION,
  );
  if (last?.action !== ANMELDESTATUS_WRITTEN_ACTION) {
    return { anmeldestatus: participation.anmeldestatus, historyEntries: [] };
  }

  const previous = last.previous;
  const failedWhat = `Anmeldestatus konnte in der Cevi.DB nicht von «${ANMELDESTATUS_INVOICED}» zurückgesetzt werden`;
  if (typeof previous !== 'string') {
    // Written before the previous value was recorded.
    const reason = 'Der Wert davor ist nicht bekannt. Bitte in der Cevi.DB von Hand zurücksetzen.';
    logger.warn(
      `Cevi.DB revert failed for participation ${participation.participationUuid} (${participation.fullName}): previous value unknown`,
    );
    return {
      anmeldestatus: participation.anmeldestatus,
      historyEntries: [
        {
          date: now,
          action: ANMELDESTATUS_REVERT_FAILED_ACTION,
          reviewReason: `${failedWhat}: ${reason}`,
        },
      ],
      error: `${participation.fullName}: ${failedWhat} – ${reason}`,
    };
  }

  const target: WriteBackTarget = {
    value: previous,
    failedWhat,
    writtenAction: ANMELDESTATUS_REVERTED_ACTION,
    failedAction: ANMELDESTATUS_REVERT_FAILED_ACTION,
    write: (service, { groupId, eventId, participationUuid }) =>
      service.updateParticipationAnswer(
        groupId,
        eventId,
        participationUuid,
        ANMELDESTATUS_KEYWORDS,
        previous,
        [],
        ANMELDESTATUS_INVOICED,
      ),
  };
  return writeBack(target, hitobitoService, participation, now, logger);
}

/**
 * Runs one write-back and turns its outcome into what the caller stores on the row.
 *
 * @param hitobitoService `undefined` when no browser cookie is configured, which is
 *   reported like any other failure so the operator sees the affected people.
 */
async function writeBack(
  target: WriteBackTarget,
  hitobitoService: HitobitoServicePort | undefined,
  participation: WriteBackParticipation,
  now: string,
  logger: WriteBackLogger,
): Promise<AnmeldestatusWriteBackResult> {
  const current = participation.anmeldestatus;

  const fail = (reason: string, cookieInvalid = false): AnmeldestatusWriteBackResult => {
    logger.warn(
      `Cevi.DB write-back "${target.writtenAction}" failed for participation ${participation.participationUuid} (${participation.fullName}): ${reason}`,
    );
    return {
      anmeldestatus: current,
      historyEntries: [
        {
          date: now,
          action: target.failedAction,
          reviewReason: `${target.failedWhat}: ${reason}`,
        },
      ],
      error: `${participation.fullName}: ${target.failedWhat} – ${reason}`,
      ...(cookieInvalid ? { cookieInvalid: true } : {}),
    };
  };

  if (hitobitoService === undefined) {
    return fail(MISSING_COOKIE_REASON, true);
  }

  try {
    const result = await target.write(hitobitoService, participation);

    if (!result.changed) {
      // The Cevi.DB moved on since the row was last synced: it already holds the target,
      // or a value that must be left alone. Adopt what it holds.
      logger.debug?.(
        `Cevi.DB write-back "${target.writtenAction}" for participation ${participation.participationUuid} left at "${result.previous}"; nothing written.`,
      );
      return { anmeldestatus: result.previous, historyEntries: [] };
    }

    logger.debug?.(
      `Cevi.DB write-back "${target.writtenAction}" for participation ${participation.participationUuid}: "${result.previous}" -> "${target.value}".`,
    );
    return {
      anmeldestatus: target.value,
      historyEntries: [
        { date: now, action: target.writtenAction, value: target.value, previous: result.previous },
      ],
    };
  } catch (error) {
    // A dead session reaches here as a login page every scraper fails to read, so it is
    // named for what it is instead of as whatever the form did not contain.
    if (error instanceof SessionExpiredError) return fail(CEVIDB_SESSION_EXPIRED_MESSAGE, true);
    return fail(error instanceof Error ? error.message : String(error));
  }
}
