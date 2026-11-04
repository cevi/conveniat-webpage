jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));

import { refundDueOn } from '@/features/visit-day/billing/visit-day-bill-booking';
import type { AddressBill } from '@/features/visit-day/billing/visit-day-bill-exports';
import { buildAddressRows } from '@/features/visit-day/billing/visit-day-bill-exports';

const bill = (overrides: Partial<AddressBill>): AddressBill => ({
  registrationNumber: '5321-B007',
  fullName: 'Anna Muster',
  street: 'Seestrasse 12',
  postalCode: '8610',
  city: 'Uster',
  persons: 1,
  status: 'open',
  travelPasses: [{ personNumber: 1, pass: 'halbtax' }],
  ...overrides,
});

describe('buildAddressRows', () => {
  it('sends one letter to an address, however its registrations wrote it', () => {
    const rows = buildAddressRows([
      bill({ status: 'paid' }),
      bill({
        registrationNumber: 'EXT-B003',
        street: ' seestrasse  12 ',
        city: 'USTER',
        persons: 2,
        travelPasses: [
          { personNumber: 1, pass: 'ga' },
          { personNumber: 2, pass: 'unter_6' },
        ],
      }),
    ]);

    expect(rows).toEqual([
      {
        Name: 'Anna Muster',
        Strasse: 'Seestrasse 12',
        PLZ: '8610',
        Ort: 'Uster',
        Billette: 3,
        GA: 1,
        Halbtax: 1,
        'kein Abo': 0,
        'unter 6 Jahre': 1,
        'anderes / ohne Angabe': 0,
        Anmeldungen: '5321-B007, EXT-B003',
        Bezahlt: 'teilweise',
      },
    ]);
  });

  it('leaves a cancelled registration without a ticket', () => {
    expect(buildAddressRows([bill({ status: 'cancelled' })])).toEqual([]);
  });

  it('counts a person whose pass the form did not ask for', () => {
    const [row] = buildAddressRows([bill({ persons: 2, travelPasses: [] })]);
    expect(row?.['anderes / ohne Angabe']).toBe(2);
  });
});

describe('refundDueOn', () => {
  it('owes back what was paid beyond the bill, but not the rounding the import accepts', () => {
    expect(refundDueOn(5400, 50)).toBe(0);
    expect(refundDueOn(10_000, 50)).toBe(50);
    // a bill reduced from two persons to one after it was paid
    expect(refundDueOn(5000, 25)).toBe(25);
  });
});
