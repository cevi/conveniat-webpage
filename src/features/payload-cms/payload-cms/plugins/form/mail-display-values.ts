import { formatRange } from '@/features/payload-cms/components/form/utils/date-slot-format';
import { parseDateRangesValue } from '@/features/payload-cms/components/form/utils/date-slots';
import { RESSORT_WISH_OPTIONS } from '@/features/payload-cms/constants/ressort-options';
import { getFormBlocks } from '@/features/payload-cms/payload-cms/plugins/form/form-block-names';
import type { Locale } from '@/types/types';

interface FormSections {
  sections?: { formSection?: { fields?: unknown[] | null } | null }[] | null;
}

/** How a multi-select joins its answers in the submission. */
const MULTIPLE_ANSWER_SEPARATOR = ', ';

interface SelectOption {
  value?: unknown;
  label?: unknown;
}

/** The labels of the chosen options; an answer the options do not know stays as submitted. */
const toOptionLabels = (answer: string, options: SelectOption[]): string =>
  answer
    .split(MULTIPLE_ANSWER_SEPARATOR)
    .map((value) => {
      const label = options.find((option) => option.value === value)?.label;
      return typeof label === 'string' && label.trim() !== '' ? label.trim() : value;
    })
    .join(MULTIPLE_ANSWER_SEPARATOR);

/**
 * What a `{{field}}` in a confirmation mail shows for answers whose stored value is written
 * for exports rather than for people. Only those fields are returned; every other answer goes
 * into the mail as submitted.
 *
 * Marked days are stored as ISO ranges, the same in every locale, so the CSV export and the
 * PDF report can read them. The mail lists one range per line, as the calendar showed it.
 * A choice is stored as its option value, `fortgeschritten` or `infrastruktur`; the mail
 * shows the label the person picked. The form arrives read in one locale, so an option label
 * is already a plain string.
 */
export const getMailDisplayValues = (
  form: FormSections | undefined,
  answers: Record<string, string>,
  locale: Locale,
): Record<string, string> => {
  const displayValues: Record<string, string> = {};
  const fields = (form?.sections ?? []).flatMap((section) => section.formSection?.fields ?? []);

  for (const block of getFormBlocks(fields, 'select')) {
    const name = block['name'] as string;
    const answer = answers[name];
    const options = block['options'];
    if (answer !== undefined && answer !== '' && Array.isArray(options)) {
      displayValues[name] = toOptionLabels(answer, options as SelectOption[]);
    }
  }

  for (const block of getFormBlocks(fields, 'dateSlotSelection')) {
    const name = block['name'] as string;
    const ranges = parseDateRangesValue(answers[name]);
    if (ranges !== undefined) {
      displayValues[name] = ranges.map((range) => formatRange(range, locale)).join('\n');
    }

    const ressortName = block['ressortName'];
    const wish = typeof ressortName === 'string' ? answers[ressortName] : undefined;
    const wishLabel = RESSORT_WISH_OPTIONS.find((option) => option.value === wish)?.label;
    if (typeof ressortName === 'string' && wishLabel !== undefined) {
      displayValues[ressortName] = wishLabel[locale];
    }
  }

  return displayValues;
};
