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

const roleOf = async (roles: IncludedRole[]): Promise<string | undefined> => {
  const participations = await new EventService(clientWithRoles(roles)).listEventParticipations(
    '1',
    '100',
  );
  return participations[0]?.roleType;
};

describe('EventService.listEventParticipations with several roles on one participation', () => {
  it('bills the Hauptleitung over a Leitung and a participant role, in any order', async () => {
    const roles = [
      'Event::Camp::Role::Participant',
      'Event::Camp::Role::Leader',
      'Event::Camp::Role::AssistantLeader',
    ];
    for (const order of [roles, [...roles].reverse()]) {
      await expect(roleOf(order.map((type) => ({ participationId: 7, type })))).resolves.toBe(
        'Event::Camp::Role::Leader',
      );
    }
  });

  it('bills a Leitung over a participant role', async () => {
    await expect(
      roleOf([
        { participationId: 7, type: 'Event::Role::AssistantLeader' },
        { participationId: 7, type: 'Event::Role::Participant' },
      ]),
    ).resolves.toBe('Event::Role::AssistantLeader');
  });

  it('keeps the only role a participation has', async () => {
    await expect(roleOf([{ participationId: 7, type: 'Event::Role::Participant' }])).resolves.toBe(
      'Event::Role::Participant',
    );
  });
});
