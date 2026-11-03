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
      registrationNumber: '5321-B007',
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
      'Anmeldenummer',
      'Person',
      'Besucher-ID',
      'Besuchstag',
      'Hof',
      'Angemeldet am',
      'Formular-Eintrag',
      'vorname',
      'essen',
      'allergien',
    ]);
    expect(rows[0]).toMatchObject({
      Anmeldenummer: '5321-B007',
      Hof: 'Cevi Uster',
      Person: 1,
      vorname: 'Lea',
      essen: 'Vegi',
    });
    expect(rows[0]).not.toHaveProperty('allergien');
    expect(rows[1]).toMatchObject({
      'Besucher-ID': 'visitor-2',
      vorname: 'Lea',
      essen: 'Fleisch',
      allergien: 'Nüsse',
    });
  });

  it('names the Hof of a visitor without one', () => {
    const { rows } = buildVisitorRows(
      [
        {
          id: 'visitor-1',
          registrationNumber: 'EXT-B001',
          submissionId: 'submission-1',
          personNumber: 1,
          // eslint-disable-next-line unicorn/no-null
          hofId: null,
          date: '2027-07-29',
        },
      ],
      new Map(),
      new Map(),
    );

    expect(rows[0]).toMatchObject({ Hof: 'Ohne Bezug zu einem Hof' });
  });
});
