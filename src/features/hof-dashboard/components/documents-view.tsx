import type { HofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  Panel,
  ProgressPill,
  SectionHeading,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { DocumentLinks } from '@/features/hof-dashboard/components/document-links';
import { FileRow } from '@/features/hof-dashboard/components/entry-answers';
import { translate } from '@/features/hof-dashboard/texts';
import type { SubmissionProgress } from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import type React from 'react';

/**
 * The documents to download, and the files the Hof handed in, by form: of a form of versions
 * those of the newest version, of one of entries those of every entry.
 */
export const DocumentsView: React.FC<{
  data: HofDashboardData;
  progress: Record<string, SubmissionProgress>;
  locale: Locale;
}> = ({ data, progress, locale }) => {
  const handedIn = data.forms.flatMap((form) => {
    const entries = form.mode === 'versions' ? form.entries.slice(0, 1) : form.entries;
    const files = entries.flatMap((entry) =>
      entry.answers.flatMap((answer) => (answer.kind === 'files' ? answer.files : [])),
    );
    const formProgress = progress[form.id];
    return files.length === 0 || formProgress === undefined
      ? []
      : [{ form, files, progress: formProgress }];
  });

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
            {handedIn.map(({ form, files, progress: formProgress }) => (
              <div key={form.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900">{form.title}</h4>
                  <ProgressPill progress={formProgress} locale={locale} />
                </div>
                <ul className="grid gap-2 @2xl:grid-cols-2">
                  {files.map((file) => (
                    <FileRow key={file.id} file={file} locale={locale} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};
