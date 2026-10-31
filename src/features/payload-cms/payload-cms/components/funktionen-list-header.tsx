'use client';

import { FunktionenSyncButton } from '@/features/payload-cms/payload-cms/components/funktionen-sync-button';
import { SeedProfilePicturesButton } from '@/features/payload-cms/payload-cms/components/funktionen-sync/seed-profile-pictures-button';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useAuth, useLocale } from '@payloadcms/ui';
import type { LucideIcon } from 'lucide-react';
import { BriefcaseBusiness, QrCode, Tent, Users } from 'lucide-react';
import type React from 'react';

const hintTitle: StaticTranslationString = {
  de: 'Wer im Adressbuch der App steht',
  en: 'Who is in the address book of the app',
  fr: "Qui figure dans le carnet d'adresses de l'application",
};

const whoLabel: StaticTranslationString = { de: 'Wer', en: 'Who', fr: 'Qui' };

const seenByLabel: StaticTranslationString = {
  de: 'Steht im Adressbuch von',
  en: 'In the address book of',
  fr: "Dans le carnet d'adresses de",
};

/** One rule of `getContactFilter`, as a row of the hint. */
interface AddressBookRule {
  icon: LucideIcon;
  who: StaticTranslationString;
  seenBy: StaticTranslationString;
  /** marks the rules that reach every participant, like a granted right on the access overview */
  everyone: boolean;
}

const ADDRESS_BOOK_RULES: AddressBookRule[] = [
  {
    icon: BriefcaseBusiness,
    who: {
      de: 'Wer eine Funktion aus dieser Liste innehat',
      en: 'Whoever holds a function from this list',
      fr: 'Qui occupe une fonction de cette liste',
    },
    seenBy: { de: 'allen', en: 'everyone', fr: 'tout le monde' },
    everyone: true,
  },
  {
    icon: Tent,
    who: { de: 'Die AVP jedes Hofs', en: 'The AVP of every Hof', fr: "L'AVP de chaque Hof" },
    seenBy: { de: 'allen', en: 'everyone', fr: 'tout le monde' },
    everyone: true,
  },
  {
    icon: Users,
    who: { de: 'Alle anderen', en: 'Everyone else', fr: 'Toutes les autres personnes' },
    seenBy: {
      de: 'Personen aus dem gleichen Hof',
      en: 'people of the same Hof',
      fr: 'des personnes du même Hof',
    },
    everyone: false,
  },
  {
    icon: QrCode,
    who: {
      de: 'Wer einen Chat-QR-Code ausgetauscht hat',
      en: 'Whoever exchanged a chat QR code',
      fr: 'Qui a échangé un code QR de chat',
    },
    seenBy: {
      de: 'beiden, gegenseitig',
      en: 'both of them, mutually',
      fr: "l'un et l'autre, mutuellement",
    },
    everyone: false,
  },
];

const hintFootnote: StaticTranslationString = {
  de: 'Nur wer sich schon einmal angemeldet hat. Das Adressbuch legt auch fest, wem man einen neuen Chat schreiben kann. Gilt, solange «Kontaktliste im Chat einschränken» in den App-Funktions-Flags aktiv ist; sonst sehen alle alle.',
  en: 'Only people who have logged in at least once. The address book also decides who someone can start a new chat with. Applies while «Restrict the chat contact list» is on in the App Feature Flags; otherwise everyone sees everyone.',
  fr: "Seulement les personnes qui se sont déjà connectées. Le carnet d'adresses décide aussi avec qui on peut démarrer une nouvelle discussion. Vaut tant que «Restreindre la liste de contacts du chat» est activé dans les indicateurs de fonctionnalités ; sinon, tout le monde voit tout le monde.",
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
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <section className="max-w-3xl flex-1">
        <h2 className="m-0 mb-1 text-xs font-semibold tracking-wide uppercase opacity-60">
          {hintTitle[locale]}
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4 text-left font-semibold">{whoLabel[locale]}</th>
              <th className="px-2 py-2 text-left font-semibold">{seenByLabel[locale]}</th>
            </tr>
          </thead>
          <tbody>
            {ADDRESS_BOOK_RULES.map(({ icon: Icon, who, seenBy, everyone }) => (
              <tr key={who.de} className="border-t border-current/10">
                <td className="py-1.5 pr-4">
                  <span className="inline-flex items-center gap-2">
                    <Icon className="size-4 shrink-0 opacity-60" />
                    {who[locale]}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <span
                    className={cn(
                      'rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
                      everyone
                        ? 'border border-(--theme-success-500) bg-(--theme-success-100)'
                        : 'bg-(--theme-elevation-150)',
                    )}
                  >
                    {seenBy[locale]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 mb-0 text-xs opacity-70">{hintFootnote[locale]}</p>
      </section>

      {mayEdit && (
        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
          <FunktionenSyncButton locale={locale} />
          <SeedProfilePicturesButton locale={locale} />
        </div>
      )}
    </div>
  );
};
