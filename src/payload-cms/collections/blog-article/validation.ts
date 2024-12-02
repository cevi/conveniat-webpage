import { TextFieldSingleValidation } from 'payload';
import { text } from 'payload/shared';

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

export const slugValidation: TextFieldSingleValidation = (value, arguments_) => {
  if (value === undefined || value === null || value === '') return 'Slug is required';

  // slug can only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(value))
    return 'Slug can only contain lowercase letters, numbers, and hyphens';

  if (value.length < slugMinLength) return `Slug must be at least ${slugMinLength} characters long`;
  if (value.length > slugMaxLength) return 'Slug cannot be longer than ${slugMaxLength} characters';

  // use default text validation
  return text(value, arguments_);
};
