'use client';

import type { EmailField } from '@payloadcms/plugin-form-builder/types';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

import { Required } from '@/features/payload-cms/components/form/required';
import type React from 'react';

export const Email: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: never;
      }>
    >;
    registerAction: UseFormRegister<string & FieldValues>;
  } & EmailField
> = ({ name, label, registerAction, required: requiredFromProperties, errors }) => {
  // set default values
  requiredFromProperties ??= false;
  const hasError = errors[name];

  return (
    <div className="mb-4">
      <label className="mb-1 block font-['Inter'] text-xs font-medium text-gray-500" htmlFor={name}>
        {label}
        {requiredFromProperties && <Required />}
      </label>
      <input
        className={`h-10 w-full rounded-md border-0 bg-green-100 px-4 py-2 font-['Inter'] text-sm text-gray-600 shadow-sm ring-1 ring-inset ${hasError ? 'bg-red-50 ring-red-500' : 'ring-transparent'} transition-all duration-200 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#47564c] focus:outline-none focus:ring-inset`}
        id={name}
        type="email"
        {...registerAction(name, {
          required: requiredFromProperties ? 'This field is required' : false,
          pattern: {
            value: /^\S[^\s@]*@\S+$/,
            message: 'Please enter a valid email address',
          },
        })}
      />
      {hasError && <p className="mt-1 text-xs text-red-600">{hasError.message as string}</p>}
    </div>
  );
};
