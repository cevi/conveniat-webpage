import type { TextAreaField } from '@payloadcms/plugin-form-builder/types';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

import { Required } from '@/features/payload-cms/components/form/required';
import React from 'react';

export const TextArea: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: never;
      }>
    >;
    registerAction: UseFormRegister<string & FieldValues>;
  } & TextAreaField
> = ({ name, label, registerAction, required: requiredFromProperties }) => {
  // set default values
  requiredFromProperties ??= false;

  return (
    <div className="mb-4">
      <label
        className="mb-1 block font-['Inter'] text-xs font-normal text-[#6d6e76]"
        htmlFor={name}
      >
        {label}
        {requiredFromProperties && <Required />}
      </label>
      <textarea
        id={name}
        className="h-30 min-h-12 w-full rounded-sm border border-transparent bg-[#e1e6e2] px-4 font-['Inter'] text-sm font-normal text-[#595961] focus:ring-2 focus:ring-[#47564c] focus:outline-hidden"
        rows={4}
        {...registerAction(name, { required: requiredFromProperties })}
      />
    </div>
  );
};
