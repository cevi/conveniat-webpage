jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_HOF_DASHBOARD: true },
}));

import { formHofDashboardField } from '@/features/hof-dashboard/payload-cms/form-hof-dashboard-field';
import type { Field, TextFieldSingleValidation } from 'payload';

/** Finds a named field anywhere below the given ones, rows included. */
const findField = (fields: Field[], name: string): Field | undefined => {
  for (const field of fields) {
    if ('name' in field && field.name === name) return field;
    if ('fields' in field) {
      const found = findField(field.fields, name);
      if (found !== undefined) return found;
    }
  }
  return undefined;
};

const titleField = findField([formHofDashboardField], 'titleField');
if (titleField === undefined || !('validate' in titleField)) {
  throw new Error('titleField has no validation');
}
const validate = titleField.validate as TextFieldSingleValidation;

/** A stand registration: a Hof, the name of the stand, and a contact asked only for food. */
const sections = [
  {
    formSection: {
      fields: [
        { blockType: 'hofSelection', name: 'hof' },
        { blockType: 'text', name: 'stand' },
        {
          blockType: 'conditionedBlock',
          fields: [{ blockType: 'text', name: 'kontakt' }],
        },
      ],
    },
  },
];

const check = (value?: string): Promise<string | true> =>
  Promise.resolve(
    validate(value, {
      data: { sections },
      req: { i18n: { language: 'de' } },
    } as unknown as Parameters<TextFieldSingleValidation>[1]),
  );

describe('the field that names an entry', () => {
  it('accepts the name of a field of the form', async () => {
    await expect(check('stand')).resolves.toBe(true);
  });

  it('accepts a field asked only under a condition', async () => {
    await expect(check('kontakt')).resolves.toBe(true);
  });

  it('may stay empty', async () => {
    await expect(check('')).resolves.toBe(true);
    await expect(check()).resolves.toBe(true);
  });

  it('refuses a name no field of the form has, in the editor’s language', async () => {
    await expect(check('standname')).resolves.toEqual(
      expect.stringContaining('Kein Feld dieses Formulars'),
    );
  });
});
