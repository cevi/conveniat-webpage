import React from 'react';
import { notFound, redirect } from 'next/navigation';
import {
  collectionRouteLookupTable,
  globalsRouteLookupTable,
} from '@/page-layouts/router-lookup-table';

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
    locale: 'de' | 'en' | 'fr';
  }>;
}> = async ({ params }) => {
  const { locale, slugs } = await params;

  /////////////////////////////////////
  // check if slug is a global URL
  /////////////////////////////////////
  const url = slugs.join('/');

  const page = globalsRouteLookupTable[url];
  if (page?.locales.includes(locale) === true) {
    return <page.component locale={locale} />;
  } else {
    // redirect to alternative page if available
    const alternative = page?.alternatives[locale];
    if (alternative !== undefined) redirect(`/${locale}/${alternative}`);
  }

  /////////////////////////////////////
  // check if slug is a collection URL
  //  --> currently we only have blog
  /////////////////////////////////////

  // check if part of a routable collection of the form [collection]/[slug]
  if (slugs.length >= 2) {
    const collection = slugs[0] as string;
    const remainingSlugs = slugs.slice(1);

    const collectionPage = collectionRouteLookupTable[collection];

    if (collectionPage?.locales.includes(locale) === true) {
      return <collectionPage.component locale={locale} slugs={remainingSlugs} />;
    } else {
      // redirect to alternative collectionPage if available
      const alternative = collectionPage?.alternatives[locale];
      if (alternative !== undefined) redirect(`/${locale}/${alternative}`);
    }
  }

  console.log('Cannot find page for', slugs, locale);

  /////////////////////////////////////
  // no matching page found
  //  --> render 404 page
  /////////////////////////////////////
  notFound();
};

export default CMSPage;
