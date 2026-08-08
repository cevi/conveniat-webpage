import type {
  LabelLayoutCandidate,
  LayoutRectangle,
} from '@/features/map/utils/marker-label-layout';
import {
  chooseLabelPlacements,
  getLabelRectangle,
  getMarkerIconRectangle,
  rectanglesOverlap,
} from '@/features/map/utils/marker-label-layout';

const labelSize = { width: 120, height: 16 };

const candidate = (
  id: string,
  x: number,
  y: number,
  overrides: Partial<LabelLayoutCandidate> = {},
): LabelLayoutCandidate => ({
  id,
  anchor: { x, y },
  preferredPlacement: 'right',
  labelSize,
  ...overrides,
});

describe('rectanglesOverlap', () => {
  it('reports overlapping rectangles', () => {
    expect(
      rectanglesOverlap(
        { left: 0, top: 0, right: 10, bottom: 10 },
        { left: 5, top: 5, right: 15, bottom: 15 },
      ),
    ).toBe(true);
  });

  it('does not count touching edges as an overlap', () => {
    expect(
      rectanglesOverlap(
        { left: 0, top: 0, right: 10, bottom: 10 },
        { left: 10, top: 0, right: 20, bottom: 10 },
      ),
    ).toBe(false);
  });
});

describe('getLabelRectangle', () => {
  it('puts the title beside the circle of its pin, never over it', () => {
    const anchor = { x: 100, y: 200 };
    const icon = getMarkerIconRectangle(anchor);

    for (const placement of ['left', 'right', 'top'] as const) {
      expect(rectanglesOverlap(getLabelRectangle(anchor, placement, labelSize), icon)).toBe(false);
    }
  });

  it('mirrors the left placement onto the right one', () => {
    const anchor = { x: 100, y: 200 };
    const left = getLabelRectangle(anchor, 'left', labelSize);
    const right = getLabelRectangle(anchor, 'right', labelSize);

    expect(anchor.x - left.right).toBe(right.left - anchor.x);
    expect(left.top).toBe(right.top);
  });
});

describe('chooseLabelPlacements', () => {
  it('keeps the preferred side when nothing is in the way', () => {
    const placements = chooseLabelPlacements([candidate('lonely', 100, 100)]);
    expect(placements.get('lonely')).toBe('right');
  });

  it('moves a title away from the pin of a neighbour to its right', () => {
    // the neighbour sits exactly where the title would go
    const placements = chooseLabelPlacements([
      candidate('first', 100, 100),
      candidate('neighbour', 180, 100),
    ]);

    expect(placements.get('first')).not.toBe('right');
  });

  it('never lets two titles overlap each other', () => {
    const first = candidate('a', 100, 100);
    const second = candidate('b', 100, 130);
    const placements = chooseLabelPlacements([first, second]);

    const rectangleFor = (entry: LabelLayoutCandidate): LayoutRectangle =>
      getLabelRectangle(entry.anchor, placements.get(entry.id) ?? 'right', labelSize);

    expect(rectanglesOverlap(rectangleFor(first), rectangleFor(second))).toBe(false);
  });

  it('ignores markers whose title is not shown', () => {
    const placements = chooseLabelPlacements([
      candidate('hidden', 100, 100, { labelSize: undefined }),
    ]);
    expect(placements.size).toBe(0);
  });
});
