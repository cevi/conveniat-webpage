import {
  buildFinanceCsvRows,
  formatFinanceCsv,
} from '@/features/billing/services/csv-export-service';
import type { BillParticipant } from '@/features/payload-cms/payload-types';

const participant = (overrides: Partial<BillParticipant>): BillParticipant =>
  ({
    fullName: 'Susanna Beispiel',
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
      Description: 'Leitendenbeitrag u18, Susanna Beispiel, Züri 11',
      AccountDebit: '11000',
      AccountCredit: '[CA]',
      Storniert: false,
      Stornogrund: '',
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

describe('buildFinanceCsvRows with replaced and cancelled bills', () => {
  it('lists a bill replaced by a newer one as cancelled, next to its replacement', () => {
    const rows = buildFinanceCsvRows(
      [
        participant({
          invoiceNumber: '2026-007',
          issuedBills: [
            {
              invoiceNumber: '2026-001',
              referenceNumber: '21 00000 00031 39471 430',
              invoiceAmount: 1500,
              billCreatedDate: '2026-05-20T08:00:00.000Z',
              cancelledDate: '2026-06-02T08:00:00.000Z',
              cancelReason: 'Ersetzt durch Rechnung 2026-007.',
            },
            {
              invoiceNumber: '2026-007',
              referenceNumber: '21 00000 00031 39471 437',
              invoiceAmount: 1200,
              billCreatedDate: '2026-06-02T08:00:00.000Z',
            },
          ],
        }),
      ],
      SETTINGS,
    );

    expect(rows.map((row) => [row.DocInvoice, row.Amount, row.Storniert, row.Stornogrund])).toEqual(
      [
        ['2026-001', 1500, true, 'Ersetzt durch Rechnung 2026-007.'],
        ['2026-007', 1200, false, ''],
      ],
    );
    // Each bill keeps its own date and deadline, not the ones of the bill that replaced it.
    expect(rows[0]?.DateExpiration).toBe('2026-06-20');
  });

  it('keeps the bill of a removed registration, marked cancelled with the removal reason', () => {
    const [row] = buildFinanceCsvRows(
      [
        participant({
          status: 'removed',
          removedDate: '2026-06-10T08:00:00.000Z',
          syncHistory: [
            { date: '2026-05-20T08:00:00.000Z', action: 'bill_generated' },
            {
              date: '2026-06-10T08:00:00.000Z',
              action: 'removed_detected',
              reviewReason: 'Die Anmeldung ist in der Cevi.DB nicht mehr vorhanden.',
            },
          ],
        }),
      ],
      SETTINGS,
    );

    expect(row).toMatchObject({
      DocInvoice: '2026-001',
      Amount: 1500,
      Storniert: true,
      Stornogrund: 'Die Anmeldung ist in der Cevi.DB nicht mehr vorhanden.',
    });
  });

  it('recovers bills replaced before the history existed from their PDF names', () => {
    const rows = buildFinanceCsvRows(
      [
        participant({
          invoiceNumber: '2026-042',
          billCreatedDate: '2026-07-01T08:00:00.000Z',
          billPdfs: [
            { id: 'a', filename: 'Rechnung-2026-001-1779264000000.pdf' },
            { id: 'b', filename: 'Rechnung-2026-042-1782892800000.pdf' },
          ] as never,
        }),
      ],
      SETTINGS,
    );

    expect(rows.map((row) => [row.DocInvoice, row.Amount, row.Storniert, row.Stornogrund])).toEqual(
      [
        // The amount was overwritten by the new bill, so it is left empty, not guessed.
        ['2026-001', undefined, true, 'Ersetzt durch Rechnung 2026-042.'],
        ['2026-042', 1500, false, ''],
      ],
    );
  });

  it('writes no line for a registration that was never billed', () => {
    const rows = buildFinanceCsvRows(
      // eslint-disable-next-line unicorn/no-null -- Payload stores absent text fields as null
      [participant({ status: 'new', invoiceNumber: null, billCreatedDate: null })],
      SETTINGS,
    );

    expect(rows).toEqual([]);
  });

  it('lists the bills of all registrations in invoice order', () => {
    const rows = buildFinanceCsvRows(
      [participant({ invoiceNumber: '2026-010' }), participant({ invoiceNumber: '2026-002' })],
      SETTINGS,
    );

    expect(rows.map((row) => row.DocInvoice)).toEqual(['2026-002', '2026-010']);
  });
});

describe('formatFinanceCsv', () => {
  it('writes the header and quotes only values that need it', () => {
    const csv = formatFinanceCsv(buildFinanceCsvRows([participant({})], SETTINGS));

    expect(csv).toBe(
      '﻿Date,DocInvoice,ExternalReference,Amount,DateExpiration,Description,AccountDebit,AccountCredit,Storniert,Stornogrund\r\n' +
        '2026-05-20,2026-001,21000000003139471430,1500.00,2026-06-20,"Leitendenbeitrag u18, Susanna Beispiel, Züri 11",11000,[CA],false,\r\n',
    );
  });

  it('writes only the header when nothing has been billed', () => {
    expect(formatFinanceCsv([])).toBe(
      '﻿Date,DocInvoice,ExternalReference,Amount,DateExpiration,Description,AccountDebit,AccountCredit,Storniert,Stornogrund\r\n',
    );
  });
});
