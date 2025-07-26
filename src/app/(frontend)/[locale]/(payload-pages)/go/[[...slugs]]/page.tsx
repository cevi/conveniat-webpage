import type { Locale } from '@/types/types';
import { serverSideSlugToUrlResolution } from '@/utils/find-url-prefix';
import config from '@payload-config';
import { redirect } from 'next/navigation';
import type { CollectionSlug } from 'payload';
import { getPayload } from 'payload';
import type React from 'react';

const RedirectPage: React.FC<{
  params: Promise<{
    slugs: string[] | undefined;
    locale: Locale;
  }>;
}> = async ({ params }) => {
  const payload = await getPayload({ config });
  const { slugs, locale } = await params;

  const slug = slugs?.join('/') ?? '';

  const redirectPages = await payload.find({
    collection: 'go',
    pagination: false,
    locale,
    depth: 1,
    limit: 1,
    where: {
      urlSlug: {
        equals: slug,
      },
    },
  });

  if (redirectPages.totalDocs > 0) {
    const redirectPage = redirectPages.docs[0];
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
          };
        };
      };
      const path = await serverSideSlugToUrlResolution(
        redirectPageToReference.reference.relationTo as CollectionSlug,
        locale,
      );
      redirect(`/${locale}/${path}/${redirectPageToReference.reference.value.seo.urlSlug}`);
    }
  }

  redirect('/'); // redirect to home if no redirect page found
};

export default RedirectPage;
