import { updateWorkflowStatus } from '@/features/payload-cms/payload-cms/utils/update-workflow-status';
import {
  RegistrationWorkflowInputSchema,
  ResolveUserOutputSchema,
  type ResolveUserByDetails,
} from '@/features/registration_process/hitobito-api/schemas';
import type { WorkflowConfig } from 'payload';

import { z } from 'zod';

const CreateUserOutputSchema = z.object({
  personId: z.string(),
  success: z.boolean(),
  error: z.string().nullable().optional(),
});

const BlockJobOutputSchema = z.object({
  blocked: z.boolean(),
});

const EnsureGroupMembershipResultSchema = z.object({
  success: z.boolean(),
  approvalRequired: z.boolean().optional(),
  approvalGroupName: z.string().optional(),
  approvalGroupUrl: z.string().optional(),
  status: z.string().optional(),
});

const EnsureEventMembershipResultSchema = z.object({
  success: z.boolean(),
  participationId: z.string().optional(),
  status: z.string().optional(),
});

export const registrationWorkflow: WorkflowConfig<'registrationWorkflow'> = {
  slug: 'registrationWorkflow',
  queue: 'workflows',
  retries: 1,
  inputSchema: [{ name: 'input', type: 'json', required: true }],
  handler: async ({ job, tasks, req }) => {
    // 1. Validate Input
    const parseResult = RegistrationWorkflowInputSchema.safeParse(job.input);
    if (!parseResult.success) {
      throw new Error(`[registrationWorkflow] Invalid Input: ${parseResult.error.message}`);
    }

    const { input: workflowInput } = parseResult.data;

    try {
      // 2. Determine User ID (Resumed, Resolved, or Forced Create)
      let currentUserId: string | undefined = workflowInput.resolvedUserId;

      if (currentUserId === undefined) {
        if (workflowInput.forceCreateUser === true && 'email' in workflowInput) {
          // 2a. Force Create User
          const details = workflowInput as ResolveUserByDetails;
          const creation = CreateUserOutputSchema.parse(
            await tasks.createUser('1', {
              input: {
                firstName: details.firstName,
                lastName: details.lastName,
                email: details.email,
                nickname: details.nickname ?? '',
              },
            }),
          );

          if (creation.success) {
            currentUserId = creation.personId;
          } else {
            throw new Error(
              `[registrationWorkflow] Forced user creation failed: ${creation.error}`,
            );
          }
        } else {
          // 2b. Automated/Manual Resolution
          /* eslint-disable unicorn/no-null */
          const resolution = ResolveUserOutputSchema.parse(
            await tasks.resolveUser('1', {
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
            }),
          );
          /* eslint-enable unicorn/no-null */
          currentUserId = resolution.peopleId;

          // 2c. Handle Ambiguity
          if (resolution.status === 'ambiguous') {
            const blockResult = BlockJobOutputSchema.parse(
              await tasks.blockJob('2', {
                input: {
                  workflowSlug: 'registrationWorkflow',
                  originalInput: workflowInput,
                  reason: resolution.reason,
                },
              }),
            );

            if (blockResult.blocked === true) return;
          }
        }
      }

      // 3. Execute Post-Resolution Steps
      if (typeof currentUserId !== 'string' || currentUserId.length === 0) {
        throw new Error('[registrationWorkflow] User ID missing after resolution');
      }

      const ensureGrpResult = EnsureGroupMembershipResultSchema.parse(
        await tasks.ensureGroupMembership('3', {
          input: {
            userId: currentUserId,
          },
        }),
      );

      if (ensureGrpResult.approvalRequired === true) {
        const blockResult = BlockJobOutputSchema.parse(
          await tasks.blockJob('6', {
            input: {
              workflowSlug: 'registrationWorkflow',
              originalInput: { ...workflowInput, resolvedUserId: currentUserId },
              reason: 'Manuelle Freigabe in Hitobito ausstehend durch die Gruppe',
            },
          }),
        );

        if (blockResult.blocked === true) return;
      }

      const ensureEventResult = EnsureEventMembershipResultSchema.parse(
        await tasks.ensureEventMembership('4', {
          input: {
            userId: currentUserId,
          },
        }),
      );

      const skipConfirmation =
        ensureGrpResult.status === 'exists' && ensureEventResult.status === 'exists';

      await tasks.confirmationMessage('5', {
        input: {
          email:
            'email' in workflowInput && typeof workflowInput.email === 'string'
              ? workflowInput.email
              : '',
          ...(typeof workflowInput.formSubmissionId === 'string'
            ? { formSubmissionId: workflowInput.formSubmissionId }
            : {}),
          ...(typeof workflowInput.locale === 'string' ? { locale: workflowInput.locale } : {}),
          ...('email' in workflowInput &&
          typeof workflowInput.email === 'string' &&
          workflowInput.email.length > 0 &&
          skipConfirmation
            ? {
                skip: true,
                skipReason:
                  'User already exists on both the event and in the group. Skipping confirmation email.',
              }
            : {}),
        },
      });

      if (typeof workflowInput.formSubmissionId === 'string') {
        await updateWorkflowStatus(
          req.payload,
          workflowInput.formSubmissionId,
          'registrationWorkflow',
          'success',
        );
      }
    } catch (error: unknown) {
      if (typeof workflowInput.formSubmissionId === 'string') {
        await updateWorkflowStatus(
          req.payload,
          workflowInput.formSubmissionId,
          'registrationWorkflow',
          'error',
        );
      }
      throw error;
    }
  },
};
