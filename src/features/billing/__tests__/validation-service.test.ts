/* eslint-disable unicorn/no-null, unicorn/no-useless-undefined */
import { isRoleAllowed, validateParticipant } from '@/features/billing/services/validation-service';

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

  describe('validateParticipant', () => {
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

    it('should detect invalid email format for Mailadresse für Rechnung', () => {
      const result = validateParticipant({
        person: validPerson,
        answers: {
          ...validAnswers,
          'Mailadresse für Rechnung': 'not-an-email',
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('Mailadresse für Rechnung');
      expect(result.missingAnmeldeangaben).toContain('Mailadresse für Rechnung');
    });

    it('should correctly separate missingStammdaten and missingAnmeldeangaben', () => {
      const result = validateParticipant({
        person: {
          ...validPerson,
          street: undefined,
          birthday: '',
        },
        answers: {
          ...validAnswers,
          'Mailadresse für Rechnung': '',
          'AHV-Nummer?': '  ',
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.missingStammdaten).toContain('Strasse');
      expect(result.missingStammdaten).toContain('Geburtsdatum');
      expect(result.missingAnmeldeangaben).toContain('Mailadresse für Rechnung');
      expect(result.missingAnmeldeangaben).toContain('AHV-Nummer');
    });
  });

  describe('isRoleAllowed', () => {
    const configured = [
      'Event::Role::Participant',
      'Event::Role::Leader',
      'Event::Role::AssistantLeader',
    ];

    it('allows a role the bill settings price', () => {
      expect(isRoleAllowed('Event::Role::Participant', configured)).toBe(true);
      expect(isRoleAllowed('Event::Role::Leader', configured)).toBe(true);
      expect(isRoleAllowed('Event::Role::AssistantLeader', configured)).toBe(true);
    });

    it('rejects a role nothing prices', () => {
      expect(isRoleAllowed('Event::Role::Guest', configured)).toBe(false);
      expect(isRoleAllowed('Event::Role::Visitor', configured)).toBe(false);
      // eslint-disable-next-line unicorn/no-useless-undefined -- a role can be missing
      expect(isRoleAllowed(undefined, configured)).toBe(false);
      // eslint-disable-next-line unicorn/no-null -- Payload hands back null for an unset field
      expect(isRoleAllowed(null, configured)).toBe(false);
      expect(isRoleAllowed('', configured)).toBe(false);
    });

    it('follows the configuration rather than a fixed list', () => {
      // The old hard-coded list said Cook was never billable and Guest never was either.
      expect(isRoleAllowed('Event::Role::Cook', ['Event::Role::Cook'])).toBe(true);
      expect(isRoleAllowed('Event::Role::Leader', ['Event::Role::Cook'])).toBe(false);
    });

    it('matches on a substring, the way pricing is resolved', () => {
      expect(isRoleAllowed('Event::Camp::Role::Leader', ['Leader'])).toBe(true);
    });

    it('bills nothing when no pricing is configured at all', () => {
      expect(isRoleAllowed('Event::Role::Leader', [])).toBe(false);
      expect(isRoleAllowed('Event::Role::Leader', [''])).toBe(false);
    });
  });
});
