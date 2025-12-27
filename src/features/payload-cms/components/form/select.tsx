'use client';

import { Required } from '@/features/payload-cms/components/form/required';
import { fieldIsRequiredText } from '@/features/payload-cms/components/form/static-form-texts';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type { SelectField } from '@payloadcms/plugin-form-builder/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import type { Control, FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import ReactSelect from 'react-select';

export const Select: React.FC<
  {
    control: Control;
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: never;
      }>
    >;
    registerAction: UseFormRegister<string & FieldValues>;
    placeholder?: string;
    optionType: 'dropdown' | 'radio' | 'cards';
    allowMultiple: boolean;
  } & SelectField
> = ({
  name,
  control,
  label,
  options,
  required: requiredFromProperties,
  errors,
  placeholder,
  optionType,
  allowMultiple,
}) => {
  requiredFromProperties ??= false;
  const hasError = errors[name];

  const locale = useCurrentLocale(i18nConfig);

  const noOptionsText: StaticTranslationString = {
    de: 'Keine Optionen verfügbar',
    en: 'No options available',
    fr: "Aucune option n'est disponible",
  };

  if (optionType === 'dropdown') {
    return (
      <div className="mb-4">
        <div>
          <label className="font-body mb-1 block text-sm font-medium text-gray-500" htmlFor={name}>
            {label}
            {requiredFromProperties && <Required />}
          </label>
          <Controller
            control={control}
            name={name}
            defaultValue={allowMultiple ? [] : ''}
            rules={{
              required: requiredFromProperties ? fieldIsRequiredText[locale as Locale] : false,
            }}
            render={({ field: { onChange, value, ref } }) => (
              <ReactSelect
                inputId={name}
                instanceId={name}
                isMulti={allowMultiple}
                onChange={(selectedOptions) => {
                  if (allowMultiple) {
                    onChange(
                      selectedOptions
                        ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          // @ts-expect-error
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                          selectedOptions.map(
                            (option: { value: string; label: string }) => option.value,
                          )
                        : [],
                    );
                  } else {
                    onChange(
                      selectedOptions
                        ? (
                            selectedOptions as {
                              value: string;
                              label: string;
                            }
                          ).value
                        : '',
                    );
                  }
                }}
                options={options}
                noOptionsMessage={() => noOptionsText[locale as Locale]}
                value={
                  allowMultiple
                    ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
                      options.filter((option): boolean => value?.includes(option.value))
                    : options.find((option) => option.value === value)
                }
                ref={ref}
                classNamePrefix="react-select"
                unstyled
                placeholder={placeholder}
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
                  input: () => 'font-body text-base text-gray-600 m-0 p-0 cursor-pointer',
                  singleValue: () => 'font-body text-base text-gray-600 m-0',
                  multiValue: () => 'bg-green-100 text-green-700 rounded px-2 py-1 m-1 text-xs',
                  multiValueLabel: () => 'font-medium',
                  multiValueRemove: () => 'ml-1 hover:bg-green-200 rounded',
                  placeholder: () => 'font-body text-base text-gray-400 m-0',
                  indicatorsContainer: () => 'flex items-center',
                  dropdownIndicator: () => 'flex items-center justify-center w-5 h-5 text-gray-500',
                  indicatorSeparator: () => 'hidden',
                  menu: () =>
                    'mt-1 rounded-md overflow-hidden shadow-lg bg-white border border-gray-200 z-50',
                  menuList: () => 'py-1',
                  option: (state) =>
                    cn('font-body text-base px-3 py-2 transition-colors', {
                      'bg-green-600 text-white': state.isSelected,
                      'bg-green-50 text-gray-600': state.isFocused && !state.isSelected,
                      'bg-white text-gray-600 hover:bg-green-50':
                        !state.isSelected && !state.isFocused,
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
          {hasError && <p className="mt-1 text-xs text-red-600">{hasError.message as string}</p>}
        </div>
      </div>
    );
  }

  if (optionType === 'radio') {
    return (
      <div className="mb-4">
        <fieldset>
          <legend className="font-body mb-1 block text-sm font-medium text-gray-500">
            {label}
            {requiredFromProperties && <Required />}
          </legend>
          <Controller
            control={control}
            name={name}
            defaultValue={allowMultiple ? [] : ''}
            rules={{
              required: requiredFromProperties ? fieldIsRequiredText[locale as Locale] : false,
            }}
            render={({ field: { onChange, value } }) => (
              <div className="space-y-3">
                {options.map((option) => (
                  <div key={option.value} className="flex items-center">
                    <input
                      id={`${name}-${option.value}`}
                      type={allowMultiple ? 'checkbox' : 'radio'}
                      name={allowMultiple ? undefined : name}
                      value={option.value}
                      checked={
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        allowMultiple
                          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
                            (value?.includes(option.value) ?? false)
                          : value === option.value
                      }
                      onChange={(event) => {
                        if (allowMultiple) {
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                          const currentValue = value ?? [];
                          if (event.target.checked) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            onChange([...currentValue, option.value]);
                          } else {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
                            onChange(currentValue.filter((v: string) => v !== option.value));
                          }
                        } else {
                          onChange(event.target.value);
                        }
                      }}
                      className={cn(
                        'h-4 w-4 border-gray-300 text-green-600 focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
                        {
                          'border-red-500 text-red-600 focus:ring-red-600': hasError,
                          rounded: allowMultiple, // checkboxes are rounded
                        },
                      )}
                    />
                    <label
                      htmlFor={`${name}-${option.value}`}
                      className={cn(
                        'font-body ml-3 block cursor-pointer text-sm font-medium transition-colors',
                        {
                          'text-red-600': hasError,
                          'text-gray-500 hover:text-gray-900': !hasError,
                        },
                      )}
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          />
          {hasError && <p className="mt-2 text-xs text-red-600">{hasError.message as string}</p>}
        </fieldset>
      </div>
    );
  }

  const maxContentLength = Math.max(...options.map((option) => option.label.length));
  const gridColsClass =
    maxContentLength > 5
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';

  return (
    <div className="mb-4">
      <div>
        <label className="font-body mb-3 block text-sm font-medium text-gray-500">
          {label}
          {requiredFromProperties && <Required />}
        </label>
        <Controller
          control={control}
          name={name}
          defaultValue={allowMultiple ? [] : ''}
          rules={{
            required: requiredFromProperties ? fieldIsRequiredText[locale as Locale] : false,
          }}
          render={({ field: { onChange, value } }) => (
            <div className={cn('grid gap-3', gridColsClass)}>
              {options.map((option) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const isSelected: boolean = allowMultiple
                  ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
                    (value?.includes(option.value) ?? false)
                  : value === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (allowMultiple) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        const currentValue = value ?? [];
                        if (isSelected) {
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
                          onChange(currentValue.filter((v: string) => v !== option.value));
                        } else {
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                          onChange([...currentValue, option.value]);
                        }
                      } else {
                        onChange(option.value);
                      }
                    }}
                    className={cn(
                      'font-body relative flex cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none',
                      {
                        'border-green-600 bg-green-50 text-green-700 ring-green-600':
                          isSelected && !hasError,
                        'border-red-500 bg-red-50 text-red-700 ring-red-600':
                          isSelected && hasError,
                        'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 focus:ring-green-600':
                          !isSelected && !hasError,
                        'border-red-300 bg-white text-gray-700 hover:border-red-400 hover:bg-red-50 focus:ring-red-600':
                          !isSelected && hasError,
                      },
                    )}
                  >
                    <span className="font-body text-center text-sm font-medium text-gray-500">
                      {option.label}
                    </span>
                    {isSelected && (
                      <div
                        className={cn(
                          'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white',
                          {
                            'bg-green-600': !hasError,
                            'bg-red-600': hasError,
                          },
                        )}
                      >
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        />
        {hasError && <p className="mt-2 text-xs text-red-600">{hasError.message as string}</p>}
      </div>
    </div>
  );
};
