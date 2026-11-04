'use client';

import { Select } from '@/features/payload-cms/components/form/select';
import { Text } from '@/features/payload-cms/components/form/text';
import type { VisitDaySelectionBlock } from '@/features/payload-cms/components/form/types';
import type { VisitDayChoice } from '@/features/visit-day/components/visit-day-choice-list';
import { VisitDayChoiceList } from '@/features/visit-day/components/visit-day-choice-list';
import { formatVisitDay } from '@/features/visit-day/format-visit-day';
import {
  EXTERNAL_VISIT,
  VISITING_CHILD,
  WITH_LUNCH,
  WITHOUT_LUNCH,
} from '@/features/visit-day/visit-day-choices';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type React from 'react';
import type {
  Control,
  FieldError,
  FieldErrorsImpl,
  FieldValues,
  Merge,
  UseFormRegister,
} from 'react-hook-form';
import { useFormContext, useWatch } from 'react-hook-form';

/** The free places are read again this often while the form is open. */
const PLACES_REFRESH_MS = 60_000;

// relatives know the Abteilung of the child they visit, not its Hof: a Hof is named after its
// Abteilungen, so the list of Höfe reads as a list of Abteilungen
const placeholderText: StaticTranslationString = {
  de: 'Abteilung auswählen',
  en: 'Select a local group',
  fr: 'Choisir un groupe local',
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

const noHofOptionText: StaticTranslationString = {
  de: 'Kein Bezug zu einer Abteilung',
  en: 'No connection to a local group',
  fr: 'Aucun lien avec un groupe local',
};

const visitorTypeLegend: StaticTranslationString = {
  de: 'Wen besucht ihr?',
  en: 'Who are you visiting?',
  fr: 'Qui venez-vous voir ?',
};

const visitingChildText: StaticTranslationString = {
  de: 'Ein Kind im Lager, z.B. unser Kind, Göttikind oder Enkelkind',
  en: 'A child at the camp, e.g. our child, godchild or grandchild',
  fr: 'Un enfant au camp, p. ex. notre enfant, filleul·e ou petit-enfant',
};

const externalVisitText: StaticTranslationString = {
  de: 'Niemand Bestimmtes, wir kommen ohne Bezug zu einer Abteilung',
  en: 'No one in particular, we come without a connection to a local group',
  fr: 'Personne en particulier, nous venons sans lien avec un groupe local',
};

const childNameLabel: StaticTranslationString = {
  de: 'Vor- und Nachname des Kindes (optional)',
  en: 'First and last name of the child (optional)',
  fr: 'Prénom et nom de l’enfant (facultatif)',
};

const childNamePlaceholder: StaticTranslationString = {
  de: 'z.B. Lea Muster',
  en: 'e.g. Lea Muster',
  fr: 'p. ex. Lea Muster',
};

const personsLegend: StaticTranslationString = {
  de: 'Anzahl Personen',
  en: 'Number of persons',
  fr: 'Nombre de personnes',
};

const personsText = (count: number, locale: Locale): string => {
  const texts: Record<Locale, string> = {
    de: count === 1 ? '1 Person' : `${count} Personen`,
    en: count === 1 ? '1 person' : `${count} persons`,
    fr: count === 1 ? '1 personne' : `${count} personnes`,
  };
  return texts[locale];
};

const lunchLegend: StaticTranslationString = {
  de: 'Mittagessen im Lager',
  en: 'Lunch at the camp',
  fr: 'Repas de midi au camp',
};

const withLunchOptionText: StaticTranslationString = {
  de: 'Ja, wir essen im Lager zu Mittag',
  en: 'Yes, we have lunch at the camp',
  fr: 'Oui, nous mangeons à midi au camp',
};

const withoutLunchOptionText: StaticTranslationString = {
  de: 'Nein, wir verpflegen uns selbst',
  en: 'No, we bring our own lunch',
  fr: 'Non, nous apportons notre repas',
};

const chooseDayLegend: StaticTranslationString = {
  de: 'Besuchstag wählen',
  en: 'Choose the visiting day',
  fr: 'Choisir la journée des visites',
};

const yourDayText: StaticTranslationString = {
  de: 'Euer Besuchstag',
  en: 'Your visiting day',
  fr: 'Votre journée des visites',
};

const fullText: StaticTranslationString = {
  de: 'ausgebucht',
  en: 'fully booked',
  fr: 'complet',
};

const tooFewPlacesText: StaticTranslationString = {
  de: 'Für diese Wahl sind nicht mehr genug Plätze frei.',
  en: 'Not enough places are left for this choice.',
  fr: 'Il ne reste plus assez de places pour ce choix.',
};

const placesText = (free: number, locale: Locale): string => {
  if (free === 0) return fullText[locale];
  const texts: Record<Locale, string> = {
    de: free === 1 ? '1 Platz frei' : `${free} Plätze frei`,
    en: free === 1 ? '1 place left' : `${free} places left`,
    fr: free === 1 ? '1 place libre' : `${free} places libres`,
  };
  return texts[locale];
};

/** The free places of a day, or that it has too few, in the colour that says which. */
const PlacesText: React.FC<{ free: number; persons: number; locale: Locale }> = ({
  free,
  persons,
  locale,
}) => (
  <span className={free < persons ? 'text-danger-text font-semibold' : 'text-green-700'}>
    {placesText(free, locale)}
  </span>
);

/** One day's places as the form shows them. */
interface DayPlaces {
  date: string;
  free: number;
  freeWithoutLunch: number;
  /** left for visitors without a Hof: `null` without a Kontingent, -1 when the day takes none */
  freeExternal: number | null;
}

/** The places of a day left to visitors without a Hof, out of `free` of the kind they need. */
const externalLimit = (day: DayPlaces, free: number): number =>
  day.freeExternal === null ? free : Math.max(0, Math.min(free, day.freeExternal));

const isFieldName = (name: string | null | undefined): name is string =>
  typeof name === 'string' && name !== '';

/**
 * The whole Besuchstag choice, in the order in which each answer limits the next. Relatives
 * first say whom they visit: those visiting a child pick its Hof, whose Quartier sets the day,
 * and may name the child; visitors without a Hof pick the day. Then come the number of persons
 * and lunch, where each kind has places of its own. A choice without enough free places for the
 * persons is disabled; the server checks the places again on sending. Each question shows only
 * where the form names an answer for it, so an older form keeps its own fields.
 *
 * Visitors without a Hof also need a place in the day's Kontingent for them. A day without one
 * left is disabled for them, a day that takes none is not offered, and when no day takes any the
 * form no longer asks whom they visit: everybody visits a child.
 */
export const VisitDaySelection: React.FC<
  VisitDaySelectionBlock & {
    control: Control;
    registerAction: UseFormRegister<string & FieldValues>;
    error?: FieldError | Merge<FieldError, FieldErrorsImpl<FieldValues>>;
  }
> = ({
  name,
  label,
  required,
  dayField,
  lunchField,
  personCountField,
  visitorTypeField,
  childNameField,
  maxPersons,
  control,
  registerAction,
  error,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { setValue, getValues } = useFormContext();
  const hoefe = trpc.visitDay.getVisitDayHofList.useQuery(undefined, { refetchOnMount: true });
  const days = trpc.visitDay.getVisitDayList.useQuery(undefined, {
    refetchOnMount: true,
    refetchInterval: PLACES_REFRESH_MS,
  });
  const formAsksVisitorType = isFieldName(visitorTypeField);
  const asksLunch = isFieldName(lunchField);
  const asksPersons = typeof maxPersons === 'number' && maxPersons >= 1;
  const [selectedHofId, lunch, pickedDay, persons, visitorType] = useWatch({
    control,
    name: [
      name,
      asksLunch ? lunchField : name,
      dayField,
      personCountField,
      formAsksVisitorType ? visitorTypeField : name,
    ],
  }) as [unknown, unknown, unknown, unknown, unknown];

  // a client restoring a cache from before the places without lunch or the Kontingent for
  // visitors without a Hof has none of the former and no limit of the latter
  const dayPlaces: DayPlaces[] = (days.data ?? []).map((day) => ({
    date: day.date,
    free: day.free,
    freeWithoutLunch: (day.freeWithoutLunch as number | undefined) ?? 0,
    freeExternal: (day.freeExternal as number | null | undefined) ?? null,
  }));
  const externalDays = dayPlaces.filter((day) => day.freeExternal !== -1);
  // until the days are known, the form asks as it always did
  const takesExternals = days.data === undefined || externalDays.length > 0;
  const asksVisitorType = formAsksVisitorType && takesExternals;

  const isExternal =
    takesExternals &&
    (asksVisitorType ? visitorType === EXTERNAL_VISIT : selectedHofId === EXTERNAL_VISIT);
  const showsHof = asksVisitorType ? visitorType === VISITING_CHILD : true;
  const ownDay = isExternal
    ? pickedDay
    : (hoefe.data ?? []).find((hof) => hof.id === selectedHofId)?.date;
  // without signal the query waits paused instead of failing
  const unavailable = hoefe.data === undefined && (hoefe.isError || hoefe.fetchStatus === 'paused');
  const visitDay = dayPlaces.find((day) => day.date === ownDay);
  const chosenPersons = Number(persons);
  // until the persons are chosen, a choice needs a place for one
  const personCount = Number.isInteger(chosenPersons) && chosenPersons > 1 ? chosenPersons : 1;

  // all persons of a registration take places of one kind, and those without a Hof one of
  // their Kontingent besides
  const forVisitor = (day: DayPlaces, free: number): number =>
    isExternal ? externalLimit(day, free) : free;
  const freeOfBestKindOf = (day: DayPlaces): number =>
    asksLunch ? Math.max(day.free, day.freeWithoutLunch) : day.free;
  const freeOfKind = (day: DayPlaces, withLunch: boolean): number =>
    forVisitor(day, withLunch ? day.free : day.freeWithoutLunch);
  const freeOfBestKind = (day: DayPlaces): number => forVisitor(day, freeOfBestKindOf(day));
  const freeOfChosenKind = (day: DayPlaces): number => {
    if (!asksLunch || lunch === WITH_LUNCH) return freeOfKind(day, true);
    if (lunch === WITHOUT_LUNCH) return freeOfKind(day, false);
    return freeOfBestKind(day);
  };
  // greyed out once no day has a place left for them, like a full day
  const externalFull =
    days.data !== undefined &&
    externalDays.every((day) => externalLimit(day, freeOfBestKindOf(day)) < personCount);

  const hofOptions = (hoefe.data ?? []).map((hof) => ({ value: hof.id, label: hof.name }));
  const options =
    hoefe.data === undefined || formAsksVisitorType || !takesExternals
      ? hofOptions
      : [...hofOptions, { value: EXTERNAL_VISIT, label: noHofOptionText[locale] }];

  // the Hof answer follows whom they visit, so the server and the email read one answer
  const onVisitorTypeChosen = (value: string): void => {
    if (value === EXTERNAL_VISIT) {
      setValue(name, EXTERNAL_VISIT);
      if (isFieldName(childNameField)) setValue(childNameField, '');
    } else if (getValues(name) === EXTERNAL_VISIT) {
      setValue(name, '');
    }
  };

  const visitorTypeChoices: VisitDayChoice[] = [
    { value: VISITING_CHILD, label: visitingChildText[locale] },
    {
      value: EXTERNAL_VISIT,
      label: externalVisitText[locale],
      disabled: externalFull,
      ...(externalFull
        ? { sub: <PlacesText free={0} persons={personCount} locale={locale} /> }
        : {}),
    },
  ];

  const dayChoices: VisitDayChoice[] = externalDays.map((day) => {
    const free = freeOfChosenKind(day);
    return {
      value: day.date,
      label: formatVisitDay(day.date, locale),
      disabled: free < personCount,
      // with lunch asked, the places of each kind show at the lunch question
      ...(!asksLunch || free < personCount
        ? { sub: <PlacesText free={free} persons={personCount} locale={locale} /> }
        : {}),
    };
  });

  const personChoices: VisitDayChoice[] = Array.from(
    { length: asksPersons ? maxPersons : 0 },
    (_, index) => {
      const count = index + 1;
      return {
        value: String(count),
        label: personsText(count, locale),
        disabled: visitDay !== undefined && freeOfBestKind(visitDay) < count,
      };
    },
  );

  const lunchChoices: VisitDayChoice[] = [
    { withLunch: true, value: WITH_LUNCH, label: withLunchOptionText[locale] },
    { withLunch: false, value: WITHOUT_LUNCH, label: withoutLunchOptionText[locale] },
  ].map(({ withLunch, value, label: choiceLabel }) => {
    if (visitDay === undefined) return { value, label: choiceLabel };
    const free = freeOfKind(visitDay, withLunch);
    return {
      value,
      label: choiceLabel,
      sub: <PlacesText free={free} persons={personCount} locale={locale} />,
      disabled: free < personCount,
    };
  });

  return (
    <div className="mb-4">
      {asksVisitorType && (
        <VisitDayChoiceList
          control={control}
          name={visitorTypeField}
          legend={visitorTypeLegend[locale]}
          choices={visitorTypeChoices}
          onChosen={onVisitorTypeChosen}
        />
      )}

      {showsHof && (
        <Select
          blockType="select"
          name={name}
          label={label ?? ''}
          required={required ?? false}
          control={control}
          registerAction={registerAction}
          {...(error === undefined ? {} : { error })}
          optionType="dropdown"
          allowMultiple={false}
          placeholder={
            unavailable
              ? loadErrorText[locale]
              : (hoefe.isLoading ? loadingText : placeholderText)[locale]
          }
          options={options}
        />
      )}

      {showsHof && !isExternal && isFieldName(childNameField) && (
        <Text
          blockType="text"
          name={childNameField}
          label={childNameLabel[locale]}
          required={false}
          placeholder={childNamePlaceholder[locale]}
          registerAction={registerAction}
        />
      )}

      {/* a Hof has one day, so only that day shows, once the Hof is chosen */}
      {visitDay !== undefined && !isExternal && (
        <div className="border-line bg-tint mb-4 rounded-[14px] border px-4 py-3">
          <p className="m-0 text-xs font-semibold tracking-wide text-green-700 uppercase">
            {yourDayText[locale]}
          </p>
          <span className="text-heading mt-1 block text-[15px] font-medium">
            {formatVisitDay(visitDay.date, locale)}
          </span>
          {(!asksLunch || freeOfBestKind(visitDay) < personCount) && (
            <span className="mt-1 block text-sm">
              <PlacesText free={freeOfBestKind(visitDay)} persons={personCount} locale={locale} />
            </span>
          )}
        </div>
      )}

      {isExternal && externalDays.length > 0 && (
        <VisitDayChoiceList
          control={control}
          name={dayField}
          legend={chooseDayLegend[locale]}
          choices={dayChoices}
        />
      )}

      {asksPersons && (
        <VisitDayChoiceList
          control={control}
          name={personCountField}
          legend={personsLegend[locale]}
          choices={personChoices}
        />
      )}

      {asksLunch && (
        <VisitDayChoiceList
          control={control}
          name={lunchField}
          legend={lunchLegend[locale]}
          choices={lunchChoices}
          // places may run out after choosing, or the persons change afterwards
          validate={(value) => {
            if (visitDay === undefined) return true;
            const free = freeOfKind(visitDay, value === WITH_LUNCH);
            return free >= personCount || tooFewPlacesText[locale];
          }}
        />
      )}
    </div>
  );
};
