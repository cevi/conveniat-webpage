import type { TextField } from '@payloadcms/plugin-form-builder/types';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

import React from 'react';
import { Required } from '@/components/form/required';

export const Text: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: any;
      }>
    >;
    registerAction: UseFormRegister<any & FieldValues>;
  } & TextField
> = ({ name, label, registerAction, required: requiredFromProperties }) => {
  // set default values
  if (requiredFromProperties === undefined) requiredFromProperties = false;

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
        id={name}
        className="border-transparent h-10 w-full rounded border bg-[#e1e6e2] px-4 font-['Inter'] text-sm font-normal text-[#595961] focus:outline-none focus:ring-2 focus:ring-[#47564c]"
        type="text"
        {...registerAction(name, { required: requiredFromProperties })}
      />
    </div>
  );
};
