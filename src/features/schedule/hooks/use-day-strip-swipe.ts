import type { PanInfo } from 'framer-motion';
import type React from 'react';
import { useRef } from 'react';

/** a swipe shorter and slower than this is a tap that wobbled */
const minimumDistance = 30;
const minimumVelocity = 300;

/**
 * Swipes the strip of days in the date carousel, as the arrows do: by as many days as the
 * finger travelled, at least one. Spread the result onto the strip's `motion.div`.
 *
 * A swipe starts and ends on a day button, and the browser follows it with a click on that
 * button. The click that ends a swipe is swallowed, so swiping never selects a day.
 */
export const useDayStripSwipe = ({
  visibleDays,
  onPrevious,
  onNext,
}: {
  visibleDays: number;
  onPrevious: () => void;
  onNext: () => void;
}): {
  ref: React.RefObject<HTMLDivElement | null>;
  onPointerDownCapture: () => void;
  onDragStart: () => void;
  onDragEnd: (event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => void;
  onClickCapture: (event: React.MouseEvent) => void;
} => {
  const stripReference = useRef<HTMLDivElement>(null);
  const hasDragged = useRef(false);

  return {
    ref: stripReference,
    onPointerDownCapture: (): void => {
      hasDragged.current = false;
    },
    onDragStart: (): void => {
      hasDragged.current = true;
    },
    onDragEnd: (_, { offset, velocity }): void => {
      if (Math.abs(offset.x) < minimumDistance && Math.abs(velocity.x) < minimumVelocity) return;
      const dayWidth = (stripReference.current?.offsetWidth ?? 0) / visibleDays;
      const days = Math.max(1, dayWidth > 0 ? Math.round(Math.abs(offset.x) / dayWidth) : 1);
      const step = offset.x < 0 ? onNext : onPrevious;
      for (let index = 0; index < days; index++) step();
    },
    onClickCapture: (event): void => {
      if (!hasDragged.current) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
};
