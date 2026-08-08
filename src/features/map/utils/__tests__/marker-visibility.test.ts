import {
  isMarkerLabelVisibleAtZoom,
  isMarkerVisibleAtZoom,
  MARKER_LABEL_MIN_ZOOM,
} from '@/features/map/utils/marker-visibility';

describe('isMarkerVisibleAtZoom', () => {
  it('always shows markers of high importance', () => {
    expect(isMarkerVisibleAtZoom('high', 0)).toBe(true);
    expect(isMarkerVisibleAtZoom('high', 18)).toBe(true);
  });

  it('shows markers of medium importance from zoom 14', () => {
    expect(isMarkerVisibleAtZoom('medium', 13.9)).toBe(false);
    expect(isMarkerVisibleAtZoom('medium', 14)).toBe(true);
  });

  it('shows markers of low importance from zoom 16', () => {
    expect(isMarkerVisibleAtZoom('low', 15.9)).toBe(false);
    expect(isMarkerVisibleAtZoom('low', 16)).toBe(true);
  });
});

describe('isMarkerLabelVisibleAtZoom', () => {
  it('never labels markers that opted out', () => {
    expect(isMarkerLabelVisibleAtZoom(false, 'high', 20)).toBe(false);
  });

  it('labels opted-in markers only once zoomed in far enough', () => {
    expect(isMarkerLabelVisibleAtZoom(true, 'high', MARKER_LABEL_MIN_ZOOM - 0.1)).toBe(false);
    expect(isMarkerLabelVisibleAtZoom(true, 'high', MARKER_LABEL_MIN_ZOOM)).toBe(true);
  });

  it('does not label markers that are themselves hidden at this zoom level', () => {
    // low importance markers appear at zoom 16, which is also where labels start
    expect(isMarkerLabelVisibleAtZoom(true, 'low', 15.5)).toBe(false);
    expect(isMarkerLabelVisibleAtZoom(true, 'low', 16)).toBe(true);
  });
});
