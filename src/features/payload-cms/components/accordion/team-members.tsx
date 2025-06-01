import { AvatarPlaceholder } from '@/features/payload-cms/components/accordion/avatar-placeholder';
import { getURLForLinkField } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Image as ImageType, TeamMembersBlock } from '@/features/payload-cms/payload-types';
import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';
import { Fragment } from 'react';

const TeamLeaderPortrait: React.FC<{
  name: string;
  portrait: string | ImageType | null | undefined;
}> = ({ name, portrait }) => {
  let teamLeaderPortrait = <AvatarPlaceholder />;
  if (typeof portrait === 'string') {
    teamLeaderPortrait = (
      <Image
        src={portrait}
        alt={`Portrait of ${name}`}
        width={200}
        height={200}
        className="h-full object-cover transition-transform group-hover:scale-105"
      />
    );
  } else if (typeof portrait === 'object' && portrait?.url !== undefined && portrait.url !== null) {
    teamLeaderPortrait = (
      <Image
        src={portrait.url}
        alt={`Portrait of ${name}`}
        width={200}
        height={200}
        className="h-full object-cover transition-transform group-hover:scale-105"
      />
    );
  }
  return <>{teamLeaderPortrait}</>;
};

const TeamHelpersList: React.FC<{
  teamMembers:
    | {
        name: string;
        ceviname?: string | null;
        function: string;
        id?: string | null;
      }[]
    | null
    | undefined;
}> = ({ teamMembers }) => {
  if (!teamMembers || teamMembers.length === 0) {
    return <></>;
  }

  return (
    <Fragment>
      <hr className="my-6 border border-gray-100" />
      <div className="mt-6">
        <h4 className="mb-2 text-center text-sm font-medium text-gray-900 sm:text-left">Team</h4>
        <ul className="space-y-2">
          {teamMembers.map((helper, index) => (
            <li
              key={index}
              className="flex flex-col items-center text-sm sm:flex-row sm:items-center"
            >
              <div className="mr-2 hidden h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 sm:flex">
                {helper.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div className="flex flex-col text-center sm:flex-row sm:items-center sm:text-left">
                <span className="mr-1 text-gray-800">
                  {helper.name}
                  {helper.ceviname && (
                    <span className="ml-1 text-gray-800">v/o {helper.ceviname}</span>
                  )}
                </span>
                <span className="text-xs text-gray-400 sm:ml-1">({helper.function})</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Fragment>
  );
};

export const TeamLeaderInternal: React.FC<{
  block: TeamMembersBlock;
}> = ({ block }) => {
  const teamLeader = block.teamLeaderGroup;

  return (
    <div>
      <button className="group flex w-full flex-col items-center gap-4 rounded-md px-2 py-4 text-center transition-colors hover:bg-gray-50 md:flex-row md:py-2 md:text-left">
        <div className="relative h-48 w-48 overflow-hidden rounded-full md:h-24 md:w-24">
          {<TeamLeaderPortrait name={teamLeader.name} portrait={teamLeader.portrait} />}
        </div>
        <div>
          <p className="font-medium text-gray-900">{teamLeader.name}</p>
          <p className="text-sm text-gray-500">v/o {teamLeader.ceviname}</p>
        </div>
      </button>
    </div>
  );
};

export const TeamMembers: React.FC<{
  block: TeamMembersBlock;
}> = ({ block }) => {
  const teamMembers = block.teamMembers;
  const linkField = block.linkField;
  const link = getURLForLinkField(linkField) || '';
  return link === '' ? (
    <Fragment>
      <TeamLeaderInternal block={block} />
      <TeamHelpersList teamMembers={teamMembers} />
    </Fragment>
  ) : (
    <Fragment>
      <Link href={link}>
        <TeamLeaderInternal block={block} />
      </Link>
      <TeamHelpersList teamMembers={teamMembers} />
    </Fragment>
  );
};
