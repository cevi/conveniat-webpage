'use client';

import type { HofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  ContactBlock,
  Panel,
  SectionHeading,
  StatusPill,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { DeadlineList } from '@/features/hof-dashboard/components/deadline-list';
import { DocumentLinks } from '@/features/hof-dashboard/components/document-links';
import { SubmissionCard } from '@/features/hof-dashboard/components/submission-card';
import type { HofDashboardArea, HofSubmissionType } from '@/features/hof-dashboard/constants';
import { useHofUpload } from '@/features/hof-dashboard/hooks/use-hof-upload';
import { useWarnBeforeLeaving } from '@/features/hof-dashboard/hooks/use-warn-before-leaving';
import { formatCountdown, formatDate, translate } from '@/features/hof-dashboard/texts';
import {
  daysUntil,
  type SubmissionProgress,
} from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

const StadtlebenSection: React.FC<{
  stadtleben: HofDashboardData['stadtleben'];
  locale: Locale;
}> = ({ stadtleben, locale }) => (
  <Panel className="space-y-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <SectionHeading area="program">{translate('stadtleben', locale)}</SectionHeading>
      {stadtleben.deadline !== undefined && (
        <span className="text-sm text-gray-600">
          {translate('dueOn', locale, { date: formatDate(stadtleben.deadline, locale) })} ·{' '}
          {formatCountdown(daysUntil(stadtleben.deadline, new Date()), locale)}
        </span>
      )}
    </div>
    <p className="text-sm text-gray-600">{translate('stadtlebenIntro', locale)}</p>
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
            <StatusPill tone={entry.approved ? 'done' : 'neutral'}>
              {translate(entry.approved ? 'stadtlebenApproved' : 'stadtlebenPending', locale)}
            </StatusPill>
          </li>
        ))}
      </ul>
    )}
    {stadtleben.formUrl !== undefined && stadtleben.formUrl !== '' && (
      <Link
        href={stadtleben.formUrl}
        className="text-cevi-blue inline-flex min-h-11 items-center gap-1 text-sm font-semibold hover:underline"
      >
        {translate('stadtlebenRegister', locale)}
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    )}
  </Panel>
);

/**
 * The submissions of one area: its contact person, deadlines and documents, and one card per
 * plan. The programme area adds the Stadtleben registrations.
 */
export const AreaView: React.FC<{
  area: HofDashboardArea;
  data: HofDashboardData;
  progress: Record<HofSubmissionType, SubmissionProgress>;
  locale: Locale;
}> = ({ area, data, progress, locale }) => {
  const { upload, uploads } = useHofUpload(data.hof.id, locale);
  useWarnBeforeLeaving(Object.keys(uploads).length > 0);

  const submissions = data.submissions.filter((submission) => submission.area === area);
  const deadlines = data.deadlines.filter((deadline) => deadline.area === area);
  const documents = data.documents.filter((document) => document.area === area);
  const contact = area === 'infrastructure' ? data.contacts.buildingManager : data.contacts.coach;

  return (
    <div className="space-y-6">
      <Panel className="grid gap-6 @3xl:grid-cols-2">
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
        {documents.length > 0 && (
          <div className="space-y-1 @3xl:col-span-2">
            <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              {translate('areaDocuments', locale)}
            </p>
            <DocumentLinks documents={documents} locale={locale} />
          </div>
        )}
      </Panel>

      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {submissions.map((submission) => (
          <SubmissionCard
            key={submission.type}
            hofId={data.hof.id}
            submission={submission}
            progress={progress[submission.type]}
            criteria={data.safetyRiskCriteria}
            locale={locale}
            uploads={uploads}
            onUpload={(file, kind) => void upload(file, submission.type, kind)}
          />
        ))}
      </div>

      {area === 'program' && <StadtlebenSection stadtleben={data.stadtleben} locale={locale} />}
    </div>
  );
};
