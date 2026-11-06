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
});
