'use client';

import { format, labels } from '@/features/material/components/material-labels';
import {
  focusRing,
  inputClass,
  MaterialSheet,
  NumberInput,
} from '@/features/material/components/material-ui';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import { useQrScanner } from '@/features/material/hooks/use-qr-scanner';
import type { LoanHolder } from '@/features/material/utils/holders';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Camera, Minus, Plus, ScanLine, Search } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const text = {
  aim: {
    de: 'Halte die Kamera auf das QR-Etikett.',
    en: 'Point the camera at the QR label.',
    fr: 'Vise l’étiquette QR avec la caméra.',
  },
  unsupported: {
    de: 'Dieser Browser kann keine QR-Codes lesen. Tippe den Code ins Suchfeld oder scanne das Etikett mit der Kamera-App.',
    en: 'This browser cannot read QR codes. Type the code into the search or scan the label with the camera app.',
    fr: 'Ce navigateur ne lit pas les codes QR. Saisis le code dans la recherche ou scanne l’étiquette avec l’app caméra.',
  },
  denied: {
    de: 'Kein Zugriff auf die Kamera. Tippe den Code ins Suchfeld.',
    en: 'No camera access. Type the code into the search.',
    fr: 'Pas d’accès à la caméra. Saisis le code dans la recherche.',
  },
  less: { de: 'Weniger', en: 'Fewer', fr: 'Moins' },
  more: { de: 'Mehr', en: 'More', fr: 'Plus' },
} satisfies Record<string, StaticTranslationString>;

/** How a holder is called, and a stand-in for one that has no name any more. */
export const holderName = (
  group: { holder: LoanHolder; name: string | null },
  locale: Locale,
): string =>
  group.name ??
  (group.holder.kind === 'HOF' ? labels.unknownHof[locale] : labels.unknownPerson[locale]);

/** Two letters for a holder's tile: "NO" for Hof Nord, "LM" for Lea Muster. */
export const holderInitials = (name: string): string => {
  const words = name
    .replace(/^Hof\s+/i, '')
    .split(/\s+/)
    .filter((word) => word !== '');
  const [first = '', second] = words;
  const initials = second === undefined ? first.slice(0, 2) : `${first[0] ?? ''}${second[0] ?? ''}`;
  return initials === '' ? '?' : initials.toUpperCase();
};

/** "Wolldecke 40 · Zelttuch 60", what a holder takes or has. */
export const loanSummary = (
  loans: readonly { quantity: number; issuedQuantity: number | null; item: { name: string } }[],
): string =>
  loans.map((loan) => `${loan.item.name} ${loan.issuedQuantity ?? loan.quantity}`).join(' · ');

/** "3 Positionen" or "1 Position". */
export const positionCount = (count: number, locale: Locale): string =>
  count === 1 ? labels.onePosition[locale] : format(labels.positions, locale, { n: count });

/** A holder's tile: initials on the depot green, red when something is overdue. */
export const HolderAvatar: React.FC<{ name: string; alert?: boolean; className?: string }> = ({
  name,
  alert = false,
  className,
}) => (
  <span
    aria-hidden
    className={cn(
      'flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white',
      alert ? 'bg-red-600' : 'bg-conveniat-green',
      className,
    )}
  >
    {holderInitials(name)}
  </span>
);

/** The small caps heading above each part of a counter screen. */
export const SectionTitle: React.FC<{ children: React.ReactNode; count?: number }> = ({
  children,
  count,
}) => (
  <h2 className="mb-2 px-1 text-xs font-bold tracking-widest text-gray-500 uppercase">
    {children}
    {count !== undefined && <span className="tabular-nums"> · {count}</span>}
  </h2>
);

/**
 * The screen's main button, stuck to the bottom above the app's 5 rem bottom bar, where the
 * thumb is, while the list above it scrolls.
 */
export const StickyAction: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'sticky bottom-20 z-20 -mx-4 mt-4 border-t border-gray-200 bg-gray-50/95 px-4 pt-3 pb-3 backdrop-blur',
      className,
    )}
  >
    {children}
  </div>
);

/** − value +, with a field in between to type a count; buttons stay 44 px for a cold thumb. */
export const Stepper: React.FC<{
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}> = ({ value, min = 0, max, onChange, label }) => {
  const locale = useMaterialLocale();
  const button = cn(
    'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40',
    focusRing,
  );
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        className={button}
        aria-label={`${text.less[locale]}: ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <NumberInput
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        className="w-14 px-1 text-center font-bold tabular-nums"
      />
      <button
        type="button"
        className={button}
        aria-label={`${text.more[locale]}: ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
};

/** The live camera; mounted only while the sheet is open, so the camera is off otherwise. */
const ScannerView: React.FC<{ onResult: (value: string) => boolean }> = ({ onResult }) => {
  const locale = useMaterialLocale();
  const { state, videoReference } = useQrScanner(onResult);
  if (state === 'unsupported' || state === 'denied') {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-gray-600">
        <ScanLine className="size-10 text-gray-300" aria-hidden />
        {state === 'denied' ? text.denied[locale] : text.unsupported[locale]}
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={videoReference} className="aspect-square w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-white/80" />
      <p className="absolute right-0 bottom-3 left-0 text-center text-sm font-semibold text-white">
        {state === 'starting' ? labels.loading[locale] : text.aim[locale]}
      </p>
    </div>
  );
};

/**
 * A search field with the camera at its end: the scanner lives where the code would be typed,
 * not on a page of its own. `onScan` answers whether it used the code; the sheet closes then.
 */
export const SearchField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onScan?: (value: string) => boolean;
  onSubmit?: () => void;
}> = ({ value, onChange, placeholder, onScan, onSubmit }) => {
  const locale = useMaterialLocale();
  const [scanning, setScanning] = useState(false);
  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        className={cn(inputClass, 'h-12 rounded-xl pl-9', onScan !== undefined && 'pr-14')}
        value={value}
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value)}
      />
      {onScan !== undefined && (
        <>
          <button
            type="button"
            aria-label={labels.scan[locale]}
            title={labels.scan[locale]}
            onClick={() => setScanning(true)}
            className={cn(
              'bg-conveniat-green absolute top-1/2 right-1 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-white',
              focusRing,
            )}
          >
            <Camera className="size-5" aria-hidden />
          </button>
          <MaterialSheet open={scanning} onOpenChange={setScanning} title={labels.scan[locale]}>
            {scanning && (
              <ScannerView
                onResult={(scanned) => {
                  const used = onScan(scanned);
                  if (used) setScanning(false);
                  return used;
                }}
              />
            )}
          </MaterialSheet>
        </>
      )}
    </form>
  );
};

/** A choice of two or three as one pill, the chosen part white. */
export const Segmented = <Value extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: Value;
  options: readonly { value: Value; label: string; icon?: React.ReactNode }[];
  onChange: (value: Value) => void;
  label: string;
}): React.ReactElement => (
  <div
    role="radiogroup"
    aria-label={label}
    className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-gray-200/70 p-1"
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={value === option.value}
        onClick={() => onChange(option.value)}
        className={cn(
          'flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold [&_svg]:size-4',
          focusRing,
          value === option.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600',
        )}
      >
        {option.icon}
        {option.label}
      </button>
    ))}
  </div>
);
