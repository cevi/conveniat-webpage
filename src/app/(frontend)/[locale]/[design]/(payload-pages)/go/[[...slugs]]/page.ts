import type { Go } from '@/features/payload-cms/payload-types';
import { i18nConfig, type Locale } from '@/types/types';
import { serverSideSlugToUrlResolution } from '@/utils/find-url-prefix';
import config from '@payload-config';
import { redirect } from 'next/navigation';
import type { CollectionSlug } from 'payload';
import { getPayload } from 'payload';
import type React from 'react';

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

const handleReferenceRedirect = async (
  relationTo: string,
  locale: string,
  urlSlug: string,
): Promise<void> => {
  const path = await serverSideSlugToUrlResolution(relationTo as CollectionSlug, locale as Locale);
  redirect(`/${locale}/${path}/${urlSlug}`);
};

const handleRedirect = async (redirectPage?: Go | undefined): Promise<void> => {
  if (!redirectPage) {
    return redirect('/');
  }
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
    redirect(redirectPageTo.url);
  } else {
    const reference = redirectPageTo.reference;
    await handleReferenceRedirect(
      reference.relationTo,
      reference.value._locale,
      reference.value.seo.urlSlug,
    );
  }
};

const RedirectPage: React.FC<{
  params: Promise<{
    slugs: string[] | undefined;
  }>;
}> = async ({ params }) => {
  const { slugs } = await params;
  const slug = slugs?.join('/') ?? '';

  // Handle app redirects specially, since this is no collection
  if ((slugs?.length ?? 0) > 0 && slugs?.[0] === 'app') {
    return redirect(`/${slug}`);
  }

  const redirectPages = await fetchRedirectPages(slug);

  if (redirectPages.length > 0) {
    await handleRedirect(redirectPages[0]);
    return;
  }

  redirect('/');
};

export default RedirectPage;
