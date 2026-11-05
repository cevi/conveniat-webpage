import { abteilungOfEventName } from '@/features/payload-cms/payload-cms/utils/abteilung-name';

describe('abteilungOfEventName', () => {
  it('names the Abteilung after the prefix every event shares', () => {
    expect(abteilungOfEventName('Hauptlager conveniat27 - Züri 11')).toBe('Züri 11');
    expect(abteilungOfEventName('Hauptlager conveniat27 - Cevi Uster - Jungschi')).toBe(
      'Cevi Uster - Jungschi',
    );
  });

  it('keeps an event that does not follow the pattern whole', () => {
    expect(abteilungOfEventName('Sommerlager Oberi')).toBe('Sommerlager Oberi');
    expect(abteilungOfEventName('Hauptlager conveniat27 - ')).toBe('Hauptlager conveniat27 -');
  });

  it('has no Abteilung for an event without a name', () => {
    const noName: string | undefined = undefined;
    expect(abteilungOfEventName(noName)).toBeNull();
    expect(abteilungOfEventName(null)).toBeNull();
    expect(abteilungOfEventName('  ')).toBeNull();
  });
});
