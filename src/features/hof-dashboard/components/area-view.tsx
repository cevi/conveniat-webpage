'use client';

import type { HofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { Panel } from '@/features/hof-dashboard/components/dashboard-ui';
import { DeadlineList } from '@/features/hof-dashboard/components/deadline-list';
import { DocumentLinks } from '@/features/hof-dashboard/components/document-links';
import { FormCard } from '@/features/hof-dashboard/components/form-card';
import type { HofDashboardArea } from '@/features/hof-dashboard/constants';
import { translate } from '@/features/hof-dashboard/texts';
import type { SubmissionProgress } from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import type React from 'react';

/**
 * One area: its deadlines and documents, and one card per form the Hof hands
 * in there, in the order the editors set.
 */
export const AreaView: React.FC<{
  area: HofDashboardArea;
  data: HofDashboardData;
  progress: Record<string, SubmissionProgress>;
  locale: Locale;
}> = ({ area, data, progress, locale }) => {
  const forms = data.forms.filter((form) => form.area === area);
  const deadlines = data.deadlines.filter((deadline) => deadline.area === area);
  const documents = data.documents.filter((document) => document.area === area);

  return (
    <div className="space-y-6">
      <Panel className="grid gap-6 @3xl:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            {translate('deadlines', locale)}
          </p>
          <DeadlineList deadlines={deadlines} locale={locale} />
        </div>
        {documents.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              {translate('areaDocuments', locale)}
            </p>
            <DocumentLinks documents={documents} locale={locale} />
          </div>
        )}
      </Panel>

      {forms.length === 0 ? (
        <Panel>
          <p className="text-sm text-gray-500">{translate('noForms', locale)}</p>
        </Panel>
      ) : (
        // two columns once the screen has room for two forms side by side
        <div className="grid items-start gap-6 @6xl:grid-cols-2">
          {forms.map((form) => {
            const formProgress = progress[form.id];
            return formProgress === undefined ? undefined : (
              <FormCard
                key={form.id}
                form={form}
                progress={formProgress}
                hofId={data.hof.id}
                isReviewer={data.isReviewer}
                locale={locale}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
