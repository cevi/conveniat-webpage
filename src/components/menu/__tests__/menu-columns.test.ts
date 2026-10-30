import { splitMenuColumns } from '@/components/menu/menu-columns';

const entry = (label: string, children = 0): { label: string; subMenu: { label: string }[] } => ({
  label,
  subMenu: Array.from({ length: children }, (_, index) => ({ label: `${label} ${index}` })),
});

describe('splitMenuColumns', () => {
  it('gives every entry with entries below it a column and collects the rest, in order', () => {
    const { columns, more } = splitMenuColumns([
      entry('News'),
      entry('Das Lager', 3),
      entry('Kontakt'),
      entry('Mitmachen', 5),
      { label: 'Spenden', subMenu: undefined },
    ]);

    expect(columns.map((item) => item.label)).toEqual(['Das Lager', 'Mitmachen']);
    expect(more.map((item) => item.label)).toEqual(['News', 'Kontakt', 'Spenden']);
  });
});
