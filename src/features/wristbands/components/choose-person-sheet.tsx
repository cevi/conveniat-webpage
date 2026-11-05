'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { listRowClassName } from '@/components/ui/list-row';
import { comparePeople, matchesSearch } from '@/features/wristbands/queue';
import { translate } from '@/features/wristbands/texts';
import type { HofPerson } from '@/features/wristbands/types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';
import { useState } from 'react';

/**
 * "Person wählen": makes somebody of the Hof "Jetzt dran" for the next band, out of the order
 * of the queue, e.g. a child who has to leave early. Only people without a band, all of the
 * Hof whatever the filters, found by name or Ceviname.
 */
export const ChoosePersonSheet: React.FC<{
  open: boolean;
  people: HofPerson[];
  locale: Locale;
  onChoose: (person: HofPerson) => void;
  onClose: () => void;
}> = ({ open, people, locale, onChoose, onClose }) => {
  const [search, setSearch] = useState('');
  const matching = people
    .filter((person) => person.band === null && matchesSearch(person, search))
    .toSorted(comparePeople);

  return (
    <BottomSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSearch('');
          onClose();
        }
      }}
      title={translate('choosePersonTitle', locale)}
      fullHeight
    >
      <div className="space-y-3 pt-1">
        <AppSearchBar
          autoFocus
          placeholder={translate('searchPerson', locale)}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
        />
        {matching.length === 0 ? (
          <p className="py-3 text-[15px] text-green-700">{translate('noMatch', locale)}</p>
        ) : (
          <ul className="divide-line divide-y">
            {matching.map((person) => (
              <li key={person.registrationId}>
                <button
                  type="button"
                  className={cn(listRowClassName(), 'min-h-16 px-2')}
                  onClick={() => {
                    setSearch('');
                    onChoose(person);
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold text-green-900">
                      {person.fullName}
                    </span>
                    {(person.nickname !== null || person.abteilung !== null) && (
                      <span className="block truncate text-[15px] text-green-700">
                        {[person.nickname, person.abteilung]
                          .filter((part) => part !== null)
                          .join(' · ')}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
};
