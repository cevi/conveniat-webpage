jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { CEVIDB_GROUP_PROGRAM_TEAM: [210] },
}));

import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/payload-cms/payload-cms/access-rules/hof-administrator-role';
import type { ChannelAudience } from '@/features/payload-cms/payload-cms/utils/announcement-channel-audience';
import { isInChannelAudience } from '@/features/payload-cms/payload-cms/utils/announcement-channel-audience';

/** Cevi Uster's Hof group, and Züri 11's. */
const USTER = 4101;
const ZUERI_11 = 4102;
/** An Abteilung's own group, which is not a Hof. */
const ABTEILUNG_USTER = 77;

const context = { hofGroupIds: new Set([String(USTER), String(ZUERI_11)]) };
const avps: ChannelAudience = { targetType: 'avps' };

const adressverwalter = (id: number): { id: number; role_class: string } => ({
  id,
  role_class: HOF_ADMINISTRATOR_ROLE_CLASS,
});

describe('isInChannelAudience', () => {
  it('reaches the Adressverwalter of a Hof group in an AVP channel', () => {
    expect(isInChannelAudience([adressverwalter(USTER)], avps, context)).toBe(true);
  });

  it('reaches a Stellvertretung who holds the Adressverwalter role as well', () => {
    const stellvertretung = [
      { id: ZUERI_11, role_class: 'Group::MitgliederorganisationExterne::Mitglied' },
      adressverwalter(ZUERI_11),
    ];
    expect(isInChannelAudience(stellvertretung, avps, context)).toBe(true);
  });

  it('leaves out a plain member of a Hof group', () => {
    const member = [{ id: USTER, role_class: 'Group::MitgliederorganisationExterne::Mitglied' }];
    expect(isInChannelAudience(member, avps, context)).toBe(false);
  });

  it('leaves out an Adressverwalter of a group that is no Hof', () => {
    expect(isInChannelAudience([adressverwalter(ABTEILUNG_USTER)], avps, context)).toBe(false);
  });

  it('reaches the members of a picked Cevi.DB group and nobody else', () => {
    const audience: ChannelAudience = {
      targetType: 'cevi_groups',
      targetCeviGroups: [{ groupId: ABTEILUNG_USTER }],
    };
    expect(isInChannelAudience([{ id: ABTEILUNG_USTER }], audience, context)).toBe(true);
    expect(isInChannelAudience([{ id: USTER }], audience, context)).toBe(false);
  });

  it('reaches the holders of a picked role', () => {
    const audience: ChannelAudience = { targetType: 'roles', targetRoles: ['program-team'] };
    expect(isInChannelAudience([{ id: 210 }], audience, context)).toBe(true);
    expect(isInChannelAudience([{ id: USTER }], audience, context)).toBe(false);
  });

  it('reaches a user without groups only in a channel for everyone', () => {
    expect(isInChannelAudience(undefined, { targetType: 'all' }, context)).toBe(true);
    expect(isInChannelAudience(undefined, avps, context)).toBe(false);
  });
});
