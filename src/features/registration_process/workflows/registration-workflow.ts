import type { WorkflowConfig } from 'payload';

interface RegistrationInput {
  resolvedUserId?: string;
  [key: string]: unknown;
}

export const registrationWorkflow: WorkflowConfig<'registrationWorkflow'> = {
  slug: 'registrationWorkflow',
  inputSchema: [
    {
      name: 'input',
      type: 'json',
      required: true,
    },
  ],
  handler: async ({ job, tasks }) => {
    const jobInput = job.input as unknown as { input: RegistrationInput };
    const registrationData = jobInput.input;

    const typedTasks = tasks as unknown as {
      resolveUser: (
        taskId: string,
        options: { input: unknown },
      ) => Promise<{ reason: string; status: 'ambiguous' | 'created' | 'found'; userId: string }>;
      blockJob: (
        taskId: string,
        options: {
          input: {
            workflowSlug: string;
            originalInput: unknown;
          };
        },
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
        options: { input: { userId: string } },
      ) => Promise<{ sent: boolean }>;
    };

    let currentUserId: string;

    // Check if we have a resolvedUserId (this is a resumed workflow after resolution)
    if (registrationData.resolvedUserId !== undefined && registrationData.resolvedUserId !== '') {
      currentUserId = registrationData.resolvedUserId;
    } else {
      // Phase 1: Resolve User
      const resolveResult = await typedTasks.resolveUser('1', {
        input: registrationData,
      });

      currentUserId = resolveResult.userId;

      // Phase 1.1: Block job if ambiguous
      if (resolveResult.status === 'ambiguous') {
        const blockResult = await typedTasks.blockJob('2', {
          input: {
            workflowSlug: 'registrationWorkflow',
            originalInput: registrationData,
          },
        });

        // If blocked, end workflow gracefully (a new job will be triggered upon resolution)
        if (blockResult.blocked) {
          return;
        }
      }
    }

    // Phase 2: Ensure Group Membership
    await typedTasks.ensureGroupMembership('3', {
      input: { userId: currentUserId },
    });

    // Phase 3: Ensure Event Membership
    await typedTasks.ensureEventMembership('4', {
      input: { userId: currentUserId },
    });

    // Phase 4: Confirmation Message
    await typedTasks.confirmationMessage('5', {
      input: { userId: currentUserId },
    });
  },
};
