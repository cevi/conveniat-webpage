import type { HofContact } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  HOF_SUBMISSION_STATUS_LABELS,
  type HofDashboardArea,
  type HofSubmissionStatus,
} from '@/features/hof-dashboard/constants';
import {
  formatCountdown,
  formatDate,
  translate,
  type TextKey,
} from '@/features/hof-dashboard/texts';
import type {
  SubmissionGap,
  SubmissionProgress,
  SubmissionState,
} from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertCircle, CheckCircle2, Clock, Mail, Phone } from 'lucide-react';
import type React from 'react';

/** Infrastructure reads in the camp's green, the programme in Cevi red. */
export const AREA_TEXT_CLASS: Record<HofDashboardArea, string> = {
  infrastructure: 'text-conveniat-green',
  program: 'text-cevi-red',
};

/** The area's colour as a fill, for progress bars and dots. */
export const AREA_DOT_CLASS: Record<HofDashboardArea, string> = {
  infrastructure: 'bg-conveniat-green',
  program: 'bg-cevi-red',
};

/** The main action of a card, styled like the submit button of the site's forms. */
export const PRIMARY_BUTTON_CLASS =
  'bg-conveniat-green inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-gray-100 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4';

/** A secondary action, like an upload next to a file list. */
export const SECONDARY_BUTTON_CLASS =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4';

/** A white card with the padding every part of the dashboard uses. */
export const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <section
    className={cn('rounded-xl border border-gray-100 bg-white p-5 shadow-sm @xl:p-6', className)}
  >
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

/** How loud a status reads: done, open, due soon or overdue, as the spec's traffic light. */
export type StatusTone = 'done' | 'neutral' | 'warning' | 'alert';

const TONE_STYLE: Record<
  StatusTone,
  { icon: React.FC<{ className?: string }>; className: string }
> = {
  done: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  neutral: { icon: Clock, className: 'bg-gray-100 text-gray-700 ring-gray-200' },
  warning: { icon: Clock, className: 'bg-amber-50 text-amber-800 ring-amber-200' },
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
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
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
};

const GAP_LABEL: Record<Exclude<SubmissionGap, 'revision'>, TextKey> = {
  plan: 'gapPlan',
  safetyRiskAnswer: 'gapSafetyRiskAnswer',
  safetyConcept: 'gapSafetyConcept',
};

/** The Ressort's status once handed in, else what is missing, named as everywhere else. */
const progressLabel = (
  progress: SubmissionProgress,
  status: HofSubmissionStatus | undefined,
  locale: Locale,
): string => {
  if (progress.gap === undefined)
    return HOF_SUBMISSION_STATUS_LABELS[status ?? 'submitted'][locale];
  if (progress.gap === 'revision') return HOF_SUBMISSION_STATUS_LABELS.revisionRequired[locale];
  return translate(GAP_LABEL[progress.gap], locale);
};

/**
 * Where a submission stands: what is missing, or the Ressort's status once it is handed in,
 * named as everywhere else, and for what is missing the deadline and how far off it is.
 */
export const ProgressLine: React.FC<{
  progress: SubmissionProgress;
  status: HofSubmissionStatus | undefined;
  locale: Locale;
  className?: string;
}> = ({ progress, status, locale, className }) => {
  const label = progressLabel(progress, status, locale);
  const due: string[] = [];
  if (progress.state !== 'done' && progress.deadline !== undefined) {
    due.push(translate('dueOn', locale, { date: formatDate(progress.deadline, locale) }));
  }
  if (progress.state !== 'done' && progress.daysLeft !== undefined) {
    due.push(formatCountdown(progress.daysLeft, locale));
  }
  return (
    <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm', className)}>
      <StatusPill tone={STATE_TONE[progress.state]}>{label}</StatusPill>
      {due.length > 0 && <span className="text-gray-600">{due.join(' · ')}</span>}
    </p>
  );
};

/** One contact person of the Hof: name, and email and phone as links big enough to tap. */
export const ContactBlock: React.FC<{
  label: string;
  contact: HofContact;
  locale: Locale;
}> = ({ label, contact, locale }) => (
  <div>
    <dt className="text-xs font-semibold tracking-wider text-gray-500 uppercase">{label}</dt>
    {contact.name === '' && contact.email === '' && contact.phone === '' ? (
      <dd className="mt-1 text-sm text-gray-500">{translate('contactMissing', locale)}</dd>
    ) : (
      <dd className="text-sm text-gray-900">
        {contact.name !== '' && <p className="mt-1 font-semibold">{contact.name}</p>}
        {contact.email !== '' && (
          <a
            href={`mailto:${contact.email}`}
            className="text-conveniat-green flex min-h-9 items-center gap-1.5 break-all hover:underline"
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
            {contact.email}
          </a>
        )}
        {contact.phone !== '' && (
          <a
            href={`tel:${contact.phone.replaceAll(/\s/g, '')}`}
            className="flex min-h-9 items-center gap-1.5 text-gray-700 hover:underline"
          >
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            {contact.phone}
          </a>
        )}
      </dd>
    )}
  </div>
);

/** A thin bar for the share of submissions handed in. */
export const ProgressBar: React.FC<{ percent: number; area: HofDashboardArea; label: string }> = ({
  percent,
  area,
  label,
}) => (
  <div
    className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
    role="progressbar"
    aria-label={label}
    aria-valuenow={percent}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div
      className={cn('h-full rounded-full', AREA_DOT_CLASS[area])}
      style={{ width: `${percent}%` }}
    />
  </div>
);
