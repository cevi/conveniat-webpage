import { LinkComponent } from '@/components/ui/link-component';
import { TeamLeaderPortrait } from '@/features/payload-cms/components/accordion/team-members/team-leader-portrait';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Image as ImageType } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { ArrowRight } from 'lucide-react';
import React from 'react';

export interface ContactPersonType {
  label: string;
  name: string;
  description: string;
  portrait?: string | ImageType | null;
  linkLabel: string;
  linkField?: LinkFieldDataType;
  locale: Locale;
}

const getInitials = (personName: string): string => {
  return personName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const ContactPersonBlock: React.FC<ContactPersonType> = ({
  label,
  name,
  description,
  portrait,
  linkLabel,
  linkField,
  locale,
}) => {
  const url = getURLForLinkField(linkField, locale);

  const hasPortrait = portrait !== null && portrait !== undefined;

  const renderAvatar = (): React.ReactNode => {
    if (hasPortrait) {
      return <TeamLeaderPortrait name={name} portrait={portrait} hoverEffect={false} />;
    }
    return (
      <div className="bg-conveniat-green flex size-full items-center justify-center text-xl font-bold tracking-widest text-white">
        {getInitials(name)}
      </div>
    );
  };

  return (
    <div
      className={`w-full rounded-lg border-2 border-gray-200 bg-white p-6 shadow-xs transition-transform duration-300 hover:scale-[1.01] sm:p-8 ${url ? 'group relative cursor-pointer' : ''}`}
    >
      <div className="mb-6 text-xs font-bold tracking-widest text-gray-500 uppercase">{label}</div>
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full">
            {renderAvatar()}
          </div>
          <div>
            <h3 className="font-heading text-conveniat-green mb-1 text-lg leading-tight font-bold">
              {name}
            </h3>
            <p className="font-body text-sm leading-snug text-gray-500">{description}</p>
          </div>
        </div>

        {url && (
          <LinkComponent
            href={url}
            openInNewTab={openURLInNewTab(linkField)}
            hideExternalIcon
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors after:absolute after:inset-0 hover:bg-gray-50 focus:outline-hidden"
          >
            {linkLabel}
            <ArrowRight className="size-4" />
          </LinkComponent>
        )}
      </div>
    </div>
  );
};
