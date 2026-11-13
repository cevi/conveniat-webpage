jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_HELPER_POOL: [],
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: [],
  },
}));
// the editor config only matters to the admin panel, and lexical ships as ESM only
jest.mock('@payloadcms/richtext-lexical', () => ({
  AlignFeature: jest.fn(),
  lexicalEditor: jest.fn(),
  UnorderedListFeature: jest.fn(),
}));
jest.mock('@/features/payload-cms/payload-cms/plugins/lexical-editor', () => ({
  minimalEditorFeatures: [],
}));

import { EmergencyCardsCollection } from '@/features/payload-cms/payload-cms/collections/emergency-cards';
import type { PayloadRequest } from 'payload';

const read = (user?: PayloadRequest['user']): unknown =>
  EmergencyCardsCollection.access?.read?.({ req: { user } as PayloadRequest });

describe('EmergencyCardsCollection read access', () => {
  it('shows a visitor only the cards published in the locale read', () => {
    expect(read()).toEqual({ _localized_status: { equals: { published: true } } });
  });

  it('shows a participant only the published cards', () => {
    const participant = { id: 'u1', groups: [{ id: 4242 }] } as unknown as PayloadRequest['user'];
    expect(read(participant)).toEqual({ _localized_status: { equals: { published: true } } });
  });

  it('shows the editors every card, the unpublished ones included', () => {
    const editor = { id: 'u2', groups: [{ id: 105 }] } as unknown as PayloadRequest['user'];
    expect(read(editor)).toBe(true);
  });
});
