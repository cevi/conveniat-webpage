import type { FormFieldBlock } from '@payloadcms/plugin-form-builder/types';

export const buildInitialFormState = (fields: FormFieldBlock[]) => {
  return fields.reduce((initialSchema, field) => {
    if (field.blockType === 'text') {
      return {
        ...initialSchema,
        [field.name]: '',
      };
    }
  }, {});
};
