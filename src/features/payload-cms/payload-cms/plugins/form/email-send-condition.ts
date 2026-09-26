export interface EmailSendCondition {
  field?: string | null;
  value?: string | null;
}

/**
 * Whether a confirmation email applies to a submission.
 *
 * Mirrors the display condition of a form section, so an editor can pair each branch of a
 * form with its own email: the email goes out when the named field holds exactly the given
 * value, and always when no field is named. A field the submission does not carry — a
 * branch the person skipped — counts as empty.
 */
export const matchesEmailSendCondition = (
  condition: EmailSendCondition | null | undefined,
  submissionValues: Record<string, string>,
): boolean => {
  const conditionField = condition?.field?.trim() ?? '';
  if (conditionField === '') return true;
  return (submissionValues[conditionField] ?? '') === (condition?.value ?? '');
};
