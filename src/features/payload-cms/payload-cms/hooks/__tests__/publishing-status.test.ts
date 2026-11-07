import { getPublishingStatus } from '@/features/payload-cms/payload-cms/hooks/publishing-status';
import type { CollectionConfig, FieldHookArgs } from 'payload';

const PAGE_ID = '65f0c1a2b3d4e5f6a7b8c9d0';
const fields = [{ name: 'title', type: 'text', localized: true, presentational: false }];

/** Runs the field hook against a page whose stored and draft versions are both `stored`. */
const statusOf = async (stored: object): Promise<unknown> => {
  const arguments_ = {
    data: { id: PAGE_ID },
    collection: { fields },
    req: { payload: { findByID: jest.fn().mockResolvedValue(stored) } },
  } as unknown as FieldHookArgs;

  return getPublishingStatus({ slug: 'generic-page' } as CollectionConfig)(arguments_);
};

/** Whether German shows unpublished changes when the draft differs from the published page. */
const germanHasPendingChanges = async (
  fieldDefinitions: object[],
  published: object,
  draft: object,
): Promise<boolean> => {
  const findByID = jest.fn(({ draft: isDraft }: { draft: boolean }) =>
    Promise.resolve({
      id: PAGE_ID,
      _localized_status: { de: { published: true } },
      ...(isDraft ? draft : published),
    }),
  );
  const arguments_ = {
    data: { id: PAGE_ID },
    collection: { fields: fieldDefinitions },
    req: { payload: { findByID } },
  } as unknown as FieldHookArgs;

  const status = await getPublishingStatus({ slug: 'generic-page' } as CollectionConfig)(
    arguments_,
  );
  return status['de']?.pendingChanges === true;
};

/** Rich text holding one internal link, as Payload stores it at depth 0. */
const richText = (target: string): object => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'link',
        fields: { linkType: 'internal', doc: { relationTo: 'generic-page', value: target } },
        children: [{ type: 'text', text: 'hier' }],
      },
    ],
  },
});

describe('getPublishingStatus', () => {
  it('reports a page published only in German as published in German', async () => {
    const status = await statusOf({
      id: PAGE_ID,
      title: { de: 'Willkommen' },
      _localized_status: { de: { published: true } },
    });

    expect(status).toEqual({
      de: { pendingChanges: false, published: true },
      en: { pendingChanges: false, published: false },
      fr: { pendingChanges: false, published: false },
    });
  });

  it('reports every locale as unpublished when the page has no status yet', async () => {
    const status = await statusOf({ id: PAGE_ID, title: { de: 'Willkommen' } });

    expect(status).toEqual({
      de: { pendingChanges: false, published: false },
      en: { pendingChanges: false, published: false },
      fr: { pendingChanges: false, published: false },
    });
  });

  describe('a changed link or image', () => {
    const PAGE = { relationTo: 'generic-page', value: '65f0c1a2b3d4e5f6a7b8c9d1' };
    const OTHER_PAGE = { relationTo: 'generic-page', value: '65f0c1a2b3d4e5f6a7b8c9d2' };
    const cardFields = [
      // the link of a card: one field that can point at several collections
      { name: 'link', type: 'relationship', localized: false, presentational: false },
      { name: 'image', type: 'upload', localized: false, presentational: false },
      { name: 'gallery', type: 'upload', hasMany: true, localized: true, presentational: false },
    ];

    it.each([
      ['a link is set where there was none', {}, { link: PAGE }],
      ['a link points at another page', { link: PAGE }, { link: OTHER_PAGE }],
      ['a link is removed', { link: PAGE }, { link: null }],
      ['an image is swapped', { image: 'image-a' }, { image: 'image-b' }],
      ['an image is added', {}, { image: 'image-a' }],
      [
        'the images of a gallery are reordered',
        { gallery: { de: ['image-a', 'image-b'] } },
        { gallery: { de: ['image-b', 'image-a'] } },
      ],
    ])('shows unpublished changes when %s', async (_case, published, draft) => {
      expect(await germanHasPendingChanges(cardFields, published, draft)).toBe(true);
    });

    it.each([
      ['the same link', { link: PAGE }, { link: PAGE }],
      ['no link, missing in one version and empty in the other', {}, { link: null }],
      ['the same image', { image: 'image-a' }, { image: 'image-a' }],
      [
        'a gallery changed only in French',
        { gallery: { de: ['image-a'], fr: ['image-a'] } },
        { gallery: { de: ['image-a'], fr: ['image-b'] } },
      ],
    ])('shows no unpublished changes for %s', async (_case, published, draft) => {
      expect(await germanHasPendingChanges(cardFields, published, draft)).toBe(false);
    });
  });

  describe('a page with text, rich text and blocks', () => {
    const pageFields = [
      { name: 'metaTitle', type: 'text', localized: true, presentational: false },
      { name: 'body', type: 'richText', localized: false, presentational: false },
      { name: 'steps', type: 'array', localized: false, presentational: false, fields: [] },
      {
        name: 'columns',
        type: 'blocks',
        localized: false,
        presentational: false,
        blocks: [
          {
            slug: 'text',
            fields: [
              { name: 'blockName', type: 'text', localized: false, presentational: false },
              { name: 'title', type: 'text', localized: false, presentational: false },
            ],
          },
        ],
      },
      { name: 'lastEditedByUser', type: 'relationship', localized: false, presentational: false },
      {
        name: 'allowsEditsByUser',
        type: 'relationship',
        hasMany: true,
        localized: false,
        presentational: false,
      },
    ];
    const column = { blockType: 'text', id: 'column-1', title: 'Programm' };

    it('shows unpublished changes when a link in the text points at another page', async () => {
      expect(
        await germanHasPendingChanges(
          pageFields,
          { body: richText('page-a') },
          { body: richText('page-b') },
        ),
      ).toBe(true);
    });

    it.each([
      ['the same link in the text', { body: richText('page-a') }, { body: richText('page-a') }],
      [
        // how a publish in one language stores the empty fields of the others
        'a translated field without a value, stored empty in one version',
        { metaTitle: {} },
        {},
      ],
      ['an array without rows, missing in one version', { steps: [] }, {}],
      ['blocks without a single block, missing in both versions', {}, {}],
      ['blocks without a single block, missing in one version', { columns: [] }, {}],
      [
        'a renamed block title, which the page never shows',
        { columns: [column] },
        { columns: [{ ...column, blockName: 'Spalte links' }] },
      ],
      [
        'who edited the page last and who may edit it',
        { lastEditedByUser: 'user-a', allowsEditsByUser: [] },
        { lastEditedByUser: 'user-b', allowsEditsByUser: ['user-b'] },
      ],
    ])('shows no unpublished changes for %s', async (_case, published, draft) => {
      expect(await germanHasPendingChanges(pageFields, published, draft)).toBe(false);
    });
  });
});
