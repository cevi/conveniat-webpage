import React from 'react';

import type { PublishingStatusType } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/type';
import { cva } from 'class-variance-authority';

export const languageStatusClasses = cva(
  'text-sm font-medium me-2 px-2.5 py-0.5 rounded-sm relative group',
  {
    variants: {
      pendingChanges: {
        true: '',
        false: '',
      },
      published: {
        true: 'border-solid border-2',
        false:
          'border-solid border-2 border-gray-200 text-gray-300 dark:border-gray-700 dark:text-gray-700',
      },
    },
    compoundVariants: [
      {
        published: true,
        pendingChanges: true,
        className:
          'border-red-300 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 dark:border-red-500',
      },
      {
        published: true,
        pendingChanges: false,
        className:
          'border-green-300 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 dark:border-green-500',
      },
    ],
    defaultVariants: {
      published: false,
      pendingChanges: false,
    },
  },
);

export const LanguageStatus: React.FC<{
  published: boolean;
  pendingChanges: boolean;
  label: string;
}> = ({ published, pendingChanges, label }) => {
  let tooltip = 'Not published';
  if (pendingChanges) {
    tooltip = 'Published but has unpublished changes';
  } else if (published) {
    tooltip = 'Published and up to date';
  }
  return (
    <span className={languageStatusClasses({ published, pendingChanges })}>
      {label}
      <span className="absolute bottom-full left-1/2 mb-1 w-max -translate-x-1/2 transform rounded-sm bg-gray-700 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {tooltip}
      </span>
    </span>
  );
};

export const PublishingStatusBadges: React.FC<{
  publishingStatus: PublishingStatusType | undefined;
}> = ({ publishingStatus }) => {
  if (publishingStatus === undefined) {
    return <></>;
  }

  return (
    <span>
      {Object.entries(publishingStatus).map(([locale, status]) => (
        <LanguageStatus
          key={locale}
          published={status.published}
          pendingChanges={status.pendingChanges}
          label={locale}
        />
      ))}
    </span>
  );
};

const PublishingStatus: React.FC<{
  cellData?: {
    [locale: string]: {
      published: boolean;
      pendingChanges: boolean;
    };
  };
  data?: {
    publishingStatus: {
      [locale: string]: {
        published: boolean;
        pendingChanges: boolean;
      };
    };
  };
}> = ({ cellData, data }) => {
  let publishingStatus;

  if (cellData !== undefined) {
    publishingStatus = cellData;
  } else if (data !== undefined) {
    publishingStatus = data['publishingStatus'];
  }

  if (publishingStatus === undefined) {
    return <></>;
  }

  return <PublishingStatusBadges publishingStatus={publishingStatus} />;
};

export default PublishingStatus;
