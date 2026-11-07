import {
  getPublishingStatus,
  getPublishingStatusGlobal,
  STORED_PUBLISHING_STATUS,
  storedPublishingStatusField,
} from '@/features/payload-cms/payload-cms/hooks/publishing-status';
import type { CollectionConfig, FieldHookArgs, GlobalConfig } from 'payload';

const PAGE_ID = '65f0c1a2b3d4e5f6a7b8c9d0';
/** The database of a page without a latest version, so nothing is stored. */
const noVersions = { findVersions: jest.fn().mockResolvedValue({ docs: [] }) };
const fields = [{ name: 'title', type: 'text', localized: true, presentational: false }];

/** Runs the field hook against a page whose stored and draft versions are both `stored`. */
const statusOf = async (stored: object): Promise<unknown> => {
  const arguments_ = {
    data: { id: PAGE_ID },
    collection: { fields },
    req: { payload: { findByID: jest.fn().mockResolvedValue(stored), db: noVersions } },
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
    req: { payload: { findByID, db: noVersions } },
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

  it('notices a changed link in the text of every language', async () => {
    const textFields = [{ name: 'body', type: 'richText', localized: true, presentational: false }];
    const published = {
      body: { de: richText('page-a'), en: richText('page-a'), fr: richText('page-a') },
    };
    const draft = {
      body: { de: richText('page-a'), en: richText('page-b'), fr: richText('page-c') },
    };
    const findByID = jest.fn(({ draft: isDraft }: { draft: boolean }) =>
      Promise.resolve({ id: PAGE_ID, ...(isDraft ? draft : published) }),
    );

    const status = await getPublishingStatus({ slug: 'generic-page' } as CollectionConfig)({
      data: { id: PAGE_ID },
      collection: { fields: textFields },
      req: { payload: { findByID, db: noVersions } },
    } as unknown as FieldHookArgs);

    expect(status['de']?.pendingChanges).toBe(false);
    expect(status['en']?.pendingChanges).toBe(true);
    expect(status['fr']?.pendingChanges).toBe(true);
  });
});

describe('the stored publishing status', () => {
  const VERSION_ID = '65f0c1a2b3d4e5f6a7b8c9ff';
  const VERSION_SAVED_AT = '2026-11-07T10:00:00.000Z';
  const publishedInGerman = {
    de: { pendingChanges: false, published: true },
    en: { pendingChanges: false, published: false },
    fr: { pendingChanges: false, published: false },
  };
  const pendingInGerman = { ...publishedInGerman, de: { pendingChanges: true, published: true } };
  const publishedPage = {
    id: PAGE_ID,
    title: { de: 'Willkommen' },
    _localized_status: { de: { published: true } },
  };

  /**
   * Runs the hook for a page whose latest version changed the German title against the published
   * page, so a comparison finds "pending changes in German".
   */
  const read = async ({
    document,
    draft,
    transactionID,
    findByID = jest.fn(({ draft: isDraft }: { draft: boolean }) =>
      Promise.resolve(
        isDraft ? { ...publishedPage, title: { de: 'Willkommen im Lager' } } : publishedPage,
      ),
    ),
    updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  }: {
    document: object;
    draft: boolean;
    transactionID?: string;
    findByID?: jest.Mock;
    updateOne?: jest.Mock;
  }): Promise<{ status: unknown; findByID: jest.Mock; updateOne: jest.Mock; warn: jest.Mock }> => {
    const warn = jest.fn();
    const findVersions = jest
      .fn()
      .mockResolvedValue({ docs: [{ id: VERSION_ID, updatedAt: VERSION_SAVED_AT }] });
    const status = await getPublishingStatus({ slug: 'generic-page' } as CollectionConfig)({
      data: { id: PAGE_ID, ...document },
      draft,
      collection: { fields },
      req: {
        transactionID,
        payload: {
          findByID,
          db: { findVersions, versions: { 'generic-page': { updateOne } } },
          logger: { warn },
        },
      },
    } as unknown as FieldHookArgs);
    return { status, findByID, updateOne, warn };
  };

  it('shows the stored status of the version being read without reading the page again', async () => {
    const { status, findByID } = await read({
      draft: true,
      document: { [STORED_PUBLISHING_STATUS]: publishedInGerman },
    });

    expect(status).toEqual(publishedInGerman);
    expect(findByID).not.toHaveBeenCalled();
  });

  it('compares the versions when the version has no stored status, as after every save', async () => {
    const { status, findByID } = await read({
      draft: true,
      document: { [STORED_PUBLISHING_STATUS]: null },
    });

    expect(status).toEqual(pendingInGerman);
    expect(findByID).toHaveBeenCalledTimes(2);
  });

  it('stores what a draft read worked out on the version it compared, only while that is unchanged', async () => {
    const { updateOne } = await read({ draft: true, document: {} });

    expect(updateOne).toHaveBeenCalledWith(
      { _id: VERSION_ID, updatedAt: VERSION_SAVED_AT },
      // one field, never the whole version
      { $set: { [`version.${STORED_PUBLISHING_STATUS}`]: pendingInGerman } },
      // the version keeps its own timestamp
      { timestamps: false },
    );
  });

  it('stores nothing when the published page is read', async () => {
    const { status, updateOne } = await read({ draft: false, document: {} });

    expect(status).toEqual(pendingInGerman);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('stores nothing while the request holds an open transaction', async () => {
    const { status, updateOne } = await read({ draft: true, document: {}, transactionID: 'tx' });

    expect(status).toEqual(pendingInGerman);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('stores nothing when the page cannot be compared', async () => {
    const { status, updateOne } = await read({
      draft: true,
      document: {},
      findByID: jest.fn().mockRejectedValue(new Error('Not Found')),
    });

    expect(status).toEqual({
      de: { pendingChanges: false, published: false },
      en: { pendingChanges: false, published: false },
      fr: { pendingChanges: false, published: false },
    });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('still shows the status when it cannot be stored', async () => {
    const { status, warn } = await read({
      draft: true,
      document: {},
      updateOne: jest.fn().mockRejectedValue(new Error('connection reset')),
    });

    expect(status).toEqual(pendingInGerman);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('empties the stored status on every save, so a new version never inherits it', () => {
    const hook = storedPublishingStatusField.hooks?.beforeChange?.[0];
    expect(hook?.({ value: publishedInGerman } as unknown as FieldHookArgs)).toBeNull();
  });

  it('does not count the stored status as a change of the draft', async () => {
    expect(
      await germanHasPendingChanges(
        [...fields, { name: STORED_PUBLISHING_STATUS, type: 'json', localized: false }],
        { [STORED_PUBLISHING_STATUS]: null },
        { [STORED_PUBLISHING_STATUS]: publishedInGerman },
      ),
    ).toBe(false);
  });
});

/** The blocks of a landing page, one text block. */
const block = (body: string): object[] => [{ blockType: 'text', id: 'block-1', body }];

describe('getPublishingStatusGlobal', () => {
  const globalFields = [
    { name: 'title', type: 'text', localized: true, presentational: false },
    {
      name: 'pageContent',
      type: 'blocks',
      localized: true,
      presentational: false,
      blocks: [
        {
          slug: 'text',
          fields: [{ name: 'body', type: 'text', localized: false, presentational: false }],
        },
      ],
    },
  ];
  const landingPage = {
    id: 'landing-page',
    title: { de: 'Willkommen', fr: 'Bienvenue' },
    pageContent: { de: block('Hallo'), fr: block('Salut') },
    _localized_status: { de: { published: true }, fr: { published: true } },
  };

  /** The status of a global whose published version is the landing page above. */
  const globalStatusOf = async (draft: object): Promise<unknown> => {
    // Payload answers with every locale only when asked for 'all'; anything else is a mistake here
    const findGlobal = jest.fn(({ draft: isDraft, locale }: { draft: boolean; locale: string }) =>
      locale === 'all'
        ? Promise.resolve(isDraft ? { ...landingPage, ...draft } : landingPage)
        : Promise.reject(new Error(`unexpected locale ${locale}`)),
    );
    return getPublishingStatusGlobal({ slug: 'app-landing-page' } as GlobalConfig)({
      data: { id: 'landing-page' },
      global: { fields: globalFields },
      req: { payload: { findGlobal } },
    } as unknown as FieldHookArgs);
  };

  it('reports the published languages as up to date', async () => {
    expect(await globalStatusOf({})).toEqual({
      de: { pendingChanges: false, published: true },
      en: { pendingChanges: false, published: false },
      fr: { pendingChanges: false, published: true },
    });
  });

  it('shows unpublished changes in the language whose blocks changed', async () => {
    expect(
      await globalStatusOf({ pageContent: { de: block('Hallo zusammen'), fr: block('Salut') } }),
    ).toMatchObject({ de: { pendingChanges: true }, fr: { pendingChanges: false } });
  });

  it('shows unpublished changes in the language whose text changed', async () => {
    expect(await globalStatusOf({ title: { de: 'Willkommen', fr: 'Bonjour' } })).toMatchObject({
      de: { pendingChanges: false },
      fr: { pendingChanges: true },
    });
  });
});

/** The column «Mitmachen» of the main menu, with these links. */
const entry = (...subLabels: string[]): object => ({
  id: 'mitmachen',
  label: 'Mitmachen',
  subMenu: subLabels.map((label) => ({ id: label, label })),
});

describe('the main menu, a localized array', () => {
  const menuFields = [
    {
      name: 'mainMenu',
      type: 'array',
      localized: true,
      presentational: false,
      fields: [
        { name: 'label', type: 'text', localized: false, presentational: false },
        {
          // marked localized in the config, but stored inside the localized menu without locales
          name: 'subMenu',
          type: 'array',
          localized: true,
          presentational: false,
          fields: [{ name: 'label', type: 'text', localized: false, presentational: false }],
        },
      ],
    },
  ];
  const header = {
    id: 'header',
    mainMenu: { de: [entry('Als Teilnehmende')], fr: [{ id: 'participer', label: 'Participer' }] },
    _localized_status: { de: { published: true }, fr: { published: true } },
  };

  const menuStatusOf = async (draftMenu: object): Promise<unknown> => {
    const findGlobal = jest.fn(({ draft: isDraft }: { draft: boolean }) =>
      Promise.resolve(isDraft ? { ...header, mainMenu: draftMenu } : header),
    );
    return getPublishingStatusGlobal({ slug: 'header' } as GlobalConfig)({
      data: { id: 'header' },
      global: { fields: menuFields },
      req: { payload: { findGlobal } },
    } as unknown as FieldHookArgs);
  };

  it('reports an unchanged menu as up to date', async () => {
    expect(await menuStatusOf(header.mainMenu)).toMatchObject({
      de: { pendingChanges: false },
      fr: { pendingChanges: false },
    });
  });

  it('shows unpublished changes when a link was added to a column of the menu', async () => {
    expect(
      await menuStatusOf({
        ...header.mainMenu,
        de: [entry('Als Teilnehmende', 'Stand am Stadtleben')],
      }),
    ).toMatchObject({ de: { pendingChanges: true }, fr: { pendingChanges: false } });
  });

  it('shows unpublished changes when the label of a link was changed', async () => {
    expect(
      await menuStatusOf({ ...header.mainMenu, fr: [{ id: 'participer', label: 'Participez' }] }),
    ).toMatchObject({ de: { pendingChanges: false }, fr: { pendingChanges: true } });
  });
});

/** One text section of a page, with this text. */
const section = (text: string): object[] => [
  { blockType: 'richTextSection', id: 'section-1', text },
];

describe('a block inside the localized content of a page', () => {
  const pageFields = [
    {
      name: 'mainContent',
      type: 'blocks',
      localized: true,
      presentational: false,
      blocks: [
        {
          slug: 'richTextSection',
          // marked localized in the config, but stored inside the localized blocks without locales
          fields: [{ name: 'text', type: 'text', localized: true, presentational: false }],
        },
      ],
    },
  ];
  const page = {
    id: PAGE_ID,
    mainContent: {
      de: section('Teilnahmeprognose'),
      fr: section('prévisions de participation'),
    },
    _localized_status: { de: { published: true }, fr: { published: true } },
  };

  it('shows unpublished changes only in the language whose text changed', async () => {
    const findByID = jest.fn(({ draft }: { draft: boolean }) =>
      Promise.resolve(
        draft
          ? {
              ...page,
              mainContent: { ...page.mainContent, fr: section('estimation de participation') },
            }
          : page,
      ),
    );
    const status = await getPublishingStatus({ slug: 'generic-page' } as CollectionConfig)({
      data: { id: PAGE_ID },
      collection: { fields: pageFields },
      req: {
        payload: { findByID, db: { findVersions: jest.fn().mockResolvedValue({ docs: [] }) } },
      },
    } as unknown as FieldHookArgs);

    expect(status).toMatchObject({ de: { pendingChanges: false }, fr: { pendingChanges: true } });
  });
});
