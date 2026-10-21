'use client';

import { buttonVariants } from '@/components/ui/buttons/button';
import { SectionLabel } from '@/components/ui/section-label';
import { formatDay, labels } from '@/features/material/components/material-labels';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import { fromDateInput } from '@/features/material/utils/dates';
import { parseNumberDraft } from '@/features/material/utils/number-input';
import { cn } from '@/utils/tailwindcss-override';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CalendarDays, Loader2, X } from 'lucide-react';
import type React from 'react';
import { useId, useState } from 'react';

/**
 * A dialog that sits at the bottom on a phone, where the thumb is, and centres on desktop.
 * Built on Radix directly rather than the shared dialog: the app shell's header and sidebar
 * stack above `z-50`, so the sheet has to sit where the chat dialogs do.
 */
export const MaterialSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ open, onOpenChange, title, description, children }) => {
  const locale = useMaterialLocale();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[99999] bg-gray-950/40" />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-[99999] grid max-h-[90dvh] gap-5 overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-5">
          {/* the grip says "this slides up from the bottom"; Radix closes it on a tap outside */}
          <div className="-mt-2 -mb-3 flex justify-center sm:hidden" aria-hidden>
            <span className="bg-rail h-1.5 w-10 rounded-full" />
          </div>
          <div className="pr-10">
            <DialogPrimitive.Title className="font-heading text-heading text-lg font-bold">
              {title}
            </DialogPrimitive.Title>
            {description === undefined ? (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="mt-1 text-sm text-green-700">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          {children}
          <DialogPrimitive.Close
            className="focus-visible:ring-conveniat-green hover:bg-quiet absolute top-3 right-3 flex size-11 cursor-pointer items-center justify-center rounded-lg text-green-500 focus-visible:ring-2 focus-visible:outline-none"
            aria-label={labels.close[locale]}
          >
            <X className="size-5" aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

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
      'border-line sticky bottom-0 z-10 -mx-5 -mb-5 border-t bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5',
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
        <span className="text-live-text mt-1 block text-xs font-semibold">{error}</span>
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

export const inputClass =
  'block h-11 w-full rounded-xl border border-rail bg-white px-3 text-base text-green-900 focus:border-conveniat-green focus:ring-2 focus:ring-conveniat-green/30 focus:outline-none disabled:bg-quiet disabled:text-green-500';

/** The focus ring of everything tappable that is not a text field. */
export const focusRing =
  'focus-visible:ring-2 focus-visible:ring-conveniat-green focus-visible:ring-offset-1 focus-visible:outline-none';

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
          'peer-focus-visible:border-conveniat-green peer-focus-visible:ring-conveniat-green/30 flex items-center gap-2 peer-focus-visible:ring-2',
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
            'absolute top-0 right-0 z-[2] flex size-11 cursor-pointer items-center justify-center rounded-lg text-green-500 hover:text-green-900',
            focusRing,
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
 * a spinner while its action runs. Destructive actions such as "Ablehnen" are `outlined`: red
 * belongs to the emergency screens.
 */
export const MaterialButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'quiet' | 'outlined';
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
      focusRing,
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
  const card = cn('border-line min-w-0 overflow-hidden rounded-[14px] border bg-white', className);
  if (title === undefined) return <section className={card}>{children}</section>;
  return (
    <section className="min-w-0">
      <div className="mb-2 flex min-h-5 flex-wrap items-center justify-between gap-2 px-1">
        <SectionLabel>
          {title}
          {count !== undefined && <span className="tabular-nums"> · {count}</span>}
        </SectionLabel>
        {action}
      </div>
      <div className={card}>{children}</div>
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
