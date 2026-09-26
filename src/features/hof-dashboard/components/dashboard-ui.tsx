import type { HofContact } from '@/features/hof-dashboard/api/hof-dashboard-data';
import type { HofDashboardArea, HofSubmissionStatus } from '@/features/hof-dashboard/constants';
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

const AREA_BAR_CLASS: Record<HofDashboardArea, string> = {
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

const STATE_STYLE: Record<
  SubmissionState,
  { icon: React.FC<{ className?: string }>; className: string }
> = {
  done: { icon: CheckCircle2, className: 'text-green-600' },
  open: { icon: Clock, className: 'text-gray-600' },
  dueSoon: { icon: Clock, className: 'text-amber-700' },
  overdue: { icon: AlertCircle, className: 'text-red-700' },
};

const GAP_LABEL: Record<SubmissionGap, TextKey> = {
  plan: 'gapPlan',
  safetyRiskAnswer: 'gapSafetyRiskAnswer',
  safetyConcept: 'gapSafetyConcept',
  revision: 'gapRevision',
};

/** What a handed-in submission reads as: handed in, unless the Ressort has moved it on. */
const DONE_LABEL: Record<HofSubmissionStatus, TextKey> = {
  submitted: 'stateDone',
  inReview: 'stateInReview',
  revisionRequired: 'stateDone',
  archived: 'stateArchived',
};

/**
 * Where a submission stands, in one line: handed in and what the Ressort made of it, or what
 * is missing and by when.
 */
export const ProgressLine: React.FC<{
  progress: SubmissionProgress;
  status: HofSubmissionStatus | undefined;
  locale: Locale;
  className?: string;
}> = ({ progress, status, locale, className }) => {
  const style = STATE_STYLE[progress.state];
  const Icon = style.icon;
  const parts: string[] =
    progress.gap === undefined
      ? [translate(DONE_LABEL[status ?? 'submitted'], locale)]
      : [translate(GAP_LABEL[progress.gap], locale)];
  if (progress.state !== 'done' && progress.deadline !== undefined) {
    parts.push(translate('dueOn', locale, { date: formatDate(progress.deadline, locale) }));
  }
  if (progress.state !== 'done' && progress.daysLeft !== undefined) {
    parts.push(formatCountdown(progress.daysLeft, locale));
  }
  return (
    <p className={cn('flex items-start gap-1.5 text-sm', style.className, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{parts.join(' · ')}</span>
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
      className={cn('h-full rounded-full', AREA_BAR_CLASS[area])}
      style={{ width: `${percent}%` }}
    />
  </div>
);
