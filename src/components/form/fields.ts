import { Text } from './text';
import { Email } from './email';
import { Checkbox } from './checkbox';
import { Country } from './country';
import { Number } from './number';
import { Select } from './select';
import { TextArea } from './textarea';
import type React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fields: Record<string, React.FC<any>> = {
  text: Text,
  email: Email,
  checkbox: Checkbox,
  country: Country,
  number: Number,
  select: Select,
  textarea: TextArea,
};
