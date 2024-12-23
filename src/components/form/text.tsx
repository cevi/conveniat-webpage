import type { TextField } from '@payloadcms/plugin-form-builder/types';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

import React from 'react';
import { Error } from './error';

export const Text: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: any;
      }>
    >;
    register: UseFormRegister<any & FieldValues>;
  } & TextField
> = ({ name, errors, label, register, required: requiredFromProperties }) => {
  return (
    <div className="mb-4">
      <label className="block text-[#6d6e76] text-xs font-normal font-['Inter'] mb-1" htmlFor={name}>{label}</label>
      <input id={name} className="w-full h-10 px-4 bg-[#e1e6e2] border border-transparent rounded focus:outline-none focus:ring-2 focus:ring-[#47564c] text-[#595961] text-sm font-normal font-['Inter']" type="text" {...register(name, { required: requiredFromProperties })} />
      {requiredFromProperties && errors[name] && <Error />}
    </div>
  );
};
