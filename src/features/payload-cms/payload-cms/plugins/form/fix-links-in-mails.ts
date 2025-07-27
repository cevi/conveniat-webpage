import { environmentVariables } from '@/config/environment-variables';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import config from '@payload-config';
import type { BeforeEmail, FormattedEmail } from '@payloadcms/plugin-form-builder/types';
import { getPayload } from 'payload';

export const beforeEmailChangeHook: BeforeEmail = async (
  emailsToSend,
): Promise<FormattedEmail[]> => {
  const payload = await getPayload({ config });

  const locale = await getLocaleFromCookies();

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
          const collectionPath = genericDocument ? 'generic-page' : 'blog';
          const url = `${collectionPath}/${slug}`;
          const finalURL = `${environmentVariables.APP_HOST_URL}/${locale}/${url}`.replace(
            '//',
            '/',
          );

          // Replace the href in the HTML
          updatedHtml = updatedHtml.replace(`href="${id}"`, `href="${finalURL}"`);
        }
      }

      return {
        ...email,
        html: updatedHtml,
      };
    }),
  );

  return finalEmails;
};
