import { getMarkerLabelColor } from '@/features/map/utils/marker-label-color';

describe('getMarkerLabelColor', () => {
  it('keeps colours that are already dark enough, normalized to #rrggbb', () => {
    expect(getMarkerLabelColor('#1e88e5')).toBe('#1e88e5');
    expect(getMarkerLabelColor('16a672')).toBe('#16a672');
    expect(getMarkerLabelColor('#F64955')).toBe('#f64955');
  });

  it('darkens light colours so the label stays legible', () => {
    const darkenedYellow = getMarkerLabelColor('#fbc02d');
    expect(darkenedYellow).not.toBe('#fbc02d');
    expect(darkenedYellow).toMatch(/^#[\da-f]{6}$/);
  });

  it('leaves values that are not hex colours untouched', () => {
    expect(getMarkerLabelColor('rebeccapurple')).toBe('rebeccapurple');
  });
});
