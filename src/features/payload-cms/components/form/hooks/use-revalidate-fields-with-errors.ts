import { useEffect } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * Checks a field again as soon as it changes while it shows an error, so the message goes away
 * the moment the answer is valid. react-hook-form does this on its own only after a submit, and a
 * step of a form is checked with `trigger`, so "Dieses Feld ist erforderlich" stayed under a choice
 * the user had already made until the next "Weiter". A field without an error is left alone: the
 * form still says nothing before the user tries to go on.
 */
export const useRevalidateFieldsWithErrors = (formMethods: UseFormReturn<FieldValues>): void => {
  useEffect(() => {
    const subscription = formMethods.watch((_values, { name }) => {
      if (name === undefined) return;
      if (formMethods.getFieldState(name).error === undefined) return;
      void formMethods.trigger(name);
    });
    return (): void => subscription.unsubscribe();
  }, [formMethods]);
};
