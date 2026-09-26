import { buildOrderLines } from '@/features/hof-dashboard/utils/order-lines';

const LIST = new Map([
  ['rope', 'Bindestrick'],
  ['axe', 'Handbeil'],
]);

describe('buildOrderLines', () => {
  it('names each line after the list and drops what is not ordered', () => {
    expect(
      buildOrderLines(
        LIST,
        [],
        [
          { itemId: 'rope', quantity: 12 },
          { itemId: 'axe', quantity: 0 },
        ],
      ),
    ).toEqual({
      lines: [{ itemId: 'rope', name: 'Bindestrick', quantity: 12 }],
      unknownItemIds: [],
    });
  });

  it('counts a material asked for twice once, with the last quantity', () => {
    const { lines } = buildOrderLines(
      LIST,
      [],
      [
        { itemId: 'rope', quantity: 2 },
        { itemId: 'rope', quantity: 5 },
      ],
    );
    expect(lines).toEqual([{ itemId: 'rope', name: 'Bindestrick', quantity: 5 }]);
  });

  it('keeps lines of material that has left the list, as they were ordered', () => {
    const stored = [{ itemId: 'spade', name: 'Spaten', quantity: 3 }];
    expect(buildOrderLines(LIST, stored, []).lines).toEqual(stored);
  });

  it('reports material the list does not know, so nothing is dropped silently', () => {
    expect(buildOrderLines(LIST, [], [{ itemId: 'spade', quantity: 1 }]).unknownItemIds).toEqual([
      'spade',
    ]);
  });
});
