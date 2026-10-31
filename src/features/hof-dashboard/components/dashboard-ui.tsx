import type { HofContact } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { HOF_ENTRY_STATUS_LABELS, type HofDashboardArea } from '@/features/hof-dashboard/constants';
import { formatCountdown, formatDate, translate } from '@/features/hof-dashboard/texts';
import {
  isOpen,
  type SubmissionProgress,
  type SubmissionState,
} from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Hammer,
  Mail,
  Package,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type React from 'react';

/**
 * Infrastructure reads in the camp's green, the programme in Cevi blue, material in plain grey.
 * Not in Cevi red, which the dashboard keeps for what is overdue.
 */
export const AREA_TEXT_CLASS: Record<HofDashboardArea, string> = {
  infrastructure: 'text-conveniat-green',
  program: 'text-cevi-blue',
  material: 'text-gray-800',
};

/** The area's colour as a fill, for progress bars and dots. */
export const AREA_DOT_CLASS: Record<HofDashboardArea, string> = {
  infrastructure: 'bg-conveniat-green',
  program: 'bg-cevi-blue',
  material: 'bg-gray-500',
};

/** The main action, the submit button of the site's forms. */
export const PRIMARY_BUTTON_CLASS =
  'bg-conveniat-green inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-gray-100 transition duration-100 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base [&_svg]:h-4 [&_svg]:w-4';

/** A secondary action: outlined, on white. */
export const SECONDARY_BUTTON_CLASS =
  'border-line inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-green-900 transition duration-100 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base [&_svg]:h-4 [&_svg]:w-4';

/** A quiet action without a frame, such as "Ansehen" next to what is done. */
export const QUIET_BUTTON_CLASS =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-green-900 transition hover:bg-gray-50 [&_svg]:h-4 [&_svg]:w-4';

/** The small uppercase label over a part of the dashboard, "NOCH OFFEN", "ABGABEN". */
export const LABEL_CLASS = 'text-xs font-bold tracking-[0.08em] text-green-700 uppercase';

/** The card every part of the dashboard sits in, so their edges and padding match. */
export const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <section className={cn('border-line rounded-[14px] border bg-white p-5 @xl:p-6', className)}>
    {children}
  </section>
);

/** The heading of a panel, in the area's colour or the camp's green. */
export const SectionHeading: React.FC<{
  children: React.ReactNode;
  area?: HofDashboardArea;
  className?: string;
}> = ({ children, area, className }) => (
  <h3
    className={cn(
      'font-heading text-base font-extrabold text-balance',
      area === undefined ? 'text-conveniat-green' : AREA_TEXT_CLASS[area],
      className,
    )}
  >
    {children}
  </h3>
);

/**
 * How loud a status reads: done, open, due soon, sent back for revision or overdue, as the
 * spec's traffic light.
 */
type StatusTone = 'done' | 'neutral' | 'warning' | 'attention' | 'alert';

const TONE_STYLE: Record<
  StatusTone,
  { icon: React.FC<{ className?: string }>; className: string }
> = {
  done: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  neutral: { icon: Clock, className: 'bg-gray-100 text-gray-700 ring-gray-200' },
  warning: { icon: Clock, className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  // the Hof has to act: amber like due soon, marked like an alert
  attention: { icon: AlertCircle, className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  alert: { icon: AlertCircle, className: 'bg-red-50 text-red-800 ring-red-200' },
};

/** A short status with its icon, tinted by how urgent it is. */
export const StatusPill: React.FC<{ tone: StatusTone; children: React.ReactNode }> = ({
  tone,
  children,
}) => {
  const { icon: Icon, className } = TONE_STYLE[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
};

const STATE_TONE: Record<SubmissionState, StatusTone> = {
  done: 'done',
  open: 'neutral',
  dueSoon: 'warning',
  overdue: 'alert',
  closed: 'neutral',
};

/** The Ressort's status once handed in, else that it is still missing. */
const progressLabel = (progress: SubmissionProgress, locale: Locale): string => {
  if (progress.state === 'closed') return translate('gapClosed', locale);
  if (progress.gap === 'missing') return translate('gapMissing', locale);
  if (progress.gap === 'revision') return HOF_ENTRY_STATUS_LABELS.revisionRequired[locale];
  return HOF_ENTRY_STATUS_LABELS[progress.status ?? 'submitted'][locale];
};

/** Where a form stands, as a pill: the same wherever it is shown. */
export const ProgressPill: React.FC<{ progress: SubmissionProgress; locale: Locale }> = ({
  progress,
  locale,
}) => (
  // a revision the Ressort asked for is the Hof's to act on, whatever the deadline says
  <StatusPill
    tone={
      progress.gap === 'revision' && progress.state !== 'overdue'
        ? 'attention'
        : STATE_TONE[progress.state]
    }
  >
    {progressLabel(progress, locale)}
  </StatusPill>
);

/**
 * Where a form stands, named as everywhere else, and while something is missing the due date
 * and how far off it is.
 */
export const ProgressLine: React.FC<{ progress: SubmissionProgress; locale: Locale }> = ({
  progress,
  locale,
}) => {
  const due: string[] = [];
  if (isOpen(progress) && progress.deadline !== undefined) {
    due.push(translate('dueOn', locale, { date: formatDate(progress.deadline, locale) }));
  }
  if (isOpen(progress) && progress.daysLeft !== undefined) {
    due.push(formatCountdown(progress.daysLeft, locale));
  }
  return (
    // a span, since it also sits inside the overview's row buttons
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <ProgressPill progress={progress} locale={locale} />
      {due.length > 0 && <span className="text-gray-600">{due.join(' · ')}</span>}
    </span>
  );
};

/**
 * The Hof's responsible people (AVP), as Cevi.DB knows them: their name, and the address as a
 * link big enough to tap.
 */
export const ResponsibleList: React.FC<{ people: HofContact[]; locale: Locale }> = ({
  people,
  locale,
}) =>
  people.length === 0 ? (
    <p className="text-sm text-gray-500">{translate('responsibleMissing', locale)}</p>
  ) : (
    <ul className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
      {people.map((person) => (
        <li key={person.email} className="min-w-0 text-sm text-gray-900">
          {person.name !== undefined && <p className="font-semibold">{person.name}</p>}
          {/* one line, cut short where the column is narrow; the whole address on hover */}
          <a
            href={`mailto:${person.email}`}
            title={person.email}
            className="text-conveniat-green flex min-h-11 min-w-0 items-center gap-1.5 hover:underline"
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{person.email}</span>
          </a>
        </li>
      ))}
    </ul>
  );

/** What each area is about, as its icon: building, the programme's activities, the depot. */
const AREA_ICON: Record<HofDashboardArea, LucideIcon> = {
  infrastructure: Hammer,
  program: Sparkles,
  material: Package,
};

/**
 * The area's icon, in front of its name wherever an area is named, in the area's colour so it
 * matches the area's progress bars.
 */
export const AreaIcon: React.FC<{ area: HofDashboardArea; className?: string }> = ({
  area,
  className,
}) => {
  const Icon = AREA_ICON[area];
  return <Icon aria-hidden className={cn('h-4 w-4 shrink-0', AREA_TEXT_CLASS[area], className)} />;
};

/**
 * One mark of a segment bar: filled in the area's colour, handed in and waiting for the
 * Ressort, or still empty.
 */
export type SegmentTone = 'filled' | 'waiting' | 'empty';

/**
 * One segment per form of an area, so a Hof sees which of them are done rather than a share.
 * Read out as `label`.
 */
export const SegmentBar: React.FC<{
  segments: readonly SegmentTone[];
  area: HofDashboardArea;
  label: string;
}> = ({ segments, area, label }) => (
  <div role="img" aria-label={label} className="flex gap-1">
    {segments.map((tone, index) => (
      <span
        key={index}
        className={cn(
          'h-1.5 min-w-2 flex-1 rounded-full',
          tone === 'filled' && AREA_DOT_CLASS[area],
          tone === 'waiting' && 'bg-amber-500',
          tone === 'empty' && 'bg-gray-100',
        )}
      />
    ))}
  </div>
);
