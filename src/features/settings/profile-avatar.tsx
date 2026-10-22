'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { FRAME_EDGE, usePhotoFraming } from '@/features/settings/hooks/use-photo-framing';
import { useProfilePicture } from '@/features/settings/hooks/use-profile-picture';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Camera, Check, Eye, Image, Loader2, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

const labels = {
  sheetTitle: { de: 'Profilbild', en: 'Profile picture', fr: 'Photo de profil' },
  takePhoto: { de: 'Foto aufnehmen', en: 'Take a photo', fr: 'Prendre une photo' },
  choosePhoto: { de: 'Aus Fotos wählen', en: 'Choose from photos', fr: 'Choisir dans les photos' },
  remove: { de: 'Entfernen', en: 'Remove', fr: 'Retirer' },
  avatar: {
    de: 'Profilbild ändern',
    en: 'Change profile picture',
    fr: 'Modifier la photo de profil',
  },
  frameTitle: { de: 'Bildausschnitt wählen', en: 'Frame your photo', fr: 'Cadrer ta photo' },
  frameHelp: {
    de: 'Ziehe das Foto, bis dein Gesicht im Kreis sitzt.',
    en: 'Drag the photo until your face sits in the circle.',
    fr: "Déplace la photo jusqu'à ce que ton visage soit dans le cercle.",
  },
  stage: {
    de: 'Bildausschnitt, mit Ziehen oder den Pfeiltasten verschieben',
    en: 'Photo crop, move it by dragging or with the arrow keys',
    fr: 'Cadrage, à déplacer en glissant ou avec les flèches',
  },
  zoom: { de: 'Zoom', en: 'Zoom', fr: 'Zoom' },
  visibility: {
    de: 'Sichtbar für alle, die in der App angemeldet sind, z. B. im Adressbuch und im Chat.',
    en: 'Visible to everyone logged in to the app, e.g. in the address book and in chats.',
    fr: "Visible pour toutes les personnes connectées à l'application, p. ex. dans le carnet d'adresses et les chats.",
  },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
  save: { de: 'Speichern', en: 'Save', fr: 'Enregistrer' },
  saving: { de: 'Wird gespeichert …', en: 'Saving …', fr: 'Enregistrement …' },
  saved: {
    de: 'Profilbild gespeichert',
    en: 'Profile picture saved',
    fr: 'Photo de profil enregistrée',
  },
  removed: {
    de: 'Profilbild entfernt',
    en: 'Profile picture removed',
    fr: 'Photo de profil retirée',
  },
  confirmRemove: {
    de: 'Profilbild entfernen?',
    en: 'Remove your profile picture?',
    fr: 'Retirer ta photo de profil ?',
  },
  confirmRemoveHelp: {
    de: 'Danach siehst du wieder deine Initialen.',
    en: 'Your initials show again afterwards.',
    fr: 'Tes initiales s’afficheront à nouveau.',
  },
  failed: {
    de: 'Das hat nicht geklappt. Versuche es mit einem anderen Foto oder später nochmals.',
    en: 'That did not work. Try another photo, or again later.',
    fr: "Cela n'a pas fonctionné. Essaie une autre photo ou réessaie plus tard.",
  },
} satisfies Record<string, StaticTranslationString>;

/** how long "gespeichert" stays below the name */
const CONFIRMATION_MS = 4000;

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

type Step = 'closed' | 'choose' | 'framing' | 'confirmRemove';

/** One way to a photo in the sheet: an icon tile and what it does, a full-width row. */
const SourceRow: React.FC<{
  icon: React.ComponentProps<typeof IconTile>['icon'];
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="hover:bg-quiet flex min-h-[56px] w-full cursor-pointer items-center gap-3 px-3.5 py-2 text-left text-[15px] font-semibold text-green-900"
  >
    <IconTile icon={icon} />
    {label}
  </button>
);

/**
 * The header of the user's own profile: their avatar with a camera badge next to `children`.
 * Tapping the avatar opens the "Profilbild" sheet: take a photo, choose one, or remove the
 * current one, which asks first. A chosen photo is framed in the same sheet, the face placed in
 * the circle, before anything leaves the phone.
 */
export const ProfileAvatar: React.FC<{
  userId: string;
  name: string;
  pictureUrl: string | undefined;
  locale: Locale;
  children: React.ReactNode;
}> = ({ userId, name, pictureUrl: initialPictureUrl, locale, children }) => {
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('closed');
  const [chosenFile, setChosenFile] = useState<File>();
  const [confirmation, setConfirmation] = useState<string>();
  const { pictureUrl, isBusy, hasFailed, upload, remove } = useProfilePicture(initialPictureUrl);
  // a photo this browser cannot decode, HEIC outside Safari, goes up as it is
  const framing = usePhotoFraming(chosenFile, (file) => {
    setStep('closed');
    setChosenFile(undefined);
    void upload(file);
  });
  const hasPicture = pictureUrl !== undefined;

  useEffect(() => {
    if (confirmation === undefined) return;
    const timer = setTimeout(() => setConfirmation(undefined), CONFIRMATION_MS);
    return (): void => clearTimeout(timer);
  }, [confirmation]);

  const close = (): void => {
    setStep('closed');
    setChosenFile(undefined);
  };

  const save = async (): Promise<void> => {
    const cropped = await framing.crop();
    if (cropped === undefined) return;
    // a failed upload keeps the framing open, so another try needs no new crop
    if (!(await upload(cropped))) return;
    close();
    setConfirmation(labels.saved[locale]);
  };

  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;
    setChosenFile(file);
    setStep('framing');
  };

  const failedAlert = (
    <p
      role="alert"
      className="bg-danger-soft text-danger-text mt-3 rounded-[14px] p-3 text-[13px] font-medium"
    >
      {labels.failed[locale]}
    </p>
  );

  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            setConfirmation(undefined);
            setStep('choose');
          }}
          disabled={isBusy}
          aria-label={labels.avatar[locale]}
          className="relative block shrink-0 cursor-pointer rounded-full"
        >
          <PersonAvatar
            seed={userId}
            name={name}
            pictureUrl={pictureUrl}
            className="h-16 w-16 text-xl"
          />
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -bottom-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-900 text-white"
          >
            <Camera className="h-3 w-3" />
          </span>
          {isBusy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-green-900/50 text-white">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            </span>
          )}
        </button>
        {children}
      </div>

      <p aria-live="polite" className="m-0 flex items-center gap-1.5 text-[13px] text-green-700">
        {isBusy && step === 'closed' && <span className="mt-2">{labels.saving[locale]}</span>}
        {!isBusy && confirmation !== undefined && (
          <span className="mt-2 flex items-center gap-1.5">
            <Check className="text-conveniat-green h-4 w-4" aria-hidden="true" />
            {confirmation}
          </span>
        )}
      </p>
      {hasFailed && step === 'closed' && failedAlert}

      <input
        ref={cameraInput}
        type="file"
        accept={ACCEPTED_TYPES}
        capture="user"
        className="hidden"
        onChange={onFileChosen}
      />
      <input
        ref={libraryInput}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={onFileChosen}
      />

      <BottomSheet
        open={step !== 'closed'}
        onOpenChange={(open) => {
          if (!open && !isBusy) close();
        }}
        title={step === 'framing' ? labels.frameTitle[locale] : labels.sheetTitle[locale]}
        showClose={false}
      >
        {step === 'choose' && (
          <div className="space-y-3">
            <p className="bg-quiet flex items-start gap-2 rounded-[14px] px-3 py-2.5 text-[13px] leading-[18px] text-green-700">
              <Eye className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
              {labels.visibility[locale]}
            </p>
            <div className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
              <SourceRow
                icon={Camera}
                label={labels.takePhoto[locale]}
                onClick={() => cameraInput.current?.click()}
              />
              <SourceRow
                icon={Image}
                label={labels.choosePhoto[locale]}
                onClick={() => libraryInput.current?.click()}
              />
            </div>
            {hasPicture && (
              <Button
                variant="outlined"
                size="touch"
                className="w-full"
                onClick={() => setStep('confirmRemove')}
              >
                <Trash2 aria-hidden="true" />
                {labels.remove[locale]}
              </Button>
            )}
            <Button variant="outlined" size="touch" className="w-full" onClick={close}>
              {labels.cancel[locale]}
            </Button>
          </div>
        )}

        {step === 'framing' && (
          <section aria-label={labels.frameTitle[locale]}>
            <p className="m-0 mb-3 text-[13px] text-green-700">{labels.frameHelp[locale]}</p>

            <div
              data-framing-stage
              tabIndex={0}
              role="group"
              aria-label={labels.stage[locale]}
              {...framing.stageHandlers}
              className="relative mx-auto cursor-grab touch-none overflow-hidden rounded-[14px] bg-green-900 select-none active:cursor-grabbing"
              style={{ width: FRAME_EDGE, height: FRAME_EDGE }}
            >
              {framing.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local blob, not an asset to optimise
                <img
                  src={framing.photo.src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute top-0 left-0 max-w-none"
                  style={{
                    width:
                      (framing.photo.width / Math.min(framing.photo.width, framing.photo.height)) *
                      FRAME_EDGE *
                      framing.zoom,
                    height:
                      (framing.photo.height / Math.min(framing.photo.width, framing.photo.height)) *
                      FRAME_EDGE *
                      framing.zoom,
                    transform: framing.transform,
                  }}
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-white">
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                </span>
              )}
              {/* the round avatar the square becomes: everything outside it is dimmed */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(38,48,42,0.55)] ring-2 ring-white/80"
              />
            </div>

            <label className="mx-auto mt-3 flex max-w-[256px] items-center gap-2 text-green-700">
              <ZoomOut className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="sr-only">{labels.zoom[locale]}</span>
              <input
                type="range"
                min={1}
                max={framing.maxZoom}
                step={0.01}
                value={framing.zoom}
                onChange={(event) => framing.setZoom(Number(event.target.value))}
                className="accent-conveniat-green h-11 min-w-0 flex-1"
              />
              <ZoomIn className="h-5 w-5 shrink-0" aria-hidden="true" />
            </label>

            {/* next to the button it is about, so a failed save is not read as a saved one */}
            {hasFailed && failedAlert}

            <div className="mt-3 flex gap-2">
              <Button
                variant="outlined"
                size="touch"
                className="flex-1"
                onClick={close}
                disabled={isBusy}
              >
                {labels.cancel[locale]}
              </Button>
              <Button
                variant="primary"
                size="touch"
                className="flex-1"
                onClick={() => void save()}
                disabled={isBusy || !framing.photo}
              >
                {isBusy ? labels.saving[locale] : labels.save[locale]}
              </Button>
            </div>
          </section>
        )}

        {step === 'confirmRemove' && (
          <div>
            <p className="m-0 text-[17px] font-semibold text-green-900">
              {labels.confirmRemove[locale]}
            </p>
            <p className="m-0 mt-1 text-[15px] text-green-700">
              {labels.confirmRemoveHelp[locale]}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outlined"
                size="touch"
                className="flex-1"
                onClick={() => setStep('choose')}
              >
                {labels.cancel[locale]}
              </Button>
              <Button
                variant="danger"
                size="touch"
                className="flex-1"
                disabled={isBusy}
                onClick={() => {
                  close();
                  void remove().then((isRemoved) => {
                    if (isRemoved) setConfirmation(labels.removed[locale]);
                  });
                }}
              >
                <Trash2 aria-hidden="true" />
                {labels.remove[locale]}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
