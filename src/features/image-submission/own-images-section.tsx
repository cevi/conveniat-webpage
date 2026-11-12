'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import type { OwnSubmittedImage } from '@/features/payload-cms/api/upload-router';
import { uploadErrorTexts } from '@/features/payload-cms/upload-error-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { userErrorMessage } from '@/utils/user-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image as LucideImageIcon } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const sectionTitle: StaticTranslationString = {
  de: 'Meine Bilder',
  en: 'My images',
  fr: 'Mes images',
};

const withdrawLabel: StaticTranslationString = {
  de: 'Zurückziehen',
  en: 'Withdraw',
  fr: 'Retirer',
};

const withdrawTitle: StaticTranslationString = {
  de: 'Bild zurückziehen?',
  en: 'Withdraw this image?',
  fr: 'Retirer cette image ?',
};

const withdrawExplanation: StaticTranslationString = {
  de: 'conveniat27 verwendet das Bild danach nicht mehr. Wo es schon veröffentlicht ist, wird es entfernt. Das lässt sich nicht rückgängig machen; du kannst das Bild aber nochmals einreichen.',
  en: 'conveniat27 will no longer use the image. Where it is already published, it will be removed. This cannot be undone, but you can submit the image again.',
  fr: "conveniat27 n'utilisera plus l'image. Là où elle est déjà publiée, elle sera retirée. Ce n'est pas réversible, mais tu peux soumettre l'image à nouveau.",
};

const cancelLabel: StaticTranslationString = {
  de: 'Abbrechen',
  en: 'Cancel',
  fr: 'Annuler',
};

const dateFormat = (locale: Locale): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(`${locale}-CH`, {
    timeZone: 'Europe/Zurich',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

/** A list restored from yesterday's persisted cache may miss fields this one reads. */
const submittedOn = (image: OwnSubmittedImage, locale: Locale): string => {
  const date = new Date(image.submittedAt);
  return Number.isNaN(date.getTime()) ? '' : dateFormat(locale).format(date);
};

const Thumbnail: React.FC<{ url: string | undefined }> = ({ url }) => (
  <span className="bg-quiet flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px]">
    {url === undefined ? (
      <LucideImageIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element -- served by Payload behind its read access
      <img src={url} alt="" className="h-full w-full object-cover" />
    )}
  </span>
);

/**
 * The images the user has submitted, each with the way to withdraw it. It sits inside the upload
 * form, so its buttons are `type="button"` and never submit it. Shows nothing while
 * there are none, or while they cannot be loaded.
 */
export const OwnImagesSection: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const images = useQuery(trpc.upload.getOwnSubmittedImageList.queryOptions());
  const [toWithdraw, setToWithdraw] = useState<OwnSubmittedImage | undefined>();

  const withdraw = useMutation(
    trpc.upload.withdrawSubmittedImage.mutationOptions({
      onSuccess: async () => {
        setToWithdraw(undefined);
        await queryClient.invalidateQueries(trpc.upload.getOwnSubmittedImageList.queryFilter());
      },
    }),
  );

  const list = Array.isArray(images.data) ? images.data : [];
  if (list.length === 0) return <></>;

  return (
    <section className="space-y-3">
      <SectionLabel className="px-1">{sectionTitle[locale]}</SectionLabel>
      <Card as="ul" divided>
        {list.map((image) => (
          <li key={image.id} className="flex items-center gap-3 py-2.5 pr-2.5 pl-3">
            <Thumbnail url={image.thumbnailUrl} />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[15px] font-semibold text-green-900">
                {image.description}
              </span>
              <span className="block text-[13px] text-green-700">{submittedOn(image, locale)}</span>
            </span>
            <Button
              type="button"
              variant="outlined"
              size="touch"
              className="shrink-0 px-3"
              onClick={() => {
                withdraw.reset();
                setToWithdraw(image);
              }}
            >
              {withdrawLabel[locale]}
            </Button>
          </li>
        ))}
      </Card>

      <BottomSheet
        open={toWithdraw !== undefined}
        onOpenChange={(open) => {
          if (!open) setToWithdraw(undefined);
        }}
        title={withdrawTitle[locale]}
        showClose={false}
        footer={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="quiet"
              size="touch"
              className="flex-1"
              onClick={() => setToWithdraw(undefined)}
            >
              {cancelLabel[locale]}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="touch"
              className="flex-1"
              disabled={withdraw.isPending}
              onClick={() => {
                if (toWithdraw !== undefined) withdraw.mutate({ id: toWithdraw.id });
              }}
            >
              {withdrawLabel[locale]}
            </Button>
          </div>
        }
      >
        {toWithdraw !== undefined && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Thumbnail url={toWithdraw.thumbnailUrl} />
              <span className="line-clamp-2 text-[15px] font-semibold text-green-900">
                {toWithdraw.description}
              </span>
            </div>
            <p className="text-[15px] leading-normal text-green-700">
              {withdrawExplanation[locale]}
            </p>
            {withdraw.error !== null && (
              <p role="alert" className="text-danger-text text-[13px] font-semibold">
                {userErrorMessage(withdraw.error, locale, uploadErrorTexts)}
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </section>
  );
};
