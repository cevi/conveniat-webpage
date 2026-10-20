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

  it('leaves a value that is not a list of ranges to be shown as submitted', () => {
    const form = formWith([{ blockType: 'dateSlotSelection', name: 'zeitfenster' }]);

    expect(getMailDisplayValues(form, { zeitfenster: 'ab Mitte Juli' }, 'de')).toEqual({});
    expect(getMailDisplayValues(form, {}, 'de')).toEqual({});
    expect(
      getMailDisplayValues(undefined, { zeitfenster: '2027-08-03 – 2027-08-06' }, 'de'),
    ).toEqual({});
  });
});
