'use client';

import { FunktionenSyncButton } from '@/features/payload-cms/payload-cms/components/funktionen-sync-button';
import { SeedProfilePicturesButton } from '@/features/payload-cms/payload-cms/components/funktionen-sync/seed-profile-pictures-button';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Banner, useAuth, useLocale } from '@payloadcms/ui';
import { BookUser } from 'lucide-react';
import type React from 'react';

const hintTitle: StaticTranslationString = {
  de: 'Wer im Adressbuch der App steht',
  en: 'Who is in the address book of the app',
  fr: "Qui figure dans le carnet d'adresses de l'application",
};

const hintRules: Record<Locale, string[]> = {
  de: [
    'Wer eine Funktion aus dieser Liste innehat: bei allen.',
    'Die AVP jedes Hofs: bei allen.',
    'Alle anderen: nur bei Personen aus dem gleichen Hof und bei denen, mit denen sie einen Chat-QR-Code gescannt haben (gilt in beide Richtungen).',
  ],
  en: [
    'Whoever holds a function from this list: for everyone.',
    'The AVP of every Hof: for everyone.',
    'Everyone else: only for people of the same Hof and for those they scanned a chat QR code with (it works both ways).',
  ],
  fr: [
    'Qui occupe une fonction de cette liste : chez tout le monde.',
    "L'AVP de chaque Hof : chez tout le monde.",
    'Toutes les autres personnes : seulement chez les personnes du même Hof et chez celles avec qui elles ont scanné un code QR de chat (dans les deux sens).',
  ],
};

const hintFootnote: StaticTranslationString = {
  de: 'Nur wer sich schon einmal angemeldet hat. Mit dem Adressbuch ist auch festgelegt, wem man einen neuen Chat schreiben kann. Das gilt, solange «Kontaktliste im Chat einschränken» in den App-Funktions-Flags aktiv ist; sonst sehen alle alle.',
  en: 'Only people who have logged in at least once. The address book also decides who someone can start a new chat with. This applies while «Restrict the chat contact list» is on in the App Feature Flags; otherwise everyone sees everyone.',
  fr: "Seulement les personnes qui se sont déjà connectées. Le carnet d'adresses décide aussi avec qui on peut démarrer une nouvelle discussion. Cela vaut tant que «Restreindre la liste de contacts du chat» est activé dans les indicateurs de fonctionnalités ; sinon, tout le monde voit tout le monde.",
};

/**
 * Rendered above the list of the functions: how a function puts its holders into everyone's
 * address book, which `getContactFilter` decides, and the two Cevi.DB actions for whoever may
 * edit the functions. The endpoints refuse everybody else anyway.
 */
export const FunktionenListHeader: React.FC = () => {
  const locale = resolveAdminLocale(useLocale().code);
  const { permissions } = useAuth();
  const mayEdit = permissions?.collections?.['funktionen']?.update === true;

  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start">
      <Banner
        className="m-0 flex-1"
        alignIcon="left"
        icon={<BookUser className="mr-3 h-5 w-5 shrink-0" />}
      >
        <div className="text-[13px] leading-relaxed">
          <strong className="font-semibold">{hintTitle[locale]}</strong>
          <ul className="my-1 pl-5">
            {hintRules[locale].map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <span className="text-(--theme-elevation-600)">{hintFootnote[locale]}</span>
        </div>
      </Banner>

      {mayEdit && (
        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
          <FunktionenSyncButton locale={locale} />
          <SeedProfilePicturesButton locale={locale} />
        </div>
      )}
    </div>
  );
};
