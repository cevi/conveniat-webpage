import type { Form, FormSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook } from 'payload';
import { APIError } from 'payload';

type SectionFields = NonNullable<NonNullable<Form['sections']>[number]['formSection']>['fields'];
type SectionField = NonNullable<SectionFields>[number];

/** A leaf field — everything except conditionedBlock and message */
type ValidatableField = Exclude<SectionField, { blockType: 'conditionedBlock' | 'message' }>;

/**
 * Collect the fields that should actually be validated, respecting
 * conditionedBlock display conditions against the submitted data.
 */
function collectValidatableFields(
  fields: SectionField[],
  submissionDataMap: Map<string, string>,
): ValidatableField[] {
  const result: ValidatableField[] = [];

  for (const field of fields) {
    if (field.blockType === 'message') continue;

    if (field.blockType === 'conditionedBlock') {
      // Only include inner fields when the display condition holds
      const conditionField = field.displayCondition?.field;
      const conditionValue = field.displayCondition?.value;

      if (
        typeof conditionField === 'string' &&
        conditionField.length > 0 &&
        typeof conditionValue === 'string'
      ) {
        const actualValue = submissionDataMap.get(conditionField) ?? '';
        if (actualValue !== conditionValue) {
          continue; // condition not met → skip all inner fields
        }
      }

      // Condition met (or no condition defined) → recurse into inner fields
      if (field.fields) {
        // Inner fields cannot contain nested conditionedBlocks per the type,
        // but we cast via the same helper for safety.
        for (const inner of field.fields) {
          if ('blockType' in inner && inner.blockType !== 'message') {
            result.push(inner as ValidatableField);
          }
        }
      }
      continue;
    }

    // Regular field
    result.push(field);
  }

  return result;
}

export const validateFormSubmission: CollectionBeforeChangeHook<FormSubmission> = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create') return data;
  if (!data.submissionData || !data.form) return data;

  const formId = typeof data.form === 'string' ? data.form : data.form.id;

  if (!formId) return data;

  // Fetch the form definition
  const form = await req.payload.findByID({
    collection: 'forms',
    id: formId,
    depth: 1,
  });

  if (typeof form !== 'object') return data;

  // Build a map of submitted values for quick lookup
  const submissionDataMap = new Map<string, string>();
  for (const item of data.submissionData) {
    submissionDataMap.set(item.field, item.value);
  }

  // Collect validatable fields from all sections, respecting conditions
  const allFields: ValidatableField[] = [];
  for (const section of form.sections) {
    if (section.formSection.fields) {
      allFields.push(...collectValidatableFields(section.formSection.fields, submissionDataMap));
    }
  }

  const fieldErrors: { field: string; message: string }[] = [];

  for (const fieldConfig of allFields) {
    // Ensure the field has a name
    if (!('name' in fieldConfig) || typeof fieldConfig.name !== 'string') {
      continue;
    }

    const fieldName = fieldConfig.name;
    const value = submissionDataMap.get(fieldName);
    const hasValue = value !== undefined && value !== '';

    // Check required (respecting the flag — only validate if required === true)
    const isRequired = 'required' in fieldConfig && fieldConfig.required === true;
    if (isRequired && !hasValue) {
      fieldErrors.push({ field: fieldName, message: 'This field is required.' });
      continue;
    }

    if (!hasValue) continue;

    // Type-specific validation
    switch (fieldConfig.blockType) {
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          fieldErrors.push({
            field: fieldName,
            message: 'Please enter a valid email address.',
          });
        }
        break;
      }
      case 'number': {
        if (Number.isNaN(Number(value))) {
          fieldErrors.push({ field: fieldName, message: 'Please enter a valid number.' });
        }
        break;
      }
      case 'date': {
        if (Number.isNaN(Date.parse(value))) {
          fieldErrors.push({ field: fieldName, message: 'Please enter a valid date.' });
        }
        break;
      }
      case 'text': {
        if (
          'inputValidation' in fieldConfig &&
          typeof fieldConfig.inputValidation === 'string' &&
          fieldConfig.inputValidation.length > 0
        ) {
          try {
            const regex = new RegExp(fieldConfig.inputValidation);
            if (!regex.test(value)) {
              fieldErrors.push({
                field: fieldName,
                message: fieldConfig.inputValidationErrorMessage ?? 'Invalid input format.',
              });
            }
          } catch {
            console.error('Invalid regex in form config:', fieldConfig.inputValidation);
          }
        }
        break;
      }
      case 'select': {
        if ('options' in fieldConfig && Array.isArray(fieldConfig.options)) {
          const allowedValues = new Set(
            fieldConfig.options.map((opt: { value: string }) => opt.value),
          );
          // Multi-select values are stored as comma-separated strings
          const submittedValues = value.split(', ').map((v) => v.trim());
          const invalidValues = submittedValues.filter((v) => !allowedValues.has(v));
          if (invalidValues.length > 0) {
            fieldErrors.push({
              field: fieldName,
              message: `Invalid selection: ${invalidValues.join(', ')}`,
            });
          }
        }
        break;
      }
      // jobSelection, ceviDbLogin, checkbox, country, textarea:
      // no extra type-specific validation needed beyond the required check above
    }
  }

  if (fieldErrors.length > 0) {
    throw new APIError(
      'Validation Error',
      400,
      fieldErrors as unknown as Record<string, unknown>[],
      true,
    );
  }

  return data;
};
