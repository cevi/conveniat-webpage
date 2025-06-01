'use client';

import { countryOptions } from '@/features/payload-cms/components/form/country-options';
import { Required } from '@/features/payload-cms/components/form/required';
import type { CountryField } from '@payloadcms/plugin-form-builder/types';
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
> = ({ name, control, label, registerAction, required: requiredFromProperties }) => {
  // set default values
  requiredFromProperties ??= false;

  return (
    <div className="mb-4">
      <label
        className="mb-1 block font-['Inter'] text-xs font-medium text-[#6d6e76]"
        htmlFor={name}
      >
        {label}
        {requiredFromProperties && <Required />}
      </label>
      <Controller
        defaultValue="CH"
        control={control}
        render={({ field: { onChange, value } }) => (
          <ReactSelect
            inputId={name}
            onChange={(value_) => onChange(value_ ? value_.value : '')}
            options={countryOptions}
            value={countryOptions.find((c) => c.value === value)}
            classNamePrefix="react-select"
            styles={{
              control: (provided, state) => ({
                ...provided,
                minHeight: '2.5rem',
                backgroundColor: state.isFocused ? 'white' : '#e1e6e2',
                border: 'none',
                borderRadius: '0.375rem',
                boxShadow: state.isFocused
                  ? '0 0 0 2px #47564c'
                  : '0 1px 2px 0 rgb(0 0 0 / 0.05), inset 0 0 0 1px transparent',
                '&:hover': {
                  backgroundColor: state.isFocused ? 'white' : '#e1e6e2',
                  boxShadow: state.isFocused
                    ? '0 0 0 2px #47564c'
                    : '0 1px 2px 0 rgb(0 0 0 / 0.05), inset 0 0 0 1px transparent',
                  borderColor: 'transparent',
                },
                transition: 'all 200ms',
                cursor: 'pointer',
              }),
              valueContainer: (provided) => ({
                ...provided,
                padding: '2px 12px',
              }),
              input: (provided) => ({
                ...provided,
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                color: '#595961',
              }),
              singleValue: (provided) => ({
                ...provided,
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                color: '#595961',
              }),
              dropdownIndicator: (provided) => ({
                ...provided,
                color: '#595961',
                '&:hover': {
                  color: '#595961',
                },
                transition: 'none',
              }),
              indicatorSeparator: () => ({
                display: 'none',
              }),
              menu: (provided) => ({
                ...provided,
                borderRadius: '0.375rem',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              }),
              menuList: (provided) => ({
                ...provided,
                padding: '4px',
              }),
              option: (provided, state) => ({
                ...provided,
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                padding: '8px 12px',
                borderRadius: '0.25rem',
                backgroundColor: state.isSelected
                  ? '#47564c'
                  : state.isFocused
                    ? '#f4f8f3'
                    : 'transparent',
                color: state.isSelected ? 'white' : '#595961',
                cursor: 'pointer',
                '&:active': {
                  backgroundColor: state.isSelected ? '#47564c' : '#e1e6e2',
                },
              }),
            }}
          />
        )}
        {...registerAction(name, { required: requiredFromProperties })}
      />
    </div>
  );
};
