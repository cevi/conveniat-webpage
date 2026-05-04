'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/utils/tailwindcss-override';
import { Search, X } from 'lucide-react';
import type React from 'react';

interface AccordionSearchBarProperties {
  query: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount: number;
  totalCount: number;
  noResultsLabel: string;
}

export const AccordionSearchBar: React.FC<AccordionSearchBarProperties> = ({
  query,
  onChange,
  placeholder,
  resultCount,
  totalCount,
  noResultsLabel,
}) => {
  return (
    <div className="mb-4 space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(
            'font-body h-10 rounded-lg border-2 border-gray-200 bg-white pr-9 pl-9',
            'ring-0 ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0',
            'focus-visible:border-conveniat-green focus-visible:outline-hidden',
            'text-gray-900 placeholder:text-gray-400',
          )}
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {query.length > 0 && resultCount === 0 && (
        <p className="px-1 text-sm text-gray-500">{noResultsLabel}</p>
      )}
      {query.length > 0 && resultCount > 0 && resultCount < totalCount && (
        <p className="px-1 text-sm text-gray-400">
          {resultCount} / {totalCount}
        </p>
      )}
    </div>
  );
};
