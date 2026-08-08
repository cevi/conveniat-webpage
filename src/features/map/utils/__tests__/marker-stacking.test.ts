import {
  getCoincidentMarkerOffset,
  getCoordinateKey,
  getMarkerLabelPlacement,
  getMarkerTailAngle,
} from '@/features/map/utils/marker-stacking';

const distance = (a: [number, number], b: [number, number]): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('getCoordinateKey', () => {
  it('groups markers that sit on the same coordinate', () => {
    expect(getCoordinateKey([8.301_211, 46.502_822])).toBe(
      getCoordinateKey([8.301_211_000_1, 46.502_822_000_4]),
    );
  });

  it('keeps markers apart that are distinguishable on the map', () => {
    expect(getCoordinateKey([8.301_211, 46.502_822])).not.toBe(
      getCoordinateKey([8.301_311, 46.502_822]),
    );
  });
});

describe('getCoincidentMarkerOffset', () => {
  it('leaves a marker that shares its coordinate with no other untouched', () => {
    expect(getCoincidentMarkerOffset(0, 1)).toStrictEqual([0, 0]);
  });

  it('fans a pair out to either side instead of stacking them', () => {
    const [first, second] = [getCoincidentMarkerOffset(0, 2), getCoincidentMarkerOffset(1, 2)];

    expect(first[0]).toBeLessThan(0);
    expect(second[0]).toBeGreaterThan(0);
    // both lifted above the shared coordinate
    expect(first[1]).toBeLessThan(0);
    expect(second[1]).toBeLessThan(0);
  });

  it('keeps neighbouring markers apart whatever the size of the group', () => {
    for (const groupSize of [2, 3, 5, 8]) {
      for (let index = 1; index < groupSize; index++) {
        const gap = distance(
          getCoincidentMarkerOffset(index - 1, groupSize),
          getCoincidentMarkerOffset(index, groupSize),
        );
        expect(gap).toBeGreaterThanOrEqual(36);
      }
    }
  });
});

describe('getMarkerTailAngle', () => {
  it('leaves the tail pointing straight down for a marker on its coordinate', () => {
    expect(getMarkerTailAngle([0, 0])).toBe(0);
  });

  it('turns the tail towards the coordinate the marker was moved away from', () => {
    // moved to the right, so the tail has to lean back to the left, i.e. turn clockwise
    expect(getMarkerTailAngle([20, -28])).toBeGreaterThan(0);
    expect(getMarkerTailAngle([-20, -28])).toBeLessThan(0);
  });

  it('turns further the further the marker was moved sideways', () => {
    expect(getMarkerTailAngle([40, -28])).toBeGreaterThan(getMarkerTailAngle([20, -28]));
  });

  it('mirrors the angle for mirrored offsets', () => {
    expect(getMarkerTailAngle([20, -28])).toBeCloseTo(-getMarkerTailAngle([-20, -28]));
  });
});

describe('getMarkerLabelPlacement', () => {
  it('labels a lone marker on its right', () => {
    expect(getMarkerLabelPlacement(0, 1)).toBe('right');
  });

  it('labels a pair away from each other', () => {
    expect(getMarkerLabelPlacement(0, 2)).toBe('left');
    expect(getMarkerLabelPlacement(1, 2)).toBe('right');
  });

  it('labels the marker sitting straight above the coordinate on top', () => {
    expect(getMarkerLabelPlacement(0, 3)).toBe('left');
    expect(getMarkerLabelPlacement(1, 3)).toBe('top');
    expect(getMarkerLabelPlacement(2, 3)).toBe('right');
  });
});
