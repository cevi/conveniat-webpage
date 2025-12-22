import type { FieldHook } from 'payload';

export const beforeDuplicateAddCopySuffix: FieldHook = ({ value }) => {
  if (typeof value === 'string') {
    return `${value} (copy)`;
  }

  return value as string;
};
