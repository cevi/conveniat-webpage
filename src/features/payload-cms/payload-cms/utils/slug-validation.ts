import type { Locale } from '@/types/types';
import { withSpan } from '@/utils/tracing-helpers';
import type { CollectionSlug, TextFieldSingleValidation } from 'payload';
import { text } from 'payload/shared';

const slugMinLength = 3;
const slugMaxLength = 100;

const checkForbiddenRegexes = (value: string): { error: boolean; message: string } => {
  // slug can only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-/]+$/.test(value)) {
    return {
      error: true,
      message: 'Slug can only contain lowercase letters, numbers, and hyphens',
    };
  }

  // slug cannot start or end with a hyphen and cannot contain consecutive hyphens
  if (/^-|-$/.test(value)) {
    return { error: true, message: 'Slug cannot start or end with a hyphen' };
  }
  if (/--/.test(value)) {
    return { error: true, message: 'Slug cannot contain consecutive hyphens' };
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
      return { error: true, message: `Slug cannot start with reserved word "${word}"` };
    }
  }

  // if no errors, return a success object
  return { error: false, message: '' };
};

export const slugValidation: TextFieldSingleValidation = async (value, arguments_) => {
  return await withSpan('slugValidation', async () => {
    if (value === undefined || value === null) return 'Slug is required';

    // for landing page we allow empty slug
    if (value === '') return true;

    const forbidden = checkForbiddenRegexes(value);
    if (forbidden.error) {
      return forbidden.message;
    }

    if (value.length < slugMinLength)
      return `Slug must be at least ${slugMinLength} characters long`;
    if (value.length > slugMaxLength)
      return 'Slug cannot be longer than ${slugMaxLength} characters';

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
      return `Slug must be unique, found duplicates in ${duplicates.docs

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
        .join(', ')}!`;
    }

    // use default text validation
    return text(value, arguments_);
  });
};
