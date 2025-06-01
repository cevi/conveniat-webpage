import type { TextField } from '@payloadcms/plugin-form-builder/types';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

import { Required } from '@/features/payload-cms/components/form/required';
import type React from 'react';

export const Text: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: never;
      }>
    >;
    registerAction: UseFormRegister<string & FieldValues>;
  } & TextField
> = ({ name, label, registerAction, required: requiredFromProperties }) => {
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
      <input
        id={name}
        className="h-10 w-full rounded-md border-0 bg-[#e1e6e2] px-4 py-2 font-['Inter'] text-sm text-[#595961] shadow-sm ring-1 ring-transparent transition-all duration-200 ring-inset placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#47564c] focus:outline-none focus:ring-inset"
        type="text"
        {...registerAction(name, { required: requiredFromProperties })}
      />
    </div>
  );
};
