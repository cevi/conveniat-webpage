'use client';

import { countryOptions } from '@/features/payload-cms/components/form/country-options';
import { Required } from '@/features/payload-cms/components/form/required';
import { fieldIsRequiredText } from '@/features/payload-cms/components/form/static-form-texts';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type { CountryField } from '@payloadcms/plugin-form-builder/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import type { Control } from 'react-hook-form';
import {
  Controller,
  type FieldErrorsImpl,
  type FieldValues,
  type UseFormRegister,
} from 'react-hook-form';
import ReactSelect from 'react-select';

export const Country: React.FC<
  {
    control: Control;
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: never;
      }>
    >;
    registerAction: UseFormRegister<string & FieldValues>;
  } & CountryField
> = ({ name, control, label, required: requiredFromProperties, errors }) => {
  requiredFromProperties ??= false;
  const hasError = !!errors[name];
  const locale = useCurrentLocale(i18nConfig);

  return (
    <div className="mb-4">
      <label className="font-body mb-1 block text-sm font-medium text-gray-500" htmlFor={name}>
        {label}
        {requiredFromProperties && <Required />}
      </label>
      <Controller
        control={control}
        name={name}
        defaultValue="CH"
        rules={{
          required: requiredFromProperties ? fieldIsRequiredText[locale as Locale] : false,
        }}
        render={({ field: { onChange, value, ref } }) => (
          <ReactSelect
            inputId={name}
            onChange={(value_) => onChange(value_ ? value_.value : '')}
            options={countryOptions}
            value={countryOptions.find((c) => c.value === value)}
            ref={ref}
            classNamePrefix="react-select"
            unstyled
            classNames={{
              control: (state) =>
                cn(
                  'min-h-10 w-full rounded-md border-0 px-3 py-2 font-body text-base transition-all duration-200 cursor-pointer shadow-sm ring-1 ring-inset',
                  {
                    'bg-red-50 ring-red-500 text-gray-600': hasError,
                    'bg-green-100 ring-2 ring-green-600 text-gray-600':
                      !hasError && state.isFocused,
                    'bg-green-100 ring-transparent text-gray-600 hover:ring-green-600':
                      !hasError && !state.isFocused,
                  },
                ),
              valueContainer: () => 'px-0 py-0',
              input: () => 'font-body text-base text-gray-600 m-0 p-0',
              singleValue: () => 'font-body text-base text-gray-600 m-0',
              placeholder: () => 'font-body text-base text-gray-400 m-0',
              indicatorsContainer: () => 'flex items-center',
              dropdownIndicator: () => 'flex items-center justify-center w-5 h-5 text-gray-500',
              indicatorSeparator: () => 'hidden',
              menu: () =>
                'mt-1 rounded-md overflow-hidden shadow-lg bg-white border border-gray-200 z-50',
              menuList: () => 'py-1',
              option: (state) =>
                cn('font-body text-base px-3 py-2 cursor-pointer transition-colors', {
                  'bg-green-600 text-white': state.isSelected,
                  'bg-green-50 text-gray-600': state.isFocused && !state.isSelected,
                  'bg-white text-gray-600 hover:bg-green-50': !state.isSelected && !state.isFocused,
                }),
              noOptionsMessage: () => 'font-body text-base text-gray-500 px-3 py-2',
              loadingMessage: () => 'font-body text-base text-gray-500 px-3 py-2',
            }}
            styles={{
              control: (base) => ({
                ...base,
                minHeight: '40px',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none',
                },
              }),
              valueContainer: (base) => ({
                ...base,
                padding: '0',
              }),
              input: (base) => ({
                ...base,
                margin: '0',
                padding: '0',
              }),
              singleValue: (base) => ({
                ...base,
                margin: '0',
              }),
              placeholder: (base) => ({
                ...base,
                margin: '0',
              }),
              menu: (base) => ({
                ...base,
                zIndex: 50,
              }),
            }}
          />
        )}
      />
      {hasError && <p className="mt-1 text-xs text-red-600">{errors[name]?.message as string}</p>}
    </div>
  );
};
