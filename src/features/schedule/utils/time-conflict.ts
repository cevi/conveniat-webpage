import { errorReasonOf } from '@/utils/user-error-message';

/** The block an enrolment collided with, which the switch dialog offers to leave. */
export interface TimeConflict {
  kind: 'workshop' | 'shift';
  title: string;
  id: string;
}

/** The block in the way when the server refused an enrolment as a `timeConflict`. */
export const timeConflictOf = (error: unknown): TimeConflict | undefined => {
  const refusal = errorReasonOf(error);
  if (refusal?.reason !== 'timeConflict') return undefined;
  const { kind, title, id } = refusal.params;
  if (typeof id !== 'string' || id === '') return undefined;
  return { kind: kind === 'shift' ? 'shift' : 'workshop', title: String(title ?? ''), id };
};

/** Whether the server refused a withdrawal because the shift's deadline has passed. */
export const isDeadlinePassed = (error: unknown): boolean =>
  errorReasonOf(error)?.reason === 'unenrollmentDeadlinePassed';
