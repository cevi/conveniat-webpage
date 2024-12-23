import type { EmailField } from '@payloadcms/plugin-form-builder/types';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

import React from 'react';

import { Error } from './error';

export const Email: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: any;
      }>
    >;
    register: UseFormRegister<any & FieldValues>;
  } & EmailField
> = ({ name, errors, label, register, required: requiredFromProperties }) => {
  return (
    <div className="mb-4">
      <label className="block text-[#6d6e76] text-xs font-normal font-['Inter'] mb-1" htmlFor={name}>{label}</label>
      <input
        className="w-full h-10 px-4 bg-[#e1e6e2] border border-transparent rounded focus:outline-none focus:ring-2 focus:ring-[#47564c] text-[#595961] text-sm font-normal font-['Inter']"
        id={name}
        type="text"
        {...register(name, { pattern: /^\S[^\s@]*@\S+$/, required: requiredFromProperties })}
      />
      {requiredFromProperties && errors[name] && <Error />}
    </div>
  );
};
