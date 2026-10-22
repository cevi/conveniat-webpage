'use client';

import { SectionLabel } from '@/components/ui/section-label';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import { usePackedItems } from '@/features/schedule/hooks/use-packed-items';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check } from 'lucide-react';
import type React from 'react';

const packedCountText: StaticTranslationString = {
  de: '{{packed}} von {{total}} eingepackt',
  en: '{{packed}} of {{total}} packed',
  fr: '{{packed}} sur {{total}} dans le sac',
};

/**
 * A block's "Mitnehmen" as a checklist to pack by. The ticks stay on this phone only, see
 * `usePackedItems`.
 */
export const BringChecklist: React.FC<{
  entryId: string;
  items: { id?: string | null; item: string }[];
  locale: Locale;
}> = ({ entryId, items, locale }) => {
  const { packed, togglePacked } = usePackedItems(entryId);
  const packedCount = items.filter(({ item }) => packed.has(item)).length;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>{programmeLabels.bring[locale]}</SectionLabel>
        <span className="text-[13px] text-green-500 tabular-nums" aria-live="polite">
          {packedCountText[locale]
            .replace('{{packed}}', String(packedCount))
            .replace('{{total}}', String(items.length))}
        </span>
      </div>
      <ul className="border-line divide-line mt-2 divide-y overflow-hidden rounded-[14px] border bg-white">
        {items.map(({ id, item }, index) => (
          <li key={id ?? index}>
            <label className="flex min-h-[48px] cursor-pointer items-center gap-3 px-4 py-3 text-[15px] text-green-900">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={packed.has(item)}
                onChange={() => togglePacked(item)}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-green-700 bg-white text-white',
                  'peer-checked:border-conveniat-green peer-checked:bg-conveniat-green',
                  'peer-focus-visible:ring-conveniat-green peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
                )}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="min-w-0">{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
};
