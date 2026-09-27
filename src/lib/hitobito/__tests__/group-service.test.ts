import type { HitobitoClient } from '@/lib/hitobito/client';
import { GroupService } from '@/lib/hitobito/services/group.service';

/** A Cevi.DB client whose `people.json` of a group answers with the given body. */
const clientReturning = (body: unknown): HitobitoClient =>
  ({
    config: { apiToken: 'token', baseUrl: 'https://db.cevi.ch' },
    getFrontendHeaders: (): Record<string, string> => ({}),
    frontendRequest: jest
      .fn()
      .mockResolvedValue({ response: { ok: true, status: 200 }, body: JSON.stringify(body) }),
  }) as unknown as HitobitoClient;

describe('GroupService.listPeopleWithRole', () => {
  it('lists the leaders of a Gremium, not its members', async () => {
    const groups = new GroupService(
      clientReturning({
        people: [
          { id: 11, email: 'Leitung@cevi.ch', links: { roles: ['1'] } },
          { id: 12, email: 'mitglied@cevi.ch', links: { roles: ['2'] } },
          { id: 13, links: { roles: [1] } },
        ],
        linked: {
          roles: [
            { id: '1', role_class: 'Group::DachverbandGremium::Leitung' },
            { id: '2', role_class: 'Group::DachverbandGremium::Mitglied' },
          ],
        },
      }),
    );

    await expect(
      groups.listPeopleWithRole('5001', 'Group::DachverbandGremium::Leitung'),
    ).resolves.toEqual([
      { personId: '11', email: 'leitung@cevi.ch' },
      { personId: '13', email: '' },
    ]);
  });
});

describe('GroupService refusing what it cannot trust', () => {
  it('throws on an answer of another shape instead of reporting nobody', async () => {
    const groups = new GroupService(clientReturning({ people: 'not a list' }));

    await expect(
      groups.listPeopleWithRole('5001', 'Group::DachverbandGremium::Leitung'),
    ).rejects.toThrow('unexpected shape');
  });

  it('sends nothing for a group id that is not a number', async () => {
    const frontendRequest = jest.fn();
    const groups = new GroupService({
      config: { apiToken: 'token', baseUrl: 'https://db.cevi.ch' },
      getFrontendHeaders: (): Record<string, string> => ({}),
      frontendRequest,
    } as unknown as HitobitoClient);

    await expect(
      groups.listPeopleWithRole('../people/1', 'Group::DachverbandGremium::Leitung'),
    ).rejects.toThrow('Not a Cevi.DB group id');
    expect(frontendRequest).not.toHaveBeenCalled();
  });
});
