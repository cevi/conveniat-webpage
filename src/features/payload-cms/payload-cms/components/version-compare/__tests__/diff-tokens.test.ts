import { diffTokens } from '@/features/payload-cms/payload-cms/components/version-compare/diff-tokens';

const words = (text: string): string[] => text.split(' ');

describe('diffTokens', () => {
  it('reports nothing for identical text', () => {
    expect(
      diffTokens(words('Jeder Hof hat einen Hofcoach'), words('Jeder Hof hat einen Hofcoach')),
    ).toEqual({
      removed: [],
      added: [],
    });
  });

  it('finds a word that was replaced in the middle', () => {
    const before = words('richten sich an alle AVPs');
    const after = words('richten sich primär an alle AVPs');

    expect(diffTokens(before, after)).toEqual({ removed: [], added: [2] });
  });

  it('finds words that were swapped for others', () => {
    const before = words('Das Aufbaulager findet im Juli statt');
    const after = words('Das Abbaulager findet im August statt');

    expect(diffTokens(before, after)).toEqual({ removed: [1, 4], added: [1, 4] });
  });

  it('finds a sentence appended at the end', () => {
    const before = words('schnell geklärt werden.');
    const after = words('schnell geklärt werden. Ihr könnt auch zuhören.');

    expect(diffTokens(before, after)).toEqual({ removed: [], added: [3, 4, 5, 6] });
  });

  it('treats everything as changed when one side is empty', () => {
    expect(diffTokens([], words('Town Hall Meetings'))).toEqual({ removed: [], added: [0, 1, 2] });
    expect(diffTokens(words('Town Hall Meetings'), [])).toEqual({ removed: [0, 1, 2], added: [] });
  });

  it('keeps repeated words apart', () => {
    const before = words('a b a');
    const after = words('a a');

    expect(diffTokens(before, after)).toEqual({ removed: [1], added: [] });
  });
});
