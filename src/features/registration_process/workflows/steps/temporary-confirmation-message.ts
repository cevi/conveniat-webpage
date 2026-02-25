import { environmentVariables } from '@/config/environment-variables';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import { convertLexicalToHTML, defaultHTMLConverters } from '@payloadcms/richtext-lexical/html';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';
import type { TaskConfig } from 'payload';

export const temporaryConfirmationMessageStep: TaskConfig<{
  input: { email: string; formSubmissionId?: string; locale?: string };
  output: { sent: boolean };
}> = {
  slug: 'temporaryConfirmationMessage',
  retries: 3,
  inputSchema: [
    { name: 'email', type: 'text', required: true },
    { name: 'formSubmissionId', type: 'text', required: false },
    { name: 'locale', type: 'text', required: false },
  ],
  outputSchema: [{ name: 'sent', type: 'checkbox' }],
  handler: async ({ input, req }) => {
    const { logger } = req.payload;

    if (input.email.length === 0) {
      logger.info('No email provided. Skipping temporary confirmation email.');
      return { output: { sent: false } };
    }

    try {
      // 1. Fetch Global Settings for Temporary Confirmation Email
      const registrationManagement = (await req.payload.findGlobal({
        slug: 'registration-management',
        locale: input.locale === 'fr' || input.locale === 'en' ? input.locale : 'de',
      })) as unknown as { temporaryConfirmationEmail?: Record<string, unknown> | null };

      if (!registrationManagement.temporaryConfirmationEmail) {
        logger.info('No temporary confirmation email configured. Skipping.');
        return { output: { sent: false } };
      }

      let submissionData: unknown[] = [];

      // 2. Fetch Form Submission Data for Variable Replacement
      if (typeof input.formSubmissionId === 'string' && input.formSubmissionId.length > 0) {
        try {
          const formSubmission = (await req.payload.findByID({
            collection: 'form-submissions',
            id: input.formSubmissionId,
            depth: 0,
          })) as unknown as { submissionData?: unknown[] };

          if (Array.isArray(formSubmission.submissionData)) {
            submissionData = formSubmission.submissionData;
          }
        } catch (error: unknown) {
          logger.warn({
            msg: `Could not fetch form submission ${input.formSubmissionId}`,
            err: error,
          });
        }
      }

      // 3. Variable Replacement
      // We recursively search through the lexical document for text nodes and replace {{fieldId}}
      // with values from submissionData.
      const lexicalData = structuredClone(
        registrationManagement.temporaryConfirmationEmail,
      ) as unknown as SerializedEditorState;

      const submissionDict: Record<string, string> = {};

      const extractStringValue = (val: unknown): string => {
        if (typeof val === 'string') return val;
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        return '';
      };

      for (const item of submissionData) {
        if (
          item !== null &&
          typeof item === 'object' &&
          'field' in item &&
          typeof item.field === 'string' &&
          'value' in item
        ) {
          submissionDict[item.field] = extractStringValue(item.value);
        }
      }

      interface MinimalLexicalNode {
        type: string;
        text?: string;
        children?: MinimalLexicalNode[];
      }

      const replaceVariables = (node: MinimalLexicalNode): void => {
        if (typeof node === 'object') {
          if (node.type === 'text' && typeof node.text === 'string') {
            node.text = node.text.replaceAll(/\{\{([^}]+)\}\}/g, (match: string, p1: string) => {
              const key = p1.trim();
              return submissionDict[key] ?? match;
            });
          }
          if (Array.isArray(node.children)) {
            for (const child of node.children) {
              replaceVariables(child);
            }
          }
        }
      };

      if (Array.isArray(lexicalData.root.children)) {
        for (const child of lexicalData.root.children) {
          replaceVariables(child as MinimalLexicalNode);
        }
      }

      // 4. Serialize Lexical to HTML and Plaintext
      const htmlContent = convertLexicalToHTML({
        converters: defaultHTMLConverters,
        data: lexicalData,
      });
      const plainTextContent = convertLexicalToPlaintext({
        data: lexicalData,
      });

      // 5. Send Tracked Email
      await sendTrackedEmail(
        req.payload,
        {
          to: input.email,
          subject: 'Conveniat Helper Registration / Helferanmeldung',
          html: htmlContent,
          text: plainTextContent,
          from:
            typeof environmentVariables.SMTP_USER === 'string' &&
            environmentVariables.SMTP_USER.length > 0
              ? environmentVariables.SMTP_USER
              : 'noreply@cevi.tools',
        },
        input.formSubmissionId,
      );

      logger.info(`Temporary confirmation email sent to ${input.email}`);

      return {
        output: { sent: true },
      };
    } catch (error: unknown) {
      logger.error({
        msg: 'Failed to send temporary confirmation email',
        err: error,
      });
      throw error;
    }
  },
};
