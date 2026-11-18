import type { HitobitoClient } from '@/lib/hitobito/client';
import { EventService } from '@/lib/hitobito/services/event.service';

/** One event role the JSON:API sideloads for a participation. */
interface IncludedRole {
  participationId: number;
  type: string;
}

/** A Cevi.DB client answering one page with participation 7 of person 42 and its roles. */
const clientWithRoles = (roles: IncludedRole[]): HitobitoClient =>
  ({
    apiRequest: jest.fn().mockResolvedValue({
      data: [
        {
          id: '7',
          type: 'event_participations',
          attributes: { event_id: 100, active: true },
          relationships: { participant: { data: { id: '42', type: 'people' } } },
        },
      ],
      included: [
        { id: '42', type: 'people', attributes: { first_name: 'Anna', last_name: 'Muster' } },
        ...roles.map((role, index) => ({
          id: String(index + 1),
          type: 'event_roles',
          attributes: { participation_id: role.participationId, type: role.type },
        })),
      ],
      links: { next: null },
      meta: { stats: { total: { count: 1 } } },
    }),
  }) as unknown as HitobitoClient;

const rolesOf = async (roles: IncludedRole[]): Promise<string[] | undefined> => {
  const participations = await new EventService(clientWithRoles(roles)).listEventParticipations(
    '1',
    '100',
  );
  return participations[0]?.roleTypes;
};

describe('EventService.listEventParticipations roles', () => {
  it('lists every role of a participation, in the order Cevi.DB sends them', async () => {
    await expect(
      rolesOf([
        { participationId: 7, type: 'Event::Camp::Role::Participant' },
        { participationId: 8, type: 'Event::Camp::Role::Cook' },
        { participationId: 7, type: 'Event::Camp::Role::Leader' },
      ]),
    ).resolves.toEqual(['Event::Camp::Role::Participant', 'Event::Camp::Role::Leader']);
  });

  it('lists no role for a participation Cevi.DB sends none for', async () => {
    await expect(rolesOf([])).resolves.toEqual([]);
  });
});
