jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_HELPER_POOL: [],
    CEVIDB_GROUP_SAFETY_TEAM: [110],
    FEATURE_ENABLE_NFC_WRISTBANDS: true,
  },
}));

import { WristbandsCollection } from '@/features/wristbands/payload-cms/wristbands-collection';
import type { FieldHook, PayloadRequest, RelationshipField, TextField } from 'payload';

const userIn = (groupId: number): PayloadRequest['user'] =>
  ({ id: `user-${groupId}`, groups: [{ id: groupId }] }) as unknown as PayloadRequest['user'];

const field = <T>(name: string): T =>
  WristbandsCollection.fields.find(
    (candidate) => 'name' in candidate && candidate.name === name,
  ) as T;

const ADMIN = 541;
const WEB_CORE_TEAM = 105;
const SAFETY_TEAM = 110;
/** A camp participant: logged in through Cevi.DB, in no group with a role. */
const PARTICIPANT = 4242;

describe('who reaches the wristbands over the REST API', () => {
  const operations = ['read', 'create', 'update', 'delete'] as const;

  const may = (groupId: number, operation: (typeof operations)[number]): unknown =>
    WristbandsCollection.access?.[operation]?.({
      req: { user: userIn(groupId) } as PayloadRequest,
    } as never);

  it('lets a full admin do everything, deleting a band to reset it included', () => {
    for (const operation of operations) expect(may(ADMIN, operation)).toBe(true);
  });

  it('lets the web core team fix a band but not delete it, which would undo a block', () => {
    for (const operation of ['read', 'create', 'update'] as const) {
      expect(may(WEB_CORE_TEAM, operation)).toBe(true);
    }
    expect(may(WEB_CORE_TEAM, 'delete')).toBe(false);
  });

  it('keeps participants and the safety team out, who go through the app instead', () => {
    for (const groupId of [PARTICIPANT, SAFETY_TEAM]) {
      for (const operation of operations) {
        const rule = WristbandsCollection.access?.[operation];
        expect(rule?.({ req: { user: userIn(groupId) } as PayloadRequest } as never)).toBe(false);
      }
    }
  });
});

describe('the UID of a band', () => {
  const uid = field<TextField>('uid');
  const normalize = uid.hooks?.beforeValidate?.[0] as FieldHook;
  const request = { i18n: { language: 'de' } } as unknown as PayloadRequest;
  const validate = (value: unknown): unknown =>
    (uid.validate as (value: unknown, options: unknown) => unknown)(value, { req: request });

  it('accepts a UID typed in lower case or with separators, as a reader app shows it', () => {
    const normalized: unknown = normalize({ value: '04:a1:b2:c3:d4:e5:f6' } as never);
    expect(normalized).toBe('04A1B2C3D4E5F6');
    expect(validate(normalized)).toBe(true);
  });

  it('rejects anything that is not seven bytes', () => {
    expect(validate('04A1B2C3')).toEqual(expect.stringContaining('14 Hex-Zeichen'));
    expect(validate('')).toEqual(expect.stringContaining('14 Hex-Zeichen'));
  });
});

describe('a person wears one active band at a time', () => {
  const participant = field<RelationshipField>('participant');
  const validate = async (
    activeBandsOfThePerson: number,
    status: 'active' | 'revoked' = 'active',
  ): Promise<unknown> => {
    const count = jest.fn().mockResolvedValue({ totalDocs: activeBandsOfThePerson });
    const request = { i18n: { language: 'de' }, payload: { count } } as unknown as PayloadRequest;
    return await (participant.validate as (value: unknown, options: unknown) => Promise<unknown>)(
      'registration-1',
      { req: request, id: 'band-1', siblingData: { status } },
    );
  };

  it('refuses a second active band and says to block the old one', async () => {
    expect(await validate(1)).toEqual(expect.stringContaining('Sperre zuerst das alte Band'));
  });

  it('allows the band when the person has no other active one', async () => {
    expect(await validate(0)).toBe(true);
  });

  it('allows a blocked band to keep naming the person who lost it', async () => {
    expect(await validate(1, 'revoked')).toBe(true);
  });
});
