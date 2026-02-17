import { CeviDatabaseLogin } from '@/features/payload-cms/components/form/cevi-db-login';
import { Checkbox } from '@/features/payload-cms/components/form/checkbox';
import { Country } from '@/features/payload-cms/components/form/country';
import { Date } from '@/features/payload-cms/components/form/date';
import { Email } from '@/features/payload-cms/components/form/email';
import { JobSelection } from '@/features/payload-cms/components/form/job-selection';
import { Message } from '@/features/payload-cms/components/form/message';
import { Number } from '@/features/payload-cms/components/form/number';
import { Select } from '@/features/payload-cms/components/form/select';
import { Text } from '@/features/payload-cms/components/form/text';
import { TextArea } from '@/features/payload-cms/components/form/textarea';
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
  message: Message,
  date: Date,
  ceviDbLogin: CeviDatabaseLogin,
  jobSelection: JobSelection,
};
