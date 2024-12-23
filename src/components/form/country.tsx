import { Control, Controller, type FieldErrorsImpl, type FieldValues, type UseFormRegister } from 'react-hook-form';
import { Required } from './required';
import React from 'react';
import { CountryField } from "@payloadcms/plugin-form-builder/types";
import { ReactSelect } from '@payloadcms/ui';
import { countryOptions } from './country_options';

export const Country: React.FC<
  {
    control: Control<FieldValues, any>
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: any;
      }>
    >;
    register: UseFormRegister<any & FieldValues>;
  } & CountryField
> = ({ name, control, label, register, required: requiredFromProperties }) => {
  return (
    <div className="mb-4">
      <label className="block text-[#6d6e76] text-xs font-normal font-['Inter'] mb-1" htmlFor={name}>
        {label}{requiredFromProperties && <Required />}
      </label>
      <Controller
        defaultValue="CH"
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <ReactSelect
            components={{
              DropdownIndicator: () => null, // Removes the dropdown arrow
              IndicatorSeparator: () => null, // Removes the vertical separator
            }}
            className="w-full h-10 px-4 border border-[#47564c] rounded text-[#595961] text-sm font-normal font-['Inter'] focus:outline-none focus:ring-2 focus:ring-[#47564c] focus:border-[#47564c]"
            inputId={name}
            onChange={(val) => onChange(val ? val.value : '')}
            options={countryOptions}
            value={countryOptions.find((c) => c.value === value)}
            styles={{
              control: (provided) => ({
                ...provided,
                backgroundColor: 'white !important', // Force the background color
                borderColor: '#47564c', // Keep the border color consistent
              }),
              menu: (provided) => ({
                ...provided,
                backgroundColor: 'white !important', // Force the dropdown background color
              }),
              singleValue: (provided) => ({
                ...provided,
                color: '#595961', // Ensure text color is correct
              }),
            }}
          />
        )}
        {...register(name, { required: requiredFromProperties })}
      />
    </div>
  );
}
