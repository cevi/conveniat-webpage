import SearchOnlyBlogsClient from '@/features/payload-cms/components/search/search-blog-client';
import type { Permission, SearchCollection } from '@/features/payload-cms/payload-types';
import type { SearchParameters } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { hasPermissions } from '@/utils/has-permissions';
import config from '@payload-config';
import { getPayload } from 'payload';
import React from 'react';

const SearchOnlyBlog: React.FC<{ searchParameters: SearchParameters }> = async ({
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
    depth: 1,
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
          'doc.relationTo': { equals: 'blog' },
        },
      ],
    },
  });

  const currentDate = new Date().toISOString();

  // Fetch permitted pages for this page of results
  const searchCollectionEntryIDs = searchCollectionEntries.docs.map(
    (entry: SearchCollection) => entry.doc.value,
  );

  const blogs = await payload.find({
    collection: 'blog',
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

  const blogsPermissions = await Promise.all(
    blogs.docs.map((permissionBlog) =>
      hasPermissions(permissionBlog.content.permissions as Permission),
    ),
  );
  const permittedBlogs = blogs.docs.filter((_, index) => blogsPermissions[index] ?? false);

  return (
    <SearchOnlyBlogsClient
      locale={locale}
      searchQuery={searchQuery}
      page={page}
      permittedBlogs={permittedBlogs}
      blogs={blogs}
    />
  );
};

export default SearchOnlyBlog;
