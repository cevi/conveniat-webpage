import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/hof-dashboard/constants';
import { getAdministeredGroupIds } from '@/features/hof-dashboard/utils/hof-administrator';

describe('getAdministeredGroupIds', () => {
  it('opens the groups the user is address administrator of, as text like a Hof stores them', () => {
    expect(
      getAdministeredGroupIds([
        { id: 990_001, role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
        { id: 990_002, role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
      ]),
    ).toEqual(['990001', '990002']);
  });

  it('does not open a group through any other role in it', () => {
    expect(
      getAdministeredGroupIds([
        { id: 990_001, role_class: 'Group::Ortsgruppe::Abteilungsleitung' },
        { id: 990_002, role_class: 'Group::Ortsgruppe::Mitglied' },
        { id: 541, role_class: 'admin' },
      ]),
    ).toEqual([]);
  });

  it('lists a group once when the user holds the role twice', () => {
    expect(
      getAdministeredGroupIds([
        { id: 990_001, role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
        { id: 990_001, role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
      ]),
    ).toEqual(['990001']);
  });

  it('ignores roles without a usable group id and users without roles', () => {
    expect(
      getAdministeredGroupIds([
        { role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
        // eslint-disable-next-line unicorn/no-null -- Payload stores a missing id as null
        { id: null, role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
        { id: 0, role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
      ]),
    ).toEqual([]);
    expect(getAdministeredGroupIds([])).toEqual([]);
  });
});
