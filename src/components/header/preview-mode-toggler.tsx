'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Handles the change of the preview mode and updates the URL accordingly.
 */
export const PreviewModeToggle: React.FC = () => {
  const searchParameters = useSearchParams();
  const router = useRouter();

  const [isInPreviewMode, setIsInPreviewMode] = useState<string | undefined>();

  useEffect(() => {
    const previewParameter = searchParameters.get('preview');
    setIsInPreviewMode(previewParameter === 'true' ? 'enabled' : 'disabled');
  }, [searchParameters]);

  const handlePreviewModeChange = (value: string): void => {
    const newUrl = new URL(globalThis.location.href);

    if (value === 'enabled') {
      newUrl.searchParams.set('preview', 'true');
      router.push(newUrl.toString());
    } else {
      newUrl.searchParams.delete('preview');
      router.push(newUrl.toString());
    }
  };

  if (isInPreviewMode === undefined) {
    return <></>;
  }

  return (
    <Select defaultValue={isInPreviewMode} onValueChange={handlePreviewModeChange}>
      <SelectTrigger className="flex h-7 items-center border-none bg-gray-900 px-2 text-xs text-gray-100">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[250] bg-gray-900 p-2 text-gray-100">
        <SelectItem className="text-xs" value="enabled">
          Enabled
        </SelectItem>
        <SelectItem className="text-xs" value="disabled">
          Disabled
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
