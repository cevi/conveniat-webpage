import { validateParticipant } from '@/features/billing/services/validation-service';

describe('Validation Service', () => {
  const validPerson = {
    firstName: 'Max',
    lastName: 'Mustermann',
    nickname: 'Muster',
    street: 'Musterstrasse',
    housenumber: '42',
    zipCode: '8000',
    town: 'Zürich',
    country: 'Switzerland',
    gender: 'male',
    birthday: '1990-01-01',
  };

  const validAnswers = {
    'AHV-Nummer?': '756.1234.5678.90',
    'T-Shirt Grösse (unisex)': 'L',
    'Mailadresse für Rechnung': 'max@example.com',
    'Name der Krankenkasse': 'Assura',
    'Versichertennummer (Nummer auf der Krankenkassenkarte)': '123456789',
    'Notfallkontakt Vollständiger Name': 'Erika Mustermann',
    'Notfallkontakt Telefonnummer': '079 123 45 67',
    Essgewohnheit: 'vegetarisch',
  };

  it('should validate a complete participant successfully', () => {
    const result = validateParticipant({
      person: validPerson,
      answers: validAnswers,
    });

    expect(result.isValid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  it('should detect missing contact fields', () => {
    const result = validateParticipant({
      person: {
        ...validPerson,
        street: undefined,
        birthday: '',
      },
      answers: validAnswers,
    });

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Strasse');
    expect(result.missingFields).toContain('Geburtsdatum');
  });

  it('should detect missing answers via fuzzy matching', () => {
    const result = validateParticipant({
      person: validPerson,
      answers: {
        ...validAnswers,
        'Mailadresse für Rechnung': '',
        'AHV-Nummer?': '  ',
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Mailadresse für Rechnung');
    expect(result.missingFields).toContain('AHV-Nummer');
  });
});
