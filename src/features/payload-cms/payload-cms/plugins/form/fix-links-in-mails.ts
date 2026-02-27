import { environmentVariables } from '@/config/environment-variables';
import {
  type CustomAutoLinkNode,
  escapeHTML,
} from '@/features/payload-cms/payload-cms/utils/html-utils';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import config from '@payload-config';
import type { BeforeEmail, FormattedEmail } from '@payloadcms/plugin-form-builder/types';
import {
  convertLexicalToHTML,
  defaultHTMLConverters,
  type HTMLConverter,
} from '@payloadcms/richtext-lexical/html';
import { getPayload } from 'payload';
export const beforeEmailChangeHook: BeforeEmail = async (
  emailsToSend,
  beforeChangeParameters: unknown,
): Promise<FormattedEmail[]> => {
  const payload = await getPayload({ config });

  const formSubmissionDocument = (
    beforeChangeParameters as { doc: { id: string; form?: string | { id?: string } } }
  ).doc;
  const formSubmissionId = formSubmissionDocument.id;
  const formIdRaw = formSubmissionDocument.form;
  const formId = typeof formIdRaw === 'object' ? formIdRaw.id : formIdRaw;

  // Resolve links once for all emails
  const urlMap: Record<string, string> = {};
  let formDocument_: Record<string, unknown> | undefined;

  if (typeof formId === 'string' && formId.length > 0) {
    try {
      formDocument_ = (await payload.findByID({
        collection: 'forms',
        id: formId,
        depth: 0,
      })) as unknown as Record<string, unknown>;
    } catch {
      // ignore
    }

    const uuids = Array.isArray(formDocument_?.['emailReferencedIds'])
      ? (formDocument_['emailReferencedIds'] as string[])
      : [];

    if (uuids.length > 0) {
      const [genericPages, blogs, mapAnnotations] = await Promise.all([
        payload.find({ collection: 'generic-page', where: { id: { in: uuids } }, depth: 0 }),
        payload.find({ collection: 'blog', where: { id: { in: uuids } }, depth: 0 }),
        environmentVariables.FEATURE_ENABLE_APP_FEATURE
          ? payload.find({
              collection: 'camp-map-annotations',
              where: { id: { in: uuids } },
              depth: 0,
            })
          : { docs: [] as { id: string }[] },
      ]);

      for (const document_ of genericPages.docs) {
        urlMap[document_.id] =
          `${environmentVariables.APP_HOST_URL}/${document_._locale}/${(document_.seo as Record<string, unknown>)['urlSlug'] as string}`.replaceAll(
            /([^:]\/)\/+/g,
            '$1',
          );
      }
      for (const document_ of blogs.docs) {
        urlMap[document_.id] =
          `${environmentVariables.APP_HOST_URL}/${document_._locale}/blog/${(document_.seo as Record<string, unknown>)['urlSlug'] as string}`.replaceAll(
            /([^:]\/)\/+/g,
            '$1',
          );
      }
      for (const document_ of mapAnnotations.docs as { id: string }[]) {
        if (typeof document_.id === 'string') {
          urlMap[document_.id] =
            `${environmentVariables.APP_HOST_URL}/app/map?locationId=${document_.id}`;
        }
      }
    }
  }

  // --- Lexical Re-generation start ---
  const submissionDataArray =
    (formSubmissionDocument as { submissionData?: unknown[] }).submissionData ?? [];
  const submissionDict: Record<string, string> = {
    formSubmissionID: String(formSubmissionId),
  };

  const extractStringValue = (val: unknown): string => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    return '';
  };

  for (const item of submissionDataArray) {
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
  // --- Lexical Re-generation end ---

  const finalEmails = emailsToSend.map((email, index) => {
    let updatedHtml = email.html;

    // 1. Rebuild HTML if it was Lexical
    const formEmails = formDocument_?.['emails'];
    const originalEmailConfig = Array.isArray(formEmails)
      ? (formEmails as Array<{ message?: unknown }>)[index]
      : undefined;
    if (
      originalEmailConfig !== undefined &&
      originalEmailConfig.message !== null &&
      typeof originalEmailConfig.message === 'object' &&
      !Array.isArray(originalEmailConfig.message) &&
      'root' in originalEmailConfig.message
    ) {
      const lexicalData = structuredClone(originalEmailConfig.message) as MinimalLexicalNode & {
        root?: MinimalLexicalNode;
      };
      if (lexicalData.root && Array.isArray(lexicalData.root.children)) {
        for (const child of lexicalData.root.children) {
          replaceVariables(child);
        }
      }

      updatedHtml = `<div>${convertLexicalToHTML({
        converters: {
          ...defaultHTMLConverters,
          autolink: (({
            node,
            nodesToHTML,
            converters,
            parent,
          }: Parameters<Exclude<HTMLConverter<CustomAutoLinkNode>, string>>[0]) => {
            const childrenText = nodesToHTML({
              converters,
              nodes: node.children ?? [],
              parent: { ...node, parent },
            }).join('');
            return `<a href="${escapeHTML(node.fields?.url ?? '')}">${childrenText}</a>`;
          }) as HTMLConverter<CustomAutoLinkNode>,
        },
        data: lexicalData as unknown as Parameters<typeof convertLexicalToHTML>[0]['data'],
      })}</div>`;
    }

    if (Object.keys(urlMap).length > 0) {
      // Replace all pre-fetched UUIDs
      for (const [id, url] of Object.entries(urlMap)) {
        const idRegex = new RegExp(`href=["']${id}["']|href=["']about:blank#${id}["']`, 'gi');
        updatedHtml = updatedHtml.replace(idRegex, `href="${url}"`);
      }
    }

    return {
      ...email,
      html: updatedHtml,
    };
  });

  if (typeof formSubmissionId !== 'string' || formSubmissionId.length === 0) {
    throw new Error('formSubmissionId is required to send emails but was not provided.');
  }

  // Use a sequential loop to avoid race conditions when updating form submission documents
  for (const email of finalEmails) {
    try {
      await sendTrackedEmail(payload, email, formSubmissionId);
    } catch (error: unknown) {
      payload.logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
        msg: `sendTrackedEmail failed for email to: ${email.to}`,
      });
    }
  }

  // Return empty array so the plugin doesn't send duplicate emails
  return [];
};
