'use client';

import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import { flushPersonalData } from '@/lib/flush-personal-data';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Loader2, ShieldOff } from 'lucide-react';
import { signOut } from 'next-auth/react';
import React, { useState } from 'react';

const blockedTitle: StaticTranslationString = {
  de: 'Dein Zugang wurde gesperrt',
  en: 'Your access has been blocked',
  fr: 'Votre accès a été bloqué',
};

const blockedDescription: StaticTranslationString = {
  de: 'Dein Konto wurde vom conveniat27-Team gesperrt. Du kannst die App aktuell nicht verwenden – Chat, Anmeldungen und weitere Funktionen stehen dir nicht zur Verfügung.',
  en: 'Your account has been blocked by the conveniat27 team. You cannot use the app at the moment – chat, enrollments and other features are unavailable.',
  fr: "Votre compte a été bloqué par l'équipe conveniat27. Vous ne pouvez pas utiliser l'application pour le moment – le chat, les inscriptions et les autres fonctionnalités ne sont pas disponibles.",
};

const contactHint: StaticTranslationString = {
  de: 'Wenn du denkst, dass dies ein Fehler ist, melde dich bitte beim conveniat27-Team.',
  en: 'If you believe this is a mistake, please get in touch with the conveniat27 team.',
  fr: "Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'équipe conveniat27.",
};

const logoutText: StaticTranslationString = {
  de: 'Abmelden',
  en: 'Log out',
  fr: 'Déconnexion',
};

const loggingOutText: StaticTranslationString = {
  de: 'Abmelden...',
  en: 'Logging out...',
  fr: 'Déconnexion...',
};

/**
 * Full-screen notice shown instead of the app whenever the logged-in user has been
 * blocked by an administrator.
 */
export const BlockedUserScreen: React.FC<{ locale: Locale }> = ({ locale }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  return (
    <section className="container mx-auto mt-8 px-4 py-6 sm:px-6 md:px-8">
      <article className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <ShieldOff className="h-8 w-8 text-red-700" aria-hidden="true" />
        </div>

        <HeadlineH1>{blockedTitle[locale]}</HeadlineH1>
        <TeaserText>{blockedDescription[locale]}</TeaserText>

        <p className="mt-4 text-sm text-gray-500">{contactHint[locale]}</p>

        <button
          type="button"
          disabled={isLoggingOut}
          onClick={() => {
            setIsLoggingOut(true);
            flushPersonalData();
            signOut({ redirect: true, redirectTo: '/' }).catch((error: unknown) => {
              console.error(error);
              setIsLoggingOut(false);
            });
          }}
          className="font-heading mt-10 w-full cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoggingOut ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {loggingOutText[locale]}
            </span>
          ) : (
            logoutText[locale]
          )}
        </button>
      </article>
    </section>
  );
};
