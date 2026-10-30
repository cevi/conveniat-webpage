import { filterOptionsOnlyPublished } from '@/features/payload-cms/payload-cms/utils/filter-options-only-published';
import type { FilterOptionsProps, PayloadRequest } from 'payload';

/** A request whose local API knows these published documents. */
const requestWith = (
  publishedIds: string[],
  locale = 'de',
): { request: PayloadRequest; find: jest.Mock } => {
  const find = jest.fn().mockResolvedValue({ docs: publishedIds.map((id) => ({ id })) });
  const request = { context: {}, locale, payload: { find } } as unknown as PayloadRequest;
  return { request, find };
};

const filterFor = async (relationTo: string, request: PayloadRequest): Promise<unknown> =>
  await filterOptionsOnlyPublished({
    relationTo,
    req: request,
  } as unknown as FilterOptionsProps<unknown>);

describe('filterOptionsOnlyPublished', () => {
  it('offers the pages published in the edited locale, by id', async () => {
    const { request, find } = requestWith(['page-a', 'page-b'], 'fr');

    expect(await filterFor('generic-page', request)).toEqual({ id: { in: ['page-a', 'page-b'] } });
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'generic-page', locale: 'fr', draft: false }),
    );
  });

  // The admin sends the filter back as a query string. A list of ids survives that, a boolean
  // inside the JSON field `_localized_status` did not and matched nothing.
  it('hands the admin a filter without a boolean in it', async () => {
    const { request } = requestWith(['page-a']);

    expect(JSON.stringify(await filterFor('blog', request))).not.toMatch(/true|false/);
  });

  it('offers nothing when nothing is published', async () => {
    const { request } = requestWith([]);

    expect(await filterFor('generic-page', request)).toEqual({ id: { exists: false } });
  });

  it('reads the published pages once per request, however many link fields ask', async () => {
    const { request, find } = requestWith(['page-a']);

    await Promise.all([filterFor('generic-page', request), filterFor('generic-page', request)]);
    await filterFor('generic-page', request);

    expect(find).toHaveBeenCalledTimes(1);
  });

  it('leaves collections without a publishing status unfiltered', async () => {
    const { request, find } = requestWith(['page-a']);

    expect(await filterFor('images', request)).toEqual({});
    expect(find).not.toHaveBeenCalled();
  });
});
