import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { Locale } from '@/types/types';
import { withSpan } from '@/utils/tracing-helpers';
import type { CollectionSlug, TextFieldSingleValidation } from 'payload';
import { text } from 'payload/shared';

const slugMinLength = 3;
const slugMaxLength = 100;

const checkForbiddenRegexes = (
  value: string,
  locale?: string | null,
): { error: boolean; message: string } => {
  // slug can only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-/]+$/.test(value)) {
    return {
      error: true,
      message: getValidationMessage(locale, {
        en: 'Slug can only contain lowercase letters, numbers, and hyphens',
        de: 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten',
        fr: "Le slug ne peut contenir que des lettres minuscules, des chiffres et des traits d'union",
      }),
    };
  }

  // slug cannot start or end with a hyphen and cannot contain consecutive hyphens
  if (/^-|-$/.test(value)) {
    return {
      error: true,
      message: getValidationMessage(locale, {
        en: 'Slug cannot start or end with a hyphen',
        de: 'Slug darf nicht mit einem Bindestrich beginnen oder enden',
        fr: "Le slug ne peut pas commencer ou se terminer par un trait d'union",
      }),
    };
  }
  if (/--/.test(value)) {
    return {
      error: true,
      message: getValidationMessage(locale, {
        en: 'Slug cannot contain consecutive hyphens',
        de: 'Slug darf keine aufeinanderfolgenden Bindestriche enthalten',
        fr: "Le slug ne peut pas contenir de traits d'union consécutifs",
      }),
    };
  }

  // slug cannot be one of the reserved words
  const reservedWords = [
    'api',
    'admin',
    'app',
    'blog',
    'timeline-preview',
    'forms-preview',
    'serwist',
    'sw.js',
    'sw.js.map',
  ];
  for (const word of reservedWords) {
    if (value.startsWith(word)) {
      return {
        error: true,
        message: getValidationMessage(locale, {
          en: `Slug cannot start with reserved word "${word}"`,
          de: `Slug darf nicht mit dem reservierten Wort "${word}" beginnen`,
          fr: `Le slug ne peut pas commencer par le mot réservé "${word}"`,
        }),
      };
    }
  }

  // if no errors, return a success object
  return { error: false, message: '' };
};

export const slugValidation: TextFieldSingleValidation = async (value, arguments_) => {
  return await withSpan('slugValidation', async () => {
    const localeString = arguments_.req.i18n.language;

    if (value === undefined || value === null) {
      return getValidationMessage(localeString, {
        en: 'Slug is required',
        de: 'Slug ist erforderlich',
        fr: 'Le slug est requis',
      });
    }

    // for landing page we allow empty slug
    if (value === '') return true;

    const forbidden = checkForbiddenRegexes(value, localeString);
    if (forbidden.error) {
      return forbidden.message;
    }

    if (value.length < slugMinLength)
      return getValidationMessage(localeString, {
        en: `Slug must be at least ${slugMinLength} characters long`,
        de: `Slug muss mindestens ${slugMinLength} Zeichen lang sein`,
        fr: `Le slug doit comporter au moins ${slugMinLength} caractères`,
      });

    if (value.length > slugMaxLength)
      return getValidationMessage(localeString, {
        en: `Slug cannot be longer than ${slugMaxLength} characters`,
        de: `Slug darf nicht länger als ${slugMaxLength} Zeichen sein`,
        fr: `Le slug ne peut pas dépasser ${slugMaxLength} caractères`,
      });

    // check if the slug is unique
    const { payload, locale } = arguments_.req;
    const { data, collectionSlug, path } = arguments_;

    if (collectionSlug === 'redirects') {
      return text(value, arguments_); // do not check for uniqueness in redirects
    }

    // rebuild the path of the slug field
    const mergedPath = path
      .map((element) => {
        if (typeof element === 'string') {
          return element;
        }
        if (typeof element === 'number') {
          return `[${element}]`;
        }
        return '';
      })
      .join('.')
      .replaceAll('.[', '[');

    const duplicates = await payload.find({
      collection: collectionSlug as CollectionSlug,
      draft: false,
      locale: locale as Locale,
      where: {
        and: [
          { id: { not_equals: (data as { id: string })['id'] } },
          { [mergedPath]: { equals: value } },
        ],
      },
    });
    if (duplicates.totalDocs > 0) {
      const dups = duplicates.docs
        .map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ele: any) =>
            `${
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              ele?.['internalPageName']
            } (${
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              ele['id']
            })`,
        )
        .join(', ');

      return getValidationMessage(localeString, {
        en: `Slug must be unique, found duplicates in ${dups}!`,
        de: `Slug muss eindeutig sein, Duplikate gefunden in ${dups}!`,
        fr: `Le slug doit être unique, doublons trouvés dans ${dups}!`,
      });
    }

    // use default text validation
    return text(value, arguments_);
  });
};
