jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
    BILLING_ADMIN_GROUP_ID: [900],
    CEVIDB_GROUP_MATERIAL_TEAM: [108],
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: [109],
  },
}));
// `buildConfig` and the plugin are not under test, and both pull in ESM-only packages
jest.mock('payload', () => ({ buildConfig: jest.fn() }));
jest.mock('@/features/payload-cms/payload-cms/plugins/strip-control-characters-plugin', () => ({
  stripControlCharactersPlugin: jest.fn(),
}));

import {
  applyDefaultAccess,
  restrictInternalEntities,
} from '@/features/payload-cms/payload-cms/access-rules/build-secure-config';
import type { Access, PayloadRequest } from 'payload';

type Rules = Record<string, Access>;

const requestFor = (...groupIds: number[]): PayloadRequest =>
  ({ user: { id: 'u1', groups: groupIds.map((id) => ({ id })) } }) as unknown as PayloadRequest;

/** A camp participant: logged in through Cevi.DB, in no group that holds a role. */
const participant = requestFor(4242);
const fullAdmin = requestFor(541);
const billingTeam = requestFor(900);

const allows = (rules: Rules, operation: string, request: PayloadRequest): boolean =>
  rules[operation]?.({ req: request }) === true;

/** What Payload fills an undeclared operation with. */
const anyUser: Access = ({ req }) => Boolean(req.user);

const openToAnyUser = (): Rules => ({
  read: anyUser,
  create: anyUser,
  update: anyUser,
  delete: anyUser,
});

describe('applyDefaultAccess', () => {
  it('closes every operation a collection leaves out to a participant', () => {
    // what a plugin adds: some operations declared, the rest left to Payload
    const collection = { access: { read: () => true, create: () => false } as Rules };
    applyDefaultAccess({ collections: [collection] });

    for (const operation of ['update', 'delete', 'readVersions', 'unlock']) {
      expect(allows(collection.access, operation, participant)).toBe(false);
      expect(allows(collection.access, operation, fullAdmin)).toBe(true);
    }
  });

  it('leaves a declared operation as it was declared', () => {
    const collection = { access: { read: () => true, create: () => false } as Rules };
    applyDefaultAccess({ collections: [collection] });

    expect(allows(collection.access, 'read', participant)).toBe(true);
    expect(allows(collection.access, 'create', fullAdmin)).toBe(false);
  });

  it('closes a global without any rule to a participant', () => {
    const global = { access: {} as Rules };
    applyDefaultAccess({ globals: [global] });

    for (const operation of ['read', 'update', 'readVersions']) {
      expect(allows(global.access, operation, participant)).toBe(false);
      expect(allows(global.access, operation, fullAdmin)).toBe(true);
    }
  });
});

/** The entities Payload adds by itself, the way it leaves them. */
const build = (): {
  collections: { slug: string; access: Rules }[];
  globals: { slug: string; access: Rules }[];
} => ({
  collections: [
    { slug: 'payload-locked-documents', access: openToAnyUser() },
    { slug: 'payload-folders', access: openToAnyUser() },
    { slug: 'payload-preferences', access: openToAnyUser() },
  ],
  globals: [{ slug: 'payload-jobs-stats', access: openToAnyUser() }],
});

describe('restrictInternalEntities', () => {
  it('keeps participants out of the locks, the folders and the job statistics', () => {
    const config = build();
    restrictInternalEntities(config);

    for (const entity of [config.collections[0], config.collections[1], config.globals[0]]) {
      for (const operation of ['read', 'update']) {
        expect(allows(entity?.access ?? {}, operation, participant)).toBe(false);
      }
    }
  });

  it('lets whoever works in the admin panel lock the document they edit', () => {
    const config = build();
    restrictInternalEntities(config);
    const locks = config.collections[0]?.access ?? {};

    expect(allows(locks, 'create', billingTeam)).toBe(true);
    expect(allows(locks, 'delete', fullAdmin)).toBe(true);
  });

  it('closes the job statistics to everyone, the admins included', () => {
    const config = build();
    restrictInternalEntities(config);

    expect(allows(config.globals[0]?.access ?? {}, 'update', fullAdmin)).toBe(false);
  });

  it('leaves a collection it does not name alone', () => {
    const config = build();
    restrictInternalEntities(config);

    expect(allows(config.collections[2]?.access ?? {}, 'read', participant)).toBe(true);
  });
});
