import { SubheadingH2 } from '@/components/ui/typography/subheading-h2';
import type { ProcessStepsBlock } from '@/features/payload-cms/payload-types';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

const StepNumber: React.FC<{ index: number }> = ({ index }) => (
  // Not aria-hidden: `list-none` makes Safari/VoiceOver drop list semantics, so
  // the numeral is the only thing left carrying the order of a block whose
  // whole point is that it is a sequence.
  <span className="border-conveniat-green/25 text-conveniat-green font-heading flex size-10 shrink-0 items-center justify-center rounded-full border bg-white text-base font-bold tabular-nums">
    {index + 1}
  </span>
);

const StepBody: React.FC<{
  title: string;
  description: string;
  /** Whether the three-column layout takes over at `@3xl`. */
  isHorizontal: boolean;
}> = ({ title, description, isHorizontal }) => (
  <>
    <h3 className="font-heading text-conveniat-green mt-0 mb-1.5 text-base font-bold text-balance">
      {title}
    </h3>
    {/* Beside the rail a description is short enough to balance, which keeps a
        single orphaned word off the last line. The three-column layout wraps
        normally — its measure is already narrow and balancing is capped by line
        count anyway. */}
    <p
      className={cn(
        'font-body m-0 text-sm leading-relaxed text-balance text-gray-600',
        isHorizontal && '@3xl:text-wrap',
      )}
    >
      {description}
    </p>
  </>
);

export const ProcessSteps: React.FC<ProcessStepsBlock> = ({ title, layout, steps }) => {
  const isHorizontal = layout === 'horizontal';

  return (
    <div className="@container">
      {title != undefined && title !== '' && (
        <SubheadingH2 className="mt-0 mb-5">{title}</SubheadingH2>
      )}

      {/* One markup serves both layouts. In a narrow column the numeral sits
          beside its own step and a rail joins it to the next one, so the
          sequence stays legible; only the three-column layout lifts the numeral
          above the text and turns the rail horizontal. */}
      <ol
        className={cn(
          'm-0 list-none p-0',
          isHorizontal && '@3xl:grid @3xl:grid-cols-3 @3xl:gap-x-6 @3xl:gap-y-10',
        )}
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          // Never end a row with a rule that points at nothing.
          const showRowRule = !isLast && (index + 1) % 3 !== 0;

          return (
            <li
              key={step.id ?? index}
              className={cn('m-0 flex gap-4 p-0', isHorizontal && '@3xl:block @3xl:gap-0')}
            >
              <div
                className={cn(
                  'flex flex-col items-center',
                  isHorizontal && '@3xl:mb-4 @3xl:flex-row @3xl:gap-3',
                )}
              >
                <StepNumber index={index} />
                {!isLast && (
                  <span
                    aria-hidden
                    className={cn(
                      'bg-conveniat-green/20 mt-2 w-px flex-1',
                      isHorizontal && '@3xl:hidden',
                    )}
                  />
                )}
                {isHorizontal && showRowRule && (
                  <span
                    aria-hidden
                    className="bg-conveniat-green/20 hidden h-px flex-1 @3xl:block"
                  />
                )}
              </div>

              <div
                className={cn(
                  'min-w-0 flex-1 pt-1.5',
                  !isLast && 'pb-6',
                  isHorizontal && '@3xl:pt-0 @3xl:pb-0',
                )}
              >
                <StepBody
                  title={step.title}
                  description={step.description}
                  isHorizontal={isHorizontal}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
