import type {
  ConditionedBlock,
  ExtendedFormType,
  FormFieldBlock,
  JobSelectionBlock,
} from '@/features/payload-cms/components/form/types';
import type { DefaultValues, FieldValues } from 'react-hook-form';

export const buildInitialFormState = (fields: FormFieldBlock[]): DefaultValues<FieldValues> => {
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

export const buildEmptyFormState = (config: ExtendedFormType): DefaultValues<FieldValues> => {
  const values: Record<string, boolean | string> = {};

  const processFields = (
    fields: (FormFieldBlock | ConditionedBlock | JobSelectionBlock)[],
  ): void => {
    for (const field of fields) {
      if (field.blockType === 'conditionedBlock') {
        processFields(field.fields);
      } else if ('name' in field) {
        values[field.name] = field.blockType === 'checkbox' ? false : '';
      }
    }
  };

  for (const sectionWrapper of config.sections) {
    processFields(sectionWrapper.formSection.fields);
  }

  return values as DefaultValues<FieldValues>;
};
