import React from 'react';
import { notFound, redirect } from 'next/navigation';
import {
  collectionRouteLookupTable,
  globalsRouteLookupTable,
} from '@/page-layouts/router-lookup-table';
import { Locale } from '@/middleware';

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
    slugs: string[];
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

    /////////////////////////////////////
    // check if slug is a global URL
    /////////////////////////////////////
    const url = slugs.join('/');

    if (slugs[0] === 'admin') {
      redirect(`/admin/${slugs.slice(1).join('/')}?${searchParametersString}`); // forward to admin page without locale
    }

    const page = globalsRouteLookupTable[url];
    if (page?.locales.includes(locale) === true) {
      return <page.component locale={locale} />;
    } else {
      // redirect to alternative page if available
      const alternative = page?.alternatives[locale];
      if (alternative !== undefined) {
        // make sure, that params after ? are not lost
        redirect(`/${locale}/${alternative}?${searchParametersString}`);
      }
    }

    /////////////////////////////////////
    // check if slug is a collection URL
    //  --> currently we only have blog
    /////////////////////////////////////

    // check if part of a routable collection of the form [collection]/[slug]
    const collection = slugs[0] as string;
    const remainingSlugs = slugs.slice(1);

    let collectionPage = collectionRouteLookupTable[collection];
    if (collectionPage === undefined && collectionRouteLookupTable[''] !== undefined) {
      // if no collection found, try to match the first slug to the default collection
      collectionPage = collectionRouteLookupTable[''];
      remainingSlugs.unshift(collection);
    }

    if (collectionPage !== undefined) {
      if (collectionPage.locales.includes(locale)) {
        return <collectionPage.component locale={locale} slugs={remainingSlugs} />;
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
