import { withFullKeyUser } from '@/features/payload-cms/payload-cms/plugins/mcp/mcp-key-user';
import type { MCPAccessSettings } from '@payloadcms/plugin-mcp';
import type { PayloadRequest } from 'payload';

describe('withFullKeyUser', () => {
  it('runs the key as its user with the groups the populated user lacks', async () => {
    const storedUser = { id: 'user-1', fullName: 'Lea Muster', groups: [{ id: 4071 }] };
    const findByID = jest.fn().mockResolvedValue(storedUser);
    const request = { payload: { findByID } } as unknown as PayloadRequest;
    // what the plugin hands over: the user as `defaultPopulate` leaves it
    const settings = {
      user: { id: 'user-1', fullName: 'Lea Muster', collection: 'users', _strategy: 'mcp-api-key' },
      forms: { find: true },
    } as unknown as MCPAccessSettings;

    const result = await withFullKeyUser(request, settings);

    expect(result.user).toEqual({
      ...storedUser,
      collection: 'users',
      _strategy: 'mcp-api-key',
    });
    expect(result).toMatchObject({ forms: { find: true } });
  });
});
