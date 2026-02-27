import { environmentVariables } from '@/config/environment-variables';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import {
  convertLexicalToHTML,
  defaultHTMLConverters,
  type HTMLConverter,
} from '@payloadcms/richtext-lexical/html';
import type {
  SerializedEditorState,
  SerializedLexicalNode,
} from '@payloadcms/richtext-lexical/lexical';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';
import type { TaskConfig } from 'payload';

interface CustomAutoLinkNode extends SerializedLexicalNode {
  fields?: { url?: string };
  children?: SerializedLexicalNode[];
}

export const confirmationMessageStep: TaskConfig<{
  input: {
    email: string;
    formSubmissionId?: string;
    locale?: string;
    skip?: boolean;
    skipReason?: string;
  };
  output: { sent: boolean; skipped?: boolean; skipReason?: string };
}> = {
  slug: 'confirmationMessage',
  retries: 3,
  inputSchema: [
    { name: 'email', type: 'text', required: true },
    { name: 'formSubmissionId', type: 'text', required: false },
    { name: 'locale', type: 'text', required: false },
    { name: 'skip', type: 'checkbox', required: false },
    { name: 'skipReason', type: 'text', required: false },
  ],
  outputSchema: [
    { name: 'sent', type: 'checkbox' },
    { name: 'skipped', type: 'checkbox' },
    { name: 'skipReason', type: 'text' },
  ],
  handler: async ({ input, req }) => {
    const { logger } = req.payload;

    if (input.skip === true) {
      logger.info(`Skipping confirmation email: ${input.skipReason ?? 'Unknown reason'}`);
      return {
        output: { sent: false, skipped: true, skipReason: input.skipReason ?? 'Unknown reason' },
      };
    }

    if (input.email.length === 0) {
      logger.info('No email provided. Skipping confirmation email.');
      return { output: { sent: false, skipped: true, skipReason: 'No email provided' } };
    }

    try {
      // 1. Fetch Global Settings for Confirmation Email
      const registrationManagement = (await req.payload.findGlobal({
        slug: 'registration-management',
        locale: input.locale === 'fr' || input.locale === 'en' ? input.locale : 'de',
      })) as unknown as { confirmationEmail?: Record<string, unknown> | null };

      if (!registrationManagement.confirmationEmail) {
        logger.info('No confirmation email configured. Skipping.');
        return {
          output: { sent: false, skipped: true, skipReason: 'No confirmation email configured' },
        };
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
        registrationManagement.confirmationEmail,
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
        converters: {
          ...defaultHTMLConverters,
          autolink: (({ node, nodesToHTML, converters, parent }) => {
            const childrenText = nodesToHTML({
              converters,
              nodes: node.children ?? [],
              parent: { ...node, parent },
            }).join('');
            return `<a href="${node.fields?.url ?? ''}">${childrenText}</a>`;
          }) as HTMLConverter<CustomAutoLinkNode>,
        },
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

      logger.info(`Confirmation email sent to ${input.email}`);

      return {
        output: { sent: true },
      };
    } catch (error: unknown) {
      logger.error({
        msg: 'Failed to send confirmation email',
        err: error,
      });
      throw error;
    }
  },
};
