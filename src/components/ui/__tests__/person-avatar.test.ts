import { avatarColorOf, initialsOf } from '@/components/ui/person-avatar';

describe('initialsOf', () => {
  it('takes the first letters of the first and the last name', () => {
    expect(initialsOf('Anna Muster')).toBe('AM');
    expect(initialsOf('Hans Peter von Beispiel')).toBe('HB');
  });

  it('leaves out the Ceviname', () => {
    expect(initialsOf('Anna Muster v/o Fuchs')).toBe('AM');
  });

  it('never shows a single letter for a single word', () => {
    expect(initialsOf('Fuchs')).toBe('FU');
    expect(initialsOf('v/o Fuchs')).toBe('FU');
  });

  it('keeps umlauts and emoji whole', () => {
    expect(initialsOf('Ömer Übel')).toBe('ÖÜ');
    expect(initialsOf('🦊 Fuchs')).toBe('🦊F');
  });

  it('falls back to a question mark for an empty name', () => {
    expect(initialsOf('   ')).toBe('?');
  });
});

describe('avatarColorOf', () => {
  it('gives a person the same colour every time', () => {
    expect(avatarColorOf('user-1')).toBe(avatarColorOf('user-1'));
  });
});
