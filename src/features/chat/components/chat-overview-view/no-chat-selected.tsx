import { EmptyState } from '@/components/ui/empty-state';
import type { Locale, StaticTranslationString } from '@/types/types';
import { MessageSquare } from 'lucide-react';
import type React from 'react';

const pickChatTitle: StaticTranslationString = {
  de: 'Wähle einen Chat',
  en: 'Choose a chat',
  fr: 'Choisis un chat',
};

const pickChatDescription: StaticTranslationString = {
  de: 'Die Unterhaltung öffnet sich hier, die Liste bleibt daneben.',
  en: 'The conversation opens here, next to the list.',
  fr: 'La conversation s’ouvre ici, à côté de la liste.',
};

/** What a desktop shows beside the chat list while no chat is open; a phone shows the list. */
export const NoChatSelected: React.FC<{ locale: Locale }> = ({ locale }) => (
  <div className="hidden h-full items-center justify-center xl:flex">
    <EmptyState
      icon={MessageSquare}
      title={pickChatTitle[locale]}
      description={pickChatDescription[locale]}
    />
  </div>
);
