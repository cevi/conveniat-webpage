import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { collectionRouteLookupTable } from '@/page-layouts/router-lookup-table';
import { Locale } from '@/types';

/**
 *
 * Page component for the dynamic page route.
 *
 * This page is used as a fallback for all pages that aren't statically rendered using NextJS,
 * e.g. for all pages defined via PayloadCMS. The page resolves the url and maps it to the
 * corresponding page component defined for a given object in the CMS.
 *
 * @param params - The parameters for the page route
 *
 */
const CMSPage: React.FC<{
  params: Promise<{
    slugs: string[] | undefined;
    locale: Locale;
  }>;
  searchParams: Promise<{
    [key: string]: string | string[];
  }>;
}> =
  // eslint-disable-next-line complexity
  async ({ params, searchParams: searchParametersPromise }) => {
    const { locale, slugs } = await params;
    const searchParameters = await searchParametersPromise;

    const searchParametersString = Object.entries(searchParameters)
      .map(([key, value]) => {
        return Array.isArray(value) ? value.map((v) => `${key}=${v}`).join('&') : `${key}=${value}`;
      })
      .join('&');

    // check if part of a routable collection of the form [collection]/[slug]
    const collection = (slugs?.[0] ?? '') as string;
    const remainingSlugs = slugs?.slice(1) ?? [];

    let collectionPage = collectionRouteLookupTable[collection];
    if (collectionPage === undefined && collectionRouteLookupTable[''] !== undefined) {
      // if no collection found, try to match the first slug to the default collection
      collectionPage = collectionRouteLookupTable[''];
      remainingSlugs.unshift(collection);
    }

    if (collectionPage !== undefined) {
      if (collectionPage.locales.includes(locale)) {
        return (
          <collectionPage.component
            locale={locale}
            slugs={remainingSlugs}
            searchParams={searchParameters}
          />
        );
      } else {
        // redirect to alternative collectionPage if available
        const alternative = collectionPage.alternatives[locale];
        redirect(`/${locale}/${alternative}?${searchParametersString}`);
      }
    }

    console.log(collection);
    if (collection === 'admin') {
      redirect(`/admin`);
    }

    /////////////////////////////////////
    // no matching page found
    //  --> render 404 page
    /////////////////////////////////////
    notFound();
  };

export default CMSPage;
