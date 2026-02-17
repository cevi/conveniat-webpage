import { ClientOnly } from '@/components/client-only';
import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { FormBlock } from '@/features/payload-cms/components/form';
import type { ExtendedFormType } from '@/features/payload-cms/components/form/types';
import React from 'react';

// This component is only a wrapper to show the form block
// It is used in the frontend to render the form block

export const ShowForm: React.FC<{
  form: ExtendedFormType;
  blockType?: 'formBlock';
  blockName?: string;
  isPreviewMode?: boolean;
  withBorder?: boolean;
}> = (props) => {
  const { isPreviewMode, withBorder, ...rest } = props;
  return (
    <ClientOnly
      fallback={
        <div className="mx-auto h-64 max-w-xl animate-pulse rounded-md border-2 border-gray-200 bg-white p-6"></div>
      }
    >
      <SafeErrorBoundary fallback={<div className="text-red-500">Error loading form</div>}>
        <FormBlock {...rest} isPreviewMode={!!isPreviewMode} withBorder={withBorder ?? true} />
      </SafeErrorBoundary>
    </ClientOnly>
  );
};
