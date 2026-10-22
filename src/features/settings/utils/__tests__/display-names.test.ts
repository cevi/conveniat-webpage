import { displayNamesOf } from '@/features/settings/utils/display-names';

describe('displayNamesOf', () => {
  it('greets with the Ceviname from the nickname', () => {
    expect(displayNamesOf('Anna Muster', 'Fuchs')).toEqual({
      ceviName: 'Fuchs',
      fullName: 'Anna Muster',
      callName: 'Fuchs',
    });
  });

  it('reads the Ceviname out of the name when the nickname is missing', () => {
    expect(displayNamesOf('Anna Muster v/o Fuchs')).toEqual({
      ceviName: 'Fuchs',
      fullName: 'Anna Muster',
      callName: 'Fuchs',
    });
  });

  it('does not repeat the Ceviname when both carry it', () => {
    expect(displayNamesOf('Anna Muster v/o Fuchs', 'v/o Fuchs').fullName).toBe('Anna Muster');
  });

  it('greets with the first name without a Ceviname', () => {
    expect(displayNamesOf('Anna Muster', '')).toEqual({
      ceviName: undefined,
      fullName: 'Anna Muster',
      callName: 'Anna',
    });
  });
});
