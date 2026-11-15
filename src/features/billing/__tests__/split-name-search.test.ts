jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_HELPER_POOL: [],
    BILLING_ADMIN_GROUP_ID: [900],
  },
}));

import { BillParticipantsCollection } from '@/features/billing/collections/bill-participants';
import type { CollectionBeforeOperationHook, Where } from 'payload';

/**
 * The `where` the admin list sends for a search, after the collection's hooks have run. Built
 * the way `mergeListSearchAndWhere` from `payload/shared` does, which Jest cannot load.
 */
const listSearch = async (search: string): Promise<Where | undefined> => {
  let args = {
    where: {
      or: (BillParticipantsCollection.admin?.listSearchableFields ?? []).map((field) => ({
        [field]: { like: search },
      })),
    },
  } as Parameters<CollectionBeforeOperationHook>[0]['args'];
  for (const hook of BillParticipantsCollection.hooks?.beforeOperation ?? []) {
    args = (await hook({ args } as Parameters<CollectionBeforeOperationHook>[0])) ?? args;
  }
  return (args as { where?: Where }).where;
};

const fullNameCondition = async (search: string): Promise<Where | undefined> => {
  const where = await listSearch(search);
  return where?.or?.[0];
};

describe('bill participant list search', () => {
  it('splits "Vorname Nachname / Ceviname" into the name and the Ceviname', async () => {
    expect(await fullNameCondition('Max Muster / Ceviname')).toEqual({
      and: [{ fullName: { like: 'Max Muster' } }, { nickname: { like: 'Ceviname' } }],
    });
  });

  it('splits at "v/o" as well', async () => {
    expect(await fullNameCondition('Max Muster v/o Ceviname')).toEqual({
      and: [{ fullName: { like: 'Max Muster' } }, { nickname: { like: 'Ceviname' } }],
    });
  });

  it('searches the Ceviname alone when the name is left out', async () => {
    expect(await fullNameCondition('/ Ceviname')).toEqual({
      and: [{ nickname: { like: 'Ceviname' } }],
    });
  });

  it('leaves the other searchable fields and a plain search untouched', async () => {
    const where = await listSearch('Max Muster / Ceviname');
    expect(where?.or?.slice(1)).toEqual([
      { referenceNumber: { like: 'Max Muster / Ceviname' } },
      { 'issuedBills.referenceNumber': { like: 'Max Muster / Ceviname' } },
      { registrationNumber: { like: 'Max Muster / Ceviname' } },
    ]);
    expect(await fullNameCondition('Max Muster')).toEqual({ fullName: { like: 'Max Muster' } });
  });
});
