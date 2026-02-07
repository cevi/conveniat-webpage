import { JsonBlock } from '@/components/ui/json-block';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import type { Config as PayloadConfig } from '@/features/payload-cms/payload-types';
import { DiffView } from '@/features/registration_process/components/job-table/diff-view';
import {
  DetailRow,
  flattenObject,
  renderValue,
} from '@/features/registration_process/components/job-table/job-details-shared';
import type {
  Candidate,
  RegistrationJob,
} from '@/features/registration_process/components/job-table/types';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Hash,
  RotateCw,
  User,
} from 'lucide-react';
import React from 'react';

const rejectTitleString: StaticTranslationString = {
  en: 'Reject Workflow',
  de: 'Workflow ablehnen',
  fr: 'Rejeter le flux',
};

const rejectMessageString: StaticTranslationString = {
  en: 'Are you sure you want to permanently reject this registration workflow? The user will not be processed further.',
  de: 'Sind Sie sicher, dass Sie diesen Registrierungs-Workflow dauerhaft ablehnen möchten? Der Benutzer wird nicht weiter verarbeitet.',
  fr: "Êtes-vous sûr de vouloir rejeter définitivement ce flux d'inscription ? L'utilisateur ne sera plus traité.",
};

const rejectConfirmLabelString: StaticTranslationString = {
  en: 'Reject Workflow',
  de: 'Workflow ablehnen',
  fr: 'Rejeter le flux',
};

const rejectingTextString: StaticTranslationString = {
  en: 'Rejecting...',
  de: 'Wird abgelehnt...',
  fr: 'Rejet en cours...',
};

interface JobOverviewProperties {
  job: RegistrationJob;
  onResolve: (options: { resolvedUserId?: string; forceCreateUser?: boolean }) => Promise<void>;
  onReject: () => Promise<void>;
  isResolving: boolean;
  locale: PayloadConfig['locale'];
}

export const JobOverview: React.FC<JobOverviewProperties> = ({
  job,
  onResolve,
  onReject,
  isResolving,
  locale,
}) => {
  const [copiedError, setCopiedError] = React.useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = React.useState(false);
  const [manualPersonId, setManualPersonId] = React.useState('');
  const [isOtherActionsOpen, setIsOtherActionsOpen] = React.useState(false);

  // Extract candidates from resolveUser task output
  const resolveUserLog = job.log?.find((l) => l.taskSlug === 'resolveUser');
  const candidatesOutput = resolveUserLog?.output as
    | { candidates?: Candidate[] | null }
    | undefined;
  const candidates = [...(candidatesOutput?.candidates ?? [])].sort((a, b) => {
    const scoreA = a.score ?? 0;
    const scoreB = b.score ?? 0;
    return scoreB - scoreA;
  });

  // Parse error if it exists and looks like the Zod/Validation error from the user's screenshot
  const errorObject = job.log?.find((l) => l.state === 'failed')?.error as
    | { message?: string | string[] }
    | undefined;

  const handleCopyError = (): void => {
    if (!errorObject) return;
    const textToCopy = JSON.stringify(errorObject, undefined, 2);
    void navigator.clipboard.writeText(textToCopy);
    setCopiedError(true);
    setTimeout(() => setCopiedError(false), 2000);
  };

  let errorMessage: React.ReactNode;

  if (errorObject) {
    const rawMessage = Array.isArray(errorObject.message)
      ? errorObject.message.join('\n')
      : errorObject.message;

    if (typeof rawMessage === 'string') {
      let parsedData: unknown;
      try {
        // Try to extract JSON from the error message if it contains "Invalid input schema ... ["
        const jsonStart = rawMessage.indexOf('[');
        const jsonEnd = rawMessage.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = rawMessage.slice(jsonStart, jsonEnd + 1);
          parsedData = JSON.parse(jsonString) as unknown;
        }
      } catch {
        // Fallback to raw message if parsing fails
      }

      errorMessage =
        parsedData !== undefined && parsedData !== null ? (
          <div className="mt-2 text-xs">
            <p className="mb-2 font-medium text-red-600 dark:text-red-400">
              Schema Validation Errors:
            </p>
            <div className="relative">
              <button
                onClick={handleCopyError}
                className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white/50 hover:bg-red-100 dark:border-red-900/30 dark:bg-black/20 dark:hover:bg-red-900/50"
                title="Copy JSON"
              >
                {copiedError ? (
                  <Check className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Copy className="h-4 w-4 text-red-600/70 dark:text-red-400/70" />
                )}
              </button>
              <JsonBlock
                data={parsedData}
                className="border-red-100 bg-red-50/50 break-all whitespace-pre-wrap text-red-700 dark:border-red-900/30 dark:bg-red-950/10 dark:text-red-300"
              />
            </div>
          </div>
        ) : (
          rawMessage
        );
    }
  }

  const rawInput = (job.input ?? {}) as Record<string, unknown>;
  const inputData = (rawInput['input'] as Record<string, unknown> | undefined) ?? rawInput;

  return (
    <div className="grid gap-6">
      {/* Error Section */}
      {job.hasError === true && (
        <div className="rounded-xl border border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-900/10">
          <div className="px-6 py-3 pb-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              Error Analysis
            </h3>
          </div>
          <div className="px-6 pb-4 text-xs text-red-600 dark:text-red-300">
            {errorMessage ?? 'Unknown error occurred'}
          </div>
        </div>
      )}
      {/* Approval Section */}
      {job.blockedJobId !== undefined && (
        <div className="rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800">
          <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Approval Required
            </h3>
          </div>
          <div className="p-6">
            <p className="mb-6 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {job.blockedReason ?? 'This job requires manual review before it can proceed.'}
            </p>

            <div className="flex flex-col gap-6">
              {/* Candidates List */}
              {candidates.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h4 className="flex items-center justify-between text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                    <span>Potential Matches Found ({candidates.length})</span>
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {candidates.map((candidate) => {
                      return (
                        <div
                          key={candidate.personId}
                          className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="rounded-full bg-zinc-100 p-1.5 dark:bg-zinc-800">
                                <User className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                  {candidate.personLabel}
                                </span>
                                <span className="font-mono text-[10px] text-zinc-500">
                                  ID: {candidate.personId}
                                </span>
                              </div>
                            </div>
                          </div>

                          {candidate.details && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                              {typeof candidate.details.email === 'string' &&
                                candidate.details.email !== '' && (
                                  <div className="flex flex-col">
                                    <span className="text-zinc-400 uppercase">Email</span>
                                    <span className="truncate text-zinc-700 dark:text-zinc-300">
                                      {candidate.details.email}
                                    </span>
                                  </div>
                                )}
                              {typeof candidate.details.birthday === 'string' &&
                                candidate.details.birthday !== '' && (
                                  <div className="flex flex-col">
                                    <span className="text-zinc-400 uppercase">Birthday</span>
                                    <span className="text-zinc-700 dark:text-zinc-300">
                                      {candidate.details.birthday}
                                    </span>
                                  </div>
                                )}
                            </div>
                          )}

                          <DiffView candidate={candidate} inputData={inputData} />

                          <button
                            type="button"
                            onClick={() => void onResolve({ resolvedUserId: candidate.personId })}
                            disabled={isResolving}
                            className="w-full rounded-md bg-emerald-600 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Select & Continue
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setIsOtherActionsOpen(!isOtherActionsOpen)}
                  className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-zinc-500 uppercase hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  {isOtherActionsOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Other Actions
                </button>
                {isOtherActionsOpen && (
                  <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-transparent p-4 dark:border-zinc-800">
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="manualPersonId"
                        className="text-[10px] font-bold text-zinc-500 uppercase dark:text-zinc-400"
                      >
                        Link Manual People ID
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="manualPersonId"
                          type="text"
                          value={manualPersonId}
                          onChange={(event_) => setManualPersonId(event_.target.value)}
                          placeholder="e.g. 12345"
                          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-0 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                        <button
                          type="button"
                          onClick={() => void onResolve({ resolvedUserId: manualPersonId })}
                          disabled={isResolving || manualPersonId.trim() === ''}
                          className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-none transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                        >
                          {isResolving ? 'Processing...' : 'Link & Continue'}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2 border-t border-zinc-100 pt-3 sm:grid-cols-2 dark:border-zinc-800">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => void onResolve({ forceCreateUser: true })}
                          disabled={isResolving}
                          className={cn(
                            'inline-flex cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-xs font-bold transition-all disabled:opacity-50',
                            'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40',
                          )}
                        >
                          {isResolving ? 'Processing...' : 'Create New User'}
                        </button>
                      </div>
                      <ConfirmationModal
                        isOpen={isRejectModalOpen}
                        onClose={() => setIsRejectModalOpen(false)}
                        onConfirm={() => {
                          void onReject();
                          setIsRejectModalOpen(false);
                        }}
                        message={rejectMessageString[locale]}
                        isSubmitting={isResolving}
                        locale={locale}
                        title={rejectTitleString[locale]}
                        confirmLabel={rejectConfirmLabelString[locale]}
                        submittingText={rejectingTextString[locale]}
                        confirmVariant="danger"
                      />
                      <button
                        type="button"
                        onClick={() => setIsRejectModalOpen(true)}
                        disabled={isResolving}
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition-all hover:bg-red-100 disabled:opacity-50 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Reject Workflow
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Grid - Integrated into the right column */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800">
          <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Metadata</h3>
          </div>
          <div className="p-4">
            <DetailRow
              icon={Hash}
              label="Job ID"
              value={<span className="font-mono">{job.id}</span>}
            />
            <DetailRow icon={Database} label="Queue" value="default" />
            <DetailRow icon={RotateCw} label="Attempts" value={String(job.totalTried ?? 1)} />
            <DetailRow
              icon={Calendar}
              label="Created"
              value={new Date(job.createdAt).toLocaleString()}
            />
            {job.completedAt !== undefined && (
              <DetailRow
                icon={Clock}
                label="Completed"
                value={new Date(job.completedAt).toLocaleString()}
              />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800">
          <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Input Data</h3>
          </div>
          <div className="p-4">
            {Object.entries(flattenObject(inputData)).map(([key, value]) => (
              <DetailRow
                key={key}
                label={key}
                value={<span className="wrap-break-word">{renderValue(value)}</span>}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
