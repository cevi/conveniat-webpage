import type {
  HofDashboardData,
  HofDashboardSubmission,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import { Panel, SectionHeading } from '@/features/hof-dashboard/components/dashboard-ui';
import { DocumentLinks } from '@/features/hof-dashboard/components/document-links';
import { formatDate, translate } from '@/features/hof-dashboard/components/texts';
import {
  HOF_FILE_KIND_LABELS,
  HOF_SUBMISSION_STATUS_LABELS,
  HOF_SUBMISSION_TYPE_LABELS,
} from '@/features/hof-dashboard/constants';
import type { Locale } from '@/types/types';
import { FileText } from 'lucide-react';
import type React from 'react';

/** One submission's files, newest first; only the newest of each kind carries the status. */
const SubmissionFiles: React.FC<{ submission: HofDashboardSubmission; locale: Locale }> = ({
  submission,
  locale,
}) => (
  <div className="space-y-2 pt-4 first:pt-0">
    <h4 className="text-sm font-bold text-gray-900">
      {HOF_SUBMISSION_TYPE_LABELS[submission.type][locale]}
    </h4>
    <ul className="space-y-2">
      {submission.files.map((file) => {
        const newest = submission.files.find((candidate) => candidate.kind === file.kind) === file;
        return (
          <li key={file.id} className="flex items-start justify-between gap-4 text-sm">
            <div className="flex min-w-0 items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
              <div className="min-w-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className={
                    newest
                      ? 'font-semibold break-all text-gray-900 hover:underline'
                      : 'break-all text-gray-600 hover:underline'
                  }
                >
                  {file.filename}
                </a>
                <p className="text-xs text-gray-500">
                  {HOF_FILE_KIND_LABELS[file.kind][locale]} ·{' '}
                  {translate('version', locale, { n: file.version })} ·{' '}
                  {translate('uploadedOn', locale, { date: formatDate(file.uploadedAt, locale) })}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold text-gray-600">
              {newest
                ? submission.status !== undefined &&
                  HOF_SUBMISSION_STATUS_LABELS[submission.status][locale]
                : translate('replaced', locale)}
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);

/** The documents to download, and every file the Hof handed in, by submission. */
export const DocumentsView: React.FC<{ data: HofDashboardData; locale: Locale }> = ({
  data,
  locale,
}) => {
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
              <SubmissionFiles key={submission.type} submission={submission} locale={locale} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};
