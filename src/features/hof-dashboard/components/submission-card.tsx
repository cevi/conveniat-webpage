'use client';

import {
  Dialog,
  DialogClose,
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
  PRIMARY_BUTTON_CLASS,
  ProgressLine,
  SECONDARY_BUTTON_CLASS,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { FileList } from '@/features/hof-dashboard/components/file-list';
import {
  HOF_FILE_ACCEPT,
  HOF_FILE_MAX_BYTES,
  HOF_SUBMISSION_TYPE_LABELS,
  type HofFileKind,
  uploadKey,
} from '@/features/hof-dashboard/constants';
import type { UploadInProgress } from '@/features/hof-dashboard/hooks/use-hof-upload';
import { useKeepFocus } from '@/features/hof-dashboard/hooks/use-keep-focus';
import { useSafetyRiskAnswer } from '@/features/hof-dashboard/hooks/use-safety-risk-answer';
import { translate } from '@/features/hof-dashboard/texts';
import type { SubmissionProgress } from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Upload, X } from 'lucide-react';
import type React from 'react';
import { useId, useRef } from 'react';

/** A file on its way up: its name, how far it is, and a way to call it off. */
const UploadProgress: React.FC<{
  upload: UploadInProgress;
  focusRef: React.RefObject<HTMLButtonElement | null>;
  locale: Locale;
}> = ({ upload, focusRef, locale }) => (
  <div className="w-full space-y-2 rounded-lg bg-gray-50 p-3">
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 truncate font-semibold text-gray-900">{upload.filename}</span>
      <span className="shrink-0 text-gray-600 tabular-nums">{upload.percent} %</span>
    </div>
    <div
      className="h-1.5 overflow-hidden rounded-full bg-gray-200"
      role="progressbar"
      aria-label={translate('uploadingFile', locale, { name: upload.filename })}
      aria-valuenow={upload.percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="bg-conveniat-green h-full rounded-full transition-[width] motion-reduce:transition-none"
        style={{ width: `${upload.percent}%` }}
      />
    </div>
    <div className="flex flex-wrap items-center gap-3">
      {/* stays while the file is filed, too late to cancel by then, so the focus has a place */}
      <button
        ref={focusRef}
        type="button"
        aria-disabled={upload.cancel === undefined}
        className={cn(
          SECONDARY_BUTTON_CLASS,
          'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        )}
        onClick={upload.cancel}
      >
        <X aria-hidden />
        {translate('cancel', locale)}
      </button>
      {upload.cancel === undefined && (
        <p className="text-sm text-gray-600">{translate('saving', locale)}</p>
      )}
    </div>
  </div>
);

const UploadButton: React.FC<{
  label: string;
  primary: boolean;
  focusRef: React.RefObject<HTMLButtonElement | null>;
  onFile: (file: File) => void;
}> = ({ label, primary, focusRef, onFile }) => {
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
      <button
        ref={focusRef}
        type="button"
        className={primary ? PRIMARY_BUTTON_CLASS : SECONDARY_BUTTON_CLASS}
        onClick={() => input.current?.click()}
      >
        <Upload aria-hidden />
        {label}
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
    <DialogContent
      closeLabel={translate('close', locale)}
      // the title says it all; without this Radix warns about a missing description
      aria-describedby={undefined}
      // opens on the title and list rather than on the close button in the corner
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        (event.currentTarget as HTMLElement).focus();
      }}
      className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border-gray-200 focus:outline-none"
    >
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
      <DialogClose asChild>
        <button type="button" className={cn(SECONDARY_BUTTON_CLASS, 'w-full')}>
          {translate('close', locale)}
        </button>
      </DialogClose>
    </DialogContent>
  </Dialog>
);

const SafetyRiskChoice: React.FC<{
  value: 'yes' | 'no' | undefined;
  labelledBy: string;
  locale: Locale;
  onChange: (value: 'yes' | 'no') => void;
}> = ({ value, labelledBy, locale, onChange }) => (
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
        onClick={() => onChange(option)}
        className={cn(
          'min-h-10 min-w-16 cursor-pointer rounded-md px-4 text-sm font-semibold transition-colors',
          value === option ? 'bg-conveniat-green text-white' : 'text-gray-700 hover:bg-gray-50',
        )}
      >
        {translate(option, locale)}
      </button>
    ))}
  </div>
);

/** The files of one kind, and the button that adds the next version, or its upload under way. */
const FilesWithUpload: React.FC<{
  files: HofDashboardFile[];
  upload: UploadInProgress | undefined;
  /** When the Ressort asked for a new version, adding one is the card's main action. */
  primary?: boolean;
  locale: Locale;
  onFile: (file: File) => void;
}> = ({ files, upload, primary = false, locale, onFile }) => {
  // the upload button, or the cancel button while the upload runs
  const focusTarget = useRef<HTMLButtonElement>(null);
  useKeepFocus(upload === undefined ? 'idle' : 'uploading', focusTarget);
  return (
    <div className="space-y-3">
      {files.length > 0 && <FileList files={files} locale={locale} />}
      {files.length === 0 && upload === undefined && (
        <p className="text-sm text-gray-500">{translate('noFileYet', locale)}</p>
      )}
      {upload === undefined ? (
        <div className="space-y-1">
          <UploadButton
            label={translate(files.length === 0 ? 'upload' : 'uploadNewVersion', locale)}
            primary={primary}
            focusRef={focusTarget}
            onFile={onFile}
          />
          <p className="text-xs text-gray-500">
            {translate('fileRules', locale, { n: HOF_FILE_MAX_BYTES / (1024 * 1024) })}
          </p>
        </div>
      ) : (
        <UploadProgress upload={upload} focusRef={focusTarget} locale={locale} />
      )}
    </div>
  );
};

/**
 * One plan the Hof hands in: where it stands, its versions, the safety question and, when the
 * answer is yes, the safety concept.
 */
export const SubmissionCard: React.FC<{
  hofId: string;
  submission: HofDashboardSubmission;
  progress: SubmissionProgress;
  criteria: string[];
  locale: Locale;
  uploads: Record<string, UploadInProgress>;
  onUpload: (file: File, kind: HofFileKind) => void;
}> = ({ hofId, submission, progress, criteria, locale, uploads, onUpload }) => {
  const [safetyRisk, answerSafetyRisk] = useSafetyRiskAnswer(
    hofId,
    submission.type,
    submission.elevatedSafetyRisk,
    locale,
  );
  const plans = submission.files.filter((file) => file.kind === 'plan');
  const safetyConcepts = submission.files.filter((file) => file.kind === 'safetyConcept');
  const id = useId();
  const questionId = `${id}-question`;
  const revisionRequested = submission.status === 'revisionRequired';
  const titleId = `${id}-title`;

  return (
    <article
      data-submission={submission.type}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="scroll-mt-24 space-y-4 p-5 outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-inset @xl:p-6"
    >
      <header className="space-y-1">
        <h3 id={titleId} className="text-base font-bold text-gray-900">
          {HOF_SUBMISSION_TYPE_LABELS[submission.type][locale]}
        </h3>
        <ProgressLine progress={progress} status={submission.status} locale={locale} />
      </header>

      {submission.feedback !== undefined && submission.feedback !== '' && (
        // amber while it asks for something; once a new version is in, it is only a record
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            revisionRequested
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-gray-200 bg-gray-50 text-gray-700',
          )}
        >
          <p className="font-semibold">
            {translate(revisionRequested ? 'feedback' : 'lastFeedback', locale)}
          </p>
          <p className="whitespace-pre-line">{submission.feedback}</p>
        </div>
      )}

      <FilesWithUpload
        files={plans}
        primary={revisionRequested}
        upload={uploads[uploadKey(submission.type, 'plan')]}
        locale={locale}
        onFile={(file) => onUpload(file, 'plan')}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 pt-4">
        <span id={questionId} className="basis-full text-sm font-medium text-gray-900">
          {translate('safetyRiskQuestion', locale)}
        </span>
        <SafetyRiskChoice
          value={safetyRisk}
          labelledBy={questionId}
          locale={locale}
          onChange={answerSafetyRisk}
        />
        {criteria.length > 0 && <SafetyCriteriaDialog criteria={criteria} locale={locale} />}
      </div>

      {/* a concept handed in stays listed even if the answer changes to no */}
      {(safetyRisk === 'yes' || safetyConcepts.length > 0) && (
        <div
          className={cn(
            'space-y-3 rounded-lg border p-4',
            safetyRisk === 'yes' && safetyConcepts.length === 0
              ? 'border-amber-200 bg-amber-50'
              : 'border-gray-100 bg-gray-50',
          )}
        >
          {safetyConcepts.length === 0 ? (
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {translate('safetyConceptRequired', locale)}
              </p>
              <p className="text-sm text-gray-600">{translate('safetyConceptHint', locale)}</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-900">
              {translate('safetyConcept', locale)}
            </p>
          )}
          {safetyRisk === 'yes' ? (
            <FilesWithUpload
              files={safetyConcepts}
              upload={uploads[uploadKey(submission.type, 'safetyConcept')]}
              locale={locale}
              onFile={(file) => onUpload(file, 'safetyConcept')}
            />
          ) : (
            // without an elevated risk no new concept is asked for; the one handed in stays
            <FileList files={safetyConcepts} locale={locale} />
          )}
        </div>
      )}
    </article>
  );
};
