import type {
  ResolveUserInput,
  ResolveUserOutput,
} from '@/features/registration_process/hitobito-api/schemas';

export interface RegistrationWorkflowTasks {
  resolveUser: (taskId: string, input: ResolveUserInput) => Promise<ResolveUserOutput>;

  blockJob: (
    taskId: string,
    options: { input: { workflowSlug: string; originalInput: unknown } },
  ) => Promise<{ blocked: boolean }>;

  ensureGroupMembership: (
    taskId: string,
    options: { input: { userId: string } },
  ) => Promise<{ success: boolean }>;

  ensureEventMembership: (
    taskId: string,
    options: { input: { userId: string } },
  ) => Promise<{ success: boolean }>;

  confirmationMessage: (
    taskId: string,
    options: { input: { email: string; formSubmissionId?: string; locale?: string } },
  ) => Promise<{ sent: boolean }>;
}
