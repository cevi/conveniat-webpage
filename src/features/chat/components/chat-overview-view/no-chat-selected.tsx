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

/**
 * What a desktop shows beside the chat list while no chat is open; a phone shows the list.
 *
 * On a phone it stays an empty, invisible box at the top of the screen rather than `hidden`:
 * Next.js scrolls a navigation to the page's own element, never to a layout's, and finds nothing
 * to scroll to in a `display: none` page, so the list would open at the previous page's scroll.
 */
export const NoChatSelected: React.FC<{ locale: Locale }> = ({ locale }) => (
  <div className="invisible absolute top-0 h-0 overflow-hidden xl:visible xl:static xl:flex xl:h-full xl:items-center xl:justify-center xl:overflow-visible">
    <EmptyState
      icon={MessageSquare}
      title={pickChatTitle[locale]}
      description={pickChatDescription[locale]}
    />
  </div>
);
