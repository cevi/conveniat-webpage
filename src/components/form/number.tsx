//@ts-nocheck

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
      <label
        className="mb-1 block font-['Inter'] text-xs font-normal text-[#6d6e76]"
        htmlFor={name}
      >
        {label}
        {requiredFromProperties && <Required />}
      </label>
      <input
        className="h-10 w-full rounded border border-[#47564c] px-4 font-['Inter'] text-sm font-normal text-[#595961] focus:border-[#47564c] focus:outline-none focus:ring-2 focus:ring-[#47564c]"
        id={name}
        type="number"
        {...register(name, { required: requiredFromProperties })}
      />
    </div>
  );
};
