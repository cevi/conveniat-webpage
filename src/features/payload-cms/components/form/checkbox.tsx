import { Required } from '@/features/payload-cms/components/form/required';
import type { CheckboxField } from 'payload';
import type React from 'react';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

export const Checkbox: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: never;
      }>
    >;
    registerAction: UseFormRegister<string & FieldValues>;
    label?: string;
  } & CheckboxField
> = ({ name, label, registerAction, required: requiredFromProperties, errors }) => {
  // set default values
  requiredFromProperties ??= false;
  const hasError = errors[name];

  return (
    <div className="mb-4">
      <div className="flex items-center">
        <input
          id={name}
          className={`text-conveniat-green h-4 w-4 rounded border-0 bg-green-100 shadow-sm ring-1 ring-inset ${hasError ? 'ring-red-500' : 'ring-transparent'} transition-all duration-200 focus:ring-2 focus:ring-[#47564c] focus:ring-offset-0 focus:outline-none`}
          type="checkbox"
          {...registerAction(name, {
            required: requiredFromProperties ? 'This field is required' : false,
          })}
        />
        <label className="ml-2 block font-['Inter'] text-sm text-gray-500" htmlFor={name}>
          {label}
          {requiredFromProperties && <Required />}
        </label>
      </div>
      {hasError && <p className="mt-1 text-xs text-red-600">{hasError.message as string}</p>}
    </div>
  );
};
