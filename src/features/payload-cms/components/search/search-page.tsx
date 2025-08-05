import SearchOnlyPagesClient from '@/features/payload-cms/components/search/search-page-client';
import type {
  GenericPage,
  Permission,
  SearchCollection,
} from '@/features/payload-cms/payload-types';
import type { SearchParameters } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { hasPermissions } from '@/utils/has-permissions';
import config from '@payload-config';
import { getPayload } from 'payload';
import React from 'react';

const SearchOnlyPages: React.FC<{ searchParameters: SearchParameters }> = async ({
  searchParameters,
}): Promise<React.JSX.Element> => {
  const searchQueryQ = searchParameters['q'];
  const pageParameter = searchParameters['page'];

  const locale = await getLocaleFromCookies();
  const payload = await getPayload({ config });

  const page = Number(Array.isArray(pageParameter) ? pageParameter[0] : pageParameter) || 1;

  const searchQuery = Array.isArray(searchQueryQ) ? searchQueryQ[0] || '' : searchQueryQ || '';

  const limit = 10; // Number of results per page

  const searchCollectionEntries = await payload.find({
    collection: 'search-collection',
    limit,
    page,
    depth: 1,
    locale,
    pagination: true,
    where: {
      and: [
        {
          or: [
            {
              search_content: {
                like: searchQuery,
              },
            },
            {
              search_title: {
                like: searchQuery,
              },
            },
          ],
        },
        {
          'doc.relationTo': { equals: 'generic-page' },
        },
      ],
    },
  });

  const currentDate = new Date().toISOString();

  // Fetch permitted pages for this page of results
  const pagesPublished = await Promise.all(
    searchCollectionEntries.docs.map(async (entry: SearchCollection) => {
      if (entry.doc.relationTo !== 'generic-page') return;

      const pagesResult = await payload.find({
        collection: 'generic-page',
        depth: 1,
        limit: 1,
        locale,
        where: {
          and: [
            { id: { equals: entry.doc.value } },
            { 'content.releaseDate': { less_than_equal: currentDate } },
            { _localized_status: { equals: { published: true } } },
          ],
        },
      });
      if (pagesResult.docs.length > 0) return pagesResult.docs[0];
      return;
    }),
  );
  const pages = pagesPublished.filter(
    (publishedPage) => publishedPage !== undefined,
  ) as GenericPage[];
  const pagesPermissions = await Promise.all(
    pages.map((permissionPage) => hasPermissions(permissionPage.content.permissions as Permission)),
  );
  const permittedPages = pages.filter((_, index) => pagesPermissions[index]);

  return (
    <SearchOnlyPagesClient
      searchCollectionEntries={searchCollectionEntries}
      locale={locale}
      page={page}
      permittedPages={permittedPages}
      searchQuery={searchQuery}
    />
  );
};

export default SearchOnlyPages;
