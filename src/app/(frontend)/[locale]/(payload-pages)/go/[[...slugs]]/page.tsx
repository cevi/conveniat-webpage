import { i18nConfig, type Locale } from '@/types/types';
import { serverSideSlugToUrlResolution } from '@/utils/find-url-prefix';
import config from '@payload-config';
import { redirect } from 'next/navigation';
import type { CollectionSlug } from 'payload';
import { getPayload } from 'payload';
import type React from 'react';

const RedirectPage: React.FC<{
  params: Promise<{
    slugs: string[] | undefined;
  }>;
}> = async ({ params }) => {
  const payload = await getPayload({ config });
  const { slugs } = await params;

  const slug = slugs?.join('/') ?? '';

  const locales: Locale[] = i18nConfig.locales as Locale[];

  // Special Pages
  if ((slugs?.length ?? 0) > 0 && slugs?.[0] == 'app') {
    return redirect(`/${slug}`);
  }

  const redirectPages = await Promise.all(
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
  ).then((results) =>
    results
      .filter((r) => r.docs.length === 1)
      .flatMap((r) => r.docs[0])
      .filter((a) => a !== undefined),
  );

  if (redirectPages.length > 0) {
    const redirectPage = redirectPages[0];
    if (redirectPage === undefined) {
      redirect('/'); // redirect to home if no redirect page found
    }
    // check if redirectPage.to.type is "reference" or "custom"
    const redirectPageTo = redirectPage.to as
      | { type: 'custom'; url: string }
      | {
          type: 'reference';
          reference: {
            relationTo: string;
            value: {
              seo: {
                urlSlug: string;
              };
              _locale: string;
            };
          };
        };

    if (redirectPageTo.type === 'custom') {
      const redirectPageToCustom = redirectPageTo as { type: 'custom'; url: string };
      redirect(redirectPageToCustom.url);
    } else {
      const redirectPageToReference = redirectPageTo as {
        type: 'reference';
        reference: {
          relationTo: string;
          value: {
            seo: {
              urlSlug: string;
            };
            _locale: string;
          };
        };
      };
      const path = await serverSideSlugToUrlResolution(
        redirectPageToReference.reference.relationTo as CollectionSlug,
        redirectPageToReference.reference.value._locale as Locale,
      );
      redirect(
        `/${redirectPageToReference.reference.value._locale}/${path}/${redirectPageToReference.reference.value.seo.urlSlug}`,
      );
    }
  }

  redirect('/'); // redirect to home if no redirect page found
};

export default RedirectPage;
