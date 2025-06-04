import type { FormFieldBlock } from '@payloadcms/plugin-form-builder/types';
import type { DefaultValues, FieldValues } from 'react-hook-form';

export const buildInitialFormState = (fields: FormFieldBlock[]): DefaultValues<FieldValues> => {
  // eslint-disable-next-line complexity
  return fields.reduce((initialSchema, field) => {
    if (field.blockType === 'checkbox') {
      return {
        ...initialSchema,
        [field.name]: field.defaultValue ?? false,
      };
    }
    if (field.blockType === 'country') {
      return {
        ...initialSchema,
        [field.name]: field.defaultValue ?? '',
      };
    }
    if (field.blockType === 'email') {
      return {
        ...initialSchema,
        [field.name]: field.defaultValue ?? '',
      };
    }
    if (field.blockType === 'text') {
      return {
        ...initialSchema,
        [field.name]: field.defaultValue ?? '',
      };
    }
    if (field.blockType === 'select') {
      return {
        ...initialSchema,
        [field.name]: field.defaultValue ?? '',
      };
    }
    if (field.blockType === 'state') {
      return {
        ...initialSchema,
        [field.name]: field.defaultValue ?? '',
      };
    }
    if (field.blockType === 'textarea') {
      return {
        ...initialSchema,
        [field.name]: field.defaultValue ?? '',
      };
    }
    if (field.blockType === 'date') {
      return {
        ...initialSchema,
        [field.name]: field.defaultValue ?? '',
      };
    }

    return initialSchema;
  }, {} as DefaultValues<FieldValues>);
};
