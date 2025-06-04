import type { TextField } from '@payloadcms/plugin-form-builder/types';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

import { Required } from '@/features/payload-cms/components/form/required';
import {
  fieldIsNotValidText,
  fieldIsRequiredText,
} from '@/features/payload-cms/components/form/static-form-texts';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

export const Text: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: never;
      }>
    >;
    registerAction: UseFormRegister<string & FieldValues>;
    placeholder?: string;
    // optional regex used as the input validation
    inputValidation?: string;
    // optional custom error message for regex validation
    inputValidationErrorMessage?: string;
  } & TextField
> = ({
  name,
  label,
  registerAction,
  required: requiredFromProperties,
  errors,
  placeholder,
  inputValidation,
  inputValidationErrorMessage,
}) => {
  // set default values
  requiredFromProperties ??= false;
  const hasError = errors[name];
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const validationRules: {
    required?: string | boolean;
    pattern?: {
      value: RegExp;
      message: string;
    };
  } = {
    required: requiredFromProperties ? fieldIsRequiredText[locale] : false,
  };

  if (inputValidation !== undefined && inputValidation !== '') {
    try {
      const regex = new RegExp(inputValidation);
      validationRules.pattern = {
        value: regex,
        message: inputValidationErrorMessage ?? fieldIsNotValidText[locale],
      };
    } catch (error) {
      console.error('Invalid regex provided to Text component:', inputValidation, error);
    }
  }

  return (
    <div className="mb-4">
      <label className="mb-1 block font-['Inter'] text-sm font-medium text-gray-500" htmlFor={name}>
        {label}
        {requiredFromProperties && <Required />}
      </label>
      <input
        id={name}
        className={`h-10 w-full rounded-md border-0 bg-green-100 px-4 py-2 font-['Inter'] text-base text-gray-600 shadow-sm ring-1 ring-inset ${hasError ? 'bg-red-50 ring-red-500' : 'ring-transparent'} transition-all duration-200 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#47564c] focus:outline-none focus:ring-inset`}
        type="text"
        placeholder={placeholder}
        {...registerAction(name, validationRules)}
      />
      {hasError && <p className="mt-1 text-xs text-red-600">{hasError.message as string}</p>}
    </div>
  );
};
