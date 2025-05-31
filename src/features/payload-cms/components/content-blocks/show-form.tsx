import { ClientOnly } from '@/components/client-only';
import React from 'react';
import type { FormBlockType } from 'src/features/payload-cms/components/form';
import { FormBlock } from 'src/features/payload-cms/components/form';

export const ShowForm: React.FC<FormBlockType> = async ({ ...block }) => {
  return (
    <ClientOnly>
      <FormBlock {...block} />
    </ClientOnly>
  );
};
