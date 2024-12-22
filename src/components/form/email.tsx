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
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        placeholder="Email"
        type="text"
        {...register(name, { pattern: /^\S[^\s@]*@\S+$/, required: requiredFromProperties })}
      />
      {requiredFromProperties && errors[name] && <Error />}
    </div>
  );
};
