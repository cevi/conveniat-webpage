import { environmentVariables } from '@/config/environment-variables';
import { phoneNumberValidation } from '@/features/payload-cms/payload-cms/utils/phone-number-validation';
import {
  AlignFeature,
  BlockquoteFeature,
  BoldFeature,
  defaultEditorLexicalConfig,
  FixedToolbarFeature,
  HeadingFeature,
  ItalicFeature,
  lexicalEditor as lexicalEditorGenerator,
  LinkFeature,
  ParagraphFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical';
import type {
  CollectionSlug,
  FieldAffectingData,
  RadioField,
  TextField,
  TextFieldSingleValidation,
} from 'payload';

/**
 * The link type used for phone number links, i.e. links rendered as `tel:` anchors.
 */
export const PHONE_LINK_TYPE = 'phone';

/**
 * Adds a "phone number" option to the link type radio of payload's link feature
 * and relaxes the fields that only make sense for the built-in link types:
 *
 * - `url` is neither shown nor validated for phone links,
 * - `newTab` is hidden, as a phone link never opens a new tab.
 */
const withPhoneLinkType = (defaultFields: FieldAffectingData[]): FieldAffectingData[] =>
  defaultFields.map((field): FieldAffectingData => {
    switch (field.name) {
      case 'linkType': {
        const radioField = field as RadioField;
        return {
          ...radioField,
          options: [
            ...radioField.options,
            {
              label: {
                de: 'Telefonnummer',
                en: 'Phone number',
                fr: 'Numéro de téléphone',
              },
              value: PHONE_LINK_TYPE,
            },
          ],
        };
      }

      case 'url': {
        const urlField = field as TextField;
        const defaultValidate = urlField.validate as TextFieldSingleValidation | undefined;
        const validateUnlessPhoneLink: TextFieldSingleValidation = (value, options) => {
          // no url is stored for phone links, the phone number is used instead
          if ((options.siblingData as { linkType?: string }).linkType === PHONE_LINK_TYPE) {
            return true;
          }
          return defaultValidate?.(value, options) ?? true;
        };

        return {
          ...urlField,
          admin: {
            ...urlField.admin,
            condition: (_, siblingData): boolean =>
              siblingData['linkType'] !== 'internal' && siblingData['linkType'] !== PHONE_LINK_TYPE,
          },
          validate: validateUnlessPhoneLink,
        } as FieldAffectingData;
      }

      case 'newTab': {
        return {
          ...field,
          admin: {
            ...field.admin,
            condition: (_, siblingData): boolean => siblingData['linkType'] !== PHONE_LINK_TYPE,
          },
        } as FieldAffectingData;
      }

      default: {
        return field;
      }
    }
  });

export const minimalEditorFeatures = [
  // a fixed toolbar that is always visible
  FixedToolbarFeature(),

  // basic text formatting
  ItalicFeature(),
  BoldFeature(),
  ParagraphFeature(),
  LinkFeature({
    fields: ({ defaultFields }) => [
      ...withPhoneLinkType(defaultFields),
      {
        name: 'phoneNumber',
        type: 'text',
        label: {
          de: 'Telefonnummer',
          en: 'Phone number',
          fr: 'Numéro de téléphone',
        },
        admin: {
          condition: (_, siblingData): boolean => siblingData['linkType'] === PHONE_LINK_TYPE,
          placeholder: '+41 79 316 83 49',
          description: {
            de: 'Wird als Telefon-Link dargestellt und öffnet auf dem Smartphone die Telefon-App.',
            en: 'Rendered as a phone link, opens the phone app on mobile devices.',
            fr: "Affiché comme lien téléphonique, ouvre l'application téléphone sur mobile.",
          },
        },
        validate: phoneNumberValidation,
      },
      {
        name: 'fragment',
        type: 'text',
        label: {
          de: 'Anker / Fragment',
          en: 'Anchor / Fragment',
          fr: 'Ancre / Fragment',
        },
        admin: {
          condition: (_, siblingData): boolean => {
            if (siblingData['linkType'] !== 'internal') {
              return false;
            }
            const targetDocument = siblingData['doc'] as { relationTo?: string } | undefined;
            const relationTo = targetDocument?.relationTo;
            return !relationTo || relationTo === 'generic-page' || relationTo === 'blog';
          },
          description: {
            de: 'Optionale Sprungmarke / Anker (z. B. "projektleitung" für den Akkordeon-Block)',
            en: 'Optional fragment / anchor (e.g. "projektleitung" for accordion block)',
            fr: 'Ancre / fragment optionnel (par ex. "projektleitung" pour le bloc accordéon)',
          },
        },
      },
    ],
    // we only allow links to pages or blog posts
    // TODO: we should list the title or slug instead of the ID in the overview
    /* ATTENTION: if a collection was added here:
      make sure to:
      - update /src/features/payload-cms/converters/richtext-lexical/link-converter.tsx
      - update /src/features/payload-cms/payload-cms/plugins/form/fix-links-in-mails.ts
      */
    enabledCollections: [
      'generic-page',
      'blog',
      'images',
      'documents',
      ...(environmentVariables.FEATURE_ENABLE_APP_FEATURE
        ? ['camp-map-annotations' as CollectionSlug]
        : []),
      ...(environmentVariables.FEATURE_ENABLE_APP_FEATURE
        ? ['camp-schedule-entry' as CollectionSlug]
        : []),
    ],
  }),
];

export const defaultEditorFeatures = [
  ...minimalEditorFeatures,
  HeadingFeature({
    enabledHeadingSizes: ['h2', 'h3'],
  }),
  BlockquoteFeature(),
  UnorderedListFeature(),
  AlignFeature(),
];

export const lexicalEditor = lexicalEditorGenerator({
  features: defaultEditorFeatures,
  lexical: defaultEditorLexicalConfig,
});
