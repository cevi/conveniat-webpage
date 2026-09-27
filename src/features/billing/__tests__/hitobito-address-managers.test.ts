import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/payload-cms/payload-cms/access-rules/hof-administrator-role';
import type { HitobitoClient } from '@/features/registration_process/hitobito-api/client';

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

/** A Cevi.DB client whose legacy `people.json` of a group answers with the given body. */
const clientReturning = (body: unknown): HitobitoClient =>
  ({
    apiRequest: jest.fn(),
    config: { apiToken: 'token', baseUrl: 'https://db.cevi.ch' },
    getFrontendHeaders: (): Record<string, string> => ({}),
    frontendRequest: jest
      .fn()
      .mockResolvedValue({ response: { ok: true, status: 200 }, body: JSON.stringify(body) }),
  }) as unknown as HitobitoClient;

describe('HitobitoServiceAdapter.fetchAddressManagers', () => {
  it("lists the people with the Hof group's address manager role, and nobody else", async () => {
    const adapter = new HitobitoServiceAdapter(
      clientReturning({
        people: [
          {
            email: ' AV@Hof-Sued.ch ',
            first_name: 'Anna',
            last_name: 'Muster',
            nickname: 'Flink',
            links: { roles: ['1'] },
          },
          { email: 'externe@hof-sued.ch', links: { roles: ['2'] } },
          { email: 'jungschar@hof-sued.ch', links: { roles: ['3'] } },
          { email: 'ortsgruppe@hof-sued.ch', links: { roles: ['4'] } },
          { email: 'zweite@hof-sued.ch', first_name: 'Beat', links: { roles: [1] } },
          // the same person again, through a second role
          { email: 'av@hof-sued.ch', links: { roles: ['1'] } },
        ],
        linked: {
          roles: [
            { id: '1', role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
            { id: '2', role_class: 'Group::MitgliederorganisationExterne::Externer' },
            // an Adressverwalter of another kind of group has a role class of its own
            { id: '3', role_class: 'Group::Jungschar::Adressverwalter' },
            { id: '4', role_class: 'Group::Ortsgruppe::AdministratorCeviDB' },
          ],
        },
      }),
      logger,
    );

    await expect(adapter.fetchAddressManagers('990002')).resolves.toEqual([
      { name: 'Anna Muster v/o Flink', email: 'av@hof-sued.ch' },
      { name: 'Beat', email: 'zweite@hof-sued.ch' },
    ]);
  });
});
