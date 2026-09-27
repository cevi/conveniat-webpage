import {
  isAllowedQuantity,
  MATERIAL_LIST_MAX_QUANTITY,
  parseMaterialAnswer,
  serializeMaterialAnswer,
} from '@/features/payload-cms/components/form/utils/material-list';

describe('material list answers', () => {
  it('reads back what it wrote', () => {
    const lines = [
      { id: 'latte', name: 'Dachlatte', section: 'Holz', quantity: 12 },
      { id: 'spaten', quantity: 2 },
    ];
    expect(parseMaterialAnswer(serializeMaterialAnswer(lines))).toEqual(lines);
  });

  it('writes only the lines with a quantity, and nothing for an empty order', () => {
    expect(
      parseMaterialAnswer(
        serializeMaterialAnswer([
          { id: 'latte', quantity: 0 },
          { id: 'spaten', quantity: 2 },
        ]),
      ),
    ).toEqual([{ id: 'spaten', quantity: 2 }]);
    expect(serializeMaterialAnswer([{ id: 'latte', quantity: 0 }])).toBe('');
    expect(serializeMaterialAnswer([])).toBe('');
  });

  it('reads an empty answer as an order of nothing', () => {
    expect(parseMaterialAnswer('')).toEqual([]);
    expect(parseMaterialAnswer('   ')).toEqual([]);
  });

  it.each([
    ['text that is no JSON', 'zwölf Latten'],
    ['a JSON object instead of a list', '{"id":"latte","quantity":1}'],
    ['a line without an id', '[{"quantity":1}]'],
    ['a quantity as text', '[{"id":"latte","quantity":"1"}]'],
    ['a name that is no text', '[{"id":"latte","name":7,"quantity":1}]'],
    ['a list with something else in it', '[{"id":"latte","quantity":1},null]'],
  ])('refuses %s', (_description, value) => {
    expect(parseMaterialAnswer(value)).toBeUndefined();
  });
});

describe('isAllowedQuantity', () => {
  it('takes whole numbers from zero up to the maximum', () => {
    expect(isAllowedQuantity(0)).toBe(true);
    expect(isAllowedQuantity(3)).toBe(true);
    expect(isAllowedQuantity(MATERIAL_LIST_MAX_QUANTITY)).toBe(true);
  });

  it.each([-1, 1.5, MATERIAL_LIST_MAX_QUANTITY + 1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses %p',
    (quantity) => {
      expect(isAllowedQuantity(quantity)).toBe(false);
    },
  );
});
