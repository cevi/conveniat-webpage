import { decodeDisplayText } from '@/features/registration_process/hitobito-api/html-parser';

describe('decodeDisplayText', () => {
  it('unwraps a name Cevi.DB escaped twice', () => {
    expect(decodeDisplayText('Hauptlager conveniat27 - Altstetten &amp;amp; Albisrieden')).toBe(
      'Hauptlager conveniat27 - Altstetten & Albisrieden',
    );
  });

  it('unwraps a name Cevi.DB escaped once', () => {
    expect(decodeDisplayText('Altstetten &amp; Albisrieden')).toBe('Altstetten & Albisrieden');
  });

  it('leaves a name without entities untouched', () => {
    expect(decodeDisplayText('Hauptlager conveniat27 – Hof Süd')).toBe(
      'Hauptlager conveniat27 – Hof Süd',
    );
  });

  it('decodes the other entities Cevi.DB emits', () => {
    expect(decodeDisplayText('L&#39;Abbaye &quot;Nord&quot;&nbsp;1')).toBe('L\'Abbaye "Nord" 1');
  });

  it('is idempotent, so a repaired name survives the next sync', () => {
    const once = decodeDisplayText('Altstetten &amp;amp; Albisrieden');
    expect(decodeDisplayText(once)).toBe(once);
  });
});
