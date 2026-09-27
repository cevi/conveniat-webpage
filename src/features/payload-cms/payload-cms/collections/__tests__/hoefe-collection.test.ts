jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    GROUPS_WITH_API_ACCESS: [541, 105],
    BILLING_ADMIN_GROUP_ID: '900',
  },
}));

import { HoefeCollection } from '@/features/payload-cms/payload-cms/collections/hoefe-collection';
import type { Field, FieldAccess, PayloadRequest } from 'payload';

/** A full admin who is in the billing team too: the most anyone can do in the admin panel. */
const BILLING_ADMIN = { id: 'admin', groups: [{ id: 541 }, { id: 900 }] };

const requestOf = (user: object): PayloadRequest =>
  ({ user, context: {} }) as unknown as PayloadRequest;

const fieldNamed = (name: string): Field => {
  const field = HoefeCollection.fields.find(
    (candidate) => 'name' in candidate && candidate.name === name,
  );
  if (field === undefined) throw new Error(`no field ${name}`);
  return field;
};

/** Whether the admin panel lets the user write the field on the given operation. */
const mayWrite = async (name: string, operation: 'create' | 'update'): Promise<boolean> => {
  const access = (fieldNamed(name) as { access?: Record<string, FieldAccess | undefined> })
    .access?.[operation];
  if (access === undefined) return true;
  return Boolean(await access({ req: requestOf(BILLING_ADMIN) } as Parameters<FieldAccess>[0]));
};

describe('HoefeCollection', () => {
  it('lets nobody create a Hof in the admin panel: the Cevi.DB sync does', async () => {
    const create = HoefeCollection.access?.create;
    expect(create).toBeDefined();
    await expect(Promise.resolve(create?.({ req: requestOf(BILLING_ADMIN) }))).resolves.toBe(false);
  });

  it.each(['name', 'groupId', 'events', 'addressManagerEmails'])(
    'shows %s from Cevi.DB read-only, to the admins as well',
    async (name) => {
      await expect(mayWrite(name, 'create')).resolves.toBe(false);
      await expect(mayWrite(name, 'update')).resolves.toBe(false);
      expect((fieldNamed(name) as { admin?: { readOnly?: boolean } }).admin?.readOnly).toBe(true);
    },
  );

  it('still lets the billing team override the reminder recipients', async () => {
    await expect(
      Promise.resolve(HoefeCollection.access?.update?.({ req: requestOf(BILLING_ADMIN) })),
    ).resolves.toBe(true);
    await expect(mayWrite('reminderRecipientsOverride', 'update')).resolves.toBe(true);
  });

  it('declares no contacts of its own: the dashboard reads them from Cevi.DB', () => {
    expect(
      HoefeCollection.fields.some((field) => 'name' in field && field.name === 'dashboardContacts'),
    ).toBe(false);
  });
});
