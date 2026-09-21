import { getSpotsLeftText } from '@/features/schedule/utils/spots-left-text';

describe('getSpotsLeftText', () => {
  it('uses the singular form for a single remaining spot', () => {
    expect(getSpotsLeftText(1, 'de')).toBe('Platz frei');
    expect(getSpotsLeftText(1, 'en')).toBe('spot left');
    expect(getSpotsLeftText(1, 'fr')).toBe('place restante');
  });

  it('uses the plural form for more than one remaining spot', () => {
    expect(getSpotsLeftText(2, 'de')).toBe('Plätze frei');
    expect(getSpotsLeftText(2, 'en')).toBe('spots left');
    expect(getSpotsLeftText(42, 'fr')).toBe('places restantes');
  });
});
