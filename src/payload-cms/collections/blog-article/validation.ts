import {
  CollectionSlug,
  RelationshipFieldManyValidation,
  TextFieldSingleValidation,
} from 'payload';
import { text } from 'payload/shared';
import { Locale } from '@/types';

const titleMinWordCount = 3;
const titleMaxLength = 120;
const slugMinLength = 3;
const slugMaxLength = 100;

/**
 * Custom validation for the blog article title field.
 *
 * @param value
 * @param arguments_
 *
 */
export const blogArticleTitleValidation: TextFieldSingleValidation = (value, arguments_) => {
  if (value === undefined || value === null || value === '') return 'Title is required';

  if (value.split(' ').length < titleMinWordCount)
    return `Title must be at least ${titleMinWordCount} words`;

  if (value.length > titleMaxLength)
    return `Title cannot be longer than ${titleMaxLength} characters`;

  // use default text validation
  return text(value, arguments_);
};

export const slugValidation: TextFieldSingleValidation = async (value, arguments_) => {
  if (value === undefined || value === null) return 'Slug is required';

  // for landing page we allow empty slug
  if (value === '') return true;

  // slug can only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(value))
    return 'Slug can only contain lowercase letters, numbers, and hyphens';

  if (value.length < slugMinLength) return `Slug must be at least ${slugMinLength} characters long`;
  if (value.length > slugMaxLength) return 'Slug cannot be longer than ${slugMaxLength} characters';

  // check if the slug is unique
  const { payload, locale } = arguments_.req;
  const { data, collectionSlug } = arguments_;
  const duplicates = await payload.find({
    collection: collectionSlug as CollectionSlug,
    draft: false,
    locale: locale as Locale,
    where: {
      and: [
        { id: { not_equals: (data as { id: string })['id'] } },
        { 'seo.urlSlug': { equals: value } },
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
};

export const photoCarouselMinSelectionValidation: RelationshipFieldManyValidation = (value) => {
  if (value === undefined || value === null || value.length < 4)
    return 'At least 4 images are required';

  return true;
};
