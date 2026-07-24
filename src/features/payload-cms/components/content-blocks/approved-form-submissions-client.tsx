'use client';

import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Filter,
  Search,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

export interface DisplayFieldConfiguration {
  fieldName: string;
  label?: string | null;
}

export interface ApprovedFormSubmissionsClientProperties {
  submissions: FormSubmission[];
  heading?: string | null;
  titleFieldName?: string | null;
  categoryFieldName?: string | null;
  fileFieldName?: string | null;
  searchPlaceholder?: string | null;
  fileDownloadButtonLabel?: string | null;
  displayFields?: DisplayFieldConfiguration[] | null;
  locale: Locale;
}

const translations = {
  de: {
    searchPlaceholder: 'Einträge durchsuchen...',
    allCategories: 'Alle Kategorien',
    downloadPdf: 'Datei / PDF herunterladen',
    showDetails: 'Details anzeigen',
    hideDetails: 'Details ausblenden',
    noSubmissions: 'Derzeit sind noch keine freigegebenen Einträge vorhanden.',
    noResults: 'Keine passenden Einträge für diese Filterkriterien gefunden.',
    resetFilters: 'Filter zurücksetzen',
    approvedTag: 'Freigegeben',
    itemsFound: 'Einträge gefunden',
  },
  en: {
    searchPlaceholder: 'Search entries...',
    allCategories: 'All Categories',
    downloadPdf: 'Download File / PDF',
    showDetails: 'Show details',
    hideDetails: 'Hide details',
    noSubmissions: 'No approved entries available yet.',
    noResults: 'No matching entries found for these filter criteria.',
    resetFilters: 'Reset filters',
    approvedTag: 'Approved',
    itemsFound: 'Entries found',
  },
  fr: {
    searchPlaceholder: 'Rechercher...',
    allCategories: 'Toutes les catégories',
    downloadPdf: 'Télécharger le fichier / PDF',
    showDetails: 'Afficher les détails',
    hideDetails: 'Masquer les détails',
    noSubmissions: 'Aucune entrée approuvée disponible pour le moment.',
    noResults: 'Aucun résultat correspondant trouvé.',
    resetFilters: 'Réinitialiser les filtres',
    approvedTag: 'Approuvé',
    itemsFound: 'Entrées trouvées',
  },
};

const isFileUrl = (val: string): boolean => {
  if (typeof val !== 'string' || val === '') return false;
  const lower = val.toLowerCase();
  return (
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
      let fileUrl = getFieldValue(data, fileFieldName);
      if (fileUrl.length === 0) {
        const conceptField = getFieldValue(data, 'konzept');
        if (conceptField.length > 0) {
          fileUrl = conceptField;
        } else {
          // Fallback: look for any field containing a file URL
          const fileField = data.find((dataItem) => isFileUrl(dataItem.value));
          fileUrl = fileField?.value ?? '';
        }
      }

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
    <div className="my-8 w-full space-y-6">
      {/* Section Header */}
      {hasHeading && (
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h2 className="text-conveniat-green text-2xl font-bold tracking-tight sm:text-3xl">
            {heading}
          </h2>
          <span className="bg-conveniat-green/10 text-conveniat-green hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-block">
            {filteredItems.length} {t.itemsFound}
          </span>
        </div>
      )}

      {/* Search & Category Filter Controls */}
      <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 sm:p-5">
        {/* Search Input */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event_) => setSearchQuery(event_.target.value)}
            placeholder={activeSearchPlaceholder}
            className="focus:border-conveniat-green focus:ring-conveniat-green/20 right-3.5 block w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-9 pl-10 text-sm transition placeholder:text-gray-400 focus:ring-2 focus:outline-hidden"
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
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="mr-1 flex items-center text-xs font-semibold text-gray-500">
              <Filter className="mr-1 h-3.5 w-3.5" />
              Kategorie:
            </span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                selectedCategory === 'ALL'
                  ? 'bg-conveniat-green text-white shadow-xs'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-200/70'
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
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-conveniat-green text-white shadow-xs'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-200/70'
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
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center sm:p-12">
          <p className="text-sm font-medium text-gray-600">
            {processedItems.length === 0 ? t.noSubmissions : t.noResults}
          </p>
          {(searchQuery.length > 0 || selectedCategory !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="bg-conveniat-green/10 text-conveniat-green hover:bg-conveniat-green/20 mt-4 rounded-lg px-4 py-2 text-xs font-semibold transition"
            >
              {t.resetFilters}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5">
          {filteredItems.map((item) => {
            const isExpanded = expandedIds[item.id] === true;

            // Filter display fields to show in expanded details
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
                className="group hover:border-conveniat-green/40 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs transition-all duration-200 hover:shadow-md"
              >
                {/* Main Card Header */}
                <div className="p-4 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    {item.category.length > 0 && (
                      <span className="bg-conveniat-green/10 text-conveniat-green rounded-full px-3 py-1 text-xs font-semibold">
                        {item.category}
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      {t.approvedTag}
                    </span>
                  </div>

                  {/* Title & Clickable Header */}
                  <h3 className="text-conveniat-green text-lg font-bold sm:text-xl">
                    {item.title}
                  </h3>

                  {/* PDF Download Button (if fileUrl exists) */}
                  {item.fileUrl.length > 0 && (
                    <div className="mt-3">
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="bg-conveniat-green/10 hover:bg-conveniat-green text-conveniat-green group/btn inline-flex items-center rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 hover:text-white"
                        onClick={(event_) => event_.stopPropagation()}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span>{activeDownloadLabel}</span>
                        <Download className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-y-0.5" />
                      </a>
                    </div>
                  )}

                  {/* Details Toggle Button */}
                  {detailRows.length > 0 && (
                    <div className="mt-4 flex items-center justify-end border-t border-gray-100 pt-3">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="hover:text-conveniat-green inline-flex items-center text-xs font-semibold text-gray-500 transition"
                      >
                        <span>{isExpanded ? t.hideDetails : t.showDetails}</span>
                        {isExpanded ? (
                          <ChevronUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Collapsible Details Body */}
                {isExpanded && detailRows.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 sm:p-6">
                    <dl className="grid gap-3 sm:grid-cols-2">
                      {detailRows.map((row) => {
                        const isLink = isFileUrl(row.value);
                        return (
                          <div
                            key={row.key}
                            className="rounded-xl border border-gray-200/60 bg-white p-3 shadow-2xs"
                          >
                            <dt className="text-xs font-medium text-gray-500">{row.label}</dt>
                            <dd className="mt-1 text-sm font-semibold break-words text-gray-900">
                              {isLink ? (
                                <a
                                  href={row.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-conveniat-green inline-flex items-center gap-1 hover:underline"
                                >
                                  <span>Download / Öffnen</span>
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
