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

  const cardContent = (
    <div className="group w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs transition-all duration-300 hover:border-gray-300 sm:p-6">
      <div className="mb-3 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
        {label}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
            {renderAvatar()}
          </div>
          <div className="min-w-0">
            <h3 className="font-heading text-conveniat-green mb-0.5 truncate text-base leading-tight font-bold">
              {name}
            </h3>
            <p className="font-body text-xs leading-snug text-gray-500">{description}</p>
          </div>
        </div>

        {url ? (
          <div className="group-hover:bg-conveniat-green group-hover:border-conveniat-green inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-800 transition-colors group-hover:text-white">
            <span>{linkLabel}</span>
            <ArrowRight className="size-3.5" />
          </div>
        ) : undefined}
      </div>
    </div>
  );

  if (url) {
    return (
      <LinkComponent
        href={url}
        openInNewTab={openURLInNewTab(linkField)}
        hideExternalIcon
        className="block no-underline"
      >
        {cardContent}
      </LinkComponent>
    );
  }

  return cardContent;
};
