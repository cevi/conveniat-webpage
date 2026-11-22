import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { StaticTranslationString } from '@/types/types';
import type { TextField, TextFieldSingleValidation } from 'payload';

/** What an editor reads when the value names no tab of the dashboard settings. */
export const unknownAreaMessage = (language: string | undefined): string =>
  getValidationMessage(language, {
    en: 'There is no such tab. Pick one of the tabs set up in the Hof dashboard settings.',
    de: 'Diesen Reiter gibt es nicht. Einen der Reiter aus den Hof-Dashboard Einstellungen wählen.',
    fr: 'Cet onglet n’existe pas. Choisis l’un des onglets des paramètres du tableau de bord des Hofs.',
  });

/**
 * A tab of the Hof dashboard, stored as its id. The tabs are set up in the dashboard settings,
 * so the choices are read from there when the field renders and checked again by `validate`;
 * a select field could only offer choices fixed in the code.
 */
export const hofAreaField = ({
  name,
  label,
  required = false,
  validate,
  width,
  description,
}: {
  name: string;
  label: StaticTranslationString;
  required?: boolean;
  validate: TextFieldSingleValidation;
  width: string;
  description?: StaticTranslationString;
}): TextField => ({
  name,
  type: 'text',
  label,
  required,
  validate,
  hooks: {
    // a cleared choice is no tab, and `exists` queries must not find it
    beforeChange: [({ value }): unknown => (value === '' ? null : value)],
  },
  admin: {
    width,
    ...(description === undefined ? {} : { description }),
    components: {
      Field: '@/features/hof-dashboard/payload-cms/components/area-select-field#AreaSelectField',
    },
  },
});
