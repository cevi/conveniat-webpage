import { filterOptionsOnlyPublished } from '@/features/payload-cms/payload-cms/utils/filter-options-only-published';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type {
  Blog,
  CampMapAnnotation,
  CampScheduleEntry,
  Document,
  GenericPage,
  Image,
} from '@/features/payload-cms/payload-types';
import type { NamedGroupField, TextFieldSingleValidation } from 'payload';

export interface LinkFieldDataType {
  type?: 'reference' | 'custom' | 'email' | null;
  email?: string | null;
  reference?:
    | ({
        relationTo: 'blog';
        value: string | Blog;
      } | null)
    | {
        relationTo: 'generic-page';
        value: string | GenericPage;
      }
    | {
        relationTo: 'images';
        value: string | Image;
      }
    | {
        relationTo: 'documents';
        value: string | Document;
      }
    | {
        relationTo: 'camp-schedule-entry';
        value: string | CampScheduleEntry;
      }
    | {
        relationTo: 'camp-map-annotations';
        value: string | CampMapAnnotation;
      };
  url?: string | null;
  openInNewTab?: boolean | null;
}

const validateEmail: TextFieldSingleValidation = (email, options) => {
  const localeString = options.req.i18n.language;
  if (options.required !== true && (email === undefined || email === null || email.trim() === '')) {
    return true;
  }
  if (email === undefined || email === null || email.trim() === '') {
    return getValidationMessage(localeString, {
      en: 'Email is required',
      de: 'E-Mail ist erforderlich',
      fr: 'Email est requis',
    });
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return getValidationMessage(localeString, {
      en: 'Please enter a valid email address',
      de: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
      fr: 'Veuillez entrer une adresse e-mail valide',
    });
  }
  return true;
};

const validateURL: TextFieldSingleValidation = (url, options) => {
  const localeString = options.req.i18n.language;
  if (options.required !== true && (url === undefined || url === null || url.trim() === '')) {
    return true;
  }
  // Check if the URL is provided
  if (url === undefined || url === null || url.trim() === '') {
    return getValidationMessage(localeString, {
      en: 'URL is required',
      de: 'URL ist erforderlich',
      fr: 'URL est requise',
    });
  }
  // Regular expression to validate a URL, excluding mailto
  const urlPattern =
    /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/;

  // Additional check to avoid 'mailto:' URLs
  if (url.startsWith('mailto:')) {
    return getValidationMessage(localeString, {
      en: 'Mailto URLs are not allowed here. Please select link type "Email" instead.',
      de: 'Mailto-URLs sind hier nicht erlaubt. Bitte wählen Sie stattdessen den Link-Typ "E-Mail".',
      fr: 'Les URL Mailto ne sont pas autorisées ici. Veuillez sélectionner le type de lien "Email" à la place.',
    });
  }

  if (!urlPattern.test(url)) {
    return getValidationMessage(localeString, {
      en: 'Please enter a valid URL',
      de: 'Bitte geben Sie eine gültige URL ein',
      fr: 'Veuillez entrer une URL valide',
    });
  }
  return true; // Valid URL
};

export const LinkField = (required: boolean = true): NamedGroupField => {
  return {
    name: 'linkField',
    type: 'group',
    fields: [
      {
        name: 'type',
        type: 'radio',
        admin: {
          layout: 'horizontal',
        },
        defaultValue: 'reference',
        label: 'To URL Type',
        options: [
          {
            label: 'Internal link',
            value: 'reference',
          },
          {
            label: 'Custom URL',
            value: 'custom',
          },
          {
            label: 'Email',
            value: 'email',
          },
        ],
      },
      {
        name: 'reference',
        type: 'relationship',
        admin: {
          condition: (_, siblingData) => siblingData['type'] === 'reference',
          allowCreate: false,
          allowEdit: false,
          placeholder: 'Select a document or blog post',
        },
        label: 'Document to redirect to',
        relationTo: [
          'blog',
          'generic-page',
          'images',
          'documents',
          'camp-map-annotations',
          'camp-schedule-entry',
        ],
        required: required,
        hasMany: false,
        filterOptions: filterOptionsOnlyPublished,
      },
      {
        name: 'url',
        type: 'text',
        admin: {
          condition: (_, siblingData) => siblingData['type'] === 'custom',
        },
        label: 'Custom URL',
        required: required,
        validate: validateURL,
      },
      {
        name: 'email',
        type: 'text',
        admin: {
          condition: (_, siblingData) => siblingData['type'] === 'email',
        },
        label: 'Email Address',
        required: required,
        validate: validateEmail,
      },
      {
        name: 'openInNewTab',
        type: 'checkbox',
        label: 'Open in new tab',
        defaultValue: false,
        admin: {
          condition: (_, siblingData) => siblingData['type'] === 'custom',
        },
      },
    ],
  };
};
