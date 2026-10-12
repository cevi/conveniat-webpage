import {
  getUnenrollmentDeadline,
  isUnenrollmentClosed,
  UNENROLLMENT_DEADLINE_PASSED,
} from '@/features/schedule/utils/unenrollment-deadline';
import { TRPCError } from '@trpc/server';

/**
 * As much of a shift as the withdrawal window is decided from.
 *
 * The timeslot is accepted as incomplete on purpose: a shift whose slot cannot be read must fall
 * out of the guard rather than take the whole status query down with it - that query is the one
 * every card on the helper portal waits for.
 */
export interface ShiftWithdrawalWindow {
  timeslot?: { date?: string | null; time?: string | null };
  unenrollment_deadline_minutes?: number | null;
}

/**
 * The last instant at which a helper may still withdraw from `shift`.
 *
 * A shift saved before the field existed carries no value, which has to read as the default
 * window rather than as "no deadline": the rule is what protects a shift that is about to start
 * from losing its helpers, and it must hold for the shifts that were planned first.
 */
export const getShiftUnenrollmentDeadline = (shift: ShiftWithdrawalWindow): Date | undefined => {
  const { date, time } = shift.timeslot ?? {};
  if (typeof date !== 'string' || typeof time !== 'string') return undefined;

  return getUnenrollmentDeadline({ date, time }, shift.unenrollment_deadline_minutes);
};

/**
 * Rejects a withdrawal that comes in after the shift's deadline.
 *
 * The client hides the button once the window closes, so reaching this is either a stale page, a
 * queued offline mutation, or a direct call - all three have to be refused here, because this is
 * the only place that sees the current time against the current shift. Every mutation that can
 * delete a shift enrolment goes through it, whichever router it lives in.
 */
export const assertUnenrollmentIsOpen = (shift: ShiftWithdrawalWindow): void => {
  if (isUnenrollmentClosed(getShiftUnenrollmentDeadline(shift))) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: UNENROLLMENT_DEADLINE_PASSED });
  }
};
