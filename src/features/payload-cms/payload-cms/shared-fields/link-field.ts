import { filterOptionsOnlyPublished } from '@/features/payload-cms/payload-cms/utils/filter-options-only-published';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type {
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
    | null
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
  fragment?: string | null;
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

/**
 * The placeholder of the link target, in the language of the admin panel. Payload types it as a
 * string or a function, but a function cannot reach the browser, and the select it ends up in
 * translates an object per language (`getTranslation` in `@payloadcms/ui`'s `ReactSelect`).
 */
const referencePlaceholder = {
  en: 'Select a page, image or document',
  de: 'Seite, Bild oder Dokument wählen',
  fr: 'Choisir une page, un article, une image ou un document',
} as Record<string, string> as unknown as string;

export const LinkField = (required: boolean = true): NamedGroupField => {
  return {
    name: 'linkField',
    type: 'group',
    label: { en: 'Link', de: 'Link', fr: 'Lien' },
    fields: [
      {
        name: 'type',
        type: 'radio',
        admin: {
          layout: 'horizontal',
        },
        defaultValue: 'reference',
        label: { en: 'Link type', de: 'Art des Links', fr: 'Type de lien' },
        options: [
          {
            label: { en: 'Internal link', de: 'Interner Link', fr: 'Lien interne' },
            value: 'reference',
          },
          {
            label: { en: 'Custom URL', de: 'Eigene URL', fr: 'URL personnalisée' },
            value: 'custom',
          },
          {
            label: { en: 'Email', de: 'E-Mail', fr: 'E-mail' },
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
          // Payload's list in a drawer: one collection at a time, with search and filters, instead
          // of one long dropdown mixing pages, images and documents
          appearance: 'drawer',
          placeholder: referencePlaceholder,
        },
        label: { en: 'Link target', de: 'Linkziel', fr: 'Cible du lien' },
        // the drawer opens on the first collection: pages are what most links point to
        relationTo: [
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
        name: 'fragment',
        type: 'text',
        admin: {
          condition: (_, siblingData): boolean => {
            if (siblingData['type'] !== 'reference') {
              return false;
            }
            const reference = siblingData['reference'] as { relationTo?: string } | undefined;
            const relationTo = reference?.relationTo;
            return !relationTo || relationTo === 'generic-page';
          },
          description: {
            de: 'Optionale Sprungmarke / Anker (z. B. "projektleitung" für den Akkordeon-Block)',
            en: 'Optional fragment / anchor (e.g. "projektleitung" for accordion block)',
            fr: 'Ancre / fragment optionnel (par ex. "projektleitung" pour le bloc accordéon)',
          },
        },
        label: {
          de: 'Anker / Fragment',
          en: 'Anchor / Fragment',
          fr: 'Ancre / Fragment',
        },
      },
      {
        name: 'url',
        type: 'text',
        admin: {
          condition: (_, siblingData) => siblingData['type'] === 'custom',
        },
        label: { en: 'Custom URL', de: 'Eigene URL', fr: 'URL personnalisée' },
        required: required,
        validate: validateURL,
      },
      {
        name: 'email',
        type: 'text',
        admin: {
          condition: (_, siblingData) => siblingData['type'] === 'email',
        },
        label: { en: 'Email address', de: 'E-Mail-Adresse', fr: 'Adresse e-mail' },
        required: required,
        validate: validateEmail,
      },
      {
        name: 'openInNewTab',
        type: 'checkbox',
        label: {
          en: 'Open in new tab',
          de: 'In neuem Tab öffnen',
          fr: 'Ouvrir dans un nouvel onglet',
        },
        defaultValue: false,
        admin: {
          condition: (_, siblingData) => siblingData['type'] === 'custom',
        },
      },
    ],
  };
};
