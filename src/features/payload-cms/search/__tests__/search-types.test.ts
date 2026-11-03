import {
  buildSearchQueryString,
  parseSearchParameters,
} from '@/features/payload-cms/search/search-types';

describe('search parameters', () => {
  it('reads the query, the chosen types, the order, the period and the page', () => {
    expect(
      parseSearchParameters({
        q: ' quartier ',
        type: 'document,news',
        sort: 'newest',
        period: 'month',
        page: '2',
      }),
    ).toEqual({
      query: 'quartier',
      types: ['document', 'news'],
      sort: 'newest',
      period: 'month',
      page: 2,
    });
  });

  it('falls back to the defaults for anything it does not know', () => {
    expect(parseSearchParameters({ q: 'x', type: 'blog,page', sort: 'abc', page: '-3' })).toEqual({
      query: 'x',
      types: ['page'],
      sort: 'relevance',
      period: 'any',
      page: 1,
    });
  });

  it('leaves the defaults out of the URL and reads back what it wrote', () => {
    const options = {
      query: 'Züri 11',
      types: ['page' as const],
      sort: 'relevance' as const,
      period: 'year' as const,
      page: 1,
    };
    const queryString = buildSearchQueryString(options);
    expect(queryString).toBe('q=Z%C3%BCri+11&type=page&period=year');
    expect(parseSearchParameters(Object.fromEntries(new URLSearchParams(queryString)))).toEqual(
      options,
    );
  });
});
