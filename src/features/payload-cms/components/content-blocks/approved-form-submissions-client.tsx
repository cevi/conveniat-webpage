'use client';

import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronDown, ChevronUp, Download, FileText, Filter, Search, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

export interface DisplayFieldConfiguration {
  fieldName: string;
  label?: string | null;
}

export interface ApprovedFormSubmissionsClientProperties {
  submissions: FormSubmission[];
  heading?: string | null | undefined;
  centerHorizontally?: boolean | null | undefined;
  titleFieldName?: string | null | undefined;
  categoryFieldName?: string | null | undefined;
  fileFieldName?: string | null | undefined;
  searchPlaceholder?: string | null | undefined;
  fileDownloadButtonLabel?: string | null | undefined;
  displayFields?: DisplayFieldConfiguration[] | null | undefined;
  locale: Locale;
}

const translations = {
  de: {
    searchPlaceholder: 'Einträge durchsuchen...',
    allCategories: 'Alle Kategorien',
    categoryLabel: 'Kategorie:',
    downloadPdf: 'Datei / PDF herunterladen',
    downloadOrOpen: 'Herunterladen / Öffnen',
    showDetails: 'Details anzeigen',
    hideDetails: 'Details ausblenden',
    noSubmissions: 'Derzeit sind noch keine freigegebenen Einträge vorhanden.',
    noResults: 'Keine passenden Einträge für diese Filterkriterien gefunden.',
    resetFilters: 'Filter zurücksetzen',
    itemsFoundSingle: 'Eintrag gefunden',
    itemsFoundPlural: 'Einträge gefunden',
  },
  en: {
    searchPlaceholder: 'Search entries...',
    allCategories: 'All Categories',
    categoryLabel: 'Category:',
    downloadPdf: 'Download File / PDF',
    downloadOrOpen: 'Download / Open',
    showDetails: 'Show details',
    hideDetails: 'Hide details',
    noSubmissions: 'No approved entries available yet.',
    noResults: 'No matching entries found for these filter criteria.',
    resetFilters: 'Reset filters',
    itemsFoundSingle: 'Entry found',
    itemsFoundPlural: 'Entries found',
  },
  fr: {
    searchPlaceholder: 'Rechercher...',
    allCategories: 'Toutes les catégories',
    categoryLabel: 'Catégorie :',
    downloadPdf: 'Télécharger le fichier / PDF',
    downloadOrOpen: 'Télécharger / Ouvrir',
    showDetails: 'Afficher les détails',
    hideDetails: 'Masquer les détails',
    noSubmissions: 'Aucune entrée approuvée disponible pour le moment.',
    noResults: 'Aucun résultat correspondant trouvé.',
    resetFilters: 'Réinitialiser les filtres',
    itemsFoundSingle: 'Entrée trouvée',
    itemsFoundPlural: 'Entrées trouvées',
  },
};

const resolveDownloadUrl = (val: string): string => {
  if (typeof val !== 'string' || val.trim() === '') return '';
  const trimmed = val.trim();
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    return `/api/form-file/${trimmed}`;
  }
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => p.trim());
    const firstId = parts.find((p) => /^[0-9a-fA-F]{24}$/.test(p));
    if (firstId !== undefined) {
      return `/api/form-file/${firstId}`;
    }
  }
  return trimmed;
};

const isFileUrl = (val: string): boolean => {
  if (typeof val !== 'string' || val === '') return false;
  const lower = val.trim().toLowerCase();
  return (
    /^[0-9a-fA-F]{24}$/.test(lower) ||
    (lower.includes(',') && lower.split(',').some((p) => /^[0-9a-fA-F]{24}$/.test(p.trim()))) ||
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('/api/') ||
    lower.startsWith('/media/') ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx')
  );
};

const getFieldValue = (
  submissionData: FormSubmission['submissionData'],
  fieldName?: string | null,
): string => {
  if (
    submissionData === null ||
    submissionData === undefined ||
    fieldName === null ||
    fieldName === undefined ||
    fieldName === ''
  ) {
    return '';
  }
  const item = submissionData.find(
    (dataItem) => dataItem.field.trim().toLowerCase() === fieldName.trim().toLowerCase(),
  );
  return item?.value ?? '';
};

export const ApprovedFormSubmissionsClient: React.FC<ApprovedFormSubmissionsClientProperties> = ({
  submissions,
  heading,
  centerHorizontally,
  titleFieldName = 'title',
  categoryFieldName = 'category',
  fileFieldName = 'file',
  searchPlaceholder,
  fileDownloadButtonLabel,
  displayFields,
  locale,
}) => {
  const t = translations[locale];
  const activeSearchPlaceholder =
    searchPlaceholder !== null && searchPlaceholder !== undefined && searchPlaceholder.trim() !== ''
      ? searchPlaceholder
      : t.searchPlaceholder;
  const activeDownloadLabel =
    fileDownloadButtonLabel !== null &&
    fileDownloadButtonLabel !== undefined &&
    fileDownloadButtonLabel.trim() !== ''
      ? fileDownloadButtonLabel
      : t.downloadPdf;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string): void => {
    setExpandedIds((previous) => ({
      ...previous,
      [id]: previous[id] !== true,
    }));
  };

  // Process item titles, categories, files
  const processedItems = useMemo(() => {
    return submissions.map((sub) => {
      const data = sub.submissionData ?? [];

      // Determine Title
      let title = getFieldValue(data, titleFieldName);
      if (title.length === 0) {
        const titleField = getFieldValue(data, 'title');
        const standNameField = getFieldValue(data, 'name_des_standes');
        const hofNameField = getFieldValue(data, 'name_vom_hof');
        const nameField = getFieldValue(data, 'name');

        if (titleField.length > 0) {
          title = titleField;
        } else if (standNameField.length > 0) {
          title = standNameField;
        } else if (hofNameField.length > 0) {
          title = hofNameField;
        } else if (nameField.length > 0) {
          title = nameField;
        } else {
          title = data[0]?.value ?? 'Eintrag';
        }
      }

      // Determine Category
      let category = getFieldValue(data, categoryFieldName);
      if (category.length === 0) {
        const catField = getFieldValue(data, 'kategorie');
        const catAltField = getFieldValue(data, 'category');
        category = catField.length > 0 ? catField : catAltField;
      }

      // Determine File / PDF URL
      let rawFileUrl = getFieldValue(data, fileFieldName);
      if (rawFileUrl.length === 0) {
        const conceptField = getFieldValue(data, 'konzept');
        if (conceptField.length > 0) {
          rawFileUrl = conceptField;
        } else {
          // Fallback: look for any field containing a file URL or ID
          const fileField = data.find((dataItem) => isFileUrl(dataItem.value));
          rawFileUrl = fileField?.value ?? '';
        }
      }
      const fileUrl = resolveDownloadUrl(rawFileUrl);

      return {
        id: sub.id,
        rawSubmission: sub,
        title,
        category: category.trim(),
        fileUrl: fileUrl.trim(),
        data,
      };
    });
  }, [submissions, titleFieldName, categoryFieldName, fileFieldName]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of processedItems) {
      if (item.category.length > 0) {
        set.add(item.category);
      }
    }
    return [...set].sort();
  }, [processedItems]);

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    return processedItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        const matchesFields = item.data.some((dataItem) =>
          dataItem.value.toLowerCase().includes(query),
        );
        return matchesTitle || matchesCategory || matchesFields;
      }

      return true;
    });
  }, [processedItems, selectedCategory, searchQuery]);

  const hasHeading = heading !== null && heading !== undefined && heading.length > 0;

  return (
    <div
      className={cn(
        'my-8 w-full space-y-6',
        centerHorizontally === true && 'mx-auto max-w-[1120px]',
      )}
    >
      {/* Section Header */}
      {hasHeading && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <h2 className="text-conveniat-green text-2xl font-bold tracking-tight sm:text-3xl">
            {heading}
          </h2>
          <span className="bg-conveniat-green/10 text-conveniat-green inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold">
            {filteredItems.length}{' '}
            {filteredItems.length === 1 ? t.itemsFoundSingle : t.itemsFoundPlural}
          </span>
        </div>
      )}

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event_) => setSearchQuery(event_.target.value)}
            placeholder={activeSearchPlaceholder}
            className="focus:border-conveniat-green focus:ring-conveniat-green/20 block w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-9 pl-10 text-sm shadow-2xs transition placeholder:text-gray-400 focus:ring-2 focus:outline-hidden"
          />
          {searchQuery.length > 0 && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Pills / Filter Tabs */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 hidden items-center text-xs font-semibold text-gray-500 sm:inline-flex">
              <Filter className="mr-1 h-3.5 w-3.5" />
              {t.categoryLabel}
            </span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                selectedCategory === 'ALL'
                  ? 'bg-conveniat-green text-white shadow-xs'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.allCategories} ({processedItems.length})
            </button>
            {categories.map((cat) => {
              const count = processedItems.filter((item) => item.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? 'bg-conveniat-green text-white shadow-xs'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center sm:p-12">
          <FileText className="mx-auto mb-3 h-8 w-8 text-gray-400" />
          <p className="text-sm font-medium text-gray-600">
            {processedItems.length === 0 ? t.noSubmissions : t.noResults}
          </p>
          {(searchQuery.length > 0 || selectedCategory !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="bg-conveniat-green/10 text-conveniat-green hover:bg-conveniat-green/20 mt-4 inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold transition"
            >
              {t.resetFilters}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isExpanded = expandedIds[item.id] === true;

            const detailRows = (
              displayFields !== null && displayFields !== undefined && displayFields.length > 0
                ? displayFields
                : item.data.map((d) => ({ fieldName: d.field, label: d.field }))
            )
              .map((cfg) => {
                const val = getFieldValue(item.data, cfg.fieldName);
                return {
                  key: cfg.fieldName,
                  label:
                    cfg.label !== null && cfg.label !== undefined && cfg.label.trim().length > 0
                      ? cfg.label
                      : cfg.fieldName,
                  value: val,
                };
              })
              .filter((row) => row.value.length > 0);

            return (
              <div
                key={item.id}
                className="hover:border-conveniat-green/30 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xs transition-all duration-200 hover:shadow-md"
              >
                {/* Main Card Header */}
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="space-y-1.5">
                    {item.category.length > 0 && (
                      <span className="bg-conveniat-green/10 text-conveniat-green inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold">
                        {item.category}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-gray-900 sm:text-xl">{item.title}</h3>
                  </div>

                  {/* Action buttons (Download & Details toggle) */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0">
                    {item.fileUrl.length > 0 && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="bg-conveniat-green hover:bg-conveniat-green/90 inline-flex items-center rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all duration-200 hover:shadow-md"
                        onClick={(event_) => event_.stopPropagation()}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span>{activeDownloadLabel}</span>
                        <Download className="ml-2 h-4 w-4" />
                      </a>
                    )}

                    {detailRows.length > 0 && (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
                      >
                        <span>{isExpanded ? t.hideDetails : t.showDetails}</span>
                        {isExpanded ? (
                          <ChevronUp className="ml-1.5 h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="ml-1.5 h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Details Body */}
                {isExpanded && detailRows.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/40 p-5 sm:p-6">
                    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                      {detailRows.map((row) => {
                        const isLink = isFileUrl(row.value);
                        const downloadUrl = resolveDownloadUrl(row.value);
                        return (
                          <div key={row.key} className="space-y-1">
                            <dt className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                              {row.label}
                            </dt>
                            <dd className="text-sm font-medium break-words text-gray-900">
                              {isLink ? (
                                <a
                                  href={downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-conveniat-green/10 text-conveniat-green hover:bg-conveniat-green inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:text-white"
                                >
                                  <span>{t.downloadOrOpen}</span>
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              ) : (
                                row.value
                              )}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
