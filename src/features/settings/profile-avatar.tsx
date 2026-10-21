'use client';

import { Button } from '@/components/ui/buttons/button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SectionLabel } from '@/components/ui/section-label';
import { FRAME_EDGE, usePhotoFraming } from '@/features/settings/hooks/use-photo-framing';
import { useProfilePicture } from '@/features/settings/hooks/use-profile-picture';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Camera, Check, Loader2, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

const labels = {
  change: { de: 'Foto ändern', en: 'Change photo', fr: 'Changer la photo' },
  add: { de: 'Foto hinzufügen', en: 'Add a photo', fr: 'Ajouter une photo' },
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
    de: 'Dein Profilbild sehen alle, die in der App angemeldet sind, z.B. im Adressbuch und im Chat.',
    en: 'Everyone logged in to the app sees your profile picture, e.g. in the address book and in chats.',
    fr: "Toutes les personnes connectées à l'application voient ta photo de profil, p. ex. dans le carnet d'adresses et les chats.",
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

/** how long "gespeichert" stays before the row goes back to its buttons */
const CONFIRMATION_MS = 4000;

type Step = 'idle' | 'framing' | 'confirmRemove';

/**
 * The header of the user's own profile: their avatar next to `children`, and below it the way
 * to change it. Choosing a photo opens a framing step in place, where the face is placed in the
 * circle before anything leaves the phone; removing asks first. Nothing floats over the page.
 */
export const ProfileAvatar: React.FC<{
  userId: string;
  name: string;
  pictureUrl: string | undefined;
  locale: Locale;
  children: React.ReactNode;
}> = ({ userId, name, pictureUrl: initialPictureUrl, locale, children }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const [chosenFile, setChosenFile] = useState<File>();
  const [confirmation, setConfirmation] = useState<string>();
  const { pictureUrl, isBusy, hasFailed, upload, remove } = useProfilePicture(initialPictureUrl);
  // a photo this browser cannot decode, HEIC outside Safari, goes up as it is
  const framing = usePhotoFraming(chosenFile, (file) => {
    setStep('idle');
    setChosenFile(undefined);
    void upload(file);
  });
  const hasPicture = pictureUrl !== undefined;

  useEffect(() => {
    if (confirmation === undefined) return;
    const timer = setTimeout(() => setConfirmation(undefined), CONFIRMATION_MS);
    return (): void => clearTimeout(timer);
  }, [confirmation]);

  const pickPhoto = (): void => {
    setConfirmation(undefined);
    fileInput.current?.click();
  };

  const save = async (): Promise<void> => {
    const cropped = await framing.crop();
    if (cropped === undefined) return;
    // a failed upload keeps the framing open, so another try needs no new crop
    if (!(await upload(cropped))) return;
    setStep('idle');
    setChosenFile(undefined);
    setConfirmation(labels.saved[locale]);
  };

  const failedAlert = (
    <p
      role="alert"
      className="bg-live-soft text-live-text mt-4 rounded-[14px] p-3 text-[13px] font-medium"
    >
      {labels.failed[locale]}
    </p>
  );

  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={pickPhoto}
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
          {isBusy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-green-900/50 text-white">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            </span>
          )}
        </button>
        {children}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file === undefined) return;
          setChosenFile(file);
          setStep('framing');
        }}
      />

      {step === 'idle' && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="quiet" size="touch" onClick={pickPhoto} disabled={isBusy}>
            <Camera aria-hidden="true" />
            {hasPicture ? labels.change[locale] : labels.add[locale]}
          </Button>
          {hasPicture && (
            <Button
              variant="outlined"
              size="touch"
              onClick={() => {
                setConfirmation(undefined);
                setStep('confirmRemove');
              }}
              disabled={isBusy}
            >
              <Trash2 aria-hidden="true" />
              {labels.remove[locale]}
            </Button>
          )}
          <p
            aria-live="polite"
            className="m-0 flex items-center gap-1.5 text-[13px] text-green-700"
          >
            {isBusy && labels.saving[locale]}
            {!isBusy && confirmation !== undefined && (
              <>
                <Check className="text-conveniat-green h-4 w-4" aria-hidden="true" />
                {confirmation}
              </>
            )}
          </p>
        </div>
      )}

      {step === 'framing' && (
        <section className="bg-quiet mt-4 rounded-[14px] p-4" aria-labelledby="photo-framing-title">
          <SectionLabel>
            <span id="photo-framing-title">{labels.frameTitle[locale]}</span>
          </SectionLabel>
          <p className="mt-1 mb-3 text-[13px] text-green-700">{labels.frameHelp[locale]}</p>

          <div
            data-framing-stage
            tabIndex={0}
            role="group"
            aria-label={labels.stage[locale]}
            {...framing.stageHandlers}
            className="focus-visible:ring-conveniat-green relative mx-auto cursor-grab touch-none overflow-hidden rounded-[14px] bg-green-900 select-none focus-visible:ring-2 focus-visible:outline-hidden active:cursor-grabbing"
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

          <p className="mt-2 text-[13px] leading-relaxed text-green-700">
            {labels.visibility[locale]}
          </p>

          {/* next to the button it is about, so a failed save is not read as a saved one */}
          {hasFailed && failedAlert}

          <div className="mt-3 flex gap-2">
            <Button
              variant="outlined"
              size="touch"
              className="flex-1"
              onClick={() => {
                setStep('idle');
                setChosenFile(undefined);
              }}
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
        <section className="bg-quiet mt-4 rounded-[14px] p-4">
          <p className="m-0 text-[15px] font-semibold text-green-900">
            {labels.confirmRemove[locale]}
          </p>
          <p className="m-0 mt-0.5 text-[13px] text-green-700">
            {labels.confirmRemoveHelp[locale]}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outlined"
              size="touch"
              className="flex-1"
              onClick={() => setStep('idle')}
            >
              {labels.cancel[locale]}
            </Button>
            <Button
              variant="outlined"
              size="touch"
              className="flex-1"
              disabled={isBusy}
              onClick={() => {
                setStep('idle');
                void remove().then((isRemoved) => {
                  if (isRemoved) setConfirmation(labels.removed[locale]);
                });
              }}
            >
              <Trash2 aria-hidden="true" />
              {labels.remove[locale]}
            </Button>
          </div>
        </section>
      )}

      {hasFailed && step !== 'framing' && failedAlert}
    </div>
  );
};
