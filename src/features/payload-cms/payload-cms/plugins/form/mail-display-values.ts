import { formatRange } from '@/features/payload-cms/components/form/utils/date-slot-format';
import { parseDateRangesValue } from '@/features/payload-cms/components/form/utils/date-slots';
import { getFormBlocks } from '@/features/payload-cms/payload-cms/plugins/form/form-block-names';
import type { Locale } from '@/types/types';

interface FormSections {
  sections?: { formSection?: { fields?: unknown[] | null } | null }[] | null;
}

/**
 * What a `{{field}}` in a confirmation mail shows for answers whose stored value is written
 * for exports rather than for people. Only those fields are returned; every other answer goes
 * into the mail as submitted.
 *
 * Marked days are stored as ISO ranges, the same in every locale, so the CSV export and the
 * PDF report can read them. The mail lists one range per line, as the calendar showed it.
 */
export const getMailDisplayValues = (
  form: FormSections | undefined,
  answers: Record<string, string>,
  locale: Locale,
): Record<string, string> => {
  const displayValues: Record<string, string> = {};
  const fields = (form?.sections ?? []).flatMap((section) => section.formSection?.fields ?? []);

  for (const block of getFormBlocks(fields, 'dateSlotSelection')) {
    const name = block['name'] as string;
    const ranges = parseDateRangesValue(answers[name]);
    if (ranges !== undefined) {
      displayValues[name] = ranges.map((range) => formatRange(range, locale)).join('\n');
    }
  }

  return displayValues;
};
