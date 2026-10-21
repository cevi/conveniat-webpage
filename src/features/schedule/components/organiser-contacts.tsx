'use client';

import { ChatLinkButton } from '@/components/ui/buttons/chat-link-button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SectionLabel } from '@/components/ui/section-label';
import type { HelperShiftOrganiser } from '@/features/schedule/api/get-helper-shifts';
import type { Locale, StaticTranslationString } from '@/types/types';
import { formatUserFullName } from '@/utils/format-user-name';
import type React from 'react';

const contactOrganisersText: StaticTranslationString = {
  en: 'Contact the organisers',
  de: 'Organisatoren kontaktieren',
  fr: 'Contacter les organisateurs',
};

/**
 * The organisers of a block or a helper shift, one row each with a shortcut into a direct chat:
 * a section of the block's and of the shift's page.
 */
export const OrganiserContacts: React.FC<{
  /**
   * Optional against the type of the shift it comes from: the card renders whatever the
   * persisted React Query cache holds, and that blob can have been written by a build that
   * predates this field. A helper who opens the app right after an update renders the old
   * shape until the refetch lands, and for as long as they stay offline, so reading `.length`
   * off it took the whole helper portal down to the error boundary.
   */
  organisers: HelperShiftOrganiser[] | undefined;
  locale: Locale;
}> = ({ organisers, locale }) => {
  if (organisers === undefined || organisers.length === 0) return <></>;

  return (
    <section>
      <SectionLabel>{contactOrganisersText[locale]}</SectionLabel>
      <ul className="border-line divide-line mt-2 divide-y overflow-hidden rounded-[14px] border bg-white">
        {organisers.map((organiser) => {
          const displayName = formatUserFullName(organiser.fullName, organiser.nickname);

          return (
            <li key={organiser.id} className="flex min-h-[60px] items-center gap-3 px-3.5 py-2.5">
              <PersonAvatar
                seed={organiser.id}
                name={organiser.fullName}
                className="h-[38px] w-[38px] text-xs font-bold"
              />
              {/*
                The name carries the Ceviname, which is how helpers know each other; the address
                underneath was a second line of small text nobody types into anything - reaching
                this person is what the button next to it is for.
              */}
              <div className="min-w-0 flex-1 text-[15px] leading-5 font-semibold break-words text-green-900">
                {displayName}
              </div>
              {/* at least 44px high, like every other control on the page */}
              <ChatLinkButton
                userId={organiser.id}
                className="border-rail hover:bg-quiet h-11 shrink-0 rounded-xl bg-white px-4 text-[15px] font-semibold text-green-900 shadow-none hover:text-green-900"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
};
