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
        [field.name]: field.defaultValue === true,
      };
    }
    if (
      field.blockType === 'country' ||
      field.blockType === 'email' ||
      field.blockType === 'text' ||
      field.blockType === 'select' ||
      field.blockType === 'state' ||
      field.blockType === 'textarea' ||
      field.blockType === 'date'
    ) {
      return {
        ...initialSchema,
        [field.name]: field.defaultValue ?? '',
      };
    }

    return initialSchema;
  }, {} as DefaultValues<FieldValues>);
};

export const buildEmptyFormState = (config: ExtendedFormType): DefaultValues<FieldValues> => {
  const values: Record<string, boolean | string | number | string[]> = {};

  const processFields = (
    fields: (FormFieldBlock | ConditionedBlock | JobSelectionBlock)[],
  ): void => {
    for (const field of fields) {
      if (field.blockType === 'conditionedBlock') {
        // Conditioned block fields are excluded from initial default values so hidden fields remain undefined
        continue;
      } else if ('name' in field && typeof field.name === 'string' && field.name.length > 0) {
        if (field.blockType === 'checkbox') {
          values[field.name] = 'defaultValue' in field && field.defaultValue === true;
        } else if (
          field.blockType === 'select' &&
          'allowMultiple' in field &&
          Boolean(field.allowMultiple)
        ) {
          values[field.name] =
            'defaultValue' in field &&
            typeof field.defaultValue === 'string' &&
            field.defaultValue.length > 0
              ? [field.defaultValue]
              : [];
        } else {
          const fieldDefaultValue = 'defaultValue' in field ? field.defaultValue : undefined;
          values[field.name] =
            typeof fieldDefaultValue === 'string' ||
            typeof fieldDefaultValue === 'number' ||
            typeof fieldDefaultValue === 'boolean'
              ? fieldDefaultValue
              : '';
        }
      }
    }
  };

  for (const sectionWrapper of config.sections) {
    processFields(sectionWrapper.formSection.fields);
  }

  return values;
};
