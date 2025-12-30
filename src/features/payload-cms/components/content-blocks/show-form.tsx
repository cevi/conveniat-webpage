import { ClientOnly } from '@/components/client-only';
import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import React from 'react';
import type { FormBlockType } from 'src/features/payload-cms/components/form';
import { FormBlock } from 'src/features/payload-cms/components/form';

export const ShowForm: React.FC<
  FormBlockType & {
    isPreviewMode?: boolean | undefined;
    withBorder?: boolean | undefined;
  }
> = ({ isPreviewMode, withBorder, ...block }) => {
  return (
    <ClientOnly
      fallback={
        <div className="mx-auto h-64 max-w-xl animate-pulse rounded-md border-2 border-gray-200 bg-white p-6"></div>
      }
    >
      <SafeErrorBoundary fallback={<div className="text-red-500">Error loading form</div>}>
        <FormBlock {...block} isPreviewMode={isPreviewMode} withBorder={withBorder} />
      </SafeErrorBoundary>
    </ClientOnly>
  );
};
