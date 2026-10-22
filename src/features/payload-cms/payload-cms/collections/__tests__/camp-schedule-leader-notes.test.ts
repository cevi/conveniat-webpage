/**
 * @jest-environment node
 */

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('@/lib/prisma', () => ({ CourseType: { PROGRAM: 'PROGRAM' } }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));

const hasAdminOrWebAccess = jest.fn();
jest.mock('@/features/payload-cms/payload-cms/access-rules/roles', () => ({
  hasAdminOrWebAccess: (arguments_: unknown): unknown => hasAdminOrWebAccess(arguments_),
}));
jest.mock(
  '@/features/payload-cms/payload-cms/components/filled-status/inject-enrollment-count',
  () => ({
    makeInjectEnrollmentCount: (): unknown => jest.fn(),
  }),
);
jest.mock('@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change', () => ({
  flushPageCacheOnChange: jest.fn(),
}));
jest.mock('@/features/payload-cms/payload-cms/utils/sync-organisers', () => ({
  syncOrganisers: jest.fn(),
}));
jest.mock('@/features/payload-cms/payload-cms/utils/link-field-logic', () => ({
  patchRichTextLinkHook: {},
}));
jest.mock('@/features/payload-cms/payload-cms/collections/camp-map-collection', () => ({
  mapAnnotationDescriptionLexicalEditorSettings: {},
}));
jest.mock('@/features/payload-cms/payload-cms/endpoints/course-organiser-export', () => ({}));
jest.mock('@/features/payload-cms/payload-cms/endpoints/course-participants-export', () => ({}));
jest.mock('@/features/payload-cms/payload-cms/endpoints/course-participants-manager', () => ({}));

import {
  LEADER_NOTES_CONTEXT,
  hideLeaderNotes,
} from '@/features/payload-cms/payload-cms/collections/camp-schedule-entry-collection';

const notes = { safety: 'Gutes Schuhwerk.' };
const block = { id: 'entry-1', title: 'Kennenlernspiel', leaders: notes };

/** Runs the hook the way Payload does for one block it is about to hand out. */
const read = (request: { user: unknown; context: Record<string, unknown> }): unknown =>
  (hideLeaderNotes({ doc: block, req: request } as never) as { leaders?: unknown }).leaders;

describe('leader notes of a Lager-Programmblock', () => {
  beforeEach(() => hasAdminOrWebAccess.mockReturnValue(false));

  it('are left out of a read by the app, which has no user on the request', () => {
    // eslint-disable-next-line unicorn/no-null -- Payload sets `null` for no user
    expect(read({ user: null, context: {} })).toBeUndefined();
  });

  it('are left out for a logged-in participant reading over REST', () => {
    expect(read({ user: { id: 'participant' }, context: {} })).toBeUndefined();
  });

  it('reach the query that has checked the viewer', () => {
    // eslint-disable-next-line unicorn/no-null
    expect(read({ user: null, context: { [LEADER_NOTES_CONTEXT]: true } })).toEqual(notes);
  });

  it('reach an editor in the admin panel, or saving there would empty them', () => {
    hasAdminOrWebAccess.mockReturnValue(true);

    expect(read({ user: { id: 'editor' }, context: {} })).toEqual(notes);
  });
});

const flagOf = (leaders: unknown): unknown =>
  (
    hideLeaderNotes({
      doc: { ...block, leaders },
      // eslint-disable-next-line unicorn/no-null -- Payload sets `null` for no user
      req: { user: null, context: {} },
    } as never) as { hasLeaderSection?: unknown }
  ).hasLeaderSection;

describe('whether a Lager-Programmblock has a part for Leitende', () => {
  beforeEach(() => hasAdminOrWebAccess.mockReturnValue(false));

  it('is told to everybody, without the part itself', () => {
    expect(flagOf(notes)).toBe(true);
    expect(flagOf({ materials: [{ item: 'Seil' }] })).toBe(true);
  });

  it('is no for a block whose part is empty or only blank', () => {
    expect(flagOf({ materials: [], attachments: [], safety: '  ' })).toBe(false);
    // eslint-disable-next-line unicorn/no-null
    expect(flagOf(null)).toBe(false);
  });

  it('is left out of a read that did not select the part', () => {
    const publicPart = hideLeaderNotes({
      doc: { id: 'entry-1', title: 'Kennenlernspiel' },
      // eslint-disable-next-line unicorn/no-null
      req: { user: null, context: {} },
    } as never) as Record<string, unknown>;
    expect('hasLeaderSection' in publicPart).toBe(false);
  });
});
