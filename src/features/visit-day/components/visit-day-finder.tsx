'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Card } from '@/components/ui/card';
import { FactRow } from '@/components/ui/fact-row';
import { SectionLabel } from '@/components/ui/section-label';
import { findVisitDayHoefe } from '@/features/visit-day/find-visit-day-hof';
import { formatVisitDay } from '@/features/visit-day/format-visit-day';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { CalendarDays } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

/** More matches than this mean the search is too short to be an answer. */
const MAX_MATCHES = 6;

const placeholderText: StaticTranslationString = {
  de: 'Hof suchen, z.B. Cevi Uster',
  en: 'Search a Hof, e.g. Cevi Uster',
  fr: 'Chercher un Hof, p. ex. Cevi Uster',
};

const searchLabel: StaticTranslationString = {
  de: 'Hof der teilnehmenden Person suchen',
  en: 'Search the Hof of the participant',
  fr: 'Chercher le Hof de la personne participante',
};

const loadingText: StaticTranslationString = {
  de: 'Höfe werden geladen …',
  en: 'Loading Höfe …',
  fr: 'Chargement des Hofs …',
};

const loadErrorText: StaticTranslationString = {
  de: 'Die Höfe konnten nicht geladen werden. Prüfe deine Verbindung.',
  en: 'The Höfe could not be loaded. Check your connection.',
  fr: 'Les Hofs n’ont pas pu être chargés. Vérifie ta connexion.',
};

// the page says right below what a visitor without a Hof does, so this does not repeat it
const noMatchText: StaticTranslationString = {
  de: 'Kein Hof gefunden. Prüfe die Schreibweise.',
  en: 'No Hof found. Check the spelling.',
  fr: 'Aucun Hof trouvé. Vérifie l’orthographe.',
};

const moreMatchesText: StaticTranslationString = {
  de: 'Weitere Höfe passen, gib mehr vom Namen ein.',
  en: 'More Höfe match, type more of the name.',
  fr: 'D’autres Hofs correspondent, tape davantage du nom.',
};

/**
 * Relatives type the Hof they visit and see the day they come: the day follows from the Hof's
 * Quartier, which they need not know. Reads the same list as the registration form.
 */
export const VisitDayFinder: React.FC<{ title?: string | null | undefined }> = ({ title }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [search, setSearch] = useState('');
  const hoefe = trpc.visitDay.getVisitDayHofList.useQuery(undefined, { refetchOnMount: true });
  const matches = findVisitDayHoefe(hoefe.data ?? [], search);
  // without signal the query waits paused instead of failing
  const unavailable = hoefe.data === undefined && (hoefe.isError || hoefe.fetchStatus === 'paused');

  let result: React.ReactNode;
  if (search.trim() === '') result = undefined;
  else if (unavailable)
    result = <p className="m-0 text-[15px] text-green-500">{loadErrorText[locale]}</p>;
  else if (hoefe.data === undefined)
    result = <p className="m-0 text-[15px] text-green-500">{loadingText[locale]}</p>;
  else if (matches.length === 0)
    result = <p className="m-0 text-[15px] text-green-500">{noMatchText[locale]}</p>;
  else {
    result = (
      <>
        <Card>
          {matches.slice(0, MAX_MATCHES).map((hof) => (
            <FactRow
              key={hof.id}
              icon={CalendarDays}
              title={formatVisitDay(hof.date, locale)}
              sub={hof.name}
            />
          ))}
        </Card>
        {matches.length > MAX_MATCHES && (
          <p className="mt-2 mb-0 text-[13px] text-green-500">{moreMatchesText[locale]}</p>
        )}
      </>
    );
  }

  return (
    <div>
      {typeof title === 'string' && title !== '' && (
        <SectionLabel className="mt-0 mb-2">{title}</SectionLabel>
      )}
      <AppSearchBar
        onPage
        placeholder={placeholderText[locale]}
        label={searchLabel[locale]}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onClear={() => setSearch('')}
      />
      <div aria-live="polite" className="mt-2 empty:mt-0">
        {result}
      </div>
    </div>
  );
};
