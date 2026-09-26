'use client';

import { Button } from '@/components/ui/buttons/button';
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
import { ProgressLine } from '@/features/hof-dashboard/components/dashboard-ui';
import { formatDate, translate } from '@/features/hof-dashboard/components/texts';
import {
  HOF_SUBMISSION_STATUS_LABELS,
  HOF_SUBMISSION_TYPE_LABELS,
  type HofFileKind,
} from '@/features/hof-dashboard/constants';
import { HOF_FILE_ACCEPT } from '@/features/hof-dashboard/hooks/use-hof-upload';
import type { SubmissionProgress } from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { FileText, Info, Loader2, Upload } from 'lucide-react';
import type React from 'react';
import { useRef } from 'react';

const UploadButton: React.FC<{
  label: string;
  busy: boolean;
  disabled: boolean;
  locale: Locale;
  onFile: (file: File) => void;
}> = ({ label, busy, disabled, locale, onFile }) => {
  const input = useRef<HTMLInputElement>(null);
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy || disabled}
        onClick={() => input.current?.click()}
      >
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
        {busy ? translate('uploading', locale) : label}
      </Button>
    </>
  );
};

const FileList: React.FC<{ files: HofDashboardFile[]; locale: Locale }> = ({ files, locale }) => (
  <ul className="space-y-1.5">
    {files.map((file, index) => (
      <li key={file.id} className="flex items-start gap-2 text-sm">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        <div className="min-w-0">
          {file.url === undefined ? (
            <span className="break-all text-gray-900">{file.filename}</span>
          ) : (
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'break-all hover:underline',
                index === 0 ? 'text-conveniat-green font-semibold' : 'text-gray-600',
              )}
            >
              {file.filename}
            </a>
          )}
          <p className="text-xs text-gray-500">
            {translate('version', locale, { n: file.version })} ·{' '}
            {translate('uploadedOn', locale, { date: formatDate(file.uploadedAt, locale) })}
          </p>
        </div>
      </li>
    ))}
  </ul>
);

/** The criteria behind "elevated safety risk", opened from the info button next to it. */
export const SafetyCriteriaDialog: React.FC<{ criteria: string[]; locale: Locale }> = ({
  criteria,
  locale,
}) => (
  <Dialog>
    <DialogTrigger asChild>
      <button
        type="button"
        className="inline-flex cursor-pointer items-center text-gray-400 hover:text-gray-700"
        aria-label={translate('showCriteria', locale)}
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>
    </DialogTrigger>
    <DialogContent className="max-h-[85vh] overflow-y-auto bg-white">
      <DialogHeader>
        <DialogTitle className="font-heading text-conveniat-green">
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

/** Yes or no, as two buttons of which the chosen one is filled. */
const SafetyRiskChoice: React.FC<{
  value: 'yes' | 'no' | undefined;
  disabled: boolean;
  locale: Locale;
  onChange: (value: 'yes' | 'no') => void;
}> = ({ value, disabled, locale, onChange }) => (
  <div className="inline-flex rounded-md border border-gray-200 p-0.5" role="radiogroup">
    {(['yes', 'no'] as const).map((option) => (
      <button
        key={option}
        type="button"
        role="radio"
        aria-checked={value === option}
        disabled={disabled}
        onClick={() => onChange(option)}
        className={cn(
          'cursor-pointer rounded px-4 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          value === option ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100',
        )}
      >
        {translate(option, locale)}
      </button>
    ))}
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
  uploadingKey: string | undefined;
  savingSafetyRisk: boolean;
  onUpload: (file: File, kind: HofFileKind) => void;
  onSafetyRisk: (value: 'yes' | 'no') => void;
}> = ({
  submission,
  progress,
  criteria,
  locale,
  uploadingKey,
  savingSafetyRisk,
  onUpload,
  onSafetyRisk,
}) => {
  const plans = submission.files.filter((file) => file.kind === 'plan');
  const safetyConcepts = submission.files.filter((file) => file.kind === 'safetyConcept');
  const anyUploading = uploadingKey !== undefined;

  return (
    <article id={`submission-${submission.type}`} className="scroll-mt-24 space-y-4 p-5 @xl:p-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h4 className="text-base font-bold text-gray-900">
            {HOF_SUBMISSION_TYPE_LABELS[submission.type][locale]}
          </h4>
          {submission.status !== undefined && plans.length > 0 && (
            <span className="text-xs font-semibold text-gray-500">
              {HOF_SUBMISSION_STATUS_LABELS[submission.status][locale]}
            </span>
          )}
        </div>
        <ProgressLine progress={progress} locale={locale} />
      </header>

      {submission.status === 'revisionRequired' && submission.feedback !== undefined && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">{translate('feedback', locale)}</p>
          <p className="whitespace-pre-line">{submission.feedback}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between">
        {plans.length === 0 ? (
          <p className="text-sm text-gray-500">{translate('noFileYet', locale)}</p>
        ) : (
          <FileList files={plans} locale={locale} />
        )}
        <div className="shrink-0">
          <UploadButton
            label={translate(plans.length === 0 ? 'upload' : 'uploadNewVersion', locale)}
            busy={uploadingKey === `${submission.type}:plan`}
            disabled={anyUploading}
            locale={locale}
            onFile={(file) => onUpload(file, 'plan')}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 pt-4">
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          {translate('safetyRiskQuestion', locale)}
          {criteria.length > 0 && <SafetyCriteriaDialog criteria={criteria} locale={locale} />}
        </span>
        <SafetyRiskChoice
          value={submission.elevatedSafetyRisk}
          disabled={savingSafetyRisk}
          locale={locale}
          onChange={onSafetyRisk}
        />
      </div>

      {submission.elevatedSafetyRisk === 'yes' && (
        <div className="space-y-3 rounded-md bg-gray-50 p-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {translate('safetyConceptRequired', locale)}
            </p>
            <p className="text-sm text-gray-500">{translate('safetyConceptHint', locale)}</p>
          </div>
          <div className="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between">
            {safetyConcepts.length === 0 ? (
              <p className="text-sm text-gray-500">{translate('noFileYet', locale)}</p>
            ) : (
              <FileList files={safetyConcepts} locale={locale} />
            )}
            <div className="shrink-0">
              <UploadButton
                label={translate(
                  safetyConcepts.length === 0 ? 'upload' : 'uploadNewVersion',
                  locale,
                )}
                busy={uploadingKey === `${submission.type}:safetyConcept`}
                disabled={anyUploading}
                locale={locale}
                onFile={(file) => onUpload(file, 'safetyConcept')}
              />
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
