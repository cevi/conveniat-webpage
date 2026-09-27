import { useCallback, useEffect, useState } from 'react';

export interface StagedImage {
  file: File;
  previewUrl: string;
}

/**
 * An image picked in the composer but not sent yet, with a local preview URL that is
 * released when the image is removed, replaced or the composer unmounts.
 */
export const useStagedImage = (): {
  stagedImage: StagedImage | undefined;
  stageImage: (file: File) => void;
  clearStagedImage: () => void;
} => {
  const [stagedImage, setStagedImage] = useState<StagedImage | undefined>();

  const stageImage = useCallback((file: File): void => {
    setStagedImage({ file, previewUrl: URL.createObjectURL(file) });
  }, []);

  const clearStagedImage = useCallback((): void => {
    setStagedImage(undefined);
  }, []);

  useEffect(() => {
    if (stagedImage === undefined) return;
    return (): void => {
      URL.revokeObjectURL(stagedImage.previewUrl);
    };
  }, [stagedImage]);

  return { stagedImage, stageImage, clearStagedImage };
};
