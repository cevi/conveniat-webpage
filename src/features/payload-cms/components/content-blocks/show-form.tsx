import type { FormBlockType } from 'src/features/payload-cms/components/form';
import { FormBlock } from 'src/features/payload-cms/components/form';
import React from 'react';
import { ClientOnly } from '@/features/payload-cms/components/form/client-only';

export const ShowForm: React.FC<FormBlockType> = async ({ ...block }) => {
  return (
    <ClientOnly>
      <FormBlock {...block} />
    </ClientOnly>
  );
};
