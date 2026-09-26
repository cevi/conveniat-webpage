'use client';

import { Card } from '@/components/ui/card';
import type {
  HofDashboardData,
  HofDashboardDeadline,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import { ContactBlock, SectionHeading } from '@/features/hof-dashboard/components/dashboard-ui';
import { SubmissionCard } from '@/features/hof-dashboard/components/submission-card';
import { formatCountdown, formatDate, translate } from '@/features/hof-dashboard/components/texts';
import type { HofDashboardArea, HofSubmissionType } from '@/features/hof-dashboard/constants';
import { useHofUpload } from '@/features/hof-dashboard/hooks/use-hof-upload';
import {
  daysUntil,
  type SubmissionProgress,
} from '@/features/hof-dashboard/utils/submission-progress';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { toast } from 'sonner';

/** The deadlines of one area, oldest first, with the passed ones greyed out. */
export const DeadlineList: React.FC<{
  deadlines: Pick<HofDashboardDeadline, 'id' | 'date' | 'title'>[];
  locale: Locale;
}> = ({ deadlines, locale }) => {
  const now = new Date();
  if (deadlines.length === 0) {
    return <p className="text-sm text-gray-500">{translate('noDeadlines', locale)}</p>;
  }
  return (
    <ol className="space-y-3">
      {deadlines.map((deadline) => {
        const daysLeft = daysUntil(deadline.date, now);
        return (
          <li
            key={deadline.id}
            className={cn('flex gap-4 text-sm', daysLeft < 0 && 'text-gray-400')}
          >
            <span className="w-24 shrink-0 font-semibold tabular-nums">
              {formatDate(deadline.date, locale)}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block', daysLeft >= 0 && 'text-gray-900')}>
                {deadline.title}
              </span>
              {daysLeft >= 0 && (
                <span className="text-xs text-gray-500">{formatCountdown(daysLeft, locale)}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const StadtlebenSection: React.FC<{
  stadtleben: HofDashboardData['stadtleben'];
  locale: Locale;
}> = ({ stadtleben, locale }) => (
  <Card className="border border-gray-100" contentClassName="space-y-4 p-5 @xl:p-6">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <SectionHeading area="program">{translate('stadtleben', locale)}</SectionHeading>
      {stadtleben.deadline !== undefined && (
        <span className="text-sm text-gray-500">
          {translate('dueOn', locale, { date: formatDate(stadtleben.deadline, locale) })} ·{' '}
          {formatCountdown(daysUntil(stadtleben.deadline, new Date()), locale)}
        </span>
      )}
    </div>
    <p className="text-sm text-gray-500">{translate('stadtlebenIntro', locale)}</p>
    {stadtleben.entries.length === 0 ? (
      <p className="text-sm text-gray-500">{translate('stadtlebenNone', locale)}</p>
    ) : (
      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {stadtleben.entries.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">
                {entry.title ?? translate('stadtlebenUntitled', locale)}
              </p>
              <p className="text-xs text-gray-500">
                {translate('submittedOn', locale, { date: formatDate(entry.submittedAt, locale) })}
              </p>
            </div>
            <span
              className={cn(
                'flex shrink-0 items-center gap-1 text-xs font-semibold',
                entry.approved ? 'text-green-600' : 'text-gray-500',
              )}
            >
              {entry.approved && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
              {translate(entry.approved ? 'stadtlebenApproved' : 'stadtlebenPending', locale)}
            </span>
          </li>
        ))}
      </ul>
    )}
    {stadtleben.formUrl !== undefined && stadtleben.formUrl !== '' && (
      <Link
        href={stadtleben.formUrl}
        className="text-cevi-red inline-flex items-center gap-1 text-sm font-semibold hover:underline"
      >
        {translate('stadtlebenRegister', locale)}
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    )}
  </Card>
);

/**
 * The submissions of one area: its contact person, its deadlines and one card per plan. The
 * programme area adds the Stadtleben registrations.
 */
export const AreaView: React.FC<{
  area: HofDashboardArea;
  data: HofDashboardData;
  progress: Record<HofSubmissionType, SubmissionProgress>;
  locale: Locale;
}> = ({ area, data, progress, locale }) => {
  const utils = trpc.useUtils();
  const { upload, uploadingKey } = useHofUpload(data.hof.id, locale);
  const updateSafetyRisk = trpc.hofDashboard.updateSafetyRisk.useMutation({
    onSuccess: () => utils.hofDashboard.getHofDashboard.invalidate({ hofId: data.hof.id }),
    onError: () => toast.error(translate('saveFailed', locale)),
  });

  const submissions = data.submissions.filter((submission) => submission.area === area);
  const deadlines = data.deadlines.filter((deadline) => deadline.area === area);
  const contact = area === 'infrastructure' ? data.contacts.buildingManager : data.contacts.coach;

  return (
    <div className="space-y-6">
      <Card
        className="border border-gray-100"
        contentClassName="grid gap-6 p-5 @3xl:grid-cols-2 @xl:p-6"
      >
        <dl>
          <ContactBlock
            label={translate(area === 'infrastructure' ? 'buildingManager' : 'coach', locale)}
            contact={contact}
            locale={locale}
          />
        </dl>
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            {translate('deadlines', locale)}
          </p>
          <DeadlineList deadlines={deadlines} locale={locale} />
        </div>
      </Card>

      <Card className="border border-gray-100" divided>
        {submissions.map((submission) => (
          <SubmissionCard
            key={submission.type}
            submission={submission}
            progress={progress[submission.type]}
            criteria={data.safetyRiskCriteria}
            locale={locale}
            uploadingKey={uploadingKey}
            savingSafetyRisk={
              updateSafetyRisk.isPending &&
              updateSafetyRisk.variables.submissionType === submission.type
            }
            onUpload={(file, kind) => void upload(file, submission.type, kind)}
            onSafetyRisk={(elevatedSafetyRisk) =>
              updateSafetyRisk.mutate({
                hofId: data.hof.id,
                submissionType: submission.type,
                elevatedSafetyRisk,
              })
            }
          />
        ))}
      </Card>

      {area === 'program' && <StadtlebenSection stadtleben={data.stadtleben} locale={locale} />}
    </div>
  );
};
