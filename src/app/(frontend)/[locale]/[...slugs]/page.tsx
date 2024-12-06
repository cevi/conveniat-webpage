import React from 'react';
import { notFound } from 'next/navigation';
import { BlogPostPage } from '@/content-pages/blog-posts/page';
import { CMS_ROUTES } from '@/app/(frontend)/cms-routes';

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
  const pageComponent = CMS_ROUTES[locale][url];
  if (pageComponent !== undefined) return pageComponent;

  /////////////////////////////////////
  // check if slug is a collection URL
  //  --> currently we only have blog
  /////////////////////////////////////

  // check if it is a blog article
  if (slugs.length === 2) {
    const collection = slugs[0];
    const slug = slugs[1];

    // abort if path is not a blog article
    if (collection !== 'blog') notFound();
    if (slug === undefined) notFound();

    // render blog article
    return <BlogPostPage slug={slug} locale={locale} />;
  }

  /////////////////////////////////////
  // no matching page found
  //  --> render 404 page
  /////////////////////////////////////
  notFound();
};

export default CMSPage;
