import type React from 'react';
import { Fragment } from 'react';

export const TeamHelpersList: React.FC<{
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
