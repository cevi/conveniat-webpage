import { environmentVariables } from '@/config/environment-variables';
import type { Go } from '@/features/payload-cms/payload-types';
import { findPrefixByCollectionSlugAndLocale } from '@/features/payload-cms/route-resolution-table';
import { Cookie, i18nConfig, type Locale } from '@/types/types';
import config from '@payload-config';
import type { CollectionSlug } from 'payload';
import { getPayload } from 'payload';

interface RedirectTarget {
  /** Where the reader goes. A path is resolved against this deployment's own address. */
  path: string;
  /** The locale the `go` entry was written in, when the target is a page of this site. */
  locale?: Locale;
}

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
 * absolute, resolved against the deployment's own address: the short domain con27.ch is
 * served by this handler as well, and a relative target would send the reader back to
 * con27.ch, whose router prefixes `/go` again and lands them here a second time. The
 * address comes from the environment rather than the request, because the whole point is
 * to leave the host the reader came in on.
 *
 * The locale travels with the redirect instead of costing a second hop.
 *
 * The site serves the default locale without a prefix, so `/de/impressum` exists only to
 * be redirected to `/impressum`, and that redirect is also where the reader's locale
 * cookie is set. A short link is read once, from paper, so it names the canonical path
 * directly and carries the same cookie — the entry already says which locale it means.
 */
const redirectTo = ({ path, locale }: RedirectTarget): Response => {
  const headers = new Headers({
    Location: new URL(path, environmentVariables.APP_HOST_URL).toString(),
  });
  if (locale !== undefined) {
    headers.append('Set-Cookie', `${Cookie.LOCALE_COOKIE}=${locale}; Path=/; SameSite=Lax`);
  }
  return new Response(undefined, { status: 307, headers });
};

/**
 * Builds the address a localized page is actually served at.
 *
 * Collections without a url prefix contribute no segment — joining them blindly produced
 * `/de//impressum` — and the default locale contributes none either.
 */
const localizedPath = (locale: Locale, prefix: string, urlSlug: string): string => {
  const localeSegment = locale === i18nConfig.defaultLocale ? '' : locale;
  return `/${[localeSegment, prefix, urlSlug].filter((segment) => segment !== '').join('/')}`;
};

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

const resolveTarget = (redirectPage: Go): RedirectTarget => {
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
    return { path: redirectPageTo.url };
  }

  const { relationTo, value } = redirectPageTo.reference;
  const locale = value._locale as Locale;
  const prefix = findPrefixByCollectionSlugAndLocale(relationTo as CollectionSlug, locale);
  return { path: localizedPath(locale, prefix, value.seo.urlSlug), locale };
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
    return redirectTo({ path: `/${slug}` });
  }

  const redirectPages = await fetchRedirectPages(slug);
  const redirectPage = redirectPages[0];

  if (redirectPage === undefined) {
    return redirectTo({ path: '/' });
  }

  return redirectTo(resolveTarget(redirectPage));
};
