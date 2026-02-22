import { environmentVariables } from '@/config/environment-variables';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import config from '@payload-config';
import type { BeforeEmail, FormattedEmail } from '@payloadcms/plugin-form-builder/types';
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

  if (typeof formId === 'string' && formId.length > 0) {
    let formDocument_: Record<string, unknown> | undefined;
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

  const finalEmails = emailsToSend.map((email) => {
    let updatedHtml = email.html;

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
