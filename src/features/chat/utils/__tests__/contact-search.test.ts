import type { Contact } from '@/features/chat/api/queries/list-contacts';
import {
  describeContact,
  describeContactFunktionen,
  describeContactHof,
  groupContactsByLetter,
  matchesContactSearch,
  MIN_CONTACTS_FOR_LETTER_GROUPS,
} from '@/features/chat/utils/contact-search';

const ANNA: Contact = {
  userId: 'anna',
  name: 'Anna Muster',
  nickname: 'Fuchs',
  hoefe: ['Hof Nord', 'Hof Süd'],
  quartiere: ['Quartier 1', 'Quartier 2'],
};

/** A contact as a browser restores it from the cache it wrote before the Höfe existed. */
const CACHED: Contact = { userId: 'ben', name: 'Ben Beispiel' };

describe('describeContactHof', () => {
  it('names the Höfe and their Quartiere', () => {
    expect(describeContactHof({ ...ANNA, hoefe: ['Hof Süd'], quartiere: ['Quartier 2'] })).toBe(
      'Hof Süd · Quartier 2',
    );
  });

  it('lists every Hof of someone registered at two', () => {
    expect(describeContactHof(ANNA)).toBe('Hof Nord, Hof Süd · Quartier 1, Quartier 2');
  });

  it('shows a Hof that has no Quartier yet on its own', () => {
    expect(describeContactHof({ ...ANNA, hoefe: ['Hof West'], quartiere: [] })).toBe('Hof West');
  });

  it('shows nothing for a contact cached before the Höfe existed', () => {
    expect(describeContactHof(CACHED)).toBe('');
  });
});

describe('matchesContactSearch', () => {
  it('finds a contact by Hof and by Quartier, ignoring case', () => {
    expect(matchesContactSearch(ANNA, 'hof süd')).toBe(true);
    expect(matchesContactSearch(ANNA, 'QUARTIER 2')).toBe(true);
  });

  it('still finds a contact by name and nickname', () => {
    expect(matchesContactSearch(ANNA, 'muster')).toBe(true);
    expect(matchesContactSearch(ANNA, 'fuchs')).toBe(true);
    expect(matchesContactSearch(ANNA, 'hof ost')).toBe(false);
  });

  it('searches a cached contact without Höfe by name only', () => {
    expect(matchesContactSearch(CACHED, 'ben')).toBe(true);
    expect(matchesContactSearch(CACHED, 'hof')).toBe(false);
  });
});

describe('functions in the address book', () => {
  const LEAD: Contact = { ...ANNA, funktionen: ['Projektleitung', 'Ressortleitung Infrastruktur'] };

  it('lists every function of a contact in order', () => {
    expect(describeContactFunktionen(LEAD)).toBe('Projektleitung, Ressortleitung Infrastruktur');
  });

  it('finds a contact by a function', () => {
    expect(matchesContactSearch(LEAD, 'infrastruktur')).toBe(true);
  });

  it('shows no function for a contact cached before functions existed', () => {
    expect(describeContactFunktionen(CACHED)).toBe('');
  });
});

describe('the AVP of a Hof in the address book', () => {
  const AVP: Contact = {
    userId: 'avp',
    name: 'Anna Muster v/o Fuchs',
    hoefe: ['Cevi Uster', 'Züri 11'],
    quartiere: ['Quartier 3'],
    hofRoles: [
      { hof: 'Cevi Uster', quartier: 'Quartier 3', isAvp: true },
      { hof: 'Züri 11', quartier: undefined, isAvp: false },
    ],
  };

  it('names the role, the Hof and its Quartier, one part per Hof', () => {
    expect(describeContactHof(AVP)).toBe('AVP, Cevi Uster, Quartier 3 · Züri 11');
  });

  it('finds every AVP by searching for "avp"', () => {
    expect(matchesContactSearch(AVP, 'avp')).toBe(true);
    expect(matchesContactSearch(ANNA, 'avp')).toBe(false);
  });

  it('falls back to the plain Höfe for a contact cached before the roles existed', () => {
    const cached: Contact = { ...AVP, hofRoles: undefined };
    expect(describeContactHof(cached)).toBe('Cevi Uster, Züri 11 · Quartier 3');
  });
});

describe('describeContact', () => {
  it('joins functions, Höfe and the description', () => {
    expect(
      describeContact({
        userId: 'c',
        name: 'Cora Test',
        funktionen: ['Leitung Programm'],
        hofRoles: [{ hof: 'Cevi Uster', quartier: 'Quartier 3', isAvp: true }],
        description: 'Küche',
      }),
    ).toBe('Leitung Programm · AVP, Cevi Uster, Quartier 3 · Küche');
  });

  it('is empty for a contact cached before any of it existed', () => {
    expect(describeContact(CACHED)).toBe('');
  });
});

const byName = (name: string): string => name;

describe('groupContactsByLetter', () => {
  const names = ['Zora', 'äsche', 'Bär', 'Amsel', '3D', 'biber', 'Dachs', 'Elch', 'Fink', 'Gams'];

  it('sorts by name and groups under the first letter, umlauts with their vowel', () => {
    expect(groupContactsByLetter(names, byName, 'de')).toEqual([
      { letter: 'A', contacts: ['Amsel', 'äsche'] },
      { letter: 'B', contacts: ['Bär', 'biber'] },
      { letter: 'D', contacts: ['Dachs'] },
      { letter: 'E', contacts: ['Elch'] },
      { letter: 'F', contacts: ['Fink'] },
      { letter: 'G', contacts: ['Gams'] },
      { letter: 'Z', contacts: ['Zora'] },
      { letter: '#', contacts: ['3D'] },
    ]);
  });

  it(`lists fewer than ${MIN_CONTACTS_FOR_LETTER_GROUPS} contacts without letters`, () => {
    const nine = names.slice(0, MIN_CONTACTS_FOR_LETTER_GROUPS - 1);
    expect(groupContactsByLetter(nine, byName, 'de')).toEqual([
      {
        letter: undefined,
        contacts: ['Amsel', 'äsche', 'Bär', 'biber', 'Dachs', 'Elch', 'Fink', 'Zora', '3D'],
      },
    ]);
  });

  it(`heads the groups with letters from ${MIN_CONTACTS_FOR_LETTER_GROUPS} contacts on`, () => {
    const groups = groupContactsByLetter(names, byName, 'de');
    expect(names).toHaveLength(MIN_CONTACTS_FOR_LETTER_GROUPS);
    expect(groups.every(({ letter }) => letter !== undefined)).toBe(true);
  });

  it('has no group for no contacts', () => {
    expect(groupContactsByLetter([], byName, 'de')).toEqual([]);
  });
});
