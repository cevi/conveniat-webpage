import {
  keepInOrder,
  mapScrollPosition,
} from '@/features/payload-cms/payload-cms/components/version-compare/scroll-map';

describe('mapScrollPosition', () => {
  // The second pane has an extra block of 400px between the first and the second anchor.
  const anchors = [
    { from: 0, to: 0 },
    { from: 200, to: 200 },
    { from: 600, to: 1000 },
    { from: 1000, to: 1400 },
  ];

  it('lands on the matching block at an anchor', () => {
    expect(mapScrollPosition(anchors, 200)).toBe(200);
    expect(mapScrollPosition(anchors, 600)).toBe(1000);
  });

  it('interpolates between two anchors', () => {
    expect(mapScrollPosition(anchors, 400)).toBe(600);
    expect(mapScrollPosition(anchors, 800)).toBe(1200);
  });

  it('stays within the page at both ends', () => {
    expect(mapScrollPosition(anchors, -50)).toBe(0);
    expect(mapScrollPosition(anchors, 5000)).toBe(1400);
  });

  it('survives two anchors at the same offset', () => {
    expect(
      mapScrollPosition(
        [
          { from: 0, to: 0 },
          { from: 0, to: 80 },
          { from: 100, to: 180 },
        ],
        50,
      ),
    ).toBe(130);
  });

  it('leaves the offset alone without anchors', () => {
    expect(mapScrollPosition([], 320)).toBe(320);
  });
});

describe('keepInOrder', () => {
  it('keeps everything that is already in order', () => {
    expect(keepInOrder([10, 20, 30], (value) => value)).toEqual([10, 20, 30]);
  });

  it('drops the one block that moved', () => {
    // the third block of the old version is now the first one
    expect(keepInOrder([200, 300, 100, 400], (value) => value)).toEqual([200, 300, 400]);
  });

  it('returns nothing for nothing', () => {
    expect(keepInOrder([], (value: number) => value)).toEqual([]);
  });
});
