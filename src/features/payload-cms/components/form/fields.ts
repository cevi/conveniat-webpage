import type React from 'react';
import { Checkbox } from './checkbox';
import { Country } from './country';
import { Email } from './email';
import { Number } from './number';
import { Select } from './select';
import { Text } from './text';
import { TextArea } from './textarea';

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
