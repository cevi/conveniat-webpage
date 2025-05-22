import { AvatarPlaceholder } from '@/features/payload-cms/components/accordion/avatar-placeholder';
import type { Image as ImageType, TeamMembersBlock } from '@/features/payload-cms/payload-types';
import Image from 'next/image';
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
        className="object-cover h-full group-hover:scale-105 transition-transform"
      />
    );
  } else if (typeof portrait === 'object' && portrait?.url !== undefined && portrait.url !== null) {
    teamLeaderPortrait = (
      <Image
        src={portrait.url}
        alt={`Portrait of ${name}`}
        width={200}
        height={200}
        className="object-cover h-full group-hover:scale-105 transition-transform"
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
        <h4 className="text-sm font-medium text-gray-900 mb-2 text-center sm:text-left">Team</h4>
        <ul className="space-y-2">
          {teamMembers.map((helper, index) => (
            <li
              key={index}
              className="flex items-center text-sm flex-col sm:flex-row sm:items-center"
            >
              <div className="hidden sm:flex h-6 w-6 rounded-full bg-gray-100 items-center justify-center text-gray-500 text-xs mr-2">
                {helper.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center text-center sm:text-left">
                <span className="text-gray-800 mr-1">
                  {helper.name}
                  {helper.ceviname && (
                    <span className="text-gray-800 ml-1">v/o {helper.ceviname}</span>
                  )}
                </span>
                <span className="text-gray-400 text-xs sm:ml-1">({helper.function})</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Fragment>
  );
};
export const TeamMembers: React.FC<{
  block: TeamMembersBlock;
}> = ({ block }) => {
  const teamLeader = block.teamLeaderGroup;
  const teamMembers = block.teamMembers;

  return (
    <Fragment>
      <div>
        <div>
          <button className="flex items-center group w-full flex-col md:flex-row text-center md:text-left hover:bg-gray-50 py-4 px-2 md:py-2 rounded-md transition-colors gap-4">
            <div className="h-48 w-48 md:h-24 md:w-24 relative overflow-hidden rounded-full">
              {<TeamLeaderPortrait name={teamLeader.name} portrait={teamLeader.portrait} />}
            </div>
            <div>
              <p className="font-medium text-gray-900">{teamLeader.name}</p>
              <p className="text-sm text-gray-500">v/o {teamLeader.ceviname}</p>
            </div>
          </button>
        </div>

        <TeamHelpersList teamMembers={teamMembers} />
      </div>
    </Fragment>
  );
};
