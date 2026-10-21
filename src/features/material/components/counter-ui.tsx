'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { SectionLabel } from '@/components/ui/section-label';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { format, labels } from '@/features/material/components/material-labels';
import { focusRing, MaterialSheet, NumberInput } from '@/features/material/components/material-ui';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import { useQrScanner } from '@/features/material/hooks/use-qr-scanner';
import { stepQuantity } from '@/features/material/utils/basket';
import type { LoanHolder } from '@/features/material/utils/holders';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Minus, Plus, ScanLine } from 'lucide-react';
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

/** "40 × Wolldecke · 60 × Zelttuch", what a holder takes or has. */
export const loanSummary = (
  loans: readonly { quantity: number; issuedQuantity: number | null; item: { name: string } }[],
): string =>
  loans.map((loan) => `${loan.issuedQuantity ?? loan.quantity} × ${loan.item.name}`).join(' · ');

/** "3 Positionen" or "1 Position". */
export const positionCount = (count: number, locale: Locale): string =>
  count === 1 ? labels.onePosition[locale] : format(labels.positions, locale, { n: count });

/** A holder's tile: initials on the depot green, the live orange when something is overdue. */
export const HolderAvatar: React.FC<{ name: string; alert?: boolean; className?: string }> = ({
  name,
  alert = false,
  className,
}) => (
  <span
    aria-hidden
    className={cn(
      'flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white',
      alert ? 'bg-live' : 'bg-conveniat-green',
      className,
    )}
  >
    {holderInitials(name)}
  </span>
);

/** The heading above each part of a counter screen, "HEUTE FÄLLIG · 6", the app's section label. */
export const SectionTitle: React.FC<{ children: React.ReactNode; count?: number }> = ({
  children,
  count,
}) => (
  <SectionLabel className="mb-2 px-1">
    {children}
    {count !== undefined && <span className="tabular-nums"> · {count}</span>}
  </SectionLabel>
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
      'border-line bg-page/95 sticky bottom-20 z-20 -mx-4 mt-4 border-t px-4 pt-3 pb-3 backdrop-blur',
      className,
    )}
  >
    {children}
  </div>
);

/**
 * − value +, with a field in between to type a count; buttons stay 44 px for a cold thumb. The
 * buttons move by `step`, onto its multiples; what is typed is the caller's to check.
 */
export const Stepper: React.FC<{
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
}> = ({ value, min = 0, max, step = 1, onChange, label }) => {
  const locale = useMaterialLocale();
  const down = stepQuantity(value, step, -1);
  const up = stepQuantity(value, step, 1);
  const button = cn(
    'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-rail bg-white text-green-900 hover:bg-quiet disabled:cursor-not-allowed disabled:opacity-40',
    focusRing,
  );
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        className={button}
        aria-label={`${text.less[locale]}: ${label}`}
        disabled={down < min}
        onClick={() => onChange(down)}
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
        disabled={up > max}
        onClick={() => onChange(up)}
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
      <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-green-700">
        <ScanLine className="text-rail-node size-10" aria-hidden />
        {state === 'denied' ? text.denied[locale] : text.unsupported[locale]}
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gray-950">
      <video ref={videoReference} className="aspect-square w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-white/80" />
      <p className="absolute right-0 bottom-3 left-0 text-center text-sm font-semibold text-white">
        {state === 'starting' ? labels.loading[locale] : text.aim[locale]}
      </p>
    </div>
  );
};

/**
 * A search field with the scanner next to it: the scanner lives where the code would be typed,
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
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <AppSearchBar
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClear={() => onChange('')}
        className="flex-1"
      />
      {onScan !== undefined && (
        <>
          <button
            type="button"
            aria-label={labels.scan[locale]}
            title={labels.scan[locale]}
            onClick={() => setScanning(true)}
            className={cn(
              'bg-conveniat-green flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[12px] text-white',
              focusRing,
            )}
          >
            <ScanLine className="size-5" aria-hidden />
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
    className={cn(segmentedTrackClassName, 'grid auto-cols-fr grid-flow-col')}
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={value === option.value}
        onClick={() => onChange(option.value)}
        className={cn(
          segmentClassName(value === option.value),
          'gap-2 px-2 text-sm font-semibold [&_svg]:size-4',
        )}
      >
        {option.icon}
        {option.label}
      </button>
    ))}
  </div>
);

/** A filter that is on or off, as a pill; wraps with its siblings instead of scrolling. */
export const FilterChip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      'inline-flex h-11 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-semibold [&_svg]:size-4',
      focusRing,
      active
        ? 'border-conveniat-green bg-conveniat-green text-white'
        : 'border-rail bg-white text-green-900',
    )}
  >
    <span className="truncate">{children}</span>
  </button>
);
