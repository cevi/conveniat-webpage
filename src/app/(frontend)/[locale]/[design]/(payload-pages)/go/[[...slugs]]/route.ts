import type { Go } from '@/features/payload-cms/payload-types';
import { findPrefixByCollectionSlugAndLocale } from '@/features/payload-cms/route-resolution-table';
import { i18nConfig, type Locale } from '@/types/types';
import config from '@payload-config';
import type { CollectionSlug } from 'payload';
import { getPayload } from 'payload';

/**
 * Answers with an HTTP redirect rather than a rendered page.
 *
 * A short link is printed on paper — on the bill, on posters — and whatever opens it is
 * not always a full browser. The PDF viewer built into Acrobat on a phone follows a
 * `Location` header and nothing else. This used to be a page component calling
 * `redirect()`, and because its layout wrapped it in a Suspense boundary the response
 * streamed: Next.js then emits the redirect for the client to perform, and answers 200
 * with the "resolving link target" shell. A browser runs it, everything else stops there.
 *
 * A route handler never streams, so the status is the redirect itself. The `Location` is
 * relative on purpose — it keeps the reader on the host they came in on, which is the
 * short domain or the site, without this code having to work out which.
 */
const redirectTo = (target: string): Response =>
  new Response(undefined, { status: 307, headers: { Location: target } });

const fetchRedirectPages = async (slug: string): Promise<Go[]> => {
  const locales: Locale[] = i18nConfig.locales as Locale[];
  const payload = await getPayload({ config });
  const results = await Promise.all(
    locales.map((l) =>
      payload.find({
        collection: 'go',
        pagination: false,
        draft: false,
        locale: l,
        where: {
          urlSlug: { equals: slug },
        },
      }),
    ),
  );
  return results
    .filter((r) => r.docs.length === 1)
    .flatMap((r) => r.docs[0])
    .filter((a) => a !== undefined);
};

const resolveTarget = (redirectPage: Go): string => {
  const redirectPageTo = redirectPage.to as
    | { type: 'custom'; url: string }
    | {
        type: 'reference';
        reference: {
          relationTo: string;
          value: {
            seo: { urlSlug: string };
            _locale: string;
          };
        };
      };

  if (redirectPageTo.type === 'custom') {
    return redirectPageTo.url;
  }

  const { relationTo, value } = redirectPageTo.reference;
  const prefix = findPrefixByCollectionSlugAndLocale(
    relationTo as CollectionSlug,
    value._locale as Locale,
  );
  return `/${value._locale}/${prefix}/${value.seo.urlSlug}`;
};

/**
 * Resolves a short link to the page it stands for, or to the start page when the slug
 * names nothing.
 */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ slugs: string[] | undefined }> },
): Promise<Response> => {
  const { slugs } = await params;
  const slug = slugs?.join('/') ?? '';

  // Handle app redirects specially, since this is no collection
  if (slugs !== undefined && slugs.length > 0 && slugs[0] === 'app') {
    return redirectTo(`/${slug}`);
  }

  const redirectPages = await fetchRedirectPages(slug);
  const redirectPage = redirectPages[0];

  if (redirectPage === undefined) {
    return redirectTo('/');
  }

  return redirectTo(resolveTarget(redirectPage));
};
