import { buildBookingLines } from '@/features/billing/services/csv-export-service';
import type { BillParticipant } from '@/features/payload-cms/payload-types';

const participant = (overrides: Partial<BillParticipant>): BillParticipant =>
  ({
    fullName: 'Max Mustermann',
    invoiceNumber: '2027-0001',
    referenceNumber: '96 12345 67890',
    invoiceAmount: 349.64,
    roleType: 'Event::Role::Participant',
    status: 'bill_sent',
    ...overrides,
  }) as unknown as BillParticipant;

const SPLIT_PRICING = [
  {
    roleTypePattern: 'Participant',
    label: 'Teilnehmendenbeitrag',
    amount: 330,
    vatCode: '8.1%',
    vatSplits: [
      { label: 'Beherbergung', share: 50, vatCode: '3.8%' },
      { label: 'Übrige Leistungen', share: 50, vatCode: '8.1%' },
    ],
  },
];

const SINGLE_RATE_PRICING = [
  {
    roleTypePattern: 'Participant',
    label: 'Teilnehmendenbeitrag',
    amount: 330,
    vatCode: '8.1%',
  },
];

describe('buildBookingLines', () => {
  it('books a single-rate bill as one line, as the export always did', () => {
    const lines = buildBookingLines(participant({ invoiceAmount: 356.73 }), SINGLE_RATE_PRICING);

    expect(lines).toEqual([{ amount: 356.73, vatCode: '8.1%', label: '' }]);
  });

  it('books one line per rate from the breakdown stored on the bill', () => {
    const lines = buildBookingLines(
      participant({
        vatBreakdown: [
          { label: 'Beherbergung', share: 50, netAmount: 165, vatCode: '3.8%', vatAmount: 6.27 },
          {
            label: 'Übrige Leistungen',
            share: 50,
            netAmount: 165,
            vatCode: '8.1%',
            vatAmount: 13.37,
          },
        ],
      }),
      SPLIT_PRICING,
    );

    expect(lines).toEqual([
      { amount: 171.27, vatCode: '3.8%', label: 'Beherbergung' },
      { amount: 178.37, vatCode: '8.1%', label: 'Übrige Leistungen' },
    ]);
    expect(lines.reduce((sum, line) => sum + line.amount, 0)).toBeCloseTo(349.64, 2);
  });

  it('prefers the stored breakdown over the current settings', () => {
    // The role has since been re-priced, but the bill in the participant's hands has not.
    const lines = buildBookingLines(
      participant({
        invoiceAmount: 356.73,
        vatBreakdown: [
          { label: '', share: 100, netAmount: 330, vatCode: '8.1%', vatAmount: 26.73 },
        ],
      }),
      SPLIT_PRICING,
    );

    expect(lines).toEqual([{ amount: 356.73, vatCode: '8.1%', label: '' }]);
  });

  it('re-derives the split for bills raised before the breakdown was stored', () => {
    const lines = buildBookingLines(participant({ invoiceAmount: 349.64 }), SPLIT_PRICING);

    expect(lines.map((line) => line.vatCode)).toEqual(['3.8%', '8.1%']);
    expect(lines.reduce((sum, line) => sum + line.amount, 0)).toBeCloseTo(349.64, 2);
  });

  it('falls back to the first pricing entry for an unknown role', () => {
    const lines = buildBookingLines(
      participant({ roleType: 'Event::Role::Cook', invoiceAmount: 100 }),
      SINGLE_RATE_PRICING,
    );

    expect(lines).toEqual([{ amount: 100, vatCode: '8.1%', label: '' }]);
  });
});
