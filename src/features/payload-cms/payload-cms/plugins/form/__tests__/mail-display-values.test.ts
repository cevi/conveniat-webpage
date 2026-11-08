import { getMailDisplayValues } from '@/features/payload-cms/payload-cms/plugins/form/mail-display-values';

const formWith = (fields: unknown[]): Parameters<typeof getMailDisplayValues>[0] => ({
  sections: [{ formSection: { fields } }],
});

describe('getMailDisplayValues', () => {
  it('shows marked days as dated ranges with their length, also inside a conditioned block', () => {
    const form = formWith([
      {
        blockType: 'conditionedBlock',
        fields: [{ blockType: 'dateSlotSelection', name: 'zeitfenster' }],
      },
    ]);

    expect(getMailDisplayValues(form, { zeitfenster: '2027-08-03 – 2027-08-06' }, 'fr')).toEqual({
      zeitfenster: 'mar. 03/08/2027 – ven. 06/08/2027 · 4 jours',
    });
  });

  it('shows the days picked for a job with a minimum duration under the derived name', () => {
    const form = formWith([
      {
        blockType: 'conditionedBlock',
        fields: [{ blockType: 'jobSelection', name: 'jobhauptlager' }],
      },
    ]);

    expect(
      getMailDisplayValues(
        form,
        {
          jobhauptlager: 'Mitarbeit in der Einsatzzentrale',
          jobhauptlager_zeitraum: '2027-07-20 – 2027-07-31',
        },
        'de',
      ),
    ).toEqual({ jobhauptlager_zeitraum: 'Di., 20.07.2027 – Sa., 31.07.2027 · 12 Tage' });
  });

  it('leaves a value that is not a list of ranges to be shown as submitted', () => {
    const form = formWith([{ blockType: 'dateSlotSelection', name: 'zeitfenster' }]);

    expect(getMailDisplayValues(form, { zeitfenster: 'ab Mitte Juli' }, 'de')).toEqual({});
    expect(getMailDisplayValues(form, {}, 'de')).toEqual({});
    expect(
      getMailDisplayValues(undefined, { zeitfenster: '2027-08-03 – 2027-08-06' }, 'de'),
    ).toEqual({});
  });

  it('shows the labels of the chosen options instead of their values', () => {
    const form = formWith([
      {
        blockType: 'conditionedBlock',
        fields: [
          {
            blockType: 'select',
            name: 'ausbildungen',
            options: [
              { value: 'kettensaege', label: 'Ausbildung Kettensäge' },
              { value: 'teleskoplader', label: 'Teleskoplader (R4)' },
            ],
          },
          {
            blockType: 'select',
            name: 'verantwortung',
            options: [{ value: 'ready', label: 'Ich würde gerne Verantwortung übernehmen. ' }],
          },
        ],
      },
    ]);

    expect(
      getMailDisplayValues(
        form,
        { ausbildungen: 'kettensaege, teleskoplader, unbekannt', verantwortung: 'ready' },
        'de',
      ),
    ).toEqual({
      ausbildungen: 'Ausbildung Kettensäge, Teleskoplader (R4), unbekannt',
      verantwortung: 'Ich würde gerne Verantwortung übernehmen.',
    });
  });

  it('names the area a helper wishes for in the mail locale', () => {
    const form = formWith([
      { blockType: 'dateSlotSelection', name: 'zeitfenster', ressortName: 'ressortwunsch' },
    ]);

    expect(getMailDisplayValues(form, { ressortwunsch: 'infrastruktur' }, 'de')).toEqual({
      ressortwunsch: 'Aufbau & Infrastruktur',
    });
    expect(getMailDisplayValues(form, { ressortwunsch: '' }, 'de')).toEqual({});
  });
});
