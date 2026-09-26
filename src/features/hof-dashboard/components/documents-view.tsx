import { Card } from '@/components/ui/card';
import type { HofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { formatDate, formatFileSize, translate } from '@/features/hof-dashboard/components/texts';
import {
  HOF_DASHBOARD_AREA_LABELS,
  HOF_FILE_KIND_LABELS,
  HOF_SUBMISSION_STATUS_LABELS,
  HOF_SUBMISSION_TYPE_LABELS,
} from '@/features/hof-dashboard/constants';
import type { Locale } from '@/types/types';
import { Download, FileText } from 'lucide-react';
import type React from 'react';

/** The documents to download, and every file the Hof handed in with the Ressort's status. */
export const DocumentsView: React.FC<{ data: HofDashboardData; locale: Locale }> = ({
  data,
  locale,
}) => {
  const handedIn = data.submissions.flatMap((submission) =>
    submission.files.map((file) => ({ file, submission })),
  );

  return (
    <div className="space-y-6">
      <Card
        title={translate('officialDocuments', locale)}
        className="border border-gray-100"
        divided
      >
        {data.documents.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-500">
            {translate('noOfficialDocuments', locale)}
          </p>
        ) : (
          data.documents.map((document) => (
            <div key={document.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold break-words text-gray-900">{document.title}</p>
                  <p className="text-xs text-gray-500">
                    {[
                      document.area === undefined
                        ? undefined
                        : HOF_DASHBOARD_AREA_LABELS[document.area][locale],
                      document.filesize === undefined
                        ? undefined
                        : formatFileSize(document.filesize, locale),
                    ]
                      .filter((part) => part !== undefined)
                      .join(' · ')}
                  </p>
                </div>
              </div>
              {document.url !== undefined && (
                <a
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  {translate('download', locale)}
                </a>
              )}
            </div>
          ))
        )}
      </Card>

      <Card
        title={translate('submittedDocuments', locale)}
        className="border border-gray-100"
        divided
      >
        {handedIn.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-500">
            {translate('noSubmittedDocuments', locale)}
          </p>
        ) : (
          handedIn.map(({ file, submission }) => (
            <div key={file.id} className="flex items-start justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                {file.url === undefined ? (
                  <p className="font-semibold break-all text-gray-900">{file.filename}</p>
                ) : (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold break-all text-gray-900 hover:underline"
                  >
                    {file.filename}
                  </a>
                )}
                <p className="text-xs text-gray-500">
                  {HOF_SUBMISSION_TYPE_LABELS[submission.type][locale]} ·{' '}
                  {HOF_FILE_KIND_LABELS[file.kind][locale]} ·{' '}
                  {translate('version', locale, { n: file.version })} ·{' '}
                  {translate('uploadedOn', locale, { date: formatDate(file.uploadedAt, locale) })}
                </p>
              </div>
              {submission.status !== undefined && (
                <span className="shrink-0 text-xs font-semibold text-gray-500">
                  {HOF_SUBMISSION_STATUS_LABELS[submission.status][locale]}
                </span>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
};
