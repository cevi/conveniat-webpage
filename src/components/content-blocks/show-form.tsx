import { FormBlock, FormBlockType } from '@/components/form';
import React from 'react';
import { ClientOnly } from '@/components/form/client-only';

export const ShowForm: React.FC<FormBlockType> = async ({ ...block }) => {
  return (
    <ClientOnly>
      <FormBlock {...block} />
    </ClientOnly>
  );
};
