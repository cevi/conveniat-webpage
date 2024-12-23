import type { TextField } from '@payloadcms/plugin-form-builder/types';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

import React from 'react';
import { Required } from './required';
import { TextareaField } from 'payload';

export const Textarea: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: any;
      }>
    >;
    register: UseFormRegister<any & FieldValues>;
  } & TextareaField
> = ({ name, label, register, required: requiredFromProperties }) => {
  return (
    <div className="mb-4">
      <label className="block text-[#6d6e76] text-xs font-normal font-['Inter'] mb-1" htmlFor={name}>{label}{requiredFromProperties && <Required />}</label>
      <textarea id={name}
        className="w-full h-30 px-4 bg-[#e1e6e2] border border-transparent rounded focus:outline-none focus:ring-2 focus:ring-[#47564c] text-[#595961] text-sm font-normal font-['Inter']"
        rows="4"
        {...register(name, { required: requiredFromProperties })} />
    </div>
  );
};
