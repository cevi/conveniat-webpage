import { environmentVariables } from '@/config/environment-variables';
import {
  escapeHTML,
  type CustomAutoLinkNode,
} from '@/features/payload-cms/payload-cms/utils/html-utils';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import { MINIO_BUCKET_NAME, s3Client } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { FormattedEmail } from '@payloadcms/plugin-form-builder/types';
import {
  convertLexicalToHTML,
  defaultHTMLConverters,
  type HTMLConverter,
} from '@payloadcms/richtext-lexical/html';
import type { CollectionAfterChangeHook, Where } from 'payload';

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export const sendApprovalEmail: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}): Promise<void> => {
  const documentRecord = doc as Record<string, unknown>;
  const previousDocumentRecord = previousDoc as Record<string, unknown> | undefined;

  const isNowApproved = documentRecord['approved'] === true;
  const wasApproved = previousDocumentRecord?.['approved'] === true;

  // Only trigger when submission transitions to approved (or created as approved)
  if (!isNowApproved || wasApproved) {
    return;
  }

  const formSubmissionId = String(documentRecord['id']);
  const formRaw = documentRecord['form'];
  let formId = '';
  if (typeof formRaw === 'string') {
    formId = formRaw;
  } else if (typeof formRaw === 'object' && formRaw !== null && 'id' in formRaw) {
    formId = String((formRaw as { id: string }).id);
  }

  if (formId.length === 0) {
    return;
  }

  let formDocument: Record<string, unknown> | undefined;
  try {
    formDocument = (await req.payload.findByID({
      collection: 'forms',
      id: formId,
      depth: 0,
      req,
    })) as unknown as Record<string, unknown>;
  } catch (error) {
    req.payload.logger.error(`sendApprovalEmail: Failed to fetch form ${formId}: ${String(error)}`);
    return;
  }

  const approvalEmails = formDocument['approvalEmails'];
  if (!Array.isArray(approvalEmails) || approvalEmails.length === 0) {
    return;
  }

  const submissionDataArray = Array.isArray(documentRecord['submissionData'])
    ? (documentRecord['submissionData'] as unknown[])
    : [];

  const submissionDict: Record<string, string> = {
    formSubmissionID: formSubmissionId,
  };

  const extractStringValue = (val: unknown): string => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    return '';
  };

  let wildcardHtmlText = '';
  let wildcardHtmlTable =
    '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">';

  for (const item of submissionDataArray) {
    if (
      item !== null &&
      typeof item === 'object' &&
      'field' in item &&
      typeof item.field === 'string' &&
      'value' in item
    ) {
      const stringValue = extractStringValue(item.value);
      submissionDict[item.field] = stringValue;

      const fieldName = escapeHTML(item.field);
      const fieldValue = escapeHTML(stringValue).replaceAll('\n', '<br />');
      wildcardHtmlText += `<strong>${fieldName}</strong>: ${fieldValue}<br />\n`;
      wildcardHtmlTable += `<tr><td><strong>${fieldName}</strong></td><td>${fieldValue}</td></tr>\n`;
    }
  }
  wildcardHtmlTable += '</table>';

  const replaceStringVariables = (string_: string): string => {
    return string_.replaceAll(/\{\{([^}]+)\}\}/g, (match: string, p1: string) => {
      const key = p1.trim();
      return submissionDict[key] ?? match;
    });
  };

  interface MinimalLexicalNode {
    type: string;
    text?: string;
    children?: MinimalLexicalNode[];
  }

  const replaceVariablesInLexical = (node: MinimalLexicalNode): void => {
    if (typeof node === 'object') {
      if (node.type === 'text' && typeof node.text === 'string') {
        node.text = replaceStringVariables(node.text);
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          replaceVariablesInLexical(child);
        }
      }
    }
  };

  // Fetch attachments if any approval email requires attachments
  const submissionAttachments: EmailAttachment[] = [];
  const hasAnyAttachments = (approvalEmails as Array<{ attachFiles?: boolean }>).some(
    (emailConfig) => emailConfig.attachFiles === true,
  );

  if (hasAnyAttachments) {
    try {
      const potentialFileIds = new Set<string>();
      for (const item of submissionDataArray) {
        if (item !== null && typeof item === 'object' && 'value' in item) {
          const valString = extractStringValue(item.value);
          if (valString.length > 0) {
            const parts = valString.split(',').map((p) => p.trim());
            for (const part of parts) {
              if (/^[0-9a-fA-F]{24}$/.test(part)) {
                potentialFileIds.add(part);
              }
            }
          }
        }
      }

      const whereConditions: Where[] = [{ formSubmission: { equals: formSubmissionId } }];
      if (potentialFileIds.size > 0) {
        whereConditions.push({ id: { in: [...potentialFileIds] } });
      }

      const formFiles = await req.payload.find({
        collection: 'form_collection',
        where: { or: whereConditions },
        limit: 50,
        depth: 0,
        req,
      });

      for (const fileDocument of formFiles.docs) {
        if (typeof fileDocument.filename === 'string' && fileDocument.filename.length > 0) {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: MINIO_BUCKET_NAME,
              Key: fileDocument.filename,
            });
            const s3Response = await s3Client.send(getCommand);
            const fileByteArray = await s3Response.Body?.transformToByteArray();
            if (fileByteArray !== undefined) {
              const buffer = Buffer.from(fileByteArray);
              const attachmentFilename =
                typeof fileDocument.originalFilename === 'string' &&
                fileDocument.originalFilename.length > 0
                  ? fileDocument.originalFilename
                  : fileDocument.filename;
              submissionAttachments.push({
                filename: attachmentFilename,
                content: buffer,
                contentType:
                  typeof fileDocument.mimeType === 'string' && fileDocument.mimeType.length > 0
                    ? fileDocument.mimeType
                    : 'application/octet-stream',
              });
            }
          } catch (s3Error) {
            req.payload.logger.error(
              `sendApprovalEmail: Failed to fetch attachment ${fileDocument.filename} from S3: ${String(s3Error)}`,
            );
          }
        }
      }
    } catch (attachmentError) {
      req.payload.logger.error(
        `sendApprovalEmail: Failed to find uploaded form files for submission ${formSubmissionId}: ${String(attachmentError)}`,
      );
    }
  }

  // Build and send each approval email
  for (const emailConfig of approvalEmails as Array<{
    emailTo?: string;
    cc?: string;
    bcc?: string;
    replyTo?: string;
    emailFrom?: string;
    subject?: string;
    attachFiles?: boolean;
    message?: unknown;
  }>) {
    if (typeof emailConfig.emailTo !== 'string' || emailConfig.emailTo.trim().length === 0) {
      continue;
    }

    const emailTo = replaceStringVariables(emailConfig.emailTo.trim());
    const cc =
      typeof emailConfig.cc === 'string' && emailConfig.cc.trim().length > 0
        ? replaceStringVariables(emailConfig.cc.trim())
        : undefined;
    const bcc =
      typeof emailConfig.bcc === 'string' && emailConfig.bcc.trim().length > 0
        ? replaceStringVariables(emailConfig.bcc.trim())
        : undefined;
    const replyTo =
      typeof emailConfig.replyTo === 'string' && emailConfig.replyTo.trim().length > 0
        ? replaceStringVariables(emailConfig.replyTo.trim())
        : undefined;
    const emailFrom =
      typeof emailConfig.emailFrom === 'string' && emailConfig.emailFrom.trim().length > 0
        ? replaceStringVariables(emailConfig.emailFrom.trim())
        : undefined;
    const rawSubject =
      typeof emailConfig.subject === 'string' && emailConfig.subject.length > 0
        ? emailConfig.subject
        : 'Your submission has been approved';
    const subject = replaceStringVariables(rawSubject);

    let html = '';
    if (
      emailConfig.message !== null &&
      typeof emailConfig.message === 'object' &&
      !Array.isArray(emailConfig.message) &&
      'root' in emailConfig.message
    ) {
      const lexicalData = structuredClone(emailConfig.message) as MinimalLexicalNode & {
        root?: MinimalLexicalNode;
      };
      if (lexicalData.root && Array.isArray(lexicalData.root.children)) {
        for (const child of lexicalData.root.children) {
          replaceVariablesInLexical(child);
        }
      }

      html = `<div>${convertLexicalToHTML({
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

    html = html.replaceAll('{{*}}', () => wildcardHtmlText);
    html = html.replaceAll('{{*:table}}', () => wildcardHtmlTable);

    const formattedEmail = {
      to: emailTo,
      from:
        emailFrom ??
        (typeof environmentVariables.SMTP_USER === 'string'
          ? environmentVariables.SMTP_USER
          : 'noreply@cevi.tools'),
      subject,
      html,
      ...(cc !== undefined && cc.length > 0 ? { cc } : {}),
      ...(bcc !== undefined && bcc.length > 0 ? { bcc } : {}),
      ...(replyTo !== undefined && replyTo.length > 0 ? { replyTo } : {}),
      ...(emailConfig.attachFiles === true && submissionAttachments.length > 0
        ? { attachments: submissionAttachments }
        : {}),
    } as FormattedEmail;

    let outgoingEmailId: string | undefined;
    try {
      const outgoingEmailDocument = await req.payload.create({
        collection: 'outgoing-emails',
        data: {
          to: emailTo,
          subject,
          formSubmission: formSubmissionId,
          deliveryStatus: 'pending',
          html,
        },
        req,
      });
      outgoingEmailId = outgoingEmailDocument.id;
    } catch (createError) {
      req.payload.logger.error(
        `sendApprovalEmail: Failed to create outgoing-emails document for ${emailTo}: ${String(createError)}`,
      );
    }

    // Send tracked email
    void (async (): Promise<void> => {
      try {
        await sendTrackedEmail(
          req.payload,
          formattedEmail,
          formSubmissionId,
          undefined,
          outgoingEmailId,
        );
      } catch (sendError) {
        req.payload.logger.error(
          `sendApprovalEmail: Failed to send tracked approval email to ${emailTo}: ${String(sendError)}`,
        );
      }
    })();
  }
};
