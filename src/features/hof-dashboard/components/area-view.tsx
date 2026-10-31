'use client';

import type {
  HofDashboardData,
  HofDashboardForm,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  AreaIcon,
  LABEL_CLASS,
  Panel,
  ProgressPill,
  SegmentBar,
} from '@/features/hof-dashboard/components/dashboard-ui';
import {
  DeadlineStrip,
  DeadlineTimeline,
  dueByDay,
} from '@/features/hof-dashboard/components/deadline-list';
import { FormDetail } from '@/features/hof-dashboard/components/form-detail';
import {
  HOF_DASHBOARD_AREA_LABELS,
  type HofDashboardArea,
} from '@/features/hof-dashboard/constants';
import { formatDate, translate } from '@/features/hof-dashboard/texts';
import {
  isOpen,
  type SubmissionProgress,
} from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * The form an area shows when none is chosen, in the editors' order: for a reviewer the first
 * one waiting for the Ressort, for the Hof the first one still open; else the first one.
 */
const defaultFormOf = (
  forms: readonly Pick<HofDashboardForm, 'id' | 'entries'>[],
  progress: Record<string, SubmissionProgress>,
  isReviewer: boolean,
): string | undefined => {
  const toReview = forms.find((form) =>
    form.entries.some((entry) => entry.status === 'submitted' || entry.status === 'inReview'),
  );
  if (isReviewer && toReview !== undefined) return toReview.id;
  const firstOpen = forms.find((form) => {
    const formProgress = progress[form.id];
    return formProgress !== undefined && isOpen(formProgress);
  });
  return (firstOpen ?? forms[0])?.id;
};

/**
 * One area: how far the Hof is and the area's deadlines across the top, then its forms as a
 * list on the left and the chosen one beside it. With a single form the list is left out.
 */
export const AreaView: React.FC<{
  area: HofDashboardArea;
  data: HofDashboardData;
  progress: Record<string, SubmissionProgress>;
  selectedFormId: string | undefined;
  onSelect: (formId: string) => void;
  locale: Locale;
}> = ({ area, data, progress, selectedFormId, onSelect, locale }) => {
  const forms = data.forms.filter((form) => form.area === area);
  const deadlines = data.deadlines.filter((deadline) => deadline.area === area);
  const documents = data.documents.filter((document) => document.area === area);
  const selected = forms.some((form) => form.id === selectedFormId)
    ? selectedFormId
    : defaultFormOf(forms, progress, data.isReviewer);
  const states = forms.map((form) => progress[form.id]?.state);
  const done = states.filter((state) => state === 'done').length;
  const count = translate('progressCount', locale, { done, total: forms.length });
  const label = HOF_DASHBOARD_AREA_LABELS[area][locale];
  const due = dueByDay(
    forms.map((form) => {
      const formProgress = progress[form.id];
      return { deadline: form.deadline, open: formProgress !== undefined && isOpen(formProgress) };
    }),
    new Date(),
  );

  return (
    <div className="space-y-6">
      <Panel className="grid gap-6 @min-[640px]:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)] @min-[640px]:gap-10">
        <div className="space-y-2">
          <p className={cn(LABEL_CLASS, 'flex items-center gap-2')}>
            <AreaIcon area={area} />
            {translate('area', locale)}
          </p>
          <h3 className="font-heading text-heading text-2xl font-extrabold @xl:text-3xl">
            {label}
          </h3>
          {forms.length > 0 && (
            <>
              <p className="text-base text-green-800 tabular-nums">{count}</p>
              <SegmentBar
                area={area}
                label={`${label}: ${count}`}
                segments={states.map((state) => (state === 'done' ? 'filled' : 'empty'))}
              />
            </>
          )}
        </div>
        <div className="min-w-0">
          <div className="hidden @min-[640px]:block">
            <DeadlineStrip deadlines={deadlines} due={due} locale={locale} />
          </div>
          <div className="@min-[640px]:hidden">
            {deadlines.length === 0 ? (
              <p className="text-sm text-green-600">{translate('noDeadlines', locale)}</p>
            ) : (
              <DeadlineTimeline deadlines={deadlines} due={due} locale={locale} />
            )}
          </div>
        </div>
      </Panel>

      {forms.length === 0 ? (
        <Panel>
          <p className="text-sm text-green-700">{translate('noForms', locale)}</p>
        </Panel>
      ) : (
        <div
          className={cn(
            'grid items-start gap-6',
            forms.length > 1 && '@min-[760px]:grid-cols-[15rem_minmax(0,1fr)]',
          )}
        >
          {forms.length > 1 && (
            <Panel className="p-3 @xl:p-3">
              <p className={cn(LABEL_CLASS, 'px-3 pt-2 pb-3')}>
                {translate('submissions', locale)}
              </p>
              <ul className="space-y-1">
                {forms.map((form) => {
                  const formProgress = progress[form.id];
                  const chosen = form.id === selected;
                  return (
                    <li key={form.id}>
                      <button
                        type="button"
                        aria-current={chosen ? 'true' : undefined}
                        className={cn(
                          'w-full cursor-pointer space-y-2 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-green-600',
                          chosen
                            ? 'bg-quiet border-conveniat-green'
                            : 'border-transparent hover:bg-gray-50',
                        )}
                        onClick={() => onSelect(form.id)}
                      >
                        <span className="block text-base font-semibold text-balance text-green-900">
                          {form.title}
                        </span>
                        {formProgress !== undefined && (
                          <span className="block">
                            <ProgressPill progress={formProgress} locale={locale} />
                          </span>
                        )}
                        {form.deadline !== undefined && (
                          <span className="block text-sm text-green-700 tabular-nums">
                            {translate('dueOn', locale, {
                              date: formatDate(form.deadline, locale),
                            })}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
          <div className="min-w-0">
            {forms.map((form) => {
              const formProgress = progress[form.id];
              return formProgress === undefined ? undefined : (
                <FormDetail
                  key={form.id}
                  form={form}
                  progress={formProgress}
                  hofId={data.hof.id}
                  isReviewer={data.isReviewer}
                  documents={documents}
                  hidden={form.id !== selected}
                  locale={locale}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
