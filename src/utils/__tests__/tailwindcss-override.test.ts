import { cn } from '@/utils/tailwindcss-override';

describe('cn', () => {
  it('lets a later Tailwind v4 utility override the earlier one', () => {
    expect(cn('outline-none', 'outline-hidden')).toBe('outline-hidden');
    expect(cn('p-2', 'p-(--gap)')).toBe('p-(--gap)');
    expect(cn('inset-shadow-sm', 'inset-shadow-xs')).toBe('inset-shadow-xs');
  });

  it('keeps a background colour next to a v4 gradient', () => {
    // bg-linear-* sets background-image, so it does not replace bg-white.
    expect(cn('bg-white', 'bg-linear-to-r')).toBe('bg-white bg-linear-to-r');
  });

  it('resolves conflicts between the custom theme colours', () => {
    expect(cn('bg-white', 'bg-conveniat-green')).toBe('bg-conveniat-green');
    expect(cn('text-cevi-red', 'text-cevi-blue')).toBe('text-cevi-blue');
  });
});
