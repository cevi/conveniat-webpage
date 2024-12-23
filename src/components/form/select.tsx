//@ts-nocheck

import type { SelectField } from '@payloadcms/plugin-form-builder/types';
import type { Control, FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

import React from 'react';
import { Controller } from 'react-hook-form';
import ReactSelect from 'react-select';

import { Required } from './required';

export const Select: React.FC<
  {
    control: Control<FieldValues, any>;
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: any;
      }>
    >;
    register: UseFormRegister<any & FieldValues>;
  } & SelectField
> = ({ name, control, label, register, options, required: requiredFromProperties }) => {
  return (
    <div className="mb-4">
      <div>
        <label
          className="mb-1 block font-['Inter'] text-xs font-normal text-[#6d6e76]"
          htmlFor={name}
        >
          {label}
          {requiredFromProperties && <Required />}
        </label>
        <Controller
          control={control}
          defaultValue=""
          name={name}
          render={({ field: { onChange, value } }) => (
            <ReactSelect
              className="h-10 w-full rounded font-['Inter'] text-sm font-normal text-[#595961] focus:border-[#47564c] focus:outline-none focus:ring-2 focus:ring-[#47564c]"
              inputId={name}
              instanceId={name}
              onChange={(value_) => onChange(value_ ? value_.value : '')}
              options={options}
              value={options.find((s) => s.value === value)}
              styles={{
                control: (provided) => ({
                  ...provided,
                  width: '100%',
                  height: '2.5rem', // Match h-10
                  padding: '0 1rem', // Adjusted padding to remove left/right gaps
                  backgroundColor: '#e1e6e2',
                  border: '1px solid transparent',
                  borderRadius: '0.375rem', // Rounded corners
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.875rem', // Match text-sm
                  color: '#595961',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#47564c',
                  },
                  '&:focus': {
                    outline: 'none',
                    ringColor: '#47564c',
                    borderColor: '#47564c',
                  },
                }),
                dropdownIndicator: (provided) => ({
                  ...provided,
                  color: '#595961',
                }),
                indicatorSeparator: (provided) => ({
                  ...provided,
                  backgroundColor: 'transparent',
                }),
                menu: (provided) => ({
                  ...provided,
                  backgroundColor: '#fff',
                  borderRadius: '0.375rem',
                  boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected ? '#47564c' : 'transparent',
                  color: state.isSelected ? '#fff' : '#595961',
                  '&:hover': {
                    backgroundColor: '#f4f8f3',
                    color: '#595961',
                  },
                }),
              }}
            />
          )}
          {...register(name, { required: requiredFromProperties })}
        />
      </div>
    </div>
  );
};
