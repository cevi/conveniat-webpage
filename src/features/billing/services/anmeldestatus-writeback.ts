import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import { CEVIDB_SESSION_EXPIRED_MESSAGE } from '@/features/billing/services/cevidb-session';
import { SessionExpiredError } from '@/features/registration_process/hitobito-api/errors';

/** The answer the Cevi.DB expects once the invoice has gone out. */
export const ANMELDESTATUS_INVOICED = 'Rechnung gestellt';

/**
 * The Anmeldeverantwortliche closes a registration with this value. A write-back never
 * replaces it, because doing so would move a finished registration backwards.
 */
const ANMELDESTATUS_FINAL = 'definitiv';

/** "Administrationsangaben » Anmeldestatus", matched loosely; editors reword the question. */
const ANMELDESTATUS_KEYWORDS = ['anmeldestatus'];

export const ANMELDESTATUS_WRITTEN_ACTION = 'anmeldestatus_written_to_cevidb';
export const ANMELDESTATUS_FAILED_ACTION = 'anmeldestatus_writeback_failed';

/** Both cookie failures read the same to an operator: go to the settings and paste a new one. */
const MISSING_COOKIE_REASON =
  'Es ist kein gültiger Browser-Cookie hinterlegt. Bitte trage ihn in den Registrierungs-Einstellungen ein.';

export interface AnmeldestatusHistoryEntry {
  date: string;
  action: string;
  /** The value written to the Cevi.DB. */
  value?: string;
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
  participation: {
    groupId: string;
    eventId: string;
    participationUuid: string;
    fullName: string;
    anmeldestatus: string | null | undefined;
  },
  now: string,
  logger: { warn: (message: string) => void; debug?: (message: string) => void },
): Promise<AnmeldestatusWriteBackResult> {
  const current = participation.anmeldestatus;
  if (!needsAnmeldestatusWriteBack(current)) {
    return { anmeldestatus: current, historyEntries: [] };
  }

  const fail = (reason: string, cookieInvalid = false): AnmeldestatusWriteBackResult => {
    logger.warn(
      `Anmeldestatus write-back failed for participation ${participation.participationUuid} (${participation.fullName}): ${reason}`,
    );
    return {
      anmeldestatus: current,
      historyEntries: [
        {
          date: now,
          action: ANMELDESTATUS_FAILED_ACTION,
          reviewReason: `Der Anmeldestatus konnte in der Cevi.DB nicht auf «${ANMELDESTATUS_INVOICED}» gesetzt werden: ${reason}`,
        },
      ],
      error: `${participation.fullName}: Anmeldestatus konnte in der Cevi.DB nicht auf «${ANMELDESTATUS_INVOICED}» gesetzt werden – ${reason}`,
      ...(cookieInvalid ? { cookieInvalid: true } : {}),
    };
  };

  if (hitobitoService === undefined) {
    return fail(MISSING_COOKIE_REASON, true);
  }

  try {
    const result = await hitobitoService.updateParticipationAnswer(
      participation.groupId,
      participation.eventId,
      participation.participationUuid,
      ANMELDESTATUS_KEYWORDS,
      ANMELDESTATUS_INVOICED,
      [ANMELDESTATUS_FINAL],
    );

    if (!result.changed) {
      // The Cevi.DB moved on since the row was last synced: it already reads "Rechnung
      // gestellt", or it is "definitiv" and must be left alone. Adopt what it holds.
      logger.debug?.(
        `Anmeldestatus for participation ${participation.participationUuid} left at "${result.previous}"; nothing written.`,
      );
      return { anmeldestatus: result.previous, historyEntries: [] };
    }

    logger.debug?.(
      `Anmeldestatus for participation ${participation.participationUuid}: "${result.previous}" -> "${ANMELDESTATUS_INVOICED}".`,
    );
    return {
      anmeldestatus: ANMELDESTATUS_INVOICED,
      historyEntries: [
        { date: now, action: ANMELDESTATUS_WRITTEN_ACTION, value: ANMELDESTATUS_INVOICED },
      ],
    };
  } catch (error) {
    // A dead session reaches here as a login page every scraper fails to read, so it is
    // named for what it is instead of as whatever the form did not contain.
    if (error instanceof SessionExpiredError) return fail(CEVIDB_SESSION_EXPIRED_MESSAGE, true);
    return fail(error instanceof Error ? error.message : String(error));
  }
}
