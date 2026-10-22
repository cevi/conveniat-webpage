'use client';

import { SectionLabel } from '@/components/ui/section-label';
import {
  ContactRowsSkeleton,
  NewChatFrame,
} from '@/features/chat/components/chat-overview-view/contact-row';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

/** The words the screens and their skeletons share, so both say the same while loading. */
export const newChatText = {
  title: { de: 'Neuer Chat', en: 'New chat', fr: 'Nouveau chat' },
  back: { de: 'Zurück zu den Chats', en: 'Back to chats', fr: 'Retour aux discussions' },
  contacts: { de: 'Kontakte', en: 'Contacts', fr: 'Contacts' },
  /** what a contact is found by, see `matchesContactSearch` */
  search: {
    de: 'Name, Ceviname oder Hof',
    en: 'Name, Cevi name or Hof',
    fr: 'Nom, nom Cevi ou Hof',
  },
  groupTitle: { de: 'Neue Gruppe', en: 'New group', fr: 'Nouveau groupe' },
  groupSelected: { de: '{n} ausgewählt', en: '{n} selected', fr: '{n} sélectionné(s)' },
  groupBack: {
    de: 'Zurück zu «Neuer Chat»',
    en: 'Back to “New chat”',
    fr: 'Retour à « Nouveau chat »',
  },
} satisfies Record<string, StaticTranslationString>;

const SearchSkeleton: React.FC = () => (
  <div className="bg-quiet h-[44px] w-full animate-pulse rounded-[12px]" />
);

/** Neuer Chat while it loads: the search, the two actions and the contact rows. */
export const CreateChatSkeleton: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  return (
    <NewChatFrame
      title={newChatText.title[locale]}
      backHref="/app/chat"
      backLabel={newChatText.back[locale]}
      onWhite
      head={<SearchSkeleton />}
    >
      <div aria-hidden="true" className="border-quiet border-b-8 bg-white">
        {[1, 2].map((index) => (
          <div key={index} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <div className="bg-quiet h-[38px] w-[38px] animate-pulse rounded-[10px]" />
            <div className="bg-quiet h-4 w-32 animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="pt-4">
        <SectionLabel className="px-4">{newChatText.contacts[locale]}</SectionLabel>
        <div className="pt-2">
          <ContactRowsSkeleton />
        </div>
      </div>
    </NewChatFrame>
  );
};

/** Neue Gruppe while it loads: the search, the contact rows with their marks, "Weiter". */
export const CreateGroupSkeleton: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  return (
    <NewChatFrame
      title={newChatText.groupTitle[locale]}
      subtitle={newChatText.groupSelected[locale].replace('{n}', '0')}
      backHref="/app/chat/new"
      onWhite
      backLabel={newChatText.groupBack[locale]}
      head={<SearchSkeleton />}
      footer={
        <div className="flex flex-col gap-2" aria-hidden="true">
          <div className="flex h-11 items-center">
            <div className="bg-quiet mx-auto h-[18px] w-56 animate-pulse rounded" />
          </div>
          <div className="bg-quiet h-11 w-full animate-pulse rounded-xl" />
        </div>
      }
    >
      <div className="pt-2">
        <ContactRowsSkeleton withMark />
      </div>
    </NewChatFrame>
  );
};
