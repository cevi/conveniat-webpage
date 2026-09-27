import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { describeContactHof, matchesContactSearch } from '@/features/chat/utils/contact-search';

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
