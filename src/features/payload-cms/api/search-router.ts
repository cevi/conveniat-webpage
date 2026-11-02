import { SEARCH_RESULT_TYPES } from '@/features/payload-cms/search/search-types';
import { searchSite } from '@/features/payload-cms/search/site-search';
import { createTRPCRouter, publicProcedure } from '@/trpc/init';
import { z } from 'zod';

/** What the instant search shows before the visitor opens the full results page. */
const INSTANT_RESULT_COUNT = 8;

export const searchRouter = createTRPCRouter({
  /**
   * The best results for the instant search in the header, with the counts per type for its
   * filter chips. Public: it finds what a visitor could find on the search page.
   */
  getSearchResultList: publicProcedure
    .input(
      z.object({
        locale: z.enum(['en', 'de', 'fr']),
        query: z.string().max(200),
        types: z.array(z.enum(SEARCH_RESULT_TYPES)).max(SEARCH_RESULT_TYPES.length),
      }),
    )
    .query(async ({ input }) =>
      searchSite(input.locale, {
        query: input.query,
        types: input.types,
        sort: 'relevance',
        period: 'any',
        page: 1,
        pageSize: INSTANT_RESULT_COUNT,
      }),
    ),
});
