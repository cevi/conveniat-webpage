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
