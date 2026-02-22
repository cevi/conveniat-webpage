import { environmentVariables } from '@/config/environment-variables';
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
        const genericDocument = await payload
          .findByID({
            collection: 'generic-page',
            id,
          })
          .catch(() => {});

        // If not found, try in "blog"
        const blogDocument = genericDocument
          ? undefined
          : await payload.findByID({ collection: 'blog', id }).catch(() => {});

        // If a document was found, construct the URL
        const document_ = genericDocument || blogDocument;
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
          const campAnnotation = await payload
            .findByID({ collection: 'camp-map-annotations', id })
            .catch(() => {});
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

  const smtpResults: Record<string, unknown>[] = [];

  await Promise.all(
    finalEmails.map(async (email) => {
      const { to } = email;
      try {
        const emailPromise = await payload.sendEmail(email);
        smtpResults.push({
          success: true,
          to,
          response: emailPromise,
        });
      } catch (error: unknown) {
        payload.logger.error({
          err: error,
          msg: `Error while sending email to address: ${to}. Email not sent.`,
        });
        smtpResults.push({
          success: false,
          to,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );

  const formSubmissionId = (beforeChangeParameters as { doc?: { id?: string } } | undefined)?.doc
    ?.id;
  if (typeof formSubmissionId === 'string' && formSubmissionId.length > 0) {
    try {
      await payload.update({
        collection: 'form-submissions',
        id: formSubmissionId,
        data: {
          smtpResults,
        } as Record<string, unknown>,
      });
    } catch (error: unknown) {
      payload.logger.error({
        err: error,
        msg: 'Failed to update form submission with smtpResults',
      });
    }
  }

  // Return empty array so the plugin doesn't send duplicate emails
  return [];
};
