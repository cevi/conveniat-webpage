import { cn } from '@/utils/tailwindcss-override';
import { Circle, CircleCheck } from 'lucide-react';
import type React from 'react';

// the check on a filled circle takes the colour of what the ticks sit on
const surfaceClassNames = {
  white: '[&_path]:stroke-white',
  brand: '[&_path]:stroke-conveniat-green',
} as const;

/**
 * A circled check in front of a second circle: outlined for a message delivered, filled for one
 * read. The two states differ in shape, not in colour, so they tell apart on any background and
 * for anyone.
 */
export const DoubleCheck: React.FC<{
  read?: boolean;
  surface?: keyof typeof surfaceClassNames;
  className?: string;
}> = ({ read = false, surface = 'white', className }) => {
  const circleClassName = cn(
    'absolute h-3.5 w-3.5',
    read && cn('fill-current', surfaceClassNames[surface]),
  );
  return (
    <span className={cn('relative flex h-3.5 w-[1.375rem] items-center', className)}>
      {/* cut out where the front circle sits, with a gap, instead of painting over it, so no
          row background shows a disc of the wrong colour */}
      <Circle
        className={cn(
          circleClassName,
          'left-0 [mask-image:radial-gradient(circle_at_0.9375rem_50%,transparent_0.5rem,black_0.5rem)]',
        )}
        strokeWidth={2.5}
      />
      <CircleCheck className={cn(circleClassName, 'left-2')} strokeWidth={2.5} />
    </span>
  );
};
