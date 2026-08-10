import {
  formatUserFullName,
  getContactDisplayName,
  getContactShortName,
} from '@/utils/format-user-name';

describe('formatUserFullName', () => {
  it('returns full name when nickname is missing or empty', () => {
    expect(formatUserFullName('Max Mustermann')).toBe('Max Mustermann');
    expect(formatUserFullName('Max Mustermann', '')).toBe('Max Mustermann');
    expect(formatUserFullName('Max Mustermann')).toBe('Max Mustermann');
  });

  it('combines full name and nickname with v/o prefix', () => {
    expect(formatUserFullName('Max Mustermann', 'Musterli')).toBe('Max Mustermann v/o Musterli');
  });

  it('avoids duplicating v/o if nickname already includes it', () => {
    expect(formatUserFullName('Max Mustermann', 'v/o Musterli')).toBe(
      'Max Mustermann v/o Musterli',
    );
    expect(formatUserFullName('Max Mustermann', 'V/O Musterli')).toBe(
      'Max Mustermann V/O Musterli',
    );
  });

  it('returns formatted nickname if full name is missing or empty', () => {
    expect(formatUserFullName('', 'Musterli')).toBe('v/o Musterli');
    expect(formatUserFullName(undefined, 'Musterli')).toBe('v/o Musterli');
  });

  it('returns empty string if both full name and nickname are empty', () => {
    expect(formatUserFullName('', '')).toBe('');
    expect(formatUserFullName()).toBe('');
  });
});

describe('getContactDisplayName', () => {
  it('does not repeat the nickname when the name already contains it', () => {
    expect(
      getContactDisplayName({ name: 'Anja Lindenmann v/o Pfäffer', nickname: 'Pfäffer' }),
    ).toBe('Anja Lindenmann v/o Pfäffer');
    expect(
      getContactDisplayName({ name: 'Anja Lindenmann v/o Pfäffer', nickname: 'v/o Pfäffer' }),
    ).toBe('Anja Lindenmann v/o Pfäffer');
    expect(
      getContactDisplayName({ name: 'Anja Lindenmann V/O Pfäffer', nickname: 'Pfäffer' }),
    ).toBe('Anja Lindenmann V/O Pfäffer');
  });

  it('appends the nickname when the name does not contain it', () => {
    expect(getContactDisplayName({ name: 'Anja Lindenmann', nickname: 'Pfäffer' })).toBe(
      'Anja Lindenmann v/o Pfäffer',
    );
    expect(getContactDisplayName({ name: 'Anja Lindenmann', nickname: 'v/o Pfäffer' })).toBe(
      'Anja Lindenmann v/o Pfäffer',
    );
  });

  it('does not confuse a different nickname with the one already in the name', () => {
    expect(getContactDisplayName({ name: 'Anja Lindenmann v/o Fuchs', nickname: 'Pfäffer' })).toBe(
      'Anja Lindenmann v/o Fuchs v/o Pfäffer',
    );
  });

  it('returns the plain name when no nickname is set', () => {
    expect(getContactDisplayName({ name: 'Anja Lindenmann' })).toBe('Anja Lindenmann');
    // eslint-disable-next-line unicorn/no-null
    expect(getContactDisplayName({ name: 'Anja Lindenmann', nickname: null })).toBe(
      'Anja Lindenmann',
    );
    expect(getContactDisplayName({ name: 'Anja Lindenmann', nickname: '  ' })).toBe(
      'Anja Lindenmann',
    );
  });
});

describe('getContactShortName', () => {
  it('returns nickname without v/o prefix when nickname is present', () => {
    expect(getContactShortName({ name: 'Max Mustermann v/o Musterli', nickname: 'Musterli' })).toBe(
      'Musterli',
    );
    expect(
      getContactShortName({ name: 'Max Mustermann v/o Musterli', nickname: 'v/o Musterli' }),
    ).toBe('Musterli');
  });

  it('falls back to first name when nickname is missing or empty', () => {
    // eslint-disable-next-line unicorn/no-null
    expect(getContactShortName({ name: 'Max Mustermann', nickname: null })).toBe('Max');
    expect(getContactShortName({ name: 'Melissa Wilms', nickname: '' })).toBe('Melissa');
  });
});
