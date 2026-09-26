import type { HofContact } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  formatCountdown,
  formatDate,
  translate,
  type TextKey,
} from '@/features/hof-dashboard/components/texts';
import type { HofDashboardArea } from '@/features/hof-dashboard/constants';
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
  { icon: React.FC<{ className?: string }>; className: string; label: TextKey }
> = {
  done: { icon: CheckCircle2, className: 'text-green-600', label: 'stateDone' },
  open: { icon: Clock, className: 'text-gray-500', label: 'stateOpen' },
  dueSoon: { icon: Clock, className: 'text-amber-700', label: 'stateOpen' },
  overdue: { icon: AlertCircle, className: 'text-red-700', label: 'stateOverdue' },
};

const GAP_LABEL: Record<SubmissionGap, TextKey> = {
  plan: 'gapPlan',
  safetyRiskAnswer: 'gapSafetyRiskAnswer',
  safetyConcept: 'gapSafetyConcept',
  revision: 'gapRevision',
};

/** Where a submission stands, in one line: done, or what is missing and by when. */
export const ProgressLine: React.FC<{
  progress: SubmissionProgress;
  locale: Locale;
  className?: string;
}> = ({ progress, locale, className }) => {
  const style = STATE_STYLE[progress.state];
  const Icon = style.icon;
  const parts: string[] = [
    progress.gap === undefined
      ? translate(style.label, locale)
      : translate(GAP_LABEL[progress.gap], locale),
  ];
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

/** One contact person of the Hof: name, and email and phone as links. */
export const ContactBlock: React.FC<{
  label: string;
  contact: HofContact;
  locale: Locale;
}> = ({ label, contact, locale }) => (
  <div className="space-y-1">
    <dt className="text-xs font-semibold tracking-wider text-gray-500 uppercase">{label}</dt>
    {contact.name === '' && contact.email === '' && contact.phone === '' ? (
      <dd className="text-sm text-gray-400">{translate('contactMissing', locale)}</dd>
    ) : (
      <dd className="space-y-0.5 text-sm text-gray-900">
        {contact.name !== '' && <p className="font-semibold">{contact.name}</p>}
        {contact.email !== '' && (
          <a
            href={`mailto:${contact.email}`}
            className="text-conveniat-green flex items-center gap-1.5 break-all hover:underline"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {contact.email}
          </a>
        )}
        {contact.phone !== '' && (
          <a
            href={`tel:${contact.phone.replaceAll(/\s/g, '')}`}
            className="flex items-center gap-1.5 text-gray-700 hover:underline"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {contact.phone}
          </a>
        )}
      </dd>
    )}
  </div>
);

/** A thin bar for the share of submissions handed in. */
export const ProgressBar: React.FC<{ percent: number; area: HofDashboardArea }> = ({
  percent,
  area,
}) => (
  <div
    className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
    role="progressbar"
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
