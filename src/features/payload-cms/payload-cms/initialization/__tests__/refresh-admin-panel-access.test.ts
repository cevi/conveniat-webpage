jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105, 541],
    CEVIDB_GROUP_TRANSLATION_TEAM: [],
    CEVIDB_GROUP_PROGRAM_TEAM: [],
    BILLING_ADMIN_GROUP_ID: [77],
    CEVIDB_GROUP_MATERIAL_TEAM: [],
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: [900],
  },
}));

import { refreshAdminPanelAccess } from '@/features/payload-cms/payload-cms/initialization/refresh-admin-panel-access';
import type { BasePayload } from 'payload';

const payloadWith = (updateMany: jest.Mock): BasePayload =>
  ({ db: { collections: { users: { collection: { updateMany } } } } }) as unknown as BasePayload;

describe('refreshAdminPanelAccess', () => {
  it('grants and revokes by the admin panel groups of this deployment', async () => {
    const updateMany = jest
      .fn()
      .mockResolvedValueOnce({ modifiedCount: 2 })
      .mockResolvedValueOnce({ modifiedCount: 1 });

    await expect(refreshAdminPanelAccess(payloadWith(updateMany))).resolves.toBe(3);

    const groupIds = [541, 105, 77];
    expect(updateMany).toHaveBeenCalledWith(
      { 'groups.id': { $in: groupIds }, adminPanelAccess: { $ne: true } },
      { $set: { adminPanelAccess: true } },
    );
    expect(updateMany).toHaveBeenCalledWith(
      { 'groups.id': { $nin: groupIds }, adminPanelAccess: { $ne: false } },
      { $set: { adminPanelAccess: false } },
    );
  });
});
