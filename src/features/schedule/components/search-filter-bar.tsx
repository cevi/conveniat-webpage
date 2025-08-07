import type React from 'react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { Search, X } from 'lucide-react';

export interface FilterState {
  searchText: string;
  selectedLocations: CampMapAnnotation[];
  selectedCategory: string;
}

interface SearchFilterBarProperties {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableLocations: CampMapAnnotation[];
  availableCategories: string[];
  className?: string;
}

export const SearchFilterBar: React.FC<SearchFilterBarProperties> = ({
  filters,
  onFiltersChange,
  className = '',
}) => {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        searchText: value,
      });
    },
    [filters, onFiltersChange],
  );

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      searchText: '',
      selectedLocations: [],
      selectedCategory: '',
    });
  }, [onFiltersChange]);

  const hasActiveFilters =
    filters.searchText || filters.selectedLocations.length > 0 || filters.selectedCategory;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by title or description..."
          value={filters.searchText}
          onChange={(event) => handleSearchChange(event.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9">
          <X className="mr-2 h-4 w-4" />
          Clear All
        </Button>
      )}
    </div>
  );
};
