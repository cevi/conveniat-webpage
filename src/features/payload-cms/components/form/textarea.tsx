import type { TextAreaField } from '@payloadcms/plugin-form-builder/types';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

import { Required } from '@/features/payload-cms/components/form/required';
import type React from 'react';

export const TextArea: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: never;
      }>
    >;
    registerAction: UseFormRegister<string & FieldValues>;
    placeholder?: string;
  } & TextAreaField
> = ({ name, label, registerAction, required: requiredFromProperties, errors, placeholder }) => {
  // set default values
  requiredFromProperties ??= false;
  const hasError = errors[name];

  return (
    <div className="mb-4">
      <label className="mb-1 block font-['Inter'] text-xs font-medium text-gray-500" htmlFor={name}>
        {label}
        {requiredFromProperties && <Required />}
      </label>
      <textarea
        id={name}
        className={`min-h-[100px] w-full rounded-md border-0 bg-green-100 px-4 py-2 font-['Inter'] text-sm text-gray-600 shadow-sm ring-1 ring-inset ${hasError ? 'bg-red-50 ring-red-500' : 'ring-transparent'} transition-all duration-200 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#47564c] focus:outline-none focus:ring-inset`}
        rows={4}
        placeholder={placeholder}
        {...registerAction(name, {
          required: requiredFromProperties ? 'This field is required' : false,
        })}
      />
      {hasError && <p className="mt-1 text-xs text-red-600">{hasError.message as string}</p>}
    </div>
  );
};
