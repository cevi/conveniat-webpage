import type { RelationshipFieldManyValidation, TextFieldSingleValidation } from 'payload';
import { text } from 'payload/shared';

const titleMinWordCount = 3;
const titleMaxLength = 120;

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

export const photoCarouselMinSelectionValidation: RelationshipFieldManyValidation = (value) => {
  if (value === undefined || value === null || value.length < 5)
    return 'At least 5 images are required';

  return true;
};
