import {
  calculateModule10Recursive,
  describeQrReference,
  formatQrReference,
  formatRoleName,
  generateQrReference,
  resolveRoleDisplayName,
  resolveRoleOptions,
} from '@/features/billing/utils';

describe('Billing Utilities', () => {
  describe('calculateModule10Recursive', () => {
    it('should calculate correct modulo 10 checksum digit', () => {
      // Examples of valid mod10 values
      expect(calculateModule10Recursive('123456')).toBe(5);
      expect(calculateModule10Recursive('09000000000000000000000000')).toBe(3);
      expect(calculateModule10Recursive('09000123412345123456712345')).toBe(8);
    });
  });

  describe('generateQrReference', () => {
    it('should construct a 27-digit QR reference number with leading zeros and correct check digit', () => {
      const reference = generateQrReference('123456', '12345', '1234567', 9);

      // Length check: 27 digits
      expect(reference).toHaveLength(27);

      // Prefix check
      expect(reference.startsWith('090')).toBe(true);

      // Value matches
      // personId: 123456 -> 123456
      // eventId: 12345 -> 12345
      // participationId: 1234567 -> 1234567
      // counter: 9 -> 00009
      // baseReference = 090 123456 12345 1234567 00009 (26 digits)
      const baseExpected = '09012345612345123456700009';
      expect(reference.slice(0, 26)).toBe(baseExpected);

      const checkDigit = calculateModule10Recursive(baseExpected);
      expect(reference.slice(-1)).toBe(String(checkDigit));
    });

    it('should slice personId, eventId, and participationId correctly if they are too long', () => {
      // Inputs longer than their allocated slot are sliced to the last N digits, then zero-padded.
      // e.g. "999123456".slice(-6) = "123456", "9912345".slice(-5) = "12345", "9991234567".slice(-7) = "1234567"
      const reference = generateQrReference('999123456', '9912345', '9991234567', 123);
      expect(reference).toHaveLength(27);

      // Expected padded/sliced segments:
      // person: "123456"
      // event: "12345"
      // participation: "1234567"
      // counter: "00123"
      const baseExpected = '09012345612345123456700123';
      expect(reference.slice(0, 26)).toBe(baseExpected);
    });
  });
});

describe('formatRoleName', () => {
  it('names the plain event roles in German', () => {
    expect(formatRoleName('Event::Role::Participant')).toBe('Teilnehmer:in');
    expect(formatRoleName('Event::Role::Leader')).toBe('Leiter:in');
    expect(formatRoleName('Event::Role::AssistantLeader')).toBe('Hilfsleiter:in');
  });

  it('names the camp variants the same way', () => {
    // Hitobito namespaces the same role twice; a participant should not see the difference.
    expect(formatRoleName('Event::Camp::Role::Leader')).toBe('Leiter:in');
    expect(formatRoleName('Event::Camp::Role::Participant')).toBe('Teilnehmer:in');
  });

  it('falls back to the bare suffix for a role nobody has mapped yet', () => {
    expect(formatRoleName('Event::Role::Quartermaster')).toBe('Quartermaster');
  });

  it('renders a dash when the role never made it out of Cevi.DB', () => {
    expect(formatRoleName('')).toBe('–');
    // eslint-disable-next-line unicorn/no-useless-undefined -- a missing role is the case under test
    expect(formatRoleName(undefined)).toBe('–');
  });
});

describe('describeQrReference', () => {
  it('assembles the fields in order and totals 27 digits', () => {
    const { reference, segments } = describeQrReference('123456', '1234', '9012', 1);

    expect(segments.map((segment) => segment.digits)).toEqual([
      '090',
      '123456',
      '01234',
      '0009012',
      '00001',
      '0',
    ]);
    expect(segments.map((segment) => segment.digits).join('')).toBe(reference);
    expect(reference).toHaveLength(27);
  });

  it('describes exactly what generateQrReference builds', () => {
    // The explanation in the admin panel is only worth showing if it cannot drift.
    const { reference } = describeQrReference('987654', '55', '7', 42);
    expect(reference).toBe(generateQrReference('987654', '55', '7', 42));
  });

  it('keeps the varying end of an id that is too long for its field', () => {
    const { segments } = describeQrReference('1234567890', '1234', '9012', 1);
    expect(segments[1]?.digits).toBe('567890');
  });
});

describe('formatQrReference', () => {
  it('groups from the right, leaving the first block short', () => {
    expect(formatQrReference('090123456012340009012000010')).toBe(
      '09 01234 56012 34000 90120 00010',
    );
  });

  it('round-trips the reference it was given', () => {
    const reference = generateQrReference('123456', '1234', '9012', 1);
    expect(formatQrReference(reference).replaceAll(' ', '')).toBe(reference);
  });
});

describe('resolveRoleDisplayName', () => {
  it('prefers the name an operator configured', () => {
    expect(
      resolveRoleDisplayName({
        roleTypePattern: 'Event::Role::Leader',
        label: 'Leitendenbeitrag',
        roleName: 'Leitungsperson',
      }),
    ).toBe('Leitungsperson');
  });

  it('falls back to the built-in German name, not to the fee label', () => {
    // The fee label says what is charged; the role says what the person is.
    expect(
      resolveRoleDisplayName({
        roleTypePattern: 'Event::Role::Leader',
        label: 'Leitendenbeitrag',
      }),
    ).toBe('Leiter:in');
  });

  it('ignores a role name that is only whitespace', () => {
    expect(
      resolveRoleDisplayName({
        roleTypePattern: 'Event::Role::Participant',
        label: 'Teilnehmendenbeitrag',
        roleName: '   ',
      }),
    ).toBe('Teilnehmer:in');
  });
});

describe('resolveRoleOptions', () => {
  const pricing = [
    { roleTypePattern: 'Participant', label: 'Teilnehmendenbeitrag', roleName: 'Teilnehmer:in' },
    { roleTypePattern: 'Leader', label: 'Leitendenbeitrag', roleName: 'Leiter:in' },
    { roleTypePattern: 'Cook', label: 'Küchenbeitrag', roleName: 'Küche' },
  ];

  it('lists every configured role and ticks the matching one', () => {
    expect(resolveRoleOptions('Event::Role::Leader', pricing)).toEqual([
      { name: 'Teilnehmer:in', checked: false },
      { name: 'Leiter:in', checked: true },
      { name: 'Küche', checked: false },
    ]);
  });

  it('ticks exactly one role', () => {
    const ticked = resolveRoleOptions('Event::Role::Participant', pricing).filter(
      (option) => option.checked,
    );
    expect(ticked).toHaveLength(1);
  });

  it('ticks the first entry for an unmatched role, which is the one that gets billed', () => {
    // resolvePricing falls back to the first entry, so the tick has to agree with the price.
    const options = resolveRoleOptions('Event::Role::Quartermaster', pricing);
    expect(options[0]?.checked).toBe(true);
  });

  it('returns nothing when no role pricing is configured', () => {
    expect(resolveRoleOptions('Event::Role::Leader', [])).toEqual([]);
  });
});
