import { buildVisitorRows } from '@/features/visit-day/api/visit-day-export';

describe('buildVisitorRows', () => {
  it('gives every visitor the shared answers and only their own numbered ones', () => {
    const submissions = new Map([
      [
        'submission-1',
        {
          createdAt: '2026-11-02T08:00:00.000Z',
          answers: [
            { field: 'vorname', value: 'Lea' },
            { field: 'essen_1', value: 'Vegi' },
            { field: 'essen_2', value: 'Fleisch' },
            { field: 'allergien_2', value: 'Nüsse' },
          ],
        },
      ],
    ]);
    const visitors = [1, 2].map((personNumber) => ({
      id: `visitor-${personNumber}`,
      submissionId: 'submission-1',
      personNumber,
      hofId: 'hof-uster',
      date: '2027-07-28',
    }));

    const { columns, rows } = buildVisitorRows(
      visitors,
      submissions,
      new Map([['hof-uster', 'Cevi Uster']]),
    );

    expect(columns).toEqual([
      'Besucher-ID',
      'Besuchstag',
      'Hof',
      'Person',
      'Anmelde-ID',
      'Angemeldet am',
      'vorname',
      'essen',
      'allergien',
    ]);
    expect(rows[0]).toMatchObject({ Hof: 'Cevi Uster', Person: 1, vorname: 'Lea', essen: 'Vegi' });
    expect(rows[0]).not.toHaveProperty('allergien');
    expect(rows[1]).toMatchObject({
      'Besucher-ID': 'visitor-2',
      vorname: 'Lea',
      essen: 'Fleisch',
      allergien: 'Nüsse',
    });
  });
});
