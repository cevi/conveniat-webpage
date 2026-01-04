import SearchOnlyPagesClient from '@/features/payload-cms/components/search/search-page-client';
import type { Permission, SearchCollection } from '@/features/payload-cms/payload-types';
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
    depth: 0,
    locale,
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
  const searchCollectionEntryIDs = searchCollectionEntries.docs.map(
    (entry: SearchCollection) => entry.doc.value,
  );

  const pages = await payload.find({
    collection: 'generic-page',
    depth: 1,
    limit: 3,
    locale,
    page: page,
    where: {
      and: [
        { id: { in: searchCollectionEntryIDs } },
        { 'content.releaseDate': { less_than_equal: currentDate } },
        { _localized_status: { equals: { published: true } } },
      ],
    },
  });

  const pagesPermissions = await Promise.all(
    pages.docs.map((permissionPage) =>
      hasPermissions(permissionPage.content.permissions as Permission),
    ),
  );
  const permittedPages = pages.docs.filter((_, index) => pagesPermissions[index] ?? false);

  return (
    <SearchOnlyPagesClient
      locale={locale}
      searchQuery={searchQuery}
      page={page}
      permittedPages={permittedPages}
      pages={pages}
    />
  );
};

export default SearchOnlyPages;
