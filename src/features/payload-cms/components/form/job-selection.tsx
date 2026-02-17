'use client';

import type { JobWithQuota } from '@/features/payload-cms/components/form/actions/get-jobs';
import { getJobs } from '@/features/payload-cms/components/form/actions/get-jobs';
import { Required } from '@/features/payload-cms/components/form/required';
import {
  spotLeftText,
  spotsLeftText,
} from '@/features/payload-cms/components/form/static-form-texts';
import type { JobSelectionBlock } from '@/features/payload-cms/components/form/types';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type { Control, FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

interface JobSelectionProperties extends JobSelectionBlock {
  control: Control<FieldValues>;
  errors: FieldErrors<FieldValues>;
  registerAction: UseFormRegister<FieldValues>;
}

export const JobSelection: React.FC<JobSelectionProperties> = (props) => {
  const { control, errors, name, label, required, dateRangeCategory, category } = props;

  const locale = useCurrentLocale(i18nConfig) ?? 'de';

  const { data: jobs, isLoading } = useQuery<JobWithQuota[]>({
    queryKey: ['jobs', dateRangeCategory, category, locale],
    queryFn: async () => {
      const result = await getJobs(dateRangeCategory, locale, category);
      return result;
    },
  });

  // Sort jobs by start date
  const sortedJobs = jobs?.sort((a: JobWithQuota, b: JobWithQuota) => {
    const startA = a.dateRange.startDate;
    const startB = b.dateRange.startDate;
    const dateA = new Date(startA).getTime();
    const dateB = new Date(startB).getTime();
    return dateA - dateB;
  });

  const hasError = errors[name];

  return (
    <div className="mb-4 w-full">
      <div className="flex flex-col gap-2">
        <label className="font-body mb-1 block text-sm font-medium text-gray-500">
          {label}
          {Boolean(required) && <Required />}
        </label>
        {isLoading && (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading jobs...</span>
          </div>
        )}
        <Controller
          control={control}
          name={name}
          rules={{ required: required === true ? 'This field is required' : false }}
          render={({ field: { onChange, value } }) => (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sortedJobs?.map((job: JobWithQuota) => {
                const isSelected = value === job.id;
                const isFull = job.availableQuota !== undefined && job.availableQuota <= 0;
                const isDisabled = isFull && !isSelected;

                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => {
                      if (!isDisabled) {
                        onChange(job.id);
                      }
                    }}
                    disabled={isDisabled}
                    className={cn(
                      'relative flex cursor-pointer flex-col rounded-lg border-2 p-4 text-left transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none',
                      {
                        'border-green-600 bg-green-50 ring-green-600': isSelected && !hasError,
                        'border-red-500 bg-red-50 ring-red-600': isSelected && hasError,
                        'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 focus:ring-green-600':
                          !isSelected && !hasError,
                        'border-red-300 bg-white hover:border-red-400 hover:bg-red-50 focus:ring-red-600':
                          !isSelected && hasError,
                        'cursor-not-allowed opacity-50': isDisabled,
                      },
                    )}
                  >
                    <div className="mb-2 font-semibold text-gray-900">{job.title}</div>
                    <div className="mb-4 text-sm text-gray-500">{job.description}</div>

                    <div className="mt-auto flex w-full items-center justify-between text-xs text-gray-500">
                      <span>
                        {new Date(job.dateRange.startDate).toLocaleDateString(locale)} -{' '}
                        {new Date(job.dateRange.endDate).toLocaleDateString(locale)}
                      </span>
                      {typeof job.availableQuota === 'number' && (
                        <span className={job.availableQuota <= 5 ? 'text-red-600' : ''}>
                          {job.availableQuota}{' '}
                          {job.availableQuota === 1
                            ? spotLeftText[locale as Locale]
                            : spotsLeftText[locale as Locale]}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <div
                        className={cn(
                          'absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm',
                          {
                            'bg-green-600': !hasError,
                            'bg-red-600': hasError,
                          },
                        )}
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        />
        {hasError && <p className="mt-1 text-xs text-red-600">{hasError.message as string}</p>}
      </div>
    </div>
  );
};
