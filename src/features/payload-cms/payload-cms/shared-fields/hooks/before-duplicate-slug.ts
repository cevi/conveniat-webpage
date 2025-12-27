import type { FieldHook } from 'payload';

export const beforeDuplicateSlug: FieldHook = ({ value }) => {
  if (typeof value === 'string') {
    const randomString = Math.random().toString(36).slice(2, 6);
    return `${value}-copy-${randomString}`;
  }

  return value as string;
};
