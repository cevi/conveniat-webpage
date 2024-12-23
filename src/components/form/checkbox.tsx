import { CheckboxField } from "payload";
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';
import { Required } from './required';
import React from 'react';

export const Checkbox: React.FC<
{
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: any;
      }>
    >;
    register: UseFormRegister<any & FieldValues>;
  } & CheckboxField
  > = ({name, label, register, required: requiredFromProperties}) => {
    return (
    <div className="mb-4 flex items-center space-x-2">
      <input id={name} className="w-5 h-5 text-[#47564c] bg-[#e1e6e2] border-2 border-[#47564c] rounded focus:ring-2 focus:ring-[#47564c] focus:outline-none"
       type="checkbox" {...register(name, { required: requiredFromProperties })} />
        <label className="text-[#6d6e76] text-sm font-normal font-['Inter']" htmlFor={name}>{label}{requiredFromProperties && <Required/>}</label>
    </div>
    );
  }
