'use client';

import type { ProfilePictureSeedResult } from '@/features/payload-cms/payload-cms/utils/seed-profile-pictures';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Button } from '@payloadcms/ui';
import { ImageDown, RefreshCw } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const SEED_ENDPOINT = '/api/funktionen/seed-profile-pictures';

const title: StaticTranslationString = {
  de: 'Profilbilder der Leitungen aus Cevi.DB übernehmen',
  en: 'Take the leaders’ profile pictures from Cevi.DB',
  fr: 'Reprendre les photos de profil des responsables depuis Cevi.DB',
};

const description: StaticTranslationString = {
  de: 'Einmalig: Wer eine Funktion innehat und in der App noch kein Profilbild hat, erhält sein Bild aus der Cevi.DB. Ein eigenes Bild wird nie überschrieben. Wer sich noch nie angemeldet hat, geht leer aus.',
  en: 'Once: everyone who holds a function and has no profile picture in the app yet gets their picture from Cevi.DB. A picture of their own is never overwritten. People who never logged in are left out.',
  fr: "Une fois : chaque personne qui occupe une fonction et n'a pas encore de photo de profil dans l'application reçoit sa photo de Cevi.DB. Une photo propre n'est jamais écrasée. Les personnes qui ne se sont jamais connectées sont ignorées.",
};

const startLabel: StaticTranslationString = {
  de: 'Profilbilder übernehmen',
  en: 'Take the profile pictures',
  fr: 'Reprendre les photos de profil',
};

const genericError: StaticTranslationString = {
  de: 'Verbindung zur Cevi.DB fehlgeschlagen. Kein Profilbild wurde geändert.',
  en: 'Could not connect to Cevi.DB. No profile picture was changed.',
  fr: "Échec de la connexion à Cevi.DB. Aucune photo de profil n'a été modifiée.",
};

const summaryOf = (locale: Locale, result: ProfilePictureSeedResult): string => {
  const { holders, seeded, kept, withoutPicture, withoutUser, failed } = result;
  if (locale === 'en') {
    return `${String(holders)} leaders: ${String(seeded)} got their picture, ${String(kept)} already had one, ${String(withoutPicture)} have none in Cevi.DB, ${String(withoutUser)} never logged in, ${String(failed)} failed.`;
  }
  if (locale === 'fr') {
    return `${String(holders)} responsables : ${String(seeded)} ont reçu leur photo, ${String(kept)} en avaient déjà une, ${String(withoutPicture)} n'en ont pas dans Cevi.DB, ${String(withoutUser)} ne se sont jamais connectés, ${String(failed)} échecs.`;
  }
  return `${String(holders)} Leitende: ${String(seeded)} haben ihr Bild erhalten, ${String(kept)} hatten schon eines, ${String(withoutPicture)} haben keines in der Cevi.DB, ${String(withoutUser)} waren noch nie angemeldet, ${String(failed)} fehlgeschlagen.`;
};

/** Starts the one-time seed of the leaders' profile pictures and says what it did. */
export const SeedProfilePicturesButton: React.FC<{ locale: Locale }> = ({ locale }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ProfilePictureSeedResult | undefined>();
  const [error, setError] = useState<string | undefined>();

  const start = async (): Promise<void> => {
    setIsRunning(true);
    setResult(undefined);
    setError(undefined);
    try {
      const response = await fetch(SEED_ENDPOINT, { method: 'POST' });
      const body = (await response.json().catch(() => ({}))) as
        ProfilePictureSeedResult | { error?: string };
      if (!response.ok || !('holders' in body)) {
        setError(('error' in body ? body.error : undefined) ?? genericError[locale]);
        return;
      }
      setResult(body);
    } catch {
      setError(genericError[locale]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="mt-5 border-t border-(--theme-elevation-150) pt-4">
      <h4 className="m-0 mb-2 text-[15px] font-semibold text-(--theme-elevation-900)">
        {title[locale]}
      </h4>
      <p className="m-0 mb-4 text-[13px] leading-relaxed text-balance text-(--theme-elevation-600)">
        {description[locale]}
      </p>
      <Button
        buttonStyle="secondary"
        size="medium"
        margin={false}
        disabled={isRunning}
        icon={
          isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <ImageDown className="h-4 w-4" />
          )
        }
        iconPosition="left"
        onClick={() => void start()}
      >
        {startLabel[locale]}
      </Button>
      {result !== undefined && (
        <p className="mt-3 mb-0 text-[13px] text-(--theme-elevation-700)">
          {summaryOf(locale, result)}
        </p>
      )}
      {error !== undefined && (
        <p className="mt-3 mb-0 text-[13px] text-(--theme-error-600)">{error}</p>
      )}
    </div>
  );
};
