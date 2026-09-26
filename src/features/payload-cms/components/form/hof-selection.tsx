'use client';

import { Select } from '@/features/payload-cms/components/form/select';
import type { HofSelectionBlock } from '@/features/payload-cms/components/form/types';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import type {
  Control,
  FieldError,
  FieldErrorsImpl,
  FieldValues,
  Merge,
  UseFormRegister,
} from 'react-hook-form';

const placeholderText: StaticTranslationString = {
  de: 'Hof auswählen',
  en: 'Select a Hof',
  fr: 'Choisir un Hof',
};

const loadErrorText: StaticTranslationString = {
  de: 'Die Höfe konnten nicht geladen werden. Prüfe deine Verbindung.',
  en: 'The Höfe could not be loaded. Check your connection.',
  fr: 'Les Hofs n’ont pas pu être chargés. Vérifie ta connexion.',
};

const loadingText: StaticTranslationString = {
  de: 'Höfe werden geladen …',
  en: 'Loading Höfe …',
  fr: 'Chargement des Hofs …',
};

/**
 * Lets the person filling in a form pick their Hof. The answer is the Hof's id; the submission
 * hook links the submission to that Hof and stores its name as the answer.
 */
export const HofSelection: React.FC<
  HofSelectionBlock & {
    control: Control;
    registerAction: UseFormRegister<string & FieldValues>;
    error?: FieldError | Merge<FieldError, FieldErrorsImpl<FieldValues>>;
  }
> = ({ name, label, required, control, registerAction, error }) => {
  const locale = useCurrentLocale(i18nConfig) as keyof StaticTranslationString;
  const { data: hoefe, isLoading, isError, fetchStatus } = trpc.hofDashboard.getHofList.useQuery();
  // without signal the query waits paused instead of failing
  const unavailable = hoefe === undefined && (isError || fetchStatus === 'paused');

  return (
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
        unavailable ? loadErrorText[locale] : (isLoading ? loadingText : placeholderText)[locale]
      }
      options={(hoefe ?? []).map((hof) => ({ value: hof.id, label: hof.name }))}
    />
  );
};
