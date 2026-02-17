'use client';

import type { JobWithQuota } from '@/features/payload-cms/components/form/actions/get-jobs';
import { getJobs } from '@/features/payload-cms/components/form/actions/get-jobs';
import { Required } from '@/features/payload-cms/components/form/required';
import type { JobSelectionBlock } from '@/features/payload-cms/components/form/types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Control, FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

// Context to share search/filter state between sidebar and main cards
interface JobSelectionContextType {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  selectedRessorts: Set<string>;
  setSelectedRessorts: (s: Set<string>) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (b: boolean) => void;
}

const JobSelectionContext = createContext<JobSelectionContextType | undefined>(undefined);

export const JobSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRessorts, setSelectedRessorts] = useState<Set<string>>(new Set());
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const value = useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      selectedRessorts,
      setSelectedRessorts,
      isSearchOpen,
      setIsSearchOpen,
    }),
    [searchTerm, selectedRessorts, isSearchOpen],
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

const requiredFieldMessage: StaticTranslationString = {
  de: 'Dieses Feld ist erforderlich',
  en: 'This field is required',
  fr: 'Ce champ est obligatoire',
};

export const JobSelection: React.FC<JobSelectionProperties> = (props) => {
  const { control, name, label, required, dateRangeCategory, category, renderMode = 'all' } = props;

  const locale = (useCurrentLocale(i18nConfig) ?? 'de') as Locale;
  const {
    searchTerm,
    setSearchTerm,
    selectedRessorts,
    setSelectedRessorts,
    isSearchOpen,
    setIsSearchOpen,
  } = useJobSelection();

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
      const categoryValue = (job as unknown as { category: string | undefined }).category;
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

  const filteredJobs = useMemo((): JobWithQuota[] => {
    if (!Array.isArray(jobs)) return [];
    return jobs.filter((job) => {
      const searchLower = searchTerm.toLowerCase();
      const title = String(job.title).toLowerCase();
      const description = String(job.description).toLowerCase();
      const matchesSearch = title.includes(searchLower) || description.includes(searchLower);

      const jobCategory = (job as unknown as { category: string | undefined }).category;
      const matchesRessort =
        selectedRessorts.size === 0 ||
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

  const renderSearch = (): React.ReactElement => (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-end">
      {isSearchOpen ? (
        <div className="animate-in fade-in slide-in-from-right-2 absolute top-0 right-0 z-10 duration-200">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            type="text"
            placeholder={locale === 'de' ? 'Jobs durchsuchen...' : 'Search jobs...'}
            className="w-48 rounded-full border border-gray-200 bg-gray-50 py-1.5 pr-8 pl-9 text-xs shadow-sm transition-all focus:w-64 focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:outline-none"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onBlur={(event) => {
              const relatedTarget = event.relatedTarget as HTMLElement | null;
              if (relatedTarget?.closest('.clear-search-button')) {
                return;
              }
              if (searchTerm === '') {
                setIsSearchOpen(false);
              }
            }}
          />
          {searchTerm !== '' && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
              }}
              className="clear-search-button absolute top-1/2 right-2.5 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title={locale === 'de' ? 'Suche' : 'Search'}
        >
          <Search className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const renderFilters = (): React.ReactElement => (
    <div className="flex flex-wrap gap-2">
      {availableRessorts.map(
        (ressort: { value: string; label: string; count: number; cleanLabel: string }) => {
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
                'flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95',
                isActive
                  ? 'bg-green-600 text-white shadow-sm hover:bg-green-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700',
              )}
            >
              <span>{ressort.cleanLabel}</span>
              <span
                className={cn(
                  'flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px]',
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-400',
                )}
              >
                {ressort.count}
              </span>
            </button>
          );
        },
      )}
    </div>
  );

  if (renderMode === 'sidebar') {
    return (
      <div className="@container mb-4 w-full">
        <div className="mb-4 flex flex-col gap-4 @lg:flex-row @lg:items-center @lg:justify-between">
          <label className="font-body mb-0 block text-sm font-bold text-gray-900">
            {label}
            {Boolean(required) && <Required />}
          </label>
          <div className="flex items-center justify-end">{renderSearch()}</div>
        </div>
        <div className="mb-6">{renderFilters()}</div>
      </div>
    );
  }

  return (
    <div className="@container mb-4 w-full">
      <div className="flex flex-col gap-4">
        <div className="mb-6">
          <div className="mb-4 flex flex-col gap-4 @lg:flex-row @lg:items-center @lg:justify-between">
            <label className="font-body block text-sm font-bold text-gray-900">
              {label}
              {Boolean(required) && <Required />}
            </label>
            <div className="flex items-center justify-end">{renderSearch()}</div>
          </div>
          {renderFilters()}
        </div>
        {isLoading && (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading jobs...</span>
          </div>
        )}
        <Controller
          control={control}
          name={name}
          rules={{ required: required === true ? requiredFieldMessage[locale] : false }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <div className="@container flex flex-col gap-4">
              <div className={cn('grid grid-cols-1 gap-4 @xl:grid-cols-2 @3xl:grid-cols-3')}>
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
                            (onChange as (val: unknown) => void)(job.id);
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
                      <Search className="mx-auto h-12 w-12 text-gray-400" />
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
