import { quartierHouseOf } from '@/components/quartier/quartier-houses';
import type { QuartierLabel } from '@/utils/quartier-names';
import { formatQuartierRange, shortQuartierName } from '@/utils/quartier-names';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

export type QuartierDotSize = 'sm' | 'md' | 'lg' | 'xl';

// px, not rem: the root font is larger on desktop. Below 24px the animals are no longer legible.
const dotSizeClassNames: Record<QuartierDotSize, string> = {
  sm: 'h-[24px] w-[24px]', // in a chip or a line of text
  md: 'h-[32px] w-[32px]',
  lg: 'h-[44px] w-[44px]',
  xl: 'h-[96px] w-[96px]',
};

/**
 * The house of a Quartier as a round dot in its colour with its animal in the banners' cream.
 * Decorative: the text beside it names the Quartier. Nothing for a Quartier without a known
 * number, e.g. one the editors have not numbered yet or one from an older copy on the phone.
 */
export const QuartierDot: React.FC<{
  quartier: QuartierLabel;
  size?: QuartierDotSize;
  className?: string;
}> = ({ quartier, size = 'sm', className }) => {
  const house = quartierHouseOf(quartier);
  if (house === undefined) return <></>;
  const { Icon, dotClassName } = house;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        dotSizeClassNames[size],
        dotClassName,
        className,
      )}
    >
      <Icon className="h-[70%] w-[70%] text-[#f4eed7]" />
    </span>
  );
};

/**
 * A Quartier as a chip, its dot and "Q5", filled brand green when it is the user's own. A
 * Quartier without a known number keeps the plain text chip with its name.
 */
export const QuartierBadge: React.FC<{
  quartier: QuartierLabel;
  isMine?: boolean;
  className?: string | undefined;
}> = ({ quartier, isMine = false, className }) => {
  const hasDot = quartierHouseOf(quartier) !== undefined;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md py-0.5 text-xs font-bold',
        hasDot ? 'pr-1.5 pl-0.5' : 'px-1.5',
        isMine ? 'bg-conveniat-green text-white' : 'bg-chip text-green-900',
        className,
      )}
    >
      <QuartierDot quartier={quartier} size="sm" />
      {shortQuartierName(quartier)}
    </span>
  );
};

/**
 * Several Quartiere as one chip that keeps to one line: their dots overlapping and the range,
 * "Q4–Q6", filled brand green when the user's own Quartier is among them. A single Quartier is
 * the plain `QuartierBadge`.
 */
export const QuartierGroupBadge: React.FC<{
  quartiere: readonly (QuartierLabel & { id: string })[];
  myQuartierIds: ReadonlySet<string>;
  className?: string;
}> = ({ quartiere, myQuartierIds, className }) => {
  const isMine = quartiere.some(({ id }) => myQuartierIds.has(id));
  const [only] = quartiere;
  if (quartiere.length === 1 && only !== undefined) {
    return <QuartierBadge quartier={only} isMine={isMine} className={className} />;
  }
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1 rounded-md py-0.5 pr-1.5 pl-0.5 text-xs font-bold',
        isMine ? 'bg-conveniat-green text-white' : 'bg-chip text-green-900',
        className,
      )}
    >
      <span className="flex shrink-0">
        {quartiere.map((quartier, index) => (
          // each dot overlaps the one before it, ringed in the chip's colour to stay apart
          <QuartierDot
            key={quartier.id}
            quartier={quartier}
            className={cn(
              'ring-2',
              isMine ? 'ring-conveniat-green' : 'ring-chip',
              index > 0 && '-ml-[8px]',
            )}
          />
        ))}
      </span>
      <span className="truncate">{formatQuartierRange(quartiere)}</span>
    </span>
  );
};
