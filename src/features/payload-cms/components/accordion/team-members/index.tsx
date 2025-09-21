import { LinkComponent } from '@/components/ui/link-component';
import { TeamHelpersList } from '@/features/payload-cms/components/accordion/team-members/team-helpers-list';
import { TeamLeaderPortrait } from '@/features/payload-cms/components/accordion/team-members/team-leader-portrait';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { TeamMembersBlock } from '@/features/payload-cms/payload-types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';
import { Fragment } from 'react';

export const TeamLeaderInternal: React.FC<{
  block: TeamMembersBlock;
  className?: string;
}> = ({ block, className }) => {
  const teamLeader = block.teamLeaderGroup;

  return (
    <div>
      <button
        className={cn(
          'group flex w-full flex-col items-center gap-4 rounded-md px-2 py-4 text-center transition-colors hover:bg-gray-50 md:flex-row md:py-2 md:text-left',
          className,
        )}
      >
        <div className="relative h-48 w-48 overflow-hidden rounded-full md:h-24 md:w-24">
          {<TeamLeaderPortrait name={teamLeader.name} portrait={teamLeader.portrait} hoverEffect />}
        </div>
        <div>
          <p className="font-medium text-gray-900">{teamLeader.name}</p>
          {teamLeader.ceviname !== '' && (
            <p className="text-sm text-gray-500">v/o {teamLeader.ceviname}</p>
          )}
        </div>
      </button>
    </div>
  );
};

export const TeamMembers: React.FC<{
  block: TeamMembersBlock;
}> = async ({ block }) => {
  const teamMembers = block.teamMembers;
  const linkField = block.linkField;
  const locale = await getLocaleFromCookies();
  const link = getURLForLinkField(linkField, locale) ?? '';
  return link === '' ? (
    <Fragment>
      <TeamLeaderInternal block={block} />
      <TeamHelpersList teamMembers={teamMembers} />
    </Fragment>
  ) : (
    <Fragment>
      <LinkComponent href={link} openInNewTab={openURLInNewTab(linkField)}>
        <TeamLeaderInternal block={block} className="cursor-pointer" />
      </LinkComponent>
      <TeamHelpersList teamMembers={teamMembers} />
    </Fragment>
  );
};
