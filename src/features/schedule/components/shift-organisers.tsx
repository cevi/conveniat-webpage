'use client';

import { ChatLinkButton } from '@/components/ui/buttons/chat-link-button';
import type { HelperShiftOrganiser } from '@/features/schedule/api/get-helper-shifts';
import type { Locale, StaticTranslationString } from '@/types/types';
import { formatUserFullName } from '@/utils/format-user-name';
import { MessageCircle } from 'lucide-react';
import type React from 'react';

const contactOrganisersText: StaticTranslationString = {
  en: 'Contact the organisers',
  de: 'Organisatoren kontaktieren',
  fr: 'Contacter les organisateurs',
};

/**
 * The organisers of a helper shift, with a shortcut into a direct chat with each of them.
 *
 * This is the shift-portal counterpart of the "Organisatoren kontaktieren" block on the
 * workshop detail page. It is laid out tighter because it sits inside a card in a scrolling
 * list rather than on a page of its own.
 */
export const ShiftOrganisers: React.FC<{
  /**
   * Optional against the type of the shift it comes from: the card renders whatever the
   * persisted React Query cache holds, and that blob can have been written by a build that
   * predates this field. With `refetchOnMount: false` and a 24h persist window, a helper who
   * opens the app right after an update renders the old shape for the rest of the session, so
   * reading `.length` off it took the whole helper portal down to the error boundary.
   */
  organisers: HelperShiftOrganiser[] | undefined;
  locale: Locale;
}> = ({ organisers, locale }) => {
  if (organisers === undefined || organisers.length === 0) return <></>;

  return (
    <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
      <h4 className="font-heading flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
        <MessageCircle className="h-3.5 w-3.5" />
        {contactOrganisersText[locale]}
      </h4>
      <div className="space-y-2">
        {organisers.map((organiser) => {
          const displayName = formatUserFullName(organiser.fullName, organiser.nickname);

          return (
            <div
              key={organiser.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-2.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className="bg-conveniat-green font-heading flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs">
                  {organiser.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-body truncate text-sm font-semibold text-gray-900">
                    {displayName}
                  </div>
                  <div className="font-body truncate text-xs text-gray-500">{organiser.email}</div>
                </div>
              </div>
              <div className="shrink-0">
                <ChatLinkButton userId={organiser.id} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
