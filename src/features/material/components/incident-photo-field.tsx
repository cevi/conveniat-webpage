'use client';

import { labels } from '@/features/material/components/material-labels';
import { MaterialButton } from '@/features/material/components/material-ui';
import type { useIncidentPhotoUpload } from '@/features/material/hooks/use-incident-photo-upload';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import type { StaticTranslationString } from '@/types/types';
import { Camera, Loader2, X } from 'lucide-react';
import type React from 'react';
import { toast } from 'sonner';

const text = {
  addPhoto: { de: 'Foto hinzufügen', en: 'Add photo', fr: 'Ajouter une photo' },
  photo: { de: 'Foto', en: 'Photo', fr: 'Photo' },
} satisfies Record<string, StaticTranslationString>;

export const IncidentPhotoField: React.FC<{
  upload: ReturnType<typeof useIncidentPhotoUpload>;
}> = ({ upload }) => {
  const locale = useMaterialLocale();

  if (upload.previewUrl !== undefined) {
    return (
      <div className="relative w-fit">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
        <img src={upload.previewUrl} alt={text.photo[locale]} className="h-28 rounded-lg" />
        <MaterialButton
          variant="secondary"
          className="absolute top-1 right-1 size-11 p-0"
          aria-label={labels.cancel[locale]}
          onClick={upload.clear}
        >
          <X aria-hidden />
        </MaterialButton>
      </div>
    );
  }

  return (
    <label className="flex h-11 w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-400 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50">
      {upload.isUploading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Camera className="size-4" aria-hidden />
      )}
      {text.addPhoto[locale]}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // cleared, so choosing the same photo again after removing it fires a change
          event.target.value = '';
          if (file === undefined) return;
          upload.upload(file).catch(() => toast.error(labels.error[locale]));
        }}
      />
    </label>
  );
};
