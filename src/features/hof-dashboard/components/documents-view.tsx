import type {
  HofDashboardData,
  HofDashboardSubmission,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  Panel,
  ProgressPill,
  SectionHeading,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { DocumentLinks } from '@/features/hof-dashboard/components/document-links';
import { FileList } from '@/features/hof-dashboard/components/file-list';
import {
  HOF_SUBMISSION_TYPE_LABELS,
  type HofSubmissionType,
} from '@/features/hof-dashboard/constants';
import { translate } from '@/features/hof-dashboard/texts';
import type { SubmissionProgress } from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import type React from 'react';

/** One submission's files, under its name and where it stands, as on the overview. */
const SubmissionFiles: React.FC<{
  submission: HofDashboardSubmission;
  progress: SubmissionProgress;
  locale: Locale;
}> = ({ submission, progress, locale }) => (
  <div className="space-y-2 pt-4 first:pt-0">
    <div className="flex flex-wrap items-center gap-2">
      <h4 className="text-sm font-bold text-gray-900">
        {HOF_SUBMISSION_TYPE_LABELS[submission.type][locale]}
      </h4>
      <ProgressPill progress={progress} status={submission.status} locale={locale} />
    </div>
    <FileList files={submission.files} locale={locale} showKind />
  </div>
);

/** The documents to download, and every file the Hof handed in, by submission. */
export const DocumentsView: React.FC<{
  data: HofDashboardData;
  progress: Record<HofSubmissionType, SubmissionProgress>;
  locale: Locale;
}> = ({ data, progress, locale }) => {
  const handedIn = data.submissions.filter((submission) => submission.files.length > 0);

  return (
    <div className="space-y-6">
      <Panel className="space-y-2">
        <SectionHeading>{translate('officialDocuments', locale)}</SectionHeading>
        {data.documents.length === 0 ? (
          <p className="text-sm text-gray-500">{translate('noOfficialDocuments', locale)}</p>
        ) : (
          <DocumentLinks documents={data.documents} locale={locale} />
        )}
      </Panel>

      <Panel className="space-y-4">
        <SectionHeading>{translate('submittedDocuments', locale)}</SectionHeading>
        {handedIn.length === 0 ? (
          <p className="text-sm text-gray-500">{translate('noSubmittedDocuments', locale)}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {handedIn.map((submission) => (
              <SubmissionFiles
                key={submission.type}
                submission={submission}
                progress={progress[submission.type]}
                locale={locale}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};
