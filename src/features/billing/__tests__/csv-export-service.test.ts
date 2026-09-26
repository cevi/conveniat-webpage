import {
  buildFinanceCsvRows,
  formatFinanceCsv,
} from '@/features/billing/services/csv-export-service';
import type { BillParticipant } from '@/features/payload-cms/payload-types';

const participant = (overrides: Partial<BillParticipant>): BillParticipant =>
  ({
    fullName: 'Susanna Läuchli',
    eventName: 'Hauptlager conveniat27 - Züri 11',
    invoiceNumber: '2026-001',
    referenceNumber: '21 00000 00031 39471 430',
    invoiceAmount: 1500,
    roleType: 'Event::Camp::Role::Leader',
    billCreatedDate: '2026-05-20T08:00:00.000Z',
    status: 'bill_sent',
    ...overrides,
  }) as unknown as BillParticipant;

const SETTINGS = {
  accountDebit: '11000',
  accountCredit: '[CA]',
  paymentDeadlineDays: 31,
  rolePricing: [
    { roleTypePattern: 'Participant', label: 'Teilnehmendenbeitrag', amount: 300 },
    { roleTypePattern: 'Leader', label: 'Leitendenbeitrag u18', amount: 240 },
  ],
};

describe('buildFinanceCsvRows', () => {
  it('fills every Banana column from the bill', () => {
    const [row] = buildFinanceCsvRows([participant({})], SETTINGS);

    expect(row).toEqual({
      Date: '2026-05-20',
      DocInvoice: '2026-001',
      ExternalReference: '21000000003139471430',
      Amount: 1500,
      DateExpiration: '2026-06-20',
      Description: 'Leitendenbeitrag u18, Susanna Läuchli, Züri 11',
      AccountDebit: '11000',
      AccountCredit: '[CA]',
    });
  });

  it('books a bill split across VAT rates as a single line', () => {
    const rows = buildFinanceCsvRows(
      [
        participant({
          invoiceAmount: 349.64,
          vatBreakdown: [
            { label: 'Beherbergung', share: 50, netAmount: 165, vatCode: '3.8%', vatAmount: 6.27 },
            { label: 'Übrige', share: 50, netAmount: 165, vatCode: '8.1%', vatAmount: 13.37 },
          ],
        }),
      ],
      SETTINGS,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.Amount).toBe(349.64);
  });

  it('dates the bill in Swiss time', () => {
    // 23:30 UTC on the 19th is already the 20th in Zurich.
    const [row] = buildFinanceCsvRows(
      [participant({ billCreatedDate: '2026-05-19T23:30:00.000Z' })],
      SETTINGS,
    );

    expect(row?.Date).toBe('2026-05-20');
  });
});

describe('formatFinanceCsv', () => {
  it('writes the header and quotes only values that need it', () => {
    const csv = formatFinanceCsv(buildFinanceCsvRows([participant({})], SETTINGS));

    expect(csv).toBe(
      '﻿Date,DocInvoice,ExternalReference,Amount,DateExpiration,Description,AccountDebit,AccountCredit\r\n' +
        '2026-05-20,2026-001,21000000003139471430,1500.00,2026-06-20,"Leitendenbeitrag u18, Susanna Läuchli, Züri 11",11000,[CA]\r\n',
    );
  });

  it('writes only the header when nothing has been billed', () => {
    expect(formatFinanceCsv([])).toBe(
      '﻿Date,DocInvoice,ExternalReference,Amount,DateExpiration,Description,AccountDebit,AccountCredit\r\n',
    );
  });
});
