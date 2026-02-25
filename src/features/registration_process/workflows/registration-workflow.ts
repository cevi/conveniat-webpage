import {
  RegistrationWorkflowInputSchema,
  type ResolveUserByDetails,
  type ResolveUserOutput,
} from '@/features/registration_process/hitobito-api/schemas';
import type { WorkflowConfig } from 'payload';

interface CreateUserOutput {
  personId: string;
  success: boolean;
  error?: string | null;
}

interface BlockJobOutput {
  blocked: boolean;
}

export const registrationWorkflow: WorkflowConfig<'registrationWorkflow'> = {
  slug: 'registrationWorkflow',
  queue: 'workflows',
  retries: 1,
  inputSchema: [{ name: 'input', type: 'json', required: true }],
  handler: async ({ job, tasks }) => {
    // 1. Validate Input
    const parseResult = RegistrationWorkflowInputSchema.safeParse(job.input);
    if (!parseResult.success) {
      throw new Error(`[registrationWorkflow] Invalid Input: ${parseResult.error.message}`);
    }

    const { input: workflowInput } = parseResult.data;

    // 2. Determine User ID (Resumed, Resolved, or Forced Create)
    let currentUserId: string | undefined = workflowInput.resolvedUserId;

    if (currentUserId === undefined) {
      if (workflowInput.forceCreateUser === true && 'email' in workflowInput) {
        // 2a. Force Create User
        const details = workflowInput as ResolveUserByDetails;
        const creation = (await tasks.createUser('1', {
          input: {
            firstName: details.firstName,
            lastName: details.lastName,
            email: details.email,
            nickname: details.nickname ?? '',
          },
        })) as unknown as CreateUserOutput;

        if (creation.success) {
          currentUserId = creation.personId;
        } else {
          throw new Error(`[registrationWorkflow] Forced user creation failed: ${creation.error}`);
        }
      } else {
        // 2b. Automated/Manual Resolution
        /* eslint-disable unicorn/no-null */
        const resolution = (await tasks.resolveUser('1', {
          input: {
            peopleId: workflowInput.peopleId ?? null,
            firstName:
              'firstName' in workflowInput && typeof workflowInput.firstName === 'string'
                ? workflowInput.firstName
                : null,
            lastName:
              'lastName' in workflowInput && typeof workflowInput.lastName === 'string'
                ? workflowInput.lastName
                : null,
            email:
              'email' in workflowInput && typeof workflowInput.email === 'string'
                ? workflowInput.email
                : null,
            nickname:
              'nickname' in workflowInput && typeof workflowInput.nickname === 'string'
                ? workflowInput.nickname
                : null,
            birthDate:
              'birthDate' in workflowInput && typeof workflowInput.birthDate === 'string'
                ? workflowInput.birthDate
                : null,
            address:
              'address' in workflowInput && typeof workflowInput.address === 'string'
                ? workflowInput.address
                : null,
            company:
              'company' in workflowInput && typeof workflowInput.company === 'string'
                ? workflowInput.company
                : null,
          },
        })) as unknown as ResolveUserOutput;
        /* eslint-enable unicorn/no-null */
        currentUserId = resolution.peopleId;

        // 2c. Handle Ambiguity
        if (resolution.status === 'ambiguous') {
          const blockResult = (await tasks.blockJob('2', {
            input: {
              workflowSlug: 'registrationWorkflow',
              originalInput: workflowInput,
              reason: resolution.reason,
            },
          })) as unknown as BlockJobOutput;

          if (blockResult.blocked === true) return;
        }
      }
    }

    // 3. Execute Post-Resolution Steps
    if (currentUserId.length === 0) {
      throw new Error('[registrationWorkflow] User ID missing after resolution');
    }

    const ensureGrpResult = (await tasks.ensureGroupMembership('3', {
      input: {
        userId: currentUserId,
      },
    })) as unknown as {
      success: boolean;
      approvalRequired?: boolean;
      approvalGroupName?: string;
      approvalGroupUrl?: string;
    };

    if (ensureGrpResult.approvalRequired === true) {
      const blockResult = (await tasks.blockJob('6', {
        input: {
          workflowSlug: 'registrationWorkflow',
          originalInput: { ...workflowInput, resolvedUserId: currentUserId },
          reason: `Manuelle Freigabe in Hitobito ausstehend durch die Gruppe: <a href="https://cevi.hitobito.ch${ensureGrpResult.approvalGroupUrl ?? ''}" target="_blank" rel="noopener noreferrer">${ensureGrpResult.approvalGroupName ?? 'Unbekannte Gruppe'}</a>`,
        },
      })) as unknown as BlockJobOutput;

      if (blockResult.blocked === true) return;
    }

    await tasks.ensureEventMembership('4', {
      input: {
        userId: currentUserId,
      },
    });

    // Only send confirmation if email is present in the input (from form submission)
    if (
      'email' in workflowInput &&
      typeof workflowInput.email === 'string' &&
      workflowInput.email.length > 0
    ) {
      await tasks.confirmationMessage('5', {
        input: {
          email: workflowInput.email,
          ...(typeof workflowInput.formSubmissionId === 'string'
            ? { formSubmissionId: workflowInput.formSubmissionId }
            : {}),
          ...(typeof workflowInput.locale === 'string' ? { locale: workflowInput.locale } : {}),
        },
      });
    }
  },
};
