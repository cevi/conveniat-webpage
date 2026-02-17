'use client';

import type { JobWithQuota } from '@/features/payload-cms/components/form/actions/get-jobs';
import { getJobs } from '@/features/payload-cms/components/form/actions/get-jobs';
import { Required } from '@/features/payload-cms/components/form/required';
import type { JobSelectionBlock } from '@/features/payload-cms/components/form/types';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, SearchX } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Control, FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

// Context to share search/filter state between sidebar and main cards
interface JobSelectionContextType {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  selectedRessorts: Set<string>;
  setSelectedRessorts: (s: Set<string>) => void;
}

const JobSelectionContext = createContext<JobSelectionContextType | undefined>(undefined);

export const JobSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRessorts, setSelectedRessorts] = useState<Set<string>>(new Set());

  const value = useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      selectedRessorts,
      setSelectedRessorts,
    }),
    [searchTerm, selectedRessorts],
  );

  return <JobSelectionContext.Provider value={value}>{children}</JobSelectionContext.Provider>;
};

const useJobSelection = (): JobSelectionContextType => {
  const context = useContext(JobSelectionContext);
  if (!context) {
    throw new Error('useJobSelection must be used within a JobSelectionProvider');
  }
  return context;
};

interface JobSelectionProperties extends JobSelectionBlock {
  control: Control<FieldValues>;
  errors: FieldErrors<FieldValues>;
  registerAction: UseFormRegister<FieldValues>;
  renderMode?: 'all' | 'sidebar' | 'main';
}

const RESSORT_OPTIONS = [
  { label: 'Ressort Infrastruktur', value: 'infrastruktur' },
  { label: 'Ressort Finanzen', value: 'finanzen' },
  { label: 'Ressort Programm', value: 'programm' },
  { label: 'Ressort Kommunikation und Marketing', value: 'marketing' },
  { label: 'Ressort Verpflegung', value: 'verpflegung' },
  { label: 'Ressort Relations', value: 'relations' },
  { label: 'Ressort Logistik', value: 'logistik' },
  { label: 'Ressort Sicherheit', value: 'sicherheit' },
  { label: 'Ressort Admin', value: 'admin' },
  { label: 'Ressort Sponsoing, Fundraising und Interactions', value: 'sponsoring' },
  { label: 'Ressort International', value: 'international' },
  { label: 'Ressort Glaube', value: 'glaube' },
];

export const JobSelection: React.FC<JobSelectionProperties> = (props) => {
  const { control, name, label, required, dateRangeCategory, category, renderMode = 'all' } = props;

  const locale = (useCurrentLocale(i18nConfig) ?? 'de') as Locale;
  const { searchTerm, setSearchTerm, selectedRessorts, setSelectedRessorts } = useJobSelection();

  const { data: jobs, isLoading } = useQuery<JobWithQuota[]>({
    queryKey: ['jobs', dateRangeCategory, category, locale],
    queryFn: async () => {
      const result = await getJobs(dateRangeCategory, locale, category);
      return result;
    },
  });

  // Calculate dynamic ressort options and counts based on available jobs
  const availableRessorts = useMemo(() => {
    if (!jobs) return [];
    const counts: Record<string, number> = {};
    for (const job of jobs) {
      const categoryValue = job.category;
      if (typeof categoryValue === 'string') {
        counts[categoryValue] = (counts[categoryValue] ?? 0) + 1;
      }
    }

    return RESSORT_OPTIONS.filter((opt) => (counts[opt.value] ?? 0) > 0).map((opt) => ({
      ...opt,
      count: counts[opt.value] ?? 0,
      cleanLabel: opt.label.replace(/^Ressort\s+/, ''),
    }));
  }, [jobs]);

  // Initialize selectedRessorts with all available once loaded
  useEffect(() => {
    if (availableRessorts.length > 0 && selectedRessorts.size === 0) {
      setSelectedRessorts(new Set(availableRessorts.map((r) => r.value)));
    }
  }, [availableRessorts, setSelectedRessorts]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredJobs = useMemo((): JobWithQuota[] => {
    if (!Array.isArray(jobs)) return [];
    return jobs.filter((job) => {
      const searchLower = searchTerm.toLowerCase();
      const title = String(job.title).toLowerCase();
      const description = String(job.description).toLowerCase();
      const matchesSearch = title.includes(searchLower) || description.includes(searchLower);

      const jobCategory = job.category as string | undefined;
      const matchesRessort =
        typeof jobCategory !== 'string' ||
        selectedRessorts.has(jobCategory) ||
        jobCategory === 'other';

      return matchesSearch && matchesRessort;
    });
  }, [jobs, searchTerm, selectedRessorts]);

  // Sort jobs by start date
  const sortedJobs = useMemo((): JobWithQuota[] => {
    return [...filteredJobs].sort((a, b) => {
      const dateRangeA = a.dateRange as { startDate?: string | null } | undefined;
      const dateRangeB = b.dateRange as { startDate?: string | null } | undefined;
      const startA =
        dateRangeA && typeof dateRangeA.startDate === 'string'
          ? new Date(dateRangeA.startDate).getTime()
          : 0;
      const startB =
        dateRangeB && typeof dateRangeB.startDate === 'string'
          ? new Date(dateRangeB.startDate).getTime()
          : 0;
      return startA - startB;
    });
  }, [filteredJobs]);

  const renderFiltersAndSearch = (): React.ReactElement => (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <label className="font-body mb-2 block text-sm font-medium text-gray-700">
          {locale === 'de' ? 'Jobs durchsuchen...' : 'Search jobs...'}
        </label>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={locale === 'de' ? 'Jobs durchsuchen...' : 'Search jobs...'}
            className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="font-body mb-2 block text-sm font-bold text-gray-900">
          {locale === 'de' ? 'Ressort Filter' : 'Ressort Filter'}
        </label>
        <div className="flex flex-wrap gap-2">
          {availableRessorts.map((ressort) => {
            const isActive = selectedRessorts.has(ressort.value);
            return (
              <button
                key={ressort.value}
                type="button"
                onClick={() => {
                  const newSet = new Set(selectedRessorts);
                  if (isActive) {
                    newSet.delete(ressort.value);
                  } else {
                    newSet.add(ressort.value);
                  }
                  setSelectedRessorts(newSet);
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200',
                  isActive
                    ? 'bg-green-600 text-white shadow-sm hover:bg-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900',
                )}
              >
                <span>{ressort.cleanLabel}</span>
                <span
                  className={cn(
                    'flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px]',
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500',
                  )}
                >
                  {ressort.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (renderMode === 'sidebar') {
    return (
      <div className="mb-4 w-full">
        <label className="font-body mb-4 block text-sm font-bold text-gray-900">
          {label}
          {Boolean(required) && <Required />}
        </label>
        <div className="mb-6">{renderFiltersAndSearch()}</div>
      </div>
    );
  }

  return (
    <div className="mb-4 w-full">
      <div className="flex flex-col gap-4">
        <>
          <label className="font-body mb-1 block text-sm font-medium text-gray-500">
            {label}
            {Boolean(required) && <Required />}
          </label>
          <div className="mb-6">{renderFiltersAndSearch()}</div>
        </>
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
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <div className="flex flex-col gap-4">
              <div
                className={cn('grid grid-cols-1 gap-4', {
                  'md:grid-cols-2': renderMode === 'all',
                  'min-[1440px]:grid-cols-2 min-[1600px]:grid-cols-3': renderMode === 'main',
                })}
              >
                {sortedJobs.length > 0 ? (
                  sortedJobs.map((job) => {
                    const isSelected = value === job.id;
                    const quota = job.availableQuota;
                    const isFull = typeof quota === 'number' && quota <= 0;
                    const isDisabled = isFull && !isSelected;
                    const hasError = Boolean(error);

                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => {
                          if (!isDisabled) {
                            const oc = onChange as (val: unknown) => void;
                            oc(job.id);
                          }
                        }}
                        disabled={isDisabled}
                        className={cn(
                          'relative flex cursor-pointer flex-col rounded-lg border-2 p-4 text-left transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none',
                          {
                            'border-green-600 bg-green-50 ring-green-600': isSelected && !hasError,
                            'border-red-500 bg-red-50 ring-red-600': isSelected && hasError,
                            'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 focus:ring-green-600':
                              !isSelected && !hasError,
                            'border-red-200 bg-white hover:border-red-300 focus:ring-red-500':
                              !isSelected && hasError,
                            'cursor-not-allowed opacity-50 grayscale': isDisabled,
                          },
                        )}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <span className="font-heading text-sm leading-tight font-bold wrap-break-word hyphens-auto text-gray-900">
                            {job.title}
                          </span>
                        </div>
                        <div className="mb-4 line-clamp-2 text-xs text-gray-500">
                          {job.description}
                        </div>

                        <div className="mt-auto flex items-center justify-between text-[10px] font-medium tracking-tight uppercase">
                          <span className="text-gray-400">
                            {new Date(
                              (job.dateRange as { startDate: string }).startDate,
                            ).toLocaleDateString(locale)}
                            {' - '}
                            {typeof (job.dateRange as { endDate?: string | null } | undefined)
                              ?.endDate === 'string'
                              ? new Date(
                                  (job.dateRange as { endDate: string }).endDate,
                                ).toLocaleDateString(locale)
                              : ''}
                          </span>
                          {typeof job.availableQuota === 'number' && (
                            <span
                              className={cn(
                                job.availableQuota > 0 ? 'text-green-600' : 'text-red-600',
                              )}
                            >
                              {locale === 'de'
                                ? `${job.availableQuota} Spots übrig`
                                : `${job.availableQuota} Spots left`}
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
                  })
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-gray-50 p-6 text-gray-400">
                      <SearchX className="h-12 w-12" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-heading mb-1 text-lg font-bold text-gray-900">
                      {locale === 'de' ? 'Keine Jobs gefunden' : 'No jobs found'}
                    </h3>
                    <p className="max-w-[280px] text-sm text-gray-500">
                      {locale === 'de'
                        ? 'Versuche es mit einem anderen Suchbegriff oder passe deine Filter an.'
                        : 'Try adjusting your search or filters to find what you are looking for.'}
                    </p>
                  </div>
                )}
              </div>
              {error && <p className="mt-1 text-xs text-red-600">{error.message}</p>}
            </div>
          )}
        />
      </div>
    </div>
  );
};
