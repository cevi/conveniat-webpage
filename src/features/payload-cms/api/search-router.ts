import {
  SEARCH_PERIODS,
  SEARCH_RESULT_TYPES,
  SEARCH_SORTS,
} from '@/features/payload-cms/search/search-types';
import { searchSite } from '@/features/payload-cms/search/site-search';
import { createTRPCRouter, publicProcedure } from '@/trpc/init';
import { z } from 'zod';

/** What the instant search shows before the visitor opens the full results page. */
const INSTANT_RESULT_COUNT = 8;
const MAX_PAGE_SIZE = 50;

export const searchRouter = createTRPCRouter({
  /**
   * One page of results with the counts per type: the instant search in the header asks for its
   * first few, the search page for the page it shows while the visitor types or filters. Public:
   * it finds what a visitor could find on the search page.
   */
  getSearchResultList: publicProcedure
    .input(
      z.object({
        locale: z.enum(['en', 'de', 'fr']),
        query: z.string().max(200),
        types: z.array(z.enum(SEARCH_RESULT_TYPES)).max(SEARCH_RESULT_TYPES.length),
        sort: z.enum(SEARCH_SORTS).default('relevance'),
        period: z.enum(SEARCH_PERIODS).default('any'),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(INSTANT_RESULT_COUNT),
      }),
    )
    .query(async ({ input }) => searchSite(input.locale, input)),
});
