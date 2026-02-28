import { environmentVariables } from '@/config/environment-variables';
import { updateWorkflowStatus } from '@/features/payload-cms/payload-cms/utils/update-workflow-status';
import type { WorkflowConfig } from 'payload';
import { z } from 'zod';

const BrevoContactWorkflowInputSchema = z.object({
  input: z.object({
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    abteilung: z.string().optional(),
    region: z.string().optional(),
    formSubmissionId: z.string().optional(),
    formName: z.string().optional(),
    locale: z.string().optional(),
  }),
});

export const brevoContactWorkflow: WorkflowConfig<'brevoContactWorkflow'> = {
  slug: 'brevoContactWorkflow',
  queue: 'workflows',
  retries: 1,
  inputSchema: [{ name: 'input', type: 'json', required: true }],
  handler: async ({ job, req }) => {
    // 1. Validate Input
    const parseResult = BrevoContactWorkflowInputSchema.safeParse(job.input);
    if (!parseResult.success) {
      throw new Error(`[brevoContactWorkflow] Invalid Input: ${parseResult.error.message}`);
    }

    const { input: workflowInput } = parseResult.data;

    try {
      if (!environmentVariables.BREVO_API_KEY) {
        throw new Error('[brevoContactWorkflow] BREVO_API_KEY is not defined in the environment.');
      }

      const attributes: Record<string, string> = {};
      if (workflowInput.firstName) attributes['FIRSTNAME'] = workflowInput.firstName;
      if (workflowInput.lastName) attributes['LASTNAME'] = workflowInput.lastName;
      if (workflowInput.phone) attributes['PHONE'] = workflowInput.phone;
      if (workflowInput.abteilung) attributes['ABTEILUNG'] = workflowInput.abteilung;
      if (workflowInput.region) attributes['REGION'] = workflowInput.region;
      if (workflowInput.formSubmissionId) attributes['EXT_ID'] = workflowInput.formSubmissionId;
      if (workflowInput.formName) attributes['WEBPAGE_FORM'] = workflowInput.formName;

      const response = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': environmentVariables.BREVO_API_KEY,
        },
        body: JSON.stringify({
          email: workflowInput.email,
          updateEnabled: true,
          attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `[brevoContactWorkflow] Failed to sync contact. Status: ${response.status}. Message: ${errorText}`,
        );
      }

      if (typeof workflowInput.formSubmissionId === 'string') {
        await updateWorkflowStatus(
          req.payload,
          workflowInput.formSubmissionId,
          'brevoContactWorkflow',
          'success',
        );
      }
    } catch (error: unknown) {
      if (typeof workflowInput.formSubmissionId === 'string') {
        await updateWorkflowStatus(
          req.payload,
          workflowInput.formSubmissionId,
          'brevoContactWorkflow',
          'error',
        );
      }
      throw error;
    }
  },
};
