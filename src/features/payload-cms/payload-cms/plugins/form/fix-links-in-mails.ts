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

  const finalEmails = await Promise.all(
    emailsToSend.map(async (email) => {
      let updatedHtml = email.html;

      // Find all hrefs with just an ID (internal links)
      const linkRegex = /<a\s+[^>]*href=["']([a-f0-9]{24})["'][^>]*>/gi;
      const matches = [...updatedHtml.matchAll(linkRegex)];

      for (const match of matches) {
        const id = match[1] as string;

        // Try to find the document in "generic-page"
        let genericDocument;
        try {
          genericDocument = await payload.findByID({
            collection: 'generic-page',
            id,
          });
        } catch {}

        // If not found, try in "blog"
        let blogDocument;
        if (genericDocument === undefined) {
          try {
            blogDocument = await payload.findByID({ collection: 'blog', id });
          } catch {}
        }

        // If a document was found, construct the URL
        const document_ = genericDocument ?? blogDocument;
        if (document_) {
          const slug = document_.seo.urlSlug;
          const collectionPath = genericDocument ? '' : 'blog';
          const finalURL =
            `${environmentVariables.APP_HOST_URL}/${document_._locale}/${collectionPath}/${slug}`.replace(
              '//',
              '/',
            );

          // Replace the href in the HTML
          updatedHtml = updatedHtml.replace(`href="${id}"`, `href="${finalURL}"`);
        }

        if (environmentVariables.FEATURE_ENABLE_APP_FEATURE) {
          let campAnnotation;
          try {
            campAnnotation = await payload.findByID({ collection: 'camp-map-annotations', id });
          } catch {}

          if (campAnnotation) {
            const finalURL = `${environmentVariables.APP_HOST_URL}/app/map?locationId=${campAnnotation.id}`;
            updatedHtml = updatedHtml.replace(`href="${id}"`, `href="${finalURL}"`);
          }
        }
      }

      return {
        ...email,
        html: updatedHtml,
      };
    }),
  );

  const formSubmissionId = (beforeChangeParameters as { doc?: { id?: string } } | undefined)?.doc
    ?.id;

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
