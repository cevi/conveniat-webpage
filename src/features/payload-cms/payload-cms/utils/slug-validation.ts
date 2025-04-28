import { Locale } from '@/types/types';
import type { CollectionSlug, TextFieldSingleValidation } from 'payload';
import { text } from 'payload/shared';

const slugMinLength = 3;
const slugMaxLength = 100;

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
