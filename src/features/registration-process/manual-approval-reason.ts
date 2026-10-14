/**
 * Why a registration job waits: the Cevi.DB group has to approve the person by hand. Stored on
 * the blocked job and compared by the job table, which links the group to approve in.
 */
export const MANUAL_APPROVAL_REASON =
  'Manuelle Freigabe in der Cevi.DB ausstehend durch die Gruppe';

/** Whether a blocked job waits for that approval, including jobs blocked with the old wording. */
export const isManualApprovalReason = (reason: string | undefined): boolean =>
  reason === MANUAL_APPROVAL_REASON ||
  reason === 'Manuelle Freigabe in Hitobito ausstehend durch die Gruppe';
