import { formatQuartierRange, quartierRufnameOf, shortQuartierName } from '@/utils/quartier-names';

const quartier = (number: number): { name: string; number: number } => ({
  name: `Quartier ${number}`,
  number,
});

const greif = { name: 'Quartier 5 - Greif', number: 5, rufname: 'Greif' };

describe('shortQuartierName', () => {
  it('writes a numbered Quartier as its number', () => {
    expect(shortQuartierName(greif)).toBe('Q5');
  });

  it('shows the full name of a Quartier without a number, as an older copy has it', () => {
    expect(shortQuartierName({ name: 'Quartier 5 - Greif' })).toBe('Quartier 5 - Greif');
  });
});

describe('quartierRufnameOf', () => {
  it('names a Quartier by its Rufname', () => {
    expect(quartierRufnameOf(greif)).toBe('Greif');
  });

  it('falls back to the full name while there is no Rufname', () => {
    expect(quartierRufnameOf({ name: 'Familienlager', number: 9, rufname: '' })).toBe(
      'Familienlager',
    );
  });
});

describe('formatQuartierRange', () => {
  it('writes neighbours as a range and the others as a list', () => {
    expect(formatQuartierRange([quartier(4), quartier(6), quartier(5)])).toBe('Q4–Q6');
    expect(formatQuartierRange([quartier(7), quartier(8)])).toBe('Q7–Q8');
    expect(formatQuartierRange([quartier(1), quartier(3), { name: 'Familienlager' }])).toBe(
      'Q1, Q3, Familienlager',
    );
  });

  it('does not read a number out of a name', () => {
    expect(formatQuartierRange([{ name: 'Quartier 4' }, { name: 'Quartier 5' }])).toBe(
      'Quartier 4, Quartier 5',
    );
  });
});
