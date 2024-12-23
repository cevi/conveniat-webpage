import type { TextField } from '@payloadcms/plugin-form-builder/types';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

import React from 'react';

import { Required } from './required';

export const Number: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: any;
      }>
    >;
    register: UseFormRegister<any & FieldValues>;
  } & TextField
> = ({ name, label, register, required: requiredFromProperties }) => {
  return (
    <div className="mb-4">
      <label className="block text-[#6d6e76] text-xs font-normal font-['Inter'] mb-1" htmlFor={name}>{label}{requiredFromProperties && <Required />}</label>
      <input
        className="w-full h-10 px-4 border border-[#47564c] rounded text-[#595961] text-sm font-normal font-['Inter'] focus:outline-none focus:ring-2 focus:ring-[#47564c] focus:border-[#47564c]"
        id={name}
        type="number"
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
        {...register(name, { required: requiredFromProperties })}
      />
    </div>
  );
};
