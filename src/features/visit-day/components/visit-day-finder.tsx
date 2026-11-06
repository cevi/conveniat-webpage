'use client';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Card } from '@/components/ui/card';
import { FactRow } from '@/components/ui/fact-row';
import { SectionLabel } from '@/components/ui/section-label';
import { findVisitDayHoefe } from '@/features/visit-day/find-visit-day-hof';
import { formatVisitDay } from '@/features/visit-day/format-visit-day';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { CalendarDays } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

/** More matches than this mean the search is too short to be an answer. */
const MAX_MATCHES = 6;

const placeholderText: StaticTranslationString = {
  de: 'Abteilung suchen, z.B. Uster',
  en: 'Search a local group, e.g. Uster',
  fr: 'Chercher un groupe local, p. ex. Uster',
};

const searchLabel: StaticTranslationString = {
  de: 'Abteilung der teilnehmenden Person suchen',
  en: 'Search the local group of the participant',
  fr: 'Chercher le groupe local de la personne participante',
};

const loadingText: StaticTranslationString = {
  de: 'Abteilungen werden geladen …',
  en: 'Loading local groups …',
  fr: 'Chargement des groupes locaux …',
};

const loadErrorText: StaticTranslationString = {
  de: 'Die Abteilungen konnten nicht geladen werden. Prüfe deine Verbindung.',
  en: 'The local groups could not be loaded. Check your connection.',
  fr: 'Les groupes locaux n’ont pas pu être chargés. Vérifie ta connexion.',
};

// the page says right below what a visitor without a Hof does, so this does not repeat it
const noMatchText: StaticTranslationString = {
  de: 'Keine Abteilung gefunden. Prüfe die Schreibweise.',
  en: 'No local group found. Check the spelling.',
  fr: 'Aucun groupe local trouvé. Vérifie l’orthographe.',
};

const moreMatchesText: StaticTranslationString = {
  de: 'Weitere Abteilungen passen, gib mehr vom Namen ein.',
  en: 'More local groups match, type more of the name.',
  fr: 'D’autres groupes locaux correspondent, tape davantage du nom.',
};

/**
 * Relatives type the Abteilung of the child they visit and see the day they come. They search
 * the Höfe, which are named after their Abteilungen, and the day follows from the Hof's
 * Quartier, neither of which they need to know. Reads the same list as the registration form.
 */
export const VisitDayFinder: React.FC<{ title?: string | null | undefined }> = ({ title }) => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [search, setSearch] = useState('');
  const hoefe = useQuery(
    trpc.visitDay.getVisitDayHofList.queryOptions(undefined, { refetchOnMount: true }),
  );
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
