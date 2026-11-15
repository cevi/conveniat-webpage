import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { DefaultServerCellComponentProps } from 'payload';
import type React from 'react';

/**
 * List column with the day and time of a Schichteinsatz, e.g. "Mo, 26.07. · 07:00 - 10:00", so
 * the many shifts of the same title can be told apart. The time slot is a group field, which the
 * list cannot show as a column of its own.
 */
export const HelperShiftTimeslotCell = ({
  rowData,
  i18n,
}: DefaultServerCellComponentProps): React.ReactElement => {
  // Payload also renders a ui field's Cell while building the edit view's form state, where there
  // is no row: its skip list is checked with `key in [...]`, which tests array indices, not names.
  const row = rowData as DefaultServerCellComponentProps['rowData'] | undefined;
  const timeslot = row?.['timeslot'] as { date?: unknown; time?: unknown } | undefined;
  if (typeof timeslot?.date !== 'string') return <></>;

  const day = new Intl.DateTimeFormat(`${resolveAdminLocale(i18n.language)}-CH`, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Zurich',
  }).format(new Date(timeslot.date));
  const time = typeof timeslot.time === 'string' ? ` · ${timeslot.time}` : '';

  return <span className="whitespace-nowrap tabular-nums">{`${day}${time}`}</span>;
};

export default HelperShiftTimeslotCell;
