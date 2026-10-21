'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { buttonVariants } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { textInputClassName } from '@/components/ui/field';
import { SectionLabel } from '@/components/ui/section-label';
import { formatDay, labels } from '@/features/material/components/material-labels';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import { fromDateInput } from '@/features/material/utils/dates';
import { parseNumberDraft } from '@/features/material/utils/number-input';
import { cn } from '@/utils/tailwindcss-override';
import { CalendarDays, Loader2, X } from 'lucide-react';
import type React from 'react';
import { useId, useState } from 'react';

/**
 * A sheet of the depot: the app's shared `BottomSheet`, its content spaced as a form. Its main
 * button goes into a `SheetFooter` at the end of the content.
 */
export const MaterialSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ open, onOpenChange, title, description, children }) => (
  <BottomSheet
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    {...(description === undefined ? {} : { description })}
  >
    <div className="grid gap-5 pt-1">{children}</div>
  </BottomSheet>
);

/**
 * The bottom of a sheet, where the thumb is: holds the step's main button in view while the
 * form above it scrolls. Sticks to the sheet's scroll area, so it has to be the last element
 * of whatever wraps it.
 */
export const SheetFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      // the sheet keeps the safe area below its content already; the sheet's own 20px padding
      // below the content would show the content scrolling under the footer, so it reaches over it
      'border-line sticky -bottom-5 z-10 -mx-5 -mb-5 border-t bg-white px-5 py-3',
      className,
    )}
  >
    {children}
  </div>
);

/**
 * A labelled form field. The default wraps one control in a `<label>`, so tapping the label
 * focuses it. A field holding several controls, such as a stepper or a list of choices, uses
 * `as="group"`: a label would forward every tap to its first control, a "−" or a "Cancel".
 */
export const Field: React.FC<{
  label: string;
  hint?: string;
  error?: string | undefined;
  as?: 'label' | 'group';
  children: React.ReactNode;
  className?: string;
}> = ({ label, hint, error, as = 'label', children, className }) => {
  const labelId = useId();
  const content = (
    <>
      <span id={labelId} className="mb-1 block text-sm font-semibold text-green-900">
        {label}
      </span>
      {children}
      {error !== undefined && (
        <span className="text-danger-text mt-1 block text-xs font-semibold">{error}</span>
      )}
      {hint !== undefined && <span className="mt-1 block text-xs text-green-500">{hint}</span>}
    </>
  );
  if (as === 'group') {
    return (
      <div role="group" aria-labelledby={labelId} className={cn('block', className)}>
        {content}
      </div>
    );
  }
  return <label className={cn('block', className)}>{content}</label>;
};

/** Material's fields are the app's form fields, see `field.ts`. */
export const inputClass = textInputClassName;

/** Opens the browser's own date picker where it can, which a covered input does not do alone. */
const showPicker = (input: HTMLInputElement): void => {
  try {
    input.showPicker();
  } catch {
    // older browsers, or already open: the input still takes focus and typing
  }
};

/**
 * A date field that shows the day in the reader's language, "Sa., 26. Sept.", instead of the
 * browser's own pattern. A transparent native input lies on top, so a phone still opens its
 * own date wheel and a keyboard can still type the date.
 */
export const DateInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  min?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}> = ({
  value,
  onChange,
  label,
  placeholder,
  min,
  disabled = false,
  clearable = false,
  className,
}) => {
  const locale = useMaterialLocale();
  const day = fromDateInput(value, 'start');
  const showClear = clearable && value !== '' && !disabled;
  return (
    <div className={cn('relative', className)}>
      <input
        type="date"
        aria-label={label}
        value={value}
        {...(min === undefined ? {} : { min })}
        disabled={disabled}
        className="peer absolute inset-0 z-[1] size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        onClick={(event) => showPicker(event.currentTarget)}
        onChange={(event) => onChange(event.target.value)}
      />
      <div
        aria-hidden
        className={cn(
          inputClass,
          'peer-focus-visible:ring-conveniat-green flex items-center gap-2 peer-focus-visible:ring-2',
          disabled && 'bg-quiet text-green-500',
          showClear && 'pr-12',
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-green-500" />
        <span className={cn('truncate', day === undefined && 'text-green-500')}>
          {day === undefined ? (placeholder ?? label) : formatDay(day, locale)}
        </span>
      </div>
      {showClear && (
        <button
          type="button"
          aria-label={labels.clearDate[locale]}
          onClick={() => onChange('')}
          className={cn(
            'hover:bg-quiet absolute top-0 right-0 z-[2] flex size-11 cursor-pointer items-center justify-center rounded-full text-green-500 hover:text-green-900',
          )}
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
};

export const NativeSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  children,
  ...properties
}) => (
  <select className={cn(inputClass, 'pr-8', className)} {...properties}>
    {children}
  </select>
);

/**
 * A number field that can be emptied while typing. The text lives here until the field loses
 * focus; every readable value reaches `onChange` already clamped to `[min, max]`, and on blur
 * the field shows that value again.
 */
export const NumberInput: React.FC<
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'min' | 'max' | 'type'
  > & {
    value: number;
    onChange: (value: number) => void;
    min: number;
    max?: number;
  }
> = ({ value, onChange, min, max = Number.MAX_SAFE_INTEGER, className, onBlur, ...properties }) => {
  const [draft, setDraft] = useState<string | undefined>();
  return (
    <input
      type="number"
      inputMode="numeric"
      {...properties}
      min={min}
      max={max}
      className={cn(inputClass, className)}
      value={draft ?? String(value)}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = parseNumberDraft(event.target.value, min, max);
        if (parsed !== undefined) onChange(parsed);
      }}
      onBlur={(event) => {
        setDraft(undefined);
        onBlur?.(event);
      }}
    />
  );
};

/**
 * The app's button at 44 px, big enough to hit with a cold thumb during a hectic hand-out, with
 * a spinner while its action runs. What destroys something, like "Ja, ablehnen", is `danger`,
 * and only the step that does it: the button that asks first stays neutral.
 */
export const MaterialButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'quiet' | 'outlined' | 'danger';
    loading?: boolean;
  }
> = ({
  variant = 'primary',
  loading = false,
  disabled = false,
  className,
  children,
  ...properties
}) => (
  // after the spread, so a caller's `disabled` cannot switch off the guard against a double tap
  <button
    type="button"
    {...properties}
    className={cn(
      buttonVariants({ variant, size: 'touch' }),
      'shrink-0 disabled:cursor-not-allowed',
      className,
    )}
    disabled={loading || disabled}
  >
    {loading && <Loader2 className="animate-spin" aria-hidden />}
    {children}
  </button>
);

/**
 * A white card, the building block of every material page; `className` styles the card. A title
 * is the app's section label above the card, not a strip inside it.
 */
export const Panel: React.FC<{
  title?: string;
  /** "· 21" after the title */
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, count, action, children, className }) => {
  const card = cn('min-w-0', className);
  if (title === undefined) {
    return (
      <Card as="section" className={card}>
        {children}
      </Card>
    );
  }
  return (
    <section className="min-w-0">
      <div className="mb-2 flex min-h-5 flex-wrap items-center justify-between gap-2 px-1">
        <SectionLabel>
          {title}
          {count !== undefined && <span className="tabular-nums"> · {count}</span>}
        </SectionLabel>
        {action}
      </div>
      <Card className={card}>{children}</Card>
    </section>
  );
};

export const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <p className="px-4 py-8 text-center text-[15px] text-green-700">{text}</p>
);

export const LoadingState: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-green-500">
    <Loader2 className="size-4 animate-spin" aria-hidden />
    {text}
  </div>
);
