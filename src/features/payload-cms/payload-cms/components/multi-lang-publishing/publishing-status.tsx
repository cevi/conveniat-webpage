'use client';
import type React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PublishingStatusType } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/type';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { useTranslation } from '@payloadcms/ui';
import { cva } from 'class-variance-authority';

export const languageStatusClasses = cva(
  'text-sm font-medium me-2 px-2.5 py-0.5 rounded-sm relative group cursor-default select-none',
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
          'border-green-300 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-500',
      },
    ],
    defaultVariants: {
      published: false,
      pendingChanges: false,
    },
  },
);

const notPublishedTooltip: StaticTranslationString = {
  de: 'Nicht veröffentlicht',
  en: 'Not published',
  fr: 'Non publié',
};

const pendingChangesTooltip: StaticTranslationString = {
  de: 'Veröffentlicht, mit unveröffentlichten Änderungen',
  en: 'Published, with unpublished changes',
  fr: 'Publié, avec des modifications non publiées',
};

const upToDateTooltip: StaticTranslationString = {
  de: 'Veröffentlicht und aktuell',
  en: 'Published and up to date',
  fr: 'Publié et à jour',
};

export const LanguageStatus: React.FC<{
  published: boolean;
  pendingChanges: boolean;
  label: string;
}> = ({ published, pendingChanges, label }) => {
  const { i18n } = useTranslation();
  const locale = resolveAdminLocale(i18n.language);

  // a language that is not live differs from its draft by definition; say only that it is not live
  let tooltip = notPublishedTooltip[locale];
  if (published) {
    tooltip = pendingChanges ? pendingChangesTooltip[locale] : upToDateTooltip[locale];
  }
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className={languageStatusClasses({ published, pendingChanges })}>{label}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="rounded-sm bg-gray-700 px-2 py-1 text-xs text-white">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const PublishingStatusBadges: React.FC<{
  publishingStatus: PublishingStatusType | undefined;
}> = ({ publishingStatus }) => {
  if (publishingStatus === undefined) {
    return <></>;
  }

  return (
    <div className="w-[120px] min-w-[120px]">
      {Object.entries(publishingStatus).map(([locale, status]) => (
        <LanguageStatus
          key={locale}
          published={status.published}
          pendingChanges={status.pendingChanges}
          label={locale}
        />
      ))}
    </div>
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
