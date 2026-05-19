import { environmentVariables } from '@/config/environment-variables';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import type { Config as PayloadConfig } from '@/features/payload-cms/payload-types';
import { JobCandidateCard } from '@/features/registration_process/components/job-table/job-overview-components/job-candidate-card';
import type {
  Candidate,
  RegistrationJob,
} from '@/features/registration_process/components/job-table/types';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
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

interface JobApprovalSectionProperties {
  job: RegistrationJob;
  onResolve: (options: { resolvedUserId?: string; forceCreateUser?: boolean }) => Promise<void>;
  onReject: () => Promise<void>;
  isResolving: boolean;
  locale: PayloadConfig['locale'];
  inputData: Record<string, unknown>;
}

export const JobApprovalSection: React.FC<JobApprovalSectionProperties> = ({
  job,
  onResolve,
  onReject,
  isResolving,
  locale,
  inputData,
}) => {
  const [isRejectModalOpen, setIsRejectModalOpen] = React.useState(false);
  const [manualPersonId, setManualPersonId] = React.useState('');
  const [isOtherActionsOpen, setIsOtherActionsOpen] = React.useState(false);

  // Extract candidates from resolveUser task output
  const resolveUserLog = job.log?.find((l) => l.taskSlug === 'resolveUser');
  const candidatesOutput = resolveUserLog?.output as
    | { candidates?: Candidate[] | undefined }
    | undefined;
  const candidates = [...(candidatesOutput?.candidates ?? [])].sort((a, b) => {
    const scoreA = a.score ?? 0;
    const scoreB = b.score ?? 0;
    return scoreB - scoreA;
  });

  const ensureGroupLog = job.log?.find((l) => l.taskSlug === 'ensureGroupMembership');
  const ensureGroupOutput = ensureGroupLog?.output as
    | { approvalGroupName?: string; approvalGroupUrl?: string; approvalRequired?: boolean }
    | undefined;

  if (job.blockedJobId === undefined) {
    return <></>;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800">
      <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
        <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Approval Required
        </h3>
      </div>
      <div className="p-6">
        <div className="mb-6 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {job.blockedReason === 'Manuelle Freigabe in Hitobito ausstehend durch die Gruppe' &&
          typeof ensureGroupOutput?.approvalGroupUrl === 'string' &&
          ensureGroupOutput.approvalGroupUrl.length > 0 ? (
            <>
              Manuelle Freigabe in Hitobito ausstehend durch die Gruppe:{' '}
              <a
                href={`${environmentVariables.NEXT_PUBLIC_HITOBITO_API_URL ?? ''}${ensureGroupOutput.approvalGroupUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline underline-offset-4 hover:opacity-80"
              >
                {ensureGroupOutput.approvalGroupName ?? 'Unbekannte Gruppe'}
              </a>
            </>
          ) : (
            <p>{job.blockedReason ?? 'This job requires manual review before it can proceed.'}</p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {/* Candidates List */}
          {candidates.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="flex items-center justify-between text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                <span>Potential Matches Found ({candidates.length})</span>
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {candidates.map((candidate) => (
                  <JobCandidateCard
                    key={candidate.personId}
                    candidate={candidate}
                    inputData={inputData}
                    onResolve={onResolve}
                    isResolving={isResolving}
                  />
                ))}
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
  );
};
