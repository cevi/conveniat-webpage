import { flattenHofEvents } from '@/features/billing/services/hof-events';

describe('flattenHofEvents', () => {
  it('gives every event of a Hof its own row, carrying the group and addresses of the Hof', () => {
    const rows = flattenHofEvents([
      {
        groupId: '22',
        events: [
          { eventId: '11', eventName: 'Hauptlager conveniat27 - Züri 11' },
          { eventId: '12', eventName: 'Hauptlager conveniat27 - Züri 11 Leitende' },
        ],
        addressManagerEmails: 'av@zueri11.ch',
        reminderRecipientsOverride: 'chef@zueri11.ch',
      },
      {
        groupId: '23',
        events: [{ eventId: '13', eventName: 'Hauptlager conveniat27 - Schlatt' }],
      },
    ]);

    expect(rows).toEqual([
      {
        eventId: '11',
        eventName: 'Hauptlager conveniat27 - Züri 11',
        groupId: '22',
        addressManagerEmails: 'av@zueri11.ch',
        reminderRecipientsOverride: 'chef@zueri11.ch',
      },
      {
        eventId: '12',
        eventName: 'Hauptlager conveniat27 - Züri 11 Leitende',
        groupId: '22',
        addressManagerEmails: 'av@zueri11.ch',
        reminderRecipientsOverride: 'chef@zueri11.ch',
      },
      { eventId: '13', eventName: 'Hauptlager conveniat27 - Schlatt', groupId: '23' },
    ]);
  });

  it('leaves out cleared addresses instead of passing on empty values', () => {
    const [row] = flattenHofEvents([
      {
        groupId: '22',
        events: [{ eventId: '11', eventName: 'Hof Züri 11' }],
        addressManagerEmails: '',
        // eslint-disable-next-line unicorn/no-null
        reminderRecipientsOverride: null,
      },
    ]);

    expect(row).toEqual({ eventId: '11', eventName: 'Hof Züri 11', groupId: '22' });
  });

  it('yields nothing for a Hof without events', () => {
    // eslint-disable-next-line unicorn/no-null
    expect(flattenHofEvents([{ groupId: '22', events: null }, { groupId: '23' }])).toEqual([]);
  });
});
