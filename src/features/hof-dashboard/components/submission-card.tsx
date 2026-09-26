'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type {
  HofDashboardFile,
  HofDashboardSubmission,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  ProgressLine,
  SECONDARY_BUTTON_CLASS,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { FileList } from '@/features/hof-dashboard/components/file-list';
import {
  HOF_FILE_ACCEPT,
  HOF_SUBMISSION_TYPE_LABELS,
  type HofFileKind,
  uploadKey,
} from '@/features/hof-dashboard/constants';
import { translate } from '@/features/hof-dashboard/texts';
import type { SubmissionProgress } from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2, Upload } from 'lucide-react';
import type React from 'react';
import { useRef } from 'react';

const UploadButton: React.FC<{
  label: string;
  percent: number | undefined;
  locale: Locale;
  onFile: (file: File) => void;
}> = ({ label, percent, locale, onFile }) => {
  const input = useRef<HTMLInputElement>(null);
  const busy = percent !== undefined;
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={HOF_FILE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file !== undefined) onFile(file);
        }}
      />
      <button
        type="button"
        className={SECONDARY_BUTTON_CLASS}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
        {busy ? translate('uploadingPercent', locale, { n: percent }) : label}
      </button>
    </>
  );
};

/** The criteria behind "elevated safety risk", opened from a link next to the question. */
const SafetyCriteriaDialog: React.FC<{ criteria: string[]; locale: Locale }> = ({
  criteria,
  locale,
}) => (
  <Dialog>
    <DialogTrigger asChild>
      <button
        type="button"
        className="text-conveniat-green min-h-11 cursor-pointer px-1 text-sm font-semibold underline-offset-2 hover:underline"
      >
        {translate('showCriteriaLink', locale)}
      </button>
    </DialogTrigger>
    <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border-gray-200 bg-white">
      <DialogHeader>
        <DialogTitle className="font-heading text-conveniat-green pr-8 text-left leading-snug">
          {translate('safetyCriteria', locale)}
        </DialogTitle>
      </DialogHeader>
      <ol className="list-[upper-alpha] space-y-2 pl-5 text-sm text-gray-700">
        {criteria.map((criterion, index) => (
          <li key={index}>{criterion}</li>
        ))}
      </ol>
    </DialogContent>
  </Dialog>
);

/** Yes or no, as two toggle buttons of which the chosen one is filled. */
const SafetyRiskChoice: React.FC<{
  value: 'yes' | 'no' | undefined;
  disabled: boolean;
  labelledBy: string;
  locale: Locale;
  onChange: (value: 'yes' | 'no') => void;
}> = ({ value, disabled, labelledBy, locale, onChange }) => (
  <div
    className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5"
    role="group"
    aria-labelledby={labelledBy}
  >
    {(['yes', 'no'] as const).map((option) => (
      <button
        key={option}
        type="button"
        aria-pressed={value === option}
        disabled={disabled}
        onClick={() => onChange(option)}
        className={cn(
          'min-h-10 min-w-16 cursor-pointer rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          value === option ? 'bg-conveniat-green text-white' : 'text-gray-700 hover:bg-gray-50',
        )}
      >
        {translate(option, locale)}
      </button>
    ))}
  </div>
);

/** The files of one kind, and the button that adds the next version. */
const FilesWithUpload: React.FC<{
  files: HofDashboardFile[];
  percent: number | undefined;
  locale: Locale;
  onFile: (file: File) => void;
}> = ({ files, percent, locale, onFile }) => (
  <div className="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between">
    {files.length === 0 ? (
      <p className="text-sm text-gray-500">{translate('noFileYet', locale)}</p>
    ) : (
      <FileList files={files} locale={locale} />
    )}
    <div className="shrink-0">
      <UploadButton
        label={translate(files.length === 0 ? 'upload' : 'uploadNewVersion', locale)}
        percent={percent}
        locale={locale}
        onFile={onFile}
      />
    </div>
  </div>
);

/**
 * One plan the Hof hands in: where it stands, its versions, the safety question and, when the
 * answer is yes, the safety concept.
 */
export const SubmissionCard: React.FC<{
  submission: HofDashboardSubmission;
  progress: SubmissionProgress;
  criteria: string[];
  locale: Locale;
  uploadProgress: Record<string, number>;
  savingSafetyRisk: boolean;
  onUpload: (file: File, kind: HofFileKind) => void;
  onSafetyRisk: (value: 'yes' | 'no') => void;
}> = ({
  submission,
  progress,
  criteria,
  locale,
  uploadProgress,
  savingSafetyRisk,
  onUpload,
  onSafetyRisk,
}) => {
  const plans = submission.files.filter((file) => file.kind === 'plan');
  const safetyConcepts = submission.files.filter((file) => file.kind === 'safetyConcept');
  const questionId = `safety-question-${submission.type}`;

  return (
    <article
      id={`submission-${submission.type}`}
      tabIndex={-1}
      aria-labelledby={`submission-title-${submission.type}`}
      className="scroll-mt-24 space-y-4 p-5 outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-inset @xl:p-6"
    >
      <header className="space-y-1">
        <h4
          id={`submission-title-${submission.type}`}
          className="text-base font-bold text-gray-900"
        >
          {HOF_SUBMISSION_TYPE_LABELS[submission.type][locale]}
        </h4>
        <ProgressLine progress={progress} status={submission.status} locale={locale} />
      </header>

      {submission.feedback !== undefined && submission.feedback !== '' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">{translate('feedback', locale)}</p>
          <p className="whitespace-pre-line">{submission.feedback}</p>
        </div>
      )}

      <FilesWithUpload
        files={plans}
        percent={uploadProgress[uploadKey(submission.type, 'plan')]}
        locale={locale}
        onFile={(file) => onUpload(file, 'plan')}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 pt-4">
        <span id={questionId} className="text-sm font-medium text-gray-900">
          {translate('safetyRiskQuestion', locale)}
        </span>
        <SafetyRiskChoice
          value={submission.elevatedSafetyRisk}
          disabled={savingSafetyRisk}
          labelledBy={questionId}
          locale={locale}
          onChange={onSafetyRisk}
        />
        {criteria.length > 0 && <SafetyCriteriaDialog criteria={criteria} locale={locale} />}
      </div>

      {submission.elevatedSafetyRisk === 'yes' && (
        <div
          className={cn(
            'space-y-3 rounded-lg border p-4',
            safetyConcepts.length === 0
              ? 'border-amber-200 bg-amber-50'
              : 'border-gray-100 bg-gray-50',
          )}
        >
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {translate('safetyConceptRequired', locale)}
            </p>
            <p className="text-sm text-gray-600">{translate('safetyConceptHint', locale)}</p>
          </div>
          <FilesWithUpload
            files={safetyConcepts}
            percent={uploadProgress[uploadKey(submission.type, 'safetyConcept')]}
            locale={locale}
            onFile={(file) => onUpload(file, 'safetyConcept')}
          />
        </div>
      )}
    </article>
  );
};
