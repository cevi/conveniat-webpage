import { ClientOnly } from '@/components/client-only';
import React from 'react';
import type { FormBlockType } from 'src/features/payload-cms/components/form';
import { FormBlock } from 'src/features/payload-cms/components/form';

export const ShowForm: React.FC<FormBlockType> = async ({ ...block }) => {
  return (
    <ClientOnly
      fallback={
        <div className="mx-auto h-64 max-w-xl animate-pulse rounded-md border-2 border-gray-200 bg-white p-6"></div>
      }
    >
      <FormBlock {...block} />
    </ClientOnly>
  );
};
