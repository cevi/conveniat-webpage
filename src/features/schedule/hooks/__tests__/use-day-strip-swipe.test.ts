/**
 * @jest-environment jsdom
 */

import { useDayStripSwipe } from '@/features/schedule/hooks/use-day-strip-swipe';
import { renderHook } from '@testing-library/react';
import type { PanInfo } from 'framer-motion';
import type React from 'react';

const pan = (x: number, velocity = 0): PanInfo => ({
  offset: { x, y: 0 },
  velocity: { x: velocity, y: 0 },
  delta: { x: 0, y: 0 },
  point: { x: 0, y: 0 },
});

const setup = (): {
  swipe: ReturnType<typeof useDayStripSwipe>;
  onPrevious: jest.Mock;
  onNext: jest.Mock;
} => {
  const onPrevious = jest.fn();
  const onNext = jest.fn();
  const { result } = renderHook(() => useDayStripSwipe({ visibleDays: 5, onPrevious, onNext }));
  // a strip of five days, 60 px each
  const strip = document.createElement('div');
  Object.defineProperty(strip, 'offsetWidth', { value: 300 });
  result.current.ref.current = strip;
  return { swipe: result.current, onPrevious, onNext };
};

const click = (): { event: React.MouseEvent; stopPropagation: jest.Mock } => {
  const stopPropagation = jest.fn();
  const event = { preventDefault: jest.fn(), stopPropagation } as unknown as React.MouseEvent;
  return { event, stopPropagation };
};

describe('useDayStripSwipe', () => {
  it('moves one day forward on a short swipe to the left', () => {
    const { swipe, onNext, onPrevious } = setup();
    swipe.onDragEnd(new MouseEvent('pointerup'), pan(-40));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('moves as many days back as the finger travelled to the right', () => {
    const { swipe, onPrevious } = setup();
    swipe.onDragEnd(new MouseEvent('pointerup'), pan(185));
    expect(onPrevious).toHaveBeenCalledTimes(3);
  });

  it('moves on a quick flick even when it is short', () => {
    const { swipe, onNext } = setup();
    swipe.onDragEnd(new MouseEvent('pointerup'), pan(-12, -800));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('ignores a tap that wobbled', () => {
    const { swipe, onNext, onPrevious } = setup();
    swipe.onDragEnd(new MouseEvent('pointerup'), pan(10, 50));
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('swallows the click that ends a swipe, but not the next tap', () => {
    const { swipe } = setup();
    swipe.onPointerDownCapture();
    swipe.onDragStart();
    const afterSwipe = click();
    swipe.onClickCapture(afterSwipe.event);
    expect(afterSwipe.stopPropagation).toHaveBeenCalled();

    swipe.onPointerDownCapture();
    const tap = click();
    swipe.onClickCapture(tap.event);
    expect(tap.stopPropagation).not.toHaveBeenCalled();
  });
});
